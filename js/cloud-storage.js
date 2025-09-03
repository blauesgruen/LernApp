// cloud-storage.js
// Utility für Cloud-Speicher via File System Access API
// Speichert und lädt die Datenbank-Datei im gewählten Verzeichnis

// Deutsche Kommentare für LernApp

const CLOUD_DB_FILENAME = 'lernapp-datenbank.json';

export const cloudStorage = {
    // Verzeichnis-Handle persistent speichern
    async chooseDirectory() {
        if (!window.showDirectoryPicker) {
            alert('Ihr Browser unterstützt die Verzeichnis-Auswahl nicht. Bitte verwenden Sie einen aktuellen Chromium-Browser.');
            return null;
        }
        try {
            const dirHandle = await window.showDirectoryPicker();
            await this.saveDirectoryHandle(dirHandle);
            return dirHandle;
        } catch (e) {
            console.error('Verzeichnis-Auswahl abgebrochen oder fehlgeschlagen:', e);
            return null;
        }
    },
    async saveDirectoryHandle(dirHandle) {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            await navigator.storage.persist();
        }
        // IndexedDB für Handles
        if (window.indexedDB) {
            const db = await this.openDB();
            const tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(dirHandle, 'cloudDir');
            await tx.done;
        }
    },
    async getDirectoryHandle() {
        if (window.indexedDB) {
            const db = await this.openDB();
            const tx = db.transaction('handles', 'readonly');
            const handle = await tx.objectStore('handles').get('cloudDir');
            await tx.done;
            return handle || null;
        }
        return null;
    },
    async openDB() {
        // Minimal IndexedDB Wrapper
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.open('lernapp-cloud', 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('handles');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    async saveData(data) {
        const dirHandle = await this.getDirectoryHandle();
        if (!dirHandle) throw new Error('Kein Cloud-Verzeichnis gewählt!');
        const fileHandle = await dirHandle.getFileHandle(CLOUD_DB_FILENAME, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    },
    async loadData() {
        const dirHandle = await this.getDirectoryHandle();
        if (!dirHandle) throw new Error('Kein Cloud-Verzeichnis gewählt!');
        try {
            const fileHandle = await dirHandle.getFileHandle(CLOUD_DB_FILENAME);
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch (e) {
            // Datei existiert noch nicht
            return null;
        }
    },
    async clearCloudHandle() {
        if (window.indexedDB) {
            const db = await this.openDB();
            const tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').delete('cloudDir');
            await tx.done;
        }
    }
};
