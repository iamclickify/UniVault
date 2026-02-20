// Auth Check
(function () {
    const session = sessionStorage.getItem('univault_session');
    if (!session) {
        window.location.href = '../../auth/login.html';
        return;
    }
    const userData = JSON.parse(session);
    document.addEventListener('DOMContentLoaded', () => {
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        if (userName) userName.textContent = userData.name.split(' ')[0];
        if (userAvatar) userAvatar.textContent = userData.name.charAt(0).toUpperCase();
    });
})();

// Configuration
// API Key is now handled by the Python Backend (app/Rag/.env)


// Application State
let currentSubject = 'general';
let attachedFiles = [];
let chatHistory = []; // Array of { role: 'user' | 'model', parts: [{ text: '...' }] }

// Data
const subjectsData = {
    'mathematics': { title: 'Mathematics', icon: '📐' },
    'physics': { title: 'Physics', icon: '⚛️' },
    'computer-science': { title: 'Computer Science', icon: '💻' },
    'chemistry': { title: 'Chemistry', icon: '🧪' },
    'biology': { title: 'Biology', icon: '🧬' },
    'engineering': { title: 'Engineering', icon: '⚙️' }
};

// DOM Elements
const subjectList = document.getElementById('subjectList');
const currentSubjectTitle = document.getElementById('currentSubjectTitle');
const currentSubjectIcon = document.getElementById('currentSubjectIcon');
const chatScrollArea = document.getElementById('chatScrollArea');
const chatMessages = document.getElementById('chatMessages');
const pdfStatusContainer = document.getElementById('pdfStatusContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    setupEventListeners();
    setupPdfUpload();

    // Load last used subject or default
    const lastSubject = localStorage.getItem('univault_last_subject') || 'general';
    selectSubject(lastSubject);
});

function initializeSidebar() {
    // Subjects
    const generalItem = createNavItem('general', '🤖', 'General Tutor');
    subjectList.appendChild(generalItem);

    Object.keys(subjectsData).forEach(key => {
        const data = subjectsData[key];
        const item = createNavItem(key, data.icon, data.title);
        subjectList.appendChild(item);
    });

    // Update History Sidebar (Mock implementation for now, could be real later)
    updateHistorySidebar();
}

function createNavItem(id, icon, title) {
    const div = document.createElement('div');
    div.className = 'nav-item';
    div.setAttribute('data-subject', id);
    div.innerHTML = `<span class="nav-icon">${icon}</span><span>${title}</span>`;
    div.addEventListener('click', () => selectSubject(id));
    return div;
}

function selectSubject(subjectId) {
    // Save current session before switching? 
    // (We save on every message, so no need to explicitly save here)

    currentSubject = subjectId;
    localStorage.setItem('univault_last_subject', subjectId);

    // Update UI
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-subject="${subjectId}"]`)?.classList.add('active');

    // Update Header
    if (subjectId === 'general') {
        currentSubjectTitle.textContent = 'General Tutor';
        currentSubjectIcon.textContent = '🤖';
    } else {
        const data = subjectsData[subjectId];
        currentSubjectTitle.textContent = data.title;
        currentSubjectIcon.textContent = data.icon;
    }

    // Load History
    loadChatHistory(subjectId);
}

function loadChatHistory(subjectId) {
    const saved = localStorage.getItem(`univault_history_${subjectId}`);
    chatMessages.innerHTML = ''; // Clear current view

    if (saved) {
        chatHistory = JSON.parse(saved);
        // Render history
        if (chatHistory.length === 0) {
            renderWelcomeMessage();
        } else {
            chatHistory.forEach(msg => {
                // Determine type based on role
                const type = msg.role === 'user' ? 'user' : 'ai';
                addMessageToUI(msg.parts[0].text, type, false); // false = don't save again
            });
        }
    } else {
        chatHistory = [];
        renderWelcomeMessage();
    }

    // Also clear attached files on switch (fresh context)
    // Or we could persist them too, but for now let's reset attachments
    attachedFiles = [];
    updatePdfStatusUI();

    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
}

function renderWelcomeMessage() {
    const title = currentSubject === 'general' ? 'General Tutor' : subjectsData[currentSubject].title;
    const div = document.createElement('div');
    div.className = 'message ai';
    div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            Hello! I'm your <strong>${title}</strong> assistant. 
            Upload PDFs or ask me anything to get started!
        </div>
    `;
    chatMessages.appendChild(div);
}

function updateHistorySidebar() {
    // In a real app, we'd list actual past conversations. 
    // For now, we'll just show the static "History" items or dynamic ones if we want.
}

function setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    const clearBtn = document.getElementById('clearChatBtn');
    const searchInput = document.getElementById('searchInput');
    const logoutBtn = document.getElementById('logoutBtn');

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear history for this subject?')) {
                chatHistory = [];
                saveHistory();
                attachedFiles = [];
                updatePdfStatusUI();
                chatMessages.innerHTML = '';
                renderWelcomeMessage();
            }
        });
    }

    // Search within chat
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const messages = document.querySelectorAll('.message-content');
            messages.forEach(msg => {
                const text = msg.textContent.toLowerCase();
                const parent = msg.closest('.message');
                if (text.includes(term)) {
                    parent.style.display = 'flex';
                } else {
                    parent.style.display = 'none';
                }
            });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Log out?')) {
                sessionStorage.removeItem('univault_session');
                window.location.href = '../../auth/login.html';
            }
        });
    }

    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            window.location.href = '../../home/index.html';
        });
    }

    setupProfileMenu();
}

function setupProfileMenu() {
    const trigger = document.getElementById('profileTrigger');
    const menu = document.getElementById('profileMenu');

    if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');

            // Position menu near trigger
            const rect = trigger.getBoundingClientRect();
            menu.style.bottom = (window.innerHeight - rect.top) + 'px';
            menu.style.left = rect.left + 'px';
        });

        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
    }
}

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000' 
    : 'https://univault-backend.onrender.com';

// Ensure no trailing slash
const PYTHON_API_URL = `${API_BASE.replace(/\/$/, '')}/api`;

// Health check to debug "Failed to fetch"
async function checkServerHealth() {
    try {
        const res = await fetch(`${API_BASE.replace(/\/$/, '')}/health`);
        const data = await res.json();
        console.log("Backend Health:", data);
    } catch (e) {
        console.error("Backend unreachable. This is likely a CORS issue or the server is sleeping.", e);
    }
}
checkServerHealth();

function setupPdfUpload() {
    const input = document.getElementById('pdfUploadInput');
    if (input) {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type !== 'application/pdf') {
                    alert('Please upload a valid PDF.');
                    return;
                }

                addSystemMessage(`Uploading and ingesting 📄 ${file.name}...`);

                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch(`${PYTHON_API_URL}/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error('Upload failed');

                    const data = await response.json();
                    addSystemMessage(`Successfully ingested 📄 ${file.name} (${data.chunks} chunks)`);

                    // Allow multiple files? For now, let's just show it in UI
                    attachedFiles.push({ name: file.name });
                    updatePdfStatusUI();

                } catch (error) {
                    console.error(error);
                    addSystemMessage(`Failed to upload ${file.name}: ${error.message}`);
                }
                input.value = '';
            }
        });
    }
}

// We no longer need extractTextFromPDF since the backend handles it.
// keeping updatePdfStatusUI as is mostly, but we don't have text content client side anymore

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // 1. Add User Message to UI & History
    addMessageToUI(text, 'user', true);

    const typingId = showTypingIndicator();

    try {
        const responseText = await callPythonRAG(text);
        removeTypingIndicator(typingId);

        // 2. Add AI Response to UI & History
        addMessageToUI(responseText, 'ai', true);
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToUI(`⚠️ **Server is waking up**: Render's free tier takes about 60 seconds to start. Please wait a moment and send your message again. <br><br> *(Error: ${error.message})*`, 'ai', false);
    }
}

async function callPythonRAG(userMessage) {
    // We send just the query. The backend handles retrieval from vector DB.
    // If we want to support conversation history in RAG, we'd need to send history or manage it on backend.
    // For this MVP, we send the current query.

    try {
        const response = await fetch(`${PYTHON_API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: userMessage })
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return marked.parse(data.response);
    } catch (e) {
        console.error("RAG API Error:", e);
        throw e;
    }
}

function addMessageToUI(text, type, saveToHistory = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;

    let displayContent = type === 'user' ? text.replace(/</g, "&lt;") : text;

    msgDiv.innerHTML = `
        <div class="message-avatar">${type === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content">${displayContent}</div>
    `;

    chatMessages.appendChild(msgDiv);

    // Render Math using KaTeX
    if (window.renderMathInElement) {
        renderMathInElement(msgDiv, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }

    // Improved scrolling: 
    // If it's a user message, scroll to bottom.
    // If it's AI, valid scrolling behavior depends on content length.
    if (saveToHistory) {
        // Save raw text, not HTML
        chatHistory.push({
            role: type === 'user' ? 'user' : 'model',
            parts: [{ text: text }]
        });
        saveHistory();
    }

    requestAnimationFrame(() => {
        chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
    });
}

function saveHistory() {
    localStorage.setItem(`univault_history_${currentSubject}`, JSON.stringify(chatHistory));
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message ai';
    div.innerHTML = `<div class="message-avatar">🤖</div><div class="message-content">Typing...</div>`;
    chatMessages.appendChild(div);
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    document.getElementById(id)?.remove();
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.style.textAlign = 'center';
    div.style.fontSize = '0.8rem';
    div.style.color = '#888';
    div.style.margin = '10px 0';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
}