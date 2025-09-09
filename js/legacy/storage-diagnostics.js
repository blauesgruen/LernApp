/**
 * Diagnose-Tool für DirectoryHandle-Probleme
 * Diese Funktion zeigt detaillierte Informationen zum aktuellen Status des DirectoryHandles
 * und hilft bei der Diagnose von Problemen mit dem Dateisystemzugriff.
 */
function diagnosePersistentStorage() {
    console.group('📂 Diagnose des persistenten Speichers');
    
    // 1. Prüfen der localStorage-Flags
    console.log('Prüfe localStorage-Flags...');
    const hasDirectoryHandleFlag = localStorage.getItem('hasDirectoryHandle') === 'true';
    const hasStoredDirectoryHandleFlag = localStorage.getItem('hasStoredDirectoryHandle') === 'true';
    console.log(`- hasDirectoryHandle: ${hasDirectoryHandleFlag ? '✓ Gesetzt' : '✗ Nicht gesetzt'}`);
    console.log(`- hasStoredDirectoryHandle: ${hasStoredDirectoryHandleFlag ? '✓ Gesetzt' : '✗ Nicht gesetzt'}`);
    
    // 2. Prüfen des globalen DirectoryHandles
    console.log('Prüfe globales DirectoryHandle...');
    if (window.directoryHandle) {
        console.log(`- DirectoryHandle: ✓ Vorhanden (Name: ${window.directoryHandle.name})`);
    } else {
        console.log('- DirectoryHandle: ✗ Nicht vorhanden');
    }
    
    // 3. Prüfen der verfügbaren Funktionen
    console.log('Prüfe verfügbare Funktionen...');
    console.log(`- restoreDirectoryHandle: ${typeof window.restoreDirectoryHandle === 'function' ? '✓ Verfügbar' : '✗ Nicht verfügbar'}`);
    console.log(`- forceRestoreDirectoryHandle: ${typeof window.forceRestoreDirectoryHandle === 'function' ? '✓ Verfügbar' : '✗ Nicht verfügbar'}`);
    console.log(`- autoRepairDirectoryHandle: ${typeof window.autoRepairDirectoryHandle === 'function' ? '✓ Verfügbar' : '✗ Nicht verfügbar'}`);
    console.log(`- repairDirectoryHandle: ${typeof window.repairDirectoryHandle === 'function' ? '✓ Verfügbar' : '✗ Nicht verfügbar'}`);
    
    // 4. Manuelle Überprüfung der IndexedDB
    console.log('Starte manuelle Überprüfung der IndexedDB...');
    checkDirectoryHandleInIndexedDB().then(result => {
        console.log('IndexedDB-Prüfung abgeschlossen:');
        console.log(result);
        console.groupEnd();
    }).catch(error => {
        console.error('Fehler bei der IndexedDB-Prüfung:', error);
        console.groupEnd();
    });
    
    console.log('Diagnose wird ausgeführt...');
    return "Diagnose läuft - siehe Konsolenausgabe für Details";
}

/**
 * Prüft, ob ein DirectoryHandle in der IndexedDB gespeichert ist
 * @returns {Promise<Object>} Ein Objekt mit Informationen zum gespeicherten Handle
 */
async function checkDirectoryHandleInIndexedDB() {
    try {
        const dbName = 'LernAppDirectoryHandles';
        const storeName = 'lernapp-directory-handles';
        const keyName = 'main-directory-handle';
        
        // IndexedDB öffnen
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 2);  // Version 2 verwenden
            request.onerror = (event) => reject(new Error(`Fehler beim Öffnen der Datenbank: ${event.target.error.message}`));
            request.onsuccess = (event) => resolve(event.target.result);
        });
        
        // Prüfen, ob der Object Store existiert
        if (!db.objectStoreNames.contains(storeName)) {
            return {
                status: 'error',
                message: `Object Store '${storeName}' existiert nicht in der Datenbank`,
                recommendation: 'Verwenden Sie openDirectoryPicker, um einen neuen Speicherort auszuwählen'
            };
        }
        
        // DirectoryHandle laden
        const handle = await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(keyName);
            
            request.onerror = (event) => reject(new Error(`Fehler beim Laden des Handles: ${event.target.error.message}`));
            request.onsuccess = (event) => resolve(request.result);
        });
        
        // DirectoryHandle analysieren
        if (!handle) {
            return {
                status: 'empty',
                message: 'Kein DirectoryHandle in der IndexedDB gefunden',
                recommendation: 'Verwenden Sie openDirectoryPicker, um einen Speicherort auszuwählen'
            };
        }
        
        try {
            // Versuchen, einen Wert aus dem Handle zu lesen (throws, wenn ungültig)
            const handleName = handle.name || 'Unbenannt';
            
            return {
                status: 'found',
                message: `DirectoryHandle gefunden: ${handleName}`,
                handle: {
                    name: handleName,
                    type: typeof handle,
                    constructor: handle.constructor ? handle.constructor.name : 'Unbekannt'
                },
                recommendation: 'Versuchen Sie window.autoRepairDirectoryHandle() oder window.forceRestoreDirectoryHandle()'
            };
        } catch (validationError) {
            return {
                status: 'invalid',
                message: `DirectoryHandle ist ungültig: ${validationError.message}`,
                recommendation: 'Löschen Sie den ungültigen Handle mit clearStoredDirectoryHandle() und wählen Sie einen neuen Speicherort'
            };
        }
    } catch (error) {
        return {
            status: 'error',
            message: `Fehler bei der Überprüfung: ${error.message}`,
            error: error
        };
    }
}

// In das globale Objekt exportieren
window.diagnosePersistentStorage = diagnosePersistentStorage;
window.checkDirectoryHandleInIndexedDB = checkDirectoryHandleInIndexedDB;

// Hilfetext in der Konsole ausgeben
console.log('%c📊 Diagnose-Tool für Dateisystem-Probleme geladen', 'color: green; font-weight: bold');
console.log('Führen Sie window.diagnosePersistentStorage() in der Konsole aus, um die Diagnose zu starten');
