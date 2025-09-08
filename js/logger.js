// logger.js - Zentrale Logging-Funktionalität für die gesamte Anwendung

/**
 * Logger-Klasse für zentrale Logging-Funktionalität
 */
class Logger {
    constructor() {
        this.DEBUG_MODE = true;
        this.LOG_LEVEL = {
            ERROR: 4,
            WARN: 3,
            INFO: 2,
            DEBUG: 1,
            TRACE: 0
        };
        this.currentLevel = this.LOG_LEVEL.INFO; // Standard Log-Level
        
        // Button-bezogene Logs filtern, wenn nicht im Debug-Modus
        this.buttonLogsDisabled = true;
    }
    
    /**
     * Prüft, ob ein Log basierend auf seinem Inhalt gefiltert werden soll
     * @param {string} message - Log-Nachricht
     * @param {string} type - Log-Typ (error, warn, info, debug)
     * @returns {boolean} true wenn das Log gefiltert werden soll, sonst false
     */
    shouldFilterLog(message, type) {
        // Wenn Button-bezogene Logs deaktiviert sind
        if (this.buttonLogsDisabled && 
            (message.includes('Button') || message.includes('Buttons') || 
             message.includes('updateHeaderVisibility') || message.includes('updateButtonVisibility'))) {
            // Zeige trotzdem Button-bezogene Fehler an, aber keine "nicht gefunden" Meldungen
            if (type === 'error' && !message.includes('nicht gefunden')) {
                return false;
            }
            return true;
        }
        
        // Log-Level prüfen
        const messageLevel = this.LOG_LEVEL[type.toUpperCase()] || this.LOG_LEVEL.INFO;
        if (messageLevel < this.currentLevel) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Log-Nachricht erstellen und speichern
     * @param {string} message - Log-Nachricht
     * @param {string} type - Log-Typ (error, warn, info, debug)
     */
    log(message, type = 'info') {
        // Normalisiere den Typ
        type = type.toLowerCase();
        if (!['error', 'warn', 'info', 'debug', 'trace'].includes(type)) {
            type = 'info';
        }
        
        // Prüfen, ob das Log gefiltert werden soll
        if (this.shouldFilterLog(message, type)) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, type, message };

        try {
            // Logs in localStorage abrufen und aktualisieren
            const existingLogs = JSON.parse(localStorage.getItem('persistentLogs')) || [];

            // Doppelte Einträge vermeiden (Berücksichtigung von Zeitstempel und Typ)
            if (!existingLogs.some(log => log.message === message && log.type === type)) {
                existingLogs.push(logEntry);

                // Älteste Logs entfernen, wenn die maximale Kapazität erreicht wird
                while (JSON.stringify(existingLogs).length > 50000) { // 50KB Speicher für Logs
                    existingLogs.shift();
                }

                localStorage.setItem('persistentLogs', JSON.stringify(existingLogs));
            }

            // Logs immer in der Konsole ausgeben
            console[type](`[${timestamp}] ${type.toUpperCase()}: ${message}`);
            
            // Bei Fehlern und Warnungen auch als Benachrichtigung anzeigen, wenn die Funktion existiert
            if ((type === 'error' || type === 'warn') && window.showNotification) {
                const notificationType = type === 'error' ? 'error' : 'warning';
                window.showNotification(message, notificationType, 5000);
            }
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                const existingLogs = JSON.parse(localStorage.getItem('persistentLogs')) || [];
                existingLogs.shift(); // Entferne das älteste Log
                localStorage.setItem('persistentLogs', JSON.stringify(existingLogs));
                this.log(message, type); // Erneut versuchen
            } else {
                console.error('Fehler beim Logging:', error);
            }
        }
    }
    
    /**
     * Fehler loggen
     * @param {string} message - Fehlermeldung
     */
    error(message) {
        this.log(message, 'error');
    }
    
    /**
     * Warnung loggen
     * @param {string} message - Warnmeldung
     */
    warn(message) {
        this.log(message, 'warn');
    }
    
    /**
     * Information loggen
     * @param {string} message - Infomeldung
     */
    info(message) {
        this.log(message, 'info');
    }
    
    /**
     * Debug-Nachricht loggen
     * @param {string} message - Debug-Nachricht
     */
    debug(message) {
        this.log(message, 'debug');
    }
    
    /**
     * Trace-Nachricht loggen (detaillierteste Stufe)
     * @param {string} message - Trace-Nachricht
     */
    trace(message) {
        this.log(message, 'trace');
    }
    
    /**
     * Log-Level setzen
     * @param {string} level - Level (ERROR, WARN, INFO, DEBUG, TRACE)
     */
    setLogLevel(level) {
        const newLevel = this.LOG_LEVEL[level.toUpperCase()];
        if (newLevel !== undefined) {
            this.currentLevel = newLevel;
            this.info(`Log-Level geändert auf: ${level}`);
        } else {
            this.error(`Ungültiges Log-Level: ${level}`);
        }
    }
    
    /**
     * Debug-Modus ein- oder ausschalten
     * @param {boolean} enabled - Debug-Modus aktivieren oder deaktivieren
     */
    setDebugMode(enabled) {
        this.DEBUG_MODE = enabled;
        this.currentLevel = enabled ? this.LOG_LEVEL.DEBUG : this.LOG_LEVEL.INFO;
        this.info(`Debug-Modus ${enabled ? 'aktiviert' : 'deaktiviert'}`);
    }
    
    /**
     * Button-bezogene Logs ein- oder ausschalten
     * @param {boolean} disabled - Button-Logs deaktivieren oder aktivieren
     */
    setButtonLogsDisabled(disabled) {
        this.buttonLogsDisabled = disabled;
        this.info(`Button-Logs ${disabled ? 'deaktiviert' : 'aktiviert'}`);
    }
    
    /**
     * Alle Logs aus dem Speicher abrufen
     * @returns {Array} Array mit allen Logs
     */
    getAllLogs() {
        return JSON.parse(localStorage.getItem('persistentLogs')) || [];
    }
    
    /**
     * Logs nach Typ filtern
     * @param {string} type - Log-Typ (error, warn, info, debug, trace)
     * @returns {Array} Gefilterte Logs
     */
    getLogsByType(type) {
        const logs = this.getAllLogs();
        return logs.filter(log => log.type === type);
    }
    
    /**
     * Logs nach Text filtern
     * @param {string} text - Zu suchender Text
     * @returns {Array} Gefilterte Logs
     */
    searchLogs(text) {
        const logs = this.getAllLogs();
        return logs.filter(log => log.message.toLowerCase().includes(text.toLowerCase()));
    }
}

// Singleton-Instanz erstellen
const logger = new Logger();

// Für die Legacy-Unterstützung auch die alte logMessage-Funktion bereitstellen
window.logMessage = function(message, type = 'info') {
    logger.log(message, type);
};

// Logger-Instanz global verfügbar machen
window.logger = logger;

// Alte Funktionen überbrücken, damit vorhandener Code weiter funktioniert
console.originalLog = console.log;
console.originalError = console.error;
console.originalWarn = console.warn;
console.originalInfo = console.info;

// Console-Methoden überschreiben, um zentrales Logging zu verwenden
// Dies sollte nur in der Produktionsumgebung aktiviert werden
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log = function() {
        console.originalLog.apply(console, arguments);
        logger.info(Array.from(arguments).join(' '));
    };
    
    console.error = function() {
        console.originalError.apply(console, arguments);
        logger.error(Array.from(arguments).join(' '));
    };
    
    console.warn = function() {
        console.originalWarn.apply(console, arguments);
        logger.warn(Array.from(arguments).join(' '));
    };
    
    console.info = function() {
        console.originalInfo.apply(console, arguments);
        logger.info(Array.from(arguments).join(' '));
    };
}

// Exportiere die Funktionen, um sie überall verfügbar zu machen
window.log = logger.log.bind(logger);
window.logError = logger.error.bind(logger);
window.logWarn = logger.warn.bind(logger);
window.logInfo = logger.info.bind(logger);
window.logDebug = logger.debug.bind(logger);
window.logTrace = logger.trace.bind(logger);
