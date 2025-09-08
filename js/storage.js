// storage.js - Verwaltung des Datenbank-Speicherorts für d/**
 * Gibt den konfigurierten Speicherpfad zurück.
 * @param {string} [username] - Optional: Der Benutzername, für den der Pfad zurückgegeben werden soll.
 * @returns {string} Der konfigurierte Pfad oder der Standardpfad.
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
        
        // Pfad des ausgewählten Ordners (nur der Name ist verfügbar)
        const path = handle.name;
        
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
 * Versucht, einen bereits konfigurierten Verzeichnis-Handle zu öffnen, ohne einen Dialog zu zeigen.
 * @param {string} [username] - Optional: Der Benutzername, für den der Verzeichnis-Handle geöffnet werden soll.
 * @returns {Promise<Object|null>} Promise mit dem Verzeichnis-Handle oder null bei Fehler.
 */
async function getDirectoryHandle(username) {
    try {
        // Prüfen, ob die File System Access API unterstützt wird
        if (!isFileSystemAccessSupported()) {
            log('Dateisystem-API wird nicht unterstützt.');
            return null;
        }
        
        // Prüfen, ob wir bereits einen Handle haben
        if (directoryHandle) {
            try {
                // Versuchen, die Berechtigung zu erneuern
                const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    return directoryHandle;
                }
            } catch (error) {
                log('Fehler beim Zugriff auf den bestehenden Handle:', 'warn', error);
            }
        }
        
        // Wir haben keinen Handle oder er ist nicht mehr gültig
        // In diesem Fall können wir ohne Dialog nicht weitermachen
        log('Kein gültiger Handle vorhanden. Direkter Zugriff nicht möglich.');
        return null;
    } catch (error) {
        log('Fehler beim Zugriff auf den Verzeichnis-Handle:', 'error', error);
        return null;
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
        
        // Prüfen, ob es sich um ein Objekt mit Handle handelt
        if (typeof path === 'object' && path !== null) {
            pathString = path.path;
            handle = path.handle;
            
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
                } catch (error) {
                    log('Fehler beim Schreiben der Testdatei:', 'error', error);
                    showWarning('Der ausgewählte Ordner ist nicht beschreibbar. Bitte wählen Sie einen anderen Ordner aus.');
                    return false;
                }
            } else {
                // Ungültiges Handle - wir setzen nur den Pfad ohne Handle
                log('Ungültiges Directory Handle, verwende nur den Pfadnamen', 'warn');
                localStorage.removeItem('hasDirectoryHandle');
            }
        } else {
            pathString = path;
            localStorage.removeItem('hasDirectoryHandle');
        }

        if (!pathString || pathString.trim() === '') {
            throw new Error('Kein gültiger Pfad angegeben');
        }
        
        // Speicherpfad für den aktuellen oder angegebenen Benutzer setzen
        const currentUser = username || localStorage.getItem('username');
        if (currentUser) {
            localStorage.setItem(`storagePath_${currentUser}`, pathString);
            // Überprüfen, ob der Pfad erfolgreich gespeichert wurde
            if (localStorage.getItem(`storagePath_${currentUser}`) === pathString) {
                showSuccess(`Speicherort für Benutzer "${currentUser}" wurde auf "${pathString}" gesetzt.`);
                return true;
            }
        } else {
            // Fallback für nicht eingeloggte Benutzer oder alte Implementierung
            localStorage.setItem('storagePath', pathString);
            // Überprüfen, ob der Pfad erfolgreich gespeichert wurde
            if (localStorage.getItem('storagePath') === pathString) {
                showSuccess(`Speicherort wurde auf "${pathString}" gesetzt.`);
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
        
        // Debug-Ausgabe: Zeigen, wo die Daten gespeichert werden
        log(`Speichere ${resourceName}:`, 'info', {
            inFileSystem: !!directoryHandle,
            directoryHandleName: directoryHandle ? directoryHandle.name : 'keiner',
            fallbackToLocalStorage: !directoryHandle
        });
        
        // Wenn wir einen DirectoryHandle haben, versuchen wir die Datei dort zu speichern
        if (directoryHandle) {
            try {
                // Berechtigung prüfen/erneuern
                const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') {
                    throw new Error('Keine Schreibberechtigung für das Verzeichnis');
                }
                
                // Datei erstellen/öffnen
                const fileHandle = await directoryHandle.getFileHandle(resourceName, { create: true });
                
                // Schreibbaren Stream holen
                const writable = await fileHandle.createWritable();
                
                // Daten schreiben
                await writable.write(jsonData);
                
                // Stream schließen
                await writable.close();
                
                log(`Datei ${resourceName} erfolgreich im Dateisystem gespeichert`);
                
                return true;
            } catch (error) {
                log(`Fehler beim Speichern von ${resourceName} im Dateisystem:`, 'error', error);
                
                // Fallback auf localStorage mit Größenprüfung
                if (jsonData.length > 2000000) { // ~2MB Grenze
                    log(`Datei ${resourceName} ist zu groß für localStorage (${jsonData.length} Bytes)`, 'error');
                    if (window.showError) {
                        window.showError(`Die Datei ${resourceName} ist zu groß für den Browser-Speicher. Bitte verwenden Sie den Dateisystemzugriff.`);
                    }
                    return false;
                }
                
                try {
                    localStorage.setItem(getResourcePath(resourceName, username), jsonData);
                    log(`Datei ${resourceName} als Fallback im localStorage gespeichert`);
                    return true;
                } catch (storageError) {
                    if (storageError.name === 'QuotaExceededError') {
                        log(`Speicherplatz im Browser erschöpft für ${resourceName}`, 'error');
                        if (window.showError) {
                            window.showError(`Nicht genügend Speicherplatz im Browser. Bitte löschen Sie nicht benötigte Daten oder verwenden Sie den Dateisystemzugriff.`);
                        }
                    } else {
                        log(`Fehler beim Speichern im localStorage: ${storageError.message}`, 'error');
                        if (window.showError) {
                            window.showError(`Fehler beim Speichern: ${storageError.message}`);
                        }
                    }
                    return false;
                }
            }
        } else {
            // Fallback: In einer reinen Browser-Umgebung speichern wir im localStorage
            // Größenprüfung für localStorage
            if (jsonData.length > 2000000) { // ~2MB Grenze
                log(`Datei ${resourceName} ist zu groß für localStorage (${jsonData.length} Bytes)`, 'error');
                if (window.showError) {
                    window.showError(`Die Datei ${resourceName} ist zu groß für den Browser-Speicher. Bitte aktivieren Sie den Dateisystemzugriff.`);
                }
                return false;
            }
            
            try {
                localStorage.setItem(getResourcePath(resourceName, username), jsonData);
                return true;
            } catch (storageError) {
                if (storageError.name === 'QuotaExceededError') {
                    log(`Speicherplatz im Browser erschöpft für ${resourceName}`, 'error');
                    if (window.showError) {
                        window.showError(`Nicht genügend Speicherplatz im Browser. Bitte löschen Sie nicht benötigte Daten oder aktivieren Sie den Dateisystemzugriff.`);
                    }
                } else {
                    log(`Fehler beim Speichern im localStorage: ${storageError.message}`, 'error');
                    if (window.showError) {
                        window.showError(`Fehler beim Speichern: ${storageError.message}`);
                    }
                }
                return false;
            }
        }
    } catch (error) {
        // Vermeiden von Doppelmeldungen und Rekursionen
        if (error.name === 'QuotaExceededError') {
            log(`Speicherplatz im Browser erschöpft beim Speichern von ${resourceName}`, 'error');
            if (window.showError) {
                window.showError(`Nicht genügend Speicherplatz im Browser. Bitte löschen Sie nicht benötigte Daten oder aktivieren Sie den Dateisystemzugriff.`);
            }
        } else {
            log(`Fehler beim Speichern von ${resourceName}:`, 'error', error);
            if (window.showError) {
                window.showError(`Fehler beim Speichern der Daten: ${error.message}`);
            }
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
                // Berechtigung prüfen/erneuern
                const permission = await directoryHandle.requestPermission({ mode: 'read' });
                if (permission !== 'granted') {
                    throw new Error('Keine Leseberechtigung für das Verzeichnis');
                }
                
                // Versuchen, die Datei zu öffnen
                try {
                    const fileHandle = await directoryHandle.getFileHandle(resourceName);
                    const file = await fileHandle.getFile();
                    const text = await file.text();
                    
                    return JSON.parse(text);
                } catch (fileError) {
                    if (fileError.name === 'NotFoundError') {
                        // Die Datei existiert noch nicht
                        return defaultValue;
                    }
                    throw fileError;
                }
            } catch (error) {
                log(`Fehler beim Laden von ${resourceName} aus dem Dateisystem:`, 'error', error);
                
                // Fallback auf localStorage
            }
        }
        
        // Fallback: In einer reinen Browser-Umgebung laden wir aus dem localStorage
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
            return null;
        }
        
        // Wenn wir bereits ein Handle haben, versuchen wir es zu verwenden
        if (directoryHandle) {
            try {
                // Die Berechtigung wird automatisch angefragt, wenn nötig
                await directoryHandle.requestPermission({ mode: 'readwrite' });
                return directoryHandle;
            } catch (error) {
                console.log('Vorhandenes Handle konnte nicht verwendet werden:', error);
            }
        }
        
        // In diesem Fall muss der Benutzer den Ordner auswählen
        // Die showDirectoryPicker-Methode muss als Reaktion auf eine Benutzeraktion aufgerufen werden
        console.log('Benutzer muss Ordner auswählen');
        
        // Prüfen, ob diese Funktion explizit durch Benutzeraktion aufgerufen wurde
        // oder ob wir in einem expliziten Kontext zum Öffnen des Pickers aufgerufen wurden (z.B. durch Button-Klick)
        const isExplicitUserAction = window._userInteractionActive || 
                                     (window._lastInteractionTime && (Date.now() - window._lastInteractionTime < 1000)) ||
                                     window._forceDirectoryPicker === true;
        
        if (isExplicitUserAction) {
            try {
                const result = await openDirectoryPicker();
                if (result && result.handle) {
                    return result.handle;
                }
            } catch (error) {
                // Wenn der Fehler "Must be handling a user gesture" ist, zeigen wir eine bessere Fehlermeldung
                if (error.name === 'SecurityError' && error.message.includes('user gesture')) {
                    if (window.showNotification) {
                        window.showNotification('Bitte klicke auf "Ordner wählen", um deinen Datenordner auszuwählen', 'info');
                    }
                    console.warn('Die Ordnerauswahl benötigt eine direkte Benutzeraktion');
                } else {
                    console.error('Fehler bei der Ordnerauswahl:', error);
                }
            }
        } else {
            // Wir öffnen den Directory Picker NICHT automatisch
            // Stattdessen verwenden wir den Standard-Speicherort
            console.log('Verwende Standard-Speicherort, kein automatisches Öffnen des Ordnerdialogs');
        }
        
        return null;
    } catch (error) {
        console.error('Fehler beim Zugriff auf benutzerdefinierten Speicherort:', error);
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
            console.error('Kein DirectoryHandle vorhanden. Bitte wählen Sie zuerst einen Speicherort aus.');
            return false;
        }
        
        // Testdatei erstellen
        const testResult = await saveTestFile(directoryHandle);
        console.log('Testdatei erfolgreich erstellt:', testResult);
        
        // Jetzt versuchen, die Datei zu lesen
        try {
            const fileHandle = await directoryHandle.getFileHandle('lernapp_test.txt');
            const file = await fileHandle.getFile();
            const text = await file.text();
            console.log('Testdatei Inhalt:', text);
            return true;
        } catch (readError) {
            console.error('Fehler beim Lesen der Testdatei:', readError);
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Testen des Dateizugriffs:', error);
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
 * @returns {Promise<void>} Promise, das aufgelöst wird, wenn die Testdatei erstellt wurde.
 */
async function saveTestFile(dirHandle) {
    try {
        // Überprüfen, ob es sich um ein gültiges DirectoryHandle-Objekt handelt
        if (!dirHandle || typeof dirHandle !== 'object' || typeof dirHandle.getFileHandle !== 'function') {
            throw new Error('Ungültiges Directory Handle - Es werden keine Dateioperationen unterstützt');
        }

        // Berechtigung prüfen/erneuern, falls die Methode existiert
        if (typeof dirHandle.requestPermission === 'function') {
            const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                throw new Error('Keine Schreibberechtigung für das Verzeichnis');
            }
        } else {
            console.log('Keine requestPermission-Methode im Directory Handle - fahre ohne Berechtigungsprüfung fort');
            // Wenn requestPermission nicht unterstützt wird, versuchen wir trotzdem, eine Datei zu schreiben
            // Der Fehler wird dann beim Versuch, die Datei zu schreiben, auftreten, falls keine Berechtigung vorliegt
        }
        
        // Testdatei erstellen/öffnen
        const fileHandle = await dirHandle.getFileHandle('lernapp_test.txt', { create: true });
        
        // Schreibbaren Stream holen
        const writable = await fileHandle.createWritable();
        
        // Testdaten schreiben
        const testData = `LernApp Testzugriff - ${new Date().toISOString()}`;
        await writable.write(testData);
        
        // Stream schließen
        await writable.close();
        
        return true;
    } catch (error) {
        console.error('Fehler beim Erstellen der Testdatei:', error);
        throw error;
    }
}

/**
 * Führt eine Überprüfung durch, ob der benutzerdefinierten Speicherort funktioniert.
 * Diese Funktion ist vereinfacht, da die Berechtigung beim Zugriff automatisch angefragt wird.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn alles in Ordnung ist.
 */
async function checkStorage() {
    try {
        const username = localStorage.getItem('username');
        if (!username) return false; // Nicht eingeloggt
        
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
        console.error('Fehler bei der Speicherort-Überprüfung:', error);
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
        console.log(`${resources.length} Ressourcen werden migriert:`, resources);
        
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
                console.error(`Fehler beim Migrieren von ${resourceName}:`, error);
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
        console.error('Fehler bei der Speicherort-Migration:', error);
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
        console.log('Initialisiere Standard-Speicherort');
        await setStoragePath(DEFAULT_STORAGE_PATH, currentUsername);
    } else {
        const path = getStoragePath(currentUsername);
        console.log('Konfigurierter Speicherort gefunden');
        
        // Wenn ein Verzeichnis-Handle zuvor verwendet wurde, setzen wir eine Flag
        // Aber öffnen NICHT automatisch den Ordner-Dialog
        if (localStorage.getItem('hasDirectoryHandle') === 'true') {
            console.log('Ein Verzeichnis-Handle wurde zuvor verwendet');
            
            // Wir setzen eine Variable, die beim EXPLIZITEN Aufruf von getCustomDirectoryHandle
            // verwendet werden kann, aber starten KEINEN automatischen Dialog
            window.hadDirectoryHandle = true;
        }
    }
});
