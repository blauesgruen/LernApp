    /**
     * Beendet das Quiz und zeigt die Ergebnisse an
     */
    function endQuiz() {
        // Timer stoppen
        stopTimer();
        quizSection.classList.add('hidden');
        quizResultsSection.classList.remove('hidden');
        // Quiz-Dauer berechnen
        quizDuration = Math.floor((Date.now() - startTime) / 1000);
        // Ergebnisse anzeigen
        displayResults();
        // Breadcrumbs aktualisieren, falls verfügbar
        if (window.breadcrumbs) {
            window.breadcrumbs.set([
                { label: 'Quiz', url: 'quiz-player.html' },
                { label: 'Ergebnis', url: null }
            ]);
        }
    }
    /**
     * Lädt die Quiz-Fragen passend zu den gewählten Einstellungen
     * @param {string} categoryId - Gewählte Kategorie
     * @param {string} groupId - Gewählte Gruppe (optional)
     * @param {number} questionCount - Anzahl der Fragen
     * @returns {Promise<Array>} Gefilterte Fragen
     */
    async function loadQuizQuestions(categoryId, groupId, questionCount, quizType) {
        try {
            const allQuestions = await window.quizDB.loadQuestions();
            const allGroups = await window.quizDB.loadGroups();
            // Alle Gruppen zur Kategorie finden
            const groupsOfCategory = allGroups.filter(g => String(g.category_id ?? g.categoryId) === String(categoryId));
            const groupIds = groupsOfCategory.map(g => String(g.id));
            // Debug: Gruppen zur Kategorie
            console.log('Gruppen zur Kategorie', categoryId, ':', groupsOfCategory);
            // Fragen nach Gruppe filtern
            let questions = allQuestions.filter(q => groupIds.includes(String(q.group_id ?? q.groupId)));
            // Falls eine Gruppe explizit gewählt wurde, weiter filtern
            if (groupId) {
                questions = questions.filter(q => String(q.group_id ?? q.groupId) === String(groupId));
            }
            // Nach Quiz-Typ filtern (Text/Bild, beide Varianten prüfen)
            if (quizType === 'image') {
                questions = questions.filter(q => (q.imageUrl ?? q.imageurl) && String(q.imageUrl ?? q.imageurl).trim() !== '');
            } else if (quizType === 'text') {
                questions = questions.filter(q => (q.text ?? q.question) && String(q.text ?? q.question).trim() !== '');
            }
            // Debug: Gefilterte Fragen
            console.log('Gefilterte Fragen für Kategorie', categoryId, 'und Gruppe', groupId, ':', questions);
            // Zufällige Auswahl der gewünschten Anzahl
            if (questions.length > questionCount) {
                questions = questions.sort(() => Math.random() - 0.5).slice(0, questionCount);
            }
            return questions;
        } catch (error) {
            console.error('Fehler beim Laden der Quiz-Fragen:', error);
            showError('Fehler beim Laden der Quiz-Fragen.');
            return [];
        }
    }
// quiz-player.js - Steuerung des Quiz-Spiels

document.addEventListener('DOMContentLoaded', function() {
    /**
     * Stoppt den Timer
     */
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    /**
     * Beendet das Quiz und zeigt die Ergebnisse an
     */
    function endQuiz() {
        stopTimer();
        quizSection.classList.add('hidden');
        quizResultsSection.classList.remove('hidden');
        quizDuration = Math.floor((Date.now() - startTime) / 1000);
        displayResults();
        if (window.breadcrumbs) {
            window.breadcrumbs.set([
                { label: 'Quiz', url: 'quiz-player.html' },
                { label: 'Ergebnis', url: null }
            ]);
        }
    }
    /**
     * Stoppt den Timer
     */
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }
    // Prüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = (window.storage && typeof window.storage.isLoggedIn === 'function') ? window.storage.isLoggedIn() : (localStorage.getItem('loggedIn') === 'true');
    const username = (window.storage && typeof window.storage.getUsername === 'function') ? window.storage.getUsername() : localStorage.getItem('username');
    
    if (!isLoggedIn || !username) {
        // Nicht eingeloggt - zurück zur Login-Seite
        window.location.href = 'login.html';
        return;
    }

    // Quiz-Setup-Elemente
    const quizSetupSection = document.getElementById('quiz-setup-section');
    const quizSetupForm = document.getElementById('quiz-setup-form');
    const quizTypeSelect = document.getElementById('quiz-type');
    const categorySelect = document.getElementById('quiz-category');
    const groupSelect = document.getElementById('quiz-group');
    const questionCountInput = document.getElementById('quiz-question-count');
    const noQuestionsWarning = document.getElementById('no-questions-warning');

    // Quiz-Spieler-Elemente
    const quizSection = document.getElementById('quiz-section');
    const quizTitle = document.getElementById('quiz-title');
    const quizProgress = document.getElementById('quiz-progress');
    const quizTimer = document.getElementById('quiz-timer');
    const questionText = document.getElementById('question-text');
    const questionImageContainer = document.getElementById('question-image-container');
    const questionImage = document.getElementById('question-image');
    const answersContainer = document.getElementById('answers-container');
    const explanationContainer = document.getElementById('explanation-container');
    const explanationText = document.getElementById('explanation-text');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const finishQuizBtn = document.getElementById('finish-quiz-btn');

    // Quiz-Ergebnis-Elemente
    const quizResultsSection = document.getElementById('quiz-results-section');
    const resultPercentage = document.getElementById('result-percentage');
    const resultCorrect = document.getElementById('result-correct');
    const resultTime = document.getElementById('result-time');
    const resultFeedback = document.getElementById('result-feedback');
    const playAgainBtn = document.getElementById('play-again-btn');
    const newQuizBtn = document.getElementById('new-quiz-btn');

    // Quiz-Status-Variablen
    let questions = [];
    let currentQuestionIndex = 0;
    let correctAnswers = 0;
    let startTime = 0;
    let quizDuration = 0;
    let timerInterval = null;
    let currentSettings = {
        type: '',
        categoryId: '',
        groupId: '',
        questionCount: 10
    };

    // Initialisierung
    initializePage();

    // Event Listener für Quiz-Typ-Auswahl
    if (quizTypeSelect) {
        quizTypeSelect.addEventListener('change', async function() {
            await updateCategorySelect();
        });
    }

    // Event Listener für Kategorie-Auswahl
    if (categorySelect) {
        categorySelect.addEventListener('change', async function() {
            await updateGroupSelect();
        });
    }

    // Event Listener für Quiz-Setup-Formular
    if (quizSetupForm) {
        quizSetupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Quiz-Einstellungen speichern
            currentSettings = {
                type: quizTypeSelect.value,
                categoryId: categorySelect.value,
                groupId: groupSelect.value,
                questionCount: parseInt(questionCountInput.value)
            };
            
            // Quiz-Fragen laden
            const loadedQuestions = await loadQuizQuestions(
                currentSettings.categoryId,
                currentSettings.groupId,
                currentSettings.questionCount,
                currentSettings.type
            );
            
            if (loadedQuestions.length === 0) {
                // Keine Fragen verfügbar
                noQuestionsWarning.classList.remove('hidden');
                return;
            }
            
            // Quiz starten
            questions = loadedQuestions;
            startQuiz();
        });
    }

    // Event Listener für "Nächste Frage"-Button
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', async function() {
            await nextQuestion();
        });
    }

    // Event Listener für "Quiz beenden"-Button
    if (finishQuizBtn) {
        finishQuizBtn.addEventListener('click', function() {
            endQuiz();
        });
    }

    // Event Listener für "Nochmal spielen"-Button
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', function() {
            // Quiz mit den gleichen Einstellungen neu starten
            startQuiz();
        });
    }

    // Event Listener für "Neues Quiz"-Button
    if (newQuizBtn) {
        newQuizBtn.addEventListener('click', function() {
            // Zurück zum Quiz-Setup
            showQuizSetup();
        });
    }

    /**
     * Initialisiert die Seite
     */
    async function initializePage() {
        try {
            // Quiz-Typen und Kategorien laden
            await updateCategorySelect();
            
            // Debug-Information über verfügbare Fragen
            await logAvailableQuestions();
            
            // Breadcrumbs initialisieren, falls verfügbar
            if (window.breadcrumbs) {
                window.breadcrumbs.set([
                    { label: 'Quiz', url: 'quiz-player.html' }
                ]);
            }
        } catch (error) {
            console.error('Fehler beim Initialisieren der Quiz-Seite:', error);
            showError('Fehler beim Laden der Daten. Bitte aktualisiere die Seite.');
        }
    }
    
    /**
     * Protokolliert einen Überblick über die verfügbaren Fragen zur Fehlerdiagnose
     */
    async function logAvailableQuestions() {
    // Kategorien und Fragen laden
    const categories = await window.quizDB.loadCategories();
    const groups = await window.quizDB.loadGroups();
    const questions = await window.quizDB.loadQuestions();
    // Debug: Zeige alle Kategorie-IDs
    console.log('Alle Kategorien:', categories.map(c => ({ id: c.id, name: c.name })));
    // Debug: Zeige alle Fragen und deren Gruppe/Kategorie
    console.log('Alle Fragen:', questions.map(q => ({ id: q.id, groupId: q.group_id ?? q.groupId, text: q.text ?? q.question, imageUrl: q.imageUrl ?? q.imageurl })));
    try {
        // Überblick über alle Fragen
        console.log(`Gesamtzahl verfügbarer Fragen: ${questions.length}`);
        // Anzahl der Fragen pro Kategorie
        const questionsByCategory = {};
        categories.forEach(category => {
            questionsByCategory[category.id] = {
                name: category.name,
                type: category.mainCategory,
                totalCount: 0,
                textQuestions: 0,
                imageQuestions: 0
            };
        });
        // Zählen der Fragen pro Kategorie und Typ
        questions.forEach(question => {
            // Gruppe zur Frage finden
            const group = groups.find(g => String(g.id) === String(question.group_id ?? question.groupId));
            if (group && questionsByCategory[group.category_id ?? group.categoryId]) {
                const catId = group.category_id ?? group.categoryId;
                questionsByCategory[catId].totalCount++;
                if (question.imageUrl && question.imageUrl.trim() !== '') {
                    questionsByCategory[catId].imageQuestions++;
                }
                if (question.text && question.text.trim() !== '') {
                    questionsByCategory[catId].textQuestions++;
                }
            }
        });
        // Überblick ausgeben
        console.log('Fragen pro Kategorie:');
        Object.keys(questionsByCategory).forEach(categoryId => {
            const info = questionsByCategory[categoryId];
            console.log(`- ${info.name} (${info.type}): ${info.totalCount} Fragen gesamt (${info.textQuestions} mit Text, ${info.imageQuestions} mit Bild)`);
        });
    } catch (error) {
        console.error('Fehler beim Protokollieren der verfügbaren Fragen (Supabase):', error);
    }
    }

    /**
     * Aktualisiert das Kategorie-Auswahlfeld basierend auf dem ausgewählten Quiz-Typ
     */
    async function updateCategorySelect() {
        try {
            const quizType = quizTypeSelect.value;
            categorySelect.innerHTML = '<option value="">-- Kategorie wählen --</option>';
            if (!quizType) {
                categorySelect.innerHTML += '<option value="" disabled>Wähle zuerst einen Quiz-Typ</option>';
                return;
            }
            // Kategorien und Fragen über zentrale DB-Funktionen laden
            const categories = await window.quizDB.loadCategories();
            const questions = await window.quizDB.loadQuestions();
            // Kategorien mit Bildern ermitteln
            const categoriesWithImages = new Set();
            questions.forEach(q => {
                if (q.imageUrl && q.imageUrl.trim() !== '') {
                    categoriesWithImages.add(q.categoryId);
                }
            });
            // Kategorien filtern
            let userCategories = categories.filter(cat => cat.createdBy !== 'system');
            if (quizType === 'image') {
                userCategories = userCategories.filter(cat =>
                    categoriesWithImages.has(cat.id) || cat.mainCategory === quizType
                );
            } else if (quizType === 'text') {
                userCategories = userCategories.filter(cat =>
                    cat.mainCategory === quizType || !cat.mainCategory
                );
            }
            // Auswahlfeld befüllen
            if (userCategories.length > 0) {
                userCategories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    categorySelect.appendChild(option);
                });
            } else {
                categorySelect.innerHTML += '<option value="" disabled>Keine Kategorien für diesen Quiz-Typ vorhanden</option>';
            }
            await updateGroupSelect();
        } catch (error) {
            console.error('Fehler beim Laden der Kategorien aus Supabase:', error);
            showError('Fehler beim Laden der Kategorien.');
        }
    }

    /**
     * Aktualisiert das Gruppen-Auswahlfeld basierend auf der gewählten Kategorie
     */
    async function updateGroupSelect() {
        try {
            const categoryId = categorySelect.value;
            groupSelect.innerHTML = '<option value="">Alle Gruppen</option>';
            if (!categoryId) {
                groupSelect.innerHTML += '<option value="" disabled>Wähle zuerst eine Kategorie</option>';
                return;
            }
            // Gruppen über zentrale DB-Funktion laden
            const groups = await window.quizDB.loadGroups();
            // Gruppen für die gewählte Kategorie filtern
            const filteredGroups = groups.filter(group => group.categoryId === categoryId);
            if (filteredGroups.length > 0) {
                filteredGroups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id;
                    option.textContent = group.name;
                    groupSelect.appendChild(option);
                });
            } else {
                groupSelect.innerHTML += '<option value="" disabled>Keine Gruppen für diese Kategorie vorhanden</option>';
            }
        } catch (error) {
            console.error('Fehler beim Laden der Gruppen aus Supabase:', error);
            showError('Fehler beim Laden der Gruppen.');
        }
    }

/**
 * Startet das Quiz
 */
async function startQuiz() {
    // Element-Prüfung
    const missingElements = {};
    if (!quizSetupSection) missingElements.quizSetupSection = quizSetupSection;
    if (!noQuestionsWarning) missingElements.noQuestionsWarning = noQuestionsWarning;
    if (!quizSection) missingElements.quizSection = quizSection;
    if (!quizResultsSection) missingElements.quizResultsSection = quizResultsSection;
    if (Object.keys(missingElements).length > 0) {
        console.error('Fehler: Ein oder mehrere Quiz-Elemente wurden nicht gefunden!', missingElements);
        showError('Fehler: Ein oder mehrere Quiz-Elemente fehlen im HTML. Bitte prüfe die IDs.');
        return;
    }
    // Prüfen, ob Fragen vorhanden sind
    if (!questions || questions.length === 0) {
        noQuestionsWarning.classList.remove('hidden');
        showError('Für die gewählte Kategorie und Gruppe sind keine Fragen vorhanden.');
        return;
    }
    // Quiz-Setup ausblenden und Quiz-Spieler einblenden
    quizSetupSection.classList.add('hidden');
    noQuestionsWarning.classList.add('hidden');
    quizSection.classList.remove('hidden');
    quizResultsSection.classList.add('hidden');
    
    // Quiz-Status zurücksetzen
    currentQuestionIndex = 0;
    correctAnswers = 0;
    startTime = Date.now();
    
    // Timer starten
    startTimer();
    
    // Erste Frage anzeigen
    await displayCurrentQuestion();
    
    // Breadcrumbs aktualisieren, falls verfügbar
    if (window.breadcrumbs) {
        const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
        const groupName = groupSelect.value ? groupSelect.options[groupSelect.selectedIndex].text : null;
        
        // Breadcrumbs aktualisieren
        window.breadcrumbs.set([
            { label: 'Quiz', url: 'quiz-player.html' },
            { label: categoryName, url: null },
            ...(groupName && groupName !== "Alle Gruppen" ? [{ label: groupName, url: null }] : []),
            { label: `Frage 1/${questions.length}`, url: null }
        ]);
    }
}/**
 * Zeigt die aktuelle Frage an
 */
async function displayCurrentQuestion() {
    const question = questions[currentQuestionIndex];
    // Quiz-Fortschritt aktualisieren
    quizProgress.textContent = `Frage ${currentQuestionIndex + 1}/${questions.length}`;
    
    // Prüfen, ob die Frage ein Bild hat
    const hasImage = question.imageUrl && question.imageUrl.trim() !== '';
    // Prüfen, ob es sich um eine Textfrage oder eine Bildfrage handelt
    const quizType = currentSettings.type;
    console.log(`Quiz-Typ beim Anzeigen der Frage: ${quizType}, Bild vorhanden: ${hasImage}`);
    
    if (quizType === window.quizDB.MAIN_CATEGORY.TEXT) {
        // Bei Textfragen: Text anzeigen, kein Bild
        if (question.text && question.text.trim() !== "") {
            questionText.textContent = question.text;
        } else {
            questionText.textContent = "Keine Fragebeschreibung vorhanden";
        }
        questionImageContainer.classList.add('hidden');
    } else if (quizType === window.quizDB.MAIN_CATEGORY.IMAGE) {
        // Bei Bildfragen: NUR Bild anzeigen, KEIN Text
        questionText.textContent = ""; // Fragetext leeren
        
        if (hasImage) {
            // Bild anzeigen
            questionImage.src = question.imageUrl;
            questionImageContainer.classList.remove('hidden');
            questionImageContainer.classList.add('main-question-image');
            // Bucket-Namen aus imageUrl extrahieren und anzeigen
            let bucketName = '';
            try {
                const match = question.imageUrl.match(/\/object\/public\/([^\/]+)\//);
                if (match && match[1]) bucketName = match[1];
            } catch(e) {}
            let bucketInfo = document.getElementById('bucket-info');
            if (!bucketInfo) {
                bucketInfo = document.createElement('div');
                bucketInfo.id = 'bucket-info';
                bucketInfo.style.fontSize = '0.95em';
                bucketInfo.style.color = '#888';
                bucketInfo.style.marginTop = '6px';
                questionImageContainer.appendChild(bucketInfo);
            }
            bucketInfo.textContent = bucketName ? `Bucket: ${bucketName}` : '';
            console.log("Bildquelle gesetzt:", question.imageUrl, "Bucket:", bucketName);
        } else {
            // Fehler: Bildfrage ohne Bild
            questionImageContainer.classList.add('hidden');
            questionText.textContent = "Fehler: Bildfrage ohne Bild!";
            const bucketInfo = document.getElementById('bucket-info');
            if (bucketInfo) bucketInfo.textContent = '';
            console.error("Bildfrage ohne Bild gefunden:", question);
        }
    }
    
    // Antworten anzeigen
    displayAnswers(question);
    
    // Erklärung ausblenden
    explanationContainer.classList.add('hidden');
    
    // Nächste-Frage-Button ausblenden
    nextQuestionBtn.classList.add('hidden');
    
    // Quiz-Beenden-Button ein- oder ausblenden
    finishQuizBtn.classList.add('hidden');
}    /**
     * Zeigt die Antwortoptionen für eine Frage an
     * @param {object} question - Die Frage
     */
    function displayAnswers(question) {
        // Antworten-Container leeren
        answersContainer.innerHTML = '';
        
        // Die Optionen sind bereits in der DB gemischt worden, direkt anzeigen
        question.options.forEach((option, index) => {
            const answerButton = document.createElement('button');
            answerButton.classList.add('answer-button');
            answerButton.textContent = option.text;
            
            // Event Listener für die Antwort
            answerButton.addEventListener('click', function() {
                handleAnswer(option, question, answerButton, question.options);
            });
            
            answersContainer.appendChild(answerButton);
        });
    }

    /**
     * Verarbeitet die ausgewählte Antwort
     * @param {object} selectedOption - Die ausgewählte Antwortoption
     * @param {object} question - Die aktuelle Frage
     * @param {HTMLElement} selectedButton - Der ausgewählte Antwort-Button
     * @param {Array} allOptions - Alle Antwortoptionen
     */
    async function handleAnswer(selectedOption, question, selectedButton, allOptions) {
        // Alle Antwort-Buttons deaktivieren
        const answerButtons = answersContainer.querySelectorAll('.answer-button');
        answerButtons.forEach(button => {
            button.disabled = true;
        });
        
        // Richtige und falsche Antworten markieren
        answerButtons.forEach((button, index) => {
            if (allOptions[index].isCorrect) {
                button.classList.add('correct-answer');
            } else if (button === selectedButton && !selectedOption.isCorrect) {
                button.classList.add('wrong-answer');
            }
        });
        
        // Erklärung anzeigen, falls vorhanden
        if (question.explanation) {
            explanationText.textContent = question.explanation;
            explanationContainer.classList.remove('hidden');
        }
        
        // Statistik aktualisieren
        if (selectedOption.isCorrect) {
            correctAnswers++;
        }
        
        // Supabase-User-UUID holen
        let userId = null;
        if (window.supabase && window.supabase.auth && typeof window.supabase.auth.getUser === 'function') {
            const { data } = await window.supabase.auth.getUser();
            userId = data?.user?.id ?? null;
        }
        if (!userId && window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.getUser === 'function') {
            const { data } = await window.supabaseClient.auth.getUser();
            userId = data?.user?.id ?? null;
        }
        if (!userId) {
            console.error('Supabase-User-ID (UUID) konnte nicht ermittelt werden!');
            showError('Fehler: Benutzer-ID konnte nicht ermittelt werden.');
            return;
        }
        window.quizDB.saveStatistics(userId, question.id, selectedOption.isCorrect);
        
        // Nächste-Frage-Button oder Quiz-Beenden-Button anzeigen
        if (currentQuestionIndex < questions.length - 1) {
            nextQuestionBtn.classList.remove('hidden');
        } else {
            finishQuizBtn.classList.remove('hidden');
        }
    }

/**
 * Geht zur nächsten Frage
 */
async function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < questions.length) {
        await displayCurrentQuestion();
        
        // Breadcrumbs aktualisieren, falls verfügbar
        if (window.breadcrumbs) {
            const currentPath = window.breadcrumbs.path.slice();
            
            // Den letzten Eintrag (aktuelle Frage) aktualisieren
            if (currentPath.length > 0) {
                currentPath[currentPath.length - 1] = { 
                    label: `Frage ${currentQuestionIndex + 1}/${questions.length}`, 
                    url: null 
                };
                
                // Breadcrumbs aktualisieren
                window.breadcrumbs.set(currentPath);
            }
        }
    } else {
        try {
            const categoryId = categorySelect.value;
            groupSelect.innerHTML = '<option value="">Alle Gruppen</option>';
            if (!categoryId) {
                groupSelect.innerHTML += '<option value="" disabled>Wähle zuerst eine Kategorie</option>';
                return;
            }
            // Gruppen aus Supabase laden
            const { data: groups, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('categoryId', categoryId)
                .eq('active', true);
            if (groupError) throw groupError;
            if (groups && groups.length > 0) {
                groups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id;
                    option.textContent = group.name;
                    groupSelect.appendChild(option);
                });
            } else {
                groupSelect.innerHTML += '<option value="" disabled>Keine Gruppen für diese Kategorie vorhanden</option>';
            }
        } catch (error) {
            console.error('Fehler beim Laden der Gruppen aus Supabase:', error);
            showError('Fehler beim Laden der Gruppen.');
        }
            
            // Ergebnis-Eintrag hinzufügen
            currentPath.push({ label: 'Ergebnis', url: null });
            
            // Breadcrumbs aktualisieren
            window.breadcrumbs.set(currentPath);
        }
    }

    /**
     * Zeigt die Quiz-Ergebnisse an
     */
    function displayResults() {
        // Prozentsatz berechnen
        const percentage = Math.round((correctAnswers / questions.length) * 100);
        resultPercentage.textContent = `${percentage}%`;
        
        // Anzahl richtiger Antworten
        resultCorrect.textContent = `${correctAnswers} von ${questions.length} Fragen richtig`;
        
        // Benötigte Zeit
        const minutes = Math.floor(quizDuration / 60);
        const seconds = Math.floor(quizDuration % 60);
        resultTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Feedback basierend auf dem Ergebnis
        let feedbackMessage = '';
        if (percentage >= 90) {
            feedbackMessage = 'Ausgezeichnet! Du bist ein echter Experte!';
        } else if (percentage >= 75) {
            feedbackMessage = 'Sehr gut! Du kennst dich richtig gut aus!';
        } else if (percentage >= 50) {
            feedbackMessage = 'Gut gemacht! Du bist auf dem richtigen Weg.';
        } else if (percentage >= 25) {
            feedbackMessage = 'Du kannst das besser! Vielleicht noch einmal üben?';
        } else {
            feedbackMessage = 'Das war schwierig, oder? Keine Sorge, Übung macht den Meister!';
        }
        
        resultFeedback.innerHTML = `<p>${feedbackMessage}</p>`;
    }

    /**
     * Zeigt das Quiz-Setup an
     */
    function showQuizSetup() {
        // Timer stoppen (falls noch aktiv)
        stopTimer();
        
        // Quiz-Spieler und Ergebnisansicht ausblenden, Quiz-Setup einblenden
        quizSection.classList.add('hidden');
        quizResultsSection.classList.add('hidden');
        quizSetupSection.classList.remove('hidden');
        
        // Breadcrumbs zurücksetzen, falls verfügbar
        if (window.breadcrumbs) {
            window.breadcrumbs.set([
                { label: 'Quiz', url: 'quiz-player.html' }
            ]);
        }
    }

    /**
     * Startet den Timer
     */
    function startTimer() {
        // Timer zurücksetzen
        quizTimer.textContent = '00:00';
        
        // Timer starten
        startTime = Date.now();
        
        // Timer-Intervall setzen
        timerInterval = setInterval(function() {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            
            quizTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    /**
     * Stoppt den Timer
     */
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }
// Datei-Ende: keine überflüssige schließende Klammer

// Die lokale Speicherung und JSON-Logik wurde entfernt.
// Die Quiz-Player-Logik nutzt jetzt Supabase für alle Datenoperationen.
});
