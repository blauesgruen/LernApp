/**
 * login-page.js - Spezielles Skript für die Login-Seite
 * Kümmert sich um die Speicherinitialisierung bei erneutem Login
 */

// Event-Listener für erfolgreichen Login
document.addEventListener('login-successful', async (event) => {
    console.log('🔄 Login-Event erkannt, initialisiere Speicher...');
    
    // Benutzer aus dem Event oder aus localStorage holen
    const username = event.detail?.username || localStorage.getItem('username');
    
    if (!username) {
        console.error('❌ Kein Benutzername verfügbar für die Speicherinitialisierung');
        return;
    }
    
    // Warten, bis die Storage-Module geladen sind
    if (window.loadPersistentStorageModules) {
        console.log('📂 Lade persistente Speichermodule...');
        await window.loadPersistentStorageModules();
    }
    
    // Speicher für den Benutzer initialisieren
    if (window.initializeStorageForUser) {
        console.log('🔄 Initialisiere Speicher für Benutzer: ' + username);
        try {
            // Options-Objekt erstellen, um keine automatischen Dialoge anzuzeigen
            const options = { showModal: false };
            const result = await window.initializeStorageForUser(username, options);
            console.log(`📊 Storage-Initialisierung: ${result ? 'Erfolgreich' : 'Mit Problemen'}`, 
                      result ? 'success' : 'warn');
            
            // Bei Problemen Reparatur versuchen ohne automatischen Dialog
            if (!result && window.repairStorageAccess) {
                console.log('🔧 Versuche Storage-Reparatur ohne Dialoganzeige...');
                // Das showModal: false Optionsobjekt sicher übergeben
                const options = { showModal: false };
                const repairResult = await window.repairStorageAccess(username, options);
                console.log(`📊 Storage-Reparatur: ${repairResult.success ? 'Erfolgreich' : 'Fehlgeschlagen'}`,
                          repairResult.success ? 'success' : 'error');
                
                // Bei erfolgreicher Reparatur erneut initialisieren
                if (repairResult.success) {
                    console.log('🔄 Initialisiere Speicher nach erfolgreicher Reparatur...');
                    await window.initializeStorageForUser(username, options);
                }
            }
        } catch (error) {
            console.error('❌ Fehler bei Storage-Initialisierung:', error);
        }
    } else {
        console.warn('⚠️ initializeStorageForUser-Funktion nicht verfügbar');
    }
});

// Login-Formular überwachen und Event auslösen bei erfolgreichem Login
document.addEventListener('DOMContentLoaded', () => {
    console.log('📝 Login-Page-Modul geladen');
    
    const loginForm = document.querySelector('#login form');
    if (loginForm) {
        const originalSubmit = loginForm.onsubmit;
        
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (window.handleLogin) {
                try {
                    // Wir überlassen die Login-Verarbeitung der vorhandenen Funktion
                    await window.handleLogin(username, password);
                    
                    // Bei erfolgreichem Login ein Event auslösen
                    if (localStorage.getItem('loggedIn') === 'true') {
                        console.log('✅ Login erfolgreich, löse Event aus');
                        document.dispatchEvent(new CustomEvent('login-successful', {
                            detail: { username }
                        }));
                    }
                } catch (error) {
                    console.error('❌ Fehler beim Login:', error);
                }
            }
        });
    }
});

// Sofort nach dem Laden überprüfen, ob bereits eingeloggt
(function checkLoginStatus() {
    if (localStorage.getItem('loggedIn') === 'true') {
        const username = localStorage.getItem('username');
        console.log(`✅ Bereits eingeloggt als ${username}, überspringe Login-Prozess`);
        
        // Zum Dashboard weiterleiten, falls wir auf der Login-Seite sind
        if (document.querySelector('#login')) {
            console.log('🔄 Weiterleitung zum Dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        }
    }
})();
