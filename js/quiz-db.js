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
    if (!window.supabaseClient) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return [];
    }
    const { data, error } = await window.supabaseClient.from('categories').select('*');
    if (error) {
        console.error('Fehler beim Laden der Kategorien:', error);
        return [];
    }
    // Normalize keys to camelCase expected by the app
    try {
        return data.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description ?? c.desc ?? '',
            mainCategory: c.maincategory ?? c.main_category ?? c.mainCategory ?? null,
            createdBy: c.created_by ?? c.createdBy ?? (c.owner ?? null),
            createdAt: c.created_at ?? c.createdAt ?? null,
            // preserve other fields
            ...c
        }));
    } catch (mapErr) {
        console.warn('Warnung: Fehler beim Normalisieren der Kategorienfelder, Rückgabe der Rohdaten', mapErr);
        return data;
    }
}

/**
 * Speichert eine Kategorie in Supabase
 * @param {Array} categories - Array mit allen Kategorien
 * @returns {Promise<boolean>} True, wenn erfolgreich gespeichert
 */
async function saveCategories(categories) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    try {
        // Map client objects to DB columns and ensure required fields
        const payload = categories.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description ?? c.desc ?? null,
            maincategory: c.mainCategory ?? c.maincategory ?? c.main_category ?? null,
            owner: c.owner ?? c.createdBy ?? c.created_by ?? null,
            collaborators: c.collaborators ?? null,
            created_at: c.createdAt ?? c.created_at ?? null
        }));
        // Mehrere Kategorien als Batch speichern
        const { error } = await window.supabase.from('categories').upsert(payload);
        if (error) {
            console.error("Fehler beim Speichern der Kategorien:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Fehler beim Speichern der Kategorien:", error);
        return false;
    }
}

/**
 * Erstellt eine neue Kategorie
 * @param {string} name - Name der Kategorie
 * @param {string} [mainCategory=MAIN_CATEGORY.TEXT] - Hauptkategorie (standardmäßig TEXT)
 * @param {string} createdBy - Benutzername des Erstellers
 * @returns {Promise<object|null>} Die erstellte Kategorie oder null bei Fehler
 */
async function createCategory(name, owner, description = '', collaborators = []) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return null;
    }
    if (!name) {
        console.error('Name der Kategorie ist erforderlich.');
        return null;
    }
    try {
        const { data, error } = await window.supabase.from('categories').insert({
            name,
            description,
            owner,
            collaborators
        }).select();
        if (error) {
            console.error('Fehler beim Erstellen der Kategorie:', error);
            return null;
        }
        return data && data[0] ? data[0] : null;
    } catch (error) {
        console.error('Fehler beim Erstellen der Kategorie:', error);
        return null;
    }
}

/**
 * Lädt alle Gruppen
 * @returns {Promise<Array>} Array mit allen Gruppen
 */
async function loadGroups() {
    if (!window.supabaseClient) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return [];
    }
    const { data, error } = await window.supabaseClient.from('groups').select('*');
    if (error) {
        console.error('Fehler beim Laden der Gruppen:', error);
        return [];
    }
    // Normalize field names coming from Postgres (snake_case) to the app's expected camelCase
    try {
        return data.map(g => ({
            // keep id and name as-is
            id: g.id,
            name: g.name,
            // map common snake_case columns to camelCase used in the UI
            categoryId: g.category_id ?? g.categoryId ?? null,
            createdBy: g.created_by ?? g.createdBy ?? null,
            createdAt: g.created_at ?? g.createdAt ?? null,
            // include any additional fields so callers can still access them if needed
            ...g
        }));
    } catch (mapErr) {
        console.warn('Warnung: Fehler beim Normalisieren der Gruppenfelder, Rückgabe der Rohdaten', mapErr);
        return data;
    }
}

/**
 * Speichert Gruppen in Supabase
 * @param {Array} groups - Array mit allen Gruppen
 * @returns {Promise<boolean>} True, wenn erfolgreich gespeichert
 */
async function saveGroups(groups) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    try {
        // Map client objects to DB columns and ensure created_by/created_at exist
        const payload = groups.map(g => ({
            id: g.id,
            name: g.name,
            category_id: g.categoryId ?? g.category_id ?? null,
            created_by: g.createdBy ?? g.created_by ?? null,
            created_at: g.createdAt ?? g.created_at ?? new Date().toISOString()
        }));
        const { error } = await window.supabase.from('groups').upsert(payload);
        if (error) {
            console.error("Fehler beim Speichern der Gruppen:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Fehler beim Speichern der Gruppen:", error);
        return false;
    }
}

/**
 * Erstellt eine neue Gruppe
 * @param {string} name - Name der Gruppe
 * @param {string} categoryId - ID der übergeordneten Kategorie
 * @param {string} createdBy - Benutzername des Erstellers
 * @returns {Promise<object|null>} Die erstellte Gruppe oder null bei Fehler
 */
async function createGroup(name, category_id, owner, collaborators = []) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return null;
    }
    if (!name || !category_id) {
        console.error('Name und Kategorie-ID sind erforderlich.');
        return null;
    }
    try {
        const { data, error } = await window.supabase.from('groups').insert({
            name,
            category_id,
            owner,
            collaborators
        }).select();
        if (error) {
            console.error('Fehler beim Erstellen der Gruppe:', error);
            return null;
        }
        return data && data[0] ? data[0] : null;
    } catch (error) {
        console.error('Fehler beim Erstellen der Gruppe:', error);
        return null;
    }
}

/**
 * Aktualisiert eine bestehende Gruppe
 * @param {string} groupId
 * @param {{name?:string, categoryId?:string}} updates
 * @returns {Promise<object|null>}
 */
async function updateGroup(groupId, updates) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return null;
    }
    if (!groupId) {
        console.error('groupId ist erforderlich.');
        return null;
    }
    try {
        const payload = {};
        if (typeof updates.name !== 'undefined') payload.name = updates.name;
        if (typeof updates.categoryId !== 'undefined') payload.category_id = updates.categoryId;

        const { data, error } = await window.supabase.from('groups').update(payload).eq('id', groupId).select();
        if (error) {
            console.error('Fehler beim Aktualisieren der Gruppe:', error);
            return null;
        }
        // return normalized object
        const g = data && data[0] ? data[0] : null;
        if (!g) return null;
        return {
            id: g.id,
            name: g.name,
            categoryId: g.category_id ?? g.categoryId ?? null,
            createdBy: g.created_by ?? g.createdBy ?? null,
            createdAt: g.created_at ?? g.createdAt ?? null,
            ...g
        };
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Gruppe:', error);
        return null;
    }
}

/**
 * Löscht eine Gruppe
 * @param {string} groupId
 * @returns {Promise<boolean>}
 */
async function deleteGroup(groupId) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    if (!groupId) {
        console.error('groupId ist erforderlich.');
        return false;
    }
    try {
        const { data: delData, error: delErr } = await window.supabase.from('groups').delete().eq('id', groupId).select();
        if (delErr) {
            console.error('Fehler beim Löschen der Gruppe:', delErr);
            return false;
        }
        if (!delData || delData.length === 0) {
            console.warn('Löschen nicht durchgeführt: keine Zeile betroffen (mögliche RLS-Verweigerung oder falsche ID).');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Fehler beim Löschen der Gruppe:', error);
        return false;
    }
}

/**
 * Aktualisiert eine bestehende Kategorie in Supabase
 */
async function updateCategory(categoryId, updates) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return null;
    }
    if (!categoryId) return null;
    try {
        const payload = {};
        if (typeof updates.name !== 'undefined') payload.name = updates.name;
        if (typeof updates.description !== 'undefined') payload.description = updates.description;
    if (typeof updates.mainCategory !== 'undefined') payload.maincategory = updates.mainCategory;

        const { data, error } = await window.supabase.from('categories').update(payload).eq('id', categoryId).select();
        if (error) {
            console.error('Fehler beim Aktualisieren der Kategorie:', error);
            return null;
        }
        const c = data && data[0] ? data[0] : null;
        if (!c) return null;
        return {
            id: c.id,
            name: c.name,
            description: c.description,
            mainCategory: c.maincategory ?? c.main_category ?? c.mainCategory ?? null,
            createdBy: c.created_by ?? c.createdBy ?? c.owner ?? null,
            createdAt: c.created_at ?? c.createdAt ?? null,
            ...c
        };
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Kategorie:', error);
        return null;
    }
}

/**
 * Löscht eine Kategorie in Supabase (prüft vorher auf Fragen)
 */
async function deleteCategory(categoryId) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    if (!categoryId) return false;
    try {
        // Prüfe, ob Fragen vorhanden sind
        const { data: questions, error: qErr } = await window.supabase.from('questions').select('id').eq('categoryid', categoryId).limit(1);
        if (qErr) {
            console.error('Fehler beim Prüfen der Fragen zur Kategorie:', qErr);
            return false;
        }
        if (questions && questions.length > 0) {
            showError('Diese Kategorie kann nicht gelöscht werden, da ihr noch Fragen zugeordnet sind.');
            return false;
        }

        const { data: delData, error: delErr } = await window.supabase.from('categories').delete().eq('id', categoryId).select();
        if (delErr) {
            console.error('Fehler beim Löschen der Kategorie:', delErr);
            return false;
        }
        // if no rows were returned, nothing was deleted (possibly RLS or wrong id)
        if (!delData || delData.length === 0) {
            console.warn('Löschen nicht durchgeführt: keine Zeile betroffen (mögliche RLS-Verweigerung oder falsche ID).');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Fehler beim Löschen der Kategorie:', error);
        return false;
    }
}

/**
 * Lädt alle Fragen aus Supabase
 * @returns {Promise<Array>} Array mit allen Fragen
 */
async function loadQuestions() {
    if (!window.supabaseClient) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return [];
    }
    const { data, error } = await window.supabaseClient.from('questions').select('*');
    if (error) {
        console.error('Fehler beim Laden der Fragen:', error);
        return [];
    }
    return data;
}

/**
 * Speichert Fragen in Supabase
 * @param {Array} questions - Array mit allen Fragen
 * @returns {Promise<boolean>} True, wenn erfolgreich gespeichert
 */
async function saveQuestions(questions) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    try {
        // Map client objects to DB columns expected by the questions table
        const payload = questions.map(q => ({
            id: q.id,
            text: q.text,
            imageurl: q.imageUrl ?? q.imageurl ?? null,
            options: q.options ?? null,
            explanation: q.explanation ?? null,
            categoryid: q.categoryId ?? q.categoryid ?? null,
            groupid: q.groupId ?? q.groupid ?? null,
            difficulty: q.difficulty ?? null,
            created_by: q.createdBy ?? q.created_by ?? null,
            created_at: q.createdAt ?? q.created_at ?? new Date().toISOString()
        }));
        const { error } = await window.supabase.from('questions').upsert(payload);
        if (error) {
            console.error("Fehler beim Speichern der Fragen:", error);
            return false;
        }
        return true;
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
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return null;
    }
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
        const categories = await loadCategories();
        
        // Kategorie finden, um den Fragetyp automatisch zu bestimmen
        const category = categories.find(cat => cat.id === questionData.categoryId);
        if (!category) {
            console.error("Kategorie nicht gefunden");
            return null;
        }
        
        
        // Prüfe und optimiere das Bild
        let imageUrl = "";
        if (questionData.imageUrl && typeof questionData.imageUrl === 'string' && questionData.imageUrl.trim() !== '') {
            // Überprüfen, ob es sich um einen Base64-String handelt
            if (questionData.imageUrl.startsWith('data:image')) {
                // Wenn das Bild zu groß ist, Warnung ausgeben
                if (questionData.imageUrl.length > 100000) { // ~100KB
                    console.warn("Das Bild ist sehr groß (" + Math.round(questionData.imageUrl.length/1024) + " KB) und könnte Speicherprobleme verursachen");
                }
                imageUrl = questionData.imageUrl;
            } else {
                imageUrl = questionData.imageUrl;
            }
        }
        
        // Build DB payload and let the DB assign an id
        const payload = {
            text: questionData.text,
            imageurl: imageUrl || null,
            options: questionData.options ?? null,
            explanation: questionData.explanation || null,
            categoryid: questionData.categoryId,
            groupid: questionData.groupId,
            difficulty: questionData.difficulty || 1,
            created_by: questionData.createdBy || null,
            created_at: new Date().toISOString()
        };

        const { data: insertData, error: insertErr } = await window.supabase.from('questions').insert(payload).select();
        if (insertErr) {
            console.error('Fehler beim Erstellen der Frage (DB):', insertErr);
            return null;
        }
        const q = insertData && insertData[0] ? insertData[0] : null;
        if (!q) return null;
        // normalize returned object to client shape
        return {
            id: q.id,
            text: q.text,
            imageUrl: q.imageurl ?? q.imageUrl ?? null,
            options: q.options ?? null,
            explanation: q.explanation ?? null,
            categoryId: q.categoryid ?? q.categoryId ?? null,
            groupId: q.groupid ?? q.groupId ?? null,
            difficulty: q.difficulty ?? null,
            createdBy: q.created_by ?? q.createdBy ?? null,
            createdAt: q.created_at ?? q.createdAt ?? null,
            ...q
        };
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
        
        console.log(`Fragen laden für Kategorie ${categoryId}, Gruppe ${groupId || 'alle'}, Anzahl ${count}`);
        console.log(`Fragen insgesamt: ${questions.length}`);
        
        // Kategorie finden, um den Quiz-Typ zu bestimmen
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) {
            console.error(`Kategorie mit ID ${categoryId} nicht gefunden`);
            return [];
        }
        
        console.log(`Gefundene Kategorie: ${category.name}, Typ: ${category.mainCategory}`);
        
        // Fragen nach Kategorie und optionaler Gruppe filtern
        let filteredQuestions = questions.filter(q => q.categoryId === categoryId);
        console.log(`Fragen für Kategorie ${categoryId}: ${filteredQuestions.length}`);
        
        if (groupId) {
            filteredQuestions = filteredQuestions.filter(q => q.groupId === groupId);
            console.log(`Fragen für Gruppe ${groupId}: ${filteredQuestions.length}`);
        }
        
        // Den für das Quiz angeforderten Typ bestimmen, falls explizit angegeben
        const requestedType = category.mainCategory;
        console.log(`Angeforderter Quiz-Typ: ${requestedType || 'any'}`);
        
        // Filter basierend auf dem angeforderten Quiz-Typ
        // Bei 'any' (neues Standard-Verhalten) werden keine Fragen gefiltert
        if (requestedType === MAIN_CATEGORY.TEXT) {
            // TEXT-Kategorie: Fragen, die Text haben
            const beforeFilter = filteredQuestions.length;
            filteredQuestions = filteredQuestions.filter(q => 
                q.text && q.text.trim() !== ''
            );
            console.log(`Textfragen nach Filterung: ${filteredQuestions.length} (${beforeFilter - filteredQuestions.length} entfernt)`);
        } else if (requestedType === MAIN_CATEGORY.IMAGE) {
            // IMAGE-Kategorie: Fragen mit Bildern
            const beforeFilter = filteredQuestions.length;
            filteredQuestions = filteredQuestions.filter(q => 
                q.imageUrl && q.imageUrl.trim() !== ''
            );
            
            console.log(`Bildfragen nach Filterung: ${filteredQuestions.length} (${beforeFilter - filteredQuestions.length} entfernt)`);
            
            // Protokollieren Sie jede Frage, die ein Bild haben sollte
            if (filteredQuestions.length > 0) {
                console.log("Gefundene Bildfragen:");
                filteredQuestions.forEach((q, index) => {
                    console.log(`Bildfrage ${index+1}: ID=${q.id}, Bild=${q.imageUrl ? 'vorhanden' : 'fehlt'}, Text="${q.text}"`);
                });
            } else {
                console.warn("Keine Bildfragen mit gültigen Bildern gefunden!");
            }
        }
        
        // Wenn nicht genug Fragen vorhanden sind, Warnung ausgeben
        if (filteredQuestions.length < count) {
            console.warn(`Nicht genug Fragen verfügbar. ${filteredQuestions.length} von ${count} gefunden.`);
        }
        
        // Zufällige Auswahl von Fragen
        const shuffledQuestions = shuffleArray(filteredQuestions);
        
        // Die finalen Fragen auswählen und für jede Frage zusätzliche falsche Antworten generieren
        const finalQuestions = shuffledQuestions.slice(0, Math.min(count, shuffledQuestions.length));
        console.log(`Finale Fragenanzahl für Quiz: ${finalQuestions.length}`);
        
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
                
                // Alle potenziell falsche Antworten (andere richtige Antworten)
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
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    try {
        // Hole aktuelle Statistik
        const { data, error } = await window.supabase.from('statistics').select('*').eq('user_id', userId).single();
        let stats = data || { user_id: userId, question_stats: {}, quiz_stats: [] };
        // Initialisiere Frage-Statistik
        if (!stats.question_stats) stats.question_stats = {};
        if (!stats.question_stats[questionId]) {
            stats.question_stats[questionId] = { correct: 0, incorrect: 0, lastAnswered: 0 };
        }
        if (isCorrect) {
            stats.question_stats[questionId].correct++;
        } else {
            stats.question_stats[questionId].incorrect++;
        }
        stats.question_stats[questionId].lastAnswered = Date.now();
        // Speichere Statistik
        const { error: upsertError } = await window.supabase.from('statistics').upsert([stats]);
        if (upsertError) {
            console.error("Fehler beim Speichern der Statistik:", upsertError);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Fehler beim Speichern der Statistik:", error);
        return false;
    }
}

async function saveQuizResult(userId, categoryId, totalQuestions, correctAnswers, timeSpent) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    try {
        // Hole aktuelle Statistik
        const { data, error } = await window.supabase.from('statistics').select('*').eq('user_id', userId).single();
        let stats = data || { user_id: userId, question_stats: {}, quiz_stats: [] };
        if (!stats.quiz_stats) stats.quiz_stats = [];
        stats.quiz_stats.push({
            date: Date.now(),
            categoryId,
            totalQuestions,
            correctAnswers,
            timeSpent
        });
        // Speichere Statistik
        const { error: upsertError } = await window.supabase.from('statistics').upsert([stats]);
        if (upsertError) {
            console.error("Fehler beim Speichern des Quiz-Ergebnisses:", upsertError);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Fehler beim Speichern des Quiz-Ergebnisses:", error);
        return false;
    }
}

/**
 * Fügt einen Mitbearbeiter zur Kategorie hinzu
 * @param {string} categoryId - ID der Kategorie
 * @param {string} userId - User-ID des Mitbearbeiters
 * @returns {Promise<boolean>} True, wenn erfolgreich
 */
async function addCollaborator(categoryId, userId) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    if (!categoryId || !userId) {
        console.error("Kategorie-ID und User-ID sind erforderlich.");
        return false;
    }
    try {
        // Aktuelle Collaborators laden
        const { data, error } = await window.supabase.from('categories').select('collaborators').eq('id', categoryId).single();
        if (error || !data) {
            console.error('Fehler beim Laden der Kategorie:', error);
            return false;
        }
        let collaborators = Array.isArray(data.collaborators) ? data.collaborators : [];
        if (collaborators.includes(userId)) {
            console.warn('User ist bereits Collaborator.');
            return true;
        }
        collaborators.push(userId);
        // Update in Supabase
        const { error: updateError } = await window.supabase.from('categories').update({ collaborators }).eq('id', categoryId);
        if (updateError) {
            console.error('Fehler beim Hinzufügen des Collaborators:', updateError);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Fehler in addCollaborator:', err);
        return false;
    }
}

/**
 * Entfernt einen Mitbearbeiter aus der Kategorie
 * @param {string} categoryId - ID der Kategorie
 * @param {string} userId - User-ID des Mitbearbeiters
 * @returns {Promise<boolean>} True, wenn erfolgreich
 */
async function removeCollaborator(categoryId, userId) {
    if (!window.supabase) {
        console.error('Supabase-Client ist nicht verfügbar.');
        return false;
    }
    if (!categoryId || !userId) {
        console.error("Kategorie-ID und User-ID sind erforderlich.");
        return false;
    }
    try {
        // Aktuelle Collaborators laden
        const { data, error } = await window.supabase.from('categories').select('collaborators').eq('id', categoryId).single();
        if (error || !data) {
            console.error('Fehler beim Laden der Kategorie:', error);
            return false;
        }
        let collaborators = Array.isArray(data.collaborators) ? data.collaborators : [];
        if (!collaborators.includes(userId)) {
            console.warn('User ist kein Collaborator.');
            return true;
        }
        collaborators = collaborators.filter(id => id !== userId);
        // Update in Supabase
        const { error: updateError } = await window.supabase.from('categories').update({ collaborators }).eq('id', categoryId);
        if (updateError) {
            console.error('Fehler beim Entfernen des Collaborators:', updateError);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Fehler in removeCollaborator:', err);
        return false;
    }
}

// Funktionen global verfügbar machen
window.quizDB = {
    loadQuestions,
    loadCategories,
    loadGroups,
    // weitere Funktionen nach Bedarf
};

// Datenbank beim Laden initialisieren
document.addEventListener('DOMContentLoaded', async () => {
    // Initialisierung der Datenbank
    await initializeDatabase();
});
