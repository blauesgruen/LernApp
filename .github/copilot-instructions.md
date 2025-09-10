<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# LernApp - Projekt-spezifische Anweisungen (Stand: 10.09.2025)

Dieses Projekt ist eine interaktive Lernapp mit folgenden Hauptfunktionen:

## Kernfunktionen
- Multiple-Choice-Fragen-System
- Admin-Interface zum Erstellen und Bearbeiten von Fragen
- Kategorien- und Gruppenmanagement
- Bildunterstützung für Fragen und Antworten
- Supabase-basierte Userverwaltung und Authentifizierung
- Zentrales Logging und Benachrichtigungssystem

## Technologie-Stack
- Vanilla HTML, CSS, JavaScript (ES6+)
- Responsive Design (Bootstrap für UI-Komponenten)
- Supabase als zentrales Backend (Auth, Datenhaltung, Storage)

## Code-Stil
- Deutsche Kommentare und Variablennamen wo sinnvoll
- Moderne JavaScript Syntax (const, let, arrow functions, etc.)
- Modulare Struktur
- Responsive-first Design

## Hinweise für Copilot
- Alle Datenoperationen laufen über Supabase-Tabellen und Storage
- Keine lokale Speicherung (localStorage, JSON-Dateien) mehr verwenden
- Authentifizierung und Rechteverwaltung zentral über Supabase
- Kollaborations- und Echtzeitfunktionen über Supabase
- Fehler-/Erfolgsmeldungen über notification.js und logger.js
- UI ist vollständig responsive und modular
