// category-management.js - Verwaltung von Kategorien und Gruppen

document.addEventListener('DOMContentLoaded', function() {
    // Prüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const username = localStorage.getItem('username');
    
    if (!isLoggedIn || !username) {
        // Nicht eingeloggt - zurück zur Login-Seite
        window.location.href = 'login.html';
        return;
    }

    // Elemente für Kategorie-Formular
    const categoryForm = document.getElementById('category-form');
    const categoryNameInput = document.getElementById('category-name');
    const categoriesList = document.getElementById('categories-list');

    // Elemente für Gruppen-Formular
    const groupForm = document.getElementById('group-form');
    const groupCategorySelect = document.getElementById('group-category');
    const groupNameInput = document.getElementById('group-name');
    const filterCategorySelect = document.getElementById('filter-category');
    const groupsList = document.getElementById('groups-list');

    // Initialisierung
    initializePage();

    // Event Listener für das Kategorie-Formular
    if (categoryForm) {
        categoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Daten aus dem Formular sammeln
            const name = categoryNameInput.value.trim();
            // Standardmäßig beide Quiz-Typen unterstützen
            const mainCategory = "any";
            
            if (!name) {
                showError('Bitte gib einen Namen für die Kategorie ein.');
                return;
            }
            
            try {
                // Kategorie erstellen
                const newCategory = await window.quizDB.createCategory(
                    name,
                    mainCategory,
                    username
                );
                
                if (newCategory) {
                    showSuccess(`Kategorie "${name}" wurde erfolgreich erstellt.`);
                    
                    // Formular zurücksetzen
                    categoryNameInput.value = '';
                    
                    // Listen aktualisieren
                    await loadCategories();
                    await updateCategorySelects();
                } else {
                    showError('Fehler beim Erstellen der Kategorie.');
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Kategorie:', error);
                showError(`Fehler: ${error.message}`);
            }
        });
    }

    // Event Listener für das Gruppen-Formular
    if (groupForm) {
        groupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Daten aus dem Formular sammeln
            const categoryId = groupCategorySelect.value;
            const name = groupNameInput.value.trim();
            
            if (!categoryId) {
                showError('Bitte wähle eine Kategorie aus.');
                return;
            }
            
            if (!name) {
                showError('Bitte gib einen Namen für die Gruppe ein.');
                return;
            }
            
            try {
                // Gruppe erstellen
                const newGroup = await window.quizDB.createGroup(
                    name,
                    categoryId,
                    username
                );
                
                if (newGroup) {
                    showSuccess(`Gruppe "${name}" wurde erfolgreich erstellt.`);
                    
                    // Formular zurücksetzen
                    groupNameInput.value = '';
                    
                    // Liste aktualisieren
                    await loadGroups();
                } else {
                    showError('Fehler beim Erstellen der Gruppe.');
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Gruppe:', error);
                showError(`Fehler: ${error.message}`);
            }
        });
    }

    // Event Listener für den Kategoriefilter
    if (filterCategorySelect) {
        filterCategorySelect.addEventListener('change', async function() {
            await loadGroups();
        });
    }

    /**
     * Initialisiert die Seite
     */
    async function initializePage() {
        try {
            // Kategorien und Gruppen laden
            await Promise.all([
                loadCategories(),
                updateCategorySelects(),
                loadGroups()
            ]);
            
            // Breadcrumbs initialisieren, falls verfügbar
            if (window.breadcrumbs) {
                window.breadcrumbs.set([
                    { label: 'Verwaltung', url: 'admin.html' },
                    { label: 'Kategorien & Gruppen', url: 'category-management.html' }
                ]);
            }
        } catch (error) {
            console.error('Fehler beim Initialisieren der Seite:', error);
            showError('Fehler beim Laden der Daten. Bitte aktualisiere die Seite.');
        }
    }

    /**
     * Lädt alle Kategorien und zeigt sie an
     */
    async function loadCategories() {
        try {
            categoriesList.innerHTML = '<p class="loading-info">Kategorien werden geladen...</p>';
            
            const categories = await window.quizDB.loadCategories();
            
            // Systemkategorien herausfiltern (Textfragen & Bilderquiz)
            const userCategories = categories.filter(category => category.createdBy !== 'system');
            
            if (userCategories.length === 0) {
                categoriesList.innerHTML = '<p class="info-text">Keine Kategorien vorhanden. Erstelle deine erste Kategorie!</p>';
                return;
            }
            
            // Kategorien anzeigen
            let html = '';
            
            userCategories.forEach(category => {
                html += `
                    <div class="item">
                        <div class="item-header">
                            <h3>${category.name}</h3>
                        </div>
                        <div class="item-footer">
                            <span class="item-info">Erstellt von: ${category.createdBy}</span>
                            <span class="item-info">Erstellt am: ${new Date(category.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                `;
            });
            
            categoriesList.innerHTML = html;
        } catch (error) {
            console.error('Fehler beim Laden der Kategorien:', error);
            categoriesList.innerHTML = '<p class="error-text">Fehler beim Laden der Kategorien.</p>';
        }
    }

    /**
     * Aktualisiert die Kategorie-Auswahlfelder
     */
    async function updateCategorySelects() {
        try {
            const categories = await window.quizDB.loadCategories();
            
            // Systemkategorien herausfiltern (Textfragen & Bilderquiz)
            const userCategories = categories.filter(category => category.createdBy !== 'system');
            
            // Auswahlfelder leeren
            groupCategorySelect.innerHTML = '<option value="">-- Kategorie wählen --</option>';
            filterCategorySelect.innerHTML = '<option value="">Alle Kategorien</option>';
            
            // Kategorien hinzufügen
            userCategories.forEach(category => {
                // Option für Gruppen-Formular
                const groupOption = document.createElement('option');
                groupOption.value = category.id;
                groupOption.textContent = category.name;
                groupCategorySelect.appendChild(groupOption);
                
                // Option für Filter
                const filterOption = document.createElement('option');
                filterOption.value = category.id;
                filterOption.textContent = category.name;
                filterCategorySelect.appendChild(filterOption);
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Kategorie-Auswahlfelder:', error);
            showError('Fehler beim Laden der Kategorien.');
        }
    }

    /**
     * Lädt alle Gruppen und zeigt sie an
     */
    async function loadGroups() {
        try {
            groupsList.innerHTML = '<p class="loading-info">Gruppen werden geladen...</p>';
            
            const [groups, categories] = await Promise.all([
                window.quizDB.loadGroups(),
                window.quizDB.loadCategories()
            ]);
            
            // Kategorie-Map erstellen für schnellen Zugriff
            const categoryMap = {};
            categories.forEach(category => {
                categoryMap[category.id] = category;
            });
            
            // Nach Kategorie filtern, wenn ausgewählt
            const filterCategoryId = filterCategorySelect.value;
            let filteredGroups = groups;
            
            if (filterCategoryId) {
                filteredGroups = groups.filter(group => group.categoryId === filterCategoryId);
            }
            
            if (filteredGroups.length === 0) {
                groupsList.innerHTML = '<p class="info-text">Keine Gruppen vorhanden. Erstelle deine erste Gruppe!</p>';
                return;
            }
            
            // Gruppen anzeigen
            let html = '';
            
            filteredGroups.forEach(group => {
                const category = categoryMap[group.categoryId] || { name: 'Unbekannte Kategorie' };
                
                html += `
                    <div class="item">
                        <div class="item-header">
                            <h3>${group.name}</h3>
                            <span class="item-badge">${category.name}</span>
                        </div>
                        <div class="item-footer">
                            <span class="item-info">Erstellt von: ${group.createdBy}</span>
                            <span class="item-info">Erstellt am: ${new Date(group.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                `;
            });
            
            groupsList.innerHTML = html;
        } catch (error) {
            console.error('Fehler beim Laden der Gruppen:', error);
            groupsList.innerHTML = '<p class="error-text">Fehler beim Laden der Gruppen.</p>';
        }
    }
});
