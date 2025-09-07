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
    const categoryTree = document.getElementById('category-tree');
    const selectedCategoryId = document.getElementById('selected-category-id');

    // Elemente für Gruppen-Formular
    const groupForm = document.getElementById('group-form');
    const groupCategorySelect = document.getElementById('group-category');
    const groupNameInput = document.getElementById('group-name');
    // Hier sollte kein filterCategorySelect sein, da wir ein hidden input verwenden
    const filterCategoryInput = document.getElementById('filter-category');

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
                    await loadCategoryTree();
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
                    
                    // Baumstruktur neu laden
                    await loadCategoryTree();
                } else {
                    showError('Fehler beim Erstellen der Gruppe.');
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Gruppe:', error);
                showError(`Fehler: ${error.message}`);
            }
        });
    }

    // Da wir keine separate Gruppenliste mehr haben, entfällt dieser Event-Listener

    /**
     * Initialisiert die Seite
     */
    async function initializePage() {
        try {
            // Kategorien und Gruppen laden
            await Promise.all([
                loadCategoryTree(),
                updateCategorySelects()
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
     * Lädt alle Kategorien und zeigt sie im Baumformat an
     */
    async function loadCategoryTree() {
        try {
            categoryTree.innerHTML = '<p class="loading-info">Kategorien werden geladen...</p>';
            
            const [categories, groups] = await Promise.all([
                window.quizDB.loadCategories(),
                window.quizDB.loadGroups()
            ]);
            
            // Systemkategorien herausfiltern (Textfragen & Bilderquiz)
            const userCategories = categories.filter(category => category.createdBy !== 'system');
            
            if (userCategories.length === 0) {
                categoryTree.innerHTML = '<p class="info-text">Keine Kategorien vorhanden. Erstelle deine erste Kategorie!</p>';
                return;
            }
            
            // Kategorien nach Namen sortieren
            userCategories.sort((a, b) => a.name.localeCompare(b.name));
            
            let html = '';
            
            userCategories.forEach(category => {
                // Gruppieren der Gruppen nach Kategorie
                const categoryGroups = groups.filter(group => group.categoryId === category.id);
                categoryGroups.sort((a, b) => a.name.localeCompare(b.name));
                
                html += `
                    <div class="tree-item tree-item-category" data-id="${category.id}">
                        <span class="tree-item-toggle"><i class="fas fa-chevron-right"></i></span>
                        <span class="tree-item-icon"><i class="fas fa-folder"></i></span>
                        ${category.name}
                    </div>
                    <div class="tree-group-container" style="display: none;" data-category-id="${category.id}">
                `;
                
                if (categoryGroups.length > 0) {
                    categoryGroups.forEach(group => {
                        html += `
                            <div class="tree-item tree-item-group" data-category-id="${category.id}" data-id="${group.id}">
                                <span class="tree-item-icon"><i class="fas fa-tag"></i></span>
                                ${group.name}
                            </div>
                        `;
                    });
                } else {
                    html += `
                        <div class="tree-item-empty">
                            <span class="tree-item-icon"><i class="fas fa-info-circle"></i></span>
                            Keine Gruppen in dieser Kategorie
                        </div>
                    `;
                }
                
                html += `</div>`;
            });
            
            categoryTree.innerHTML = html;
            
            // Event-Listener für die Kategorien hinzufügen
            document.querySelectorAll('.tree-item-category').forEach(item => {
                // Toggle-Funktion für Kategorien
                item.querySelector('.tree-item-toggle').addEventListener('click', function(e) {
                    e.stopPropagation();
                    const categoryId = item.getAttribute('data-id');
                    const groupContainer = document.querySelector(`.tree-group-container[data-category-id="${categoryId}"]`);
                    
                    if (groupContainer.style.display === 'none') {
                        groupContainer.style.display = 'block';
                        this.querySelector('i').classList.replace('fa-chevron-right', 'fa-chevron-down');
                    } else {
                        groupContainer.style.display = 'none';
                        this.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-right');
                    }
                });
                
                // Klick auf Kategorie
                item.addEventListener('click', function() {
                    // Alle aktiven Elemente zurücksetzen
                    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Alle anderen Kategorien einklappen
                    const clickedCategoryId = this.getAttribute('data-id');
                    document.querySelectorAll('.tree-item-category').forEach(category => {
                        const catId = category.getAttribute('data-id');
                        if (catId !== clickedCategoryId) {
                            // Andere Kategorie als die angeklickte
                            const groupContainer = document.querySelector(`.tree-group-container[data-category-id="${catId}"]`);
                            const toggleIcon = category.querySelector('.tree-item-toggle i');
                            
                            // Nur einklappen, wenn sie aktuell ausgeklappt ist
                            if (groupContainer.style.display !== 'none') {
                                groupContainer.style.display = 'none';
                                if (toggleIcon.classList.contains('fa-chevron-down')) {
                                    toggleIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
                                }
                            }
                        } else {
                            // Die angeklickte Kategorie ausklappen
                            const groupContainer = document.querySelector(`.tree-group-container[data-category-id="${catId}"]`);
                            const toggleIcon = category.querySelector('.tree-item-toggle i');
                            
                            // Ausklappen, falls eingeklappt
                            if (groupContainer.style.display === 'none') {
                                groupContainer.style.display = 'block';
                                if (toggleIcon.classList.contains('fa-chevron-right')) {
                                    toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-down');
                                }
                            }
                        }
                    });
                    
                    // Ausgewählte Kategorie speichern
                    const categoryId = this.getAttribute('data-id');
                    selectedCategoryId.value = categoryId;
                    
                    // Im Gruppenformular die Kategorie auswählen und Fokus auf den Gruppennamen setzen
                    groupCategorySelect.value = categoryId;
                    groupNameInput.focus();
                });
            });
            
            // Event-Listener für Gruppen
            document.querySelectorAll('.tree-item-group').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    // Alle aktiven Elemente zurücksetzen
                    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Ausgewählte Kategorie speichern
                    const categoryId = this.getAttribute('data-category-id');
                    selectedCategoryId.value = categoryId;
                    groupCategorySelect.value = categoryId;
                });
            });
        } catch (error) {
            console.error('Fehler beim Laden des Kategoriebaums:', error);
            categoryTree.innerHTML = '<p class="error-text">Fehler beim Laden der Kategorien.</p>';
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
            
            // Kategorien hinzufügen
            userCategories.forEach(category => {
                // Option für Gruppen-Formular
                const groupOption = document.createElement('option');
                groupOption.value = category.id;
                groupOption.textContent = category.name;
                groupCategorySelect.appendChild(groupOption);
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
                
                // Aktualisiere die Kategorie-Auswahl im UI
                document.querySelectorAll('.category-item').forEach(item => {
                    const itemCategoryId = item.getAttribute('data-category-id');
                    if (itemCategoryId === filterCategoryId) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
                
                // Setze die ausgewählte Kategorie auch im Gruppen-Formular
                groupCategorySelect.value = filterCategoryId;
            }
            
            if (filteredGroups.length === 0) {
                const categoryName = filterCategoryId ? categoryMap[filterCategoryId].name : '';
                const message = filterCategoryId ? 
                    `<p class="info-text">Keine Gruppen in der Kategorie "${categoryName}" vorhanden. Erstelle eine neue Gruppe!</p>` : 
                    '<p class="info-text">Keine Gruppen vorhanden. Erstelle deine erste Gruppe!</p>';
                groupsList.innerHTML = message;
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
