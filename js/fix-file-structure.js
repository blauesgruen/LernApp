// Hilfsfunktion um die Dateistruktur zu überprüfen und anzupassen

/**
 * Überprüft und korrigiert die Speicherstruktur
 * 
 * Dieses Skript:
 * 1. Überprüft, ob die Dateien am richtigen Ort liegen
 * 2. Verschiebt sie ggf. vom Unterordner ins Hauptverzeichnis
 * 3. Stellt sicher, dass die Dateien gültige JSON-Inhalte haben
 */
async function fixFileStructure() {
    console.log('=== Überprüfe Dateistruktur ===');
    
    // Prüfen, ob DirectoryHandle verfügbar ist
    if (!window.directoryHandle) {
        console.error('Kein DirectoryHandle verfügbar!');
        return { success: false, error: 'Kein DirectoryHandle verfügbar' };
    }
    
    // Nach dem "muskeln"-Unterordner suchen
    let muskelnDir = null;
    try {
        for await (const [name, entry] of window.directoryHandle.entries()) {
            if (entry.kind === 'directory' && name === 'muskeln') {
                muskelnDir = entry;
                console.log('✓ "muskeln" Unterordner gefunden');
                break;
            }
        }
    } catch (error) {
        console.error('Fehler beim Durchsuchen des Hauptverzeichnisses:', error);
        return { success: false, error: error.message };
    }
    
    // Wenn der Unterordner nicht gefunden wurde, nichts zu tun
    if (!muskelnDir) {
        console.log('ℹ️ Kein "muskeln" Unterordner gefunden');
        
        // Prüfen, ob die Dateien direkt im Hauptverzeichnis liegen
        const files = ['categories.json', 'groups.json', 'questions.json'];
        let mainDirFiles = [];
        
        try {
            for await (const [name, entry] of window.directoryHandle.entries()) {
                if (entry.kind === 'file') {
                    mainDirFiles.push(name);
                }
            }
            
            const missingFiles = files.filter(file => !mainDirFiles.includes(file));
            if (missingFiles.length === 0) {
                console.log('✓ Alle erforderlichen Dateien sind im Hauptverzeichnis vorhanden');
            } else {
                console.warn(`⚠️ Folgende Dateien fehlen im Hauptverzeichnis: ${missingFiles.join(', ')}`);
            }
        } catch (error) {
            console.error('Fehler beim Prüfen der Dateien im Hauptverzeichnis:', error);
        }
        
        return { success: true, message: 'Keine Korrektur erforderlich' };
    }
    
    // Dateien aus dem Unterordner ins Hauptverzeichnis verschieben
    console.log('Verschiebe Dateien aus "muskeln" ins Hauptverzeichnis...');
    
    const filesToMove = ['categories.json', 'groups.json', 'questions.json'];
    const moveResults = [];
    
    for (const fileName of filesToMove) {
        try {
            // Prüfen, ob die Datei im Unterordner existiert
            let fileHandle;
            try {
                fileHandle = await muskelnDir.getFileHandle(fileName);
            } catch (error) {
                console.warn(`⚠️ Datei ${fileName} nicht im "muskeln"-Ordner gefunden`);
                moveResults.push({ file: fileName, success: false, error: 'Datei nicht gefunden' });
                continue;
            }
            
            // Datei aus dem Unterordner lesen
            const file = await fileHandle.getFile();
            const content = await file.text();
            
            // Validieren, dass es gültiges JSON ist
            try {
                JSON.parse(content);
            } catch (parseError) {
                console.error(`⚠️ Datei ${fileName} enthält ungültiges JSON:`, parseError);
                moveResults.push({ file: fileName, success: false, error: 'Ungültiges JSON' });
                continue;
            }
            
            // Neue Datei im Hauptverzeichnis erstellen
            try {
                const newFileHandle = await window.directoryHandle.getFileHandle(fileName, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                console.log(`✓ ${fileName} erfolgreich ins Hauptverzeichnis kopiert`);
                moveResults.push({ file: fileName, success: true });
            } catch (writeError) {
                console.error(`⚠️ Fehler beim Schreiben von ${fileName} ins Hauptverzeichnis:`, writeError);
                moveResults.push({ file: fileName, success: false, error: writeError.message });
            }
            
        } catch (error) {
            console.error(`⚠️ Allgemeiner Fehler bei ${fileName}:`, error);
            moveResults.push({ file: fileName, success: false, error: error.message });
        }
    }
    
    // Zusammenfassung anzeigen
    const successful = moveResults.filter(r => r.success).length;
    const failed = moveResults.filter(r => !r.success).length;
    
    console.log(`\n=== Zusammenfassung ===`);
    console.log(`- ${successful} von ${filesToMove.length} Dateien erfolgreich verschoben`);
    if (failed > 0) {
        console.log(`- ${failed} Dateien konnten nicht verschoben werden`);
    }
    
    console.log('\nBitte lade die Seite neu, um die Änderungen zu sehen');
    
    return {
        success: successful > 0,
        message: `${successful} Dateien erfolgreich verschoben. Bitte Seite neu laden.`,
        details: moveResults
    };
}

// Führe die Funktion aus
fixFileStructure().then(result => {
    console.log(result.message);
});
