/**
 * Dokumentation zur Implementierung der persistenten Dateisystem-Zugriffe in der LernApp
 * 
 * Dieses Dokument beschreibt die technische Implementierung und Lösungsstrategie
 * für die Persistierung von Dateisystem-Handles über Seitennavigationen hinweg.
 */

## Problemstellung

Bei der Verwendung der File System Access API in Webanwendungen besteht ein fundamentales Problem:
Dateisystem-Handles (DirectoryHandle) werden nicht automatisch zwischen Seitenaufrufen persistiert.
Dies führt dazu, dass Benutzer nach jedem Seitenwechsel oder Neuladen der Anwendung erneut
den Speicherort auswählen müssten, was eine sehr schlechte Benutzererfahrung darstellt.

## Technische Herausforderungen

1. **Security Model**: Browser erlauben aus Sicherheitsgründen keinen automatischen Zugriff auf das Dateisystem
2. **User Gesture Requirement**: Die Anzeige des Ordnerauswahl-Dialogs erfordert eine direkte Benutzeraktion
3. **Handle Persistence**: DirectoryHandle-Objekte können nicht einfach im localStorage gespeichert werden
4. **Permission Management**: Berechtigungen müssen regelmäßig erneuert werden

## Lösungsstrategie

Unsere Implementierung löst diese Probleme durch einen mehrschichtigen Ansatz:

### 1. IndexedDB zur Persistierung von DirectoryHandles

Die IndexedDB-API erlaubt es, komplexe Objekte wie DirectoryHandles zu speichern,
im Gegensatz zu localStorage, das nur Strings speichern kann:

```javascript
async function storeDirectoryHandle(handle) {
    const db = await initHandleDb();
    const transaction = db.transaction(DIR_HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(DIR_HANDLE_STORE_NAME);
    await store.put(handle, DIR_HANDLE_KEY);
}

async function loadDirectoryHandle() {
    const db = await initHandleDb();
    const transaction = db.transaction(DIR_HANDLE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(DIR_HANDLE_STORE_NAME);
    return await store.get(DIR_HANDLE_KEY);
}
```

### 2. Berechtigungsmanagement

Wir implementieren eine explizite Berechtigungsprüfung und -anforderung:

```javascript
async function verifyPermission(handle) {
    // Prüfe aktuelle Berechtigung
    const opts = { mode: 'readwrite' };
    const state = await handle.queryPermission(opts);
    
    if (state === 'granted') return state;
    
    // Fordere Berechtigung an (erfordert Benutzerinteraktion)
    return await handle.requestPermission(opts);
}
```

### 3. Benutzerfreundliche Benachrichtigungen

Statt automatisch Dialoge anzuzeigen, nutzen wir Benachrichtigungen, die den Benutzer informieren:

```javascript
function createPermissionRequiredNotification(handle) {
    // Erstelle eine Benachrichtigung mit Schaltflächen
    // Benutzer kann "Berechtigung erteilen" klicken
    // Da dies eine direkte Benutzeraktion ist, darf requestPermission aufgerufen werden
}
```

### 4. Automatische Wiederherstellung beim Seitenladen

Beim Laden jeder Seite versuchen wir, das gespeicherte Handle zu laden und zu validieren:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Versuche, das Handle zu laden und zu validieren
    const restored = await restoreDirectoryHandle();
    if (restored) {
        console.log('Verzeichnis-Handle erfolgreich wiederhergestellt');
    }
});
```

## Integrationsarchitektur

Die Lösung ist modular aufgebaut und besteht aus mehreren Komponenten:

1. **persistent-file-system.js**: Kernfunktionalität für die Persistierung von Handles
2. **storage-loader.js**: Sichert die korrekte Ladereihenfolge der Module
3. **Anpassungen in storage.js**: Integration der persistenten Handles in die bestehende Storage-Logik

## Benutzererfahrung

Der Benutzer profitiert von folgenden Verbesserungen:

1. **Einmalige Auswahl**: Der Speicherort muss nur einmal ausgewählt werden
2. **Automatische Wiederherstellung**: Nach Seitenwechseln und Neustarts wird der Zugriff automatisch wiederhergestellt
3. **Klare Benachrichtigungen**: Wenn eine Benutzeraktion erforderlich ist, erhält der Benutzer eine klare Anweisung
4. **Nahtlose Integration**: Die Funktionalität ist vollständig in die bestehende App integriert

## Weiterentwicklung

Für zukünftige Versionen könnten folgende Verbesserungen in Betracht gezogen werden:

1. **Multi-Handle-Support**: Unterstützung für mehrere gespeicherte Verzeichnisse
2. **Erweiterte Berechtigungsprüfung**: Detailliertere Informationen über den Status der Berechtigungen
3. **Automatische Migration**: Automatische Übertragung von Daten zwischen verschiedenen Speicherorten
4. **Syncing-Funktionalität**: Synchronisation zwischen lokalem Speicher und Dateisystem

## Browserunterstützung

Diese Lösung funktioniert in allen modernen Browsern, die die File System Access API unterstützen:
- Google Chrome (ab Version 86)
- Microsoft Edge (ab Version 86)
- Opera (ab Version 72)

In Browsern ohne Unterstützung für die File System Access API wird automatisch auf localStorage als Fallback zurückgegriffen.
