# LernApp Speichersystem - Dokumentation

## Übersicht

Das Speichersystem der LernApp ermöglicht die persistente Speicherung von Daten über verschiedene Speichermechanismen und gewährleistet den Zugriff auch über Seitennavigationen hinweg.

## Komponenten

Das Speichersystem besteht aus folgenden Hauptkomponenten:

1. **storage.js**: Zentrale Speicherverwaltung mit Fallback-Mechanismen
2. **persistent-file-system.js**: Persistente Speicherung des Dateisystem-Zugriffs
3. **storage-handler.js**: Automatische Wiederherstellung des Speicherzugriffs bei Seitennavigation
4. **storage-fix.js**: Automatische Reparatur bei Speicherzugriffsproblemen
5. **storage-indexeddb.js**: IndexedDB-Fallback für große Datenmengen
6. **storage-access.js**: Definitive Tests für Speicherzugriff

## Speicherschichten

Die LernApp verwendet mehrere Speicherschichten mit automatischem Fallback:

1. **File System Access API**: Ermöglicht das Speichern in vom Benutzer ausgewählten Verzeichnissen
2. **IndexedDB**: Fallback für große Datenmengen wenn Dateisystemzugriff nicht verfügbar
3. **localStorage**: Letzter Fallback für kleine Datenmengen

## Initialisierung des Speichersystems

### Speicherort-Initialisierung

Die Initialisierung des Speichersystems erfolgt nicht mehr automatisch beim Laden der Seite, sondern erst nach erfolgreichem Login des Benutzers. Dies verhindert unnötige Speicherzugriffsversuche und verbessert die Sicherheit.

```javascript
// In auth.js nach erfolgreichem Login
if (window.initializeStorageForUser) {
    await window.initializeStorageForUser(currentUsername);
}
```

### Automatische DirectoryHandle-Wiederherstellung

Um den Verlust des DirectoryHandles zwischen Seitennavigationen zu verhindern, wird der Handle automatisch beim Laden jeder Seite wiederhergestellt:

```javascript
// In storage-handler.js
document.addEventListener('DOMContentLoaded', async () => {
    // Nur wenn der Benutzer eingeloggt ist
    if (localStorage.getItem('loggedIn') === 'true') {
        if (window.restoreDirectoryHandle) {
            await window.restoreDirectoryHandle();
        }
    }
});
```

## Persistenz des Dateisystem-Zugriffs

### IndexedDB für DirectoryHandle-Speicherung

DirectoryHandles werden in der IndexedDB gespeichert, um sie über Seitennavigationen hinweg zu erhalten:

```javascript
// In persistent-file-system.js
async function storeDirectoryHandle(handle) {
    const db = await initHandleDb();
    // Speichert das Handle in IndexedDB
}

async function loadDirectoryHandle() {
    const db = await initHandleDb();
    // Lädt das Handle aus IndexedDB
}
```

### Robuste IndexedDB-Initialisierung

Die IndexedDB-Initialisierung wurde verbessert, um Fehler bei der Datenbankstruktur zu vermeiden:

```javascript
async function initHandleDb() {
    // Erhöhte Version um Upgrades zu erzwingen
    const request = indexedDB.open('LernAppDirectoryHandles', 2);
    
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Lösche alten Object Store falls vorhanden
        if (db.objectStoreNames.contains(DIR_HANDLE_STORE_NAME)) {
            db.deleteObjectStore(DIR_HANDLE_STORE_NAME);
        }
        // Erstelle neuen Object Store
        db.createObjectStore(DIR_HANDLE_STORE_NAME);
    };
    
    // Weitere Fehlerbehandlung...
}
```

## Automatische Reparatur

Bei Problemen mit dem Speicherzugriff versucht das System automatisch, den Zugriff wiederherzustellen:

```javascript
// In storage-fix.js
async function autoRepairDirectoryHandle() {
    // Verschiedene Methoden zur Wiederherstellung des Zugriffs...
}
```

## Definitive Speicherzugriffsprüfung

Statt sich auf Flags zu verlassen, testet das System den tatsächlichen Dateizugriff:

```javascript
// In storage-access.js
async function checkStorageAccess(username) {
    try {
        // Testet tatsächlichen Lese-/Schreibzugriff mit einer temporären Datei
        return { accessAvailable: true, ... };
    } catch (error) {
        return { accessAvailable: false, ... };
    }
}
```

## Bildkompression für große Dateien

Für Bilder, die in Fragen oder Antworten verwendet werden, bietet das System automatische Kompression:

```javascript
// In image-utils.js
async function compressImage(file, maxWidth = 800, quality = 0.8) {
    // Komprimiert Bilder vor dem Speichern
}
```

## Fallback für große Datenmengen

Für große Datenmengen, die den localStorage-Speicher überschreiten würden, wird IndexedDB verwendet:

```javascript
// In storage-indexeddb.js
async function saveToIndexedDB(key, data) {
    // Speichert Daten in IndexedDB statt localStorage
}
```

## Wichtige Änderungen in Version 2.0

1. **Verzögerte Initialisierung**: Speicherort wird erst nach Login initialisiert
2. **Verbesserte Persistenz**: DirectoryHandle wird zuverlässig über Seitennavigationen hinweg erhalten
3. **Robuste IndexedDB**: Verbesserte Fehlerbehandlung und automatische Reparatur der Datenbankstruktur
4. **Zentrale Logging**: Umfassende Protokollierung aller Speicheroperationen
5. **Automatische Wiederherstellung**: Verbesserte Mechanismen zur Behebung von Zugriffsverlusten

## Fehlerbehebung

Bei Problemen mit dem Speicherzugriff:

1. Überprüfen Sie die Konsolenausgabe auf Fehlermeldungen
2. Verwenden Sie das Debug-Tool `window.testFileSystemAccess()` in der Konsole
3. Setzen Sie den Speicherort zurück mit `window.resetStoragePath(username)`
4. Verwenden Sie `window.forceRestoreDirectoryHandle()` zur Wiederherstellung des Zugriffs

## Entwicklungsnotizen

Die aktuelle Version bietet verbesserte Zuverlässigkeit bei Seitennavigationen und verhindert Probleme mit dem Verlust des Dateisystemzugriffs. Die Speicherinitialisierung erfolgt nur nach Login, was die Sicherheit erhöht und unnötige Zugriffe vermeidet.
