/**
 * Debug-Hilfsprogramm für Speicheroperationen
 * Kann in der Konsole genutzt werden, um Speicherprobleme zu diagnostizieren
 */

async function testFileSystemAccess() {
    const directoryHandle = window.directoryHandle;
    
    if (!directoryHandle) {
        console.log('%c❌ Kein Dateisystem-Zugriff!', 'color: red; font-weight: bold');
        console.log('Sie müssen zuerst einen Speicherort auswählen.');
        return false;
    }
    
    console.log('%c✓ Dateisystem-Zugriff vorhanden', 'color: green; font-weight: bold');
    console.log(`Speicherort: ${directoryHandle.name}`);
    
    // Verfügbare Dateien anzeigen
    console.log('Dateien im Verzeichnis:');
    try {
        for await (const entry of directoryHandle.values()) {
            const fileInfo = await entry.getFile();
            console.log(`- ${entry.name} (${formatFileSize(fileInfo.size)}, zuletzt geändert: ${new Date(fileInfo.lastModified).toLocaleString()})`);
        }
    } catch (error) {
        console.log(`Fehler beim Auflisten der Dateien: ${error.message}`);
    }
    
    // Test-Schreibvorgang
    try {
        const testFile = 'test-datei.json';
        const testContent = JSON.stringify({
            test: true,
            timestamp: new Date().toISOString(),
            random: Math.random()
        }, null, 2);
        
        console.log(`Schreibe Test-Datei '${testFile}'...`);
        const fileHandle = await directoryHandle.getFileHandle(testFile, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(testContent);
        await writable.close();
        
        console.log('%c✓ Test-Datei erfolgreich geschrieben!', 'color: green; font-weight: bold');
        
        // Lese die Datei zur Bestätigung
        const file = await fileHandle.getFile();
        console.log(`Datei '${testFile}' erstellt/aktualisiert: ${new Date(file.lastModified).toLocaleString()}`);
        
        return true;
    } catch (error) {
        console.log('%c❌ Fehler beim Schreiben der Test-Datei!', 'color: red; font-weight: bold');
        console.log(error);
        return false;
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Füge Hilfsfunktion zum window-Objekt hinzu
window.testFileSystemAccess = testFileSystemAccess;

console.log('%cDateisystem-Diagnose geladen', 'color: blue; font-weight: bold');
console.log('Verwenden Sie window.testFileSystemAccess() in der Konsole, um den Dateisystem-Zugriff zu testen.');
