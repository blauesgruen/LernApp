// Hier können zukünftige Interaktionen und Funktionen hinzugefügt werden
console.log('Willkommen bei der LernApp!');

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const startseiteLink = document.querySelector('nav ul li a[href="#"]');
    const appLink = document.querySelector('nav div a');

    // Überprüfen, ob die aktuelle Seite die zentrale Homepage ist
    if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath === '/LernApp/') {
        startseiteLink.parentElement.style.display = 'none';
    } else {
        startseiteLink.parentElement.style.display = 'block';
    }

    // Funktion zur Steuerung des Links je nach Login-Status
    function updateAppLink(isLoggedIn) {
        if (isLoggedIn) {
            appLink.setAttribute('href', 'dashboard.html'); // Beispiel: Weiterleitung zum Dashboard
        } else {
            appLink.setAttribute('href', 'index.html'); // Weiterleitung zur Startseite
        }
    }

    // Beispiel: Login-Status prüfen (später durch echte Logik ersetzen)
    const isLoggedIn = false; // Platzhalterwert
    updateAppLink(isLoggedIn);
});
