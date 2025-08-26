# Firebase Setup-Anleitung für LernApp

## 🚀 Schnellstart-Anleitung

### 1. Firebase Projekt erstellen

1. Gehen Sie zu [Firebase Console](https://console.firebase.google.com/)
2. Klicken Sie auf "Projekt hinzufügen"
3. Geben Sie einen Projektnamen ein (z.B. "lernapp-ihr-name")
4. Google Analytics können Sie optional aktivieren
5. Klicken Sie auf "Projekt erstellen"

### 2. Firestore Database einrichten

1. In der Firebase Console, gehen Sie zu "Firestore Database"
2. Klicken Sie auf "Datenbank erstellen"
3. Wählen Sie "Im Testmodus starten" (später können Sie die Regeln anpassen)
4. Wählen Sie eine Region (z.B. "europe-west3" für Deutschland)

### 3. Authentication aktivieren

1. Gehen Sie zu "Authentication" > "Sign-in method"
2. Aktivieren Sie "E-Mail/Passwort"
3. Optional: Aktivieren Sie weitere Anbieter (Google, Facebook, etc.)

### 4. Web-App konfigurieren

1. In der Projektübersicht, klicken Sie auf das Web-Icon (</>) 
2. Geben Sie einen App-Namen ein (z.B. "LernApp Web")
3. Optional: Firebase Hosting aktivieren
4. Klicken Sie auf "App registrieren"
5. **WICHTIG:** Kopieren Sie die Konfigurationsdaten

### 5. Konfiguration in der App einsetzen

Öffnen Sie die Datei `js/firebase-config.js` und ersetzen Sie die Beispiel-Konfiguration:

```javascript
const firebaseConfig = {
    apiKey: "IHR_API_KEY",
    authDomain: "ihr-projekt.firebaseapp.com", 
    projectId: "ihr-projekt-id",
    storageBucket: "ihr-projekt.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### 6. Firestore Sicherheitsregeln (Optional)

Für produktive Nutzung sollten Sie die Sicherheitsregeln anpassen:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Benutzer können nur ihre eigenen Daten lesen/schreiben
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Geteilte Daten können von allen authentifizierten Benutzern gelesen werden
    match /sharedData/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.sharedBy || 
         request.auth.uid == request.resource.data.sharedBy);
    }
  }
}
```

### 7. App testen

1. Öffnen Sie die `index.html` in einem Webserver (nicht als file://)
2. Registrieren Sie sich mit einer neuen E-Mail-Adresse
3. Testen Sie Login/Logout
4. Erstellen Sie Fragen und testen Sie die Synchronisation

## 🛠️ Lokaler Entwicklungsserver

Für die Entwicklung können Sie einen lokalen Server starten:

### Mit Python:
```bash
cd /pfad/zur/lernapp
python3 -m http.server 8000
```

### Mit Node.js:
```bash
cd /pfad/zur/lernapp
npx http-server -p 8000 -o
```

### Mit VS Code Live Server:
1. Installieren Sie die "Live Server" Extension
2. Rechtsklick auf `index.html` > "Open with Live Server"

## 🔧 Erweiterte Konfiguration

### Offline-Support
Die App funktioniert automatisch offline und synchronisiert Daten, wenn eine Verbindung verfügbar ist.

### Passwort-Reset
Passwort-Reset E-Mails werden automatisch über Firebase Auth gesendet.

### Daten-Export/Import
- **Export:** Lädt alle Benutzerdaten als JSON-Datei herunter
- **Import:** Über Teilungs-Codes zwischen Benutzern

### Sicherheitsfeatures
- Sichere Passwort-Validierung (min. 8 Zeichen, Buchstaben + Zahlen)
- E-Mail-Validierung
- Rate Limiting (über Firebase)
- Verschlüsselte Datenübertragung (HTTPS)

## 🚀 Deployment-Optionen

### Firebase Hosting (Empfohlen)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Andere Hosting-Anbieter
- Vercel
- Netlify  
- GitHub Pages
- Heroku

## 📱 Mobile App (PWA)

Die App ist als Progressive Web App (PWA) konfiguriert und kann auf Smartphones wie eine native App installiert werden.

## 🆘 Fehlerbehebung

### "Firebase not initialized"
- Prüfen Sie, ob die Firebase-Konfiguration korrekt ist
- Stellen Sie sicher, dass die Firestore Database aktiviert ist

### "Permission denied" 
- Prüfen Sie die Firestore-Sicherheitsregeln
- Stellen Sie sicher, dass der Benutzer authentifiziert ist

### Offline-Probleme
- Die App speichert Daten lokal und synchronisiert automatisch
- Bei Problemen: Browser-Cache leeren

### CORS-Fehler
- Verwenden Sie einen lokalen Webserver (nicht file://)
- Bei Firebase Hosting gibt es keine CORS-Probleme

## 📞 Support

Bei Problemen können Sie:
1. Die Browser-Entwicklertools öffnen (F12) und Fehler prüfen
2. In der Firebase Console die Logs überprüfen
3. Ein GitHub Issue erstellen

## 🔐 Sicherheit in Produktion

Für den produktiven Einsatz:

1. **Firestore-Regeln** verschärfen
2. **App Check** aktivieren (Firebase Security)
3. **HTTPS** erzwingen
4. **CSP Headers** konfigurieren (bereits implementiert)
5. **Regelmäßige Backups** der Firestore-Daten

Die App ist bereits mit modernen Sicherheitsstandards ausgestattet und produktionsbereit!
