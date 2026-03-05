# NeoSolar CRM – Projekt-Anweisungen

## Projekt
PV-CRM/ERP fuer NEOSOLAR AG (Schweizer Markt). Monorepo mit client, server, shared, prisma.

## Sprache
- Code-Kommentare und UI: Deutsch (Schweiz)
- Variablen/Funktionen: Englisch
- Commit-Messages: Deutsch mit konventionellem Prafix (feat:, fix:, refactor:, etc.)

## Tech-Stack
- Frontend: React 19 + Vite + TypeScript, Tailwind CSS v4, React Router v7, React Query v5
- Backend: Express v5 + TypeScript (Mock-Daten, kein DB noch)
- State: Zustand (global), React Query (server state)
- API: `/api/v1/...`, api.ts Helpers (api.get, api.post, api.put, api.delete)
- Tests: Vitest v4.0.18 + Supertest (181 Tests, 7 Dateien)

## Design-System
- Dark Glassmorphism: #06080C Hintergrund, rgba(255,255,255,0.035) Glass-Cards
- Accent: #F59E0B (Amber), Fehler: #F87171 (Red), Erfolg: #34D399 (Emerald)
- Font: Outfit, Tabellen 12px, Labels 10-11px uppercase
- Borders: rgba(255,255,255,0.06), backdrop-filter: blur(24px)
- Icons: lucide-react, strokeWidth 1.8, size 14-20
- Glass-Cards: `className="glass-card p-5"` mit `borderRadius: 'var(--radius-lg)'`
- Color-Mix: `color-mix(in srgb, ${color} 12%, transparent)` fuer subtile farbige Hintergruende

## Konventionen
- Hooks in client/src/hooks/ (useXxx.ts Muster wie useLeads.ts)
- Admin-Hooks: client/src/hooks/useAdmin.ts (Products, Integrations, Webhooks, etc.)
- Features in client/src/features/{modul}/ mit Hauptseite + components/ Unterordner
- Backend-Routen in server/src/routes/ mit In-Memory Mock-Daten
- Admin-Backend: server/src/routes/admin/ (products, integrations, webhooks, auditLog, branding, aiSettings, notifSettings, docTemplates, dbExport)
- Alle Modals: fixed inset-0 z-[90], Backdrop blur, Escape-Handler
- Formulare: glass-input Klasse, btn-primary / btn-secondary Buttons
- Sidebar: Expandable mit SidebarProvider Context (Sidebar.tsx exportiert SidebarProvider + useSidebarPinned)
- Error Boundary in main.tsx fuer App-weite Fehleranzeige
- Express Route-Order: Statische Routen VOR parametrische (z.B. /reorder vor /:id)

## Workflow
- Aenderungen automatisch durchfuehren ohne Bestaetigung zu verlangen
- Nach jedem abgeschlossenen Feature/Stand: Git commit
- TypeScript mit `npx tsc --noEmit` pruefen vor Commit
- Tests mit `npx vitest run` (181 Tests, 7 Dateien)

## Module (Status)
- [x] Lead Hub (v1 fertig, Fahrzeit-Kalkulation)
- [x] Termine Hub (v1 fertig, Checkliste, Termin→Angebot, Fahrzeit)
- [x] Angebote Hub (v2: Aktivitaeten-Log, winProbability %, Follow-Up, Dismiss)
- [x] Tasks-System Backend (moduluebergreifend, zuweisbar, CRUD + Stats)
- [x] Sidebar (Expandable Hover + Pin-Toggle)
- [x] Admin-Menue (14 Sektionen mit linker Tab-Navigation)
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

## Admin-Menue (14 Sektionen)
Route: `/admin`, Komponente: AdminPage.tsx mit useState<AdminSection>

### Sektionen
1. **Benutzer & Rollen** - CRUD, individuelle Modul-Berechtigungen pro User, Rollen-Defaults
2. **Firmenstandorte** - Multi-Standort, primaer fuer Fahrzeit
3. **Pipeline-Verwaltung** - CRUD Pipelines + Buckets, Reorder, Delete
4. **Stammdaten/Preisdatenbank** - PV-Module, Wechselrichter, Batterien, Installation, Partner (CHF)
5. **Tag-Verwaltung** - CRUD mit 10-Farb-Picker
6. **Automations-Regeln** - Follow-Up + Vorbereitungs-Checkliste
7. **Integrationen** - Outlook, 3CX, Zoom, Bexio Cards
8. **Webhook-Verwaltung** - Lead-Quellen mit Secret/Endpoint
9. **Dokumenten-Vorlagen** - Ordnerstruktur-Templates pro Entitaet
10. **Benachrichtigungen** - Event-Toggles, Kanaele (IN_APP/EMAIL)
11. **Firmen-Branding** - Logo, Firmenname, Angebotsvorlage
12. **KI-Einstellungen** - Toggle, Modell (Claude/GPT), Sprache, Features
13. **Audit-Log** - Filterbarer Log (User, Aktion), 30+ Mock-Eintraege
14. **Datenbank & Export** - DB-Stats, CSV/JSON Export

### Dateien
- client/src/features/admin/AdminPage.tsx (Hauptseite)
- client/src/features/admin/components/AdminNav.tsx (Linke Navigation)
- client/src/features/admin/components/{SectionName}Section.tsx (14 Sektionen)
- client/src/hooks/useAdmin.ts (Admin-spezifische Hooks)
- server/src/routes/admin/*.ts (9 Admin-Backend-Routen)

## Rollen & Berechtigungen
- UserRole: ADMIN, VERTRIEB, PROJEKTLEITUNG, BUCHHALTUNG, GL
- Jeder User hat `allowedModules: string[]` fuer individuelle Berechtigungen
- `defaultModulesByRole` Map definiert Standards pro Rolle
- Bei Rollenwechsel: Module werden auf Defaults zurueckgesetzt (ausser explizit ueberschrieben)
- Backend: GET /users/role-defaults liefert Standardberechtigungen

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

## Tests
- 181 Tests in 7 Dateien, alle gruen
- leads.test.ts (39), appointments.test.ts (28), deals.test.ts (27), settings.test.ts (14)
- users.test.ts (19), pipelines.test.ts (16), admin.test.ts (38)
- admin.test.ts: CRM-Integrationstests (referenzielle Integritaet zwischen Modulen)

## Geplante Features (Backlog)
- Lead: km-Entfernung und Fahrzeit zum Kunden anzeigen
- Lead: Outlook-Schnittstelle fuer Termine direkt eintragen und bestaetigen
- Dashboard: Monatsstatistik (Termine, Abschluesse pro Monat)
- Buchhaltung/Admin: 5% Provision auf Monatsabschluesse, druckbar
- Aufgaben: Aus jedem Tab zuweisbar, Dashboard-Integration
- Gewonnen → Projekt: Checkliste + Upload-Funktionen + Angaben pruefen
