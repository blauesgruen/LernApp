// force-sync.js - Erzwingt die Synchronisation zwischen Dateisystem und Browser-Speicher

/**
 * Dieses Skript kann in der Browser-Konsole ausgeführt werden, um:
 * 1. Den Inhalt der JSON-Dateien im Dateisystem zu prüfen
 * 2. Die Synchronisation zwischen Dateisystem und Browser zu erzwingen
 */
async function forceSync() {
    console.log('=== Starte erzwungene Synchronisation ===');
    
    // Prüfen, ob DirectoryHandle verfügbar ist
    if (!window.directoryHandle) {
        console.error('⚠️ Kein DirectoryHandle verfügbar!');
        console.log('Bitte wähle zuerst einen Speicherort im Profil-Bereich aus.');
        return;
    }
    
    console.log('✓ DirectoryHandle gefunden:', window.directoryHandle.name);
    
    // Dateien im Dateisystem auflisten
    console.log('Dateien im Dateisystem:');
    const fileNames = [];
    try {
        for await (const [name, entry] of window.directoryHandle.entries()) {
            fileNames.push({name, kind: entry.kind});
            console.log(`- ${entry.kind === 'file' ? '📄' : '📁'} ${name}`);
        }
    } catch (error) {
        console.error('⚠️ Fehler beim Auflisten der Dateien:', error);
    }
    
    // Prüfen, ob die relevanten Dateien vorhanden sind
    const requiredFiles = ['categories.json', 'groups.json', 'questions.json'];
    const missingFiles = requiredFiles.filter(
        file => !fileNames.some(f => f.name === file && f.kind === 'file')
    );
    
    if (missingFiles.length > 0) {
        console.warn(`⚠️ Folgende Dateien fehlen im Dateisystem: ${missingFiles.join(', ')}`);
    } else {
        console.log('✓ Alle erforderlichen Dateien sind im Dateisystem vorhanden');
    }
    
    // Versuchen, die Dateien zu lesen und zu synchronisieren
    console.log('\n=== Lese Dateien aus dem Dateisystem ===');
    
    for (const fileName of requiredFiles) {
        try {
            // Prüfen, ob die Datei im Dateisystem existiert
            let fileHandle;
            try {
                fileHandle = await window.directoryHandle.getFileHandle(fileName);
            } catch (error) {
                console.warn(`⚠️ Datei ${fileName} nicht im Dateisystem gefunden`);
                continue;
            }
            
            // Datei lesen
            const file = await fileHandle.getFile();
            const text = await file.text();
            let data;
            
            try {
                data = JSON.parse(text);
                console.log(`✓ ${fileName} erfolgreich gelesen:`, {
                    size: text.length,
                    items: Array.isArray(data) ? data.length : 'nicht ein Array',
                    preview: Array.isArray(data) && data.length > 0 ? 
                        (data[0].name || data[0].id || 'kein Name/ID') : 
                        'leer oder kein Array'
                });
                
                // Mit Browser-Speicher vergleichen
                const localData = JSON.parse(localStorage.getItem(fileName) || 'null');
                
                if (!localData) {
                    console.log(`➡️ ${fileName} nicht im Browser-Speicher, füge hinzu...`);
                    localStorage.setItem(fileName, JSON.stringify(data));
                    console.log(`✓ ${fileName} in Browser-Speicher gespeichert`);
                } else {
                    const localSize = Array.isArray(localData) ? localData.length : 'nicht ein Array';
                    const fileSize = Array.isArray(data) ? data.length : 'nicht ein Array';
                    
                    console.log(`ℹ️ ${fileName} im Browser-Speicher:`, {
                        items: localSize,
                        preview: Array.isArray(localData) && localData.length > 0 ? 
                            (localData[0].name || localData[0].id || 'kein Name/ID') : 
                            'leer oder kein Array'
                    });
                    
                    // Prüfen, ob Daten unterschiedlich sind
                    const isEqual = JSON.stringify(data) === JSON.stringify(localData);
                    if (!isEqual) {
                        console.log(`➡️ Unterschiede gefunden in ${fileName}, aktualisiere Browser-Speicher...`);
                        localStorage.setItem(fileName, JSON.stringify(data));
                        console.log(`✓ ${fileName} in Browser-Speicher aktualisiert`);
                    } else {
                        console.log(`✓ ${fileName} im Browser-Speicher ist bereits aktuell`);
                    }
                }
                
            } catch (parseError) {
                console.error(`⚠️ Fehler beim Parsen von ${fileName}:`, parseError);
                console.log('Inhalt der Datei:', text.substring(0, 100) + '...');
            }
            
        } catch (error) {
            console.error(`⚠️ Fehler beim Verarbeiten von ${fileName}:`, error);
        }
    }
    
    console.log('\n=== Synchronisation abgeschlossen ===');
    console.log('Bitte lade die Seite neu, um die Änderungen zu sehen');
    return {
        success: true,
        message: 'Synchronisation abgeschlossen. Bitte Seite neu laden.'
    };
}

// Führe die Funktion aus
forceSync().then(result => {
    console.log(result.message);
});
