// auth.js - Zentrale Zugriffskontrolle

// Globale Deklaration von 'users' und 'user'
var users = JSON.parse(localStorage.getItem('users')) || [];
var user = users.find(u => u.username === 'test');

// Zentrale Funktion zur Verwaltung des Login-Status
function setLoginStatus(isLoggedIn) {
    localStorage.setItem('loggedIn', isLoggedIn ? 'true' : 'false');
}

function getLoginStatus() {
    return localStorage.getItem('loggedIn') === 'true';
}

function clearLoginStatus() {
    localStorage.removeItem('loggedIn');
}

// Sichtbarkeit der Buttons basierend auf Login-Status und Seite
function updateButtonVisibility() {
    const isLoggedIn = getLoginStatus();
    const currentPath = window.location.pathname;

    const adminButton = document.querySelector('.admin-button');
    const profileButton = document.querySelector('.profile-button');
    const logoutButton = document.querySelector('.logout-button');

    if (currentPath.endsWith('index.html')) {
        if (adminButton) adminButton.style.display = 'block';
        if (profileButton) profileButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
    } else if (currentPath.endsWith('dashboard.html')) {
        if (adminButton) adminButton.style.display = 'none';
        if (profileButton) profileButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'block';
    }

    // Bereiche für Gäste und Nutzer ein-/ausblenden
    document.querySelectorAll('.guest-only').forEach(el => {
        el.style.display = isLoggedIn ? 'none' : 'block';
    });

    document.querySelectorAll('.user-only').forEach(el => {
        el.style.display = isLoggedIn ? 'block' : 'none';
    });
}

// Debug-Flag zur Steuerung von Logs
const DEBUG_MODE = false;

// Fügt Logs hinzu, um den Login-Status und die Benutzeranzahl zu überprüfen
function logAuthState() {
    const isLoggedIn = getLoginStatus();
    const currentUser = localStorage.getItem('username');
    const users = JSON.parse(localStorage.getItem('users')) || [];

    console.log('Authentifizierungsstatus: ' + (isLoggedIn ? 'Eingeloggt' : 'Nicht eingeloggt'));
    console.log('Aktueller Benutzer: ' + (currentUser || 'Kein Benutzer eingeloggt'));
    console.log('Anzahl der Benutzer in der Datenbank: ' + users.length);
    users.forEach(user => {
        console.log(`Benutzername: ${user.username}, Passwort: ${user.password}`);
    });
}

// Aktualisiert die Header-Buttons
function updateHeaderButtons() {
    const isLoggedIn = getLoginStatus();

    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const adminButton = document.getElementById('admin-button');
    const profileButton = document.getElementById('profile-button');

    if (loginButton) loginButton.style.display = isLoggedIn ? 'none' : 'block';
    if (logoutButton) logoutButton.style.display = isLoggedIn ? 'block' : 'none';
    if (adminButton) adminButton.style.display = isLoggedIn ? 'block' : 'none';
    if (profileButton) profileButton.style.display = isLoggedIn ? 'block' : 'none';
}

// Konsolidiert das Logging
function refreshUIAfterAuthChange() {
    updateHeaderButtons();
    updateButtonVisibility();
    logAuthState(); // Loggt den Status nur einmal
}

// Initialisiert die Header-Buttons beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    logAuthState(); // Loggt den Status direkt beim Laden
    refreshUIAfterAuthChange();

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            handleLogout();
            refreshUIAfterAuthChange();
        });
    }
});

// Login-Funktion
async function handleLogin(username, password) {
    if (!username || !password) {
        showNotification('Benutzername und Passwort dürfen nicht leer sein!', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const hashedPassword = await hashPassword(password);

    const user = users.find(u => u.username === username && u.password === hashedPassword);

    console.log('Benutzerliste:', users);
    console.log('Suchergebnis:', user);

    if (user) {
        setLoginStatus(true);
        localStorage.setItem('username', user.username);
        showNotification('Login erfolgreich!', 'success');
        refreshUIAfterAuthChange(); // UI aktualisieren
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    } else {
        showNotification('Ungültige Anmeldedaten. Bitte erneut versuchen.', 'error');
    }
}

// Logout-Funktion
function handleLogout() {
    clearLoginStatus();
    localStorage.removeItem('username');
    showNotification('Logout erfolgreich!', 'success');
    refreshUIAfterAuthChange(); // UI aktualisieren
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// Passwort-Hashing with SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Verbesserte Benutzerregistrierung mit Validierung
async function handleRegister(username, password, confirmPassword) {
    if (!username || !password) {
        showNotification('Benutzername und Passwort dürfen nicht leer sein!', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwörter stimmen nicht überein!', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];

    // Überprüfen, ob der Benutzername bereits existiert
    if (users.some(user => user.username === username)) {
        showNotification('Benutzername ist bereits vergeben!', 'warning');
        return;
    }

    // Validierung: Benutzername und Passwort dürfen nicht undefined oder leer sein
    if (typeof username !== 'string' || username.trim() === '' || typeof password !== 'string' || password.trim() === '') {
        showNotification('Ungültige Eingaben! Benutzername und Passwort dürfen nicht leer sein.', 'error');
        return;
    }

    const hashedPassword = await hashPassword(password);

    users.push({ username, password: hashedPassword });
    localStorage.setItem('users', JSON.stringify(users));

    showNotification('Registrierung erfolgreich!', 'success');
}

// Registrierungshandling
const registerForm = document.querySelector('#register form');
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        await handleRegister(username, password, confirmPassword);
    });
}

// Login-Funktionalität
const loginForm = document.querySelector('#login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Verhindert das Standard-Formularverhalten

        const username = document.querySelector('#username').value;
        const password = document.querySelector('#password').value;

        // Validierung der Eingaben
        if (!username || !password) {
            console.error('Ungültige Eingaben:', { username, password });
            showNotification('Benutzername und Passwort dürfen nicht leer sein!', 'error');
            return;
        }

        // Zusätzliche Validierung für Benutzername und Passwort
        if (typeof username !== 'string' || username.trim() === '' || typeof password !== 'string' || password.trim() === '') {
            showNotification('Ungültige Eingaben! Benutzername und Passwort dürfen nicht leer sein.', 'error');
            return;
        }

        console.log('Eingegebener Benutzername:', username);
        console.log('Eingegebenes Passwort:', password);

        // Bereinigung der Benutzerliste von ungültigen Einträgen
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const validUsers = users.filter(user => typeof user.username === 'string' && user.username.trim() !== '' && typeof user.password === 'string' && user.password.trim() !== '');
        localStorage.setItem('users', JSON.stringify(validUsers));
        showNotification('Bereinigte Benutzerliste nach Validierung: ' + JSON.stringify(validUsers), 'info');

        try {
            const hashedPassword = await hashPassword(password);

            const user = validUsers.find(u => u.username === username && u.password === hashedPassword);

            if (user) {
                setLoginStatus(true);
                localStorage.setItem('username', user.username);
                showNotification('Login erfolgreich!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                showNotification('Ungültige Anmeldedaten. Bitte erneut versuchen.', 'error');
            }
        } catch (error) {
            console.error('Fehler beim Login:', error);
            showNotification('Ein Fehler ist aufgetreten: ' + error.message, 'error');
        }
    });
}

// Unterstützung der Enter-Taste für Formulare
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('#register-form');
    const loginForm = document.querySelector('#login-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            await handleRegister(username, password, confirmPassword);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            await handleLogin(username, password);
        });
    }
});

// Funktion zum Speichern von Logs in localStorage
function saveLog(message) {
    const existingLogs = JSON.parse(localStorage.getItem('persistentLogs')) || [];
    existingLogs.push({ timestamp: new Date().toISOString(), message });
    localStorage.setItem('persistentLogs', JSON.stringify(existingLogs));
}

// Funktion zum Abrufen der Logs
function getLogs() {
    return JSON.parse(localStorage.getItem('persistentLogs')) || [];
}

// Beispiel: Logs speichern
saveLog('Benutzerliste: ' + JSON.stringify(users));
saveLog('Suchergebnis: ' + JSON.stringify(user));

// Funktion zur Bereinigung doppelter Benutzer
function removeDuplicateUsers() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex(u => u.username === user.username && u.password === user.password)
    );
    localStorage.setItem('users', JSON.stringify(uniqueUsers));
}

// Entfernt ungültige Benutzer aus localStorage nur bei Bedarf und loggt relevante Informationen
function removeInvalidUsersIfNeeded() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const validUsers = users.filter(user => user.username && user.password);

    // Überprüfen, ob ungültige Benutzer existieren
    if (users.length !== validUsers.length) {
        localStorage.setItem('users', JSON.stringify(validUsers));
        console.log(`Ungültige Benutzer entfernt: ${users.length - validUsers.length}`);
        saveLog(`Ungültige Benutzer entfernt: ${users.length - validUsers.length}`);
    } else {
        console.log('Keine ungültigen Benutzer gefunden.');
    }
}

// Initialisierung der Benutzerbereinigung nur bei bestimmten Bedingungen
function initializeUserCleanup() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const hasInvalidUsers = users.some(user => !user.username || !user.password);

    if (hasInvalidUsers) {
        removeInvalidUsersIfNeeded();
    } else {
        console.log('Benutzerbereinigung nicht erforderlich.');
    }
}

// Aufruf der Bereinigung nur bei bestimmten Ereignissen (z. B. Registrierung oder Login)
// initializeUserCleanup(); // Entfernt aus dem globalen Seitenaufruf

// Sicherstellen, dass `refreshUIAfterAuthChange` verfügbar ist
document.addEventListener('DOMContentLoaded', () => {
    if (typeof refreshUIAfterAuthChange === 'function') {
        refreshUIAfterAuthChange();
    } else {
        console.error('Die Funktion refreshUIAfterAuthChange ist nicht definiert.');
    }
});

// Definiert die Funktion `refreshUIAfterAuthChange`, falls sie fehlt
function refreshUIAfterAuthChange() {
    updateHeaderButtons();
}

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

// Stellt sicher, dass handleLogout global verfügbar ist
window.handleLogout = handleLogout;

// Funktion zum Schreiben von Debug-Logs in eine lokale Datei
function writeToLogFile(message) {
    const existingLogs = localStorage.getItem('debugLogs') || '';
    const updatedLogs = existingLogs + `\n${new Date().toISOString()} - ${message}`;
    localStorage.setItem('debugLogs', updatedLogs);
}

// Beispiel für die Verwendung:
writeToLogFile('Benutzerliste: ' + JSON.stringify(users));
writeToLogFile('Suchergebnis: ' + JSON.stringify(user));

// Funktion zum Exportieren der Logs in die debug.log-Datei
function exportLogsToFile() {
    const logs = localStorage.getItem('debugLogs') || '';
    const blob = new Blob([logs], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'debug.log';
    link.click();
}

// Beispiel: Exportieren der Logs
// exportLogsToFile();

// Überschreibt console.log, um Logs direkt in die debug.log-Datei zu schreiben
(function() {
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        originalConsoleLog.apply(console, args);
    };
})();

// Funktion zur Anzeige von Logs
function showLogs() {
    const logs = JSON.parse(localStorage.getItem('persistentLogs')) || [];
    const logContainer = document.createElement('div');
    logContainer.style.padding = '10px';
    logContainer.style.margin = '10px';
    logContainer.style.border = '1px solid #ccc';
    logContainer.style.backgroundColor = '#f9f9f9';
    logContainer.style.maxHeight = '300px';
    logContainer.style.overflowY = 'scroll';

    logs.forEach(log => {
        const logEntry = document.createElement('p');
        logEntry.textContent = `${log.timestamp}: ${log.message}`;
        logContainer.appendChild(logEntry);
    });

    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
        headerRight.appendChild(logContainer);
    } else {
        console.error('Header-Container nicht gefunden. Logs können nicht angezeigt werden.');
    }
}

// Stellt sicher, dass die Funktion global verfügbar ist
window.showLogs = showLogs;
