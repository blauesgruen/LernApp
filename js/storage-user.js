/**
 * Benutzerspezifische Initialisierung des Speichers
 * Diese Funktion wird beim Login eines Benutzers aufgerufen
 * 
 * @param {string} username - Der Benutzername
 * @param {Object} options - Konfigurationsoptionen
 * @param {boolean} options.showModal - Ob automatisch Modals angezeigt werden sollen
 * @returns {Promise<boolean>} True, wenn die Initialisierung erfolgreich war
 */
async function initializeStorageForUser(username, options = {}) {
    console.log(`Initialisiere Speicher für Benutzer: ${username}`);
    
    // Username in localStorage speichern (sollte eigentlich schon dort sein)
    if (username) {
        localStorage.setItem('username', username);
    }
    
    // Debug-Ausgabe für den aktuellen Zustand
    const hasStoredHandle = localStorage.getItem(`hasStoredDirectoryHandle_${username}`) === 'true';
    console.log(`[DEBUG] Storage-Initialisierung für Benutzer '${username}' - hasStoredHandle: ${hasStoredHandle}`);
    console.log(`[DEBUG] localStorage-Key: hasStoredDirectoryHandle_${username} = ${localStorage.getItem(`hasStoredDirectoryHandle_${username}`)}`);
    
    // Automatische Reparatur versuchen, wenn der Reparatur-Tool verfügbar ist
    if (window.repairIndexedDBStorage) {
        console.log('[DEBUG] Versuche automatische Reparatur des IndexedDB-Speichers...');
        const repairResult = await window.repairIndexedDBStorage();
        console.log('[DEBUG] Reparatur-Ergebnis:', repairResult);
    }
    
    // Speicher initialisieren mit den übergebenen Optionen
    return await initializeStorage(options);
}

/**
 * Überprüft den Speicherzugriff für einen Benutzer
 * 
 * @param {string} username - Der Benutzername
 * @returns {Promise<{accessAvailable: boolean, message: string}>} Status des Speicherzugriffs
 */
async function checkStorageAccess(username) {
    console.log(`Überprüfe Speicherzugriff für Benutzer: ${username}`);
    
    // Prüfen, ob ein DirectoryHandle für diesen Benutzer gespeichert ist
    const hasStoredHandle = localStorage.getItem(`hasStoredDirectoryHandle_${username}`) === 'true';
    
    if (!hasStoredHandle) {
        return {
            accessAvailable: false,
            message: 'Kein Speicherort konfiguriert'
        };
    }
    
    // Versuchen, das gespeicherte Handle zu laden
    const success = await restoreDirectoryHandle();
    
    if (success) {
        return {
            accessAvailable: true,
            message: 'Zugriff auf Speicherort hergestellt'
        };
    } else {
        return {
            accessAvailable: false,
            message: 'Speicherort konfiguriert, aber Zugriff nicht möglich'
        };
    }
}

/**
 * Prüft, ob der Benutzer zum ersten Mal einloggt und der Speicherort-Dialog angezeigt werden sollte
 * 
 * @param {string} username - Der Benutzername
 * @returns {boolean} True, wenn der Dialog angezeigt werden sollte
 */
function shouldAskForStoragePath(username) {
    // Prüfen, ob für diesen Benutzer schon ein Speicherort festgelegt wurde
    return localStorage.getItem(`hasStoredDirectoryHandle_${username}`) !== 'true';
}

/**
 * Markiert den ersten Login eines Benutzers als abgeschlossen
 * 
 * @param {string} username - Der Benutzername
 */
function markFirstLoginCompleted(username) {
    localStorage.setItem(`hasLoggedInBefore_${username}`, 'true');
}

// Diese Funktionen exportieren
window.initializeStorageForUser = initializeStorageForUser;
window.checkStorageAccess = checkStorageAccess;
window.shouldAskForStoragePath = shouldAskForStoragePath;
window.markFirstLoginCompleted = markFirstLoginCompleted;
