// breadcrumb-example.js - Beispiel für die Verwendung der Breadcrumb-Navigation

document.addEventListener('DOMContentLoaded', function() {
    // Breadcrumb-Navigation verfügbar machen
    if (!window.breadcrumbs) {
        console.error('Breadcrumb-Navigation nicht verfügbar!');
        return;
    }
    
    // Beispiel für die Verwendung auf verschiedenen Seiten
    
    // Normalize pathname for GitHub Pages subpath support
    let _path = window.location.pathname || '/';
    try { if (_path.indexOf('/LernApp') === 0) _path = _path.substring('/LernApp'.length) || '/'; } catch(e) {}

    // 1. Auf der Dashboard-Seite
    if (_path.endsWith('dashboard.html') || _path === '/dashboard.html') {
        // Dashboard ist ein Startpunkt, also Breadcrumbs zurücksetzen
        window.breadcrumbs.clear();
    }
    
    // 2. Auf der Kategorie-Management-Seite
    else if (_path.endsWith('category-management.html')) {
        window.breadcrumbs.set([
            { label: 'Verwaltung', url: 'dashboard.html' },
            { label: 'Kategorien & Gruppen', url: null }  // Aktuelle Seite hat keine URL
        ]);
    }
    
    // 3. Auf der Fragen-Erstellen-Seite
    else if (_path.endsWith('question-creator.html')) {
        window.breadcrumbs.set([
            { label: 'Verwaltung', url: 'dashboard.html' },
            { label: 'Fragen erstellen', url: null }
        ]);
    }
    
    // 4. Auf der Quiz-Spieler-Seite (Setup)
    else if (_path.endsWith('quiz-player.html')) {
        // Prüfen, ob wir im Quiz-Setup sind
        const isSetup = document.getElementById('quiz-setup-section') && 
                        !document.getElementById('quiz-setup-section').classList.contains('hidden');
        
        if (isSetup) {
            window.breadcrumbs.set([
                { label: 'Quiz', url: 'dashboard.html' },
                { label: 'Quiz starten', url: null }
            ]);
        }
    }
    
    // Eventhandler für die Aktualisierung der Breadcrumbs während der Quiz-Navigation
    // Diese müssen in den entsprechenden JavaScript-Dateien implementiert werden
    
    // Beispiel: Beim Starten eines Quiz (in quiz-player.js)
    /*
    function startQuiz() {
        // ... existierender Code ...
        
        // Kategorie und Gruppe aus der Auswahl abrufen
        const categorySelect = document.getElementById('quiz-category');
        const groupSelect = document.getElementById('quiz-group');
        
        const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
        const groupName = groupSelect.value ? groupSelect.options[groupSelect.selectedIndex].text : null;
        
        // Breadcrumbs aktualisieren
        window.breadcrumbs.set([
            { label: 'Quiz', url: 'quiz-player.html' },
            { label: categoryName, url: null },
            ...(groupName ? [{ label: groupName, url: null }] : []),
            { label: 'Frage 1', url: null }
        ]);
    }
    */
    
    // Beispiel: Beim Wechseln zur nächsten Frage (in quiz-player.js)
    /*
    function nextQuestion() {
        // ... existierender Code ...
        
        // Aktuelle Breadcrumbs abrufen
        const currentPath = window.breadcrumbs.path.slice();
        
        // Den letzten Eintrag (aktuelle Frage) aktualisieren
        currentPath[currentPath.length - 1] = { 
            label: `Frage ${currentQuestionIndex + 1}`, 
            url: null 
        };
        
        // Breadcrumbs aktualisieren
        window.breadcrumbs.set(currentPath);
    }
    */
});

// Anwendungsspezifische Funktionen für die Breadcrumb-Navigation

/**
 * Aktualisiert die Breadcrumbs für die Quiz-Navigation
 * @param {string} categoryName - Name der Kategorie
 * @param {string} groupName - Name der Gruppe (optional)
 * @param {number} questionIndex - Index der aktuellen Frage (0-basiert)
 */
function updateQuizBreadcrumbs(categoryName, groupName = null, questionIndex = 0) {
    if (!window.breadcrumbs) return;
    
    // Basis-Pfad erstellen
    const path = [
        { label: 'Quiz', url: 'quiz-player.html' },
        { label: categoryName, url: null }
    ];
    
    // Gruppe hinzufügen, falls vorhanden
    if (groupName) {
        path.push({ label: groupName, url: null });
    }
    
    // Aktuelle Frage hinzufügen
    path.push({ label: `Frage ${questionIndex + 1}`, url: null });
    
    // Breadcrumbs aktualisieren
    window.breadcrumbs.set(path);
}

/**
 * Aktualisiert die Breadcrumbs für die Ergebnisansicht
 * @param {string} categoryName - Name der Kategorie
 * @param {string} groupName - Name der Gruppe (optional)
 */
function updateResultBreadcrumbs(categoryName, groupName = null) {
    if (!window.breadcrumbs) return;
    
    // Basis-Pfad erstellen
    const path = [
        { label: 'Quiz', url: 'quiz-player.html' },
        { label: categoryName, url: null }
    ];
    
    // Gruppe hinzufügen, falls vorhanden
    if (groupName) {
        path.push({ label: groupName, url: null });
    }
    
    // Ergebnis hinzufügen
    path.push({ label: 'Ergebnis', url: null });
    
    // Breadcrumbs aktualisieren
    window.breadcrumbs.set(path);
}
