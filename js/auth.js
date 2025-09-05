// auth.js - Zentrale Zugriffskontrolle

document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';

    // Bereiche für Gäste und Nutzer ein-/ausblenden
    document.querySelectorAll('.guest-only').forEach(el => {
        el.style.display = isLoggedIn ? 'none' : 'block';
    });

    document.querySelectorAll('.user-only').forEach(el => {
        el.style.display = isLoggedIn ? 'block' : 'none';
    });

    // Login- und Logout-Buttons
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            localStorage.setItem('loggedIn', 'true');
            location.reload();
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.setItem('loggedIn', 'false');
            location.reload();
        });
    }

    // Registrierungshandling
    const registerForm = document.querySelector('#register form');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                showNotification('Passwörter stimmen nicht überein!', 'error');
                return;
            }

            const users = JSON.parse(localStorage.getItem('users')) || [];
            if (users.some(user => user.username === username)) {
                showNotification('Benutzername ist bereits vergeben!', 'warning');
                return;
            }

            users.push({ username, password });
            localStorage.setItem('users', JSON.stringify(users));
            showNotification('Registrierung erfolgreich! Sie können sich jetzt einloggen.', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        });
    }
});

// Zentrale Benachrichtigungslogik
function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;

    // Farben basierend auf dem Typ setzen
    const colors = {
        success: '#d4edda', // Grün
        warning: '#fff3cd', // Gelb
        error: '#f8d7da',   // Rot
        info: '#d1ecf1'     // Blau
    };

    notificationContainer.style.backgroundColor = colors[type] || colors.info;
    notificationContainer.textContent = message;
    notificationContainer.style.display = 'block';

    // Schließen-Button hinzufügen
    let closeButton = notificationContainer.querySelector('.close-button');
    if (!closeButton) {
        closeButton = document.createElement('span');
        closeButton.className = 'close-button';
        closeButton.textContent = '×';
        closeButton.style.float = 'right';
        closeButton.style.cursor = 'pointer';
        closeButton.style.marginRight = '10px';
        closeButton.style.display = 'inline';
        closeButton.addEventListener('click', () => {
            notificationContainer.style.display = 'none';
            closeButton.style.display = 'none';
        });
        notificationContainer.appendChild(closeButton);
    } else {
        closeButton.style.display = 'inline';
    }
}

// Beispiel: showNotification('Registrierung erfolgreich!', 'success');
