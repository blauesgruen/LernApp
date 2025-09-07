// Hilfsfunktionen für die LernApp

/**
 * Öffnet einen modalen Dialog mit einer Bestätigungsabfrage
 * @param {string} title - Der Titel des Dialogs
 * @param {string} message - Die Nachricht im Dialog
 * @param {string} confirmText - Text für den Bestätigungsbutton
 * @param {string} cancelText - Text für den Abbrechen-Button
 * @param {function} onConfirm - Callback für die Bestätigung
 * @returns {Promise} - Eine Promise, die aufgelöst wird, wenn der Dialog geschlossen wird
 */
function confirmDialog(title, message, confirmText = 'Bestätigen', cancelText = 'Abbrechen', onConfirm = () => {}) {
    return new Promise((resolve, reject) => {
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-button">${cancelText}</button>
                    <button class="btn-primary confirm-button">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event-Listener hinzufügen
        const closeBtn = dialog.querySelector('.modal-close');
        const cancelBtn = dialog.querySelector('.cancel-button');
        const confirmBtn = dialog.querySelector('.confirm-button');
        
        // Dialog anzeigen
        setTimeout(() => {
            dialog.style.opacity = '1';
        }, 10);
        
        // Dialog schließen
        function closeDialog(confirmed = false) {
            dialog.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(dialog);
                if (confirmed) {
                    onConfirm();
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 300);
        }
        
        // Event-Handler
        closeBtn.addEventListener('click', () => closeDialog(false));
        cancelBtn.addEventListener('click', () => closeDialog(false));
        confirmBtn.addEventListener('click', () => closeDialog(true));
    });
}

/**
 * Zeigt eine Benachrichtigung an
 * @param {string} message - Die Nachricht
 * @param {string} type - Typ der Benachrichtigung ('success', 'error', 'info', 'warning')
 * @param {number} duration - Dauer in Millisekunden, wie lange die Benachrichtigung angezeigt wird
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Wenn die Notification-Komponente existiert, nutzen wir diese
    if (window.notification && typeof window.notification.show === 'function') {
        window.notification.show(message, type, duration);
        return;
    }
    
    // Sonst erstellen wir eine einfache Benachrichtigung
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animation einblenden
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Nach der angegebenen Zeit ausblenden
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        // Und nach der Animation entfernen
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, duration);
}

/**
 * Hilfsfunktion zum Formatieren eines Datums
 * @param {Date|number} date - Das Datum oder ein Timestamp
 * @param {boolean} includeTime - Ob die Uhrzeit mit angezeigt werden soll
 * @returns {string} - Das formatierte Datum
 */
function formatDate(date, includeTime = false) {
    if (!date) return '';
    
    // Wenn date ein Timestamp ist, konvertieren wir es zu einem Date-Objekt
    if (typeof date === 'number') {
        date = new Date(date);
    }
    
    // Datum formatieren
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    let formatted = `${day}.${month}.${year}`;
    
    // Bei Bedarf die Uhrzeit hinzufügen
    if (includeTime) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        formatted += ` ${hours}:${minutes} Uhr`;
    }
    
    return formatted;
}

// Exportieren der Funktionen
window.helpers = {
    confirmDialog,
    showNotification,
    formatDate
};
