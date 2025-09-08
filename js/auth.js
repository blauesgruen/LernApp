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
    
    const adminButton = document.querySelector('.admin-button');
    const profileButton = document.querySelector('.profile-button');
    const logoutButton = document.querySelector('.logout-button');
    const loginButton = document.querySelector('.login-button');

    if (isLoggedIn) {
        // Eingeloggt: Alle Buttons außer Admin sichtbar
        if (adminButton) adminButton.style.display = 'none';
        if (profileButton) profileButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'block';
        if (loginButton) loginButton.style.display = 'none';
    } else {
        // Nicht eingeloggt: Nur Admin sichtbar
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
}

// Debug-Flag zur Steuerung von Logs (wird von der Logger-Klasse übernommen)
// Die logMessage-Funktion bleibt für die Kompatibilität erhalten, nutzt aber den neuen Logger
function logMessage(message, type = 'info') {
    // Wenn der Logger existiert, diesen verwenden
    if (window.logger) {
        window.logger.log(message, type);
    } else {
        // Fallback, falls der Logger noch nicht geladen ist
        const timestamp = new Date().toISOString();
        console[type](`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    }
}

// Die folgenden Beispiel-Logs werden im normalen Betrieb nicht mehr angezeigt
// logMessage('Authentifizierungsstatus: ' + (getLoginStatus() ? 'Eingeloggt' : 'Nicht eingeloggt'));
// logMessage('Aktueller Benutzer: ' + (localStorage.getItem('username') || 'Kein Benutzer eingeloggt'));
// logMessage('Anzahl der Benutzer in der Datenbank: ' + (JSON.parse(localStorage.getItem('users')) || []).length);

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

    // Log über Header-Visibility entfernt

    if (adminButton) {
        adminButton.style.display = isLoggedIn ? 'none' : 'block';
        // Button-Sichtbarkeits-Logs entfernt
    } else {
        logMessage('Admin-Button nicht gefunden.', 'error');
    }

    if (userButtons) {
        userButtons.style.display = isLoggedIn ? 'block' : 'none';
        // Button-Sichtbarkeits-Logs entfernt
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
    // Wir rufen nur refreshUIAfterAuthChange auf, das bereits alle nötigen Logs enthält
    // und vermeiden so doppelte Log-Einträge
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

    // Versuche, Benutzer aus beiden Quellen zu laden
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let storedUsers = [];
    
    try {
        if (window.loadData) {
            storedUsers = await window.loadData('users.json', []);
            
            // Zusammenführen von Benutzern aus beiden Quellen
            const mergedUsers = [...users];
            
            // Benutzer aus storage.js hinzufügen, falls noch nicht vorhanden
            for (const storedUser of storedUsers) {
                if (!mergedUsers.some(u => u.username === storedUser.username)) {
                    mergedUsers.push(storedUser);
                }
            }
            
            // Zurück in localStorage speichern, um Konsistenz zu gewährleisten
            localStorage.setItem('users', JSON.stringify(mergedUsers));
            users = mergedUsers;
        }
    } catch (error) {
        logMessage('Fehler beim Laden der Benutzer aus der Storage-API: ' + error.message, 'error');
    }

    const hashedPassword = await window.hashPassword(password);

    // Suche nach dem Benutzer, Case-Insensitive für den Benutzernamen
    const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === hashedPassword
    );

    // Debugging-Logs
    logMessage('Benutzerliste aus localStorage: ' + JSON.stringify(users));
    logMessage('Eingegebenes Passwort vor Hashing: ' + password);
    logMessage('Gehashtes Passwort: ' + hashedPassword);

    if (user) {
        // Speichere den korrekten Benutzernamen (mit der richtigen Groß-/Kleinschreibung)
        localStorage.setItem('username', user.username);
        setLoginStatus(true);
        logMessage('Login-Status wurde auf "eingeloggt" gesetzt.');
        
        // Prüfen, ob es der erste Login dieses Benutzers ist und ob nach Speicherort gefragt werden soll
        const isFirstTimeUser = window.shouldAskForStoragePath && window.shouldAskForStoragePath(user.username);
        
        if (isFirstTimeUser) {
            logMessage('Erster Login des Benutzers erkannt: ' + user.username);
        }
        
        showSuccess('Login erfolgreich! Sie werden weitergeleitet...');
        
        // Jetzt, wo der Benutzer angemeldet ist, können wir seinen spezifischen Speicherort überprüfen
        setTimeout(async () => {
            try {
                // Prüfen ob ein Speicherort für den aktuellen Benutzer konfiguriert ist
                const currentUsername = localStorage.getItem('username');
                
                // Nur beim ersten Login den Speicherort-Dialog anzeigen
                if (isFirstTimeUser) {
                    logMessage('Erster Login: Frage nach Speicherort');
                    
                    // Standardpfad oder benutzerdefinierten Pfad wählen?
                    if (window.isFileSystemAccessSupported && window.isFileSystemAccessSupported()) {
                        const useCustomPath = confirm(
                            'Möchten Sie einen benutzerdefinierten Speicherort für Ihre Daten festlegen? ' +
                            'Wenn Sie auf "Abbrechen" klicken, wird der Standardspeicherort verwendet.'
                        );
                        
                        if (useCustomPath) {
                            logMessage('Benutzer möchte einen benutzerdefinierten Speicherort festlegen');
                            
                            // Speicherort-Dialog öffnen
                            const directoryResult = await window.openDirectoryPicker();
                            
                            if (directoryResult) {
                                // Speicherort erfolgreich ausgewählt
                                logMessage('Benutzer hat Speicherort ausgewählt: ' + directoryResult.path);
                                // Hier übergeben wir den Namen als String und das Handle separat
                                const storagePathData = {
                                    path: directoryResult.path,
                                    handle: directoryResult.handle
                                };
                                // Stelle sicher, dass der Pfad ein String ist
                                if (typeof storagePathData.path !== 'string') {
                                    storagePathData.path = String(storagePathData.path);
                                }
                                await window.setStoragePath(storagePathData, currentUsername);
                            } else {
                                // Benutzer hat abgebrochen, Standard verwenden
                                logMessage('Benutzer hat die Speicherortwahl abgebrochen, verwende Standard');
                                await window.resetStoragePath(currentUsername);
                            }
                        } else {
                            // Benutzer möchte Standardpfad verwenden
                            logMessage('Benutzer möchte Standardpfad verwenden');
                            await window.resetStoragePath(currentUsername);
                        }
                    } else {
                        // Browser unterstützt keine Dateisystemauswahl, verwende Standard
                        logMessage('Browser unterstützt keine Dateisystemauswahl, verwende Standard');
                        await window.resetStoragePath(currentUsername);
                    }
                    
                    // Ersten Login als abgeschlossen markieren
                    if (window.markFirstLoginCompleted) {
                        window.markFirstLoginCompleted(currentUsername);
                    }
                } else {
                    // Nicht erster Login: Prüfe ob ein benutzerdefinierter Speicherort konfiguriert ist
                    if (window.isStoragePathConfigured && window.isStoragePathConfigured(currentUsername)) {
                        const isDefaultPath = window.isDefaultPath && window.isDefaultPath(currentUsername);
                        
                        // Wenn nicht der Standardpfad konfiguriert ist, versuchen wir diesen zu öffnen (nur für Berechtigung)
                        if (!isDefaultPath && window.isFileSystemAccessSupported && window.isFileSystemAccessSupported()) {
                            // Nur einen einfachen Lesezugriff versuchen, damit die Berechtigung abgefragt wird
                            try {
                                const directoryHandle = await window.getDirectoryHandle(currentUsername);
                                if (directoryHandle) {
                                    // Erfolgreich auf Verzeichnis zugegriffen
                                    logMessage('Speicherort erfolgreich geöffnet');
                                }
                            } catch (error) {
                                // Fehler beim Zugriff - wir machen nichts weiter, da es nur um die Berechtigungsabfrage ging
                                logMessage('Benutzer hat keinen Zugriff auf den konfigurierten Speicherort gewährt: ' + error.message, 'warn');
                            }
                        }
                    }
                }
            } catch (error) {
                logMessage('Fehler beim Zugriff auf den Speicherort: ' + error.message, 'error');
            }
            
            // In jedem Fall zum Dashboard weiterleiten
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        logMessage('Kein passender Benutzer gefunden oder Passwort stimmt nicht überein.', 'error');
        showError('Benutzername oder Passwort falsch!');
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

// Überprüfen, ob das Element mit der ID 'login' existiert
if (document.getElementById('login')) {
    logMessage('Login-Element wurde gefunden.', 'info');
} else {
    logMessage('Element mit ID "login" ist auf dieser Seite nicht vorhanden.', 'info');
}