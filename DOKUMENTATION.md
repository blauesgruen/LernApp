- Policies sind additiv: Neue Policies für einen Bucket oder eine Tabelle überschreiben keine bestehenden Policies für andere Bereiche.
- Policies gelten immer nur für die jeweilige Tabelle/Bucket.
- Bestehende Policies bleiben erhalten, solange sie nicht explizit gelöscht oder deaktiviert werden.

### Wichtiger Hinweis zu RLS-Policies für INSERT
- Bei Supabase/Postgres darf eine Policy für INSERT **nur** die `WITH CHECK`-Klausel verwenden, nicht `USING`.
- Beispiel (korrekt):
   ```sql
   CREATE POLICY "Allow insert for authenticated users"
   ON public.questions
   FOR INSERT
   WITH CHECK (owner = auth.uid());
   ```
- Beispiel (falsch, führt zu Fehler):
   ```sql
   CREATE POLICY ... FOR INSERT USING (...); -- Fehler!
   ```
- Für SELECT, UPDATE, DELETE wird `USING` verwendet, für INSERT ausschließlich `WITH CHECK`.
-- ===============================
-- Tabelle und Policies für statistics (Supabase, produktiv genutzt)
-- ===============================

CREATE TABLE public.statistics (
   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id uuid NOT NULL,
   question_id text NOT NULL,
   is_correct boolean NOT NULL,
   created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;

-- Policies für die Tabelle statistics
CREATE POLICY "Allow insert for authenticated users"
   ON public.statistics
   FOR INSERT
   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow select for authenticated users"
   ON public.statistics
   FOR SELECT
   USING (auth.uid() = user_id);

CREATE POLICY "Allow update for authenticated users"
   ON public.statistics
   FOR UPDATE
   USING (auth.uid() = user_id);

CREATE POLICY "Allow delete for authenticated users"
   ON public.statistics
   FOR DELETE
   USING (auth.uid() = user_id);

Hinweis: Die Spalte user_id muss als uuid angelegt werden, damit die Policy funktioniert (auth.uid() liefert uuid).
Wichtig: Im gesamten Code und Mapping wird die Tabelle als 'statistics' angesprochen, nicht als 'statistik'.
Die Löschfunktion und alle Queries müssen auf 'statistics' laufen, Spaltennamen: user_id, question_id, is_correct, created_at.
# LernApp - Dokumentation und Aufbau

## Ziel der Anwendung
Die LernApp ist eine interaktive Plattform, die Benutzern ermöglicht, Wissen durch Multiple-Choice-Quizzes zu erwerben und zu testen. Die App bietet eine modulare Struktur, die es Benutzern erlaubt, eigene Inhalte zu erstellen und zu verwalten.

---

## Änderungen und neue Funktionen

```markdown

### Willkommensbereich

## Änderungen und neue Funktionen (Stand: 13.09.2025)

- Nach der Registrierung wird eine neutrale, gelbe Meldung angezeigt: "Bitte bestätigen Sie Ihre E-Mail-Adresse oder loggen Sie sich ein." Die Erfolgsmeldung wurde entfernt, um das Supabase-Auth-Verhalten korrekt abzubilden.
- Der Menüpunkt "Startseite" wurde entfernt.
- Das Icon und der Text "LernApp" führen jetzt zur Startseite oder zum Dashboard (abhängig vom Login-Status) und sind linksbündig ausgerichtet.
- Der Admin-Button-Text wurde schwarz gefärbt.

### Willkommensbereich
- Ein erklärender Text wurde unterhalb des Login-Buttons hinzugefügt, der die Hauptfunktionen der LernApp beschreibt.
- Der Text ist in einer blasseren Farbe (#666) und etwas kleiner als der Willkommen-Text.

### Supabase Storage & RLS
- Storage-Bucket `question-images` muss im Dashboard angelegt werden.
- Zugriffsrechte werden im Dashboard gesetzt (public/private). Für private Buckets ist eine RLS-Policy nötig:
   ```sql
   CREATE POLICY "Allow upload for authenticated users"
   ON storage.objects
   FOR INSERT
   USING (auth.role() = 'authenticated');
   ```
- Policies sind additiv und überschreiben keine anderen Regeln für andere Bereiche/Tables.
- Policies gelten immer nur für die jeweilige Tabelle/Bucket.

### Styling: Buttons und Labels
- Die Klasse `.btn-primary` wird für Buttons und Labels verwendet. Für Labels mit voller Breite und Höhe:
   ```css
   #question-image-label.btn-primary {
      display: block !important;
      width: 100% !important;
      min-width: 180px !important;
      max-width: 100% !important;
      min-height: 44px !important;
      height: 56px !important;
      padding: 12px 24px !important;
      font-size: 1.1rem !important;
      background: var(--color-blue-plastic) !important;
      box-sizing: border-box !important;
      text-align: center !important;
      align-items: center !important;
      justify-content: center !important;
   }
   ```
- Die Regel muss nach der allgemeinen `.btn-primary`-Definition stehen.
- Elterncontainer wie `.form-actions` sollten ebenfalls `width: 100%` haben.

### Fehlerbehebung: Supabase Storage Upload
- Fehler "new row violates row-level security policy" bedeutet, dass die RLS-Policy für den Bucket fehlt oder zu restriktiv ist.
- Policies für Storage-Buckets sind unabhängig von Policies für andere Tabellen.

### Registrierung: E-Mail-Existenz-Check
Vor der Registrierung prüft die App, ob die E-Mail-Adresse bereits existiert. Dazu wird die Tabelle `auth.users` per Supabase-Query abgefragt:

```js
const { data: existingUsers, error: checkError } = await supabase
   .from('users')
   .eq('email', email);
```

Ist die E-Mail bereits vergeben, erscheint eine passende Fehlermeldung und die Registrierung wird nicht ausgeführt.


```sql
CREATE POLICY "Allow anon email check for registration" ON auth.users
FOR SELECT
USING (true);
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
```

**Achtung:** Diese Policy ermöglicht User Enumeration. Optional mit Rate-Limit oder Captcha absichern!

### Kernfunktionen

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

## Kürzliche Fixes (Stand: 2025-09-11)

Kurzer Überblick über wichtige Korrekturen und Änderungen, die nach der letzten Auslieferung vorgenommen wurden:

- `js/logger.js`: Sicherung und Fehlerbehebung
   - Preventive fixes: sichere String-Serialisierung vor `includes()`-Checks, Truncation langer Log-Nachrichten, try/catch-Schutzbereiche.
   - Entfernte automatische Überschreibung von `console.*`, um Rekursionsprobleme und mögliche Browser-Blocks zu verhindern. Verwende `window.logger` oder `window.log*` explizit.

- `js/app-core.js`: Robustere Partial-Loader & Fallback-Platzhalter
   - `getPartialUrl()` erkennt GitHub-Pages-Hosting (hostname enthält `github.io`) und verwendet `/LernApp/partials/<file>` für korrekte Pfade beim Deployment.
   - Sofort sichtbare Header/Footer-Placeholder eingefügt, damit die Seite nicht weiß bleibt, auch wenn fetch() fehlschlägt.
   - Startup-Debug-Overlay entfernt und durch sichere `window.debugLog()`-Aufrufe (no-op falls nicht initialisiert) ersetzt, um visuelle Artefakte und Blocker zu vermeiden.

- Pfad-Checks und Redirects
   - Pfadvergleichslogik in `js/auth.js`, `js/breadcrumb-example.js` und `script.js` normalisiert Pfade (strippt ein mögliches `/LernApp`-Präfix), so dass Redirects und Seitenerkennung korrekt unter GitHub Pages funktionieren.

- DB-Bound Mapping & Safe Deletes
   - `window.mapToDb()` ist zentral in `js/app-core.js` verfügbar und wandelt clientseitige camelCase-Felder in snake_case-DB-Felder (z. B. `categoryId` → `category_id`).
   - `js/quiz-db.js` enthält jetzt sichere cascade-delete-Funktionen (`cascadeDeleteCategory`, `cascadeDeleteGroup`) — Löschbestätigungs-Workflow wurde im UI implementiert, der erst nach expliziter Bestätigung Kaskaden ausführt.

Anmerkung: Diese Änderungen beheben ein kritisches Problem, bei dem die Seite auf GitHub Pages durch unsichere Logger-Überschreibungen bzw. fehlerhafte Serialisierungen unbenutzbar wurde. Nach den Fixes ist das Laden und Initialisieren stabiler.

## Migration/Legacy
- Alle alten Storage-/Backup-/Filesystem-Funktionen und Dateien sind entfernt
- Die App ist jetzt vollständig cloudbasiert und zentralisiert

---
Letzte Änderung: Automatische Bereinigung und Umstellung auf Supabase-only (10.09.2025)

# LernApp - Projekt-spezifische Anweisungen (Stand: 11.09.2025)
## Supabase Storage — Bucket Einrichtung und Rechte

### Bucket für Bilder
- Name: `question-images` (exakt so, ohne Leerzeichen/Bindestrich)
- Muss im Supabase-Dashboard unter Storage angelegt werden
- Ohne diesen Bucket schlägt der Upload fehl ("Bucket not found")

### Zugriffsrechte
- Beim Erstellen des Buckets kann eingestellt werden:
   - **public**: Bilder sind für alle sichtbar (empfohlen für Quiz-Bilder)
   - **private**: Nur authentifizierte Nutzer können lesen/schreiben
- Die Rechte werden direkt im Storage-Bucket konfiguriert, nicht per SQL/RLS

### Öffentliche Bild-URL
- Format: `https://<projekt>.supabase.co/storage/v1/object/public/question-images/<dateiname>`
- Die URL wird im Feld `imageurl` der Tabelle `questions` gespeichert

### Hinweise
- Storage-Buckets und deren Rechte sind im Dashboard sichtbar und verwaltbar
- Es ist kein RLS-SQL-Skript für Storage nötig

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

**Frontend-Insert-Logik (Stand: 13.09.2025):**
Beim Erstellen einer neuen Frage werden ausschließlich die existierenden Felder der Tabelle `questions` verwendet:

```js
const { data, error } = await supabase
   .from('questions')
   .insert([
      {
         question: text,
         answer,
         additionalinfo: explanation,
         imageurl: imageUrl,
         group_id: groupId,
         owner: ownerId
      }
   ])
   .select();
```

Pflichtfelder: `question`, `answer`, `group_id`, `owner` müssen gesetzt sein. Optional: `additionalinfo`, `imageurl`, `collaborators`.
Das Feld `id` wird automatisch generiert und nicht gesetzt.

**Hinweis:**
Die Insert-Logik und das Mapping im Frontend sind immer mit der Supabase-Tabellenstruktur abzugleichen. Nicht existierende Felder dürfen nicht verwendet werden (z. B. `difficulty`).

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

## WICHTIG — Was man auf keinen Fall tun darf (und warum)
Damit die Webseite stabil online bleibt, befolge unbedingt die folgenden "Do not"‑Regeln. Jede Regel enthält kurz den Grund und eine sichere Alternative.

- Nie die globalen console.*-Methoden ungesichert überschreiben (z. B. console.log = ...)
   - Warum: führt leicht zu rekursiven Aufrufen oder Exceptions, die das Laden der Seite blockieren.
   - Stattdessen: Verwende `window.logger` / `window.logInfo` / `window.logError` für zentrales Logging.

- Keine JSON.stringify() auf großen/zirkulären Objekten (z. B. window, supabase client)
   - Warum: kann den Main‑Thread stark belasten oder den Browser für längere Zeit einfrieren.
   - Stattdessen: serialisiere nur benötigte, kleine Objekte; nutze try/catch; begrenze Länge (truncate) vor dem Loggen.

- Keine langen/synchronen Endlosschleifen oder blockierenden Rechenaufgaben beim Seiten-Startup
   - Warum: blockiert das Rendering und verhindert, dass andere Skripte (z. B. der Header-Loader) laufen.
   - Stattdessen: benutze Web Workers für schwere Berechnungen oder setTimeout/Promise-basierte, asynchrone Verarbeitung.

- Nicht vorzeitig DOM-Schreiboperationen ausführen, die das Parsen blockieren (z. B. große document.documentElement.appendChild während parsing)
   - Warum: kann das Rendering verzögern oder verhindern, dass nachfolgende Skripte ausgeführt werden.
   - Stattdessen: führe DOM-Manipulationen nach DOMContentLoaded aus oder verwende kleine, performante Updates.

- Keine kritischen Scripts per HTTP von unsicheren oder unzuverlässigen CDNs einbinden ohne Fallback
   - Warum: ausgefallene CDN-Hosts können das Laden blockieren (z. B. wenn externe Script‑URLs nicht erreichbar sind).
   - Stattdessen: prüfe Verfügbarkeit, biete lokale Fallbacks an oder lade kritischere Skripte selbst mit Retry-Logik.

- Keine root-absolute Pfade (/foo) verwenden, die nicht für das GitHub-Pages-Subpath-Hosting angepasst sind
   - Warum: auf GitHub Pages unter `/LernApp/` führen root-Pfade zu 404s und toten Requests.
   - Stattdessen: benutze die bereitgestellte `getPartialUrl()`-Hilfe oder relative Pfade und prüfe `window.location.hostname`.

- Keine großen localStorage/IndexedDB-Aufräum- oder Serialisierungs-Operationen synchron beim Laden
   - Warum: langsame Sync-Operationen blockieren den Main-Thread und können Timeouts/Freezes verursachen.
   - Stattdessen: performante, inkrementelle Updates oder async APIs (IndexedDB mit Promises) verwenden.

- Keine sensiblen Server-Keys (Service-Keys) in Client-JS oder im Repo veröffentlichen
   - Warum: Sicherheitsrisiko und Missbrauch; kann zu Datenverlust oder Kosten führen.
   - Stattdessen: nur Public/Anon Keys im Client; Server-seitige Tasks über sichere Endpoints oder Umgebungsvariablen ausführen.

- Keine Verwendung von document.write nach dem Laden der Seite
   - Warum: document.write kann bestehendes DOM überschreiben und das Laden abbrechen.
   - Stattdessen: DOM-Manipulation mit appendChild/insertBefore oder innerHTML nach DOMContentLoaded.

Wenn du unsicher bist, frage kurz im Repo bevor du größere Änderungen einspielst. Diese Regeln verhindern die häufigsten Ursachen für "weißes Blatt" oder Browser‑Freezes nach Deployments.

## SQL- RLS
-- ================================
-- Policies für Tabelle: categories
-- ================================

-- SELECT: Owner oder Collaborator darf lesen
CREATE POLICY "categories_select"
ON public.categories
AS PERMISSIVE
FOR SELECT
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);

-- INSERT: Nur eigener User darf als owner einfügen
CREATE POLICY "categories_insert"
ON public.categories
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (owner = auth.uid());

-- UPDATE: Nur Owner oder Collaborator darf bearbeiten
CREATE POLICY "categories_update"
ON public.categories
AS PERMISSIVE
FOR UPDATE
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()])
WITH CHECK (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);

-- DELETE: Nur Owner oder Collaborator darf löschen
CREATE POLICY "categories_delete"
ON public.categories
AS PERMISSIVE
FOR DELETE
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);



-- =============================
-- Policies für Tabelle: groups
-- =============================

CREATE POLICY "groups_select"
ON public.groups
AS PERMISSIVE
FOR SELECT
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);

CREATE POLICY "groups_insert"
ON public.groups
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (owner = auth.uid());

CREATE POLICY "groups_update"
ON public.groups
AS PERMISSIVE
FOR UPDATE
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()])
WITH CHECK (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);

CREATE POLICY "groups_delete"
ON public.groups
AS PERMISSIVE
FOR DELETE
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);



-- ===============================
-- Policies für Tabelle: questions
-- ===============================

CREATE POLICY "questions_select"
ON public.questions
AS PERMISSIVE
FOR SELECT
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);

CREATE POLICY "questions_insert"
ON public.questions
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (owner = auth.uid());

CREATE POLICY "questions_update"
ON public.questions
AS PERMISSIVE
FOR UPDATE
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()])
WITH CHECK (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);

CREATE POLICY "questions_delete"
ON public.questions
AS PERMISSIVE
FOR DELETE
TO public
USING (owner = auth.uid() OR collaborators && ARRAY[auth.uid()]);