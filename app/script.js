// Auth Check
(function () {
    const session = sessionStorage.getItem('univault_session');
    if (!session) {
        window.location.href = '../auth/login.html';
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
const GEMINI_API_KEY = 'ddc-a4f-b054e9c9f6cc450b8df1b6aec3e61283'; //AIzaSyB_4Uc458Vhx1tZ2-LBM5bTYD9SYWepC-Y
// Available Models: 'gemini-2.0-flash-exp' (Free), 'gemini-1.5-flash' (Stable), 'gemini-1.5-pro' (Limited)
const MODEL_NAME = 'provider-5/gemini-3-pro';

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
                window.location.href = '../auth/login.html';
            }
        });
    }

    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            window.location.href = '../home/index.html';
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

                // Add system message (transient)
                addSystemMessage(`Reading 📄 ${file.name}...`);

                try {
                    await extractTextFromPDF(file);
                    addSystemMessage(`Attached 📄 ${file.name}`);
                } catch (error) {
                    console.error(error);
                    addSystemMessage(`Failed to read ${file.name}`);
                }
                input.value = '';
            }
        });
    }
}

async function extractTextFromPDF(file) {
    if (attachedFiles.some(f => f.name === file.name)) return;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 10); // Limit 10 pages

    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += `--- Page ${i} ---\n${textContent.items.map(s => s.str).join(' ')}\n\n`;
    }

    attachedFiles.push({ name: file.name, text: fullText });
    updatePdfStatusUI();
}

function updatePdfStatusUI() {
    if (!pdfStatusContainer) return;
    pdfStatusContainer.innerHTML = '';
    if (attachedFiles.length > 0) {
        pdfStatusContainer.style.display = 'flex';
        attachedFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'pdf-status-item';
            item.innerHTML = `📄 ${file.name} <button onclick="removeFile('${file.name}')">×</button>`;
            pdfStatusContainer.appendChild(item);
        });
    } else {
        pdfStatusContainer.style.display = 'none';
    }
}

window.removeFile = function (fileName) {
    attachedFiles = attachedFiles.filter(f => f.name !== fileName);
    updatePdfStatusUI();
};

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // 1. Add User Message to UI & History
    addMessageToUI(text, 'user', true);

    const typingId = showTypingIndicator();

    try {
        const response = await callGeminiAPI(text);
        removeTypingIndicator(typingId);

        // 2. Add AI Response to UI & History
        addMessageToUI(response, 'ai', true);
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToUI(`Error: ${error.message}`, 'ai', false); // Don't save errors
    }
}

async function callGeminiAPI(userMessage) {
    if (!GEMINI_API_KEY) {
        throw new Error("Please set your API Key in script.js");
    }

    // Using Custom Provider (OpenAI Compatible Endpoint)
    const API_URL = 'https://api.a4f.co/v1/chat/completions';

    // 1. Construct System Instruction
    let subjectContext = currentSubject === 'general' ? 'General Knowledge' : subjectsData[currentSubject]?.title;
    let systemText = `You are an expert AI tutor for ${subjectContext}. 
    
    Start by reading the user's question carefully.
    
    CRITICAL INSTRUCTIONS:
    1. **Be Concise & Student-Friendly**: Use simple language. Avoid lengthy, complex academic explanations unless asked.
    2. **Use the Simplest Method**: Solve problems using standard high-school or undergraduate methods. Avoid overly advanced techniques if a simpler one exists.
    3. **Step-by-Step, but Brief**: Show your steps clearly, but keep descriptions short.
    4. **Format Math Beautifully**: Use LaTeX for ALL math expressions.
       - Use $...$ for inline math.
       - Use $$...$$ for block equations.
    5. **Direct Answer**: Start with the direct answer or main concept, then explain.`;

    if (attachedFiles.length > 0) {
        systemText += `\n\nCONTEXT DOCUMENTS:\n`;
        attachedFiles.forEach((f, i) => systemText += `[Doc ${i + 1}: ${f.name}]\n${f.text}\n`);
    }

    // 2. Build Messages Array (OpenAI Format)
    const validHistory = chatHistory
        .filter(msg => msg.role && msg.parts && msg.parts[0].text)
        .map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts[0].text
        }));

    const recentHistory = validHistory.slice(-6);

    const messages = [
        { role: 'system', content: systemText },
        ...recentHistory,
        { role: 'user', content: userMessage }
    ];

    const payload = {
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errData = await response.json();
        console.error("API Error:", errData);
        throw new Error(errData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return marked.parse(data.choices[0].message.content);
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