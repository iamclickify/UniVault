// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

// Toggle between login and register forms
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    clearMessages();
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    clearMessages();
});

// Login Form Submission - FIXED
loginFormElement.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    console.log('Login attempt:', email); // Debug log

    // Basic validation
    if (!email || !password) {
        showMessage(loginMessage, 'Please fill in all fields', 'error');
        return;
    }

    // Email validation
    if (!isValidEmail(email)) {
        showMessage(loginMessage, 'Please enter a valid email address', 'error');
        return;
    }

    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('univault_users') || '[]');
    console.log('Stored users:', users); // Debug log

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showMessage(loginMessage, 'Invalid email or password', 'error');
        return;
    }

    // Simulate login process
    showMessage(loginMessage, 'Logging in...', 'success');

    setTimeout(() => {
        showMessage(loginMessage, 'Login successful! Redirecting...', 'success');

        // Store session data
        const sessionData = {
            email: user.email,
            name: user.name,
            loggedIn: true,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem('univault_session', JSON.stringify(sessionData));

        // Store user data in localStorage if "Remember Me" is checked
        if (rememberMe) {
            localStorage.setItem('univault_remember', email);
        }

        // Redirect to main app after 1 second
        setTimeout(() => {
            window.location.href = '../app/index.html';
        }, 1000);
    }, 500);
});

// Register Form Submission
registerFormElement.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showMessage(registerMessage, 'Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showMessage(registerMessage, 'Please enter a valid email address', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage(registerMessage, 'Password must be at least 6 characters long', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage(registerMessage, 'Passwords do not match', 'error');
        return;
    }

    if (!agreeTerms) {
        showMessage(registerMessage, 'Please agree to the terms and conditions', 'error');
        return;
    }

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('univault_users') || '[]');
    if (users.some(u => u.email === email)) {
        showMessage(registerMessage, 'An account with this email already exists', 'error');
        return;
    }

    // Simulate registration process
    showMessage(registerMessage, 'Creating your account...', 'success');

    setTimeout(() => {
        // Save user to localStorage
        const newUser = {
            name: name,
            email: email,
            password: password, // In production, NEVER store plain passwords!
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('univault_users', JSON.stringify(users));

        console.log('User registered:', newUser); // Debug log

        showMessage(registerMessage, 'Account created successfully! Redirecting to login...', 'success');

        // Switch to login form after 1.5 seconds
        setTimeout(() => {
            registerForm.classList.remove('active');
            loginForm.classList.add('active');

            // Pre-fill the login email
            document.getElementById('loginEmail').value = email;

            // Clear register form
            registerFormElement.reset();
            clearMessages();

            showMessage(loginMessage, 'Account created! Please login with your credentials.', 'success');
        }, 1500);
    }, 1000);
});

// Helper Functions
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message-box show ${type}`;
}

function clearMessages() {
    loginMessage.className = 'message-box';
    registerMessage.className = 'message-box';
    loginMessage.textContent = '';
    registerMessage.textContent = '';
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Check if user email is remembered
window.addEventListener('load', () => {
    // Check if user is already logged in
    const session = sessionStorage.getItem('univault_session');
    if (session) {
        // User is already logged in, redirect to main app
        window.location.href = '../app/index.html';
        return;
    }

    // Check for remembered email
    const rememberedEmail = localStorage.getItem('univault_remember');
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }

    // Handle hash-based navigation (e.g. from landing page)
    if (window.location.hash === '#register') {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        clearMessages();
    }
});

// Social login handlers (placeholder functions)
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const provider = e.currentTarget.classList.contains('google-btn') ? 'Google' : 'GitHub';
        alert(`${provider} login will be implemented with Firebase Authentication`);
    });
});

// Password strength indicator
const registerPassword = document.getElementById('registerPassword');
if (registerPassword) {
    registerPassword.addEventListener('input', (e) => {
        const password = e.target.value;
        if (password.length > 0 && password.length < 6) {
            e.target.style.borderColor = '#ff6b6b';
        } else if (password.length >= 6) {
            e.target.style.borderColor = '#51cf66';
        } else {
            e.target.style.borderColor = '#e0e0e0';
        }
    });
}