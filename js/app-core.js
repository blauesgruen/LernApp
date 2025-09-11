// Zentrale Funktionen für die LernApp
// Einbindung: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
//             <script src="js/app-core.js"></script>

// 1. Supabase-Initialisierung
// 0. Zentraler Logger (Fallback): stellt sicher, dass window.logConsole
// vor allen frühen Aufrufen existiert. Eine ausführlichere Implementierung
// weiter unten wurde entfernt, um Duplikate zu vermeiden.
if (typeof window.logConsole !== 'function') {
    window.logConsole = function(msg, type = 'log') {
        try {
            var output = (typeof msg === 'object') ? JSON.stringify(msg) : msg;
        } catch (e) {
            var output = msg;
        }
        switch(type) {
            case 'error': console.error(output); break;
            case 'warn': console.warn(output); break;
            case 'info': console.info(output); break;
            case 'debug': console.debug(output); break;
            default: console.log(output);
        }
    };
}

function initSupabase() {
    // If a client already exists on window, prefer it (backwards compatibility with pages that created a client inline)
    if (window.supabaseClient) {
        window.logConsole('Supabase client already present on window.supabaseClient; skipping init.', 'info');
        return;
    }
    // Some older pages placed the created client on window.supabase directly (overwriting the library).
    if (typeof window.supabase === 'object' && window.supabase !== null && typeof window.supabase.auth === 'object') {
        window.supabaseClient = window.supabase;
        window.logConsole('Detected existing supabase client assigned to window.supabase; using it as supabaseClient.', 'info');
        return;
    }

    // Ensure the Supabase library is available (has createClient)
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        window.showError('Supabase-Bibliothek nicht geladen! Bitte Script-Tag prüfen.');
        return;
    }

    // NOTE: Supabase credentials are embedded here by request.
    const url = 'https://yzyrvwmofyztwttgmyqn.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6eXJ2d21vZnl6dHd0dGdteXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjA2ODUsImV4cCI6MjA3MzAzNjY4NX0.OaFPV0q-0mf2LO4dFd7FEd-vNzRjA1nJPnEXHM3WiXw';
    try {
    window.supabaseClient = window.supabase.createClient(url, key);
    window.logConsole('Supabase-Client initialisiert.', 'info');
        // Backwards compatibility: some modules expect `window.supabase` to be the client
        // If `window.supabase.from` is not a function (i.e. `window.supabase` is the library),
        // point `window.supabase` to the initialized client so older calls work.
        try {
                if (typeof window.supabase.from !== 'function') {
                window.supabase = window.supabaseClient;
                window.logConsole('Supabase-Client als `window.supabase` gesetzt (Abwärtskompatibilität).', 'info');
            }
        } catch (compatErr) {
            // ignore
        }
    } catch (err) {
        window.showError('Fehler bei Supabase-Initialisierung: ' + err.message);
    }
}

// Storage-Adapter: zentrale Wrapper-API für localStorage (Fallback wenn kein spezifizierter Adapter vorhanden)
if (!window.storage) {
    window.storage = {
        getItem: function(k) { try { return localStorage.getItem(k); } catch(e) { console.warn('storage.getItem failed', e); return null; } },
        setItem: function(k,v) { try { localStorage.setItem(k,v); } catch(e) { console.warn('storage.setItem failed', e); } },
        removeItem: function(k) { try { localStorage.removeItem(k); } catch(e) { console.warn('storage.removeItem failed', e); } },
        // Convenience helpers
        isLoggedIn: function() { return this.getItem('loggedIn') === 'true'; },
        setLoggedIn: function(val) { this.setItem('loggedIn', val ? 'true' : 'false'); },
        getUsername: function() { return this.getItem('username'); },
        setUsername: function(name) { this.setItem('username', name); }
    };
    window.logConsole('storage adapter initialized (fallback to localStorage)', 'info');
}

// Globaler Helper: map client-friendly keys to canonical DB column names (snake_case)
// Wird von Modulen verwendet, die Payloads an Supabase senden.
window.mapToDb = function(table, obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        switch (k) {
            case 'categoryId': out['category_id'] = v; break;
            case 'groupId': out['group_id'] = v; break;
            case 'createdBy': out['created_by'] = v; break;
            case 'createdAt': out['created_at'] = v; break;
            case 'imageUrl': out['imageurl'] = v; break;
            case 'additionalInfo': out['additionalinfo'] = v; break;
            case 'owner': out['owner'] = v; break;
            case 'collaborators': out['collaborators'] = v; break;
            case 'name': out['name'] = v; break;
            case 'description': out['description'] = v; break;
            case 'id': out['id'] = v; break;
            default:
                out[k] = v;
        }
    }
    return out;
};

// Load header/footer central helper so pages can call it once
window.loadHeaderFooter = function() {
    // Guard: avoid loading header/footer multiple times
    if (window._headerFooterLoaded) return;
    window._headerFooterLoaded = true;
    const headerContainer = document.getElementById('header-container');
    const footerContainer = document.getElementById('footer-container');
    // Helper: build partial URL so the app works locally and under GitHub Pages
    function getPartialUrl(filename) {
        // If the site is hosted under /LernApp/ (GitHub Pages for this repo), prefix paths
        try {
            const p = window.location && window.location.pathname ? window.location.pathname : '';
            if (p.startsWith('/LernApp/')) return '/LernApp/partials/' + filename;
        } catch (e) {
            // ignore
        }
        return 'partials/' + filename;
    }

    if (headerContainer) {
        fetch(getPartialUrl('header.html')).then(r => r.text()).then(html => {
            headerContainer.innerHTML = html;
            if (window.updateNavigation) window.updateNavigation();
            if (window.breadcrumbs && typeof window.breadcrumbs.init === 'function') window.breadcrumbs.init();
        }).catch(err => window.logConsole('Failed to load header: ' + err, 'error'));
    }
    if (footerContainer) {
        fetch(getPartialUrl('footer.html')).then(r => r.text()).then(html => {
            footerContainer.innerHTML = html;
            if (window.initHeaderFooter) window.initHeaderFooter();
        }).catch(err => window.logConsole('Failed to load footer: ' + err, 'error'));
    }
};

// Auto-init on DOMContentLoaded: try to init Supabase and load header/footer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initSupabase();
        if (typeof window.loadHeaderFooter === 'function') window.loadHeaderFooter();
    });
} else {
    initSupabase();
    if (typeof window.loadHeaderFooter === 'function') window.loadHeaderFooter();
}

// 2. Authentifizierungs-Funktionen
window.checkLoginAndRedirect = function() {
    const isLoggedIn = (window.storage && typeof window.storage.isLoggedIn === 'function') ? window.storage.isLoggedIn() : (localStorage.getItem('loggedIn') === 'true');
    const username = (window.storage && typeof window.storage.getUsername === 'function') ? window.storage.getUsername() : localStorage.getItem('username');
    if (isLoggedIn && username) {
        window.location.href = 'dashboard.html';
    }
};
window.getCurrentUser = async function() {
    if (!window.supabaseClient) return null;
    const { data } = await window.supabaseClient.auth.getUser();
    return data?.user || null;
};
window.logoutUser = async function() {
    if (!window.supabaseClient) return;
    await window.supabaseClient.auth.signOut();
    if (window.storage && typeof window.storage.removeItem === 'function') { window.storage.removeItem('loggedIn'); window.storage.removeItem('username'); } else { localStorage.removeItem('loggedIn'); localStorage.removeItem('username'); }
    window.location.href = 'login.html';
};
window.login = async function(email, password) {
    if (!window.supabaseClient) {
        window.showError('Supabase-Client nicht initialisiert.');
        return;
    }
    if (!window.supabaseClient.auth || typeof window.supabaseClient.auth.signInWithPassword !== 'function') {
        window.showError('Supabase-Auth-API nicht verfügbar! Prüfe die Einbindung und Version des Supabase-Scripts.');
        return;
    }
    try {
        window.showLoading('Anmeldung...');
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        window.hideLoading();
        if (error) {
            window.showError('Login fehlgeschlagen: ' + error.message);
            return;
        }
        if (data?.user) {
            if (window.storage && typeof window.storage.setLoggedIn === 'function') { window.storage.setLoggedIn(true); } else { localStorage.setItem('loggedIn', 'true'); }
            if (window.storage && typeof window.storage.setUsername === 'function') { window.storage.setUsername(data.user.email); } else { localStorage.setItem('username', data.user.email); }
            window.showSuccess('Login erfolgreich!');
            window.logInfo('User eingeloggt: ' + data.user.email);
            window.location.href = 'dashboard.html';
        } else {
            window.showError('Login fehlgeschlagen: Keine Userdaten erhalten.');
        }
    } catch (err) {
        window.hideLoading();
        window.showError('Login-Fehler: ' + err.message);
    }
};

// 3. Notification/Logger
window.showError = function(msg) {
    if (window.logger) window.logger.log(msg, 'error');
    if (window.notification && typeof window.notification.showError === 'function') {
        window.notification.showError(msg);
    } else {
        alert('Fehler: ' + msg);
    }
    window.logConsole(msg, 'error');
};
window.showSuccess = function(msg) {
    if (window.logger) window.logger.log(msg, 'success');
    if (window.notification && typeof window.notification.showSuccess === 'function') {
        window.notification.showSuccess(msg);
    } else {
        alert('Erfolg: ' + msg);
    }
    window.logConsole(msg, 'info');
};
window.logInfo = function(msg) {
    if (window.logger) window.logger.log(msg, 'info');
    window.logConsole(msg, 'info');
};
window.logDebug = function(msg) {
    if (window.logger) window.logger.log(msg, 'debug');
    window.logConsole(msg, 'debug');
};

// 8. Zentrale Konsolen-Ausgabe
window.logConsole = function(msg, type = 'log') {
    switch(type) {
        case 'error':
            console.error(msg);
            break;
        case 'warn':
            console.warn(msg);
            break;
        case 'info':
            console.info(msg);
            break;
        case 'debug':
            console.debug(msg);
            break;
        default:
            console.log(msg);
    }
};

// 4. Storage-Status
window.updateStorageStatusIcon = function() {
    // Dummy-Implementierung
    const icon = document.getElementById('storage-status-icon');
    if (icon) {
        icon.className = 'fas fa-cloud';
        icon.title = 'Online';
    }
};

// 5. Navigation
window.updateNavigation = function() {
    const isLoggedIn = (window.storage && typeof window.storage.isLoggedIn === 'function') ? window.storage.isLoggedIn() : (localStorage.getItem('loggedIn') === 'true');
    const userButtons = document.getElementById('user-buttons');
    window.logConsole({ isLoggedIn, userButtons }, 'info');
    if (userButtons) {
        userButtons.style.display = isLoggedIn ? 'block' : 'none';
    }
    window.logConsole('Navigation aktualisiert.', 'info');
};

// 6. UI-Hilfsfunktionen
window.showLoading = function(msg = 'Laden...') {
    window.logConsole(msg, 'info');
};
window.hideLoading = function() {
    window.logConsole('Laden beendet.', 'info');
};

// 7. Header/Footer-Initialisierung
window.initHeaderFooter = function() {
    window.logConsole('Header und Footer initialisiert.', 'info');
};

// 9. Fragen/Kategorien zentrale Funktionen
window.loadCategories = async function() {
    // Beispiel: Lädt Kategorien aus Supabase
    if (!window.supabaseClient) {
        window.showError('Supabase-Client nicht initialisiert.');
        return [];
    }
    try {
        const { data, error } = await window.supabaseClient.from('categories').select('*');
        if (error) {
            window.showError('Fehler beim Laden der Kategorien: ' + error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        window.showError('Fehler beim Laden der Kategorien: ' + err.message);
        return [];
    }
};
window.loadCategories.displayName = 'loadCategories';
window.loadGroups = async function() {
    if (!window.supabaseClient) {
        window.showError('Supabase-Client nicht initialisiert.');
        return [];
    }
    try {
        const { data, error } = await window.supabaseClient.from('groups').select('*');
        if (error) {
            window.showError('Fehler beim Laden der Gruppen: ' + error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        window.showError('Fehler beim Laden der Gruppen: ' + err.message);
        return [];
    }
};
window.loadGroups.displayName = 'loadGroups';

// Zentrale Supabase-Client-Debugfunktion
if (window.checkSupabaseClient === undefined) {
    window.checkSupabaseClient = function() {
        // Prüft Supabase-Client und gibt Status nur in die Konsole aus
        if (typeof window.SupabaseClient === 'undefined' && typeof window.supabase === 'undefined') {
            window.showError('Supabase-Client ist nicht verfügbar! Bitte Script-Tag und Netzwerk prüfen.');
        } else {
        window.logConsole('Supabase-Client geladen!', 'info');
        }
        window.logConsole('window.SupabaseClient: ' + window.SupabaseClient, 'debug');
    window.logConsole('window.supabase: ' + JSON.stringify(window.supabase), 'debug');
    // mark as checked so pages won't call this repeatedly
    window._supabaseChecked = true;
    };
}
