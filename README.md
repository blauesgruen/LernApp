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
