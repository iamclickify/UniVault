
// Check Auth
const session = sessionStorage.getItem('univault_session');
if (!session) {
    window.location.href = 'auth/login.html';
}
const userData = JSON.parse(session);

document.addEventListener('DOMContentLoaded', () => {
    // User Info
    document.getElementById('dash-username').innerText = userData.name.split(' ')[0];
    document.getElementById('userName').innerText = userData.name;
    document.getElementById('userAvatar').innerText = userData.name.charAt(0).toUpperCase();

    // Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-US', options);

    // Initialize Chart
    initChart();

    // Profile Menu Logic
    setupProfileMenu();
});

function initChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Hours Studied',
                data: [1.5, 2, 1, 3, 2.5, 4, 1], // Mock Data
                borderColor: '#6B46C1', // Primary Color
                backgroundColor: 'rgba(107, 70, 193, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E2E8F0' } },
                x: { grid: { display: false } }
            }
        }
    });
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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Log out?')) {
                sessionStorage.removeItem('univault_session');
                window.location.href = 'auth/login.html';
            }
        });
    }
}
