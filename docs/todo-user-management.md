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
