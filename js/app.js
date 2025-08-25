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

        // Daten-Integrität prüfen
        this.validateDataIntegrity();
        
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
        this.checkAdminAccess();
    }

    // Admin-Zugang überprüfen
    checkAdminAccess() {
        const adminAccess = sessionStorage.getItem('lernapp_admin_access');
        if (!adminAccess) {
            this.lockAdminFeatures();
        }
    }

    lockAdminFeatures() {
        // Admin-Bereiche ausblenden
        const adminElements = document.querySelectorAll('#admin-page, [onclick*="admin"]');
        adminElements.forEach(element => {
            if (element.id === 'admin-page') {
                element.innerHTML = `
                    <div class="container mt-5">
                        <div class="row justify-content-center">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h5><i class="bi bi-shield-lock"></i> Admin-Zugang</h5>
                                    </div>
                                    <div class="card-body">
                                        <p>Für den Admin-Bereich ist ein Passwort erforderlich.</p>
                                        <div class="mb-3">
                                            <input type="password" id="admin-password" class="form-control" placeholder="Admin-Passwort">
                                        </div>
                                        <button onclick="app.unlockAdminAccess()" class="btn btn-primary">
                                            <i class="bi bi-unlock"></i> Freischalten
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }

    unlockAdminAccess() {
        const password = document.getElementById('admin-password').value;
        const correctPassword = 'LernApp2025Admin'; // In Produktion: Sicheres Passwort verwenden
        
        if (password === correctPassword) {
            sessionStorage.setItem('lernapp_admin_access', 'granted');
            this.showAlert('Admin-Zugang gewährt!', 'success');
            // Seite neu laden um Admin-Interface zu aktivieren
            setTimeout(() => location.reload(), 1000);
        } else {
            this.showAlert('Falsches Passwort!', 'danger');
            document.getElementById('admin-password').value = '';
        }
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
                    answerType: 'text',
                    answer: 'Berlin',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 2,
                    category: 'Geografie', 
                    question: 'Was ist die Hauptstadt von Frankreich?',
                    answerType: 'text',
                    answer: 'Paris',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 3,
                    category: 'Geografie',
                    question: 'Was ist die Hauptstadt von Italien?',
                    answerType: 'text',
                    answer: 'Rom',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 4,
                    category: 'Geografie',
                    question: 'Was ist die Hauptstadt von Spanien?',
                    answerType: 'text',
                    answer: 'Madrid',
                    questionImage: null,
                    answerImage: null
                },
                {
                    id: 5,
                    category: 'Geografie',
                    question: 'Was ist die Hauptstadt von England?',
                    answerType: 'text',
                    answer: 'London',
                    questionImage: null,
                    answerImage: null
                },
                // Beispiel für "Ordne zu" - Text-Fragen mit Bild-Antworten
                {
                    id: 6,
                    category: 'Ordne zu',
                    question: 'Finde den Apfel',
                    answerType: 'image',
                    answer: null,
                    questionImage: null,
                    answerImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9InJlZCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiPkFwZmVsPC90ZXh0Pjwvc3ZnPg=='
                },
                {
                    id: 7,
                    category: 'Ordne zu',
                    question: 'Finde die Banane',
                    answerType: 'image',
                    answer: null,
                    questionImage: null,
                    answerImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTAiIHJ4PSI0MCIgcnk9IjE1IiBmaWxsPSJ5ZWxsb3ciLz48dGV4dCB4PSI1MCIgeT0iNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9ImJsYWNrIiBmb250LXNpemU9IjEyIj5CYW5hbmU8L3RleHQ+PC9zdmc+'
                },
                {
                    id: 8,
                    category: 'Ordne zu',
                    question: 'Finde die Orange',
                    answerType: 'image',
                    answer: null,
                    questionImage: null,
                    answerImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9Im9yYW5nZSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iYmxhY2siIGZvbnQtc2l6ZT0iMTIiPk9yYW5nZTwvdGV4dD48L3N2Zz4='
                },
                {
                    id: 9,
                    category: 'Ordne zu',
                    question: 'Finde die Traube',
                    answerType: 'image',
                    answer: null,
                    questionImage: null,
                    answerImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTAiIHJ4PSIzNSIgcnk9IjQ1IiBmaWxsPSJwdXJwbGUiLz48dGV4dCB4PSI1MCIgeT0iNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIj5UcmF1YmU8L3RleHQ+PC9zdmc+'
                }
            ];

            this.questions = sampleQuestions;
            this.saveToStorage('questions', this.questions);
        }

        // Beispiel-Kategorien hinzufügen
        if (!this.categories.includes('Geografie')) {
            this.categories.push('Geografie');
            this.saveToStorage('categories', this.categories);
        }
    }

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

    // Lokaler Speicher mit Verschlüsselung
    loadFromStorage(key) {
        try {
            const encryptedData = localStorage.getItem(`lernapp_${key}`);
            if (!encryptedData) return null;
            
            const decryptedData = this.decryptData(encryptedData);
            return decryptedData ? JSON.parse(decryptedData) : null;
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            return null;
        }
    }

    saveToStorage(key, data) {
        try {
            const jsonData = JSON.stringify(data);
            const encryptedData = this.encryptData(jsonData);
            localStorage.setItem(`lernapp_${key}`, encryptedData);
        } catch (error) {
            console.error('Fehler beim Speichern der Daten:', error);
            this.showAlert('Fehler beim Speichern der Daten!', 'danger');
        }
    }

    // Einfache Verschlüsselung (Base64 + XOR)
    encryptData(data) {
        const key = 'LernApp2025SecureKey'; // In Produktion: Zufälliger Key pro Session
        let encrypted = '';
        
        for (let i = 0; i < data.length; i++) {
            encrypted += String.fromCharCode(
                data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        
        return btoa(encrypted); // Base64 kodieren
    }

    decryptData(encryptedData) {
        try {
            const key = 'LernApp2025SecureKey';
            const encrypted = atob(encryptedData); // Base64 dekodieren
            let decrypted = '';
            
            for (let i = 0; i < encrypted.length; i++) {
                decrypted += String.fromCharCode(
                    encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            
            return decrypted;
        } catch (error) {
            console.error('Entschlüsselung fehlgeschlagen:', error);
            return null;
        }
    }

    // Kategorien verwalten
    addCategory() {
        const input = document.getElementById('new-category');
        const categoryName = input.value.trim();
        
        if (!categoryName) {
            this.showAlert('Bitte geben Sie einen Kategorienamen ein!', 'danger');
            return;
        }

        if (this.categories.includes(categoryName)) {
            this.showAlert('Diese Kategorie existiert bereits!', 'warning');
            return;
        }

        this.categories.push(categoryName);
        this.saveToStorage('categories', this.categories);
        this.updateCategorySelects();
        this.renderCategoriesList();
        
        input.value = '';
        this.showAlert('Kategorie erfolgreich hinzugefügt!', 'success');
    }

    deleteCategory(categoryName) {
        if (categoryName === 'Allgemein' || categoryName === 'Ordne zu') {
            this.showAlert('Diese Kategorie kann nicht gelöscht werden!', 'warning');
            return;
        }

        if (confirm(`Möchten Sie die Kategorie "${categoryName}" wirklich löschen? Alle zugehörigen Fragen werden ebenfalls gelöscht!`)) {
            // Kategorie entfernen
            this.categories = this.categories.filter(cat => cat !== categoryName);
            
            // Zugehörige Fragen entfernen
            this.questions = this.questions.filter(q => q.category !== categoryName);
            
            // Speichern
            this.saveToStorage('categories', this.categories);
            this.saveToStorage('questions', this.questions);
            
            // UI aktualisieren
            this.updateCategorySelects();
            this.renderCategoriesList();
            this.renderQuestionsList();
            
            this.showAlert('Kategorie erfolgreich gelöscht!', 'success');
        }
    }

    updateCategorySelects() {
        const selects = ['quiz-category', 'question-category', 'filter-category'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Aktuellen Wert merken
                const currentValue = select.value;
                
                // Optionen leeren (außer der ersten)
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                
                // Neue Optionen hinzufügen
                this.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    select.appendChild(option);
                });
                
                // Wert wiederherstellen
                if (currentValue) {
                    select.value = currentValue;
                }
            }
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
        if (category === 'Ordne zu') {
            if (!questionText) {
                this.showAlert('Für die Kategorie "Ordne zu" ist ein Frage-Text erforderlich (z.B. "Finde den Apfel")!', 'danger');
                return;
            }
            if (answerType !== 'image' || !answerImageInput.files[0]) {
                this.showAlert('Für die Kategorie "Ordne zu" ist ein Antwort-Bild erforderlich!', 'danger');
                return;
            }
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
            this.showAlert('Frage erfolgreich gelöscht!', 'success');
        }
    }

    // UI-Rendering
    renderCategories() {
        const container = document.getElementById('category-buttons');
        if (!container) return;

        const nonSpecialCategories = this.categories.filter(cat => cat !== 'Ordne zu');
        
        container.innerHTML = nonSpecialCategories.map(category => {
            const questionCount = this.questions.filter(q => q.category === category).length;
            const isDisabled = questionCount < 4 ? 'disabled' : '';
            const disabledClass = questionCount < 4 ? 'btn-outline-secondary' : 'btn-outline-primary';
            
            return `
                <button class="btn ${disabledClass} m-2 px-4 py-3" 
                        onclick="window.app.startQuiz('${category}')" ${isDisabled}>
                    <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-folder fs-4 mb-2"></i>
                        <span class="fw-bold">${category}</span>
                        <small class="text-muted">${questionCount} Fragen</small>
                        ${questionCount < 4 ? '<small class="text-danger">Min. 4 Fragen nötig</small>' : ''}
                    </div>
                </button>
            `;
        }).join('');

        // Spezielle "Ordne zu" Kategorie - sammelt alle Fragen mit Bild-Antworten
        const allImageQuestions = this.questions.filter(q => q.answerType === 'image');
        const imageQuestionsByCategory = {};
        
        // Gruppiere Bild-Fragen nach Kategorien
        allImageQuestions.forEach(q => {
            if (q.category !== 'Ordne zu') { // Ausschließlich normale Kategorien
                if (!imageQuestionsByCategory[q.category]) {
                    imageQuestionsByCategory[q.category] = [];
                }
                imageQuestionsByCategory[q.category].push(q);
            }
        });
        
        // Nur anzeigen wenn mindestens eine Kategorie 4+ Bild-Fragen hat
        const availableImageCategories = Object.keys(imageQuestionsByCategory).filter(
            cat => imageQuestionsByCategory[cat].length >= 4
        );
        
        if (availableImageCategories.length > 0) {
            const totalImageQuestions = Object.values(imageQuestionsByCategory)
                .reduce((sum, questions) => sum + questions.length, 0);
                
            container.innerHTML += `
                <button class="btn btn-outline-success m-2 px-4 py-3" 
                        onclick="window.app.startOrderQuiz()">
                    <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-search fs-4 mb-2"></i>
                        <span class="fw-bold">Ordne zu</span>
                        <small class="text-muted">${totalImageQuestions} Bild-Fragen aus ${availableImageCategories.length} Kategorien</small>
                        <small class="text-success">Mischt alle Kategorien</small>
                    </div>
                </button>
            `;
        } else {
            container.innerHTML += `
                <button class="btn btn-outline-secondary m-2 px-4 py-3" disabled>
                    <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-search fs-4 mb-2"></i>
                        <span class="fw-bold">Ordne zu</span>
                        <small class="text-muted">Keine Bild-Fragen verfügbar</small>
                        <small class="text-danger">Min. 4 Bild-Fragen in einer Kategorie nötig</small>
                    </div>
                </button>
            `;
        }
    }

    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        container.innerHTML = this.categories.map(category => {
            const questionCount = this.questions.filter(q => q.category === category).length;
            const deleteButton = (category !== 'Allgemein' && category !== 'Ordne zu') ? 
                `<button class="btn btn-sm btn-outline-danger" onclick="app.deleteCategory('${category}')">
                    <i class="bi bi-trash"></i> Löschen
                </button>` : '';
                
            return `
                <div class="d-flex justify-content-between align-items-center border rounded p-3 mb-2">
                    <div>
                        <h6 class="mb-1">${category}</h6>
                        <small class="text-muted">${questionCount} Fragen</small>
                    </div>
                    ${deleteButton}
                </div>
            `;
        }).join('');
    }

    renderQuestionsList() {
        const container = document.getElementById('questions-list');
        const filterCategory = document.getElementById('filter-category').value;
        
        if (!container) return;

        let filteredQuestions = this.questions;
        if (filterCategory) {
            filteredQuestions = this.questions.filter(q => q.category === filterCategory);
        }

        if (filteredQuestions.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Keine Fragen vorhanden.</p>';
            return;
        }

        container.innerHTML = filteredQuestions.map(q => {
            const answerDisplay = q.answerType === 'text' ? 
                `<strong>Antwort:</strong> ${q.answer}` :
                `<strong>Antwort:</strong> <span class="badge bg-info">Bild</span>`;
                
            const questionDisplay = q.question ? 
                `<strong>Frage:</strong> ${q.question}` :
                `<strong>Frage:</strong> <span class="badge bg-info">Bild</span>`;

            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="card-title">
                                    <span class="badge bg-secondary me-2">${q.category}</span>
                                    ID: ${q.id}
                                </h6>
                                <p class="card-text mb-1">${questionDisplay}</p>
                                <p class="card-text mb-1">${answerDisplay}</p>
                                <small class="text-muted">
                                    Antwort-Typ: ${q.answerType === 'text' ? 'Text' : 'Bild'}
                                    ${q.questionImage ? ' | Mit Frage-Bild' : ''}
                                </small>
                            </div>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.deleteQuestion(${q.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Spezielle Quiz-Funktion für "Ordne zu" mit allen Bild-Antworten
    startOrderQuiz() {
        // Alle Fragen mit Bildantworten sammeln (aus allen Kategorien)
        const imageAnswerQuestions = this.questions.filter(q => 
            q.answerType === 'image' && 
            q.answerImage && 
            q.category !== 'Ordne zu' // Originale "Ordne zu" Fragen ausschließen
        );
        
        if (imageAnswerQuestions.length < 4) {
            this.showAlert('Es gibt weniger als 4 Fragen mit Bildantworten! Bitte fügen Sie mehr Fragen hinzu.', 'warning');
            return;
        }

        // Quiz initialisieren
        this.currentQuiz = {
            questions: this.shuffleArray(imageAnswerQuestions).slice(0, 10), // Max 10 Fragen
            currentIndex: 0,
            score: 0,
            selectedCategory: 'Ordne zu (Gemischt)',
            answers: []
        };

        // Erste Frage vorbereiten - als "Ordne zu" Format
        const firstQuestion = this.currentQuiz.questions[0];
        const multipleChoiceQuestion = this.generateMixedOrderQuestion(firstQuestion, imageAnswerQuestions);
        
        if (!multipleChoiceQuestion) {
            this.showAlert('Nicht genügend Fragen für ein Quiz verfügbar!', 'danger');
            return;
        }
        
        this.currentQuiz.questions[0] = { ...firstQuestion, ...multipleChoiceQuestion };

        // Zur Quiz-Seite wechseln und Quiz-Container einblenden
        showPage('quiz');
        document.getElementById('category-selection').classList.add('d-none');
        document.getElementById('quiz-container').classList.remove('d-none');
        this.showQuestion();
    }

    // Quiz-Logik
    startQuiz(category) {
        if (!category) {
            category = document.getElementById('quiz-category').value;
            if (!category) {
                this.showAlert('Bitte wählen Sie eine Kategorie!', 'danger');
                return;
            }
        }

        const categoryQuestions = this.questions.filter(q => q.category === category);
        
        if (categoryQuestions.length < 4) {
            this.showAlert('Diese Kategorie hat weniger als 4 Fragen! Bitte fügen Sie mehr Fragen hinzu.', 'warning');
            return;
        }

        // Quiz initialisieren
        this.currentQuiz = {
            questions: this.shuffleArray(categoryQuestions).slice(0, 10), // Max 10 Fragen
            currentIndex: 0,
            score: 0,
            selectedCategory: category,
            answers: []
        };

        // Erste Frage vorbereiten
        const firstQuestion = this.currentQuiz.questions[0];
        const questionsPool = this.questions.filter(q => q.category === category);
        
        if (category === 'Ordne zu') {
            // Spezielle Behandlung für "Ordne zu"
            const multipleChoiceQuestion = this.generateOrderQuestion(firstQuestion, questionsPool);
            if (!multipleChoiceQuestion) {
                this.showAlert('Nicht genügend Fragen für ein Quiz verfügbar!', 'danger');
                return;
            }
            this.currentQuiz.questions[0] = { ...firstQuestion, ...multipleChoiceQuestion };
        } else {
            // Normale Multiple-Choice-Frage
            const multipleChoiceQuestion = this.generateMultipleChoiceQuestion(firstQuestion, questionsPool);
            if (!multipleChoiceQuestion) {
                this.showAlert('Nicht genügend Fragen für ein Quiz verfügbar!', 'danger');
                return;
            }
            this.currentQuiz.questions[0] = { ...firstQuestion, ...multipleChoiceQuestion };
        }

        // Zur Quiz-Seite wechseln und Quiz-Container einblenden
        showPage('quiz');
        document.getElementById('category-selection').classList.add('d-none');
        document.getElementById('quiz-container').classList.remove('d-none');
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
            questionText: questionData.question, // Verwende den eingegebenen Frage-Text
            questionImage: null, // Kein Frage-Bild bei "Ordne zu"
            answers: allAnswers,
            correctAnswerIndex: allAnswers.findIndex(a => a.isCorrect)
        };
    }

    // Generiert gemischte "Ordne zu" Frage aus allen Kategorien mit Bild-Antworten
    generateMixedOrderQuestion(questionData, availableQuestions) {
        // Alle Fragen mit Bild-Antworten außer der aktuellen
        const imageQuestions = availableQuestions.filter(q => 
            q.id !== questionData.id &&
            q.answerType === 'image' &&
            q.answerImage
        );

        if (imageQuestions.length < 3) {
            return null;
        }

        // 3 zufällige falsche Antwort-Bilder auswählen
        const wrongAnswers = this.shuffleArray(imageQuestions)
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
            questionText: questionData.question, // Verwende den eingegebenen Frage-Text
            questionImage: null, // Kein Frage-Bild bei gemischten "Ordne zu"
            answers: allAnswers,
            correctAnswerIndex: allAnswers.findIndex(a => a.isCorrect)
        };
    }

    // Quiz-Anzeige
    showQuestion() {
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        
        // Frage-Text
        document.getElementById('question-text').textContent = question.questionText;
        
        // Frage-Bild
        const questionImageContainer = document.getElementById('question-image');
        if (question.questionImage) {
            questionImageContainer.innerHTML = `<img src="${question.questionImage}" alt="Frage Bild" class="img-fluid rounded">`;
            questionImageContainer.classList.remove('d-none');
        } else {
            questionImageContainer.innerHTML = '';
            questionImageContainer.classList.add('d-none');
        }
        
        // Antwortoptionen
        const answersContainer = document.getElementById('answers-container');
        if (!answersContainer) {
            console.error('answers-container nicht gefunden!');
            return;
        }
        
        answersContainer.innerHTML = question.answers.map((answer, index) => {
            if (answer.image) {
                // Bild-Antwort
                return `
                    <div class="col-md-6 mb-3">
                        <div class="answer-option image-answer h-100" data-index="${index}">
                            <img src="${answer.image}" alt="Antwort ${index + 1}" class="img-fluid rounded">
                        </div>
                    </div>
                `;
            } else {
                // Text-Antwort
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

        // Fortschrittsanzeige und Kategorie
        document.getElementById('question-progress').textContent = 
            `Frage ${this.currentQuiz.currentIndex + 1} von ${this.currentQuiz.questions.length}`;
            
        // Kategorie anzeigen
        const categoryElement = document.getElementById('current-category');
        if (categoryElement) {
            categoryElement.textContent = this.currentQuiz.selectedCategory;
        }
        
        // Progress Bar aktualisieren
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            const progress = ((this.currentQuiz.currentIndex + 1) / this.currentQuiz.questions.length) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Buttons zurücksetzen
        const submitButton = document.getElementById('submit-answer');
        const nextButton = document.getElementById('next-question');
        const finishButton = document.getElementById('finish-quiz');
        
        // Submit-Button wieder anzeigen und deaktivieren
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.remove('d-none');
        }
        
        // Andere Buttons verstecken
        if (nextButton) {
            nextButton.classList.add('d-none');
        }
        if (finishButton) {
            finishButton.classList.add('d-none');
        }
        
        // Alle Antworten deselektieren
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected', 'correct', 'incorrect');
        });
        
        // Selected Answer Index zurücksetzen
        this.currentQuiz.selectedAnswerIndex = null;
    }

    selectAnswer(answerIndex) {
        console.log('selectAnswer aufgerufen mit Index:', answerIndex);
        
        // Vorherige Auswahl entfernen
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Neue Auswahl
        const selectedOption = document.querySelector(`[data-index="${answerIndex}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
            console.log('Antwort ausgewählt:', answerIndex);
        } else {
            console.error('Antwort-Option nicht gefunden für Index:', answerIndex);
        }

        // Submit Button aktivieren
        const submitButton = document.getElementById('submit-answer');
        if (submitButton) {
            submitButton.disabled = false;
            console.log('Submit-Button aktiviert');
        }
        
        // Aktuellen Answer Index speichern
        this.currentQuiz.selectedAnswerIndex = answerIndex;
    }

    submitAnswer() {
        console.log('submitAnswer aufgerufen');
        
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        const selectedIndex = this.currentQuiz.selectedAnswerIndex;
        
        console.log('Aktueller selectedIndex:', selectedIndex);
        console.log('Korrekte Antwort:', question.correctAnswerIndex);
        
        // Validierung: Prüfen ob eine Antwort ausgewählt wurde
        if (selectedIndex === undefined || selectedIndex === null) {
            this.showAlert('Bitte wählen Sie eine Antwort aus!', 'warning');
            return;
        }
        
        const isCorrect = selectedIndex === question.correctAnswerIndex;

        // Antwort speichern
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
    }

    nextQuestion() {
        this.currentQuiz.currentIndex++;
        
        // Nächste Frage vorbereiten
        const nextQuestion = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        
        if (this.currentQuiz.selectedCategory === 'Ordne zu (Gemischt)') {
            // Für gemischte "Ordne zu" Quizzes - alle Bild-Antworten verwenden
            const imageAnswerQuestions = this.questions.filter(q => 
                q.answerType === 'image' && 
                q.answerImage && 
                q.category !== 'Ordne zu'
            );
            const multipleChoiceQuestion = this.generateMixedOrderQuestion(nextQuestion, imageAnswerQuestions);
            this.currentQuiz.questions[this.currentQuiz.currentIndex] = { ...nextQuestion, ...multipleChoiceQuestion };
        } else if (this.currentQuiz.selectedCategory === 'Ordne zu') {
            // Für normale "Ordne zu" Quizzes
            const questionsPool = this.questions.filter(q => q.category === this.currentQuiz.selectedCategory);
            const multipleChoiceQuestion = this.generateOrderQuestion(nextQuestion, questionsPool);
            this.currentQuiz.questions[this.currentQuiz.currentIndex] = { ...nextQuestion, ...multipleChoiceQuestion };
        } else {
            // Für normale Multiple-Choice-Quizzes
            const questionsPool = this.questions.filter(q => q.category === this.currentQuiz.selectedCategory);
            const multipleChoiceQuestion = this.generateMultipleChoiceQuestion(nextQuestion, questionsPool);
            this.currentQuiz.questions[this.currentQuiz.currentIndex] = { ...nextQuestion, ...multipleChoiceQuestion };
        }
        
        this.showQuestion();
    }

    finishQuiz() {
        // Statistiken aktualisieren
        this.updateStatistics();

        // Ergebnis anzeigen
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
            
            <!-- Detaillierte Antworten-Übersicht -->
            <div class="card mt-4">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-list-check me-2"></i>Detaillierte Auswertung</h5>
                </div>
                <div class="card-body">
                    ${this.generateQuizReview()}
                </div>
            </div>
            
            <!-- Action Buttons -->
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

        // Quiz-Container ausblenden, Ergebnis einblenden
        document.getElementById('quiz-container').classList.add('d-none');
        document.getElementById('quiz-result').classList.remove('d-none');
    }

    // Generiert eine detaillierte Übersicht aller Fragen und Antworten
    generateQuizReview() {
        return this.currentQuiz.questions.map((question, index) => {
            const userAnswer = this.currentQuiz.answers[index];
            const isCorrect = userAnswer.isCorrect;
            const userSelectedAnswer = question.answers[userAnswer.selectedIndex];
            const correctAnswer = question.answers[question.correctAnswerIndex];
            
            const statusIcon = isCorrect ? 
                '<i class="bi bi-check-circle-fill text-success"></i>' : 
                '<i class="bi bi-x-circle-fill text-danger"></i>';
            
            const statusClass = isCorrect ? 'border-success' : 'border-danger';
            
            return `
                <div class="card mb-3 ${statusClass}" style="border-width: 2px;">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-1 d-flex align-items-center justify-content-center">
                                <span class="fs-4">${statusIcon}</span>
                            </div>
                            <div class="col-11">
                                <h6 class="card-title">
                                    Frage ${index + 1}: ${question.questionText}
                                </h6>
                                
                                ${question.questionImage ? `
                                    <div class="mb-3">
                                        <img src="${question.questionImage}" alt="Frage Bild" class="img-thumbnail" style="max-height: 150px;">
                                    </div>
                                ` : ''}
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <strong class="${isCorrect ? 'text-success' : 'text-danger'}">Ihre Antwort:</strong>
                                        <div class="p-2 rounded mt-1" style="background-color: ${isCorrect ? '#d4edda' : '#f8d7da'};">
                                            ${this.formatAnswerDisplay(userSelectedAnswer)}
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <strong class="text-success">Korrekte Antwort:</strong>
                                        <div class="p-2 rounded mt-1" style="background-color: #d4edda;">
                                            ${this.formatAnswerDisplay(correctAnswer)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Hilfsfunktion zur Formatierung von Antworten (Text oder Bild)
    formatAnswerDisplay(answer) {
        if (answer.image) {
            return `<img src="${answer.image}" alt="Antwort" class="img-thumbnail" style="max-height: 80px;">`;
        } else {
            return `<span class="fw-bold">${answer.text}</span>`;
        }
    }

    restartQuiz() {
        this.resetQuizContainer();
        this.startQuiz(this.currentQuiz.selectedCategory);
    }

    resetQuizContainer() {
        document.getElementById('quiz-container').classList.remove('d-none');
        document.getElementById('quiz-result').classList.add('d-none');
    }

    updateStatistics() {
        this.statistics.totalQuestions += this.currentQuiz.questions.length;
        this.statistics.correctAnswers += this.currentQuiz.score;
        this.statistics.lastPlayed = new Date().toISOString();
        
        // Kategorie-Statistiken
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

        this.saveToStorage('statistics', this.statistics);
        this.renderStatistics();
    }

    renderStatistics() {
        const container = document.getElementById('statistics-content');
        if (!container) return;

        const totalCorrectPercentage = this.statistics.totalQuestions > 0 ? 
            Math.round((this.statistics.correctAnswers / this.statistics.totalQuestions) * 100) : 0;

        let statisticsHTML = `
            <div class="row">
                <div class="col-md-4 mb-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <i class="bi bi-question-circle fs-1 mb-2"></i>
                            <h5>Gesamt Fragen</h5>
                            <h3>${this.statistics.totalQuestions}</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <i class="bi bi-check-circle fs-1 mb-2"></i>
                            <h5>Richtig beantwortet</h5>
                            <h3>${this.statistics.correctAnswers}</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <i class="bi bi-percent fs-1 mb-2"></i>
                            <h5>Erfolgsquote</h5>
                            <h3>${totalCorrectPercentage}%</h3>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (Object.keys(this.statistics.categoriesPlayed).length > 0) {
            statisticsHTML += `
                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0">Statistiken nach Kategorien</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Kategorie</th>
                                        <th>Spiele</th>
                                        <th>Fragen</th>
                                        <th>Richtig</th>
                                        <th>Erfolgsquote</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            Object.entries(this.statistics.categoriesPlayed).forEach(([category, stats]) => {
                const categoryPercentage = stats.totalQuestions > 0 ? 
                    Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;
                
                statisticsHTML += `
                    <tr>
                        <td><strong>${category}</strong></td>
                        <td>${stats.gamesPlayed}</td>
                        <td>${stats.totalQuestions}</td>
                        <td>${stats.correctAnswers}</td>
                        <td>
                            <span class="badge ${categoryPercentage >= 70 ? 'bg-success' : categoryPercentage >= 50 ? 'bg-warning' : 'bg-danger'}">
                                ${categoryPercentage}%
                            </span>
                        </td>
                    </tr>
                `;
            });

            statisticsHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.statistics.lastPlayed) {
            const lastPlayed = new Date(this.statistics.lastPlayed);
            statisticsHTML += `
                <div class="mt-3 text-muted text-center">
                    <small>Zuletzt gespielt: ${lastPlayed.toLocaleDateString('de-DE')} um ${lastPlayed.toLocaleTimeString('de-DE')}</small>
                </div>
            `;
        }

        statisticsHTML += `
            <div class="mt-4 text-center">
                <button class="btn btn-outline-danger" onclick="app.resetStatistics()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Statistiken zurücksetzen
                </button>
            </div>
        `;

        container.innerHTML = statisticsHTML;
    }

    resetStatistics() {
        if (confirm('Möchten Sie wirklich alle Statistiken zurücksetzen?')) {
            this.statistics = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };
            this.saveToStorage('statistics', this.statistics);
            this.renderStatistics();
            this.showAlert('Statistiken wurden zurückgesetzt!', 'success');
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

    showAlert(message, type = 'info') {
        // Vorhandene Alerts entfernen
        const existingAlerts = document.querySelectorAll('.alert-floating');
        existingAlerts.forEach(alert => alert.remove());

        // Neuen Alert erstellen
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-floating position-fixed top-0 start-50 translate-middle-x mt-3`;
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'x-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
        `;

        document.body.appendChild(alert);

        // Alert automatisch entfernen
        setTimeout(() => {
            alert.remove();
        }, 3000);
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

    // Sicherheitsfunktionen
    validateDataIntegrity() {
        // Kategorien validieren
        if (!Array.isArray(this.categories)) {
            console.warn('Kategorien-Daten beschädigt, setze Standardwerte');
            this.categories = ['Allgemein', 'Ordne zu'];
            this.saveToStorage('categories', this.categories);
        }

        // Fragen validieren
        if (!Array.isArray(this.questions)) {
            console.warn('Fragen-Daten beschädigt, setze Standardwerte');
            this.questions = [];
            this.saveToStorage('questions', this.questions);
        } else {
            // Jede Frage validieren
            this.questions = this.questions.filter(q => this.validateQuestion(q));
        }

        // Statistiken validieren
        if (!this.statistics || typeof this.statistics !== 'object') {
            console.warn('Statistik-Daten beschädigt, setze Standardwerte');
            this.statistics = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };
            this.saveToStorage('statistics', this.statistics);
        }
    }

    validateQuestion(question) {
        if (!question || typeof question !== 'object') return false;
        if (typeof question.id !== 'number') return false;
        if (typeof question.category !== 'string') return false;
        if (!['text', 'image'].includes(question.answerType)) return false;
        
        // Weitere Validierungen je nach Typ
        if (question.answerType === 'text' && !question.answer) return false;
        if (question.answerType === 'image' && !question.answerImage) return false;
        
        return true;
    }

    // Checksum für wichtige Daten
    generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32-bit integer
        }
        return hash.toString(36);
    }

    // Überprüfe Daten-Integrität mit Checksum
    verifyDataIntegrity(data, expectedChecksum) {
        const currentChecksum = this.generateChecksum(data);
        return currentChecksum === expectedChecksum;
    }
}

// Globale Funktionen für Event-Handler
function showPage(pageId) {
    // Alle Seiten ausblenden
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('d-none');
    });
    
    // Gewünschte Seite anzeigen
    document.getElementById(`${pageId}-page`).classList.remove('d-none');
    
    // Aktiven Navbar-Link setzen
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[onclick="showPage('${pageId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Quiz-Container zurücksetzen 
    if (pageId === 'home') {
        document.getElementById('quiz-container').classList.remove('d-none');
        document.getElementById('quiz-result').classList.add('d-none');
    }
    
    // Quiz-Seite: Kategorie-Auswahl einblenden, Quiz-Container ausblenden
    if (pageId === 'quiz') {
        document.getElementById('category-selection').classList.remove('d-none');
        document.getElementById('quiz-container').classList.add('d-none');
        document.getElementById('quiz-result').classList.add('d-none');
    }
}

function startQuiz(category) {
    window.app.startQuiz(category);
}

function startOrderQuiz() {
    window.app.startOrderQuiz();
}

function restartQuiz() {
    window.app.restartQuiz();
}

// App initialisieren
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LernApp();
});
