// storage.js - Verwaltung des Datenbank-Speicherorts für die LernApp

/**
 * Verwaltet den Speicherort für die Daten der LernApp.
 * Unterstützt lokale Speicherung, Cloud-Speicherorte (z.B. Dropbox) und native Dateisystemzugriffe.
 */

// Standardpfad für Daten (wenn kein benutzerdefinierter Pfad angegeben wurde)
const DEFAULT_STORAGE_PATH = 'lernapp_data';

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
 * @returns {boolean} True, wenn ein Speicherort konfiguriert wurde, sonst False.
 */
function isStoragePathConfigured() {
    return localStorage.getItem('storagePath') !== null;
}

/**
 * Gibt den aktuell konfigurierten Speicherort zurück.
 * @returns {string} Der konfigurierte Speicherort oder der Standardpfad.
 */
function getStoragePath() {
    return localStorage.getItem('storagePath') || DEFAULT_STORAGE_PATH;
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
 * Setzt einen neuen Speicherort.
 * @param {string|Object} path - Der neue Speicherort oder ein Objekt mit Pfad und Handle.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Setzen erfolgreich war.
 */
async function setStoragePath(path) {
    try {
        let pathString, handle;
        
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

        if (!pathString) {
            throw new Error('Kein gültiger Pfad angegeben');
        }
        
        localStorage.setItem('storagePath', pathString);
        
        // Überprüfen, ob der Pfad erfolgreich gespeichert wurde
        if (localStorage.getItem('storagePath') === pathString) {
            showSuccess(`Speicherort wurde auf "${pathString}" gesetzt.`);
            return true;
        } else {
            throw new Error('Fehler beim Speichern des Pfads');
        }
    } catch (error) {
        showError(`Fehler beim Setzen des Speicherorts: ${error.message}`);
        console.error('Fehler beim Setzen des Speicherorts:', error);
        return false;
    }
}

/**
 * Setzt den Speicherort auf den Standardpfad zurück.
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Zurücksetzen erfolgreich war.
 */
async function resetStoragePath() {
    directoryHandle = null;
    localStorage.removeItem('hasDirectoryHandle');
    return await setStoragePath(DEFAULT_STORAGE_PATH);
}

/**
 * Erstellt einen vollständigen Pfad für eine bestimmte Datei oder Ressource.
 * @param {string} resourceName - Der Name der Ressource (z.B. 'questions.json').
 * @returns {string} Der vollständige Pfad zur Ressource.
 */
function getResourcePath(resourceName) {
    const basePath = getStoragePath();
    return `${basePath}/${resourceName}`;
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
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Speichern erfolgreich war.
 */
async function saveData(resourceName, data) {
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
                
                return true;
            } catch (error) {
                console.error(`Fehler beim Speichern von ${resourceName} im Dateisystem:`, error);
                // Fallback auf localStorage
                localStorage.setItem(getResourcePath(resourceName), jsonData);
                return true;
            }
        } else {
            // Fallback: In einer reinen Browser-Umgebung speichern wir im localStorage
            localStorage.setItem(getResourcePath(resourceName), jsonData);
            return true;
        }
    } catch (error) {
        showError(`Fehler beim Speichern der Daten: ${error.message}`);
        console.error(`Fehler beim Speichern von ${resourceName}:`, error);
        return false;
    }
}

/**
 * Lädt Daten mit dem angegebenen Ressourcennamen aus dem konfigurierten Speicherort.
 * @param {string} resourceName - Der Name der Ressource (z.B. 'questions.json').
 * @param {Object|Array} defaultValue - Standardwert, falls keine Daten gefunden wurden.
 * @returns {Promise<Object|Array>} Promise, das zu den geladenen Daten aufgelöst wird.
 */
async function loadData(resourceName, defaultValue = null) {
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
                console.error(`Fehler beim Laden von ${resourceName} aus dem Dateisystem:`, error);
                // Fallback auf localStorage
            }
        }
        
        // Fallback: In einer reinen Browser-Umgebung laden wir aus dem localStorage
        const jsonData = localStorage.getItem(getResourcePath(resourceName));
        
        if (jsonData === null) {
            return defaultValue;
        }
        
        return JSON.parse(jsonData);
    } catch (error) {
        showError(`Fehler beim Laden der Daten: ${error.message}`);
        console.error(`Fehler beim Laden von ${resourceName}:`, error);
        return defaultValue;
    }
}

/**
 * Löscht Daten mit dem angegebenen Ressourcennamen aus dem konfigurierten Speicherort.
 * @param {string} resourceName - Der Name der Ressource (z.B. 'questions.json').
 * @returns {Promise<boolean>} Promise, das zu True aufgelöst wird, wenn das Löschen erfolgreich war.
 */
async function deleteData(resourceName) {
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
                localStorage.removeItem(getResourcePath(resourceName));
                
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
        localStorage.removeItem(getResourcePath(resourceName));
        
        return true;
    } catch (error) {
        showError(`Fehler beim Löschen der Daten: ${error.message}`);
        console.error(`Fehler beim Löschen von ${resourceName}:`, error);
        return false;
    }
}

/**
 * Listet alle verfügbaren Ressourcen im konfigurierten Speicherort auf.
 * @returns {Promise<Array<string>>} Promise, das zu einem Array von Ressourcennamen aufgelöst wird.
 */
async function listResources() {
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
        const path = getStoragePath();
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

// Globale Funktionen exportieren
window.isFileSystemAccessSupported = isFileSystemAccessSupported;
window.isStoragePathConfigured = isStoragePathConfigured;
window.getStoragePath = getStoragePath;
window.setStoragePath = setStoragePath;
window.resetStoragePath = resetStoragePath;
window.verifyStoragePath = verifyStoragePath;
window.openDirectoryPicker = openDirectoryPicker;
window.saveData = saveData;
window.loadData = loadData;
window.deleteData = deleteData;
window.listResources = listResources;

// Bei DOMContentLoaded prüfen, ob ein Speicherort konfiguriert ist
document.addEventListener('DOMContentLoaded', async () => {
    if (!isStoragePathConfigured()) {
        console.log('Kein Speicherort konfiguriert. Standard wird verwendet:', DEFAULT_STORAGE_PATH);
    } else {
        const path = getStoragePath();
        console.log('Konfigurierter Speicherort:', path);
        
        // Prüfen, ob wir einen gespeicherten Handle wiederherstellen können
        if (localStorage.getItem('hasDirectoryHandle') === 'true') {
            console.log('Ein Verzeichnis-Handle wurde zuvor verwendet, aber kann nicht direkt wiederhergestellt werden.');
            console.log('Der Benutzer muss den Ordner erneut auswählen, um den Handle zu erneuern.');
        }
        
        // Speicherort überprüfen
        const isValid = await verifyStoragePath();
        if (!isValid) {
            console.warn('Der konfigurierte Speicherort ist möglicherweise nicht zugänglich.');
        }
    }
});
