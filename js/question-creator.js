// question-creator.js
// Minimal, clean implementation: renders category/group tree on the left
// and replaces the right panel (#group-questions-list) with questions for the selected group.

(function () {
  'use strict';

  // Short contract
  // Inputs: expects functions window.loadCategories(), window.loadGroups(), window.loadQuestions() and window.supabase (optional)
  // Outputs: updates DOM nodes #category-tree and #group-questions-list and sets hidden inputs #question-category, #question-group
  // Error modes: calls window.notification.showError/showSuccess if available, falls back to console

  const get = id => document.getElementById(id);
  const categoryTree = get('category-tree');
  const groupQuestionsList = get('group-questions-list');
  const leftCategoryCol = document.querySelector('.profile-col.profile-info');
  const categorySelect = get('question-category');
  const groupSelect = get('question-group');

  // Track currently expanded question so only one can be open at a time
  let _currentExpandedQuestion = null;
  let _currentExpandedToggle = null;

  const notifyError = (m) => { if (window.notification?.showError) return window.notification.showError(m); console.error(m); };
  const notifySuccess = (m) => { if (window.notification?.showSuccess) return window.notification.showSuccess(m); console.log(m); };

  function safeHtml(el, html) { if (!el) return; el.innerHTML = html; }

  function mapQuestionForDb(q) {
    return {
      question: q.question ?? q.text ?? null,
      answer: q.answer ?? null,
      additionalinfo: q.additionalinfo ?? q.additionalInfo ?? null,
      imageurl: q.imageurl ?? q.imageUrl ?? null,
      category_id: q.category_id ?? q.categoryId ?? null,
      group_id: q.group_id ?? q.groupId ?? null,
      difficulty: q.difficulty ?? null,
      tags: q.tags ?? null,
      owner: q.owner ?? q.createdBy ?? null
    };
  }

  async function loadQuestionsForGroup(groupId) {
    if (!groupQuestionsList) return;
    if (!groupId) { safeHtml(groupQuestionsList, '<p class="info-text">Wähle eine Gruppe aus.</p>'); return; }
    safeHtml(groupQuestionsList, '');
    // show loading indicator only if loading takes longer than 180ms
    let qLoadingTimer = setTimeout(() => { safeHtml(groupQuestionsList, '<p class="loading-info">Fragen werden geladen...</p>'); }, 180);

    try {
      const questions = (window.quizDB?.loadQuestions) ? await window.quizDB.loadQuestions() : (window.loadQuestions ? await window.loadQuestions() : []);
      const filtered = (questions || []).filter(q => String(q.group_id ?? q.groupId) === String(groupId));

      if (!filtered.length) { safeHtml(groupQuestionsList, '<p class="info-text">Keine Fragen in dieser Gruppe vorhanden</p>'); return; }

      const container = document.createElement('div'); container.className = 'question-tree';

  filtered.forEach(q => {
        // create a single-line tree-like item for each question
        const item = document.createElement('div'); item.className = 'tree-item tree-item-question'; item.dataset.id = q.id;

        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'tree-item-toggle'; toggle.setAttribute('aria-expanded','false');
        toggle.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';

        const icon = document.createElement('span'); icon.className = 'tree-item-icon'; icon.innerHTML = '<i class="fas fa-question-circle" aria-hidden="true"></i>';

        const text = document.createElement('span'); text.className = 'question-text'; text.textContent = (q.question || q.text || '');

  const editLink = document.createElement('a'); editLink.href = '#'; editLink.className = 'tree-item-edit'; editLink.title = 'Frage bearbeiten'; editLink.innerHTML = '<i class="fas fa-edit"></i>';
  editLink.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); openQuestionModal(q); });

        // expanded content (hidden by default)
        const expanded = document.createElement('div'); expanded.className = 'question-expanded'; expanded.style.display = 'none';
        const ans = document.createElement('div'); ans.className = 'question-expanded-answer'; ans.innerHTML = `<strong>Antwort:</strong> ${q.answer || ''}`;
        expanded.appendChild(ans);
        if (q.additionalinfo) { const ex = document.createElement('div'); ex.className = 'question-expanded-expl'; ex.innerHTML = `<strong>Erklärung:</strong> ${q.additionalinfo}`; expanded.appendChild(ex); }
        if (q.imageurl || q.imageUrl) { const imw = document.createElement('div'); imw.className = 'question-expanded-image'; const img = document.createElement('img'); img.src = q.imageurl || q.imageUrl; img.alt = 'Frage Bild'; img.style.maxWidth = '100%'; imw.appendChild(img); expanded.appendChild(imw); }

        // deletion is handled in the edit modal; no inline delete button here per UX

        // assemble
        item.appendChild(toggle); item.appendChild(icon); item.appendChild(text); item.appendChild(editLink);
        container.appendChild(item); container.appendChild(expanded);

        // toggle behaviour: ensure only one question is expanded at once
        const toggleHandler = () => {
          const isExpandedNow = expanded.style.display === 'block';
          if (!isExpandedNow) {
            // about to expand -> collapse previous
            if (_currentExpandedQuestion && _currentExpandedQuestion !== expanded) {
              _currentExpandedQuestion.style.display = 'none';
              if (_currentExpandedToggle) {
                _currentExpandedToggle.setAttribute('aria-expanded', 'false');
                const prevIc = _currentExpandedToggle.querySelector('i');
                if (prevIc) { prevIc.classList.remove('fa-chevron-down'); prevIc.classList.add('fa-chevron-right'); }
              }
            }
            expanded.style.display = 'block';
            toggle.setAttribute('aria-expanded', 'true');
            const ic = toggle.querySelector('i'); if (ic) { ic.classList.remove('fa-chevron-right'); ic.classList.add('fa-chevron-down'); }
            _currentExpandedQuestion = expanded; _currentExpandedToggle = toggle;
          } else {
            // collapse
            expanded.style.display = 'none';
            toggle.setAttribute('aria-expanded', 'false');
            const ic = toggle.querySelector('i'); if (ic) { ic.classList.remove('fa-chevron-down'); ic.classList.add('fa-chevron-right'); }
            if (_currentExpandedQuestion === expanded) { _currentExpandedQuestion = null; _currentExpandedToggle = null; }
          }
        };
        toggle.addEventListener('click', (e) => { e.stopPropagation(); toggleHandler(); });
        text.addEventListener('click', (e) => { e.stopPropagation(); toggleHandler(); });
        text.tabIndex = 0; text.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHandler(); } });
      });

      clearTimeout(qLoadingTimer);
      groupQuestionsList.innerHTML = '';
      groupQuestionsList.appendChild(container);

    } catch (err) {
      console.error('Fehler beim Laden der Gruppenfragen:', err);
      safeHtml(groupQuestionsList, '<p class="error-text">Fehler beim Laden der Fragen.</p>');
    }
  }

  async function renderCategoryTree() {
    const outEl = categoryTree;
  if (!outEl) return;
  // Ensure left column is visible (clear any previous inline hide) and remove leftover body class
  try { if (leftCategoryCol) leftCategoryCol.style.display = ''; document.body.classList.remove('tree-right-mode'); } catch (e) {}
  safeHtml(outEl, '<p class="loading-info">Kategorien werden geladen...</p>');
    try {
      const categories = (window.quizDB?.loadCategories) ? await window.quizDB.loadCategories() : (window.loadCategories ? await window.loadCategories() : []);
      const groups = (window.quizDB?.loadGroups) ? await window.quizDB.loadGroups() : (window.loadGroups ? await window.loadGroups() : []);
      const userCategories = (categories || []).filter(c => String(c.createdBy ?? c.created_by ?? '') !== 'system');
      if (!userCategories.length) { safeHtml(outEl, '<p class="info-text">Keine Kategorien gefunden.</p>'); return; }
      userCategories.sort((a,b)=>a.name.localeCompare(b.name));

      let html = '';
  userCategories.forEach(cat => {
        const gs = (groups || []).filter(g => String(g.category_id ?? g.categoryId) === String(cat.id)).sort((a,b)=>a.name.localeCompare(b.name));
        // Category header with chevron, folder icon and edit button on the right
        html += `
          <div class="tree-item tree-item-category" data-id="${cat.id}">
            <span class="tree-item-toggle"><i class="fas fa-chevron-right"></i></span>
            <span class="tree-item-icon"><i class="fas fa-folder"></i></span>
            <span class="cat-name"><strong>${cat.name}</strong></span>
            <a href="#" class="tree-item-edit" data-type="category" data-id="${cat.id}" title="Kategorie bearbeiten"><i class="fas fa-edit"></i></a>
          </div>`;
        html += `<div class="tree-group-container" data-category-id="${cat.id}" style="display:none">`;
        if (gs.length) gs.forEach(g => { html += `
            <div class="tree-item tree-item-group" data-id="${g.id}" data-category-id="${cat.id}">
              <span class="tree-item-icon"><i class="fas fa-tag"></i></span>
              <span class="group-name">${g.name}</span>
              <a href="#" class="tree-item-edit" data-type="group" data-id="${g.id}" data-cat="${cat.id}" title="Gruppe bearbeiten"><i class="fas fa-edit"></i></a>
            </div>`; });
        else html += `<div class="tree-item-empty">Keine Gruppen</div>`;
        html += `</div>`;
      });

      safeHtml(outEl, html);

      // scope listeners to the rendered tree inside outEl
      // Clicking a category toggles its group container and rotates the chevron. Only one group container is expanded at a time.
      outEl.querySelectorAll('.tree-item-category').forEach(catEl => {
        const toggleBtn = catEl.querySelector('.tree-item-toggle');
        catEl.addEventListener('click', function (e) {
          e.stopPropagation();
          const id = this.getAttribute('data-id');

          // Collapse other containers and reset their chevrons
          outEl.querySelectorAll('.tree-group-container').forEach(c => {
            const cid = c.dataset.categoryId;
            if (String(cid) !== String(id)) {
              c.style.display = 'none';
              const relatedCat = outEl.querySelector('.tree-item-category[data-id="' + cid + '"]');
              const relToggle = relatedCat ? relatedCat.querySelector('.tree-item-toggle') : null;
              if (relToggle) { relToggle.setAttribute('aria-expanded','false'); const ic = relToggle.querySelector('i'); if (ic) { ic.classList.remove('fa-chevron-down'); ic.classList.add('fa-chevron-right'); } }
            }
          });

          const container = outEl.querySelector('.tree-group-container[data-category-id="' + id + '"]');
          if (!container) return;
          const isExpanded = container.style.display === 'block';
          if (isExpanded) {
            container.style.display = 'none';
            if (toggleBtn) { toggleBtn.setAttribute('aria-expanded','false'); const ic = toggleBtn.querySelector('i'); if (ic) { ic.classList.remove('fa-chevron-down'); ic.classList.add('fa-chevron-right'); } }
          } else {
            container.style.display = 'block';
            if (toggleBtn) { toggleBtn.setAttribute('aria-expanded','true'); const ic = toggleBtn.querySelector('i'); if (ic) { ic.classList.remove('fa-chevron-right'); ic.classList.add('fa-chevron-down'); } }
          }

          outEl.querySelectorAll('.tree-item-category').forEach(c => c.classList.remove('active'));
          this.classList.add('active');
          if (categorySelect) categorySelect.value = id;
        });

        // Clicking the small toggle chevron should perform the same toggle behaviour
        if (toggleBtn) {
          toggleBtn.addEventListener('click', function (ev) { ev.stopPropagation(); try { catEl.click(); } catch (e) { /* ignore */ } });
        }
      });

      outEl.querySelectorAll('.tree-item-group').forEach(gEl => gEl.addEventListener('click', function (e) {
        const gid = this.getAttribute('data-id'); const cid = this.getAttribute('data-category-id');
        // Remove active classes in the whole document to keep UI consistent
        document.querySelectorAll('.tree-item-category, .tree-item-group').forEach(el => el.classList.remove('active'));
        document.querySelector('.tree-item-category[data-id="' + cid + '"]')?.classList.add('active'); this.classList.add('active');
        if (categorySelect) categorySelect.value = cid; if (groupSelect) groupSelect.value = gid; loadQuestionsForGroup(gid);
      }));

      // Edit icon handlers (category/group edit)
      outEl.querySelectorAll('.tree-item-edit').forEach(el => el.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        const type = this.dataset.type; const id = this.dataset.id; const cat = this.dataset.cat;
        // If the shared edit modal exists on the page or the global openEditModal function is available,
        // open the modal in-place. Otherwise, navigate to the category-management page as a fallback.
        if (document.getElementById('edit-item-modal') || typeof window.openEditModal === 'function') {
          try {
            if (typeof window.openEditModal === 'function') {
              window.openEditModal(type, id, cat);
            } else {
              // fallback to navigation if something unexpected happens
              if (type === 'category') window.location.href = 'category-management.html?category=' + encodeURIComponent(id);
              else if (type === 'group') window.location.href = 'category-management.html?category=' + encodeURIComponent(cat) + '&group=' + encodeURIComponent(id);
            }
          } catch (err) {
            console.error('Fehler beim Öffnen des Edit-Modals:', err);
            if (type === 'category') window.location.href = 'category-management.html?category=' + encodeURIComponent(id);
            else if (type === 'group') window.location.href = 'category-management.html?category=' + encodeURIComponent(cat) + '&group=' + encodeURIComponent(id);
          }
        } else {
          // navigate to category-management page if modal not present
          if (type === 'category') {
            window.location.href = 'category-management.html?category=' + encodeURIComponent(id);
          } else if (type === 'group') {
            window.location.href = 'category-management.html?category=' + encodeURIComponent(cat) + '&group=' + encodeURIComponent(id);
          }
        }
      }));


    } catch (err) { console.error('Fehler beim Rendern des Kategorie-Baums:', err); safeHtml(outEl, '<p class="error-text">Fehler beim Laden der Kategorien und Gruppen.</p>'); }
  }

  // Initialize
  async function init() {
    try {
  // Render the category/group tree into the left tree (default)
  await renderCategoryTree();
      if (groupSelect?.value) await loadQuestionsForGroup(groupSelect.value);
      window.addEventListener('resize', () => { /* optional adjust heights */ });
    } catch (err) {
      console.error('Fehler beim Initialisieren:', err);
      notifyError('Fehler beim Laden der Daten. Bitte Seite neu laden.');
    }
  }

  // Open a modal to edit a question. Reuses #edit-item-modal when available by adapting its fields,
  // otherwise creates a simple modal overlay. Uses window.updateQuestion (questions-db) if present.
  function openQuestionModal(q) {
    // try to reuse existing edit-item-modal from category-management.html
    const existingModal = document.getElementById('edit-item-modal');
    if (existingModal) {
      // populate modal fields (we repurpose edit-item-name for question text and show delete)
      const title = document.getElementById('edit-item-title');
      const inputName = document.getElementById('edit-item-name');
      const inputType = document.getElementById('edit-item-type');
      const inputId = document.getElementById('edit-item-id');
      const categoryRow = document.getElementById('edit-item-category-row');
      const categorySelect = document.getElementById('edit-item-category');

      title.textContent = 'Frage bearbeiten';
      inputType.value = 'question';
      inputId.value = q.id;
      inputName.value = q.question || q.text || '';
      // hide category row for questions but keep it available
      if (categoryRow) categoryRow.style.display = 'none';

      // show modal
      existingModal.style.display = 'block'; existingModal.setAttribute('aria-hidden','false');

      // adjust form submit handler
      const form = document.getElementById('edit-item-form');
      const submitHandler = async function (ev) {
        ev.preventDefault();
        const newName = inputName.value.trim();
        // build updated question object; we keep other fields untouched for simplicity
        const updated = Object.assign({}, q, { text: newName, question: newName });
        // try to call window.updateQuestion (questions-db)
        try {
          if (typeof window.updateQuestion === 'function') {
            const ok = await window.updateQuestion(q.id, updated);
            if (ok) {
              existingModal.style.display = 'none'; existingModal.setAttribute('aria-hidden','true');
              await loadQuestionsForGroup(q.groupId ?? q.group_id);
            }
          } else if (window.supabase) {
            // fallback: update via supabase
            const payload = { question: updated.question ?? updated.text, additionalinfo: updated.additionalinfo ?? updated.additionalInfo };
            const { error } = await window.supabase.from('questions').update(payload).eq('id', q.id);
            if (!error) { existingModal.style.display = 'none'; existingModal.setAttribute('aria-hidden','true'); await loadQuestionsForGroup(q.groupId ?? q.group_id); }
            else { notifyError('Fehler beim Speichern: ' + (error.message || '')); }
          } else {
            notifyError('Keine Update-Funktion verfügbar.');
          }
        } catch (err) { console.error(err); notifyError('Fehler beim Speichern'); }
      };
      // remove previous listener to avoid duplicates
      try { form.removeEventListener('submit', form._editSubmitHandler); } catch (e) {}
      form.addEventListener('submit', submitHandler);
      form._editSubmitHandler = submitHandler;

      // wire delete button inside modal to perform deletion if available
      const deleteBtn = document.getElementById('edit-item-delete');
      if (deleteBtn) {
        deleteBtn.onclick = async function () {
          if (!confirm('Frage wirklich löschen?')) return;
          try {
            if (typeof window.deleteQuestion === 'function') {
              const ok = await window.deleteQuestion(q.id);
              if (ok) { existingModal.style.display = 'none'; existingModal.setAttribute('aria-hidden','true'); await loadQuestionsForGroup(q.groupId ?? q.group_id); }
            } else if (window.supabase) {
              const { error } = await window.supabase.from('questions').delete().eq('id', q.id);
              if (!error) { existingModal.style.display = 'none'; existingModal.setAttribute('aria-hidden','true'); await loadQuestionsForGroup(q.groupId ?? q.group_id); }
              else notifyError('Fehler beim Löschen');
            } else notifyError('Keine Lösch-Funktion verfügbar.');
          } catch (err) { console.error(err); notifyError('Fehler beim Löschen'); }
        };
      }
      return;
    }

    // If no existing modal, create a small modal for question editing
    const modal = document.createElement('div'); modal.className = 'qc-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);"></div>
      <div class="modal-panel" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;padding:18px;border-radius:8px;max-width:720px;width:90%;box-shadow:0 12px 48px rgba(0,0,0,0.35);z-index:2147483647;">
        <button class="modal-close" style="position:absolute;right:12px;top:8px;background:none;border:none;font-size:20px;cursor:pointer;">×</button>
        <h2>Frage bearbeiten</h2>
        <form id="qc-edit-form">
          <div class="form-group"><label>Fragetext</label><input id="qc-edit-text" type="text" style="width:100%;" value="${(q.question||q.text||'').replace(/"/g,'&quot;')}"></div>
          <div class="form-group"><label>Antwort</label><input id="qc-edit-ans" type="text" style="width:100%;" value="${(q.answer||'').replace(/"/g,'&quot;')}"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;"><button type="submit" class="btn-primary">Speichern</button><button type="button" id="qc-cancel" class="btn-secondary">Abbrechen</button></div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => { modal.remove(); });
    modal.querySelector('#qc-cancel').addEventListener('click', () => { modal.remove(); });
    const form = modal.querySelector('#qc-edit-form');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const newText = modal.querySelector('#qc-edit-text').value.trim();
      const newAns = modal.querySelector('#qc-edit-ans').value.trim();
      const updated = Object.assign({}, q, { text: newText, question: newText, answer: newAns });
      try {
        if (typeof window.updateQuestion === 'function') {
          const ok = await window.updateQuestion(q.id, updated);
          if (ok) { modal.remove(); await loadQuestionsForGroup(q.groupId ?? q.group_id); }
        } else if (window.supabase) {
          const payload = { question: updated.question ?? updated.text, answer: updated.answer };
          const { error } = await window.supabase.from('questions').update(payload).eq('id', q.id);
          if (!error) { modal.remove(); await loadQuestionsForGroup(q.groupId ?? q.group_id); } else notifyError('Fehler beim Speichern');
        } else notifyError('Keine Update-Funktion verfügbar.');
      } catch (err) { console.error(err); notifyError('Fehler beim Speichern'); }
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();

// Provide a global fallback openEditModal if not provided by category-management.js
if (typeof window.openEditModal !== 'function') {
  window.openEditModal = async function (type, id, categoryId=null) {
    // If canonical modal exists, delegate to its openEditModal (category-management.js)
    if (typeof window.openEditModal === 'function' && document.getElementById('edit-item-modal')) {
      // If the page already loaded category-management.js, its openEditModal will be present and will handle it.
      try { return window.openEditModal(type, id, categoryId); } catch (e) { /* fallthrough */ }
    }
    // create a simple modal for editing name (category or group)
    const modal = document.createElement('div'); modal.className = 'qc-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);"></div>
      <div class="modal-panel" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;padding:18px;border-radius:8px;max-width:640px;width:90%;box-shadow:0 12px 48px rgba(0,0,0,0.35);z-index:2147483647;">
        <button class="modal-close" style="position:absolute;right:12px;top:8px;background:none;border:none;font-size:20px;cursor:pointer;">×</button>
        <h2>Bearbeiten</h2>
        <form id="qc-edit-catgrp-form">
          <div class="form-group"><label>Name</label><input id="qc-edit-name" type="text" style="width:100%;"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;"><button type="submit" class="btn-primary">Speichern</button><button type="button" id="qc-cancel" class="btn-secondary">Abbrechen</button></div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    const close = () => { try { modal.remove(); } catch (e) {} };
    modal.querySelector('.modal-close').addEventListener('click', close);
    modal.querySelector('#qc-cancel').addEventListener('click', close);
    // prefill name from quizDB
    try {
      if (type === 'category') {
        const cats = await window.quizDB.loadCategories(); const c = cats.find(x=>String(x.id)===String(id)); modal.querySelector('#qc-edit-name').value = c ? c.name : '';
      } else if (type === 'group') {
        const gs = await window.quizDB.loadGroups(); const g = gs.find(x=>String(x.id)===String(id)); modal.querySelector('#qc-edit-name').value = g ? g.name : '';
      }
    } catch (e) { console.warn('Prefill failed', e); }
    modal.querySelector('#qc-edit-catgrp-form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      const newName = modal.querySelector('#qc-edit-name').value.trim();
      if (!newName) return;
      try {
        if (type === 'category' && window.quizDB && typeof window.quizDB.updateCategory === 'function') {
          await window.quizDB.updateCategory(id, { name: newName });
        } else if (type === 'group' && window.quizDB && typeof window.quizDB.updateGroup === 'function') {
          await window.quizDB.updateGroup(id, { name: newName, categoryId: categoryId || undefined });
        } else {
          // fallback: navigate to category-management page
          if (type === 'category') window.location.href = 'category-management.html?category=' + encodeURIComponent(id);
          else window.location.href = 'category-management.html?category=' + encodeURIComponent(categoryId) + '&group=' + encodeURIComponent(id);
          return;
        }
        close();
        // refresh trees if present
        try { if (typeof renderCategoryTree === 'function') renderCategoryTree(); } catch (e) {}
      } catch (err) { console.error('Save failed', err); }
    });
  };
}