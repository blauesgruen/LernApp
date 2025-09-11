// notification.js - Zentrales Fehler- und Meldemanagement

// Hilfsfunktion für einheitliches Logging
function log(message, type = 'info', ...args) {
    // Erkennen von rekursiven Nachrichten (Benachrichtigung über Benachrichtigung)
    if (message && typeof message === 'string' && message.includes('Benachrichtigung (')) {
        // Rekursive Logs unterbrechen
        console.warn('Rekursive Logging-Kette erkannt und unterbrochen:', message.substring(0, 50) + '...');
        return;
    }
    
    if (window.logger) {
        window.logger.log(message, type, ...args);
    } else if (window.logMessage) {
        window.logMessage(message, type, ...args);
    } else {
        if (type === 'error') {
            console.error(message, ...args);
        } else if (type === 'warn') {
            console.warn(message, ...args);
        } else {
            console.log(message, ...args);
        }
    }
}

/**
 * Zeigt eine Benachrichtigung im Meldefeld an.
 * @param {string} message - Die anzuzeigende Nachricht.
 * @param {string} type - Der Typ der Nachricht ('error', 'success', 'info', 'warning').
 * @param {number} duration - Anzeigedauer in Millisekunden, 0 für dauerhafte Anzeige (optional).
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Prüfen auf rekursive Aufrufe und bereits benachrichtigte Fehler
    if (message && typeof message === 'string' && 
        (message.startsWith('Benachrichtigung (') || message.includes('Rekursive Logging-Kette'))) {
        console.warn('Vermeidung von rekursiver Benachrichtigung:', message.substring(0, 50) + '...');
        return;
    }
    
    // Logging der Nachricht für Debugging-Zwecke, aber nur bei normalen Nachrichten
    // Verwende console direkt, um rekursive Aufrufe zu vermeiden
    console.log(`Benachrichtigung (${type}): ${message}`);

    // Bestehenden Container finden oder neuen erstellen
    let container = document.getElementById('notification-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.padding = '10px';
        container.style.margin = '0';
        container.style.borderRadius = '5px';
        container.style.fontSize = '14px';
        container.style.display = 'none';
        container.style.position = 'fixed';
        container.style.top = 'calc(var(--bar-height, 4rem) + 40px)'; // 20px Abstand zum Header
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '999'; // Knapp unter dem Header (der typischerweise 1000 hat)
        container.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        container.style.maxWidth = '80%';
        container.style.width = 'auto';
        document.body.appendChild(container);
    }

    // Farbe je nach Nachrichtentyp setzen
    const colors = {
        'error': {
            bg: '#f8d7da',
            text: '#721c24',
            border: '#f5c6cb'
        },
        'success': {
            bg: '#d4edda',
            text: '#155724',
            border: '#c3e6cb'
        },
        'info': {
            bg: '#d1ecf1',
            text: '#0c5460',
            border: '#bee5eb'
        },
        'warning': {
            bg: '#fff3cd',
            text: '#856404',
            border: '#ffeeba'
        }
    };

    const color = colors[type] || colors.info;
    
    container.style.backgroundColor = color.bg;
    container.style.color = color.text;
    container.style.borderLeft = `4px solid ${color.border}`;

    // Inhalt erstellen
    container.innerHTML = `
        <span class="close-button" style="float: right; cursor: pointer; margin-right: 10px;">&times;</span>
        <div style="margin-right: 20px;">${message}</div>
    `;

    // Schließen-Button-Funktionalität
    const closeButton = container.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            container.style.display = 'none';
        });
    }

    // Anzeigen
    container.style.display = 'block';

    // Automatisch ausblenden nach angegebener Zeit, wenn nicht 0
    if (duration > 0) {
        setTimeout(() => {
            if (container) {
                container.style.display = 'none';
            }
        }, duration);
    }
}

/**
 * Zeigt eine Fehlermeldung an.
 * @param {string} message - Die Fehlermeldung.
 * @param {number} duration - Anzeigedauer in Millisekunden (optional).
 */
function showError(message, duration = 20000) {
    console.error('Fehlermeldung:', message);
    showNotification(message, 'error', duration);
}

/**
 * Zeigt eine Erfolgsmeldung an.
 * @param {string} message - Die Erfolgsmeldung.
 * @param {number} duration - Anzeigedauer in Millisekunden (optional).
 */
function showSuccess(message, duration = 20000) {
    console.log('Erfolgsmeldung:', message);
    showNotification(message, 'success', duration);
}

/**
 * Zeigt eine Infomeldung an.
 * @param {string} message - Die Infomeldung.
 * @param {number} duration - Anzeigedauer in Millisekunden (optional).
 */
function showInfo(message, duration = 5000) {
    showNotification(message, 'info', duration);
}

/**
 * Zeigt eine Warnmeldung an.
 * @param {string} message - Die Warnmeldung.
 * @param {number} duration - Anzeigedauer in Millisekunden (optional).
 */
function showWarning(message, duration = 5000) {
    showNotification(message, 'warning', duration);
}

// Exportiere die Funktionen in das globale Window-Objekt, damit sie überall verfügbar sind
window.showNotification = showNotification;
window.showError = showError;
window.showSuccess = showSuccess;
window.showInfo = showInfo;
window.showWarning = showWarning;
window.notification = {
    showError,
    showSuccess,
    showInfo,
    showWarning,
    showNotification
};

// Test-Funktion für das Benachrichtigungssystem
window.testNotifications = function() {
    showInfo('Dies ist eine Informationsmeldung.', 3000);
    setTimeout(() => showSuccess('Dies ist eine Erfolgsmeldung.', 3000), 1000);
    setTimeout(() => showWarning('Dies ist eine Warnmeldung.', 3000), 2000);
    setTimeout(() => showError('Dies ist eine Fehlermeldung.', 3000), 3000);
    return "Benachrichtigungstest läuft..."; // Expliziter Rückgabewert
};

// Fehlermanagement für unbehandelte Fehler
window.addEventListener('error', function(event) {
    const errorMessage = `JavaScript-Fehler: ${event.message} in ${event.filename} (Zeile ${event.lineno}, Spalte ${event.colno})`;
    // showError ruft intern bereits log() auf
    showError(errorMessage);
});

// Fehlermanagement für Promise-Fehler
window.addEventListener('unhandledrejection', function(event) {
    const errorMessage = `Unbehandelter Promise-Fehler: ${event.reason}`;
    // showError ruft intern bereits log() auf
    showError(errorMessage);
});

// Zeige eine Test-Nachricht beim Laden der Datei (nur im Entwicklungsmodus)
document.addEventListener('DOMContentLoaded', function() {
    const isDevelopment = localStorage.getItem('developmentMode') === 'true';
    if (isDevelopment) {
        showInfo('Benachrichtigungssystem wurde geladen.', 3000);
    }
});
