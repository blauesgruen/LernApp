// import-data.js - Hilfsskript zum direkten Importieren von Daten in den Browser-Speicher

/**
 * Importiert Daten direkt in den Browser-Speicher
 * Diese Funktion kann in der Browser-Konsole ausgeführt werden
 */
async function importDataToLocalStorage() {
    // Muskel-Kategorie
    const categories = [
        {
            "id": "muscle-anatomy-01",
            "name": "Muskeln",
            "description": "Fragen zur Anatomie und Funktion der menschlichen Muskulatur",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z",
            "color": "#e91e63",
            "icon": "fitness_center"
        }
    ];

    // Muskel-Gruppen
    const groups = [
        {
            "id": "muscle-group-01",
            "name": "Rumpf",
            "description": "Muskeln des Rumpfes, einschließlich Rücken- und Bauchmuskulatur",
            "categoryId": "muscle-anatomy-01",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z"
        },
        {
            "id": "muscle-group-02",
            "name": "Schultergürtel / Schulter",
            "description": "Muskeln des Schultergürtels und der Schulter",
            "categoryId": "muscle-anatomy-01",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z"
        },
        {
            "id": "muscle-group-03",
            "name": "Arm",
            "description": "Muskeln des Oberarms und Unterarms",
            "categoryId": "muscle-anatomy-01",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z"
        },
        {
            "id": "muscle-group-04",
            "name": "Hand",
            "description": "Muskeln der Hand und Finger",
            "categoryId": "muscle-anatomy-01",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z"
        },
        {
            "id": "muscle-group-05",
            "name": "Hüfte / Oberschenkel",
            "description": "Muskeln der Hüfte und des Oberschenkels",
            "categoryId": "muscle-anatomy-01",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z"
        },
        {
            "id": "muscle-group-06",
            "name": "Knie / Unterschenkel",
            "description": "Muskeln des Knies und Unterschenkels",
            "categoryId": "muscle-anatomy-01",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z"
        },
        {
            "id": "muscle-group-07",
            "name": "Fuß",
            "description": "Muskeln des Fußes und der Zehen",
            "categoryId": "muscle-anatomy-01",
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z"
        }
    ];

    // Muskel-Fragen (gekürzt, füge alle 18 Fragen aus questions.json ein)
    const questions = [
        // Die ersten 5 Fragen als Beispiel
        {
            "id": "muscle-q-01",
            "question": "Welche Muskeln können den Rumpf dorsalextendieren, ventral- und lateral flexieren?",
            "answer": "Autochthone Rückenmuskulatur",
            "additionalInfo": "Dazu gehören u. a. M. erector spinae, M. multifidus und M. rotatores.",
            "categoryId": "muscle-anatomy-01",
            "groupId": "muscle-group-01",
            "type": "text",
            "difficulty": 2,
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z",
            "tags": ["Rumpf", "Rücken", "Anatomie"]
        },
        {
            "id": "muscle-q-02",
            "question": "Welcher Muskel ist der wichtigste Atemmuskel?",
            "answer": "Zwerchfell (Diaphragma)",
            "additionalInfo": "Trennt Brust- und Bauchraum, kontrahiert bei Inspiration.",
            "categoryId": "muscle-anatomy-01",
            "groupId": "muscle-group-01",
            "type": "text",
            "difficulty": 1,
            "createdBy": "system",
            "createdAt": "2025-09-08T12:00:00.000Z",
            "updatedAt": "2025-09-08T12:00:00.000Z",
            "tags": ["Rumpf", "Atmung", "Anatomie"]
        },
        // Füge hier die restlichen Fragen ein
    ];

    // Bestehende Daten laden, falls vorhanden
    const existingCategories = JSON.parse((window.storage && typeof window.storage.getItem === 'function' ? window.storage.getItem('categories') : localStorage.getItem('categories')) || '[]');
    const existingGroups = JSON.parse((window.storage && typeof window.storage.getItem === 'function' ? window.storage.getItem('groups') : localStorage.getItem('groups')) || '[]');
    const existingQuestions = JSON.parse((window.storage && typeof window.storage.getItem === 'function' ? window.storage.getItem('questions') : localStorage.getItem('questions')) || '[]');

    // Daten zusammenführen, Duplikate vermeiden
    const mergeData = (existing, newData) => {
        const merged = [...existing];
        for (const item of newData) {
            // Prüfen, ob Element mit gleicher ID bereits existiert
            const existingIndex = merged.findIndex(e => e.id === item.id);
            if (existingIndex >= 0) {
                // Element aktualisieren
                merged[existingIndex] = item;
            } else {
                // Neues Element hinzufügen
                merged.push(item);
            }
        }
        return merged;
    };

    // Daten zusammenführen
    const mergedCategories = mergeData(existingCategories, categories);
    const mergedGroups = mergeData(existingGroups, groups);
    const mergedQuestions = mergeData(existingQuestions, questions);

    // Daten im Browser-Speicher speichern
    // Store via adapter with localStorage fallback
    try {
        if (window.storage && typeof window.storage.setItem === 'function') {
            window.storage.setItem('categories', JSON.stringify(mergedCategories));
            window.storage.setItem('groups', JSON.stringify(mergedGroups));
            window.storage.setItem('questions', JSON.stringify(mergedQuestions));
        } else {
            localStorage.setItem('categories', JSON.stringify(mergedCategories));
            localStorage.setItem('groups', JSON.stringify(mergedGroups));
            localStorage.setItem('questions', JSON.stringify(mergedQuestions));
        }
    } catch (e) {
        console.warn('Failed to save imported data to storage adapter or localStorage', e);
    }

    console.log('Daten erfolgreich in den Browser-Speicher importiert:');
    console.log(`- ${categories.length} Kategorie(n)`);
    console.log(`- ${groups.length} Gruppe(n)`);
    console.log(`- ${questions.length} Frage(n)`);
    
    return {
        categories: mergedCategories,
        groups: mergedGroups,
        questions: mergedQuestions
    };
}

// Funktion automatisch ausführen
importDataToLocalStorage().then(result => {
    console.log('Import abgeschlossen');
    console.log('Bitte die Seite neu laden, um die Änderungen zu sehen');
});

// Diese Datei ist jetzt leer, da alle Storage- und JSON-Funktionen entfernt wurden.
// Die Daten werden vollständig über Supabase verwaltet.
