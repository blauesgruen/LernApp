// Firebase Konfiguration Template
// ANLEITUNG: Ersetzen Sie die Werte mit Ihren echten Firebase-Projektdaten

const firebaseConfig = {
    // Ihre Firebase Projekt-Konfiguration hier einfügen
    // Diese Werte erhalten Sie in der Firebase Console unter 
    // Projekteinstellungen > Allgemein > Ihre Apps > Web-App
    
    apiKey: "YOUR_FIREBASE_API_KEY_HERE",           // ← Ersetzen Sie diesen Wert
    authDomain: "ihr-projekt.firebaseapp.com",            // ← Ersetzen Sie diesen Wert  
    projectId: "ihr-projekt-id",                          // ← Ersetzen Sie diesen Wert
    storageBucket: "ihr-projekt.appspot.com",             // ← Ersetzen Sie diesen Wert
    messagingSenderId: "123456789012",                     // ← Ersetzen Sie diesen Wert
    appId: "1:123456789012:web:ihre-app-id-hier"          // ← Ersetzen Sie diesen Wert
};

// WICHTIG: 
// 1. Diese Datei nicht in Git committen, wenn sie echte Werte enthält
// 2. Fügen Sie "js/firebase-config-real.js" zu .gitignore hinzu
// 3. Für lokale Entwicklung: Kopieren Sie diese Datei zu "firebase-config-real.js"

export default firebaseConfig;
