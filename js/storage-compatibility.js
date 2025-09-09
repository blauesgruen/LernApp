/**
 * Kompatibilitätsadapter für das neue Storage-Core-Modul
 * 
 * Dieser Adapter stellt sicher, dass der alte Code weiterhin funktioniert,
 * indem die alten Funktionsnamen auf die neuen Funktionen im storage-core.js abgebildet werden.
 */

// Nur ausführen, wenn storage-core.js bereits geladen wurde
if (window.initializeStorage) {
    console.log('Kompatibilitätsadapter für Storage-Core wird initialisiert');

    // Alte Funktionsnamen auf neue abbilden
    window.getStoragePath = function(username) {
        // Einfache Implementierung zur Kompatibilität
        return window.DEFAULT_STORAGE_PATH || 'LernAppDatenbank';
    };
    
    window.getStorageDisplayName = function(username) {
        return directoryHandle ? directoryHandle.name : 'Browser-Speicher';
    };

    // Globale Variablen für die Kompatibilität
    if (!window.DEFAULT_STORAGE_PATH) {
        window.DEFAULT_STORAGE_PATH = 'LernAppDatenbank';
    }

    // Kompatibilitätsversion für saveData
    if (!window.saveDataOld && window.saveData) {
        window.saveDataOld = window.saveData;
    }

    // Kompatibilitätsversion für loadData
    if (!window.loadDataOld && window.loadData) {
        window.loadDataOld = window.loadData;
    }

    // Alte Versionen der Funktionen, falls sie noch nicht existieren
    if (!window.repairDirectoryHandle) {
        window.repairDirectoryHandle = async function() {
            return await window.initializeStorage();
        };
    }

    if (!window.testFileAccess) {
        // Wir haben die Funktion bereits in storage-core.js definiert
        // Hier nur zur Vollständigkeit
    }

    if (!window.restoreDirectoryHandle) {
        window.restoreDirectoryHandle = async function() {
            return await window.initializeStorage();
        };
    }
    
    if (!window.openAndPersistDirectoryPicker) {
        window.openAndPersistDirectoryPicker = async function() {
            return await window.selectAndPersistDirectory();
        };
    }
    
    if (!window.createVirtualDirectoryHandle) {
        window.createVirtualDirectoryHandle = function() {
            console.log('Virtuelles DirectoryHandle wurde angefordert - wird im neuen System nicht benötigt');
            return null;
        };
    }
    
    // Reparaturfunktionen
    if (!window.autoRepairDirectoryHandle) {
        window.autoRepairDirectoryHandle = async function() {
            return await window.initializeStorage();
        };
    }
    
    if (!window.forceRestoreDirectoryHandle) {
        window.forceRestoreDirectoryHandle = async function() {
            return await window.restoreDirectoryHandle();
        };
    }
    
    // Speichermethoden für IndexedDB
    if (!window.storeDataInIndexedDB && window.storeDataInIndexedDB) {
        // Bereits in storage-indexeddb.js definiert
    }
    
    if (!window.loadDataFromIndexedDB && window.loadDataFromIndexedDB) {
        // Bereits in storage-indexeddb.js definiert
    }

    // Signalisieren, dass die alten Funktionen ersetzt wurden
    console.log('✅ Kompatibilitätsadapter für Storage-Core wurde initialisiert');
    
    // Event auslösen, dass die Speicherfunktionen bereit sind
    document.dispatchEvent(new CustomEvent('storageSystemReady'));
} else {
    console.error('❌ Storage-Core nicht geladen, Kompatibilitätsadapter kann nicht initialisiert werden');
}

console.log('🔄 Kompatibilitätsadapter für Storage-Core geladen');
