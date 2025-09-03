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
    // window.location.replace ist read-only, daher nicht überschreiben!
    const origReplace = window.location.replace.bind(window.location);
    window._debugReplace = function(url) {
        console.log('[LernApp][DEBUG] window.location.replace aufgerufen mit:', url, new Error().stack);
        origReplace(url);
    };
})();

import { cloudStorage } from './cloud-storage.js';

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
            // Modal einfügen
            if (!document.getElementById('storageLocationModal')) {
                const modalHtml = `
                <div class="modal fade" id="storageLocationModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="bi bi-hdd-network"></i> Speicherort wählen</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Wo sollen Ihre Daten gespeichert werden?</p>
                                <div class="d-grid gap-2">
                                    <button id="choose-local" class="btn btn-outline-secondary">Nur auf diesem Gerät (lokal)</button>
                                    <button id="choose-cloud" class="btn btn-outline-primary">Cloud/Netzwerk-Verzeichnis wählen</button>
                                </div>
                                <small class="text-muted d-block mt-3">Cloud: Wählen Sie z.B. ein Dropbox-, OneDrive- oder Netzlaufwerk-Verzeichnis. Ihre Daten werden als Datei gespeichert und können auf anderen Geräten genutzt werden.</small>
                            </div>
                        </div>
                    </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            }
            const modalElem = document.getElementById('storageLocationModal');
            const modal = new bootstrap.Modal(modalElem);
            modal.show();
            document.getElementById('choose-local').onclick = () => {
                modal.hide();
                resolve('local');
            };
            document.getElementById('choose-cloud').onclick = async () => {
                await app.enableCloudMode();
                modal.hide();
                resolve('cloud');
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
            window.showAlert('Benutzer nicht gefunden!', 'danger');
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
            window.showAlert('Benutzer nicht gefunden!', 'danger');
            return;
        }
        const newPassword = prompt(`Neues Passwort für "${username}" eingeben:`);
        if (!newPassword || newPassword.length < 6) {
            window.showAlert('Passwort muss mindestens 6 Zeichen lang sein!', 'danger');
            return;
        }
        this.users[username].password = this.hashPassword(newPassword);
        await this.saveToStorage('users', this.users, true);
        localStorage.setItem(`lernapp_user_${username}`, JSON.stringify(this.users[username]));
        window.showAlert(`Passwort für "${username}" wurde geändert.`, 'success');
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
        // Gastmodus auf home.html, index.html, login.html und register.html erlauben
        const allowedGuestPages = ['home.html', 'index.html', 'login.html', 'register.html', '/'];
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

    // Ergänzung im Profilbereich: Button für Cloud-Verzeichnis
    renderProfileCloudButton() {
        // Fügt im Profilbereich einen Button zum Cloud-Verzeichnis wählen/ändern ein
        const container = document.getElementById('profile-cloud-btn-container');
        if (!container) return;
        container.classList.add('mt-3'); // Abstand nach oben
        // Button + Verzeichnisanzeige
        let dirText = '';
        if (window.lernappCloudStorage && window.lernappCloudStorage.dirHandle && window.lernappCloudStorage.dirHandle.name) {
            dirText = `<div class="mt-2 text-muted small">Aktuelles Verzeichnis: <strong>${window.lernappCloudStorage.dirHandle.name}</strong></div>`;
        } else {
            dirText = `<div class="mt-2 text-muted small">Kein Cloud-Verzeichnis gewählt.</div>`;
        }
        container.innerHTML = `
            <button class="btn btn-outline-primary mb-2" id="profile-cloud-btn">
                <i class="bi bi-hdd-network"></i> Cloud-Verzeichnis wählen/ändern
            </button>
            ${dirText}
        `;
        document.getElementById('profile-cloud-btn').onclick = () => this.enableCloudMode();
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

        window.showAlert(`Import erfolgreich! ${importedCategories} Kategorien und ${importedQuestions} Fragen importiert.`, 'success');
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
            window.showAlert('Geteilter Inhalt gelöscht!', 'success');
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
            window.showAlert('Demo-Daten können nicht exportiert werden!', 'warning');
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

        window.showAlert('Daten erfolgreich exportiert!', 'success');
    }

    resetUserData() {
        if (this.isDemo) {
            window.showAlert('Demo-Daten können nicht zurückgesetzt werden!', 'warning');
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

                window.showAlert('Alle Daten wurden zurückgesetzt!', 'success');
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
        this.renderProfileCloudButton();

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
            window.showAlert('Fehler bei der Datenvalidierung. Daten werden zurückgesetzt.', 'warning');
            
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
        if (this.isCloudMode) {
            // Komplette Datenbank speichern
            const dbData = {
                categories: this.categories,
                questions: this.questions,
                statistics: this.statistics,
                users: this.users,
                currentUser: this.currentUser
            };
            try {
                await cloudStorage.saveData(dbData);
            } catch (e) {
                window.showAlert('Fehler beim Speichern im Cloud-Verzeichnis!', 'danger');
                console.error(e);
            }
            return;
        }
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
            window.showAlert('Fehler beim Speichern der Daten!', 'danger');
        }
    }

    // Methode zum Umschalten und Initialisieren des Cloud-Modus
    async enableCloudMode() {
        const dirHandle = await cloudStorage.chooseDirectory();
        if (dirHandle) {
            this.isCloudMode = true;
            window.lernappCloudStorage = window.lernappCloudStorage || {};
            window.lernappCloudStorage.dirHandle = dirHandle;
            window.showAlert('Cloud-Verzeichnis erfolgreich gewählt!', 'success');
            // Optional: Daten aus Cloud laden
            const cloudData = await cloudStorage.loadData();
            if (cloudData) {
                // Daten übernehmen
                this.categories = cloudData.categories || [];
                this.questions = cloudData.questions || [];
                this.statistics = cloudData.statistics || { totalQuestions: 0, correctAnswers: 0, categoriesPlayed: {}, lastPlayed: null };
                this.users = cloudData.users || {};
                this.currentUser = cloudData.currentUser || null;
                this.renderCategories();
                this.renderQuestionsList();
                this.renderStatistics();
            }
            // Anzeige aktualisieren
            this.renderProfileCloudButton();
        }
    }
}

// === PROFIL: Cloud-Verzeichnis Button-Container (für das Profil-Formular) ===
// Füge dieses Snippet in dein Profil-HTML ein, z.B. unterhalb des Profil-Formulars:
// <div id="profile-cloud-btn-container" class="mb-3"></div>
// Der Button wird automatisch von der App befüllt.

window.app = new LernApp();
