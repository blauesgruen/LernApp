// storage.js - Verwaltung des Datenbank-Speicherorts für die LernApp

/**
 * Verwaltet den Speicherort für die Daten der LernApp.
 * Unterstützt lokale Speicherung, Cloud-Speicherorte (z.B. Dropbox) und native Dateisystemzugriffe.
 */

// Standardpfad definieren, der konsistent im gesamten Code verwendet werden kann
if (typeof window.DEFAULT_STORAGE_PATH === 'undefined') {
    window.DEFAULT_STORAGE_PATH = 'LernAppDatenbank';
    console.log('DEFAULT_STORAGE_PATH global definiert als', window.DEFAULT_STORAGE_PATH);
} else {
    console.log('DEFAULT_STORAGE_PATH bereits global definiert als', window.DEFAULT_STORAGE_PATH);
}

// Standardpfad für lokale Verwendung
const DEFAULT_STORAGE_PATH = window.DEFAULT_STORAGE_PATH;

function getStoragePath(username) {
    const currentUser = username || localStorage.getItem('username');
    if (!currentUser) {
        return localStorage.getItem('storagePath') || window.DEFAULT_STORAGE_PATH;
    }
    return localStorage.getItem(`storagePath_${currentUser}`) || window.DEFAULT_STORAGE_PATH;
}

/**
 * Gibt einen benutzerfreundlichen Anzeigenamen für den Speicherort zurück
 * @param {string} [username] - Optional: Der Benutzername, für den der Pfad angezeigt werden soll
 * @returns {string} Ein benutzerfreundlicher Name des Speicherorts
 */
function getStorageDisplayName(username) {
    const path = getStoragePath(username);
    
    // Wenn der Pfad der Standardpfad ist, zeigen wir "Standard" an
    if (path === DEFAULT_STORAGE_PATH) {
        return "Standard";
    }
    
    // Versuchen, einen benutzerfreundlichen Namen zu erstellen
    if (typeof path === 'object') {
        // Wenn es ein Objekt ist, versuche sinnvolle Informationen zu extrahieren
        if (path.path) {
            return path.path;
        } else if (path.name) {
            return path.name;
        } else {
            return "Benutzerdefinierter Speicherort";
        }
    }
    
    // Pfadnamen aufbereiten (z.B. letzten Teil extrahieren)
    if (typeof path === 'string' && path.includes('/')) {
        const parts = path.split('/');
        return parts[parts.length - 1] || path;
    }
    
    return String(path);
}

/**
 * Erstellt ein simuliertes DirectoryHandle für den Standardspeicherort.
 * Dieses Handle unterstützt die grundlegenden Operationen, speichert aber alle Daten
 * im localStorage, anstatt im Dateisystem.
 * @returns {Object} Ein simuliertes DirectoryHandle
 */
function createVirtualDirectoryHandle() {
    log('Erstelle virtuelles DirectoryHandle für Standardspeicherort');
    
    // Basis-Schlüssel für localStorage
    const baseKey = `virtual_fs_${DEFAULT_STORAGE_PATH}`;
    
    // Simuliertes DirectoryHandle-Objekt
    const virtualHandle = {
        name: DEFAULT_STORAGE_PATH,
        kind: 'directory',
        
        // Simuliert das Holen eines FileHandle
        async getFileHandle(name, options = {}) {
            log(`Virtuelles getFileHandle: ${name}`, 'info');
            const fileKey = `${baseKey}/${name}`;
            
            // Wenn die Datei nicht existiert und create=false
            if (!localStorage.getItem(fileKey) && !options.create) {
                throw new Error(`Datei ${name} existiert nicht im virtuellen Dateisystem`);
            }
            
            // FileHandle zurückgeben
            return {
                name: name,
                kind: 'file',
                
                // Gibt einen Writable-Stream zurück
                async createWritable() {
                    let data = '';
                    
                    return {
                        // Schreiben in den Stream
                        async write(content) {
                            if (typeof content === 'string') {
                                data = content;
                            } else if (content instanceof Blob) {
                                data = await content.text();
                            } else {
                                data = String(content);
                            }
                        },
                        
                        // Stream schließen und Daten speichern
                        async close() {
                            localStorage.setItem(fileKey, data);
                            log(`Datei ${name} in virtuellem Dateisystem gespeichert`, 'info');
                            return true;
                        }
                    };
                },
                
                // Liest die Datei
                async getFile() {
                    const content = localStorage.getItem(fileKey) || '';
                    return new Blob([content], { type: 'application/json' });
                }
            };
        },
        
        // Simuliert eine Berechtigungsabfrage - immer erfolgreich
        async requestPermission() {
            return 'granted';
        }
    };
    
    return virtualHandle;
}

/**
 * Verwaltet den Speicherort für die Daten der LernApp.
 * Unterstützt lokale Speicherung, Cloud-Speicherorte (z.B. Dropbox) und native Dateisystemzugriffe.
 */

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
    } else if (type === 'error') {
        console.error(message, ...args);
    } else if (type === 'warn') {
        console.warn(message, ...args);
    } else {
        console.log(message, ...args);
    }
}

// Hilfsfunktionen für spezifische Log-Levels
function debug(message, ...args) {
    log(message, 'debug', ...args);
}

function warn(message, ...args) {
    log(message, 'warn', ...args);
}

// Variable für den aktuellen Handle zum Ordner (File System Access API)
let directoryHandle = null;

/**
 * Überprüft, ob die File System Access API im Browser verfügbar ist.
 * @returns {boolean} True, wenn die API verfügbar ist, sonst False.
 */
function isFileSystemAccessSupported() {
    return 'showDirectoryPicker' in window;
}

/**
 * Überprüft, ob ein Speicherort bereits konfiguriert wurde.
 * @param {string} [username] - Optional: Der Benutzername, für den der Speicherort überprüft werden soll.
 * @returns {boolean} True, wenn ein Speicherort konfiguriert wurde, sonst False.
 */
function isStoragePathConfigured(username) {
    const currentUser = username || localStorage.getItem('username');
    if (!currentUser) {
        return localStorage.getItem('storagePath') !== null;
    }
    return localStorage.getItem(`storagePath_${currentUser}`) !== null;
}

/**
 * Gibt den aktuell konfigurierten Speicherort zurück.
 * @param {string} [username] - Optional: Der Benutzername, für den der Speicherort zurückgegeben werden soll.
 * @returns {string} Der konfigurierte Speicherort oder der Standardpfad.
 */
function getStoragePath(username) {
    const currentUser = username || localStorage.getItem('username');
    if (!currentUser) {
        return localStorage.getItem('storagePath') || DEFAULT_STORAGE_PATH;
    }
    return localStorage.getItem(`storagePath_${currentUser}`) || DEFAULT_STORAGE_PATH;
}

/**
 * Öffnet den nativen Dateibrowser zur Auswahl eines Ordners.
 * @returns {Promise<Object>} Promise mit dem ausgewählten Verzeichnis-Handle oder null bei Abbruch.
 */
async function openDirectoryPicker() {
    try {
        // Wenn die verbesserte Version der Funktion existiert, verwenden wir diese
        if (window.openAndPersistDirectoryPicker) {
            return await window.openAndPersistDirectoryPicker();
        }
        
        if (!isFileSystemAccessSupported()) {
            showWarning('Dein Browser unterstützt die Dateiauswahl nicht. Verwende bitte Chrome, Edge oder einen anderen modernen Browser.');
            return null;
        }

        // Zeige den Ordnerauswahl-Dialog
        const handle = await window.showDirectoryPicker({
            id: 'lernAppData',
            mode: 'readwrite',
            startIn: 'documents'
        });

        // Speichere den Handle für späteren Zugriff
        directoryHandle = handle;
        
                // Wenn möglich, den Handle in IndexedDB speichern für Persistenz
                if (window.storeDirectoryHandle) {
                    try {
                        await window.storeDirectoryHandle(handle);
                        log('Verzeichnis-Handle wurde für spätere Verwendung gespeichert');
                    } catch (storeError) {
                        // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
                        console.log('Handle konnte nicht gespeichert werden:', storeError);
                        // Fortfahren, auch wenn das Speichern fehlgeschlagen ist
                    }
                }        // Pfad des ausgewählten Ordners (nur der Name ist verfügbar)
        const path = handle.name || 'LernAppDatenbank';
        
        log('Verzeichnis ausgewählt:', 'info', {
            name: handle.name,
            kind: handle.kind
        });
        
        // Teste den Schreibzugriff und erstelle sofort die Datenbankdateien
        try {
            const testResult = await saveTestFile(handle);
            log('Testdatei erfolgreich geschrieben:', 'info', testResult);
            
            // Datenbankdateien erstellen
            await createInitialDatabaseFiles(handle);
            log('Datenbankdateien wurden im ausgewählten Verzeichnis erstellt', 'info');
        } catch (testError) {
            log('Fehler beim Testen des Schreibzugriffs:', 'error', testError);
            // Wir melden den Fehler, geben aber trotzdem das Handle zurück
            showWarning('Der Schreibzugriff auf den ausgewählten Ordner konnte nicht verifiziert werden.');
        }
        
        return {
            handle,
            path
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            log('Benutzer hat den Ordnerauswahl-Dialog abgebrochen.');
            return null;
        }
        log('Fehler beim Öffnen des Ordnerauswahl-Dialogs:', 'error', error);
        showError(`Fehler bei der Ordnerauswahl: ${error.message}`);
        return null;
    }
}

/**
 * Versucht, auf den konfigurierten Ordner zuzugreifen, ohne einen Dialog anzuzeigen.
 * @param {string} [username] - Optional: Der Benutzername, für den der Verzeichnis-Handle geöffnet werden soll.
 * @returns {Promise<Object|null>} Promise mit dem Verzeichnis-Handle oder null bei Fehler.
 */
async function getDirectoryHandle(username) {
    // Wenn wir einen Handle haben, einfach zurückgeben
    if (directoryHandle) {
        return directoryHandle;
    }
    
            // Versuchen, ein gespeichertes Handle aus der IndexedDB zu laden, falls die Funktion existiert
            if (window.loadDirectoryHandle) {
                try {
                    const savedHandle = await window.loadDirectoryHandle();
                    if (savedHandle) {
                        // Prüfen, ob wir Berechtigung haben
                        if (window.verifyPermission) {
                            const permission = await window.verifyPermission(savedHandle);
                            if (permission === 'granted') {
                                // Handle global setzen
                                directoryHandle = savedHandle;
                                log('Gespeichertes Verzeichnis-Handle wiederhergestellt');
                                return directoryHandle;
                            }
                        }
                    }
                } catch (error) {
                    // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
                    console.log('Fehler beim Laden des gespeicherten Handles:', error);
                }
            }    // Kein Handle vorhanden - das ist normal und kein Fehler
    return null;
}

/**
 * Versucht, den DirectoryHandle zu reparieren und automatisch wiederherzustellen.
 * Diese Funktion ist eine Brücke zu der autoRepairDirectoryHandle-Funktion in storage-fix.js
 * @returns {Promise<boolean>} True wenn die Reparatur erfolgreich war, andernfalls false
 */
async function repairDirectoryHandle() {
    try {
        // Prüfen, ob die Funktion direkt global verfügbar ist
        if (typeof window.autoRepairDirectoryHandle === 'function') {
            debug('Verwende global verfügbare autoRepairDirectoryHandle-Funktion');
            return await window.autoRepairDirectoryHandle();
        } else {
            warn('autoRepairDirectoryHandle-Funktion ist nicht global verfügbar');
            return false;
        }
    } catch (err) {
        // Logger-Funktionen verwenden oder als Fallback console.error
        if (window.logger && typeof window.logger.error === 'function') {
            window.logger.error('Fehler beim Versuch, DirectoryHandle zu reparieren:', err);
        } else {
            console.error('Fehler beim Versuch, DirectoryHandle zu reparieren:', err);
        }
        return false;
    }
}

/**
 * Setzt einen neuen Speicherort.
 * @param {string|Object} path - Der neue Speicherort oder ein Objekt mit Pfad und Handle.
 * @param {string} [username] - Optional: Der Benutzername, für den der Speicherort gesetzt werden soll.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Setzen erfolgreich war.
 */
async function setStoragePath(path, username) {
    try {
        let pathString, handle;
        
        // Sicherheitscheck: Ist path undefined oder null?
        if (path === undefined || path === null) {
            throw new Error('Kein Speicherort angegeben');
        }
        
        // Debug-Ausgabe für den Eingabewert
        log('Setze Speicherort mit Wert:', 'info', typeof path === 'object' ? 
            `Objekt mit Eigenschaften: ${Object.keys(path).join(', ')}` : 
            `String: ${path}`);
        
        // Prüfen, ob es sich um ein Objekt mit Handle handelt
        if (typeof path === 'object' && path !== null) {
            // Wenn das gesamte path-Objekt selbst ein DirectoryHandle ist
            if (path.kind === 'directory' && path.name) {
                pathString = path.name;
                handle = path;
                log('DirectoryHandle direkt übergeben, verwende Namen:', 'info', pathString);
            }
            // Explizit den Pfad als String extrahieren
            else if (path.path) {
                if (typeof path.path === 'object' && path.path !== null && path.path.name) {
                    // Wenn path.path ein Objekt ist (statt eines Strings), nehmen wir .name
                    pathString = path.path.name;
                    log('Verwende Objektname als Pfad:', 'info', pathString);
                } else if (typeof path.path === 'string') {
                    // Wenn path.path ein String ist, nehmen wir ihn direkt
                    pathString = path.path;
                    log('Verwende Pfadeigenschaft (String):', 'info', pathString);
                }
            } else if (path.name && typeof path.name === 'string') {
                // Wenn path.name vorhanden ist, nehmen wir das
                pathString = path.name;
                log('Verwende Name-Eigenschaft:', 'info', pathString);
            } else if (path.toString && typeof path.toString === 'function' && path.toString() !== '[object Object]') {
                // Wenn toString sinnvolle Ergebnisse liefert
                pathString = path.toString();
                log('Verwende toString() als Pfad:', 'info', pathString);
            } else {
                // Fallback: Einfach einen Standardnamen verwenden
                pathString = 'LernAppDatenbank';
                log('Kein gültiger Pfadname gefunden, verwende Standard:', 'warn', pathString);
            }
            
            // Handle extrahieren, falls noch nicht geschehen
            if (!handle && path.handle) {
                handle = path.handle;
            }
        } else if (typeof path === 'string') {
            // Wenn path ein einfacher String ist
            pathString = path;
        } else {
            // Ungültiger Eingabetyp
            log('Ungültiger Eingabetyp für Pfad:', 'error', typeof path);
            throw new Error('Ungültiger Eingabetyp für Pfad: ' + typeof path);
        }

        if (!pathString || pathString.trim() === '') {
            throw new Error('Kein gültiger Pfad angegeben');
        }
        
        // Stellen Sie sicher, dass pathString wirklich ein String ist
        pathString = String(pathString);
        
        // Validiere das Handle - ist es ein gültiges DirectoryHandle-Objekt?
        if (handle && typeof handle === 'object' && typeof handle.getFileHandle === 'function') {
            // Handle für späteren Zugriff speichern
            directoryHandle = handle;
            
            // Prüfen, ob wir auf das Verzeichnis schreiben können
            try {
                // Versuchen, eine Testdatei zu schreiben, um zu prüfen, ob wir Schreibrechte haben
                const testResult = await saveTestFile(handle);
                log('Testdatei erfolgreich geschrieben:', 'info', testResult);
                
                // Kennzeichnen, dass wir ein Handle haben und erwarten
                localStorage.setItem('hasDirectoryHandle', 'true');
                
                // Speichern des Handle in der IndexedDB, falls die Funktion verfügbar ist
                if (window.storeDirectoryHandle) {
                    try {
                        await window.storeDirectoryHandle(handle);
                        console.log(`DirectoryHandle für ${handle.name || 'Ausgewählter Ordner'} wurde gespeichert`);
                    } catch (storeError) {
                        // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
                        console.log('Handle konnte nicht in IndexedDB gespeichert werden:', storeError);
                    }
                }
                
                // Datenbankdateien initialisieren oder vorhandene verwenden
                await createInitialDatabaseFiles(handle);
                
                // Debug-Nachricht anzeigen - Wir vermeiden "erstellt", da Dateien auch nur geprüft werden könnten
                log('Datenbankdateien wurden im Verzeichnis überprüft/initialisiert:', 'info', pathString);
            } catch (error) {
                log('Fehler beim Schreiben der Testdatei:', 'error', error);
                showWarning('Der ausgewählte Ordner ist nicht beschreibbar. Bitte wählen Sie einen anderen Ordner aus.');
                return false;
            }
        } else {
            // Ungültiges Handle - wir setzen nur den Pfad ohne Handle
            // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
            console.log('Kein gültiges Directory Handle, verwende nur den Pfadnamen');
            localStorage.removeItem('hasDirectoryHandle');
            
            // Hinweis an den Benutzer, warum keine Dateien im Dateisystem erstellt werden können
            // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
            console.log('Hinweis: Ohne gültiges DirectoryHandle können keine Dateien im Dateisystem erstellt werden. ' +
                'Die Daten werden im Browser-Speicher gespeichert.');
            
            // Verzögere die Benachrichtigung, um Rekursionen zu vermeiden
            setTimeout(() => {
                if (window.showWarning) {
                    window.showWarning('Daten werden im Browser-Speicher gespeichert. Um Dateien direkt im Dateisystem zu speichern, ' +
                                      'bitte einen unterstützten Browser wie Chrome oder Edge verwenden.');
                }
            }, 100);
        }
        
        // Speicherpfad für den aktuellen oder angegebenen Benutzer setzen
        const currentUser = username || localStorage.getItem('username');
        if (currentUser) {
            localStorage.setItem(`storagePath_${currentUser}`, pathString);
            // Überprüfen, ob der Pfad erfolgreich gespeichert wurde
            if (localStorage.getItem(`storagePath_${currentUser}`) === pathString) {
                // Verzögere die Benachrichtigung, um Rekursionen zu vermeiden
                setTimeout(() => {
                    if (window.showSuccess) {
                        window.showSuccess(`Speicherort für Benutzer "${currentUser}" wurde auf "${pathString}" gesetzt.`);
                    }
                }, 100);
                
                // Speichere eine Referenz auf die aktuellen Daten für andere Funktionen
                window.storagePathData = {
                    path: pathString,
                    handle: handle
                };
                
                return true;
            }
        } else {
            // Fallback für nicht eingeloggte Benutzer oder alte Implementierung
            localStorage.setItem('storagePath', pathString);
            // Überprüfen, ob der Pfad erfolgreich gespeichert wurde
            if (localStorage.getItem('storagePath') === pathString) {
                // Verzögere die Benachrichtigung, um Rekursionen zu vermeiden
                setTimeout(() => {
                    if (window.showSuccess) {
                        window.showSuccess(`Speicherort wurde auf "${pathString}" gesetzt.`);
                    }
                }, 100);
                
                // Speichere eine Referenz auf die aktuellen Daten für andere Funktionen
                window.storagePathData = {
                    path: pathString,
                    handle: handle
                };
                
                return true;
            }
        }
        
        throw new Error('Fehler beim Speichern des Pfads');
    } catch (error) {
        showError(`Fehler beim Setzen des Speicherorts: ${error.message}`);
        log('Fehler beim Setzen des Speicherorts:', 'error', error);
        return false;
    }
}

/**
 * Setzt den Speicherort auf den Standardpfad zurück.
 * @param {string} [username] - Optional: Der Benutzername, für den der Speicherort zurückgesetzt werden soll.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Zurücksetzen erfolgreich war.
 */
/**
 * Versucht, ein DirectoryHandle für den Standardspeicherort zu erstellen,
 * wenn File System Access API verfügbar ist.
 * @returns {Promise<FileSystemDirectoryHandle|null>} Das erstellte DirectoryHandle oder null bei Fehler.
 */
async function createDefaultDirectoryHandle() {
    log('Versuche, ein DirectoryHandle für den Standardspeicherort zu erstellen');
    
    try {
        // Prüfen, ob die File System Access API verfügbar ist
        if (window.showDirectoryPicker) {
            // Benutzer nach Ordnerauswahl fragen
            log('File System Access API verfügbar, fordere Benutzer zur Ordnerauswahl auf');
            
            // Informationsbenachrichtigung vor dem Dialog anzeigen
            if (window.showInfo) {
                window.showInfo('Bitte wählen Sie einen Ordner für Ihre LernApp-Daten aus.');
            }
            
            // Dialog öffnen
            const handle = await window.showDirectoryPicker({
                id: 'defaultLernAppStorage',
                startIn: 'documents',
                mode: 'readwrite',
                suggestedName: DEFAULT_STORAGE_PATH
            });
            
            if (handle) {
                log('Benutzer hat erfolgreich einen Ordner ausgewählt:', 'info', handle.name);
                
                // Handle global und lokal speichern
                directoryHandle = handle;
                window.directoryHandle = handle;
                
                // Flag setzen
                localStorage.setItem('hasDirectoryHandle', 'true');
                
                // Handle in IndexedDB speichern
                if (window.storeDirectoryHandle) {
                    try {
                        await window.storeDirectoryHandle(handle);
                        log('DirectoryHandle erfolgreich in IndexedDB gespeichert');
                    } catch (error) {
                        log('Fehler beim Speichern des DirectoryHandle in IndexedDB:', 'error', error);
                    }
                }
                
                return handle;
            }
        } else {
            log('File System Access API nicht verfügbar, kann kein DirectoryHandle erstellen', 'warn');
        }
    } catch (error) {
        log('Fehler beim Erstellen des DirectoryHandle für den Standardspeicherort:', 'error', error);
    }
    
    return null;
}

/**
 * Erstellt einen vollständigen Pfad für eine bestimmte Datei oder Ressource.
 * @param {string} resourceName - Der Name der Ressource (z.B. 'questions.json').
 * @param {string} [username] - Optional: Der Benutzername, für den der Ressourcenpfad erstellt werden soll.
 * @returns {string} Der vollständige Pfad zur Ressource.
 */
function getResourcePath(resourceName, username) {
    const basePath = getStoragePath(username);
    return `${basePath}/${resourceName}`;
}

/**
 * Prüft, ob der aktuell konfigurierte Speicherort der Standardpfad ist.
 * @param {string} [username] - Optional: Der Benutzername, für den geprüft werden soll.
 * @returns {boolean} True, wenn der Standardpfad konfiguriert ist, sonst False.
 */
function isDefaultPath(username) {
    const path = getStoragePath(username);
    return path === DEFAULT_STORAGE_PATH;
}

/**
 * Prüft, ob der konfigurierte Speicherort existiert und zugänglich ist.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn der Speicherort zugänglich ist, sonst False.
 */
async function verifyStoragePath() {
    const path = getStoragePath();
    
    try {
        // Prüfen, ob wir einen DirectoryHandle haben
        if (directoryHandle) {
            try {
                // Versuchen, die Berechtigung zu bestätigen
                const opts = { mode: 'readwrite' };
                const permission = await directoryHandle.requestPermission(opts);
                return permission === 'granted';
            } catch (error) {
                log('Fehler beim Überprüfen des DirectoryHandle:', 'warn', error);
                // Fallback auf localStorage
                directoryHandle = null;
                localStorage.removeItem('hasDirectoryHandle');
            }
        }
        
        // Fallback: In einer reinen Browser-Umgebung simulieren wir eine Überprüfung
        const testKey = `${path}/test`;
        localStorage.setItem(testKey, 'test');
        const result = localStorage.getItem(testKey) === 'test';
        localStorage.removeItem(testKey);
        
        return result;
    } catch (error) {
        showError(`Fehler beim Überprüfen des Speicherorts: ${error.message}`);
        log('Fehler beim Überprüfen des Speicherorts:', 'error', error);
        return false;
    }
}

/**
 * Speichert Daten unter dem angegebenen Ressourcennamen im konfigurierten Speicherort.
 * @param {string} resourceName - Der Name der Ressource (z.B. 'questions.json').
 * @param {Object|Array} data - Die zu speichernden Daten.
 * @param {string} [username] - Optional: Der Benutzername, für den die Daten gespeichert werden sollen.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Speichern erfolgreich war.
 */
async function saveData(resourceName, data, username) {
    try {
        if (!resourceName) {
            throw new Error('Kein Ressourcenname angegeben');
        }
        
        const jsonData = JSON.stringify(data);
        let fileSystemSuccess = false;
        let localStorageSuccess = false;
        
        // Wenn das direkte DirectoryHandle nicht verfügbar ist, versuche das globale Handle zu nutzen
        if (!directoryHandle && window.directoryHandle) {
            console.log('Lokales DirectoryHandle nicht verfügbar, verwende globales Handle');
            directoryHandle = window.directoryHandle;
        }
        
        // 1. Erst im lokalen Speicher sichern (Backupprinzip - immer zuerst ausführen)
        try {
            // Überprüfen, ob die Daten das Quota überschreiten könnten
            const dataSize = new Blob([jsonData]).size;
            // Typische localStorage-Quota liegt bei 5-10MB, wir verwenden 4MB als sicheren Wert
            const estimatedAvailableSpace = 4 * 1024 * 1024; 
            
            if (dataSize > estimatedAvailableSpace) {
                console.log(`Warnung: Daten sind sehr groß (${(dataSize/1024/1024).toFixed(2)}MB), könnte Quota überschreiten`);
                
                // Versuch, die Daten zu komprimieren
                if (window.compressData) {
                    try {
                        const compressedData = await window.compressData(jsonData);
                        localStorage.setItem(getResourcePath(resourceName, username), compressedData);
                        log(`Datei ${resourceName} komprimiert im localStorage gespeichert (Backup)`, 'info');
                        localStorageSuccess = true;
                    } catch (compressErr) {
                        console.log(`Komprimierung fehlgeschlagen: ${compressErr.message}`);
                    }
                }
                
                // Alternativ: Speichere im IndexedDB als Fallback für große Daten
                if (!localStorageSuccess && window.saveToIndexedDB) {
                    try {
                        await window.saveToIndexedDB(resourceName, jsonData, username);
                        // Speichere einen Hinweis im localStorage, dass die Daten in IndexedDB sind
                        localStorage.setItem(getResourcePath(resourceName, username), `indexeddb:${Date.now()}`);
                        log(`Datei ${resourceName} in IndexedDB gespeichert (Backup)`, 'info');
                        localStorageSuccess = true;
                    } catch (idbErr) {
                        console.log(`IndexedDB-Speicherung fehlgeschlagen: ${idbErr.message}`);
                    }
                }
            } else {
                // Normaler Speichervorgang für kleinere Daten
                localStorage.setItem(getResourcePath(resourceName, username), jsonData);
                log(`Datei ${resourceName} im localStorage gespeichert (Backup)`, 'info');
                localStorageSuccess = true;
            }
            
            if (localStorageSuccess) {
                showNotification('Datei ' + resourceName + ' im Browser-Speicher gespeichert', 'success');
            } else {
                showNotification('Fehler beim Speichern im Browser-Speicher', 'error');
            }
        } catch (localErr) {
            log(`Fehler beim Speichern im lokalen Speicher: ${localErr.message}`, 'error');
            showNotification('Fehler beim Speichern im Browser-Speicher: ' + localErr.message, 'error');
        }
        
        // 2. Versuch: Im Dateisystem speichern (wenn verfügbar)
        // Automatische Reparatur versuchen, wenn kein direktes Handle verfügbar ist
        let reparaturVersucht = false;
        
        if (!directoryHandle) {
            log('Kein DirectoryHandle verfügbar, versuche automatische Reparatur vor dem Speichern...', 'info');
            const repaired = await repairDirectoryHandle();
            reparaturVersucht = true;
            
            if (repaired) {
                log('DirectoryHandle erfolgreich vor Speicherung repariert', 'info');
                // Aktualisiere die lokale Variable mit dem globalen Handle
                if (window.directoryHandle) {
                    directoryHandle = window.directoryHandle;
                    log('Lokales DirectoryHandle aktualisiert nach Reparatur', 'info');
                }
            } else {
                log('Vorab-Reparatur des DirectoryHandle fehlgeschlagen', 'warn');
            }
        }
        
        // Versuche nun im Dateisystem zu speichern, wenn ein Handle verfügbar ist
        if (directoryHandle) {
            try {
                // Debug-Information vor der Speicherung
                log(`Versuche ${resourceName} im Dateisystem zu speichern: ${new Date().toLocaleTimeString()}`);
                log(`DirectoryHandle: ${directoryHandle ? 'Verfügbar' : 'Nicht verfügbar'}`);
                if (directoryHandle) {
                    log(`DirectoryHandle-Name: ${directoryHandle.name}`);
                }
                
                // Datei erstellen/öffnen - der Browser kümmert sich selbst um die Berechtigungsanfrage
                const fileHandle = await directoryHandle.getFileHandle(resourceName, { create: true });
                log(`FileHandle für ${resourceName} erfolgreich erhalten`);
                
                const writable = await fileHandle.createWritable();
                log(`Writable für ${resourceName} erfolgreich erhalten`);
                
                // Debug-Information zur Speicherung
                log(`Speichere ${resourceName} im Dateisystem: ${new Date().toLocaleTimeString()}`);
                log(`Pfad: ${directoryHandle.name}/${resourceName}`);
                log(`Datengröße: ${jsonData.length} Bytes`);
                
                await writable.write(jsonData);
                await writable.close();
                
                // Meldung nach erfolgreichem Speichern
                log(`✓ Dateisystem-Speicherung erfolgreich: ${new Date().toLocaleTimeString()}`);
                log(`Datei ${resourceName} erfolgreich im Dateisystem gespeichert`);
                fileSystemSuccess = true;
            } catch (err) {
                log(`✗ Fehler beim Speichern im Dateisystem: ${err.message}`, 'error');
                log(`Fehler beim Speichern von ${resourceName} im Dateisystem:`, 'error', err);
                console.error('Vollständiger Fehler beim Dateisystem-Zugriff:', err);
                
                // Nur wenn noch nicht versucht wurde zu reparieren, jetzt versuchen
                if (!reparaturVersucht) {
                    // Versuchen wir, das DirectoryHandle zu reparieren
                    log('Versuche, das DirectoryHandle zu reparieren...', 'info');
                    const repaired = await repairDirectoryHandle();
                    
                    if (repaired) {
                        log('DirectoryHandle erfolgreich repariert, versuche erneut zu speichern...', 'info');
                        
                        try {
                            // Neuer Versuch nach erfolgreicher Reparatur
                            const fileHandle = await directoryHandle.getFileHandle(resourceName, { create: true });
                            const writable = await fileHandle.createWritable();
                            
                            await writable.write(jsonData);
                            await writable.close();
                            
                            log(`✓ Dateisystem-Speicherung nach Reparatur erfolgreich: ${new Date().toLocaleTimeString()}`);
                            fileSystemSuccess = true;
                        } catch (retryErr) {
                            log(`✗ Fehler beim erneuten Speichern nach Reparatur: ${retryErr.message}`, 'error');
                        }
                    } else {
                        log('DirectoryHandle-Reparatur fehlgeschlagen', 'warn');
                    }
                } else {
                    log('Keine weitere Reparatur versucht, da bereits eine Reparatur durchgeführt wurde', 'info');
                }
            }
        }
        
        // Abschließende Erfolgsmeldung und Warnung, falls Dateisystem-Speicherung fehlschlug
        if (!fileSystemSuccess) {
            log('Warnung: Speicherung im Dateisystem fehlgeschlagen', 'warn');
            showNotification('Warnung: Speicherung im Dateisystem fehlgeschlagen', 'warning');
        } else {
            log('Speicherung im Dateisystem erfolgreich', 'info');
        }
        
        // Zeige Erfolgs- oder Fehlermeldung basierend auf den Ergebnissen
        if (fileSystemSuccess && localStorageSuccess) {
            showSuccess(`Datei ${resourceName} wurde erfolgreich gespeichert und gesichert`);
            return true;
        } else if (fileSystemSuccess) {
            showSuccess(`Datei ${resourceName} im Dateisystem gespeichert`);
            log(`Warnung: Backup konnte nicht erstellt werden`, 'warn');
            return true;
        } else if (localStorageSuccess) {
            showSuccess(`Datei ${resourceName} im Browser-Speicher gespeichert`);
            log(`Warnung: Speicherung im Dateisystem fehlgeschlagen`, 'warn');
            return true;
        } else {
            // Beide Speicherversuche sind fehlgeschlagen
            if (window.showError) {
                window.showError(`Fehler beim Speichern von ${resourceName}. Keine Speichermethode verfügbar.`);
            }
            return false;
        }
    } catch (err) {
        log(`Fehler beim Speichern von ${resourceName}:`, 'error', err);
        if (window.showError) {
            window.showError(`Fehler beim Speichern der Daten: ${err.message}`);
        }
        return false;
    }
}

/**
 * Lädt Daten mit dem angegebenen Ressourcennamen aus dem konfigurierten Speicherort.
 * @param {string} resourceName - Der Name der Ressource (z.B. 'questions.json').
 * @param {Object|Array} defaultValue - Standardwert, falls keine Daten gefunden wurden.
 * @param {string} [username] - Optional: Der Benutzername, für den die Daten geladen werden sollen.
 * @returns {Promise<Object|Array>} Promise, das zu den geladenen Daten aufgelöst wird.
 */
async function loadData(resourceName, defaultValue = null, username) {
    try {
        if (!resourceName) {
            throw new Error('Kein Ressourcenname angegeben');
        }
        
        let fileSystemData = null;
        let localStorageData = null;
        let dataSource = null;
        
        // Wenn das direkte DirectoryHandle nicht verfügbar ist, versuche das globale Handle zu nutzen
        if (!directoryHandle && window.directoryHandle) {
            console.log('Lokales DirectoryHandle nicht verfügbar, verwende globales Handle');
            directoryHandle = window.directoryHandle;
        }
        
        // 1. Versuch: Aus dem Dateisystem laden (wenn verfügbar)
        if (directoryHandle) {
            try {
                // Versuchen, die Datei zu öffnen - der Browser kümmert sich selbst um die Berechtigungsanfrage
                const fileHandle = await directoryHandle.getFileHandle(resourceName);
                const file = await fileHandle.getFile();
                const text = await file.text();
                
                fileSystemData = JSON.parse(text);
                log(`Datei ${resourceName} erfolgreich aus dem Dateisystem geladen`, 'info');
                dataSource = 'filesystem';
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    log(`Datei ${resourceName} nicht im Dateisystem gefunden, versuche Browser-Speicher...`, 'info');
                } else {
                    log(`Fehler beim Laden aus dem Dateisystem: ${error.message}`, 'warn');
                }
            }
        }
        
        // 2. Versuch: Aus dem Browser-Speicher laden (als Backup oder primär, wenn kein Dateisystem)
        try {
            const jsonData = localStorage.getItem(getResourcePath(resourceName, username));
            
            if (jsonData !== null) {
                // Prüfen, ob die Daten komprimiert sind
                if (window.decompressData && jsonData.startsWith('compressedData:')) {
                    try {
                        const compressedData = jsonData.substring(15); // "compressedData:".length = 15
                        const decompressedData = await window.decompressData(compressedData);
                        localStorageData = JSON.parse(decompressedData);
                        log(`Datei ${resourceName} (komprimiert) aus dem Browser-Speicher geladen`, 'info');
                        if (!dataSource) dataSource = 'localstorage-compressed';
                    } catch (decompressError) {
                        log(`Fehler beim Dekomprimieren: ${decompressError.message}`, 'warn');
                        // Fallback: Versuche, es als normalen JSON zu parsen
                        localStorageData = JSON.parse(jsonData);
                        if (!dataSource) dataSource = 'localstorage';
                    }
                }
                // Prüfen, ob die Daten in IndexedDB gespeichert sind
                else if (jsonData.startsWith('indexeddb:')) {
                    log(`Hinweis gefunden: Daten für ${resourceName} sind in IndexedDB gespeichert`, 'info');
                    if (window.loadFromIndexedDB) {
                        try {
                            const idbData = await window.loadFromIndexedDB(resourceName, username);
                            if (idbData !== null) {
                                localStorageData = JSON.parse(idbData);
                                log(`Daten für ${resourceName} erfolgreich aus IndexedDB geladen`, 'info');
                                if (!dataSource) dataSource = 'indexeddb';
                            }
                        } catch (idbError) {
                            log(`Fehler beim Laden aus IndexedDB: ${idbError.message}`, 'warn');
                        }
                    }
                }
                // Normale JSON-Daten
                else {
                    localStorageData = JSON.parse(jsonData);
                    log(`Datei ${resourceName} aus dem Browser-Speicher geladen`, 'info');
                    if (!dataSource) dataSource = 'localstorage';
                }
            }
            // Wenn nichts im localStorage gefunden wurde, versuche es mit IndexedDB
            else if (window.loadFromIndexedDB) {
                try {
                    log(`Versuche, ${resourceName} aus IndexedDB zu laden...`, 'info');
                    const idbData = await window.loadFromIndexedDB(resourceName, username);
                    if (idbData !== null) {
                        localStorageData = JSON.parse(idbData);
                        log(`Daten für ${resourceName} aus IndexedDB geladen`, 'info');
                        if (!dataSource) dataSource = 'indexeddb';
                    }
                } catch (idbError) {
                    log(`Fehler beim Laden aus IndexedDB: ${idbError.message}`, 'warn');
                }
            }
        } catch (error) {
            log(`Fehler beim Laden aus dem Browser-Speicher: ${error.message}`, 'warn');
        }
        
        // Entscheiden, welche Daten zurückgegeben werden sollen
        // Priorität: 1. Dateisystem, 2. Browser-Speicher, 3. Standardwert
        if (fileSystemData !== null) {
            log(`Verwende Daten aus dem Dateisystem für ${resourceName}`, 'info');
            
            // Wenn wir auch Daten aus dem Browser-Speicher haben, prüfen wir auf Unterschiede
            if (localStorageData !== null) {
                try {
                    // Tiefe Gleichheitsprüfung für Objekte
                    const isEqual = JSON.stringify(fileSystemData) === JSON.stringify(localStorageData);
                    if (!isEqual) {
                        log(`Unterschiede zwischen Dateisystem- und Browser-Daten für ${resourceName} gefunden`, 'warn');
                        
                        // Automatisches Backup der Browser-Version erstellen
                        try {
                            if (window.backupManager) {
                                // Neue Backup-Manager-Methode verwenden
                                await window.backupManager.createFileBackup(directoryHandle, resourceName, localStorageData);
                            } else {
                                // Fallback: Direktes Speichern im Hauptverzeichnis
                                const timestamp = new Date().toISOString().replace(/:/g, '-');
                                const backupName = `${resourceName}.backup.${timestamp}.json`;
                                
                                const backupHandle = await directoryHandle.getFileHandle(backupName, { create: true });
                                const writable = await backupHandle.createWritable();
                                await writable.write(JSON.stringify(localStorageData));
                                await writable.close();
                                log(`Backup der Browser-Version als ${backupName} erstellt`, 'info');
                            }
                            
                            // Synchronisiere die Browser-Version mit dem Dateisystem
                            try {
                                localStorage.setItem(getResourcePath(resourceName, username), JSON.stringify(fileSystemData));
                                log(`Browser-Daten für ${resourceName} mit Dateisystem synchronisiert`, 'info');
                            } catch (syncError) {
                                log(`Fehler bei der Synchronisierung mit dem Browser-Speicher: ${syncError.message}`, 'warn');
                            }
                        } catch (backupError) {
                            log(`Fehler beim Erstellen des Backups: ${backupError.message}`, 'warn');
                        }
                    }
                } catch (compareError) {
                    log(`Fehler beim Vergleichen der Daten: ${compareError.message}`, 'warn');
                }
            }
            
            return fileSystemData;
        } else if (localStorageData !== null) {
            log(`Verwende Daten aus dem Browser-Speicher für ${resourceName}`, 'info');
            
            // Wenn wir ein DirectoryHandle haben, aber keine Dateisystem-Daten, synchronisiere sie
            if (directoryHandle) {
                try {
                    log(`Synchronisiere Browser-Daten für ${resourceName} mit dem Dateisystem...`, 'info');
                    
                    // Speichere die Daten im Dateisystem
                    const fileHandle = await directoryHandle.getFileHandle(resourceName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(localStorageData));
                    await writable.close();
                    
                    log(`Daten für ${resourceName} erfolgreich mit dem Dateisystem synchronisiert`, 'info');
                } catch (syncError) {
                    log(`Fehler bei der Synchronisierung mit dem Dateisystem: ${syncError.message}`, 'warn');
                }
            }
            
            return localStorageData;
        } else {
            // Wenn keine Daten gefunden wurden, Standardwert zurückgeben
            log(`Keine Daten für ${resourceName} gefunden, verwende Standardwert`, 'info');
            return defaultValue;
        }
    } catch (error) {
        log(`Fehler beim Laden von ${resourceName}: ${error.message}`, 'error');
        return defaultValue;
    }
}

/**
 * Löscht Daten mit dem angegebenen Ressourcennamen aus dem konfigurierten Speicherort.
 * @param {string} resourceName - Der Name der Ressource (z.B. 'questions.json').
 * @param {string} [username] - Optional: Der Benutzername, für den die Daten gelöscht werden sollen.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Löschen erfolgreich war.
 */
async function deleteData(resourceName, username) {
    try {
        if (!resourceName) {
            throw new Error('Kein Ressourcenname angegeben');
        }
        
        let fileSystemSuccess = true;
        let localStorageSuccess = true;
        
        // Wenn das direkte DirectoryHandle nicht verfügbar ist, versuche das globale Handle zu nutzen
        if (!directoryHandle && window.directoryHandle) {
            console.log('Lokales DirectoryHandle nicht verfügbar, verwende globales Handle');
            directoryHandle = window.directoryHandle;
        }
        
        // 1. Aus dem Dateisystem löschen (wenn verfügbar)
        if (directoryHandle) {
            try {
                // Berechtigung prüfen/erneuern
                const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') {
                    throw new Error('Keine Schreibberechtigung für das Verzeichnis');
                }
                
                // Bevor wir löschen, erstellen wir ein Backup
                try {
                    const fileHandle = await directoryHandle.getFileHandle(resourceName);
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    
                    if (window.backupManager) {
                        // Neue Backup-Manager-Methode verwenden
                        await window.backupManager.createFileBackup(directoryHandle, resourceName, content);
                    } else {
                        // Fallback: Direktes Speichern im Hauptverzeichnis
                        const timestamp = new Date().toISOString().replace(/:/g, '-');
                        const backupName = `${resourceName}.backup.${timestamp}.json`;
                        
                        const backupHandle = await directoryHandle.getFileHandle(backupName, { create: true });
                        const writable = await backupHandle.createWritable();
                        await writable.write(content);
                        await writable.close();
                        
                        log(`Backup von ${resourceName} erstellt als ${backupName}`, 'info');
                    }
                } catch (backupError) {
                    if (backupError.name !== 'NotFoundError') {
                        log(`Fehler beim Erstellen des Backups vor dem Löschen: ${backupError.message}`, 'warn');
                    }
                }
                
                // Jetzt die Datei löschen
                await directoryHandle.removeEntry(resourceName);
                log(`Datei ${resourceName} erfolgreich aus dem Dateisystem gelöscht`, 'info');
            } catch (error) {
                if (error.name !== 'NotFoundError') {
                    log(`Fehler beim Löschen von ${resourceName} aus dem Dateisystem: ${error.message}`, 'error');
                    fileSystemSuccess = false;
                }
            }
        }
        
        // 2. Aus dem Browser-Speicher löschen
        try {
            // Backup in localStorage erstellen, falls Daten vorhanden sind
            const jsonData = localStorage.getItem(getResourcePath(resourceName, username));
            if (jsonData !== null && jsonData !== '') {
                try {
                    const timestamp = new Date().toISOString().replace(/:/g, '-');
                    localStorage.setItem(`${getResourcePath(resourceName, username)}.backup.${timestamp}`, jsonData);
                    log(`Browser-Backup von ${resourceName} erstellt`, 'info');
                } catch (backupError) {
                    log(`Fehler beim Erstellen des Browser-Backups: ${backupError.message}`, 'warn');
                }
            }
            
            // Aus localStorage entfernen
            localStorage.removeItem(getResourcePath(resourceName, username));
            log(`Datei ${resourceName} aus dem Browser-Speicher gelöscht`, 'info');
        } catch (localStorageError) {
            log(`Fehler beim Löschen aus dem Browser-Speicher: ${localStorageError.message}`, 'error');
            localStorageSuccess = false;
        }
        
        // 3. Aus IndexedDB entfernen, falls vorhanden
        if (window.deleteFromIndexedDB) {
            try {
                await window.deleteFromIndexedDB(resourceName, username);
                log(`Datei ${resourceName} aus IndexedDB gelöscht`, 'info');
            } catch (idbError) {
                log(`Fehler beim Löschen aus IndexedDB: ${idbError.message}`, 'warn');
                // Fehler hier sind nicht kritisch, da die Daten möglicherweise nicht in IndexedDB waren
            }
        }
        
        // Zusammenfassung des Löschvorgangs
        if (fileSystemSuccess && localStorageSuccess) {
            showSuccess(`Datei ${resourceName} wurde vollständig gelöscht`);
            return true;
        } else if (fileSystemSuccess) {
            showWarning(`Datei ${resourceName} wurde aus dem Dateisystem gelöscht, aber es gab Probleme beim Löschen aus dem Browser-Speicher`);
            return true;
        } else if (localStorageSuccess) {
            showWarning(`Datei ${resourceName} wurde aus dem Browser-Speicher gelöscht, aber es gab Probleme beim Löschen aus dem Dateisystem`);
            return true;
        } else {
            showError(`Fehler beim Löschen von ${resourceName}. Keine Speichermethode konnte die Datei löschen.`);
            return false;
        }
    } catch (error) {
        showError(`Fehler beim Löschen der Daten: ${error.message}`);
        log(`Fehler beim Löschen von ${resourceName}: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Listet alle verfügbaren Ressourcen im konfigurierten Speicherort auf.
 * @param {string} [username] - Optional: Der Benutzername, für den die Ressourcen aufgelistet werden sollen.
 * @returns {Promise<Array<Object>>} Promise, das zu einem Array von Ressourcenobjekten aufgelöst wird.
 * Jedes Objekt enthält: {name, locations, size, lastModified}
 */
async function listResources(username) {
    try {
        // Map für eindeutige Ressourcen (basierend auf Namen)
        const resourceMap = new Map();
        
        // Wenn das direkte DirectoryHandle nicht verfügbar ist, versuche das globale Handle zu nutzen
        if (!directoryHandle && window.directoryHandle) {
            console.log('Lokales DirectoryHandle nicht verfügbar, verwende globales Handle');
            directoryHandle = window.directoryHandle;
        }
        
        // 1. Ressourcen aus dem Dateisystem auflisten (wenn verfügbar)
        if (directoryHandle) {
            try {
                // Berechtigung prüfen/erneuern
                const permission = await directoryHandle.requestPermission({ mode: 'read' });
                if (permission !== 'granted') {
                    throw new Error('Keine Leseberechtigung für das Verzeichnis');
                }
                
                // Alle Einträge durchgehen
                for await (const [name, entry] of directoryHandle.entries()) {
                    if (entry.kind === 'file') {
                        try {
                            // Backup-Dateien ignorieren
                            if (name.includes('.backup.')) {
                                continue;
                            }
                            
                            const file = await entry.getFile();
                            resourceMap.set(name, {
                                name: name,
                                locations: ['filesystem'],
                                size: file.size,
                                lastModified: new Date(file.lastModified)
                            });
                        } catch (fileError) {
                            log(`Fehler beim Zugriff auf Datei ${name}: ${fileError.message}`, 'warn');
                        }
                    }
                }
                
                log(`${resourceMap.size} Ressourcen im Dateisystem gefunden`, 'info');
            } catch (error) {
                log(`Fehler beim Auflisten von Dateisystem-Ressourcen: ${error.message}`, 'error');
            }
        }
        
        // 2. Ressourcen aus dem localStorage auflisten
        try {
            const path = getStoragePath(username);
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                
                // Backup-Einträge ignorieren
                if (key.includes('.backup.')) {
                    continue;
                }
                
                // Nur Einträge, die zum aktuellen Pfad gehören
                if (key.startsWith(`${path}/`)) {
                    // Ressourcenname ohne Pfadpräfix extrahieren
                    const resourceName = key.substring(path.length + 1);
                    
                    // Indexdb-Verweise separat behandeln
                    const value = localStorage.getItem(key);
                    if (value && value.startsWith('indexeddb:')) {
                        continue; // Diese werden beim IndexedDB-Durchlauf behandelt
                    }
                    
                    // Wenn diese Ressource bereits im Map ist, füge 'browser' zu den locations hinzu
                    if (resourceMap.has(resourceName)) {
                        const resource = resourceMap.get(resourceName);
                        resource.locations.push('browser');
                        // Aktualisiere die Größe, wenn sie noch nicht gesetzt ist
                        if (!resource.size) {
                            resource.size = value ? new Blob([value]).size : 0;
                        }
                    } else {
                        // Neue Ressource hinzufügen
                        resourceMap.set(resourceName, {
                            name: resourceName,
                            locations: ['browser'],
                            size: value ? new Blob([value]).size : 0,
                            lastModified: null // localStorage hat keine Zeitstempel
                        });
                    }
                }
            }
            
            log(`${resourceMap.size} Ressourcen insgesamt gefunden (Dateisystem + Browser)`, 'info');
        } catch (localStorageError) {
            log(`Fehler beim Auflisten von Browser-Ressourcen: ${localStorageError.message}`, 'warn');
        }
        
        // 3. Ressourcen aus IndexedDB auflisten (falls verfügbar)
        if (window.listIndexedDBResources) {
            try {
                const idbResources = await window.listIndexedDBResources(username);
                
                for (const resource of idbResources) {
                    // Backup-Einträge ignorieren
                    if (resource.name.includes('.backup.')) {
                        continue;
                    }
                    
                    // Wenn diese Ressource bereits im Map ist, füge 'indexeddb' zu den locations hinzu
                    if (resourceMap.has(resource.name)) {
                        const existingResource = resourceMap.get(resource.name);
                        existingResource.locations.push('indexeddb');
                        // Aktualisiere die Größe, wenn sie noch nicht gesetzt ist
                        if (!existingResource.size && resource.size) {
                            existingResource.size = resource.size;
                        }
                        // Aktualisiere das Änderungsdatum, wenn es noch nicht gesetzt ist
                        if (!existingResource.lastModified && resource.lastModified) {
                            existingResource.lastModified = resource.lastModified;
                        }
                    } else {
                        // Neue Ressource hinzufügen
                        resourceMap.set(resource.name, {
                            name: resource.name,
                            locations: ['indexeddb'],
                            size: resource.size || 0,
                            lastModified: resource.lastModified || null
                        });
                    }
                }
                
                log(`${resourceMap.size} Ressourcen insgesamt gefunden (inkl. IndexedDB)`, 'info');
            } catch (idbError) {
                log(`Fehler beim Auflisten von IndexedDB-Ressourcen: ${idbError.message}`, 'warn');
            }
        }
        
        // Map in Array umwandeln und zurückgeben
        return Array.from(resourceMap.values());
    } catch (error) {
        log(`Fehler beim Auflisten von Ressourcen: ${error.message}`, 'error');
        return [];
    }
}

/**
 * Prüft, ob der Dateizugriff nach dem Login konfiguriert werden muss.
 * Diese Funktion kann nach dem Login aufgerufen werden, um festzustellen,
 * ob der Benutzer den Speicherordner auswählen muss.
 * @param {string} [username] - Optional: Der Benutzername, für den geprüft werden soll.
 * @returns {boolean} True, wenn der Benutzer den Speicherordner auswählen sollte, sonst False.
 */
function needsStorageConfiguration(username) {
    // Wir brauchen keine spezielle Konfiguration mehr, da die Berechtigung 
    // beim Zugriff automatisch angefragt wird
    return false;
}

/**
 * Prüft, ob ein Benutzer nach dem Speicherort gefragt werden sollte.
 * Dies ist der Fall, wenn es sein erster Login ist und noch kein benutzerspezifischer Speicherort festgelegt wurde.
 * @param {string} username - Der Benutzername.
 * @returns {boolean} True, wenn der Benutzer nach dem Speicherort gefragt werden sollte.
 */
function shouldAskForStoragePath(username) {
    if (!username) return false;
    
    // Prüfen, ob die Ersteinrichtung bereits abgeschlossen wurde (aus first-login.js)
    if (window.isFirstLoginComplete && window.isFirstLoginComplete()) {
        return false;
    }
    
    // Prüfen, ob es der erste Login ist nach alter Methode (für Abwärtskompatibilität)
    const userFirstLoginKey = `firstLogin_${username}`;
    const isFirstLogin = localStorage.getItem(userFirstLoginKey) !== 'completed';
    
    // Prüfen, ob bereits ein benutzerspezifischer Speicherort festgelegt wurde
    const hasCustomPath = localStorage.getItem(`storagePath_${username}`) !== null;
    
    // Prüfen, ob First-Login nach neuer Methode bereits abgeschlossen wurde
    const newMethodComplete = localStorage.getItem(`firstLoginComplete_${username}`) === 'true';
    
    // Wenn nach neuer Methode abgeschlossen oder ein Pfad festgelegt wurde, nicht mehr fragen
    if (newMethodComplete || hasCustomPath) {
        return false;
    }
    
    // Nur fragen, wenn es der erste Login nach alter Methode ist und die obigen Bedingungen nicht erfüllt sind
    return isFirstLogin;
}

/**
 * Markiert den ersten Login eines Benutzers als abgeschlossen.
 * @param {string} username - Der Benutzername.
 */
function markFirstLoginCompleted(username) {
    if (!username) return;
    
    // Alte Methode (für Abwärtskompatibilität)
    const userFirstLoginKey = `firstLogin_${username}`;
    localStorage.setItem(userFirstLoginKey, 'completed');
    
    // Neue Methode (aus first-login.js)
    localStorage.setItem(`firstLoginComplete_${username}`, 'true');
    
    // Wenn die first-login.js Funktion verfügbar ist, verwenden wir auch diese
    if (window.markFirstLoginComplete) {
        window.markFirstLoginComplete();
    }
    
    console.log(`First-Login für Benutzer '${username}' wurde als abgeschlossen markiert.`);
}

/**
 * Versucht, das Verzeichnis-Handle für einen benutzerdefinierten Speicherort zu bekommen.
 * Diese Funktion ist vereinfacht und verwendet den gespeicherten Pfad für den Benutzer.
 * @param {string} [username] - Optional: Der Benutzername, für den das Handle benötigt wird.
 * @returns {Promise<Object|null>} Promise mit dem Verzeichnis-Handle oder null bei Fehler.
 */
async function getCustomDirectoryHandle(username) {
    try {
        const currentUsername = username || localStorage.getItem('username');
        if (!currentUsername) return null;
        
        // Prüfen, ob ein benutzerdefinierter Pfad verwendet wird
        if (isDefaultPath(currentUsername)) {
            // Für den Standardpfad benötigen wir kein Handle
            console.log('Standard-Speicherort wird verwendet, kein Handle nötig');
            return null;
        }
        
        // Wenn wir bereits ein Handle haben, versuchen wir es zu verwenden
        if (directoryHandle) {
            try {
                // Die Berechtigung wird automatisch angefragt, wenn nötig
                const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    log('Vorhandenes DirectoryHandle erfolgreich verwendet');
                    return directoryHandle;
                } else {
                    log('Vorhandenes DirectoryHandle kann nicht verwendet werden: Keine Berechtigung', 'warn');
                    return null;
                }
            } catch (error) {
                log('Vorhandenes Handle konnte nicht verwendet werden:', 'error', error);
                return null;
            }
        } else {
            // Versuchen, ein Handle aus der IndexedDB zu laden
            if (window.loadDirectoryHandle) {
                try {
                    const savedHandle = await window.loadDirectoryHandle();
                    if (savedHandle) {
                        // Prüfen, ob wir Berechtigung haben
                        if (window.verifyPermission) {
                            const permission = await window.verifyPermission(savedHandle);
                            if (permission === 'granted') {
                                // Handle global setzen
                                directoryHandle = savedHandle;
                                log('Gespeichertes Verzeichnis-Handle wiederhergestellt');
                                return directoryHandle;
                            }
                        }
                    }
                } catch (error) {
                    // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
                    console.log('Fehler beim Laden des gespeicherten Handles:', error);
                }
            }
            
            log('Kein DirectoryHandle vorhanden, kann nicht automatisch wiederhergestellt werden', 'warn');
            return null;
        }
    } catch (err) {
        // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
        console.log('Fehler beim Zugriff auf benutzerdefinierten Speicherort:', err);
        return null;
    }
}

/**
 * Erstellt eine Testdatei im Benutzerverzeichnis, um zu prüfen, ob der Datenzugriff funktioniert.
 * Diese Funktion kann über die Konsole aufgerufen werden, um zu testen, ob Dateien geschrieben werden können.
 * @returns {Promise<boolean>} True, wenn erfolgreich eine Testdatei erstellt wurde.
 */
async function testFileAccess() {
    try {
        if (!directoryHandle) {
            log('Kein DirectoryHandle vorhanden. Bitte wählen Sie zuerst einen Speicherort aus.', 'warn');
            return false;
        }
        
        // Testdatei erstellen
        const testResult = await saveTestFile(directoryHandle);
        log('Testdatei erfolgreich erstellt:', 'info', testResult);
        
        // Jetzt versuchen, die Datei zu lesen
        try {
            const fileHandle = await directoryHandle.getFileHandle('lernapp_test.txt');
            const file = await fileHandle.getFile();
            const text = await file.text();
            log('Testdatei Inhalt:', 'info', text);
            return true;
        } catch (readError) {
            error('Fehler beim Lesen der Testdatei:', readError);
            return false;
        }
    } catch (error) {
        error('Fehler beim Testen des Dateizugriffs:', error);
        return false;
    }
}

/**
 * Debug-Funktion, um den aktuellen Status des directoryHandle zu überprüfen.
 * Diese Funktion kann auf der Konsole aufgerufen werden, um zu sehen, ob ein gültiger Handle vorliegt.
 * @returns {Object} Informationen über den aktuellen directoryHandle-Status.
 */
function debugDirectoryHandleStatus() {
    const currentUsername = localStorage.getItem('username');
    const hasDirectoryHandleFlag = localStorage.getItem('hasDirectoryHandle') === 'true';
    const path = getStoragePath(currentUsername);
    const isDefault = isDefaultPath(currentUsername);
    
    const status = {
        currentUsername,
        path,
        isDefaultPath: isDefault,
        hasDirectoryHandleFlag,
        directoryHandleExists: !!directoryHandle,
        directoryHandleValue: directoryHandle ? {
            name: directoryHandle.name,
            kind: directoryHandle.kind
        } : null
    };
    
    console.log('DirectoryHandle Status:', status);
    return status;
}

/**
 * Setzt den Speicherpfad auf den Standardpfad zurück.
 * Diese Funktion löscht alle vorhandenen Einstellungen und setzt
 * den Pfad auf den Standardwert zurück.
 * @param {string} [username] - Optional: Der Benutzername, für den der Pfad zurückgesetzt werden soll.
 * @param {boolean} [askForDirectory=false] - Optional: Wenn true, wird der Benutzer nach einem Verzeichnis gefragt.
 * @returns {Promise<boolean>} True, wenn der Pfad erfolgreich zurückgesetzt wurde, sonst False.
 */
async function resetStoragePath(username, askForDirectory = false) {
    try {
        // DirectoryHandle zurücksetzen
        directoryHandle = null;
        window.directoryHandle = null;
        
        // Flags zurücksetzen
        localStorage.removeItem('hasDirectoryHandle');
        localStorage.removeItem('directoryHandleRestored');
        localStorage.removeItem('directoryHandleRestoredInSession');
        
        // Debug-Meldung für bessere Nachvollziehbarkeit
        log(`Setze Speicherpfad für ${username || 'aktuellen Benutzer'} auf Standardpfad zurück`);
        
        // Handle für den Speicherort definieren
        let defaultHandle = null;
        
        // Nur wenn explizit gewünscht, nach einem Verzeichnis fragen
        if (askForDirectory) {
            log('Benutzer wird nach einem Speicherort gefragt');
            defaultHandle = await createDefaultDirectoryHandle();
        } else {
            log('Erstelle virtuelles DirectoryHandle für transparenten Fallback');
            defaultHandle = createVirtualDirectoryHandle();
        }
        
        // DirectoryHandle global und lokal speichern
        directoryHandle = defaultHandle;
        window.directoryHandle = defaultHandle;
        
        // Flag setzen, dass wir ein DirectoryHandle haben
        localStorage.setItem('hasDirectoryHandle', 'true');
        
        // Speicherpfad mit dem Handle setzen
        return await setStoragePath({
            path: DEFAULT_STORAGE_PATH,
            handle: defaultHandle
        }, username);
    } catch (error) {
        log('Fehler beim Zurücksetzen des Speicherpfads:', 'error', error);
        
        // Fallback: Standardpfad ohne Handle verwenden
        return await setStoragePath(DEFAULT_STORAGE_PATH, username);
    }
}

// Globale Funktionen exportieren
window.isFileSystemAccessSupported = isFileSystemAccessSupported;
window.isStoragePathConfigured = isStoragePathConfigured;
window.getStoragePath = getStoragePath;
window.setStoragePath = setStoragePath;
window.resetStoragePath = resetStoragePath;
window.verifyStoragePath = verifyStoragePath;
window.openDirectoryPicker = openDirectoryPicker;
window.getDirectoryHandle = getDirectoryHandle;
window.testFileAccess = testFileAccess;
window.debugDirectoryHandleStatus = debugDirectoryHandleStatus;
/**
 * Erstellt eine Testdatei im angegebenen Verzeichnis, um zu prüfen, ob der Zugriff funktioniert.
 * @param {Object} dirHandle - Das Verzeichnis-Handle.
 * @returns {Promise<boolean>} Promise, das aufgelöst wird, wenn die Testdatei erstellt wurde.
 */
async function saveTestFile(dirHandle) {
    try {
        if (!dirHandle) {
            log('Kein Verzeichnis-Handle vorhanden.', 'error');
            return false;
        }

        // Überprüfen, ob es sich um ein gültiges DirectoryHandle-Objekt handelt
        if (!dirHandle || typeof dirHandle !== 'object' || typeof dirHandle.getFileHandle !== 'function') {
            throw new Error('Ungültiges Directory Handle');
        }

        // Testdatei erstellen/öffnen - der Browser kümmert sich selbst um Berechtigungen
        const fileHandle = await dirHandle.getFileHandle('lernapp_test.txt', { create: true });
        const writable = await fileHandle.createWritable();
        
        // Testdaten schreiben
        const testData = `LernApp Testzugriff - ${new Date().toISOString()}`;
        await writable.write(testData);
        await writable.close();
        
        return true;
    } catch (error) {
        error('Fehler beim Erstellen der Testdatei:', error);
        throw error;
    }
}

/**
 * Erstellt die initialen Datenbankdateien im angegebenen Verzeichnis
 * oder verwendet die bereits vorhandenen Dateien, wenn sie gültig sind.
 * @param {Object} dirHandle - Das Verzeichnis-Handle.
 */
async function createInitialDatabaseFiles(dirHandle) {
    try {
        if (!dirHandle) {
            log('Kein Verzeichnis-Handle vorhanden.', 'error');
            return false;
        }

        // Liste der Datenbankdateien
        const dbFiles = [
            { name: 'questions.json', defaultContent: '[]', type: 'array' },
            { name: 'categories.json', defaultContent: '[]', type: 'array' },
            { name: 'groups.json', defaultContent: '[]', type: 'array' },
            { name: 'statistics.json', defaultContent: '{}', type: 'object' }
        ];
        
        // Für jede Datei prüfen, ob sie existiert und gültig ist
        for (const file of dbFiles) {
            try {
                // Prüfen, ob Datei existiert
                let fileHandle;
                let fileExists = false;
                let createNewFile = false;
                
                try {
                    fileHandle = await dirHandle.getFileHandle(file.name);
                    fileExists = true;
                } catch (fileError) {
                    // Datei existiert nicht
                    fileExists = false;
                    createNewFile = true;
                }

                if (fileExists) {
                    // Datei existiert - prüfen, ob der Inhalt gültig ist
                    try {
                        const fileObject = await fileHandle.getFile();
                        const content = await fileObject.text();
                        
                        // Versuchen, den Inhalt als JSON zu parsen
                        const parsedContent = JSON.parse(content);
                        
                        // Prüfen, ob der Inhalt dem erwarteten Typ entspricht
                        const isValid = (file.type === 'array' && Array.isArray(parsedContent)) || 
                                       (file.type === 'object' && typeof parsedContent === 'object' && !Array.isArray(parsedContent));
                        
                        if (isValid) {
                            // Datei ist gültig, keine Aktion erforderlich
                            log(`Vorhandene Datei ${file.name} wird verwendet.`, 'info');
                            // Wichtig: hier nichts weiter tun, gültige Datei behalten
                            continue;
                        } else {
                            // Datei hat ungültigen Typ - sichern und überschreiben
                            log(`Datei ${file.name} hat ungültigen Typ. Erstelle Sicherungskopie.`, 'warn');
                            
                            // Sicherungskopie erstellen
                            const backupName = `${file.name}.backup-${Date.now()}`;
                            const backupHandle = await dirHandle.getFileHandle(backupName, { create: true });
                            const backupWritable = await backupHandle.createWritable();
                            await backupWritable.write(content);
                            await backupWritable.close();
                            
                            // Neue Datei erstellen
                            createNewFile = true;
                        }
                    } catch (parseError) {
                        // Datei ist beschädigt - sichern und überschreiben
                        log(`Datei ${file.name} ist beschädigt. Erstelle Sicherungskopie.`, 'warn');
                        
                        try {
                            // Original-Inhalt auslesen
                            const fileObject = await fileHandle.getFile();
                            const content = await fileObject.text();
                            
                            // Sicherungskopie erstellen
                            const backupName = `${file.name}.backup-${Date.now()}`;
                            const backupHandle = await dirHandle.getFileHandle(backupName, { create: true });
                            const backupWritable = await backupHandle.createWritable();
                            await backupWritable.write(content);
                            await backupWritable.close();
                            
                            // Neue Datei erstellen
                            createNewFile = true;
                        } catch (backupError) {
                            log(`Fehler beim Erstellen der Sicherungskopie von ${file.name}:`, 'error', backupError);
                            createNewFile = true;
                        }
                    }
                }
                
                // Nur neue Datei erstellen, wenn nötig (nicht existierend oder ungültig)
                if (createNewFile) {
                    log(`Erstelle neue Datei ${file.name}`, 'info');
                    const newFileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(file.defaultContent);
                    await writable.close();
                }
                
            } catch (error) {
                log(`Fehler beim Verarbeiten der Datei ${file.name}:`, 'error', error);
            }
        }
        
        return true;
    } catch (error) {
        log('Fehler beim Erstellen der Datenbankdateien:', 'error', error);
        return false;
    }
}

/**
 * Führt eine Überprüfung durch, ob der benutzerdefinierten Speicherort funktioniert.
 * Diese Funktion ist vereinfacht, da die Berechtigung beim Zugriff automatisch angefragt wird.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn alles in Ordnung ist.
 */
async function checkStorage() {
    try {
        const currentUsername = username || localStorage.getItem('username');
        if (!currentUsername) {
            log('Kein eingeloggter Benutzer gefunden.', 'warn');
            return false; // Nicht eingeloggt
        }
        
        // Prüfen, ob ein benutzerdefinierter Speicherort verwendet wird
        if (isDefaultPath(username)) {
            // Standard-Speicherort - keine Probleme zu erwarten
            return true;
        }
        
        // Prüfen, ob der Speicherort zugänglich ist
        const isValid = await verifyStoragePath();
        if (!isValid) {
            if (window.showWarning) {
                window.showWarning(
                    'Der konfigurierte Speicherort ist nicht zugänglich. ' +
                    'Ihre Daten werden vorerst nur im Browser gespeichert.',
                    8000
                );
            }
            
            return false;
        }
        
        return true;
    } catch (error) {
        error('Fehler bei der Speicherort-Überprüfung:', error);
        return false;
    }
}

/**
 * Migriert alle Daten von einem Speicherort zu einem anderen.
 * Diese Funktion wird verwendet, um Daten vom aktuellen Speicherort in einen neuen zu verschieben.
 * @param {Object} newDirectoryHandle - Der Handle des neuen Zielverzeichnisses
 * @param {string} [username] - Optional: Der Benutzername, für den die Daten migriert werden sollen.
 * @returns {Promise<Object>} Ein Objekt mit Informationen über den Migrationsprozess.
 */
async function migrateStorage(newDirectoryHandle, username) {
    try {
        const currentUsername = username || localStorage.getItem('username');
        if (!currentUsername) {
            throw new Error('Kein Benutzername gefunden');
        }

        // Speichern des alten DirectoryHandle-Zustands
        const oldDirectoryHandle = directoryHandle;
        
        // Auflisten aller Ressourcen am aktuellen Speicherort
        const resources = await listResources(currentUsername);
        log(`${resources.length} Ressourcen werden migriert:`, 'info', resources);
        
        // Ergebnisstatistik initialisieren
        const result = {
            total: resources.length,
            migrated: 0,
            failed: 0,
            failedResources: []
        };

        // Temporäres Setzen des neuen DirectoryHandle für das Speichern
        directoryHandle = newDirectoryHandle;
        
        // Jede Ressource laden und am neuen Ort speichern
        for (const resourceName of resources) {
            try {
                // DirectoryHandle zurücksetzen zum Laden
                directoryHandle = oldDirectoryHandle;
                
                // Daten vom alten Speicherort laden
                const data = await loadData(resourceName, null, currentUsername);
                
                if (data !== null) {
                    // DirectoryHandle auf neuen Ort setzen
                    directoryHandle = newDirectoryHandle;
                    
                    // Daten am neuen Speicherort speichern
                    const success = await saveData(resourceName, data, currentUsername);
                    
                    if (success) {
                        result.migrated++;
                    } else {
                        result.failed++;
                        result.failedResources.push(resourceName);
                    }
                }
            } catch (err) {
                // Verwende console.log direkt, um rekursive Aufrufe zu vermeiden
                console.log(`Fehler beim Migrieren von ${resourceName}:`, err);
                result.failed++;
                result.failedResources.push(resourceName);
            }
        }

        // Jetzt endgültig den neuen Speicherort konfigurieren
        directoryHandle = newDirectoryHandle;
        await setStoragePath({
            path: newDirectoryHandle.name,
            handle: newDirectoryHandle
        }, currentUsername);
        
        return result;
    } catch (error) {
        error('Fehler bei der Speicherort-Migration:', error);
        throw error;
    }
}

/**
 * Gibt einen benutzerfreundlichen Anzeigenamen für den Speicherort zurück
 * @param {string} [username] - Optional: Der Benutzername, für den der Pfad angezeigt werden soll
 * @returns {string} Ein benutzerfreundlicher Name des Speicherorts
 */
function getStorageDisplayName(username) {
    const path = getStoragePath(username);
    
    // Wenn der Pfad der Standardpfad ist, zeigen wir "Standard" an
    if (path === DEFAULT_STORAGE_PATH) {
        return "Standard";
    }
    
    // Versuchen, einen benutzerfreundlichen Namen zu erstellen
    if (typeof path === 'object') {
        // Wenn es ein Objekt ist, versuche sinnvolle Informationen zu extrahieren
        if (path.path) {
            return path.path;
        } else if (path.name) {
            return path.name;
        } else {
            return "Benutzerdefinierter Speicherort";
        }
    }
    
    // Pfadnamen aufbereiten (z.B. letzten Teil extrahieren)
    if (typeof path === 'string' && path.includes('/')) {
        const parts = path.split('/');
        return parts[parts.length - 1] || path;
    }
    
    return String(path);
}

window.shouldAskForStoragePath = shouldAskForStoragePath;
window.markFirstLoginCompleted = markFirstLoginCompleted;
window.saveData = saveData;
window.loadData = loadData;
window.deleteData = deleteData;
window.listResources = listResources;
window.needsStorageConfiguration = needsStorageConfiguration;
window.getStorageDisplayName = getStorageDisplayName;
window.initializeStorageForUser = initializeStorageForUser;
window.repairDirectoryHandle = repairDirectoryHandle;
// Track user interactions to enable directory picker
document.addEventListener('mousedown', function() {
    window._userInteractionActive = true;
    window._lastInteractionTime = Date.now();
    setTimeout(() => { window._userInteractionActive = false; }, 1000);
});

// Reagiere auf DirectoryHandle-Aktualisierungen von storage-handler.js
document.addEventListener('directoryHandleRestored', function(event) {
    if (event.detail && event.detail.handle) {
        console.log('Event erkannt: directoryHandleRestored');
        directoryHandle = event.detail.handle;
        console.log('Lokale DirectoryHandle-Variable aktualisiert durch Event');
        
        // Verifizierung, dass das Handle funktioniert
        setTimeout(async () => {
            try {
                if (directoryHandle && typeof directoryHandle.getFileHandle === 'function') {
                    console.log('DirectoryHandle in storage.js ist gültig und funktionsfähig');
                    
                    // Test: Versuche, eine Testdatei zu lesen oder zu erstellen
                    try {
                        const fileHandle = await directoryHandle.getFileHandle('storage-test.txt', { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(`Storage-Test: ${new Date().toISOString()}`);
                        await writable.close();
                        console.log('✓ Testdatei erfolgreich geschrieben - storage.js DirectoryHandle funktioniert');
                        
                        // Erfolg anzeigen
                        if (window.showSuccess && !window._directoryHandleSuccessShown) {
                            window.showSuccess('Dateisystem-Zugriff erfolgreich hergestellt.');
                            window._directoryHandleSuccessShown = true;
                        }
                    } catch (fileError) {
                        console.error('Fehler beim Schreiben der Testdatei in storage.js:', fileError);
                    }
                } else {
                    console.warn('⚠️ DirectoryHandle in storage.js ist NICHT gültig!');
                }
            } catch (error) {
                console.error('Fehler bei der Überprüfung des DirectoryHandle in storage.js:', error);
            }
        }, 200);
    }
});

document.addEventListener('touchstart', function() {
    window._userInteractionActive = true;
    window._lastInteractionTime = Date.now();
    setTimeout(() => { window._userInteractionActive = false; }, 1000);
});

document.addEventListener('keydown', function() {
    window._userInteractionActive = true;
    window._lastInteractionTime = Date.now();
    setTimeout(() => { window._userInteractionActive = false; }, 1000);
});

window.createInitialDatabaseFiles = createInitialDatabaseFiles;
window.isDefaultPath = isDefaultPath;
window.getCustomDirectoryHandle = getCustomDirectoryHandle;
window.checkStorage = checkStorage;
window.migrateStorage = migrateStorage;

// Die Initialisierung des Speicherorts wird nur nach erfolgreichem Login durchgeführt
// Siehe auth.js für den entsprechenden Code

/**
 * Initialisiert den Speicherort für einen Benutzer, sollte nur nach dem Login aufgerufen werden
 * @param {string} username - Der Benutzername
 * @returns {Promise<boolean>} True wenn erfolgreich
 */
async function initializeStorageForUser(username) {
    try {
        console.log(`Initialisiere Speicherort für Benutzer: ${username}`);
        
        if (!isStoragePathConfigured(username)) {
            // Standard-Speicherort festlegen, wenn noch keiner gesetzt ist
            console.log('Kein Speicherort konfiguriert, initialisiere Standard-Speicherort');
            await setStoragePath(DEFAULT_STORAGE_PATH, username);
        } else {
            console.log('Speicherort bereits konfiguriert');
        }
        
        // Explizit den DirectoryHandle wiederherstellen
        if (window.restoreDirectoryHandle) {
            console.log('Stelle DirectoryHandle wieder her...');
            const restored = await window.restoreDirectoryHandle();
            if (restored) {
                console.log('DirectoryHandle erfolgreich wiederhergestellt');
                
                // Wichtig: Synchronisiere die lokale Variable mit dem globalen Handle
                if (window.directoryHandle) {
                    directoryHandle = window.directoryHandle;
                    console.log('Lokale DirectoryHandle-Variable mit globalem Wert synchronisiert');
                    
                    // Teste, ob der DirectoryHandle wirklich funktioniert
                    try {
                        console.log('Teste DirectoryHandle Funktionalität...');
                        // Versuche eine Testdatei zu erstellen/lesen
                        const testHandle = await directoryHandle.getFileHandle('init-test.txt', { create: true });
                        const writable = await testHandle.createWritable();
                        await writable.write(`Init-Test: ${new Date().toISOString()}`);
                        await writable.close();
                        console.log('✓ DirectoryHandle-Test erfolgreich!');
                    } catch (testError) {
                        console.error('⚠️ DirectoryHandle-Test fehlgeschlagen:', testError);
                    }
                } else {
                    console.warn('Globales DirectoryHandle ist nicht gesetzt!');
                }
                
                return true;
            } else {
                console.warn('DirectoryHandle konnte nicht wiederhergestellt werden');
                console.log('Erstelle virtuelles DirectoryHandle als Fallback');
                
                // Erstelle ein virtuelles DirectoryHandle als Fallback
                const virtualHandle = createVirtualDirectoryHandle();
                directoryHandle = virtualHandle;
                window.directoryHandle = virtualHandle;
                
                // Flag setzen, dass wir ein DirectoryHandle haben
                localStorage.setItem('hasDirectoryHandle', 'true');
                
                console.log('Virtuelles DirectoryHandle wurde erstellt und gesetzt');
                return true;
            }
        }
        
        // Wenn keine Wiederherstellungsfunktion verfügbar ist, trotzdem ein virtuelles Handle erstellen
        console.log('Keine restoreDirectoryHandle-Funktion verfügbar, erstelle virtuelles DirectoryHandle');
        const virtualHandle = createVirtualDirectoryHandle();
        directoryHandle = virtualHandle;
        window.directoryHandle = virtualHandle;
        
        // Flag setzen, dass wir ein DirectoryHandle haben
        localStorage.setItem('hasDirectoryHandle', 'true');
        
        return true;
    } catch (error) {
        console.error('Fehler bei der Initialisierung des Speicherorts:', error);
        return false;
    }
}
