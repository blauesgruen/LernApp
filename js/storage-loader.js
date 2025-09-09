/**
 * Modul zum kontrollierten Laden der Speichermodule
 * 
 * Dieses Skript organisiert das korrekte Laden der Speichermodule in der richtigen Reihenfolge
 * und stellt sicher, dass die Abhängigkeiten korrekt aufgelöst werden.
 */

// Konfiguration
const config = {
    // Hauptmodule
    modules: {
        storageCore: '/js/storage-core.js',
        storageIndexedDB: '/js/storage-indexeddb.js',
        storageUser: '/js/storage-user.js',
        debugTools: '/js/debug-persistent-storage.js',
        repairTools: '/js/storage-repair.js',
        compatibility: '/js/storage-compatibility.js'
    },
    
    // Optionen
    options: {
        loadDebugTools: true,
        loadRepairTools: true,
        logLoadingProcess: true,
        immediateInitialization: true  // Sofortige Initialisierung ohne auf DOMContentLoaded zu warten
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
        
        // Prüfen, ob das Skript bereits geladen wurde
        const existingScript = document.querySelector(`script[src="${url}"]`);
        if (existingScript) {
            log(`Modul bereits geladen: ${url}`, 'info');
            resolve(); // Sofort auflösen, wenn das Skript bereits geladen ist
            return;
        }
        
        document.head.appendChild(script);
    });
}

/**
 * Initialisiert die Ladereihenfolge basierend auf dem Login-Status
 */
async function init() {
    try {
        log('Starte Ladevorgang der Speichermodule');
        
        // Prüfen, ob der Benutzer eingeloggt ist
        const isLoggedIn = localStorage.getItem('loggedIn') === 'true' && localStorage.getItem('username');
        
        if (isLoggedIn) {
            log('Benutzer ist eingeloggt, lade alle Speichermodule', 'info');
            
            // Module in der richtigen Reihenfolge laden
            const moduleLoadingOrder = [];
            
            // Debug- und Reparatur-Tools optional hinzufügen
            if (config.options.loadDebugTools) {
                moduleLoadingOrder.push(config.modules.debugTools);
            }
            if (config.options.loadRepairTools) {
                moduleLoadingOrder.push(config.modules.repairTools);
            }
            
            // Kernmodule immer in dieser Reihenfolge
            moduleLoadingOrder.push(
                config.modules.storageIndexedDB,
                config.modules.storageCore,
                config.modules.storageUser,
                config.modules.compatibility
            );
            
            // Module nacheinander laden, um die richtige Initialisierungsreihenfolge sicherzustellen
            for (const modulePath of moduleLoadingOrder) {
                await loadModule(modulePath);
            }
            
            // Kompatibilitätsadapter laden
            await loadModule(config.modules.compatibility);
        } else {
            log('Benutzer ist nicht eingeloggt, lade nur grundlegende Speichermodule', 'info');
        }
        
        // Ladevorgang abgeschlossen
        log('Speichermodule erfolgreich geladen', 'success');

        // Setze ein globales Flag, damit nachträglich geladene Listener es abfragen können
        try { window.__storageModulesLoaded = true; } catch (e) { /* best-effort */ }

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
        
        // Debug-Tools zuerst laden (wenn aktiviert)
        if (config.options.loadDebugTools) {
            await loadModule(config.modules.debugTools);
            log('Debug-Tools geladen, fahre mit Hauptmodulen fort', 'debug');
        }
        
        // Reparatur-Tools laden (wenn aktiviert)
        if (config.options.loadRepairTools) {
            await loadModule(config.modules.repairTools);
            log('Reparatur-Tools geladen, fahre mit Hauptmodulen fort', 'debug');
        }
        
        // IndexedDB Fallback-Speicher laden
        await loadModule(config.modules.storageIndexedDB);
        
        // Hauptspeichermodul laden (neue vereinfachte Version)
        // Module sind jetzt alle geladen
        log('Persistente Speichermodule erfolgreich nachgeladen', 'success');
        
        // Nur einmal initialisieren mit einem kurzen Timeout, um sicherzustellen,
        // dass die Module vollständig initialisiert sind
        setTimeout(async () => {
            // Prüfen, ob ein Benutzer eingeloggt ist und ggf. Speicher initialisieren
            const currentUsername = localStorage.getItem('username');
            if (currentUsername && window.initializeStorageForUser) {
                log(`Aktiver Benutzer gefunden: ${currentUsername}, initialisiere Speicher`, 'info');
                try {
                    // Optionen übergeben, um keine Modals anzuzeigen
                    const options = { showModal: false };
                    const initResult = await window.initializeStorageForUser(currentUsername, options);
                    log(`Speicher-Initialisierung: ${initResult ? 'Erfolgreich' : 'Mit Problemen'}`, 
                        initResult ? 'success' : 'warning');
                
                // Bei Problemen Diagnose durchführen
                if (!initResult && window.listAllHandles) {
                    const handles = await window.listAllHandles();
                    log(`Vorhandene Handles: ${JSON.stringify(handles)}`, 'debug');
                    
                    // Automatische Reparatur versuchen ohne Modals
                    if (window.repairStorageAccess) {
                        log('Versuche automatische Reparatur des Speicherzugriffs', 'info');
                        const repairResult = await window.repairStorageAccess(currentUsername, { showModal: false });
                        log(`Reparaturversuch: ${repairResult.success ? 'Erfolgreich' : 'Fehlgeschlagen'} - ${repairResult.message}`, 
                            repairResult.success ? 'success' : 'warning');
                    }
                }
            } catch (initError) {
                log(`Fehler bei Speicher-Initialisierung: ${initError.message}`, 'error');
            }
        }
        }, 500); // Ende des setTimeout
        
        // Set global flag for persistent modules
        try { window.__persistentStorageModulesLoaded = true; } catch (e) { /* best-effort */ }

        // Event auslösen
        window.dispatchEvent(new CustomEvent('persistentStorageModulesLoaded'));

        // Best-effort: Falls ein restoreDirectoryHandle verfügbar ist, versuche das Handle zu laden
        // und setze es global, damit Seiten, die Events verpasst haben, das Handle bekommen.
        try {
            if (typeof window.restoreDirectoryHandle === 'function') {
                const username = localStorage.getItem('username') || undefined;
                try {
                    const handle = await window.restoreDirectoryHandle(username);
                    if (handle) {
                        try { window.directoryHandle = handle; } catch (e) {}
                        try { document.dispatchEvent(new CustomEvent('directoryHandleChanged', { detail: { handle } })); } catch (e) {}
                        if (typeof window.updateStorageStatusIcon === 'function') {
                            try { window.updateStorageStatusIcon(); } catch (e) {}
                        }
                        log('Automatisches Wiederherstellen des DirectoryHandle erfolgreich', 'success');
                    } else {
                        log('Kein DirectoryHandle beim automatischen Wiederherstellungsversuch gefunden', 'debug');
                    }
                } catch (restoreErr) {
                    log(`Fehler beim automatischen Wiederherstellungsversuch: ${restoreErr.message}`, 'warning');
                }
            }
        } catch (e) {
            // best-effort, ignore
        }
        
        return true;
    } catch (error) {
        log(`Fehler beim Nachladen der persistenten Speichermodule: ${error.message}`, 'error');
        console.error('Nachladevorgang fehlgeschlagen:', error);
        return false;
    }
}

// Funktion global verfügbar machen
window.loadPersistentStorageModules = loadPersistentStorageModules;

// Flag um zu verfolgen, ob wir bereits eine Initialisierung ausgeführt haben
let hasInitialized = false;

// Ladevorgang starten, wenn das DOM geladen ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!hasInitialized) {
            hasInitialized = true;
            init();
        }
    });
} else {
    // DOM ist bereits geladen, direkt starten
    if (!hasInitialized) {
        hasInitialized = true;
        init();
    }
}

// Sofortige Initialisierung ohne auf DOMContentLoaded zu warten
if (config.options.immediateInitialization && !hasInitialized) {
    log('Starte sofortige Initialisierung der Speichermodule', 'info');
    
    (async function() {
        try {
            hasInitialized = true;
            await loadPersistentStorageModules();
            log('Sofortige Initialisierung abgeschlossen', 'success');
        } catch (error) {
            log(`Fehler bei sofortiger Initialisierung: ${error.message}`, 'error');
        }
    })();
}
