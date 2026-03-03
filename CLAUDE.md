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
- Sidebar: Expandable mit SidebarProvider Context (Sidebar.tsx exportiert SidebarProvider + useSidebarPinned)

## Workflow
- Aenderungen automatisch durchfuehren ohne Bestaetigung zu verlangen
- Nach jedem abgeschlossenen Feature/Stand: Git commit
- TypeScript mit `npx tsc --noEmit` pruefen vor Commit
- Tests mit `npx vitest run` (147 Tests, 5 Dateien)

## Module (Status)
- [x] Lead Hub (v1 fertig, Fahrzeit-Kalkulation)
- [x] Termine Hub (v1 fertig, Checkliste, Termin→Angebot, Fahrzeit)
- [x] Angebote Hub (v2: Aktivitaeten-Log, winProbability %, Follow-Up, Dismiss)
- [x] Tasks-System Backend (moduluebergreifend, zuweisbar, CRUD + Stats)
- [x] Settings/Rollen (Checklisten-Admin, Firmenstandort, Follow-Up Regeln)
- [x] Sidebar (Expandable Hover + Pin-Toggle)
- [ ] Dashboard (Monatsstatistik, Provision, Tasks-Integration)
- [ ] Kalkulation
- [ ] Projekte (Gewonnen→Projekt Flow)
- [ ] Rechnungen
- [ ] Kommunikation
- [ ] KI-Summary
- [ ] Aufgaben (Frontend-Seite)
- [ ] Meldungen
- [ ] Export
- [ ] Dokumente

## Rollen
ADMIN, VERTRIEB, PROJEKTLEITUNG, BUCHHALTUNG, GL

## Angebote-Features (v2)
- Aktivitaeten-Log: Persistent, Typ (NOTE/CALL/EMAIL/MEETING/STATUS_CHANGE/SYSTEM)
- winProbability: 0-100%, Range-Slider, fliesst in gewichteten Pipeline-Wert
- followUpDate: Manuell setzbar + automatisches Follow-Up System
- Follow-Up Dismiss: Pflicht-Notiz, updatedAt wird zurueckgesetzt
- Gewonnen-Flow: Bestaetigung → Projekt (geplant: Checkliste + Upload)

## Tasks-System
- Module: LEAD, TERMIN, ANGEBOT, PROJEKT, ALLGEMEIN
- Status: OFFEN, IN_BEARBEITUNG, ERLEDIGT
- Zuweisbar: assignedTo + assignedBy (an sich selbst oder andere)
- referenceId/referenceTitle: Verknuepfung zu Lead/Termin/Angebot/Projekt

## Geplante Features (Backlog)
- Lead: km-Entfernung und Fahrzeit zum Kunden anzeigen
- Lead: Outlook-Schnittstelle fuer Termine direkt eintragen und bestaetigen
- Dashboard: Monatsstatistik (Termine, Abschluesse pro Monat)
- Buchhaltung/Admin: 5% Provision auf Monatsabschluesse, druckbar
- Aufgaben: Aus jedem Tab zuweisbar, Dashboard-Integration
- Gewonnen → Projekt: Checkliste + Upload-Funktionen + Angaben pruefen
