# NeoSolar CRM – Projekt-Anweisungen

## Projekt
PV-CRM/ERP fuer NEOSOLAR AG (Schweizer Markt). Monorepo mit client, server, shared, prisma.

## Sprache
- Code-Kommentare und UI: Deutsch (Schweiz)
- Variablen/Funktionen: Englisch
- Commit-Messages: Deutsch mit konventionellem Prafix (feat:, fix:, refactor:, etc.)

## Tech-Stack
- Frontend: React 19 + Vite + TypeScript, Tailwind CSS v4, React Router v7, React Query
- Backend: Express v5 + TypeScript (Mock-Daten, kein DB noch)
- State: Zustand (global), React Query (server state)
- API: `/api/v1/...`, api.ts Helpers (api.get, api.post, api.put, api.delete)

## Design-System
- Dark Glassmorphism: #06080C Hintergrund, rgba(255,255,255,0.035) Glass-Cards
- Accent: #F59E0B (Amber), Fehler: #F87171 (Red), Erfolg: #34D399 (Emerald)
- Font: Outfit, Tabellen 12px, Labels 10-11px uppercase
- Borders: rgba(255,255,255,0.06), backdrop-filter: blur(24px)
- Icons: lucide-react, strokeWidth 1.8, size 14-20

## Konventionen
- Hooks in client/src/hooks/ (useXxx.ts Muster wie useLeads.ts)
- Features in client/src/features/{modul}/ mit Hauptseite + components/ Unterordner
- Backend-Routen in server/src/routes/ mit In-Memory Mock-Daten
- Alle Modals: fixed inset-0 z-[90], Backdrop blur, Escape-Handler
- Formulare: glass-input Klasse, btn-primary / btn-secondary Buttons

## Workflow
- Aenderungen automatisch durchfuehren ohne Bestaetigung zu verlangen
- Nach jedem abgeschlossenen Feature/Stand: Git commit
- TypeScript mit `npx tsc --noEmit` pruefen vor Commit
- Keine Tests noetig ausser explizit verlangt

## Module (Status)
- [x] Lead Hub (v1 fertig, Tag: lead-erstellt-v1)
- [ ] Deal Hub (naechstes Modul)
- [ ] Kalkulation
- [ ] Projekte
- [ ] Rechnungen
- [ ] Kommunikation
- [ ] KI-Summary
- [ ] Aufgaben
- [ ] Meldungen
- [ ] Rollen
- [ ] Export
- [ ] Dokumente
- [ ] Dashboard

## Rollen
ADMIN, VERTRIEB, PROJEKTLEITUNG, BUCHHALTUNG, GL

## Geplante Features (Backlog)
- Lead: km-Entfernung und Fahrzeit zum Kunden anzeigen (fuer Verkaeufereinsatzplanung)
- Lead: Outlook-Schnittstelle fuer Termine direkt eintragen und bestaetigen
- Lead: Kalender-Integration fuer Terminplanung
