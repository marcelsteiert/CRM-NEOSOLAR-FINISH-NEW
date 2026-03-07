# NeoSolar CRM – Projekt-Anweisungen

## Projekt
PV-CRM/ERP fuer NEOSOLAR AG (Schweizer Markt). Monorepo mit client, server, shared, prisma.

## Sprache
- Code-Kommentare und UI: Deutsch (Schweiz)
- Variablen/Funktionen: Englisch
- Commit-Messages: Deutsch mit konventionellem Prafix (feat:, fix:, refactor:, etc.)

## Tech-Stack
- Frontend: React 19 + Vite + TypeScript, Tailwind CSS v4, React Router v7, React Query v5
- Backend: Express v5 + TypeScript, Supabase (PostgreSQL + Storage)
- State: Zustand (global), React Query (server state)
- API: `/api/v1/...`, api.ts Helpers (api.get, api.post, api.put, api.delete)
- Auth: JWT (bcryptjs + jsonwebtoken), useAuth Hook mit Auto-Refresh
- Tests: Vitest v4.0.18 + Supertest

## Design-System
- Dark Glassmorphism: #06080C Hintergrund, rgba(255,255,255,0.035) Glass-Cards
- Accent: #F59E0B (Amber), Fehler: #F87171 (Red), Erfolg: #34D399 (Emerald)
- Font: Outfit, Tabellen 12px, Labels 10-11px uppercase
- Borders: rgba(255,255,255,0.06), backdrop-filter: blur(24px)
- Icons: lucide-react, strokeWidth 1.8, size 14-20
- Glass-Cards: `className="glass-card p-5"` mit `borderRadius: 'var(--radius-lg)'`
- Color-Mix: `color-mix(in srgb, ${color} 12%, transparent)` fuer subtile farbige Hintergruende

## Responsive Design (Mobile-First)
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- useIsMobile Hook: Reaktiver matchMedia Listener fuer JS-basierte Responsive-Logik
- Sidebar: Mobile Drawer Overlay mit Backdrop, Hamburger-Toggle, Auto-Close bei Navigation
- TopBar: Hamburger-Button (md:hidden), responsive Search/Clock
- AppLayout: marginLeft 0 auf Mobile, responsive Padding (p-4 sm:p-5 md:p-7)
- Headers: flex-col sm:flex-row, Beschreibungen hidden auf Mobile
- Grids: Mobile 1-col → Tablet 2-col → Desktop 3-5 col (je nach Seite)
- SidebarContext erweitert mit mobileOpen/setMobileOpen fuer Hamburger-Steuerung

## Konventionen
- Hooks in client/src/hooks/ (useXxx.ts Muster wie useLeads.ts)
- Admin-Hooks: client/src/hooks/useAdmin.ts (Products, Integrations, Webhooks, etc.)
- Features in client/src/features/{modul}/ mit Hauptseite + components/ Unterordner
- Backend-Routen in server/src/routes/ mit Supabase-Abfragen
- Admin-Backend: server/src/routes/admin/ (products, integrations, webhooks, auditLog, branding, aiSettings, notifSettings, docTemplates, dbExport)
- Alle Modals: fixed inset-0 z-[90], Backdrop blur, Escape-Handler
- Formulare: glass-input Klasse, btn-primary / btn-secondary Buttons
- Sidebar: Expandable mit SidebarProvider Context (Sidebar.tsx exportiert SidebarProvider + useSidebarPinned + mobileOpen)
- Mobile Sidebar: Drawer-Overlay mit Backdrop, translate-x Animation, md:translate-x-0 Desktop
- Error Boundary in main.tsx fuer App-weite Fehleranzeige
- Express Route-Order: Statische Routen VOR parametrische (z.B. /reorder vor /:id)
- Alle Entitaeten haben `contact_id` fuer Pipeline-uebergreifende Verknuepfung

## Workflow
- Aenderungen automatisch durchfuehren ohne Bestaetigung zu verlangen
- Nach jedem abgeschlossenen Feature/Stand: Git commit
- TypeScript mit `npx tsc --noEmit` pruefen vor Commit

## Module (Status)
- [x] Lead Hub (v2, After Sales Tab, Termin-Typ Filter, responsive)
- [x] Termine Hub (v1, Checkliste, Termin→Angebot, Fahrzeit, responsive)
- [x] Angebote Hub (v2, Aktivitaeten-Log, winProbability %, Follow-Up, Dismiss, responsive)
- [x] Projekte (Kanban, Dashboard, Partner, Detail-Modal, responsive)
- [x] Deal→Projekt (Auto-Konvertierung bei Gewonnen)
- [x] Provision (Monatsstatistiken, exakte CHF-Anzeige, responsive)
- [x] Tasks-System Backend (moduluebergreifend, zuweisbar, CRUD + Stats)
- [x] Sidebar (Expandable + Mobile Drawer + allowedModules Filter)
- [x] Admin-Menue (15 Sektionen mit linker Tab-Navigation, responsive)
- [x] Features-Seite (14 togglebare Module, responsive)
- [x] Responsive Design (alle Seiten Mobile-First)
- [x] Dashboard (KPI, KI-Briefing, Tasks, Monatsstatistik, Provision)
- [x] Modul-Berechtigungen (Sidebar + Routes + Admin-Matrix pro User)
- [x] Dokumentenablage (Pipeline-uebergreifend, Supabase Storage, Base64 Upload)
- [ ] Kalkulation
- [ ] Rechnungen
- [ ] Kommunikation
- [ ] KI-Summary
- [ ] Aufgaben (Frontend-Seite)
- [ ] Meldungen
- [ ] Export
- [ ] Dokumente (eigene Seite)

## Admin-Menue (14 Sektionen)
Route: `/admin`, Komponente: AdminPage.tsx mit useState<AdminSection>

### Sektionen
1. **Benutzer & Rollen** - CRUD, individuelle Modul-Berechtigungen pro User (Tabelle), Rollen-Defaults
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
- Spezial-Berechtigungen: canDelete, canExport, canImport (auch in allowedModules)
- `defaultModulesByRole` Map definiert Standards pro Rolle
- Bei Rollenwechsel: Module werden auf Defaults zurueckgesetzt (ausser explizit ueberschrieben)
- Backend: GET /users/role-defaults liefert Standardberechtigungen
- Sidebar filtert Nav-Items nach user.allowedModules (Admins sehen alles)
- App.tsx: ModuleRoute Wrapper prueft allowedModules pro Route
- useAuth: Auto-Refresh bei Window-Focus + alle 30s (Berechtigungsaenderungen greifen sofort)
- Admin-Panel: Individuelle Berechtigungs-Matrix pro User (Tabelle mit Zugriff-Toggle + Standard-Vergleich)
- Loeschen nur fuer Admins oder User mit canDelete-Berechtigung

## Dokumentenablage (Pipeline-uebergreifend)
- Alle Dokumente werden ueber `contact_id` verknuepft (nicht entity_id)
- DocumentSection zeigt ALLE Dokumente eines Kontakts gruppiert nach Phase (Lead/Termin/Angebot/Projekt)
- Upload: Base64-Konvertierung im Frontend, Supabase Storage im Backend
- Storage-Pfad: `{contactId}/{entityType}/{timestamp}_{fileName}`
- Backend: GET /documents?contactId=xxx, POST mit fileBase64 + contactId
- Hooks: useContactDocuments(contactId), useUploadDocument(), useDeleteDocument()
- Eingebaut in: LeadDetailModal, AppointmentDetailModal, DealDetailModal, ProjectDetailModal

## Angebote-Features (v2)
- Aktivitaeten-Log: Persistent, Typ (NOTE/CALL/EMAIL/MEETING/STATUS_CHANGE/SYSTEM)
- winProbability: 0-100%, Range-Slider, fliesst in gewichteten Pipeline-Wert
- followUpDate: Manuell setzbar + automatisches Follow-Up System
- Follow-Up Dismiss: Pflicht-Notiz, updatedAt wird zurueckgesetzt
- Gewonnen-Flow: Bestaetigung → Projekt (geplant: Checkliste + Upload)
- Admin kann geschlossene Deals (GEWONNEN/VERLOREN) bearbeiten und Phasen zurueckschieben
- Zugewiesen-an Spalte + Verkaufer-Filter (Admin)

## Tasks-System
- Module: LEAD, TERMIN, ANGEBOT, PROJEKT, ALLGEMEIN
- Status: OFFEN, IN_BEARBEITUNG, ERLEDIGT
- Zuweisbar: assignedTo + assignedBy (an sich selbst oder andere)
- referenceId/referenceTitle: Verknuepfung zu Lead/Termin/Angebot/Projekt

## Auto-Zuweisung
- Leads, Termine, Angebote: Bei Erstellung wird der eingeloggte User automatisch zugewiesen
- Backend-Pattern: `assigned_to: result.data.assignedTo ?? req.user?.userId ?? null`
- Admin kann Zuweisung in Detail-Modals aendern (Dropdown)

## Geplante Features (Backlog)
- Lead: km-Entfernung und Fahrzeit zum Kunden anzeigen
- Lead: Outlook-Schnittstelle fuer Termine direkt eintragen und bestaetigen
- Buchhaltung/Admin: 5% Provision auf Monatsabschluesse, druckbar
- Aufgaben: Aus jedem Tab zuweisbar, Dashboard-Integration
- Gewonnen → Projekt: Checkliste + Upload-Funktionen + Angaben pruefen
