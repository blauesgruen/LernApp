// Zentrale Funktionen für die LernApp
// Einbindung: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
//             <script src="js/app-core.js"></script>

// 1. Supabase-Initialisierung
function initSupabase() {
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        window.showError('Supabase-Bibliothek nicht geladen! Bitte Script-Tag prüfen.');
        return;
    }
    window.supabaseClient = window.supabase.createClient(
        'https://yzyrvwmofyztwttgmyqn.supabase.co', // Supabase-Produktiv-URL
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6eXJ2d21vZnl6dHd0dGdteXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjA2ODUsImV4cCI6MjA3MzAzNjY4NX0.OaFPV0q-0mf2LO4dFd7FEd-vNzRjA1nJPnEXHM3WiXw' // Supabase-Produktiv-Anon-Key
    );
    console.log('Supabase-Client initialisiert.');
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}

// 2. Authentifizierungs-Funktionen
window.checkLoginAndRedirect = async function() {
    if (!window.supabaseClient) return;
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) {
        window.showError('Fehler beim Prüfen der Session: ' + error.message);
        return;
    }
    if (data?.session && data.session.user) {
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
    console.error(msg);
};
window.showSuccess = function(msg) {
    if (window.logger) window.logger.log(msg, 'success');
    if (window.notification && typeof window.notification.showSuccess === 'function') {
        window.notification.showSuccess(msg);
    } else {
        alert('Erfolg: ' + msg);
    }
    console.log(msg);
};
window.logInfo = function(msg) {
    if (window.logger) window.logger.log(msg, 'info');
    console.log(msg);
};
window.logDebug = function(msg) {
    if (window.logger) window.logger.log(msg, 'debug');
    console.debug(msg);
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
window.updateNavigation = async function() {
    if (!window.supabaseClient) return;
    const { data, error } = await window.supabaseClient.auth.getSession();
    const userButtons = document.getElementById('user-buttons');
    window.logConsole({ session: data?.session, userButtons }, 'info');
    if (userButtons) {
        userButtons.style.display = (data?.session && data.session.user) ? 'block' : 'none';
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
    };
}
