# Sicherheitsleitfaden für LernApp

## 🔐 Implementierte Sicherheitsmaßnahmen

### Authentication & Authorization
- **Firebase Authentication** mit E-Mail/Passwort
- **Passwort-Richtlinien:** Mindestens 8 Zeichen, Buchstaben + Zahlen
- **E-Mail-Validierung** bei Registrierung
- **Re-Authentifizierung** für sensible Aktionen (Passwort ändern, Account löschen)
- **Automatische Session-Verwaltung** mit JWT Tokens

### Datenvalidierung & Sanitization
- **Input-Validierung** auf Client- und Server-Seite
- **XSS-Schutz** durch Content Security Policy Headers
- **SQL Injection Schutz** (Firestore NoSQL ist resistent)
- **Datenstruktur-Validierung** vor Speicherung

### Netzwerk-Sicherheit
- **HTTPS erzwungen** in Produktion
- **CORS-Konfiguration** für erlaubte Domains
- **CSP Headers** gegen Code-Injection
- **Rate Limiting** über Firebase Auth (automatisch)

### Datenschutz
- **Daten-Minimierung:** Nur notwendige Daten werden gespeichert
- **Verschlüsselte Übertragung** (TLS 1.3)
- **Lokale Offline-Speicherung** mit Verschlüsselung
- **Löschbare Accounts** mit vollständiger Datenentfernung

## 🛡️ Firestore Sicherheitsregeln (Produktion)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Globale Regeln
    match /{document=**} {
      allow read, write: if false; // Standard: Alles verbieten
    }
    
    // Benutzer-Daten: Nur eigene Daten
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId
        && isValidUserData(request.resource.data);
    }
    
    // Geteilte Daten: Lesen für alle, Schreiben nur für Ersteller
    match /sharedData/{shareId} {
      allow read: if request.auth != null 
        && resource.data.isActive == true
        && resource.data.expiresAt > request.time;
        
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.sharedBy
        && isValidShareData(request.resource.data);
        
      allow update: if request.auth != null
        && request.auth.uid == resource.data.sharedBy
        && (request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['downloadCount', 'lastDownloadAt', 'isActive']));
    }
    
    // Funktionen für Datenvalidierung
    function isValidUserData(data) {
      return data.keys().hasAll(['userData', 'email', 'displayName'])
        && data.userData.keys().hasAll(['categories', 'questions', 'statistics'])
        && data.userData.categories is list
        && data.userData.questions is list
        && data.email is string
        && data.displayName is string
        && data.displayName.size() <= 50;
    }
    
    function isValidShareData(data) {
      return data.keys().hasAll(['shareCode', 'sharedBy', 'data', 'createdAt', 'isActive'])
        && data.shareCode is string
        && data.shareCode.size() == 12
        && data.sharedBy is string
        && data.data.keys().hasAll(['categories', 'questions'])
        && data.isActive == true;
    }
  }
}
```

## 🔒 Frontend-Sicherheit

### Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  font-src 'self' https://cdn.jsdelivr.net;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### Zusätzliche Security Headers
```html
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
```

## 🏭 Produktions-Deployment

### 1. Firebase Hosting Konfiguration

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "**/*.md"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options", 
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains"
          }
        ]
      }
    ]
  }
}
```

### 2. Environment-basierte Konfiguration

```javascript
// js/config.js
const config = {
  development: {
    firebase: {
      // Entwicklungs-Firebase-Projekt
    },
    debug: true,
    analytics: false
  },
  production: {
    firebase: {
      // Produktions-Firebase-Projekt
    },
    debug: false,
    analytics: true
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

## 🔍 Monitoring & Logging

### Firebase App Check (Bot-Schutz)
```javascript
// Aktivierung in Firebase Console:
// 1. App Check aktivieren
// 2. reCAPTCHA v3 konfigurieren
// 3. Enforcement aktivieren

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
}
```

### Error Tracking
```javascript
// Automatisches Error-Logging
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  // Optional: Senden an Error-Tracking-Service
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // Optional: Senden an Error-Tracking-Service
});
```

## 🧪 Sicherheitstests

### Automatisierte Tests
```javascript
// Beispiel: Jest Test für Input-Validierung
describe('Input Validation', () => {
  test('should reject invalid email formats', () => {
    expect(validateEmail('invalid.email')).toBe(false);
    expect(validateEmail('valid@example.com')).toBe(true);
  });
  
  test('should reject weak passwords', () => {
    expect(validatePassword('123')).toBe(false);
    expect(validatePassword('StrongPass123')).toBe(true);
  });
});
```

### Manuelle Sicherheitstests
1. **XSS-Tests:** Eingabe von `<script>alert('XSS')</script>` in alle Eingabefelder
2. **CSRF-Tests:** Requests von fremden Domains
3. **Injection-Tests:** SQL/NoSQL-Injection-Versuche
4. **Authentifizierung:** Zugriff ohne gültige Tokens

## 📋 Sicherheits-Checkliste für Go-Live

- [ ] Firebase Sicherheitsregeln implementiert und getestet
- [ ] App Check aktiviert (reCAPTCHA v3)
- [ ] HTTPS erzwungen
- [ ] Security Headers konfiguriert
- [ ] Input-Validierung überall implementiert
- [ ] Error-Handling ohne sensitive Daten-Exposition
- [ ] Rate Limiting aktiviert
- [ ] Backup-Strategie implementiert
- [ ] Monitoring und Logging eingerichtet
- [ ] Penetrationstests durchgeführt
- [ ] Datenschutzerklärung erstellt
- [ ] Incident Response Plan definiert

## 🚨 Incident Response

### Verdächtige Aktivitäten
1. **Überwachung:** Firebase Console → Authentication → Users
2. **Sperrung:** Verdächtige Accounts deaktivieren
3. **Logs:** Firestore-Zugriffe in Firebase Console prüfen

### Datenschutzverletzungen
1. **Sofortige Maßnahmen:** Betroffene Systeme isolieren
2. **Dokumentation:** Alle Schritte protokollieren
3. **Benachrichtigung:** Behörden und Benutzer informieren (DSGVO)

## 📞 Sicherheits-Support

- **Firebase Security:** [Firebase Support](https://firebase.google.com/support/)
- **Sicherheits-Updates:** [Firebase Release Notes](https://firebase.google.com/support/release-notes/)
- **Best Practices:** [Firebase Security Rules Guide](https://firebase.google.com/docs/rules/)
