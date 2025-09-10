# LernApp - Dokumentation und Aufbau

## Ziel der Anwendung
Die LernApp ist eine interaktive Plattform, die Benutzern ermöglicht, Wissen durch Multiple-Choice-Quizzes zu erwerben und zu testen. Die App bietet eine modulare Struktur, die es Benutzern erlaubt, eigene Inhalte zu erstellen und zu verwalten.

---

## Änderungen und neue Funktionen

### Navigation
- Der Menüpunkt "Startseite" wurde entfernt.
- Der Menüpunkt "Dashboard" wurde aus dem Header entfernt, da die Navigation zum Dashboard über den App-Logo-Button erfolgt.
- Das Icon und der Text "LernApp" führen jetzt zur Startseite oder zum Dashboard (abhängig vom Login-Status) und sind linksbündig ausgerichtet.
- Der Admin-Button-Text wurde schwarz gefärbt.

### Willkommensbereich
- Ein erklärender Text wurde unterhalb des Login-Buttons hinzugefügt, der die Hauptfunktionen der LernApp beschreibt.
- Der Text ist in einer blasseren Farbe (#666) und etwas kleiner als der Willkommen-Text.

---

## Anforderungen

### Kernfunktionen
1. **Login/Logout-System**: 
   - Benutzer können sich registrieren, einloggen und ausloggen.
   - Authentifizierung erfolgt sicher (z. B. mit bcrypt und JWT).

2. **Benutzerdatenbank**:
   - Speicherung von Benutzerinformationen und Fortschritten.
   - Möglichkeit, die Datenbank lokal oder in einem benutzerdefinierten Verzeichnis zu speichern.

3. **Quiz-Bereich**:
   - Navigation durch mehrere Ebenen: Kategorie → Unterkategorie → Untergruppe → Fragen.
   - Benutzer können eigene Fragen und Antworten hinzufügen.
   - Automatische Erstellung von Multiple-Choice-Quizzes mit 4 Antwortmöglichkeiten.

4. **Statistik-Bereich**:
   - Anzeige von Fortschritten und Erfolgsraten.

5. **Profil-Bereich**:
   - Verwaltung persönlicher Informationen.

6. **Admin-Bereich**:
   - Verwaltung von Benutzern und Inhalten.

---

## Technologie-Stack

### Frontend
- **HTML5**: Struktur der Webseite.
- **CSS3**: Styling, unterstützt durch Bootstrap für responsives Design.
- **JavaScript (ES6+)**: Interaktivität und dynamische Inhalte.

### Backend
- **Node.js**: Serverseitige Logik.
- **Express.js**: Webframework.
- **SQLite** oder **PostgreSQL**: Datenbank für Benutzer- und Quizdaten.
- **bcrypt**: Sicheres Passwort-Hashing.
- **JWT (JSON Web Tokens)**: Authentifizierung und Sitzungsverwaltung.

### Sicherheit
- **HTTPS**: Sichere Datenübertragung.
- **Helmet.js**: Sicherheits-Header.
- **Eingabevalidierung**: Schutz vor fehlerhaften oder schädlichen Eingaben.

---

## Projektstruktur (Supabase-basiert)

```
/LernApp
├── index.html          # Landing-Page
├── style.css           # Globale Stile
├── script.js           # Globale Skripte
│
├── /js                 # JavaScript-Module
│   ├── auth.js         # Login/Logout und Authentifizierung (Supabase)
│   ├── dashboard.js    # Benutzer-Dashboard
│   ├── quiz-db.js      # Quiz- und Fragenlogik (Supabase)
│   ├── category-management.js # Kategorien- und Gruppenlogik (Supabase)
│   ├── notification.js # Zentrales Benachrichtigungssystem
│   ├── logger.js       # Zentrales Logging
│   └── ...             # Weitere Module
│
├── /css                # Bereichsspezifische Stile
│   ├── dashboard.css   # Stile für das Dashboard
│   ├── quiz.css        # Stile für den Quizbereich
│   └── ...
│
├── /partials           # Zentrale HTML-Komponenten (Header, Footer)
│   ├── header.html     # Dynamisch geladener Header
│   ├── footer.html     # Dynamisch geladener Footer
│   └── ...
│
├── /data               # (Optional: Beispiel-JSONs für Migration, nicht produktiv)
│   └── ...
│
└── DOKUMENTATION.md    # Technische Dokumentation
```

---

## Supabase als zentrale Datenbank

Alle App-Daten werden in Supabase-Tabellen gespeichert. Es gibt keine lokalen JSON-Dateien mehr.

### Tabellenstruktur (Empfehlung)

**Kategorien**
| Feld           | Typ      | Beschreibung                       |
|----------------|----------|------------------------------------|
| id             | UUID     | Primärschlüssel                    |
| name           | TEXT     | Name der Kategorie                 |
| owner          | UUID     | User-ID des Besitzers              |
| collaborators  | JSONB    | Array von User-IDs (Mitbearbeiter) |
| created_at     | TIMESTAMP| Erstellungsdatum                   |

**Gruppen**
| id             | UUID     | Primärschlüssel                    |
| name           | TEXT     | Name der Gruppe                    |
| category_id    | UUID     | Verweis auf Kategorie              |
| created_by     | UUID     | User-ID des Erstellers             |
| created_at     | TIMESTAMP| Erstellungsdatum                   |

**Fragen**
| id             | UUID     | Primärschlüssel                    |
| text           | TEXT     | Fragetext                          |
| image_url      | TEXT     | Bild-URL (Supabase Storage)        |
| options        | JSONB    | Antwortoptionen (Array)            |
| explanation    | TEXT     | Erklärung zur Antwort              |
| category_id    | UUID     | Verweis auf Kategorie              |
| group_id       | UUID     | Verweis auf Gruppe                 |
| difficulty     | INT      | Schwierigkeitsgrad                 |
| created_by     | UUID     | User-ID des Erstellers             |
| created_at     | TIMESTAMP| Erstellungsdatum                   |

**Statistiken**
| id             | UUID     | Primärschlüssel                    |
| user_id        | UUID     | User-ID                            |
| question_stats | JSONB    | Statistiken pro Frage              |
| quiz_stats     | JSONB    | Statistiken pro Quiz               |
| updated_at     | TIMESTAMP| Letzte Aktualisierung              |

---

## Kollaboratives Arbeiten: Rollen und Rechte

- Jede Kategorie hat einen **Owner** (Ersteller/Admin) und eine Liste von **Mitbearbeitern** ("Collaborators", max. ca. 20 User pro Kategorie empfohlen).
- Der Owner ist automatisch Admin der Kategorie und kann weitere Nutzer als Mitbearbeiter einladen oder entfernen.
- Die Einladung erfolgt über die UI (z.B. per E-Mail-Adresse oder Username). Die App prüft, ob der eingeladene Nutzer existiert und fügt ihn zur Collaborators-Liste hinzu.
- Nur der Owner kann die Collaborators-Liste bearbeiten (hinzufügen/entfernen).
- Mitbearbeiter können die Kategorie, Gruppen und Fragen bearbeiten, aber keine weiteren Nutzer einladen oder entfernen.
- Die Rechte werden in der App und im Backend geprüft (Supabase Row-Level Security).
- Änderungen sind für alle Collaborators und den Owner in Echtzeit sichtbar.

**Empfohlene Felder in der Tabelle `categories`:**
| Feld           | Typ      | Beschreibung                       |
|----------------|----------|------------------------------------|
| owner          | UUID     | User-ID des Admins                 |
| collaborators  | JSONB    | Array von User-IDs (max. 20)       |

**Workflow:**
1. Owner erstellt Kategorie und ist automatisch Admin.
2. Owner lädt bis zu 20 Mitbearbeiter ein (UI: "Kollegen einladen").
3. Eingeladene Nutzer erhalten Zugriff und können Inhalte bearbeiten.
4. Nur Owner kann die Collaborators-Liste verwalten.
5. Mitbearbeiter können Inhalte bearbeiten, aber keine weiteren Nutzer einladen.
6. Änderungen werden in Echtzeit synchronisiert.

**Hinweis:**
- Die maximale Anzahl von Collaborators kann in der App und im Backend limitiert werden (z.B. 20).
- Die UI sollte die Verwaltung der Collaborators übersichtlich und einfach gestalten (z.B. Liste mit Entfernen-Button, Einladungsfeld).
- Die Rechte werden bei jedem Schreibzugriff geprüft.

---

## Schritt-für-Schritt Umsetzung

1. **Supabase-Projekt anlegen**
   - Tabellen für Kategorien, Gruppen, Fragen, Statistiken erstellen (siehe oben)
   - Storage-Bucket für Bilder anlegen

2. **Supabase-Client in der App einbinden**
   - Supabase-JS-Client in allen relevanten Modulen verwenden
   - Authentifizierung und Rechteprüfung zentral in `auth.js`

3. **Migration der Daten**
   - Bestehende lokale JSON-Daten (falls vorhanden) einmalig in die Supabase-Tabellen importieren
   - Danach keine lokalen JSONs mehr verwenden

4. **Kollaborations-Logik implementieren**
   - UI für Mitbearbeiter-Verwaltung in Kategorie-Management
   - Backend prüft Berechtigungen bei jedem Schreibzugriff
   - Echtzeit-Updates über Supabase Realtime

5. **Bilder-Upload über Supabase Storage**
   - Bilder werden beim Erstellen von Fragen direkt in Supabase Storage hochgeladen
   - Die Bild-URL wird in der Frage gespeichert

6. **App-Logik anpassen**
   - Alle Datenoperationen (CRUD) laufen über Supabase
   - Keine lokalen JSON-Dateien mehr
   - Fehlerbehandlung und Logging zentral

---

## Vorteile
- Zentrale, sichere und kollaborative Datenhaltung
- Echtzeit-Synchronisation für alle Nutzer
- Komfortable Verwaltung von Mitbearbeitern
- Skalierbar und plattformunabhängig

---

## Hinweise für Entwickler
- Alle Datenoperationen laufen über Supabase-Tabellen und Storage
- Die App ist vollständig cloudbasiert
- Kollaboration und Rechteverwaltung sind direkt im Datenmodell abgebildet
- Die UI muss die Mitbearbeiter-Funktionen und Echtzeit-Updates unterstützen

# LernApp – Technische Dokumentation (Stand: 10.09.2025)

## Architektur & Technologie
- **Frontend:** Vanilla HTML, CSS, JavaScript (ES6+), Bootstrap für UI
- **Backend:** Supabase (Auth, Datenhaltung, Storage)
- **Design:** Responsive-first, moderne JS-Syntax, deutsche Kommentare

## Zentrale Funktionen
- Multiple-Choice-Fragen-System
- Admin-Interface für Fragen/Kategorien
- Kategorien- und Gruppenmanagement
- Bildunterstützung für Fragen
- Supabase-basierte Userverwaltung und Authentifizierung
- Zentrales Logging und Benachrichtigungssystem

## Wichtige Änderungen (2025)
- **Lokale Storage-/Backup-/Filesystem-Logik entfernt**
    - Alle alten JS-, CSS-, und HTML-Dateien für localStorage, Backups, Diagnosen, Migration, Pfadwahl etc. wurden gelöscht
    - Keine lokale User-Initialisierung mehr (user-init.js entfernt)
    - Keine Speicherpfad-/Speichermodul-Funktionen mehr
    - Alle Einbindungen und UI-Reste zu Storage/Backup entfernt
- **Supabase übernimmt alle User-, Daten- und Backup-Funktionen**
    - Login/Logout/Registrierung laufen zentral über Supabase
    - Weiterleitungen nach Login/Logout sind wieder aktiviert
    - Backups werden direkt über Supabase Storage abgewickelt

## Aktuelle Struktur
- **js/**: Nur noch zentrale App-Logik (auth.js, quiz-db.js, category-management.js, etc.)
- **css/**: UI-Styles, keine Storage-/Backup-Styles mehr
- **partials/**: Header und Footer, zentrale Einbindung der globalen JS-Funktionen
- **data/**: JSON-Daten für Fragen, Kategorien, Gruppen
- **docs/**: Diese Dokumentation

## Hinweise für Entwickler
- Alle User- und Auth-Logik ist zentral in auth.js und Supabase
- Keine lokale Speicherung oder Migration mehr nötig
- Fehler-/Erfolgsmeldungen laufen über notification.js und logger.js
- Weiterleitungen nach Login/Logout sind in auth.js und header.html geregelt
- UI ist vollständig responsive und modular

## Migration/Legacy
- Alle alten Storage-/Backup-/Filesystem-Funktionen und Dateien sind entfernt
- Die App ist jetzt vollständig cloudbasiert und zentralisiert

---
Letzte Änderung: Automatische Bereinigung und Umstellung auf Supabase-only (10.09.2025)
