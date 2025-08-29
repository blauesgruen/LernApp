
# LernApp - Interaktive Lernapp

## Überblick
Die LernApp ist eine moderne, responsive Lernplattform für Multiple-Choice-Fragen, Kategorienverwaltung, Admin-Interface und Bildunterstützung. Sie funktioniert komplett im Browser und speichert Daten lokal (localStorage oder optional Cloud-Ordner via File System Access API).

## Technischer Aufbau
- **Vanilla HTML, CSS, JavaScript** (keine Frameworks)
- **Klassische Script-Einbindung**: Alle JS-Dateien werden per `<script>`-Tag eingebunden, keine Module!
- **Globale Funktionen/Objekte**: Wichtige Manager (z.B. `window.questionManager`, `window.groupManager`, `window.storageManager`, `window.app`) sind global verfügbar.
- **Bootstrap** für UI-Komponenten
- **Responsive Design**

### Wichtige JS-Dateien und Reihenfolge
Die Reihenfolge der Skripte ist entscheidend, damit alle Abhängigkeiten verfügbar sind:

```html
<script src="js/local-cloud-storage.js"></script>
<script src="js/storage.js"></script>
<script src="js/questions.js"></script>
<script src="js/groups.js"></script>
<script src="js/app-extensions.js"></script>
<script src="js/app.js"></script>
```

**Hinweis:** `local-cloud-storage.js` muss vor `storage.js` geladen werden, damit der Cloud-Speicher funktioniert.

### Globale Methoden für Cloud-Speicher
Folgende Methoden stehen nach dem Laden von `app-extensions.js` global zur Verfügung:
- `chooseLernAppStorageDir()` – Cloud-Ordner wählen
- `saveLernAppDataToCloud(data)` – Datenbank speichern
- `loadLernAppDataFromCloud()` – Datenbank laden
- `exportLernAppData(data)` – Datenbank exportieren (Fallback)
- `importLernAppData()` – Datenbank importieren (Fallback)
- `getLernAppCloudHint()` – Hinweistext für UI
- `lernappAutoSave(data)` – Automatisches Speichern

**Beispiel für Integration:**
```js
// Nach jeder Änderung in der App aufrufen:
window.lernappAutoSave(app.getUserData());
```

## Fehlerbehebung


## Dokumentation & Benutzeranleitung
- Siehe `BENUTZERANLEITUNG.md` für eine vollständige Anleitung zur Nutzung der App.
- Siehe `SECURITY.md` und `SECURITY-GUIDE.md` für Sicherheitshinweise.

---
**Viel Spaß beim Lernen!**
