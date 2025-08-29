// groups.js – Verwaltung der Untergruppen (Verzeichnisbaum) für Fragen
// Deutsche Kommentare für Übersichtlichkeit

class GroupManager { 
    constructor() {
        // Struktur: { Hauptkategorie: [Untergruppe, ...] }
        this.groups = {
            'Textfragen': [],
            'Bilderquiz': []
        };
    }

    // Untergruppe hinzufügen
    addGroup(mainCategory, groupName) {
        if (!this.groups[mainCategory]) this.groups[mainCategory] = [];
        if (!this.groups[mainCategory].includes(groupName)) {
            this.groups[mainCategory].push(groupName);
        }
    }

    // Untergruppen einer Hauptkategorie abrufen
    getGroups(mainCategory) {
        return this.groups[mainCategory] || [];
    }

    // Alle Gruppen als Array von Objekten (für UI)
    getAllGroups() {
        return Object.entries(this.groups).map(([main, subs]) => ({ main, subs }));
    }
}

// Singleton-Instanz für globale Nutzung
const groupManager = new GroupManager();
// Falls Funktionen/Objekte global gebraucht werden:
window.groupManager = groupManager;
