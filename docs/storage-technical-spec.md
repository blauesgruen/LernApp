# Technische Spezifikation: Speichersystem

## Architektur

Das Speichersystem der LernApp verwendet eine mehrschichtige Architektur mit automatischen Fallback-Mechanismen:

```
+---------------------------+
|      Anwendungslogik      |
+---------------------------+
              |
              v
+---------------------------+
|       storage.js API      |
+---------------------------+
              |
        +-----+-----+
        |           |
        v           v
+---------------+  +---------------+
| File System   |  | IndexedDB     |
| Access API    |  | Fallback      |
+---------------+  +---------------+
        |                  |
        +--------+--------+
                 |
                 v
        +---------------+
        | localStorage  |
        | Fallback      |
        +---------------+
```

## Komponenten und Abhängigkeiten

### 1. storage.js (Kernsystem)

**Verantwortlichkeiten:**
- Bietet einheitliche API für Datenspeicherung
- Verwaltet Speicherpfad-Konfiguration
- Führt automatischen Fallback durch

**Abhängigkeiten:**
- persistent-file-system.js
- storage-indexeddb.js
- storage-access.js (für Zugriffstests)

### 2. persistent-file-system.js

**Verantwortlichkeiten:**
- Verwaltet DirectoryHandle-Persistenz über IndexedDB
- Bietet Funktionen für Dateisystemzugriff
- Handhabt Berechtigungen

**Abhängigkeiten:**
- Moderne Browser mit File System Access API

### 3. storage-handler.js

**Verantwortlichkeiten:**
- Automatische DirectoryHandle-Wiederherstellung bei Seitenladen
- Prüft Login-Status vor Wiederherstellungsversuch
- Startet Reparaturversuche bei Problemen

**Abhängigkeiten:**
- persistent-file-system.js
- logger.js (für zentrales Logging)

### 4. storage-fix.js

**Verantwortlichkeiten:**
- Automatische Reparatur bei Speicherproblemen
- Mehrere Fallback-Methoden für Wiederherstellung
- Benutzerbenachrichtigungen bei Problemen

**Abhängigkeiten:**
- persistent-file-system.js
- notification.js (für Benutzerbenachrichtigungen)

### 5. storage-indexeddb.js

**Verantwortlichkeiten:**
- Bietet IndexedDB-Fallback für große Datenmengen
- Automatische Datenbankverwaltung
- Kompatibilitätsprüfung

**Abhängigkeiten:**
- Moderne Browser mit IndexedDB-Unterstützung

### 6. storage-access.js

**Verantwortlichkeiten:**
- Definitive Tests für Speicherzugriff
- Reale Dateischreibtests statt Flag-Überprüfung
- Detaillierte Fehlerberichte

**Abhängigkeiten:**
- persistent-file-system.js
- logger.js (für zentrales Logging)

## Datenfluss

1. **Speichern von Daten:**
   ```
   saveData(key, data) → 
      getDirectoryHandle() →
         Wenn verfügbar: saveToFileSystem(key, data)
         Wenn nicht verfügbar: saveToIndexedDB(key, data)
         Wenn beides fehlschlägt: saveToLocalStorage(key, data)
   ```

2. **Laden von Daten:**
   ```
   loadData(key) →
      getDirectoryHandle() →
         Wenn verfügbar: loadFromFileSystem(key)
         Wenn nicht verfügbar: loadFromIndexedDB(key)
         Wenn beides fehlschlägt: loadFromLocalStorage(key)
   ```

3. **DirectoryHandle-Wiederherstellung:**
   ```
   DOMContentLoaded →
      Wenn eingeloggt: restoreDirectoryHandle() →
         loadDirectoryHandle() aus IndexedDB →
            Wenn erfolgreich: verifyPermission()
            Wenn nicht erfolgreich: autoRepairDirectoryHandle()
   ```

## Storage-Pfad-Konfiguration

Die Anwendung unterstützt drei Arten von Speicherpfaden:

1. **DEFAULT_STORAGE_PATH**: Verwendet Browser-lokalen Speicher
2. **Benutzerdefinierter Pfad**: Vom Benutzer ausgewähltes Verzeichnis via DirectoryHandle
3. **Temporärer Pfad**: Für Gast-Zugriff oder bei Reparaturversuchen

Die Pfadkonfiguration wird benutzerspezifisch in localStorage gespeichert und beim Login initialisiert.

## Optimierungen

1. **Bildkompression:**
   - Automatische Kompression von Bildern auf maximal 800px Breite
   - Qualitätsreduktion auf 80% bei JPEG
   - Canvas-basierte Verarbeitung im Browser

2. **Chunking großer Daten:**
   - Automatische Aufteilung von Daten über 5MB
   - Sequentielle Speicherung in kleineren Chunks
   - Transparente Zusammenführung beim Laden

3. **Lazy Loading:**
   - Verzögerte Initialisierung erst nach Login
   - Bedarfsgesteuertes Laden von Daten

## Fehlerbehandlung

Umfassendes Fehlerbehandlungssystem mit mehreren Fallbacks:

1. Primärer Speicherort nicht verfügbar → Fallback auf IndexedDB
2. IndexedDB nicht verfügbar → Fallback auf localStorage
3. Speicherquota überschritten → Automatische Datenkompression
4. DirectoryHandle verloren → Automatische Wiederherstellung
5. Alle Mechanismen fehlgeschlagen → Benutzerbenachrichtigung

## Performance-Überlegungen

1. **Caching:**
   - Häufig verwendete Daten werden im Memory-Cache gehalten
   - Vermeidung redundanter Dateisystemzugriffe

2. **Asynchrone Verarbeitung:**
   - Alle Speicheroperationen sind asynchron (Promise-basiert)
   - Verhindert Blockieren der UI bei großen Datenmengen

3. **Batch-Operationen:**
   - Gruppierung mehrerer kleiner Speicheroperationen
   - Reduziert Anzahl der Dateisystemzugriffe

## Sicherheitsaspekte

1. **Berechtigungsmodell:**
   - File System Access API erfordert explizite Benutzerzustimmung
   - Periodische Erneuerung der Berechtigungen

2. **Sandbox:**
   - Begrenzter Zugriff nur auf ausgewählte Verzeichnisse
   - Keine globalen Dateisystemrechte

3. **Benutzerdaten:**
   - Speicherung erst nach erfolgreicher Authentifizierung
   - Benutzerspezifische Speicherpfade

## Browser-Kompatibilität

| Feature             | Chrome | Edge | Firefox | Safari | Fallback |
|---------------------|--------|------|---------|--------|----------|
| File System Access  | Ja     | Ja   | Nein    | Nein   | IndexedDB|
| IndexedDB           | Ja     | Ja   | Ja      | Ja     | localStorage |
| localStorage        | Ja     | Ja   | Ja      | Ja     | - |

## Zukunftspläne

1. **Synchronisation:**
   - Cloud-basierte Synchronisation über verschiedene Geräte
   - Konfliktlösung bei gleichzeitigen Änderungen

2. **Verschlüsselung:**
   - Ende-zu-Ende-Verschlüsselung für sensitive Daten
   - Schlüsselverwaltung im Browser

3. **Fortgeschrittene Kompression:**
   - Intelligente Kompression basierend auf Datentyp
   - WASM-basierte Kompressionsalgorithmen für bessere Performance
