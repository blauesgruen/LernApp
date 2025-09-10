// category-management.js - Verwaltung von Kategorien und Gruppen

console.log('DEBUG: category-management.js direkt gestartet');
// Supabase-Userverwaltung: Die lokale User-Logik wurde entfernt
// Die Authentifizierung und Userdaten werden jetzt über Supabase gehandhabt

// Elemente für Kategorie-Formular
const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryTree = document.getElementById('category-tree');
const selectedCategoryId = document.getElementById('selected-category-id');

// Elemente für Gruppen-Formular
const groupForm = document.getElementById('group-form');
const groupCategorySelect = document.getElementById('group-category');
const groupNameInput = document.getElementById('group-name');
const filterCategoryInput = document.getElementById('filter-category');

// Hilfsfunktion: aktuellen User holen
async function getCurrentUserId() {
    const { data, error } = await window.supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
}

// Initialisierung
initializePage();

// Event Listener für das Kategorie-Formular
if (categoryForm) {
    categoryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = categoryNameInput.value.trim();
        if (!name) {
            showError('Bitte gib einen Namen für die Kategorie ein.');
            return;
        }
        const ownerId = await getCurrentUserId();
        if (!ownerId) {
            showError('Du bist nicht eingeloggt.');
            return;
        }
        try {
            const newCategory = await window.quizDB.createCategory(name, ownerId);
            if (newCategory) {
                showSuccess(`Kategorie "${name}" wurde erfolgreich erstellt.`);
                categoryNameInput.value = '';
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
        const userId = await getCurrentUserId();
        if (!userId) {
            showError('Du bist nicht eingeloggt.');
            return;
        }
        try {
            const newGroup = await window.quizDB.createGroup(name, categoryId, userId);
            if (newGroup) {
                showSuccess(`Gruppe "${name}" wurde erfolgreich erstellt.`);
                groupNameInput.value = '';
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

/**
 * Initialisiert die Seite
 */
async function initializePage() {
    console.log('DEBUG: initializePage wird gestartet');
    try {
        await Promise.all([
            loadCategoryTree(),
            updateCategorySelects()
        ]);
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
    console.log('DEBUG: loadCategoryTree wird gestartet');
    try {
        categoryTree.innerHTML = '<p class="loading-info">Kategorien werden geladen...</p>';
        const [categories, groups] = await Promise.all([
            window.quizDB.loadCategories(),
            window.quizDB.loadGroups()
        ]);
        const userCategories = categories.filter(category => category.createdBy !== 'system');
        console.log('DEBUG: userCategories:', userCategories);
        if (userCategories.length === 0) {
            categoryTree.innerHTML = '<p class="info-text">Keine Kategorien vorhanden. Erstelle deine erste Kategorie!</p>';
            return;
        }
        userCategories.sort((a, b) => a.name.localeCompare(b.name));
        let html = '';
        userCategories.forEach(category => {
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
        console.log('Rendered HTML:', html, userCategories);
        document.querySelectorAll('.tree-item-category').forEach(item => {
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
            item.addEventListener('click', function() {
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                const clickedCategoryId = this.getAttribute('data-id');
                document.querySelectorAll('.tree-item-category').forEach(category => {
                    const catId = category.getAttribute('data-id');
                    if (catId !== clickedCategoryId) {
                        const groupContainer = document.querySelector(`.tree-group-container[data-category-id="${catId}"]`);
                        const toggleIcon = category.querySelector('.tree-item-toggle i');
                        if (groupContainer.style.display !== 'none') {
                            groupContainer.style.display = 'none';
                            if (toggleIcon.classList.contains('fa-chevron-down')) {
                                toggleIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
                            }
                        }
                    } else {
                        const groupContainer = document.querySelector(`.tree-group-container[data-category-id="${catId}"]`);
                        const toggleIcon = category.querySelector('.tree-item-toggle i');
                        if (groupContainer.style.display === 'none') {
                            groupContainer.style.display = 'block';
                            if (toggleIcon.classList.contains('fa-chevron-right')) {
                                toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-down');
                            }
                        }
                    }
                });
                const categoryId = this.getAttribute('data-id');
                selectedCategoryId.value = categoryId;
                groupCategorySelect.value = categoryId;
                groupNameInput.focus();
            });
        });
        document.querySelectorAll('.tree-item-group').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
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
        const userCategories = categories.filter(category => category.createdBy !== 'system');
        groupCategorySelect.innerHTML = '<option value="">-- Kategorie wählen --</option>';
        userCategories.forEach(category => {
            const groupOption = document.createElement('option');
            groupOption.value = category.id;
            groupOption.textContent = category.name;
            groupCategorySelect.appendChild(groupOption);
        });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Kategorie-Auswahlfeldern:', error);
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
        const categoryMap = {};
        categories.forEach(category => {
            categoryMap[category.id] = category;
        });
        const filterCategoryId = filterCategoryInput.value;
        let filteredGroups = groups;
        if (filterCategoryId) {
            filteredGroups = groups.filter(group => group.categoryId === filterCategoryId);
            document.querySelectorAll('.category-item').forEach(item => {
                const itemCategoryId = item.getAttribute('data-category-id');
                if (itemCategoryId === filterCategoryId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
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
