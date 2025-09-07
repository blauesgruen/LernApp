// Neue Funktionen für question-creator.js

/**
 * Lädt die Fragen für eine bestimmte Gruppe und zeigt sie an
 */
async function loadQuestionsForGroup(groupId) {
    try {
        if (!groupId) {
            groupQuestionsList.innerHTML = '<p class="info-text">Wähle eine Gruppe aus, um deren Fragen zu sehen</p>';
            return;
        }
        
        groupQuestionsList.innerHTML = '<p class="loading-info">Fragen werden geladen...</p>';
        
        // Alle Fragen laden
        const questions = await window.quizDB.loadQuestions();
        
        // Fragen für die ausgewählte Gruppe filtern
        const groupQuestions = questions.filter(q => q.groupId === groupId);
        
        if (groupQuestions.length === 0) {
            groupQuestionsList.innerHTML = '<p class="info-text">Keine Fragen in dieser Gruppe vorhanden</p>';
            return;
        }
        
        // Liste der Fragen erzeugen
        let html = '';
        
        groupQuestions.forEach(question => {
            const hasImage = question.imageUrl && question.imageUrl.trim() !== '';
            const questionText = question.text && question.text.trim() !== '' 
                ? question.text 
                : 'Bildfrage ohne Text';
            
            html += `
                <div class="question-list-item" data-id="${question.id}">
                    <p class="question-text">${questionText}</p>
                    <div class="question-meta">
                        <span>${hasImage ? '<span class="question-has-image"><i class="fas fa-image"></i> Bild: ja</span>' : ''}</span>
                        <span>Schwierigkeit: ${question.difficulty}/5</span>
                    </div>
                </div>
            `;
        });
        
        groupQuestionsList.innerHTML = html;
    } catch (error) {
        console.error('Fehler beim Laden der Gruppenfragen:', error);
        groupQuestionsList.innerHTML = '<p class="error-text">Fehler beim Laden der Fragen.</p>';
    }
}
