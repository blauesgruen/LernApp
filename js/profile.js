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
