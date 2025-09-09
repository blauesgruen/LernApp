/**
 * Persistenz-Hinweis für DirectoryHandle
 * Diese Komponente wird eingeblendet, wenn ein Speicherort ausgewählt werden muss
 */

document.addEventListener('DOMContentLoaded', () => {
    // Warte etwas, damit die Speichermodule geladen werden können
    setTimeout(() => {
        // Nur aktivieren, wenn der Benutzer eingeloggt ist
        if (localStorage.getItem('loggedIn') !== 'true') return;
        
        // Überprüfe, ob ein DirectoryHandle vorhanden ist
        if (!window.directoryHandle && localStorage.getItem('hasStoredDirectoryHandle') === 'true') {
            showStorageSelector();
        }
    }, 2000);
});

/**
 * Zeigt einen vereinfachten Dialog zur Auswahl des Speicherorts an
 */
function showStorageSelector() {
    // Vermeiden von Duplikaten
    if (document.getElementById('storage-selector-modal')) return;
    
    // Dialog erstellen
    const modal = document.createElement('div');
    modal.id = 'storage-selector-modal';
    modal.className = 'storage-selector-modal';
    modal.innerHTML = `
        <div class="storage-selector-content">
            <div class="storage-selector-header">
                <h3>Speicherort auswählen</h3>
                <button class="storage-selector-close">&times;</button>
            </div>
            <div class="storage-selector-body">
                <p>Nach einem Neustart oder Browser-Update muss der Speicherort erneut ausgewählt werden.</p>
                <p>Dies ist ein Sicherheitsfeature der Browser-Dateisystem-API.</p>
                <div class="storage-selector-options">
                    <button id="storage-select-folder" class="btn-primary">
                        <i class="fas fa-folder-open"></i> Ordner auswählen
                    </button>
                    <button id="storage-use-browser" class="btn-secondary">
                        <i class="fas fa-database"></i> Nur Browser-Speicher verwenden
                    </button>
                </div>
                <div class="storage-selector-info">
                    <p class="storage-info-note">
                        <i class="fas fa-info-circle"></i> 
                        Mit dem Ordner können Sie Ihre Daten zwischen Geräten austauschen und sichern.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // Styles hinzufügen
    const style = document.createElement('style');
    style.textContent = `
        .storage-selector-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .storage-selector-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        
        .storage-selector-header {
            padding: 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .storage-selector-header h3 {
            margin: 0;
            font-size: 18px;
            color: #212529;
        }
        
        .storage-selector-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6c757d;
        }
        
        .storage-selector-body {
            padding: 20px;
        }
        
        .storage-selector-options {
            display: flex;
            gap: 12px;
            margin: 20px 0;
        }
        
        .btn-primary {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        
        .btn-primary:hover {
            background: #0069d9;
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #212529;
            border: 1px solid #dee2e6;
            padding: 10px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .btn-secondary:hover {
            background: #e2e6ea;
        }
        
        .storage-info-note {
            font-size: 14px;
            color: #6c757d;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #dee2e6;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Event-Listener für Schließen-Button
    modal.querySelector('.storage-selector-close').addEventListener('click', () => {
        modal.remove();
    });
    
    // Event-Listener für Ordner-Auswahl
    modal.querySelector('#storage-select-folder').addEventListener('click', async () => {
        if (window.openAndPersistDirectoryPicker) {
            try {
                modal.remove();
                await window.openAndPersistDirectoryPicker();
            } catch (error) {
                console.error('Fehler beim Öffnen des Ordnerwählers:', error);
                if (window.showError) {
                    window.showError('Fehler beim Auswählen des Ordners: ' + error.message);
                }
            }
        } else {
            if (window.showError) {
                window.showError('Die Funktion zum Auswählen eines Ordners ist nicht verfügbar.');
            }
        }
    });
    
    // Event-Listener für Browser-Speicher
    modal.querySelector('#storage-use-browser').addEventListener('click', () => {
        // Alle Flags für Dateisystemspeicher zurücksetzen
        localStorage.removeItem('hasDirectoryHandle');
        localStorage.removeItem('hasStoredDirectoryHandle');
        
        // Hinweis anzeigen
        if (window.showSuccess) {
            window.showSuccess('Daten werden nur im Browser gespeichert. Sie können jederzeit später einen Ordner auswählen.');
        }
        
        modal.remove();
    });
}

// Globale Verfügbarkeit
window.showStorageSelector = showStorageSelector;
