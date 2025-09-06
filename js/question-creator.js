// question-creator.js - Verwaltung der Fragenerstellung

document.addEventListener('DOMContentLoaded', function() {
    // Prüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const username = localStorage.getItem('username');
    
    if (!isLoggedIn || !username) {
        // Nicht eingeloggt - zurück zur Login-Seite
        window.location.href = 'login.html';
        return;
    }

    // Elemente für das Fragenformular
    const questionForm = document.getElementById('question-form');
    const categorySelect = document.getElementById('question-category');
    const groupSelect = document.getElementById('question-group');
    const questionTextInput = document.getElementById('question-text');
    const questionImageInput = document.getElementById('question-image');
    const imagePreview = document.getElementById('image-preview');
    const explanationInput = document.getElementById('question-explanation');
    const difficultyInput = document.getElementById('question-difficulty');
    const recentQuestionsList = document.getElementById('recent-questions-list');

    // Elemente für Kategorie-Verwaltung
    const categoryForm = document.getElementById('category-form');
    const categoryNameInput = document.getElementById('category-name');
    const categoryDescriptionInput = document.getElementById('category-description');
    const categoriesList = document.getElementById('categories-list');

    // Elemente für Gruppen-Verwaltung
    const groupForm = document.getElementById('group-form');
    const groupCategorySelect = document.getElementById('group-category');
    const groupNameInput = document.getElementById('group-name');
    const groupDescriptionInput = document.getElementById('group-description');
    const groupsList = document.getElementById('groups-list');

    // Base64-kodiertes Bild
    let imageBase64 = null;

    // Initialisierung
    initializePage();

    // Event Listener für Kategorie-Auswahl
    if (categorySelect) {
        categorySelect.addEventListener('change', async function() {
            await updateGroupSelect();
        });
    }

    // Event Listener für Bild-Upload
    if (questionImageInput) {
        questionImageInput.addEventListener('change', handleImageUpload);
    }

    // Event Listener für Kategorie-Formular
    if (categoryForm) {
        categoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = categoryNameInput.value.trim();
            const description = categoryDescriptionInput.value.trim();
            // Verwende standardmäßig TEXT als Hauptkategorie
            const mainCategory = window.quizDB.MAIN_CATEGORY.TEXT;
            
            if (!name) {
                showError('Bitte gib einen Kategorienamen ein.');
                return;
            }
            
            try {
                const newCategory = await window.quizDB.createCategory(
                    name,
                    description,
                    mainCategory,
                    username
                );
                
                if (newCategory) {
                    showSuccess('Kategorie wurde erfolgreich erstellt!');
                    
                    // Formular zurücksetzen
                    categoryForm.reset();
                    
                    // Listen aktualisieren
                    await updateCategoriesDisplay();
                    await updateCategorySelect();
                    await updateGroupCategorySelect();
                } else {
                    showError('Fehler beim Erstellen der Kategorie.');
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Kategorie:', error);
                showError(`Fehler: ${error.message}`);
            }
        });
    }
    
    // Event Listener für Gruppen-Formular
    if (groupForm) {
        groupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const categoryId = groupCategorySelect.value;
            const name = groupNameInput.value.trim();
            const description = groupDescriptionInput.value.trim();
            
            if (!categoryId || !name) {
                showError('Bitte fülle alle erforderlichen Felder aus.');
                return;
            }
            
            try {
                const newGroup = await window.quizDB.createGroup(
                    name,
                    categoryId,
                    description,
                    username
                );
                
                if (newGroup) {
                    showSuccess('Gruppe wurde erfolgreich erstellt!');
                    
                    // Formular zurücksetzen
                    groupForm.reset();
                    
                    // Listen aktualisieren
                    await updateGroupsDisplay();
                } else {
                    showError('Fehler beim Erstellen der Gruppe.');
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Gruppe:', error);
                showError(`Fehler: ${error.message}`);
            }
        });
    }

    // Event Listener für das Fragen-Formular
    if (questionForm) {
        questionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Prüfen, ob alle Felder ausgefüllt sind
            if (!validateForm()) {
                return;
            }
            
            // Antwortoptionen sammeln - nur die richtige Antwort
            const correctAnswerText = document.getElementById('answer-0').value.trim();
            
            if (!correctAnswerText) {
                showError('Bitte gib eine richtige Antwort ein.');
                return;
            }
            
            // Nur die richtige Antwort wird angegeben
            const options = [
                {
                    text: correctAnswerText,
                    isCorrect: true
                }
            ];
            
            // Fragedaten erstellen
            const questionData = {
                text: questionTextInput.value.trim(),
                imageUrl: imageBase64,
                options: options,
                explanation: explanationInput.value.trim(),
                categoryId: categorySelect.value,
                groupId: groupSelect.value,
                difficulty: parseInt(difficultyInput.value),
                createdBy: username,
                // Typ automatisch basierend auf dem Vorhandensein eines Bildes setzen
                questionType: imageBase64 ? window.quizDB.MAIN_CATEGORY.IMAGE : window.quizDB.MAIN_CATEGORY.TEXT
            };
            
            try {
                // Frage erstellen
                const newQuestion = await window.quizDB.createQuestion(questionData);
                
                if (newQuestion) {
                    showSuccess('Frage wurde erfolgreich erstellt!');
                    
                    // Formular zurücksetzen
                    resetForm();
                    
                    // Zuletzt erstellte Fragen aktualisieren
                    await loadRecentQuestions();
                } else {
                    showError('Fehler beim Erstellen der Frage.');
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Frage:', error);
                showError(`Fehler: ${error.message}`);
            }
        });
    }

    /**
     * Initialisiert die Seite
     */
    async function initializePage() {
        try {
            // Kategorien laden und Auswahlfelder aktualisieren
            await updateCategorySelect();
            await updateCategoriesDisplay();
            
            // Gruppen-Kategorie-Auswahlfeld aktualisieren
            await updateGroupCategorySelect();
            
            // Gruppen aktualisieren (leer, da noch keine Kategorie gewählt)
            await updateGroupSelect();
            await updateGroupsDisplay();
            
            // Zuletzt erstellte Fragen laden
            await loadRecentQuestions();
            
            // Breadcrumbs initialisieren, falls verfügbar
            if (window.breadcrumbs) {
                window.breadcrumbs.set([
                    { label: 'Verwaltung', url: 'admin.html' },
                    { label: 'Fragen erstellen', url: 'question-creator.html' }
                ]);
            }
        } catch (error) {
            console.error('Fehler beim Initialisieren der Seite:', error);
            showError('Fehler beim Laden der Daten. Bitte aktualisiere die Seite.');
        }
    }

    /**
     * Aktualisiert das Kategorie-Auswahlfeld
     */
    async function updateCategorySelect() {
        try {
            const categories = await window.quizDB.loadCategories();
            
            // Auswahlfeld leeren
            categorySelect.innerHTML = '<option value="">-- Kategorie wählen --</option>';
            
            // Kategorien hinzufügen
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Kategorie-Auswahlfelds:', error);
            showError('Fehler beim Laden der Kategorien.');
        }
    }

    /**
     * Aktualisiert die Anzeige der Kategorien
     */
    async function updateCategoriesDisplay() {
        try {
            categoriesList.innerHTML = '<p class="loading-info">Kategorien werden geladen...</p>';
            
            const categories = await window.quizDB.loadCategories();
            
            if (categories.length === 0) {
                categoriesList.innerHTML = '<p class="info-text">Keine Kategorien vorhanden. Erstelle deine erste Kategorie.</p>';
                return;
            }
            
            let html = '';
            
            // Eigene Kategorien anzeigen (nicht vom System erstellt)
            const userCategories = categories.filter(category => category.createdBy !== 'system');
            
            if (userCategories.length === 0) {
                html = '<p class="info-text">Du hast noch keine eigenen Kategorien erstellt.</p>';
            } else {
                userCategories.forEach(category => {
                    html += `
                        <div class="category-item" data-id="${category.id}">
                            <div class="category-info">
                                <h4>${category.name}</h4>
                                ${category.description ? `<p>${category.description}</p>` : ''}
                            </div>
                            <div class="category-actions">
                                <button type="button" class="action-btn delete" title="Kategorie löschen" data-id="${category.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
            
            categoriesList.innerHTML = html;
            
            // Event-Listener für Lösch-Buttons
            document.querySelectorAll('.category-item .delete').forEach(button => {
                button.addEventListener('click', async function() {
                    const categoryId = this.getAttribute('data-id');
                    if (confirm('Möchtest du diese Kategorie wirklich löschen? Alle zugehörigen Gruppen werden ebenfalls gelöscht.')) {
                        // Hier Code zum Löschen der Kategorie einfügen (zukünftige Erweiterung)
                        alert('Löschen von Kategorien ist noch nicht implementiert.');
                    }
                });
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Kategorien-Anzeige:', error);
            categoriesList.innerHTML = '<p class="error-text">Fehler beim Laden der Kategorien.</p>';
        }
    }
    
    /**
     * Aktualisiert die Anzeige der Gruppen
     */
    async function updateGroupsDisplay() {
        try {
            groupsList.innerHTML = '<p class="loading-info">Gruppen werden geladen...</p>';
            
            const [groups, categories] = await Promise.all([
                window.quizDB.loadGroups(),
                window.quizDB.loadCategories()
            ]);
            
            // Kategorien für schnellen Zugriff mappen
            const categoryMap = {};
            categories.forEach(category => {
                categoryMap[category.id] = category;
            });
            
            if (groups.length === 0) {
                groupsList.innerHTML = '<p class="info-text">Keine Gruppen vorhanden. Erstelle deine erste Gruppe.</p>';
                return;
            }
            
            let html = '';
            
            // Eigene Gruppen anzeigen (nicht vom System erstellt)
            const userGroups = groups.filter(group => group.createdBy !== 'system');
            
            if (userGroups.length === 0) {
                html = '<p class="info-text">Du hast noch keine eigenen Gruppen erstellt.</p>';
            } else {
                userGroups.forEach(group => {
                    const category = categoryMap[group.categoryId] || { name: 'Unbekannte Kategorie' };
                    
                    html += `
                        <div class="group-item" data-id="${group.id}">
                            <div class="group-info">
                                <span class="group-category">${category.name}</span>
                                <h4>${group.name}</h4>
                                ${group.description ? `<p>${group.description}</p>` : ''}
                            </div>
                            <div class="group-actions">
                                <button type="button" class="action-btn delete" title="Gruppe löschen" data-id="${group.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
            
            groupsList.innerHTML = html;
            
            // Event-Listener für Lösch-Buttons
            document.querySelectorAll('.group-item .delete').forEach(button => {
                button.addEventListener('click', async function() {
                    const groupId = this.getAttribute('data-id');
                    if (confirm('Möchtest du diese Gruppe wirklich löschen?')) {
                        // Hier Code zum Löschen der Gruppe einfügen (zukünftige Erweiterung)
                        alert('Löschen von Gruppen ist noch nicht implementiert.');
                    }
                });
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Gruppen-Anzeige:', error);
            groupsList.innerHTML = '<p class="error-text">Fehler beim Laden der Gruppen.</p>';
        }
    }
    
    /**
     * Aktualisiert das Kategorie-Auswahlfeld im Gruppen-Formular
     */
    async function updateGroupCategorySelect() {
        try {
            const categories = await window.quizDB.loadCategories();
            
            // Auswahlfeld leeren
            groupCategorySelect.innerHTML = '<option value="">-- Kategorie wählen --</option>';
            
            // Kategorien hinzufügen
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                groupCategorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Gruppen-Kategorie-Auswahlfelds:', error);
            showError('Fehler beim Laden der Kategorien für Gruppen.');
        }
    }

    /**
     * Aktualisiert das Gruppen-Auswahlfeld basierend auf der gewählten Kategorie
     */
    async function updateGroupSelect() {
        try {
            const categoryId = categorySelect.value;
            
            // Auswahlfeld leeren
            groupSelect.innerHTML = '<option value="">-- Gruppe wählen --</option>';
            
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
     * Verarbeitet den Bild-Upload und erstellt eine Vorschau
     */
    function handleImageUpload() {
        const file = questionImageInput.files[0];
        
        if (!file) {
            imagePreview.innerHTML = '';
            imageBase64 = null;
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            showError('Bitte wähle eine Bilddatei aus.');
            questionImageInput.value = '';
            imagePreview.innerHTML = '';
            imageBase64 = null;
            return;
        }
        
        // Größe prüfen (max. 5 MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('Das Bild ist zu groß. Maximale Größe: 5 MB.');
            questionImageInput.value = '';
            imagePreview.innerHTML = '';
            imageBase64 = null;
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Base64-kodiertes Bild speichern
            imageBase64 = e.target.result;
            
            // Vorschau erstellen
            imagePreview.innerHTML = `<img src="${imageBase64}" alt="Vorschau">`;
        };
        
        reader.onerror = function() {
            showError('Fehler beim Lesen der Bilddatei.');
            imagePreview.innerHTML = '';
            imageBase64 = null;
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * Lädt die zuletzt erstellten Fragen
     */
    async function loadRecentQuestions() {
        try {
            recentQuestionsList.innerHTML = '<p class="loading-info">Fragen werden geladen...</p>';
            
            // Alle Fragen, Kategorien und Gruppen laden
            const [questions, categories, groups] = await Promise.all([
                window.quizDB.loadQuestions(),
                window.quizDB.loadCategories(),
                window.quizDB.loadGroups()
            ]);
            
            // Maps für schnellen Zugriff erstellen
            const categoryMap = {};
            categories.forEach(category => {
                categoryMap[category.id] = category;
            });
            
            const groupMap = {};
            groups.forEach(group => {
                groupMap[group.id] = group;
            });
            
            // Nur die letzten 5 Fragen des aktuellen Benutzers anzeigen
            const userQuestions = questions
                .filter(question => question.createdBy === username)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 5);
            
            if (userQuestions.length === 0) {
                recentQuestionsList.innerHTML = '<p class="info-text">Du hast noch keine Fragen erstellt.</p>';
                return;
            }
            
            // Fragen anzeigen
            let html = '';
            
            userQuestions.forEach(question => {
                const category = categoryMap[question.categoryId] || { name: 'Unbekannte Kategorie' };
                const group = groupMap[question.groupId] || { name: 'Unbekannte Gruppe' };
                
                // Richtige Antwort finden
                const correctAnswer = question.options.find(option => option.isCorrect);
                
                html += `
                    <div class="question-item">
                        <div class="question-header">
                            <div class="question-badges">
                                <span class="question-badge">${category.name}</span>
                                <span class="question-badge">${group.name}</span>
                                <span class="question-difficulty">Schwierigkeit: ${'★'.repeat(question.difficulty)}</span>
                            </div>
                        </div>
                        <div class="question-content">
                            <p class="question-text">${question.text}</p>
                            ${question.imageUrl ? `<div class="question-image"><img src="${question.imageUrl}" alt="Fragebild"></div>` : ''}
                        </div>
                        <div class="question-answer">
                            <span class="correct-answer-label">Richtige Antwort:</span>
                            <span class="correct-answer-text">${correctAnswer ? correctAnswer.text : 'Keine richtige Antwort definiert'}</span>
                        </div>
                        <div class="question-footer">
                            <span class="question-date">Erstellt am: ${new Date(question.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                `;
            });
            
            recentQuestionsList.innerHTML = html;
        } catch (error) {
            console.error('Fehler beim Laden der zuletzt erstellten Fragen:', error);
            recentQuestionsList.innerHTML = '<p class="error-text">Fehler beim Laden der Fragen.</p>';
        }
    }

    /**
     * Validiert das Fragenformular
     * @returns {boolean} True, wenn das Formular gültig ist
     */
    function validateForm() {
        // Kategorie prüfen
        if (!categorySelect.value) {
            showError('Bitte wähle eine Kategorie aus.');
            categorySelect.focus();
            return false;
        }
        
        // Gruppe prüfen
        if (!groupSelect.value) {
            showError('Bitte wähle eine Gruppe aus.');
            groupSelect.focus();
            return false;
        }
        
        // Fragetext prüfen
        if (!questionTextInput.value.trim()) {
            showError('Bitte gib einen Fragetext ein.');
            questionTextInput.focus();
            return false;
        }
        
        // Richtige Antwort prüfen
        const correctAnswer = document.getElementById('answer-0');
        if (!correctAnswer.value.trim()) {
            showError('Bitte gib eine richtige Antwort ein.');
            correctAnswer.focus();
            return false;
        }
        
        return true;
    }

    /**
     * Setzt das Formular zurück
     */
    function resetForm() {
        // Texteingaben zurücksetzen
        questionTextInput.value = '';
        explanationInput.value = '';
        
        // Bild zurücksetzen
        questionImageInput.value = '';
        imagePreview.innerHTML = '';
        imageBase64 = null;
        
        // Schwierigkeitsgrad zurücksetzen
        difficultyInput.value = 3;
        
        // Richtige Antwort zurücksetzen
        document.getElementById('answer-0').value = '';
    }
});
