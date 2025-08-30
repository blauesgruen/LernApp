// questions.js – Zentrale Verwaltung für Fragen und Gruppen
// Deutsche Kommentare für Übersichtlichkeit

class QuestionManager {
    // NEU: Verschachtelte Gruppenstruktur
    // this.nestedGroups = {
    //   'Textfragen': [ { name: 'Unterkategorie', children: [ { name: 'Quizfragengruppe', children: [] } ] } ],
    //   'Bilderquiz': [ ... ]
    // }
    nestedGroups = {
        'Textfragen': [],
        'Bilderquiz': []
    };

    // Fügt eine verschachtelte Gruppe hinzu (parentPath = Array von Namen)
    addNestedGroup(mainCategory, groupName, parentPath = []) {
        let node = this.nestedGroups[mainCategory];
        for (const part of parentPath) {
            let found = node.find(g => g.name === part);
            if (!found) return false;
            node = found.children;
        }
        if (!node.find(g => g.name === groupName)) {
            node.push({ name: groupName, children: [] });
            return true;
        }
        return false;
    }

    // Holt alle Gruppen/Untergruppen als Array (rekursiv)
    getNestedGroups(mainCategory, node = undefined, path = []) {
        // Wenn node explizit als [] übergeben wird, trotzdem Wurzel nehmen
        if (!node || (Array.isArray(node) && node.length === 0)) {
            node = this.nestedGroups[mainCategory] || [];
        }
        let result = [];
        for (const group of node) {
            const fullPath = [...path, group.name];
            result.push({ path: fullPath, name: group.name });
            if (group.children && group.children.length > 0) {
                result = result.concat(this.getNestedGroups(mainCategory, group.children, fullPath));
            }
        }
        return result;
    }

    // Holt alle Fragen zu einem Gruppenpfad (z.B. ['Unterkategorie', 'Quizfragengruppe'])
    getQuestionsByGroupPath(mainCategory, groupPathArr) {
        return this.questions.filter(q =>
            q.mainCategory === mainCategory &&
            Array.isArray(q.groupPath) &&
            q.groupPath.join('>') === groupPathArr.join('>')
        );
    }

    // Wrapper für alte Methoden (Kompatibilität)
    addGroup(mainCategory, groupName) {
        // Flach wie bisher, aber auch in verschachtelte Struktur als Top-Level
        if (!this.groups[mainCategory]) this.groups[mainCategory] = [];
        if (!this.groups[mainCategory].includes(groupName)) {
            this.groups[mainCategory].push(groupName);
        }
        // Auch in verschachtelte Struktur als Top-Level
        if (!this.nestedGroups[mainCategory].find(g => g.name === groupName)) {
            this.nestedGroups[mainCategory].push({ name: groupName, children: [] });
        }
    }

    // Holt alle Top-Level Gruppen (Kompatibilität)
    getGroups(mainCategory) {
        return this.groups[mainCategory] || [];
    }

    // Frage hinzufügen (Kompatibilität: groupPath optional)
    addQuestion({ mainCategory, group, question, answer, answerImage, description, groupPath }) {
        const newQuestion = {
            mainCategory,
            group,
            question,
            answer: answer || null,
            answerImage: answerImage || null,
            description: description || '',
            groupPath: groupPath || (group ? [group] : [])
        };
        this.questions.push(newQuestion);
    }
    // Gibt alle Fragen einer bestimmten Gruppe (über alle Hauptkategorien) zurück
    getQuestionsByGroup(group) {
        return this.questions.filter(q => q.group === group);
    }
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
        // Demo-Unterkategorie für verschachtelte Gruppen
        var demoSubgroup = 'Demo-Unterkategorie';
        if (this.nestedGroups && Array.isArray(this.nestedGroups['Textfragen'])) {
            // Nur hinzufügen, wenn noch nicht vorhanden
            if (!this.nestedGroups['Textfragen'].find(g => g.name === demoSubgroup)) {
                this.nestedGroups['Textfragen'].push({ name: demoSubgroup, children: [] });
            }
        }
        // Logging: Wie sieht nestedGroups['Textfragen'] jetzt aus?
    // ...
        // Demo-Frage in die Unterkategorie
        var demoQuestions = [
            {
                question: 'Was ist die Hauptstadt von Deutschland?',
                answer: 'Berlin',
                description: 'Berlin ist die größte Stadt Deutschlands.'
            }
        ];
        for (var i = 0; i < demoQuestions.length; i++) {
            var q = demoQuestions[i];
            this.addQuestion({
                mainCategory: 'Textfragen',
                group: demoSubgroup,
                question: q.question,
                answer: q.answer,
                description: q.description
            });
        }
        // Logging: Teste getNestedGroups
    // ...
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

    // Lädt alle Userdaten (Fragen, Kategorien, Statistiken) in den questionManager
    loadUserData(userObj) {
        this.categories = Array.isArray(userObj.categories) ? [...userObj.categories] : [];
        this.groups = {};
        // Gruppen aus Fragen ableiten
        if (Array.isArray(userObj.questions)) {
            userObj.questions.forEach(q => {
                if (!this.groups[q.mainCategory]) this.groups[q.mainCategory] = [];
                if (!this.groups[q.mainCategory].includes(q.group)) this.groups[q.mainCategory].push(q.group);
            });
        }
        this.questions = Array.isArray(userObj.questions) ? userObj.questions.map(q => ({...q})) : [];
        this.statistics = userObj.statistics ? {...userObj.statistics} : {};
    }

    // Gibt ein Userpaket (Fragen, Kategorien, Statistiken) zurück
    getUserData() {
        return {
            categories: [...this.categories],
            questions: this.questions.map(q => ({...q})),
            statistics: this.statistics ? {...this.statistics} : {}
        };
    }
}

// Singleton-Instanz für globale Nutzung
window.questionManager = new QuestionManager();
