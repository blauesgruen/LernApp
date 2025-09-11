// profile.js
// Supabase-Profile-Management: Nickname, Passwort, Account, DB-Export/Import

// Header/Footer: prefer central loader to avoid double-inits
(async function() {
    if (window.loadHeaderFooter) {
        try { await window.loadHeaderFooter(); } catch (e) { console.error('failed to load header/footer via central loader', e); }
    } else {
        // No central loader available; as a last resort, do nothing to avoid double-loading. 
        // (Previously we fetched partials here; central loader is preferred.)
    }
})();

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

// Kategorien für Dropdown laden
async function loadCategoryOptions() {
    const user = await window.supabase.auth.getUser();
    if (!user?.data?.user?.id) return;
    const { data, error } = await window.supabase.from('categories').select('id, name').eq('owner', user.data.user.id);
    var select = document.getElementById('importCategorySelect');
    if (!select) return;
    select.innerHTML = '';
    if (data) {
        data.forEach(function(cat) {
            var opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });
    }
}
if (document.getElementById('importCategorySelect')) loadCategoryOptions();

// Hilfsfunktion für UUID
function generateUUID() {
    // RFC4122 Version 4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// Gruppen-Import-Button
if (document.getElementById('importGroupsBtn')) {
    document.getElementById('importGroupsBtn').addEventListener('click', function() {
        var fileInput = document.getElementById('importGroupsFile');
        var statusDiv = document.getElementById('importGroupsStatus');
        var select = document.getElementById('importCategorySelect');
        if (!fileInput.files.length) {
            statusDiv.textContent = 'Bitte eine Gruppen-JSON auswählen.';
            return;
        }
        var categoryId = select.value;
        if (!categoryId) {
            statusDiv.textContent = 'Bitte eine Kategorie auswählen.';
            return;
        }
        Array.from(fileInput.files).forEach(function(file) {
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    const user = await window.supabase.auth.getUser();
                    let errorMsg = '';
                    let debugData = [];
                    for (const group of data) {
                        // Nur erlaubte Felder, keine leeren Werte, UUID generieren
                        let filteredGroup = {};
                        filteredGroup.id = generateUUID();
                        if (typeof group.name === 'string' && group.name.trim() !== '') filteredGroup.name = group.name.trim();
                        // description entfernt, da nicht im Supabase-Schema
                        filteredGroup.category_id = categoryId;
                        filteredGroup.owner = user.data.user.id;
                        debugData.push(JSON.parse(JSON.stringify(filteredGroup)));
                        // Nur wenn Name und Kategorie vorhanden sind, senden
                        if (filteredGroup.name && filteredGroup.category_id) {
                            const { error, data: supaResp } = await window.supabase.from('groups').upsert(filteredGroup);
                            if (error) {
                                errorMsg += error.message + '\n';
                                console.error('Supabase Error:', error, 'Gesendete Daten:', filteredGroup, 'Response:', supaResp);
                            } else {
                                console.log('Supabase Insert OK:', filteredGroup, 'Response:', supaResp);
                            }
                        } else {
                            console.warn('Gruppe übersprungen (fehlende Felder):', filteredGroup);
                        }
                    }
                    if (errorMsg) statusDiv.textContent = 'Fehler: ' + errorMsg + '\nDaten gesendet: ' + JSON.stringify(debugData, null, 2);
                    else statusDiv.textContent = 'Import erfolgreich!';
                } catch (err) {
                    statusDiv.textContent = 'Fehler beim Import: ' + file.name;
                    console.error('Import-Fehler:', err);
                }
            };
            reader.readAsText(file);
        });
    });
}
// Fragen-Import: Nur Supabase-Schema-Felder übernehmen
if (document.getElementById('importQuestionsBtn')) {
    document.getElementById('importQuestionsBtn').addEventListener('click', function() {
        var fileInput = document.getElementById('importQuestionsFile');
        var statusDiv = document.getElementById('importQuestionsStatus');
        if (!fileInput.files.length) {
            statusDiv.textContent = 'Bitte eine Fragen-JSON auswählen.';
            return;
        }
        Array.from(fileInput.files).forEach(function(file) {
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    const user = await window.supabase.auth.getUser();
                    let errorMsg = '';
                    let importedCount = 0;
                    let debugData = [];
                    const { data: groups } = await window.supabase
                        .from('groups')
                        .select('id, name')
                        .eq('owner', user.data.user.id);
                    for (const question of data) {
                        let filteredQuestionBase = {};
                        filteredQuestionBase.question = question.question;
                        filteredQuestionBase.answer = question.answer;
                        if (question.additionalInfo !== undefined) filteredQuestionBase.additionalinfo = question.additionalInfo;
                        if (question.imageurl !== undefined) filteredQuestionBase.imageurl = question.imageurl;
                        filteredQuestionBase.owner = user.data.user.id;
                        if (question.collaborators) filteredQuestionBase.collaborators = question.collaborators;
                        let foundGroups = [];
                        if (Array.isArray(question.tags) && question.tags.length > 0 && groups && groups.length > 0) {
                            for (const tag of question.tags) {
                                groups.forEach(g => {
                                    if (g.name === tag && !foundGroups.includes(g.id)) {
                                        foundGroups.push(g.id);
                                    }
                                });
                            }
                        }
                        if (foundGroups.length > 0) {
                            for (const groupId of foundGroups) {
                                let filteredQuestion = { ...filteredQuestionBase, group_id: groupId };
                                debugData.push(JSON.parse(JSON.stringify(filteredQuestion)));
                                const { error } = await window.supabase.from('questions').upsert(filteredQuestion);
                                if (error) {
                                    errorMsg += error.message + '\n';
                                    console.error('Supabase Error:', error, 'Gesendete Daten:', filteredQuestion);
                                } else {
                                    importedCount++;
                                }
                            }
                        } else {
                            errorMsg += 'Keine passende Gruppe für Frage: ' + (question.question || '-') + '\n';
                        }
                    }
                    if (errorMsg) statusDiv.textContent = 'Fehler/Übersprungen: ' + errorMsg + '\nImportiert: ' + importedCount + '\nGesendete Daten: ' + JSON.stringify(debugData, null, 2);
                    else statusDiv.textContent = 'Import erfolgreich! (' + importedCount + ' Fragen)';
                } catch (err) {
                    statusDiv.textContent = 'Fehler beim Import: ' + file.name;
                }
            };
            reader.readAsText(file);
        });
    });
}

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
if (document.getElementById('importCategoriesBtn')) {
    document.getElementById('importCategoriesBtn').addEventListener('click', function() {
        var fileInput = document.getElementById('importCategoriesFile');
        var statusDiv = document.getElementById('importCategoriesStatus');
        if (!fileInput.files.length) {
            statusDiv.textContent = 'Bitte eine Kategorien-JSON auswählen.';
            return;
        }
        Array.from(fileInput.files).forEach(function(file) {
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    const user = await window.supabase.auth.getUser();
                    let errorMsg = '';
                    let importedCount = 0;
                    for (const category of data) {
                        let filteredCategory = {};
                        filteredCategory.name = category.name;
                        if (category.description !== undefined) filteredCategory.description = category.description;
                        filteredCategory.owner = user.data.user.id;
                        if (category.collaborators) filteredCategory.collaborators = category.collaborators;
                        const { error } = await window.supabase.from('categories').upsert(filteredCategory);
                        if (error) {
                            errorMsg += error.message + '\n';
                        } else {
                            importedCount++;
                        }
                    }
                    if (errorMsg) statusDiv.textContent = 'Fehler: ' + errorMsg + '\nImportiert: ' + importedCount;
                    else statusDiv.textContent = 'Import erfolgreich! (' + importedCount + ' Kategorien)';
                } catch (err) {
                    statusDiv.textContent = 'Fehler beim Import: ' + file.name;
                }
            };
            reader.readAsText(file);
        });
    });
}
