// profile.js
// Supabase-Profile-Management: Nickname, Passwort, Account, DB-Export/Import


// Fragen-Export: imageurl wird ausgegeben
async function exportQuestions() {
    const user = await window.supabase.auth.getUser();
    const { data: questions, error } = await window.supabase
        .from('questions')
        .select('question, answer, additionalinfo, imageurl, group_id, owner, collaborators');
    if (error) {
        window.notification.show('Fehler beim Export: ' + error.message, 'error');
        return;
    }
    const exportData = questions.map(q => ({
        question: q.question,
        answer: q.answer,
        additionalInfo: q.additionalinfo,
        imageurl: q.imageurl,
        group_id: q.group_id,
        owner: q.owner,
        collaborators: q.collaborators
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-export.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Kategorien-Import: Nur Supabase-Schema-Felder übernehmen

// profile.js - Profil-spezifische Funktionen

/**
 * Löscht alle Statistikdaten des aktuellen Users aus Supabase
 */
window.deleteUserStats = async function() {
    try {
        if (!window.supabaseClient) throw new Error('Supabase-Client nicht initialisiert');
        const { data, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !data?.user?.id) throw new Error('Kein User angemeldet');
        const userId = data.user.id;
        // Tabelle 'statistics' muss existieren!
        const { error } = await window.supabaseClient
            .from('statistics')
            .delete()
            .eq('user_id', userId);
        if (error) throw error;
        if (window.showSuccess) window.showSuccess('Statistik erfolgreich gelöscht.');
        return true;
    } catch (err) {
        if (window.showError) window.showError('Fehler beim Löschen der Statistik: ' + err.message);
        return false;
    }
};

// Event Listener erst nach DOMContentLoaded setzen

document.addEventListener('DOMContentLoaded', async function() {
    // Statistik-Export
    if (document.getElementById('exportStats')) {
        document.getElementById('exportStats').onclick = async function() {
            const user = await window.getCurrentUser();
            const msg = document.getElementById('importExportMessage');
            if (!user?.id) {
                if (msg) msg.textContent = 'Nicht eingeloggt!';
                return;
            }
            const { data, error } = await window.supabaseClient.from('statistics').select('*').eq('user_id', user.id);
            if (error) {
                if (msg) msg.textContent = 'Fehler: ' + error.message;
                return;
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'lernapp-statistik-export.json';
            a.click();
            if (msg) msg.textContent = 'Statistik exportiert!';
        };
    }
    // Userdaten anzeigen
    const user = await window.getCurrentUser();
    if (user) {
        const nickname = user.user_metadata?.nickname || user.user_metadata?.display_name || '';
        const email = user.email || user.user_metadata?.email || '';
        if (document.getElementById('profile-user-nickname')) {
            document.getElementById('profile-user-nickname').textContent = nickname ? `Nickname: ${nickname}` : '';
        }
        if (document.getElementById('profile-user-email')) {
            document.getElementById('profile-user-email').textContent = email ? `E-Mail: ${email}` : '';
        }
    }

    // Export DB (als JSON)
    if (document.getElementById('exportDb')) {
        document.getElementById('exportDb').onclick = async function() {
            const user = await window.getCurrentUser();
            const msg = document.getElementById('importExportMessage');
            if (!user?.id) {
                if (msg) msg.textContent = 'Nicht eingeloggt!';
                return;
            }
            let exportData = {};
            for (const table of ['questions', 'categories', 'groups']) {
                const { data, error } = await window.supabaseClient.from(table).select('*').eq('owner', user.id);
                if (error) {
                    if (msg) msg.textContent = 'Fehler: ' + error.message;
                    return;
                }
                exportData[table] = data;
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'lernapp-export.json';
            a.click();
            if (msg) msg.textContent = 'Export erfolgreich!';
        };
    }

    // Import DB (aus JSON)
    if (document.getElementById('importDb')) {
        document.getElementById('importDb').onclick = function() {
            document.getElementById('importDbFile').click();
        };
        document.getElementById('importDbFile').onchange = async function(e) {
            const user = await window.getCurrentUser();
            const msg = document.getElementById('importExportMessage');
            if (!user?.id) {
                if (msg) msg.textContent = 'Nicht eingeloggt!';
                return;
            }
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            let importData;
            try { importData = JSON.parse(text); } catch {
                if (msg) msg.textContent = 'Ungültige Datei!';
                return;
            }
            let errorMsg = '';
            // Standard: { categories: [...], groups: [...], questions: [...] }
            for (const table of ['questions', 'categories', 'groups']) {
                if (Array.isArray(importData[table])) {
                    for (const row of importData[table]) {
                        // Nur erlaubte Felder übernehmen (Whitelist)
                        let filteredRow = {};
                        if (table === 'questions') {
                            const allowed = ['question', 'answer', 'additionalInfo', 'type', 'difficulty', 'tags'];
                            allowed.forEach(f => { if (row[f] !== undefined) filteredRow[f] = row[f]; });
                        } else if (table === 'categories') {
                            const allowed = ['name', 'description', 'color'];
                            allowed.forEach(f => { if (row[f] !== undefined) filteredRow[f] = row[f]; });
                        } else if (table === 'groups') {
                            const allowed = ['name', 'description', 'category_id'];
                            allowed.forEach(f => { if (row[f] !== undefined && row[f] !== '') filteredRow[f] = row[f]; });
                        }
                        filteredRow.owner = user.id;
                        // Map to canonical DB columns before upsert
                        function mapImportRowToDb(t, r) {
                            if (t === 'questions') {
                                return {
                                    question: r.question ?? r.text ?? null,
                                    answer: r.answer ?? null,
                                    additionalinfo: r.additionalInfo ?? r.additionalinfo ?? null,
                                    type: r.type ?? null,
                                    difficulty: r.difficulty ?? null,
                                    tags: r.tags ?? null,
                                    imageurl: r.imageurl ?? r.imageUrl ?? null,
                                    category_id: r.category_id ?? r.categoryId ?? null,
                                    owner: r.owner ?? null
                                };
                            }
                            if (t === 'groups') {
                                return {
                                    name: r.name ?? null,
                                    description: r.description ?? null,
                                    category_id: r.category_id ?? r.categoryId ?? null,
                                    owner: r.owner ?? null
                                };
                            }
                            // categories
                            return {
                                name: r.name ?? null,
                                description: r.description ?? null,
                                color: r.color ?? null,
                                owner: r.owner ?? null
                            };
                        }
                        const dbRow = mapImportRowToDb(table, filteredRow);
                        const { error } = await window.supabaseClient.from(table).upsert(window.mapToDb(table, dbRow));
                        if (error) errorMsg += table + ': ' + error.message + '\n';
                    }
                }
            }
            if (msg) msg.textContent = errorMsg ? 'Fehler beim Import: ' + errorMsg : 'Import erfolgreich!';
        };
    }
    // Zentrale Confirm-Dialog Funktion
    const confirmDialog = window.confirmDialog;

    // Statistik löschen
    const btnStats = document.getElementById('deleteStats');
    if (btnStats) {
        btnStats.addEventListener('click', async () => {
            const confirmed = await confirmDialog(
                'Statistik löschen',
                'Möchtest du wirklich deine Statistik unwiderruflich löschen?',
                'Ja, löschen',
                'Abbrechen'
            );
            if (!confirmed) return;
            btnStats.disabled = true;
            const msg = document.getElementById('deleteStatsMessage');
            if (msg) msg.textContent = 'Lösche Statistik...';
            const ok = await window.deleteUserStats ? window.deleteUserStats() : false;
            if (msg) msg.textContent = ok ? 'Statistik gelöscht.' : 'Fehler beim Löschen!';
            btnStats.disabled = false;
        });
    }

    // Datenbank löschen
    const btnDb = document.getElementById('deleteDb');
    if (btnDb) {
        btnDb.addEventListener('click', async () => {
            const confirmed = await confirmDialog(
                'Datenbank löschen',
                'Möchtest du wirklich deine gesamte Datenbank unwiderruflich löschen?',
                'Ja, löschen',
                'Abbrechen'
            );
            if (!confirmed) return;
            btnDb.disabled = true;
            const msg = document.getElementById('deleteDbMessage');
            if (msg) msg.textContent = 'Lösche Datenbank...';
            const ok = window.deleteUserDb ? await window.deleteUserDb() : false;
            if (msg) msg.textContent = ok ? 'Datenbank gelöscht.' : 'Fehler beim Löschen!';
            btnDb.disabled = false;
        });
    }

    // Account löschen
    const btnAcc = document.getElementById('deleteAccount');
    if (btnAcc) {
        btnAcc.addEventListener('click', async () => {
            const confirmed = await confirmDialog(
                'Account löschen',
                'Möchtest du wirklich deinen Account unwiderruflich löschen? Alle Daten werden entfernt.',
                'Ja, löschen',
                'Abbrechen'
            );
            if (!confirmed) return;
            btnAcc.disabled = true;
            const msg = document.getElementById('deleteAccountMessage');
            if (msg) msg.textContent = 'Lösche Account...';
            const ok = window.deleteUserAccount ? await window.deleteUserAccount() : false;
            if (msg) msg.textContent = ok ? 'Account gelöscht.' : 'Fehler beim Löschen!';
            btnAcc.disabled = false;
        });
    }

    // Nickname/Passwort ändern
    const btnSave = document.getElementById('saveNickname');
    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const nicknameInput = document.getElementById('nickname');
            const newPasswordInput = document.getElementById('newPassword');
            const newPasswordRepeatInput = document.getElementById('newPasswordRepeat');
            const nicknameMsg = document.getElementById('nicknameMessage');
            const passwordMsg = document.getElementById('passwordMessage');
            if (nicknameMsg) nicknameMsg.textContent = '';
            if (passwordMsg) passwordMsg.textContent = '';
            const user = await window.getCurrentUser();
            if (!user?.id) {
                if (nicknameMsg) nicknameMsg.textContent = 'Nicht eingeloggt!';
                return;
            }
            // Nickname ändern
            const nickname = nicknameInput.value.trim();
            if (nickname) {
                const { error } = await window.supabaseClient.auth.updateUser({ data: { nickname } });
                if (error) {
                    if (nicknameMsg) nicknameMsg.textContent = 'Fehler beim Ändern des Nicknames: ' + error.message;
                } else {
                    if (nicknameMsg) nicknameMsg.textContent = 'Nickname erfolgreich geändert!';
                    // UI aktualisieren
                    if (document.getElementById('profile-user-nickname')) {
                        document.getElementById('profile-user-nickname').textContent = `Nickname: ${nickname}`;
                    }
                }
            }
            // Passwort ändern
            const pw1 = newPasswordInput.value;
            const pw2 = newPasswordRepeatInput.value;
            if (pw1 || pw2) {
                if (pw1.length < 6) {
                    if (passwordMsg) passwordMsg.textContent = 'Passwort muss mindestens 6 Zeichen lang sein.';
                    return;
                }
                if (pw1 !== pw2) {
                    if (passwordMsg) passwordMsg.textContent = 'Passwörter stimmen nicht überein.';
                    return;
                }
                const { error } = await window.supabaseClient.auth.updateUser({ password: pw1 });
                if (error) {
                    if (passwordMsg) passwordMsg.textContent = 'Fehler beim Ändern des Passworts: ' + error.message;
                } else {
                    if (passwordMsg) passwordMsg.textContent = 'Passwort erfolgreich geändert!';
                    newPasswordInput.value = '';
                    newPasswordRepeatInput.value = '';
                }
            }
        });
    }
});
