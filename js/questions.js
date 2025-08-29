// questions.js – Zentrale Verwaltung für Fragen und Gruppen
// Deutsche Kommentare für Übersichtlichkeit

class QuestionManager {
    constructor() {
        // Hauptkategorien
        this.categories = ['Textfragen', 'Bilderquiz'];
        // Untergruppen je Hauptkategorie
        this.groups = {
            'Textfragen': [], // z.B. ['Muskeln', 'Organe']
            'Bilderquiz': []  // z.B. ['Knochen', 'Tiere']
        };
        // Fragen-Array
        this.questions = [];
    }

    // Neue Untergruppe anlegen
    addGroup(mainCategory, groupName) {
        if (!this.groups[mainCategory]) this.groups[mainCategory] = [];
        if (!this.groups[mainCategory].includes(groupName)) {
            this.groups[mainCategory].push(groupName);
        }
    }

    // Frage hinzufügen
    addQuestion({ mainCategory, group, question, answer, answerImage, description }) {
        const newQuestion = {
            mainCategory,
            group,
            question,
            answer: answer || null,
            answerImage: answerImage || null,
            description: description || ''
        };
        this.questions.push(newQuestion);
    }

    // Fragen nach Kategorie/Gruppe filtern
    getQuestions(mainCategory, group) {
        return this.questions.filter(q => q.mainCategory === mainCategory && q.group === group);
    }

    // Alle Gruppen einer Hauptkategorie
    getGroups(mainCategory) {
        return this.groups[mainCategory] || [];
    }
}

// Singleton-Instanz für globale Nutzung
window.questionManager = new QuestionManager();
