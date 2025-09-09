/**
 * LernApp Storage Core - Vereinfachte und robuste Speicherverwaltung
 * 
 * Dieses Modul implementiert eine klare und einfache Logik für die Speicherverwaltung:
 * 1. Prüft ob es das erste Login ist
 * 2. Prüft ob ein Speicherort festgelegt wurde
 * 3. Schreibt auf den festgelegten Speicherort mit Auto-Reparatur
 * 4. Öffnet ein Modal zur Berechtigung, wenn Schreiben nicht möglich ist
 */

// Guard gegen mehrfaches Laden
if (typeof window.STORAGE_CORE_LOADED !== 'undefined') {
    console.warn('⚠️ Storage-Core wurde bereits geladen. Doppelte Initialisierung vermieden.');
} else {
    window.STORAGE_CORE_LOADED = true;
    
    // Globale Konstanten
    const DEFAULT_STORAGE_PATH = 'LernAppDatenbank';
    const DB_NAME = 'LernAppDirectoryHandles';
    const STORE_NAME = 'lernapp-directory-handles';
    const HANDLE_KEY_PREFIX = 'dir-handle-'; // Präfix für benutzerspezifische Handles
const OLD_HANDLE_KEY = 'main-directory-handle'; // Für Migration
const DB_VERSION = 3; // Erhöht auf Version 3 für Migration

// Globale Variable für das DirectoryHandle
let directoryHandle = null;

/**
 * Hilfsfunktion, um den aktuellen Benutzernamen zu erhalten
 * @returns {string} Der aktuelle Benutzername oder 'default' wenn nicht eingeloggt
 */
function getCurrentUsername() {
    return localStorage.getItem('username') || 'default';
}

/**
 * Hilfsfunktion, um den benutzerspezifischen Schlüssel für das DirectoryHandle zu generieren
 * @returns {string} Der benutzerspezifische Schlüssel
 */
function getUserSpecificHandleKey() {
    const username = getCurrentUsername();
    return `${HANDLE_KEY_PREFIX}${username}`;
}

// Status-Flags
let isFirstLogin = false;
let hasStorageLocationSet = false;
let isStorageAccessible = false;

/**
 * Initialisiert das Speichersystem
 * @param {Object} options - Konfigurationsoptionen
 * @param {boolean} options.showModal - Ob automatisch Modals angezeigt werden sollen
 * @returns {Promise<boolean>} True wenn die Initialisierung erfolgreich war
 */
async function initializeStorage(options = {}) {
    // Standardwerte für Optionen
    const config = {
        showModal: true,
        ...options
    };
    
    try {
        // 1. Prüfen ob es das erste Login ist
        const username = getCurrentUsername();
        console.log(`Initialisiere Speicher für Benutzer: ${username}`);
        
        // Debug: Ausgabe aller relevanten localStorage-Einträge
        console.log('DEBUG: Aktuelle localStorage-Einträge für diesen Benutzer:');
        console.log(`- hasLoggedInBefore_${username}: ${localStorage.getItem(`hasLoggedInBefore_${username}`)}`);
        console.log(`- hasStoredDirectoryHandle_${username}: ${localStorage.getItem(`hasStoredDirectoryHandle_${username}`)}`);
        console.log(`- directoryHandleName_${username}: ${localStorage.getItem(`directoryHandleName_${username}`)}`);
        
        isFirstLogin = !localStorage.getItem(`hasLoggedInBefore_${username}`);
        if (isFirstLogin) {
            console.log('Erster Login erkannt für Benutzer:', username);
            localStorage.setItem(`hasLoggedInBefore_${username}`, 'true');
        }

        // 2. Prüfen ob ein Speicherort festgelegt wurde
        hasStorageLocationSet = localStorage.getItem(`hasStoredDirectoryHandle_${username}`) === 'true';
        console.log(`Speicherort für Benutzer ${username} festgelegt: ${hasStorageLocationSet}`);
        
        // 3. Falls ein Speicherort festgelegt wurde, versuchen diesen zu laden
        if (hasStorageLocationSet) {
            console.log(`Speicherort wurde zuvor für Benutzer ${username} festgelegt, versuche ihn zu laden`);
            const success = await restoreDirectoryHandle();
            
            if (success) {
                console.log('Speicherort erfolgreich geladen');
                isStorageAccessible = true;
                
                // Event auslösen, dass das DirectoryHandle wiederhergestellt wurde
                dispatchDirectoryHandleEvent(true);
                
                return true;
            } else {
                console.log('Speicherort konnte nicht geladen werden');
                // Wir zeigen KEINEN Dialog mehr an, sondern überlassen es dem Browser
                // Setze Status auf nicht zugänglich
                isStorageAccessible = false;
                updateStorageIndicator(false);
                return false;
            }
        } else if (isFirstLogin) {
            // Bei erstem Login gleich Speicherort auswählen lassen
            console.log('Erstes Login, zeige Speicherort-Auswahl');
            
            // Prüfen, ob der Browser die File System Access API unterstützt
            const isSupported = window.isFileSystemAccessSupported ? window.isFileSystemAccessSupported() : 'showDirectoryPicker' in window;
            
            if (!isSupported) {
                console.warn('⚠️ Browser unterstützt keine Ordnerauswahl, verwende Browser-Speicher');
                displayNotification('Browser-Speicher wird verwendet, da dein Browser keine Ordnerauswahl unterstützt.', 'info');
                return true;
            }
            
            // Nur anzeigen, wenn Optionen es erlauben
            if (config.showModal) {
                showStorageSelector();
            } else {
                console.log('Automatischer Dialog deaktiviert, verwende Browser-Speicher');
            }
            
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
        const username = getCurrentUsername();
        console.log(`🔄 Versuche DirectoryHandle für Benutzer ${username} wiederherzustellen...`);
        
        // 1. Handle aus der IndexedDB laden
        const db = await openHandleDatabase();
        const handle = await getHandleFromDatabase(db);
        
        if (!handle) {
            console.warn(`⚠️ Kein gespeichertes DirectoryHandle für Benutzer ${username} gefunden`);
                return null;
        }
        
        console.log(`✅ DirectoryHandle für Benutzer ${username} gefunden: ${handle.name}`);
        
        // 2. Berechtigung prüfen/anfordern
        try {
            // Sanity check - prüfen, ob das Handle überhaupt noch gültig ist
            if (!handle || typeof handle.requestPermission !== 'function') {
                console.error('❌ Ungültiges DirectoryHandle - möglicherweise ist der Browser-Cache beschädigt');
                throw new Error('Ungültiges DirectoryHandle');
            }
            
            // Vorsichtiges Anfordern der Berechtigung mit Fehlerbehandlung
            console.log('🔑 Fordere Dateisystem-Berechtigung an...');
            const permission = await handle.requestPermission({ mode: 'readwrite' });
            
            if (permission !== 'granted') {
                console.warn(`⚠️ Berechtigung nicht erteilt für Handle ${handle.name}`);
                    return null;
            }
            
            console.log('✅ Dateisystem-Berechtigung erteilt');
            
            // 3. Handle speichern
            directoryHandle = handle;
            window.directoryHandle = handle; // Auch global verfügbar machen
            
            // 4. Testen, ob der Zugriff wirklich funktioniert
            console.log('🔍 Teste Dateisystem-Zugriff...');
            const accessWorks = await testFileAccess();
            
            if (accessWorks) {
                console.log('✅ Dateisystem-Zugriff erfolgreich getestet');
                isStorageAccessible = true;
                    return handle;
            } else {
                console.warn('⚠️ Dateisystem-Zugriff-Test fehlgeschlagen');
                    return null;
            }
        } catch (permissionError) {
            console.error('❌ Fehler bei der Berechtigungsanfrage:', permissionError);
            
            // Spezifische Behandlung für InvalidStateError
            if (permissionError.name === 'InvalidStateError') {
                console.log('🔄 InvalidStateError erkannt - versuche Handle neu zu laden');
                
                // Wir versuchen, das Handle aus der Datenbank zu löschen
                try {
                    // Handle aus IndexedDB löschen
                    await clearHandleFromDatabase();
                    console.log('✅ Altes Handle aus Datenbank entfernt');
                        return null;
                } catch (clearError) {
                    console.error('❌ Fehler beim Löschen des alten Handles:', clearError);
                }
            }
            
                return null;
        }
    } catch (error) {
        console.error('❌ Fehler beim Wiederherstellen des DirectoryHandle:', error);
            return null;
    }
}

/**
 * Überprüft und fordert ggf. Berechtigungen für ein DirectoryHandle an
 * @param {FileSystemDirectoryHandle} handle - Das zu überprüfende DirectoryHandle
 * @returns {Promise<boolean>} True wenn die Berechtigung vorhanden ist
 */
async function verifyPermission(handle) {
    if (!handle) {
        console.error('Kein Handle übergeben für Berechtigungsprüfung');
        return false;
    }
    
    try {
        // Überprüfen, ob wir bereits Schreib-Berechtigung haben
        const options = { mode: 'readwrite' };
        let permission = await handle.queryPermission(options);
        
        // Wenn wir keine Berechtigung haben, fragen wir sie an
        if (permission !== 'granted') {
            console.log('Keine Berechtigung vorhanden, fordere sie an...');
            permission = await handle.requestPermission(options);
        }
        
        return permission === 'granted';
    } catch (error) {
        console.error('Fehler bei der Berechtigungsprüfung:', error);
        return false;
    }
}

/**
 * Testet den Dateisystem-Zugriff durch Schreiben einer Testdatei
 * @returns {Promise<boolean>} True wenn der Test erfolgreich war
 */
async function testFileAccess() {
    if (!directoryHandle) {
        console.warn('⚠️ Kein DirectoryHandle vorhanden');
        return false;
    }
    
    try {
        console.log('🔍 Teste Dateisystem-Zugriff mit einer Testdatei...');
        
        // Test-Datei schreiben
        const testFileName = '.test-access';
        
        try {
            // Versuche zuerst, die Berechtigung zu verifizieren (könnte InvalidStateError auslösen)
            const hasPermission = await verifyPermission(directoryHandle);
            if (!hasPermission) {
                console.warn('⚠️ Keine Berechtigung für das DirectoryHandle');
                return false;
            }
            
            // Dann versuchen wir, eine Testdatei zu schreiben
            const fileHandle = await directoryHandle.getFileHandle(testFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write('Zugriff OK ' + new Date().toISOString());
            await writable.close();
            
            console.log('✅ Dateisystem-Zugriffstest erfolgreich');
            return true;
        } catch (fileError) {
            console.error('❌ Fehler beim Testzugriff:', fileError);
            
            // Spezielle Behandlung für InvalidStateError
            if (fileError.name === 'InvalidStateError' || 
                fileError.message.includes('InvalidStateError') ||
                fileError.message.includes('state cached') ||
                fileError.message.includes('operation that depends on state')) {
                
                console.log('🚨 InvalidStateError erkannt - Handle ist ungültig');
                
                try {
                    // Handle löschen, damit es später neu angefordert wird
                    await clearHandleFromDatabase();
                    console.log('🗑️ Ungültiges Handle gelöscht');
                    
                    // Handle-Variablen zurücksetzen
                    directoryHandle = null;
                    window.directoryHandle = null;
                    isStorageAccessible = false;
                    
                    // localStorage-Flags zurücksetzen, um bei erneutem Login eine Auswahl zu ermöglichen
                    const username = getCurrentUsername();
                    localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'false');
                    
                    // UI-Indikator aktualisieren
                    updateStorageIndicator(false);
                } catch (clearError) {
                    console.error('❌ Fehler beim Löschen des Handles:', clearError);
                }
            }
            
            return false;
        }
    } catch (error) {
        console.error('❌ Dateisystem-Zugriffstest fehlgeschlagen:', error);
        
        // Auch hier eine letzte Chance für die InvalidStateError-Behandlung
        if (error.name === 'InvalidStateError' || 
            error.message.includes('InvalidStateError') ||
            error.message.includes('state cached') ||
            error.message.includes('operation that depends on state')) {
            
            console.log('🚨 InvalidStateError im äußeren Block - Handle zurücksetzen');
            
            try {
                // Handle löschen und UI aktualisieren
                await clearHandleFromDatabase();
                directoryHandle = null;
                window.directoryHandle = null;
                isStorageAccessible = false;
                updateStorageIndicator(false);
            } catch (finalError) {
                console.error('❌ Finale Fehlerbehandlung fehlgeschlagen:', finalError);
            }
        }
        
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
            const oldVersion = event.oldVersion;
            
            console.log(`IndexedDB-Upgrade von Version ${oldVersion} auf ${DB_VERSION}`);
            
            // Bei einem Update von einer alten Version
            if (oldVersion < 3) {
                // Wir behalten den alten Object Store, falls vorhanden
                let store;
                
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // Object Store erstellen, falls er nicht existiert
                    store = db.createObjectStore(STORE_NAME);
                    console.log('Neuer ObjectStore für Handles erstellt');
                } else {
                    // Bestehenden Store öffnen für die Migration
                    const tx = event.target.transaction;
                    store = tx.objectStore(STORE_NAME);
                    console.log('Bestehender ObjectStore für Handles geöffnet');
                    
                    // Migration: Altes Handle zu benutzerspezifischem Handle migrieren
                    const migrationRequest = store.get(OLD_HANDLE_KEY);
                    
                    migrationRequest.onsuccess = () => {
                        const oldHandle = migrationRequest.result;
                        if (oldHandle) {
                            console.log('Altes DirectoryHandle gefunden, migriere zu benutzerspezifischem Handle');
                            
                            // Username aus localStorage
                            const username = localStorage.getItem('username') || 'default';
                            const newKey = `${HANDLE_KEY_PREFIX}${username}`;
                            
                            // Altes Handle unter neuem Schlüssel speichern
                            store.put(oldHandle, newKey);
                            
                            // Benutzerspezifische localStorage-Flags setzen
                            if (oldHandle.name) {
                                localStorage.setItem(`directoryHandleName_${username}`, oldHandle.name);
                            }
                            localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'true');
                            
                            console.log(`Migration abgeschlossen: Handle für Benutzer ${username} erstellt`);
                        }
                    };
                }
            }
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
    return new Promise(async (resolve, reject) => {
        try {
            const username = getCurrentUsername();
            const userHandleKey = getUserSpecificHandleKey();
            
            console.log(`🔍 Suche nach DirectoryHandle in IndexedDB - Benutzer: ${username}, Schlüssel: ${userHandleKey}`);
            
            // Alle vorhandenen Schlüssel auflisten für Debug-Zwecke
            const tx0 = db.transaction(STORE_NAME, 'readonly');
            const store0 = tx0.objectStore(STORE_NAME);
            const allKeysRequest = store0.getAllKeys();
            
            allKeysRequest.onsuccess = () => {
                const allKeys = allKeysRequest.result;
                console.log(`🔑 Vorhandene Schlüssel in IndexedDB: ${JSON.stringify(allKeys)}`);
            };
            
            // Haupttransaktion für den Zugriff auf das Handle
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            // 1. Zuerst nach dem benutzerspezifischen Schlüssel suchen
            const userRequest = store.get(userHandleKey);
            
            userRequest.onerror = (event) => {
                console.error('Fehler beim Lesen aus IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            userRequest.onsuccess = async () => {
                if (userRequest.result) {
                    console.log(`✅ Benutzerspezifisches Handle für ${userHandleKey} gefunden: ${userRequest.result.name}`);
                    resolve(userRequest.result);
                } else {
                    console.log(`❌ Kein benutzerspezifisches Handle gefunden, prüfe alte globale Handles`);
                    
                    // 2. Falls nicht gefunden, nach dem alten Schlüssel suchen
                    const oldRequest = store.get(OLD_HANDLE_KEY);
                    
                    oldRequest.onerror = (event) => {
                        console.error('Fehler beim Lesen des alten Handles:', event.target.error);
                        resolve(null); // Wir lösen mit null auf, da kein Handle gefunden wurde
                    };
                    
                    oldRequest.onsuccess = async () => {
                        if (oldRequest.result) {
                            console.log('✅ Altes globales Handle gefunden, migriere zu benutzerspezifischem Handle');
                            
                            // Altes Handle unter neuem Schlüssel speichern
                            try {
                                const oldHandle = oldRequest.result;
                                console.log(`🔄 Migriere Handle: ${oldHandle.name} von ${OLD_HANDLE_KEY} zu ${userHandleKey}`);
                                await storeDirectoryHandle(oldHandle);
                                
                                // Alten Eintrag löschen (optional)
                                const deleteTx = db.transaction(STORE_NAME, 'readwrite');
                                const deleteStore = deleteTx.objectStore(STORE_NAME);
                                await new Promise((resolve, reject) => {
                                    const deleteRequest = deleteStore.delete(OLD_HANDLE_KEY);
                                    deleteRequest.onsuccess = () => resolve();
                                    deleteRequest.onerror = () => reject(deleteRequest.error);
                                });
                                
                                console.log('✅ Migration des Handles abgeschlossen');
                                resolve(oldHandle);
                            } catch (migrationError) {
                                console.error('❌ Fehler bei der Migration des Handles:', migrationError);
                                resolve(oldRequest.result); // Trotzdem das alte Handle verwenden
                            }
                        } else {
                            console.log('❌ Kein Handle gefunden, weder benutzerspezifisch noch global');
                            resolve(null);
                        }
                    };
                }
            };
        } catch (error) {
            console.error('❌ Fehler bei getHandleFromDatabase:', error);
            reject(error);
        }
    });
}

/**
 * Löscht ein Handle aus der Datenbank und setzt alle zugehörigen Flags zurück
 * @returns {Promise<boolean>} True wenn erfolgreich gelöscht
 */
async function clearHandleFromDatabase() {
    try {
        const db = await openHandleDatabase();
        const userHandleKey = getUserSpecificHandleKey();
        const username = getCurrentUsername();
        
        // Auch die localStorage-Flags zurücksetzen
        localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'false');
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(userHandleKey);
            
            request.onerror = (event) => {
                console.error('❌ Fehler beim Löschen aus IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                console.log('✅ DirectoryHandle erfolgreich aus IndexedDB gelöscht');
                
                // Status zurücksetzen
                directoryHandle = null;
                window.directoryHandle = null;
                isStorageAccessible = false;
                hasStorageLocationSet = false;
                
                // Entferne gespeicherte Flags
                const username = getCurrentUsername();
                localStorage.removeItem(`hasStoredDirectoryHandle_${username}`);
                localStorage.removeItem(`directoryHandleName_${username}`);
                
                resolve(true);
            };
        });
    } catch (error) {
        console.error('❌ Fehler bei clearHandleFromDatabase:', error);
        return false;
    }
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
        const userHandleKey = getUserSpecificHandleKey();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(handle, userHandleKey);
            console.log(`[storage-core] Speicherversuch in IndexedDB unter Schlüssel: ${userHandleKey}`);

            // Detailliertes Error-Logging
            request.onerror = (event) => {
                const err = event && event.target && event.target.error ? event.target.error : event;
                console.error('[storage-core] Fehler beim Speichern in IndexedDB', {
                    key: userHandleKey,
                    error: err,
                    name: err && err.name,
                    message: err && err.message,
                    stack: err && err.stack
                });
                reject(err);
            };

            request.onsuccess = () => {
                directoryHandle = handle;
                window.directoryHandle = handle;

                // Status setzen
                hasStorageLocationSet = true;
                const username = getCurrentUsername();
                localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'true');

                // Den Namen des Handles für spätere Anzeige speichern
                if (handle && handle.name) {
                    localStorage.setItem(`directoryHandleName_${username}`, handle.name);
                }

                console.log('[storage-core] DirectoryHandle erfolgreich in IndexedDB gespeichert', { key: userHandleKey, name: handle.name });
                // Notify listeners that the directory handle changed
                try { document.dispatchEvent(new CustomEvent('directoryHandleChanged', { detail: { handle } })); } catch (e) { }
                resolve(true);
            };

            // Transaction-level error handling
            transaction.onerror = (event) => {
                const err = event && event.target && event.target.error ? event.target.error : event;
                console.error('[storage-core] Transaction error while saving handle', { key: userHandleKey, error: err });
                // Ensure rejection if not already rejected
                try { reject(err); } catch (e) {}
            };
            transaction.onabort = (event) => {
                const err = event && event.target && event.target.error ? event.target.error : event;
                console.warn('[storage-core] Transaction aborted while saving handle', { key: userHandleKey, error: err });
                try { reject(err); } catch (e) {}
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
        // Daten als JSON-String speichern
        const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
        localStorage.setItem(`data_${filename}`, jsonData);
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
                // Versuche die Daten als JSON zu parsen
                return JSON.parse(localData);
            } catch (parseError) {
                console.warn(`Fehler beim Parsen der Daten aus localStorage: ${parseError.message}`);
                
                // Wenn es ein Objekt-String ist (z.B. "[object Object]"), 
                // ein leeres Objekt zurückgeben
                if (localData === "[object Object]") {
                    console.warn(`Ungültiger Objekt-String im localStorage gefunden, verwende leeres Objekt`);
                    return {};
                }
                
                // Sonst Rohdaten zurückgeben
                return localData;
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
        // Nur noch moderne API und Zugriffstest
        const handle = await window.showDirectoryPicker({
            id: 'LernAppStorage',
            startIn: 'documents',
            mode: 'readwrite'
        });

        // Speichere das Handle in IndexedDB
        const stored = await storeDirectoryHandle(handle);
        if (!stored) {
            displayNotification('Fehler beim Speichern des Ordner-Handles.', 'error');
            return false;
        }

        // Teste den Zugriff bis zu 3x
        let accessWorks = false;
        for (let i = 0; i < 3; i++) {
            accessWorks = await testFileAccess();
            if (accessWorks) break;
            await new Promise(res => setTimeout(res, 300));
        }

        if (accessWorks) {
            isStorageAccessible = true;
            directoryHandle = handle;
            window.directoryHandle = handle;
            hasStorageLocationSet = true;
            const username = getCurrentUsername();
            localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'true');
            if (handle && handle.name) {
                localStorage.setItem(`directoryHandleName_${username}`, handle.name);
            }
            // Notify listeners
            try { document.dispatchEvent(new CustomEvent('directoryHandleChanged', { detail: { handle } })); } catch (e) { }
            dispatchDirectoryHandleEvent(true);
            return true;
        } else {
            displayNotification('Keine Schreibberechtigung im gewählten Ordner. Bitte anderen Ordner wählen.', 'error');
            console.warn('Dateisystem-Zugriff-Test fehlgeschlagen nach Auswahl');
            return false;
        }
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
    
    console.log('🔄 Zeige Speicherort-Auswähler...');
    
    // Prüfen, ob der Browser die File System Access API unterstützt
    const isSupported = window.isFileSystemAccessSupported ? window.isFileSystemAccessSupported() : 'showDirectoryPicker' in window;
    
    if (!isSupported) {
        console.warn('⚠️ Dieser Browser unterstützt nicht die Auswahl von Ordnern');
        // Meldung anzeigen und automatisch Browser-Speicher verwenden
        displayNotification('Dein Browser unterstützt leider nicht die Auswahl von Ordnern. Die Daten werden im Browser gespeichert.', 'info', 8000);
        
        // Fallback auf Browser-Speicher ohne Dialog
        directoryHandle = null;
        window.directoryHandle = null;
        isStorageAccessible = false;
        hasStorageLocationSet = false;
        const username = getCurrentUsername();
        localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'false');
        updateStorageIndicator(false);
        return;
    }
    
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
        try {
            // Öffne den Dateibrowser und lasse den Nutzer einen Ordner auswählen
            const handle = await window.showDirectoryPicker({
                id: 'LernAppStorage',
                startIn: 'documents',
                mode: 'readwrite'
            });
            // Setze den ausgewählten Ordner als Speicherort
            window.directoryHandle = handle;
            directoryHandle = handle;
            isStorageAccessible = true;
            hasStorageLocationSet = true;
            const username = getCurrentUsername();
            localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'true');
            if (handle && handle.name) {
                localStorage.setItem(`directoryHandleName_${username}`, handle.name);
            }
            dispatchDirectoryHandleEvent(true);
            displayNotification('Speicherort erfolgreich festgelegt', 'success');
            modal.remove();
        } catch (error) {
            displayNotification('Fehler beim Festlegen des Speicherorts', 'error');
            console.log('Fehler beim Festlegen des Speicherorts:', error);
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
        
        displayNotification('Browser-Speicher wird verwendet', 'info');
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
function displayNotification(message, type) {
    // Prüfen, ob eine globale Notification-Funktion existiert, die NICHT diese Funktion ist
    if (typeof window.showNotification === 'function' && window.showNotification !== displayNotification) {
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
window.displayNotification = displayNotification;
window.verifyPermission = verifyPermission; 
window.clearHandleFromDatabase = clearHandleFromDatabase; // Neue Funktion für Reparatur
// Expose restoreDirectoryHandle to global scope for callers / console
window.restoreDirectoryHandle = restoreDirectoryHandle;

// Initialisierung beim Laden des Skripts
if (localStorage.getItem('loggedIn') === 'true') {
    console.log('📦 Storage-Core wird sofort initialisiert...');
    const username = localStorage.getItem('username');
    console.log(`📦 Automatische Initialisierung für Benutzer: ${username}`);
    
    // Verzögerter Aufruf um sicherzustellen, dass alle benötigten Skripte geladen sind
    setTimeout(() => {
        initializeStorage().then(success => {
            console.log(`📦 Sofortige Storage-Initialisierung ${success ? 'erfolgreich ✅' : 'mit Problemen ❌'}`);
        });
    }, 100);
}

// Initialisierung beim Laden der Seite (als Backup)
document.addEventListener('DOMContentLoaded', () => {
    // Nur initialisieren, wenn der Benutzer eingeloggt ist
    if (localStorage.getItem('loggedIn') === 'true') {
        console.log('📦 Storage-Core wird bei DOMContentLoaded initialisiert...');
        initializeStorage().then(success => {
            console.log(`📦 DOMContentLoaded Storage-Initialisierung ${success ? 'erfolgreich ✅' : 'mit Problemen ❌'}`);
        });
    } else {
        console.log('Benutzer nicht eingeloggt, Storage-Core wird nicht initialisiert');
    }
    
    // Event-Listener für DirectoryHandle-Wiederherstellung
    document.addEventListener('directoryHandleRestored', (event) => {
        const { success, handle } = event.detail;
        if (success && handle) {
            console.log('✅ DirectoryHandle erfolgreich wiederhergestellt!');
            displayNotification('Speicherort-Zugriff erfolgreich hergestellt', 'success');
        }
    });
});

console.log('📦 Storage-Core geladen - vereinfachte und robuste Speicherverwaltung');

} // Ende des Guards gegen mehrfaches Laden
