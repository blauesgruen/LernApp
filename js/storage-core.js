/**
 * LernApp Storage Core - Vereinfachte und robuste Speicherverwaltung
 * 
 * Dieses Modul implementiert eine klare und einfache Logik für die Speicherverwaltung:
 * 1. Prüft ob es das erste Login ist
 * 2. Prüft ob ein Speicherort festgelegt wurde
 * 3. Schreibt auf den festgelegten Speicherort mit Auto-Reparatur
 * 4. Öffnet ein Modal zur Berechtigung, wenn Schreiben nicht möglich ist
 */

// Globale Konstanten
const DEFAULT_STORAGE_PATH = 'LernAppDatenbank';
const DB_NAME = 'LernAppDirectoryHandles';
const STORE_NAME = 'lernapp-directory-handles';
const HANDLE_KEY = 'main-directory-handle';
const DB_VERSION = 2;

// Globale Variable für das DirectoryHandle
let directoryHandle = null;

// Status-Flags
let isFirstLogin = false;
let hasStorageLocationSet = false;
let isStorageAccessible = false;

/**
 * Initialisiert das Speichersystem
 * @returns {Promise<boolean>} True wenn die Initialisierung erfolgreich war
 */
async function initializeStorage() {
    try {
        // 1. Prüfen ob es das erste Login ist
        isFirstLogin = !localStorage.getItem('hasLoggedInBefore');
        if (isFirstLogin) {
            console.log('Erster Login erkannt');
            localStorage.setItem('hasLoggedInBefore', 'true');
        }

        // 2. Prüfen ob ein Speicherort festgelegt wurde
        hasStorageLocationSet = localStorage.getItem('hasStoredDirectoryHandle') === 'true';
        
        // 3. Falls ein Speicherort festgelegt wurde, versuchen diesen zu laden
        if (hasStorageLocationSet) {
            console.log('Speicherort wurde zuvor festgelegt, versuche ihn zu laden');
            const success = await restoreDirectoryHandle();
            
            if (success) {
                console.log('Speicherort erfolgreich geladen');
                isStorageAccessible = true;
                
                // Event auslösen, dass das DirectoryHandle wiederhergestellt wurde
                dispatchDirectoryHandleEvent(true);
                
                return true;
            } else {
                console.log('Speicherort konnte nicht geladen werden, zeige Auswahl-Dialog');
                showStorageSelector();
                return false;
            }
        } else if (isFirstLogin) {
            // Bei erstem Login gleich Speicherort auswählen lassen
            console.log('Erstes Login, zeige Speicherort-Auswahl');
            showStorageSelector();
            return false;
        } else {
            // Kein Speicherort festgelegt, Browser-Speicher wird verwendet
            console.log('Kein Speicherort festgelegt, verwende Browser-Speicher');
            return true;
        }
    } catch (error) {
        console.error('Fehler bei Storage-Initialisierung:', error);
        return false;
    }
}

/**
 * Stellt das DirectoryHandle aus IndexedDB wieder her
 * @returns {Promise<boolean>} True wenn die Wiederherstellung erfolgreich war
 */
async function restoreDirectoryHandle() {
    try {
        // 1. Handle aus der IndexedDB laden
        const db = await openHandleDatabase();
        const handle = await getHandleFromDatabase(db);
        
        if (!handle) {
            console.warn('Kein gespeichertes DirectoryHandle gefunden');
            return false;
        }
        
        // 2. Berechtigung prüfen/anfordern
        const permission = await handle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            console.warn('Berechtigung nicht erteilt');
            return false;
        }
        
        // 3. Handle speichern und testen
        directoryHandle = handle;
        window.directoryHandle = handle; // Auch global verfügbar machen
        
        // 4. Testen, ob der Zugriff wirklich funktioniert
        const accessWorks = await testFileAccess();
        
        if (accessWorks) {
            console.log('Dateisystem-Zugriff erfolgreich getestet');
            isStorageAccessible = true;
            return true;
        } else {
            console.warn('Dateisystem-Zugriff-Test fehlgeschlagen');
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Wiederherstellen des DirectoryHandle:', error);
        return false;
    }
}

/**
 * Testet den Dateisystem-Zugriff durch Schreiben einer Testdatei
 * @returns {Promise<boolean>} True wenn der Test erfolgreich war
 */
async function testFileAccess() {
    if (!directoryHandle) {
        console.warn('Kein DirectoryHandle vorhanden');
        return false;
    }
    
    try {
        // Test-Datei schreiben
        const testFileName = '.test-access';
        const fileHandle = await directoryHandle.getFileHandle(testFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write('Zugriff OK ' + new Date().toISOString());
        await writable.close();
        
        console.log('Dateisystem-Zugriffstest erfolgreich');
        return true;
    } catch (error) {
        console.warn('Dateisystem-Zugriffstest fehlgeschlagen:', error);
        return false;
    }
}

/**
 * Öffnet die Datenbank für Directory Handles
 * @returns {Promise<IDBDatabase>}
 */
async function openHandleDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('Fehler beim Öffnen der IndexedDB:', event.target.error);
            reject(event.target.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Alten Object Store löschen falls vorhanden
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            
            // Neuen Object Store erstellen
            db.createObjectStore(STORE_NAME);
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

/**
 * Lädt ein gespeichertes Handle aus der Datenbank
 * @param {IDBDatabase} db - Die geöffnete IndexedDB
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
async function getHandleFromDatabase(db) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(HANDLE_KEY);
            
            request.onerror = (event) => {
                console.error('Fehler beim Lesen aus IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                resolve(request.result);
            };
        } catch (error) {
            console.error('Fehler bei getHandleFromDatabase:', error);
            reject(error);
        }
    });
}

/**
 * Speichert ein DirectoryHandle in der Datenbank
 * @param {FileSystemDirectoryHandle} handle - Das zu speichernde DirectoryHandle
 * @returns {Promise<boolean>} True wenn erfolgreich gespeichert
 */
async function storeDirectoryHandle(handle) {
    if (!handle || typeof handle !== 'object') {
        console.error('Ungültiges DirectoryHandle');
        return false;
    }
    
    try {
        const db = await openHandleDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(handle, HANDLE_KEY);
            
            request.onerror = (event) => {
                console.error('Fehler beim Speichern in IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                directoryHandle = handle;
                window.directoryHandle = handle;
                
                // Status setzen
                hasStorageLocationSet = true;
                localStorage.setItem('hasStoredDirectoryHandle', 'true');
                
                console.log('DirectoryHandle erfolgreich in IndexedDB gespeichert');
                resolve(true);
            };
        });
    } catch (error) {
        console.error('Fehler bei storeDirectoryHandle:', error);
        return false;
    }
}

/**
 * Speichert Daten mit robuster Fehlerbehandlung
 * @param {string} filename - Der Dateiname zum Speichern
 * @param {string} data - Die zu speichernden Daten (JSON-String)
 * @returns {Promise<{success: boolean, usedFileSystem: boolean, error: string|null}>}
 */
async function saveData(filename, data) {
    let result = {
        success: false,
        usedFileSystem: false,
        error: null
    };
    
    // 1. Immer zuerst in localStorage speichern als Backup
    try {
        localStorage.setItem(`data_${filename}`, data);
        result.success = true;
        console.log(`Datei ${filename} im Browser-Speicher gesichert (Backup)`);
    } catch (localError) {
        console.warn(`Fehler beim Backup in localStorage: ${localError.message}`);
        // Bei sehr großen Daten IndexedDB verwenden, falls verfügbar
        if (window.storeDataInIndexedDB) {
            try {
                await window.storeDataInIndexedDB(filename, data);
                result.success = true;
                console.log(`Datei ${filename} in IndexedDB gesichert (Backup)`);
            } catch (idbError) {
                console.error(`Fehler beim Backup in IndexedDB: ${idbError.message}`);
                result.error = `Lokaler Speicher nicht verfügbar: ${idbError.message}`;
            }
        }
    }
    
    // 2. Wenn ein Dateisystem-Handle vorhanden ist, dort speichern
    if (directoryHandle && isStorageAccessible) {
        try {
            const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(data);
            await writable.close();
            
            result.usedFileSystem = true;
            console.log(`Datei ${filename} erfolgreich im Dateisystem gespeichert`);
            
            // Aktualisiere den Indikator
            updateStorageIndicator(true);
        } catch (fsError) {
            console.warn(`Fehler beim Speichern im Dateisystem: ${fsError.message}`);
            
            // 3. Bei Fehler Auto-Reparatur versuchen
            try {
                const repaired = await restoreDirectoryHandle();
                
                if (repaired) {
                    try {
                        // Erneut versuchen nach erfolgreicher Reparatur
                        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(data);
                        await writable.close();
                        
                        result.usedFileSystem = true;
                        console.log(`Datei ${filename} nach Reparatur im Dateisystem gespeichert`);
                        
                        // Aktualisiere den Indikator
                        updateStorageIndicator(true);
                    } catch (retryError) {
                        console.error(`Fehler beim erneuten Speichern nach Reparatur: ${retryError.message}`);
                        
                        // 4. Wenn alle Rettungsversuche fehlschlagen, Modal anzeigen
                        showStorageSelector();
                    }
                } else {
                    // Wenn Reparatur fehlschlägt, Modal anzeigen
                    showStorageSelector();
                }
            } catch (repairError) {
                console.error(`Fehler bei Auto-Reparatur: ${repairError.message}`);
                showStorageSelector();
            }
        }
    } else if (hasStorageLocationSet && !isStorageAccessible) {
        // Wenn ein Speicherort konfiguriert ist, aber nicht zugänglich ist
        console.log('Speicherort ist konfiguriert, aber nicht zugänglich. Zeige Auswahldialog.');
        showStorageSelector();
    }
    
    return result;
}

/**
 * Lädt Daten mit robuster Fehlerbehandlung
 * @param {string} filename - Der Dateiname zum Laden
 * @param {any} defaultValue - Standardwert, falls keine Daten gefunden werden
 * @returns {Promise<any>} Die geladenen Daten oder der Standardwert
 */
async function loadData(filename, defaultValue = null) {
    // 1. Versuche aus dem Dateisystem zu laden
    if (directoryHandle && isStorageAccessible) {
        try {
            const fileHandle = await directoryHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const text = await file.text();
            
            console.log(`Datei ${filename} erfolgreich aus dem Dateisystem geladen`);
            
            // Aktualisiere den Indikator, um zu zeigen, dass das Dateisystem aktiv ist
            updateStorageIndicator(true);
            
            try {
                return JSON.parse(text);
            } catch (parseError) {
                console.warn(`Fehler beim Parsen der Daten aus ${filename}: ${parseError.message}`);
                return text; // Wenn kein gültiges JSON, dann Rohdaten zurückgeben
            }
        } catch (fsError) {
            console.warn(`Fehler beim Laden aus dem Dateisystem: ${fsError.message}`);
            // Weiter mit lokalen Quellen versuchen
        }
    }
    
    // 2. Aus localStorage laden
    try {
        const localData = localStorage.getItem(`data_${filename}`);
        if (localData) {
            console.log(`Datei ${filename} aus localStorage geladen`);
            try {
                return JSON.parse(localData);
            } catch (parseError) {
                console.warn(`Fehler beim Parsen der Daten aus localStorage: ${parseError.message}`);
                return localData; // Wenn kein gültiges JSON, dann Rohdaten zurückgeben
            }
        }
    } catch (localError) {
        console.warn(`Fehler beim Laden aus localStorage: ${localError.message}`);
    }
    
    // 3. Aus IndexedDB laden, falls vorhanden
    if (window.loadDataFromIndexedDB) {
        try {
            const idbData = await window.loadDataFromIndexedDB(filename);
            if (idbData) {
                console.log(`Datei ${filename} aus IndexedDB geladen`);
                return idbData;
            }
        } catch (idbError) {
            console.warn(`Fehler beim Laden aus IndexedDB: ${idbError.message}`);
        }
    }
    
    // 4. Standardwert zurückgeben, wenn keine Daten gefunden wurden
    console.log(`Keine Daten für ${filename} gefunden, verwende Standardwert`);
    return defaultValue;
}

/**
 * Öffnet den Dateiauswahl-Dialog und speichert das ausgewählte Verzeichnis
 * @returns {Promise<boolean>} True wenn erfolgreich
 */
async function selectAndPersistDirectory() {
    try {
        // 1. Öffne den Dateiauswahl-Dialog
        const handle = await window.showDirectoryPicker({
            id: 'LernAppStorage',
            startIn: 'documents',
            mode: 'readwrite'
        });
        
        // 2. Speichere das Handle in IndexedDB
        const stored = await storeDirectoryHandle(handle);
        
        if (stored) {
            // 3. Teste den Zugriff
            const accessWorks = await testFileAccess();
            
            if (accessWorks) {
                isStorageAccessible = true;
                directoryHandle = handle;
                window.directoryHandle = handle;
                
                // Status setzen
                hasStorageLocationSet = true;
                localStorage.setItem('hasStoredDirectoryHandle', 'true');
                
                // Event auslösen, dass das DirectoryHandle wiederhergestellt wurde
                dispatchDirectoryHandleEvent(true);
                
                return true;
            } else {
                console.warn('Dateisystem-Zugriff-Test fehlgeschlagen nach Auswahl');
            }
        }
        
        return false;
    } catch (error) {
        // Benutzer hat abgebrochen oder ein Fehler ist aufgetreten
        console.log('Verzeichnisauswahl abgebrochen oder Fehler:', error);
        return false;
    }
}

/**
 * Zeigt einen Modal-Dialog zur Auswahl des Speicherorts
 */
function showStorageSelector() {
    // Prüfen, ob der Dialog bereits angezeigt wird
    if (document.getElementById('storage-selector-modal')) {
        return;
    }
    
    console.log('Zeige Speicherort-Auswähler...');
    
    // Dialog erstellen
    const modal = document.createElement('div');
    modal.id = 'storage-selector-modal';
    modal.className = 'storage-selector-modal';
    modal.innerHTML = `
        <div class="storage-selector-content">
            <div class="storage-selector-header">
                <h3>Speicherort auswählen</h3>
                <button class="storage-selector-close">&times;</button>
            </div>
            <div class="storage-selector-body">
                <p>Für eine zuverlässige Datenspeicherung wird ein Ordner auf Ihrem Gerät benötigt.</p>
                <p><strong>Nach einem Computer-Neustart</strong> muss die Berechtigung für den Speicherort erneut erteilt werden. Dies ist ein Sicherheitsfeature des Browsers.</p>
                <div class="storage-selector-options">
                    <button id="storage-select-folder" class="btn-primary">
                        <i class="fas fa-folder-open"></i> Ordner auswählen
                    </button>
                    <button id="storage-use-browser" class="btn-secondary">
                        <i class="fas fa-database"></i> Nur Browser-Speicher verwenden
                    </button>
                </div>
                <div class="storage-selector-info">
                    <p class="storage-info-note">
                        <i class="fas fa-info-circle"></i> 
                        Mit einem lokalen Ordner bleiben Ihre Daten auch nach einem Browser-Neustart erhalten.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // Styles hinzufügen
    const style = document.createElement('style');
    style.textContent = `
        .storage-selector-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .storage-selector-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        
        .storage-selector-header {
            padding: 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .storage-selector-header h3 {
            margin: 0;
            font-size: 18px;
            color: #212529;
        }
        
        .storage-selector-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6c757d;
        }
        
        .storage-selector-body {
            padding: 20px;
        }
        
        .storage-selector-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 20px 0;
        }
        
        .btn-primary, .btn-secondary {
            padding: 12px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: #007bff;
            color: white;
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #212529;
            border: 1px solid #dee2e6;
        }
        
        .storage-info-note {
            font-size: 14px;
            color: #6c757d;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 4px;
            margin-top: 20px;
        }
    `;
    
    // Dialog zum DOM hinzufügen
    document.body.appendChild(style);
    document.body.appendChild(modal);
    
    // Event-Listener für Schließen-Button
    const closeButton = modal.querySelector('.storage-selector-close');
    closeButton.addEventListener('click', () => {
        modal.remove();
    });
    
    // Event-Listener für Ordner-Auswahl
    const selectFolderButton = document.getElementById('storage-select-folder');
    selectFolderButton.addEventListener('click', async () => {
        const success = await selectAndPersistDirectory();
        
        if (success) {
            showNotification('Speicherort erfolgreich festgelegt', 'success');
            modal.remove();
        } else {
            showNotification('Fehler beim Festlegen des Speicherorts', 'error');
        }
    });
    
    // Event-Listener für Browser-Speicher
    const useBrowserButton = document.getElementById('storage-use-browser');
    useBrowserButton.addEventListener('click', () => {
        // Reset des Dateisystem-Zugriffs
        directoryHandle = null;
        window.directoryHandle = null;
        isStorageAccessible = false;
        hasStorageLocationSet = false;
        localStorage.setItem('hasStoredDirectoryHandle', 'false');
        
        // Aktualisiere den Indikator
        updateStorageIndicator(false);
        
        showNotification('Browser-Speicher wird verwendet', 'info');
        modal.remove();
    });
}

/**
 * Löst ein Event aus, wenn das DirectoryHandle wiederhergestellt wurde
 * @param {boolean} success - True wenn erfolgreich wiederhergestellt
 */
function dispatchDirectoryHandleEvent(success) {
    const event = new CustomEvent('directoryHandleRestored', {
        detail: {
            success: success,
            handle: directoryHandle
        }
    });
    document.dispatchEvent(event);
    
    // Auch ein sichtbares Indikator im DOM hinzufügen
    updateStorageIndicator(success);
}

/**
 * Zeigt einen visuellen Indikator für den Dateisystemzugriff an
 * @param {boolean} active - True wenn Dateisystemzugriff aktiv ist
 */
function updateStorageIndicator(active) {
    // Entferne einen vorhandenen Indikator
    const existingIndicator = document.getElementById('storage-fs-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Erstelle einen neuen Indikator
    const indicator = document.createElement('div');
    indicator.id = 'storage-fs-indicator';
    
    if (active) {
        indicator.innerHTML = `
            <div class="fs-indicator active" title="Dateisystem-Speicherung ist aktiv">
                <i class="fas fa-hdd"></i>
                <span>Dateispeicher aktiv</span>
            </div>
        `;
    } else {
        indicator.innerHTML = `
            <div class="fs-indicator inactive" title="Nur Browser-Speicherung aktiv (keine Dateisystem-Speicherung)">
                <i class="fas fa-database"></i>
                <span>Browser-Speicher</span>
            </div>
        `;
    }
    
    // Styles für den Indikator
    const style = document.createElement('style');
    style.textContent = `
        #storage-fs-indicator {
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 1000;
        }
        
        .fs-indicator {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .fs-indicator i {
            margin-right: 8px;
        }
        
        .fs-indicator.active {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .fs-indicator.inactive {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
        }
    `;
    
    // Indikator und Styles zum DOM hinzufügen
    document.head.appendChild(style);
    document.body.appendChild(indicator);
}

/**
 * Zeigt eine Benachrichtigung an
 * @param {string} message - Die Nachricht
 * @param {string} type - Der Typ (success, error, warning, info)
 */
function showNotification(message, type) {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Globale Funktionen exportieren
window.initializeStorage = initializeStorage;
window.saveData = saveData;
window.loadData = loadData;
window.selectAndPersistDirectory = selectAndPersistDirectory;
window.showStorageSelector = showStorageSelector;
window.testFileAccess = testFileAccess;

// Initialisierung beim Laden
document.addEventListener('DOMContentLoaded', () => {
    // Nur initialisieren, wenn der Benutzer eingeloggt ist
    if (localStorage.getItem('loggedIn') === 'true') {
        console.log('Storage-Core wird initialisiert...');
        initializeStorage().then(success => {
            console.log(`Storage-Initialisierung ${success ? 'erfolgreich' : 'mit Problemen'}`);
        });
    } else {
        console.log('Benutzer nicht eingeloggt, Storage-Core wird nicht initialisiert');
    }
    
    // Event-Listener für DirectoryHandle-Wiederherstellung
    document.addEventListener('directoryHandleRestored', (event) => {
        const { success, handle } = event.detail;
        if (success && handle) {
            console.log('✅ DirectoryHandle erfolgreich wiederhergestellt!');
            showNotification('Speicherort-Zugriff erfolgreich hergestellt', 'success');
        }
    });
});

console.log('📦 Storage-Core geladen - vereinfachte und robuste Speicherverwaltung');
