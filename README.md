# LernApp - Interaktive Quiz-Anwendung

Eine moderne, responsi**📝 Text-Frage-Modus (zufällig ausgewählt):**
- **Angezeigt**: "Welches Tier ist das?"
- **Antworten**:
  - A) [Löwen-Foto] ✓
  - B) [Tiger-Foto]
  - C) [Leopard-Foto]  
  - D) [Puma-Foto]Anwendung zum Erstellen und Durchführen von Multiple-Choice-Quizzes mit Kategorien und Bildunterstützung.

## ✨ Features

- **Dynamisches Quiz-System**: Das System erstellt automatisch Multiple-Choice-Fragen aus Ihren Frage/Antwort-Paaren
- **Intelligente Antwortgenerierung**: Für jede Frage wird die richtige Antwort plus 3 zufällige falsche Antworten aus derselben Kategorie verwendet
- **Zufällige Frage-Modi**: Der Zufall entscheidet, ob eine Text-Frage oder Bild-Frage gezeigt wird
- **Adaptive Antwort-Formate**: 
  - Bei **Bild-Fragen**: "Ordne zu" + nur Text-Antworten (groß und prominent)
  - Bei **Text-Fragen**: Ihr Frage-Text + nur Bild-Antworten (ohne Text)
- **Kategorien-System**: Organisieren Sie Ihre Fragen in verschiedenen Themenbereichen
- **Vereinfachte Bildunterstützung**: Ein Bild für Frage und Antwort
- **Admin-Bereich**: Einfaches Hinzufügen und Verwalten von Frage/Antwort-Paaren und Kategorien
- **Bild-Vorschau**: Sehen Sie hochgeladene Bilder sofort in der Verwaltung
- **Statistiken**: Verfolgen Sie Ihren Lernfortschritt und Ihre Erfolgsrate
- **Responsive Design**: Funktioniert perfekt auf Desktop, Tablet und Smartphone
- **Lokaler Speicher**: Alle Daten werden lokal im Browser gespeichert

## 🎯 So funktioniert das zufällige Quiz-System

### Dateneingabe
- Sie erstellen **Frage/Antwort-Paare** mit optionalem Bild
- **Frage-Text** (optional): Ihre eigene Frage
- **Bild** (optional): Wird sowohl bei Frage als auch Antwort verwendet  
- **Antwort-Text** (erforderlich): Die richtige Antwort

### Zufällige Quiz-Generierung
Das System entscheidet **zufällig** für jede Frage:

**🖼️ Bild-Frage-Modus** (50% Wahrscheinlichkeit):
- **Frage**: "Ordne zu" + Ihr Bild wird gezeigt
- **Antworten**: Nur Text (groß und prominent, kein Bild)
- **Herausforderung**: Objekt/Konzept im Bild erkennen und benennen

**📝 Text-Frage-Modus** (50% Wahrscheinlichkeit):
- **Frage**: Ihr Frage-Text wird gezeigt
- **Antworten**: Nur Bilder (kein Text bei den Optionen)
- **Herausforderung**: Frage lesen und richtiges Bild auswählen

### Beispiel
Kategorie "Hauptstädte":
- Frage: "Hauptstadt von Deutschland?" → Antwort: "Berlin"
- Frage: "Hauptstadt von Frankreich?" → Antwort: "Paris"  
- Frage: "Hauptstadt von Italien?" → Antwort: "Rom"
- Frage: "Hauptstadt von Spanien?" → Antwort: "Madrid"

### Beispiel mit zufälligen Modi
Ihre Eingabe:
- Frage-Text: "Welche Flagge ist das?"
- Bild: [Deutsche Flagge]  
- Antwort: "Deutschland"

**🖼️ Bild-Frage-Modus (zufällig ausgewählt):**
- **Angezeigt**: "Ordne zu" + [Deutsche Flagge]
- **Antworten**: 
  - A) Deutschland ✓
  - B) Frankreich  
  - C) Italien
  - D) Spanien

**📝 Text-Frage-Modus (zufällig ausgewählt):**
- **Angezeigt**: "Welche Flagge ist das?"
- **Antworten**:
  - A) Deutschland + [Deutsche Flagge] ✓
  - B) Frankreich + [Französische Flagge]
  - C) Italien + [Italienische Flagge]  
  - D) Spanien + [Spanische Flagge]

### Warum zwei Modi?

✅ **Mehr Abwechslung**: Jedes Quiz ist anders, auch mit denselben Daten
✅ **Unterschiedliche Fähigkeiten**: Erkennung vs. Zuordnung  
✅ **Höhere Schwierigkeit**: Man kann nicht vorhersagen, welcher Modus kommt
✅ **Besseres Lernen**: Beide Richtungen werden trainiert

## 🚀 Installation & Nutzung

### Einfache Nutzung
1. Öffnen Sie die `index.html` Datei in Ihrem Webbrowser
2. Die App ist sofort einsatzbereit!

### Für Entwicklung (mit Live Server)
1. Öffnen Sie das Projekt in VS Code
2. Installieren Sie die "Live Server" Extension
3. Rechtsklick auf `index.html` → "Open with Live Server"

## 📖 Bedienungsanleitung

### Quiz spielen
1. Klicken Sie auf "Quiz" in der Navigation
2. Wählen Sie eine Kategorie oder "Alle Kategorien"
3. Beantworten Sie die Fragen durch Anklicken der gewünschten Antwort
4. Bestätigen Sie Ihre Antwort mit "Antwort bestätigen"
5. Sehen Sie sofort, ob Ihre Antwort richtig oder falsch war
6. Am Ende erhalten Sie eine Auswertung Ihrer Leistung

### Fragen verwalten
1. Navigieren Sie zur "Verwaltung"
2. **Neue Kategorie hinzufügen**: Geben Sie den Namen ein und klicken Sie auf "+"
3. **Neue Frage/Antwort hinzufügen**:
   - Wählen Sie eine Kategorie
   - **Frage-Text** (optional): Geben Sie den Text der Frage ein
   - **Bild** (optional): Laden Sie ein Bild hoch - wird automatisch bei Frage UND Antwort verwendet
   - **Antwort-Text** (erforderlich): Geben Sie die richtige Antwort als Text ein
   - Klicken Sie auf "Frage/Antwort hinzufügen"

**Mögliche Kombinationen:**
- **Nur Text-Frage**: "Was ist 2+2?" → "4"
- **Nur Bild-Frage**: [Foto einer Flagge] → "Deutschland" 
- **Text + Bild**: "Welche Flagge ist das?" + [Flaggen-Foto] → "Deutschland"

**Wichtig**: 
- Ein hochgeladenes Bild wird sowohl bei der Frage als auch bei der Multiple-Choice-Antwort angezeigt
- Für ein Quiz werden mindestens 4 Frage/Antwort-Paare in einer Kategorie benötigt

### Statistiken verfolgen
- Besuchen Sie die "Statistiken"-Seite
- Sehen Sie Ihre Gesamtleistung und kategoriespezifische Erfolgsraten
- Verfolgen Sie Ihren Lernfortschritt über die Zeit

## 🎨 Anpassungen

### Design ändern
- Modifizieren Sie `css/style.css` für individuelle Styles
- Die App nutzt Bootstrap 5 für das grundlegende Layout
- CSS-Variablen am Anfang der style.css ermöglichen einfache Farbanpassungen

### Funktionen erweitern
- Hauptlogik befindet sich in `js/app.js`
- Modularer Aufbau erleichtert Erweiterungen
- Beispiele für mögliche Erweiterungen:
  - Timer für Quizzes
  - Schwierigkeitsgrade
  - Export/Import von Fragen
  - Online-Synchronisation

## 🔧 Technische Details

### Technologie-Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI-Framework**: Bootstrap 5
- **Icons**: Bootstrap Icons
- **Datenspeicher**: localStorage (Browser)

### Browser-Kompatibilität
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

### Datenspeicherung
- Alle Daten werden lokal im Browser gespeichert
- Kein Server oder Internet erforderlich
- Daten bleiben beim Schließen des Browsers erhalten
- Beim Löschen der Browser-Daten gehen die Fragen verloren

## 📱 Mobile Nutzung

Die App ist vollständig responsive und funktioniert hervorragend auf:
- Smartphones (Portrait und Landscape)
- Tablets
- Desktop-Computern

## 🎯 Erste Schritte

1. **App öffnen**: Starten Sie die `index.html` Datei
2. **Beispielfragen ansehen**: Die App enthält bereits einige Beispielfragen
3. **Erstes Quiz**: Klicken Sie auf "Quiz" und wählen Sie "Allgemein"
4. **Eigene Fragen hinzufügen**: Gehen Sie zur "Verwaltung" und erstellen Sie Ihre ersten eigenen Fragen
5. **Kategorien erstellen**: Organisieren Sie Ihre Fragen in thematischen Kategorien

## 🆘 Häufige Probleme

**Bilder werden nicht angezeigt:**
- Überprüfen Sie, ob die Bilddatei nicht zu groß ist (max. 5MB)
- Unterstützte Formate: JPG, PNG, GIF, WebP

**Daten sind verschwunden:**
- Browser-Daten wurden gelöscht
- Inkognito-Modus verwendet
- Anderer Browser verwendet

**App funktioniert nicht:**
- Überprüfen Sie, ob JavaScript im Browser aktiviert ist
- Verwenden Sie einen modernen Browser
- Öffnen Sie die Entwicklertools (F12) für Fehlermeldungen

## 🔮 Geplante Features

- [ ] Zeitbegrenzung für Quizzes
- [ ] Schwierigkeitsgrade
- [ ] Export/Import von Fragenkatalogen
- [ ] Erweiterte Statistiken mit Diagrammen
- [ ] Mehrsprachige Unterstützung
- [ ] Offline-PWA-Funktionalität

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Sie können es frei verwenden, modifizieren und verteilen.

## 🤝 Beitragen

Haben Sie Ideen für Verbesserungen? 
- Erstellen Sie eigene Anpassungen
- Teilen Sie Ihre Verbesserungen
- Melden Sie Probleme oder Fehler

---

**Viel Spaß beim Lernen! 🎓**
