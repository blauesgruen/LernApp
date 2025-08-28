// Lokale und Cloud-Speicherung für LernApp
// Moderne Browser: File System Access API (Chrome, Edge, Opera, ...)
// Fallback: Datei-Export/Import

export class LocalCloudStorage {
    constructor() {
        this.dirHandle = null;
        this.fileName = 'lernapp-datenbank.json';
        this.supported = 'showDirectoryPicker' in window;
        this.lastData = null;
        this.loadDirHandle();
    }

    async chooseDirectory(silent) {
        if (!this.supported) {
            // Kein alert mehr, stattdessen Modal-Logik im App-Flow
            return false;
        }
        try {
            this.dirHandle = await window.showDirectoryPicker();
            await this.saveDirHandle();
            // Nach Ordnerwahl: Versuche Datenbank zu laden, aber ignoriere "nicht gefunden"
            let loaded = false;
            try {
                await this.loadData();
                loaded = true;
            } catch (err) {
                // Nur still ignorieren, wenn Datei nicht existiert
                if (err && err.message && err.message.match(/kein speicherort gewählt|not found|existiert nicht|not found/i)) {
                    // still
                } else if (err && err.name === 'NotFoundError') {
                    // still
                } else {
                    // Andere Fehler ggf. loggen
                    console.warn('Fehler beim Laden der Datenbank nach Ordnerwahl:', err);
                }
            }
            if (window.app && window.app.updateStorageLocationInfo) {
                window.app.updateStorageLocationInfo();
            }
            return true;
        } catch (e) {
            // Kein alert mehr, stilles Scheitern
            if (window.app && window.app.updateStorageLocationInfo) {
                window.app.updateStorageLocationInfo();
            }
            return false;
        }
    }

    async saveData(data) {
        if (!this.dirHandle) {
            throw new Error('Kein Speicherort gewählt.');
        }
        this.lastData = data;
        const fileHandle = await this.dirHandle.getFileHandle(this.fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    }

    async loadData() {
        if (!this.dirHandle) {
            throw new Error('Kein Speicherort gewählt.');
        }
        const fileHandle = await this.dirHandle.getFileHandle(this.fileName, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        this.lastData = JSON.parse(text);
        return this.lastData;
    }

    async saveDirHandle() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            await navigator.storage.persist();
        }
        if ('showDirectoryPicker' in window && window.localStorage) {
            const id = await this.dirHandle.requestPermission({ mode: 'readwrite' });
            if (id === 'granted') {
                window.localStorage.setItem('lernapp_dir', await this.serializeHandle(this.dirHandle));
            }
        }
    }

    async loadDirHandle() {
        if (!this.supported || !window.localStorage) return;
        const handleStr = window.localStorage.getItem('lernapp_dir');
        if (handleStr) {
            try {
                this.dirHandle = await this.deserializeHandle(handleStr);
            } catch (e) {
                this.dirHandle = null;
            }
        }
        if (window.app && window.app.updateStorageLocationInfo) {
            window.app.updateStorageLocationInfo();
        }
    }

    // Serialisierung/Deserialisierung für FileSystemDirectoryHandle
    async serializeHandle(handle) {
        if ('showDirectoryPicker' in window && window.localStorage) {
            return await window.showSaveFilePicker ? await handle.name : '';
        }
        return '';
    }
    async deserializeHandle(str) {
        // In der Praxis: File System Access API erlaubt keine echte Serialisierung (Sicherheitsgründe)
        // Daher muss der Nutzer nach Browser-Neustart ggf. erneut den Ordner wählen
        return null;
    }

    // Fallback: Datei-Export
    static exportData(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lernapp-datenbank.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Fallback: Datei-Import
    static async importData() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return reject('Keine Datei gewählt');
                const text = await file.text();
                try {
                    const data = JSON.parse(text);
                    resolve(data);
                } catch (err) {
                    reject('Datei ist keine gültige LernApp-Datenbank');
                }
            };
            input.click();
        });
    }

    // Automatisches Speichern nach jeder Änderung
    async saveDataAuto(data) {
        if (!this.dirHandle) return;
        try {
            await this.saveData(data);
        } catch (e) {
            // Fehler beim automatischen Speichern ignorieren (z.B. Berechtigung verloren)
            console.warn('Automatisches Speichern fehlgeschlagen:', e);
        }
    }

    // Nutzer-Ordner-Zuordnung speichern
    setUserFolderName(username) {
        if (!username || !this.dirHandle) return;
        try {
            window.localStorage.setItem('lernapp_user_folder_' + username, this.dirHandle.name);
        } catch (e) {}
    }
    // Nutzer-Ordner-Zuordnung abfragen
    static getUserFolderName(username) {
        if (!username) return null;
        return window.localStorage.getItem('lernapp_user_folder_' + username) || null;
    }
}

// Hinweis für UI:
export function getCloudHint() {
    const knownClouds = [
        'Dropbox',
        'Nextcloud',
        'OneDrive',
        'Google Drive',
        'iCloud',
        'Syncthing'
    ];
    return 'Tipp: Wählen Sie einen Ordner in Ihrer Cloud (z.B. Dropbox, Nextcloud, OneDrive), um Ihre LernApp-Daten automatisch auf allen Geräten zu synchronisieren.';
}
