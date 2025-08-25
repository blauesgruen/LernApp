# LernApp - Benutzeranleitung

## 🎯 Für normale Nutzer

### Zugang: **KEIN LOGIN erforderlich**
- Einfach die App öffnen und direkt nutzen
- Keine Registrierung oder Anmeldung nötig

### Verfügbare Funktionen:
✅ **Quiz spielen**
- Verschiedene Kategorien
- Multiple-Choice Fragen
- Text-zu-Bild "Ordne zu" System

✅ **Statistiken ansehen**
- Persönliche Erfolgsquote
- Kategorie-Übersicht
- Verlauf der gespielten Quizzes

❌ **KEIN Zugang zu:**
- Fragen erstellen/bearbeiten
- Kategorien verwalten
- Admin-Einstellungen

---

## 🛡️ Für Admins

### Zugang: **Passwort erforderlich**

#### **So melden Sie sich als Admin an:**
1. **"Admin" Button** in der Navigation klicken
2. **Passwort eingeben:** `LernApp2025Admin`
3. **"Anmelden" klicken**
4. ✅ **Admin-Navigation wird sichtbar**

#### **Als Admin verfügbar:**
✅ **Alle Nutzer-Funktionen** PLUS:
✅ **Verwaltung** (neuer Menüpunkt)
- Fragen erstellen/bearbeiten/löschen
- Kategorien erstellen/löschen
- Bilder hochladen
- Daten verwalten

✅ **Admin-Logout**
- Sicher abmelden
- Zurück zum Nutzer-Modus

---

## 🔐 Sicherheitsfeatures

### **Daten-Schutz:**
- localStorage wird verschlüsselt
- Admin-Zugang nur für aktuelle Sitzung
- Automatische Datenvalidierung

### **Admin-Sicherheit:**
- Passwort-geschützter Zugang
- Session-basierte Berechtigung
- Sichere Abmeldung

### **Content Security Policy:**
- Schutz vor XSS-Angriffen
- Nur vertrauenswürdige Quellen
- Sichere HTTPS-Übertragung

---

## 📱 Navigation

### **Normale Nutzer sehen:**
- **Quiz** - Spiele starten
- **Statistiken** - Erfolge ansehen
- **Admin** - Anmeldung (falls gewünscht)

### **Angemeldete Admins sehen:**
- **Quiz** - Spiele starten
- **Verwaltung** - Admin-Panel
- **Statistiken** - Erfolge ansehen  
- **Logout** - Abmelden

---

## 🚀 Erste Schritte

### **Als Nutzer:**
1. App öffnen
2. "Quiz" klicken
3. Kategorie wählen
4. Quiz starten!

### **Als Admin:**
1. "Admin" klicken
2. Passwort: `LernApp2025Admin`
3. "Verwaltung" ist jetzt verfügbar
4. Fragen und Kategorien verwalten

---

## ⚙️ Technische Details

- **Framework:** Vanilla JavaScript, Bootstrap 5
- **Speicher:** Lokaler Browser-Speicher (verschlüsselt)
- **Sicherheit:** CSP-Header, XOR-Verschlüsselung
- **Hosting:** GitHub Pages (HTTPS)

**Admin-Passwort für Produktion ändern!**
