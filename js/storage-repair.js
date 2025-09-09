/**
 * Hilfsprogramm zum Testen und Reparieren des IndexedDB-Speichers
 * Fügt diese Datei zu einem HTML-Dokument hinzu, um die Funktionen zu nutzen
 */

// Guard gegen mehrfaches Laden
if (typeof window.STORAGE_REPAIR_LOADED !== 'undefined') {
    console.warn('⚠️ IndexedDB-Reparatur-Tools wurden bereits geladen. Doppelte Initialisierung vermieden.');
} else {
    window.STORAGE_REPAIR_LOADED = true;

    // Sofort Meldung ausgeben, dass die Reparatur-Tools geladen wurden
    console.log('🔧 IndexedDB-Reparatur-Tools geladen');
    console.log('Verfügbare Befehle: checkIndexedDBStorage(), repairIndexedDBStorage(), listAllHandles()');

    // Konstanten
    const REPAIR_DB_NAME = 'LernAppDirectoryHandles';
    const REPAIR_STORE_NAME = 'lernapp-directory-handles';
    const REPAIR_HANDLE_KEY_PREFIX = 'dir-handle-';
    const REPAIR_OLD_KEY_NAME = 'main-directory-handle';

/**
 * Prüft den Zustand des IndexedDB-Speichers
 * @returns {Promise<Object>} Ein Objekt mit Statusinformationen
 */
async function checkIndexedDBStorage() {
    console.log('🔍 Prüfe IndexedDB-Speicher...');
    
    try {
        // IndexedDB öffnen
        const db = await openRepairDatabase();
        
        // Aktuellen Benutzernamen ermitteln
        const username = localStorage.getItem('username') || 'default';
        const userHandleKey = `${REPAIR_HANDLE_KEY_PREFIX}${username}`;
        
        console.log(`Aktueller Benutzer: ${username}`);
        console.log(`Benutzerspezifischer Schlüssel: ${userHandleKey}`);
        
        // Alle Keys auflisten
        const allKeys = await listAllKeys(db);
        console.log('Alle vorhandenen Schlüssel:', allKeys);
        
        // Nach dem benutzerspezifischen Handle suchen
        const userHandle = await getHandle(db, userHandleKey);
        
        if (userHandle) {
            console.log(`✅ Benutzerspezifisches Handle gefunden: ${userHandle.name}`);
            return { 
                success: true, 
                userHandleFound: true,
                userHandle: {
                    name: userHandle.name,
                    kind: userHandle.kind
                }
            };
        } else {
            console.log('❌ Kein benutzerspezifisches Handle gefunden');
            
            // Nach dem alten Handle suchen
            const oldHandle = await getHandle(db, REPAIR_OLD_KEY_NAME);
            
            if (oldHandle) {
                console.log(`⚠️ Altes globales Handle gefunden: ${oldHandle.name}`);
                return { 
                    success: true, 
                    userHandleFound: false,
                    oldHandleFound: true,
                    oldHandle: {
                        name: oldHandle.name,
                        kind: oldHandle.kind
                    }
                };
            } else {
                console.log('❌ Auch kein altes Handle gefunden');
                return { 
                    success: true, 
                    userHandleFound: false,
                    oldHandleFound: false
                };
            }
        }
    } catch (error) {
        console.error('Fehler bei der Überprüfung:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Repariert den IndexedDB-Speicher
 * @returns {Promise<Object>} Ein Objekt mit Statusinformationen
 */
async function repairIndexedDBStorage() {
    console.log('🔧 Repariere IndexedDB-Speicher...');
    
    try {
        // IndexedDB öffnen
        const db = await openRepairDatabase();
        
        // Aktuellen Benutzernamen ermitteln
        const username = localStorage.getItem('username') || 'default';
        const userHandleKey = `${REPAIR_HANDLE_KEY_PREFIX}${username}`;
        
        console.log(`Aktueller Benutzer: ${username}`);
        console.log(`Benutzerspezifischer Schlüssel: ${userHandleKey}`);
        
        // Nach dem benutzerspezifischen Handle suchen
        const userHandle = await getHandle(db, userHandleKey);
        
        if (userHandle) {
            console.log(`✅ Benutzerspezifisches Handle gefunden: ${userHandle.name}`);
            
            // Lokale Flags setzen
            localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'true');
            localStorage.setItem(`directoryHandleName_${username}`, userHandle.name);
            
            console.log('✅ Lokale Flags aktualisiert');
            
            return { success: true, action: 'flags_updated' };
        } else {
            console.log('❌ Kein benutzerspezifisches Handle gefunden');
            
            // Nach dem alten Handle suchen
            const oldHandle = await getHandle(db, REPAIR_OLD_KEY_NAME);
            
            if (oldHandle) {
                console.log(`⚠️ Altes globales Handle gefunden: ${oldHandle.name}, migriere...`);
                
                // Altes Handle unter neuem Schlüssel speichern
                await setHandle(db, userHandleKey, oldHandle);
                
                // Lokale Flags setzen
                localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'true');
                localStorage.setItem(`directoryHandleName_${username}`, oldHandle.name);
                
                console.log('✅ Migration abgeschlossen und lokale Flags aktualisiert');
                
                return { 
                    success: true, 
                    action: 'handle_migrated',
                    oldHandle: {
                        name: oldHandle.name,
                        kind: oldHandle.kind
                    }
                };
            } else {
                console.log('❌ Auch kein altes Handle gefunden, nichts zu reparieren');
                return { success: false, action: 'nothing_to_repair' };
            }
        }
    } catch (error) {
        console.error('Fehler bei der Reparatur:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Listet alle vorhandenen Handles in der IndexedDB auf
 * @returns {Promise<Array>} Eine Liste aller gefundenen Handles
 */
async function listAllHandles() {
    console.log('📋 Liste alle vorhandenen Handles auf...');
    
    try {
        // IndexedDB öffnen
        const db = await openRepairDatabase();
        
        // Alle Keys auflisten
        const allKeys = await listAllKeys(db);
        console.log('Alle vorhandenen Schlüssel:', allKeys);
        
        // Für jeden Schlüssel den Wert holen
        const result = [];
        
        for (const key of allKeys) {
            const handle = await getHandle(db, key);
            
            if (handle) {
                result.push({
                    key,
                    name: handle.name,
                    kind: handle.kind
                });
            }
        }
        
        console.log('Gefundene Handles:', result);
        return result;
    } catch (error) {
        console.error('Fehler beim Auflisten der Handles:', error);
        return [];
    }
}

/**
 * Öffnet die Reparatur-Datenbank
 * @returns {Promise<IDBDatabase>} Die geöffnete Datenbank
 */
async function openRepairDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(REPAIR_DB_NAME);
        
        request.onerror = (event) => {
            console.error('Fehler beim Öffnen der IndexedDB:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

/**
 * Listet alle Schlüssel in einem ObjectStore auf
 * @param {IDBDatabase} db - Die geöffnete Datenbank
 * @returns {Promise<Array>} Eine Liste aller Schlüssel
 */
async function listAllKeys(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPAIR_STORE_NAME, 'readonly');
        const store = tx.objectStore(REPAIR_STORE_NAME);
        const request = store.getAllKeys();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Holt ein Handle aus der Datenbank
 * @param {IDBDatabase} db - Die geöffnete Datenbank
 * @param {string} key - Der Schlüssel
 * @returns {Promise<Object|null>} Das Handle oder null
 */
async function getHandle(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPAIR_STORE_NAME, 'readonly');
        const store = tx.objectStore(REPAIR_STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Speichert ein Handle in der Datenbank
 * @param {IDBDatabase} db - Die geöffnete Datenbank
 * @param {string} key - Der Schlüssel
 * @param {Object} handle - Das Handle
 * @returns {Promise<void>}
 */
async function setHandle(db, key, handle) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPAIR_STORE_NAME, 'readwrite');
        const store = tx.objectStore(REPAIR_STORE_NAME);
        const request = store.put(handle, key);
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Funktionen global verfügbar machen
window.checkIndexedDBStorage = checkIndexedDBStorage;
window.repairIndexedDBStorage = repairIndexedDBStorage;
window.listAllHandles = listAllHandles;

/**
 * Repariert den Speicherzugriff für einen bestimmten Benutzer
 * @param {string} username - Benutzername
 * @param {Object} options - Konfigurationsoptionen
 * @param {boolean} options.showModal - Ob automatisch Modals angezeigt werden sollen
 * @returns {Promise<Object>} Ergebnis der Reparatur
 */
async function repairStorageAccess(username, options = {}) {
    console.log(`🔧 Starte Reparatur des Speicherzugriffs für Benutzer: ${username}`);
    
    // Standardwerte für Optionen
    const config = {
        showModal: true,
        ...options
    };
    
    console.log(`📝 Reparatur-Konfiguration: showModal=${config.showModal}`);
    
    try {
        const db = await openRepairDatabase();
        const userHandleKey = `${REPAIR_HANDLE_KEY_PREFIX}${username}`;
        
        // Alle vorhandenen Schlüssel überprüfen
        const allKeys = await listAllKeys(db);
        console.log('📋 Vorhandene Schlüssel:', allKeys);
        
        if (!allKeys.includes(userHandleKey)) {
            console.log('⚠️ Kein benutzerspezifisches Handle gefunden, prüfe auf globales Handle');
            
            // Prüfen, ob ein globales Handle existiert
            if (allKeys.includes(REPAIR_OLD_KEY_NAME)) {
                console.log('🔍 Globales Handle gefunden, versuche zu migrieren');
                
                // Globales Handle laden
                const globalHandle = await getHandle(db, REPAIR_OLD_KEY_NAME);
                
                if (globalHandle) {
                    console.log('🔄 Globales Handle gefunden, migriere zu Benutzer');
                    
                    // Handle für Benutzer speichern
                    await setHandle(db, userHandleKey, globalHandle);
                    console.log('✅ Handle erfolgreich für Benutzer gespeichert');
                    
                    return {
                        success: true,
                        message: 'Speicherzugriff durch Migration des globalen Handles repariert',
                        action: 'migrated'
                    };
                } else {
                    console.log('❌ Globales Handle konnte nicht geladen werden');
                    
                    return {
                        success: false,
                        message: 'Globales Handle konnte nicht geladen werden',
                        action: 'failed_migration'
                    };
                }
            } else {
                console.log('❌ Kein Handle gefunden');
                
                return {
                    success: false,
                    message: 'Kein Handle für den Benutzer gefunden und kein globales Handle zur Migration verfügbar',
                    action: 'no_handle'
                };
            }
        }
        
        // Benutzerspezifisches Handle laden
        const userHandle = await getHandle(db, userHandleKey);
        
        if (!userHandle) {
            console.log('❌ Handle existiert in der Liste, konnte aber nicht geladen werden');
            
            return {
                success: false,
                message: 'Handle konnte nicht geladen werden',
                action: 'load_failed'
            };
        }
        
        // Versuchen, die Berechtigung zu erneuern
        console.log('🔑 Versuche Berechtigung zu erneuern');
        
        try {
            if (typeof userHandle.requestPermission === 'function') {
                const permissionResult = await userHandle.requestPermission({ mode: 'readwrite' });
                
                if (permissionResult === 'granted') {
                    console.log('✅ Berechtigung erfolgreich erneuert');
                    
                    return {
                        success: true,
                        message: 'Speicherzugriff erfolgreich repariert, Berechtigung erneuert',
                        action: 'permission_granted'
                    };
                } else {
                    console.log('⚠️ Benutzer hat die Berechtigung verweigert');
                    
                    return {
                        success: false,
                        message: 'Benutzer hat die Berechtigung verweigert',
                        action: 'permission_denied'
                    };
                }
            } else {
                console.log('⚠️ Handle hat keine requestPermission-Funktion, könnte ungültig sein');
                
                return {
                    success: false,
                    message: 'Handle ist ungültig (keine requestPermission-Funktion)',
                    action: 'invalid_handle'
                };
            }
        } catch (permissionError) {
            console.error('❌ Fehler bei der Berechtigungsanfrage:', permissionError);
            
            return {
                success: false,
                message: 'Fehler bei der Berechtigungsanfrage: ' + (permissionError.message || 'Unbekannter Fehler'),
                action: 'permission_error'
            };
        }
    } catch (error) {
        console.error('❌ Fehler bei repairStorageAccess:', error);
        
        return {
            success: false,
            message: 'Fehler bei der Reparatur: ' + (error.message || 'Unbekannter Fehler'),
            action: 'general_error'
        };
    }
}

/**
 * Notfallreparatur für den Speicher
 * @param {string} username - Benutzername
 * @returns {Promise<Object>} Ergebnis der Notfallreparatur
 */
async function emergencyStorageRepair(username) {
    console.log(`🚨 Starte Notfallreparatur des Speichers für Benutzer: ${username}`);
    
    try {
        // 1. IndexedDB reparieren
        try {
            const repairResult = await repairIndexedDBStorage();
            console.log('📊 IndexedDB-Reparatur:', repairResult);
        } catch (repairError) {
            console.warn('⚠️ IndexedDB-Reparatur fehlgeschlagen:', repairError);
            // Wir machen trotzdem weiter
        }
        
        // 2. Benutzer-Flag für ersten Login zurücksetzen
        try {
            // Pfad zu benutzerspezifischem Flag
            const firstLoginFlag = `lernapp_first_login_${username}`;
            
            // Flag entfernen, damit Benutzer beim nächsten Login nach Speicherort gefragt wird
            localStorage.removeItem(firstLoginFlag);
            console.log('✅ Erster-Login-Flag für Benutzer zurückgesetzt');
        } catch (flagError) {
            console.warn('⚠️ Fehler beim Zurücksetzen des Login-Flags:', flagError);
        }
        
        // 3. Speichereinstellungen zurücksetzen
        try {
            const storagePathKey = `lernapp_storage_path_${username}`;
            localStorage.removeItem(storagePathKey);
            console.log('✅ Speicherpfad-Einstellung zurückgesetzt');
        } catch (storagePathError) {
            console.warn('⚠️ Fehler beim Zurücksetzen des Speicherpfads:', storagePathError);
        }
        
        return {
            success: true,
            message: 'Notfallreparatur durchgeführt, Benutzer wird beim nächsten Login nach einem Speicherort gefragt'
        };
    } catch (error) {
        console.error('❌ Fehler bei emergencyStorageRepair:', error);
        
        return {
            success: false,
            message: 'Fehler bei der Notfallreparatur: ' + (error.message || 'Unbekannter Fehler')
        };
    }
}

// Weitere globale Funktionen verfügbar machen
window.repairStorageAccess = repairStorageAccess;
window.emergencyStorageRepair = emergencyStorageRepair;

} // Ende des Guards gegen mehrfaches Laden
