/**
 * Kompatibilitätsadapter für das neue Storage-Core-Modul
 * 
 * Dieser Adapter stellt sicher, dass der alte Code weiterhin funktioniert,
 * indem die alten Funktionsnamen auf die neuen Funktionen im storage-core.js abgebildet werden.
 */

// Sicherheits-Stub: Wenn andere Skripte versehentlich `window.restoreDirectoryHandle()`
// aufrufen bevor die Storage-Module geladen sind, soll das keinen TypeError auslösen.
// Spätere Module (z. B. `storage-core.js`) dürfen diesen Stub überschreiben.
if (typeof window.restoreDirectoryHandle !== 'function') {
    window.restoreDirectoryHandle = async function(username) {
        console.warn('[storage-compatibility] restoreDirectoryHandle called before storage modules ready for user', username);
        return null;
    };
}

// Nur ausführen, wenn storage-core.js bereits geladen wurde
if (window.initializeStorage) {
    console.log('Kompatibilitätsadapter für Storage-Core wird initialisiert');

    // Alte Funktionsnamen auf neue abbilden
    window.getStoragePath = function(username) {
        // Einfache Implementierung zur Kompatibilität
        return window.DEFAULT_STORAGE_PATH || 'LernAppDatenbank';
    };
    
    window.getStorageDisplayName = function(username) {
        // Benutzername aus Argument oder aktuellem Login
        const user = username || localStorage.getItem('username') || 'default';
        
        // Prüfen, ob das DirectoryHandle im window-Objekt verfügbar ist
        if (window.directoryHandle && window.directoryHandle.name) {
            return window.directoryHandle.name;
        }
        
        // Prüfen, ob wir ein gespeichertes DirectoryHandle haben
        if (localStorage.getItem(`hasStoredDirectoryHandle_${user}`) === 'true') {
            // Wir haben ein Handle, es ist aber noch nicht geladen
            return localStorage.getItem(`directoryHandleName_${user}`) || 'Gespeicherter Ordner';
        }
        
        return 'Browser-Speicher';
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
        window.restoreDirectoryHandle = async function(username) {
            // Versuche aus IndexedDB zu laden, falls Funktion vorhanden
            if (window.loadDirectoryHandleFromIndexedDB) {
                return await window.loadDirectoryHandleFromIndexedDB(username);
            }
            // Fallback: Nur Name aus localStorage
            const name = localStorage.getItem(`directoryHandleName_${username}`);
            if (name) {
                return { name };
            }
            return null;
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
    
    // Prüffunktion für File System Access API Support
    if (!window.isFileSystemAccessSupported) {
        window.isFileSystemAccessSupported = function() {
            // Korrigierte und robuste Prüfung
            const supported = ('showDirectoryPicker' in window);
            console.log('[DEBUG][isFileSystemAccessSupported] showDirectoryPicker in window:', supported);
            return supported;
        };
    }
    
    // Kompatibilitätsfunktion für openDirectoryPicker (alte Version) -> showDirectoryPicker (Standard-API)
    if (!window.openDirectoryPicker) {
        window.openDirectoryPicker = async function(options = {}) {
            if ('showDirectoryPicker' in window) {
                try {
                    // Standardoptionen mit den übergebenen Optionen zusammenführen
                    const defaultOptions = {
                        id: 'LernAppStorage',
                        startIn: 'documents',
                        mode: 'readwrite'
                    };
                    const mergedOptions = { ...defaultOptions, ...options };
                    
                    // Standard-API-Funktion aufrufen
                    return await window.showDirectoryPicker(mergedOptions);
                } catch (error) {
                    console.error('Fehler beim Öffnen des Ordner-Auswahl-Dialogs:', error);
                    throw error;
                }
            } else {
                throw new Error('Dieser Browser unterstützt die Auswahl von Ordnern nicht.');
            }
        };
    }
    
    // Kompatibilitätsfunktion für setStoragePath
    if (!window.setStoragePath) {
        window.setStoragePath = async function(pathOrHandle, username) {
            try {
                // Wir gehen davon aus, dass es sich um ein DirectoryHandle handelt
                if (pathOrHandle && typeof pathOrHandle === 'object' && pathOrHandle.kind === 'directory') {
                    // Wir nutzen selectAndPersistDirectory aus storage-core.js, das bereits implementiert ist
                    // Wir setzen direkt das Handle, da wir es bereits haben
                    window.directoryHandle = pathOrHandle;
                    
                    // Handle in IndexedDB speichern
                    if (window.storeDirectoryHandle) {
                        const stored = await window.storeDirectoryHandle(pathOrHandle);
                        
                        if (stored) {
                            // Status setzen
                            const user = username || localStorage.getItem('username') || 'default';
                            localStorage.setItem(`hasStoredDirectoryHandle_${user}`, 'true');
                            
                            // Den Namen des Handles für spätere Anzeige speichern
                            if (pathOrHandle && pathOrHandle.name) {
                                localStorage.setItem(`directoryHandleName_${user}`, pathOrHandle.name);
                            }
                            
                            // Testen, ob der Zugriff funktioniert
                            const accessWorks = await window.testFileAccess();
                            
                            if (accessWorks) {
                                // Event auslösen, dass das DirectoryHandle aktualisiert wurde
                                document.dispatchEvent(new CustomEvent('directoryHandleChanged', {
                                    detail: { success: true, handle: pathOrHandle }
                                }));
                                
                                return true;
                            }
                        }
                    }
                } else {
                    console.error('Ungültiges DirectoryHandle für setStoragePath:', pathOrHandle);
                }
                
                return false;
            } catch (error) {
                console.error('Fehler in setStoragePath:', error);
                return false;
            }
        };
    }
    
    // Kompatibilitätsfunktion für resetStoragePath
    if (!window.resetStoragePath) {
        window.resetStoragePath = async function(username, askForDirectory = false) {
            try {
                // Benutzername aus Argument oder aktuellem Login
                const user = username || localStorage.getItem('username') || 'default';
                
                // DirectoryHandle zurücksetzen
                window.directoryHandle = null;
                
                // Benutzerspezifische Einträge löschen
                localStorage.removeItem(`hasStoredDirectoryHandle_${user}`);
                localStorage.removeItem(`directoryHandleName_${user}`);
                
                // Für die Abwärtskompatibilität auch die alten Einträge löschen
                localStorage.removeItem('hasStoredDirectoryHandle');
                localStorage.removeItem('directoryHandleName');
                
                // IndexedDB-Eintrag löschen
                if (window.clearStoredDirectoryHandle) {
                    await window.clearStoredDirectoryHandle();
                }
                
                // Falls gewünscht, neuen Dialog öffnen
                if (askForDirectory) {
                    return await window.selectAndPersistDirectory();
                }
                
                return true;
            } catch (error) {
                console.error('Fehler in resetStoragePath:', error);
                return false;
            }
        };
    }
    
    // Kompatibilitätsfunktion für isStoragePathConfigured
    if (!window.isStoragePathConfigured) {
        window.isStoragePathConfigured = function(username) {
            // Benutzername aus Argument oder aktuellem Login
            const user = username || localStorage.getItem('username') || 'default';
            
            // Prüfen, ob ein DirectoryHandle für diesen Benutzer gespeichert ist
            return localStorage.getItem(`hasStoredDirectoryHandle_${user}`) === 'true' || 
                   (window.directoryHandle !== null && window.directoryHandle !== undefined);
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
