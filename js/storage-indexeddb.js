/**
 * storage-indexeddb.js - Fallback-Speicher für große Daten
 * 
 * Dieses Modul bietet eine Lösung für Daten, die zu groß für localStorage sind,
 * indem es IndexedDB als Fallback-Speicher verwendet.
 */

// Guard gegen mehrfaches Laden
if (typeof window.STORAGE_INDEXEDDB_LOADED !== 'undefined') {
    console.warn('⚠️ IndexedDB-Speicher wurde bereits geladen. Doppelte Initialisierung vermieden.');
} else {
    window.STORAGE_INDEXEDDB_LOADED = true;

    // Konfiguration
    const IDB_CONFIG = {
        dbName: 'LernAppDataStore',
        version: 1,
        storeName: 'lernapp-data',
        keyPrefix: 'data_'
    };

/**
 * Initialisiert die IndexedDB Datenbank
 * @returns {Promise<IDBDatabase>} Die initialisierte Datenbank
 */
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_CONFIG.dbName, IDB_CONFIG.version);
        
        request.onerror = (event) => {
            console.error('Fehler beim Öffnen der IndexedDB:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Erstelle Object Store, wenn er noch nicht existiert
            if (!db.objectStoreNames.contains(IDB_CONFIG.storeName)) {
                db.createObjectStore(IDB_CONFIG.storeName);
                console.log('IndexedDB Object Store für große Daten erstellt');
            }
        };
    });
}

/**
 * Speichert Daten in IndexedDB
 * @param {string} resourceName - Name der Ressource
 * @param {string} data - JSON-String der Daten
 * @param {string} [username] - Optional: Benutzername
 * @returns {Promise<boolean>} True, wenn erfolgreich
 */
async function saveToIndexedDB(resourceName, data, username = null) {
    try {
        const db = await initDatabase();
        const key = getStorageKey(resourceName, username);
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([IDB_CONFIG.storeName], 'readwrite');
            const objectStore = transaction.objectStore(IDB_CONFIG.storeName);
            
            const request = objectStore.put(data, key);
            
            request.onsuccess = () => {
                console.log(`Daten erfolgreich in IndexedDB gespeichert: ${key}`);
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error('Fehler beim Speichern in IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Fehler bei IndexedDB-Operation:', error);
        throw error;
    }
}

/**
 * Lädt Daten aus IndexedDB
 * @param {string} resourceName - Name der Ressource
 * @param {string} [username] - Optional: Benutzername
 * @returns {Promise<string>} Die geladenen Daten als JSON-String
 */
async function loadFromIndexedDB(resourceName, username = null) {
    try {
        const db = await initDatabase();
        const key = getStorageKey(resourceName, username);
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([IDB_CONFIG.storeName], 'readonly');
            const objectStore = transaction.objectStore(IDB_CONFIG.storeName);
            
            const request = objectStore.get(key);
            
            request.onsuccess = (event) => {
                if (event.target.result) {
                    console.log(`Daten erfolgreich aus IndexedDB geladen: ${key}`);
                    resolve(event.target.result);
                } else {
                    console.log(`Keine Daten in IndexedDB gefunden für: ${key}`);
                    resolve(null);
                }
            };
            
            request.onerror = (event) => {
                console.error('Fehler beim Laden aus IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Fehler bei IndexedDB-Operation:', error);
        throw error;
    }
}

/**
 * Löscht Daten aus IndexedDB
 * @param {string} resourceName - Name der Ressource
 * @param {string} [username] - Optional: Benutzername
 * @returns {Promise<boolean>} True, wenn erfolgreich
 */
async function deleteFromIndexedDB(resourceName, username = null) {
    try {
        const db = await initDatabase();
        const key = getStorageKey(resourceName, username);
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([IDB_CONFIG.storeName], 'readwrite');
            const objectStore = transaction.objectStore(IDB_CONFIG.storeName);
            
            const request = objectStore.delete(key);
            
            request.onsuccess = () => {
                console.log(`Daten erfolgreich aus IndexedDB gelöscht: ${key}`);
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error('Fehler beim Löschen aus IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('Fehler bei IndexedDB-Operation:', error);
        throw error;
    }
}

/**
 * Erstellt einen eindeutigen Schlüssel für die Daten
 * @param {string} resourceName - Name der Ressource
 * @param {string} [username] - Optional: Benutzername
 * @returns {string} Der Schlüssel
 */
function getStorageKey(resourceName, username) {
    if (username) {
        return `${IDB_CONFIG.keyPrefix}${username}_${resourceName}`;
    }
    return `${IDB_CONFIG.keyPrefix}${resourceName}`;
}

/**
 * Prüft, ob IndexedDB verfügbar ist
 * @returns {boolean} True, wenn IndexedDB verfügbar ist
 */
function isIndexedDBSupported() {
    return window.indexedDB !== undefined;
}

/**
 * Komprimiert einen String mit LZString
 * @param {string} data - Der zu komprimierende String
 * @returns {Promise<string>} Der komprimierte String
 */
async function compressData(data) {
    // Wenn LZString nicht verfügbar ist, versuche es dynamisch zu laden
    if (!window.LZString) {
        try {
            console.log('LZString nicht verfügbar, versuche es zu laden...');
            await loadLZString();
        } catch (loadError) {
            console.log('Konnte LZString nicht laden:', loadError.message);
            // Markiere die Daten als unkomprimiert
            return data;
        }
    }
    
    try {
        const compressed = window.LZString.compress(data);
        // Markiere die Daten als komprimiert
        return `compressedData:${compressed}`;
    } catch (compressError) {
        console.log('Komprimierung fehlgeschlagen:', compressError.message);
        return data;
    }
}

/**
 * Dekomprimiert einen String mit LZString
 * @param {string} compressedData - Der komprimierte String
 * @returns {Promise<string>} Der dekomprimierte String
 */
async function decompressData(compressedData) {
    // Wenn LZString nicht verfügbar ist, versuche es dynamisch zu laden
    if (!window.LZString) {
        try {
            console.log('LZString nicht verfügbar, versuche es zu laden...');
            await loadLZString();
        } catch (loadError) {
            console.log('Konnte LZString nicht laden:', loadError.message);
            return compressedData;
        }
    }
    
    try {
        return window.LZString.decompress(compressedData);
    } catch (decompressError) {
        console.log('Dekomprimierung fehlgeschlagen:', decompressError.message);
        return compressedData;
    }
}

/**
 * Lädt die LZString-Bibliothek dynamisch
 * @returns {Promise<void>}
 */
function loadLZString() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js';
        script.onload = () => {
            console.log('LZString erfolgreich geladen');
            resolve();
        };
        script.onerror = (error) => {
            console.error('Fehler beim Laden von LZString:', error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

// Exportiere Funktionen global
window.saveToIndexedDB = saveToIndexedDB;
window.loadFromIndexedDB = loadFromIndexedDB;
window.deleteFromIndexedDB = deleteFromIndexedDB;
window.compressData = compressData;
window.decompressData = decompressData;
window.isIndexedDBSupported = isIndexedDBSupported;

console.log('IndexedDB Fallback-Speicher für große Daten geladen');

// Überprüfe IndexedDB-Unterstützung beim Laden
if (isIndexedDBSupported()) {
    console.log('IndexedDB wird vom Browser unterstützt');
} else {
    console.warn('IndexedDB wird von diesem Browser nicht unterstützt. Großer Datenspeicher nicht verfügbar.');
}

} // Ende des Guards gegen mehrfaches Laden
