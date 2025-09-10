// category-management.js - Verwaltung von Kategorien und Gruppen

console.log('DEBUG: category-management.js direkt gestartet');
// Supabase-Userverwaltung: Die lokale User-Logik wurde entfernt
// Die Authentifizierung und Userdaten werden jetzt über Supabase gehandhabt

// Elemente für Kategorie-Formular
const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryTree = document.getElementById('category-tree');
const selectedCategoryId = document.getElementById('selected-category-id');

// Container für Gruppenliste (kann optional sein)
const groupsList = document.getElementById('groups-list') || null;

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
        // Use safe DOM methods instead of building HTML strings
        categoryTree.innerHTML = '';
        const [categories, groups] = await Promise.all([
            window.quizDB.loadCategories(),
            window.quizDB.loadGroups()
        ]);
        const userCategories = categories.filter(category => category.createdBy !== 'system');
        console.log('DEBUG: userCategories:', userCategories);
        if (userCategories.length === 0) {
            const p = document.createElement('p');
            p.className = 'info-text';
            p.textContent = 'Keine Kategorien vorhanden. Erstelle deine erste Kategorie!';
            categoryTree.appendChild(p);
            return;
        }
        userCategories.sort((a, b) => a.name.localeCompare(b.name));

        // Build DOM nodes
        userCategories.forEach(category => {
            const categoryGroups = groups.filter(group => group.categoryId === category.id).sort((a,b)=>a.name.localeCompare(b.name));

            // Category item
            const catItem = document.createElement('div');
            catItem.className = 'tree-item tree-item-category';
            catItem.dataset.id = category.id;

            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'tree-item-toggle';
            toggleBtn.setAttribute('aria-expanded','false');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'tree-item-icon';
            iconSpan.innerHTML = '<i class="fas fa-folder" aria-hidden="true"></i>';

            const textSpan = document.createElement('span');
            textSpan.className = 'tree-item-text';
            textSpan.textContent = category.name;

            catItem.appendChild(toggleBtn);
            catItem.appendChild(iconSpan);
            catItem.appendChild(textSpan);

            // Group container
            const groupContainer = document.createElement('div');
            groupContainer.className = 'tree-group-container';
            groupContainer.dataset.categoryId = category.id;

            if (categoryGroups.length > 0) {
                categoryGroups.forEach(group => {
                    const g = document.createElement('div');
                    g.className = 'tree-item tree-item-group';
                    g.dataset.categoryId = category.id;
                    g.dataset.id = group.id;
                    const gIcon = document.createElement('span');
                    gIcon.className = 'tree-item-icon';
                    gIcon.innerHTML = '<i class="fas fa-tag" aria-hidden="true"></i>';
                    const gText = document.createElement('span');
                    gText.className = 'tree-item-text';
                    gText.textContent = group.name;
                    g.appendChild(gIcon);
                    g.appendChild(gText);
                    groupContainer.appendChild(g);
                });
            } else {
                const empty = document.createElement('div');
                empty.className = 'tree-item-empty';
                const emptyIcon = document.createElement('span');
                emptyIcon.className = 'tree-item-icon';
                emptyIcon.innerHTML = '<i class="fas fa-info-circle" aria-hidden="true"></i>';
                const emptyText = document.createElement('span');
                emptyText.textContent = 'Keine Gruppen in dieser Kategorie';
                empty.appendChild(emptyIcon);
                empty.appendChild(emptyText);
                groupContainer.appendChild(empty);
            }

            categoryTree.appendChild(catItem);
            categoryTree.appendChild(groupContainer);
        });

        // Event delegation for better performance and simpler logic
        categoryTree.removeEventListener('click', categoryTree._delegatedClickHandler);
        const delegatedClickHandler = function(e) {
            const toggle = e.target.closest('.tree-item-toggle');
            if (toggle && categoryTree.contains(toggle)) {
                e.stopPropagation();
                const cat = toggle.closest('.tree-item-category');
                if (!cat) return;
                const catId = cat.dataset.id;
                const groupContainer = categoryTree.querySelector(`.tree-group-container[data-category-id="${catId}"]`);
                if (!groupContainer) return;
                const expanded = groupContainer.classList.toggle('expanded');
                toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-chevron-right', !expanded);
                    icon.classList.toggle('fa-chevron-down', expanded);
                }
                return;
            }

            const catClick = e.target.closest('.tree-item-category');
            if (catClick && categoryTree.contains(catClick)) {
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                catClick.classList.add('active');
                const clickedCategoryId = catClick.dataset.id;
                // collapse other group containers
                categoryTree.querySelectorAll('.tree-group-container.expanded').forEach(gc => {
                    if (gc.dataset.categoryId !== clickedCategoryId) gc.classList.remove('expanded');
                });
                // expand this one
                const groupContainer = categoryTree.querySelector(`.tree-group-container[data-category-id="${clickedCategoryId}"]`);
                if (groupContainer && !groupContainer.classList.contains('expanded')) {
                    groupContainer.classList.add('expanded');
                    const toggleBtn = catClick.querySelector('.tree-item-toggle');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded','true');
                    const icon = catClick.querySelector('.tree-item-toggle i');
                    if (icon) { icon.classList.remove('fa-chevron-right'); icon.classList.add('fa-chevron-down'); }
                }
                selectedCategoryId.value = clickedCategoryId;
                groupCategorySelect.value = clickedCategoryId;
                try { groupNameInput.focus(); } catch (e) {}
                return;
            }

            const groupClick = e.target.closest('.tree-item-group');
            if (groupClick && categoryTree.contains(groupClick)) {
                e.stopPropagation();
                document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
                groupClick.classList.add('active');
                const categoryId = groupClick.dataset.categoryId;
                selectedCategoryId.value = categoryId;
                groupCategorySelect.value = categoryId;
                return;
            }
        };
        categoryTree.addEventListener('click', delegatedClickHandler);
        // keep a reference so we can remove later if needed
        categoryTree._delegatedClickHandler = delegatedClickHandler;
    } catch (error) {
        console.error('Fehler beim Laden des Kategoriebaums:', error);
        categoryTree.innerHTML = '<p class="error-text">Fehler beim Laden der Kategorien.</p>';
    }
}

/* ----------------- Scrollable hint logic ----------------- */
/** Returns true if the element has overflowed vertical content */
function isVerticallyScrollable(el) {
    if (!el) return false;
    return el.scrollHeight > el.clientHeight + 1; // small tolerance
}

/** Apply or remove .scrollable class on the category-tree container */
function markCategoryTreeScrollable() {
    try {
        const container = document.querySelector('.profile-col.profile-info .category-tree-container');
        if (!container) return;
        // Ensure the element is positioned relative for the pseudo hint to work
        container.style.position = container.style.position || 'relative';
        if (isVerticallyScrollable(container) || isVerticallyScrollable(container.querySelector('.category-tree'))) {
            container.classList.add('scrollable');
        } else {
            container.classList.remove('scrollable');
        }
    } catch (e) {
        console.error('Error checking category tree scrollable state', e);
    }
}

// Debounced resize listener
let _resizeTimer = null;
window.addEventListener('resize', () => {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
        markCategoryTreeScrollable();
    }, 150);
});

// Run after initial render
document.addEventListener('DOMContentLoaded', () => {
    // small timeout to let layout settle if scripts appended dynamically
    setTimeout(markCategoryTreeScrollable, 100);
});

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

/**
 * Setzt die Breite und Zentrierung für alle Formularelemente nachträglich per JS
 */
function setFormElementWidths() {
    const elements = [
        ...document.querySelectorAll('.profile-col .form-group input'),
        ...document.querySelectorAll('.profile-col .form-group select'),
        ...document.querySelectorAll('.profile-col .form-actions button'),
        ...document.querySelectorAll('.category-card .form-group input'),
        ...document.querySelectorAll('.category-card .form-group select'),
        ...document.querySelectorAll('.category-card .form-actions button')
    ];
    elements.forEach(el => {
    // Use full width and let CSS handle spacing; avoid forcing 90% which conflicts with stylesheet
    el.style.width = '100%';
    el.style.marginLeft = '0';
    el.style.marginRight = '0';
    el.style.display = 'block';
    el.style.boxSizing = 'border-box';
    });
}

document.addEventListener('DOMContentLoaded', setFormElementWidths);
