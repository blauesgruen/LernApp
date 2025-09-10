// questions-db.js - Verwaltung der Fragen-Datenbank

/**
 * Enthält Funktionen zum Laden, Speichern und Verwalten von Fragen
 * Nutzt das Storage-Modul für die Speicherortsverwaltung
 */

// Konstanten für Ressourcennamen
const QUESTIONS_RESOURCE = 'questions.json';
const CATEGORIES_RESOURCE = 'categories.json';
const STATS_RESOURCE = 'statistics.json';

/**
 * Fragenobjekt-Struktur:
 * {
 *   id: string,            // Eindeutige ID der Frage
 *   text: string,          // Fragetext
 *   imageUrl: string,      // Optional: URL zu einem Bild (kann auch Data-URL sein)
 *   options: [             // Array mit Antwortoptionen
 *     {
 *       id: string,        // Eindeutige ID der Antwortoption
 *       text: string,      // Text der Antwortoption
 *       isCorrect: boolean // Ob die Antwort richtig ist
 *     }
 *   ],
 *   explanation: string,   // Optional: Erklärung der richtigen Antwort
 *   categoryId: string,    // Kategorie-ID
 *   difficulty: number,    // Schwierigkeitsgrad (1-5)
 *   createdBy: string,     // Benutzername des Erstellers
 *   createdAt: number      // Zeitstempel der Erstellung
 * }
 */

/**
 * Kategorieobjekt-Struktur:
 * {
 *   id: string,            // Eindeutige ID der Kategorie
 *   name: string,          // Name der Kategorie
 *   description: string,   // Beschreibung der Kategorie
 *   createdBy: string,     // Benutzername des Erstellers
 *   createdAt: number      // Zeitstempel der Erstellung
 * }
 */

/**
 * Statistikobjekt-Struktur:
 * {
 *   userId: string,        // Benutzername
 *   questionStats: {       // Statistiken pro Frage
 *     [questionId]: {
 *       correct: number,   // Anzahl der richtigen Antworten
 *       incorrect: number, // Anzahl der falschen Antworten
 *       lastAnswered: number // Zeitstempel der letzten Beantwortung
 *     }
 *   },
 *   quizStats: [           // Statistiken pro Quiz-Durchlauf
 *     {
 *       date: number,      // Zeitstempel des Quiz-Durchlaufs
 *       categoryId: string, // Kategorie des Quiz
 *       totalQuestions: number, // Gesamtzahl der Fragen
 *       correctAnswers: number, // Anzahl der richtigen Antworten
 *       timeSpent: number  // Benötigte Zeit in Sekunden
 *     }
 *   ]
 * }
 */

/**
 * Generiert eine eindeutige ID.
 * @returns {string} Eine eindeutige ID.
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Lädt alle Fragen aus dem Speicher.
 * @returns {Promise<Array>} Ein Promise, das zu einem Array von Fragen aufgelöst wird.
 */
async function loadQuestions() {
    if (!window.loadData) {
        console.error('Fehler: loadData-Funktion nicht verfügbar');
        return [];
    }
    
    return await window.loadData(QUESTIONS_RESOURCE, []);
}

/**
 * Speichert alle Fragen im Speicher.
 * @param {Array} questions - Das Array von Fragen, das gespeichert werden soll.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Speichern erfolgreich war.
 */
async function saveQuestions(questions) {
    if (!window.saveData) {
        console.error('Fehler: saveData-Funktion nicht verfügbar');
        return false;
    }
    
    return await window.saveData(QUESTIONS_RESOURCE, questions);
}

/**
 * Fügt eine neue Frage hinzu.
 * @param {Object} question - Das Fragenobjekt, das hinzugefügt werden soll.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Hinzufügen erfolgreich war.
 */
async function addQuestion(question) {
    try {
        // Pflichtfelder überprüfen
        if (!question.text || !question.options || !question.categoryId) {
            showError('Frage konnte nicht hinzugefügt werden: Pflichtfelder fehlen.');
            return false;
        }
        
        // Eindeutige ID und Zeitstempel hinzufügen
        question.id = generateUniqueId();
        question.createdAt = Date.now();
        
        // Benutzernamen hinzufügen
        const user = window.supabase.auth.getUser();
        if (user) {
            question.createdBy = user.email; // oder user.id
        } else {
            question.createdBy = 'Unbekannt';
        }
        
        // Fragen laden, neue Frage hinzufügen und speichern
        const questions = await loadQuestions();
        questions.push(question);
        const success = await saveQuestions(questions);
        
        if (success) {
            showSuccess('Frage wurde erfolgreich hinzugefügt.');
            return true;
        } else {
            showError('Frage konnte nicht gespeichert werden.');
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Frage:', error);
        showError(`Fehler beim Hinzufügen der Frage: ${error.message}`);
        return false;
    }
}

/**
 * Aktualisiert eine vorhandene Frage.
 * @param {string} questionId - Die ID der zu aktualisierenden Frage.
 * @param {Object} updatedQuestion - Das aktualisierte Fragenobjekt.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Aktualisieren erfolgreich war.
 */
async function updateQuestion(questionId, updatedQuestion) {
    try {
        // Pflichtfelder überprüfen
        if (!questionId || !updatedQuestion.text || !updatedQuestion.options || !updatedQuestion.categoryId) {
            showError('Frage konnte nicht aktualisiert werden: Pflichtfelder fehlen.');
            return false;
        }
        
        // Fragen laden
        const questions = await loadQuestions();
        
        // Frage finden und aktualisieren
        const index = questions.findIndex(q => q.id === questionId);
        if (index === -1) {
            showError('Frage konnte nicht gefunden werden.');
            return false;
        }
        
        // ID und Erstellungsdatum beibehalten
        updatedQuestion.id = questionId;
        updatedQuestion.createdAt = questions[index].createdAt;
        updatedQuestion.createdBy = questions[index].createdBy;
        
        // Aktualisierte Frage speichern
        questions[index] = updatedQuestion;
        const success = await saveQuestions(questions);
        
        if (success) {
            showSuccess('Frage wurde erfolgreich aktualisiert.');
            return true;
        } else {
            showError('Frage konnte nicht gespeichert werden.');
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Frage:', error);
        showError(`Fehler beim Aktualisieren der Frage: ${error.message}`);
        return false;
    }
}

/**
 * Löscht eine Frage.
 * @param {string} questionId - Die ID der zu löschende Frage.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Löschen erfolgreich war.
 */
async function deleteQuestion(questionId) {
    try {
        if (!questionId) {
            showError('Frage konnte nicht gelöscht werden: Keine ID angegeben.');
            return false;
        }
        
        // Fragen laden
        const questions = await loadQuestions();
        
        // Frage finden und löschen
        const filteredQuestions = questions.filter(q => q.id !== questionId);
        
        // Prüfen, ob eine Frage entfernt wurde
        if (filteredQuestions.length === questions.length) {
            showError('Frage konnte nicht gefunden werden.');
            return false;
        }
        
        // Aktualisierte Liste speichern
        const success = await saveQuestions(filteredQuestions);
        
        if (success) {
            showSuccess('Frage wurde erfolgreich gelöscht.');
            return true;
        } else {
            showError('Frage konnte nicht gelöscht werden.');
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Löschen der Frage:', error);
        showError(`Fehler beim Löschen der Frage: ${error.message}`);
        return false;
    }
}

/**
 * Lädt alle Kategorien aus dem Speicher.
 * @returns {Promise<Array>} Ein Promise, das zu einem Array von Kategorien aufgelöst wird.
 */
async function loadCategories() {
    if (!window.loadData) {
        console.error('Fehler: loadData-Funktion nicht verfügbar');
        return [];
    }
    
    return await window.loadData(CATEGORIES_RESOURCE, []);
}

/**
 * Speichert alle Kategorien im Speicher.
 * @param {Array} categories - Das Array von Kategorien, das gespeichert werden soll.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Speichern erfolgreich war.
 */
async function saveCategories(categories) {
    if (!window.saveData) {
        console.error('Fehler: saveData-Funktion nicht verfügbar');
        return false;
    }
    
    return await window.saveData(CATEGORIES_RESOURCE, categories);
}

/**
 * Fügt eine neue Kategorie hinzu.
 * @param {Object} category - Das Kategorieobjekt, das hinzugefügt werden soll.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Hinzufügen erfolgreich war.
 */
async function addCategory(category) {
    try {
        // Pflichtfelder überprüfen
        if (!category.name) {
            showError('Kategorie konnte nicht hinzugefügt werden: Name fehlt.');
            return false;
        }
        
        // Eindeutige ID und Zeitstempel hinzufügen
        category.id = generateUniqueId();
        category.createdAt = Date.now();
        
        // Benutzernamen hinzufügen
        const user = window.supabase.auth.getUser();
        if (user) {
            category.createdBy = user.email; // oder user.id
        } else {
            category.createdBy = 'Unbekannt';
        }
        
        // Kategorien laden, neue Kategorie hinzufügen und speichern
        const categories = await loadCategories();
        
        // Prüfen, ob bereits eine Kategorie mit diesem Namen existiert
        if (categories.some(c => c.name === category.name)) {
            showError('Eine Kategorie mit diesem Namen existiert bereits.');
            return false;
        }
        
        categories.push(category);
        const success = await saveCategories(categories);
        
        if (success) {
            showSuccess('Kategorie wurde erfolgreich hinzugefügt.');
            return true;
        } else {
            showError('Kategorie konnte nicht gespeichert werden.');
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Kategorie:', error);
        showError(`Fehler beim Hinzufügen der Kategorie: ${error.message}`);
        return false;
    }
}

/**
 * Aktualisiert eine vorhandene Kategorie.
 * @param {string} categoryId - Die ID der zu aktualisierenden Kategorie.
 * @param {Object} updatedCategory - Das aktualisierte Kategorieobjekt.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Aktualisieren erfolgreich war.
 */
async function updateCategory(categoryId, updatedCategory) {
    try {
        // Pflichtfelder überprüfen
        if (!categoryId || !updatedCategory.name) {
            showError('Kategorie konnte nicht aktualisiert werden: Pflichtfelder fehlen.');
            return false;
        }
        
        // Kategorien laden
        const categories = await loadCategories();
        
        // Kategorie finden und aktualisieren
        const index = categories.findIndex(c => c.id === categoryId);
        if (index === -1) {
            showError('Kategorie konnte nicht gefunden werden.');
            return false;
        }
        
        // Prüfen, ob bereits eine andere Kategorie mit diesem Namen existiert
        if (categories.some(c => c.id !== categoryId && c.name === updatedCategory.name)) {
            showError('Eine andere Kategorie mit diesem Namen existiert bereits.');
            return false;
        }
        
        // ID und Erstellungsdatum beibehalten
        updatedCategory.id = categoryId;
        updatedCategory.createdAt = categories[index].createdAt;
        updatedCategory.createdBy = categories[index].createdBy;
        
        // Aktualisierte Kategorie speichern
        categories[index] = updatedCategory;
        const success = await saveCategories(categories);
        
        if (success) {
            showSuccess('Kategorie wurde erfolgreich aktualisiert.');
            return true;
        } else {
            showError('Kategorie konnte nicht gespeichert werden.');
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Kategorie:', error);
        showError(`Fehler beim Aktualisieren der Kategorie: ${error.message}`);
        return false;
    }
}

/**
 * Löscht eine Kategorie.
 * @param {string} categoryId - Die ID der zu löschenden Kategorie.
 * @returns {Promise<boolean>} Ein Promise, das zu True aufgelöst wird, wenn das Löschen erfolgreich war.
 */
async function deleteCategory(categoryId) {
    try {
        if (!categoryId) {
            showError('Kategorie konnte nicht gelöscht werden: Keine ID angegeben.');
            return false;
        }
        
        // Kategorien laden
        const categories = await loadCategories();
        
        // Kategorie finden und löschen
        const filteredCategories = categories.filter(c => c.id !== categoryId);
        
        // Prüfen, ob eine Kategorie entfernt wurde
        if (filteredCategories.length === categories.length) {
            showError('Kategorie konnte nicht gefunden werden.');
            return false;
        }
        
        // Fragen mit dieser Kategorie laden
        const questions = await loadQuestions();
        if (questions.some(q => q.categoryId === categoryId)) {
            showError('Diese Kategorie kann nicht gelöscht werden, da ihr noch Fragen zugeordnet sind.');
            return false;
        }
        
        // Aktualisierte Liste speichern
        const success = await saveCategories(filteredCategories);
        
        if (success) {
            showSuccess('Kategorie wurde erfolgreich gelöscht.');
            return true;
        } else {
            showError('Kategorie konnte nicht gelöscht werden.');
            return false;
        }
    } catch (error) {
        console.error('Fehler beim Löschen der Kategorie:', error);
        showError(`Fehler beim Löschen der Kategorie: ${error.message}`);
        return false;
    }
}

/**
 * Initialisiert die Standardkategorien, falls noch keine vorhanden sind.
 */
async function initializeDefaultCategories() {
    const categories = await loadCategories();
    
    if (categories.length === 0) {
        const defaultCategories = [];
        
        if (defaultCategories.length > 0) {
            await saveCategories(defaultCategories);
            console.log('Standardkategorien wurden initialisiert.');
        }
    }
}

/**
 * Initialisiert die Statistiken für einen Benutzer, falls noch nicht vorhanden.
 * @param {string} userId - Die Benutzer-ID (Benutzername).
 */
async function initializeUserStatistics(userId) {
    if (!userId) {
        console.error('Fehler: Keine Benutzer-ID angegeben');
        return;
    }
    
    if (!window.loadData || !window.saveData) {
        console.error('Fehler: loadData oder saveData-Funktion nicht verfügbar');
        return;
    }
    
    const stats = await window.loadData(STATS_RESOURCE, {});
    
    if (!stats[userId]) {
        stats[userId] = {
            questionStats: {},
            quizStats: []
        };
        
        await window.saveData(STATS_RESOURCE, stats);
        console.log(`Statistiken für Benutzer '${userId}' wurden initialisiert.`);
    }
}

// Funktionen in das globale Window-Objekt exportieren
window.loadQuestions = loadQuestions;
window.saveQuestions = saveQuestions;
window.addQuestion = addQuestion;
window.updateQuestion = updateQuestion;
window.deleteQuestion = deleteQuestion;
window.loadCategories = loadCategories;
window.saveCategories = saveCategories;
window.addCategory = addCategory;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;
window.initializeDefaultCategories = initializeDefaultCategories;
window.initializeUserStatistics = initializeUserStatistics;

// Hilfsfunktion zum Hinzufügen von Funktionen zur Warteschlange
function runWhenStorageReady(fn) {
    if (window.loadData && window.saveData) {
        // Wenn Storage bereits bereit ist, direkt ausführen
        fn();
    } else {
        // Andernfalls zur Warteschlange hinzufügen
        if (typeof window.storageReadyQueue === 'undefined') {
            window.storageReadyQueue = [];
        }
        window.storageReadyQueue.push(fn);
    }
}

// Event-Listener für das Laden der Speichermodule
window.addEventListener('storageModulesLoaded', () => {
    console.log('Speichermodule geladen, verarbeite Warteschlange mit', (window.storageReadyQueue ? window.storageReadyQueue.length : 0), 'Funktionen');
    // Alle Funktionen in der Warteschlange ausführen
    if (window.storageReadyQueue && window.storageReadyQueue.length > 0) {
        while (window.storageReadyQueue.length > 0) {
            const fn = window.storageReadyQueue.shift();
            fn();
        }
    }
});

// Bei DOMContentLoaded die Standardkategorien initialisieren
document.addEventListener('DOMContentLoaded', async () => {
    // Prüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const username = localStorage.getItem('username');
    
    if (isLoggedIn && username) {
        runWhenStorageReady(async () => {
            try {
                await initializeDefaultCategories();
                await initializeUserStatistics(username);
            } catch (error) {
                console.error('Fehler bei der Initialisierung:', error);
            }
        });
    }
});
