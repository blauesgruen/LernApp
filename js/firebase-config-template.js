// Firebase Konfiguration Template
// ANLEITUNG: Ersetzen Sie die Werte mit Ihren echten Firebase-Projektdaten

const firebaseConfig = {
    // Ihre Firebase Projekt-Konfiguration hier einfügen
    // Diese Werte erhalten Sie in der Firebase Console unter 
    // Projekteinstellungen > Allgemein > Ihre Apps > Web-App
    
    apiKey: "AIzaSyBOZPYJOFHKUGHJ93PQJ8lEDFQ-XPDJW4W",  // ← Ersetzen Sie diesen Wert
    authDomain: "lernapp-demo.firebaseapp.com",            // ← Ersetzen Sie diesen Wert  
    projectId: "lernapp-demo",                             // ← Ersetzen Sie diesen Wert
    storageBucket: "lernapp-demo.appspot.com",             // ← Ersetzen Sie diesen Wert
    messagingSenderId: "123456789012",                     // ← Ersetzen Sie diesen Wert
    appId: "1:123456789012:web:abc123def456ghi789"         // ← Ersetzen Sie diesen Wert
};

// WICHTIG: 
// 1. Diese Datei nicht in Git committen, wenn sie echte Werte enthält
// 2. Fügen Sie "js/firebase-config-real.js" zu .gitignore hinzu
// 3. Für lokale Entwicklung: Kopieren Sie diese Datei zu "firebase-config-real.js"

export default firebaseConfig;
