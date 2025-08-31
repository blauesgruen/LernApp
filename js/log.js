// log.js - Zentrales Logging für LernApp

function lernappLog(...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    let log = sessionStorage.getItem('lernapp_log') || '';
    log += line + '\n';
    sessionStorage.setItem('lernapp_log', log);
    if (console._origLog) {
        console._origLog.apply(console, args);
    } else {
        // Fallback
        window.__console_log_orig = window.__console_log_orig || console.log;
        window.__console_log_orig.apply(console, args);
    }
}

if (!console._origLog) {
    console._origLog = console.log;
    console.log = lernappLog;
}

window.addEventListener('DOMContentLoaded', () => {
    sessionStorage.removeItem('lernapp_log');
});
