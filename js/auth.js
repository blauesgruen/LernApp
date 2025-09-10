// auth.js - Zentrale Supabase-Userverwaltung für die LernApp

// Fallback für logMessage, falls logger.js noch nicht geladen ist
if (typeof window.logMessage !== 'function') {
    window.logMessage = function(msg, type) {
        if (window.logger && typeof window.logger.log === 'function') {
            window.logger.log(msg, type || 'info');
        } else {
            console.log((type ? '['+type+'] ' : '') + msg);
        }
    };
}

// Supabase-Client initialisieren (Beispiel)
const supabase = window.supabase;

/**
 * Gibt den aktuell eingeloggten User zurück
 */
window.getCurrentUser = async function() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
}

/**
 * Login-Funktion (Supabase)
 */
window.login = async function(email, password) {
    logMessage('🔐 login wurde aufgerufen mit Benutzername: ' + email);

    if (!email || !password) {
        logMessage('❌ Fehler: Benutzername oder Passwort ist leer', 'error');
        showError('Benutzername und Passwort dürfen nicht leer sein!');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data?.user) {
            logMessage('❌ Login fehlgeschlagen: ' + (error?.message || 'Unbekannter Fehler'), 'error');
            showError('Benutzername oder Passwort falsch!');
            setLoginStatus(false);
            return;
        }
        setLoginStatus(true);
        localStorage.setItem('username', data.user.email); // Benutzername für Speicherinitialisierung speichern
        logMessage('✅ Login-Status wurde auf "eingeloggt" gesetzt für: ' + data.user.email);
        showSuccess('Login erfolgreich! Sie werden weitergeleitet...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000); // Weiterleitung wieder aktiviert
    } catch (error) {
        logMessage('❌ Fehler beim Login: ' + error.message, 'error');
        showError('Ein Fehler ist aufgetreten.');
    }
}

/**
 * Logout-Funktion (Supabase)
 */
window.logout = async function() {
    logMessage('handleLogout wurde aufgerufen.');
    await supabase.auth.signOut();
    clearLoginStatus();
    logMessage('Benutzer wurde ausgeloggt.');
    refreshUIAfterAuthChange();
    window.location.href = 'index.html';
}

/**
 * Registrierung (Supabase)
 */
window.register = async function(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            logMessage('❌ Registrierung fehlgeschlagen: ' + error.message, 'error');
            showError('Registrierung fehlgeschlagen: ' + error.message);
            return null;
        }
        logMessage('✅ Registrierung erfolgreich für: ' + email);
        showSuccess('Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail.');
        return data.user;
    } catch (error) {
        logMessage('❌ Fehler bei der Registrierung: ' + error.message, 'error');
        showError('Ein Fehler ist aufgetreten.');
        return null;
    }
}

/**
 * Setzt den Login-Status im localStorage
 */
window.setLoginStatus = function(status) {
    localStorage.setItem('loggedIn', status ? 'true' : 'false');
}

/**
 * Löscht den Login-Status im localStorage
 */
window.clearLoginStatus = function() {
    localStorage.removeItem('loggedIn');
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