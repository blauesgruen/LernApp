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

## Projektstruktur

```
/LernApp
├── index.html          # Landing-Page
├── style.css           # Globale Stile
├── script.js           # Globale Skripte
│
├── /js                 # JavaScript-Module
│   ├── auth.js         # Login/Logout und Authentifizierung
│   ├── dashboard.js    # Benutzer-Dashboard
│   ├── quiz/           # Quiz-Module
│   │   ├── categories.js       # Logik für Kategorien
│   │   ├── subcategories.js    # Logik für Unterkategorien
│   │   ├── subgroups.js        # Logik für Untergruppen
│   │   ├── questions.js        # Logik für Fragen und Antworten
│   │   ├── quizEngine.js       # Quiz-Logik
│   │   ├── navigation.js       # Navigation zwischen Ebenen
│   │   ├── utils.js            # Hilfsfunktionen
│
├── /css                # Bereichsspezifische Stile
│   ├── dashboard.css   # Stile für das Dashboard
│   ├── quiz.css        # Stile für den Quizbereich
│
├── /data               # Daten und Konfiguration
│   ├── quizData.json   # JSON-Datei für die vom Benutzer erstellten Fragen und Antworten
│   ├── users.json      # Benutzer-Datenbank
│
└── README.md           # Dokumentation
```

---

## Erweiterte Anforderungen

### Speichertort
- Der Benutzer soll ein Verzeichnis auswählen können, in dem alle Daten gespeichert werden.
- Dieses Verzeichnis kann lokal oder ein Cloud-Verzeichnis (z. B. Dropbox) sein.
- Die App soll die Daten in JSON-Dateien speichern, um sie plattformübergreifend nutzbar zu machen.
- Änderungen an den Daten werden direkt in die JSON-Dateien geschrieben, um Synchronisation zu ermöglichen.

### Modularität
- Dateien sollen klein und modular gehalten werden.
- Jede Funktionalität wird in separaten Modulen organisiert.
- Gemeinsame Funktionen (z. B. Verzeichniswahl, Datenoperationen) werden zentral abgelegt.

### Navigation im Quiz-Bereich
- Der Quiz-Bereich wird in mehrere Ebenen unterteilt:
  - Kategorie → Unterkategorie → Untergruppe → Fragen.
- Die Navigation zwischen den Ebenen wird dynamisch und modular implementiert.
- Die Datenstruktur für den Quiz-Bereich wird in einer JSON-Datei organisiert.

---

## Nächste Schritte
1. **Login/Logout-System**: Implementierung der Authentifizierung.
2. **Quiz-Bereich**: Erstellung der Navigation und Datenstruktur.
3. **Statistik-Bereich**: Anzeige von Fortschritten.
4. **Admin-Bereich**: Verwaltung von Benutzern und Inhalten.

---

## Hinweise
- **Modularität**: Jede Funktionalität wird in separaten Dateien organisiert.
- **Wiederverwendbarkeit**: Gemeinsame Funktionen werden zentral abgelegt.
- **Sicherheit**: Fokus auf sichere Datenverarbeitung und -speicherung.

---

## Responsives Design
- Die App wurde für mobile Geräte optimiert.
- Media Queries wurden hinzugefügt, um sicherzustellen, dass die Navigation, der Header und der Admin-Button auf kleineren Bildschirmen korrekt angezeigt werden.
- Der Header bleibt linksbündig, während der Admin-Button rechts positioniert bleibt.

### Zentrale Header- und Footer-Komponenten
- Der Header und Footer wurden zentralisiert und werden dynamisch in die Seiten geladen.
- Die Ladestrategie wurde verbessert, um sicherzustellen, dass JavaScript im Header korrekt ausgeführt wird:
  ```javascript
  async function loadHeaderAndFooter() {
      try {
          // Header und Footer laden
          document.getElementById('header-container').innerHTML = await (await fetch('partials/header.html')).text();
          document.getElementById('footer-container').innerHTML = await (await fetch('partials/footer.html')).text();
          
          // Skripte aus dem Header auswerten
          const headerScripts = document.getElementById('header-container').querySelectorAll('script');
          for (const script of headerScripts) {
              if (script.innerText) {
                  eval(script.innerText);
              }
          }
          
          // Explizit die Navigation aktualisieren
          if (window.updateNavigation) {
              window.updateNavigation();
          }
      } catch (error) {
          console.error('Fehler beim Laden des Headers oder Footers:', error);
      }
  }
  ```
- Änderungen an diesen Komponenten wirken sich automatisch auf alle Seiten aus.

### Profilseite
- Die Profilseite wurde mit einem kompakteren, zweispaltigen Layout neu gestaltet.
- Die linke Spalte enthält Funktionen zur Bearbeitung des Benutzerprofils und zum Ändern des Passworts.
- Die rechte Spalte enthält die "Gefahrenzone" mit Optionen zum Löschen von Daten und des Kontos.
- Das Design ist responsiv und wechselt auf kleineren Bildschirmen zu einem einspaltigen Layout.
- Eingabefelder wurden optimiert, um die korrekte Box-Sizing-Strategie zu verwenden (`box-sizing: border-box`).

### Sicherheitsabfragen
- Für kritische Aktionen wie das Löschen von Daten oder des Kontos wurden modale Dialoge mit Sicherheitsabfragen implementiert.
- Die modalen Dialoge sind zentriert und responsiv gestaltet.
- Klare Warnmeldungen informieren den Benutzer über die Konsequenzen der Aktionen.

### Technische Herausforderungen
- Probleme mit Flexbox und der dynamischen Einbindung von Header und Footer wurden gelöst.
- Das korrekte Ausführen von JavaScript in dynamisch geladenen Header-Elementen wurde implementiert.
- Die Konsistenz des App-Logo-Buttons über alle Seiten hinweg wurde sichergestellt.
- Zusätzliche CSS-Regeln wurden hinzugefügt, um Layout-Überlappungen zu vermeiden.
- Ein robustes Fehlerbehandlungssystem mit try-catch-Blöcken und detailliertem Logging wurde implementiert.

### App-Logo-Button
- Der App-Logo-Button wurde so konfiguriert, dass er dynamisch auf den Login-Status des Benutzers reagiert.
  - Wenn der Benutzer eingeloggt ist, führt der Button zur `dashboard.html`.
  - Wenn der Benutzer nicht eingeloggt ist, führt der Button zur `index.html`.
- Die Konfiguration erfolgt durch die globale `window.updateNavigation`-Funktion im Header.
- Diese Funktion wird automatisch nach dem Laden des Headers auf allen Seiten ausgeführt.
- Für dynamisch geladene Header wurde ein spezieller Mechanismus implementiert, der sicherstellt, dass die Verlinkung konsistent funktioniert.
- Styling:
  - Das Icon des Buttons ist immer blau.
  - Der Text des Buttons ist immer schwarz.
- Diese Änderungen wurden implementiert, um eine konsistente Benutzererfahrung auf allen Seiten zu gewährleisten.

### Sichtbarkeit der Menü-Punkte
- Die Sichtbarkeit der Menü-Punkte wird dynamisch basierend auf dem Login-Status des Benutzers gesteuert.
  - **Admin-Button**: Wird nur angezeigt, wenn der Benutzer nicht eingeloggt ist.
  - **User-Buttons**: Werden nur angezeigt, wenn der Benutzer eingeloggt ist.
- Diese Logik wird durch JavaScript implementiert und überprüft den `loggedIn`-Status im `localStorage`.

### Login und Login-Status
- Der Login-Status des Benutzers wird im `localStorage` unter dem Schlüssel `loggedIn` gespeichert.
  - **Wert `true`**: Benutzer ist eingeloggt.
  - **Wert `false`**: Benutzer ist nicht eingeloggt.
- Beim Logout werden alle Daten im `localStorage` gelöscht, mit Ausnahme der persistenten Logs (`persistentLogs`).
- Nach dem Logout wird der Benutzer automatisch zur Startseite (`index.html`) weitergeleitet.

---

## Datenbank und Speicherort

Die LernApp bietet eine flexible Speicherkonfiguration für die Fragendatenbank und Benutzerstatistiken:

#### Speicherort-Konfiguration
- Benutzer können einen benutzerdefinierten Pfad für die Speicherung der Fragenbank festlegen.
- Die App unterstützt die Auswahl eines Ordners über den nativen Dateibrowser des Betriebssystems.
- Ein gemeinsamer Pfad auf verschiedenen Geräten (z.B. in Dropbox) ermöglicht es, die gleichen Fragen auf all Ihren Geräten zu verwenden.
- Nur beim ersten Login eines Benutzers wird der Dialog zur Auswahl des Speicherorts angezeigt.
- Bei späteren Logins wird automatisch der gespeicherte Speicherort verwendet.
- Wurde kein benutzerdefinierter Speicherort festgelegt, wird ohne weitere Nachfrage der Standardspeicherort verwendet.
- Der Speicherort kann jederzeit über das Benutzerprofil geändert werden.
- Jeder Benutzer hat seinen eigenen Speicherort, der nach dem Login automatisch geladen wird.

#### Funktionen für den Speicherort
- **isFileSystemAccessSupported()**: Überprüft, ob der Browser die File System Access API unterstützt.
- **openDirectoryPicker()**: Öffnet den nativen Dateibrowser-Dialog zur Auswahl eines Ordners.
- **getDirectoryHandle(username)**: Versucht, auf den konfigurierten Ordner zuzugreifen, ohne einen Dialog anzuzeigen.
- **isStoragePathConfigured(username)**: Überprüft, ob ein Speicherort für den angegebenen Benutzer konfiguriert wurde.
- **getStoragePath(username)**: Gibt den konfigurierten Speicherort für den angegebenen Benutzer zurück.
- **setStoragePath(path, username)**: Setzt einen neuen Speicherort für den angegebenen Benutzer.
- **resetStoragePath(username)**: Setzt den Speicherort für den angegebenen Benutzer auf den Standardpfad zurück.
- **verifyStoragePath()**: Prüft, ob der konfigurierte Speicherort existiert und zugänglich ist.

#### Persistenter Dateisystem-Zugriff
Die LernApp verwendet eine erweiterte Technik, um DirectoryHandles über Seitenaufrufe hinweg zu persistieren:

- **IndexedDB-Speicherung**: Verzeichnis-Handles werden in der IndexedDB gespeichert, um sie zwischen Seitenaufrufen und sogar nach Browser-Neustarts beizubehalten.
- **Automatische Wiederherstellung**: Beim Laden der Seite werden gespeicherte Handles automatisch geladen und validiert.
- **Berechtigungsmanagement**: Die App kümmert sich automatisch um die Anforderung und Erneuerung von Berechtigungen.
- **Benutzerfreundliche Benachrichtigungen**: Statt automatischer Dialoge zeigt die App benutzerfreundliche Benachrichtigungen, wenn eine Benutzerinteraktion erforderlich ist.
- **Erweiterte Wiederherstellungsversuche**: Die App implementiert mehrere Fallback-Mechanismen, um DirectoryHandles bei Seitenwechseln zu erhalten.

#### Problembehandlung für DirectoryHandle-Persistenz

Die LernApp verwaltet den Speicherort-Zugriff vollautomatisch. Sollte trotzdem einmal eine Meldung wie "Dateisystem-API wird unterstützt, aber kein DirectoryHandle vorhanden" erscheinen, bietet die App folgende benutzerfreundliche Lösungen:

1. **Automatische Wiederherstellung**: Die App versucht automatisch, den Zugriff wiederherzustellen ohne Benutzerinteraktion.

2. **Benutzerfreundliche Benachrichtigung**: Falls die automatische Wiederherstellung fehlschlägt, erscheint eine Benachrichtigung mit einem klaren "Speicherort neu auswählen"-Button, der den Zugriff mit einem Klick wiederherstellt.

3. **Speicherort im Profil**: Im Benutzerprofil kann der Speicherort jederzeit über einen einfachen Dialog neu festgelegt werden.

4. **Alternativer Standardspeicher**: Die Option "Standardspeicherort verwenden" im Profil stellt sicher, dass die Daten immer lokal im Browser gespeichert werden, ohne dass ein Dateisystemzugriff nötig ist.

Diese Tools sind speziell dafür entwickelt, die persistente Speicherung von DirectoryHandles zu unterstützen und Probleme bei der Beibehaltung von Dateisystem-Berechtigungen zwischen Seitenaufrufen zu beheben.
- **storeDirectoryHandle(handle)**: Speichert ein Verzeichnis-Handle in IndexedDB für spätere Verwendung.
- **loadDirectoryHandle()**: Lädt ein gespeichertes Verzeichnis-Handle aus IndexedDB.
- **verifyPermission(handle)**: Prüft und fordert Berechtigungen für ein Verzeichnis-Handle an.
- **restoreDirectoryHandle()**: Stellt ein gespeichertes Verzeichnis-Handle wieder her und validiert die Berechtigungen.
- **openAndPersistDirectoryPicker()**: Öffnet den Dateibrowser und speichert das ausgewählte Handle automatisch.
- **forceRestoreDirectoryHandle()**: Erweiterte Wiederherstellungsmethode für DirectoryHandles mit zusätzlichen Fallback-Mechanismen.

#### Debugging des Dateisystem-Zugriffs
Die LernApp bietet spezielle Debugging-Tools für den Dateisystem-Zugriff:

- **debugPersistentStorage()**: Führt eine vollständige Diagnose des Dateisystem-Zugriffs durch und zeigt den Status der DirectoryHandle-Persistenz.
- **clearStoredDirectoryHandle()**: Löscht ein gespeichertes DirectoryHandle für einen Neustart der Speicherkonfiguration.
- **testFileAccess()**: Testet den Dateisystem-Zugriff durch Schreiben einer Testdatei und zeigt das Ergebnis im Log.
- **debugDirectoryHandleStatus()**: Zeigt den aktuellen Status des DirectoryHandle-Objekts und der zugehörigen Flags.

Diese Tools können über die Browser-Konsole aufgerufen werden und sind besonders nützlich bei der Diagnose von Problemen mit der Dateisystem-Persistenz zwischen Seitenaufrufen. Die Tools verwenden das zentrale Logging-System, um konsistente und leicht verfolgbare Ausgaben zu erzeugen.

### Zentrales Logging-System

Die LernApp implementiert ein zentrales Logging-System, das in allen Modulen verwendet wird, um konsistente und leicht nachverfolgbare Log-Ausgaben zu ermöglichen:

#### Funktionen des Logging-Systems
- **Zentralisierte Logs**: Alle Logs werden über einen zentralen Logger ausgegeben, um eine einheitliche Formatierung zu gewährleisten.
- **Log-Level**: Unterstützung verschiedener Log-Level (info, warn, error) mit entsprechender visueller Differenzierung.
- **Zeitstempel**: Automatische Hinzufügung von Zeitstempeln zu allen Log-Einträgen.
- **Persistente Logs**: Optionale Speicherung wichtiger Logs für spätere Diagnose.
- **Rekursionsschutz**: Verhinderung von rekursiven Logging-Ketten, die zu Endlosschleifen führen könnten.

#### Verwendung in Modulen
Jedes Modul verwendet das zentrale Logging-System mit einem einheitlichen Adapter-Pattern:

```javascript
// Adapter für zentrales Logging
const log = window.logger ? window.logger.info.bind(window.logger) : console.log;
const warn = window.logger ? window.logger.warn.bind(window.logger) : console.warn;
const error = window.logger ? window.logger.error.bind(window.logger) : console.error;
```

Dies erlaubt eine konsistente Logging-Ausgabe über alle Module hinweg, auch wenn der zentrale Logger nicht verfügbar ist (Fallback auf console-Methoden).

### Breadcrumb-Navigation

Die LernApp verfügt über eine intuitive Breadcrumb-Navigation, die es den Benutzern ermöglicht, ihren aktuellen Standort in der Anwendung zu erkennen und einfach zu vorherigen Ebenen zurückzukehren:

#### Funktionen und Eigenschaften
- Hierarchische Navigation: Zeigt den vollständigen Pfad von der Startseite bis zur aktuellen Ansicht an.
- Responsive Design: Passt sich automatisch an verschiedene Bildschirmgrößen an.
- Klickbare Pfadeinträge: Ermöglicht die direkte Navigation zu übergeordneten Ebenen.
- Persistente Zustandsspeicherung: Behält den Navigationspfad auch bei Seitenneuladen bei.

#### Implementierung
- Die Breadcrumb-Navigation ist in der Datei `header.html` definiert und über das globale Objekt `window.breadcrumbs` zugänglich.
- Die Navigation wird auf verschiedenen Seiten dynamisch aktualisiert:
  - **Quiz-Spieler**: Zeigt den Pfad "Quiz → Kategorie → Gruppe → Frage X/Y → Ergebnis" an.
  - **Kategorie-Verwaltung**: Zeigt den Pfad "Verwaltung → Kategorien & Gruppen" an.
  - **Fragen-Erstellung**: Zeigt den Pfad "Verwaltung → Fragen erstellen" an.
  - **Dashboard**: Zeigt keine Breadcrumbs an, da es die Startseite ist.

#### API-Methoden
- **breadcrumbs.set(path)**: Setzt einen neuen Navigationspad.
- **breadcrumbs.add(label, url)**: Fügt einen neuen Eintrag zum bestehenden Pfad hinzu.
- **breadcrumbs.navigateTo(index)**: Navigiert zu einem bestimmten Eintrag im Pfad.
- **breadcrumbs.clear()**: Entfernt alle Breadcrumbs.
- **breadcrumbs.updateVisibility()**: Aktualisiert die Sichtbarkeit der Breadcrumb-Navigation.

### Automatisches Quiz-System

Die LernApp generiert automatisch Quizze aus den eingepflegten Fragen:

- **Dynamische Fragenerstellung**: Benutzer müssen nur die richtige Antwort eingeben, falsche Antworten werden automatisch aus anderen Fragen übernommen
- **Zufällige Auswahl**: Das System wählt Fragen zufällig aus der Datenbank basierend auf Kategorie und Gruppe
- **Keine Wiederholungen**: Innerhalb eines Quiz werden Fragen nicht wiederholt
- **Gemischte Antworten**: Die Reihenfolge der Antwortoptionen wird für jede Frage neu gemischt
- **Automatische Quiz-Typzuordnung**: Fragen werden automatisch dem passenden Quiz-Typ zugeordnet

#### Fragen erstellen

1. Wähle eine Kategorie und Gruppe
2. Gib den Fragetext ein
3. Optional kannst du ein Bild hinzufügen
4. Gib die richtige Antwort ein
5. Füge eine optionale Erklärung hinzu

Das System ergänzt automatisch die falschen Antwortoptionen aus dem Pool aller anderen richtigen Antworten und ordnet die Fragen automatisch dem entsprechenden Quiz-Typ zu.

#### Erstellen von Fragen
Die App ermöglicht die Erstellung von Fragen mit:
- Fragetexten
- Optionalen Bildern
- Vier Antwortoptionen (eine davon als richtig markiert)
- Optionalen Erklärungstexten, die nach der Beantwortung angezeigt werden
- Schwierigkeitsgraden zur späteren Filterung

#### Quiz-Anpassungen
- Anzahl der Fragen kann vom Benutzer bestimmt werden
- Zwei verschiedene Quiz-Typen sind verfügbar:
  - **Textfragen**: Zeigt den Fragentext an, Bilder werden ausgeblendet
  - **Bilderquiz**: Zeigt nur Bilder an, ohne begleitenden Fragetext
- Fragen werden automatisch dem passenden Quiz-Typ zugeordnet
- Fragen und Antworten werden für jeden Quiz-Durchlauf neu gemischt

#### Fragendatenbank
- Die Fragenbank unterstützt Multiple-Choice-Fragen mit mehreren Antwortoptionen.
- Jede Frage kann mit einem Bild oder einer Erklärung versehen werden.
- Fragen sind in Kategorien organisiert, die vom Benutzer erstellt und verwaltet werden können.
- Standardkategorien werden beim ersten Start automatisch erstellt.

#### Datenstruktur

1. **Fragen**:
   ```javascript
   {
     id: string,            // Eindeutige ID der Frage
     text: string,          // Fragetext
     imageUrl: string,      // Optional: URL zu einem Bild (kann auch Data-URL sein)
     options: [             // Array mit Antwortoptionen
       {
         id: string,        // Eindeutige ID der Antwortoption
         text: string,      // Text der Antwortoption
         isCorrect: boolean // Ob die Antwort richtig ist
       }
     ],
     explanation: string,   // Optional: Erklärung der richtigen Antwort
     categoryId: string,    // Kategorie-ID
     difficulty: number,    // Schwierigkeitsgrad (1-5)
     createdBy: string,     // Benutzername des Erstellers
     createdAt: number      // Zeitstempel der Erstellung
   }
   ```

2. **Kategorien**:
   ```javascript
   {
     id: string,            // Eindeutige ID der Kategorie
     name: string,          // Name der Kategorie
     createdBy: string,     // Benutzername des Erstellers
     createdAt: number      // Zeitstempel der Erstellung
   }
   ```

3. **Statistiken**:
   ```javascript
   {
     userId: string,        // Benutzername
     questionStats: {       // Statistiken pro Frage
       [questionId]: {
         correct: number,   // Anzahl der richtigen Antworten
         incorrect: number, // Anzahl der falschen Antworten
         lastAnswered: number // Zeitstempel der letzten Beantwortung
       }
     },
     quizStats: [           // Statistiken pro Quiz-Durchlauf
       {
         date: number,      // Zeitstempel des Quiz-Durchlaufs
         categoryId: string, // Kategorie des Quiz
         totalQuestions: number, // Gesamtzahl der Fragen
         correctAnswers: number, // Anzahl der richtigen Antworten
         timeSpent: number  // Benötigte Zeit in Sekunden
       }
     ]
   }
   ```

#### Implementierung
- Das System bietet zwei Speichermethoden:
  1. **File System Access API**: In unterstützten Browsern (Chrome, Edge, etc.) können Benutzer direkt auf ihr Dateisystem zugreifen und einen Ordner auswählen.
  2. **LocalStorage**: Als Fallback wird `localStorage` verwendet, um die Daten persistent im Browser zu speichern.
- Die Datenpfade werden so konstruiert, dass sie mit echten Dateisystempfaden kompatibel sind.
- Alle Speicherfunktionen sind asynchron gestaltet, um die verschiedenen Backends einheitlich zu unterstützen.
- Die Implementierung prüft die Verfügbarkeit der APIs und bietet sinnvolle Fallbacks und Fehlermeldungen.
