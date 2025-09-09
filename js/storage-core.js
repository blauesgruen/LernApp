/**
 * LernApp Storage Core - Vereinfachte und robuste Speicherverwaltung
 * 
 * Dieses Modul implementiert eine klare und einfache Logik für die Speicherverwaltung:
 * 1. Prüft ob es das erste Login ist
 * 2. Prüft ob ein Speicherort festgelegt wurde
 * 3. Schreibt auf den festgelegten Speicherort mit Auto-Reparatur
 * 4. Öffnet ein Modal zur Berechtigung, wenn Schreiben nicht möglich ist
 */

// Guard gegen mehrfaches Laden
if (typeof window.STORAGE_CORE_LOADED !== 'undefined') {
    console.warn('⚠️ Storage-Core wurde bereits geladen. Doppelte Initialisierung vermieden.');
} else {
    window.STORAGE_CORE_LOADED = true;
    
    // Globale Konstanten
    const DEFAULT_STORAGE_PATH = 'LernAppDatenbank';
    const DB_NAME = 'LernAppDirectoryHandles';
    const STORE_NAME = 'lernapp-directory-handles';
    const HANDLE_KEY_PREFIX = 'dir-handle-'; // Präfix für benutzerspezifische Handles
const OLD_HANDLE_KEY = 'main-directory-handle'; // Für Migration
const DB_VERSION = 3; // Erhöht auf Version 3 für Migration

// Globale Variable für das DirectoryHandle
let directoryHandle = null;

/**
 * Hilfsfunktion, um den aktuellen Benutzernamen zu erhalten
 * @returns {string} Der aktuelle Benutzername oder 'default' wenn nicht eingeloggt
 */
function getCurrentUsername() {
    return localStorage.getItem('username') || 'default';
}

/**
 * Hilfsfunktion, um den benutzerspezifischen Schlüssel für das DirectoryHandle zu generieren
 * @returns {string} Der benutzerspezifische Schlüssel
 */
function getUserSpecificHandleKey() {
    const username = getCurrentUsername();
    return `${HANDLE_KEY_PREFIX}${username}`;
}

// Status-Flags
let isFirstLogin = false;
let hasStorageLocationSet = false;
let isStorageAccessible = false;

/**
 * Initialisiert das Speichersystem
 * @param {Object} options - Konfigurationsoptionen
 * @param {boolean} options.showModal - Ob automatisch Modals angezeigt werden sollen
 * @returns {Promise<boolean>} True wenn die Initialisierung erfolgreich war
 */
async function initializeStorage(options = {}) {
    // Standardwerte für Optionen
    const config = {
        showModal: true,
        ...options
    };
    
    try {
        // 1. Prüfen ob es das erste Login ist
        const username = getCurrentUsername();
        console.log(`Initialisiere Speicher für Benutzer: ${username}`);
        
        // Debug: Ausgabe aller relevanten localStorage-Einträge
        console.log('DEBUG: Aktuelle localStorage-Einträge für diesen Benutzer:');
        console.log(`- hasLoggedInBefore_${username}: ${localStorage.getItem(`hasLoggedInBefore_${username}`)}`);
        console.log(`- hasStoredDirectoryHandle_${username}: ${localStorage.getItem(`hasStoredDirectoryHandle_${username}`)}`);
        console.log(`- directoryHandleName_${username}: ${localStorage.getItem(`directoryHandleName_${username}`)}`);
        
        isFirstLogin = !localStorage.getItem(`hasLoggedInBefore_${username}`);
        if (isFirstLogin) {
            console.log('Erster Login erkannt für Benutzer:', username);
            localStorage.setItem(`hasLoggedInBefore_${username}`, 'true');
        }

        // 2. Prüfen ob ein Speicherort festgelegt wurde
        hasStorageLocationSet = localStorage.getItem(`hasStoredDirectoryHandle_${username}`) === 'true';
        console.log(`Speicherort für Benutzer ${username} festgelegt: ${hasStorageLocationSet}`);
        
        // 3. Falls ein Speicherort festgelegt wurde, versuchen diesen zu laden
        if (hasStorageLocationSet) {
            console.log(`Speicherort wurde zuvor für Benutzer ${username} festgelegt, versuche ihn zu laden`);
            const success = await restoreDirectoryHandle();
            
            if (success) {
                console.log('Speicherort erfolgreich geladen');
                isStorageAccessible = true;
                
                // Event auslösen, dass das DirectoryHandle wiederhergestellt wurde
                dispatchDirectoryHandleEvent(true);
                
                return true;
            } else {
                console.log('Speicherort konnte nicht geladen werden');
                // Wir zeigen KEINEN Dialog mehr an, sondern überlassen es dem Browser
                // Setze Status auf nicht zugänglich
                isStorageAccessible = false;
                updateStorageIndicator(false);
                return false;
            }
        } else if (isFirstLogin) {
            // Bei erstem Login gleich Speicherort auswählen lassen
            console.log('Erstes Login, zeige Speicherort-Auswahl');
            
            // Prüfen, ob der Browser die File System Access API unterstützt
            const isSupported = window.isFileSystemAccessSupported ? window.isFileSystemAccessSupported() : 'showDirectoryPicker' in window;
            
            if (!isSupported) {
                console.warn('⚠️ Browser unterstützt keine Ordnerauswahl, verwende Browser-Speicher');
                displayNotification('Browser-Speicher wird verwendet, da dein Browser keine Ordnerauswahl unterstützt.', 'info');
                return true;
            }
            
            // Nur anzeigen, wenn Optionen es erlauben
            if (config.showModal) {
                showStorageSelector();
            } else {
                console.log('Automatischer Dialog deaktiviert, verwende Browser-Speicher');
            }
            
            return false;
        } else {
            // Kein Speicherort festgelegt, Browser-Speicher wird verwendet
            console.log('Kein Speicherort festgelegt, verwende Browser-Speicher');
            return true;
        }
    } catch (error) {
        console.error('Fehler bei Storage-Initialisierung:', error);
        return false;
    }
}

// --- Storage Core Funktionen ---

/**
 * Stellt das DirectoryHandle aus IndexedDB wieder her
 * @returns {Promise<boolean>} True wenn die Wiederherstellung erfolgreich war
 */
async function restoreDirectoryHandle() {
    try {
        const username = getCurrentUsername();
        console.log(`🔄 Versuche DirectoryHandle für Benutzer ${username} wiederherzustellen...`);
        
        // 1. Handle aus der IndexedDB laden
        const db = await openHandleDatabase();
        const handle = await getHandleFromDatabase(db);
        
        if (!handle) {
            console.warn(`⚠️ Kein gespeichertes DirectoryHandle für Benutzer ${username} gefunden`);
                return null;
        }
        
        console.log(`✅ DirectoryHandle für Benutzer ${username} gefunden: ${handle.name}`);
        
        // 2. Berechtigung prüfen/anfordern
        try {
            // Sanity check - prüfen, ob das Handle überhaupt noch gültig ist
            if (!handle || typeof handle.requestPermission !== 'function') {
                console.error('❌ Ungültiges DirectoryHandle - möglicherweise ist der Browser-Cache beschädigt');
                throw new Error('Ungültiges DirectoryHandle');
            }
            
            // Vorsichtshalber immer die Berechtigung anfordern, auch wenn sie vielleicht schon erteilt wurde
            const permission = await handle.requestPermission();
            console.log(`Berechtigung für DirectoryHandle ${handle.name} angefordert: ${permission}`);
            
            if (permission !== 'granted') {
                console.warn('⚠️ Berechtigung zum Zugriff auf das DirectoryHandle wurde verweigert');
                return false;
            }
        } catch (permissionError) {
            console.error('Fehler beim Anfordern der Berechtigung für das DirectoryHandle:', permissionError);
            return false;
        }
        
        // 3. Handle im globalen Kontext speichern
        directoryHandle = handle;
        console.log('DirectoryHandle erfolgreich wiederhergestellt und global gespeichert');
        
        // 4. Erfolgreiche Wiederherstellung in der UI anzeigen
        updateStorageIndicator(true);
        
        return true;
    } catch (error) {
        console.error('Fehler bei der Wiederherstellung des DirectoryHandle:', error);
        return false;
    }
}

// Die Funktion restoreDirectoryHandle wird jetzt zentral in storage-global.js bereitgestellt
