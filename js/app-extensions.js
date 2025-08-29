
// Erweiterte LernApp Methoden - Diese werden zur bestehenden Klasse hinzugefügt
const LernAppExtensions = {
    // Entfernt: Ordne zu Quiz-Funktion

    // Quiz-Logik
startQuiz(mainCategory, group) {
    if (!mainCategory || !group) {
        this.showAlert('Bitte wählen Sie eine Haupt- und Unterkategorie!', 'danger');
        return;
    }

    const filteredQuestions = this.questions.filter(q => q.mainCategory === mainCategory && q.group === group);

    if (filteredQuestions.length < 4) {
        this.showAlert('Diese Unterkategorie hat weniger als 4 Fragen! Bitte fügen Sie mehr Fragen hinzu.', 'warning');
        return;
    }

    this.currentQuiz = {
        questions: this.shuffleArray(filteredQuestions).slice(0, 10),
        currentIndex: 0,
        score: 0,
        selectedCategory: group,
        selectedMainCategory: mainCategory,
        answers: []
    };

    const firstQuestion = this.currentQuiz.questions[0];
    const questionsPool = filteredQuestions;
    // Nur neue Kategorien: Normale Multiple-Choice-Frage
    const multipleChoiceQuestion = this.generateMultipleChoiceQuestion(firstQuestion, questionsPool);
    if (!multipleChoiceQuestion) {
        this.showAlert('Nicht genügend Fragen für ein Quiz verfügbar!', 'danger');
        return;
    }
    this.currentQuiz.questions[0] = { ...firstQuestion, ...multipleChoiceQuestion };
    },

    // Quiz-Fragen generieren
    generateMultipleChoiceQuestion(questionData, availableQuestions) {
        // Nur Multiple-Choice für neue Kategorien und Demo-Fragen (nur Text)
        const categoryQuestions = availableQuestions.filter(q => 
            q.mainCategory === questionData.mainCategory && 
            q.group === questionData.group &&
            q !== questionData
        );

        if (categoryQuestions.length < 3) {
            return null;
        }

        const wrongAnswers = this.shuffleArray(categoryQuestions)
            .slice(0, 3)
            .map(q => ({
                text: q.answer,
                image: null,
                isCorrect: false
            }));

        const correctAnswer = {
            text: questionData.answer,
            image: null,
            isCorrect: true
        };

        // Antworten mischen und Index des richtigen setzen
        const answers = this.shuffleArray([correctAnswer, ...wrongAnswers]);
        const correctAnswerIndex = answers.findIndex(a => a.isCorrect);

        return {
            answers,
            correctAnswerIndex
        };
    },

    // Quiz-Anzeige
    showQuestion() {
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        
        document.getElementById('question-text').textContent = question.questionText;
        
        const questionImageContainer = document.getElementById('question-image');
        if (question.questionImage) {
            questionImageContainer.innerHTML = `<img src="${question.questionImage}" alt="Frage Bild" class="img-fluid rounded">`;
            questionImageContainer.classList.remove('d-none');
        } else {
            questionImageContainer.innerHTML = '';
            questionImageContainer.classList.add('d-none');
        }
        
        const answersContainer = document.getElementById('answers-container');
        if (!answersContainer) {
            console.error('answers-container nicht gefunden!');
            return;
        }
        
        answersContainer.innerHTML = question.answers.map((answer, index) => {
            if (answer.image) {
                return `
                    <div class="col-md-6 mb-3">
                        <div class="answer-option image-answer h-100" data-index="${index}">
                            <img src="${answer.image}" alt="Antwort ${index + 1}" class="img-fluid rounded">
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="col-md-6 mb-3">
                        <div class="answer-option text-answer h-100 d-flex align-items-center justify-content-center" data-index="${index}">
                            <span class="fs-5 fw-bold text-center">${answer.text}</span>
                        </div>
                    </div>
                `;
            }
        }).join('');

        // Event Listeners für Antworten
        document.querySelectorAll('.answer-option').forEach((answerDiv, index) => {
            answerDiv.addEventListener('click', () => {
                this.selectAnswer(index);
            });
        });

        // UI Updates
        document.getElementById('question-progress').textContent = 
            `Frage ${this.currentQuiz.currentIndex + 1} von ${this.currentQuiz.questions.length}`;
            
        const categoryElement = document.getElementById('current-category');
        if (categoryElement) {
            categoryElement.textContent = this.currentQuiz.selectedCategory;
        }
        
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            const progress = ((this.currentQuiz.currentIndex + 1) / this.currentQuiz.questions.length) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Buttons zurücksetzen
        const submitButton = document.getElementById('submit-answer');
        const nextButton = document.getElementById('next-question');
        const finishButton = document.getElementById('finish-quiz');
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.remove('d-none');
        }
        
        if (nextButton) {
            nextButton.classList.add('d-none');
        }
        if (finishButton) {
            finishButton.classList.add('d-none');
        }
        
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected', 'correct', 'incorrect');
        });
        
        this.currentQuiz.selectedAnswerIndex = null;
    },

    selectAnswer(answerIndex) {
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected');
        });

        const selectedOption = document.querySelector(`[data-index="${answerIndex}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        const submitButton = document.getElementById('submit-answer');
        if (submitButton) {
            submitButton.disabled = false;
        }
        
        this.currentQuiz.selectedAnswerIndex = answerIndex;
    },

    submitAnswer() {
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        const selectedIndex = this.currentQuiz.selectedAnswerIndex;
        
        if (selectedIndex === undefined || selectedIndex === null) {
            this.showAlert('Bitte wählen Sie eine Antwort aus!', 'warning');
            return;
        }
        
        const isCorrect = selectedIndex === question.correctAnswerIndex;

        this.currentQuiz.answers.push({
            questionIndex: this.currentQuiz.currentIndex,
            selectedIndex: selectedIndex,
            correctIndex: question.correctAnswerIndex,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            this.currentQuiz.score++;
        }

        // Antworten einfärben
        document.querySelectorAll('.answer-option').forEach((option, index) => {
            if (index === question.correctAnswerIndex) {
                option.classList.add('correct');
            } else if (index === selectedIndex && !isCorrect) {
                option.classList.add('incorrect');
            }
        });

        // Buttons aktualisieren
        document.getElementById('submit-answer').classList.add('d-none');
        
        if (this.currentQuiz.currentIndex + 1 < this.currentQuiz.questions.length) {
            document.getElementById('next-question').classList.remove('d-none');
        } else {
            document.getElementById('finish-quiz').classList.remove('d-none');
        }
    },

    nextQuestion() {
        this.currentQuiz.currentIndex++;
        
        const nextQuestion = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        
        const questionsPool = this.questions.filter(q => q.category === this.currentQuiz.selectedCategory);
        const multipleChoiceQuestion = this.generateMultipleChoiceQuestion(nextQuestion, questionsPool);
        this.currentQuiz.questions[this.currentQuiz.currentIndex] = { ...nextQuestion, ...multipleChoiceQuestion };
        
        this.showQuestion();
    },

    finishQuiz() {
        this.updateStatistics();

        const percentage = Math.round((this.currentQuiz.score / this.currentQuiz.questions.length) * 100);
        const resultContainer = document.getElementById('result-stats');
        
        let resultText = '';
        let resultClass = '';
        
        if (percentage >= 80) {
            resultText = 'Ausgezeichnet!';
            resultClass = 'text-success';
        } else if (percentage >= 60) {
            resultText = 'Gut gemacht!';
            resultClass = 'text-primary';
        } else if (percentage >= 40) {
            resultText = 'Nicht schlecht!';
            resultClass = 'text-warning';
        } else {
            resultText = 'Mehr Übung nötig!';
            resultClass = 'text-danger';
        }

        resultContainer.innerHTML = `
            <div class="${resultClass} mb-4">
                <h4>${resultText}</h4>
                <p class="fs-5">${this.currentQuiz.score} von ${this.currentQuiz.questions.length} Fragen richtig</p>
                <p class="fs-4 fw-bold">${percentage}%</p>
                <p class="text-muted">Kategorie: ${this.currentQuiz.selectedCategory}</p>
            </div>
            
            <div class="mt-4 d-flex justify-content-center gap-3">
                <button class="btn btn-primary btn-lg" onclick="window.app.restartQuiz()">
                    <i class="bi bi-arrow-repeat me-2"></i>Quiz wiederholen
                </button>
                <button class="btn btn-success btn-lg" onclick="showPage('home')">
                    <i class="bi bi-house-fill me-2"></i>Zur Startseite
                </button>
                <button class="btn btn-info btn-lg" onclick="showPage('quiz')">
                    <i class="bi bi-play-fill me-2"></i>Neues Quiz
                </button>
            </div>
        `;

        document.getElementById('quiz-container').classList.add('d-none');
        document.getElementById('quiz-result').classList.remove('d-none');
    },

    restartQuiz() {
        this.resetQuizContainer();
        this.startQuiz(this.currentQuiz.selectedCategory);
    },

    resetQuizContainer() {
        document.getElementById('quiz-container').classList.remove('d-none');
        document.getElementById('quiz-result').classList.add('d-none');
    },

    updateStatistics() {
        this.statistics.totalQuestions += this.currentQuiz.questions.length;
        this.statistics.correctAnswers += this.currentQuiz.score;
        this.statistics.lastPlayed = new Date().toISOString();
        
        if (!this.statistics.categoriesPlayed[this.currentQuiz.selectedCategory]) {
            this.statistics.categoriesPlayed[this.currentQuiz.selectedCategory] = {
                totalQuestions: 0,
                correctAnswers: 0,
                gamesPlayed: 0
            };
        }
        
        const categoryStats = this.statistics.categoriesPlayed[this.currentQuiz.selectedCategory];
        categoryStats.totalQuestions += this.currentQuiz.questions.length;
        categoryStats.correctAnswers += this.currentQuiz.score;
        categoryStats.gamesPlayed++;

        this.saveUserData();
        this.renderStatistics();
    }
};

// Erweitere die LernApp Klasse mit den zusätzlichen Methoden
window.addEventListener('DOMContentLoaded', () => {
    // Warte bis app initialisiert ist
    setTimeout(() => {
        if (window.app) {
            Object.assign(window.app, LernAppExtensions);
        }
        // Stelle sicher, dass showPage global verfügbar ist (wichtig für alle Browser)
        if (typeof window.showPage !== 'function' && typeof showPage === 'function') {
            window.showPage = showPage;
        }
    }, 100);
});

// CSS für Quiz-Optionen
const quizStyles = `
<style>
.answer-option {
    border: 2px solid #dee2e6;
    border-radius: 10px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 120px;
}

.answer-option:hover {
    border-color: #007bff;
    background-color: #f8f9fa;
}

.answer-option.selected {
    border-color: #007bff;
    background-color: #e7f3ff;
}

.answer-option.correct {
    border-color: #28a745;
    background-color: #d4edda;
}

.answer-option.incorrect {
    border-color: #dc3545;
    background-color: #f8d7da;
}

.answer-option.image-answer img {
    max-height: 100px;
    object-fit: contain;
}

.answer-option.text-answer {
    background-color: #ffffff;
    border: 2px solid #dee2e6;
}

.auto-dismiss {
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
</style>
`;

// Styles zum Head hinzufügen
document.head.insertAdjacentHTML('beforeend', quizStyles);



// Instanz für lokalen/Cloud-Speicher
window.lernappCloudStorage = new LocalCloudStorage();

// UI: Speicherort wählen
window.chooseLernAppStorageDir = async function() {
    if (!window.lernappCloudStorage) {
        window.lernappCloudStorage = new LocalCloudStorage();
    }
    if (typeof window.lernappCloudStorage.chooseDirectory === 'function') {
        const ok = await window.lernappCloudStorage.chooseDirectory();
        if (ok) {
            alert('Speicherort gewählt! Ihre Daten werden ab sofort dort gespeichert.\n' + getCloudHint());
        }
    } else {
        alert('Speicherfunktion nicht verfügbar.');
    }
};

// UI: Datenbank speichern
window.saveLernAppDataToCloud = async function(data) {
    try {
        await window.lernappCloudStorage.saveData(data);
        alert('Datenbank erfolgreich gespeichert!');
    } catch (e) {
        alert('Fehler beim Speichern: ' + e.message);
    }
};

// UI: Datenbank laden
window.loadLernAppDataFromCloud = async function() {
    try {
        const data = await window.lernappCloudStorage.loadData();
        alert('Datenbank erfolgreich geladen!');
        return data;
    } catch (e) {
        alert('Fehler beim Laden: ' + e.message);
        return null;
    }
};

// UI: Export/Import (Fallback)
window.exportLernAppData = function(data) {
    LocalCloudStorage.exportData(data);
};
window.importLernAppData = async function() {
    try {
        const data = await LocalCloudStorage.importData();
        alert('Daten erfolgreich importiert!');
        return data;
    } catch (e) {
        alert('Fehler beim Import: ' + e);
        return null;
    }
};

// Cloud-Hinweis für UI
window.getLernAppCloudHint = getCloudHint;

// Automatisches Speichern nach jeder Änderung
window.lernappAutoSave = function(data) {
    if (window.lernappCloudStorage && window.lernappCloudStorage.dirHandle) {
        window.lernappCloudStorage.saveDataAuto(data);
    }
};
// Beispiel: Nach jeder Änderung in der App aufrufen:
// window.lernappAutoSave(app.getUserData());

// Beispielintegration für automatisches Speichern:
// Diese Funktionen sollten in Ihrer App nach jeder relevanten Änderung aufgerufen werden.

// Nach Hinzufügen einer Frage
window.lernappAddQuestion = function(questionObj) {
    if (!window.app || !window.app.questions) return;
    window.app.questions.push(questionObj);
    if (window.app.getUserData) {
        window.lernappAutoSave(window.app.getUserData());
    }
};

// Nach Bearbeiten einer Frage
window.lernappEditQuestion = function(index, newQuestionObj) {
    if (!window.app || !window.app.questions) return;
    window.app.questions[index] = newQuestionObj;
    if (window.app.getUserData) {
        window.lernappAutoSave(window.app.getUserData());
    }
};

// Nach Löschen einer Frage
window.lernappDeleteQuestion = function(index) {
    if (!window.app || !window.app.questions) return;
    window.app.questions.splice(index, 1);
    if (window.app.getUserData) {
        window.lernappAutoSave(window.app.getUserData());
    }
};

// Nach Hinzufügen einer Kategorie
window.lernappAddCategory = function(category) {
    if (!window.app || !window.app.categories) return;
    window.app.categories.push(category);
    if (window.app.getUserData) {
        window.lernappAutoSave(window.app.getUserData());
    }
};

// Nach Bearbeiten von Einstellungen
window.lernappUpdateSettings = function(settingsObj) {
    if (!window.app || !window.app.userData) return;
    window.app.userData.settings = settingsObj;
    if (window.app.getUserData) {
        window.lernappAutoSave(window.app.getUserData());
    }
};

// Komfortabler Ordner-Dialog nach Login
window.lernappCheckUserFolder = async function(username) {
    if (!username) return;
    const lastFolder = window.LocalCloudStorage.getUserFolderName(username);
    if (lastFolder) {
        if (confirm(`Für dieses Konto wurde zuletzt der Ordner "${lastFolder}" verwendet.\nMöchten Sie diesen Ordner erneut auswählen, um die Synchronisation zu aktivieren?`)) {
            const ok = await window.lernappCloudStorage.chooseDirectory();
            if (ok && window.lernappCloudStorage.dirHandle && window.lernappCloudStorage.dirHandle.name === lastFolder) {
                alert('Ordner erfolgreich bestätigt! Automatische Synchronisation ist aktiv.');
                window.lernappCloudStorage.setUserFolderName(username);
            } else if (ok) {
                alert('Sie haben einen anderen Ordner gewählt. Die Synchronisation ist jetzt mit diesem Ordner aktiv.');
                window.lernappCloudStorage.setUserFolderName(username);
            } else {
                alert('Keine Synchronisation aktiviert.');
            }
        }
    }
};
// Datei-Ende: Fehlende schließende Klammer ergänzt
}
}
// Datei-Ende
