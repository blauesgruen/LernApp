# To-Do-Liste für die Verbesserung der Benutzerverwaltung

Diese Liste enthält Verbesserungsvorschläge für die Benutzerverwaltung in der LernApp, um zukünftige Probleme zu vermeiden.

## Kurzfristige Maßnahmen

- [x] Benutzernamensänderung verbessern: Sicherstellen, dass alle Datenstrukturen aktualisiert werden
- [x] Kontolöschung verbessern: Benutzerdaten vollständig aus LocalStorage und Storage-System entfernen
- [x] Case-Insensitive Benutzernamensvergleich beim Login implementieren
- [x] Synchronisation zwischen LocalStorage und Storage-System-Benutzerdaten

## Mittelfristige Maßnahmen

- [ ] Einheitliches Datenzugriffskonzept implementieren
  - [ ] Alle Benutzer-bezogenen Operationen über eine zentrale API abstrahieren
  - [ ] CRUD-Operationen für Benutzer vereinheitlichen
  - [ ] Synchronisierungsmechanismus für LocalStorage und Storage-System

- [ ] Benutzer-IDs statt Benutzernamen als Primärschlüssel verwenden
  - [ ] Eindeutige IDs für Benutzer (z.B. UUIDs) generieren
  - [ ] Alle Referenzen in der Anwendung auf IDs umstellen
  - [ ] Migrationsplan für bestehende Daten erstellen

- [ ] Transaktion-ähnliches System für zusammenhängende Operationen
  - [ ] Rollback-Mechanismus bei teilweise fehlgeschlagenen Operationen
  - [ ] Konsistenz bei Fehlerszenarien sicherstellen

## Langfristige Maßnahmen

- [ ] Admin-Bereich für Benutzerverwaltung einrichten
  - [ ] Benutzer anzeigen, bearbeiten, löschen
  - [ ] Berechtigungsverwaltung
  - [ ] Benutzeraktivitäten einsehen

- [ ] Mehrstufiges Authentifizierungssystem einführen
  - [ ] E-Mail-Verifizierung
  - [ ] Passwort-Zurücksetzen-Funktion
  - [ ] Optionale Zwei-Faktor-Authentifizierung

- [ ] Datenschutz und DSGVO-Funktionen
  - [ ] Funktion zum Herunterladen aller persönlichen Daten
  - [ ] Verbesserter Prozess zur vollständigen Datenlöschung
  - [ ] Datenschutzeinstellungen für Benutzer

## Technische Schulden

- [ ] Code-Duplizierung bei Benutzeroperationen reduzieren
- [ ] Bessere Fehlerbehandlung bei Netzwerkproblemen oder Speicherzugriff
- [ ] Unit-Tests für kritische Benutzerverwaltungsfunktionen einführen
- [ ] Logging und Überwachung für Authentifizierungsvorgänge verbessern
