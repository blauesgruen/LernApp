/**
 * Lademanager für das Speichermodul und die Dateisystem-API
 * 
 * Dieses Skript organisiert das korrekte Laden der Speichermodule in der richtigen Reihenfolge
 * und stellt sicher, dass die Abhängigkeiten korrekt aufgelöst werden.
 */

// Konfiguration
const config = {
    // Hauptmodule
    modules: {
        persistentFileSystem: '/js/persistent-file-system.js',
        storageIndexedDB: '/js/storage-indexeddb.js',
        storage: '/js/storage.js',
        storageAccess: '/js/storage-access.js',
        storageFix: '/js/storage-fix.js',
        debugTools: '/js/debug-persistent-storage.js'
    },
    
    // Optionen
    options: {
        loadDebugTools: true,
        logLoadingProcess: true
    }
};

/**
 * Logger-Funktion mit visueller Hervorhebung
 * @param {string} message Die Nachricht
 * @param {string} type Der Typ der Nachricht (info, success, warning, error)
 */
function log(message, type = 'info') {
    if (!config.options.logLoadingProcess) return;
    
    let style = 'color: blue;';
    let prefix = '🔄';
    
    switch (type) {
        case 'success':
            style = 'color: green; font-weight: bold;';
            prefix = '✅';
            break;
        case 'warning':
            style = 'color: orange;';
            prefix = '⚠️';
            break;
        case 'error':
            style = 'color: red; font-weight: bold;';
            prefix = '❌';
            break;
        case 'debug':
            style = 'color: purple;';
            prefix = '🔍';
            break;
    }
    
    console.log(`%c${prefix} Loader: ${message}`, style);
}

/**
 * Lädt ein JavaScript-Modul dynamisch
 * @param {string} url Die URL des zu ladenden Moduls
 * @returns {Promise<void>} Promise, das aufgelöst wird, wenn das Modul geladen wurde
 */
function loadModule(url) {
    return new Promise((resolve, reject) => {
        log(`Lade Modul: ${url}`);
        
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        
        script.onload = () => {
            log(`Modul erfolgreich geladen: ${url}`, 'success');
            resolve();
        };
        
        script.onerror = (error) => {
            log(`Fehler beim Laden des Moduls: ${url}`, 'error');
            reject(error);
        };
        
        document.head.appendChild(script);
    });
}

/**
 * Initialisiert die Ladereihenfolge basierend auf dem Login-Status
 */
async function init() {
    try {
        log('Starte Ladevorgang der Speichermodule');
        
        // Debug-Tools zuerst laden (wenn aktiviert)
        if (config.options.loadDebugTools) {
            await loadModule(config.modules.debugTools);
            log('Debug-Tools geladen, fahre mit Hauptmodulen fort', 'debug');
        }
        
        // Prüfen, ob der Benutzer eingeloggt ist
        const isLoggedIn = localStorage.getItem('loggedIn') === 'true' && localStorage.getItem('username');
        
        if (isLoggedIn) {
            log('Benutzer ist eingeloggt, lade alle Speichermodule', 'info');
            // Nur für eingeloggte Benutzer: Persistentes Dateisystem laden
            await loadModule(config.modules.persistentFileSystem);
            
            // IndexedDB Fallback-Speicher laden
            await loadModule(config.modules.storageIndexedDB);
            
            // Storage-Access-Module laden (für Zugriffsüberprüfung)
            await loadModule(config.modules.storageAccess);
        } else {
            log('Benutzer ist nicht eingeloggt, lade nur grundlegende Speichermodule', 'info');
        }
        
        // Hauptspeichermodul wird immer geladen
        await loadModule(config.modules.storage);
        
        // Storage-Fix-Modul laden (für automatische Reparatur)
        if (isLoggedIn) {
            await loadModule(config.modules.storageFix);
        }
        
        // Ladevorgang abgeschlossen
        log('Speichermodule erfolgreich geladen', 'success');
        
        // Event auslösen, dass alle Module geladen wurden
        window.dispatchEvent(new CustomEvent('storageModulesLoaded', { 
            detail: { isFullyLoaded: isLoggedIn } 
        }));
    } catch (error) {
        log(`Kritischer Fehler beim Laden der Module: ${error.message}`, 'error');
        console.error('Ladevorgang fehlgeschlagen:', error);
        
        // Event für Fehler auslösen
        window.dispatchEvent(new CustomEvent('storageModulesLoadError', { detail: error }));
    }
}

/**
 * Lädt die persistenten Speichermodule nach, die nur für eingeloggte Benutzer benötigt werden
 * Diese Funktion sollte nach erfolgreichem Login aufgerufen werden
 */
async function loadPersistentStorageModules() {
    try {
        log('Lade persistente Speichermodule nach erfolgreichem Login', 'info');
        
        // Persistentes Dateisystem laden
        await loadModule(config.modules.persistentFileSystem);
        
        // IndexedDB Fallback-Speicher laden
        await loadModule(config.modules.storageIndexedDB);
        
        // Storage-Access-Module laden
        await loadModule(config.modules.storageAccess);
        
        // Storage-Fix-Modul laden
        await loadModule(config.modules.storageFix);
        
        log('Persistente Speichermodule erfolgreich nachgeladen', 'success');
        
        // Event auslösen
        window.dispatchEvent(new CustomEvent('persistentStorageModulesLoaded'));
        
        return true;
    } catch (error) {
        log(`Fehler beim Nachladen der persistenten Speichermodule: ${error.message}`, 'error');
        console.error('Nachladevorgang fehlgeschlagen:', error);
        return false;
    }
}

// Funktion global verfügbar machen
window.loadPersistentStorageModules = loadPersistentStorageModules;

// Ladevorgang starten, wenn das DOM geladen ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM ist bereits geladen, direkt starten
    init();
}
