/**
 * storage-handler.js
 * 
 * Dieses Modul stellt sicher, dass der DirectoryHandle sofort beim Laden der Seite
 * wiederhergestellt wird, um Probleme mit verlorenem Speicherzugriff nach Seitenwechseln zu vermeiden.
 */

// Bei DOMContentLoaded sofort den DirectoryHandle wiederherstellen
document.addEventListener('DOMContentLoaded', async () => {
    const logFunc = window.logger ? window.logger.info.bind(window.logger) : console.log;
    const warnFunc = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
    const errorFunc = window.logger ? window.logger.error.bind(window.logger) : console.error;
    
    // Nur fortfahren, wenn der Benutzer eingeloggt ist
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    if (!isLoggedIn) {
        logFunc('Benutzer nicht eingeloggt, kein DirectoryHandle-Restore erforderlich');
        return;
    }
    
    logFunc('Storage-Handler: Initialisiere bei Seitenladen...');
    
    // Benutzer ist eingeloggt, prüfe auf vorhandene DirectoryHandle-Flags
    if (localStorage.getItem('hasDirectoryHandle') !== 'true') {
        warnFunc('Kein DirectoryHandle-Flag in localStorage vorhanden');
    }
    
    // Prüfen, ob das Speichersystem verfolgt wird
    const hasStoredHandle = localStorage.getItem('hasStoredDirectoryHandle') === 'true';
    if (!hasStoredHandle) {
        logFunc('Kein gespeicherter DirectoryHandle vorhanden');
        return;
    }
    
    logFunc('Stelle DirectoryHandle beim Seitenladen wieder her...');
    
    try {
        // Initialisiere IndexedDB explizit, falls nötig
        if (window.initHandleDb) {
            logFunc('Initialisiere IndexedDB vor dem Wiederherstellen...');
            try {
                await window.initHandleDb();
                logFunc('IndexedDB erfolgreich initialisiert');
            } catch (dbError) {
                errorFunc('Fehler bei der IndexedDB-Initialisierung:', dbError);
                // Trotz Fehler weitermachen und versuchen, den Handle zu laden
            }
        }
        
        // Versuche, den DirectoryHandle wiederherzustellen
        if (window.restoreDirectoryHandle) {
            const success = await window.restoreDirectoryHandle();
            if (success) {
                logFunc('DirectoryHandle erfolgreich beim Seitenladen wiederhergestellt');
            } else {
                warnFunc('DirectoryHandle konnte beim Seitenladen nicht wiederhergestellt werden');
                
                // Optional: Automatischen Reparaturversuch starten
                if (window.autoRepairDirectoryHandle) {
                    logFunc('Starte automatische Reparatur beim Seitenladen...');
                    await window.autoRepairDirectoryHandle();
                }
            }
        } else {
            warnFunc('restoreDirectoryHandle-Funktion nicht verfügbar');
        }
    } catch (error) {
        errorFunc('Fehler beim Wiederherstellen des DirectoryHandle beim Seitenladen:', error);
    }
});
