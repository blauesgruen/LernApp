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

// Führe die Bereinigung aus, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', function() {
    // Prüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    
    if (isLoggedIn) {
        // Füge einen Button zum Bereinigen der Kategorien hinzu
        const cleanupButton = document.createElement('button');
        cleanupButton.id = 'cleanup-categories';
        cleanupButton.className = 'btn-secondary';
        cleanupButton.innerText = 'Beispielkategorien entfernen';
        cleanupButton.style.marginBottom = '20px';
        
        cleanupButton.addEventListener('click', async function() {
            if (confirm('Möchtest du die Beispielkategorien (Allgemeinwissen, Mathematik, Naturwissenschaften) entfernen?')) {
                await bereinigeBespielsKategorien();
            }
        });
        
        // Finde einen geeigneten Ort für den Button
        const categories = document.getElementById('categories-list');
        if (categories && categories.parentElement) {
            categories.parentElement.insertBefore(cleanupButton, categories);
        }
    }
});
