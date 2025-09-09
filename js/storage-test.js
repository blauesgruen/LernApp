/**
 * storage-test.js - Skript zum Testen der Speicherfunktionen
 */

// Initialisierung des Logging-Systems für die Tests
if (!window.logger) {
    window.logger = {
        log: function(message, type = 'info') {
            const timestamp = new Date().toISOString();
            const prefix = type === 'error' ? '❌' : 
                          type === 'warn' ? '⚠️' : 
                          type === 'success' ? '✅' : 
                          type === 'debug' ? '🔍' : '📝';
            
            console.log(`${prefix} [${timestamp}] [${type.toUpperCase()}] ${message}`);
        }
    };
}

/**
 * Führt einen vollständigen Storage-Test durch
 */
async function runStorageTest() {
    logger.log('🧪 Starte vollständigen Storage-Test...', 'info');
    
    // 1. Aktuellen Benutzer ermitteln
    const currentUsername = localStorage.getItem('username');
    logger.log(`👤 Aktueller Benutzer: ${currentUsername || 'Nicht eingeloggt'}`, 'info');
    
    if (!currentUsername) {
        logger.log('❌ Kein Benutzer eingeloggt, Test wird abgebrochen', 'error');
        return;
    }
    
    // 2. Vorhandene Handles auflisten
    if (window.listAllHandles) {
        logger.log('📋 Liste alle vorhandenen Handles auf...', 'info');
        
        try {
            const handles = await window.listAllHandles();
            logger.log(`📊 Gefundene Handles: ${JSON.stringify(handles, null, 2)}`, 'success');
        } catch (error) {
            logger.log(`❌ Fehler beim Auflisten der Handles: ${error.message}`, 'error');
        }
    } else {
        logger.log('❌ listAllHandles-Funktion nicht verfügbar', 'error');
    }
    
    // 3. IndexedDB-Speicher prüfen
    if (window.checkIndexedDBStorage) {
        logger.log('🔍 Prüfe IndexedDB-Speicher...', 'info');
        
        try {
            const result = await window.checkIndexedDBStorage();
            logger.log(`📊 IndexedDB-Diagnose: ${JSON.stringify(result, null, 2)}`, 'info');
        } catch (error) {
            logger.log(`❌ Fehler bei der IndexedDB-Diagnose: ${error.message}`, 'error');
        }
    } else {
        logger.log('❌ checkIndexedDBStorage-Funktion nicht verfügbar', 'error');
    }
    
    // 4. Speicherzugriff für den aktuellen Benutzer prüfen
    if (window.checkStorageAccess) {
        logger.log('🔍 Prüfe Speicherzugriff für aktuellen Benutzer...', 'info');
        
        try {
            const result = await window.checkStorageAccess(currentUsername);
            logger.log(`📊 Speicherzugriff: ${JSON.stringify(result, null, 2)}`, 'info');
            
            // Wenn kein Zugriff, versuche Reparatur ohne Modal
            if (!result.accessAvailable && window.repairStorageAccess) {
                logger.log('🔧 Versuche Speicherzugriff zu reparieren...', 'info');
                
                try {
                    const repairResult = await window.repairStorageAccess(currentUsername, { showModal: false });
                    logger.log(`📊 Reparaturversuch: ${JSON.stringify(repairResult, null, 2)}`, 
                              repairResult.success ? 'success' : 'warn');
                } catch (repairError) {
                    logger.log(`❌ Fehler bei der Reparatur: ${repairError.message}`, 'error');
                }
            }
        } catch (error) {
            logger.log(`❌ Fehler bei der Speicherzugriffsprüfung: ${error.message}`, 'error');
        }
    } else {
        logger.log('❌ checkStorageAccess-Funktion nicht verfügbar', 'error');
    }
    
    // 5. Storage-Module Initialisierung testen
    if (window.initializeStorageForUser) {
        logger.log('🔄 Teste Speichermodul-Initialisierung für aktuellen Benutzer...', 'info');
        
        try {
            // Ohne Modal initialisieren
            const options = { showModal: false };
            const result = await window.initializeStorageForUser(currentUsername, options);
            logger.log(`📊 Initialisierung: ${result ? 'Erfolgreich' : 'Mit Problemen'}`, 
                      result ? 'success' : 'warn');
        } catch (error) {
            logger.log(`❌ Fehler bei der Initialisierung: ${error.message}`, 'error');
        }
    } else {
        logger.log('❌ initializeStorageForUser-Funktion nicht verfügbar', 'error');
    }
    
    logger.log('✅ Storage-Test abgeschlossen', 'success');
}

/**
 * Führt einen Notfall-Reparaturtest durch
 */
async function runEmergencyRepairTest() {
    logger.log('🚨 Starte Notfall-Reparaturtest...', 'info');
    
    // 1. Aktuellen Benutzer ermitteln
    const currentUsername = localStorage.getItem('username');
    logger.log(`👤 Aktueller Benutzer: ${currentUsername || 'Nicht eingeloggt'}`, 'info');
    
    if (!currentUsername) {
        logger.log('❌ Kein Benutzer eingeloggt, Test wird abgebrochen', 'error');
        return;
    }
    
    // 2. Notfall-Reparatur durchführen
    if (window.emergencyStorageRepair) {
        logger.log('🚨 Führe Notfall-Reparatur durch...', 'info');
        
        try {
            const result = await window.emergencyStorageRepair(currentUsername);
            logger.log(`📊 Notfall-Reparatur: ${JSON.stringify(result, null, 2)}`, 
                      result.success ? 'success' : 'error');
        } catch (error) {
            logger.log(`❌ Fehler bei der Notfall-Reparatur: ${error.message}`, 'error');
        }
    } else {
        logger.log('❌ emergencyStorageRepair-Funktion nicht verfügbar', 'error');
    }
    
    logger.log('✅ Notfall-Reparaturtest abgeschlossen', 'success');
}

// Funktionen global verfügbar machen
window.runStorageTest = runStorageTest;
window.runEmergencyRepairTest = runEmergencyRepairTest;

// Logging-Informationen
logger.log('📝 Storage-Test-Modul geladen', 'info');
logger.log('Verfügbare Befehle: runStorageTest(), runEmergencyRepairTest()', 'info');
