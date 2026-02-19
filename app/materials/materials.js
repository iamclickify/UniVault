// Configuration
// API Key is handled by Python Backend


// State
// State
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let currentScale = 1.0; // Absolute scale
let canvas, ctx;
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

// Text extraction is now handled by the Python Backend via /api/upload

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
        
        // Upload to Backend for RAG Indexing
        await uploadToBackend(file);
    }
}

async function uploadToBackend(file) {
    const formData = new FormData();
    formData.append('file', file);

    addMessageToUI(`📤 Uploading **${file.name}** to AI Brain...`, 'ai');

    try {
        const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            addMessageToUI(`✅ **${file.name}** indexed! You can now ask questions about it.`, 'ai');
        } else {
            console.error('Backend upload failed');
            addMessageToUI(`⚠️ Failed to index PDF on server. AI might not know about this file.`, 'ai');
        }
    } catch (err) {
        console.error('Upload Error:', err);
        addMessageToUI(`⚠️ Connection error: Is the Python server running?`, 'ai');
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
    const API_URL = 'http://localhost:5000/api/chat';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: userMessage
            })
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle potential error from backend
        if (data.error) {
            throw new Error(data.error);
        }

        return marked.parse(data.response);
    } catch (error) {
        console.error("Chat Error:", error);
        throw error;
    }
}
