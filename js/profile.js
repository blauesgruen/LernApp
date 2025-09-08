// profile.js - Handhabt die Profilverwaltung

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

    // Elemente für Löschaktionen
    const deleteQuestionsBtn = document.getElementById('delete-questions-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    // Elemente für Modals
    const deleteQuestionsModal = document.getElementById('delete-questions-modal');
    const deleteAccountModal = document.getElementById('delete-account-modal');
    const migrateStorageModal = document.getElementById('migrate-storage-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const cancelDeleteQuestions = document.getElementById('cancel-delete-questions');
    const confirmDeleteQuestions = document.getElementById('confirm-delete-questions');
    const cancelDeleteAccount = document.getElementById('cancel-delete-account');
    const confirmDeleteAccount = document.getElementById('confirm-delete-account');
    const cancelMigrateStorage = document.getElementById('cancel-migrate-storage');
    const confirmMigrateStorage = document.getElementById('confirm-migrate-storage');
    const migrateStorageBtn = document.getElementById('migrate-storage-btn');
    const migrationProgress = document.getElementById('migration-progress');
    const migrationProgressBar = document.getElementById('migration-progress-bar');
    const migrationStatus = document.getElementById('migration-status');

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
                const path = window.getStoragePath(currentUsername);
                currentStoragePathSpan.textContent = path;
                
                // Prüfen, ob wir einen Hinweis anzeigen sollen, dass der Ordner neu ausgewählt werden muss
                if (localStorage.getItem('hasDirectoryHandle') === 'true' && 
                    localStorage.getItem('needsHandleRenewal') === 'true') {
                    // Wir benötigen den Handle, aber er ist nicht verfügbar - Hinweis hinzufügen
                    const hintSpan = document.createElement('span');
                    hintSpan.textContent = ' (Bitte neu auswählen für vollen Dateizugriff)';
                    hintSpan.style.color = '#ff9800';
                    hintSpan.style.fontStyle = 'italic';
                    hintSpan.style.fontSize = '0.8em';
                    
                    // Alten Hinweis entfernen, falls vorhanden
                    const oldHint = currentStoragePathSpan.querySelector('span');
                    if (oldHint) {
                        oldHint.remove();
                    }
                    
                    currentStoragePathSpan.appendChild(hintSpan);
                }
            } else {
                currentStoragePathSpan.textContent = 'Standard';
            }
        } else {
            console.error("Speicherpfad-Funktionen nicht verfügbar");
            showError("Speicherpfad-Funktionen nicht verfügbar. Bitte aktualisiere die Seite.");
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
                        console.error('Fehler beim Aktualisieren der Benutzer in users.json:', error);
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
                    console.error('Fehler beim Aktualisieren der Benutzerdaten:', error);
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
                // Ordner-Auswahl-Dialog öffnen
                const directoryHandle = await window.openDirectoryPicker();
                
                if (!directoryHandle) {
                    showError('Kein Ordner ausgewählt.');
                    return;
                }
                
                // Pfad und Handle für den Speicherort vorbereiten
                const storagePathData = {
                    path: directoryHandle.name || 'LernAppDatenbank',
                    handle: directoryHandle
                };
                
                console.log('Ausgewählter Speicherort:', storagePathData.path);
                
                // Speicherpfad aktualisieren
                const currentUsername = localStorage.getItem('username');
                const success = await window.setStoragePath(storagePathData, currentUsername);
                
                if (success) {
                    // Handle wurde erfolgreich aktualisiert, alle Flags zurücksetzen
                    localStorage.removeItem('needsHandleRenewal');
                    
                    // UI aktualisieren
                    updateStoragePathDisplay();
                    
                    // Zusätzliche Erfolgsmeldung
                    showSuccess(`Speicherort "${storagePathData.path}" wurde erfolgreich konfiguriert und der Dateizugriff ist jetzt vollständig hergestellt.`);
                } else {
                    showError('Fehler beim Setzen des Speicherorts. Bitte versuchen Sie es erneut.');
                }
            } catch (error) {
                // Benutzer hat den Dialog abgebrochen oder es ist ein Fehler aufgetreten
                if (error.name === 'AbortError') {
                    console.log('Benutzer hat den Ordner-Auswahl-Dialog abgebrochen.');
                    showInfo('Ordnerauswahl wurde abgebrochen.');
                } else {
                    console.error('Fehler beim Öffnen des Ordner-Auswahl-Dialogs:', error);
                    showError(`Fehler beim Öffnen des Ordner-Auswahl-Dialogs: ${error.message}`);
                }
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
                const result = await window.openDirectoryPicker();
                
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
                    console.error('Fehler bei der Migration:', error);
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
                    console.log('Benutzer hat den Ordner-Auswahl-Dialog abgebrochen.');
                    showInfo('Ordnerauswahl wurde abgebrochen.');
                } else {
                    console.error('Fehler beim Öffnen des Ordner-Auswahl-Dialogs:', error);
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
            migrateStorageModal.style.display = 'none';
            
            // Zurücksetzen des Migrations-Fortschrittsbalkens
            if (migrationProgress) {
                migrationProgress.style.display = 'none';
                migrationProgressBar.style.width = '0%';
                migrationStatus.textContent = 'Vorbereitung...';
                confirmMigrateStorage.disabled = false;
                cancelMigrateStorage.disabled = false;
            }
        });
    });

    // Fragen löschen abbrechen
    if (cancelDeleteQuestions) {
        cancelDeleteQuestions.addEventListener('click', function() {
            deleteQuestionsModal.style.display = 'none';
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
                console.error('Fehler beim Löschen der Fragen:', error);
                showError(`Fehler beim Löschen der Fragen: ${error.message}`);
                deleteQuestionsModal.style.display = 'none';
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
                console.error('Fehler beim Löschen des Kontos:', error);
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
    });
});
