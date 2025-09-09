// Dieses Skript aktualisiert das Speicherstatus-Icon im Footer
async function updateStorageStatusIcon() {
    const icon = document.getElementById('storage-status-icon');
    if (!icon) return;

    const username = localStorage.getItem('username') || 'default';

    // Debug helper
    const dbg = (msg, ...args) => {
        if (window.logger && window.logger.log) {
            try { window.logger.log(`[storage-status] ${msg}`, 'debug', ...args); return; } catch (e) {}
        }
        console.debug(`[storage-status] ${msg}`, ...args);
    };

    // 0) Wenn die Haupt-UI bereits einen Speicherpfad anzeigt UND dieser als verifiziert markiert ist,
    // vertrauen wir dieser Anzeige. Viele Seiten schreiben nur den Namen aus localStorage — das ist
    // nicht gleichbedeutend mit einem wirklich wiederhergestellten und getesteten DirectoryHandle.
    try {
        const currentStoragePathSpan = document.getElementById('current-storage-path');
        const spanText = currentStoragePathSpan ? (currentStoragePathSpan.textContent || '').trim() : null;
        const verified = currentStoragePathSpan ? currentStoragePathSpan.dataset.storageVerified === 'true' : false;
        dbg('current-storage-path text:', spanText, 'verified:', verified);
        if (currentStoragePathSpan && spanText && verified) {
            dbg('Choosing AVAILABLE because main UI shows a storage path AND it is marked verified');
            setIconAvailable(icon);
            return;
        }
    } catch (e) {
        dbg('Error reading current-storage-path', e);
    }

    // If loader hasn't finished, but indicates it's loaded via global flag, continue.
    dbg('__storageModulesLoaded flag:', !!window.__storageModulesLoaded, '__persistentStorageModulesLoaded:', !!window.__persistentStorageModulesLoaded);

    // If modules are clearly not loaded yet, schedule a retry shortly to allow loader to finish
    if (!window.__storageModulesLoaded && !window.__persistentStorageModulesLoaded) {
        dbg('Modules not loaded yet, will retry update in 150ms');
        setTimeout(() => { try { updateStorageStatusIcon(); } catch (e) { dbg('retry threw', e); } }, 150);
        // show unknown state placeholder (question mark) until we re-evaluate
        icon.innerHTML = '<circle cx="10" cy="10" r="8" fill="#9e9e9e" /><text x="10" y="15" text-anchor="middle" font-size="10" fill="#fff">?</text>';
        icon.parentElement.title = 'Speicherstatus wird geladen';
        return;
    }

    // 1) Wenn eine explizite Prüffunktion vorhanden ist, nutze sie
    try {
        if (typeof window.isStoragePathConfigured === 'function') {
            const configured = window.isStoragePathConfigured(username);
            dbg('isStoragePathConfigured ->', configured);
            if (configured) {
                dbg('Choosing AVAILABLE because isStoragePathConfigured returned true');
                setIconAvailable(icon);
                return;
            }
        }
    } catch (e) {
        dbg('isStoragePathConfigured threw', e);
    }

    // 2) Direkter Check auf geladenes DirectoryHandle
    if (window.directoryHandle) {
        dbg('Choosing AVAILABLE because window.directoryHandle exists');
        setIconAvailable(icon);
        return;
    }

    // 3) Falls möglich, versuche asynchron ein gespeichertes Handle zu laden (ohne UI-Interaktion)
    if (typeof window.restoreDirectoryHandle === 'function') {
        try {
            dbg('Calling restoreDirectoryHandle...');
            const handle = await window.restoreDirectoryHandle(username);
            dbg('restoreDirectoryHandle result ->', !!handle);
            if (handle) {
                // set global for compatibility
                window.directoryHandle = handle;
                dbg('Choosing AVAILABLE because restoreDirectoryHandle returned a handle');
                setIconAvailable(icon);
                return;
            }
        } catch (e) {
            dbg('restoreDirectoryHandle threw', e);
            // restore failed - continue to other checks
        }
    }

    // 4) Prüfe, ob ein Handle gespeichert, aber noch nicht geladen ist
    const storedFlag = localStorage.getItem(`hasStoredDirectoryHandle_${username}`);
    const storedName = localStorage.getItem(`directoryHandleName_${username}`);
    dbg('storedFlag:', storedFlag, 'storedName:', storedName);
    if (storedFlag === 'true' || storedName) {
        // Wenn der Benutzer gerade frisch einen Ordner ausgewählt hat, behandeln wir das als vorübergehend verfügbar
        try {
            const tsKey = `recentlySelectedDirectoryTimestamp_${username}`;
            const ts = parseInt(localStorage.getItem(tsKey) || '0', 10) || 0;
            const age = Date.now() - ts;
            dbg('recent selection age ms:', age);
            // Grace period: 30 Sekunden
            if (ts && age >= 0 && age < 30000) {
                dbg('Treating recent selection as AVAILABLE (within grace period)');
                setIconAvailable(icon);
                return;
            }
        } catch (e) {
            dbg('Error checking recent selection timestamp', e);
        }

        dbg('Choosing STORED (yellow) because localStorage indicates a stored handle');
        setIconStored(icon);
        return;
    }

    // 5) Sonst: nicht verfügbar
    setIconUnavailable(icon);
}

function setIconAvailable(icon) {
    icon.innerHTML = '<circle cx="10" cy="10" r="8" fill="#4caf50" /><text x="10" y="15" text-anchor="middle" font-size="12" fill="#fff">✔</text>';
    icon.parentElement.title = 'Speicherort geladen und verfügbar';
}

function setIconUnavailable(icon) {
    icon.innerHTML = '<circle cx="10" cy="10" r="8" fill="#f44336" /><text x="10" y="15" text-anchor="middle" font-size="12" fill="#fff">✖</text>';
    icon.parentElement.title = 'Speicherort nicht verfügbar';
}

function setIconStored(icon) {
    // Gelb: gespeichert, aber noch nicht geladen
    icon.innerHTML = '<circle cx="10" cy="10" r="8" fill="#ffb300" /><text x="10" y="15" text-anchor="middle" font-size="12" fill="#fff">⚪</text>';
    icon.parentElement.title = 'Speicherort ist gespeichert, aber noch nicht geladen';
}

// Nach jedem Laden des Footers und bei Speicher-Änderung aktualisieren
// Reagiere auf verschiedene Events, die den Status beeinflussen können
window.addEventListener('storageModulesLoaded', updateStorageStatusIcon);
window.addEventListener('persistentStorageModulesLoaded', updateStorageStatusIcon);
window.addEventListener('storageSystemReady', updateStorageStatusIcon);
window.addEventListener('storageModulesLoadError', updateStorageStatusIcon);
document.addEventListener('DOMContentLoaded', updateStorageStatusIcon);
document.addEventListener('directoryHandleChanged', updateStorageStatusIcon);
document.addEventListener('storageModulesLoaded', updateStorageStatusIcon);

// Sicherstellen, dass die Funktionen global verfügbar sind (für dynamisch eingefügte Footer-Skripte)
window.updateStorageStatusIcon = updateStorageStatusIcon;
window.setIconAvailable = setIconAvailable;
window.setIconUnavailable = setIconUnavailable;

// expose stored-state setter too
window.setIconStored = setIconStored;

// Falls das Dokument bereits geladen ist, direkt ausführen
if (document.readyState !== 'loading') {
    try { updateStorageStatusIcon(); } catch (e) { /* still best-effort */ }
}

// Fallback: Erlaube dem Nutzer über das Footer-Icon einen Ordner auszuwählen und zu persistieren
async function openAndPersistDirectoryPicker() {
    const username = localStorage.getItem('username') || 'default';
    try {
        if (!('showDirectoryPicker' in window)) {
            dbg('showDirectoryPicker nicht verfügbar in diesem Browser');
            return null;
        }

        const handle = await window.showDirectoryPicker({ id: 'LernAppStorage', startIn: 'documents', mode: 'readwrite' });
        if (!handle) return null;

        // Setze globales Handle
        try { window.directoryHandle = handle; } catch (e) {}

        // Versuche, im IndexedDB-Store zu speichern, falls Methode verfügbar
        if (typeof window.storeDirectoryHandle === 'function') {
            try {
                await window.storeDirectoryHandle(handle);
            } catch (e) {
                dbg('Fehler beim Speichern des Handles in IndexedDB', e);
            }
        }

        // Setze lokale Flags als Fallback
        try {
            localStorage.setItem(`hasStoredDirectoryHandle_${username}`, 'true');
            if (handle.name) localStorage.setItem(`directoryHandleName_${username}`, handle.name);
            // Markiere die Auswahl als frisch (für kurze Grace-Periode)
            try { localStorage.setItem(`recentlySelectedDirectoryTimestamp_${username}`, String(Date.now())); } catch (e) { dbg('could not set recent timestamp', e); }
        } catch (e) {
            dbg('Fehler beim Schreiben der Fallback-Flags in localStorage', e);
        }

        // Notify listeners
        try { document.dispatchEvent(new CustomEvent('directoryHandleChanged', { detail: { handle } })); } catch (e) {}
        try { window.updateStorageStatusIcon(); } catch (e) {}

        return handle;
    } catch (error) {
        dbg('openAndPersistDirectoryPicker error', error);
        return null;
    }
}

// Click handler auf das Footer-Icon, um Auswahl zu ermöglichen
function attachIndicatorClickHandler() {
    try {
        const indicator = document.getElementById('storage-status-indicator');
        if (!indicator) return;
        // Verhindere doppelte Registrierung
        if (indicator.__storageClickAttached) return;
        indicator.__storageClickAttached = true;
        indicator.addEventListener('click', async (e) => {
            e.preventDefault();
            const result = await openAndPersistDirectoryPicker();
            if (result) {
                // Kurze visuelle Rückmeldung
                try { if (window.displayNotification) window.displayNotification('Speicherort gespeichert: ' + (result.name || ''), 'success'); else alert('Speicherort gespeichert: ' + (result.name || '')); } catch (e) {}
            } else {
                try { if (window.displayNotification) window.displayNotification('Kein Speicherort ausgewählt oder Fehler beim Speichern.', 'warning'); else alert('Kein Speicherort ausgewählt oder Fehler beim Speichern.'); } catch (e) {}
            }
        });
    } catch (e) {
        dbg('attachIndicatorClickHandler failed', e);
    }
}

// Versuche sofort, den Handler anzuhängen (Footer könnte bereits eingefügt sein)
try { attachIndicatorClickHandler(); } catch (e) {}

// Und nochmal bei DOMContentLoaded sowie wenn sich das DirectoryHandle ändert
document.addEventListener('DOMContentLoaded', attachIndicatorClickHandler);
document.addEventListener('directoryHandleChanged', attachIndicatorClickHandler);

// Expose helper
window.openAndPersistDirectoryPicker = openAndPersistDirectoryPicker;
