const GEMINI_API_KEY = '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';
const MODEL_NAME = 'groq/compound-mini';

// State
// State
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let currentScale = 1.0; // Absolute scale
let canvas, ctx;
let currentPdfText = ""; // Extracted text for context (Deprecated in favor of array, kept for safety)
let allPagesText = []; // Store text per page
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
    document.getElementById('zoomIn').addEventListener('click', onZoomIn);
    document.getElementById('zoomOut').addEventListener('click', onZoomOut);
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

        // Calculate Initial Scale (Fit Width)
        const page = await pdfDoc.getPage(1);
        const containerWidth = document.querySelector('.viewer-body').clientWidth - 48;
        const viewport = page.getViewport({ scale: 1 });
        currentScale = containerWidth / viewport.width;

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
        // Use the absolute currentScale directly
        const scaledViewport = page.getViewport({ scale: currentScale });

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

function onZoomIn() {
    currentScale *= 1.2;
    queueRenderPage(pageNum);
}

function onZoomOut() {
    if (currentScale > 0.4) {
        currentScale /= 1.2;
        queueRenderPage(pageNum);
    }
}

async function extractTextFromCurrentPDF() {
    if (!pdfDoc) return;

    currentPdfText = "";
    const maxPages = Math.min(pdfDoc.numPages, 50); // Increased limit

    if (pdfDoc.numPages > 50) {
        addMessageToUI(`⚠️ **Note**: This PDF is large (${pdfDoc.numPages} pages). I have read the first 50 pages to stay within memory limits.`, 'ai');
    }

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

    const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

    // Dynamic Context Construction
    // 1. Intro (Pages 1-3)
    let contextStr = "--- DOCUMENT INTRO ---\n";
    for (let i = 1; i <= Math.min(3, allPagesText.length - 1); i++) {
        contextStr += `[Page ${i}]: ${allPagesText[i]}\n`;
    }

    // 2. Focused Context (Current Page +/- 1)
    contextStr += "\n--- CURRENT VIEW ---\n";
    const startPage = Math.max(1, pageNum - 1);
    const endPage = Math.min(allPagesText.length - 1, pageNum + 1);

    for (let i = startPage; i <= endPage; i++) {
        if (i > 3) { // Avoid duplication if overlapping with intro
            contextStr += `[Page ${i}]: ${allPagesText[i]}\n`;
        }
    }

    const systemText = `You are a helpful study assistant analyzing a PDF document.
    
    CONTEXT (Focused on Page ${pageNum}):
    ${contextStr}
    
    INSTRUCTIONS:
    1. Answer based on the provided context.
    2. The user is currently looking at Page ${pageNum}. Prioritize information from this page.
    3. If the answer is not in the context, say "I don't see that in the current pages (1-3 or ${startPage}-${endPage})."
    4. Use LaTeX for math.
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
        const errorText = await response.text();
        console.error("API Error Log:", {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
        });

        let errorMessage = `API Error (${response.status})`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) {
            errorMessage = errorText; // Use raw text if not JSON
        }

        throw new Error(errorMessage);
    }

    const data = await response.json();
    return marked.parse(data.choices[0].message.content);
}
