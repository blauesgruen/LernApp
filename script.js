// Hier können zukünftige Interaktionen und Funktionen hinzugefügt werden
console.log('Willkommen bei der LernApp!');

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const startseiteLink = document.querySelector('nav ul li a[href="#"]');

    // Überprüfen, ob die aktuelle Seite die zentrale Homepage ist
    if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath === '/LernApp/') {
        startseiteLink.parentElement.style.display = 'none';
    } else {
        startseiteLink.parentElement.style.display = 'block';
    }
});
