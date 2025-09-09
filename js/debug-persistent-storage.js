/**
 * Debug-Hilfsprogramm für die persistente Dateisystem-Speicherung
 * Dieses Skript bietet erweiterte Debugging-Funktionen für die IndexedDB-Speicherung von DirectoryHandles
 */

// Guard gegen mehrfaches Laden
if (typeof window.DEBUG_PERSISTENT_STORAGE_LOADED !== 'undefined') {
    console.warn('⚠️ Debug-Tools für persistente Speicherung wurden bereits geladen. Doppelte Initialisierung vermieden.');
} else {
    window.DEBUG_PERSISTENT_STORAGE_LOADED = true;

    // Konstanten für den Zugriff auf die IndexedDB-Datenbank
    const DEBUG_DB_NAME = 'LernAppDirectoryHandles';
    const DEBUG_STORE_NAME = 'lernapp-directory-handles';
    const DEBUG_HANDLE_KEY_PREFIX = 'dir-handle-'; // Prefix für benutzerspezifische Handles
    const DEBUG_OLD_KEY_NAME = 'main-directory-handle';

// Sofort Meldung ausgeben, dass Debugging-Tools geladen wurden
if (window.logger) {
    window.logger.info('📂 Dateisystem-Debug-Tools geladen');
    window.logger.info('Verfügbare Befehle: debugPersistentStorage(), clearStoredDirectoryHandle(), showDebugCommands(), testFileAccess()');
} else {
    console.log('%c📂 Dateisystem-Debug-Tools geladen', 'color: blue; font-weight: bold; font-size: 14px');
    console.log('Verfügbare Befehle: debugPersistentStorage(), clearStoredDirectoryHandle(), showDebugCommands(), testFileAccess()');
}

/**
 * Prüft und zeigt den Status der persistenten Dateisystem-Speicherung
 * @returns {Promise<Object>} Ein Objekt mit Statusinformationen
 */
async function debugPersistentStorage() {
    const logFunc = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const warnFunc = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
    const errorFunc = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    logFunc('📂 Persistente Speicher-Diagnose gestartet');
    
    try {
        const status = {
            browserSupport: 'showDirectoryPicker' in window,
            persistenceStatus: {
                hasIndexedDB: 'indexedDB' in window,
                hasLocalStorage: 'localStorage' in window,
                hasDirectoryHandleFlag: localStorage.getItem('hasDirectoryHandle') === 'true',
                hasStoredDirectoryHandleFlag: localStorage.getItem('hasStoredDirectoryHandle') === 'true'
            },
            directoryHandleStatus: {
                globalHandleExists: !!window.directoryHandle,
                globalHandleName: window.directoryHandle ? window.directoryHandle.name : null
            },
            indexedDBStatus: {},
            localStorage: {}
        };
        
        // IndexedDB Status prüfen
        if (status.persistenceStatus.hasIndexedDB) {
            try {
                logFunc('Prüfe IndexedDB...');
                
                const db = await openDebugDatabase();
                const tx = db.transaction(DEBUG_STORE_NAME, 'readonly');
                const store = tx.objectStore(DEBUG_STORE_NAME);
                
                // Aktuellen Benutzernamen ermitteln
                const username = localStorage.getItem('username') || 'default';
                const userHandleKey = `${DEBUG_HANDLE_KEY_PREFIX}${username}`;
                
                // Zuerst nach dem benutzerspezifischen Schlüssel suchen
                const request = store.get(userHandleKey);
                
                await new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        if (request.result) {
                            status.indexedDBStatus.hasStoredHandle = true;
                            status.indexedDBStatus.handleName = request.result.name;
                            status.indexedDBStatus.handleKind = request.result.kind;
                            status.indexedDBStatus.key = userHandleKey;
                            resolve();
                        } else {
                            // Falls nicht gefunden, nach dem alten Schlüssel suchen
                            const oldRequest = store.get(DEBUG_OLD_KEY_NAME);
                            oldRequest.onsuccess = () => {
                                status.indexedDBStatus.hasStoredHandle = !!oldRequest.result;
                                status.indexedDBStatus.handleName = oldRequest.result ? oldRequest.result.name : null;
                                status.indexedDBStatus.handleKind = oldRequest.result ? oldRequest.result.kind : null;
                                status.indexedDBStatus.key = DEBUG_OLD_KEY_NAME;
                                resolve();
                            };
                            oldRequest.onerror = (event) => {
                                status.indexedDBStatus.error = event.target.error.message;
                                reject(event.target.error);
                            };
                        }
                    };
                    request.onerror = (event) => {
                        status.indexedDBStatus.error = event.target.error.message;
                        reject(event.target.error);
                    };
                    tx.oncomplete = () => {
                        db.close();
                    };
                });
                
                if (status.indexedDBStatus.hasStoredHandle) {
                    logFunc(`IndexedDB-Status: Handle gefunden ✓ - Name: ${status.indexedDBStatus.handleName}, Typ: ${status.indexedDBStatus.handleKind}`);
                } else {
                    warnFunc('IndexedDB-Status: Kein Handle gefunden ✗');
                }
            } catch (error) {
                status.indexedDBStatus.error = error.message;
                errorFunc(`❌ Fehler beim Zugriff auf IndexedDB: ${error.message}`);
            }
        } else {
            warnFunc('⚠️ IndexedDB wird nicht unterstützt');
        }
        
        // localStorage prüfen
        if (status.persistenceStatus.hasLocalStorage) {
            logFunc('Prüfe localStorage...');
            const username = localStorage.getItem('username');
            status.localStorage = {
                username,
                storagePath: localStorage.getItem('storagePath') || localStorage.getItem(`storagePath_${username}`),
                hasDirectoryHandle: localStorage.getItem(`hasDirectoryHandle_${username}`) === 'true',
                hasStoredDirectoryHandle: localStorage.getItem(`hasStoredDirectoryHandle_${username}`) === 'true'
            };
            
            logFunc(`Benutzer: ${status.localStorage.username || 'Nicht eingeloggt'}`);
            logFunc(`Speicherpfad: ${status.localStorage.storagePath || 'Nicht konfiguriert'}`);
            logFunc(`DirectoryHandle-Flag: ${status.localStorage.hasDirectoryHandle ? 'Gesetzt ✓' : 'Nicht gesetzt ✗'}`);
            logFunc(`StoredDirectoryHandle-Flag: ${status.localStorage.hasStoredDirectoryHandle ? 'Gesetzt ✓' : 'Nicht gesetzt ✗'}`);
        } else {
            warnFunc('⚠️ localStorage wird nicht unterstützt');
        }
        
        // Globales DirectoryHandle prüfen
        logFunc('Prüfe globales DirectoryHandle...');
        if (status.directoryHandleStatus.globalHandleExists) {
            logFunc(`✓ Globales DirectoryHandle vorhanden - Name: ${status.directoryHandleStatus.globalHandleName}`);
            
            // Berechtigungsstatus prüfen
            try {
                if (window.verifyPermission) {
                    const permission = await window.verifyPermission(window.directoryHandle);
                    status.directoryHandleStatus.permission = permission;
                    logFunc(`Berechtigungsstatus: ${permission}`);
                } else {
                    warnFunc('⚠️ verifyPermission-Funktion nicht gefunden');
                    
                    // Fallback: Direkte Berechtigungsprüfung
                    const permission = await window.directoryHandle.requestPermission({ mode: 'readwrite' });
                    status.directoryHandleStatus.permission = permission;
                    logFunc(`Berechtigungsstatus (direkt): ${permission}`);
                }
            } catch (error) {
                status.directoryHandleStatus.permissionError = error.message;
                errorFunc(`❌ Fehler bei der Berechtigungsprüfung: ${error.message}`);
            }
        } else {
            warnFunc('✗ Kein globales DirectoryHandle vorhanden');
        }
        
        logFunc('📊 Zusammenfassung');
        const summaryStatus = getSummaryStatus(status);
        logFunc(`Gesamtstatus: ${summaryStatus.text}`);
        logFunc(`Empfehlung: ${summaryStatus.recommendation}`);
        
        return status;
    } catch (error) {
        errorFunc(`Fehler bei der Diagnose: ${error.message}`);
        return { error: error.message };
    }
}

/**
 * Öffnet die Debug-Datenbank
 * @returns {Promise<IDBDatabase>} Die geöffnete Datenbank
 */
function openDebugDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DEBUG_DB_NAME, 3);  // Version auf 3 aktualisiert
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DEBUG_STORE_NAME)) {
                db.createObjectStore(DEBUG_STORE_NAME);
            }
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Erstellt eine Zusammenfassung des Systemstatus
 * @param {Object} status Das Status-Objekt
 * @returns {Object} Ein Objekt mit Zusammenfassung und Empfehlung
 */
function getSummaryStatus(status) {
    // Haben wir ein funktionierendes DirectoryHandle?
    const hasWorkingHandle = status.directoryHandleStatus.globalHandleExists && 
                             status.directoryHandleStatus.permission === 'granted';
    
    // Ist ein Handle in IndexedDB gespeichert?
    const hasStoredHandle = status.indexedDBStatus.hasStoredHandle;
    
    // Gibt es Flags in localStorage, die auf ein Handle hindeuten?
    const hasHandleFlags = status.localStorage.hasDirectoryHandle || 
                          status.localStorage.hasStoredDirectoryHandle;
    
    if (hasWorkingHandle) {
        return {
            text: 'Funktionsfähig ✓',
            recommendation: 'Das System funktioniert korrekt, keine Aktion erforderlich.'
        };
    } else if (hasStoredHandle && !hasWorkingHandle) {
        return {
            text: 'Wiederherstellbar ⚠️',
            recommendation: 'Ein Handle ist gespeichert, konnte aber nicht wiederhergestellt werden. ' +
                           'Führen Sie window.restoreDirectoryHandle() aus oder wählen Sie einen ' +
                           'Speicherort neu aus.'
        };
    } else if (hasHandleFlags && !hasStoredHandle) {
        return {
            text: 'Inkonsistent ⚠️',
            recommendation: 'Flags deuten auf ein Handle hin, aber keines ist gespeichert. ' +
                           'Setzen Sie einen neuen Speicherort mit window.openAndPersistDirectoryPicker().'
        };
    } else {
        return {
            text: 'Nicht konfiguriert ℹ️',
            recommendation: 'Kein Speicherort konfiguriert. Wählen Sie einen Speicherort mit ' +
                           'window.openAndPersistDirectoryPicker() aus.'
        };
    }
}

/**
 * Versucht, ein gespeichertes DirectoryHandle aus IndexedDB zu löschen
 * @returns {Promise<boolean>} True, wenn das Handle erfolgreich gelöscht wurde
 */
async function clearStoredDirectoryHandle() {
    const logFunc = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const errorFunc = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    try {
        logFunc('Versuche, gespeichertes DirectoryHandle zu löschen...');
        
        const db = await openDebugDatabase();
        const tx = db.transaction(DEBUG_STORE_NAME, 'readwrite');
        const store = tx.objectStore(DEBUG_STORE_NAME);
        
        // Aktuellen Benutzernamen ermitteln
        const username = localStorage.getItem('username') || 'default';
        const userHandleKey = `${DEBUG_HANDLE_KEY_PREFIX}${username}`;
        
        await new Promise((resolve, reject) => {
            // Zuerst den benutzerspezifischen Schlüssel löschen
            const userRequest = store.delete(userHandleKey);
            
            userRequest.onsuccess = () => {
                logFunc(`✓ Benutzerspezifisches DirectoryHandle (${userHandleKey}) gelöscht`);
                
                // Dann den alten Schlüssel löschen
                const oldRequest = store.delete(DEBUG_OLD_KEY_NAME);
                
                oldRequest.onsuccess = () => {
                    logFunc(`✓ Altes DirectoryHandle (${DEBUG_OLD_KEY_NAME}) gelöscht`);
                    resolve();
                };
                
                oldRequest.onerror = (event) => {
                    logFunc(`Altes DirectoryHandle nicht gefunden oder konnte nicht gelöscht werden: ${event.target.error.message}`);
                    resolve(); // Trotzdem fortfahren
                };
            };
            
            userRequest.onerror = (event) => {
                logFunc(`Benutzerspezifisches DirectoryHandle nicht gefunden oder konnte nicht gelöscht werden: ${event.target.error.message}`);
                
                // Versuchen, das alte zu löschen
                const oldRequest = store.delete(DEBUG_OLD_KEY_NAME);
                
                oldRequest.onsuccess = () => {
                    logFunc(`✓ Altes DirectoryHandle (${DEBUG_OLD_KEY_NAME}) gelöscht`);
                    resolve();
                };
                
                oldRequest.onerror = (event) => {
                    errorFunc(`Fehler beim Löschen des alten DirectoryHandle: ${event.target.error.message}`);
                    reject(event.target.error);
                };
            };
            
            tx.oncomplete = () => {
                db.close();
            };
        });
        
        // Benutzerspezifische Flags in localStorage zurücksetzen
        localStorage.removeItem(`hasDirectoryHandle_${username}`);
        localStorage.removeItem(`hasStoredDirectoryHandle_${username}`);
        localStorage.removeItem(`directoryHandleName_${username}`);
        localStorage.removeItem(`directoryHandleName_${username}`);
        
        // Für Abwärtskompatibilität auch die alten Flags zurücksetzen
        localStorage.removeItem('hasDirectoryHandle');
        localStorage.removeItem('hasStoredDirectoryHandle');
        localStorage.removeItem('directoryHandleName');
        
        logFunc('Flags in localStorage zurückgesetzt');
        
        return true;
    } catch (error) {
        errorFunc(`Fehler beim Löschen des gespeicherten DirectoryHandle: ${error.message}`);
        return false;
    }
}

/**
 * Zeigt die verfügbaren Debug-Kommandos an
 */
function showDebugCommands() {
    const logFunc = window.logger ? window.logger.info.bind(window.logger) : console.log;
    
    logFunc('🛠️ Verfügbare Debug-Kommandos:');
    logFunc('- debugPersistentStorage(): Führt eine vollständige Diagnose des Dateisystem-Zugriffs durch');
    logFunc('- clearStoredDirectoryHandle(): Löscht das gespeicherte DirectoryHandle (für einen Neustart)');
    logFunc('- window.openAndPersistDirectoryPicker(): Öffnet den Dateibrowser und speichert das ausgewählte Handle');
    logFunc('- window.restoreDirectoryHandle(): Versucht, ein gespeichertes DirectoryHandle wiederherzustellen');
    logFunc('- window.forceRestoreDirectoryHandle(): Erweiterte Wiederherstellung des gespeicherten DirectoryHandle');
    logFunc('- testFileAccess(): Testet den Dateisystem-Zugriff durch Schreiben einer Testdatei');
}

// Debug-Kommandos anzeigen
showDebugCommands();

/**
 * Manueller Test des Dateisystem-Zugriffs
 */
async function testFileAccess() {
    const logFunc = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const errorFunc = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    if (!window.directoryHandle) {
        errorFunc('Kein DirectoryHandle vorhanden. Bitte wählen Sie einen Speicherort aus.');
        return false;
    }
    
    try {
        logFunc('Teste Schreibzugriff auf das Dateisystem...');
        
        // Testdatei erstellen
        const fileHandle = await window.directoryHandle.getFileHandle('lernapp_debug_test.txt', { create: true });
        const writable = await fileHandle.createWritable();
        
        // Testdaten
        const testData = `LernApp Debug-Test: ${new Date().toISOString()}\n` +
                         `Zufallszahl: ${Math.random()}\n`;
        
        await writable.write(testData);
        await writable.close();
        
        logFunc(`✓ Testdatei erfolgreich geschrieben: lernapp_debug_test.txt`);
        logFunc(`Inhalt: ${testData}`);
        
        // Datei lesen
        const file = await fileHandle.getFile();
        const content = await file.text();
        
        logFunc(`✓ Testdatei erfolgreich gelesen: ${content.substring(0, 50)}...`);
        
        // Verfügbare Dateien auflisten
        logFunc('Dateien im Verzeichnis:');
        const entries = [];
        for await (const entry of window.directoryHandle.values()) {
            entries.push(`${entry.name} (${entry.kind})`);
            if (entries.length >= 5) break; // Maximal 5 Einträge
        }
        
        logFunc(`Gefundene Dateien (max. 5): ${entries.join(', ')}`);
        
        return true;
    } catch (error) {
        errorFunc(`Fehler beim Testen des Dateisystem-Zugriffs: ${error.message}`);
        return false;
    }
}

/**
 * Versucht mit zusätzlichen Methoden, ein gespeichertes DirectoryHandle aus IndexedDB wiederherzustellen
 * @returns {Promise<Object|null>} Das wiederhergestellte DirectoryHandle oder null
 */
async function forceRestoreDirectoryHandle() {
    const logFunc = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const warnFunc = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
    const errorFunc = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    logFunc('Versuche, DirectoryHandle wiederherzustellen (erweiterte Methode)...');
    
    // Zuerst über die normale Methode versuchen, falls sie existiert
    if (window.restoreDirectoryHandle) {
        try {
            logFunc('Versuche, DirectoryHandle über normale Methode wiederherzustellen...');
            const result = await window.restoreDirectoryHandle();
            if (result === true) {
                logFunc('✓ DirectoryHandle über normale Methode wiederhergestellt');
                return window.directoryHandle;
            } else if (window.directoryHandle) {
                logFunc('✓ DirectoryHandle nach Aufruf von restoreDirectoryHandle verfügbar');
                return window.directoryHandle;
            }
        } catch (error) {
            warnFunc(`Normale Wiederherstellungsmethode fehlgeschlagen: ${error.message}`);
        }
    }
    
    // Direkter Zugriff auf IndexedDB
    try {
        logFunc('Versuche, DirectoryHandle direkt aus IndexedDB zu laden...');
        
        const db = await openDebugDatabase();
        const tx = db.transaction(DEBUG_STORE_NAME, 'readonly');
        const store = tx.objectStore(DEBUG_STORE_NAME);
        
        const handle = await new Promise((resolve, reject) => {
            const request = store.get(DEBUG_KEY_NAME);
            
            request.onsuccess = () => {
                if (request.result) {
                    logFunc('✓ DirectoryHandle in IndexedDB gefunden');
                    resolve(request.result);
                } else {
                    warnFunc('✗ Kein DirectoryHandle in IndexedDB gefunden');
                    resolve(null);
                }
            };
            
            request.onerror = (event) => {
                errorFunc(`Fehler beim Laden des DirectoryHandle: ${event.target.error.message}`);
                reject(event.target.error);
            };
            
            tx.oncomplete = () => {
                db.close();
            };
        });
        
        if (handle) {
            // Versuchen, Berechtigung zu erhalten
            try {
                logFunc('Prüfe Berechtigung für wiederhergestellten Handle...');
                
                // Teste verschiedene Arten, die Berechtigungen zu prüfen und anzufordern
                let permission;
                
                // Zuerst die Standard-Methode
                try {
                    permission = await handle.requestPermission({ mode: 'readwrite' });
                    logFunc(`Berechtigungsstatus: ${permission}`);
                } catch (permError1) {
                    warnFunc(`Fehler bei Standard-Berechtigungsprüfung: ${permError1.message}`);
                    
                    // Fallback 1: Versuchen, queryPermission zu verwenden
                    try {
                        permission = await handle.queryPermission({ mode: 'readwrite' });
                        logFunc(`Berechtigung durch queryPermission: ${permission}`);
                        
                        // Wenn wir noch keine Berechtigung haben, versuchen wir es erneut anzufordern
                        if (permission !== 'granted') {
                            try {
                                permission = await handle.requestPermission({ mode: 'readwrite' });
                                logFunc(`Berechtigung nach queryPermission erneut angefordert: ${permission}`);
                            } catch (permError2) {
                                warnFunc(`Fehler bei erneuter Berechtigungsanfrage: ${permError2.message}`);
                            }
                        }
                    } catch (permError3) {
                        warnFunc(`Fehler bei queryPermission: ${permError3.message}`);
                    }
                }
                
                if (permission === 'granted') {
                    logFunc('✓ Berechtigung für wiederhergestellten Handle erhalten');
                    // Globales Handle aktualisieren
                    window.directoryHandle = handle;
                    
                    // Flags in localStorage aktualisieren
                    localStorage.setItem('hasDirectoryHandle', 'true');
                    localStorage.setItem('hasStoredDirectoryHandle', 'true');
                    
                    // Testen, ob der Zugriff tatsächlich funktioniert
                    try {
                        if (window.testFileAccess) {
                            const testResult = await window.testFileAccess();
                            logFunc(`Dateisystem-Zugriffstest: ${testResult ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
                        }
                    } catch (testError) {
                        warnFunc(`Warnung beim Testen des Dateisystemzugriffs: ${testError.message}`);
                    }
                    
                    return handle;
                } else {
                    warnFunc(`✗ Keine Berechtigung für wiederhergestellten Handle: ${permission}`);
                    
                    // Trotzdem das Handle zurückgeben, da der Benutzer später die Berechtigung erteilen kann
                    logFunc('Handle wird zurückgegeben, auch ohne Berechtigung');
                    window.directoryHandle = handle;
                    return handle;
                }
            } catch (permError) {
                errorFunc(`Fehler bei der Berechtigungsprüfung: ${permError.message}`);
                
                // Trotzdem das Handle zurückgeben, da wir es später noch einmal versuchen können
                logFunc('Handle wird trotz Fehler zurückgegeben');
                window.directoryHandle = handle;
                return handle;
            }
        }
        
        return null;
    } catch (error) {
        errorFunc(`Fehler beim direkten Laden des DirectoryHandle: ${error.message}`);
        return null;
    }
}

// Exportiere die Funktionen im globalen Namespace
window.debugPersistentStorage = debugPersistentStorage;
window.clearStoredDirectoryHandle = clearStoredDirectoryHandle;
window.showDebugCommands = showDebugCommands;
window.testFileAccess = testFileAccess;
window.forceRestoreDirectoryHandle = forceRestoreDirectoryHandle;

} // Ende des Guards gegen mehrfaches Laden
