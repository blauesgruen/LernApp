# LernApp - Interaktive Online-Lernplattform

Eine moderne, sichere Lernapp mit **Online-Benutzerverwaltung** und **geräteübergreifender Synchronisation**.

## 🚀 Neue Features (Version 2.0)

### 🔐 Sichere Online-Anmeldung
- **Firebase Authentication** mit E-Mail/Passwort
- **Geräteübergreifende Synchronisation** aller Daten
- **Offline-Modus** mit automatischer Sync bei Verbindung
- **Passwort-Reset** per E-Mail
- **Sichere Datenübertragung** (HTTPS/TLS 1.3)

### ☁️ Cloud-Datenspeicherung  
- **Firestore Database** für zuverlässige Datenspeicherung
- **Automatische Backups** und Versionierung
- **Echtzeit-Synchronisation** zwischen Geräten
- **Lokaler Cache** für Offline-Nutzung

### 🔒 Enterprise-Sicherheit
- **Passwort-Richtlinien** (min. 8 Zeichen, Buchstaben + Zahlen)
- **Input-Validierung** und XSS-Schutz
- **Rate Limiting** gegen Brute-Force-Angriffe
- **DSGVO-konform** mit vollständiger Datenlöschung

## 🏃‍♂️ Schnellstart

### 1. Repository klonen
```bash
git clone https://github.com/blauesgruen/LernApp.git
cd LernApp
```

### 2. Firebase einrichten
1. Folgen Sie der [Firebase Setup-Anleitung](FIREBASE-SETUP.md)
2. Konfigurieren Sie `js/firebase-config.js` mit Ihren Projektdaten

### 3. App starten
```bash
# Mit Python
python3 -m http.server 8000

# Mit Node.js
npx http-server -p 8000 -o
```

### 4. App testen
- Öffnen Sie `http://localhost:8000`
- Registrieren Sie sich mit einer E-Mail-Adresse
- Testen Sie die geräteübergreifende Synchronisation
