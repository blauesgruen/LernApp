# Legacy Speichermodule

Diese Dateien gehören zum alten Speichersystem der LernApp und werden nicht mehr aktiv verwendet. Sie wurden durch ein vereinfachtes System in `storage-core.js` ersetzt.

## Grund für die Ersetzung

Das alte System bestand aus mehreren Modulen mit komplexen Abhängigkeiten, was zu Problemen bei der Wartung und Fehlersuche führte. Besonders nach Computer-Neustarts gab es Probleme mit der Dateisystem-Zugriffsberechtigungen.

## Beibehaltene Dateien

Diese Dateien werden als Referenz und für Notfälle beibehalten. Sollte das neue System Probleme verursachen, können Sie temporär zum alten System zurückkehren, indem Sie in `storage-loader.js` die Konfiguration anpassen.

## Dateiübersicht:

- `storage.js` - Hauptspeichermodul mit saveData und loadData Funktionen
- `storage-fix.js` - Automatische Reparaturfunktionen für Dateisystemzugriff
- `storage-access.js` - Zugriffsprüfungen für Speicherorte
- `persistent-file-system.js` - Verwaltung des File System Access API
- `storage-diagnostics.js` - Diagnosewerkzeuge für Speicherprobleme
- `storage-selector.js` - UI zur Auswahl des Speicherorts
- `storage-handler.js` - Initialisierung und Verwaltung des Speichers

Alle diese Funktionalitäten wurden in einem vereinfachten Workflow in `storage-core.js` zusammengeführt.
