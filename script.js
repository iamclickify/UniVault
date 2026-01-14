// Sample PDF data for each subject
const subjectData = {
    mathematics: {
        icon: '📐',
        title: 'Mathematics',
        desc: 'Calculus, Linear Algebra, Statistics, Differential Equations',
        pdfs: [
            { name: 'Calculus I - Introduction', size: '2.5 MB', pages: 45 },
            { name: 'Linear Algebra Fundamentals', size: '3.1 MB', pages: 62 },
            { name: 'Statistics and Probability', size: '4.2 MB', pages: 78 },
            { name: 'Differential Equations', size: '2.8 MB', pages: 55 },
            { name: 'Vector Calculus', size: '3.5 MB', pages: 68 },
            { name: 'Abstract Algebra', size: '4.0 MB', pages: 82 }
        ]
    },
    physics: {
        icon: '⚛️',
        title: 'Physics',
        desc: 'Mechanics, Thermodynamics, Quantum Physics, Electromagnetism',
        pdfs: [
            { name: 'Classical Mechanics', size: '3.2 MB', pages: 72 },
            { name: 'Thermodynamics Basics', size: '2.9 MB', pages: 58 },
            { name: 'Quantum Physics Introduction', size: '4.5 MB', pages: 95 },
            { name: 'Electromagnetism Theory', size: '3.8 MB', pages: 88 },
            { name: 'Optics and Waves', size: '3.1 MB', pages: 65 },
            { name: 'Modern Physics', size: '4.2 MB', pages: 92 }
        ]
    },
    'computer-science': {
        icon: '💻',
        title: 'Computer Science',
        desc: 'Data Structures, Algorithms, AI/ML, Database Systems',
        pdfs: [
            { name: 'Data Structures Complete Guide', size: '5.2 MB', pages: 120 },
            { name: 'Algorithm Design and Analysis', size: '4.8 MB', pages: 105 },
            { name: 'Machine Learning Fundamentals', size: '6.1 MB', pages: 145 },
            { name: 'Database Management Systems', size: '4.5 MB', pages: 98 },
            { name: 'Operating Systems Concepts', size: '5.5 MB', pages: 132 },
            { name: 'Computer Networks', size: '4.9 MB', pages: 115 }
        ]
    },
    chemistry: {
        icon: '🧪',
        title: 'Chemistry',
        desc: 'Organic Chemistry, Inorganic, Physical Chemistry',
        pdfs: [
            { name: 'Organic Chemistry Basics', size: '4.1 MB', pages: 85 },
            { name: 'Inorganic Chemistry', size: '3.7 MB', pages: 75 },
            { name: 'Physical Chemistry', size: '4.4 MB', pages: 92 },
            { name: 'Chemical Bonding', size: '2.9 MB', pages: 58 },
            { name: 'Reaction Mechanisms', size: '3.5 MB', pages: 68 }
        ]
    },
    biology: {
        icon: '🧬',
        title: 'Biology',
        desc: 'Cell Biology, Genetics, Microbiology, Ecology',
        pdfs: [
            { name: 'Cell Biology Fundamentals', size: '4.3 MB', pages: 88 },
            { name: 'Genetics and Evolution', size: '5.1 MB', pages: 112 },
            { name: 'Microbiology Essentials', size: '3.9 MB', pages: 82 },
            { name: 'Ecology and Environment', size: '4.6 MB', pages: 95 },
            { name: 'Human Anatomy', size: '5.8 MB', pages: 125 }
        ]
    },
    engineering: {
        icon: '⚙️',
        title: 'Engineering',
        desc: 'Mechanical, Electrical, Civil, Software Engineering',
        pdfs: [
            { name: 'Engineering Mechanics', size: '5.5 MB', pages: 128 },
            { name: 'Electrical Circuits', size: '4.7 MB', pages: 102 },
            { name: 'Structural Engineering', size: '6.2 MB', pages: 142 },
            { name: 'Software Engineering Principles', size: '5.9 MB', pages: 135 },
            { name: 'Thermodynamics for Engineers', size: '4.8 MB', pages: 108 },
            { name: 'Control Systems', size: '5.1 MB', pages: 118 }
        ]
    }
};

// DOM elements
const dashboardView = document.getElementById('dashboardView');
const subjectDetailView = document.getElementById('subjectDetailView');
const subjectsGrid = document.getElementById('subjectsGrid');
const backBtn = document.getElementById('backBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const searchInput = document.getElementById('searchInput');

let currentSubject = null;

// Subject card click handler
subjectsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.subject-card');
    if (card) {
        const subject = card.dataset.subject;
        loadSubject(subject);
    }
});

// Back button
backBtn.addEventListener('click', () => {
    dashboardView.classList.remove('hidden');
    subjectDetailView.classList.remove('active');
    currentSubject = null;
    // Clear chat when going back
    chatMessages.innerHTML = `
        <div class="message ai">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                Hello! I'm your AI tutor powered by Google Gemini. I can help you understand concepts, solve problems, and answer questions about your study materials. How can I assist you today?
            </div>
        </div>
    `;
});

// Load subject details
function loadSubject(subject) {
    currentSubject = subject;
    const data = subjectData[subject];
    
    // Update UI
    document.getElementById('subjectIcon').textContent = data.icon;
    document.getElementById('subjectTitle').textContent = data.title;
    document.getElementById('subjectDesc').textContent = data.desc;
    
    // Load PDFs
    const pdfGrid = document.getElementById('pdfGrid');
    pdfGrid.innerHTML = '';
    
    data.pdfs.forEach((pdf, index) => {
        const pdfCard = document.createElement('div');
        pdfCard.className = 'pdf-card';
        pdfCard.innerHTML = `
            <div class="pdf-icon">📄</div>
            <h4>${pdf.name}</h4>
            <div class="pdf-info">${pdf.size} • ${pdf.pages} pages</div>
            <button onclick="viewPDF('${pdf.name}')">View PDF</button>
        `;
        pdfGrid.appendChild(pdfCard);
    });
    
    // Show subject detail view
    dashboardView.classList.add('hidden');
    subjectDetailView.classList.add('active');
}

// View PDF function (placeholder)
function viewPDF(pdfName) {
    alert(`Opening: ${pdfName}\n\nIn production, this will open the PDF from Firebase Storage.`);
}

// Chat functionality
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Simulate AI response (replace with actual Gemini API call)
    setTimeout(() => {
        typingDiv.remove();
        const responses = [
            `Great question about ${currentSubject ? subjectData[currentSubject].title : 'your studies'}! Let me help you with that.`,
            `That's an interesting topic. Based on the study materials available, here's what I can tell you...`,
            `I understand you're asking about this concept. Let me break it down for you step by step.`,
            `Excellent question! This is a fundamental concept in ${currentSubject ? subjectData[currentSubject].title : 'this subject'}.`
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomResponse, 'ai');
    }, 1500);
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = sender === 'user' ? '👤' : '🤖';
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${text}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.subject-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});