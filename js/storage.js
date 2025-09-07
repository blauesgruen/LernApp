// storage.js - Verwaltung des Datenbank-Speicherorts für die LernApp

/**
 * Verwaltet den Speicherort für die Daten der LernApp.
 * Unterstützt lokale Speicherung, Cloud-Speicherorte (z.B. Dropbox) und native Dateisystemzugriffe.
 */

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
            console.log('Benutzer hat den Ordnerauswahl-Dialog abgebrochen.');
            return null;
        }
        console.error('Fehler beim Öffnen des Ordnerauswahl-Dialogs:', error);
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
            console.log('Dateisystem-API wird nicht unterstützt.');
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
                console.warn('Fehler beim Zugriff auf den bestehenden Handle:', error);
            }
        }
        
        // Wir haben keinen Handle oder er ist nicht mehr gültig
        // In diesem Fall können wir ohne Dialog nicht weitermachen
        console.log('Kein gültiger Handle vorhanden. Direkter Zugriff nicht möglich.');
        return null;
    } catch (error) {
        console.error('Fehler beim Zugriff auf den Verzeichnis-Handle:', error);
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
            
            // Handle für späteren Zugriff speichern
            directoryHandle = handle;
            
            // Serialisieren des Handles ist nicht möglich, aber wir merken uns, dass wir einen Handle haben
            localStorage.setItem('hasDirectoryHandle', 'true');
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
        console.error('Fehler beim Setzen des Speicherorts:', error);
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
                console.warn('Fehler beim Überprüfen des DirectoryHandle:', error);
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
        console.error('Fehler beim Überprüfen des Speicherorts:', error);
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
                
                // Handle-Erneuerung ist nicht mehr nötig, da wir erfolgreich waren
                localStorage.removeItem('needsHandleRenewal');
                
                return true;
            } catch (error) {
                console.error(`Fehler beim Speichern von ${resourceName} im Dateisystem:`, error);
                
                // Prüfen, ob wir eine Aufforderung zur Handle-Erneuerung anzeigen sollen
                if (localStorage.getItem('needsHandleRenewal') === 'true' && window.showInfo) {
                    // Handle-Erneuerung erforderlich - nur einmal anzeigen
                    window.showInfo('Für den Dateizugriff ist es erforderlich, den Speicherordner neu auszuwählen. Bitte öffnen Sie die Profileinstellungen.', 8000);
                    localStorage.setItem('needsHandleRenewal', 'shown');
                }
                
                // Fallback auf localStorage
                localStorage.setItem(getResourcePath(resourceName, username), jsonData);
                return true;
            }
        } else {
            // Fallback: In einer reinen Browser-Umgebung speichern wir im localStorage
            localStorage.setItem(getResourcePath(resourceName, username), jsonData);
            return true;
        }
    } catch (error) {
        if (window.showError) {
            window.showError(`Fehler beim Speichern der Daten: ${error.message}`);
        }
        console.error(`Fehler beim Speichern von ${resourceName}:`, error);
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
                    
                    // Handle-Erneuerung ist nicht mehr nötig, da wir erfolgreich waren
                    localStorage.removeItem('needsHandleRenewal');
                    
                    return JSON.parse(text);
                } catch (fileError) {
                    if (fileError.name === 'NotFoundError') {
                        // Die Datei existiert noch nicht
                        return defaultValue;
                    }
                    throw fileError;
                }
            } catch (error) {
                console.error(`Fehler beim Laden von ${resourceName} aus dem Dateisystem:`, error);
                
                // Prüfen, ob wir eine Aufforderung zur Handle-Erneuerung anzeigen sollen
                if (localStorage.getItem('needsHandleRenewal') === 'true' && window.showInfo) {
                    // Handle-Erneuerung erforderlich - nur einmal anzeigen
                    window.showInfo('Für den Dateizugriff ist es erforderlich, den Speicherordner neu auszuwählen. Bitte öffnen Sie die Profileinstellungen.', 8000);
                    localStorage.setItem('needsHandleRenewal', 'shown');
                }
                
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
    // Wenn kein Speicherort konfiguriert ist, ist keine Auswahl nötig (wird automatisch Standard verwendet)
    if (!isStoragePathConfigured(username)) {
        return false;
    }
    
    // Wenn wir keinen Handle hatten, brauchen wir auch keinen neuen zu wählen
    if (localStorage.getItem('hasDirectoryHandle') !== 'true') {
        return false;
    }
    
    // Wenn der Handle erneuert werden muss und wichtige Aktionen geplant sind,
    // sollte der Benutzer den Ordner neu auswählen
    return localStorage.getItem('needsHandleRenewal') === 'true';
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
window.saveData = saveData;
window.loadData = loadData;
window.deleteData = deleteData;
window.listResources = listResources;
window.needsStorageConfiguration = needsStorageConfiguration;
window.isDefaultPath = isDefaultPath;

// Bei DOMContentLoaded prüfen, ob ein Speicherort konfiguriert ist
document.addEventListener('DOMContentLoaded', async () => {
    // Prüfen, ob ein Benutzer eingeloggt ist
    const currentUsername = localStorage.getItem('username');
    
    if (!isStoragePathConfigured(currentUsername)) {
        console.log('Kein Speicherort konfiguriert. Standard wird verwendet:', DEFAULT_STORAGE_PATH);
        
        // Standard-Speicherort festlegen, wenn noch keiner gesetzt ist
        await setStoragePath(DEFAULT_STORAGE_PATH, currentUsername);
    } else {
        const path = getStoragePath(currentUsername);
        console.log('Konfigurierter Speicherort:', path);
        
        // Prüfen, ob wir einen gespeicherten Handle wiederherstellen können
        if (localStorage.getItem('hasDirectoryHandle') === 'true') {
            console.log('Ein Verzeichnis-Handle wurde zuvor verwendet, aber kann nicht direkt wiederhergestellt werden.');
            
            // Nur auf Seiten, die aktiv Dateizugriff benötigen, eine Meldung anzeigen
            // und auch nur, wenn der Benutzer explizit eine Aktion ausführt, die den Handle benötigt
            
            // In localStorage merken, dass wir wissen, dass der Handle erneuert werden muss
            localStorage.setItem('needsHandleRenewal', 'true');
            
            // Den Hinweis speichern, aber nicht direkt anzeigen - nur wenn nötig
            console.log('Handle-Erneuerung wird bei Bedarf angefordert.');
        }
        
        // Speicherort überprüfen
        const isValid = await verifyStoragePath();
        if (!isValid) {
            console.warn('Der konfigurierte Speicherort ist möglicherweise nicht zugänglich.');
            
            // Wenn der Speicherort ungültig ist, setzen wir auf den Standard zurück
            if (window.showWarning) {
                window.showWarning('Der konfigurierte Speicherort ist nicht zugänglich. Standardspeicherort wird verwendet.', 8000);
            }
            await resetStoragePath(currentUsername);
        }
    }
});
