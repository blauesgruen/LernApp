// questions.js – Zentrale Verwaltung für Fragen und Gruppen
// Deutsche Kommentare für Übersichtlichkeit

class QuestionManager {
    // Gibt alle Unterkategorien als Button-HTML zurück (für Quiz-Auswahl)
    getGroupButtons(mainCategory) {
        var groups = this.getGroups(mainCategory);
        var html = '';
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var count = this.getQuestions(mainCategory, group).length;
            html += '<button class="btn btn-outline-primary d-flex flex-column align-items-center" style="min-width:140px;margin:4px;" onclick="window.app.startQuiz(\'' + mainCategory + '\',\'' + group + '\')">'
                + '<span>' + group + '</span>'
                + '<span class="badge bg-secondary mt-1">' + count + ' Fragen</span>'
                + '</button>';
        }
        return html;
    }
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
        // Demo-Fragen initialisieren
        // Muss nach allen Properties erfolgen
        this.initDemoTextQuiz();
    }

    // Initialisiert Demo-Unterkategorie und Fragen für Textquiz
    initDemoTextQuiz() {
        var demoGroup = 'Demo Testfragen';
        this.addGroup('Textfragen', demoGroup);
        var demoQuestions = [
            {
                question: 'Was ist die Hauptstadt von Deutschland?',
                answer: 'Berlin',
                description: 'Berlin ist die größte Stadt Deutschlands.'
            },
            {
                question: 'Wie viele Kontinente gibt es?',
                answer: '7',
                description: 'Die Kontinente sind Europa, Asien, Afrika, Nordamerika, Südamerika, Australien und Antarktis.'
            },
            {
                question: 'Welches Element hat das chemische Symbol "O"?',
                answer: 'Sauerstoff',
                description: 'Sauerstoff ist lebenswichtig für die Atmung.'
            },
            {
                question: 'Wer schrieb "Faust"?',
                answer: 'Goethe',
                description: 'Johann Wolfgang von Goethe ist einer der bekanntesten deutschen Dichter.'
            },
            {
                question: 'Was ist das Ergebnis von 9 x 7?',
                answer: '63',
                description: '9 mal 7 ergibt 63.'
            }
        ];
        for (var i = 0; i < demoQuestions.length; i++) {
            var q = demoQuestions[i];
            this.addQuestion({
                mainCategory: 'Textfragen',
                group: demoGroup,
                question: q.question,
                answer: q.answer,
                description: q.description
            });
        }
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
// Nach Laden der Seite: Hauptkategorien anzeigen, dann Unterkategorien nach Auswahl
document.addEventListener('DOMContentLoaded', function() {
    var btnContainer = document.getElementById('category-buttons');
    if (!btnContainer) return;
    // Hauptkategorien anzeigen
    var mainCats = window.questionManager.categories;
    btnContainer.innerHTML = '';
    for (var i = 0; i < mainCats.length; i++) {
        var cat = mainCats[i];
        btnContainer.innerHTML += '<button class="btn btn-primary" style="min-width:140px;margin:4px;" onclick="window.showSubcategories(\'' + cat + '\')">' + cat + '</button>';
    }
});

// Zeigt die Unterkategorien für eine Hauptkategorie an
window.showSubcategories = function(mainCategory) {
    var btnContainer = document.getElementById('category-buttons');
    if (!btnContainer) return;
    btnContainer.innerHTML = window.questionManager.getGroupButtons(mainCategory);
};
