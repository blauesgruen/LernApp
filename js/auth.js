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
    logMessage('updateButtonVisibility aufgerufen. Login-Status: ' + isLoggedIn);

    const adminButton = document.querySelector('.admin-button');
    const profileButton = document.querySelector('.profile-button');
    const logoutButton = document.querySelector('.logout-button');
    const loginButton = document.querySelector('.login-button');

    if (isLoggedIn) {
        // Eingeloggt: Alle Buttons außer Admin sichtbar
        logMessage('Benutzer ist eingeloggt. Admin-Button wird ausgeblendet.');
        if (adminButton) adminButton.style.display = 'none';
        if (profileButton) profileButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'block';
        if (loginButton) loginButton.style.display = 'none';
    } else {
        // Nicht eingeloggt: Nur Admin sichtbar
        logMessage('Benutzer ist nicht eingeloggt. Nur Admin-Button wird angezeigt.');
        if (adminButton) adminButton.style.display = 'block';
        if (profileButton) profileButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
        if (loginButton) loginButton.style.display = 'block';
    }

    // Bereiche für Gäste und Nutzer ein-/ausblenden
    document.querySelectorAll('.guest-only').forEach(el => {
        el.style.display = isLoggedIn ? 'none' : 'block';
    });

    document.querySelectorAll('.user-only').forEach(el => {
        el.style.display = isLoggedIn ? 'block' : 'none';
    });

    logMessage('updateButtonVisibility abgeschlossen.');
}

// Debug-Flag zur Steuerung von Logs
const DEBUG_MODE = true;

// Zentrale Logging-Funktion mit erzwungener Sichtbarkeit
function logMessage(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };

    try {
        // Logs in localStorage abrufen und aktualisieren
        const existingLogs = JSON.parse(localStorage.getItem('persistentLogs')) || [];

        // Doppelte Einträge vermeiden (Berücksichtigung von Zeitstempel)
        if (!existingLogs.some(log => log.message === message && log.type === type)) {
            existingLogs.push(logEntry);

            // Älteste Logs entfernen, wenn die maximale Kapazität erreicht wird
            while (JSON.stringify(existingLogs).length > 5000) { // Beispielgröße: 5000 Bytes
                existingLogs.shift();
            }

            localStorage.setItem('persistentLogs', JSON.stringify(existingLogs));
        }

        // Logs immer in der Konsole ausgeben
        console[type](`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            const existingLogs = JSON.parse(localStorage.getItem('persistentLogs')) || [];
            existingLogs.shift(); // Entferne das älteste Log
            localStorage.setItem('persistentLogs', JSON.stringify(existingLogs));
            logMessage(message, type); // Erneut versuchen
        } else {
            console.error('Fehler beim Logging:', error);
        }
    }
}

// Beispiel für die Verwendung der zentralen Logging-Funktion
logMessage('Authentifizierungsstatus: ' + (getLoginStatus() ? 'Eingeloggt' : 'Nicht eingeloggt'));
logMessage('Aktueller Benutzer: ' + (localStorage.getItem('username') || 'Kein Benutzer eingeloggt'));
logMessage('Anzahl der Benutzer in der Datenbank: ' + (JSON.parse(localStorage.getItem('users')) || []).length);

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
    logMessage('Authentifizierungsstatus: ' + (getLoginStatus() ? 'Eingeloggt' : 'Nicht eingeloggt'));
    logMessage('Aktueller Benutzer: ' + (localStorage.getItem('username') || 'Kein Benutzer eingeloggt'));
    logMessage('Anzahl der Benutzer in der Datenbank: ' + (JSON.parse(localStorage.getItem('users')) || []).length);
}

// Sichtbarkeit der Header-Elemente aktualisieren
function updateHeaderVisibility() {
    const adminButton = document.getElementById('admin-button');
    const userButtons = document.getElementById('user-buttons');
    const isLoggedIn = getLoginStatus();

    logMessage('updateHeaderVisibility aufgerufen. Login-Status: ' + isLoggedIn);

    if (adminButton) {
        adminButton.style.display = isLoggedIn ? 'none' : 'block';
        logMessage('Admin-Button Sichtbarkeit: ' + adminButton.style.display);
    } else {
        logMessage('Admin-Button nicht gefunden.', 'error');
    }

    if (userButtons) {
        userButtons.style.display = isLoggedIn ? 'block' : 'none';
        logMessage('User-Buttons Sichtbarkeit: ' + userButtons.style.display);
    } else {
        logMessage('User-Buttons Gruppe nicht gefunden.', 'error');
    }
}

// Funktion zum erneuten Versuch, Header-Sichtbarkeit zu aktualisieren
function retryUpdateHeaderVisibility(retries = 5, delay = 200) {
    if (retries === 0) {
        logMessage('Elemente konnten nach mehreren Versuchen nicht gefunden werden.', 'error');
        return;
    }

    const adminButton = document.getElementById('admin-button');
    const userButtons = document.getElementById('user-buttons');

    if (adminButton && userButtons) {
        updateHeaderVisibility();
    } else {
        setTimeout(() => retryUpdateHeaderVisibility(retries - 1, delay), delay);
    }
}

// Initialisiert die Header-Buttons beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    logMessage('Authentifizierungsstatus: ' + (getLoginStatus() ? 'Eingeloggt' : 'Nicht eingeloggt'));
    logMessage('Aktueller Benutzer: ' + (localStorage.getItem('username') || 'Kein Benutzer eingeloggt'));
    logMessage('Anzahl der Benutzer in der Datenbank: ' + (JSON.parse(localStorage.getItem('users')) || []).length);

    refreshUIAfterAuthChange();
    retryUpdateHeaderVisibility();

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            handleLogout();
            refreshUIAfterAuthChange();
        });
    }

    // Entferne den Log-Button aus dem Header, falls vorhanden
    const logButton = document.getElementById('log-button');
    if (logButton) {
        logButton.parentNode.removeChild(logButton);
        logMessage('Log-Button wurde aus dem Header entfernt.');
    }
});

// Login-Funktion
async function handleLogin(username, password) {
    logMessage('handleLogin wurde aufgerufen mit Benutzername: ' + username + ' und Passwort: ' + password);

    // Prüfen, ob hashPassword-Funktion verfügbar ist
    if (!window.hashPassword) {
        logMessage('Fehler: hashPassword-Funktion nicht verfügbar', 'error');
        showError('Ein interner Fehler ist aufgetreten.');
        return;
    }

    if (!username || !password) {
        logMessage('Fehler: Benutzername oder Passwort ist leer', 'error');
        showError('Benutzername und Passwort dürfen nicht leer sein!');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const hashedPassword = await window.hashPassword(password);

    const user = users.find(u => u.username === username && u.password === hashedPassword);

    console.log('Benutzerliste:', users);
    console.log('Suchergebnis:', user);

    // Debugging-Logs hinzugefügt
    console.log('Login-Status:', getLoginStatus());
    console.log('Aktueller Benutzer in localStorage:', localStorage.getItem('username'));
    console.log('Benutzerliste in localStorage:', JSON.parse(localStorage.getItem('users')) || []);

    console.log('Eingegebener Benutzername:', username);
    console.log('Eingegebenes Passwort:', password);
    console.log('Gehashtes Passwort:', hashedPassword);
    console.log('Benutzerliste aus localStorage:', users);
    console.log('Gefundener Benutzer:', user);
    console.log('Vergleich eingegebener Passwort:', hashedPassword, 'mit gespeichertem Passwort:', user ? user.password : 'Kein Benutzer gefunden');

    logMessage('Benutzerliste aus localStorage: ' + JSON.stringify(users));
    logMessage('Eingegebenes Passwort vor Hashing: ' + password);
    logMessage('Gehashtes Passwort: ' + hashedPassword);

    // Debugging-Logs zur Validierung der Passwortspeicherung und Sicherstellung einer konsistenten Hashing während des Logins
    logMessage('Validating password storage and hashing consistency.');

    // Überprüfen, ob Passwörter während der Registrierung korrekt gehasht werden
    if (!users.every(u => u.password && u.password.length === 64)) {
        logMessage('Warning: Some stored passwords are not hashed correctly.', 'warning');
    }

    // Debugging-Logs für den Passwortvergleich
    if (user) {
        logMessage('Passwortvergleichsergebnis: ' + (user.password === hashedPassword));
    } else {
        logMessage('Kein passender Benutzer gefunden oder Passwort stimmt nicht überein.', 'error');
        // Zentrale Benachrichtigung für Fehlerfall
        showError('Benutzername oder Passwort falsch!');
        setLoginStatus(false);
        return; // Frühzeitig beenden, um Weiterleitung zu verhindern
    }

    if (user) {
        localStorage.setItem('username', user.username); // Benutzername speichern
        setLoginStatus(true);
        logMessage('Login-Status wurde auf "eingeloggt" gesetzt.');
        
        // Überprüfen, ob es der erste Login dieses Benutzers ist
        const isFirstLogin = !localStorage.getItem('firstLoginComplete');
        if (isFirstLogin) {
            logMessage('Erster Login des Benutzers erkannt.');
            // Erstlogin-Status wird im Dashboard überprüft
        }
        
        // Erfolgsmeldung über das zentrale Benachrichtigungssystem
        showSuccess('Login erfolgreich! Sie werden weitergeleitet...');
        
        // Kurze Verzögerung für die Anzeige der Erfolgsmeldung
        setTimeout(() => {
            // Weiterleitung zum Dashboard
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        logMessage('Kein Benutzer gefunden oder Passwortvergleich fehlgeschlagen.', 'error');
        // Dies sollte nie erreicht werden, da wir bereits oben bei user==null abbrechen
        showError('Ein unerwarteter Fehler ist aufgetreten.');
        setLoginStatus(false);
    }
}

// Logout-Funktion
function handleLogout() {
    logMessage('handleLogout wurde aufgerufen.');
    clearLoginStatus();
    localStorage.removeItem('username'); // Benutzername aus localStorage entfernen
    logMessage('Benutzer wurde ausgeloggt.');
    refreshUIAfterAuthChange(); // UI aktualisieren
    window.location.href = 'index.html'; // Weiterleitung zur Login-Seite
}

// Verknüpfe den UI-Button mit der zentralen Logging-Funktion
window.showLogs = function() {
    logMessage('showLogs wurde aufgerufen.');

    const logs = JSON.parse(localStorage.getItem('persistentLogs')) || [];
    logMessage('Anzahl der abgerufenen Logs: ' + logs.length);

    const logContainer = document.createElement('div');
    logContainer.style.padding = '10px';
    logContainer.style.margin = '10px';
    logContainer.style.border = '1px solid #ccc';
    logContainer.style.backgroundColor = '#f9f9f9';
    logContainer.style.maxHeight = '300px';
    logContainer.style.overflowY = 'scroll';
    logContainer.style.fontFamily = 'Arial, sans-serif';
    logContainer.style.fontSize = '14px';
    logContainer.style.lineHeight = '1.5';

    logs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '10px';
        logEntry.style.padding = '5px';
        logEntry.style.borderBottom = '1px solid #ddd';

        const logTimestamp = document.createElement('span');
        logTimestamp.style.fontWeight = 'bold';
        logTimestamp.style.color = '#555';
        logTimestamp.textContent = log.timestamp;

        const logType = document.createElement('span');
        logType.style.marginLeft = '10px';
        logType.style.fontWeight = 'bold';
        logType.style.color = log.type === 'error' ? 'red' : '#007BFF';
        logType.textContent = `[${log.type.toUpperCase()}]`;

        const logMessage = document.createElement('span');
        logMessage.style.marginLeft = '10px';
        logMessage.textContent = log.message;

        // Bereinige verschachtelte oder redundante Log-Daten
        if (log.message.includes('{') && log.message.includes('}')) {
            try {
                const parsedMessage = JSON.parse(log.message);
                logMessage.textContent = JSON.stringify(parsedMessage, null, 2);
                logMessage.style.whiteSpace = 'pre-wrap';
            } catch (e) {
                // Falls JSON-Parsing fehlschlägt, belasse die Nachricht unverändert
            }
        }

        logEntry.appendChild(logTimestamp);
        logEntry.appendChild(logType);
        logEntry.appendChild(logMessage);
        logContainer.appendChild(logEntry);
    });

    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
        headerRight.innerHTML = ''; // Vorherige Logs entfernen
        headerRight.appendChild(logContainer);
        logMessage('Logs wurden erfolgreich im UI angezeigt.');
    } else {
        logMessage('Fehler: header-right Container nicht gefunden.', 'error');
    }
};

// Zusätzliche Logs zur Überprüfung der Log-Speicherung und Anzeige
logMessage('Überprüfung der Log-Speicherung gestartet.');
const testLog = { timestamp: new Date().toISOString(), type: 'info', message: 'Testlog für Debugging' };
const existingLogs = JSON.parse(localStorage.getItem('persistentLogs')) || [];
existingLogs.push(testLog);
localStorage.setItem('persistentLogs', JSON.stringify(existingLogs));
// logMessage('Testlog wurde hinzugefügt: ' + JSON.stringify(testLog));

// Logs direkt nach dem Hinzufügen anzeigen
const logsAfterTest = JSON.parse(localStorage.getItem('persistentLogs')) || [];
// logMessage('Logs nach Test: ' + JSON.stringify(logsAfterTest));

// Überprüfen, ob das Element mit der ID 'login' nur auf Seiten existiert, wo es erwartet wird
if (document.getElementById('login')) {
    const loginElement = document.getElementById('login');
    loginElement.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            logMessage('Eingegebener Benutzername: ' + username);
            logMessage('Eingegebenes Passwort: ' + password);
            handleLogin(username, password);
        }
    });
} else {
    logMessage('Element mit ID "login" ist auf dieser Seite nicht vorhanden.', 'info');
}