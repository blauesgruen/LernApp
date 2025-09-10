// profile.js
// Supabase-Profile-Management: Nickname, Passwort, Account, DB-Export/Import

// Header/Footer laden
async function loadHeaderAndFooter() {
    document.getElementById('header-container').innerHTML = await (await fetch('partials/header.html')).text();
    document.getElementById('footer-container').innerHTML = await (await fetch('partials/footer.html')).text();
}
loadHeaderAndFooter();

// Nickname laden und setzen
async function loadNickname() {
    const { data, error } = await window.supabase.auth.getUser();
    if (data?.user && data.user.user_metadata?.nickname) {
        document.getElementById('nickname').value = data.user.user_metadata.nickname;
    }
}

async function saveNickname() {
    const nickname = document.getElementById('nickname').value;
    if (!nickname || nickname.length < 2) {
        showError('Bitte geben Sie einen Nickname mit mindestens 2 Zeichen an!', 'nicknameMessage');
        return;
    }
    const { error } = await window.supabase.auth.updateUser({ data: { nickname } });
    if (error) {
        showError('Fehler beim Speichern: ' + error.message, 'nicknameMessage');
    } else {
        showSuccess('Nickname gespeichert!', 'nicknameMessage');
    }
}

document.getElementById('saveNickname').onclick = saveNickname;
loadNickname();

// User-Info im Profil anzeigen
async function showProfileUserInfo() {
    const { data } = await window.supabase.auth.getUser();
    document.getElementById('profile-user-nickname').textContent = 'Nickname: ' + (data?.user?.user_metadata?.nickname || '-');
    document.getElementById('profile-user-email').textContent = 'E-Mail: ' + (data?.user?.email || '-');
}
showProfileUserInfo();

// Datenbank löschen (alle eigenen Daten)
document.getElementById('deleteDb').onclick = async function() {
    const user = await window.supabase.auth.getUser();
    if (!user?.data?.user?.id) return showError('Nicht eingeloggt!', 'deleteDbMessage');
    // Beispiel: Lösche alle Fragen, Kategorien, Gruppen des Users
    let errorMsg = '';
    for (const table of ['questions', 'categories', 'groups']) {
        const { error } = await window.supabase.from(table).delete().eq('owner', user.data.user.id);
        if (error) errorMsg += table + ': ' + error.message + '\n';
    }
    if (errorMsg) showError('Fehler beim Löschen: ' + errorMsg, 'deleteDbMessage');
    else showSuccess('Datenbank erfolgreich gelöscht!', 'deleteDbMessage');
};

// Passwort ändern
document.getElementById('changePassword').onclick = async function() {
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordRepeat = document.getElementById('newPasswordRepeat').value;
    if (!newPassword || newPassword.length < 6) {
        showError('Mindestens 6 Zeichen!', 'passwordMessage');
        return;
    }
    if (newPassword !== newPasswordRepeat) {
        showError('Die Passwörter stimmen nicht überein!', 'passwordMessage');
        return;
    }
    const { error } = await window.supabase.auth.updateUser({ password: newPassword });
    if (error) showError('Fehler: ' + error.message, 'passwordMessage');
    else showSuccess('Passwort geändert!', 'passwordMessage');
};

// Account löschen
document.getElementById('deleteAccount').onclick = async function() {
    const user = await window.supabase.auth.getUser();
    if (!user?.data?.user?.id) return showError('Nicht eingeloggt!', 'deleteAccountMessage');
    // Supabase: Account löschen via Admin API (hier nur Logout und Hinweis)
    showError('Account-Löschung muss vom Admin durchgeführt werden.', 'deleteAccountMessage');
    await window.supabase.auth.signOut();
    window.location.href = 'index.html';
};

// Export DB (als JSON)
document.getElementById('exportDb').onclick = async function() {
    const user = await window.supabase.auth.getUser();
    if (!user?.data?.user?.id) return showError('Nicht eingeloggt!', 'importExportMessage');
    let exportData = {};
    for (const table of ['questions', 'categories', 'groups']) {
        const { data, error } = await window.supabase.from(table).select('*').eq('owner', user.data.user.id);
        if (error) return showError('Fehler: ' + error.message, 'importExportMessage');
        exportData[table] = data;
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lernapp-export.json';
    a.click();
    showSuccess('Export erfolgreich!', 'importExportMessage');
};

// Import DB (aus JSON)
document.getElementById('importDb').onclick = function() {
    document.getElementById('importDbFile').click();
};
document.getElementById('importDbFile').onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let importData;
    try { importData = JSON.parse(text); } catch { return showError('Ungültige Datei!', 'importExportMessage'); }
    const user = await window.supabase.auth.getUser();
    if (!user?.data?.user?.id) return showError('Nicht eingeloggt!', 'importExportMessage');
    let errorMsg = '';
    for (const table of ['questions', 'categories', 'groups']) {
        if (Array.isArray(importData[table])) {
            for (const row of importData[table]) {
                row.owner = user.data.user.id;
                const { error } = await window.supabase.from(table).upsert(row);
                if (error) errorMsg += table + ': ' + error.message + '\n';
            }
        }
    }
    if (errorMsg) showError('Fehler beim Import: ' + errorMsg, 'importExportMessage');
    else showSuccess('Import erfolgreich!', 'importExportMessage');
};

// Hilfsfunktionen für Meldungen
function showSuccess(msg, id) {
    const el = document.getElementById(id); if (el) { el.textContent = msg; el.style.color = 'green'; }
}
function showError(msg, id) {
    const el = document.getElementById(id); if (el) { el.textContent = msg; el.style.color = 'red'; }
}
