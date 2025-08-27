// LernApp - Hauptlogik

class LernApp {
    // ========== ADMIN USER MANAGEMENT ==========
    renderAdminUsersList() {
        const container = document.getElementById('admin-users-list');
        if (!container) return;
        const users = Object.values(this.users);
        if (users.length === 0) {
            container.innerHTML = '<p class="text-muted">Keine Benutzer vorhanden.</p>';
            return;
        }
        container.innerHTML = `<div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Benutzername</th><th>Anzeigename</th><th>Letzter Login</th><th>Aktionen</th></tr></thead><tbody>
            ${users.map(u => `
                <tr>
                    <td>${u.username}</td>
                    <td>${u.displayName || ''}</td>
                    <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString('de-DE') : '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info me-1" onclick="app.adminShowUserData('${u.username}')"><i class='bi bi-database'></i> Daten</button>
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="app.adminResetPassword('${u.username}')"><i class='bi bi-key'></i> Passwort zurücksetzen</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.adminDeleteUser('${u.username}')"><i class='bi bi-trash'></i> Löschen</button>
                    </td>
                </tr>`).join('')}
            </tbody></table></div>`;
    }

    adminShowUserData(username) {
        const container = document.getElementById('admin-user-data');
        if (!container) return;
        const user = this.users[username];
        if (!user) {
            container.innerHTML = '<div class="alert alert-danger">Benutzer nicht gefunden.</div>';
            return;
        }
        // User-Daten laden
        const userKey = `user_${username}`;
        const categories = this.loadFromStorage(`${userKey}_categories`) || [];
        const questions = this.loadFromStorage(`${userKey}_questions`) || [];
        const statistics = this.loadFromStorage(`${userKey}_statistics`) || {};
        container.innerHTML = `
            <div class="card">
                <div class="card-header bg-light"><strong>Daten von ${user.displayName || username}</strong></div>
                <div class="card-body">
                    <p><strong>Kategorien:</strong> ${categories.length}</p>
                    <p><strong>Fragen:</strong> ${questions.length}</p>
                    <p><strong>Statistiken:</strong> ${Object.keys(statistics).length > 0 ? 'vorhanden' : 'keine'}</p>
                    <button class="btn btn-outline-secondary btn-sm me-2" onclick="app.adminExportUserData('${username}')"><i class='bi bi-download'></i> Exportieren</button>
                </div>
            </div>
        `;
    }

    adminExportUserData(username) {
        const user = this.users[username];
        if (!user) return;
        const userKey = `user_${username}`;
        const exportData = {
            username: user.username,
            displayName: user.displayName,
            exportDate: new Date().toISOString(),
            categories: this.loadFromStorage(`${userKey}_categories`) || [],
            questions: this.loadFromStorage(`${userKey}_questions`) || [],
            statistics: this.loadFromStorage(`${userKey}_statistics`) || {}
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `lernapp-export-${username}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    adminResetPassword(username) {
        if (!confirm(`Passwort für ${username} wirklich zurücksetzen?`)) return;
        const newPassword = prompt('Neues Passwort für ' + username + ':', '');
        if (!newPassword || newPassword.length < 6) {
            alert('Passwort muss mindestens 6 Zeichen lang sein!');
            return;
        }
        this.users[username].password = this.hashPassword(newPassword);
        this.saveToStorage('users', this.users, true);
        alert('Passwort wurde geändert!');
    }

    adminDeleteUser(username) {
        if (!confirm(`Benutzer ${username} und alle zugehörigen Daten unwiderruflich löschen?`)) return;
        delete this.users[username];
        this.saveToStorage('users', this.users, true);
        // Alle Userdaten entfernen
        const userKey = `user_${username}`;
        localStorage.removeItem(`lernapp_${userKey}_categories`);
        localStorage.removeItem(`lernapp_${userKey}_questions`);
        localStorage.removeItem(`lernapp_${userKey}_statistics`);
        this.renderAdminUsersList();
        document.getElementById('admin-user-data').innerHTML = '';
        alert('Benutzer und Daten gelöscht!');
    }
    constructor() {
        // User Management System
        this.currentUser = null;
        this.isDemo = false;
        this.users = this.loadFromStorage('users', true) || {}; // Global users storage
        this.sharedData = this.loadFromStorage('shared_data', true) || {}; // Global shared data storage
        
        // Current user's data (wird dynamisch geladen)
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

    init() {
        // Prüfen ob User eingeloggt ist
        this.checkUserSession();
        
        if (this.currentUser || this.isDemo) {
            this.loadUserData();
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
    }

    // ==================== USER MANAGEMENT ====================

    checkUserSession() {
        const sessionUser = sessionStorage.getItem('lernapp_current_user');
        const sessionDemo = sessionStorage.getItem('lernapp_demo_mode');
        
        if (sessionDemo) {
            this.isDemo = true;
            this.currentUser = 'demo';
        } else if (sessionUser) {
            this.currentUser = sessionUser;
        }
    }

    updateUIForLoginState() {
        const userElements = document.querySelectorAll('.user-only');
        const guestElements = document.querySelectorAll('.guest-only');
        if (this.currentUser || this.isDemo) {
            userElements.forEach(el => el.style.display = 'block');
            guestElements.forEach(el => el.style.display = 'none');
            if (this.currentUser && !this.isDemo) {
                const userData = this.users[this.currentUser];
                document.getElementById('current-username').textContent = 
                    userData.displayName || this.currentUser;
                document.getElementById('dashboard-username').textContent = 
                    userData.displayName || this.currentUser;
            } else if (this.isDemo) {
                document.getElementById('current-username').textContent = 'Demo-Modus';
                document.getElementById('dashboard-username').textContent = 'Demo-Benutzer';
            }
            showPage('home');
        } else {
            userElements.forEach(el => el.style.display = 'none');
            guestElements.forEach(el => el.style.display = 'block');
            showPage('login');
        }
        // User-Login deaktivieren, wenn Admin eingeloggt
        this.disableUserLoginIfAdmin();
    }

    // Deaktiviert das User-Login-Formular, solange Admin eingeloggt ist
    disableUserLoginIfAdmin() {
        const loginForm = document.getElementById('login-form');
        const loginBtn = document.getElementById('login-btn');
        if (sessionStorage.getItem('lernapp_admin_access')) {
            if (loginForm) loginForm.querySelectorAll('input,button').forEach(el => el.disabled = true);
            if (loginBtn) loginBtn.disabled = true;
        } else {
            if (loginForm) loginForm.querySelectorAll('input,button').forEach(el => el.disabled = false);
            if (loginBtn) loginBtn.disabled = false;
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

    registerUser(event) {
        event.preventDefault();
        
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-password-confirm').value;
        const displayName = document.getElementById('register-display-name').value.trim();

        // Validierung
        if (username.length < 3 || username.length > 20) {
            this.showAlert('Benutzername muss zwischen 3 und 20 Zeichen lang sein!', 'danger');
            return;
        }

        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            this.showAlert('Benutzername darf nur Buchstaben und Zahlen enthalten!', 'danger');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Passwort muss mindestens 6 Zeichen lang sein!', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Passwörter stimmen nicht überein!', 'danger');
            return;
        }

        if (this.users[username]) {
            this.showAlert('Benutzername bereits vergeben!', 'danger');
            return;
        }

        // Benutzer erstellen
        const newUser = {
            username: username,
            password: this.hashPassword(password),
            displayName: displayName || username,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        this.users[username] = newUser;
        this.saveToStorage('users', this.users, true);

        this.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
        this.switchAuthMode('login');
        document.getElementById('login-username').value = username;
    }

    loginUser(event) {
        event.preventDefault();
        if (sessionStorage.getItem('lernapp_admin_access')) {
            this.showAlert('Solange der Admin eingeloggt ist, kann sich kein Nutzer anmelden.', 'danger');
            return;
        }
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        if (!this.users[username]) {
            this.showAlert('Benutzername nicht gefunden!', 'danger');
            return;
        }
        const user = this.users[username];
        if (user.password !== this.hashPassword(password)) {
            this.showAlert('Falsches Passwort!', 'danger');
            return;
        }
        // Admin-Session beenden, falls aktiv
        sessionStorage.removeItem('lernapp_admin_access');
        this.hideAdminInterface();
        // Login erfolgreich
        const isFirstLogin = !user.lastLogin;
        user.lastLogin = new Date().toISOString();
        this.users[username] = user;
        this.saveToStorage('users', this.users, true);
        this.currentUser = username;
        this.isDemo = false;
        sessionStorage.setItem('lernapp_current_user', username);
        sessionStorage.removeItem('lernapp_demo_mode');
        this.loadUserData();
        this.updateUIForLoginState();
        this.updateDashboard();
        this.showAlert(`Willkommen zurück, ${user.displayName}!`, 'success');
        // Nach erstem Login: Speicherort wählen
        if (isFirstLogin && window.lernappCloudStorage && window.lernappCloudStorage.chooseDirectory) {
            setTimeout(async () => {
                alert('Bitte wählen Sie einen Speicherort für Ihre Daten.\nTipp: Ein Cloud-Ordner ermöglicht Synchronisation auf mehreren Geräten.');
                await window.lernappCloudStorage.chooseDirectory();
                window.lernappCloudStorage.setUserFolderName(username);
            }, 500);
        }
    }

    startDemoMode() {
        this.isDemo = true;
        this.currentUser = 'demo';
        sessionStorage.setItem('lernapp_demo_mode', 'true');
        sessionStorage.removeItem('lernapp_current_user');

        this.loadUserData();
        this.updateUIForLoginState();
        this.updateDashboard();
        this.showAlert('Demo-Modus gestartet! Ihre Daten werden nicht dauerhaft gespeichert.', 'info');
    }

    logoutUser() {
        if (confirm('Möchten Sie sich wirklich abmelden?')) {
            this.currentUser = null;
            this.isDemo = false;
            sessionStorage.removeItem('lernapp_current_user');
            sessionStorage.removeItem('lernapp_demo_mode');
            sessionStorage.removeItem('lernapp_admin_access');
            
            this.updateUIForLoginState();
            this.showAlert('Erfolgreich abgemeldet!', 'success');
        }
    }

    updateProfile(event) {
        event.preventDefault();
        
        if (this.isDemo) {
            this.showAlert('Im Demo-Modus können keine Profil-Änderungen vorgenommen werden!', 'warning');
            return;
        }

        const displayName = document.getElementById('profile-display-name').value.trim();
        const newPassword = document.getElementById('profile-new-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;

        if (newPassword && newPassword !== confirmPassword) {
            this.showAlert('Passwörter stimmen nicht überein!', 'danger');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            this.showAlert('Passwort muss mindestens 6 Zeichen lang sein!', 'danger');
            return;
        }

        // Profil aktualisieren
        const user = this.users[this.currentUser];
        user.displayName = displayName || user.username;
        
        if (newPassword) {
            user.password = this.hashPassword(newPassword);
        }

        this.users[this.currentUser] = user;
        this.saveToStorage('users', this.users, true);

        this.updateUIForLoginState();
        this.showAlert('Profil erfolgreich aktualisiert!', 'success');
        
        // Formular zurücksetzen
        document.getElementById('profile-new-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
    }

    loadUserData() {
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
        } else if (this.currentUser) {
            // User-spezifische Daten laden
            const userKey = `user_${this.currentUser}`;
            this.categories = this.loadFromStorage(`${userKey}_categories`) || ['Allgemein', 'Ordne zu'];
            this.questions = this.loadFromStorage(`${userKey}_questions`) || [];
            this.statistics = this.loadFromStorage(`${userKey}_statistics`) || {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };

            // Wenn neue User keine Daten haben, Beispieldaten laden
            if (this.questions.length === 0) {
                this.loadSampleData();
            }
        }

        // Daten-Integrität prüfen
        this.validateDataIntegrity();
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
            },
            {
                id: 'demo4',
                category: 'Demo',
                question: 'Welches Jahr haben wir aktuell?',
                answerType: 'text',
                answer: '2025',
                questionImage: null,
                answerImage: null
            }
        ];
    }

    // ==================== DATA SHARING ====================

    generateShareCode() {
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
            username: this.currentUser,
            displayName: this.users[this.currentUser].displayName,
            timestamp: new Date().toISOString(),
            categories: shareCategories ? this.categories : [],
            questions: shareQuestions ? this.questions : []
        };

        // Generate unique share code
        const shareCode = this.generateUniqueCode();
        this.sharedData[shareCode] = shareData;
        this.saveToStorage('shared_data', this.sharedData, true);

        document.getElementById('share-code-display').value = shareCode;
        this.updateSharedContentList();
        this.showAlert('Teilungs-Code erfolgreich erstellt!', 'success');
    }

    generateUniqueCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Prüfen ob Code bereits existiert
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

    previewImportData() {
        const importCode = document.getElementById('import-code').value.trim().toUpperCase();
        
        if (!importCode) {
            this.showAlert('Bitte geben Sie einen Teilungs-Code ein!', 'warning');
            return;
        }

        if (!this.sharedData[importCode]) {
            this.showAlert('Ungültiger Teilungs-Code!', 'danger');
            return;
        }

        const shareData = this.sharedData[importCode];
        const previewContent = document.getElementById('import-preview-content');
        
        previewContent.innerHTML = `
            <p><strong>Von:</strong> ${shareData.displayName} (${shareData.username})</p>
            <p><strong>Erstellt am:</strong> ${new Date(shareData.timestamp).toLocaleDateString('de-DE')}</p>
            <p><strong>Kategorien:</strong> ${shareData.categories.length} (${shareData.categories.join(', ')})</p>
            <p><strong>Fragen:</strong> ${shareData.questions.length}</p>
        `;

        document.getElementById('import-preview').classList.remove('d-none');
        this.pendingImportData = shareData;
    }

    confirmImportData() {
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
                // Prüfen ob Frage bereits existiert (basierend auf Text und Antwort)
                const exists = this.questions.some(q => 
                    q.question === question.question && 
                    q.answer === question.answer &&
                    q.category === question.category
                );
                
                if (!exists) {
                    // Neue ID generieren
                    const newQuestion = {
                        ...question,
                        id: Date.now() + Math.random(),
                        importedFrom: importData.username
                    };
                    this.questions.push(newQuestion);
                    importedQuestions++;
                }
            });
        }

        // Daten speichern
        this.saveUserData();
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

    updateSharedContentList() {
        const container = document.getElementById('shared-content-list');
        if (!container) return;

        const userShares = Object.entries(this.sharedData)
            .filter(([code, data]) => data.username === this.currentUser)
            .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp));

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
                                ${data.categories.length} Kategorien, ${data.questions.length} Fragen
                                • Erstellt: ${new Date(data.timestamp).toLocaleDateString('de-DE')}
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

    deleteSharedContent(code) {
        if (confirm('Möchten Sie diesen geteilten Inhalt wirklich löschen?')) {
            delete this.sharedData[code];
            this.saveToStorage('shared_data', this.sharedData, true);
            this.updateSharedContentList();
            this.showAlert('Geteilter Inhalt gelöscht!', 'success');
        }
    }

    // ==================== DATA MANAGEMENT ====================

    saveUserData() {
        if (this.isDemo) {
            // Demo-Daten nicht speichern
            return;
        }

        if (this.currentUser) {
            const userKey = `user_${this.currentUser}`;
            this.saveToStorage(`${userKey}_categories`, this.categories);
            this.saveToStorage(`${userKey}_questions`, this.questions);
            this.saveToStorage(`${userKey}_statistics`, this.statistics);
        }
    }

    exportUserData() {
        if (this.isDemo) {
            this.showAlert('Demo-Daten können nicht exportiert werden!', 'warning');
            return;
        }

        const exportData = {
            username: this.currentUser,
            displayName: this.users[this.currentUser].displayName,
            exportDate: new Date().toISOString(),
            categories: this.categories,
            questions: this.questions,
            statistics: this.statistics
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `lernapp-export-${this.currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.showAlert('Daten erfolgreich exportiert!', 'success');
    }

    resetUserData() {
        if (this.isDemo) {
            this.showAlert('Demo-Daten können nicht zurückgesetzt werden!', 'warning');
            return;
        }

        if (confirm('Möchten Sie wirklich ALLE Ihre Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
            if (confirm('Sind Sie sich wirklich sicher? Alle Kategorien, Fragen und Statistiken werden gelöscht!')) {
                const userKey = `user_${this.currentUser}`;
                localStorage.removeItem(`lernapp_${userKey}_categories`);
                localStorage.removeItem(`lernapp_${userKey}_questions`);
                localStorage.removeItem(`lernapp_${userKey}_statistics`);

                this.loadUserData();
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
        const profileUsername = document.getElementById('profile-username');
        const profileDisplayName = document.getElementById('profile-display-name');
        
        if (profileUsername && !this.isDemo) {
            profileUsername.value = this.currentUser;
            profileDisplayName.value = this.users[this.currentUser].displayName;
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

        // Last login time
        const lastLoginElement = document.getElementById('last-login-time');
        if (lastLoginElement && !this.isDemo && this.users[this.currentUser]) {
            const lastLogin = this.users[this.currentUser].lastLogin;
            if (lastLogin) {
                lastLoginElement.textContent = new Date(lastLogin).toLocaleDateString('de-DE');
            }
        }
    }

    // ==================== EXISTING FUNCTIONALITY ====================

    // Admin-Zugang überprüfen
    checkAdminAccess() {
        const adminAccess = sessionStorage.getItem('lernapp_admin_access');
        if (adminAccess) {
            this.showAdminInterface();
        } else {
            this.hideAdminInterface();
        }
    }

    showAdminInterface() {
        // Admin-Navigation anzeigen
        document.getElementById('admin-nav-item').style.display = 'block';
        document.getElementById('admin-logout-item').style.display = 'block';
        const adminLoginLink = document.getElementById('admin-login-link');
        if (adminLoginLink) {
            adminLoginLink.style.display = 'none';
        }
        
        // Admin-Seite normal anzeigen (nicht gesperrt)
        const adminPage = document.getElementById('admin-page');
        if (adminPage && adminPage.querySelector('.container.mt-5')) {
            // Admin-Seite ist gesperrt, neu laden um entsperrt zu zeigen
            location.reload();
        }

        // User-Liste anzeigen
        this.renderAdminUsersList();
        document.getElementById('admin-user-data').innerHTML = '';
    }

    hideAdminInterface() {
        // Admin-Navigation verstecken
        document.getElementById('admin-nav-item').style.display = 'none';
        document.getElementById('admin-logout-item').style.display = 'none';
        const adminLoginLink = document.getElementById('admin-login-link');
        if (adminLoginLink) {
            adminLoginLink.style.display = 'block';
        }
    }

    showAdminLogin() {
        // Erstelle ein Modal für Admin-Login
        const modalHtml = `
            <div class="modal fade" id="adminLoginModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-shield-lock"></i> Admin-Anmeldung
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Geben Sie das Admin-Passwort ein, um Zugang zur Verwaltung zu erhalten:</p>
                            <div class="mb-3">
                                <input type="password" id="modal-admin-password" class="form-control" 
                                       placeholder="Admin-Passwort" onkeypress="if(event.key==='Enter') app.unlockAdminAccess()">
                            </div>
                            <div id="login-error" class="text-danger" style="display: none;"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
                            <button type="button" class="btn btn-primary" onclick="app.unlockAdminAccess()">
                                <i class="bi bi-unlock"></i> Anmelden
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Modal in DOM einfügen falls nicht vorhanden
        if (!document.getElementById('adminLoginModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // Modal anzeigen
        const modal = new bootstrap.Modal(document.getElementById('adminLoginModal'));
        modal.show();
        
        // Focus auf Passwort-Feld
        setTimeout(() => {
            document.getElementById('modal-admin-password').focus();
        }, 500);
    }

    unlockAdminAccess() {
        const password = document.getElementById('modal-admin-password').value;
        const correctPassword = 'LernApp2025Admin'; // In Produktion: Sicheres Passwort verwenden
        
        if (password === correctPassword) {
            // Alle User ausloggen, falls eingeloggt
            this.currentUser = null;
            this.isDemo = false;
            sessionStorage.removeItem('lernapp_current_user');
            sessionStorage.removeItem('lernapp_demo_mode');
            this.updateUIForLoginState();
            sessionStorage.setItem('lernapp_admin_access', 'granted');
            this.showAlert('Admin-Anmeldung erfolgreich!', 'success');
            
            // Modal schließen
            const modal = bootstrap.Modal.getInstance(document.getElementById('adminLoginModal'));
            if (modal) {
                modal.hide();
            }
            
            // Admin-Interface aktivieren
            this.showAdminInterface();
            
            // Zur Admin-Seite wechseln
            setTimeout(() => {
                showPage('admin');
            }, 1000);
        } else {
            const errorDiv = document.getElementById('login-error');
            errorDiv.textContent = 'Falsches Passwort!';
            errorDiv.style.display = 'block';
            document.getElementById('modal-admin-password').value = '';
            document.getElementById('modal-admin-password').focus();
        }
    }

    logoutAdmin() {
        if (confirm('Möchten Sie sich als Admin abmelden?')) {
            sessionStorage.removeItem('lernapp_admin_access');
            this.hideAdminInterface();
            this.showAlert('Admin-Abmeldung erfolgreich!', 'success');
            showPage('home');
        }
    }

    // Einfache Passwort-Hash-Funktion (für Demo-Zwecke)
    hashPassword(password) {
        // In einer echten Anwendung sollte eine sichere Hash-Funktion verwendet werden
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return 'simple_' + Math.abs(hash).toString(16);
    }

    // Daten-Integrität prüfen
    validateDataIntegrity() {
        try {
            // Kategorien validieren
            if (!Array.isArray(this.categories)) {
                this.categories = ['Allgemein', 'Ordne zu'];
            }

            // Fragen validieren
            if (!Array.isArray(this.questions)) {
                this.questions = [];
            }

            // Statistiken validieren
            if (!this.statistics || typeof this.statistics !== 'object') {
                this.statistics = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    categoriesPlayed: {},
                    lastPlayed: null
                };
            }

            return true;
        } catch (error) {
            console.error('Datenvalidierung fehlgeschlagen:', error);
            this.showAlert('Fehler bei der Datenvalidierung. Daten werden zurückgesetzt.', 'warning');
            
            // Daten zurücksetzen
            this.categories = ['Allgemein', 'Ordne zu'];
            this.questions = [];
            this.statistics = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };
            
            return false;
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
            const editButton = (category !== 'Allgemein' && category !== 'Ordne zu') ?
                `<button class="btn btn-sm btn-outline-primary me-1" onclick="app.showEditCategoryModal('${category}')"><i class='bi bi-pencil'></i> Bearbeiten</button>` : '';
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
                    <div>${editButton}${deleteButton}</div>
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
                            <div>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="app.showEditQuestionModal(${q.id})"><i class='bi bi-pencil'></i> Bearbeiten</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="app.deleteQuestion(${q.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    // Kategorie bearbeiten
    showEditCategoryModal(category) {
        const modal = new bootstrap.Modal(document.getElementById('edit-category-modal'));
        document.getElementById('edit-category-input').value = category;
        document.getElementById('save-category-edit').onclick = () => {
            const newName = document.getElementById('edit-category-input').value.trim();
            if (!newName || this.categories.includes(newName)) {
                alert('Ungültiger oder bereits vorhandener Kategoriename!');
                return;
            }
            // Kategorie umbenennen
            this.categories = this.categories.map(cat => cat === category ? newName : cat);
            this.questions = this.questions.map(q => q.category === category ? { ...q, category: newName } : q);
            this.saveToStorage('categories', this.categories);
            this.saveToStorage('questions', this.questions);
            this.renderCategoriesList();
            this.renderQuestionsList();
            this.updateCategorySelects();
            modal.hide();
        };
        modal.show();
    }

    // Frage bearbeiten
    showEditQuestionModal(id) {
        const q = this.questions.find(q => q.id === id);
        if (!q) return;
        const modal = new bootstrap.Modal(document.getElementById('edit-question-modal'));
        // Felder befüllen
        document.getElementById('edit-question-input').value = q.question || '';
        document.getElementById('edit-answer-input').value = q.answer || '';
        document.getElementById('edit-explanation-input').value = q.explanation || '';
        // Antworttyp
        const answerTypeSelect = document.getElementById('edit-answer-type-select');
        answerTypeSelect.value = q.answerType || 'text';
        // Kategorie-Auswahl
        const select = document.getElementById('edit-category-select');
        select.innerHTML = this.categories.map(cat => `<option value="${cat}"${cat === q.category ? ' selected' : ''}>${cat}</option>`).join('');
        // Frage-Bild
        const questionImageInput = document.getElementById('edit-question-image-input');
        const questionImagePreview = document.getElementById('edit-question-image-preview');
        questionImageInput.value = '';
        if (q.questionImage) {
            questionImagePreview.innerHTML = `<img src="${q.questionImage}" alt="Frage-Bild" style="max-width:100px;max-height:100px;">`;
        } else {
            questionImagePreview.innerHTML = '';
        }
        questionImageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    questionImagePreview.innerHTML = `<img src="${ev.target.result}" alt="Frage-Bild" style="max-width:100px;max-height:100px;">`;
                };
                reader.readAsDataURL(file);
            } else {
                questionImagePreview.innerHTML = '';
            }
        };
        // Antwort-Bild
        const answerImageInput = document.getElementById('edit-answer-image-input');
        const answerImagePreview = document.getElementById('edit-answer-image-preview');
        answerImageInput.value = '';
        if (q.answerImage) {
            answerImagePreview.innerHTML = `<img src="${q.answerImage}" alt="Antwort-Bild" style="max-width:100px;max-height:100px;">`;
        } else {
            answerImagePreview.innerHTML = '';
        }
        answerImageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    answerImagePreview.innerHTML = `<img src="${ev.target.result}" alt="Antwort-Bild" style="max-width:100px;max-height:100px;">`;
                };
                reader.readAsDataURL(file);
            } else {
                answerImagePreview.innerHTML = '';
            }
        };
        // Speichern-Button
        document.getElementById('save-question-edit').onclick = () => {
            const newQ = document.getElementById('edit-question-input').value.trim();
            const newA = document.getElementById('edit-answer-input').value.trim();
            const newC = select.value;
            const newType = answerTypeSelect.value;
            const newExplanation = document.getElementById('edit-explanation-input').value.trim();
            // Bilder ggf. übernehmen
            const qImgFile = questionImageInput.files[0];
            const aImgFile = answerImageInput.files[0];
            const updateAndSave = () => {
                q.question = newQ;
                q.category = newC;
                q.answerType = newType;
                q.explanation = newExplanation;
                if (newType === 'text') {
                    q.answer = newA;
                    q.answerImage = '';
                } else {
                    q.answer = '';
                }
                this.saveToStorage('questions', this.questions);
                this.renderQuestionsList();
                modal.hide();
            };
            if (qImgFile) {
                const reader = new FileReader();
                reader.onload = ev => {
                    q.questionImage = ev.target.result;
                    if (newType === 'image' && aImgFile) {
                        const reader2 = new FileReader();
                        reader2.onload = ev2 => {
                            q.answerImage = ev2.target.result;
                            updateAndSave();
                        };
                        reader2.readAsDataURL(aImgFile);
                    } else {
                        updateAndSave();
                    }
                };
                reader.readAsDataURL(qImgFile);
            } else if (newType === 'image' && aImgFile) {
                const reader2 = new FileReader();
                reader2.onload = ev2 => {
                    q.answerImage = ev2.target.result;
                    updateAndSave();
                };
                reader2.readAsDataURL(aImgFile);
            } else {
                if (!qImgFile) q.questionImage = q.questionImage || '';
                if (newType === 'image' && !aImgFile) q.answerImage = q.answerImage || '';
                updateAndSave();
            }
        };
        modal.show();
    }

    // Spezielle Quiz-Funktion für "Ordne zu" mit allen Bild-Antworten
    startOrderQuiz() {
        // Alle Fragen mit Bildantworten sammeln (aus allen Kategorien)
        const imageAnswerQuestions = this.questions.filter(q => 
            q.answerType === 'image' && 
            q.answerImage && 
            q.category !== 'Ordne zu'
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
