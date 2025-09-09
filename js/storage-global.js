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
        const request = indexedDB.open('LernAppDirectoryHandles', 3);
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
        const db = await openHandleDatabase();
        const handle = await getHandleFromDatabase(db);
        if (!handle) {
            console.warn(`⚠️ Kein gespeichertes DirectoryHandle für Benutzer ${username} gefunden`);
            return null;
        }
        try {
            if (!handle || typeof handle.requestPermission !== 'function') {
                throw new Error('Ungültiges DirectoryHandle');
            }
            const permission = await handle.requestPermission();
            if (permission !== 'granted') {
                console.warn('⚠️ Berechtigung zum Zugriff auf das DirectoryHandle wurde verweigert');
                return false;
            }
        } catch (permissionError) {
            console.error('Fehler beim Anfordern der Berechtigung:', permissionError);
            return false;
        }
        window.directoryHandle = handle;
        return true;
    } catch (error) {
        console.error('Fehler bei der Wiederherstellung des DirectoryHandle:', error);
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
    // ...implementiere Zugriff auf IndexedDB...
    // Beispiel: window.getHandleFromDatabase() für DirectoryHandle, sonst eigene Logik
    // Hier Dummy-Implementierung:
    if (window.getHandleFromDatabase) {
        return await window.getHandleFromDatabase(null, key);
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
    // ...implementiere Zugriff auf IndexedDB...
    if (window.storeDirectoryHandle) {
        await window.storeDirectoryHandle(data, key);
    }
    // Fallback: localStorage
    localStorage.setItem(key, JSON.stringify(data));
}

// Weitere zentrale Storage-Funktionen können hier ergänzt werden
