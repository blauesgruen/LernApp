# Fehlerbehebung im Speichersystem

Dieses Dokument enthält Hilfestellungen zur Behebung häufiger Probleme mit dem Speichersystem der LernApp.

## Häufige Probleme und Lösungen

### 1. DirectoryHandle geht beim Seitenwechsel verloren

**Problem**: Nach dem Wechsel zu einer anderen Seite in der App ist der Zugriff auf das Dateisystem nicht mehr verfügbar.

**Ursache**: DirectoryHandles können nicht direkt zwischen Seitennavigationen übertragen werden, da sie komplexe JavaScript-Objekte sind.

**Lösung**: 
- Die App verwendet jetzt eine automatische Wiederherstellung in storage-handler.js
- Wenn das Problem weiterhin besteht, führen Sie in der Konsole `window.forceRestoreDirectoryHandle()` aus

### 2. "Failed to execute 'transaction' on 'IDBDatabase'" Fehler

**Problem**: IndexedDB-Fehler bei der Wiederherstellung des DirectoryHandles.

**Ursache**: Die Datenbankstruktur könnte beschädigt oder fehlend sein.

**Lösung**:
- In der Konsole `window.initHandleDb()` ausführen, um die Datenbank neu zu initialisieren
- Browser-Cache leeren und Seite neu laden
- Falls das nicht hilft: `localStorage.removeItem('hasStoredDirectoryHandle')` ausführen und einen neuen Speicherort wählen

### 3. Berechtigungsprobleme beim Zugriff auf Dateien

**Problem**: Trotz vorhandenem DirectoryHandle gibt es Fehlermeldungen beim Dateizugriff.

**Ursache**: Die Berechtigung könnte abgelaufen sein oder der Browser hat sie zurückgesetzt.

**Lösung**:
- Im Profil einen neuen Speicherort auswählen
- In der Konsole `window.testFileSystemAccess()` ausführen, um die Berechtigungen zu erneuern
- Browser neu starten und erneut versuchen

### 4. Speicherquota überschritten

**Problem**: Fehlermeldung über erschöpften Speicherplatz.

**Ursache**: Der verfügbare localStorage oder IndexedDB-Speicher ist voll.

**Lösung**:
- Die App verwendet jetzt automatische Bildkompression
- Im Profil können Sie nicht mehr benötigte Daten löschen
- Wählen Sie einen Dateisystem-Speicherort statt des Browser-Speichers

### 5. Speichersystem wird initialisiert, bevor der Benutzer eingeloggt ist

**Problem**: Fehlermeldungen über Speicherzugriffsprobleme direkt beim Laden der App.

**Ursache**: Das Speichersystem versuchte, auf benutzerspezifische Daten zuzugreifen, bevor ein Login erfolgte.

**Lösung**:
- Dieses Problem wurde in der aktuellen Version behoben
- Die Initialisierung erfolgt jetzt erst nach erfolgreichem Login
- Falls das Problem weiterhin besteht, löschen Sie die localStorage-Daten und melden Sie sich erneut an

## Diagnose-Tools

Die App enthält mehrere Tools zur Diagnose von Speicherproblemen:

### In der Konsole verfügbare Funktionen

- `window.testFileSystemAccess()` - Testet den Zugriff auf das Dateisystem
- `window.forceRestoreDirectoryHandle()` - Erzwingt die Wiederherstellung des DirectoryHandles
- `window.diagnosePersistentStorage()` - Zeigt detaillierte Informationen zum Speicherzustand
- `window.clearStoragePath()` - Setzt den Speicherort zurück (Vorsicht: Daten könnten verloren gehen)

### Logging

Die App protokolliert alle wichtigen Speicheroperationen:

- Standard-Logs sind in der Konsole sichtbar
- Erweiterte Logs können im Profil unter "Diagnose" -> "Speicher-Logs anzeigen" eingesehen werden

## Manuelle Datenrettung

Wenn alle automatischen Reparaturversuche fehlschlagen:

1. Öffnen Sie die Entwicklertools (F12)
2. Wechseln Sie zum Tab "Application"
3. Unter "Storage" -> "IndexedDB" finden Sie die "LernAppDirectoryHandles" Datenbank
4. Notieren Sie sich die dort gespeicherten Daten
5. Unter "Storage" -> "Local Storage" finden Sie weitere App-Daten
6. Exportieren Sie wichtige Daten über die Profil-Funktion "Daten exportieren"
7. Setzen Sie die App mit `localStorage.clear()` zurück und melden Sie sich neu an
8. Importieren Sie die exportierten Daten wieder

## Support

Bei anhaltenden Problemen:
- Erstellen Sie einen Screenshot der Fehlermeldung
- Kopieren Sie relevante Fehlermeldungen aus der Konsole
- Beschreiben Sie die Schritte, die zum Fehler führen
- Kontaktieren Sie den Support unter support@lernapp-beispiel.de
