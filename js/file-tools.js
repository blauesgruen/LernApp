// diagnose.js - Wird automatisch ausgeführt, wenn die Seite geladen wird

document.addEventListener('DOMContentLoaded', async function() {
    // Warten bis DirectoryHandle geladen ist
    setTimeout(async function() {
        // Prüfen, ob DirectoryHandle verfügbar ist
        if (!window.directoryHandle) {
            console.error("Kein DirectoryHandle gefunden. Stelle sicher, dass du einen Speicherort ausgewählt hast.");
            return;
        }
        
        console.log("DirectoryHandle gefunden:", window.directoryHandle.name);
        
        // Dateien im Hauptverzeichnis auflisten
        const files = [];
        try {
            for await (const [name, entry] of window.directoryHandle.entries()) {
                files.push({ name, kind: entry.kind });
            }
            
            console.log("Dateien im Hauptverzeichnis:", files.length);
            files.forEach(file => console.log(`- ${file.name} (${file.kind})`));
            
            // Prüfen, ob die benötigten Dateien vorhanden sind
            const hasCategories = files.some(f => f.name === 'categories.json');
            const hasGroups = files.some(f => f.name === 'groups.json');
            const hasQuestions = files.some(f => f.name === 'questions.json');
            
            console.log("categories.json vorhanden:", hasCategories);
            console.log("groups.json vorhanden:", hasGroups);
            console.log("questions.json vorhanden:", hasQuestions);
            
            // Nach dem muskeln-Ordner suchen
            const muskelnDir = files.find(f => f.kind === 'directory' && f.name === 'muskeln');
            if (muskelnDir) {
                console.log("'muskeln' Ordner gefunden, prüfe Inhalt...");
                
                try {
                    const muskelnHandle = await window.directoryHandle.getDirectoryHandle('muskeln');
                    const muskelnFiles = [];
                    
                    for await (const [name, entry] of muskelnHandle.entries()) {
                        muskelnFiles.push({ name, kind: entry.kind });
                    }
                    
                    console.log("Dateien im 'muskeln' Ordner:", muskelnFiles.length);
                    muskelnFiles.forEach(file => console.log(`- ${file.name} (${file.kind})`));
                    
                    // Prüfen, ob die JSON-Dateien im muskeln-Ordner sind
                    const hasMuskelnCategories = muskelnFiles.some(f => f.name === 'categories.json');
                    const hasMuskelnGroups = muskelnFiles.some(f => f.name === 'groups.json');
                    const hasMuskelnQuestions = muskelnFiles.some(f => f.name === 'questions.json');
                    
                    if (hasMuskelnCategories || hasMuskelnGroups || hasMuskelnQuestions) {
                        console.log("JSON-Dateien im 'muskeln' Ordner gefunden!");
                        console.log("categories.json:", hasMuskelnCategories);
                        console.log("groups.json:", hasMuskelnGroups);
                        console.log("questions.json:", hasMuskelnQuestions);
                        
                        // Benachrichtigung anzeigen
                        if (window.showNotification) {
                            window.showNotification("Dateien im falschen Ordner", 
                                "Die JSON-Dateien wurden im 'muskeln'-Unterordner gefunden, müssen aber im Hauptverzeichnis liegen. Verwende die Funktion 'moveFilesFromSubfolder()' um sie zu verschieben.", 
                                "warning");
                        }
                    }
                } catch (error) {
                    console.error("Fehler beim Zugriff auf 'muskeln' Ordner:", error);
                }
            }
        } catch (error) {
            console.error("Fehler beim Auflisten der Dateien:", error);
        }
    }, 2000); // 2 Sekunden warten, um sicherzustellen, dass DirectoryHandle geladen ist
});

// Hilfsfunktion zum Verschieben von Dateien aus einem Unterordner ins Hauptverzeichnis
window.moveFilesFromSubfolder = async function(subfolder = 'muskeln') {
    if (!window.directoryHandle) {
        if (window.showNotification) {
            window.showNotification("Fehler", "Kein DirectoryHandle verfügbar. Wähle zuerst einen Speicherort im Profil aus.", "error");
        }
        console.error("Kein DirectoryHandle verfügbar");
        return;
    }
    
    console.log(`Verschiebe Dateien aus '${subfolder}' ins Hauptverzeichnis...`);
    
    try {
        // Unterordner öffnen
        let subfolderHandle;
        try {
            subfolderHandle = await window.directoryHandle.getDirectoryHandle(subfolder);
        } catch (error) {
            if (window.showNotification) {
                window.showNotification("Fehler", `Ordner '${subfolder}' nicht gefunden.`, "error");
            }
            console.error(`Ordner '${subfolder}' nicht gefunden:`, error);
            return;
        }
        
        // Dateien im Unterordner auflisten
        const files = [];
        for await (const [name, entry] of subfolderHandle.entries()) {
            if (entry.kind === 'file') {
                files.push({ name, entry });
            }
        }
        
        console.log(`${files.length} Dateien zum Verschieben gefunden`);
        
        if (files.length === 0) {
            if (window.showNotification) {
                window.showNotification("Information", `Keine Dateien im Ordner '${subfolder}' gefunden.`, "info");
            }
            return;
        }
        
        // Dateien verschieben
        let successCount = 0;
        for (const { name, entry } of files) {
            try {
                const file = await entry.getFile();
                const content = await file.text();
                
                // Neue Datei im Hauptverzeichnis erstellen
                const newFileHandle = await window.directoryHandle.getFileHandle(name, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                console.log(`Datei '${name}' erfolgreich ins Hauptverzeichnis kopiert`);
                successCount++;
            } catch (error) {
                console.error(`Fehler beim Verschieben von '${name}':`, error);
            }
        }
        
        console.log(`Verschieben abgeschlossen: ${successCount} von ${files.length} Dateien erfolgreich verschoben`);
        
        if (window.showNotification) {
            if (successCount > 0) {
                window.showNotification(
                    "Erfolg", 
                    `${successCount} Dateien wurden ins Hauptverzeichnis verschoben. Bitte lade die Seite neu, um die Änderungen zu sehen.`, 
                    "success"
                );
            } else {
                window.showNotification(
                    "Fehler", 
                    "Keine Dateien konnten verschoben werden.", 
                    "error"
                );
            }
        }
    } catch (error) {
        console.error("Fehler beim Verschieben der Dateien:", error);
        if (window.showNotification) {
            window.showNotification("Fehler", `Fehler beim Verschieben der Dateien: ${error.message}`, "error");
        }
    }
};

// Funktion zum Laden der JSON-Dateien aus dem Hauptverzeichnis
window.loadJsonFiles = async function() {
    if (!window.directoryHandle) {
        console.error("Kein DirectoryHandle verfügbar");
        return;
    }
    
    const results = {};
    
    try {
        // Dateinamen, die geladen werden sollen
        const fileNames = ['categories.json', 'groups.json', 'questions.json'];
        
        for (const fileName of fileNames) {
            try {
                const fileHandle = await window.directoryHandle.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                const text = await file.text();
                const json = JSON.parse(text);
                
                results[fileName] = json;
                console.log(`${fileName} erfolgreich geladen:`, json.length, "Einträge");
            } catch (error) {
                console.error(`Fehler beim Laden von ${fileName}:`, error);
                results[fileName] = null;
            }
        }
    } catch (error) {
        console.error("Fehler beim Laden der JSON-Dateien:", error);
    }
    
    return results;
};

console.log("Diagnose-Tool geladen. Verwende window.moveFilesFromSubfolder() um Dateien aus dem 'muskeln'-Ordner ins Hauptverzeichnis zu verschieben.");
