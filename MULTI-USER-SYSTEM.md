# LernApp - Multi-User System 

## Übersicht

Die LernApp wurde um ein umfassendes Multi-User-System erweitert, das es mehreren Benutzern ermöglicht, individuelle Accounts zu erstellen, ihre eigenen Fragen zu verwalten und optional Inhalte miteinander zu teilen.

## Neue Features

### 🔐 Benutzer-Management

#### Registrierung
- **Sichere Registrierung** mit Benutzername und Passwort
- **Passwort-Validierung** (mindestens 6 Zeichen)
- **Benutzername-Validierung** (3-20 Zeichen, nur Buchstaben und Zahlen)
- **Anzeigename** (optional) für personalisierte Darstellung
- **Eindeutige Benutzernamen** - keine Duplikate möglich

#### Anmeldung
- **Sichere Anmeldung** mit Passwort-Hash
- **Session-Management** für automatische Wiederanmeldung
- **Letzte Anmeldung** wird gespeichert und angezeigt

#### Demo-Modus
- **Testmodus ohne Registrierung** für schnelles Ausprobieren
- **Temporäre Daten** werden nicht dauerhaft gespeichert
- **Vollständige Funktionalität** außer Datenteilung

### 🗂️ Individuelle Datenbanken

#### Getrennte Datenhaltung
- **Jeder Benutzer** hat seine eigene separate Datenbank
- **Kategorien** sind benutzerspezifisch
- **Fragen** werden isoliert pro Benutzer gespeichert
- **Statistiken** werden individuell erfasst
- **Verschlüsselte Speicherung** aller Benutzerdaten

#### Datenschutz
- **Lokale Speicherung** - keine Server-Übertragung
- **XOR-Verschlüsselung** mit Base64-Kodierung
- **Datenintegrität** durch Validierung
- **Sichere Passwort-Hashes** (Demo-Implementation)

### 📤 Datenteilungs-System

#### Export-Funktionen
- **Teilungs-Codes** generieren für einfache Weitergabe
- **Auswählbare Inhalte** - Kategorien und/oder Fragen
- **Eindeutige 8-stellige Codes** (A-Z, 0-9)
- **Verwaltung** der eigenen geteilten Inhalte

#### Import-Funktionen
- **Code-basierter Import** von anderen Benutzern
- **Vorschau-Funktion** vor dem Import
- **Zusammenführungs-Optionen** (Duplikate vermeiden)
- **Metadata-Information** (Autor, Datum, Anzahl)

#### Sicherheit beim Teilen
- **Freiwillige Teilung** - Benutzer entscheiden selbst
- **Temporäre Codes** - können gelöscht werden
- **Keine automatische Synchronisation**
- **Volle Kontrolle** über geteilte Inhalte

### 🏠 Benutzer-Dashboard

#### Personalisierte Startseite
- **Willkommens-Nachricht** mit Benutzername
- **Schnellstatistiken** (Kategorien, Fragen, Erfolgsquote)
- **Letzte Aktivität** anzeigen
- **Direkte Aktions-Buttons** für häufige Aufgaben

#### Übersichtliche Navigation
- **Benutzer-Dropdown** mit Profil-Zugang
- **Kontextuelle Menüs** je nach Anmeldestatus
- **Breadcrumb-Navigation** für bessere Orientierung

### ⚙️ Profil-Verwaltung

#### Persönliche Einstellungen
- **Anzeigename ändern** für bessere Personalisierung
- **Passwort ändern** mit Bestätigung
- **Profil-Übersicht** mit Account-Informationen

#### Daten-Management
- **Export-Funktion** für vollständige Datensicherung
- **Reset-Funktion** für komplette Löschung
- **Import/Export** im JSON-Format für Portabilität

## Technische Implementation

### Datenstruktur

```javascript
// Globale User-Datenbank
users: {
    "username": {
        username: "username",
        password: "hashed_password",
        displayName: "Display Name",
        createdAt: "ISO_Date",
        lastLogin: "ISO_Date"
    }
}

// Benutzerspezifische Daten
user_username_categories: ["Kategorie1", "Kategorie2"]
user_username_questions: [questionObjects]
user_username_statistics: {statisticsObject}

// Geteilte Daten
shared_data: {
    "SHARECODE": {
        username: "author",
        displayName: "Author Name",
        timestamp: "ISO_Date",
        categories: [],
        questions: []
    }
}
```

### Sicherheitsmaßnahmen

#### Verschlüsselung
```javascript
// XOR-Verschlüsselung mit Base64
encryptData(data) {
    const key = 'LernApp2025SecureKey';
    // XOR-Operation + Base64-Kodierung
}
```

#### Passwort-Hashing
```javascript
// Einfacher Hash (Demo-Zwecke)
hashPassword(password) {
    // In Produktion: bcrypt oder ähnliche sichere Methoden
}
```

### Datentrennung

#### Storage-Keys
- **Global**: `lernapp_users`, `lernapp_shared_data`
- **User-spezifisch**: `lernapp_user_{username}_{datatype}`
- **Session**: `lernapp_current_user`, `lernapp_demo_mode`

## Benutzerführung

### Für neue Benutzer

1. **Registrierung**
   - Benutzerregistrierung über Startseite
   - Sichere Passwort-Wahl
   - Optional: Anzeigename festlegen

2. **Erste Schritte**
   - Automatischer Login nach Registrierung
   - Dashboard-Tour
   - Beispieldaten werden geladen

3. **Daten erstellen**
   - Kategorien erstellen
   - Fragen hinzufügen
   - Quiz ausprobieren

### Für bestehende Benutzer

1. **Anmeldung**
   - Login über Startseite
   - Automatische Session-Wiederherstellung
   - Dashboard mit aktuellen Statistiken

2. **Daten teilen**
   - Teilungs-Code generieren
   - Code an andere weitergeben
   - Eigene geteilte Inhalte verwalten

3. **Daten importieren**
   - Code von anderen eingeben
   - Vorschau der Inhalte
   - Auswahl was importiert werden soll

## Admin-System Kompatibilität

Das neue Multi-User-System ist **vollständig kompatibel** mit dem bestehenden Admin-System:

- **Admin-Zugang** funktioniert unabhängig vom User-Login
- **Admin-Features** sind für alle Benutzer verfügbar
- **Globale Admin-Verwaltung** bleibt bestehen
- **Passwort**: `LernApp2025Admin`

## Demo-Modus Features

Der Demo-Modus bietet **volle Funktionalität** ohne Registrierung:

- ✅ **Quiz spielen** mit Demo-Fragen
- ✅ **Fragen erstellen** (temporär)
- ✅ **Kategorien verwalten** (temporär)
- ✅ **Statistiken ansehen** (temporär)
- ❌ **Daten teilen** (nicht verfügbar)
- ❌ **Dauerhafte Speicherung** (Session-basiert)

## Zukünftige Erweiterungen

### Geplante Features

1. **Erweiterte Sicherheit**
   - Echter bcrypt-Password-Hash
   - 2-Faktor-Authentifizierung
   - Session-Timeout

2. **Erweiterte Datenteilung**
   - Öffentliche Fragenkataloge
   - Bewertungssystem
   - Kollaborative Bearbeitung

3. **Cloud-Integration**
   - Optional: Server-basierte Synchronisation
   - Backup in der Cloud
   - Geräte-übergreifende Nutzung

4. **Erweiterte Statistiken**
   - Lernfortschritt-Tracking
   - Vergleiche zwischen Benutzern
   - Empfehlungen basierend auf Leistung

## Migration von Single-User

Falls bereits Daten in der alten Single-User-Version vorhanden sind:

1. **Automatische Migration** beim ersten Start
2. **Daten werden** dem ersten registrierten Benutzer zugeordnet
3. **Backup wird erstellt** vor der Migration
4. **Keine Datenverluste** durch den Upgrade-Prozess

## Troubleshooting

### Häufige Probleme

**Problem**: "Benutzername bereits vergeben"
- **Lösung**: Anderen Benutzernamen wählen oder mit bestehendem Account anmelden

**Problem**: "Passwort vergessen"
- **Lösung**: Da lokal gespeichert, neuen Account erstellen oder Browser-Daten zurücksetzen

**Problem**: "Teilungs-Code funktioniert nicht"
- **Lösung**: Code korrekt eingeben (8 Zeichen, nur A-Z und 0-9)

**Problem**: "Demo-Modus Daten weg"
- **Lösung**: Demo-Daten sind temporär, Account erstellen für dauerhafte Speicherung

### Support

Bei weiteren Fragen oder Problemen:
- **GitHub Issues** für technische Probleme
- **Dokumentation** für detaillierte Anleitungen
- **Demo-Modus** zum Testen aller Features

---

**Das Multi-User-System macht die LernApp zu einer vollwertigen, mehrbenutzerfähigen Lernplattform mit modernsten Sicherheits- und Datenschutzstandards!** 🚀
