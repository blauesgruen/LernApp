# LernApp - Benutzeranleitung (Multi-User Version)

## Übersicht

Die LernApp ist eine interaktive Lernplattform mit Multi-User-Unterstützung, die es ermöglicht, eigene Fragen zu erstellen, Wissen zu testen und Inhalte mit anderen Benutzern zu teilen.


## 🚀 Erste Schritte

### Technische Hinweise (für fortgeschrittene Nutzer)

- Die App verwendet klassische `<script>`-Einbindung, keine Module!
- Alle wichtigen Funktionen und Manager sind global verfügbar (z.B. `window.app`, `window.questionManager`, `window.groupManager`, `window.storageManager`).
- Die Reihenfolge der Skripte ist wichtig (siehe README.md).

### Cloud-Speicher & Datenexport

Sie können Ihre Daten optional in einem Cloud-Ordner (z.B. Dropbox, Nextcloud, OneDrive) speichern. Dafür stehen folgende globale Methoden zur Verfügung (nach Laden der App):

- `chooseLernAppStorageDir()` – Cloud-Ordner wählen
- `saveLernAppDataToCloud(data)` – Datenbank speichern
- `loadLernAppDataFromCloud()` – Datenbank laden
- `exportLernAppData(data)` – Datenbank exportieren (Fallback)
- `importLernAppData()` – Datenbank importieren (Fallback)
- `getLernAppCloudHint()` – Hinweistext für UI
- `lernappAutoSave(data)` – Automatisches Speichern

**Hinweis:** Die Cloud-Funktionen sind nur verfügbar, wenn Ihr Browser die File System Access API unterstützt (z.B. Chrome, Edge). Bei Problemen prüfen Sie die Reihenfolge der Skripte in der `index.html`.

### Registrierung und Anmeldung

#### Neuen Account erstellen
1. **Öffnen Sie die LernApp** in Ihrem Browser
2. **Klicken Sie auf "Registrieren"** auf der Startseite
3. **Füllen Sie das Formular aus:**
   - **Benutzername:** 3-20 Zeichen, nur Buchstaben und Zahlen
   - **Passwort:** Mindestens 6 Zeichen
   - **Passwort bestätigen:** Erneut eingeben
   - **Anzeigename:** (Optional) Ihr öffentlicher Name
4. **Klicken Sie auf "Registrieren"**
5. **Sie werden automatisch angemeldet** und zum Dashboard weitergeleitet

#### Mit bestehendem Account anmelden
1. **Klicken Sie auf "Anmelden"** auf der Startseite
2. **Geben Sie Ihre Daten ein:**
   - Benutzername
   - Passwort
3. **Klicken Sie auf "Anmelden"**

#### Demo-Modus
- **Klicken Sie auf "Demo starten"** für eine schnelle Vorschau
- **Keine Registrierung erforderlich**
- **Daten werden nicht dauerhaft gespeichert**
- **Alle Features außer Datenteilung verfügbar**

## 📚 Hauptfunktionen

### Benutzer-Dashboard

Nach der Anmeldung sehen Sie Ihr persönliches Dashboard mit:

- **Willkommens-Nachricht** mit Ihrem Namen
- **Schnellstatistiken** (Kategorien, Fragen, Erfolgsquote)
- **Letzte Aktivität** 
- **Direkte Aktions-Buttons** für häufige Aufgaben

### Quiz spielen

#### Quiz starten
1. **Klicken Sie auf "Quiz starten"** im Dashboard
2. **Wählen Sie eine Kategorie** aus den verfügbaren Optionen
3. **Mindestens 4 Fragen** pro Kategorie erforderlich
4. **Quiz beginnt automatisch**

#### Quiz-Typen
- **Normale Kategorien:** Multiple-Choice mit Text- oder Bildantworten
- **"Ordne zu":** Spezielle Zuordnungsaufgaben mit Bildern
- **"Ordne zu (Gemischt)":** Sammelt Bild-Fragen aus allen Kategorien

#### Quiz durchführen
1. **Lesen Sie die Frage** aufmerksam
2. **Wählen Sie eine Antwort** durch Klicken
3. **Bestätigen Sie** mit "Antwort bestätigen"
4. **Sehen Sie das Ergebnis** (richtig/falsch)
5. **Weiter zur nächsten Frage** oder Quiz beenden

#### Ergebnisse
- **Auswertung** mit Prozent und Bewertung
- **Detaillierte Übersicht** aller Fragen und Antworten
- **Optionen:** Quiz wiederholen, Neues Quiz, Zur Startseite

### Fragen und Kategorien verwalten

#### Neue Kategorie erstellen
1. **Gehen Sie zu "Fragen erstellen"** (Admin-Bereich)
2. **Geben Sie einen Kategorienamen ein**
3. **Drücken Sie Enter** oder klicken Sie auf "+"
4. **Kategorie wird sofort verfügbar**

**Vordefinierte Kategorien:**
- **"Allgemein"** - Für allgemeine Fragen
- **"Ordne zu"** - Für spezielle Zuordnungsaufgaben

#### Neue Frage erstellen
1. **Wählen Sie eine Kategorie** aus dem Dropdown
2. **Frage-Eingabe:**
   - **Frage-Text:** (Optional) Textuelle Frage
   - **Frage-Bild:** (Optional) Bild zur Frage hochladen
   - **Mindestens eins** von beiden erforderlich
3. **Antwort-Typ wählen:**
   - **Text-Antwort:** Textuelle Antwort eingeben
   - **Bild-Antwort:** Bild als Antwort hochladen
4. **Antwort eingeben** je nach gewähltem Typ
5. **Auf "Hinzufügen" klicken**

#### Spezielle Regeln für "Ordne zu"
- **Frage-Text ist Pflicht** (z.B. "Finde den Apfel")
- **Antwort muss ein Bild sein**
- **Wird für Zuordnungsaufgaben verwendet**

#### Bestehende Fragen verwalten
- **Filter nach Kategorie** für bessere Übersicht
- **Fragen ansehen** mit allen Details
- **Fragen löschen** mit Bestätigungsdialog
- **Kategorien löschen** (entfernt auch alle zugehörigen Fragen)

### Bilder verwenden

#### Unterstützte Formate
- **JPG, PNG, GIF, WebP**
- **Maximale Größe: 5MB**
- **Automatische Vorschau** beim Hochladen

#### Frage-Bilder
- **Werden bei der Frage angezeigt**
- **Zusätzlich zum Frage-Text möglich**
- **Ideal für visuelle Fragen**

#### Antwort-Bilder
- **Werden als Antwortoptionen angezeigt**
- **Perfekt für "Ordne zu"-Aufgaben**
- **Automatische Größenanpassung**

## 🤝 Daten mit anderen teilen

### Eigene Daten teilen

#### Teilungs-Code erstellen
1. **Gehen Sie zu "Teilen"** in der Navigation
2. **Wählen Sie aus, was geteilt werden soll:**
   - ☑️ Meine Kategorien
   - ☑️ Meine Fragen
3. **Klicken Sie auf "Neuen Teilungs-Code erstellen"**
4. **8-stelliger Code wird generiert** (z.B. "ABC12345")
5. **Code kopieren** und an andere weitergeben

#### Geteilte Inhalte verwalten
- **Übersicht** aller eigenen Teilungs-Codes
- **Details anzeigen** (Datum, Anzahl Kategorien/Fragen)
- **Codes löschen** wenn nicht mehr benötigt

### Daten von anderen importieren

#### Import-Prozess
1. **Gehen Sie zu "Teilen" → "Daten von anderen importieren"**
2. **Geben Sie den 8-stelligen Code ein**
3. **Klicken Sie auf "Vorschau anzeigen"**
4. **Prüfen Sie die Inhalte:**
   - Autor und Erstellungsdatum
   - Anzahl Kategorien und Fragen
   - Detaillierte Auflistung
5. **Wählen Sie Import-Optionen:**
   - ☑️ Kategorien zusammenführen (keine Duplikate)
   - ☑️ Fragen zusammenführen (keine Duplikate)
6. **Klicken Sie auf "Importieren"**

#### Wichtige Hinweise
- **Duplikate werden automatisch erkannt** (basierend auf Inhalt)
- **Ihre bestehenden Daten bleiben erhalten**
- **Import kann nicht rückgängig gemacht werden**
- **Importierte Fragen werden markiert** mit Autor-Information

## 📊 Statistiken und Fortschritt

### Dashboard-Statistiken
- **Anzahl Kategorien** die Sie erstellt haben
- **Anzahl Fragen** in Ihrer Sammlung
- **Gespielte Quizzes** insgesamt
- **Erfolgsquote** in Prozent

### Detaillierte Statistiken
1. **Gehen Sie zu "Statistiken"** in der Navigation
2. **Übersichtskarten:**
   - Gesamt Fragen beantwortet
   - Richtig beantwortet
   - Erfolgsquote
3. **Kategorien-spezifische Statistiken:**
   - Spiele pro Kategorie
   - Fragen und richtige Antworten
   - Fortschrittsbalken
4. **Letzte Aktivität** mit Zeitstempel

## ⚙️ Profil und Einstellungen

### Profil-Verwaltung
1. **Klicken Sie auf Ihren Namen** in der Navigation
2. **Wählen Sie "Profil"**
3. **Verfügbare Optionen:**
   - **Anzeigename ändern**
   - **Passwort ändern** (mit Bestätigung)
   - **Account-Informationen anzeigen**

### Daten-Management

#### Daten exportieren
- **Vollständiger Export** aller Ihrer Daten
- **JSON-Format** für Portabilität
- **Backup-Zwecke** und Migration

#### Daten zurücksetzen
- **⚠️ ACHTUNG:** Löscht ALLE Ihre Daten
- **Doppelte Bestätigung** erforderlich
- **Nicht rückgängig machbar**

### Abmelden
- **Klicken Sie auf Ihren Namen** → "Abmelden"
- **Session wird beendet**
- **Zurück zur Anmelde-Seite**

## 🛡️ Admin-Funktionen

Das Admin-System funktioniert **parallel** zum Multi-User-System:

### Admin-Zugang
- **Klicken Sie auf "Admin"** in der Navigation
- **Passwort:** `LernApp2025Admin`
- **Zugang zur erweiterten Verwaltung**

### Admin-Features
- **Alle User-Features** verfügbar
- **Erweiterte Verwaltungsoptionen**
- **Globale Einstellungen**
- **System-Administration**

## 🔧 Troubleshooting

### Häufige Probleme

#### Anmelde-Probleme
**Problem:** "Benutzername bereits vergeben"
- **Lösung:** Wählen Sie einen anderen Benutzername
- **Alternative:** Melden Sie sich mit dem bestehenden Account an

**Problem:** "Falsches Passwort"
- **Lösung:** Passwort korrekt eingeben
- **Hinweis:** Da lokale Speicherung, keine Passwort-Wiederherstellung möglich

#### Quiz-Probleme
**Problem:** "Kategorie hat weniger als 4 Fragen"
- **Lösung:** Fügen Sie mehr Fragen zur Kategorie hinzu
- **Minimum:** 4 Fragen pro Kategorie für Quiz

**Problem:** "Keine Bild-Fragen verfügbar"
- **Lösung:** Erstellen Sie Fragen mit Bild-Antworten
- **Für "Ordne zu":** Mindestens 4 Bild-Fragen in einer Kategorie

#### Teilungs-Probleme
**Problem:** "Ungültiger Teilungs-Code"
- **Lösung:** Code korrekt eingeben (8 Zeichen, A-Z und 0-9)
- **Prüfen:** Keine Leerzeichen oder Sonderzeichen

**Problem:** "Import funktioniert nicht"
- **Lösung:** Stellen Sie sicher, dass der Code noch gültig ist
- **Hinweis:** Codes können vom Ersteller gelöscht werden

#### Demo-Modus
**Problem:** "Daten sind verschwunden"
- **Erklärung:** Demo-Daten sind temporär
- **Lösung:** Erstellen Sie einen Account für dauerhafte Speicherung

### Browser-Kompatibilität
- **Chrome:** ✅ Vollständig unterstützt
- **Firefox:** ✅ Vollständig unterstützt
- **Safari:** ✅ Vollständig unterstützt
- **Edge:** ✅ Vollständig unterstützt

### Datenschutz und Sicherheit
- **Lokale Speicherung:** Alle Daten bleiben auf Ihrem Gerät
- **Verschlüsselung:** Daten werden verschlüsselt gespeichert
- **Keine Server:** Keine Übertragung an externe Server
- **Session-Sicherheit:** Automatische Abmeldung bei Browser-Schließung

## 📱 Mobile Nutzung

### Responsive Design
- **Optimiert für alle Bildschirmgrößen**
- **Touch-freundliche Bedienung**
- **Gleiche Funktionalität** wie Desktop

### Mobile Besonderheiten
- **Bild-Upload** über Kamera möglich
- **Vereinfachte Navigation** für kleine Bildschirme
- **Automatische Anpassung** der Quiz-Darstellung

## 🆘 Support

### Hilfe erhalten
- **Diese Anleitung** für detaillierte Informationen
- **Demo-Modus** zum gefahrlosen Testen
- **GitHub Issues** für technische Probleme

### Feedback
Ihr Feedback hilft uns, die LernApp zu verbessern:
- **Feature-Wünsche**
- **Bug-Reports**
- **Verbesserungsvorschläge**

---

**Viel Spaß beim Lernen mit der LernApp!** 🎓📚
