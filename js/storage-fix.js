/**
 * Hilfsskript zum Beheben von Speicherproblemen
 * Dieses Skript versucht aktiv, den Dateisystemzugriff wiederherzustellen,
 * wenn ein Benutzer einen benutzerdefinierten Speicherort konfiguriert hat.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Zentrales Logging verwenden, wenn verfügbar
    const log = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const warn = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
    const error = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    log('LernApp Speicher-Fix geladen');
    
    // Warten wir einen Moment, damit der normale storage.js-Code zuerst ausgeführt wird
    setTimeout(async () => {
        try {
            // Prüfen, ob der Benutzer eingeloggt ist
            const username = localStorage.getItem('username');
            if (!username) {
                log('Kein eingeloggter Benutzer gefunden.');
                return;
            }
            
            // Prüfen, ob der Benutzer einen benutzerdefinierten Pfad verwendet
            const isDefaultPathFn = window.isDefaultPath || function() { return true; };
            if (isDefaultPathFn(username)) {
                log('Benutzer verwendet den Standard-Speicherpfad, keine Aktion erforderlich.');
                return;
            }
            
            // Prüfen, ob wir bereits einen Handle haben
            if (window.directoryHandle) {
                log('DirectoryHandle ist bereits vorhanden, keine Aktion erforderlich.');
                
                // Trotzdem testen, ob wir Schreibzugriff haben
                try {
                    const testResult = await window.testFileAccess();
                    log(`Dateisystem-Zugriffstest: ${testResult ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
                } catch (testError) {
                    warn(`Fehler beim Testen des Dateisystemzugriffs: ${testError.message}`);
                }
                
                return;
            }
            
            // Wir haben keinen Handle - aber können nicht automatisch danach fragen
            warn('Kein DirectoryHandle verfügbar');
            
            // Statt den Ordnerdialog direkt zu zeigen, einen Button hinzufügen, der es dem Benutzer erlaubt,
            // den Speicherort bei Bedarf neu auszuwählen
            
            // Button nur einmal anzeigen
            if (!document.getElementById('storage-path-fix-button')) {
                // Button erstellen
                createStoragePathPrompt();
            }
            
        } catch (err) {
            error(`Fehler im storage-fix.js: ${err.message}`);
        }
    }, 1000); // 1 Sekunde Verzögerung
});

/**
 * Erstellt eine Benachrichtigung mit einem Button, der es dem Benutzer ermöglicht,
 * den Speicherort neu auszuwählen
 */
function createStoragePathPrompt() {
    // Zentrales Logging verwenden, wenn verfügbar
    const log = window.logger ? window.logger.info.bind(window.logger) : console.log;
    
    // Prüfen, ob wir bereits eine Benachrichtigung angezeigt haben
    if (sessionStorage.getItem('storage_prompt_shown')) {
        return;
    }
    
    log('Erstelle Benachrichtigung zum Wiederherstellen des Dateisystem-Zugriffs');
    
    // Benachrichtigung erstellen
    const notification = document.createElement('div');
    notification.className = 'storage-path-notification';
    notification.id = 'storage-path-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="notification-text">
                <p>Der Zugriff auf Ihren Speicherort konnte nicht wiederhergestellt werden.</p>
                <p>Ihre Daten werden momentan nur im Browser gespeichert und nicht synchronisiert.</p>
            </div>
            <div class="notification-actions">
                <button id="storage-path-fix-button" class="btn-primary">
                    <i class="fas fa-folder-open"></i> Speicherort neu auswählen
                </button>
                <button id="storage-path-close-button" class="btn-secondary">
                    <i class="fas fa-times"></i> Später erinnern
                </button>
            </div>
        </div>
    `;
    
    // Styles hinzufügen
    const style = document.createElement('style');
    style.textContent = `
        .storage-path-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 400px;
            background-color: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            z-index: 9999;
            padding: 16px;
            border-left: 4px solid #f39c12;
            animation: slideIn 0.3s ease-out forwards;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .notification-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .notification-icon {
            font-size: 24px;
            color: #f39c12;
        }
        
        .notification-text p {
            margin: 0 0 8px 0;
            color: #333;
        }
        
        .notification-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }
        
        .btn-secondary {
            background-color: #f8f9fa;
            color: #6c757d;
            border: 1px solid #dee2e6;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .btn-secondary:hover {
            background-color: #e9ecef;
        }
    `;
    
    // Zur Seite hinzufügen
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Event-Listener für Buttons
    document.getElementById('storage-path-fix-button').addEventListener('click', async () => {
        // Zentrales Logging verwenden, wenn verfügbar
        const log = window.logger ? window.logger.info.bind(window.logger) : console.log;
        const error = window.logger ? window.logger.error.bind(window.logger) : console.error;
        
        // Benachrichtigung entfernen
        notification.remove();
        
        // Diese Aktion wird durch einen Klick ausgelöst, daher darf showDirectoryPicker aufgerufen werden
        try {
            log('Benutzer hat auf "Speicherort neu auswählen" geklickt');
            
            // Hier können wir sicher showDirectoryPicker aufrufen, da es eine direkte Benutzeraktion ist
            if (window.openDirectoryPicker) {
                const result = await window.openDirectoryPicker();
                if (result && result.handle) {
                    window.directoryHandle = result.handle;
                    log('DirectoryHandle erfolgreich wiederhergestellt!');
                    
                    // Success-Meldung anzeigen
                    if (window.showSuccess) {
                        window.showSuccess('Speicherort erfolgreich festgelegt! Ihre Daten werden jetzt synchronisiert.');
                    }
                    
                    // Test-Datei schreiben
                    if (window.testFileAccess) {
                        await window.testFileAccess();
                    }
                }
            } else {
                error('openDirectoryPicker Funktion nicht gefunden');
                
                // Alternativ zum Profil navigieren
                window.location.href = 'profile.html';
            }
        } catch (err) {
            error('Fehler beim Öffnen des Verzeichnisdialogs:', err);
            
            // Fehlermeldung anzeigen
            if (window.showError) {
                window.showError(`Fehler beim Auswählen des Speicherorts: ${err.message}`);
            }
        }
    });
    
    document.getElementById('storage-path-close-button').addEventListener('click', () => {
        // Benachrichtigung entfernen
        notification.remove();
        
        // Merken, dass wir die Benachrichtigung in dieser Session bereits angezeigt haben
        sessionStorage.setItem('storage_prompt_shown', 'true');
    });
    
    // Merken, dass wir die Benachrichtigung angezeigt haben
    sessionStorage.setItem('storage_prompt_shown', 'true');
}

// Testfunktion für die Konsole
window.testStorageAccess = async function() {
    // Zentrales Logging verwenden, wenn verfügbar
    const log = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const warn = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
    const error = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    log('Teste Dateisystemzugriff...');
    
    // Prüfen, ob DirectoryHandle vorhanden ist
    if (window.directoryHandle) {
        log('✓ DirectoryHandle vorhanden');
        log(`Name: ${window.directoryHandle.name}`);
        
        // Versuchen, Berechtigung zu bekommen
        try {
            const permission = await window.directoryHandle.requestPermission({ mode: 'readwrite' });
            log(`Berechtigung: ${permission}`);
            
            if (permission === 'granted') {
                log('✓ Schreibberechtigung erteilt');
                
                // Test-Datei schreiben
                if (window.testFileAccess) {
                    const testResult = await window.testFileAccess();
                    log(`Test-Datei-Schreibzugriff: ${testResult ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
                } else {
                    warn('testFileAccess Funktion nicht gefunden');
                }
            } else {
                warn('⚠ Keine Schreibberechtigung');
            }
        } catch (err) {
            error(`Fehler beim Prüfen der Berechtigung: ${err.message}`);
        }
    } else {
        warn('✗ Kein DirectoryHandle vorhanden');
        
        // Pfad abrufen
        const username = localStorage.getItem('username');
        const getPathFn = window.getStoragePath || function() { return 'unknown'; };
        const path = getPathFn(username);
        log(`Konfigurierter Pfad: ${path}`);
        
        // Ist es der Standardpfad?
        const isDefaultPathFn = window.isDefaultPath || function() { return true; };
        const isDefault = isDefaultPathFn(username);
        log(`Standard-Speicherpfad: ${isDefault ? 'Ja' : 'Nein'}`);
        
        if (!isDefault) {
            log('Bitte nutzen Sie den "Speicherort neu auswählen" Button, um den Zugriff wiederherzustellen');
        }
    }
    
    // LocalStorage-Informationen
    const username = localStorage.getItem('username');
    log(`Localstorage-Informationen für Benutzer: ${username || 'Nicht eingeloggt'}`);
    
    // Ressourcen auflisten
    if (window.listResources) {
        try {
            const resources = await window.listResources(username);
            log(`Verfügbare Ressourcen: ${JSON.stringify(resources)}`);
        } catch (err) {
            error(`Fehler beim Auflisten der Ressourcen: ${err.message}`);
        }
    } else {
        warn('listResources Funktion nicht gefunden');
    }
    
    return 'Test abgeschlossen';
};
