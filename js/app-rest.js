// Fortsetzung der LernApp-Klasse - diese Funktionen müssen in app.js eingefügt werden

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
    loadFromStorage(key, isGlobal = false) {
        try {
            const storageKey = isGlobal ? `lernapp_${key}` : `lernapp_${key}`;
            const encryptedData = localStorage.getItem(storageKey);
            if (!encryptedData) return null;
            
            const decryptedData = this.decryptData(encryptedData);
            return decryptedData ? JSON.parse(decryptedData) : null;
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            return null;
        }
    }

    saveToStorage(key, data, isGlobal = false) {
        try {
            const jsonData = JSON.stringify(data);
            const encryptedData = this.encryptData(jsonData);
            const storageKey = isGlobal ? `lernapp_${key}` : `lernapp_${key}`;
            localStorage.setItem(storageKey, encryptedData);
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
        this.saveUserData();
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
            this.saveUserData();
            
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
        this.saveUserData();
        this.renderQuestionsList();
        this.updateDashboard();
        
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
            this.saveUserData();
            this.renderQuestionsList();
            this.updateDashboard();
            this.showAlert('Frage erfolgreich gelöscht!', 'success');
        }
    }

    // Rest der Funktionen folgt in einem separaten Teil...
    
    // Navigation Funktion
    showPage(pageId) {
        // Alle Seiten verstecken
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('d-none');
        });
        
        // Gewünschte Seite anzeigen
        const targetPage = document.getElementById(pageId + '-page');
        if (targetPage) {
            targetPage.classList.remove('d-none');
        }
        
        // Spezielle Behandlung für Admin-Seite
        if (pageId === 'admin') {
            const adminAccess = sessionStorage.getItem('lernapp_admin_access');
            if (!adminAccess) {
                this.lockAdminFeatures();
            }
        }
        
        // Dashboard aktualisieren wenn zur Startseite gewechselt wird
        if (pageId === 'home') {
            this.updateDashboard();
        }
    }

    lockAdminFeatures() {
        // Wenn Admin-Seite aufgerufen wird ohne Login, Sperre anzeigen
        const adminPage = document.getElementById('admin-page');
        if (adminPage) {
            adminPage.innerHTML = `
                <div class="container mt-5">
                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <div class="card border-warning">
                                <div class="card-header bg-warning text-dark">
                                    <h5><i class="bi bi-shield-lock"></i> Zugang verweigert</h5>
                                </div>
                                <div class="card-body">
                                    <p>Sie haben keinen Zugang zum Admin-Bereich.</p>
                                    <p class="text-muted">Klicken Sie auf "Admin" in der Navigation, um sich anzumelden.</p>
                                    <button onclick="showPage('home')" class="btn btn-primary">
                                        <i class="bi bi-house"></i> Zur Startseite
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
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
        // Bestehende Alerts entfernen
        const existingAlerts = document.querySelectorAll('.alert.auto-dismiss');
        existingAlerts.forEach(alert => alert.remove());

        // Neuen Alert erstellen
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show auto-dismiss`;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Alert automatisch nach 5 Sekunden entfernen
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    handleImageUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        // Validierung
        if (!file.type.startsWith('image/')) {
            this.showAlert('Bitte wählen Sie eine gültige Bilddatei!', 'danger');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
            this.showAlert('Bild ist zu groß! Maximale Größe: 5MB', 'danger');
            event.target.value = '';
            return;
        }

        // Vorschau erstellen
        const reader = new FileReader();
        reader.onload = (e) => {
            let previewContainer;
            if (type === 'shared') {
                previewContainer = document.getElementById('shared-image-preview');
            } else if (type === 'answer') {
                previewContainer = document.getElementById('answer-image-preview');
            }

            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="mt-2">
                        <img src="${e.target.result}" alt="Vorschau" class="img-thumbnail" style="max-height: 150px;">
                        <small class="d-block text-muted">Vorschau des ${type === 'shared' ? 'Frage' : 'Antwort'}-Bildes</small>
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    }
}

// Globale Funktionen
function showPage(pageId) {
    if (window.app) {
        window.app.showPage(pageId);
    }
}

function addCategory() {
    if (window.app) {
        window.app.addCategory();
    }
}

// App initialisieren
window.addEventListener('DOMContentLoaded', () => {
    window.app = new LernApp();
});
