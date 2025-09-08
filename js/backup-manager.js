// backup-manager.js - Verwaltet die Backup-Funktionalität der LernApp

/**
 * Backup-Manager für die LernApp
 * Ermöglicht das Erstellen, Verwalten und Wiederherstellen von Backups der Anwendungsdaten
 */

// Hilfsfunktion für konsistentes Logging
function log(message, type = 'info', ...args) {
    if (window.logger) {
        window.logger.log(message, type, ...args);
    } else if (window.logMessage) {
        window.logMessage(message, type, ...args);
    } else if (type === 'error') {
        console.error(message, ...args);
    } else if (type === 'warn') {
        console.warn(message, ...args);
    } else {
        console.log(message, ...args);
    }
}

// Name des Backup-Verzeichnisses
const BACKUP_FOLDER_NAME = 'backups';

/**
 * Erstellt das Backup-Verzeichnis, falls es noch nicht existiert
 * @param {FileSystemDirectoryHandle} directoryHandle - Das Root-Verzeichnis
 * @returns {Promise<FileSystemDirectoryHandle>} Das Backup-Verzeichnis-Handle
 */
async function ensureBackupDirectory(directoryHandle) {
    if (!directoryHandle) {
        throw new Error('Kein Dateisystem-Zugriff verfügbar');
    }
    
    try {
        // Versuchen, das Backup-Verzeichnis zu öffnen (falls es existiert)
        try {
            return await directoryHandle.getDirectoryHandle(BACKUP_FOLDER_NAME);
        } catch (error) {
            // Wenn das Verzeichnis nicht existiert, erstellen wir es
            if (error.name === 'NotFoundError') {
                log(`Erstelle Backup-Verzeichnis '${BACKUP_FOLDER_NAME}'...`, 'info');
                return await directoryHandle.getDirectoryHandle(BACKUP_FOLDER_NAME, { create: true });
            }
            throw error;
        }
    } catch (error) {
        log(`Fehler beim Erstellen des Backup-Verzeichnisses: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Erstellt ein Backup einer Datei im Backup-Verzeichnis
 * @param {FileSystemDirectoryHandle} rootDirectoryHandle - Das Root-Verzeichnis
 * @param {string} fileName - Der Name der zu sichernden Datei
 * @param {string|object} content - Der Inhalt der Datei (String oder Objekt, das zu JSON konvertiert wird)
 * @returns {Promise<string>} Der Name der erstellten Backup-Datei
 */
async function createFileBackup(rootDirectoryHandle, fileName, content) {
    try {
        // Sicherstellen, dass das Backup-Verzeichnis existiert
        const backupDirHandle = await ensureBackupDirectory(rootDirectoryHandle);
        
        // Backup-Dateinamen mit Zeitstempel erstellen
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupFileName = `${fileName}.${timestamp}.bak`;
        
        // Backup-Datei erstellen und schreiben
        const backupFileHandle = await backupDirHandle.getFileHandle(backupFileName, { create: true });
        const writable = await backupFileHandle.createWritable();
        
        // Content verarbeiten (String oder Objekt)
        const contentToWrite = typeof content === 'string' 
            ? content 
            : JSON.stringify(content);
        
        await writable.write(contentToWrite);
        await writable.close();
        
        log(`Backup erstellt: ${backupFileName}`, 'info');
        return backupFileName;
    } catch (error) {
        log(`Fehler beim Erstellen des Backups für ${fileName}: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Erstellt ein vollständiges Backup aller LernApp-Daten
 * @param {FileSystemDirectoryHandle} rootDirectoryHandle - Das Root-Verzeichnis
 * @param {string} [username] - Optionaler Benutzername für benutzerspezifische Backups
 * @returns {Promise<object>} Ergebnis des Backup-Vorgangs
 */
async function createFullBackup(rootDirectoryHandle, username) {
    if (!rootDirectoryHandle) {
        if (window.directoryHandle) {
            rootDirectoryHandle = window.directoryHandle;
        } else {
            throw new Error('Kein Dateisystem-Zugriff verfügbar');
        }
    }
    
    try {
        log('Starte vollständiges Backup aller Daten...', 'info');
        
        // Sicherstellen, dass das Backup-Verzeichnis existiert
        const backupDirHandle = await ensureBackupDirectory(rootDirectoryHandle);
        
        // Zeitstempel für das Backup-Set
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupSetName = `backup_${timestamp}`;
        
        // Backup-Set-Verzeichnis erstellen
        const backupSetDirHandle = await backupDirHandle.getDirectoryHandle(backupSetName, { create: true });
        
        // Alle Dateien im Root-Verzeichnis durchgehen und sichern
        const backedUpFiles = [];
        const skippedFiles = [];
        
        for await (const [name, entry] of rootDirectoryHandle.entries()) {
            // Backup-Verzeichnis selbst überspringen
            if (name === BACKUP_FOLDER_NAME) {
                continue;
            }
            
            if (entry.kind === 'file') {
                try {
                    // Datei lesen
                    const file = await entry.getFile();
                    const content = await file.text();
                    
                    // Datei im Backup-Set speichern
                    const backupFileHandle = await backupSetDirHandle.getFileHandle(name, { create: true });
                    const writable = await backupFileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    
                    backedUpFiles.push(name);
                } catch (fileError) {
                    log(`Konnte Datei nicht sichern: ${name} - ${fileError.message}`, 'warn');
                    skippedFiles.push({ name, reason: fileError.message });
                }
            }
        }
        
        // Backup-Metadaten erstellen und speichern
        const metadata = {
            timestamp: new Date().toISOString(),
            username: username || 'anonymous',
            backedUpFiles,
            skippedFiles,
            totalFiles: backedUpFiles.length,
            status: 'complete'
        };
        
        const metadataFileHandle = await backupSetDirHandle.getFileHandle('_metadata.json', { create: true });
        const metadataWritable = await metadataFileHandle.createWritable();
        await metadataWritable.write(JSON.stringify(metadata, null, 2));
        await metadataWritable.close();
        
        log(`Vollständiges Backup erstellt: ${backupSetName} (${backedUpFiles.length} Dateien)`, 'info');
        
        return {
            backupName: backupSetName,
            backedUpFiles,
            skippedFiles,
            timestamp: metadata.timestamp
        };
    } catch (error) {
        log(`Fehler beim Erstellen des vollständigen Backups: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Listet alle verfügbaren Backups auf
 * @param {FileSystemDirectoryHandle} rootDirectoryHandle - Das Root-Verzeichnis
 * @returns {Promise<Array>} Liste der verfügbaren Backups
 */
async function listBackups(rootDirectoryHandle) {
    if (!rootDirectoryHandle) {
        if (window.directoryHandle) {
            rootDirectoryHandle = window.directoryHandle;
        } else {
            throw new Error('Kein Dateisystem-Zugriff verfügbar');
        }
    }
    
    try {
        // Versuchen, das Backup-Verzeichnis zu öffnen
        let backupDirHandle;
        try {
            backupDirHandle = await rootDirectoryHandle.getDirectoryHandle(BACKUP_FOLDER_NAME);
        } catch (error) {
            if (error.name === 'NotFoundError') {
                log('Keine Backups gefunden. Backup-Verzeichnis existiert nicht.', 'info');
                return [];
            }
            throw error;
        }
        
        // Alle Backup-Sets auflisten
        const backups = [];
        for await (const [name, entry] of backupDirHandle.entries()) {
            if (entry.kind === 'directory' && name.startsWith('backup_')) {
                try {
                    // Metadaten lesen, wenn vorhanden
                    let metadata = null;
                    try {
                        const metadataHandle = await entry.getFileHandle('_metadata.json');
                        const metadataFile = await metadataHandle.getFile();
                        const metadataText = await metadataFile.text();
                        metadata = JSON.parse(metadataText);
                    } catch (metadataError) {
                        // Wenn keine Metadaten vorhanden sind, verwenden wir Standardwerte
                        log(`Keine Metadaten für Backup ${name} gefunden.`, 'warn');
                    }
                    
                    // Dateien im Backup-Set zählen
                    let fileCount = 0;
                    for await (const [, fileEntry] of entry.entries()) {
                        if (fileEntry.kind === 'file') {
                            fileCount++;
                        }
                    }
                    
                    backups.push({
                        name,
                        timestamp: metadata?.timestamp || name.split('_')[1],
                        username: metadata?.username || 'unknown',
                        files: metadata?.totalFiles || fileCount,
                        status: metadata?.status || 'unknown'
                    });
                } catch (backupError) {
                    log(`Fehler beim Lesen des Backups ${name}: ${backupError.message}`, 'warn');
                }
            }
        }
        
        // Nach Zeitstempel sortieren (neueste zuerst)
        backups.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        return backups;
    } catch (error) {
        log(`Fehler beim Auflisten der Backups: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Bereinigt alte Backups basierend auf einem Aufbewahrungszeitraum
 * @param {FileSystemDirectoryHandle} rootDirectoryHandle - Das Root-Verzeichnis
 * @param {number} maxAgeDays - Maximales Alter der Backups in Tagen
 * @param {number} minBackupsToKeep - Minimale Anzahl an Backups, die behalten werden sollen
 * @returns {Promise<Array>} Liste der gelöschten Backups
 */
async function cleanupOldBackups(rootDirectoryHandle, maxAgeDays = 30, minBackupsToKeep = 5) {
    try {
        // Alle Backups auflisten
        const backups = await listBackups(rootDirectoryHandle);
        
        // Wenn weniger als minBackupsToKeep, behalten wir alle
        if (backups.length <= minBackupsToKeep) {
            log(`Nur ${backups.length} Backups vorhanden. Keine Bereinigung notwendig.`, 'info');
            return [];
        }
        
        // Backups nach Alter filtern
        const maxAgeDate = new Date();
        maxAgeDate.setDate(maxAgeDate.getDate() - maxAgeDays);
        
        // Backups in zu löschende und zu behaltende aufteilen
        const backupsToKeep = [];
        const backupsToDelete = [];
        
        for (const backup of backups) {
            const backupDate = new Date(backup.timestamp);
            
            if (backupDate < maxAgeDate && backupsToKeep.length >= minBackupsToKeep) {
                backupsToDelete.push(backup);
            } else {
                backupsToKeep.push(backup);
            }
        }
        
        // Backup-Verzeichnis öffnen
        const backupDirHandle = await rootDirectoryHandle.getDirectoryHandle(BACKUP_FOLDER_NAME);
        
        // Alte Backups löschen
        const deletedBackups = [];
        for (const backup of backupsToDelete) {
            try {
                await backupDirHandle.removeEntry(backup.name, { recursive: true });
                deletedBackups.push(backup);
                log(`Altes Backup gelöscht: ${backup.name}`, 'info');
            } catch (deleteError) {
                log(`Fehler beim Löschen des Backups ${backup.name}: ${deleteError.message}`, 'warn');
            }
        }
        
        log(`Backup-Bereinigung abgeschlossen. ${deletedBackups.length} alte Backups gelöscht.`, 'info');
        return deletedBackups;
    } catch (error) {
        log(`Fehler bei der Backup-Bereinigung: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Stellt eine Datei aus einem Backup wieder her
 * @param {FileSystemDirectoryHandle} rootDirectoryHandle - Das Root-Verzeichnis
 * @param {string} backupName - Name des Backup-Sets
 * @param {string} fileName - Name der wiederherzustellenden Datei
 * @returns {Promise<boolean>} True, wenn die Wiederherstellung erfolgreich war
 */
async function restoreFileFromBackup(rootDirectoryHandle, backupName, fileName) {
    try {
        // Backup-Verzeichnis öffnen
        const backupDirHandle = await rootDirectoryHandle.getDirectoryHandle(BACKUP_FOLDER_NAME);
        
        // Backup-Set öffnen
        const backupSetDirHandle = await backupDirHandle.getDirectoryHandle(backupName);
        
        // Datei aus dem Backup lesen
        const backupFileHandle = await backupSetDirHandle.getFileHandle(fileName);
        const backupFile = await backupFileHandle.getFile();
        const content = await backupFile.text();
        
        // Datei im Root-Verzeichnis wiederherstellen
        const fileHandle = await rootDirectoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        log(`Datei ${fileName} aus Backup ${backupName} wiederhergestellt`, 'info');
        return true;
    } catch (error) {
        log(`Fehler bei der Wiederherstellung von ${fileName} aus Backup ${backupName}: ${error.message}`, 'error');
        throw error;
    }
}

// Öffentliche API des Backup-Managers
window.backupManager = {
    createFileBackup,
    createFullBackup,
    listBackups,
    cleanupOldBackups,
    restoreFileFromBackup,
    ensureBackupDirectory
};

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    log('Backup-Manager geladen', 'info');
});
