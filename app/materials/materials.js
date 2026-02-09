const GEMINI_API_KEY = 'org_01kgynwc28fz885ph7aear5yj4';
const MODEL_NAME = 'openai/gpt-oss-120b';

// State
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0; // Zoom level, can be dynamic
let canvas, ctx;
let currentPdfText = ""; // Extracted text for context
let chatHistory = [];

// DOM Elements
const pdfList = document.getElementById('pdfList');
const currentPdfName = document.getElementById('currentPdfName');
const noPdfPlaceholder = document.getElementById('noPdfPlaceholder');
const chatMessages = document.getElementById('chatMessages');

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('pdfCanvas');
    ctx = canvas.getContext('2d');

    // Event Listeners
    document.getElementById('prevPage').addEventListener('click', onPrevPage);
    document.getElementById('nextPage').addEventListener('click', onNextPage);
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    document.getElementById('pdfUploadInput').addEventListener('change', handleUpload);

    // Initial Load check (if a PDF query param exists? For now just wait for click)
});

// --- PDF Logic ---

async function loadPDF(url, filename = 'Document') {
    // Show loading state
    addMessageToUI(`Attempting to load **${filename}**...`, 'ai');

    try {
        // 1. Try to check file existence (optional, helps debugging but shouldn't block)
        try {
            const checkResponse = await fetch(url, { method: 'HEAD' });
            if (!checkResponse.ok) {
                console.warn(`Fetch check failed: ${checkResponse.status}`);
            }
        } catch (fetchErr) {
            // Ignore fetch errors (likely file:// protocol restriction)
            console.log("Fetch check skipped (likely local file):", fetchErr);
        }

        // 2. Load PDF with PDF.js
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;

        // Update UI
        currentPdfName.textContent = filename;
        document.getElementById('pageCount').textContent = pdfDoc.numPages;
        noPdfPlaceholder.style.display = 'none';

        // Reset View
        pageNum = 1;
        renderPage(pageNum);

        // Extract Text for Gemini Context
        await extractTextFromCurrentPDF();

        // Add System Message to Chat
        addMessageToUI(`✅ Successfully loaded **${filename}**. I've read the content and am ready to answer questions!`, 'ai');

    } catch (error) {
        console.error('Error loading PDF:', error);
        addMessageToUI(`❌ **Error loading PDF**: ${error.message}. \n\nIf you are opening this file directly (file://), some browsers block it. Try using a local server (e.g., VS Code Live Server).`, 'ai');
    }
}

function renderPage(num) {
    pageRendering = true;

    // Update Page Counters
    document.getElementById('pageNum').textContent = num;

    pdfDoc.getPage(num).then(function (page) {
        // Adjust scale to fit width
        const containerWidth = document.querySelector('.viewer-body').clientWidth - 48; // padding
        const viewport = page.getViewport({ scale: 1 });
        scale = containerWidth / viewport.width;
        if (scale > 1.5) scale = 1.5; // Cap zoom

        const scaledViewport = page.getViewport({ scale: scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport
        };

        const renderTask = page.render(renderContext);

        // Wait for render to finish
        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}

async function extractTextFromCurrentPDF() {
    if (!pdfDoc) return;

    currentPdfText = "";
    const maxPages = Math.min(pdfDoc.numPages, 10); // Limit to avoid huge context

    for (let i = 1; i <= maxPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(s => s.str).join(' ');
        currentPdfText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    console.log("Extracted text length:", currentPdfText.length);
}

async function handleUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const url = URL.createObjectURL(file);

        // Add to Sidebar List (Mock persistence)
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.onclick = () => loadPDF(url, file.name);
        div.innerHTML = `<span class="nav-icon">📄</span><span>${file.name}</span>`;

        // Insert after the static sample
        pdfList.appendChild(div);

        // Load immediately
        loadPDF(url, file.name);
    }
}

// --- Chat Logic ---

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessageToUI(text, 'user');

    // Show Typing
    const typingId = showTypingIndicator();

    try {
        const response = await callGeminiAPI(text);
        removeTypingIndicator(typingId);
        addMessageToUI(response, 'ai');
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToUI(`Error: ${error.message}`, 'ai');
    }
}

function addMessageToUI(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;

    const displayContent = type === 'user' ? text.replace(/</g, "&lt;") : text;

    msgDiv.innerHTML = `
        <div class="message-avatar">${type === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content">${displayContent}</div>
    `;

    chatMessages.appendChild(msgDiv);

    // Render Math
    if (window.renderMathInElement) {
        renderMathInElement(msgDiv, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false
        });
    }

    // Scroll
    msgDiv.scrollIntoView({ behavior: 'smooth' });

    // Update History
    chatHistory.push({
        role: type === 'user' ? 'user' : 'model',
        parts: [{ text: text }]
    });
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message ai';
    div.innerHTML = `<div class="message-avatar">🤖</div><div class="message-content">Typing...</div>`;
    chatMessages.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
    return id;
}

function removeTypingIndicator(id) {
    document.getElementById(id)?.remove();
}

async function callGeminiAPI(userMessage) {
    if (!GEMINI_API_KEY) throw new Error("API Key missing");

    const API_URL = 'https://api.a4f.co/v1/chat/completions';

    // Context Construction
    const systemText = `You are a helpful study assistant analyzing a PDF document.
    
    CONTEXT FROM THE CURRENT PDF:
    ${currentPdfText ? currentPdfText : "[No PDF Loaded yet]"}
    
    INSTRUCTIONS:
    1. Answer based on the PDF content if available.
    2. If the answer is not in the PDF, use your general knowledge but mention that it's outside the document context.
    3. Use LaTeX for math.
    `;

    const messages = [
        { role: 'system', content: systemText },
        ...chatHistory.slice(-6).map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts[0].text
        })),
        { role: 'user', content: userMessage }
    ];

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: messages
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API Request Failed');
    }

    const data = await response.json();
    return marked.parse(data.choices[0].message.content);
}
