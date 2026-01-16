// Auth Check - Must be at the top of script.js
(function() {
    const session = sessionStorage.getItem('univault_session');
    
    if (!session) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    // Parse session data
    const userData = JSON.parse(session);
    
    // Update UI with user data
    document.addEventListener('DOMContentLoaded', () => {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userNameDisplay) {
            userNameDisplay.textContent = userData.name.split(' ')[0];
        }
        
        if (userName) {
            userName.textContent = userData.name;
        }
        
        if (userAvatar) {
            userAvatar.textContent = userData.name.charAt(0).toUpperCase();
        }
    });
})();

// Logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                // Clear session
                sessionStorage.removeItem('univault_session');
                
                // Redirect to login
                window.location.href = 'login.html';
            }
        });
    }
});

// REST OF YOUR EXISTING script.js CODE BELOW...
// (Keep all the existing code for subject data, loadSubject, sendMessage, etc.)