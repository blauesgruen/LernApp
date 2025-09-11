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

# LernApp — Aktuelle Dokumentation (Fokus: was gebraucht und genutzt wird)

Kurz: diese Datei beschreibt die aktuelle, produktiv genutzte Architektur, die notwendigen Komponenten und wie man die App lokal startet. Hinweise auf entfernte/alte Implementationen werden hier nicht aufgeführt.

## Übersicht
- Ziel: Interaktive Multiple-Choice-Lernplattform mit Kategorien, Gruppen und Fragen.
- Datenhaltung, Authentifizierung und Storage: Supabase (Auth, Postgres, Storage, Realtime).
- Frontend: Vanilla HTML, CSS und JavaScript (ES6+). UI-Basis: Bootstrap (CDN) und eigene CSS-Dateien.

## Technologie-Stack (genutzt)
- Frontend: HTML5, CSS3, JavaScript (ES6+)
- UI-Framework: Bootstrap (bereitgestellt über CDN)
- Backend / Datenhaltung: Supabase (Postgres, Auth, Storage, Realtime)
- Hosting/Testing: Statischer Webserver (lokal oder Web-Host), kein Node-Server für die statische Site nötig

## Wichtige Projektdateien und Ordner
- `index.html` — Einstieg / Landing-Page
- `dashboard.html` — Nutzer-Dashboard
- `login.html`, `register.html`, `profile.html` — Auth- & Profilseiten
- `category-management.html` — Verwaltung von Kategorien und Gruppen
- `question-creator.html` — UI zum Erstellen von Fragen
- `quiz-player.html` — Quiz-Spieloberfläche
- `partials/header.html`, `partials/footer.html` — zentral geladene Seitenbausteine (Header/Footer)

- `css/` — stylespezifische Dateien (z. B. `style.css`, komponentenbezogene CSS)
- `js/app-core.js` — zentrales Initialisierungsmodul (Supabase-Init, Storage-Adapter, Header/Footer-Loader, zentrale Helfer)
- `js/auth.js` — Authentifizierungs-Logik und Session-Handling (Supabase)
- `js/quiz-db.js` — Datenoperationen für Quizzes/Fragen (CRUD über Supabase)
- `js/category-management.js` — Erzeugen und Anzeigen des Kategorien-/Gruppenbaums
- `js/questions-db.js`, `js/quiz-player.js`, `js/question-creator.js` — Seiten- und Komponentenlogik
- `js/notification.js` & `js/logger.js` — zentrale Benachrichtigungen und Logging

## Supabase — Konfiguration und notwendige Werte
- Erforderlich (lokal oder in Produktion):
   - Supabase URL (Projekt-URL)
   - Supabase Anon/Public API Key (oder Service Key für serverseitige Tasks)

- Wo die Werte genutzt werden:
   - `js/app-core.js` liest/initialisiert den Supabase-Client beim Laden der Seite. Je nach Deployment wird der Key entweder in einer `config.js` (nur lokal/entwicklung) oder per Umgebungs- bzw. Build-Variable bereitgestellt.

- Sicherheitsempfehlung:
   - Die Anon/Public Keys dürfen in statischen Demos auftreten, für produktive Anwendungen sollten sensible Keys nicht öffentlich im Repo liegen. Nutze bei Bedarf serverseitige Endpunkte oder Umgebungsvariablen.

## Datenmodell — Kurzüberblick (genutzt)
- categories: id, name, description, owner, collaborators, ggf. zusätzliche Metadaten
- groups: id, name, category_id, created_by, created_at
- questions: id, question/text, options (JSON), imageurl, explanation, categoryid/group_id, owner
- statistics (optional): userbezogene Statistiken pro Frage/Quiz

Hinweis: Spaltennamen können in JS-Modulen beim Zugriff angepasst/normalisiert werden. Verlasse dich für RLS-Policies und Migrationsskripte auf die tatsächliche Supabase-Konfiguration.

## Laufzeit / Lokales Testen
- Die App lädt Partials per fetch; daher muss die Seite über HTTP(S) geöffnet werden (einfaches `file://` funktioniert nicht zuverlässig).
- Minimal lokal testen (Beispiel):

```powershell
# Im Projekt-Root ausführen (Windows PowerShell)
python -m http.server 8000
# Dann im Browser öffnen: http://localhost:8000/index.html
```

Alternativ: Verwende VS Code Live Server oder einen beliebigen statischen Server.

## Entwicklerhinweise (wie die App aufgebaut ist)
- Zentrale Initialisierung: `js/app-core.js`
   - Initialisiert den Supabase-Client
   - Stellt `window.storage` als Adapter für Storage-Operationen bereit (fällt auf `localStorage` zurück)
   - Lädt `partials/header.html` und `partials/footer.html` einmalig und initialisiert Navigation/Breadcrumbs

- Authentifizierung: `js/auth.js` verwendet den Supabase-Client für Login/Logout und Session-Management.
- Daten-Operationen: Alle CRUD-Operationen laufen über die Supabase-Module (`quiz-db.js`, `questions-db.js`, `category-management.js`).
- Benachrichtigungen & Logging: `js/notification.js` und `js/logger.js` verwenden zentrale Funktionen für konsistente UI-Meldungen und Log-Ausgaben.

## Tests & Qualitätssicherung
- Unit-Tests: Kleine Test-Skripte (falls vorhanden) befinden sich unter `js/*.test.js`.
- Smoke-Test: Lokales Starten per HTTP-Server und manuelles Durchklicken der Seiten (Login, Kategoriebaum, Frageerstellung, Quiz-Spiel).

## Weiteres / To-Do (kurz)
- Sicherstellen, dass `js/app-core.js` vor Seiten-spezifischen Skripten geladen wird (Header/Footer-Loader muss vor Komponenten laufen).
- RLS-Policies in Supabase prüfen und mit Feld-/Namenskonventionen abgleichen.

## Abschluss
Diese Dokumentation beschreibt die aktuell genutzte Architektur und die Dateien, die beim Betrieb und der Entwicklung der LernApp benötigt werden. Änderungen an der Infrastruktur (z. B. Umzug von Supabase, Umstellung auf serverseitige APIs) sollten hier ergänzt werden.

Letzte Aktualisierung: 2025-09-11
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

# LernApp - Projekt-spezifische Anweisungen (Stand: 11.09.2025)

## Supabase Tabellenstruktur (aktualisiert)

### categories
- id (uuid, Primärschlüssel)
- name (Text, Pflichtfeld)
- description (Text, optional)
- owner (uuid, Pflichtfeld)
- collaborators (uuid[] oder Text[], optional)

### groups
- id (uuid, Primärschlüssel)
- name (Text, Pflichtfeld)
- category_id (uuid, Pflichtfeld, Fremdschlüssel auf categories.id)
- owner (uuid, Pflichtfeld)
- collaborators (uuid[] oder Text[], optional)

### questions
- id (uuid, Primärschlüssel, automatisch von Supabase generiert)
- question (Text, Pflichtfeld)
- answer (Text, Pflichtfeld)
- additionalinfo (Text, optional, aus JSON-Feld additionalInfo gemappt)
- imageurl (Text, optional, URL zum Bild im Supabase Storage)
- group_id (uuid, optional, Fremdschlüssel auf groups.id, wird über tags ermittelt)
- owner (uuid, Pflichtfeld)
- collaborators (uuid[] oder Text[], optional)

**Hinweis:**
- Nur diese Felder dürfen beim Import/Export verwendet werden.
- Die Import-Logik muss alle Felder korrekt abbilden und keine anderen Felder senden.
- Das Feld `id` wird nicht gesetzt, sondern von Supabase generiert.
- Die Doku und der Code müssen immer synchron gehalten werden.

## SQL für die Tabelle questions (Supabase)

```sql
CREATE TABLE questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    additionalinfo TEXT,
    imageurl TEXT,
    group_id uuid REFERENCES groups(id),
    owner uuid NOT NULL,
    collaborators uuid[]
);
```

## Kollaborations-/Freigabe-Konzept
- Das Feld `collaborators` enthält User-IDs oder Team-IDs, die Zugriff auf den jeweiligen Datensatz haben.
- RLS-Policies müssen so gestaltet sein, dass Einträge für `owner` und alle in `collaborators` sichtbar/bearbeitbar sind.
- Die Freigabe ist damit einheitlich und flexibel für alle Nutzer und Teams.
