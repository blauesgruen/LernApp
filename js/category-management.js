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
// Verwendet bevorzugt die zentrale Funktion aus app-core (`window.getCurrentUser`),
// fällt sonst auf den initialisierten Supabase-Client (`window.supabaseClient`) zurück.
async function getCurrentUserId() {
    try {
        if (typeof window.getCurrentUser === 'function') {
            const user = await window.getCurrentUser();
            return user?.id || null;
        }
        // Fallback: verwende den globalen Supabase-Client, falls verfügbar
        if (window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.getUser === 'function') {
            const { data, error } = await window.supabaseClient.auth.getUser();
            if (error || !data?.user) return null;
            return data.user.id;
        }
    } catch (err) {
        console.error('getCurrentUserId Fehler:', err);
    }
    return null;
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
            // Edit icon for category (append last so it appears on the right)
            const editBtnCat = document.createElement('button');
            editBtnCat.type = 'button';
            editBtnCat.className = 'tree-item-edit';
            editBtnCat.title = 'Kategorie bearbeiten';
            editBtnCat.setAttribute('aria-label', 'Kategorie bearbeiten');
            editBtnCat.tabIndex = 0;
            editBtnCat.innerHTML = '<i class="fas fa-edit" aria-hidden="true"></i>';
            editBtnCat.setAttribute('data-type','category');
            editBtnCat.setAttribute('data-id', category.id);
            catItem.appendChild(editBtnCat);

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

                    // Edit icon for group
                    const editBtnGroup = document.createElement('button');
                    editBtnGroup.type = 'button';
                    editBtnGroup.className = 'tree-item-edit';
                    editBtnGroup.title = 'Gruppe bearbeiten';
                    editBtnGroup.innerHTML = '<i class="fas fa-edit" aria-hidden="true"></i>';
                    editBtnGroup.setAttribute('data-type','group');
                    editBtnGroup.setAttribute('data-id', group.id);
                    editBtnGroup.setAttribute('data-category-id', category.id);

                    g.appendChild(gIcon);
                    g.appendChild(gText);
                    // Edit icon for group (append last so it appears on the right)
                    editBtnGroup.setAttribute('aria-label', 'Gruppe bearbeiten');
                    editBtnGroup.tabIndex = 0;
                    g.appendChild(editBtnGroup);
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
            // open edit modal when clicking edit buttons
            const editClick = e.target.closest('.tree-item-edit');
            if (editClick && categoryTree.contains(editClick)) {
                e.stopPropagation();
                const type = editClick.getAttribute('data-type');
                const id = editClick.getAttribute('data-id');
                const categoryId = editClick.getAttribute('data-category-id') || null;
                openEditModal(type, id, categoryId);
                return;
            }

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
        // keyboard support: Enter/Space on edit buttons
        categoryTree.addEventListener('keydown', function(e) {
            const el = e.target.closest && e.target.closest('.tree-item-edit');
            if (!el) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
        // keep a reference so we can remove later if needed
        categoryTree._delegatedClickHandler = delegatedClickHandler;
    } catch (error) {
        console.error('Fehler beim Laden des Kategoriebaums:', error);
        categoryTree.innerHTML = '<p class="error-text">Fehler beim Laden der Kategorien.</p>';
    }
}

/* ---------------- Edit modal logic ---------------- */
function openEditModal(type, id, categoryId=null) {
    const modal = document.getElementById('edit-item-modal');
    const title = document.getElementById('edit-item-title');
    const inputName = document.getElementById('edit-item-name');
    const inputType = document.getElementById('edit-item-type');
    const inputId = document.getElementById('edit-item-id');
    const categoryRow = document.getElementById('edit-item-category-row');
    const categorySelect = document.getElementById('edit-item-category');

    inputType.value = type;
    inputId.value = id;

    // populate name and category
    if (type === 'category') {
        title.textContent = 'Kategorie bearbeiten';
        categoryRow.style.display = 'none';
        // find category from loaded categories
        window.quizDB.loadCategories().then(categories => {
            const cat = categories.find(c => c.id === id);
            inputName.value = cat ? cat.name : '';
        }).catch(() => inputName.value = '');
    } else if (type === 'group') {
        title.textContent = 'Gruppe bearbeiten';
        categoryRow.style.display = '';
        // fill category select
        window.quizDB.loadCategories().then(categories => {
            categorySelect.innerHTML = '<option value="">-- Kategorie wählen --</option>';
            categories.forEach(c => {
                const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; categorySelect.appendChild(opt);
            });
            // load group details
            window.quizDB.loadGroups().then(groups => {
                const g = groups.find(x => x.id === id);
                inputName.value = g ? g.name : '';
                if (g) categorySelect.value = g.categoryId || categoryId || '';
            }).catch(() => inputName.value = '');
        }).catch(() => { categorySelect.innerHTML = ''; });
    }

    // show modal
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden','false');
    // focus first control for keyboard users
    setTimeout(() => {
        try { document.getElementById('edit-item-name').focus(); } catch (e) {}
    }, 30);
}

function closeEditModal() {
    const modal = document.getElementById('edit-item-modal');
    // If focus is currently inside the modal, move it to a sensible fallback
    try {
        const active = document.activeElement;
        if (active && modal.contains(active)) {
            const fallback = document.getElementById('category-name') || document.getElementById('category-tree') || document.body;
            if (fallback && typeof fallback.focus === 'function') {
                // ensure fallback can be focused
                if (!fallback.hasAttribute('tabindex')) fallback.setAttribute('tabindex', '-1');
                fallback.focus();
            } else {
                try { active.blur(); } catch (e) {}
            }
        }
    } catch (e) {
        console.warn('Fehler beim Verschieben des Fokus aus dem Modal:', e);
    }
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
}

// close buttons
document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#edit-item-modal .modal-close')) {
        closeEditModal();
    }
});

// close modal on ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('edit-item-modal');
        if (modal && modal.getAttribute('aria-hidden') === 'false') closeEditModal();
    }
});

// handle save
document.getElementById('edit-item-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const type = document.getElementById('edit-item-type').value;
    const id = document.getElementById('edit-item-id').value;
    const name = document.getElementById('edit-item-name').value.trim();
    const categoryId = document.getElementById('edit-item-category').value;
    if (!name) { showError('Name darf nicht leer sein.'); return; }
    // Optimistic UI update with rollback
    try {
        if (type === 'category') {
            const catEl = categoryTree.querySelector(`.tree-item-category[data-id="${id}"]`);
            const prevName = catEl ? (catEl.querySelector('.tree-item-text').textContent) : null;
            if (catEl) catEl.querySelector('.tree-item-text').textContent = name;
            const updated = await window.quizDB.updateCategory(id, { name });
            if (updated) {
                showSuccess('Kategorie aktualisiert.');
            } else {
                if (catEl && prevName !== null) catEl.querySelector('.tree-item-text').textContent = prevName;
                showError('Kategorie konnte nicht aktualisiert werden.');
            }
        } else if (type === 'group') {
            const gEl = categoryTree.querySelector(`.tree-item-group[data-id="${id}"]`);
            const prevName = gEl ? gEl.querySelector('.tree-item-text').textContent : null;
            const prevCategoryId = gEl ? gEl.dataset.categoryId : null;
            // optimistic name update
            if (gEl) gEl.querySelector('.tree-item-text').textContent = name;
            // optimistic move if category changed
            let movedBack = false;
            if (gEl && categoryId && prevCategoryId !== categoryId) {
                const oldContainer = categoryTree.querySelector(`.tree-group-container[data-category-id="${prevCategoryId}"]`);
                const newContainer = categoryTree.querySelector(`.tree-group-container[data-category-id="${categoryId}"]`);
                if (oldContainer && newContainer) {
                    newContainer.appendChild(gEl);
                    gEl.dataset.categoryId = categoryId;
                }
            }
            const updated = await window.quizDB.updateGroup(id, { name, categoryId });
            if (updated) {
                showSuccess('Gruppe aktualisiert.');
                // refresh selects
                await updateCategorySelects();
            } else {
                // rollback
                if (gEl) {
                    if (prevName !== null) gEl.querySelector('.tree-item-text').textContent = prevName;
                    if (prevCategoryId && gEl.dataset.categoryId !== prevCategoryId) {
                        const origContainer = categoryTree.querySelector(`.tree-group-container[data-category-id="${prevCategoryId}"]`);
                        if (origContainer) { origContainer.appendChild(gEl); gEl.dataset.categoryId = prevCategoryId; }
                    }
                }
                showError('Gruppe konnte nicht aktualisiert werden.');
            }
        }
        closeEditModal();
        await loadCategoryTree();
        await updateCategorySelects();
    } catch (err) {
        console.error('Fehler beim Speichern:', err);
        showError('Fehler beim Speichern.');
    }
});

// handle delete
document.getElementById('edit-item-delete').addEventListener('click', async function() {
    const type = document.getElementById('edit-item-type').value;
    const id = document.getElementById('edit-item-id').value;
    try {
        const confirmed = await (window.helpers && typeof window.helpers.confirmDialog === 'function'
            ? window.helpers.confirmDialog('Löschen bestätigen', 'Wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.', 'Löschen', 'Abbrechen')
            : Promise.resolve(confirm('Wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')));
        if (!confirmed) return;

        // optimistic delete: remove from DOM first and restore on failure
        let removedNode = null;
        if (type === 'category') {
            const catEl = categoryTree.querySelector(`.tree-item-category[data-id="${id}"]`);
            if (catEl) { removedNode = catEl; const next = catEl.nextElementSibling; catEl.parentNode.removeChild(catEl); if (next && next.classList.contains('tree-group-container')) { next.parentNode.removeChild(next); removedNode._sibling = next; } }
            const ok = await window.quizDB.deleteCategory(id);
            if (ok) showSuccess('Kategorie gelöscht.'); else { showError('Löschen fehlgeschlagen.'); if (removedNode) { const ref = categoryTree.querySelector('.tree-item') || null; categoryTree.insertBefore(removedNode, ref); if (removedNode._sibling) categoryTree.insertBefore(removedNode._sibling, removedNode.nextSibling); } }
        } else if (type === 'group') {
            const gEl = categoryTree.querySelector(`.tree-item-group[data-id="${id}"]`);
            let parent = null, next = null;
            if (gEl) { parent = gEl.parentNode; next = gEl.nextElementSibling; removedNode = gEl; parent.removeChild(gEl); }
            const ok = await window.quizDB.deleteGroup(id);
            if (ok) showSuccess('Gruppe gelöscht.'); else { showError('Löschen fehlgeschlagen.'); if (removedNode && parent) { parent.insertBefore(removedNode, next); } }
        }
        closeEditModal();
        await loadCategoryTree();
        await updateCategorySelects();
    } catch (err) {
        console.error('Fehler beim Löschen:', err);
        showError('Fehler beim Löschen.');
    }
});

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
