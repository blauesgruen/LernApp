// storage-diagnosis.js - Diagnoseskript für Speicherprobleme

/**
 * Diagnosefunktion für Storage-Probleme
 * Führe diese Funktion in der Browser-Konsole aus, um Probleme zu diagnostizieren
 */
async function diagnoseStorageIssues() {
    console.group("🔍 LernApp Storage-Diagnose");
    
    // 1. Prüfe DirectoryHandle
    console.log("Prüfe DirectoryHandle...");
    
    const directoryHandle = window.directoryHandle;
    if (!directoryHandle) {
        console.error("❌ Kein DirectoryHandle gefunden!");
        console.log("Lösung: Gehe zum Profil und wähle einen Speicherort aus.");
        console.groupEnd();
        return;
    }
    
    console.log("✅ DirectoryHandle gefunden:", directoryHandle.name);
    
    // 2. Teste Schreibzugriff
    console.log("Teste Schreibzugriff...");
    try {
        const testFileHandle = await directoryHandle.getFileHandle('diagnose-test.txt', { create: true });
        const writable = await testFileHandle.createWritable();
        await writable.write("Diagnose-Test " + new Date().toISOString());
        await writable.close();
        console.log("✅ Schreibtest erfolgreich");
    } catch (error) {
        console.error("❌ Schreibtest fehlgeschlagen:", error);
        console.log("Lösung: Gehe zum Profil und wähle den Speicherort erneut aus.");
        console.groupEnd();
        return;
    }
    
    // 3. Liste Dateien im Hauptverzeichnis auf
    console.log("Liste Dateien im Hauptverzeichnis auf...");
    
    const entries = [];
    try {
        for await (const [name, entry] of directoryHandle.entries()) {
            entries.push({ name, kind: entry.kind });
        }
        console.table(entries);
        
        // Prüfe nach bekannten Dateinamen
        const hasCategories = entries.some(e => e.name === 'categories.json');
        const hasGroups = entries.some(e => e.name === 'groups.json');
        const hasQuestions = entries.some(e => e.name === 'questions.json');
        
        if (hasCategories && hasGroups && hasQuestions) {
            console.log("✅ Alle benötigten Dateien gefunden");
        } else {
            console.warn("⚠️ Nicht alle benötigten Dateien gefunden:");
            console.log("categories.json:", hasCategories ? "✅" : "❌");
            console.log("groups.json:", hasGroups ? "✅" : "❌");
            console.log("questions.json:", hasQuestions ? "✅" : "❌");
        }
        
        // Prüfe nach Unterordnern
        const subfolders = entries.filter(e => e.kind === 'directory');
        if (subfolders.length > 0) {
            console.log("Gefundene Unterordner:", subfolders.map(f => f.name).join(", "));
            
            // Prüfe speziell nach dem "muskeln" Unterordner
            const muskelnFolder = subfolders.find(f => f.name === 'muskeln');
            if (muskelnFolder) {
                console.log("Der Ordner 'muskeln' wurde gefunden. Prüfe seinen Inhalt...");
                
                // Prüfe Inhalt des "muskeln" Ordners
                try {
                    const muskelnHandle = await directoryHandle.getDirectoryHandle('muskeln');
                    const muskelnEntries = [];
                    for await (const [name, entry] of muskelnHandle.entries()) {
                        muskelnEntries.push({ name, kind: entry.kind });
                    }
                    console.log("Inhalt des 'muskeln' Ordners:");
                    console.table(muskelnEntries);
                } catch (error) {
                    console.error("Fehler beim Zugriff auf den 'muskeln' Ordner:", error);
                }
            }
        }
    } catch (error) {
        console.error("❌ Fehler beim Auflisten der Dateien:", error);
        console.groupEnd();
        return;
    }
    
    // 4. Teste das Laden einer spezifischen Datei
    console.log("Teste Laden der categories.json...");
    
    try {
        let fileData = null;
        
        // Versuche im Hauptverzeichnis
        try {
            const fileHandle = await directoryHandle.getFileHandle('categories.json');
            const file = await fileHandle.getFile();
            const text = await file.text();
            fileData = JSON.parse(text);
            console.log("✅ categories.json aus dem Hauptverzeichnis geladen:");
        } catch (mainDirError) {
            console.log("categories.json nicht im Hauptverzeichnis gefunden, versuche 'muskeln' Unterordner...");
            
            // Versuche im "muskeln" Unterordner
            try {
                const muskelnHandle = await directoryHandle.getDirectoryHandle('muskeln');
                const fileHandle = await muskelnHandle.getFileHandle('categories.json');
                const file = await fileHandle.getFile();
                const text = await file.text();
                fileData = JSON.parse(text);
                console.log("✅ categories.json aus dem 'muskeln' Unterordner geladen:");
            } catch (subfoldError) {
                console.error("❌ Datei in keinem der gesuchten Orte gefunden:", subfoldError);
            }
        }
        
        if (fileData) {
            console.log(fileData);
        }
    } catch (error) {
        console.error("❌ Fehler beim Laden der Datei:", error);
    }
    
    // 5. Prüfe Browser-Speicher
    console.log("Prüfe Browser-Speicher...");
    
    try {
        const localCategories = localStorage.getItem('categories');
        const localGroups = localStorage.getItem('groups');
        const localQuestions = localStorage.getItem('questions');
        
        console.log("categories im Browser-Speicher:", localCategories ? "✅" : "❌");
        console.log("groups im Browser-Speicher:", localGroups ? "✅" : "❌");
        console.log("questions im Browser-Speicher:", localQuestions ? "✅" : "❌");
        
        if (localCategories) {
            const categoriesData = JSON.parse(localCategories);
            console.log(`Kategorien im Browser-Speicher: ${categoriesData.length}`);
            
            // Prüfe nach Muskel-Kategorie
            const hasMuskelCategory = categoriesData.some(c => 
                c.name === "Muskeln" || 
                c.id === "muscle-anatomy-01"
            );
            
            console.log("Muskel-Kategorie im Browser-Speicher:", hasMuskelCategory ? "✅" : "❌");
        }
    } catch (error) {
        console.error("❌ Fehler beim Prüfen des Browser-Speichers:", error);
    }
    
    // 6. Diagnose abschließen
    console.log("Diagnose abgeschlossen");
    console.groupEnd();
    
    // Rückgabe von Diagnoseergebnissen
    return {
        directoryHandleOK: !!directoryHandle,
        directoryName: directoryHandle?.name,
        filesInRoot: entries,
        message: "Diagnose abgeschlossen. Siehe Konsolenausgabe für Details."
    };
}

// Die Funktion im globalen Kontext verfügbar machen
window.diagnoseStorageIssues = diagnoseStorageIssues;

// Automatisch ausführen und Ergebnis in der Konsole anzeigen
console.log("Storage-Diagnose-Tool geladen");
console.log("Führe 'window.diagnoseStorageIssues()' in der Konsole aus, um eine vollständige Diagnose zu starten");

// Eine einfache Hilfsfunktion zum Verschieben von Dateien aus einem Unterordner ins Hauptverzeichnis
window.moveFilesFromSubfolder = async function(subfolder) {
    if (!window.directoryHandle) {
        console.error("Kein DirectoryHandle verfügbar");
        return;
    }
    
    console.log(`Versuche, Dateien aus '${subfolder}' ins Hauptverzeichnis zu verschieben...`);
    
    try {
        // Unterordner öffnen
        const subfolderHandle = await window.directoryHandle.getDirectoryHandle(subfolder);
        
        // Dateien im Unterordner auflisten
        const entries = [];
        for await (const [name, entry] of subfolderHandle.entries()) {
            if (entry.kind === 'file') {
                entries.push({ name, entry });
            }
        }
        
        console.log(`${entries.length} Dateien gefunden`);
        
        // Dateien verschieben
        for (const { name, entry } of entries) {
            try {
                const file = await entry.getFile();
                const content = await file.text();
                
                // Neue Datei im Hauptverzeichnis erstellen
                const newFileHandle = await window.directoryHandle.getFileHandle(name, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                console.log(`✅ Datei '${name}' erfolgreich ins Hauptverzeichnis kopiert`);
            } catch (error) {
                console.error(`❌ Fehler beim Verschieben von '${name}':`, error);
            }
        }
        
        console.log("Verschieben abgeschlossen");
    } catch (error) {
        console.error(`❌ Fehler beim Zugriff auf Unterordner '${subfolder}':`, error);
    }
};
