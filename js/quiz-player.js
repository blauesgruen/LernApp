// quiz-player.js - Steuerung des Quiz-Spiels

document.addEventListener('DOMContentLoaded', function() {
    // Prüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const username = localStorage.getItem('username');
    
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
                currentSettings.questionCount
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
     * Aktualisiert das Kategorie-Auswahlfeld basierend auf dem ausgewählten Quiz-Typ
     */
    async function updateCategorySelect() {
        try {
            const quizType = quizTypeSelect.value;
            
            // Auswahlfeld leeren
            categorySelect.innerHTML = '<option value="">-- Kategorie wählen --</option>';
            
            if (!quizType) {
                categorySelect.innerHTML += '<option value="" disabled>Wähle zuerst einen Quiz-Typ</option>';
                return;
            }
            
            // Kategorien laden
            const categories = await window.quizDB.loadCategories();
            
            // Zeige nur die Systemkategorien im Quiz-Bereich (Textfragen & Bilderquiz)
            // Filtere nach gewähltem Quiz-Typ
            const systemCategories = categories.filter(category => 
                category.createdBy === 'system' && category.mainCategory === quizType
            );
            
            // Füge Systemkategorien hinzu
            if (systemCategories.length > 0) {
                systemCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            } else {
                categorySelect.innerHTML += '<option value="" disabled>Keine Kategorien für diesen Quiz-Typ</option>';
            }
            
            // Gruppen aktualisieren
            await updateGroupSelect();
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Kategorie-Auswahlfelds:', error);
            showError('Fehler beim Laden der Kategorien.');
        }
    }

    /**
     * Aktualisiert das Gruppen-Auswahlfeld basierend auf der gewählten Kategorie
     */
    async function updateGroupSelect() {
        try {
            const categoryId = categorySelect.value;
            
            // Auswahlfeld leeren
            groupSelect.innerHTML = '<option value="">Alle Gruppen</option>';
            
            if (!categoryId) {
                groupSelect.innerHTML += '<option value="" disabled>Wähle zuerst eine Kategorie</option>';
                return;
            }
            
            // Gruppen laden
            const groups = await window.quizDB.loadGroups();
            
            // Gruppen für die gewählte Kategorie filtern
            const filteredGroups = groups.filter(group => group.categoryId === categoryId);
            
            if (filteredGroups.length === 0) {
                groupSelect.innerHTML += '<option value="" disabled>Keine Gruppen für diese Kategorie</option>';
                return;
            }
            
            // Gruppen hinzufügen
            filteredGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Gruppen-Auswahlfelds:', error);
            showError('Fehler beim Laden der Gruppen.');
        }
    }

    /**
     * Lädt die Quiz-Fragen basierend auf den Einstellungen
     * @param {string} categoryId - ID der Kategorie
     * @param {string} groupId - ID der Gruppe (optional)
     * @param {number} questionCount - Anzahl der Fragen
     * @returns {Promise<Array>} Die geladenen Fragen
     */
    async function loadQuizQuestions(categoryId, groupId, questionCount) {
        try {
            if (!categoryId) {
                showError('Bitte wähle eine Kategorie aus.');
                return [];
            }
            
            // Fragen laden
            const questions = await window.quizDB.getQuizQuestions(
                categoryId,
                groupId || null,
                questionCount
            );
            
            return questions;
        } catch (error) {
            console.error('Fehler beim Laden der Quiz-Fragen:', error);
            showError('Fehler beim Laden der Fragen.');
            return [];
        }
    }

/**
 * Startet das Quiz
 */
async function startQuiz() {
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
    
    // Anzeige je nach Inhalt der Frage anpassen
    questionText.textContent = question.text;
    
    // Wenn die Frage ein Bild hat, dieses anzeigen
    if (question.imageUrl && question.imageUrl.trim() !== "") {
        questionImage.src = question.imageUrl;
        questionImageContainer.classList.remove('hidden');
        // Bei prominenten Bildern: Größer anzeigen
        if (!question.text || question.text.trim() === "") {
            questionImageContainer.classList.add('main-question-image');
        } else {
            questionImageContainer.classList.remove('main-question-image');
        }
    } else {
        questionImageContainer.classList.add('hidden');
        questionImageContainer.classList.remove('main-question-image');
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
    function handleAnswer(selectedOption, question, selectedButton, allOptions) {
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
        
        // Statistik speichern
        window.quizDB.saveStatistics(username, question.id, selectedOption.isCorrect);
        
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
        endQuiz();
    }
}    /**
     * Beendet das Quiz und zeigt die Ergebnisse an
     */
    function endQuiz() {
        // Timer stoppen
        stopTimer();
        
        // Quiz-Dauer berechnen
        quizDuration = (Date.now() - startTime) / 1000; // in Sekunden
        
        // Quiz-Ergebnis speichern
        window.quizDB.saveQuizResult(
            username,
            currentSettings.categoryId,
            questions.length,
            correctAnswers,
            quizDuration
        );
        
        // Quiz-Spieler ausblenden und Ergebnisansicht einblenden
        quizSection.classList.add('hidden');
        quizResultsSection.classList.remove('hidden');
        
        // Ergebnisse anzeigen
        displayResults();
        
        // Breadcrumbs aktualisieren, falls verfügbar
        if (window.breadcrumbs) {
            const currentPath = window.breadcrumbs.path.slice(0, -1); // Letzte Frage entfernen
            
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
});
