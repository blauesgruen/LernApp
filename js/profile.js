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

// Nickname speichern und in Supabase als display_name aktualisieren
const saveNicknameBtn = document.getElementById('saveNickname');
saveNicknameBtn.addEventListener('click', async function() {
    const nicknameInput = document.getElementById('nickname');
    const nickname = nicknameInput.value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordRepeat = document.getElementById('newPasswordRepeat').value;
    let message = '';
    let success = true;
    // Nickname ändern
    if (nickname) {
        const { error } = await supabase.auth.updateUser({ data: { display_name: nickname } });
        if (error) {
            message += 'Fehler beim Nickname: ' + error.message + '\n';
            success = false;
        } else {
            document.getElementById('profile-user-nickname').textContent = 'Nickname: ' + nickname;
        }
    }
    // Passwort ändern
    if (newPassword || newPasswordRepeat) {
        if (!newPassword || newPassword.length < 6) {
            message += 'Mindestens 6 Zeichen für das Passwort!\n';
            success = false;
        } else if (newPassword !== newPasswordRepeat) {
            message += 'Die Passwörter stimmen nicht überein!\n';
            success = false;
        } else {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                message += 'Fehler beim Passwort: ' + error.message + '\n';
                success = false;
            } else {
                message += 'Passwort geändert.\n';
            }
        }
    }
    if (success) {
        document.getElementById('nicknameMessage').textContent = 'Änderungen erfolgreich gespeichert.';
        document.getElementById('nicknameMessage').style.color = 'green';
        document.getElementById('passwordMessage').textContent = '';
    } else {
        document.getElementById('nicknameMessage').textContent = message.trim();
        document.getElementById('nicknameMessage').style.color = 'red';
        document.getElementById('passwordMessage').textContent = '';
    }
});
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
    // Standard: { categories: [...], groups: [...], questions: [...] }
    for (const table of ['questions', 'categories', 'groups']) {
        if (Array.isArray(importData[table])) {
            for (const row of importData[table]) {
                // Nur erlaubte Felder übernehmen (Whitelist)
                let filteredRow = {};
                if (table === 'questions') {
                    // Erlaubte Felder für Fragen
                    const allowed = ['question', 'answer', 'additionalInfo', 'type', 'difficulty', 'tags'];
                    allowed.forEach(f => { if (row[f] !== undefined) filteredRow[f] = row[f]; });
                } else if (table === 'categories') {
                    // Erlaubte Felder für Kategorien
                    const allowed = ['name', 'description', 'color'];
                    allowed.forEach(f => { if (row[f] !== undefined) filteredRow[f] = row[f]; });
                } else if (table === 'groups') {
                    // Erlaubte Felder für Gruppen
                    const allowed = ['name', 'description', 'category_id'];
                    allowed.forEach(f => {
                        if (row[f] !== undefined && row[f] !== '') filteredRow[f] = row[f];
                    });
                }
                // Pflichtfelder ergänzen
                filteredRow.owner = user.data.user.id;
                // category_id ggf. ergänzen (bei Gruppen/Fragen, falls vorhanden)
                if (table === 'groups' && row.category_id) filteredRow.category_id = row.category_id;
                if (table === 'questions' && row.category_id) filteredRow.category_id = row.category_id;
                const { error } = await window.supabase.from(table).upsert(filteredRow);
                if (error) errorMsg += table + ': ' + error.message + '\n';
            }
        }
    }
    // Erweiterung: reine Array-Importe
    if (Array.isArray(importData)) {
        // Kategorien-Array: Enthält name, aber KEIN question/answer/category_id
        if (
            importData[0]?.name &&
            !importData[0]?.question &&
            !importData[0]?.answer &&
            !importData[0]?.category_id
        ) {
            for (const row of importData) {
                let filteredRow = {};
                const allowed = ['name', 'description', 'color'];
                allowed.forEach(f => { if (row[f] !== undefined) filteredRow[f] = row[f]; });
                filteredRow.owner = user.data.user.id;
                const { error } = await window.supabase.from('categories').upsert(filteredRow);
                if (error) errorMsg += 'categories: ' + error.message + '\n';
            }
        }
        // Gruppen-Array: Enthält name UND category_id, aber KEIN question/answer
        else if (
            importData[0]?.name &&
            importData[0]?.category_id &&
            !importData[0]?.question &&
            !importData[0]?.answer
        ) {
            for (const row of importData) {
                let filteredRow = {};
                const allowed = ['name', 'description', 'category_id'];
                allowed.forEach(f => { if (row[f] !== undefined && row[f] !== '') filteredRow[f] = row[f]; });
                filteredRow.owner = user.data.user.id;
                const { error } = await window.supabase.from('groups').upsert(filteredRow);
                if (error) errorMsg += 'groups: ' + error.message + '\n';
            }
        }
        // Fragen-Array: Enthält question UND answer
        else if (
            importData[0]?.question &&
            importData[0]?.answer
        ) {
            for (const row of importData) {
                let filteredRow = {};
                const allowed = ['question', 'answer', 'additionalInfo', 'type', 'difficulty', 'tags'];
                allowed.forEach(f => { if (row[f] !== undefined) filteredRow[f] = row[f]; });
                filteredRow.owner = user.data.user.id;
                if (row.category_id) filteredRow.category_id = row.category_id;
                const { error } = await window.supabase.from('questions').upsert(filteredRow);
                if (error) errorMsg += 'questions: ' + error.message + '\n';
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
