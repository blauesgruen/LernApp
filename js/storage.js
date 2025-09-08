// storage.js - Verwaltung des Datenbank-Speicherorts für die LernApp

/**
 * Verwaltet den Speicherort für die Daten der LernApp.
 * Unterstützt lokale Speicherung, Cloud-Speicherorte (z.B. Dropbox) und native Dateisystemzugriffe.
 */
function getStoragePath(username) {
    const currentUser = username || localStorage.getItem('username');
    if (!currentUser) {
        return localStorage.getItem('storagePath') || DEFAULT_STORAGE_PATH;
    }
    return localStorage.getItem(`storagePath_${currentUser}`) || DEFAULT_STORAGE_PATH;
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

// Standardpfad für Daten (wenn kein benutzerdefinierter Pfad angegeben wurde)
const DEFAULT_STORAGE_PATH = 'lernapp_data';

// Exportiere den Standardpfad, damit andere Skripte darauf zugreifen können
window.DEFAULT_STORAGE_PATH = DEFAULT_STORAGE_PATH;

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
                        warn('Handle konnte nicht gespeichert werden:', storeError);
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
                    warn('Fehler beim Laden des gespeicherten Handles:', error);
                }
            }    // Kein Handle vorhanden - das ist normal und kein Fehler
    return null;
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
                
                // Serialisieren des Handles ist nicht möglich, aber wir merken uns, dass wir einen Handle haben
                localStorage.setItem('hasDirectoryHandle', 'true');
                
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
            log('Kein gültiges Directory Handle, verwende nur den Pfadnamen', 'warn');
            localStorage.removeItem('hasDirectoryHandle');
            
            // Hinweis an den Benutzer, warum keine Dateien im Dateisystem erstellt werden können
            log('Hinweis: Ohne gültiges DirectoryHandle können keine Dateien im Dateisystem erstellt werden. ' +
                'Die Daten werden im Browser-Speicher gespeichert.', 'warn');
            showWarning('Daten werden im Browser-Speicher gespeichert. Um Dateien direkt im Dateisystem zu speichern, ' +
                         'bitte einen unterstützten Browser wie Chrome oder Edge verwenden.');
        }
        
        // Speicherpfad für den aktuellen oder angegebenen Benutzer setzen
        const currentUser = username || localStorage.getItem('username');
        if (currentUser) {
            localStorage.setItem(`storagePath_${currentUser}`, pathString);
            // Überprüfen, ob der Pfad erfolgreich gespeichert wurde
            if (localStorage.getItem(`storagePath_${currentUser}`) === pathString) {
                showSuccess(`Speicherort für Benutzer "${currentUser}" wurde auf "${pathString}" gesetzt.`);
                
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
                showSuccess(`Speicherort wurde auf "${pathString}" gesetzt.`);
                
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
async function resetStoragePath(username) {
    directoryHandle = null;
    localStorage.removeItem('hasDirectoryHandle');
    return await setStoragePath(DEFAULT_STORAGE_PATH, username);
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
        
        // Wenn wir einen DirectoryHandle haben, versuchen wir die Datei dort zu speichern
        if (directoryHandle) {
            try {
                // Datei erstellen/öffnen - der Browser kümmert sich selbst um die Berechtigungsanfrage
                const fileHandle = await directoryHandle.getFileHandle(resourceName, { create: true });
                const writable = await fileHandle.createWritable();
                
                // Debug-Information zur Speicherung
                log(`Speichere ${resourceName} im Dateisystem: ${new Date().toLocaleTimeString()}`);
                log(`Pfad: ${directoryHandle.name}/${resourceName}`);
                log(`Datengröße: ${jsonData.length} Bytes`);
                
                await writable.write(jsonData);
                await writable.close();
                
                // Meldung nach erfolgreichem Speichern
                log(`✓ Dateisystem-Speicherung erfolgreich: ${new Date().toLocaleTimeString()}`);
                showSuccess(`Datei ${resourceName} im Dateisystem gespeichert`);
                log(`Datei ${resourceName} erfolgreich im Dateisystem gespeichert`);
                return true;
            } catch (error) {
                log(`✗ Fehler beim Speichern im Dateisystem: ${error.message}`, 'error');
                log(`Fehler beim Speichern von ${resourceName} im Dateisystem:`, 'error', error);
                
                // Fallback auf localStorage
                try {
                    localStorage.setItem(getResourcePath(resourceName, username), jsonData);
                    log(`ℹ Fallback auf localStorage: ${getResourcePath(resourceName, username)}`);
                    log(`Datei ${resourceName} als Fallback im localStorage gespeichert`);
                    return true;
                } catch (storageError) {
                    error(`Fehler beim Speichern im localStorage: ${storageError.message}`);
                    if (window.showError) {
                        window.showError(`Fehler beim Speichern: ${storageError.message}`);
                    }
                    return false;
                }
            }
        } else {
            // Fallback: Im localStorage speichern
            try {
                localStorage.setItem(getResourcePath(resourceName, username), jsonData);
                log(`Datei ${resourceName} im localStorage gespeichert`, 'info');
                return true;
            } catch (storageError) {
                log(`Fehler beim Speichern im localStorage: ${storageError.message}`, 'error');
                if (window.showError) {
                    window.showError(`Fehler beim Speichern: ${storageError.message}`);
                }
                return false;
            }
        }
    } catch (error) {
        log(`Fehler beim Speichern von ${resourceName}:`, 'error', error);
        if (window.showError) {
            window.showError(`Fehler beim Speichern der Daten: ${error.message}`);
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
        
        // Wenn wir einen DirectoryHandle haben, versuchen wir die Datei dort zu laden
        if (directoryHandle) {
            try {
                // Versuchen, die Datei zu öffnen - der Browser kümmert sich selbst um die Berechtigungsanfrage
                const fileHandle = await directoryHandle.getFileHandle(resourceName);
                const file = await fileHandle.getFile();
                const text = await file.text();
                
                return JSON.parse(text);
            } catch (error) {
                // Fallback auf localStorage
                if (error.name === 'NotFoundError') {
                    // Wenn die Datei nicht gefunden wurde, versuchen wir localStorage
                    const jsonData = localStorage.getItem(getResourcePath(resourceName, username));
                    if (jsonData === null) {
                        return defaultValue;
                    }
                    return JSON.parse(jsonData);
                }
            }
        }
        
        // Aus dem localStorage laden
        const jsonData = localStorage.getItem(getResourcePath(resourceName, username));
        if (jsonData === null) {
            return defaultValue;
        }
        
        return JSON.parse(jsonData);
    } catch (error) {
        console.error(`Fehler beim Laden von ${resourceName}:`, error);
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
        
        // Wenn wir einen DirectoryHandle haben, versuchen wir die Datei dort zu löschen
        if (directoryHandle) {
            try {
                // Berechtigung prüfen/erneuern
                const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') {
                    throw new Error('Keine Schreibberechtigung für das Verzeichnis');
                }
                
                await directoryHandle.removeEntry(resourceName);
                
                // Auch aus localStorage entfernen (für den Fall, dass es dort auch gespeichert wurde)
                localStorage.removeItem(getResourcePath(resourceName, username));
                
                return true;
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    // Die Datei existiert nicht, gilt als erfolgreich gelöscht
                    return true;
                }
                console.error(`Fehler beim Löschen von ${resourceName} aus dem Dateisystem:`, error);
                // Fallback auf localStorage
            }
        }
        
        // Fallback: In einer reinen Browser-Umgebung löschen wir aus dem localStorage
        localStorage.removeItem(getResourcePath(resourceName, username));
        
        return true;
    } catch (error) {
        showError(`Fehler beim Löschen der Daten: ${error.message}`);
        console.error(`Fehler beim Löschen von ${resourceName}:`, error);
        return false;
    }
}

/**
 * Listet alle verfügbaren Ressourcen im konfigurierten Speicherort auf.
 * @param {string} [username] - Optional: Der Benutzername, für den die Ressourcen aufgelistet werden sollen.
 * @returns {Promise<Array<string>>} Promise, das zu einem Array von Ressourcennamen aufgelöst wird.
 */
async function listResources(username) {
    try {
        const resources = [];
        
        // Wenn wir einen DirectoryHandle haben, versuchen wir die Dateien dort aufzulisten
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
                        resources.push(name);
                    }
                }
                
                return resources;
            } catch (error) {
                console.error('Fehler beim Auflisten der Ressourcen aus dem Dateisystem:', error);
                // Fallback auf localStorage
            }
        }
        
        // Fallback: In einer reinen Browser-Umgebung durchsuchen wir den localStorage
        const path = getStoragePath(username);
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`${path}/`)) {
                // Ressourcenname ohne Pfadpräfix extrahieren
                resources.push(key.substring(path.length + 1));
            }
        }
        
        return resources;
    } catch (error) {
        showError(`Fehler beim Auflisten der Ressourcen: ${error.message}`);
        console.error('Fehler beim Auflisten der Ressourcen:', error);
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
    
    // Prüfen, ob es der erste Login ist
    const userFirstLoginKey = `firstLogin_${username}`;
    const isFirstLogin = localStorage.getItem(userFirstLoginKey) !== 'completed';
    
    // Prüfen, ob bereits ein benutzerspezifischer Speicherort festgelegt wurde
    const hasCustomPath = localStorage.getItem(`storagePath_${username}`) !== null;
    
    // Nur fragen, wenn es der erste Login ist und noch kein Pfad festgelegt wurde
    return isFirstLogin && !hasCustomPath;
}

/**
 * Markiert den ersten Login eines Benutzers als abgeschlossen.
 * @param {string} username - Der Benutzername.
 */
function markFirstLoginCompleted(username) {
    if (!username) return;
    const userFirstLoginKey = `firstLogin_${username}`;
    localStorage.setItem(userFirstLoginKey, 'completed');
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
                    warn('Fehler beim Laden des gespeicherten Handles:', error);
                }
            }
            
            log('Kein DirectoryHandle vorhanden, kann nicht automatisch wiederhergestellt werden', 'warn');
            return null;
        }
    } catch (error) {
        error('Fehler beim Zugriff auf benutzerdefinierten Speicherort:', error);
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
            } catch (error) {
                error(`Fehler beim Migrieren von ${resourceName}:`, error);
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
// Track user interactions to enable directory picker
document.addEventListener('mousedown', function() {
    window._userInteractionActive = true;
    window._lastInteractionTime = Date.now();
    setTimeout(() => { window._userInteractionActive = false; }, 1000);
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

// Bei DOMContentLoaded prüfen, ob ein Speicherort konfiguriert ist
document.addEventListener('DOMContentLoaded', async () => {
    // Prüfen, ob ein Benutzer eingeloggt ist
    const currentUsername = localStorage.getItem('username');
    
    if (!isStoragePathConfigured(currentUsername)) {
        // Standard-Speicherort festlegen, wenn noch keiner gesetzt ist (ohne Benachrichtigung)
        log('Initialisiere Standard-Speicherort');
        await setStoragePath(DEFAULT_STORAGE_PATH, currentUsername);
    } else {
        // Zentrales Logging verwenden, wenn verfügbar
        const log = window.logger ? window.logger.info.bind(window.logger) : console.log;
        const warn = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
        const error = window.logger ? window.logger.error.bind(window.logger) : console.error;
        
        log('Konfigurierter Speicherort gefunden');
        
        // Versuchen, den DirectoryHandle zu verwenden, falls vorhanden
        if (isFileSystemAccessSupported() && directoryHandle) {
            log('Dateisystem-API wird unterstützt und DirectoryHandle vorhanden');
            try {
                // Versuchen, die Berechtigung vom Benutzer zu bekommen
                const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
                log(`Berechtigung für Verzeichnis: ${permission}`);
                
                if (permission !== 'granted') {
                    warn('Keine Schreibberechtigung für das Verzeichnis');
                }
            } catch (permError) {
                error(`Fehler beim Prüfen der Berechtigung: ${permError.message}`);
            }
        } else if (isFileSystemAccessSupported()) {
            warn('Dateisystem-API wird unterstützt, aber kein DirectoryHandle vorhanden');
            
            // Umfassende Wiederherstellungsversuche
            // 1. Versuchen, das DirectoryHandle aus IndexedDB zu laden mit standardmäßiger Methode
            if (window.restoreDirectoryHandle) {
                log('Versuche, gespeichertes DirectoryHandle wiederherzustellen...');
                try {
                    const restoredHandle = await window.restoreDirectoryHandle();
                    if (restoredHandle) {
                        log(`DirectoryHandle wiederhergestellt: ${restoredHandle.name}`);
                        directoryHandle = restoredHandle;
                    } else {
                        warn('Kein gespeichertes DirectoryHandle gefunden');
                        
                        // 2. Wenn das fehlschlägt, erweiterte Wiederherstellungsmethode versuchen
                        if (window.forceRestoreDirectoryHandle) {
                            log('Versuche erweiterte Wiederherstellungsmethode...');
                            try {
                                const forcedHandle = await window.forceRestoreDirectoryHandle();
                                if (forcedHandle) {
                                    log(`DirectoryHandle durch erweiterte Methode wiederhergestellt: ${forcedHandle.name}`);
                                    directoryHandle = forcedHandle;
                                } else {
                                    warn('Auch die erweiterte Wiederherstellungsmethode konnte kein Handle finden');
                                }
                            } catch (forceError) {
                                error(`Fehler bei der erweiterten Wiederherstellungsmethode: ${forceError.message}`);
                            }
                        }
                    }
                } catch (restoreError) {
                    error(`Fehler bei der Wiederherstellung des DirectoryHandle: ${restoreError.message}`);
                }
            }
        } else {
            log('Dateisystem-API wird nicht unterstützt, verwende localStorage');
        }
    }
});
