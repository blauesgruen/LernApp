// log.js - Zentrales Logging für LernApp

// Logging nur noch in die Konsole, keine Speicherung in sessionStorage/localStorage
function lernappLog(...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (console._origLog) {
        console._origLog(line);
    } else {
        window.__console_log_orig = window.__console_log_orig || console.log;
        window.__console_log_orig(line);
    }
}

if (!console._origLog) {
    console._origLog = console.log;
    console.log = lernappLog;
}
