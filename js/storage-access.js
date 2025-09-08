/**
 * storage-access.js - Zentrale Funktionen zum Testen des Dateisystem-Zugriffs
 * 
 * Diese Datei enthält die definitive Funktion zum Testen, ob der für den aktuellen
 * Benutzer konfigurierte Speicherort wirklich zugänglich ist. Der Test sollte nur
 * nach erfolgreicher Anmeldung durchgeführt werden.
 */

/**
 * Prüft definitiv, ob der konfigurierte Speicherort für den aktuellen Benutzer zugänglich ist.
 * Dieser Test ist die einzige maßgebliche Quelle für die Verfügbarkeit des Speicherorts.
 * 
 * @param {string} [username] - Optional: Der Benutzername, für den der Zugriff geprüft werden soll.
 * @returns {Promise<Object>} Objekt mit Informationen zum Zugriffsstatus.
 */
async function checkStorageAccess(username) {
    // Vermeidung rekursiver Logging-Aufrufe durch direkte Verwendung von console
    console.log('Prüfe Speicherzugriff für Benutzer:', username || 'aktueller Benutzer');
    
    // Speichere Ergebnis des Tests
    const result = {
        accessAvailable: false,
        directoryHandle: null,
        storagePath: null,
        message: null,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Sicherstellen, dass ein Benutzer angemeldet ist
        const currentUser = username || localStorage.getItem('username');
        if (!currentUser) {
            result.message = 'Kein Benutzer angemeldet. Zugriffsprüfung übersprungen.';
            console.log(result.message);
            return result;
        }
        
        // Zugriff auf Funktionen prüfen
        if (!window.getStoragePath) {
            result.message = 'Storage-API nicht verfügbar. Kann Speicherort nicht prüfen.';
            console.log(result.message);
            return result;
        }
        
        // Konfigurierten Pfad abrufen
        const configuredPath = window.getStoragePath(currentUser);
        result.storagePath = configuredPath;
        console.log(`Konfigurierter Speicherort für ${currentUser}: ${configuredPath}`);
        
        // Globales DirectoryHandle prüfen
        const globalHandle = window.directoryHandle;
        
        // Wenn kein globales Handle vorhanden ist, versuche es wiederherzustellen
        if (!globalHandle) {
            console.log('Kein DirectoryHandle im Speicher gefunden. Versuche Wiederherstellung...');
            
            // Prüfen, ob FileSystem API unterstützt wird
            if (!window.isFileSystemAccessSupported || !window.isFileSystemAccessSupported()) {
                result.message = 'Dateisystem-API wird nicht unterstützt. Verwende localStorage-Fallback.';
                console.log(result.message);
                // Test auf Schreibzugriff im localStorage
                try {
                    const testKey = `storage_test_${currentUser}_${Date.now()}`;
                    localStorage.setItem(testKey, 'test');
                    localStorage.removeItem(testKey);
                    result.accessAvailable = true;
                    result.message = 'Zugriff auf localStorage erfolgreich';
                } catch (localStorageError) {
                    result.message = `Kein Zugriff auf localStorage: ${localStorageError.message}`;
                }
                return result;
            }
            
            // Versuche, das Handle mit den existierenden Funktionen wiederherzustellen
            if (window.restoreDirectoryHandle) {
                console.log('Versuche, das DirectoryHandle wiederherzustellen...');
                try {
                    const restored = await window.restoreDirectoryHandle();
                    if (restored) {
                        console.log('DirectoryHandle erfolgreich wiederhergestellt');
                        result.directoryHandle = restored;
                    } else {
                        console.log('Wiederherstellung des DirectoryHandle fehlgeschlagen');
                    }
                } catch (restoreError) {
                    console.log('Fehler bei der Wiederherstellung:', restoreError.message);
                }
            }
            
            // Wenn das Handle nicht wiederhergestellt werden konnte und wir Benutzerinteraktion haben,
            // versuche mit FileDialog
            if (!result.directoryHandle && window._userInteractionActive) {
                console.log('Versuche Ordnerauswahl mit Benutzerinteraktion...');
                try {
                    // Nur ausführen, wenn Picker verfügbar ist
                    if (window.showDirectoryPicker) {
                        console.log('Fordere Benutzer zur Ordnerauswahl auf...');
                        const handle = await window.showDirectoryPicker();
                        if (handle) {
                            console.log(`Verzeichnis ausgewählt: ${handle.name}`);
                            result.directoryHandle = handle;
                            
                            // Speichere das neue Handle global
                            window.directoryHandle = handle;
                            
                            // Speichere in IndexedDB, wenn möglich
                            if (window.storeDirectoryHandle) {
                                try {
                                    await window.storeDirectoryHandle(handle);
                                    localStorage.setItem('hasDirectoryHandle', 'true');
                                    localStorage.setItem('hasStoredDirectoryHandle', 'true');
                                } catch (storeError) {
                                    console.log('Konnte Handle nicht speichern:', storeError.message);
                                }
                            }
                        }
                    }
                } catch (pickError) {
                    console.log('Benutzer hat Auswahl abgebrochen oder Fehler:', pickError.message);
                }
            }
        } else {
            // Wir haben bereits ein Handle
            console.log('Vorhandenes DirectoryHandle gefunden');
            result.directoryHandle = globalHandle;
        }
        
        // Definitiver Test: Versuche, eine Testdatei zu schreiben
        if (result.directoryHandle) {
            console.log('Führe definitiven Zugriffstest durch (Schreiben einer Testdatei)...');
            try {
                // Zunächst Berechtigung prüfen/anfordern
                const permission = await result.directoryHandle.requestPermission({ mode: 'readwrite' });
                console.log(`Berechtigung für Verzeichnis: ${permission}`);
                
                if (permission !== 'granted') {
                    result.message = 'Keine Schreibberechtigung für das Verzeichnis';
                    console.log(result.message);
                    return result;
                }
                
                // Tatsächlicher Schreibtest
                if (window.saveTestFile) {
                    const testResult = await window.saveTestFile(result.directoryHandle);
                    console.log(`Ergebnis des definitiven Zugriffstests: ${testResult ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
                    
                    result.accessAvailable = testResult;
                    
                    if (testResult) {
                        result.message = 'Speicherort ist vollständig zugänglich';
                        
                        // Speicherort erfolgreich bestätigt - jetzt globales Handle aktualisieren
                        window.directoryHandle = result.directoryHandle;
                    } else {
                        result.message = 'Speicherort ist konfiguriert, aber Schreibtest fehlgeschlagen';
                    }
                } else {
                    console.log('Warnung: saveTestFile-Funktion nicht verfügbar');
                    // Einfacher Test mit Datei erstellen
                    try {
                        const fileName = `test_${Date.now()}.txt`;
                        const fileHandle = await result.directoryHandle.getFileHandle(fileName, { create: true });
                        
                        // Versuche in die Datei zu schreiben
                        const writable = await fileHandle.createWritable();
                        await writable.write('Test-Zugriff');
                        await writable.close();
                        
                        // Versuche die Datei zu löschen
                        await result.directoryHandle.removeEntry(fileName);
                        
                        result.accessAvailable = true;
                        result.message = 'Speicherort ist vollständig zugänglich (manueller Test)';
                        
                        // Speicherort erfolgreich bestätigt - jetzt globales Handle aktualisieren
                        window.directoryHandle = result.directoryHandle;
                    } catch (fileTestError) {
                        result.message = `Dateizugriffstest fehlgeschlagen: ${fileTestError.message}`;
                        console.log(result.message);
                    }
                }
            } catch (permissionError) {
                result.message = `Berechtigungsfehler: ${permissionError.message}`;
                console.log(result.message);
            }
        } else {
            // Kein DirectoryHandle - prüfe ob localStorage-Fallback funktioniert
            console.log('Kein DirectoryHandle verfügbar, prüfe localStorage-Fallback');
            try {
                const testKey = `storage_test_${currentUser}_${Date.now()}`;
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
                result.accessAvailable = true;
                result.message = 'Kein Dateisystemzugriff, aber localStorage funktioniert';
                console.log(result.message);
            } catch (localStorageError) {
                result.message = `Kein Zugriff auf Speicher: ${localStorageError.message}`;
                console.log(result.message);
            }
        }
    } catch (error) {
        result.message = `Fehler bei der Speicherort-Prüfung: ${error.message}`;
        console.error(result.message, error);
    }
    
    // Speichere das Ergebnis im sessionStorage für spätere Referenz
    try {
        sessionStorage.setItem('lastStorageAccessCheck', JSON.stringify({
            timestamp: result.timestamp,
            success: result.accessAvailable,
            path: result.storagePath,
            message: result.message
        }));
    } catch (e) {
        console.log('Konnte Testergebnis nicht speichern:', e.message);
    }
    
    return result;
}

// Exportiere die Funktion global
window.checkStorageAccess = checkStorageAccess;

console.log('Definitive Speicherzugriffsprüfung geladen');
