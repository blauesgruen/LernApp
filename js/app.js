// ========== ZENTRALES LOGGING ========== 
// Log-Buffer in sessionStorage speichern
function lernappLog(...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    // Zeitstempel für jede Zeile
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    let log = sessionStorage.getItem('lernapp_log') || '';
    log += line + '\n';
    sessionStorage.setItem('lernapp_log', log);
    // Zusätzlich normale Ausgabe
    console._origLog.apply(console, args);
}

// console.log überschreiben, Original sichern
if (!console._origLog) {
    console._origLog = console.log;
    console.log = lernappLog;
}

// Log beim Laden der Seite löschen
window.addEventListener('DOMContentLoaded', () => {
    sessionStorage.removeItem('lernapp_log');
});
// ========== HINWEIS ZUR AUSLAGERUNG ==========
// Die Logging-Funktion kann in eine eigene Datei ausgelagert werden, z.B. js/log.js
// Dann einfach <script src="js/log.js"></script> vor allen anderen Skripten einbinden.
// Ebenso können weitere Hilfsfunktionen (z.B. für Storage, Validierung, UI) ausgelagert werden.
// Empfohlene Struktur:
// - js/log.js (Logging)
// - js/storage.js (Storage-Logik)
// - js/validation.js (Validierungen)
// - js/ui.js (UI-Hilfen)
// - js/app.js (nur noch Hauptlogik und App-Klasse)
// addCategory global verfügbar machen (wie showPage)
if (typeof window !== 'undefined' && typeof app !== 'undefined' && typeof app.addCategory === 'function') {
    window.addCategory = function() { window.app.addCategory(); };
}

// storage.js als zentrale Storage-Utility importieren
// (klassisches Script, keine Module mehr)
// storage.js, questions.js, groups.js werden vorher geladen
// storage, questionManager, groupManager sind global

// Utility: Sicheres Event-Binding mit Existenz-Check
function safeAddEventListener(selector, event, handler, options) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el) el.addEventListener(event, handler, options);
}

// Utility: Event-Delegation für dynamische Elemente
function delegateEvent(parentSelector, childSelector, event, handler) {
    const parent = typeof parentSelector === 'string' ? document.querySelector(parentSelector) : parentSelector;
    if (!parent) return;
    parent.addEventListener(event, function(e) {
        const target = e.target.closest(childSelector);
        if (target && parent.contains(target)) handler.call(target, e);
    });
}
// LernApp - Hauptlogik

class LernApp {
    // Account löschen (unverändert)
    async deleteAccount() {
        if (!this.currentUser) {
            this.showAlert('Kein Benutzer eingeloggt!', 'danger');
            return;
        }
        const username = this.currentUser;
        if (!confirm(`Möchten Sie Ihren Account (${username}) und alle zugehörigen Daten unwiderruflich löschen?`)) return;
        // Debug-Ausgaben vor Löschen
        console.log('[LernApp][deleteAccount] users vor Löschen:', JSON.stringify(this.users));
        console.log('[LernApp][deleteAccount] localStorage vor Cleanup:', Object.keys(localStorage).filter(k => k.includes(username)));
        delete this.users[username];
        await this.saveToStorage('users', this.users, true);
        // Zentrales Userpaket und alle zugehörigen Daten explizit entfernen
        localStorage.removeItem(`lernapp_user_${username}`);
        localStorage.removeItem(`lernapp_user_${username}_categories`);
        localStorage.removeItem(`lernapp_user_${username}_questions`);
        localStorage.removeItem(`lernapp_user_${username}_statistics`);
        // Speicherort-Flag entfernen
        localStorage.removeItem(`lernapp_user_${username}_storage_chosen`);
        // Zusätzlich: Alle lokalen Storage-Keys, die den Usernamen enthalten, entfernen (Altlasten!)
        const userKeyRegex = new RegExp(`(^|[_-])${username}([_-]|$)`, 'i');
        Object.keys(localStorage).forEach(key => {
            if (userKeyRegex.test(key)) {
                localStorage.removeItem(key);
            }
        });
        // Debug-Ausgaben nach Löschen
        console.log('[LernApp][deleteAccount] users nach Löschen:', JSON.stringify(this.users));
        console.log('[LernApp][deleteAccount] localStorage nach Cleanup:', Object.keys(localStorage).filter(k => k.includes(username)));
        // Logout und UI-Reset
        this.logoutUser();
        this.showAlert('Ihr Account und alle zugehörigen Daten wurden gelöscht.', 'success');
    }
    // Zeigt beim ersten Login den Speicherort-Dialog an
    async showStorageLocationDialogIfNeeded() {
        if (!window.lernappCloudStorage) {
            console.warn('lernappCloudStorage nicht vorhanden');
            return;
        }
        const userKey = `user_${this.currentUser}`;
        const storageFlag = localStorage.getItem(`lernapp_${userKey}_storage_chosen`);
        console.log('[LernApp] showStorageLocationDialogIfNeeded:', { userKey, storageFlag, currentUser: this.currentUser });
        if (storageFlag !== '1') {
            // Erstes Login: Modal anzeigen, kein alert, kein automatischer Dialog
            const showModal = () => {
                const modalElem = document.getElementById('storageLocationModal');
                if (!modalElem) {
                    console.error('storageLocationModal nicht im DOM!');
                    return;
                }
                const modal = new bootstrap.Modal(modalElem, { backdrop: 'static', keyboard: false });
                const skipBtn = document.getElementById('storage-location-skip');
                const chooseBtn = document.getElementById('storage-location-choose');
                skipBtn.onclick = null;
                chooseBtn.onclick = null;
                skipBtn.onclick = () => {
                    localStorage.setItem(`lernapp_${userKey}_storage_chosen`, '1');
                    modal.hide();
                    console.log('[LernApp] Speicherort-Dialog: Abbrechen');
                };
                chooseBtn.onclick = async () => {
                    if (!window.lernappCloudStorage.supported) {
                        // Zeige eigenes Modal statt alert
                        const notSupportedModalElem = document.getElementById('storageNotSupportedModal');
                        const notSupportedModal = new bootstrap.Modal(notSupportedModalElem, { backdrop: 'static', keyboard: false });
                        const chooseBtn2 = document.getElementById('storage-not-supported-choose');
                        const cancelBtn2 = document.getElementById('storage-not-supported-cancel');
                        chooseBtn2.onclick = null;
                        cancelBtn2.onclick = null;
                        chooseBtn2.onclick = () => {
                            notSupportedModal.hide();
                            modal.hide();
                            localStorage.setItem(`lernapp_${userKey}_storage_chosen`, '1');
                            console.log('[LernApp] Speicherort nicht unterstützt: gewählt');
                        };
                        cancelBtn2.onclick = () => {
                            notSupportedModal.hide();
                            console.log('[LernApp] Speicherort nicht unterstützt: abgebrochen');
                        };
                        notSupportedModal.show();
                    } else {
                        await window.lernappCloudStorage.chooseDirectory(false);
                        localStorage.setItem(`lernapp_${userKey}_storage_chosen`, '1');
                        modal.hide();
                        console.log('[LernApp] Speicherort gewählt');
                    }
                };
                modal.show();
                console.log('[LernApp] Speicherort-Dialog angezeigt');
            };
            // Fallback: Modal nach DOM-Ready oder mit Timeout anzeigen
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                setTimeout(showModal, 0);
            } else {
                document.addEventListener('DOMContentLoaded', showModal);
            }
        } else {
            // 2. Login und später: Speicherort im Hintergrund verbinden
            if (window.lernappCloudStorage.dirHandle == null) {
                await window.lernappCloudStorage.loadDirHandle();
            }
        }
    }
    // Umschalten der Felder je nach Kategorie
    onCategorySelectChange() {
        const select = document.getElementById('question-category');
        const imageOnlyFields = document.getElementById('imageonly-fields');
        const defaultFields = document.getElementById('default-fields');
        const catName = select.value;
        const catObj = this.getCategoryObj ? this.getCategoryObj(catName) : null;
        if (catObj && catObj.nurBildAntworten) {
            imageOnlyFields.style.display = '';
            defaultFields.style.display = 'none';
        } else {
            imageOnlyFields.style.display = 'none';
            defaultFields.style.display = '';
        }
    }
    // Zeigt den aktuellen Speicherort im Header an (sofern Cloud/Ordner gewählt)
    updateStorageLocationInfo() {
        const infoElem = document.getElementById('storage-location-info');
        const nameElem = document.getElementById('storage-location-name');
        if (!window.lernappCloudStorage || !infoElem || !nameElem) return;
        const dirHandle = window.lernappCloudStorage.dirHandle;
        if (dirHandle && dirHandle.name) {
            nameElem.textContent = dirHandle.name;
            infoElem.classList.remove('d-none');
        } else {
            nameElem.textContent = '';
            infoElem.classList.add('d-none');
        }
    }
    // ========== ADMIN USER MANAGEMENT ==========
    async renderAdminUsersList() {
        const container = document.getElementById('admin-users-list');
        if (!container) return;
        // Lade User-Liste frisch aus dem Storage (async!)
        let usersObj = await this.loadFromStorage('users', true);
        if (!usersObj) usersObj = {};
        this.users = usersObj;
        const users = Object.values(this.users);
        if (users.length === 0) {
            container.innerHTML = '<p class="text-muted">Keine Benutzer vorhanden.</p>';
            return;
        }
        container.innerHTML = `<div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Benutzername</th><th>Anzeigename</th><th>Letzter Login</th><th>Logins</th><th>Aktionen</th></tr></thead><tbody>
            ${users.map(u => `
                <tr>
                    <td>${u.username}</td>
                    <td>${u.displayName || ''}</td>
                    <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString('de-DE') : '-'}</td>
                    <td>${u.loginCount || 0}</td>
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

    // Quiz-Logik (jetzt über questionManager)
    startQuiz(mainCategory, group) {
        if (!mainCategory || !group) {
            this.showAlert('Bitte wählen Sie eine Hauptkategorie und eine Gruppe!', 'danger');
            return;
        }
        const questions = questionManager.getQuestions(mainCategory, group);
        if (questions.length < 4) {
            this.showAlert('Diese Gruppe hat weniger als 4 Fragen! Bitte fügen Sie mehr Fragen hinzu.', 'warning');
            return;
        }
        this.currentQuiz = {
            questions: this.shuffleArray(questions).slice(0, 10),
            currentIndex: 0,
            score: 0,
            selectedCategory: `${mainCategory} / ${group}`,
            answers: []
        };
        this.showQuestion();
        document.getElementById('quiz-container').classList.remove('d-none');
        document.getElementById('quiz-result').classList.add('d-none');
        document.getElementById('next-question').classList.add('d-none');
        document.getElementById('finish-quiz').classList.add('d-none');
        document.getElementById('submit-answer').classList.remove('d-none');
    }

    adminResetPassword(username) {
        // Dummy-Implementierung für Passwort-Reset (hier ggf. Logik ergänzen)
        alert('Passwort wurde geändert!');
        this.saveToStorage('users', this.users, true);
    }

    async adminDeleteUser(username) {
        if (!confirm(`Benutzer ${username} und alle zugehörigen Daten unwiderruflich löschen?`)) return;
        // Debug-Ausgaben vor Löschen
        console.log('[LernApp][adminDeleteUser] users vor Löschen:', JSON.stringify(this.users));
        console.log('[LernApp][adminDeleteUser] localStorage vor Cleanup:', Object.keys(localStorage).filter(k => k.includes(username)));
        delete this.users[username];
        await this.saveToStorage('users', this.users, true);
        // Zentrales Userpaket und alle zugehörigen Daten explizit entfernen
        localStorage.removeItem(`lernapp_user_${username}`);
        localStorage.removeItem(`lernapp_user_${username}_categories`);
        localStorage.removeItem(`lernapp_user_${username}_questions`);
        localStorage.removeItem(`lernapp_user_${username}_statistics`);
        // Speicherort-Flag entfernen
        localStorage.removeItem(`lernapp_user_${username}_storage_chosen`);
        // Zusätzlich: Alle lokalen Storage-Keys, die den Usernamen enthalten, entfernen (Altlasten!)
        const userKeyRegex = new RegExp(`(^|[_-])${username}([_-]|$)`, 'i');
        Object.keys(localStorage).forEach(key => {
            if (userKeyRegex.test(key)) {
                localStorage.removeItem(key);
            }
        });
        // Debug-Ausgaben nach Löschen
        console.log('[LernApp][adminDeleteUser] users nach Löschen:', JSON.stringify(this.users));
        console.log('[LernApp][adminDeleteUser] localStorage nach Cleanup:', Object.keys(localStorage).filter(k => k.includes(username)));
        // Userliste garantiert frisch laden
        this.users = await this.loadFromStorage('users', true) || {};
        this.renderAdminUsersList();
        document.getElementById('admin-user-data').innerHTML = '';
        alert('Benutzer und Daten gelöscht!');
        // Seite sofort neu laden, damit alle Instanzen synchron sind
        location.reload();
    }
    constructor() {
        // User Management System
        this.currentUser = null;
        this.isDemo = false;
        this.users = {};
        this.sharedData = {};
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

    async init() {
        // User- und SharedData asynchron laden
        this.users = await this.loadFromStorage('users', true) || {};
        // Migration: Falls Userdaten noch nicht zentralisiert sind, migrieren
        let migrationNeeded = false;
        Object.keys(this.users).forEach(username => {
            const user = this.users[username];
            if (!user.statistics) { user.statistics = { totalQuestions: 0, correctAnswers: 0, lastPlayed: null, categoriesPlayed: {} }; migrationNeeded = true; }
            if (!user.settings) { user.settings = {}; migrationNeeded = true; }
            if (!user.storage) { user.storage = { chosen: false, folder: '', cloud: false }; migrationNeeded = true; }
            if (!user.displayName) { user.displayName = username; migrationNeeded = true; }
            if (!user.createdAt) { user.createdAt = new Date().toISOString(); migrationNeeded = true; }
            if (typeof user.loginCount !== 'number') { user.loginCount = 0; migrationNeeded = true; }
        });
        if (migrationNeeded) await this.saveToStorage('users', this.users, true);
        this.sharedData = await this.loadFromStorage('shared_data', true) || {};

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
            // Kein automatischer Speicherort-Dialog mehr beim Reload
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
                let loginInfo = userData.lastLogin ? new Date(userData.lastLogin).toLocaleString('de-DE') : '-';
                loginInfo += ` (Logins: ${userData.loginCount || 0})`;
                const lastLoginElem = document.getElementById('last-login-time');
                if (lastLoginElem) lastLoginElem.textContent = loginInfo;
                document.getElementById('dashboard-username').textContent = 
                    userData.displayName || this.currentUser;
            } else if (this.isDemo) {
                document.getElementById('current-username').textContent = 'Demo-Modus';
                document.getElementById('dashboard-username').textContent = 'Demo-Benutzer';
            }
            // showPage('home') entfällt, Weiterleitung erfolgt explizit nach Login
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
        // Umschalt-Buttons neu binden (wichtig bei dynamischem DOM)
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        if (loginTab) {
            loginTab.onclick = (e) => {
                e.preventDefault();
                this.switchAuthMode('login');
            };
        }
        if (registerTab) {
            registerTab.onclick = (e) => {
                e.preventDefault();
                this.switchAuthMode('register');
            };
        }
        // Formulare neu binden
        const loginForm = document.getElementById('login-form-inner');
        if (loginForm) {
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                this.loginUser(e);
            };
        }
        const registerForm = document.getElementById('register-form-inner');
        if (registerForm) {
            registerForm.onsubmit = (e) => {
                e.preventDefault();
                this.registerUser(e);
            };
        }
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

        // Username und Felder holen
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-password-confirm').value;
        const displayName = document.getElementById('register-display-name').value.trim();

        // 1. Userliste frisch laden
        let users = await this.loadFromStorage('users', true);
        if (!users) users = {};
        this.users = users;

        // Debug-Ausgaben: Userliste und localStorage vor dem Anlegen
        console.log('[LernApp][registerUser] users vor Validierung:', JSON.stringify(this.users));
        console.log('[LernApp][registerUser] localStorage vor Validierung:', Object.keys(localStorage).filter(k => k.includes(username)));

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

        // 2. Altlasten entfernen
        localStorage.removeItem(`lernapp_user_${username}`);
        localStorage.removeItem(`lernapp_user_${username}_categories`);
        localStorage.removeItem(`lernapp_user_${username}_questions`);
        localStorage.removeItem(`lernapp_user_${username}_statistics`);
        // Zusätzlich: Alle lokalen Storage-Keys, die den Usernamen enthalten, entfernen (Altlasten!)
        const userKeyRegex = new RegExp(`(^|[_-])${username}([_-]|$)`, 'i');
        Object.keys(localStorage).forEach(key => {
            if (userKeyRegex.test(key)) {
                localStorage.removeItem(key);
            }
        });
        // Auch aus dem zentralen User-Objekt entfernen (falls noch vorhanden)
        if (this.users[username]) {
            delete this.users[username];
            await this.saveToStorage('users', this.users, true);
        }

        // 3. Userliste erneut frisch laden (nach Cleanup!)
        users = await this.loadFromStorage('users', true);
        if (!users) users = {};
        this.users = users;

        // Debug-Ausgaben nach Cleanup
        console.log('[LernApp][registerUser] users nach Cleanup:', JSON.stringify(this.users));
        console.log('[LernApp][registerUser] localStorage nach Cleanup:', Object.keys(localStorage).filter(k => k.includes(username)));

        // 4. Jetzt erst prüfen, ob User existiert
        if (this.users[username]) {
            this.showAlert('Benutzername existiert noch im System! Bitte Seite neu laden oder anderen Namen wählen.', 'danger');
            return;
        }

        // Benutzer erstellen (zentralisiert)
        const newUser = {
            username: username,
            password: this.hashPassword(password),
            displayName: displayName || username,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            loginCount: 0, // Bleibt 0, wird erst beim ersten Login auf 1 gesetzt
            storage: { chosen: false, folder: '', cloud: false },
            statistics: { totalQuestions: 0, correctAnswers: 0, lastPlayed: null, categoriesPlayed: {} },
            settings: {},
            categories: ['Allgemein', 'Ordne zu'],
            questions: []
        };
        this.users[username] = newUser;
        // Zentrales Userpaket im localStorage speichern
        localStorage.setItem(`lernapp_user_${username}`, JSON.stringify(newUser));
        await this.saveToStorage('users', this.users, true);
        // Debug-Ausgaben nach Anlegen
        console.log('[LernApp][registerUser] users nach Anlegen:', JSON.stringify(this.users));
        console.log('[LernApp][registerUser] localStorage nach Anlegen:', Object.keys(localStorage).filter(k => k.includes(username)));

        this.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
        this.switchAuthMode('login');
        // Login-Formular leeren, dann Username setzen
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        setTimeout(() => { document.getElementById('login-username').value = username; }, 50);
    }

    async loginUser(event) {
        // Doppel-Login-Schutz: Wenn bereits eingeloggt, nicht erneut zählen
        if (this.currentUser && this.currentUser === document.getElementById('login-username').value.trim()) {
            this.showAlert('Sie sind bereits eingeloggt.', 'info');
            return;
        }
        event.preventDefault();
        if (sessionStorage.getItem('lernapp_admin_access')) {
            this.showAlert('Solange der Admin eingeloggt ist, kann sich kein Nutzer anmelden.', 'danger');
            return;
        }
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        // Prüfe, ob User in zentraler Userliste existiert
        if (!this.users[username]) {
            // Sicherheit: auch zentrales Userpaket entfernen, falls noch vorhanden
            localStorage.removeItem(`lernapp_user_${username}`);
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
        // loginCount vor Setzen von lastLogin prüfen und erhöhen
        let firstLogin = false;
        if (typeof user.loginCount !== 'number' || user.loginCount === 0) {
            user.loginCount = 1;
            firstLogin = true;
        } else {
            user.loginCount++;
        }
        // Login erfolgreich
        user.lastLogin = new Date().toISOString();
        this.users[username] = user;
        // Zentrales Userpaket im localStorage aktualisieren!
        localStorage.setItem(`lernapp_user_${username}`, JSON.stringify(user));
        this.saveToStorage('users', this.users, true);
        this.currentUser = username;
        this.isDemo = false;
        sessionStorage.setItem('lernapp_current_user', username);
        sessionStorage.removeItem('lernapp_demo_mode');
        this.loadUserData();
        this.updateUIForLoginState();
        this.updateDashboard();
        this.showAlert(`Willkommen zurück, ${user.displayName}!`, 'success');
        // Speicherort-Dialog nur beim ersten Login anzeigen
        if (firstLogin) {
            this.showStorageLocationDialogIfNeeded();
        } else if (window.lernappCloudStorage && window.lernappCloudStorage.dirHandle == null && typeof window.lernappCloudStorage.loadDirHandle === 'function') {
            window.lernappCloudStorage.loadDirHandle();
        }
        showPage('home');
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

    logoutUser(forceLogout = false) {
        if (forceLogout || confirm('Möchten Sie sich wirklich abmelden?')) {
            this.currentUser = null;
            this.isDemo = false;
            sessionStorage.removeItem('lernapp_current_user');
            sessionStorage.removeItem('lernapp_demo_mode');
            sessionStorage.removeItem('lernapp_admin_access');
            this.updateUIForLoginState();
            if (forceLogout) {
                // Nach Account-Löschung: sofort auf Startseite und reload
                location.reload();
            } else {
                this.showAlert('Erfolgreich abgemeldet!', 'success');
            }
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
            // Prüfe, ob User in zentraler Userliste existiert
            if (!this.users[this.currentUser]) {
                // Sicherheit: auch zentrales Userpaket entfernen, falls noch vorhanden
                localStorage.removeItem(`lernapp_user_${this.currentUser}`);
                this.categories = ['Allgemein', 'Ordne zu'];
                this.questions = [];
                this.statistics = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    categoriesPlayed: {},
                    lastPlayed: null
                };
                return;
            }
            // Debug-Ausgaben zu Beginn
            if (this.currentUser) {
                console.log('[LernApp][loadUserData] users:', JSON.stringify(this.users));
                console.log('[LernApp][loadUserData] localStorage:', Object.keys(localStorage).filter(k => k.includes(this.currentUser)));
            }
            // Zentrales Userpaket laden
            const userObjStr = localStorage.getItem(`lernapp_user_${this.currentUser}`);
            if (userObjStr) {
                try {
                    const userObj = JSON.parse(userObjStr);
                    // Wenn das Userpaket leer ist, keine Altlasten übernehmen
                    this.categories = Array.isArray(userObj.categories) ? userObj.categories : ['Allgemein', 'Ordne zu'];
                    this.questions = Array.isArray(userObj.questions) ? userObj.questions : [];
                    this.statistics = (userObj.statistics && typeof userObj.statistics === 'object') ? userObj.statistics : {
                        totalQuestions: 0,
                        correctAnswers: 0,
                        categoriesPlayed: {},
                        lastPlayed: null
                    };
                    // Optionale Felder
                    if (userObj.settings) this.users[this.currentUser].settings = userObj.settings;
                    if (userObj.storage) this.users[this.currentUser].storage = userObj.storage;
                    // NICHT das zentrale User-Objekt überschreiben, damit loginCount erhalten bleibt
                    console.log('[LernApp][loadUserData] Userpaket geladen:', userObj);
                } catch (e) {
                    // Fallback: leere Daten
                    this.categories = ['Allgemein', 'Ordne zu'];
                    this.questions = [];
                    this.statistics = {
                        totalQuestions: 0,
                        correctAnswers: 0,
                        categoriesPlayed: {},
                        lastPlayed: null
                    };
                    console.log('[LernApp][loadUserData] Fehler beim Parsen, Daten zurückgesetzt.');
                }
            } else {
                // Kein Paket vorhanden: Fallback auf leere Daten
                this.categories = ['Allgemein', 'Ordne zu'];
                this.questions = [];
                this.statistics = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    categoriesPlayed: {},
                    lastPlayed: null
                };
                console.log('[LernApp][loadUserData] Kein Userpaket gefunden, Daten zurückgesetzt.');
            }
            // Wenn neue User keine Daten haben, Beispieldaten laden
            if (!this.questions || this.questions.length === 0) {
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
            // Prüfe, ob User in zentraler Userliste existiert
            if (!this.users[this.currentUser]) {
                // Sicherheit: auch zentrales Userpaket entfernen, falls noch vorhanden
                localStorage.removeItem(`lernapp_user_${this.currentUser}`);
                this.categories = ['Allgemein', 'Ordne zu'];
                this.questions = [];
                this.statistics = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    categoriesPlayed: {},
                    lastPlayed: null
                };
                console.log('[LernApp][loadUserData] User nicht gefunden, Daten zurückgesetzt.');
                return;
            }
            // Debug-Ausgaben zu Beginn
            console.log('[LernApp][loadUserData] users:', JSON.stringify(this.users));
            console.log('[LernApp][loadUserData] localStorage:', Object.keys(localStorage).filter(k => k.includes(this.currentUser)));
            // Zentrales Userpaket laden
            const userObjStr = localStorage.getItem(`lernapp_user_${this.currentUser}`);
            if (userObjStr) {
                let userObj = null;
                try {
                    userObj = JSON.parse(userObjStr);
                    // Wenn das Userpaket leer ist, keine Altlasten übernehmen
                    this.categories = Array.isArray(userObj.categories) ? userObj.categories : ['Allgemein', 'Ordne zu'];
                    this.questions = Array.isArray(userObj.questions) ? userObj.questions : [];
                    this.statistics = (userObj.statistics && typeof userObj.statistics === 'object') ? userObj.statistics : {
                        totalQuestions: 0,
                        correctAnswers: 0,
                        categoriesPlayed: {},
                        lastPlayed: null
                    };
                    // Optionale Felder
                    if (userObj.settings) this.users[this.currentUser].settings = userObj.settings;
                    if (userObj.storage) this.users[this.currentUser].storage = userObj.storage;
                    console.log('[LernApp][loadUserData] Userpaket geladen:', userObj);
                } catch (e) {
                    // Fallback: leere Daten
                    this.categories = ['Allgemein', 'Ordne zu'];
                    this.questions = [];
                    this.statistics = {
                        totalQuestions: 0,
                        correctAnswers: 0,
                        categoriesPlayed: {},
                        lastPlayed: null
                    };
                    console.log('[LernApp][loadUserData] Fehler beim Parsen, Daten zurückgesetzt.');
                }
            } else {
                // Kein Paket vorhanden: Fallback auf leere Daten
                this.categories = ['Allgemein', 'Ordne zu'];
                this.questions = [];
                this.statistics = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    categoriesPlayed: {},
                    lastPlayed: null
                };
                console.log('[LernApp][loadUserData] Kein Userpaket gefunden, Daten zurückgesetzt.');
            }
            // Wenn neue User keine Daten haben, Beispieldaten laden
            if (!this.questions || this.questions.length === 0) {
                this.loadSampleData();
            }
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
            // Zentrales Userpaket speichern
            const userObj = {
                ...this.users[this.currentUser],
                categories: this.categories,
                questions: this.questions,
                statistics: this.statistics,
                settings: this.users[this.currentUser].settings || {},
                storage: this.users[this.currentUser].storage || {}
            };
            localStorage.setItem(`lernapp_user_${this.currentUser}`, JSON.stringify(userObj));
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
                // Zentrales Userpaket entfernen
                localStorage.removeItem(`lernapp_user_${this.currentUser}`);

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

        // Last login time + login count (wie im Dashboard oben)
        const lastLoginElement = document.getElementById('last-login-time');
        if (lastLoginElement && !this.isDemo && this.users[this.currentUser]) {
            const userData = this.users[this.currentUser];
            let loginInfo = userData.lastLogin ? new Date(userData.lastLogin).toLocaleString('de-DE') : '-';
            loginInfo += ` (Logins: ${userData.loginCount || 0})`;
            lastLoginElement.textContent = loginInfo;
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
        // Standardkategorien sicherstellen
        const standardKategorien = ['Allgemein', 'Ordne zu'];
        standardKategorien.forEach(kat => {
            if (!this.categories.includes(kat)) this.categories.unshift(kat);
        });
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
        // Kategorien und Fragen anzeigen
        this.renderCategories();
        this.renderCategoriesList();
        this.renderQuestionsList();
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

            // Modal schließen und aus dem DOM entfernen
            const modalElem = document.getElementById('adminLoginModal');
            const modal = modalElem ? bootstrap.Modal.getInstance(modalElem) : null;
            if (modal) {
                modal.hide();
            }
            setTimeout(() => {
                if (modalElem && modalElem.parentNode) {
                    modalElem.parentNode.removeChild(modalElem);
                }
                // Backdrop und Modal-Open-Status entfernen (UI-Blockade verhindern)
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                // Admin-Interface aktivieren
                this.showAdminInterface();
                // Direkt auf Admin-Seite umschalten
                showPage('admin');
                console.log('[DEBUG] showPage("admin") aufgerufen:', document.getElementById('admin-page'));
            }, 350); // Bootstrap-Animation abwarten
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
            this.disableUserLoginIfAdmin(); // Login sofort wieder aktivieren
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
        // Logout-Button (Profil Dropdown)
        safeAddEventListener('.user-only .dropdown-menu .dropdown-item[href="#"]', 'click', (e) => {
            if (e.target.textContent.includes('Abmelden')) {
                e.preventDefault();
                this.logoutUser();
            }
        });

        // Account löschen (Profilseite)
        safeAddEventListener('.btn-outline-danger', 'click', (e) => {
            if (e.target.textContent.includes('Account löschen')) {
                e.preventDefault();
                this.deleteAccount();
            }
        });

        // Admin-User-Aktionen (Delegation für dynamische Buttons)
        delegateEvent('#admin-users-list', '.btn-outline-danger', 'click', function(e) {
            e.preventDefault();
            const username = this.closest('tr')?.querySelector('td')?.textContent;
            if (username) app.adminDeleteUser(username);
        });
        delegateEvent('#admin-users-list', '.btn-outline-warning', 'click', function(e) {
            e.preventDefault();
            const username = this.closest('tr')?.querySelector('td')?.textContent;
            if (username) app.adminResetPassword(username);
        });
        delegateEvent('#admin-users-list', '.btn-outline-info', 'click', function(e) {
            e.preventDefault();
            const username = this.closest('tr')?.querySelector('td')?.textContent;
            if (username) app.adminShowUserData(username);
        });

        // Frage-Formular
        safeAddEventListener('#question-form', 'submit', (e) => {
            e.preventDefault();
            this.addQuestion();
        });

        // Neue Kategorie
        safeAddEventListener('#new-category', 'keypress', (e) => {
            if (e.key === 'Enter') this.addCategory();
        });

        // Antwort-Typ-Wechsel
        document.querySelectorAll('input[name="answer-type"]').forEach(radio => {
            safeAddEventListener(radio, 'change', (e) => {
                this.toggleAnswerTypeSection(e.target.value);
            });
        });

        // Bild-Upload mit Vorschau
        safeAddEventListener('#shared-image-input', 'change', (e) => {
            this.handleImageUpload(e, 'shared');
        });
        safeAddEventListener('#answer-image-input', 'change', (e) => {
            this.handleImageUpload(e, 'answer');
        });

        // Filter für Fragen-Liste
        safeAddEventListener('#filter-category', 'change', () => {
            this.renderQuestionsList();
        });

        // Login/Register Umschaltung (Tabs)
        safeAddEventListener('#login-tab', 'click', (e) => {
            e.preventDefault();
            this.switchAuthMode('login');
        });
        safeAddEventListener('#register-tab', 'click', (e) => {
            e.preventDefault();
            this.switchAuthMode('register');
        });

        // Admin-Login Button
        safeAddEventListener('#admin-login-link', 'click', (e) => {
            e.preventDefault();
            this.showAdminLogin();
        });

        // User-Login Button
        safeAddEventListener('.guest-only .nav-link[href="#"]', 'click', (e) => {
            if (e.target.textContent.includes('Anmelden')) {
                e.preventDefault();
                this.showUserLogin('login');
            }
        });
        // User-Register Button
        safeAddEventListener('.card-body .btn.btn-primary', 'click', (e) => {
            if (e.target.textContent.includes('Registrieren')) {
                e.preventDefault();
                this.showUserLogin('register');
            }
        });

        // Login-Formular (submit)
        const loginForm = document.getElementById('login-form-inner');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.loginUser(e);
            });
        }

        // Registrierungsformular (submit)
        const registerForm = document.getElementById('register-form-inner');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registerUser(e);
            });
        }
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
    async loadFromStorage(key) {
        // Zentrale Storage-Utility nutzen
        try {
            if (window.storage && window.storage.load) {
                const data = await window.storage.load(key);
                // Wenn aus localStorage geladen, ggf. entschlüsseln
                if (data && typeof data === 'string') {
                    const decrypted = this.decryptData(data);
                    return decrypted ? JSON.parse(decrypted) : null;
                }
                return data;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Daten (Storage-Utility):', error);
        }
        // Fallback: localStorage (verschlüsselt)
        try {
            const encryptedData = localStorage.getItem(`lernapp_${key}`);
            if (!encryptedData) return null;
            const decryptedData = this.decryptData(encryptedData);
            return decryptedData ? JSON.parse(decryptedData) : null;
        } catch (error) {
            console.error('Fehler beim Laden der Daten (Fallback):', error);
            return null;
        }
    }

    async saveToStorage(key, data) {
        // Zentrale Storage-Utility nutzen
        try {
            if (window.storage && window.storage.save) {
                await window.storage.save(key, data);
                return;
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Daten (Storage-Utility):', error);
        }
        // Fallback: localStorage (verschlüsselt)
        try {
            const jsonData = JSON.stringify(data);
            const encryptedData = this.encryptData(jsonData);
            localStorage.setItem(`lernapp_${key}`, encryptedData);
        } catch (error) {
            console.error('Fehler beim Speichern der Daten (Fallback):', error);
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

    // Fragen verwalten (jetzt über questionManager)
    addQuestion() {
        const form = document.getElementById('question-form');
        const mainCategory = document.getElementById('question-main-category')?.value || 'Textfragen';
        const group = document.getElementById('question-category').value;
        const questionText = document.getElementById('question-input').value.trim();
        const answerType = document.querySelector('input[name="answer-type"]:checked').value;
        const answerText = document.getElementById('answer-input').value.trim();
        const sharedImageInput = document.getElementById('shared-image-input');
        const answerImageInput = document.getElementById('answer-image-input') || document.getElementById('default-answer-image-input');
        const descriptionInput = document.getElementById('ordnezu-description-input');

        // Validierung
        if (!group) {
            this.showAlert('Bitte wählen Sie eine Gruppe/Kategorie!', 'danger');
            return;
        }
        if (!questionText && !sharedImageInput.files[0]) {
            this.showAlert('Bitte geben Sie eine Frage ein oder laden Sie ein Frage-Bild hoch!', 'danger');
            return;
        }
        if (answerType === 'text' && !answerText) {
            this.showAlert('Bitte geben Sie eine Antwort ein!', 'danger');
            return;
        }
        if (answerType === 'image' && !answerImageInput.files[0]) {
            this.showAlert('Bitte laden Sie ein Antwort-Bild hoch!', 'danger');
            return;
        }

        // Frage-Objekt vorbereiten
        const newQuestion = {
            id: Date.now(),
            mainCategory,
            group,
            question: questionText || null,
            answerType,
            answer: answerType === 'text' ? answerText : null,
            questionImage: null,
            answerImage: null,
            description: descriptionInput ? descriptionInput.value.trim() : ''
        };

        // Bilder verarbeiten
        let imagesToProcess = 0;
        let imagesProcessed = 0;
        const checkComplete = () => {
            imagesProcessed++;
            if (imagesProcessed === imagesToProcess) {
                questionManager.addQuestion(newQuestion);
                this.renderQuestionsList(mainCategory, group);
                // UI-Reset
                document.getElementById('question-form').reset();
                document.getElementById('shared-image-preview').innerHTML = '';
                document.getElementById('answer-image-preview').innerHTML = '';
                document.getElementById('text-answer-section').classList.remove('d-none');
                document.getElementById('image-answer-section').classList.add('d-none');
                document.getElementById('text-answer').checked = true;
                this.showAlert('Frage/Antwort erfolgreich hinzugefügt!', 'success');
            }
        };
        // Frage-Bild
        if (sharedImageInput && sharedImageInput.files[0]) {
            imagesToProcess++;
            const reader = new FileReader();
            reader.onload = (e) => {
                newQuestion.questionImage = e.target.result;
                checkComplete();
            };
            reader.readAsDataURL(sharedImageInput.files[0]);
        }
        // Antwort-Bild
        if (answerType === 'image' && answerImageInput && answerImageInput.files[0]) {
            imagesToProcess++;
            const reader = new FileReader();
            reader.onload = (e) => {
                newQuestion.answerImage = e.target.result;
                checkComplete();
            };
            reader.readAsDataURL(answerImageInput.files[0]);
        }
        if (imagesToProcess === 0) {
            questionManager.addQuestion(newQuestion);
            this.renderQuestionsList(mainCategory, group);
            document.getElementById('question-form').reset();
            document.getElementById('shared-image-preview').innerHTML = '';
            document.getElementById('answer-image-preview').innerHTML = '';
            document.getElementById('text-answer-section').classList.remove('d-none');
            document.getElementById('image-answer-section').classList.add('d-none');
            document.getElementById('text-answer').checked = true;
            this.showAlert('Frage/Antwort erfolgreich hinzugefügt!', 'success');
        }
    }

    // Nicht mehr benötigt, Logik jetzt in addQuestion/questionManager
    saveQuestion(question) {
        // entfernt
    }

    // Fragen löschen jetzt über questionManager
    deleteQuestion(questionId, mainCategory = null, group = null) {
        if (confirm('Möchten Sie diese Frage wirklich löschen?')) {
            questionManager.deleteQuestion(questionId);
            this.renderQuestionsList(mainCategory, group);
            this.showAlert('Frage erfolgreich gelöscht!', 'success');
        }
    }

    // UI-Rendering
    // Kategorien-Rendering jetzt über groupManager
    renderCategories() {
        const container = document.getElementById('category-buttons');
        if (!container) return;
        const mainCategories = ['Textfragen', 'Bilderquiz'];
        container.innerHTML = mainCategories.map(main => {
            const groups = groupManager.getGroups(main);
            return `
                <div class="mb-2"><strong>${main}</strong></div>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    ${groups.map(group => {
                        const count = questionManager.getQuestions(main, group).length;
                        return `<button class="btn btn-outline-primary" onclick="window.app.startQuiz('${main}','${group}')">${group} <span class='badge bg-secondary ms-1'>${count}</span></button>`;
                    }).join('')}
                </div>
            `;
        }).join('');
    }

    // Gruppen-Rendering jetzt über groupManager
    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        if (!container) return;
        const mainCategories = ['Textfragen', 'Bilderquiz'];
        container.innerHTML = mainCategories.map(main => {
            const groups = groupManager.getGroups(main);
            return `
                <div class="mb-2"><strong>${main}</strong></div>
                <ul class="list-group mb-3">
                    ${groups.map(group => `<li class="list-group-item d-flex justify-content-between align-items-center">${group}<span class="badge bg-secondary">${questionManager.getQuestions(main, group).length} Fragen</span></li>`).join('')}
                </ul>
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

    // Frage bearbeiten (jetzt über questionManager)
    showEditQuestionModal(id) {
        const q = questionManager.getQuestionById(id);
        if (!q) return;
        const modal = new bootstrap.Modal(document.getElementById('edit-question-modal'));
        // Felder befüllen
        document.getElementById('edit-question-input').value = q.question || '';
        document.getElementById('edit-answer-image-input').value = '';
        document.getElementById('edit-explanation-input').value = q.description || '';
        // Kategorie-Auswahl (Gruppe)
        const select = document.getElementById('edit-category-select');
        // Hole Gruppen für die Hauptkategorie der Frage
        const mainCategory = q.mainCategory || 'Textfragen';
        const groups = groupManager.getGroups(mainCategory);
        select.innerHTML = groups.map(g => `<option value="${g}"${g === q.group ? ' selected' : ''}>${g}</option>`).join('');
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
            const newGroup = select.value;
            const newDescription = document.getElementById('edit-explanation-input').value.trim();
            const aImgFile = answerImageInput.files[0];
            const updateAndSave = (answerImageData = null) => {
                q.question = newQ;
                q.group = newGroup;
                q.description = newDescription;
                if (answerImageData !== null) q.answerImage = answerImageData;
                questionManager.updateQuestion(q);
                this.renderQuestionsList(q.mainCategory, newGroup);
                modal.hide();
            };
            if (aImgFile) {
                const reader2 = new FileReader();
                reader2.onload = ev2 => {
                    updateAndSave(ev2.target.result);
                };
                reader2.readAsDataURL(aImgFile);
            } else {
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

        const categoryQuestions = this.questions.filter(q => q.category === category || (category && category.startsWith('Ordne zu') && q.category && q.category.startsWith('Ordne zu')));
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
        const questionsPool = this.questions.filter(q => q.category === category || (category && category.startsWith('Ordne zu') && q.category && q.category.startsWith('Ordne zu')));
        if (category && category.startsWith('Ordne zu')) {
            // Spezielle Behandlung für "Ordne zu" und Unterkategorien
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
        // Spezielle Behandlung für "Ordne zu" Kategorie und Unterkategorien
        if (questionData.category && questionData.category.startsWith('Ordne zu')) {
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
        // Nur Fragen aus "Ordne zu" Kategorie (inkl. Unterkategorien) mit Bild-Antworten
        const orderQuestions = availableQuestions.filter(q => 
            q.category && q.category.startsWith('Ordne zu') && 
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
        } else if (this.currentQuiz.selectedCategory && this.currentQuiz.selectedCategory.startsWith('Ordne zu')) {
            // Für normale "Ordne zu" Quizzes und Unterkategorien
            const questionsPool = this.questions.filter(q => q.category && q.category.startsWith('Ordne zu'));
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
    // Fragen-Rendering jetzt über questionManager
    renderQuestionsList(mainCategory = null, group = null) {
        const container = document.getElementById('questions-list');
        if (!container) return;
        let questions = questionManager.questions;
        if (mainCategory && group) {
            questions = questionManager.getQuestions(mainCategory, group);
        }
        if (questions.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Keine Fragen vorhanden.</p>';
            return;
        }
        container.innerHTML = questions.map(q => {
            const answerDisplay = q.answer ? `<strong>Antwort:</strong> ${q.answer}` : (q.answerImage ? `<strong>Antwort:</strong> <span class='badge bg-info'>Bild</span>` : '');
            const questionDisplay = q.question ? `<strong>Frage:</strong> ${q.question}` : '';
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="card-title">
                                    <span class="badge bg-secondary me-2">${q.mainCategory} / ${q.group}</span>
                                    ${questionDisplay}
                                </h6>
                                <p class="card-text mb-1">${answerDisplay}</p>
                                ${q.description ? `<p class="card-text"><em>${q.description}</em></p>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Hilfsfunktion zur Formatierung von Antworten (Text oder Bild)
    formatAnswerDisplay(answer) {
        if (answer && answer.image) {
            return `<img src="${answer.image}" alt="Antwort" class="img-thumbnail" style="max-height: 80px;">`;
        } else if (answer && answer.text) {
            return `<span class="fw-bold">${answer.text}</span>`;
        } else if (typeof answer === 'string') {
            return `<span class="fw-bold">${answer}</span>`;
        } else {
            return '';
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
        const existingAlerts = document.querySelectorAll('.alert-global');
        existingAlerts.forEach(alert => alert.remove());

        // Neuen Alert als Overlay erstellen
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-global fade-in`;
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

// showPage global verfügbar machen (wichtig für HTML-Onclick)
// Diese Funktion muss nach ihrer Definition auf window gesetzt werden!
function showPage(pageId) {
    // Alle Seiten ausblenden
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('d-none');
    });
    // Gewünschte Seite anzeigen
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.remove('d-none');
    }
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


// showPage global verfügbar machen (wichtig für HTML-Onclick)
window.showPage = showPage;
// LernApp-Instanz global verfügbar machen
window.app = new LernApp();
