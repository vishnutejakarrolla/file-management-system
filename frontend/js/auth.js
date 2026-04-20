const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const switchLink = document.getElementById('switchLink');
    const authSubtitle = document.getElementById('authSubtitle');
    const authBtn = document.getElementById('authBtn');
    const switchText = document.getElementById('switchText');
    const notificationContainer = document.getElementById('notificationContainer');
    
    let isLogin = true;

    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
    }

    const showNotification = (msg, type = 'success') => {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerText = msg;
        notificationContainer.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    };

    switchLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        
        if (isLogin) {
            authSubtitle.innerText = 'Sign in to your account';
            authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            switchText.innerText = "Don't have an account?";
            switchLink.innerText = 'Sign Up';
        } else {
            authSubtitle.innerText = 'Create a new account';
            authBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
            switchText.innerText = "Already have an account?";
            switchLink.innerText = 'Sign In';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                if (isLogin) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('username', data.username);
                    showNotification('Login successful!');
                    setTimeout(() => window.location.href = 'dashboard.html', 1000);
                } else {
                    showNotification('Registration successful! Please sign in.');
                    switchLink.click(); // Switch to login
                }
            } else {
                showNotification(data.msg || 'Authentication failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Server error. Please try again.', 'error');
        }
    });
});
