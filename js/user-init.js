// user-init.js - Initialisierung des Standardbenutzers für Tests
// Diese Datei wird in der index.html vor dem Laden anderer Skripte eingebunden

(async function() {
    // Hashfunktion für Passwort
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Überprüfen, ob bereits Benutzer existieren
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    if (users.length === 0) {
        console.log('Keine Benutzer gefunden. Erstelle Standardbenutzer für Tests...');
        
        // Testbenutzer erstellen
        const hashedPassword = await hashPassword('test123');
        const testUser = {
            username: 'test',
            password: hashedPassword,
            createdAt: Date.now()
        };
        
        // Benutzer speichern
        users.push(testUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        console.log('Standardbenutzer "test" mit Passwort "test123" wurde erstellt.');
    } else {
        console.log(`${users.length} Benutzer in der Datenbank gefunden.`);
    }
})();
