// profile.js - Handhabt die Profilverwaltung

// Hilfsfunktion für konsistentes Logging in der gesamten Datei
function logMessage(message, type = 'info', ...args) {
    if (window.logger) {
        window.logger.log(message, type, ...args);
    } else if (window.logMessage) {
        window.logMessage(message, type, ...args);
    } else {
        if (type === 'error') {
            console.error(message, ...args);
        } else if (type === 'warn') {
            console.warn(message, ...args);
        } else {
            console.log(message, ...args);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Elemente für Benutzername
    const usernameDisplay = document.getElementById('username-display');
    const newUsernameInput = document.getElementById('new-username');
    const updateUsernameBtn = document.getElementById('update-username-btn');

    // Elemente für Passwort
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const changePasswordBtn = document.getElementById('change-password-btn');

    // Elemente für Speicherort
    const currentStoragePathSpan = document.getElementById('current-storage-path');
    const browseStoragePathBtn = document.getElementById('browse-storage-path-btn');
    const resetStoragePathBtn = document.getElementById('reset-storage-path-btn');
    const migrateStorageBtn = document.getElementById('migrate-storage-btn');

    // Elemente für Backup
    const createBackupBtn = document.getElementById('create-backup-btn');
    const listBackupsBtn = document.getElementById('list-backups-btn');

    // Elemente für Löschaktionen
    const deleteQuestionsBtn = document.getElementById('delete-questions-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteCategoriesBtn = document.getElementById('delete-categories-btn');
    const deleteGroupsBtn = document.getElementById('delete-groups-btn');

    // Elemente für Modals
    const deleteQuestionsModal = document.getElementById('delete-questions-modal');
    const deleteAccountModal = document.getElementById('delete-account-modal');
    const deleteCategoriesModal = document.getElementById('delete-categories-modal');
    const deleteGroupsModal = document.getElementById('delete-groups-modal');
    const migrateStorageModal = document.getElementById('migrate-storage-modal');
    const backupModal = document.getElementById('backup-modal');
    const backupsListModal = document.getElementById('backups-list-modal');
    
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    // Buttons für Modals
    const cancelDeleteQuestions = document.getElementById('cancel-delete-questions');
    const confirmDeleteQuestions = document.getElementById('confirm-delete-questions');
    const cancelDeleteAccount = document.getElementById('cancel-delete-account');
    const confirmDeleteAccount = document.getElementById('confirm-delete-account');
    const cancelDeleteCategories = document.getElementById('cancel-delete-categories');
    const confirmDeleteCategories = document.getElementById('confirm-delete-categories');
    const cancelDeleteGroups = document.getElementById('cancel-delete-groups');
    const confirmDeleteGroups = document.getElementById('confirm-delete-groups');
    const cancelMigrateStorage = document.getElementById('cancel-migrate-storage');
    const confirmMigrateStorage = document.getElementById('confirm-migrate-storage');
    const cancelBackup = document.getElementById('cancel-backup');
    const confirmBackup = document.getElementById('confirm-backup');
    const closeBackupsList = document.getElementById('close-backups-list');
    const cleanupOldBackups = document.getElementById('cleanup-old-backups');
    
    // Fortschrittsanzeigen
    const migrationProgress = document.getElementById('migration-progress');
    const migrationProgressBar = document.getElementById('migration-progress-bar');
    const migrationStatus = document.getElementById('migration-status');
    const backupProgress = document.getElementById('backup-progress');
    const backupProgressBar = document.getElementById('backup-progress-bar');
    const backupStatus = document.getElementById('backup-status');
    const backupsListContainer = document.getElementById('backups-list-container');

    // Aktuelle Benutzerdaten laden
    const currentUsername = localStorage.getItem('username');
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const currentUser = users.find(user => user.username === currentUsername);

    // Benutzername anzeigen
    if (currentUsername) {
        usernameDisplay.textContent = currentUsername;
    } else {
        // Nicht eingeloggt - zurück zur Login-Seite
        window.location.href = 'login.html';
    }

    // Aktuellen Speicherpfad anzeigen, falls vorhanden
    function updateStoragePathDisplay() {
        if (window.isStoragePathConfigured && window.getStoragePath) {
            const currentUsername = localStorage.getItem('username');
            if (window.isStoragePathConfigured(currentUsername)) {
                // Verwenden der neuen Funktion zur benutzerfreundlichen Anzeige des Speicherorts
                let displayPath = 'Standard';
                
                if (window.getStorageDisplayName) {
                    // Die neue Funktion verwenden, wenn verfügbar
                    displayPath = window.getStorageDisplayName(currentUsername);
                } else {
                    // Fallback zur alten Methode
                    let path = window.getStoragePath(currentUsername);
                    if (path !== null && path !== undefined) {
                        displayPath = String(path);
                    }
                }
                
                currentStoragePathSpan.textContent = displayPath;
            } else {
                currentStoragePathSpan.textContent = 'Standard';
            }
        } else {
            // Fehlermeldung anzeigen und in den Log schreiben
            console.error("Speicherpfad-Funktionen nicht verfügbar.");
            currentStoragePathSpan.textContent = 'Nicht verfügbar';
        }
    }
    
    // Initialen Speicherpfad anzeigen
    updateStoragePathDisplay();

    // Benutzernamen aktualisieren
    if (updateUsernameBtn) {
        updateUsernameBtn.addEventListener('click', async function() {
            const newUsername = newUsernameInput.value.trim();
            
            if (!newUsername) {
                showError('Bitte gib einen neuen Benutzernamen ein.');
                return;
            }

            // Überprüfen, ob der Benutzername bereits existiert
            if (users.some(user => user.username.toLowerCase() === newUsername.toLowerCase() && user.username !== currentUsername)) {
                showError('Dieser Benutzername ist bereits vergeben.');
                return;
            }

            // Benutzernamen aktualisieren
            if (currentUser) {
                try {
                    // Speichern des alten Usernamens zum Aktualisieren aller relevanten Daten
                    const oldUsername = currentUser.username;
                    
                    // Benutzernamen im Benutzerobjekt und localStorage aktualisieren
                    currentUser.username = newUsername;
                    localStorage.setItem('users', JSON.stringify(users));
                    localStorage.setItem('username', newUsername);
                    usernameDisplay.textContent = newUsername;
                    
                    // Alle anderen Datenstrukturen aktualisieren, die den Benutzernamen verwenden
                    // Synchronisiere auch die users.json mit dem neuen Benutzernamen
                    try {
                        const storedUsers = await window.loadData('users.json', users);
                        const userIndex = storedUsers.findIndex(u => u.username === oldUsername);
                        if (userIndex !== -1) {
                            storedUsers[userIndex].username = newUsername;
                            await window.saveData('users.json', storedUsers);
                        }
                    } catch (error) {
                        // Warnung anzeigen aber fortfahren (wird automatisch auch geloggt)
                        showWarning(`Benutzer in users.json konnten nicht aktualisiert werden: ${error.message}`);
                    }
                    
                    // Überprüfen, ob die Storage-API verfügbar ist
                    if (window.loadData && window.saveData) {
                        // Quizstatistiken aktualisieren (aus dem konfigurierten Speicherort)
                        const stats = await window.loadData('statistics.json', {});
                        if (stats[oldUsername]) {
                            stats[newUsername] = stats[oldUsername];
                            delete stats[oldUsername];
                            await window.saveData('statistics.json', stats);
                        }
                        
                        // Fragen aktualisieren, die vom Benutzer erstellt wurden (aus dem konfigurierten Speicherort)
                        const questions = await window.loadData('questions.json', []);
                        let questionsUpdated = false;
                        for (const question of questions) {
                            if (question.createdBy === oldUsername) {
                                question.createdBy = newUsername;
                                questionsUpdated = true;
                            }
                        }
                        if (questionsUpdated) {
                            await window.saveData('questions.json', questions);
                        }
                        
                        // Kategorien aktualisieren, die vom Benutzer erstellt wurden (aus dem konfigurierten Speicherort)
                        const categories = await window.loadData('categories.json', []);
                        let categoriesUpdated = false;
                        for (const category of categories) {
                            if (category.createdBy === oldUsername) {
                                category.createdBy = newUsername;
                                categoriesUpdated = true;
                            }
                        }
                        if (categoriesUpdated) {
                            await window.saveData('categories.json', categories);
                        }
                        
                        // Gruppen aktualisieren, die vom Benutzer erstellt wurden
                        const groups = await window.loadData('groups.json', []);
                        let groupsUpdated = false;
                        for (const group of groups) {
                            if (group.createdBy === oldUsername) {
                                group.createdBy = newUsername;
                                groupsUpdated = true;
                            }
                        }
                        if (groupsUpdated) {
                            await window.saveData('groups.json', groups);
                        }
                    } else {
                        // Fallback auf localStorage, wenn Storage-API nicht verfügbar ist
                        // Quizstatistiken aktualisieren
                        const stats = JSON.parse(localStorage.getItem('statistics')) || {};
                        if (stats[oldUsername]) {
                            stats[newUsername] = stats[oldUsername];
                            delete stats[oldUsername];
                            localStorage.setItem('statistics', JSON.stringify(stats));
                        }
                        
                        // Fragen aktualisieren, die vom Benutzer erstellt wurden
                        const questions = JSON.parse(localStorage.getItem('questions')) || [];
                        for (const question of questions) {
                            if (question.createdBy === oldUsername) {
                                question.createdBy = newUsername;
                            }
                        }
                        localStorage.setItem('questions', JSON.stringify(questions));
                        
                        // Kategorien aktualisieren, die vom Benutzer erstellt wurden
                        const categories = JSON.parse(localStorage.getItem('categories')) || [];
                        for (const category of categories) {
                            if (category.createdBy === oldUsername) {
                                category.createdBy = newUsername;
                            }
                        }
                        localStorage.setItem('categories', JSON.stringify(categories));
                        
                        // Gruppen aktualisieren, die vom Benutzer erstellt wurden
                        const groups = JSON.parse(localStorage.getItem('groups')) || [];
                        for (const group of groups) {
                            if (group.createdBy === oldUsername) {
                                group.createdBy = newUsername;
                            }
                        }
                        localStorage.setItem('groups', JSON.stringify(groups));
                    }
                    
                    showSuccess('Dein Benutzername wurde erfolgreich aktualisiert!');
                    newUsernameInput.value = '';
                } catch (error) {
                    // Fehler anzeigen, aber mitteilen, dass die Grundfunktion geklappt hat
                    showWarning('Dein Benutzername wurde aktualisiert, aber einige Daten konnten nicht vollständig aktualisiert werden.');
                }
            } else {
                showError('Benutzer nicht gefunden.');
            }
        });
    }

    // Der "Speicherort setzen"-Button wurde entfernt, da wir jetzt nur den Browse-Button verwenden

    // Ordner-Auswahl-Dialog öffnen
    if (browseStoragePathBtn) {
        browseStoragePathBtn.addEventListener('click', async function() {
            // Prüfen, ob die File System Access API unterstützt wird
            if (!window.isFileSystemAccessSupported || !window.isFileSystemAccessSupported()) {
                showError('Dein Browser unterstützt leider nicht die Auswahl von Ordnern. Diese Funktion ist nicht verfügbar.');
                return;
            }

            try {
                // Setzen des expliziten Flags für den Directory Picker
                window._forceDirectoryPicker = true;
                
                // Ordner-Auswahl-Dialog öffnen
                let directoryHandle;
                try {
                    directoryHandle = await window.openDirectoryPicker();
                } catch (dialogError) {
                    if (dialogError.name === 'AbortError') {
                        // Der Benutzer hat den Dialog abgebrochen - das ist kein Fehler
                        showInfo('Ordnerauswahl wurde abgebrochen.');
                        return;
                    }
                    throw dialogError; // Andere Fehler werden weitergegeben
                }
                
                if (!directoryHandle) {
                    showError('Kein Ordner ausgewählt.');
                    return;
                }
                
                // Prüfen, ob wir ein gültiges DirectoryHandle haben
                if (!directoryHandle || typeof directoryHandle !== 'object') {
                    showError('Ungültiges Verzeichnis ausgewählt. Bitte versuchen Sie es erneut.');
                    return;
                }
                
                // Pfad und Handle für den Speicherort vorbereiten
                const directoryName = directoryHandle.name || 
                                      (directoryHandle.toString ? directoryHandle.toString() : 'LernAppDatenbank');
                
                // Debug-Log für das DirectoryHandle-Objekt
                logMessage('Verzeichnis ausgewählt: ' + JSON.stringify({
                    name: directoryHandle.name,
                    kind: directoryHandle.kind
                }));
                
                try {
                    // Speicherpfad aktualisieren
                    const currentUsername = localStorage.getItem('username');
                    
                    // Wir übergeben direkt das DirectoryHandle an setStoragePath
                    const success = await window.setStoragePath(directoryHandle, currentUsername);
                    
                    if (success) {
                        // Handle wurde erfolgreich aktualisiert, alle Flags zurücksetzen
                        localStorage.removeItem('needsHandleRenewal');
                        // Zurücksetzen des Benachrichtigungszählers
                        localStorage.setItem('directoryNotificationCount', '0');
                        
                        // UI aktualisieren
                        updateStoragePathDisplay();
                        
                        // Zusätzliche Erfolgsmeldung mit dem tatsächlich gespeicherten Pfad
                        const gespeicherterPfad = window.getStoragePath(currentUsername);
                        showSuccess(`Speicherort "${gespeicherterPfad}" wurde erfolgreich konfiguriert und der Dateizugriff ist jetzt vollständig hergestellt.`);
                        
                        // Die Datenbankdateien wurden bereits in der setStoragePath-Funktion initialisiert
                        // Kein weiterer Aufruf von createInitialDatabaseFiles nötig
                        logMessage('Speicherort wurde erfolgreich konfiguriert.', 'info');
                    } else {
                        showError('Der Speicherort konnte nicht gesetzt werden. Bitte wählen Sie einen anderen Ordner.');
                    }
                } catch (error) {
                    logMessage('Fehler beim Setzen des Speicherorts: ' + error.message, 'error');
                    showError('Fehler beim Setzen des Speicherorts: ' + error.message);
                }
            } catch (error) {
                // Benutzer hat den Dialog abgebrochen oder es ist ein Fehler aufgetreten
                if (error.name === 'AbortError') {
                    // Nur Info-Meldung, kein Fehler
                    showInfo('Ordnerauswahl wurde abgebrochen.');
                } else {
                    // Fehler anzeigen (wird automatisch auch geloggt)
                    showError(`Fehler beim Öffnen des Ordner-Auswahl-Dialogs: ${error.message}`);
                }
            } finally {
                // Immer das Flag zurücksetzen
                window._forceDirectoryPicker = false;
            }
        });
    }

    // Speicherpfad zurücksetzen
    if (resetStoragePathBtn && window.resetStoragePath) {
        resetStoragePathBtn.addEventListener('click', async function() {
            const currentUsername = localStorage.getItem('username');
            const success = await window.resetStoragePath(currentUsername);
            
            if (success) {
                updateStoragePathDisplay();
                showSuccess('Speicherpfad wurde auf den Standardwert zurückgesetzt.');
            } else {
                showError('Fehler beim Zurücksetzen des Speicherpfads.');
            }
        });
    }

    // Passwort ändern
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async function() {
            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showError('Bitte fülle alle Passwortfelder aus.');
                return;
            }

            if (newPassword !== confirmPassword) {
                showError('Die neuen Passwörter stimmen nicht überein.');
                return;
            }

            // Aktuelles Passwort prüfen
            if (window.hashPassword) {
                const hashedCurrentPassword = await window.hashPassword(currentPassword);
                
                if (currentUser && currentUser.password === hashedCurrentPassword) {
                    // Passwort aktualisieren
                    const hashedNewPassword = await window.hashPassword(newPassword);
                    currentUser.password = hashedNewPassword;
                    localStorage.setItem('users', JSON.stringify(users));
                    
                    showSuccess('Dein Passwort wurde erfolgreich geändert!');
                    
                    // Passwortfelder zurücksetzen
                    currentPasswordInput.value = '';
                    newPasswordInput.value = '';
                    confirmPasswordInput.value = '';
                } else {
                    showError('Das aktuelle Passwort ist falsch.');
                }
            } else {
                showError('Passwort-Hashing-Funktion ist nicht verfügbar.');
            }
        });
    }

    // Daten in neuen Ordner verschieben
    if (migrateStorageBtn && window.migrateStorage) {
        migrateStorageBtn.addEventListener('click', function() {
            migrateStorageModal.style.display = 'block';
        });
    }

    // Daten-Migration abbrechen
    if (cancelMigrateStorage) {
        cancelMigrateStorage.addEventListener('click', function() {
            migrateStorageModal.style.display = 'none';
            // Zurücksetzen des Fortschrittsbalkens
            migrationProgress.style.display = 'none';
            migrationProgressBar.style.width = '0%';
            migrationStatus.textContent = 'Vorbereitung...';
        });
    }

    // Daten-Migration bestätigen und Zielordner auswählen
    if (confirmMigrateStorage) {
        confirmMigrateStorage.addEventListener('click', async function() {
            try {
                // Prüfen, ob die File System Access API unterstützt wird
                if (!window.isFileSystemAccessSupported || !window.isFileSystemAccessSupported()) {
                    showError('Dein Browser unterstützt leider nicht die Auswahl von Ordnern. Diese Funktion ist nicht verfügbar.');
                    return;
                }

                // Ordner-Auswahl-Dialog öffnen
                let result;
                
                // Setzen des expliziten Flags für den Directory Picker
                window._forceDirectoryPicker = true;
                
                try {
                    result = await window.openDirectoryPicker();
                } catch (dialogError) {
                    if (dialogError.name === 'AbortError') {
                        // Der Benutzer hat den Dialog abgebrochen - das ist kein Fehler
                        showInfo('Ordnerauswahl wurde abgebrochen.');
                        return;
                    }
                    throw dialogError; // Andere Fehler werden weitergegeben
                }
                
                if (!result || !result.handle) {
                    showError('Kein Zielordner ausgewählt.');
                    return;
                }
                
                const newDirectoryHandle = result.handle;
                const currentUsername = localStorage.getItem('username');
                
                // UI für Fortschritt anzeigen
                migrationProgress.style.display = 'block';
                confirmMigrateStorage.disabled = true;
                cancelMigrateStorage.disabled = true;
                
                // Migration starten
                migrationStatus.textContent = 'Migration wird gestartet...';
                migrationProgressBar.style.width = '10%';
                
                try {
                    // Migrationsprozess durchführen
                    const migrationResult = await window.migrateStorage(newDirectoryHandle, currentUsername);
                    
                    // Fortschrittsbalken aktualisieren
                    migrationProgressBar.style.width = '100%';
                    
                    if (migrationResult.failed > 0) {
                        migrationStatus.textContent = `Migration abgeschlossen: ${migrationResult.migrated} von ${migrationResult.total} Dateien erfolgreich migriert. ${migrationResult.failed} Dateien fehlgeschlagen.`;
                        showWarning(`Daten wurden teilweise migriert. ${migrationResult.migrated} von ${migrationResult.total} Dateien wurden erfolgreich migriert.`);
                    } else {
                        migrationStatus.textContent = `Migration erfolgreich: Alle ${migrationResult.migrated} Dateien wurden migriert.`;
                        showSuccess(`Alle Daten wurden erfolgreich in den neuen Ordner "${result.path}" verschoben.`);
                    }
                    
                    // Anzeige des aktuellen Speicherorts aktualisieren
                    updateStoragePathDisplay();
                    
                    // Modal nach kurzer Verzögerung schließen
                    setTimeout(function() {
                        migrateStorageModal.style.display = 'none';
                        // Zurücksetzen des Fortschrittsbalkens
                        migrationProgress.style.display = 'none';
                        migrationProgressBar.style.width = '0%';
                        migrationStatus.textContent = 'Vorbereitung...';
                        confirmMigrateStorage.disabled = false;
                        cancelMigrateStorage.disabled = false;
                    }, 3000);
                    
                } catch (error) {
                    // Fehler anzeigen (wird automatisch auch geloggt)
                    migrationStatus.textContent = `Fehler bei der Migration: ${error.message}`;
                    migrationProgressBar.style.width = '0%';
                    showError(`Fehler bei der Migration: ${error.message}`);
                    
                    // Buttons wieder aktivieren
                    confirmMigrateStorage.disabled = false;
                    cancelMigrateStorage.disabled = false;
                }
                
            } catch (error) {
                // Benutzer hat den Dialog abgebrochen oder es ist ein Fehler aufgetreten
                if (error.name === 'AbortError') {
                    // Nur Info-Meldung, kein Fehler
                    showInfo('Ordnerauswahl wurde abgebrochen.');
                } else {
                    // Fehler anzeigen (wird automatisch auch geloggt)
                    showError(`Fehler beim Öffnen des Ordner-Auswahl-Dialogs: ${error.message}`);
                }
                
                // Fortschrittsanzeige zurücksetzen
                migrationProgress.style.display = 'none';
                migrationProgressBar.style.width = '0%';
                migrationStatus.textContent = 'Vorbereitung...';
            }
        });
    }

    // Modal für Fragenlöschung öffnen
    if (deleteQuestionsBtn) {
        deleteQuestionsBtn.addEventListener('click', function() {
            deleteQuestionsModal.style.display = 'block';
        });
    }

    // Modal für Kategorien löschen öffnen
    if (deleteCategoriesBtn) {
        deleteCategoriesBtn.addEventListener('click', function() {
            deleteCategoriesModal.style.display = 'block';
        });
    }
    
    // Modal für Gruppen löschen öffnen
    if (deleteGroupsBtn) {
        deleteGroupsBtn.addEventListener('click', function() {
            deleteGroupsModal.style.display = 'block';
        });
    }

    // Modal für Kontolöschung öffnen
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            deleteAccountModal.style.display = 'block';
        });
    }

    // Modals schließen (X-Button)
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            deleteQuestionsModal.style.display = 'none';
            deleteAccountModal.style.display = 'none';
            deleteCategoriesModal.style.display = 'none';
            deleteGroupsModal.style.display = 'none';
            migrateStorageModal.style.display = 'none';
            backupModal.style.display = 'none';
            backupsListModal.style.display = 'none';
            
            // Zurücksetzen des Migrations-Fortschrittsbalkens
            if (migrationProgress) {
                migrationProgress.style.display = 'none';
                migrationProgressBar.style.width = '0%';
                migrationStatus.textContent = 'Vorbereitung...';
                confirmMigrateStorage.disabled = false;
                cancelMigrateStorage.disabled = false;
            }
            
            // Zurücksetzen des Backup-Fortschrittsbalkens
            if (backupProgress) {
                backupProgress.style.display = 'none';
                backupProgressBar.style.width = '0%';
                backupStatus.textContent = 'Vorbereitung...';
            }
        });
    });

    // Fragen löschen abbrechen
    if (cancelDeleteQuestions) {
        cancelDeleteQuestions.addEventListener('click', function() {
            deleteQuestionsModal.style.display = 'none';
        });
    }

    // Kategorien löschen abbrechen
    if (cancelDeleteCategories) {
        cancelDeleteCategories.addEventListener('click', function() {
            deleteCategoriesModal.style.display = 'none';
        });
    }
    
    // Gruppen löschen abbrechen
    if (cancelDeleteGroups) {
        cancelDeleteGroups.addEventListener('click', function() {
            deleteGroupsModal.style.display = 'none';
        });
    }

    // Konto löschen abbrechen
    if (cancelDeleteAccount) {
        cancelDeleteAccount.addEventListener('click', function() {
            deleteAccountModal.style.display = 'none';
        });
    }

    // Fragen löschen bestätigen
    if (confirmDeleteQuestions) {
        confirmDeleteQuestions.addEventListener('click', async function() {
            try {
                // Erst ein Backup erstellen bevor Daten gelöscht werden
                if (window.directoryHandle && window.createFileBackup) {
                    try {
                        await window.createFileBackup(window.directoryHandle, 'questions.json', await window.loadData('questions.json', []));
                        logMessage('Backup der Fragen vor dem Löschen erstellt', 'info');
                    } catch (backupError) {
                        logMessage(`Fehler beim Erstellen des Backups: ${backupError.message}`, 'warn');
                        // Fehler beim Backup blockiert nicht das Löschen
                    }
                }
                
                // Alle Fragen über die Storage-API laden, um den konfigurierten Speicherort zu berücksichtigen
                const questions = await window.loadData('questions.json', []);
                
                // Nur die Fragen behalten, die nicht von diesem Benutzer erstellt wurden
                const updatedQuestions = questions.filter(q => q.createdBy !== currentUsername);
                
                // Aktualisierte Fragenliste über die Storage-API speichern
                const success = await window.saveData('questions.json', updatedQuestions);
                
                deleteQuestionsModal.style.display = 'none';
                
                if (success) {
                    showSuccess('Alle deine Fragen wurden erfolgreich gelöscht!');
                } else {
                    showError('Beim Löschen der Fragen ist ein Fehler aufgetreten.');
                }
            } catch (error) {
                // Fehler anzeigen (wird automatisch auch geloggt)
                showError(`Fehler beim Löschen der Fragen: ${error.message}`);
                deleteQuestionsModal.style.display = 'none';
            }
        });
    }
    
    // Kategorien löschen bestätigen
    if (confirmDeleteCategories) {
        confirmDeleteCategories.addEventListener('click', async function() {
            try {
                // Erst ein Backup erstellen bevor Daten gelöscht werden
                if (window.directoryHandle && window.createFileBackup) {
                    try {
                        await window.createFileBackup(window.directoryHandle, 'categories.json', await window.loadData('categories.json', []));
                        logMessage('Backup der Kategorien vor dem Löschen erstellt', 'info');
                    } catch (backupError) {
                        logMessage(`Fehler beim Erstellen des Backups: ${backupError.message}`, 'warn');
                        // Fehler beim Backup blockiert nicht das Löschen
                    }
                }
                
                // Alle Kategorien über die Storage-API laden
                const categories = await window.loadData('categories.json', []);
                
                // Nur die Kategorien behalten, die nicht von diesem Benutzer erstellt wurden
                const updatedCategories = categories.filter(c => c.createdBy !== currentUsername);
                
                // Aktualisierte Kategorieliste über die Storage-API speichern
                const success = await window.saveData('categories.json', updatedCategories);
                
                deleteCategoriesModal.style.display = 'none';
                
                if (success) {
                    showSuccess('Alle deine Kategorien wurden erfolgreich gelöscht!');
                } else {
                    showError('Beim Löschen der Kategorien ist ein Fehler aufgetreten.');
                }
            } catch (error) {
                // Fehler anzeigen (wird automatisch auch geloggt)
                showError(`Fehler beim Löschen der Kategorien: ${error.message}`);
                deleteCategoriesModal.style.display = 'none';
            }
        });
    }
    
    // Gruppen löschen bestätigen
    if (confirmDeleteGroups) {
        confirmDeleteGroups.addEventListener('click', async function() {
            try {
                // Erst ein Backup erstellen bevor Daten gelöscht werden
                if (window.directoryHandle && window.createFileBackup) {
                    try {
                        await window.createFileBackup(window.directoryHandle, 'groups.json', await window.loadData('groups.json', []));
                        logMessage('Backup der Gruppen vor dem Löschen erstellt', 'info');
                    } catch (backupError) {
                        logMessage(`Fehler beim Erstellen des Backups: ${backupError.message}`, 'warn');
                        // Fehler beim Backup blockiert nicht das Löschen
                    }
                }
                
                // Alle Gruppen über die Storage-API laden
                const groups = await window.loadData('groups.json', []);
                
                // Nur die Gruppen behalten, die nicht von diesem Benutzer erstellt wurden
                const updatedGroups = groups.filter(g => g.createdBy !== currentUsername);
                
                // Aktualisierte Gruppenliste über die Storage-API speichern
                const success = await window.saveData('groups.json', updatedGroups);
                
                deleteGroupsModal.style.display = 'none';
                
                if (success) {
                    showSuccess('Alle deine Gruppen wurden erfolgreich gelöscht!');
                } else {
                    showError('Beim Löschen der Gruppen ist ein Fehler aufgetreten.');
                }
            } catch (error) {
                // Fehler anzeigen (wird automatisch auch geloggt)
                showError(`Fehler beim Löschen der Gruppen: ${error.message}`);
                deleteGroupsModal.style.display = 'none';
            }
        });
    }

    // Konto löschen bestätigen
    if (confirmDeleteAccount) {
        confirmDeleteAccount.addEventListener('click', async function() {
            try {
                // Benutzer aus der Liste entfernen
                const updatedUsers = users.filter(user => user.username !== currentUsername);
                
                // Sowohl in localStorage als auch im Storage-System speichern
                localStorage.setItem('users', JSON.stringify(updatedUsers));
                await window.saveData('users.json', updatedUsers);
                
                // Fragen des Benutzers löschen
                const questions = await window.loadData('questions.json', []);
                const updatedQuestions = questions.filter(q => q.createdBy !== currentUsername);
                await window.saveData('questions.json', updatedQuestions);
                
                // Statistiken des Benutzers löschen
                const stats = await window.loadData('statistics.json', {});
                if (stats[currentUsername]) {
                    delete stats[currentUsername];
                    await window.saveData('statistics.json', stats);
                }
                
                // Abmelden
                localStorage.removeItem('username');
                localStorage.setItem('loggedIn', 'false');
                
                // Zurück zur Startseite
                showSuccess('Dein Konto wurde erfolgreich gelöscht.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } catch (error) {
                // Fehler anzeigen (wird automatisch auch geloggt)
                showError(`Fehler beim Löschen des Kontos: ${error.message}`);
                deleteAccountModal.style.display = 'none';
            }
        });
    }

    // Schließe Modals, wenn außerhalb geklickt wird
    window.addEventListener('click', function(event) {
        if (event.target === deleteQuestionsModal) {
            deleteQuestionsModal.style.display = 'none';
        }
        if (event.target === deleteAccountModal) {
            deleteAccountModal.style.display = 'none';
        }
        if (event.target === deleteCategoriesModal) {
            deleteCategoriesModal.style.display = 'none';
        }
        if (event.target === deleteGroupsModal) {
            deleteGroupsModal.style.display = 'none';
        }
        if (event.target === migrateStorageModal) {
            migrateStorageModal.style.display = 'none';
        }
        if (event.target === backupModal) {
            backupModal.style.display = 'none';
        }
        if (event.target === backupsListModal) {
            backupsListModal.style.display = 'none';
        }
    });
    
    // Backup-Funktionalität
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', function() {
            // Modal anzeigen
            backupModal.style.display = 'block';
            
            // Zurücksetzen der Fortschrittsanzeige
            backupProgress.style.display = 'none';
            backupProgressBar.style.width = '0%';
            backupStatus.textContent = 'Vorbereitung...';
            
            // Buttons einblenden
            confirmBackup.style.display = 'inline-block';
            cancelBackup.style.display = 'inline-block';
        });
    }
    
    // Backup-Bestätigung
    if (confirmBackup) {
        confirmBackup.addEventListener('click', async function() {
            try {
                // Fortschrittsanzeige einblenden
                backupProgress.style.display = 'block';
                
                // Buttons ausblenden während des Backups
                confirmBackup.style.display = 'none';
                cancelBackup.style.display = 'none';
                
                // Fortschritt anzeigen
                backupProgressBar.style.width = '10%';
                backupStatus.textContent = 'Prüfe Dateisystem-Zugriff...';
                
                // DirectoryHandle prüfen
                let directoryHandle = window.directoryHandle;
                
                if (!directoryHandle) {
                    if (window.getDirectoryHandle) {
                        directoryHandle = await window.getDirectoryHandle();
                    }
                }
                
                if (!directoryHandle) {
                    throw new Error('Kein Dateisystem-Zugriff verfügbar. Bitte wähle zuerst einen Speicherort aus.');
                }
                
                // Fortschritt aktualisieren
                backupProgressBar.style.width = '30%';
                backupStatus.textContent = 'Erstelle Backup-Verzeichnis...';
                
                // Backup-Verzeichnis erstellen (über den Backup-Manager)
                if (!window.backupManager) {
                    throw new Error('Backup-Manager nicht verfügbar.');
                }
                
                // Fortschritt aktualisieren
                backupProgressBar.style.width = '50%';
                backupStatus.textContent = 'Erstelle vollständiges Backup...';
                
                // Vollständiges Backup erstellen
                const currentUsername = localStorage.getItem('username');
                const backupResult = await window.backupManager.createFullBackup(directoryHandle, currentUsername);
                
                // Fortschritt abschließen
                backupProgressBar.style.width = '100%';
                backupStatus.textContent = `Backup abgeschlossen: ${backupResult.backupName} (${backupResult.backedUpFiles.length} Dateien)`;
                
                // Erfolgsmeldung anzeigen
                if (window.showSuccess) {
                    window.showSuccess(`Backup erfolgreich erstellt: ${backupResult.backupName}`);
                }
                
                // Nach 2 Sekunden Modal schließen
                setTimeout(() => {
                    backupModal.style.display = 'none';
                }, 2000);
                
            } catch (error) {
                logMessage(`Fehler beim Erstellen des Backups: ${error.message}`, 'error');
                
                // Fehlermeldung im Modal anzeigen
                backupStatus.textContent = `Fehler: ${error.message}`;
                backupProgressBar.style.width = '0%';
                
                // Fehlermeldung anzeigen
                if (window.showError) {
                    window.showError(`Backup fehlgeschlagen: ${error.message}`);
                }
                
                // Abbrechen-Button wieder einblenden
                cancelBackup.style.display = 'inline-block';
            }
        });
    }
    
    // Backup abbrechen
    if (cancelBackup) {
        cancelBackup.addEventListener('click', function() {
            backupModal.style.display = 'none';
        });
    }
    
    // Backup-Liste anzeigen
    if (listBackupsBtn) {
        listBackupsBtn.addEventListener('click', async function() {
            try {
                // Container zurücksetzen
                backupsListContainer.innerHTML = '<p>Lade Backups...</p>';
                
                // Modal anzeigen
                backupsListModal.style.display = 'block';
                
                // DirectoryHandle prüfen
                let directoryHandle = window.directoryHandle;
                
                if (!directoryHandle) {
                    if (window.getDirectoryHandle) {
                        directoryHandle = await window.getDirectoryHandle();
                    }
                }
                
                if (!directoryHandle) {
                    backupsListContainer.innerHTML = '<p class="error-message">Kein Dateisystem-Zugriff verfügbar. Bitte wähle zuerst einen Speicherort aus.</p>';
                    return;
                }
                
                // Backup-Manager prüfen
                if (!window.backupManager) {
                    backupsListContainer.innerHTML = '<p class="error-message">Backup-Manager nicht verfügbar.</p>';
                    return;
                }
                
                // Backups auflisten
                const backups = await window.backupManager.listBackups(directoryHandle);
                
                if (backups.length === 0) {
                    backupsListContainer.innerHTML = '<p>Keine Backups gefunden.</p>';
                    return;
                }
                
                // HTML für die Backup-Liste erstellen
                let backupsHTML = '<div class="backups-list">';
                backupsHTML += '<table class="backup-table">';
                backupsHTML += '<thead><tr><th>Datum</th><th>Name</th><th>Dateien</th><th>Benutzer</th><th>Status</th></tr></thead>';
                backupsHTML += '<tbody>';
                
                for (const backup of backups) {
                    const date = new Date(backup.timestamp);
                    const formattedDate = date.toLocaleString();
                    
                    backupsHTML += `<tr>
                        <td>${formattedDate}</td>
                        <td>${backup.name}</td>
                        <td>${backup.files}</td>
                        <td>${backup.username}</td>
                        <td>${backup.status}</td>
                    </tr>`;
                }
                
                backupsHTML += '</tbody></table></div>';
                
                // HTML in den Container einfügen
                backupsListContainer.innerHTML = backupsHTML;
                
            } catch (error) {
                logMessage(`Fehler beim Auflisten der Backups: ${error.message}`, 'error');
                backupsListContainer.innerHTML = `<p class="error-message">Fehler: ${error.message}</p>`;
                
                if (window.showError) {
                    window.showError(`Fehler beim Auflisten der Backups: ${error.message}`);
                }
            }
        });
    }
    
    // Backups-Liste schließen
    if (closeBackupsList) {
        closeBackupsList.addEventListener('click', function() {
            backupsListModal.style.display = 'none';
        });
    }
    
    // Alte Backups bereinigen
    if (cleanupOldBackups) {
        cleanupOldBackups.addEventListener('click', async function() {
            try {
                // Bestätigungsdialog anzeigen
                if (!confirm('Möchtest du alte Backups (älter als 30 Tage) wirklich löschen? Es werden mindestens 5 neuere Backups behalten.')) {
                    return;
                }
                
                // DirectoryHandle prüfen
                let directoryHandle = window.directoryHandle;
                
                if (!directoryHandle) {
                    if (window.getDirectoryHandle) {
                        directoryHandle = await window.getDirectoryHandle();
                    }
                }
                
                if (!directoryHandle) {
                    throw new Error('Kein Dateisystem-Zugriff verfügbar.');
                }
                
                // Backup-Manager prüfen
                if (!window.backupManager) {
                    throw new Error('Backup-Manager nicht verfügbar.');
                }
                
                // Alte Backups bereinigen
                const deletedBackups = await window.backupManager.cleanupOldBackups(directoryHandle, 30, 5);
                
                // Erfolgsmeldung anzeigen
                if (window.showSuccess) {
                    window.showSuccess(`${deletedBackups.length} alte Backups wurden gelöscht.`);
                }
                
                // Backup-Liste aktualisieren
                await listBackupsBtn.click();
                
            } catch (error) {
                logMessage(`Fehler bei der Backup-Bereinigung: ${error.message}`, 'error');
                
                if (window.showError) {
                    window.showError(`Backup-Bereinigung fehlgeschlagen: ${error.message}`);
                }
            }
        });
    }
});
