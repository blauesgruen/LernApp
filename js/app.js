// Hilfsfunktion: EventListener sicher für alle passenden Elemente setzen
function safeAddEventListener(selector, event, handler) {
    document.querySelectorAll(selector).forEach(el => el.addEventListener(event, handler));
}

// Globale Alert-Funktion für die gesamte App
window.showAlert = window.showAlert || function(msg, type = 'info') {
    alert(msg);
};
// === DEBUG-LOGGING: Storage und Redirects ===
(function() {
    // Logge alle Storage-Keys nach jedem Seitenaufruf
    console.log('[LernApp][DEBUG] localStorage:', Object.keys(localStorage));
    console.log('[LernApp][DEBUG] sessionStorage:', Object.keys(sessionStorage));

    // Logge alle Redirects
    const origReplace = window.location.replace;
    window.location.replace = function(url) {
        console.log('[LernApp][DEBUG] window.location.replace aufgerufen mit:', url, new Error().stack);
        origReplace.call(window.location, url);
    };
})();

class LernApp {
    constructor() {
        // Session-User aus sessionStorage wiederherstellen
        this.currentUser = sessionStorage.getItem('lernapp_current_user') || null;
        this.isDemo = sessionStorage.getItem('lernapp_demo_mode') === 'true';
        this.users = {};
        this.categories = [];
        this.questions = [];
        this.statistics = {};
        this.sharedData = {};
        // Userdaten laden, falls User eingeloggt
        if (this.currentUser || this.isDemo) {
            this.loadUserData();
        }
        // UI anpassen
        this.updateUIForLoginState();
    }

    // Lädt die Userliste aus dem Storage (z.B. beim Seitenstart)
    async reloadUsersFromStorage() {
        let users = await this.loadFromStorage('users', true);
        if (!users) users = {};
        this.users = users;
    }
    // Dummy-Methode, damit kein Fehler mehr kommt
    switchAuthMode(mode) {
        // Hier kann später die Logik für den Wechsel zwischen Login/Registrierung ergänzt werden
    }
    // Zeigt ein modernes Modal zur Speicherort-Auswahl beim ersten Login
    async showStorageLocationModal(user) {
        return new Promise((resolve) => {
            // Modal-HTML
            const modalHtml = `
                <div class="modal fade" id="storageLocationModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="bi bi-hdd-network"></i> Speicherort wählen</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Wo möchten Sie Ihre Daten speichern?</p>
                                <div class="d-grid gap-2">
                                    <button id="choose-local" class="btn btn-outline-primary">Lokal (nur auf diesem Gerät)</button>
                                    <button id="choose-cloud" class="btn btn-outline-success">Cloud (Dateisystem, portabel)</button>
                                </div>
                                <div id="storage-modal-info" class="mt-3 text-muted small"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // Modal einfügen
            if (!document.getElementById('storageLocationModal')) {
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            }
            const modalElem = document.getElementById('storageLocationModal');
            const modal = new bootstrap.Modal(modalElem);
            modal.show();
            // Button-Handler
            document.getElementById('choose-local').onclick = () => {
                modal.hide();
                setTimeout(() => {
                    modalElem.parentNode.removeChild(modalElem);
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                    resolve('local');
                }, 350);
            };
            document.getElementById('choose-cloud').onclick = async () => {
                modal.hide();
                setTimeout(() => {
                    modalElem.parentNode.removeChild(modalElem);
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                    resolve('cloud');
                }, 350);
            };
        });
    }

    // Zeigt einen Dialog zur Speicherort-Auswahl beim ersten Login (jetzt mit Modal)
    async showStorageLocationDialogIfNeeded() {
        const user = this.users[this.currentUser];
        if (user && user.storage && !user.storage.chosen) {
            // Modernes Modal statt prompt
            const choice = await this.showStorageLocationModal(user);
            if (choice === 'cloud') {
                user.storage.cloud = true;
                user.storage.chosen = true;
                // Cloud-Initialisierung (z.B. Directory Picker)
                if (window.lernappCloudStorage && typeof window.lernappCloudStorage.pickDirectory === 'function') {
                    await window.lernappCloudStorage.pickDirectory();
                }
            } else {
                user.storage.cloud = false;
                user.storage.chosen = true;
            }
            this.users[this.currentUser] = user;
            localStorage.setItem(`lernapp_user_${this.currentUser}`, JSON.stringify(user));
            await this.saveToStorage('users', this.users, true);
            showAlert('Speicherort gespeichert: ' + (user.storage.cloud ? 'Cloud' : 'Lokal'), 'info');
        }
    }
    // Admin: Benutzer löschen
    async adminDeleteUser(username) {
        if (!username || !this.users[username]) {
            showAlert('Benutzer nicht gefunden!', 'danger');
            return;
        }
        if (!confirm(`Benutzer "${username}" wirklich löschen?`)) return;
        delete this.users[username];
        await this.saveToStorage('users', this.users, true);
        localStorage.removeItem(`lernapp_user_${username}`);
        showAlert(`Benutzer "${username}" wurde gelöscht.`, 'success');
        setTimeout(() => {
            this.renderAdminUsersList();
            document.getElementById('admin-user-data').innerHTML = '';
        }, 100);
    }

    // Admin: User-Details anzeigen
    async adminShowUserData(username) {
        if (!username || !this.users[username]) {
            this.showAlert('Benutzer nicht gefunden!', 'danger');
            return;
        }
        const user = this.users[username];
        const detailsHtml = `
            <div class="card mt-3">
                <div class="card-header bg-info text-white"><strong>Details für ${user.displayName || username}</strong></div>
                <div class="card-body">
                    <p><strong>Benutzername:</strong> ${username}</p>
                    <p><strong>Erstellt am:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleString('de-DE') : '-'}</p>
                    <p><strong>Letzter Login:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleString('de-DE') : '-'}</p>
                    <p><strong>Logins:</strong> ${user.loginCount || 0}</p>
                    <p><strong>Kategorien:</strong> ${(user.categories || []).join(', ')}</p>
                    <p><strong>Fragen:</strong> ${(user.questions || []).length}</p>
                    <button class="btn btn-outline-secondary mt-2" onclick="document.getElementById('admin-user-data').innerHTML = ''">Schließen</button>
                </div>
            </div>
        `;
        document.getElementById('admin-user-data').innerHTML = detailsHtml;
    }

    // Admin: Passwort zurücksetzen
    async adminResetPassword(username) {
        if (!username || !this.users[username]) {
            this.showAlert('Benutzer nicht gefunden!', 'danger');
            return;
        }
        const newPassword = prompt(`Neues Passwort für "${username}" eingeben:`);
        if (!newPassword || newPassword.length < 6) {
            this.showAlert('Passwort muss mindestens 6 Zeichen lang sein!', 'danger');
            return;
        }
        this.users[username].password = this.hashPassword(newPassword);
        await this.saveToStorage('users', this.users, true);
        localStorage.setItem(`lernapp_user_${username}`, JSON.stringify(this.users[username]));
        this.showAlert(`Passwort für "${username}" wurde geändert.`, 'success');
    }
    // Platzhalter: Zeigt die Liste der Benutzer im Admin-Bereich an
    async renderAdminUsersList() {
        const listElem = document.getElementById('admin-users-list');
        // Userliste frisch laden
        let users = await this.loadFromStorage('users', true);
        if (!users) users = {};
        this.users = users;
        if (listElem) {
            if (this.users && Object.keys(this.users).length > 0) {
                listElem.innerHTML = `
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Benutzername</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(this.users).map(u => `
                                <tr>
                                    <td>${u}</td>
                                    <td>
                                        <button class="btn btn-outline-info btn-sm me-1" onclick="app.adminShowUserData('${u}')"><i class="bi bi-info-circle"></i> Details</button>
                                        <button class="btn btn-outline-warning btn-sm me-1" onclick="app.adminResetPassword('${u}')"><i class="bi bi-key"></i> Passwort</button>
                                        <button class="btn btn-outline-danger btn-sm" onclick="app.adminDeleteUser('${u}')"><i class="bi bi-trash"></i> Löschen</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                listElem.innerHTML = '<div class="alert alert-warning">Keine Benutzer gefunden.</div>';
            }
        }
    }
    // Lädt die Userdaten aus localStorage und setzt Kategorien, Fragen, Statistik
    loadUserData() {
        if (!this.currentUser || !this.users || !this.users[this.currentUser]) {
            this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
            this.questions = [];
            this.statistics = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };
            return;
        }
        const userObjStr = localStorage.getItem(`lernapp_user_${this.currentUser}`);
        if (userObjStr) {
            try {
                const userObj = JSON.parse(userObjStr);
                this.categories = Array.isArray(userObj.categories) ? userObj.categories : ['textfragen', 'bilderquiz', 'demo-ketegorie'];
                this.questions = Array.isArray(userObj.questions) ? userObj.questions : [];
                this.statistics = (userObj.statistics && typeof userObj.statistics === 'object') ? userObj.statistics : {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    categoriesPlayed: {},
                    lastPlayed: null
                };
                if (userObj.settings) this.users[this.currentUser].settings = userObj.settings;
                if (userObj.storage) this.users[this.currentUser].storage = userObj.storage;
            } catch (e) {
                this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
                this.questions = [];
                this.statistics = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    categoriesPlayed: {},
                    lastPlayed: null
                };
            }
        } else {
            this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
            this.questions = [];
            this.statistics = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoriesPlayed: {},
                lastPlayed: null
            };
        }
    }
    updateUIForLoginState() {
        console.log('[LernApp][DEBUG] updateUIForLoginState START:', {
            currentUser: this.currentUser,
            isDemo: this.isDemo,
            pathname: window.location.pathname,
            sessionStorage: Object.assign({}, sessionStorage)
        });
        // Gastmodus auf home.html, index.html und login.html erlauben
        const allowedGuestPages = ['home.html', 'index.html', 'login.html', '/'];
        const currentPath = window.location.pathname.split('/').pop() || '/';
        // --- NEU: Admin-Login-Flow auf admin.html ---
        if (currentPath === 'admin.html') {
            if (!sessionStorage.getItem('lernapp_admin_access')) {
                // Kein Admin eingeloggt: Modal anzeigen, kein Redirect
                this.showAdminLogin();
                // UI auf gesperrt setzen
                this.hideAdminInterface();
                return;
            } else {
                // Admin eingeloggt: Admin-UI anzeigen
                this.showAdminInterface();
                return;
            }
        }
        // --- ENDE NEU ---
        if (!this.currentUser && !this.isDemo) {
            if (allowedGuestPages.includes(currentPath)) {
                console.log('[LernApp][DEBUG] Kein User -> Gastmodus auf Start-/Loginseite erlaubt (KEIN Redirect)');
                return;
            }
            console.log('[LernApp][DEBUG] Kein User -> Redirect Login ausgelöst!', new Error().stack);
            window.location.href = 'login.html';
            return;
        }
        const userElements = document.querySelectorAll('.user-only');
        const guestElements = document.querySelectorAll('.guest-only');
        const adminNavItem = document.getElementById('admin-nav-item');
        if (sessionStorage.getItem('lernapp_admin_access')) {
            if (adminNavItem) adminNavItem.style.display = 'block';
        } else {
            if (adminNavItem) adminNavItem.style.display = 'none';
        }
        if (this.currentUser || this.isDemo) {
            userElements.forEach(el => el.style.display = 'block');
            guestElements.forEach(el => el.style.display = 'none');
            if (this.currentUser && !this.isDemo) {
                const userData = this.users[this.currentUser];
                if (userData) {
                    const currentUsernameElem = document.getElementById('current-username');
                    if (currentUsernameElem) currentUsernameElem.textContent = userData.displayName || this.currentUser;
                    let loginInfo = userData.lastLogin ? new Date(userData.lastLogin).toLocaleString('de-DE') : '-';
                    loginInfo += ` (Logins: ${userData.loginCount || 0})`;
                    const lastLoginElem = document.getElementById('last-login-time');
                    if (lastLoginElem) lastLoginElem.textContent = loginInfo;
                    const dashboardUsernameElem = document.getElementById('dashboard-username');
                    if (dashboardUsernameElem) dashboardUsernameElem.textContent = userData.displayName || this.currentUser;
                }
            } else if (this.isDemo) {
                document.getElementById('current-username').textContent = 'Demo-Modus';
                document.getElementById('dashboard-username').textContent = 'Demo-Benutzer';
            }
        } else {
            // Gastansicht: KEIN Redirect auf login.html, sondern Gast-Elemente anzeigen
            userElements.forEach(el => el.style.display = 'none');
            guestElements.forEach(el => el.style.display = 'block');
            console.log('[LernApp][Gastmodus] Gastansicht aktiv, kein Redirect auf login.html!');
        }
        // User-Login deaktivieren, wenn Admin eingeloggt ist
        this.disableUserLoginIfAdmin();
    }

    // Deaktiviert das User-Login-Formular, solange Admin eingeloggt ist
    disableUserLoginIfAdmin() {
        const loginForm = document.getElementById('login-form');
        const loginBtn = document.getElementById('login-btn');
        const adminInfo = document.getElementById('admin-login-info');
        const adminAlert = document.getElementById('admin-login-alert');
        if (sessionStorage.getItem('lernapp_admin_access')) {
            if (loginForm) loginForm.querySelectorAll('input,button').forEach(el => el.disabled = true);
            if (loginBtn) loginBtn.disabled = true;
            // Entferne die rote Alert-Meldung, falls vorhanden
            if (adminAlert) adminAlert.remove();
            // Zeige die gelbe Info mit Admin-Logout-Button
            if (!adminInfo && loginForm) {
                const infoDiv = document.createElement('div');
                infoDiv.id = 'admin-login-info';
                infoDiv.className = 'alert alert-warning mt-3';
                infoDiv.innerHTML = 'Admin ist eingeloggt. <button class="btn btn-danger btn-sm ms-2" onclick="window.app.logoutAdmin()">Admin abmelden</button>';
                loginForm.appendChild(infoDiv);
            }
        } else {
            if (loginForm) loginForm.querySelectorAll('input,button').forEach(el => el.disabled = false);
            if (loginBtn) loginBtn.disabled = false;
            if (adminInfo) adminInfo.remove();
        }
    }

    // Login und Registrierung werden jetzt über eigene Seiten abgewickelt

    async registerUser(event) {
        event.preventDefault();

        // Username und Felder holen
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
        const displayName = document.getElementById('register-display-name').value.trim();

        // 1. Userliste frisch laden
        await this.reloadUsersFromStorage();

        // Debug-Ausgaben: Userliste und localStorage vor dem Anlegen
        console.log('[LernApp][registerUser] users vor Validierung:', JSON.stringify(this.users));
        console.log('[LernApp][registerUser] localStorage vor Validierung:', Object.keys(localStorage).filter(k => k.includes(username)));

        // Validierung
        if (username.length < 3 || username.length > 20) {
            showAlert('Benutzername muss zwischen 3 und 20 Zeichen lang sein!', 'danger');
            return false;
        }
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            showAlert('Benutzername darf nur Buchstaben und Zahlen enthalten!', 'danger');
            return false;
        }
        if (password.length < 6) {
            showAlert('Passwort muss mindestens 6 Zeichen lang sein!', 'danger');
            return false;
        }
        if (password !== confirmPassword) {
            showAlert('Passwörter stimmen nicht überein!', 'danger');
            return false;
        }

        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            showAlert('Benutzername darf nur Buchstaben und Zahlen enthalten!', 'danger');
            return;
        }

        if (password.length < 6) {
            showAlert('Passwort muss mindestens 6 Zeichen lang sein!', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwörter stimmen nicht überein!', 'danger');
            return;
        }

        // 2. Altlasten entfernen: Nur den einzelnen Nutzer aus localStorage und Userliste entfernen
        // Vor dem Entfernen prüfen, ob der Nutzer wirklich existiert
        if (this.users[username]) {
            showAlert('Benutzername existiert bereits! Bitte wählen Sie einen anderen Namen.', 'danger');
            return false;
        }
        localStorage.removeItem(`lernapp_user_${username}`);

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
            categories: ['textfragen', 'bilderquiz', 'demo-ketegorie'],
            questions: []
        };
        this.users[username] = newUser;
        // Zentrales Userpaket im localStorage speichern
        localStorage.setItem(`lernapp_user_${username}`, JSON.stringify(newUser));
        await this.saveToStorage('users', this.users, true);
        // Debug-Ausgaben nach Anlegen
        console.log('[LernApp][registerUser] users nach Anlegen:', JSON.stringify(this.users));
        console.log('[LernApp][registerUser] localStorage nach Anlegen:', Object.keys(localStorage).filter(k => k.includes(username)));

        showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
        this.switchAuthMode('login');
        // Login-Formular leeren, dann Username setzen (nur falls Element existiert)
        const loginUserElem = document.getElementById('login-username');
        const loginPassElem = document.getElementById('login-password');
        if (loginUserElem) loginUserElem.value = '';
        if (loginPassElem) loginPassElem.value = '';
        setTimeout(() => {
            if (loginUserElem) loginUserElem.value = username;
        }, 50);
        return true;
    }

    async loginUser(event) {
        // Doppel-Login-Schutz: Wenn bereits eingeloggt, nicht erneut zählen
        if (this.currentUser && this.currentUser === document.getElementById('login-username').value.trim()) {
            // Nur auf der Login-Seite blockieren, aber keine Info-Bubble nach erfolgreichem Login anzeigen
            // Keine weitere Aktion nötig, da nach Login die Seite gewechselt wird
            return;
        }
        event.preventDefault();
        if (sessionStorage.getItem('lernapp_admin_access')) {
            showAlert('Solange der Admin eingeloggt ist, kann sich kein Nutzer anmelden.', 'danger');
            return;
        }
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        // Userliste vor Login frisch laden
        await this.reloadUsersFromStorage();
        // Prüfe, ob User in zentraler Userliste existiert
        if (!this.users[username]) {
            showAlert('Benutzername nicht gefunden!', 'danger');
            return;
        }
        const user = this.users[username];
        if (user.password !== this.hashPassword(password)) {
            showAlert('Falsches Passwort!', 'danger');
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
    showAlert(`Willkommen, ${user.displayName}!`, 'success');
        // Speicherort-Dialog nur beim ersten Login anzeigen
        if (firstLogin) {
            await this.showStorageLocationDialogIfNeeded();
        } else if (window.lernappCloudStorage && window.lernappCloudStorage.dirHandle == null && typeof window.lernappCloudStorage.loadDirHandle === 'function') {
            window.lernappCloudStorage.loadDirHandle();
        }
        // Nach allen UI-Updates: Navigation auf Ebene 0 (Startseite)
        sessionStorage.setItem('lernapp_last_page', 'quiz');
        sessionStorage.removeItem('lernapp_last_page_login'); // Sicherheit: alten Key entfernen, falls vorhanden
        setTimeout(() => {
            // Sicherheit: login als letzte Seite entfernen
            if (sessionStorage.getItem('lernapp_last_page') === 'login') {
                sessionStorage.setItem('lernapp_last_page', 'home');
            }
            console.log('[LernApp][DEBUG] Login erfolgreich, Weiterleitung zu dashboard.html', new Error().stack);
            window.location.href = 'dashboard.html';
        }, 0);
    }

    startDemoMode() {
        this.isDemo = true;
        this.currentUser = 'demo';
        sessionStorage.setItem('lernapp_demo_mode', 'true');
        sessionStorage.removeItem('lernapp_current_user');

        this.loadUserData();
        this.updateUIForLoginState();
        this.updateDashboard();
    showAlert('Demo-Modus gestartet! Ihre Daten werden nicht dauerhaft gespeichert.', 'info');
    }

    logoutUser(forceLogout = false) {
        // Alle Cookies löschen
        document.cookie.split(';').forEach(function(c) {
            document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
        });
        console.log('[LernApp][LOGCHAIN] Logout-Button geklickt');
        if (forceLogout || confirm('Möchten Sie sich wirklich abmelden?')) {
            console.log('[LernApp] Logout gestartet');
            this.currentUser = null;
            this.isDemo = false;
            sessionStorage.removeItem('lernapp_current_user');
            sessionStorage.removeItem('lernapp_demo_mode');
            sessionStorage.removeItem('lernapp_admin_access');
            // Logging: UI-Update für Gastansicht
            console.log('[LernApp] updateUIForLoginState() für Gastansicht nach Logout');
            this.updateUIForLoginState();
            console.log('[LernApp] SessionStorage nach Logout:', {
                currentUser: sessionStorage.getItem('lernapp_current_user'),
                demoMode: sessionStorage.getItem('lernapp_demo_mode'),
                adminAccess: sessionStorage.getItem('lernapp_admin_access')
            });
            if (forceLogout) {
                console.log('[LernApp][DEBUG] Force-Logout: Reload');
                location.reload();
            } else {
                showAlert('Erfolgreich abgemeldet! Sie sehen jetzt die Gastansicht.', 'success');
                console.log('[LernApp][DEBUG] Weiterleitung zu home.html in 600ms (Gastansicht)');
                setTimeout(function() {
                    console.log('[LernApp][DEBUG] [Logout] window.location.href = "home.html" ausgelöst (Gastansicht)', new Error().stack);
                    window.location.href = 'home.html';
                }, 600);
            }
        }
    }

    updateProfile(event) {
        event.preventDefault();
        
        if (this.isDemo) {
            showAlert('Im Demo-Modus können keine Profil-Änderungen vorgenommen werden!', 'warning');
            return;
        }

        const displayName = document.getElementById('profile-display-name').value.trim();
        const newPassword = document.getElementById('profile-new-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;

        if (newPassword && newPassword !== confirmPassword) {
            showAlert('Passwörter stimmen nicht überein!', 'danger');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            showAlert('Passwort muss mindestens 6 Zeichen lang sein!', 'danger');
            return;
        }

        // Profil aktualisieren
            const user = this.users[this.currentUser];
            user.displayName = displayName || user.username;
        
            if (newPassword) {
                user.password = this.hashPassword(newPassword);
            }
        
        if (newPassword) {
            user.password = this.hashPassword(newPassword);
        }

        this.users[this.currentUser] = user;
        this.saveToStorage('users', this.users, true);

        this.updateUIForLoginState();
    showAlert('Profil erfolgreich aktualisiert!', 'success');
        
        // Formular zurücksetzen
        document.getElementById('profile-new-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
    }



    // ==================== DATA SHARING ====================

    generateShareCode() {
        if (this.isDemo) {
            showAlert('Im Demo-Modus können keine Daten geteilt werden!', 'warning');
            return;
        }

        const shareCategories = document.getElementById('share-categories').checked;
        const shareQuestions = document.getElementById('share-questions').checked;

        if (!shareCategories && !shareQuestions) {
            showAlert('Bitte wählen Sie aus, was Sie teilen möchten!', 'warning');
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
            this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie', 'demo-fragen'];
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
                this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
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
                    this.categories = Array.isArray(userObj.categories) ? userObj.categories : ['textfragen', 'bilderquiz', 'demo-ketegorie'];
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
                    this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
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
                this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
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
        const dashboardCategoriesElem = document.getElementById('dashboard-categories');
        if (dashboardCategoriesElem) dashboardCategoriesElem.textContent = Array.isArray(this.categories) ? this.categories.length : 0;
        const dashboardQuestionsElem = document.getElementById('dashboard-questions');
        if (dashboardQuestionsElem) dashboardQuestionsElem.textContent = Array.isArray(this.questions) ? this.questions.length : 0;
        // Absicherung für Statistiken
        const categoriesPlayedObj = (this.statistics && typeof this.statistics === 'object' && this.statistics.categoriesPlayed && typeof this.statistics.categoriesPlayed === 'object') ? this.statistics.categoriesPlayed : {};
        const totalQuizzes = Object.values(categoriesPlayedObj)
            .reduce((sum, cat) => sum + (cat.gamesPlayed || 0), 0);
        const dashboardTotalPlayedElem = document.getElementById('dashboard-total-played');
        if (dashboardTotalPlayedElem) dashboardTotalPlayedElem.textContent = totalQuizzes;
        const successRate = this.statistics && this.statistics.totalQuestions > 0 ? 
            Math.round((this.statistics.correctAnswers / this.statistics.totalQuestions) * 100) : 0;
        const dashboardSuccessRateElem = document.getElementById('dashboard-success-rate');
        if (dashboardSuccessRateElem) dashboardSuccessRateElem.textContent = `${successRate}%`;
        // Sharing-Seite aktualisieren
        const myCategoriesCountElem = document.getElementById('my-categories-count');
        if (myCategoriesCountElem) myCategoriesCountElem.textContent = this.categories.length;
    const myQuestionsCountElem = document.getElementById('my-questions-count');
    if (myQuestionsCountElem) myQuestionsCountElem.textContent = this.questions.length;
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
        if (!Array.isArray(this.categories)) this.categories = [];
        const standardKategorien = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
        standardKategorien.forEach(kat => {
            if (!this.categories.includes(kat)) this.categories.unshift(kat);
        });
        // Admin-Navigationselemente anzeigen
        const adminNavItem = document.getElementById('admin-nav-item');
        if (adminNavItem) adminNavItem.style.display = 'block';
        const adminLogoutItem = document.getElementById('admin-logout-item');
        if (adminLogoutItem) adminLogoutItem.style.display = 'block';
        const adminLoginLink = document.getElementById('admin-login-link');
        if (adminLoginLink) adminLoginLink.style.display = 'none';
        // Admin-Seite entsperren
        const adminPage = document.getElementById('admin-page');
        if (adminPage) adminPage.classList.remove('locked');
        // User-Liste und Admin-Daten anzeigen
        if (typeof this.renderAdminUsersList === 'function') {
            this.renderAdminUsersList();
            const userDataElem = document.getElementById('admin-user-data');
            if (userDataElem) userDataElem.innerHTML = '';
        }
        // Kategorien und Fragen anzeigen
        this.renderCategories();
        this.renderCategoriesList();
        this.renderQuestionsList();
    }

    hideAdminInterface() {
        // Admin-Navigationselemente verstecken
        const adminNavItem = document.getElementById('admin-nav-item');
        if (adminNavItem) adminNavItem.style.display = 'none';
        const adminLogoutItem = document.getElementById('admin-logout-item');
        if (adminLogoutItem) adminLogoutItem.style.display = 'none';
        const adminLoginLink = document.getElementById('admin-login-link');
        if (adminLoginLink) adminLoginLink.style.display = 'block';
        // Admin-Seite sperren
        const adminPage = document.getElementById('admin-page');
        if (adminPage) adminPage.classList.add('locked');
        // User-Liste und Admin-Daten ausblenden
        const userDataElem = document.getElementById('admin-user-data');
        if (userDataElem) userDataElem.innerHTML = '';
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
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                // Direkt auf Admin-Seite umschalten (ohne weitere UI-Operationen dazwischen)
                window.location.href = 'admin.html';
            }, 350);
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
            window.location.href = 'home.html';
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
                this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
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
            this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
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

        // Admin-Login Button (NICHT mehr auf Home, nur noch Weiterleitung per href!)
        // safeAddEventListener('#admin-login-link, .admin-login-btn', 'click', (e) => {
        //     e.preventDefault();
        //     console.log('[LernApp][DEBUG] Admin-Login-Button geklickt:', e.target);
        //     this.showAdminLogin();
        // });

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
    async
    async loadFromStorage(key) {
        // Zentrale Storage-Utility nutzen
        try {
            if (window.storage && window.storage.load) {
                const data = await window.storage.load(key);
                if (data && typeof data === 'string') {
                    return JSON.parse(data);
                }
                return data;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Daten (Storage-Utility):', error);
        }
        // Fallback: localStorage (Klartext)
        try {
            const plainData = localStorage.getItem(`lernapp_${key}`);
            if (!plainData) return null;
            return JSON.parse(plainData);
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
        // Fallback: localStorage (Klartext)
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(`lernapp_${key}`, jsonData);
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
    // Keine gesperrten Kategorien mehr

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

    // Quiz-Logik: Akzeptiert (category) oder (main, groupPath)
    startQuiz(mainOrCategory, group) {
        // Flexible Parameter: (main, groupPath) oder (category)
        let mainCategory = null;
        let groupPath = null;
        if (group !== undefined) {
            mainCategory = mainOrCategory;
            groupPath = group;
        } else {
            mainCategory = null;
            groupPath = mainOrCategory;
        }

        // Logging
        console.log('[LernApp][startQuiz] mainCategory:', mainCategory, 'groupPath:', groupPath);

        // Fragen holen über questionManager
        let questions = [];
        if (mainCategory && groupPath) {
            // Gruppenpfad als String (z.B. "Unterkategorie 1>Quizfragengruppe 1")
            const groupPathArr = groupPath.split('>').map(s => s.trim());
            questions = questionManager.getQuestionsByGroupPath(mainCategory, groupPathArr);
        } else if (groupPath) {
            // Fallback: Nur Gruppe (wie bisher)
            questions = questionManager.getQuestionsByGroup(groupPath);
        } else {
            this.showAlert('Bitte wählen Sie eine Kategorie!', 'danger');
            return;
        }

        if (!questions || questions.length < 4) {
            this.showAlert('Diese Kategorie hat weniger als 4 Fragen! Bitte fügen Sie mehr Fragen hinzu.', 'warning');
            return;
        }

        // Quiz initialisieren
        this.currentQuiz = {
            questions: this.shuffleArray(questions).slice(0, 10), // Max 10 Fragen
            currentIndex: 0,
            score: 0,
            selectedCategory: mainCategory ? `${mainCategory} - ${groupPath}` : groupPath,
            answers: []
        };

        // Erste Frage vorbereiten
        const firstQuestion = this.currentQuiz.questions[0];
        const multipleChoiceQuestion = this.generateMultipleChoiceQuestion(firstQuestion, questions);
        if (!multipleChoiceQuestion) {
            this.showAlert('Nicht genügend Fragen für ein Quiz verfügbar!', 'danger');
            return;
        }
        this.currentQuiz.questions[0] = { ...firstQuestion, ...multipleChoiceQuestion };

        // Zur Quiz-Seite wechseln und Quiz-Container einblenden
    if (window.app && typeof window.app.goToAddress === 'function') window.app.goToAddress({ level: 0 });
        document.getElementById('category-selection').classList.add('d-none');
        document.getElementById('quiz-container').classList.remove('d-none');
        this.showQuestion();
    }

    // Generiert eine Multiple-Choice-Frage aus einer Frage/Antwort-Kombination
    generateMultipleChoiceQuestion(questionData, availableQuestions) {
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
        
    // Für normale Multiple-Choice-Quizzes
    const questionsPool = this.questions.filter(q => q.category === this.currentQuiz.selectedCategory);
    const multipleChoiceQuestion = this.generateMultipleChoiceQuestion(nextQuestion, questionsPool);
    this.currentQuiz.questions[this.currentQuiz.currentIndex] = { ...nextQuestion, ...multipleChoiceQuestion };
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
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffed[i]];
        }
        return shuffled;
    }


    // Sicherheitsfunktionen
    validateDataIntegrity() {
        // Kategorien validieren
        if (!Array.isArray(this.categories)) {
            console.warn('Kategorien-Daten beschädigt, setze Standardwerte');
            this.categories = ['textfragen', 'bilderquiz', 'demo-ketegorie'];
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

// ========== HILFSFUNKTIONEN ==========
// LernApp-Instanz global verfügbar machen
window.LernApp = new LernApp();
window.app = window.LernApp;
console.log('[LernApp][DEBUG] Admin-Login-Listener gesetzt');
