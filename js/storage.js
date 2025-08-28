// storage.js
// Zentrale Storage-Utility für LernApp
// Entscheidet automatisch: Cloud-Ordner (File System Access API) oder localStorage (verschlüsselt)
// Fallback: Datei-Export/Import

import { LocalCloudStorage, getCloudHint } from './local-cloud-storage.js';

class StorageManager {
    constructor() {
        this.cloud = window.lernappCloudStorage || new LocalCloudStorage();
        window.lernappCloudStorage = this.cloud; // global für Kompatibilität
    }

    async save(key, data) {
        // Versuche Cloud-Ordner, wenn gewählt und unterstützt
        if (this.cloud && this.cloud.dirHandle) {
            try {
                // Komplette Userdaten speichern (z.B. {categories, questions, statistics})
                if (key.startsWith('user_')) {
                    const userData = this._collectUserData(key);
                    await this.cloud.saveData(userData);
                    return true;
                }
            } catch (e) {
                console.warn('[StorageManager] Cloud-Speichern fehlgeschlagen, fallback:', e);
            }
        }
        // Fallback: localStorage (verschlüsselt)
        try {
            localStorage.setItem('lernapp_' + key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('[StorageManager] localStorage fehlgeschlagen:', e);
            return false;
        }
    }

    async load(key) {
        // Versuche Cloud-Ordner, wenn gewählt und unterstützt
        if (this.cloud && this.cloud.dirHandle) {
            try {
                if (key.startsWith('user_')) {
                    const data = await this.cloud.loadData();
                    return this._extractUserData(key, data);
                }
            } catch (e) {
                console.warn('[StorageManager] Cloud-Laden fehlgeschlagen, fallback:', e);
            }
        }
        // Fallback: localStorage
        try {
            const str = localStorage.getItem('lernapp_' + key);
            return str ? JSON.parse(str) : null;
        } catch (e) {
            console.error('[StorageManager] localStorage-Laden fehlgeschlagen:', e);
            return null;
        }
    }

    // Hilfsfunktionen für Userdaten-Struktur
    _collectUserData(userKey) {
        // userKey: z.B. user_benutzername_categories
        const username = userKey.split('_')[1];
        return {
            categories: JSON.parse(localStorage.getItem(`lernapp_user_${username}_categories`) || '[]'),
            questions: JSON.parse(localStorage.getItem(`lernapp_user_${username}_questions`) || '[]'),
            statistics: JSON.parse(localStorage.getItem(`lernapp_user_${username}_statistics`) || '{}')
        };
    }
    _extractUserData(userKey, data) {
        // userKey: z.B. user_benutzername_categories
        if (!data) return null;
        if (userKey.endsWith('_categories')) return data.categories || [];
        if (userKey.endsWith('_questions')) return data.questions || [];
        if (userKey.endsWith('_statistics')) return data.statistics || {};
        return null;
    }

    // Export/Import
    exportData(data) {
        LocalCloudStorage.exportData(data);
    }
    async importData() {
        return await LocalCloudStorage.importData();
    }
    getCloudHint() {
        return getCloudHint();
    }
}

export const storage = new StorageManager();
