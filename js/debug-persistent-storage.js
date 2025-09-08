/**
 * Debug-Hilfsprogramm für die persistente Dateisystem-Speicherung
 * Dieses Skript bietet erweiterte Debugging-Funktionen für die IndexedDB-Speicherung von DirectoryHandles
 */

// Konstanten für den Zugriff auf die IndexedDB-Datenbank
const DEBUG_DB_NAME = 'LernAppDirectoryHandles';
const DEBUG_STORE_NAME = 'lernapp-directory-handles';
const DEBUG_KEY_NAME = 'main-directory-handle';

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
                const request = store.get(DEBUG_KEY_NAME);
                
                await new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        status.indexedDBStatus.hasStoredHandle = !!request.result;
                        status.indexedDBStatus.handleName = request.result ? request.result.name : null;
                        status.indexedDBStatus.handleKind = request.result ? request.result.kind : null;
                        resolve();
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
                hasDirectoryHandle: localStorage.getItem('hasDirectoryHandle') === 'true',
                hasStoredDirectoryHandle: localStorage.getItem('hasStoredDirectoryHandle') === 'true'
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
        const request = indexedDB.open(DEBUG_DB_NAME, 1);
        
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
        
        await new Promise((resolve, reject) => {
            const request = store.delete(DEBUG_KEY_NAME);
            
            request.onsuccess = () => {
                logFunc('✓ Gespeichertes DirectoryHandle gelöscht');
                resolve();
            };
            
            request.onerror = (event) => {
                errorFunc(`Fehler beim Löschen des DirectoryHandle: ${event.target.error.message}`);
                reject(event.target.error);
            };
            
            tx.oncomplete = () => {
                db.close();
            };
        });
        
        // Flags in localStorage zurücksetzen
        localStorage.removeItem('hasDirectoryHandle');
        localStorage.removeItem('hasStoredDirectoryHandle');
        
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
            const handle = await window.restoreDirectoryHandle();
            if (handle) {
                logFunc('✓ DirectoryHandle über normale Methode wiederhergestellt');
                window.directoryHandle = handle;
                return handle;
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
                const permission = await handle.requestPermission({ mode: 'readwrite' });
                
                if (permission === 'granted') {
                    logFunc('✓ Berechtigung für wiederhergestellten Handle erhalten');
                    // Globales Handle aktualisieren
                    window.directoryHandle = handle;
                    
                    // Flags in localStorage aktualisieren
                    localStorage.setItem('hasDirectoryHandle', 'true');
                    localStorage.setItem('hasStoredDirectoryHandle', 'true');
                    
                    return handle;
                } else {
                    warnFunc(`✗ Keine Berechtigung für wiederhergestellten Handle: ${permission}`);
                    return null;
                }
            } catch (permError) {
                errorFunc(`Fehler bei der Berechtigungsprüfung: ${permError.message}`);
                return null;
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
