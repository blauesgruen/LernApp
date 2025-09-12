// category-management.js – Verwaltung von Kategorien und Gruppen
// Authentifizierung und Userdaten werden zentral über Supabase gehandhabt
window.logConsole('DEBUG: category-management.js direkt gestartet', 'debug');

// Elemente für das Kategorie-Formular
const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryTree = document.getElementById('category-tree');
const selectedCategoryId = document.getElementById('selected-category-id');

// Container für die Gruppenliste (optional)
const groupsList = document.getElementById('groups-list') || null;

// Elemente für das Gruppen-Formular
const groupForm = document.getElementById('group-form');
const groupCategorySelect = document.getElementById('group-category');
const groupNameInput = document.getElementById('group-name');
const filterCategoryInput = document.getElementById('filter-category');

// Hilfsfunktion: Holt die aktuelle User-ID, bevorzugt über window.getCurrentUser, sonst Supabase-Fallback
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

// Initialisierung der Seite
initializePage();

// Event Listener für das Kategorie-Formular (Kategorie anlegen)
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

// Event Listener für das Gruppen-Formular (Gruppe anlegen)
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
 * Initialisiert die Seite: Lädt Kategorien, Gruppen und setzt Breadcrumbs
 */
async function initializePage() {
    window.logConsole('DEBUG: initializePage wird gestartet', 'debug');
    try {
        await Promise.all([
            loadCategoryTree(),
            updateCategorySelects()
        ]);
        if (window.breadcrumbs) {
            window.breadcrumbs.set([
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
    window.logConsole('DEBUG: loadCategoryTree wird gestartet', 'debug');
    try {
    // Nutzt sichere DOM-Methoden statt HTML-Strings
        categoryTree.innerHTML = '';
        const [categories, groups] = await Promise.all([
            window.quizDB.loadCategories(),
            window.quizDB.loadGroups()
        ]);
        const userCategories = categories.filter(category => category.createdBy !== 'system');
    window.logConsole(['DEBUG: userCategories', userCategories], 'debug');
        if (userCategories.length === 0) {
            const p = document.createElement('p');
            p.className = 'info-text';
            p.textContent = 'Keine Kategorien vorhanden. Erstelle deine erste Kategorie!';
            categoryTree.appendChild(p);
            return;
        }
        userCategories.sort((a, b) => a.name.localeCompare(b.name));

    // Baut DOM-Nodes für Kategorien und Gruppen
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

    // Event Delegation für bessere Performance und einfachere Logik
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
                // Entfernt: Automatisches Setzen ins Dropdown
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
                // Entfernt: Automatisches Setzen ins Dropdown
                return;
            }
        };
        categoryTree.addEventListener('click', delegatedClickHandler);
    // Tastatur-Support: Enter/Space auf Edit-Buttons
        categoryTree.addEventListener('keydown', function(e) {
            const el = e.target.closest && e.target.closest('.tree-item-edit');
            if (!el) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    // Referenz für Event-Handler speichern (späteres Entfernen möglich)
        categoryTree._delegatedClickHandler = delegatedClickHandler;
    } catch (error) {
        console.error('Fehler beim Laden des Kategoriebaums:', error);
        categoryTree.innerHTML = '<p class="error-text">Fehler beim Laden der Kategorien.</p>';
    }
}

/* ---------------- Edit-Modal-Logik ---------------- */
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

    // Name und Kategorie im Modal befüllen
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

    // Modal anzeigen
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden','false');
    // Fokus auf erstes Eingabefeld für Tastatur-Nutzer
    setTimeout(() => {
        try { document.getElementById('edit-item-name').focus(); } catch (e) {}
    }, 30);
}

function closeEditModal() {
    const modal = document.getElementById('edit-item-modal');
    // Falls Fokus im Modal: auf sinnvolles Element verschieben
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

// Schließen-Button für Modal
document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#edit-item-modal .modal-close')) {
        closeEditModal();
    }
});

// Modal mit ESC schließen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('edit-item-modal');
        if (modal && modal.getAttribute('aria-hidden') === 'false') closeEditModal();
    }
});

// Speichern-Handler für Modal
document.getElementById('edit-item-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const type = document.getElementById('edit-item-type').value;
    const id = document.getElementById('edit-item-id').value;
    const name = document.getElementById('edit-item-name').value.trim();
    const categoryId = document.getElementById('edit-item-category').value;
    if (!name) { showError('Name darf nicht leer sein.'); return; }
    // Optimistisches UI-Update mit Rollback bei Fehler
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

// Löschen-Handler: Delegierter Click, funktioniert auch bei dynamisch erzeugten Buttons
async function handleEditItemDelete() {
    const type = document.getElementById('edit-item-type')?.value;
    const id = document.getElementById('edit-item-id')?.value;
    if (!type || !id) return;
    try {
        try { closeEditModal(); } catch (e) { /* ignore */ }

        if (!document.getElementById('cascade-delete-modal')) {
            // Fullscreen-Overlay mit zentriertem Dialog, garantiert Sichtbarkeit
            const modalHtml = `
            <div id="cascade-delete-modal" role="dialog" aria-hidden="true" style="display:none;position:fixed;inset:0;z-index:2147483646;">
                <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>
                <div class="modal-panel" role="document" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;color:#222;max-width:640px;width:90%;border-radius:8px;padding:18px;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                    <h2 id="cascade-delete-title" style="margin-top:0;font-size:18px;">Löschen bestätigen</h2>
                    <p id="cascade-delete-body" style="margin:10px 0;color:#333;"></p>
                    <div class="modal-actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                        <button id="cascade-delete-cancel" class="btn" style="background:#eee;border:1px solid #ccc;padding:8px 12px;border-radius:6px;">Abbrechen</button>
                        <button id="cascade-delete-confirm" class="btn btn-danger" style="background:#d9534f;color:#fff;border:none;padding:8px 12px;border-radius:6px;">Löschen</button>
                    </div>
                </div>
            </div>`;
            const div = document.createElement('div'); div.innerHTML = modalHtml; document.body.appendChild(div.firstElementChild);
        }

        const modal = document.getElementById('cascade-delete-modal');
        const body = document.getElementById('cascade-delete-body');
        if (type === 'category') {
            document.getElementById('cascade-delete-title').textContent = 'Kategorie löschen';
            body.innerHTML = 'Beim Löschen dieser Kategorie werden alle zugehörigen Gruppen und deren Fragen unwiderruflich entfernt. Möchtest du fortfahren?';
            modal.dataset.type = 'category';
            modal.dataset.entityId = id;
        } else if (type === 'group') {
            document.getElementById('cascade-delete-title').textContent = 'Gruppe löschen';
            body.innerHTML = 'Beim Löschen dieser Gruppe werden alle zugehörigen Fragen unwiderruflich entfernt. Möchtest du fortfahren?';
            modal.dataset.type = 'group';
            modal.dataset.entityId = id;
        } else {
            modal.style.display = 'none'; modal.setAttribute('aria-hidden','true');
            return;
        }
        modal.style.display = 'block'; modal.setAttribute('aria-hidden','false');
    } catch (err) {
        console.error('Fehler beim Anzeigen des Lösch-Dialogs:', err);
        showError('Fehler beim Anzeigen des Lösch-Dialogs.');
    }
}

// Delegierter Click, funktioniert auch bei dynamisch erzeugtem Delete-Button
document.addEventListener('click', function(e) {
    const btn = e.target.closest && e.target.closest('#edit-item-delete');
    if (btn) {
        e.preventDefault();
        handleEditItemDelete();
    }
});

// Delegierte Handler für Modal Confirm/Cancel, garantiert Responsivität
document.addEventListener('click', function(e) {
    // confirm
    const c = e.target.closest && e.target.closest('#cascade-delete-confirm');
    if (c) {
        e.preventDefault();
        (async function(){
            const m = document.getElementById('cascade-delete-modal');
            if (!m) return;
            const t = m.dataset?.type;
            const entityId = m.dataset?.entityId;
            if (!t || !entityId) { m.style.display='none'; m.setAttribute('aria-hidden','true'); return; }
            try {
                c.disabled = true;
                if (t === 'category') {
                    const ok = await window.quizDB.cascadeDeleteCategory(entityId);
                    if (ok) showSuccess('Kategorie und zugehörige Inhalte gelöscht.'); else showError('Löschen fehlgeschlagen.');
                } else if (t === 'group') {
                    const ok = await window.quizDB.cascadeDeleteGroup(entityId);
                    if (ok) showSuccess('Gruppe und zugehörige Fragen gelöscht.'); else showError('Löschen fehlgeschlagen.');
                }
            } catch (err) {
                console.error('Cascade delete error (delegated)', err); showError('Fehler beim Löschen.');
            } finally {
                if (m) { m.style.display='none'; m.setAttribute('aria-hidden','true'); }
                try { c.disabled = false; } catch(e){}
                await loadCategoryTree(); await updateCategorySelects();
            }
        })();
        return;
    }
    // cancel
    const x = e.target.closest && e.target.closest('#cascade-delete-cancel');
    if (x) {
        e.preventDefault();
        const m = document.getElementById('cascade-delete-modal'); if (m) { m.style.display='none'; m.setAttribute('aria-hidden','true'); }
        return;
    }
});

// Delegierter Click-Handler stellt sicher, dass Delete-Button immer funktioniert

/* ----------------- Scrollbar-Hinweis-Logik ----------------- */
/** Gibt true zurück, wenn das Element vertikal gescrollt werden kann */
function isVerticallyScrollable(el) {
    if (!el) return false;
    return el.scrollHeight > el.clientHeight + 1; // small tolerance
}

/** Setzt oder entfernt die .scrollable-Klasse am category-tree-Container */
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

// Debounced Resize-Listener
let _resizeTimer = null;
window.addEventListener('resize', () => {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
        markCategoryTreeScrollable();
    }, 150);
});

// Nach initialem Rendern ausführen
document.addEventListener('DOMContentLoaded', () => {
    // small timeout to let layout settle if scripts appended dynamically
    setTimeout(markCategoryTreeScrollable, 100);
});

/**
 * Aktualisiert die Kategorie-Auswahlfelder für Gruppen
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
 * Lädt alle Gruppen und zeigt sie in der Gruppenliste an
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
 * Setzt die Breite und Zentrierung für alle Formularelemente per JS
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
