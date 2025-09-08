/**
 * Persistente Dateisystem-Zugriff Verbesserung
 * Dieses Skript verbessert den Zugriff auf das Dateisystem über mehrere Seitenaufrufe hinweg,
 * indem es ein persistentes Verzeichnis-Handle verwendet und korrekt mit dem File System Access API umgeht.
 */

// Ein spezieller Cache-Schlüssel für das Speichern des Verzeichnispfades
const DIR_HANDLE_STORE_NAME = 'lernapp-directory-handles';
const DIR_HANDLE_KEY = 'main-directory-handle';

/**
 * Initialisiert die IndexedDB für die Verzeichnis-Handle-Speicherung
 * @returns {Promise<IDBDatabase>} Eine Promise, die zur geöffneten Datenbank aufgelöst wird
 */
async function initHandleDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LernAppDirectoryHandles', 1);
        
        request.onerror = (event) => {
            console.error('Fehler beim Öffnen der IndexedDB:', event.target.error);
            reject(event.target.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Erstelle einen Object Store für die Verzeichnis-Handles
            if (!db.objectStoreNames.contains(DIR_HANDLE_STORE_NAME)) {
                db.createObjectStore(DIR_HANDLE_STORE_NAME);
            }
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

/**
 * Speichert ein Verzeichnis-Handle in der IndexedDB
 * @param {FileSystemDirectoryHandle} handle - Das zu speichernde Verzeichnis-Handle
 * @returns {Promise<void>}
 */
async function storeDirectoryHandle(handle) {
    try {
        if (!handle || typeof handle !== 'object' || typeof handle.getFileHandle !== 'function') {
            console.error('Ungültiges Verzeichnis-Handle');
            return;
        }
        
        const db = await initHandleDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DIR_HANDLE_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(DIR_HANDLE_STORE_NAME);
            
            const request = store.put(handle, DIR_HANDLE_KEY);
            
            request.onsuccess = () => {
                console.log('Verzeichnis-Handle erfolgreich gespeichert');
                // Zusätzliche Information im localStorage für die Überprüfung
                localStorage.setItem('hasStoredDirectoryHandle', 'true');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Fehler beim Speichern des Verzeichnis-Handles:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Fehler beim Speichern des Verzeichnis-Handles:', error);
    }
}

/**
 * Lädt ein gespeichertes Verzeichnis-Handle aus der IndexedDB
 * @returns {Promise<FileSystemDirectoryHandle|null>} Das gespeicherte Verzeichnis-Handle oder null
 */
async function loadDirectoryHandle() {
    try {
        const db = await initHandleDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DIR_HANDLE_STORE_NAME, 'readonly');
            const store = transaction.objectStore(DIR_HANDLE_STORE_NAME);
            
            const request = store.get(DIR_HANDLE_KEY);
            
            request.onsuccess = () => {
                if (request.result) {
                    console.log('Verzeichnis-Handle aus IndexedDB geladen');
                    resolve(request.result);
                } else {
                    console.log('Kein gespeichertes Verzeichnis-Handle gefunden');
                    resolve(null);
                }
            };
            
            request.onerror = (event) => {
                console.error('Fehler beim Laden des Verzeichnis-Handles:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Fehler beim Laden des Verzeichnis-Handles:', error);
        return null;
    }
}

/**
 * Versucht, Berechtigungen für das gespeicherte Verzeichnis-Handle zu erhalten
 * @param {FileSystemDirectoryHandle} handle - Das Verzeichnis-Handle
 * @returns {Promise<string>} Der Status der Berechtigung ('granted', 'denied' oder 'prompt')
 */
async function verifyPermission(handle) {
    if (!handle) return 'denied';
    
    try {
        // Prüfe, ob wir bereits Schreibberechtigungen haben
        const opts = { mode: 'readwrite' };
        const state = await handle.queryPermission(opts);
        
        if (state === 'granted') {
            return state;
        }
        
        // Wenn nicht, fordere sie an
        return await handle.requestPermission(opts);
    } catch (error) {
        console.error('Fehler bei der Berechtigungsprüfung:', error);
        return 'denied';
    }
}

/**
 * Aktualisiert das globale directoryHandle mit dem aus der IndexedDB geladenen Handle
 * und prüft die Berechtigung
 * @returns {Promise<boolean>} True, wenn das Handle erfolgreich geladen und die Berechtigung erteilt wurde
 */
async function restoreDirectoryHandle() {
    try {
        // Lade das gespeicherte Handle
        const handle = await loadDirectoryHandle();
        if (!handle) {
            console.log('Kein persistentes Verzeichnis-Handle gefunden');
            return false;
        }
        
        // Prüfe die Berechtigung
        const permission = await verifyPermission(handle);
        if (permission !== 'granted') {
            console.warn('Keine Berechtigung für das gespeicherte Verzeichnis-Handle');
            
            // Benachrichtigung anzeigen, ohne automatisch einen Dialog zu öffnen
            createPermissionRequiredNotification(handle);
            return false;
        }
        
        // Setze das globale directoryHandle
        window.directoryHandle = handle;
        console.log('Persistentes Verzeichnis-Handle erfolgreich wiederhergestellt');
        
        // Optional: Testen, ob der Zugriff wirklich funktioniert
        try {
            await testFileAccess();
            console.log('Dateisystem-Zugriff erfolgreich getestet');
        } catch (testError) {
            console.warn('Warnung beim Testen des Dateisystem-Zugriffs:', testError);
            // Wir brechen hier nicht ab, da die Berechtigung bereits bestätigt wurde
        }
        
        return true;
    } catch (error) {
        console.error('Fehler beim Wiederherstellen des Verzeichnis-Handles:', error);
        return false;
    }
}

/**
 * Erstellt eine Benachrichtigung, die den Benutzer auffordert, Berechtigungen zu erteilen
 * @param {FileSystemDirectoryHandle} handle - Das Verzeichnis-Handle, für das Berechtigungen benötigt werden
 */
function createPermissionRequiredNotification(handle) {
    // Prüfen, ob wir bereits eine Benachrichtigung angezeigt haben
    if (sessionStorage.getItem('permission_prompt_shown')) {
        return;
    }
    
    // Benachrichtigung erstellen
    const notification = document.createElement('div');
    notification.className = 'permission-notification';
    notification.id = 'permission-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="fas fa-lock"></i>
            </div>
            <div class="notification-text">
                <p>Für den Zugriff auf Ihren Speicherort werden Berechtigungen benötigt.</p>
                <p>Ihre Daten werden momentan nur im Browser gespeichert.</p>
            </div>
            <div class="notification-actions">
                <button id="grant-permission-button" class="btn-primary">
                    <i class="fas fa-check"></i> Berechtigung erteilen
                </button>
                <button id="permission-close-button" class="btn-secondary">
                    <i class="fas fa-times"></i> Später erinnern
                </button>
            </div>
        </div>
    `;
    
    // Styles hinzufügen
    const style = document.createElement('style');
    style.textContent = `
        .permission-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 400px;
            background-color: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            z-index: 9999;
            padding: 16px;
            border-left: 4px solid #2196F3;
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
            color: #2196F3;
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
        
        .btn-primary {
            background-color: #2196F3;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .btn-primary:hover {
            background-color: #0d8bf2;
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
    document.getElementById('grant-permission-button').addEventListener('click', async () => {
        // Benachrichtigung entfernen
        notification.remove();
        
        // Diese Aktion wird durch einen Klick ausgelöst, daher darf requestPermission aufgerufen werden
        try {
            console.log('Benutzer hat auf "Berechtigung erteilen" geklickt');
            
            // Berechtigung anfordern - dies sollte jetzt funktionieren, da es eine direkte Benutzeraktion ist
            const permission = await handle.requestPermission({ mode: 'readwrite' });
            
            if (permission === 'granted') {
                console.log('%cBerechtigung erfolgreich erteilt!', 'color: green; font-weight: bold');
                
                // Handle global setzen
                window.directoryHandle = handle;
                
                // Success-Meldung anzeigen
                if (window.showSuccess) {
                    window.showSuccess('Berechtigung erfolgreich erteilt! Ihre Daten werden jetzt synchronisiert.');
                }
                
                // Test-Datei schreiben
                if (window.testFileAccess) {
                    await window.testFileAccess();
                }
            } else {
                console.warn('Berechtigung wurde nicht erteilt:', permission);
                
                // Fehlermeldung anzeigen
                if (window.showWarning) {
                    window.showWarning('Berechtigung nicht erteilt. Ihre Daten werden nur im Browser gespeichert.');
                }
            }
        } catch (error) {
            console.error('Fehler bei der Berechtigungsanfrage:', error);
            
            // Fehlermeldung anzeigen
            if (window.showError) {
                window.showError(`Fehler bei der Berechtigungsanfrage: ${error.message}`);
            }
        }
    });
    
    document.getElementById('permission-close-button').addEventListener('click', () => {
        // Benachrichtigung entfernen
        notification.remove();
        
        // Merken, dass wir die Benachrichtigung in dieser Session bereits angezeigt haben
        sessionStorage.setItem('permission_prompt_shown', 'true');
    });
    
    // Merken, dass wir die Benachrichtigung angezeigt haben
    sessionStorage.setItem('permission_prompt_shown', 'true');
}

/**
 * Test-Funktion für das Schreiben einer Datei im direkten Dateisystem
 * @returns {Promise<boolean>} True, wenn der Test erfolgreich war
 */
async function testFileAccess() {
    try {
        if (!window.directoryHandle) {
            console.error('Kein DirectoryHandle vorhanden für den Test');
            return false;
        }
        
        // Testdatei erstellen/öffnen
        const fileHandle = await window.directoryHandle.getFileHandle('lernapp_test.txt', { create: true });
        const writable = await fileHandle.createWritable();
        
        // Testdaten schreiben
        const testData = `LernApp Testzugriff - ${new Date().toISOString()}`;
        await writable.write(testData);
        await writable.close();
        
        console.log('Testdatei erfolgreich geschrieben:', testData);
        return true;
    } catch (error) {
        console.error('Fehler beim Testen des Dateizugriffs:', error);
        return false;
    }
}

/**
 * Diese Funktion wird aufgerufen, wenn ein Verzeichnis-Handle vom Benutzer ausgewählt wurde
 * Sie speichert das Handle in der IndexedDB für spätere Nutzung
 * @param {FileSystemDirectoryHandle} handle - Das neu ausgewählte Verzeichnis-Handle
 * @returns {Promise<boolean>} True, wenn das Handle erfolgreich gespeichert wurde
 */
async function handleDirectorySelection(handle) {
    try {
        if (!handle) {
            console.error('Kein Handle für die Speicherung angegeben');
            return false;
        }
        
        // Handle im globalen Kontext setzen
        window.directoryHandle = handle;
        
        // Handle in IndexedDB speichern
        await storeDirectoryHandle(handle);
        console.log('Verzeichnis-Handle erfolgreich persistiert');
        
        // Test-Dateizugriff durchführen
        const testResult = await testFileAccess();
        if (!testResult) {
            console.warn('Test-Dateizugriff fehlgeschlagen, aber Handle wurde gespeichert');
        }
        
        return true;
    } catch (error) {
        console.error('Fehler bei der Verarbeitung des ausgewählten Verzeichnisses:', error);
        return false;
    }
}

/**
 * Erweiterte Version der openDirectoryPicker-Funktion, die das Handle automatisch persistiert
 * @returns {Promise<Object>} Das ausgewählte Verzeichnis-Handle und den Pfad
 */
async function openAndPersistDirectoryPicker() {
    try {
        if (!window.showDirectoryPicker) {
            if (window.showError) {
                window.showError('Dein Browser unterstützt die Dateiauswahl nicht. Verwende bitte Chrome, Edge oder einen anderen modernen Browser.');
            }
            return null;
        }

        // Zeige den Ordnerauswahl-Dialog
        const handle = await window.showDirectoryPicker({
            id: 'lernAppData',
            mode: 'readwrite',
            startIn: 'documents'
        });
        
        // Handle persistieren
        await handleDirectorySelection(handle);
        
        // Pfad des ausgewählten Ordners (nur der Name ist verfügbar)
        const path = handle.name || 'LernAppDatenbank';
        
        console.log('Verzeichnis ausgewählt und persistiert:', {
            name: handle.name,
            kind: handle.kind
        });
        
        return {
            handle,
            path
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Benutzer hat den Ordnerauswahl-Dialog abgebrochen.');
            return null;
        }
        console.error('Fehler beim Öffnen des Ordnerauswahl-Dialogs:', error);
        if (window.showError) {
            window.showError(`Fehler bei der Ordnerauswahl: ${error.message}`);
        }
        return null;
    }
}

// Bei DOMContentLoaded versuchen, das Verzeichnis-Handle wiederherzustellen
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Persistentes Dateisystem-Modul geladen');
    
    // Prüfen, ob ein Benutzer eingeloggt ist
    const username = localStorage.getItem('username');
    if (!username) {
        console.log('Kein eingeloggter Benutzer, überspringe Verzeichnis-Handle-Wiederherstellung');
        return;
    }
    
    // Prüfen, ob wir einen benutzerdefinierten Pfad haben
    if (window.isDefaultPath && window.isDefaultPath(username)) {
        console.log('Standard-Speicherort wird verwendet, keine Verzeichnis-Handle-Wiederherstellung nötig');
        return;
    }
    
    // Versuchen, das Verzeichnis-Handle wiederherzustellen
    const restored = await restoreDirectoryHandle();
    if (restored) {
        console.log('Verzeichnis-Handle erfolgreich wiederhergestellt');
    } else {
        console.log('Konnte Verzeichnis-Handle nicht wiederherstellen');
        
        // Wir zeigen keine Benachrichtigung direkt beim Laden der Seite an,
        // sondern lassen andere Skripte entscheiden, wann der Benutzer informiert werden soll
    }
});

// Globale Funktionen exportieren
window.openAndPersistDirectoryPicker = openAndPersistDirectoryPicker;
window.handleDirectorySelection = handleDirectorySelection;
window.restoreDirectoryHandle = restoreDirectoryHandle;
window.verifyPermission = verifyPermission;
window.storeDirectoryHandle = storeDirectoryHandle;
window.loadDirectoryHandle = loadDirectoryHandle;

// Log-Nachricht
console.log('%cPersistentes Dateisystem-Modul initialisiert', 'color: green; font-weight: bold');
