# TODO: Verbesserte Benutzerverwaltung für LernApp

## Ziel
Implementierung einer konsistenten Benutzerdatenbank und Admin-Verwaltungsfunktionen, die auch nach Benutzernamensänderungen Datenkonsistenz gewährleisten.

## Aufgabenliste

### 1. Grundlegende Umstrukturierung der Benutzerdatenbank

- [ ] **Eindeutige Benutzer-IDs einführen**
  - UUID-Generierung für jeden Benutzer implementieren
  - Benutzermodell anpassen: `{id, username, password, ...}`
  - Migrationshelfer für bestehende Benutzerkonten erstellen

- [ ] **Referenzen anpassen**
  - Alle Verweise auf Benutzername durch ID ersetzen
  - Überarbeitung der Benutzerreferenzen in:
    - Fragen (`createdBy`)
    - Kategorien (`createdBy`)
    - Statistiken (`userId`)

- [ ] **Transaktionsmanagement**
  - Hilfsfunktion für atomare Datenbank-Updates implementieren
  - Rollback-Mechanismus für fehlgeschlagene Änderungen

### 2. Verwaltungsfunktionen für Benutzerkonten

- [ ] **Nutzernamenänderung verbessern**
  - Prozess überarbeiten, um Datenintegrität zu gewährleisten
  - Update aller Abhängigkeiten bei Namensänderung
  - Validierung für konfliktfreie Namen

- [ ] **Konto-Zusammenführung**
  - Funktion zum Zusammenführen von Benutzerkonten
  - Alle Daten auf ein Hauptkonto übertragen
  - Altes Konto markieren oder löschen

- [ ] **Benutzerstatusmanagement**
  - Status für Benutzer hinzufügen (aktiv, inaktiv, gesperrt)
  - Zeitstempel für letzte Aktivität implementieren
  - Automatische Erkennung inaktiver Konten

### 3. Admin-Panel

- [ ] **Benutzerverwaltungsinterface**
  - Liste aller Benutzer mit Filtern und Sortierung
  - Detailansicht für Benutzerinformationen
  - Aktionsmenü für Verwaltungsfunktionen

- [ ] **Datenbereinigungswerkzeuge**
  - Werkzeug zur Erkennung von "Leichen" (inaktive/verwaiste Konten)
  - Massenaktionen für mehrere Benutzer
  - Exportfunktion für Benutzerdaten

- [ ] **Benutzerstatistiken**
  - Dashboard für Admin mit Nutzungsstatistiken
  - Aktivitätsgraphen und Nutzungstrends
  - Warnungen für auffällige Muster

### 4. Sicherheitsverbesserungen

- [ ] **Rechtemanagement**
  - Rollenbasiertes Zugriffsmanagement implementieren
  - Rollen definieren: Admin, Moderator, Lehrer, Schüler
  - Berechtigungen für verschiedene Funktionen konfigurieren

- [ ] **Sicherheitsaudit**
  - Protokollierung aller administrativen Aktionen
  - Änderungsverlauf für Benutzerkonten
  - Benachrichtigungssystem für kritische Änderungen

### 5. Dokumentation und Tests

- [ ] **Codekommentare aktualisieren**
  - Neue Datenstrukturen dokumentieren
  - Funktionen mit JSDoc-Kommentaren versehen

- [ ] **Benutzerhandbuch erweitern**
  - Dokumentation für Administratoren
  - Anleitungen für typische Verwaltungsaufgaben

- [ ] **Testfälle**
  - Unit-Tests für Benutzerverwaltungsfunktionen
  - Integrationstests für komplexe Szenarien
  - UI-Tests für Admin-Panel

## Priorisierung

1. **Hohe Priorität**: Eindeutige IDs und Referenzanpassung
2. **Mittlere Priorität**: Verbesserte Nutzernamenänderung, Benutzerstatus
3. **Niedrige Priorität**: Admin-Panel, Statistiken, Massenaktionen

## Nächste konkrete Schritte

1. Datenmodell für Benutzer aktualisieren
2. UUID-Generierung implementieren
3. Migrationsskript für bestehende Daten erstellen
4. `createdBy`-Felder in allen Datenstrukturen anpassen

## Ergänzende TODOs: Storage / DirectoryHandle (für LernApp Datei-Speicherung)

Diese Liste fasst alle noch offenen Arbeiten zusammen, die ich im Laufe der Debugging-Sitzung gefunden oder begonnen habe. Sie ist so formuliert, dass du später auf einem anderen Rechner direkt weiterarbeiten kannst.

### Kontext
- Die App nutzt die File System Access API und speichert per-Benutzer DirectoryHandles in IndexedDB (`LernAppDirectoryHandles`), plus Fallback-Flags in `localStorage`.
- Probleme, die gelöst werden müssen: inkonsistente Persistenz, Timing/Restore-Probleme beim Seitenwechsel, Footer-Icon zeigt falschen Status (Profilseite war früher immer grün aufgrund einer UI-Anzeige), Debug-Tools hatten DB-Version-Mismatch.

### Aufgaben (konkret + reproduzierbar)

- [ ] Prüfung: Reproduce-Checks
  - In der Konsole ausführen (auf Dashboard / Profile):
    - Prüfen, ob `window.directoryHandle` gesetzt ist
    - `await window.restoreDirectoryHandle(username)` ausführen und Ergebnis prüfen
    - `debugPersistentStorage()` aufrufen und `indexedDBStatus` inspizieren
  - Notiere die Ausgaben in einem kurzen Log. Diese Schritte sind wichtig, bevor du weitere Änderungen machst.

- [ ] B: SessionStorage-Bridge (Kurzfristig, UX-fix)
  - Beim erfolgreichen Speichern eines Handles (`storeDirectoryHandle` / Auswahl via Footer) zusätzlich setzen:
    - `sessionStorage.setItem('lernapp_dir_just_selected', String(Date.now()))`
  - Auf jeder Seite beim Laden prüfen: wenn `sessionStorage.getItem('lernapp_dir_just_selected')` vorhanden, sofort `await window.restoreDirectoryHandle(username)` aufrufen und danach `sessionStorage.removeItem('lernapp_dir_just_selected')`.
  - Ziel: frisch ausgewählte Handles sind nach Navigation sofort verfügbar, ohne 30s-Geschummel.

- [ ] A: Logging / Diagnose (bereits begonnen)
  - `storeDirectoryHandle` hat jetzt detaillierte Logs; wenn Writes fehlschlagen, kopiere den kompletten Fehleroutput.
  - Falls Fehler wie `InvalidStateError` oder `QuotaExceededError` erscheinen: screenshot/console-copy anfertigen.

- [ ] Reparaturpfad: robuste Write-Retry & Cleanup
  - Wenn `storeDirectoryHandle` mit `InvalidStateError` fehlschlägt: Implementiere eine Retry-Strategie, die folgendes versucht:
    1. `clearHandleFromDatabase()` für den betroffenen Benutzer
    2. Retry `storeDirectoryHandle(handle)` (max. 2 Versuche)
  - Logge jeden Schritt genau.

- [ ] Restore-Verbesserung in Loader
  - `storage-loader.js` sollte nach `persistentStorageModulesLoaded` nicht nur versuchen `restoreDirectoryHandle`, sondern das Ergebnis global setzen (`window.directoryHandle`) und `document.dispatchEvent(new CustomEvent('directoryHandleChanged', {detail:{handle}}))` — sicherstellen, dass dies zuverlässig passiert.

- [ ] Footer-Icon: endgültige Regeln
  - Icon wird nur auf GRÜN gesetzt, wenn mindestens ein dieser Checks erfolgreich ist (in Reihenfolge):
    1. `window.directoryHandle` existiert (validiertes Handle)
    2. `await window.restoreDirectoryHandle(username)` liefert ein Handle
    3. `#current-storage-path` DOM-Element existiert UND `data-storage-verified="true"`
  - Gelb = localStorage-Flag `hasStoredDirectoryHandle_<user>` vorhanden (nur dann)
  - Rot = keine Hinweise
  - Entferne die 30s grace-period wenn Session-Bridge implementiert ist.

- [ ] Debug-Tools: DB-Version Konsistenz
  - Sicherstellen, dass alle Debug/legacy-Module die gleiche DB-Version (3) verwenden.
  - Falls weitere Skripte noch Version 2 öffnen, auf 3 anpassen.

- [ ] Tests
  - Unit-Test: `storeDirectoryHandle` happy path + simulated failure (mock IndexedDB) => prüfe retries.
  - Integration: Navigationstest: wähle einen Ordner im Dashboard, navigiere zur Profilseite, prüfe `window.directoryHandle` und Footer-Icon.

### Arbeitsanweisungen für nächsten Rechner
1. Checkout dieses Repos, Branch `main`.
2. Öffne Developer Tools -> Console.
3. Führe die Reproduce-Checks (oben) aus und kopiere das Ergebnis in eine Datei `storage-debug-log.txt`.
4. Wenn `storeDirectoryHandle` Fehler produziert, kopiere den kompletten Fehler-Output in `storage-debug-log.txt`.
5. Implementiere (oder bitte mich implementieren zu lassen) die SessionStorage-Bridge (B). Nach Implementierung: wiederhole Reproduce-Checks.

### Priorisierung (Storage-spezifisch)
1. Kurzfristig: Reproduce-Checks + SessionStorage-Bridge (B)
2. Mittelfristig: Robustere Write-Retry & Repair-Flow
3. Langfristig: Einheitliche Tests + Entfernen des Grace-Tricks

---

Füge hier bitte beim Weiterarbeiten die Console-Outputs als Kommentar ein, damit der nächste Entwickler sofort sieht, welche Werte `restoreDirectoryHandle` / IndexedDB aktuell liefern.

