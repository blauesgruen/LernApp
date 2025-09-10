// cleanup-categories.js - Bereinigt die bestehenden Kategorien

/**
 * Diese Funktion entfernt die Standardkategorien (Allgemeinwissen, Mathematik, Naturwissenschaften)
 * aus dem lokalen Speicher, damit sie nicht mehr angezeigt werden.
 */
async function bereinigeBespielsKategorien() {
    try {
        console.log("Starte Bereinigung der Beispielkategorien...");
        
        // Aktuelle Kategorien laden
        const categories = await window.loadData("categories.json", []);
        console.log(`${categories.length} Kategorien gefunden.`);
        
        // Kategorie-Namen, die entfernt werden sollen
        const zuEntfernen = ["Allgemeinwissen", "Mathematik", "Naturwissenschaften"];
        
        // Kategorien filtern und nur diejenigen behalten, die nicht in der Liste sind
        const bereinigteListe = categories.filter(category => 
            !zuEntfernen.includes(category.name)
        );
        
        console.log(`${categories.length - bereinigteListe.length} Kategorien wurden entfernt.`);
        
        // Bereinigte Liste speichern
        const erfolgreich = await window.saveData("categories.json", bereinigteListe);
        
        if (erfolgreich) {
            console.log("Kategorien wurden erfolgreich bereinigt.");
            alert("Die Beispielkategorien wurden erfolgreich entfernt. Die Seite wird neu geladen.");
            location.reload();
        } else {
            console.error("Fehler beim Speichern der bereinigten Kategorien.");
            alert("Fehler beim Entfernen der Beispielkategorien.");
        }
    } catch (error) {
        console.error("Fehler bei der Bereinigung der Kategorien:", error);
        alert("Fehler bei der Bereinigung der Kategorien: " + error.message);
    }
}

// Diese Datei ist jetzt leer, da alle Storage- und JSON-Funktionen entfernt wurden.
// Die Kategorienbereinigung erfolgt jetzt direkt in Supabase.
