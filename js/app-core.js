// Zentrale Funktionen für die LernApp
// Einbindung: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
//             <script src="js/app-core.js"></script>

// 1. Supabase-Initialisierung
if (!window.supabase) {
    window.supabase = supabase.createClient(
        'https://<your-project>.supabase.co', // TODO: Supabase-URL eintragen
        '<your-anon-key>' // TODO: Supabase-Anon-Key eintragen
    );
    console.log('Supabase-Client initialisiert.');
}

// 2. Authentifizierungs-Funktionen
window.checkLoginAndRedirect = function() {
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const username = localStorage.getItem('username');
    if (isLoggedIn && username) {
        window.location.href = 'dashboard.html';
    }
};
window.getCurrentUser = async function() {
    if (!window.supabase) return null;
    const { data } = await window.supabase.auth.getUser();
    return data?.user || null;
};
window.logoutUser = async function() {
    if (!window.supabase) return;
    await window.supabase.auth.signOut();
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
};

// 3. Notification/Logger
window.showError = function(msg) {
    alert('Fehler: ' + msg); // Ersetze durch notification.js für produktiv
    console.error(msg);
};
window.showSuccess = function(msg) {
    alert('Erfolg: ' + msg); // Ersetze durch notification.js für produktiv
    console.log(msg);
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
    // Dummy-Implementierung
    console.log('Navigation aktualisiert.');
};

// 6. UI-Hilfsfunktionen
window.showLoading = function(msg = 'Laden...') {
    // Dummy-Implementierung
    console.log(msg);
};
window.hideLoading = function() {
    // Dummy-Implementierung
    console.log('Laden beendet.');
};

// 7. Header/Footer-Initialisierung
window.initHeaderFooter = function() {
    // Dummy-Implementierung
    console.log('Header und Footer initialisiert.');
};
