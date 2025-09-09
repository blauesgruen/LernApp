// Zentrale Storage-Funktionen für LernApp
// Diese Datei wird im Header jeder Seite eingebunden und stellt die wichtigsten Funktionen global bereit

/**
 * Gibt den aktuellen Benutzernamen zurück
 */
function getCurrentUsername() {
    return localStorage.getItem('username') || 'default';
}
window.getCurrentUsername = getCurrentUsername;

/**
 * Generiert den benutzerspezifischen Schlüssel für das DirectoryHandle
 */
function getUserSpecificHandleKey() {
    const username = getCurrentUsername();
    return `dir-handle-${username}`;
}
window.getUserSpecificHandleKey = getUserSpecificHandleKey;

/**
 * Öffnet die IndexedDB für Directory Handles
 */
async function openHandleDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LernAppDirectoryHandles', 4); // Version 4, damit alle ObjectStores verfügbar sind
        request.onerror = (event) => reject(event.target.error);
        request.onsuccess = (event) => resolve(event.target.result);
    });
}
window.openHandleDatabase = openHandleDatabase;

/**
 * Holt das gespeicherte Handle aus der Datenbank
 */
async function getHandleFromDatabase(db) {
    return new Promise((resolve, reject) => {
        const key = getUserSpecificHandleKey();
        const transaction = db.transaction('lernapp-directory-handles', 'readonly');
        const store = transaction.objectStore('lernapp-directory-handles');
        const request = store.get(key);
        request.onerror = (event) => resolve(null);
        request.onsuccess = () => resolve(request.result || null);
    });
}
window.getHandleFromDatabase = getHandleFromDatabase;

/**
 * Löscht das Handle aus der Datenbank
 */
async function clearHandleFromDatabase() {
    const db = await openHandleDatabase();
    const key = getUserSpecificHandleKey();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('lernapp-directory-handles', 'readwrite');
        const store = transaction.objectStore('lernapp-directory-handles');
        const request = store.delete(key);
        request.onerror = (event) => reject(event.target.error);
        request.onsuccess = () => resolve(true);
    });
}
window.clearHandleFromDatabase = clearHandleFromDatabase;

/**
 * Speichert ein DirectoryHandle in der Datenbank
 */
async function storeDirectoryHandle(handle) {
    const db = await openHandleDatabase();
    const key = getUserSpecificHandleKey();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('lernapp-directory-handles', 'readwrite');
        const store = transaction.objectStore('lernapp-directory-handles');
        const request = store.put(handle, key);
        request.onerror = (event) => reject(event.target.error);
        request.onsuccess = () => resolve(true);
    });
}
window.storeDirectoryHandle = storeDirectoryHandle;

/**
 * Stellt das DirectoryHandle aus IndexedDB wieder her
 */
async function restoreDirectoryHandle() {
    try {
        const username = getCurrentUsername();
        console.log(`🔍 [restoreDirectoryHandle] Starte Wiederherstellung für Benutzer: ${username}`);
        const db = await openHandleDatabase();
        const handle = await getHandleFromDatabase(db);
        console.log('🔍 [restoreDirectoryHandle] Aus Datenbank geladenes Handle:', handle);
        // Prüfe, ob das Handle gültig ist (echtes DirectoryHandle)
        if (!handle || typeof handle.getFileHandle !== 'function') {
            console.warn('⚠️ [restoreDirectoryHandle] Das gespeicherte DirectoryHandle ist nicht mehr gültig. Bitte wählen Sie das Verzeichnis erneut aus.');
            window.directoryHandle = null;
            // Optional: UI-Trigger oder Hinweis für erneute Auswahl
            return false;
        }
        try {
            const permission = await handle.requestPermission();
            console.log(`🔑 [restoreDirectoryHandle] Berechtigungsabfrage Ergebnis: ${permission}`);
            if (permission !== 'granted') {
                console.warn('⚠️ [restoreDirectoryHandle] Berechtigung zum Zugriff auf das DirectoryHandle wurde verweigert');
                return false;
            }
        } catch (permissionError) {
            console.error('❌ [restoreDirectoryHandle] Fehler beim Anfordern der Berechtigung:', permissionError);
            return false;
        }
        window.directoryHandle = handle;
        console.log('✅ [restoreDirectoryHandle] DirectoryHandle erfolgreich wiederhergestellt und global gesetzt.');
        return true;
    } catch (error) {
        console.error('❌ [restoreDirectoryHandle] Fehler bei der Wiederherstellung des DirectoryHandle:', error);
        return false;
    }
}
window.restoreDirectoryHandle = restoreDirectoryHandle;

/**
 * Lädt Daten aus dem lokalen Speicher und ggf. aus dem externen Verzeichnis
 * @param {string} key - Dateiname oder Schlüssel (z.B. 'categories.json')
 * @returns {Promise<any>} Die geladenen Daten
 */
window.loadData = async function(key) {
    // 1. Lokal aus IndexedDB laden
    let localData = await getFromIndexedDB(key);
    // 2. Falls DirectoryHandle vorhanden, auch aus Verzeichnis laden
    let externalData = null;
    if (window.directoryHandle) {
        try {
            const fileHandle = await window.directoryHandle.getFileHandle(key);
            const file = await fileHandle.getFile();
            const text = await file.text();
            externalData = JSON.parse(text);
        } catch (e) {
            // Datei existiert evtl. noch nicht
            externalData = null;
        }
    }
    // 3. Rückgabe: Priorisiere extern, falls vorhanden, sonst lokal
    return externalData !== null ? externalData : localData;
};

/**
 * Speichert Daten lokal und ggf. im externen Verzeichnis
 * @param {string} key - Dateiname oder Schlüssel
 * @param {any} data - Zu speichernde Daten
 * @returns {Promise<void>}
 */
window.saveData = async function(key, data) {
    // 1. Lokal in IndexedDB speichern
    await saveToIndexedDB(key, data);
    // 2. Falls DirectoryHandle vorhanden, auch im Verzeichnis speichern
    if (window.directoryHandle) {
        try {
            const fileHandle = await window.directoryHandle.getFileHandle(key, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } catch (e) {
            console.error('Fehler beim Speichern im externen Verzeichnis:', e);
        }
    }
};

/**
 * Synchronisiert die Daten zwischen lokalem Speicher und externem Verzeichnis
 * (letzte Änderung gewinnt)
 * @returns {Promise<void>}
 */
window.syncStorage = async function() {
    // Beispiel: Synchronisiere Kategorien und Gruppen
    const keys = ['categories.json', 'groups.json', 'questions.json', 'users.json'];
    for (const key of keys) {
        let localData = await getFromIndexedDB(key);
        let externalData = null;
        let externalDate = 0, localDate = 0;
        if (window.directoryHandle) {
            try {
                const fileHandle = await window.directoryHandle.getFileHandle(key);
                const file = await fileHandle.getFile();
                const text = await file.text();
                externalData = JSON.parse(text);
                externalDate = externalData && externalData._lastModified ? externalData._lastModified : 0;
            } catch (e) {
                externalData = null;
            }
        }
        localDate = localData && localData._lastModified ? localData._lastModified : 0;
        // Vergleiche Zeitstempel
        if (externalDate > localDate) {
            // Externe Version ist neuer → lokal überschreiben
            await saveToIndexedDB(key, externalData);
        } else if (localDate > externalDate && window.directoryHandle) {
            // Lokale Version ist neuer → extern überschreiben
            await window.saveData(key, localData);
        }
        // Falls beide null, ignoriere
    }
};

/**
 * Hilfsfunktion: Daten aus IndexedDB laden
 */
async function getFromIndexedDB(key) {
    // Trennung: DirectoryHandle nur mit speziellem Schlüssel, sonst eigene ObjectStore für Daten
    if (key.startsWith('dir-handle-')) {
        if (window.openHandleDatabase && window.getHandleFromDatabase) {
            const db = await window.openHandleDatabase();
            return await window.getHandleFromDatabase(db, key);
        }
    } else {
        // Für alle anderen Daten: eigene ObjectStore 'lernapp-data'
        if (window.openHandleDatabase) {
            const db = await window.openHandleDatabase();
            // Prüfe, ob ObjectStore existiert
            if (!db.objectStoreNames.contains('lernapp-data')) {
                // Store existiert nicht, lege ihn an
                db.close();
                await new Promise((resolve, reject) => {
                    const req = indexedDB.open('LernAppDirectoryHandles', 4);
                    req.onupgradeneeded = (event) => {
                        const db2 = event.target.result;
                        if (!db2.objectStoreNames.contains('lernapp-data')) {
                            db2.createObjectStore('lernapp-data');
                        }
                    };
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject();
                });
                return null;
            }
            return new Promise((resolve, reject) => {
                const transaction = db.transaction('lernapp-data', 'readonly');
                const store = transaction.objectStore('lernapp-data');
                const request = store.get(key);
                request.onerror = (event) => resolve(null);
                request.onsuccess = () => resolve(request.result || null);
            });
        }
    }
    // Fallback: localStorage
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
}

/**
 * Hilfsfunktion: Daten in IndexedDB speichern
 */
async function saveToIndexedDB(key, data) {
    // Füge Zeitstempel hinzu
    if (typeof data === 'object' && data !== null) {
        data._lastModified = Date.now();
    }
    // Trennung: DirectoryHandle nur mit speziellem Schlüssel, sonst eigene ObjectStore für Daten
    if (!key.startsWith('dir-handle-')) {
        if (window.openHandleDatabase) {
            const db = await window.openHandleDatabase();
            // Prüfe, ob ObjectStore existiert
            if (!db.objectStoreNames.contains('lernapp-data')) {
                db.close();
                await new Promise((resolve, reject) => {
                    const req = indexedDB.open('LernAppDirectoryHandles', 4);
                    req.onupgradeneeded = (event) => {
                        const db2 = event.target.result;
                        if (!db2.objectStoreNames.contains('lernapp-data')) {
                            db2.createObjectStore('lernapp-data');
                        }
                    };
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject();
                });
                return;
            }
            return new Promise((resolve, reject) => {
                const transaction = db.transaction('lernapp-data', 'readwrite');
                const store = transaction.objectStore('lernapp-data');
                const request = store.put(data, key);
                request.onerror = (event) => reject(event.target.error);
                request.onsuccess = () => resolve(true);
            });
        }
    }
    // Fallback: localStorage
    localStorage.setItem(key, JSON.stringify(data));
}

// Weitere zentrale Storage-Funktionen können hier ergänzt werden
