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
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const cancelDeleteQuestions = document.getElementById('cancel-delete-questions');
    const confirmDeleteQuestions = document.getElementById('confirm-delete-questions');
    const cancelDeleteAccount = document.getElementById('cancel-delete-account');
    const confirmDeleteAccount = document.getElementById('confirm-delete-account');

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
            if (window.isStoragePathConfigured()) {
                currentStoragePathSpan.textContent = window.getStoragePath();
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
        updateUsernameBtn.addEventListener('click', function() {
            const newUsername = newUsernameInput.value.trim();
            
            if (!newUsername) {
                showError('Bitte gib einen neuen Benutzernamen ein.');
                return;
            }

            // Überprüfen, ob der Benutzername bereits existiert
            if (users.some(user => user.username === newUsername && user.username !== currentUsername)) {
                showError('Dieser Benutzername ist bereits vergeben.');
                return;
            }

            // Benutzernamen aktualisieren
            if (currentUser) {
                currentUser.username = newUsername;
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('username', newUsername);
                usernameDisplay.textContent = newUsername;
                showSuccess('Dein Benutzername wurde erfolgreich aktualisiert!');
                newUsernameInput.value = '';
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
                
                if (directoryHandle) {
                    // Pfad speichern
                    const path = directoryHandle.name;
                    
                    // Speicherpfad aktualisieren
                    const success = await window.setStoragePath(path, directoryHandle);
                    
                    if (success) {
                        updateStoragePathDisplay();
                        showSuccess(`Speicherort wurde auf "${path}" gesetzt.`);
                    } else {
                        showError('Fehler beim Setzen des Speicherorts.');
                    }
                }
            } catch (error) {
                // Benutzer hat den Dialog abgebrochen oder es ist ein Fehler aufgetreten
                if (error.name !== 'AbortError') {
                    showError(`Fehler beim Öffnen des Ordner-Auswahl-Dialogs: ${error.message}`);
                    console.error('Fehler beim Öffnen des Ordner-Auswahl-Dialogs:', error);
                } else {
                    console.log('Benutzer hat den Ordner-Auswahl-Dialog abgebrochen.');
                }
            }
        });
    }

    // Speicherpfad zurücksetzen
    if (resetStoragePathBtn && window.resetStoragePath) {
        resetStoragePathBtn.addEventListener('click', async function() {
            const success = await window.resetStoragePath();
            
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
        confirmDeleteQuestions.addEventListener('click', function() {
            // Alle Fragen des Benutzers löschen
            const questions = JSON.parse(localStorage.getItem('questions')) || [];
            const updatedQuestions = questions.filter(q => q.createdBy !== currentUsername);
            localStorage.setItem('questions', JSON.stringify(updatedQuestions));
            
            deleteQuestionsModal.style.display = 'none';
            showSuccess('Alle deine Fragen wurden erfolgreich gelöscht!');
        });
    }

    // Konto löschen bestätigen
    if (confirmDeleteAccount) {
        confirmDeleteAccount.addEventListener('click', function() {
            // Benutzer aus der Liste entfernen
            const updatedUsers = users.filter(user => user.username !== currentUsername);
            localStorage.setItem('users', JSON.stringify(updatedUsers));
            
            // Fragen des Benutzers löschen
            const questions = JSON.parse(localStorage.getItem('questions')) || [];
            const updatedQuestions = questions.filter(q => q.createdBy !== currentUsername);
            localStorage.setItem('questions', JSON.stringify(updatedQuestions));
            
            // Abmelden
            localStorage.removeItem('username');
            localStorage.setItem('loggedIn', 'false');
            
            // Zurück zur Startseite
            showInfo('Dein Konto wurde erfolgreich gelöscht.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
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
