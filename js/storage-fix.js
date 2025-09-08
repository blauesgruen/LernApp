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
            
            // Verwende die neue, definitive Speicherzugriffsprüfung, wenn verfügbar
            if (window.checkStorageAccess) {
                log('Verwende definitive Speicherzugriffsprüfung...');
                const accessResult = await window.checkStorageAccess(username);
                
                if (accessResult.accessAvailable) {
                    log(`Speicherzugriffsprüfung erfolgreich: ${accessResult.message}`);
                    return; // Nichts weiter tun, alles funktioniert
                } else {
                    log(`Speicherzugriffsprüfung fehlgeschlagen: ${accessResult.message}`);
                    // Wenn die Prüfung einen Fehler festgestellt hat, aber die Benutzerinteraktion
                    // aktiviert ist, warten wir auf das Ergebnis der definitiven Prüfung
                    if (window._userInteractionActive) {
                        log('Benutzerinteraktion aktiv, überlasse Reparatur der definitiven Prüfung');
                        return;
                    }
                }
            } else {
                // Alte Prüfung als Fallback
                // Prüfen, ob der Benutzer einen benutzerdefinierten Pfad verwendet
                const isDefaultPathFn = window.isDefaultPath || function() { return true; };
                if (isDefaultPathFn(username)) {
                    log('Benutzer verwendet den Standard-Speicherpfad, keine Aktion erforderlich.');
                    return;
                }
                
                // Prüfen, ob ein DirectoryHandle erwartet wird
                const expectDirectoryHandle = localStorage.getItem('hasStoredDirectoryHandle') === 'true' || 
                                            localStorage.getItem('hasDirectoryHandle') === 'true';
                
                if (!expectDirectoryHandle) {
                    log('Kein DirectoryHandle erwartet, keine Aktion erforderlich.');
                    return;
                }
            }
            
            // Prüfen, ob wir bereits einen Handle haben
            if (window.directoryHandle) {
                log('DirectoryHandle ist bereits vorhanden, überprüfe Zugriff...');
                
                // Aktiver Test: Versuchen wir tatsächlich, etwas zu schreiben
                try {
                    const testResult = await window.testFileAccess();
                    log(`Dateisystem-Zugriffstest: ${testResult ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
                    
                    // Wenn der Test fehlschlägt, versuchen wir eine Reparatur
                    if (!testResult) {
                        log('Schreibzugriffstest fehlgeschlagen. Versuche Reparatur...');
                        await autoRepairDirectoryHandle();
                    } else {
                        log('Zugriffstest erfolgreich - Speicherort ist funktionsfähig');
                    }
                } catch (testError) {
                    warn(`Fehler beim Testen des Dateisystemzugriffs: ${testError.message}`);
                    await autoRepairDirectoryHandle();
                }
                
                return;
            }
            
            // Wir haben keinen Handle - versuchen automatische Wiederherstellung
            warn('Kein DirectoryHandle verfügbar - versuche automatische Wiederherstellung...');
            
            // Versuche die automatische Wiederherstellung
            const restored = await autoRepairDirectoryHandle();
            
            // Falls die Wiederherstellung fehlgeschlagen ist, zeigen wir den Button an
            if (!restored && !document.getElementById('storage-path-fix-button')) {
                // Button erstellen
                createStoragePathPrompt();
            }
            
        } catch (err) {
            error(`Fehler im storage-fix.js: ${err.message}`);
        }
    }, 1000); // 1 Sekunde Verzögerung
});

/**
 * Versucht automatisch, das DirectoryHandle wiederherzustellen mit mehreren Methoden
 * @returns {Promise<boolean>} True, wenn die Wiederherstellung erfolgreich war
 */
async function autoRepairDirectoryHandle() {
    // Zentrales Logging verwenden, wenn verfügbar
    const log = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const warn = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
    const error = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    // Prüfen, ob ein DirectoryHandle erwartet wird
    const expectHandle = localStorage.getItem('hasStoredDirectoryHandle') === 'true' || 
                       localStorage.getItem('hasDirectoryHandle') === 'true';
    
    if (!expectHandle) {
        log('Kein DirectoryHandle erwartet, Wiederherstellung wird übersprungen.');
        // Entferne alte Flags, die möglicherweise falsch gesetzt wurden
        localStorage.removeItem('hasDirectoryHandle');
        localStorage.removeItem('hasStoredDirectoryHandle');
        return false;
    }
    
    log('Starte automatische Wiederherstellung des DirectoryHandle...');
    
    // 1. Versuch: Direkte Wiederherstellung mit der Standardfunktion
    if (window.restoreDirectoryHandle) {
        try {
            log('Methode 1: Versuche restoreDirectoryHandle...');
            const success = await window.restoreDirectoryHandle();
            if (success) {
                log('DirectoryHandle erfolgreich wiederhergestellt mit restoreDirectoryHandle!');
                return true;
            }
        } catch (e) {
            warn(`Fehler bei Methode 1: ${e.message}`);
        }
    }
    
    // 2. Versuch: Erweiterte Wiederherstellung mit forceRestoreDirectoryHandle
    if (window.forceRestoreDirectoryHandle) {
        try {
            log('Methode 2: Versuche forceRestoreDirectoryHandle...');
            const handle = await window.forceRestoreDirectoryHandle();
            if (handle) {
                window.directoryHandle = handle;
                log('DirectoryHandle erfolgreich wiederhergestellt mit forceRestoreDirectoryHandle!');
                
                // Testen, ob der Zugriff funktioniert
                if (window.testFileAccess) {
                    try {
                        const testResult = await window.testFileAccess();
                        if (testResult) {
                            log('Dateisystem-Zugriffstest erfolgreich!');
                            // Erfolgsmeldung anzeigen
                            if (window.showSuccess) {
                                window.showSuccess('Speicherortzugriff automatisch wiederhergestellt.');
                            }
                            return true;
                        }
                    } catch (testError) {
                        warn(`Fehler beim Testen des Zugriffs: ${testError.message}`);
                    }
                }
            }
        } catch (e) {
            warn(`Fehler bei Methode 2: ${e.message}`);
        }
    }
    
    // 3. Versuch: Versuche eine IndexedDB-Wiederherstellung ohne die Standard-Funktionen
    try {
        log('Methode 3: Versuche manuelle IndexedDB-Wiederherstellung...');
        const dbName = 'LernAppDirectoryHandles';
        const storeName = 'lernapp-directory-handles';
        const keyName = 'main-directory-handle';
        
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onerror = reject;
            request.onsuccess = (event) => resolve(event.target.result);
        });
        
        const handle = await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(keyName);
            request.onerror = reject;
            request.onsuccess = () => resolve(request.result);
        });
        
        if (handle && typeof handle === 'object') {
            try {
                const permission = await handle.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    window.directoryHandle = handle;
                    log('DirectoryHandle erfolgreich wiederhergestellt mit manueller IndexedDB-Wiederherstellung!');
                    
                    // Testen, ob der Zugriff funktioniert
                    if (window.testFileAccess) {
                        try {
                            const testResult = await window.testFileAccess();
                            if (testResult) {
                                log('Dateisystem-Zugriffstest erfolgreich!');
                                // Erfolgsmeldung anzeigen
                                if (window.showSuccess) {
                                    window.showSuccess('Speicherortzugriff automatisch wiederhergestellt.');
                                }
                                return true;
                            }
                        } catch (testError) {
                            warn(`Fehler beim Testen des Zugriffs: ${testError.message}`);
                        }
                    }
                }
            } catch (permError) {
                warn(`Fehler bei der Berechtigungsprüfung: ${permError.message}`);
            }
        }
    } catch (e) {
        warn(`Fehler bei Methode 3: ${e.message}`);
        
        // Wenn der Fehler darauf hindeutet, dass der Objektspeicher nicht gefunden wurde,
        // dann existiert vermutlich kein gespeichertes Handle
        if (e.message.includes('object stores was not found')) {
            // Setze die Flags zurück, da kein Handle vorhanden ist
            localStorage.removeItem('hasDirectoryHandle');
            localStorage.removeItem('hasStoredDirectoryHandle');
            log('Speicherortverfolgung zurückgesetzt, da kein Handle gefunden wurde.');
        }
    }
    
    // Alle Methoden fehlgeschlagen
    warn('Automatische Wiederherstellung fehlgeschlagen. Benutzerinteraktion erforderlich.');
    return false;
}

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
                <p>Die automatische Wiederherstellung des Speicherorts war nicht erfolgreich.</p>
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
