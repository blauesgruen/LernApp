# README: Speichersystem der LernApp

Dieses Verzeichnis enthält die Dokumentation zum Speichersystem der LernApp.

## Verfügbare Dokumente

- [Speichersystem Überblick](storage-system.md) - Allgemeine Beschreibung und Funktionsweise
- [Technische Spezifikation](storage-technical-spec.md) - Detaillierte technische Architektur
- [Fehlerbehebung](storage-troubleshooting.md) - Hilfe bei häufigen Problemen
- [Changelog](storage-changelog.md) - Änderungshistorie des Speichersystems

## Schnellstart

Das Speichersystem der LernApp bietet mehrere Speichermechanismen mit automatischem Fallback:

1. **File System Access API** für benutzerdefinierte Speicherorte
2. **IndexedDB** für große Datenmengen
3. **localStorage** als letzter Fallback

Die Initialisierung erfolgt nach dem Login über:

```javascript
await window.initializeStorageForUser(username);
```

## Hauptkomponenten

- **storage.js** - Zentrale API und Koordination
- **persistent-file-system.js** - Dateisystemzugriff und -persistenz
- **storage-handler.js** - Automatische Wiederherstellung des Zugriffs
- **storage-fix.js** - Automatische Reparatur bei Problemen
- **storage-indexeddb.js** - IndexedDB-Fallback für große Daten
- **storage-access.js** - Definitive Tests für Speicherzugriff

## Wichtige Konzepte

1. **Verzögerte Initialisierung**: Speicherort wird erst nach Login initialisiert
2. **Automatische Wiederherstellung**: DirectoryHandles werden bei Seitenwechseln automatisch wiederhergestellt
3. **Mehrstufiger Fallback**: Garantierter Zugriff durch mehrere Speicherschichten
4. **Robuste Fehlerbehandlung**: Umfangreiche Diagnostik und Reparaturmechanismen

## Browserunterstützung

- **Chrome/Edge**: Volle Unterstützung (File System Access API)
- **Firefox/Safari**: Eingeschränkte Unterstützung (IndexedDB + localStorage)

---

Letzte Aktualisierung: September 2023
