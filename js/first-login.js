// first-login.js - Verwaltet die Ersteinrichtung beim ersten Login

/**
 * Zeigt einen Dialog zur Konfiguration des Speicherorts beim ersten Login an.
 */
function showFirstLoginDialog() {
    console.log("First-Login-Dialog wird vorbereitet...");
    
    // Überprüfen, ob bereits ein Dialog existiert
    let dialog = document.getElementById('first-login-dialog');
    if (dialog) {
        dialog.style.display = 'block';
        return;
    }

    // Neuen Dialog erstellen
    dialog = document.createElement('div');
    dialog.id = 'first-login-dialog';
    dialog.className = 'modal';
    dialog.style.display = 'block';

    // Dialog-Inhalt erstellen
    const dialogContent = document.createElement('div');
    dialogContent.className = 'modal-content';
    dialogContent.style.maxWidth = '600px';

    // Dialog-Inhalt
    dialogContent.innerHTML = `
        <h2>Willkommen bei LernApp!</h2>
        <p>Bevor du beginnst, konfiguriere bitte deinen Speicherort für die Fragendatenbank.</p>
        
        <div class="form-info" style="margin-bottom: 20px;">
            <p>Ein gemeinsamer Pfad auf verschiedenen Geräten (z.B. in Dropbox) ermöglicht dir, 
            die gleichen Fragen auf all deinen Geräten zu verwenden.</p>
        </div>
        
        <button type="button" id="first-login-browse-path" class="btn-primary" style="width: 100%; margin-bottom: 15px;">
            <i class="fas fa-folder-open"></i> Ordner für Fragendatenbank auswählen
        </button>
        
        <div class="modal-buttons">
            <button id="first-login-use-default" class="btn-secondary">Standardpfad verwenden</button>
        </div>
    `;

    // Dialog zum DOM hinzufügen
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);

    // Event-Listener für den "Standardpfad verwenden"-Button
    const useDefaultButton = document.getElementById('first-login-use-default');
    if (useDefaultButton) {
        useDefaultButton.addEventListener('click', function() {
            if (window.resetStoragePath) {
                window.resetStoragePath();
                showSuccess('Der Standardpfad wird verwendet.');
                markFirstLoginComplete();
                dialog.style.display = 'none';
            } else {
                showError('Fehler: Die Speicherpfad-Funktionen sind nicht verfügbar.');
            }
        });
    }

    // Der "Speicherort setzen"-Button wurde entfernt, da wir jetzt direkt nach der Ordnerauswahl den Pfad setzen

    // Event-Listener für den "Ordner auswählen"-Button
    const browseFolderButton = document.getElementById('first-login-browse-path');
    if (browseFolderButton) {
        browseFolderButton.addEventListener('click', async function() {
            // Prüfen, ob die File System Access API unterstützt wird
            if (window.isFileSystemAccessSupported && window.isFileSystemAccessSupported()) {
                if (window.openDirectoryPicker) {
                    // Dateibrowser öffnen
                    const directoryResult = await window.openDirectoryPicker();
                    
                    if (directoryResult) {
                        // Speicherpfad direkt setzen
                        if (window.setStoragePath) {
                            const success = await window.setStoragePath(directoryResult);
                            
                            if (success) {
                                showSuccess(`Speicherort wurde auf "${directoryResult.path}" gesetzt.`);
                                markFirstLoginComplete();
                                dialog.style.display = 'none';
                            } else {
                                showError('Fehler beim Setzen des Speicherorts.');
                            }
                        } else {
                            showError('Fehler: Die Speicherpfad-Funktionen sind nicht verfügbar.');
                        }
                    }
                } else {
                    showError('Die Funktion zur Ordnerauswahl ist nicht verfügbar.');
                }
            } else {
                showWarning('Dein Browser unterstützt die Dateiauswahl nicht. Verwende bitte Chrome, Edge oder einen anderen modernen Browser.');
            }
        });
    }

    console.log("First-Login-Dialog wurde erstellt und angezeigt.");
}

/**
 * Markiert die Ersteinrichtung als abgeschlossen.
 */
function markFirstLoginComplete() {
    localStorage.setItem('firstLoginComplete', 'true');
}

/**
 * Überprüft, ob die Ersteinrichtung bereits abgeschlossen wurde.
 * @returns {boolean} True, wenn die Ersteinrichtung abgeschlossen wurde, sonst False.
 */
function isFirstLoginComplete() {
    return localStorage.getItem('firstLoginComplete') === 'true';
}

// Beim Laden der Seite prüfen, ob es sich um den ersten Login handelt
document.addEventListener('DOMContentLoaded', function() {
    // Prüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const username = localStorage.getItem('username');
    
    if (isLoggedIn && username && !isFirstLoginComplete()) {
        // Nur wenn die Speicherpfad-Funktionen verfügbar sind
        if (window.isStoragePathConfigured && window.getStoragePath && window.setStoragePath) {
            console.log("Erster Login erkannt. Zeige Dialog zur Ersteinrichtung...");
            
            // Kurze Verzögerung, um sicherzustellen, dass die Seite geladen ist
            setTimeout(() => {
                showFirstLoginDialog();
            }, 500);
        } else {
            console.error("Speicherpfad-Funktionen nicht verfügbar. First-Login-Dialog wird nicht angezeigt.");
            markFirstLoginComplete(); // Trotzdem als abgeschlossen markieren, um nicht beim nächsten Login erneut zu prüfen
        }
    }
});

// Exportiere die Funktionen ins globale Window-Objekt
window.showFirstLoginDialog = showFirstLoginDialog;
window.markFirstLoginComplete = markFirstLoginComplete;
window.isFirstLoginComplete = isFirstLoginComplete;
