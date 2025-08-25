// LernApp - Hauptlogik

class LernApp {
    constructor() {
        this.categories = this.loadFromStorage('categories') || ['Allgemein', 'Ordne zu'];
        this.questions = this.loadFromStorage('questions') || [];
        this.statistics = this.loadFromStorage('statistics') || {
            totalQuestions: 0,
            correctAnswers: 0,
            categoriesPlayed: {},
            lastPlayed: null
        };
        
        this.currentQuiz = {
            questions: [],
            currentIndex: 0,
            score: 0,
            selectedCategory: null,
            answers: []
        };

        this.init();
    }

    init() {
        this.loadSampleData();
        this.updateCategorySelects();
        this.renderCategories();
        this.renderCategoriesList();
        this.renderQuestionsList();
        this.renderStatistics();
        this.setupEventListeners();
    }

    // Beispieldaten laden (nur beim ersten Start)
    loadSampleData() {
        if (this.questions.length === 0) {
            const sampleQuestions = [
                // Geografie - Text-Fragen mit Text-Antworten
                {
                    id: 1,
                    category: 'Geografie',
                    question: 'Was ist die Hauptstadt von Deutschland?',
                    answer: 'Berlin',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 2,
                    category: 'Geografie', 
                    question: 'Was ist die Hauptstadt von Frankreich?',
                    answer: 'Paris',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 3,
                    category: 'Geografie',
                    question: 'Was ist die Hauptstadt von Italien?',
                    answer: 'Rom',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 4,
                    category: 'Geografie',
                    question: 'Was ist die Hauptstadt von Spanien?',
                    answer: 'Madrid',
                    questionImage: null,
                    answerImage: null
                },
                // Tiere - Text-Fragen mit Text-Antworten
                {
                    id: 5,
                    category: 'Tiere',
                    question: 'Welches ist das größte Säugetier der Welt?',
                    answer: 'Blauwal',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 6,
                    category: 'Tiere',
                    question: 'Welches Tier ist der König der Tiere?',
                    answer: 'Löwe',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 7,
                    category: 'Tiere',
                    question: 'Welches Tier hat einen Rüssel?',
                    answer: 'Elefant',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 8,
                    category: 'Tiere',
                    question: 'Welches Tier lebt in einem Bau?',
                    answer: 'Fuchs',
                    questionImage: null,
                    answerImage: null
                },
                // Beispiele für verschiedene Kombinationen (werden vom Benutzer ergänzt)
                // - Nur Bild-Fragen mit Text-Antworten
                // - Text-Fragen mit Nur-Bild-Antworten  
                // - Nur-Bild-Fragen mit Nur-Bild-Antworten
                // - Gemischte Fragen (Text + Bild) mit gemischten Antworten
            ];
            
            this.questions = sampleQuestions;
            this.categories = ['Geografie', 'Tiere'];
            this.saveToStorage('questions', this.questions);
            this.saveToStorage('categories', this.categories);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Frage-Formular
        document.getElementById('question-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addQuestion();
        });

        // Neue Kategorie
        document.getElementById('new-category').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCategory();
            }
        });

        // Antwort-Typ-Wechsel
        document.querySelectorAll('input[name="answer-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleAnswerTypeSection(e.target.value);
            });
        });

        // Bild-Upload mit Vorschau
        document.getElementById('shared-image-input').addEventListener('change', (e) => {
            this.handleImageUpload(e, 'shared');
        });
        
        document.getElementById('answer-image-input').addEventListener('change', (e) => {
            this.handleImageUpload(e, 'answer');
        });

        // Filter für Fragen-Liste
        document.getElementById('filter-category').addEventListener('change', () => {
            this.renderQuestionsList();
        });
    }

    // Antwort-Typ Umschalten
    toggleAnswerTypeSection(answerType) {
        const textSection = document.getElementById('text-answer-section');
        const imageSection = document.getElementById('image-answer-section');
        
        if (answerType === 'text') {
            textSection.classList.remove('d-none');
            imageSection.classList.add('d-none');
            // Text-Antwort als required setzen
            document.getElementById('answer-input').required = true;
            document.getElementById('answer-image-input').required = false;
        } else {
            textSection.classList.add('d-none');
            imageSection.classList.remove('d-none');
            // Bild-Antwort als required setzen
            document.getElementById('answer-input').required = false;
            document.getElementById('answer-image-input').required = true;
        }
    }

    // Lokaler Speicher
    saveToStorage(key, data) {
        localStorage.setItem(`lernapp_${key}`, JSON.stringify(data));
    }

    loadFromStorage(key) {
        const data = localStorage.getItem(`lernapp_${key}`);
        return data ? JSON.parse(data) : null;
    }

    // Seitennavigation
    showPage(pageId) {
        // Alle Seiten ausblenden
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('d-none');
        });

        // Gewählte Seite anzeigen
        document.getElementById(`${pageId}-page`).classList.remove('d-none');

        // Spezifische Aktionen für bestimmte Seiten
        if (pageId === 'admin') {
            this.updateCategorySelects();
            this.renderCategoriesList();
            this.renderQuestionsList();
        } else if (pageId === 'quiz') {
            this.renderCategories();
            this.resetQuizContainer();
        } else if (pageId === 'stats') {
            this.renderStatistics();
        }
    }

    // Kategorien verwalten
    addCategory() {
        const input = document.getElementById('new-category');
        const categoryName = input.value.trim();

        if (categoryName && !this.categories.includes(categoryName)) {
            this.categories.push(categoryName);
            this.saveToStorage('categories', this.categories);
            this.updateCategorySelects();
            this.renderCategoriesList();
            this.renderCategories();
            input.value = '';
            this.showAlert('Kategorie erfolgreich hinzugefügt!', 'success');
        } else if (this.categories.includes(categoryName)) {
            this.showAlert('Diese Kategorie existiert bereits!', 'warning');
        } else {
            this.showAlert('Bitte geben Sie einen Kategorienamen ein!', 'danger');
        }
    }

    deleteCategory(categoryName) {
        if (confirm(`Möchten Sie die Kategorie "${categoryName}" wirklich löschen? Alle Fragen dieser Kategorie werden ebenfalls gelöscht.`)) {
            this.categories = this.categories.filter(cat => cat !== categoryName);
            this.questions = this.questions.filter(q => q.category !== categoryName);
            
            this.saveToStorage('categories', this.categories);
            this.saveToStorage('questions', this.questions);
            
            this.updateCategorySelects();
            this.renderCategoriesList();
            this.renderQuestionsList();
            this.renderCategories();
            
            this.showAlert('Kategorie und zugehörige Fragen gelöscht!', 'info');
        }
    }

    updateCategorySelects() {
        const questionSelect = document.getElementById('question-category');
        const filterSelect = document.getElementById('filter-category');
        
        // Question category select
        questionSelect.innerHTML = '<option value="">Kategorie wählen...</option>';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            questionSelect.appendChild(option);
        });

        // Filter select
        if (filterSelect) {
            const currentValue = filterSelect.value;
            filterSelect.innerHTML = '<option value="">Alle Kategorien</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                filterSelect.appendChild(option);
            });
            filterSelect.value = currentValue;
        }
    }

    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        container.innerHTML = '';

        this.categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';
            categoryDiv.innerHTML = `
                <span>${category}</span>
                <button class="btn btn-sm btn-danger" onclick="app.deleteCategory('${category}')">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            container.appendChild(categoryDiv);
        });
    }

    // Fragen verwalten
    addQuestion() {
        const form = document.getElementById('question-form');
        
        const category = document.getElementById('question-category').value;
        const questionText = document.getElementById('question-input').value.trim();
        const answerType = document.querySelector('input[name="answer-type"]:checked').value;
        const answerText = document.getElementById('answer-input').value.trim();
        const sharedImageInput = document.getElementById('shared-image-input');
        const answerImageInput = document.getElementById('answer-image-input');

        // Validierung
        if (!category) {
            this.showAlert('Bitte wählen Sie eine Kategorie!', 'danger');
            return;
        }

        // Validierung: Entweder Frage-Text oder Frage-Bild muss vorhanden sein
        if (!questionText && !sharedImageInput.files[0]) {
            this.showAlert('Bitte geben Sie entweder einen Frage-Text ein oder laden Sie ein Frage-Bild hoch!', 'danger');
            return;
        }

        // Validierung: Je nach Antwort-Typ
        if (answerType === 'text' && !answerText) {
            this.showAlert('Bitte geben Sie einen Antwort-Text ein!', 'danger');
            return;
        }
        
        if (answerType === 'image' && !answerImageInput.files[0]) {
            this.showAlert('Bitte laden Sie ein Antwort-Bild hoch!', 'danger');
            return;
        }

        // Spezielle Validierung für "Ordne zu" Kategorie
        if (category === 'Ordne zu' && (answerType !== 'image' || !sharedImageInput.files[0])) {
            this.showAlert('Für die Kategorie "Ordne zu" sind sowohl Frage-Bild als auch Antwort-Bild erforderlich!', 'danger');
            return;
        }

        // Neue Frage erstellen
        const newQuestion = {
            id: Date.now(),
            category: category,
            question: questionText || null,
            answerType: answerType,
            answer: answerType === 'text' ? answerText : null,
            questionImage: null,
            answerImage: null
        };

        // Bilder verarbeiten
        const processImages = () => {
            let imagesToProcess = 0;
            let imagesProcessed = 0;
            
            const checkComplete = () => {
                imagesProcessed++;
                if (imagesProcessed === imagesToProcess) {
                    this.saveQuestion(newQuestion);
                }
            };

            // Frage-Bild verarbeiten
            if (sharedImageInput.files[0]) {
                imagesToProcess++;
                const reader = new FileReader();
                reader.onload = (e) => {
                    newQuestion.questionImage = e.target.result;
                    checkComplete();
                };
                reader.readAsDataURL(sharedImageInput.files[0]);
            }

            // Antwort-Bild verarbeiten (nur bei answerType === 'image')
            if (answerType === 'image' && answerImageInput.files[0]) {
                imagesToProcess++;
                const reader = new FileReader();
                reader.onload = (e) => {
                    newQuestion.answerImage = e.target.result;
                    checkComplete();
                };
                reader.readAsDataURL(answerImageInput.files[0]);
            }

            // Wenn keine Bilder zu verarbeiten sind
            if (imagesToProcess === 0) {
                this.saveQuestion(newQuestion);
            }
        };

        processImages();
    }

    saveQuestion(question) {
        this.questions.push(question);
        this.saveToStorage('questions', this.questions);
        this.renderQuestionsList();
        
        // Formular zurücksetzen
        document.getElementById('question-form').reset();
        
        // Bild-Vorschauen leeren
        document.getElementById('shared-image-preview').innerHTML = '';
        document.getElementById('answer-image-preview').innerHTML = '';
        
        // Antwort-Typ-Sektion zurücksetzen
        document.getElementById('text-answer-section').classList.remove('d-none');
        document.getElementById('image-answer-section').classList.add('d-none');
        document.getElementById('text-answer').checked = true;
        
        this.showAlert('Frage/Antwort erfolgreich hinzugefügt!', 'success');
    }

    deleteQuestion(questionId) {
        if (confirm('Möchten Sie diese Frage wirklich löschen?')) {
            this.questions = this.questions.filter(q => q.id !== questionId);
            this.saveToStorage('questions', this.questions);
            this.renderQuestionsList();
            this.showAlert('Frage gelöscht!', 'info');
        }
    }

    renderQuestionsList() {
        const container = document.getElementById('questions-list');
        const filterCategory = document.getElementById('filter-category')?.value || '';
        
        container.innerHTML = '';

        // Fragen filtern
        let filteredQuestions = this.questions;
        if (filterCategory) {
            filteredQuestions = this.questions.filter(q => q.category === filterCategory);
        }

        if (filteredQuestions.length === 0) {
            const message = filterCategory 
                ? `Keine Fragen in der Kategorie "${filterCategory}" gefunden.`
                : 'Noch keine Fragen vorhanden. Fügen Sie die erste Frage hinzu!';
            container.innerHTML = `<p class="text-muted">${message}</p>`;
            return;
        }

        // Nach Kategorie gruppieren
        const groupedQuestions = {};
        filteredQuestions.forEach(question => {
            if (!groupedQuestions[question.category]) {
                groupedQuestions[question.category] = [];
            }
            groupedQuestions[question.category].push(question);
        });

        // Fragen anzeigen
        Object.entries(groupedQuestions).forEach(([category, questions]) => {
            // Kategorie-Header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'alert alert-info d-flex justify-content-between align-items-center mb-2';
            categoryHeader.innerHTML = `
                <strong>${category}</strong>
                <small>${questions.length} Frage(n)</small>
            `;
            container.appendChild(categoryHeader);

            // Fragen der Kategorie
            questions.forEach(question => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-item mb-3';
                
                // Frage-Anzeige
                let questionDisplay = '';
                if (question.question && question.questionImage) {
                    questionDisplay = `
                        <div class="question-preview mb-2">
                            <strong>Frage:</strong> ${question.question}
                        </div>
                        <div class="mb-2">
                            <img src="${question.questionImage}" alt="Frage/Antwort Bild" class="img-thumbnail" style="max-width: 150px;">
                            <small class="text-muted d-block">Bild wird auch bei der Antwort verwendet</small>
                        </div>
                    `;
                } else if (question.question) {
                    questionDisplay = `
                        <div class="question-preview mb-2">
                            <strong>Frage:</strong> ${question.question}
                        </div>
                    `;
                } else if (question.questionImage) {
                    questionDisplay = `
                        <div class="question-preview mb-2">
                            <strong>Frage:</strong> <em>(nur Bild)</em>
                        </div>
                        <div class="mb-2">
                            <img src="${question.questionImage}" alt="Frage/Antwort Bild" class="img-thumbnail" style="max-width: 150px;">
                            <small class="text-muted d-block">Bild wird auch bei der Antwort verwendet</small>
                        </div>
                    `;
                }

                // Antwort-Anzeige (vereinfacht, da Bild das gleiche ist)
                let answerDisplay = `
                    <div class="answer-preview mb-2">
                        <strong>Antwort:</strong> 
                        <span class="correct-answer">${question.answer}</span>
                    </div>
                `;

                questionDiv.innerHTML = `
                    <div class="row">
                        <div class="col-md-8">
                            ${questionDisplay}
                            ${answerDisplay}
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-sm btn-danger" onclick="app.deleteQuestion(${question.id})">
                                <i class="bi bi-trash"></i> Löschen
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(questionDiv);
            });
        });
    }

    // Quiz-Funktionen
    renderCategories() {
        const container = document.getElementById('category-buttons');
        container.innerHTML = '';

        // Alle Kategorien Button
        const allBtn = document.createElement('button');
        allBtn.className = 'btn btn-outline-primary category-btn';
        allBtn.textContent = 'Alle Kategorien';
        allBtn.onclick = () => this.startQuiz('all');
        container.appendChild(allBtn);

        // Spezifische Kategorien
        this.categories.forEach(category => {
            const questionsInCategory = this.questions.filter(q => q.category === category);
            const canCreateQuiz = questionsInCategory.length >= 4;
            
            const btn = document.createElement('button');
            btn.className = `btn ${canCreateQuiz ? 'btn-outline-primary' : 'btn-outline-secondary'} category-btn`;
            btn.disabled = !canCreateQuiz;
            
            let buttonText = `${category} (${questionsInCategory.length})`;
            if (!canCreateQuiz) {
                buttonText += ' - Min. 4 benötigt';
            }
            
            btn.textContent = buttonText;
            btn.onclick = () => canCreateQuiz && this.startQuiz(category);
            container.appendChild(btn);
        });
    }

    startQuiz(category) {
        const questionsPool = category === 'all' 
            ? this.questions 
            : this.questions.filter(q => q.category === category);

        if (questionsPool.length < 4) {
            this.showAlert('Für ein Quiz werden mindestens 4 Fragen/Antworten in einer Kategorie benötigt!', 'warning');
            return;
        }

        // Quiz-Fragen generieren (maximal 10 oder alle verfügbaren)
        const maxQuestions = Math.min(10, questionsPool.length);
        const shuffledQuestions = this.shuffleArray([...questionsPool]);
        const quizQuestions = [];

        for (let i = 0; i < maxQuestions; i++) {
            const question = shuffledQuestions[i];
            const multipleChoiceQuestion = this.generateMultipleChoiceQuestion(question, questionsPool);
            
            if (multipleChoiceQuestion) {
                quizQuestions.push(multipleChoiceQuestion);
            }
        }

        if (quizQuestions.length === 0) {
            this.showAlert('Keine geeigneten Quiz-Fragen konnten generiert werden!', 'warning');
            return;
        }

        // Quiz initialisieren
        this.currentQuiz = {
            questions: quizQuestions,
            currentIndex: 0,
            score: 0,
            selectedCategory: category,
            answers: []
        };

        // UI aktualisieren
        document.getElementById('category-selection').classList.add('d-none');
        document.getElementById('quiz-container').classList.remove('d-none');
        document.getElementById('current-category').textContent = 
            category === 'all' ? 'Alle Kategorien' : category;

        this.showQuestion();
    }

    // Generiert eine Multiple-Choice-Frage aus einer Frage/Antwort-Kombination
    generateMultipleChoiceQuestion(questionData, availableQuestions) {
        // Spezielle Behandlung für "Ordne zu" Kategorie
        if (questionData.category === 'Ordne zu') {
            return this.generateOrderQuestion(questionData, availableQuestions);
        }

        // Normale Multiple-Choice-Frage
        const categoryQuestions = availableQuestions.filter(q => 
            q.category === questionData.category && 
            q.id !== questionData.id &&
            q.answerType === questionData.answerType // Gleicher Antwort-Typ
        );

        if (categoryQuestions.length < 3) {
            // Nicht genügend falsche Antworten verfügbar
            return null;
        }

        // 3 zufällige falsche Antworten auswählen
        const wrongAnswers = this.shuffleArray(categoryQuestions)
            .slice(0, 3)
            .map(q => ({
                text: questionData.answerType === 'text' ? q.answer : null,
                image: questionData.answerType === 'image' ? q.answerImage : null,
                isCorrect: false
            }));

        // Korrekte Antwort hinzufügen
        const correctAnswer = {
            text: questionData.answerType === 'text' ? questionData.answer : null,
            image: questionData.answerType === 'image' ? questionData.answerImage : null,
            isCorrect: true
        };

        // Alle Antworten mischen
        const allAnswers = this.shuffleArray([...wrongAnswers, correctAnswer]);

        return {
            questionText: questionData.question || 'Was ist die richtige Antwort?',
            questionImage: questionData.questionImage,
            answers: allAnswers,
            correctAnswerIndex: allAnswers.findIndex(a => a.isCorrect)
        };
    }

    // Spezielle Funktion für "Ordne zu" Fragen
    generateOrderQuestion(questionData, availableQuestions) {
        // Nur Fragen aus "Ordne zu" Kategorie mit Bild-Antworten
        const orderQuestions = availableQuestions.filter(q => 
            q.category === 'Ordne zu' && 
            q.id !== questionData.id &&
            q.answerType === 'image' &&
            q.answerImage
        );

        if (orderQuestions.length < 3) {
            return null;
        }

        // 3 zufällige falsche Antwort-Bilder auswählen
        const wrongAnswers = this.shuffleArray(orderQuestions)
            .slice(0, 3)
            .map(q => ({
                text: null,
                image: q.answerImage,
                isCorrect: false
            }));

        // Korrekte Antwort hinzufügen
        const correctAnswer = {
            text: null,
            image: questionData.answerImage,
            isCorrect: true
        };

        // Alle Antworten mischen
        const allAnswers = this.shuffleArray([...wrongAnswers, correctAnswer]);

        return {
            questionText: 'Ordne das passende Bild zu:',
            questionImage: questionData.questionImage,
            answers: allAnswers,
            correctAnswerIndex: allAnswers.findIndex(a => a.isCorrect)
        };
    }
                text: q.answer,
                image: answersAreImages ? q.answerImage : null
            }));

        // Richtige Antwort hinzufügen
        const correctAnswer = {
            text: questionData.answer,
            image: answersAreImages ? questionData.answerImage : null
        };

        // Alle Antworten mischen
        const allAnswers = this.shuffleArray([correctAnswer, ...wrongAnswers]);
        
        // Index der richtigen Antwort finden
        const correctIndex = allAnswers.findIndex(answer => 
            answer.text === questionData.answer && 
            (answersAreImages ? answer.image === questionData.answerImage : true)
        );

        return {
            id: questionData.id,
            category: questionData.category,
            question: questionText,
            questionImage: questionImage,
            answers: allAnswers,
            correct: correctIndex,
            questionType: showImage ? 'image' : 'text',
            answerType: answersAreImages ? 'image' : 'text'
        };
    }

    showQuestion() {
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        const totalQuestions = this.currentQuiz.questions.length;
        const currentNumber = this.currentQuiz.currentIndex + 1;

        // Header aktualisieren
        document.getElementById('question-counter').textContent = 
            `Frage ${currentNumber} von ${totalQuestions}`;
        document.getElementById('progress-bar').style.width = 
            `${(currentNumber / totalQuestions) * 100}%`;

        // Frage anzeigen
        const questionContainer = document.getElementById('question-text');
        const imageContainer = document.getElementById('question-image');
        const questionImg = document.getElementById('question-img');
        
        // Frage-Text anzeigen
        questionContainer.textContent = question.question;
        
        // Bild anzeigen/verstecken basierend auf questionType
        if (question.questionImage && question.questionType === 'image') {
            questionImg.src = question.questionImage;
            imageContainer.classList.remove('d-none');
        } else {
            imageContainer.classList.add('d-none');
        }

        // Antwortoptionen
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = '';

        question.answers.forEach((answer, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'card answer-option mb-2';
            
            let answerContent = '';
            
            // Antworten basierend auf answerType anzeigen - entweder nur Text oder nur Bild
            if (question.answerType === 'image' && answer.image) {
                // Bei Text-Fragen: Nur Bilder als Antworten (kein Text)
                answerContent = `
                    <div class="text-center py-2">
                        <img src="${answer.image}" alt="Antwort ${index + 1}" class="img-fluid answer-image" style="max-height: 150px; border-radius: 8px;">
                    </div>
                `;
            } else {
                // Bei Bild-Fragen: Nur Text als Antworten (größer und prominenter)
                const isImageQuestion = question.questionType === 'image';
                answerContent = `
                    <div class="text-center ${isImageQuestion ? 'py-3' : 'py-2'}">
                        <span class="${isImageQuestion ? 'fs-4 fw-bold' : 'fs-5'}">${answer.text}</span>
                    </div>
                `;
            }

            answerDiv.innerHTML = `
                <div class="card-body">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="quiz-answer" id="answer-${index}" value="${index}">
                        <label class="form-check-label w-100" for="answer-${index}">
                            ${answerContent}
                        </label>
                    </div>
                </div>
            `;
            
            answerDiv.addEventListener('click', () => {
                document.getElementById(`answer-${index}`).checked = true;
                this.selectAnswer(index);
            });
            
            answersContainer.appendChild(answerDiv);
        });

        // Buttons zurücksetzen
        document.getElementById('submit-answer').style.display = 'inline-block';
        document.getElementById('submit-answer').disabled = true;
        document.getElementById('next-question').classList.add('d-none');
        document.getElementById('finish-quiz').classList.add('d-none');

        // Event Listener für Submit
        document.getElementById('submit-answer').onclick = () => this.submitAnswer();
    }

    selectAnswer(answerIndex) {
        // Alle Optionen deselektieren
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Gewählte Option markieren
        document.querySelectorAll('.answer-option')[answerIndex].classList.add('selected');
        
        // Submit Button aktivieren
        document.getElementById('submit-answer').disabled = false;
    }

    submitAnswer() {
        const selectedAnswer = parseInt(document.querySelector('input[name="quiz-answer"]:checked')?.value);
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        const isCorrect = selectedAnswer === question.correct;

        // Antwort speichern
        this.currentQuiz.answers.push({
            questionId: question.id,
            selectedAnswer: selectedAnswer,
            correctAnswer: question.correct,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            this.currentQuiz.score++;
        }

        // Antworten visuell markieren
        document.querySelectorAll('.answer-option').forEach((option, index) => {
            option.classList.add('disabled');
            
            if (index === question.correct) {
                option.classList.add('correct');
            } else if (index === selectedAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
        });

        // Buttons aktualisieren
        document.getElementById('submit-answer').style.display = 'none';
        
        if (this.currentQuiz.currentIndex < this.currentQuiz.questions.length - 1) {
            const nextBtn = document.getElementById('next-question');
            nextBtn.classList.remove('d-none');
            nextBtn.onclick = () => this.nextQuestion();
        } else {
            const finishBtn = document.getElementById('finish-quiz');
            finishBtn.classList.remove('d-none');
            finishBtn.onclick = () => this.finishQuiz();
        }
    }

    nextQuestion() {
        this.currentQuiz.currentIndex++;
        this.showQuestion();
    }

    finishQuiz() {
        // Statistiken aktualisieren
        this.updateStatistics();

        // Ergebnis anzeigen
        document.getElementById('quiz-container').classList.add('d-none');
        document.getElementById('quiz-result').classList.remove('d-none');

        const score = this.currentQuiz.score;
        const total = this.currentQuiz.questions.length;
        const percentage = Math.round((score / total) * 100);

        let resultClass = 'text-success';
        let resultIcon = 'bi-check-circle-fill';
        let resultText = 'Ausgezeichnet!';

        if (percentage < 50) {
            resultClass = 'text-danger';
            resultIcon = 'bi-x-circle-fill';
            resultText = 'Weiter üben!';
        } else if (percentage < 75) {
            resultClass = 'text-warning';
            resultIcon = 'bi-exclamation-triangle-fill';
            resultText = 'Gut gemacht!';
        }

        document.getElementById('result-stats').innerHTML = `
            <div class="${resultClass} mb-3">
                <i class="bi ${resultIcon} fs-1"></i>
            </div>
            <h4 class="${resultClass}">${resultText}</h4>
            <p class="lead">Sie haben <strong>${score} von ${total}</strong> Fragen richtig beantwortet.</p>
            <p>Das entspricht <strong>${percentage}%</strong></p>
        `;
    }

    restartQuiz() {
        this.resetQuizContainer();
        this.startQuiz(this.currentQuiz.selectedCategory);
    }

    resetQuizContainer() {
        document.getElementById('category-selection').classList.remove('d-none');
        document.getElementById('quiz-container').classList.add('d-none');
        document.getElementById('quiz-result').classList.add('d-none');
    }

    // Statistiken
    updateStatistics() {
        const stats = this.statistics;
        stats.totalQuestions += this.currentQuiz.questions.length;
        stats.correctAnswers += this.currentQuiz.score;
        stats.lastPlayed = new Date().toISOString();

        // Kategorie-Statistiken
        const category = this.currentQuiz.selectedCategory;
        if (!stats.categoriesPlayed[category]) {
            stats.categoriesPlayed[category] = { played: 0, correct: 0 };
        }
        stats.categoriesPlayed[category].played += this.currentQuiz.questions.length;
        stats.categoriesPlayed[category].correct += this.currentQuiz.score;

        this.saveToStorage('statistics', stats);
    }

    renderStatistics() {
        const container = document.getElementById('stats-container');
        const stats = this.statistics;

        if (stats.totalQuestions === 0) {
            container.innerHTML = `
                <div class="text-center">
                    <i class="bi bi-bar-chart fs-1 text-muted mb-3"></i>
                    <h4>Noch keine Statistiken</h4>
                    <p class="text-muted">Spielen Sie ein Quiz, um Ihre Statistiken zu sehen!</p>
                    <button class="btn btn-primary" onclick="showPage('quiz')">Quiz starten</button>
                </div>
            `;
            return;
        }

        const accuracy = Math.round((stats.correctAnswers / stats.totalQuestions) * 100);
        const lastPlayed = stats.lastPlayed ? new Date(stats.lastPlayed).toLocaleDateString('de-DE') : 'Nie';

        container.innerHTML = `
            <div class="row g-4 mb-4">
                <div class="col-md-3">
                    <div class="card stat-card text-center">
                        <div class="card-body">
                            <div class="stat-number">${stats.totalQuestions}</div>
                            <div class="stat-label">Fragen gespielt</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stat-card text-center">
                        <div class="card-body">
                            <div class="stat-number">${stats.correctAnswers}</div>
                            <div class="stat-label">Richtig beantwortet</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stat-card text-center">
                        <div class="card-body">
                            <div class="stat-number">${accuracy}%</div>
                            <div class="stat-label">Genauigkeit</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card stat-card text-center">
                        <div class="card-body">
                            <div class="stat-number">${Object.keys(stats.categoriesPlayed).length}</div>
                            <div class="stat-label">Kategorien gespielt</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h5>Kategorie-Details</h5>
                </div>
                <div class="card-body">
                    ${Object.keys(stats.categoriesPlayed).length > 0 ? 
                        Object.entries(stats.categoriesPlayed).map(([category, data]) => {
                            const categoryAccuracy = Math.round((data.correct / data.played) * 100);
                            return `
                                <div class="row mb-2">
                                    <div class="col-md-4"><strong>${category}</strong></div>
                                    <div class="col-md-3">${data.played} Fragen</div>
                                    <div class="col-md-3">${data.correct} richtig</div>
                                    <div class="col-md-2">${categoryAccuracy}%</div>
                                </div>
                            `;
                        }).join('') :
                        '<p class="text-muted">Keine Kategorie-Daten verfügbar</p>'
                    }
                </div>
            </div>

            <div class="card mt-4">
                <div class="card-body">
                    <h6>Zuletzt gespielt: ${lastPlayed}</h6>
                    <button class="btn btn-outline-danger mt-2" onclick="app.resetStatistics()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Statistiken zurücksetzen
                    </button>
                </div>
            </div>
        `;
    }

    resetStatistics() {
        if (confirm('Möchten Sie wirklich alle Statistiken zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            this.statistics = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };
            this.saveToStorage('statistics', this.statistics);
            this.renderStatistics();
            this.showAlert('Statistiken wurden zurückgesetzt!', 'info');
        }
    }

    // Hilfsfunktionen
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    handleImageUpload(event, type) {
        const file = event.target.files[0];
        const previewContainer = document.getElementById(`${type}-image-preview`);
        
        if (file) {
            // Datei-Validierung
            if (!file.type.startsWith('image/')) {
                this.showAlert('Bitte wählen Sie eine gültige Bilddatei!', 'danger');
                event.target.value = '';
                previewContainer.innerHTML = '';
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB Limit
                this.showAlert('Die Datei ist zu groß. Maximale Größe: 5MB', 'danger');
                event.target.value = '';
                previewContainer.innerHTML = '';
                return;
            }

            // Bild-Vorschau erstellen
            const reader = new FileReader();
            reader.onload = (e) => {
                const isSharedImage = type === 'shared';
                const description = isSharedImage ? 
                    'Wird bei der Frage angezeigt' : 
                    'Wird als Antwort-Bild verwendet';
                    
                previewContainer.innerHTML = `
                    <div class="text-center">
                        <img src="${e.target.result}" alt="Bild Vorschau" class="img-thumbnail" style="max-width: 200px; max-height: 200px;">
                        <div class="mt-2">
                            <small class="text-success">
                                <i class="bi bi-check-circle"></i> ${description}
                            </small>
                            <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="app.removeImagePreview('${type}')">
                                <i class="bi bi-x"></i> Entfernen
                            </button>
                        </div>
                    </div>
                `;
            };
            reader.readAsDataURL(file);

            this.showAlert('Bild erfolgreich ausgewählt!', 'success');
        } else {
            previewContainer.innerHTML = '';
        }
    }

    removeImagePreview(type) {
        document.getElementById(`${type}-image-input`).value = '';
        document.getElementById(`${type}-image-preview`).innerHTML = '';
        
        this.showAlert('Bild entfernt', 'info');
    }

    showAlert(message, type = 'info') {
        // Bestehende Alerts entfernen
        document.querySelectorAll('.alert-temporary').forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-temporary fade-in`;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        alertDiv.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'x-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
        `;

        document.body.appendChild(alertDiv);

        // Alert nach 3 Sekunden entfernen
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
}

// Globale Funktionen für HTML onclick Events
function showPage(pageId) {
    app.showPage(pageId);
}

function addCategory() {
    app.addCategory();
}

function restartQuiz() {
    app.restartQuiz();
}

function removeImagePreview(type) {
    app.removeImagePreview(type);
}

// App initialisieren
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LernApp();
});
