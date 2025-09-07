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

    // Elemente für Kategorie- und Gruppenauswahl
    const categoryTree = document.getElementById('category-tree');

    // Base64-kodiertes Bild
    let imageBase64 = null;

    // Initialisierung
    initializePage();
    
    // Event Listener für Fenstergrößenänderung
    window.addEventListener('resize', function() {
        adjustCategoryTreeHeight();
    });

    // Event-Listener für Bildupload bleibt erhalten

    // Event Listener für Bild-Upload
    if (questionImageInput) {
        questionImageInput.addEventListener('change', handleImageUpload);
    }

    // Verzeichnisbaum für Kategorien und Gruppen erstellen
    async function renderCategoryTree() {
        try {
            categoryTree.innerHTML = '<p class="loading-info">Kategorien werden geladen...</p>';
            
            const [categories, groups] = await Promise.all([
                window.quizDB.loadCategories(),
                window.quizDB.loadGroups()
            ]);
            
            // Nur benutzerdefinierte Kategorien verwenden (keine Systemkategorien)
            const userCategories = categories.filter(category => category.createdBy !== 'system');
            
            if (userCategories.length === 0) {
                categoryTree.innerHTML = `
                    <p class="info-text">Keine Kategorien gefunden. 
                    Erstellen Sie Kategorien in der <a href="category-management.html">Kategorie-Verwaltung</a>.</p>
                `;
                return;
            }
            
            // Kategorien nach Namen sortieren
            userCategories.sort((a, b) => a.name.localeCompare(b.name));
            
            let html = '';
            
            userCategories.forEach(category => {
                // Gruppieren der Gruppen nach Kategorie
                const categoryGroups = groups.filter(group => group.categoryId === category.id);
                categoryGroups.sort((a, b) => a.name.localeCompare(b.name));
                
                html += `
                    <div class="tree-item tree-item-category" data-id="${category.id}">
                        <span class="tree-item-toggle"><i class="fas fa-chevron-right"></i></span>
                        <span class="tree-item-icon"><i class="fas fa-folder"></i></span>
                        ${category.name}
                    </div>
                    <div class="tree-group-container" style="display: none;" data-category-id="${category.id}">
                `;
                
                if (categoryGroups.length > 0) {
                    categoryGroups.forEach(group => {
                        html += `
                            <div class="tree-item tree-item-group" data-category-id="${category.id}" data-id="${group.id}">
                                <span class="tree-item-icon"><i class="fas fa-tag"></i></span>
                                ${group.name}
                            </div>
                        `;
                    });
                } else {
                    html += `
                        <div class="tree-item-empty">
                            <span class="tree-item-icon"><i class="fas fa-info-circle"></i></span>
                            Keine Gruppen in dieser Kategorie
                        </div>
                    `;
                }
                
                html += '</div>';
            });
            
            categoryTree.innerHTML = html;
            
            // Event-Listener für Kategorien im Baum
            document.querySelectorAll('.tree-item-category').forEach(item => {
                item.addEventListener('click', function(e) {
                    const categoryId = this.getAttribute('data-id');
                    
                    // Toggle der Gruppenanzeige
                    const groupContainer = document.querySelector(`.tree-group-container[data-category-id="${categoryId}"]`);
                    const toggleIcon = this.querySelector('.tree-item-toggle i');
                    
                    if (groupContainer) {
                        const isVisible = groupContainer.style.display !== 'none';
                        groupContainer.style.display = isVisible ? 'none' : 'block';
                        
                        // Icon ändern
                        if (toggleIcon) {
                            toggleIcon.className = isVisible ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
                        }
                    }
                    
                    // Kategorie auswählen
                    document.querySelectorAll('.tree-item-category').forEach(cat => {
                        cat.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Werte im Hidden-Input setzen
                    categorySelect.value = categoryId;
                    
                    // Verhindern, dass ein Klick auf das Toggle-Icon auch die Kategorie auswählt
                    if (e.target.closest('.tree-item-toggle')) {
                        e.stopPropagation();
                    }
                });
            });
            
            // Event-Listener für Gruppen im Baum
            document.querySelectorAll('.tree-item-group').forEach(item => {
                item.addEventListener('click', function() {
                    const categoryId = this.getAttribute('data-category-id');
                    const groupId = this.getAttribute('data-id');
                    
                    // Klassen für aktive Elemente setzen
                    document.querySelectorAll('.tree-item-category').forEach(cat => {
                        cat.classList.remove('active');
                    });
                    document.querySelectorAll('.tree-item-group').forEach(group => {
                        group.classList.remove('active');
                    });
                    
                    // Aktive Kategorie finden und markieren
                    const parentCategory = document.querySelector(`.tree-item-category[data-id="${categoryId}"]`);
                    if (parentCategory) {
                        parentCategory.classList.add('active');
                    }
                    
                    // Aktive Gruppe markieren
                    this.classList.add('active');
                    
                    // Werte in Hidden-Inputs setzen
                    categorySelect.value = categoryId;
                    groupSelect.value = groupId;
                });
            });
            
        } catch (error) {
            console.error('Fehler beim Rendern des Kategorie-Baums:', error);
            categoryTree.innerHTML = '<p class="error-text">Fehler beim Laden der Kategorien und Gruppen.</p>';
        }
    }
    
    // Event Listener für Bild-Upload
    if (questionImageInput) {
        questionImageInput.addEventListener('change', handleImageUpload);
    }    // Event Listener für das Fragen-Formular
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
            
            // Kategorie-Typ ermitteln
            const categoryId = categorySelect.value;
            const categories = await window.quizDB.loadCategories();
            const selectedCategory = categories.find(cat => cat.id === categoryId);
            
            // Fragedaten erstellen
            const questionData = {
                text: questionTextInput.value.trim(),
                imageUrl: imageBase64,
                options: options,
                explanation: explanationInput.value.trim(),
                categoryId: categoryId,
                groupId: groupSelect.value,
                difficulty: parseInt(difficultyInput.value),
                createdBy: username
            };
            
            // Sicherstellen, dass entweder Text oder Bild vorhanden ist
            const hasText = questionData.text && questionData.text.trim() !== '';
            const hasImage = questionData.imageUrl && questionData.imageUrl.trim() !== '';
            
            if (!hasText && !hasImage) {
                showError('Eine Frage benötigt entweder einen Fragetext oder ein Bild.');
                return;
            }
            
            try {
                // Zeige Ladeanzeige
                const submitButton = questionForm.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wird gespeichert...';
                submitButton.disabled = true;
                
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
                
                // Button zurücksetzen
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            } catch (error) {
                console.error('Fehler beim Erstellen der Frage:', error);
                showError(`Fehler: ${error.message}`);
                
                // Button zurücksetzen
                const submitButton = questionForm.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.innerHTML = '<i class="fas fa-save"></i> Frage speichern';
                    submitButton.disabled = false;
                }
            }
        });
    }

    /**
     * Initialisiert die Seite
     */
    async function initializePage() {
        try {
            // Kategorie-Verzeichnisbaum rendern
            await renderCategoryTree();
            
            // Zuletzt erstellte Fragen laden
            await loadRecentQuestions();
            
            // Höhe des Kategorie-Baums dynamisch anpassen
            adjustCategoryTreeHeight();
            
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
     * Passt die Höhe des Kategorie-Baums an die Bildschirmhöhe an
     */
    function adjustCategoryTreeHeight() {
        const categoryTree = document.getElementById('category-tree');
        if (!categoryTree) return;
        
        // Verfügbare Höhe berechnen (abzüglich Header und anderer Elemente)
        const windowHeight = window.innerHeight;
        const headerHeight = document.querySelector('#header-container')?.offsetHeight || 0;
        const footerHeight = document.querySelector('#footer-container')?.offsetHeight || 0;
        
        // Abstand von oben und andere UI-Elemente berücksichtigen
        const treeContainer = categoryTree.parentElement;
        const treeContainerRect = treeContainer.getBoundingClientRect();
        const topOffset = treeContainerRect.top;
        
        // Maximale Höhe berechnen (mit Puffer)
        const maxHeight = windowHeight - topOffset - footerHeight - 80; // 80px Puffer
        
        // Höhe setzen, mindestens 200px, maximal berechnete Höhe
        const newHeight = Math.max(200, Math.min(maxHeight, 600)); // Zwischen 200px und 600px
        categoryTree.style.maxHeight = `${newHeight}px`;
    }

    /**
     * Aktualisiert die Kategorie-Dropdown-Menüs
     * Diese Funktion wird nicht mehr benötigt, da wir nur noch den Verzeichnisbaum verwenden
     */
    async function updateCategoryDropdowns() {
        try {
            // Nur noch für das Logging - Kein UI-Update mehr
            const categories = await window.quizDB.loadCategories();
            console.log('Kategorien geladen:', categories.length);
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Kategorie-Auswahlfelder:', error);
        }
    }

    /**
     * Aktualisiert die Gruppen-Dropdown basierend auf der ausgewählten Kategorie
     * Diese Funktion wird nicht mehr benötigt, da wir nur noch den Verzeichnisbaum verwenden
     */
    async function updateGroupDropdown(categoryId) {
        try {
            // Nur noch für das Logging - Kein UI-Update mehr
            if (!categoryId) {
                return;
            }
            
            // Gruppen laden
            const groups = await window.quizDB.loadGroups();
            
            // Gruppen für die gewählte Kategorie filtern
            const filteredGroups = groups.filter(group => group.categoryId === categoryId);
            console.log('Gruppen für Kategorie geladen:', filteredGroups.length);
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Gruppen-Auswahlfelds:', error);
        }
    }

    /**
     * Verarbeitet den Bild-Upload und erstellt eine Vorschau
     */
    function handleImageUpload() {
        const file = questionImageInput.files[0];
        const imageNameElement = document.getElementById('image-name');
        
        if (!file) {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
            imagePreview.classList.remove('has-image');
            imageNameElement.textContent = '';
            imageBase64 = null;
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            showError('Bitte wähle eine Bilddatei aus.');
            questionImageInput.value = '';
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
            imagePreview.classList.remove('has-image');
            imageNameElement.textContent = '';
            imageBase64 = null;
            return;
        }
        
        // Größe prüfen (max. 5 MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('Das Bild ist zu groß. Maximale Größe: 5 MB.');
            questionImageInput.value = '';
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
            imagePreview.classList.remove('has-image');
            imageNameElement.textContent = '';
            imageBase64 = null;
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Base64-kodiertes Bild speichern
            imageBase64 = e.target.result;
            
            // Vorschau erstellen und anzeigen
            imagePreview.style.display = 'block';
            imagePreview.classList.add('has-image');
            imagePreview.innerHTML = `<img src="${imageBase64}" alt="Vorschau">`;
            
            // Bildnamen anzeigen
            imageNameElement.textContent = file.name;
        };
        
        reader.onerror = function() {
            showError('Fehler beim Lesen der Bilddatei.');
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
            imagePreview.classList.remove('has-image');
            imageNameElement.textContent = '';
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
                
                // Formatiertes Datum
                const createdAt = new Date(question.createdAt);
                const formattedDate = createdAt.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
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
                            ${question.explanation ? `<div class="question-explanation"><small><strong>Erklärung:</strong> ${question.explanation}</small></div>` : ''}
                        </div>
                        <div class="question-footer">
                            <span class="question-date">Erstellt am: ${formattedDate}</span>
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
            return false;
        }
        
        // Gruppe prüfen
        if (!groupSelect.value) {
            showError('Bitte wähle eine Gruppe aus.');
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
        imagePreview.style.display = 'none';
        imagePreview.classList.remove('has-image');
        document.getElementById('image-name').textContent = '';
        imageBase64 = null;
        
        // Schwierigkeitsgrad zurücksetzen
        difficultyInput.value = 3;
        
        // Richtige Antwort zurücksetzen
        document.getElementById('answer-0').value = '';
    }
});
