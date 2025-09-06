// quiz-db.js - Verwaltung der Quiz-Datenbank

/**
 * Quiz-Datenbank-Verwaltung
 * Dieses Modul stellt Funktionen für die Verwaltung der Quiz-Datenbank bereit,
 * einschließlich Kategorien, Gruppen und Fragen.
 */

// Konstanten für Hauptkategorien
const MAIN_CATEGORY = {
    TEXT: "text",
    IMAGE: "image"
};

// Standardkategorien, die beim ersten Start erstellt werden
const DEFAULT_CATEGORIES = [
    {
        id: "text-quiz",
        name: "Textfragen",
        description: "Fragen in Textform",
        mainCategory: MAIN_CATEGORY.TEXT,
        createdBy: "system",
        createdAt: Date.now()
    },
    {
        id: "image-quiz",
        name: "Bilderquiz",
        description: "Fragen zu Bildern",
        mainCategory: MAIN_CATEGORY.IMAGE,
        createdBy: "system",
        createdAt: Date.now()
    }
];

/**
 * Initialisiert die Datenbank bei der ersten Benutzung
 */
async function initializeDatabase() {
    console.log("Initialisiere Quiz-Datenbank...");
    
    // Kategorien initialisieren
    const categories = await loadCategories();
    if (categories.length === 0) {
        console.log("Keine Kategorien gefunden. Erstelle Standardkategorien...");
        await saveCategories(DEFAULT_CATEGORIES);
    }
    
    console.log("Quiz-Datenbank wurde erfolgreich initialisiert.");
}

/**
 * Lädt alle Kategorien
 * @returns {Promise<Array>} Array mit allen Kategorien
 */
async function loadCategories() {
    try {
        return await window.loadData("categories.json", []);
    } catch (error) {
        console.error("Fehler beim Laden der Kategorien:", error);
        return [];
    }
}

/**
 * Speichert alle Kategorien
 * @param {Array} categories - Array mit allen Kategorien
 * @returns {Promise<boolean>} True, wenn erfolgreich gespeichert
 */
async function saveCategories(categories) {
    try {
        return await window.saveData("categories.json", categories);
    } catch (error) {
        console.error("Fehler beim Speichern der Kategorien:", error);
        return false;
    }
}

/**
 * Erstellt eine neue Kategorie
 * @param {string} name - Name der Kategorie
 * @param {string} description - Beschreibung der Kategorie
 * @param {string} mainCategory - Hauptkategorie (MAIN_CATEGORY.TEXT oder MAIN_CATEGORY.IMAGE)
 * @param {string} createdBy - Benutzername des Erstellers
 * @returns {Promise<object|null>} Die erstellte Kategorie oder null bei Fehler
 */
async function createCategory(name, description, mainCategory, createdBy) {
    if (!name || !mainCategory) {
        console.error("Name und Hauptkategorie sind erforderlich.");
        return null;
    }

    try {
        const categories = await loadCategories();
        
        // Neue Kategorie erstellen
        const newCategory = {
            id: `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            description: description || "",
            mainCategory,
            createdBy,
            createdAt: Date.now()
        };
        
        // Zur Liste hinzufügen und speichern
        categories.push(newCategory);
        const success = await saveCategories(categories);
        
        return success ? newCategory : null;
    } catch (error) {
        console.error("Fehler beim Erstellen der Kategorie:", error);
        return null;
    }
}

/**
 * Lädt alle Gruppen
 * @returns {Promise<Array>} Array mit allen Gruppen
 */
async function loadGroups() {
    try {
        return await window.loadData("groups.json", []);
    } catch (error) {
        console.error("Fehler beim Laden der Gruppen:", error);
        return [];
    }
}

/**
 * Speichert alle Gruppen
 * @param {Array} groups - Array mit allen Gruppen
 * @returns {Promise<boolean>} True, wenn erfolgreich gespeichert
 */
async function saveGroups(groups) {
    try {
        return await window.saveData("groups.json", groups);
    } catch (error) {
        console.error("Fehler beim Speichern der Gruppen:", error);
        return false;
    }
}

/**
 * Erstellt eine neue Gruppe
 * @param {string} name - Name der Gruppe
 * @param {string} categoryId - ID der übergeordneten Kategorie
 * @param {string} description - Beschreibung der Gruppe
 * @param {string} createdBy - Benutzername des Erstellers
 * @returns {Promise<object|null>} Die erstellte Gruppe oder null bei Fehler
 */
async function createGroup(name, categoryId, description, createdBy) {
    if (!name || !categoryId) {
        console.error("Name und Kategorie-ID sind erforderlich.");
        return null;
    }

    try {
        const groups = await loadGroups();
        
        // Neue Gruppe erstellen
        const newGroup = {
            id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            categoryId,
            description: description || "",
            createdBy,
            createdAt: Date.now()
        };
        
        // Zur Liste hinzufügen und speichern
        groups.push(newGroup);
        const success = await saveGroups(groups);
        
        return success ? newGroup : null;
    } catch (error) {
        console.error("Fehler beim Erstellen der Gruppe:", error);
        return null;
    }
}

/**
 * Lädt alle Fragen
 * @returns {Promise<Array>} Array mit allen Fragen
 */
async function loadQuestions() {
    try {
        return await window.loadData("questions.json", []);
    } catch (error) {
        console.error("Fehler beim Laden der Fragen:", error);
        return [];
    }
}

/**
 * Speichert alle Fragen
 * @param {Array} questions - Array mit allen Fragen
 * @returns {Promise<boolean>} True, wenn erfolgreich gespeichert
 */
async function saveQuestions(questions) {
    try {
        return await window.saveData("questions.json", questions);
    } catch (error) {
        console.error("Fehler beim Speichern der Fragen:", error);
        return false;
    }
}

/**
 * Erstellt eine neue Frage
 * @param {object} questionData - Daten der Frage
 * @returns {Promise<object|null>} Die erstellte Frage oder null bei Fehler
 */
async function createQuestion(questionData) {
    if (!questionData || !questionData.text || !questionData.categoryId || !questionData.groupId) {
        console.error("Unvollständige Fragendaten.");
        return null;
    }
    
    // Prüfen, ob mindestens eine Option richtig ist
    if (!questionData.options || !questionData.options.some(option => option.isCorrect)) {
        console.error("Mindestens eine Antwortoption muss richtig sein.");
        return null;
    }

    try {
        const questions = await loadQuestions();
        
        // Neue Frage erstellen
        const newQuestion = {
            id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: questionData.text,
            imageUrl: questionData.imageUrl || "",
            options: questionData.options.map(option => ({
                id: `option-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                text: option.text,
                isCorrect: option.isCorrect
            })),
            explanation: questionData.explanation || "",
            categoryId: questionData.categoryId,
            groupId: questionData.groupId,
            difficulty: questionData.difficulty || 1,
            createdBy: questionData.createdBy,
            createdAt: Date.now()
        };
        
        // Zur Liste hinzufügen und speichern
        questions.push(newQuestion);
        const success = await saveQuestions(questions);
        
        return success ? newQuestion : null;
    } catch (error) {
        console.error("Fehler beim Erstellen der Frage:", error);
        return null;
    }
}

/**
 * Holt Fragen für ein Quiz basierend auf Kategorie, Gruppe und Anzahl
 * @param {string} categoryId - ID der Kategorie
 * @param {string} [groupId] - ID der Gruppe (optional)
 * @param {number} [count=10] - Anzahl der gewünschten Fragen
 * @returns {Promise<Array>} Array mit zufällig ausgewählten Fragen
 */
async function getQuizQuestions(categoryId, groupId = null, count = 10) {
    try {
        const questions = await loadQuestions();
        const categories = await loadCategories();
        
        // Kategorie finden, um den Quiz-Typ zu bestimmen
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) {
            console.error("Kategorie nicht gefunden");
            return [];
        }
        
        // Fragen nach Kategorie und optionaler Gruppe filtern
        let filteredQuestions = questions.filter(q => q.categoryId === categoryId);
        if (groupId) {
            filteredQuestions = filteredQuestions.filter(q => q.groupId === groupId);
        }
        
        // Fragen nach dem Vorhandensein eines Bildes filtern, falls in der Frage ein Typ angegeben ist
        const requestedType = category.mainCategory;
        
        // Fragen, die sowohl Text als auch Bild haben, bleiben immer erhalten
        // Für TEXT-Kategorien: Fragen ohne Bild oder mit Text UND Bild
        // Für IMAGE-Kategorien: Fragen mit Bild oder mit Text UND Bild
        if (requestedType === MAIN_CATEGORY.TEXT) {
            // Fragen ohne Bild bleiben im TEXT-Typ
            // Fragen mit Text UND Bild bleiben ebenfalls
            filteredQuestions = filteredQuestions.filter(q => 
                !q.imageUrl || q.imageUrl.trim() === '' || 
                (q.questionType === MAIN_CATEGORY.TEXT) ||
                (q.text && q.text.trim() !== '') // Fragen mit Text bleiben auch, selbst wenn sie ein Bild haben
            );
        } else if (requestedType === MAIN_CATEGORY.IMAGE) {
            // Fragen mit Bild bleiben im IMAGE-Typ
            filteredQuestions = filteredQuestions.filter(q => 
                (q.imageUrl && q.imageUrl.trim() !== '') || 
                (q.questionType === MAIN_CATEGORY.IMAGE)
            );
        }
        
        // Wenn nicht genug Fragen vorhanden sind, Warnung ausgeben
        if (filteredQuestions.length < count) {
            console.warn(`Nicht genug Fragen verfügbar. ${filteredQuestions.length} von ${count} gefunden.`);
        }
        
        // Zufällige Auswahl von Fragen
        const shuffledQuestions = shuffleArray(filteredQuestions);
        
        // Die finalen Fragen auswählen und für jede Frage zusätzliche falsche Antworten generieren
        const finalQuestions = shuffledQuestions.slice(0, Math.min(count, shuffledQuestions.length));
        
        // Alle korrekten Antworten aus allen Fragen sammeln, um daraus falsche Antworten zu generieren
        const allCorrectAnswers = questions
            .filter(q => q.options && q.options.length > 0)
            .map(q => {
                const correctOption = q.options.find(o => o.isCorrect);
                return correctOption ? correctOption.text : null;
            })
            .filter(text => text !== null);
        
        // Für jede Frage falsche Antworten generieren
        finalQuestions.forEach(question => {
            // Wenn die Frage nur eine Antwortoption hat (die richtige), fügen wir falsche hinzu
            if (question.options.length === 1 && question.options[0].isCorrect) {
                // Die richtige Antwort
                const correctAnswer = question.options[0].text;
                
                // Alle potenziell falschen Antworten (andere richtige Antworten)
                const possibleWrongAnswers = allCorrectAnswers.filter(text => text !== correctAnswer);
                
                // Zufällig 3 falsche Antworten auswählen
                const selectedWrongAnswers = shuffleArray(possibleWrongAnswers).slice(0, 3);
                
                // Wenn nicht genug falsche Antworten verfügbar sind, generieren wir einige
                while (selectedWrongAnswers.length < 3) {
                    // Eine einfache falsche Antwort generieren (basierend auf der richtigen)
                    const generatedWrongAnswer = generateWrongAnswer(correctAnswer, selectedWrongAnswers);
                    selectedWrongAnswers.push(generatedWrongAnswer);
                }
                
                // Falsche Antworten zum Options-Array hinzufügen
                selectedWrongAnswers.forEach(wrongAnswerText => {
                    question.options.push({
                        text: wrongAnswerText,
                        isCorrect: false
                    });
                });
            }
            
            // Antwortoptionen mischen
            question.options = shuffleArray(question.options);
        });
        
        return finalQuestions;
    } catch (error) {
        console.error("Fehler beim Laden der Quiz-Fragen:", error);
        return [];
    }
}

/**
 * Generiert eine falsche Antwort basierend auf der richtigen Antwort
 * @param {string} correctAnswer - Die richtige Antwort
 * @param {Array} existingWrongAnswers - Bereits ausgewählte falsche Antworten
 * @returns {string} Eine generierte falsche Antwort
 */
function generateWrongAnswer(correctAnswer, existingWrongAnswers) {
    // Einfache Strategie: Text etwas verändern oder einen Standard-Falsch-Text verwenden
    const standardWrongAnswers = [
        "Keine der genannten Optionen",
        "Alle genannten Optionen",
        "Diese Antwort ist falsch",
        "Option nicht verfügbar"
    ];
    
    // Zufällig einen Standard-Falsch-Text auswählen, der noch nicht verwendet wurde
    for (const wrongAnswer of shuffleArray(standardWrongAnswers)) {
        if (!existingWrongAnswers.includes(wrongAnswer)) {
            return wrongAnswer;
        }
    }
    
    // Wenn alle Standardantworten verwendet wurden, modifizieren wir die richtige Antwort
    return "Nicht " + correctAnswer;
}

/**
 * Mischt ein Array mit dem Fisher-Yates-Algorithmus
 * @param {Array} array - Das zu mischende Array
 * @returns {Array} Das gemischte Array
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Statistikfunktionen
async function saveStatistics(userId, questionId, isCorrect) {
    try {
        // Statistiken laden
        const stats = await window.loadData("statistics.json", {});
        
        // Benutzerstatistiken initialisieren, falls nicht vorhanden
        if (!stats[userId]) {
            stats[userId] = {
                questionStats: {},
                quizStats: []
            };
        }
        
        // Fragenstatistik aktualisieren
        if (!stats[userId].questionStats[questionId]) {
            stats[userId].questionStats[questionId] = {
                correct: 0,
                incorrect: 0,
                lastAnswered: 0
            };
        }
        
        const questionStat = stats[userId].questionStats[questionId];
        if (isCorrect) {
            questionStat.correct++;
        } else {
            questionStat.incorrect++;
        }
        questionStat.lastAnswered = Date.now();
        
        // Statistiken speichern
        return await window.saveData("statistics.json", stats);
    } catch (error) {
        console.error("Fehler beim Speichern der Statistik:", error);
        return false;
    }
}

async function saveQuizResult(userId, categoryId, totalQuestions, correctAnswers, timeSpent) {
    try {
        // Statistiken laden
        const stats = await window.loadData("statistics.json", {});
        
        // Benutzerstatistiken initialisieren, falls nicht vorhanden
        if (!stats[userId]) {
            stats[userId] = {
                questionStats: {},
                quizStats: []
            };
        }
        
        // Quiz-Statistik hinzufügen
        stats[userId].quizStats.push({
            date: Date.now(),
            categoryId,
            totalQuestions,
            correctAnswers,
            timeSpent
        });
        
        // Statistiken speichern
        return await window.saveData("statistics.json", stats);
    } catch (error) {
        console.error("Fehler beim Speichern des Quiz-Ergebnisses:", error);
        return false;
    }
}

// Funktionen global verfügbar machen
window.quizDB = {
    MAIN_CATEGORY,
    initializeDatabase,
    loadCategories,
    createCategory,
    loadGroups,
    createGroup,
    loadQuestions,
    createQuestion,
    getQuizQuestions,
    saveStatistics,
    saveQuizResult
};

// Datenbank beim Laden initialisieren
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDatabase();
});
