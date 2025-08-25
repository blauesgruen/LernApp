# Sicherheitsrichtlinien

## Admin-Zugang
- **Passwort:** LernApp2025Admin
- **Hinweis:** Ändern Sie das Passwort in der Produktion!

## Daten-Sicherheit
- localStorage wird verschlüsselt gespeichert
- Daten werden auf Integrität geprüft
- Admin-Bereich ist passwortgeschützt

## Content Security Policy
- Nur vertrauenswürdige Quellen erlaubt
- Inline-Scripts nur wo nötig
- Schutz vor XSS-Angriffen

## Empfohlene Änderungen für Produktion
1. **Admin-Passwort ändern** in `js/app.js` (Zeile mit `correctPassword`)
2. **Verschlüsselungsschlüssel ändern** in `encryptData()` Funktion
3. **HTTPS verwenden** für Hosting

## Hosting-Sicherheit
- GitHub Pages verwendet automatisch HTTPS
- Repository kann privat gestellt werden
- Branch Protection Rules empfohlen
