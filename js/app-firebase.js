// LernApp - Hauptlogik mit Firebase Integration

class LernApp {
    constructor() {
        // Firebase Auth Service (wird geladen wenn verfügbar)
        this.authService = null;
        this.isFirebaseMode = false;
        this.isInitialized = false;
        
        // User Management
        this.currentUser = null;
        this.isDemo = false;
        this.isOffline = false;
        
        // Lokaler Fallback (für Demo-Modus und Offline-Betrieb)
        this.users = this.loadFromStorage('users', true) || {};
        this.sharedData = this.loadFromStorage('shared_data', true) || {};
        
        // Current user's data
        this.categories = [];
        this.questions = [];
        this.statistics = {};
        
        this.currentQuiz = {
            questions: [],
            currentIndex: 0,
            score: 0,
            selectedCategory: null,
            answers: []
        };

        this.init();
    }

    async init() {
        // Warten auf Firebase Auth Service
        await this.initializeFirebase();
        
        // Prüfen ob User eingeloggt ist
        this.checkUserSession();
        
        if (this.currentUser || this.isDemo) {
            await this.loadUserData();
            this.updateCategorySelects();
            this.renderCategories();
            this.renderCategoriesList();
            this.renderQuestionsList();
            this.renderStatistics();
            this.updateDashboard();
        }
        
        this.setupEventListeners();
        this.checkAdminAccess();
        this.updateUIForLoginState();
        this.isInitialized = true;
    }

    async initializeFirebase() {
        try {
            // Warten bis Firebase Auth Service verfügbar ist
            let attempts = 0;
            while (!window.authService && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.authService) {
                this.authService = window.authService;
                this.isFirebaseMode = true;
                console.log('Firebase Auth Service erfolgreich geladen');
                
                // Auth State Change Listener
                this.authService.auth.onAuthStateChanged((user) => {
                    this.handleFirebaseAuthChange(user);
                });
            } else {
                console.warn('Firebase Auth Service nicht verfügbar, verwende lokalen Modus');
                this.isFirebaseMode = false;
            }
        } catch (error) {
            console.error('Firebase Initialisierung fehlgeschlagen:', error);
            this.isFirebaseMode = false;
        }
    }

    handleFirebaseAuthChange(user) {
        if (!this.isInitialized) return;
        
        if (user) {
            this.currentUser = user.uid;
            this.isDemo = false;
            sessionStorage.setItem('lernapp_firebase_user', user.uid);
            sessionStorage.removeItem('lernapp_demo_mode');
            
            // Daten laden und UI aktualisieren
            this.loadUserData().then(() => {
                this.updateUIForLoginState();
                this.updateDashboard();
            });
        } else {
            this.currentUser = null;
            this.isDemo = false;
            sessionStorage.removeItem('lernapp_firebase_user');
            this.updateUIForLoginState();
        }
    }

    // ==================== USER MANAGEMENT ====================

    checkUserSession() {
        if (this.isFirebaseMode && this.authService?.isAuthenticated) {
            this.currentUser = this.authService.user.uid;
            this.isDemo = false;
        } else {
            const sessionUser = sessionStorage.getItem('lernapp_current_user');
            const sessionDemo = sessionStorage.getItem('lernapp_demo_mode');
            const firebaseUser = sessionStorage.getItem('lernapp_firebase_user');
            
            if (firebaseUser && this.isFirebaseMode) {
                this.currentUser = firebaseUser;
                this.isDemo = false;
            } else if (sessionDemo) {
                this.isDemo = true;
                this.currentUser = 'demo';
            } else if (sessionUser) {
                this.currentUser = sessionUser;
            }
        }
    }

    updateUIForLoginState() {
        const userElements = document.querySelectorAll('.user-only');
        const guestElements = document.querySelectorAll('.guest-only');
        
        if (this.currentUser || this.isDemo) {
            // User ist eingeloggt
            userElements.forEach(el => el.style.display = 'block');
            guestElements.forEach(el => el.style.display = 'none');
            
            let displayName = 'Benutzer';
            
            if (this.isFirebaseMode && this.authService?.user) {
                displayName = this.authService.user.displayName || this.authService.user.email;
            } else if (this.currentUser && !this.isDemo && this.users[this.currentUser]) {
                displayName = this.users[this.currentUser].displayName || this.currentUser;
            } else if (this.isDemo) {
                displayName = 'Demo-Modus';
            }
            
            document.getElementById('current-username').textContent = displayName;
            document.getElementById('dashboard-username').textContent = displayName;
            
            showPage('home');
        } else {
            // User ist nicht eingeloggt
            userElements.forEach(el => el.style.display = 'none');
            guestElements.forEach(el => el.style.display = 'block');
            showPage('login');
        }
    }

    showUserLogin(mode = 'login') {
        showPage('login');
        if (mode === 'register') {
            this.switchAuthMode('register');
        } else {
            this.switchAuthMode('login');
        }
    }

    switchAuthMode(mode) {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (mode === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.remove('d-none');
            registerForm.classList.add('d-none');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.classList.add('d-none');
            registerForm.classList.remove('d-none');
        }
    }

    async registerUser(event) {
        event.preventDefault();
        
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-password-confirm').value;
        const displayName = document.getElementById('register-display-name').value.trim();

        // Basis-Validierung
        if (!email || !password || !confirmPassword || !displayName) {
            this.showAlert('Bitte füllen Sie alle Felder aus!', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Passwörter stimmen nicht überein!', 'danger');
            return;
        }

        if (this.isFirebaseMode && this.authService) {
            // Firebase Registrierung
            const result = await this.authService.register(email, password, displayName);
            
            if (result.success) {
                this.showAlert(result.message, 'success');
                this.switchAuthMode('login');
                document.getElementById('login-email').value = email;
            } else {
                this.showAlert(result.error, 'danger');
            }
        } else {
            // Lokale Registrierung (Fallback)
            await this.registerUserLocal(email, password, displayName);
        }
    }

    async registerUserLocal(email, password, displayName) {
        // Lokale Validierung
        if (!this.validateEmail(email)) {
            this.showAlert('Ungültige E-Mail-Adresse!', 'danger');
            return;
        }

        if (password.length < 8) {
            this.showAlert('Passwort muss mindestens 8 Zeichen lang sein!', 'danger');
            return;
        }

        if (this.users[email]) {
            this.showAlert('E-Mail-Adresse bereits vergeben!', 'danger');
            return;
        }

        // Benutzer erstellen
        const newUser = {
            email: email,
            password: this.hashPassword(password),
            displayName: displayName,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        this.users[email] = newUser;
        this.saveToStorage('users', this.users, true);

        this.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
        this.switchAuthMode('login');
        document.getElementById('login-email').value = email;
    }

    async loginUser(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showAlert('Bitte füllen Sie alle Felder aus!', 'danger');
            return;
        }

        if (this.isFirebaseMode && this.authService) {
            // Firebase Anmeldung
            const result = await this.authService.login(email, password);
            
            if (result.success) {
                this.showAlert(result.message, 'success');
                // UI wird automatisch durch Auth State Change aktualisiert
            } else {
                this.showAlert(result.error, 'danger');
            }
        } else {
            // Lokale Anmeldung (Fallback)
            await this.loginUserLocal(email, password);
        }
    }

    async loginUserLocal(email, password) {
        if (!this.users[email]) {
            this.showAlert('E-Mail-Adresse nicht gefunden!', 'danger');
            return;
        }

        const user = this.users[email];
        if (user.password !== this.hashPassword(password)) {
            this.showAlert('Falsches Passwort!', 'danger');
            return;
        }

        // Login erfolgreich
        user.lastLogin = new Date().toISOString();
        this.users[email] = user;
        this.saveToStorage('users', this.users, true);

        this.currentUser = email;
        this.isDemo = false;
        sessionStorage.setItem('lernapp_current_user', email);
        sessionStorage.removeItem('lernapp_demo_mode');

        await this.loadUserData();
        this.updateUIForLoginState();
        this.updateDashboard();
        this.showAlert(`Willkommen zurück, ${user.displayName}!`, 'success');
    }

    startDemoMode() {
        this.isDemo = true;
        this.currentUser = 'demo';
        sessionStorage.setItem('lernapp_demo_mode', 'true');
        sessionStorage.removeItem('lernapp_current_user');
        sessionStorage.removeItem('lernapp_firebase_user');

        this.loadUserData();
        this.updateUIForLoginState();
        this.updateDashboard();
        this.showAlert('Demo-Modus gestartet! Ihre Daten werden nicht dauerhaft gespeichert.', 'info');
    }

    async logoutUser() {
        if (confirm('Möchten Sie sich wirklich abmelden?')) {
            if (this.isFirebaseMode && this.authService) {
                // Firebase Abmeldung
                const result = await this.authService.logout();
                if (result.success) {
                    this.showAlert(result.message, 'success');
                } else {
                    this.showAlert(result.error, 'danger');
                }
            } else {
                // Lokale Abmeldung
                this.currentUser = null;
                this.isDemo = false;
                sessionStorage.removeItem('lernapp_current_user');
                sessionStorage.removeItem('lernapp_demo_mode');
                sessionStorage.removeItem('lernapp_firebase_user');
                
                this.updateUIForLoginState();
                this.showAlert('Erfolgreich abgemeldet!', 'success');
            }
            
            sessionStorage.removeItem('lernapp_admin_access');
        }
    }

    async updateProfile(event) {
        event.preventDefault();
        
        if (this.isDemo) {
            this.showAlert('Im Demo-Modus können keine Profil-Änderungen vorgenommen werden!', 'warning');
            return;
        }

        const displayName = document.getElementById('profile-display-name').value.trim();
        const currentPassword = document.getElementById('profile-current-password').value;
        const newPassword = document.getElementById('profile-new-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;

        if (newPassword && newPassword !== confirmPassword) {
            this.showAlert('Neue Passwörter stimmen nicht überein!', 'danger');
            return;
        }

        if (this.isFirebaseMode && this.authService) {
            // Firebase Profil-Update
            const result = await this.authService.updateUserProfile(displayName, currentPassword, newPassword);
            
            if (result.success) {
                this.showAlert(result.message, 'success');
                this.updateUIForLoginState();
                
                // Formular zurücksetzen
                document.getElementById('profile-current-password').value = '';
                document.getElementById('profile-new-password').value = '';
                document.getElementById('profile-confirm-password').value = '';
            } else {
                this.showAlert(result.error, 'danger');
            }
        } else {
            // Lokales Profil-Update
            await this.updateProfileLocal(displayName, newPassword);
        }
    }

    async updateProfileLocal(displayName, newPassword) {
        if (!currentPassword) {
            this.showAlert('Aktuelles Passwort ist erforderlich!', 'danger');
            return;
        }

        const user = this.users[this.currentUser];
        
        // Aktuelles Passwort prüfen
        if (user.password !== this.hashPassword(currentPassword)) {
            this.showAlert('Aktuelles Passwort ist falsch!', 'danger');
            return;
        }

        // Profil aktualisieren
        user.displayName = displayName || user.displayName;
        
        if (newPassword && newPassword.length >= 8) {
            user.password = this.hashPassword(newPassword);
        } else if (newPassword) {
            this.showAlert('Neues Passwort muss mindestens 8 Zeichen lang sein!', 'danger');
            return;
        }

        this.users[this.currentUser] = user;
        this.saveToStorage('users', this.users, true);

        this.updateUIForLoginState();
        this.showAlert('Profil erfolgreich aktualisiert!', 'success');
        
        // Formular zurücksetzen
        document.getElementById('profile-current-password').value = '';
        document.getElementById('profile-new-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
    }

    async showPasswordReset() {
        if (!this.isFirebaseMode) {
            this.showAlert('Passwort-Reset ist nur im Online-Modus verfügbar!', 'warning');
            return;
        }

        const email = prompt('Bitte geben Sie Ihre E-Mail-Adresse ein:');
        if (!email) return;

        const result = await this.authService.resetPassword(email);
        
        if (result.success) {
            this.showAlert(result.message, 'success');
        } else {
            this.showAlert(result.error, 'danger');
        }
    }

    // ==================== DATA MANAGEMENT ====================

    async loadUserData() {
        if (this.isDemo) {
            // Demo-Daten
            this.categories = ['Allgemein', 'Ordne zu', 'Demo'];
            this.questions = this.generateDemoQuestions();
            this.statistics = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };
        } else if (this.isFirebaseMode && this.authService && this.currentUser) {
            // Firebase Daten laden
            const result = await this.authService.loadUserData();
            
            if (result.success) {
                const userData = result.data;
                this.categories = userData.categories || ['Allgemein', 'Ordne zu'];
                this.questions = userData.questions || [];
                this.statistics = userData.statistics || this.getDefaultStatistics();
                
                // Offline-Status anzeigen
                if (result.isOffline) {
                    this.showAlert('Offline-Modus: Verwende lokale Daten', 'warning');
                }
            } else {
                this.showAlert('Fehler beim Laden der Daten: ' + result.error, 'danger');
                this.loadDefaultData();
            }
        } else if (this.currentUser) {
            // Lokale Daten laden
            const userKey = `user_${this.currentUser}`;
            this.categories = this.loadFromStorage(`${userKey}_categories`) || ['Allgemein', 'Ordne zu'];
            this.questions = this.loadFromStorage(`${userKey}_questions`) || [];
            this.statistics = this.loadFromStorage(`${userKey}_statistics`) || this.getDefaultStatistics();
        }

        // Wenn keine Fragen vorhanden, Beispieldaten laden
        if (this.questions.length === 0 && !this.isDemo) {
            this.loadSampleData();
        }

        // Daten-Integrität prüfen
        this.validateDataIntegrity();
    }

    async saveUserData() {
        if (this.isDemo) {
            // Demo-Daten nicht speichern
            return;
        }

        const userData = {
            categories: this.categories,
            questions: this.questions,
            statistics: this.statistics,
            settings: {
                theme: 'light',
                language: 'de',
                lastSaved: new Date().toISOString()
            }
        };

        if (this.isFirebaseMode && this.authService && this.currentUser) {
            // Firebase Speicherung
            const result = await this.authService.saveUserData(userData);
            
            if (!result.success) {
                console.error('Firebase Speicherung fehlgeschlagen:', result.error);
                // Fallback auf lokale Speicherung
                this.saveUserDataLocal(userData);
            }
        } else if (this.currentUser) {
            // Lokale Speicherung
            this.saveUserDataLocal(userData);
        }
    }

    saveUserDataLocal(userData) {
        const userKey = `user_${this.currentUser}`;
        this.saveToStorage(`${userKey}_categories`, userData.categories);
        this.saveToStorage(`${userKey}_questions`, userData.questions);
        this.saveToStorage(`${userKey}_statistics`, userData.statistics);
    }

    // ==================== SHARING ====================

    async generateShareCode() {
        if (this.isDemo) {
            this.showAlert('Im Demo-Modus können keine Daten geteilt werden!', 'warning');
            return;
        }

        const shareCategories = document.getElementById('share-categories').checked;
        const shareQuestions = document.getElementById('share-questions').checked;

        if (!shareCategories && !shareQuestions) {
            this.showAlert('Bitte wählen Sie aus, was Sie teilen möchten!', 'warning');
            return;
        }

        const shareData = {
            categories: shareCategories ? this.categories : [],
            questions: shareQuestions ? this.questions : []
        };

        if (this.isFirebaseMode && this.authService) {
            // Firebase Teilung
            const result = await this.authService.shareData(shareData);
            
            if (result.success) {
                document.getElementById('share-code-display').value = result.shareCode;
                this.updateSharedContentList();
                this.showAlert(result.message, 'success');
            } else {
                this.showAlert(result.error, 'danger');
            }
        } else {
            // Lokale Teilung (Fallback)
            const shareCode = this.generateUniqueCode();
            this.sharedData[shareCode] = {
                username: this.currentUser,
                displayName: this.users[this.currentUser]?.displayName || 'Unbekannt',
                timestamp: new Date().toISOString(),
                ...shareData
            };
            
            this.saveToStorage('shared_data', this.sharedData, true);
            document.getElementById('share-code-display').value = shareCode;
            this.updateSharedContentList();
            this.showAlert('Teilungs-Code erfolgreich erstellt!', 'success');
        }
    }

    async previewImportData() {
        const importCode = document.getElementById('import-code').value.trim().toUpperCase();
        
        if (!importCode) {
            this.showAlert('Bitte geben Sie einen Teilungs-Code ein!', 'warning');
            return;
        }

        let shareData = null;

        if (this.isFirebaseMode && this.authService) {
            // Firebase Import
            const result = await this.authService.importData(importCode);
            
            if (result.success) {
                shareData = {
                    data: result.data,
                    sharedBy: result.sharedBy,
                    timestamp: result.createdAt?.toISOString() || new Date().toISOString()
                };
            } else {
                this.showAlert(result.error, 'danger');
                return;
            }
        } else {
            // Lokaler Import
            if (!this.sharedData[importCode]) {
                this.showAlert('Ungültiger Teilungs-Code!', 'danger');
                return;
            }
            shareData = { data: this.sharedData[importCode], sharedBy: this.sharedData[importCode].displayName };
        }

        const previewContent = document.getElementById('import-preview-content');
        const data = shareData.data;
        
        previewContent.innerHTML = `
            <p><strong>Von:</strong> ${shareData.sharedBy}</p>
            <p><strong>Erstellt am:</strong> ${new Date(shareData.timestamp).toLocaleDateString('de-DE')}</p>
            <p><strong>Kategorien:</strong> ${data.categories?.length || 0} (${data.categories?.join(', ') || 'Keine'})</p>
            <p><strong>Fragen:</strong> ${data.questions?.length || 0}</p>
        `;

        document.getElementById('import-preview').classList.remove('d-none');
        this.pendingImportData = data;
    }

    async confirmImportData() {
        if (this.isDemo) {
            this.showAlert('Im Demo-Modus können keine Daten importiert werden!', 'warning');
            return;
        }

        if (!this.pendingImportData) {
            this.showAlert('Keine Daten zum Importieren verfügbar!', 'danger');
            return;
        }

        const mergeCategories = document.getElementById('merge-categories').checked;
        const mergeQuestions = document.getElementById('merge-questions').checked;
        const importData = this.pendingImportData;

        let importedCategories = 0;
        let importedQuestions = 0;

        // Kategorien importieren
        if (mergeCategories && importData.categories) {
            importData.categories.forEach(category => {
                if (!this.categories.includes(category)) {
                    this.categories.push(category);
                    importedCategories++;
                }
            });
        }

        // Fragen importieren
        if (mergeQuestions && importData.questions) {
            importData.questions.forEach(question => {
                const exists = this.questions.some(q => 
                    q.question === question.question && 
                    q.answer === question.answer &&
                    q.category === question.category
                );
                
                if (!exists) {
                    const newQuestion = {
                        ...question,
                        id: Date.now() + Math.random(),
                        importedAt: new Date().toISOString()
                    };
                    this.questions.push(newQuestion);
                    importedQuestions++;
                }
            });
        }

        // Daten speichern
        await this.saveUserData();
        this.updateCategorySelects();
        this.renderCategories();
        this.renderCategoriesList();
        this.renderQuestionsList();

        this.showAlert(`Import erfolgreich! ${importedCategories} Kategorien und ${importedQuestions} Fragen importiert.`, 'success');
        this.cancelImport();
    }

    cancelImport() {
        document.getElementById('import-preview').classList.add('d-none');
        document.getElementById('import-code').value = '';
        this.pendingImportData = null;
    }

    async updateSharedContentList() {
        const container = document.getElementById('shared-content-list');
        if (!container) return;

        let userShares = [];

        if (this.isFirebaseMode && this.authService) {
            // Firebase geteilte Daten laden
            const result = await this.authService.getMySharedData();
            if (result.success) {
                userShares = result.data.map(item => [item.shareCode, item]);
            }
        } else {
            // Lokale geteilte Daten
            userShares = Object.entries(this.sharedData)
                .filter(([code, data]) => data.username === this.currentUser)
                .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        if (userShares.length === 0) {
            container.innerHTML = '<p class="text-muted">Sie haben noch keine Inhalte geteilt.</p>';
            return;
        }

        container.innerHTML = userShares.map(([code, data]) => `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">Code: <code>${code}</code></h6>
                            <small class="text-muted">
                                ${this.isFirebaseMode ? 
                                    `Downloads: ${data.downloadCount || 0} • Erstellt: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}` :
                                    `${data.categories?.length || 0} Kategorien, ${data.questions?.length || 0} Fragen • Erstellt: ${new Date(data.timestamp).toLocaleDateString('de-DE')}`
                                }
                            </small>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteSharedContent('${code}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async deleteSharedContent(code) {
        if (confirm('Möchten Sie diesen geteilten Inhalt wirklich löschen?')) {
            if (this.isFirebaseMode && this.authService) {
                // Firebase Löschung
                const result = await this.authService.deleteSharedData(code);
                
                if (result.success) {
                    this.updateSharedContentList();
                    this.showAlert(result.message, 'success');
                } else {
                    this.showAlert(result.error, 'danger');
                }
            } else {
                // Lokale Löschung
                delete this.sharedData[code];
                this.saveToStorage('shared_data', this.sharedData, true);
                this.updateSharedContentList();
                this.showAlert('Geteilter Inhalt gelöscht!', 'success');
            }
        }
    }

    // ==================== HILFSFUNKTIONEN ====================

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getDefaultStatistics() {
        return {
            totalQuestions: 0,
            correctAnswers: 0,
            categoriesPlayed: {},
            lastPlayed: null
        };
    }

    loadDefaultData() {
        this.categories = ['Allgemein', 'Ordne zu'];
        this.questions = [];
        this.statistics = this.getDefaultStatistics();
    }

    generateDemoQuestions() {
        return [
            {
                id: 'demo1',
                category: 'Demo',
                question: 'Was ist 2 + 2?',
                answerType: 'text',
                answer: '4',
                questionImage: null,
                answerImage: null
            },
            {
                id: 'demo2',
                category: 'Demo',
                question: 'Wie viele Beine hat eine Spinne?',
                answerType: 'text',
                answer: '8',
                questionImage: null,
                answerImage: null
            },
            {
                id: 'demo3',
                category: 'Demo',
                question: 'Was ist die Hauptstadt von Deutschland?',
                answerType: 'text',
                answer: 'Berlin',
                questionImage: null,
                answerImage: null
            }
        ];
    }

    generateUniqueCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        if (this.sharedData[code]) {
            return this.generateUniqueCode();
        }
        
        return code;
    }

    copyShareCode() {
        const codeField = document.getElementById('share-code-display');
        codeField.select();
        codeField.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(codeField.value);
        this.showAlert('Code in Zwischenablage kopiert!', 'success');
    }

    async exportUserData() {
        if (this.isDemo) {
            this.showAlert('Demo-Daten können nicht exportiert werden!', 'warning');
            return;
        }

        let userData;
        
        if (this.isFirebaseMode && this.authService) {
            const result = await this.authService.loadUserData();
            userData = result.success ? result.data : null;
        } else {
            userData = {
                categories: this.categories,
                questions: this.questions,
                statistics: this.statistics
            };
        }

        if (!userData) {
            this.showAlert('Keine Daten zum Exportieren verfügbar!', 'danger');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            appVersion: '2.0',
            userEmail: this.isFirebaseMode ? this.authService.user?.email : this.currentUser,
            ...userData
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `lernapp-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.showAlert('Daten erfolgreich exportiert!', 'success');
    }

    async resetUserData() {
        if (this.isDemo) {
            this.showAlert('Demo-Daten können nicht zurückgesetzt werden!', 'warning');
            return;
        }

        if (confirm('Möchten Sie wirklich ALLE Ihre Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
            if (confirm('Sind Sie sich wirklich sicher? Alle Kategorien, Fragen und Statistiken werden gelöscht!')) {
                this.loadDefaultData();
                await this.saveUserData();
                
                this.updateDashboard();
                this.renderCategories();
                this.renderCategoriesList();
                this.renderQuestionsList();
                this.renderStatistics();

                this.showAlert('Alle Daten wurden zurückgesetzt!', 'success');
            }
        }
    }

    updateDashboard() {
        if (!this.currentUser && !this.isDemo) return;

        // Profil-Seite aktualisieren
        const profileEmail = document.getElementById('profile-email');
        const profileDisplayName = document.getElementById('profile-display-name');
        
        if (profileEmail && profileDisplayName) {
            if (this.isFirebaseMode && this.authService?.user) {
                profileEmail.value = this.authService.user.email;
                profileDisplayName.value = this.authService.user.displayName || '';
            } else if (!this.isDemo && this.users[this.currentUser]) {
                profileEmail.value = this.currentUser;
                profileDisplayName.value = this.users[this.currentUser].displayName;
            }
        }

        // Dashboard-Statistiken aktualisieren
        document.getElementById('dashboard-categories').textContent = this.categories.length;
        document.getElementById('dashboard-questions').textContent = this.questions.length;
        
        const totalQuizzes = Object.values(this.statistics.categoriesPlayed || {})
            .reduce((sum, cat) => sum + (cat.gamesPlayed || 0), 0);
        document.getElementById('dashboard-total-played').textContent = totalQuizzes;
        
        const successRate = this.statistics.totalQuestions > 0 ? 
            Math.round((this.statistics.correctAnswers / this.statistics.totalQuestions) * 100) : 0;
        document.getElementById('dashboard-success-rate').textContent = `${successRate}%`;

        // Sharing-Seite aktualisieren
        document.getElementById('my-categories-count').textContent = this.categories.length;
        document.getElementById('my-questions-count').textContent = this.questions.length;
        this.updateSharedContentList();

        // Status-Informationen
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (this.isFirebaseMode && this.authService?.isOnline) {
                statusElement.innerHTML = '<i class="bi bi-cloud-check text-success"></i> Online';
            } else if (this.isFirebaseMode) {
                statusElement.innerHTML = '<i class="bi bi-cloud-slash text-warning"></i> Offline';
            } else {
                statusElement.innerHTML = '<i class="bi bi-device-hdd text-info"></i> Lokal';
            }
        }
    }

    // ==================== BESTEHENDE FUNKTIONEN ====================
    // Die restlichen Funktionen bleiben unverändert...

    // Einfache Passwort-Hash-Funktion (für lokalen Fallback)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'simple_' + Math.abs(hash).toString(16);
    }

    // Lokaler Speicher
    loadFromStorage(key, global = false) {
        try {
            const storageKey = global ? `lernapp_global_${key}` : `lernapp_${key}`;
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            return null;
        }
    }

    saveToStorage(key, data, global = false) {
        try {
            const storageKey = global ? `lernapp_global_${key}` : `lernapp_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Fehler beim Speichern der Daten:', error);
            this.showAlert('Fehler beim Speichern der Daten!', 'danger');
        }
    }

    validateDataIntegrity() {
        try {
            if (!Array.isArray(this.categories)) {
                this.categories = ['Allgemein', 'Ordne zu'];
            }

            if (!Array.isArray(this.questions)) {
                this.questions = [];
            }

            if (!this.statistics || typeof this.statistics !== 'object') {
                this.statistics = this.getDefaultStatistics();
            }

            return true;
        } catch (error) {
            console.error('Datenvalidierung fehlgeschlagen:', error);
            this.showAlert('Fehler bei der Datenvalidierung. Daten werden zurückgesetzt.', 'warning');
            this.loadDefaultData();
            return false;
        }
    }

    showAlert(message, type = 'info') {
        // Bootstrap Alert anzeigen
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const alertContainer = document.getElementById('alert-container') || document.body;
        const alertElement = document.createElement('div');
        alertElement.innerHTML = alertHtml;
        alertContainer.insertBefore(alertElement.firstElementChild, alertContainer.firstChild);
        
        // Auto-Remove nach 5 Sekunden
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    // Hier würden alle weiteren bestehenden Funktionen aus der ursprünglichen app.js eingefügt...
    // (Quiz-Logik, Admin-Funktionen, etc.)
}

// App initialisieren
window.app = new LernApp();
