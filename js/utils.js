// utils.js - Hilfsfunktionen für LernApp

function safeAddEventListener(selector, event, handler, options) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el) el.addEventListener(event, handler, options);
}

function delegateEvent(parentSelector, childSelector, event, handler) {
    const parent = typeof parentSelector === 'string' ? document.querySelector(parentSelector) : parentSelector;
    if (!parent) return;
    parent.addEventListener(event, function(e) {
        const target = e.target.closest(childSelector);
        if (target && parent.contains(target)) handler.call(target, e);
    });
}

window.safeAddEventListener = safeAddEventListener;
window.delegateEvent = delegateEvent;
