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
        
        // Flag, um Rekursion zu verhindern
        this._showingNotification = false;
    }
    
    /**
     * Prüft, ob ein Log basierend auf seinem Inhalt gefiltert werden soll
     * @param {string} message - Log-Nachricht
     * @param {string} type - Log-Typ (error, warn, info, debug)
     * @returns {boolean} true wenn das Log gefiltert werden soll, sonst false
     */
    shouldFilterLog(message, type) {
        // Rekursive Logs filtern
        if (this._showingNotification || 
            (typeof message === 'string' && message.includes('Benachrichtigung (') && message.split('Benachrichtigung (').length > 2)) {
            return true;
        }
        
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
        
        // Stets Benutzer-bezogene Logs durchlassen
        if (message.includes('Benutzer') || 
            message.includes('Authentifizierungsstatus') || 
            message.includes('Anzahl der Benutzer')) {
            return false;
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
        
        // Vollständigen ISO-Zeitstempel für Speicherung verwenden
        const isoTimestamp = new Date().toISOString();
        // Für die Anzeige nur hh:mm Format verwenden
        const now = new Date();
        const displayTimestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const logEntry = { timestamp: isoTimestamp, type, message };

        try {
            // Logs immer in der Konsole ausgeben, mit reduziertem Zeitstempelformat (hh:mm)
            console[type](`[${displayTimestamp}] ${type.toUpperCase()}: ${message}`);
            
            // Bei Fehlern und Warnungen auch als Benachrichtigung anzeigen, wenn die Funktion existiert
            // Prüfung auf rekursive Aufrufe, um Endlosschleifen zu vermeiden
            if ((type === 'error' || type === 'warn') && window.showNotification && 
                !message.includes('Benachrichtigung (')) {
                const notificationType = type === 'error' ? 'error' : 'warning';
                try {
                    // Direktes Flag setzen, um Rekursion zu verhindern
                    this._showingNotification = true;
                    window.showNotification(message, notificationType, 5000);
                } finally {
                    this._showingNotification = false;
                }
            }
        } catch (error) {
            console.error('Fehler beim Logging:', error);
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
     * Trace-Nachricht loggen (detailliertste Stufe)
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
}

// Singleton-Instanz erstellen
const logger = new Logger();

// Für die Legacy-Unterstützung auch die alte logMessage-Funktion bereitstellen
window.logMessage = function(message, type = 'info') {
    logger.log(message, type);
};

// Logger-Instanz global verfügbar machen
window.logger = logger;

// Auch eine einfache log-Funktion bereitstellen für Code, der diese verwendet
window.log = function(message, type) {
    logger.log(message, type || 'info');
};

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

// Die lokale Speicherung und JSON-Logik wurde entfernt.
// Die Logger-Funktionen nutzen jetzt Supabase für alle relevanten Datenoperationen.
