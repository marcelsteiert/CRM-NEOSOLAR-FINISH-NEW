# NeoSolar CRM – Projekt-Anweisungen

## Projekt
PV-CRM/ERP fuer NEOSOLAR AG (Schweizer Markt). Monorepo mit client, server, shared, prisma.

## Sprache
- Code-Kommentare und UI: Deutsch (Schweiz)
- Variablen/Funktionen: Englisch
- Commit-Messages: Deutsch mit konventionellem Praefix (feat:, fix:, refactor:, perf:, chore:)

## Tech-Stack
- Frontend: React 19 + Vite + TypeScript, Tailwind CSS v4, React Router v7, React Query v5
- Backend: Express v5 + TypeScript, Supabase (PostgreSQL + Storage)
- State: Zustand (global), React Query (server state)
- API: `/api/v1/...`, api.ts Helpers (api.get, api.post, api.put, api.delete)
- Auth: JWT (bcryptjs + jsonwebtoken), useAuth Hook mit Auto-Refresh
- Tests: Vitest v4.0.18 + Supertest (541 Backend-Tests + 204 Online-E2E-Tests)
- caseMapper Middleware: Konvertiert alle DB snake_case Felder zu camelCase in API-Responses (server/src/lib/caseMapper.ts)

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

## Konventionen
- Hooks in client/src/hooks/ (useXxx.ts Muster wie useLeads.ts)
- Features in client/src/features/{modul}/ mit Hauptseite + components/ Unterordner
- Backend-Routen in server/src/routes/ (admin-Routen in routes/admin/)
- Alle Modals: fixed inset-0 z-[90], Backdrop blur, Escape-Handler
- Formulare: glass-input Klasse, btn-primary / btn-secondary Buttons
- Express Route-Order: Statische Routen VOR parametrische (z.B. /reorder vor /:id)
- Alle Entitaeten haben `contact_id` fuer Pipeline-uebergreifende Verknuepfung

## Wichtig: API camelCase
- Backend speichert in snake_case (PostgreSQL), caseMapper konvertiert zu camelCase fuer Frontend
- Frontend-Interfaces MUESSEN camelCase verwenden (contactId, fileName, entityType, createdAt)
- NIEMALS snake_case in Frontend-TypeScript-Interfaces verwenden
- Sidebar-Filter: allowedModules hat Prioritaet ueber Feature Flags

## Workflow
- Aenderungen automatisch durchfuehren ohne Bestaetigung zu verlangen
- Nach jedem abgeschlossenen Feature/Stand: Git commit
- TypeScript vor dem Commit pruefen:
  - Client: `npx tsc --noEmit -p client/tsconfig.app.json`
    (NICHT `-p client` – client/tsconfig.json hat `"files": []` und prueft nichts)
  - Server: `npx tsc --noEmit` im server/
  - Achtung: der Client hat rund 95 bestehende Fehler. Vor dem Commit
    die Ausgabe nach den eigenen Dateien filtern und die Zahl vergleichen,
    damit keine neuen dazukommen.
  - Besonders auf TS2304 (Cannot find name) achten – das sind echte
    Laufzeit-Abstuerze, die der Vite-Build nicht bemerkt.

## Module (Status)
- [x] Lead Hub (After Sales Tab, Termin-Typ Filter, responsive)
- [x] Kaltakquise (Tabs: Alle/Heisse Leads/B2C/B2B/Solaranfragen)
- [x] Termine Hub (Checkliste, Termin→Angebot, Fahrzeit)
- [x] Richtofferten Hub (eigener Tab, appointment_type='RICHTOFFERTE')
- [x] No-Show Hub (eigener Hub fuer NO_SHOW Termine mit Rueckruf-Tracking)
- [x] Angebote Hub (Aktivitaeten-Log, winProbability %, Follow-Up, Dismiss)
- [x] Projekte (Kanban, Detail-Modal mit Tabs, Auto-Konvertierung Deal→Projekt)
- [x] **Baustellen + Kalkulation** (NEU – ersetzt PV-Rechner, siehe unten)
- [x] **Personal / HR** (NEU – Mitarbeiter-Stammdaten + Personalakte)
- [x] **Firmenablage** (NEU – interne Dokumente, nur Admin)
- [x] Provision (Monatsstatistiken, exakte CHF-Anzeige)
- [x] Tasks-System (Kanban-Board, Listenansicht, KPI-Stats, TaskSection in allen Detail-Modals)
- [x] Sidebar (Expandable + Mobile Drawer + allowedModules Filter)
- [x] Admin-Menue (15 Sektionen mit linker Tab-Navigation)
- [x] Features-Seite (togglebare Module, persistent in settings.feature_flags)
- [x] Modul-Berechtigungen (Sidebar + Routes + Admin-Matrix pro User)
- [x] Dokumentenablage (6 fixe Ordner pro Kontakt – siehe unten)
- [x] Dokumente Hub (zentrale Liste nach Ordner gruppiert)
- [x] Export-Center (CSV/JSON fuer 8 Entitaeten)
- [x] Callcenter-Dashboard (Lead/Termin-Stats pro User, Daily-Stats)
- [x] Globale Suche (TopBar Cmd+K, Volltext ueber Kontakte)
- [x] **Solarberatung & Verkaufsrechner** (NEU – gefuehrte Praesentation + oeffentlicher Rechner)
- [ ] Rechnungen
- [ ] KI-Summary (Modul existiert, aktuell ueber Feature-Flag deaktiviert)

## Sidebar-Struktur (allNavGroups in Sidebar.tsx)
- **Vertrieb**: Leads, Kaltakquise, Termine, Richtofferten, No Show, Angebote, Provision
- **Planung**: Kalender, **Kalkulation** (= Baustellen + Kalkulation Tabs), **Solarberatung**, Projekte
- **Betrieb**: Tasks (KI-Summary + Kommunikation aktuell ausgeblendet)
- **System**: Meldungen, Callcenter, Admin, **Firma** (admin-only), **Personal** (mit Berechtigung), Export, Dokumente, Passwoerter, Features

## Baustellen + Kalkulation (NEU)
Ersetzt das alte PV-Anlagen-Rechner-Modul (`/calculations` ist jetzt umfunktioniert).

### Architektur
- Datenbasis: `projects` (1:1) + zwei schmale Tabellen
  - `project_construction` – Workflow-Tracking (Bewilligungen/Termine/Status)
  - `project_calculation` – Finanzen (Material, VK, Marge, Tranchen, Provisionen)
- Sortierung: `project_construction.display_order` (NULL = NEU → ganz oben sortiert nach createdAt DESC, sonst Excel-Reihenfolge ASC)

### Module (separate Berechtigungen)
- `baustellen` – Workflow-Tab (sichtbar fuer ADMIN/GL/PROJEKTLEITUNG)
- `kalkulation` – Finanzen-Tab (NUR ADMIN/GL)

### Routes
- `/baustellen` → CalculationsPage(defaultTab='baustellen')
- `/kalkulation` → CalculationsPage(defaultTab='kalkulation')
- `/calculations` (Legacy) → faellt auf erlaubten Tab zurueck

### Backend
- `server/src/routes/admin/projectTracking.ts`
  - GET /api/v1/admin/project-tracking – Liste mit Construction + Calculation, Calculation wird gefiltert wenn nur baustellen-Berechtigung
  - PUT /:projectId/construction – Workflow upsert (erfordert baustellen)
  - PUT /:projectId/calculation – Finanzen upsert (erfordert kalkulation)

### Provisions-Aufteilung (in project_calculation)
- `provision_verkaeufer_prozent` (default 5)
- `provision_gl_prozent` (default 3)
- `provision_innendienst_prozent` (default 2)
- Marge-Formel: `VK − Total Kosten − Verkaeufer% − GL% − Innendienst%`
- Pro Baustelle inline ueberschreibbar via ProvCell-Component

### Frontend
- client/src/features/calculations/CalculationsPage.tsx (Tab-Switcher)
- client/src/features/calculations/components/BaustellenTable.tsx
- client/src/features/calculations/components/KalkulationTable.tsx
- client/src/features/calculations/components/StatusPill.tsx (StatusPill, DateCell, TextCell, NumberCell)
- client/src/hooks/useProjectTracking.ts (mit margeChf, totalKosten, trancheBetrag, provisionVerkaeufer/Gl/Innendienst Helpers)

### UI-Features
- Sticky thead + sticky first column beim Scrollen
- Status-Pills (Ja/Nein) klickbar – setzt automatisch heutiges Datum
- Tranchen-Zellen mit Mini-Menue (Kassiert/Fakturiert/Reset heute)
- Footer-Summen + Zusammenfassungs-Block (A1/A2/A3 nach Status)
- Filter: Suche, "Nur Fehlt etwas", "Nur offene Baustellen"

## Personal / HR-Modul (NEU)
- Modul-ID: `personal` (default fuer ADMIN/GL, einzeln pro User freischaltbar)
- DB-Tabelle: `personnel` (Stammdaten, Vertrag, Bank, Notfallkontakt)
- Personalakte mit 8 Ordnern: Arbeitsvertrag, Lohnabrechnungen, Zeugnisse, Diplome, AHV/Versicherung, Krankheit/Unfall, Spesen, Sonstiges
- Backend: server/src/routes/personnel.ts (CRUD + archive/restore + Berechtigungs-Guard)
- Frontend: client/src/features/personnel/{PersonnelPage, PersonnelDetailModal, PersonnelFormModal}.tsx
- Hook: client/src/hooks/usePersonnel.ts
- Document-Section: client/src/components/ui/PersonnelDocumentSection.tsx
- Route: `/personnel` mit ModuleRoute('personal')

## Firmenablage (Internal Documents) (NEU)
- Modul-ID: implizit – nur ADMIN/GL via AdminRoute
- 9 Ordner: Statuten/Gruendung, Versicherungen, Lieferantenvertraege, Bewilligungen, Buchhaltung, IT-Lizenzen, Marketing, Vorlagen, Sonstiges
- Storage-Pfad: `internal/{folder}/{timestamp}_{fileName}` (kein Kontakt-Bezug)
- Documents-Tabelle: `entity_type='INTERNAL'`, `entity_id='company-vault'`
- Frontend: client/src/features/company/CompanyVaultPage.tsx + InternalDocumentSection.tsx
- Route: `/company` mit AdminRoute

### Documents-Sicherheits-Hardening
Backend (`server/src/routes/documents.ts`) prueft `entity_type` auf jedem Endpoint:
- INTERNAL → nur ADMIN/GL (canSeeKalkulation/canAccessEntityType-Helper)
- PERSONAL → ADMIN/GL oder allowedModules.personal
- GET ohne entityType: filter INTERNAL/PERSONAL automatisch raus fuer Nicht-Admins

## Admin-Menue (15 Sektionen)
Route: `/admin`, Komponente: AdminPage.tsx

1. Benutzer & Rollen (CRUD, Berechtigungs-Matrix pro User, Rollen-Defaults)
2. Firmenstandorte
3. Pipeline-Verwaltung (CRUD Pipelines + Buckets)
4. Stammdaten/Preisdatenbank
5. Tag-Verwaltung
6. Automations-Regeln
7. Integrationen
8. Webhook-Verwaltung
9. Dokumenten-Vorlagen (Ordner CRUD + Rollen-Berechtigungen)
10. Benachrichtigungen (Event-Toggles)
11. Firmen-Branding
12. KI-Einstellungen
13. Audit-Log
14. Datenbank & Export
15. Projekt-Kanban Spalten (Custom-Spalten + Phasen-Vorlagen)

## Solarberatung & Verkaufsrechner (NEU)
Gefuehrte Beratung fuer den Kundentermin (Zoom/vor Ort) mit Live-Rechner.
Inhalte aus "Neosolar Verkaufspraesentation_v2" in einen interaktiven Ablauf ueberfuehrt.

- Modul-ID: `solarberatung` (ADMIN/GL/VERTRIEB/CLOSER)
- Routes: `/solarberatung` und `/solarberatung/:contactId` (mit Kundenbezug)
- **Oeffentlich: `/rechner`** – Selbstrechner fuer die Homepage, ohne Login.
  Anfragen landen als Lead mit Quelle HOMEPAGE (Honeypot + Rate-Limit 5/10 Min pro IP).

### Praesentationen (oeffentlich, per Link teilbar)
- `/praesentation` – Auswahl der beiden Strecken
- `/praesentation/verkauf` – 21 Folien mit den Originalbildern aus der PPTX
  (Produkte, Team, App, Dachanalyse, Workflow)
- `/praesentation/premium` – 12 Folien, zahlengetrieben
- `?kunde=Familie%20Muster` personalisiert die Titelfolie
- Bedienung: Pfeiltasten/Leertaste blaettern, `F` schaltet Vollbild
- Beide enthalten denselben Live-Rechner; die Reglerwerte gelten fuer alle
  Folgefolien inklusive Druckofferte
- Bilder: `client/public/praesentation/` – aus der PPTX extrahiert und
  komprimiert (26 MB -> 1.5 MB, Skript-Ansatz: System.Drawing, max 1800px, Q82)
- Komponenten: `features/praesentation/PraesentationPage.tsx`,
  Folien in `features/salespitch/components/Folien{,2,Bilder}.tsx`

### Rechen-Engine
`client/src/lib/pvCalculator.ts` – laeuft im Browser, damit die Regler ohne Latenz reagieren.
Liefert Ertrag, Eigenverbrauch, Autarkie, Amortisation, Kapitalwert, IRR und
Stromgestehungskosten (LCOE) plus Jahresverlauf ueber den Betrachtungszeitraum.
- Autarkie ist ueber `maxAutarkiegrad` (Standard 80 %) gedeckelt: ohne Saisonspeicher
  ist Vollautarkie in der Schweiz nicht erreichbar – verhindert falsche Versprechen.
- Eigenverbrauchsquote per Stuetzwert-Interpolation, Speicherbeitrag physikalisch
  begrenzt (Kapazitaet x Zyklen x Wirkungsgrad).

### Annahmen (belegt, im Admin aenderbar)
- Strompreis: ElCom-Median H4 2026 = 27.7 Rp./kWh, Steigerung 2 %/Jahr
- Foerderung: Pronovo EIV 2026, ca. 360 CHF/kWp bis 30 kWp, darueber ca. 300
- Preise: abgeleitet aus 14 echten Kalkulationen (Ø VK CHF 32'830).
  **Die kWp-Werte waren in den Projekten nicht erfasst** – die Staffel ist ueber die
  Gesamtsummen plausibilisiert und sollte fachlich geprueft werden.
- Deutsche Regelungen (EEG-Verguetung, MwSt-Befreiung, Negativpreis-Kuerzung)
  wurden bewusst NICHT uebernommen – sie gelten in der Schweiz nicht.

### Ablauf (16 Schritte)
Begruessung → Ablauf → Beduerfnisse → Warum NEOSOLAR → Strombedarf steigt →
Strompreise → **Kosten ohne Anlage** → Komponenten → **Rechner mit Reglern** →
Anlage-Uebersicht → Energiefluss → Nutzen → **Variantenvergleich** →
Planungssicherheit → Umsetzung → Fragen

Der Rechner kommt bewusst NACH der Kostenfolie: der Kunde soll den Vergleichswert
im Kopf haben, bevor er den Preis sieht.

### Verkaeufer- vs. Kundenansicht
Umschaltbar per Klick. In der Kundenansicht sind Rendite, IRR und Kapitalwert
ausgeblendet; Preise erscheinen erst ab der Anlagenplanung.

### Ausgabe
- "Offerte drucken": zweiseitige Richtofferte, per Browser-Druck als PDF speicherbar
  (`components/OffertenDruck.tsx`, kein zusaetzliches PDF-Paket)
- "Offerte ins CRM": legt ein Angebot beim Kontakt an, mit dem kompletten
  Rechenstand als Snapshot in der Notiz. Spaetere Preisaenderungen veraendern
  bestehende Offerten dadurch nicht.

### Preise pflegen
Admin → **Rechner-Preise** (`settings.calculator_pricing`).
Backend: `server/src/routes/admin/calculatorPricing.ts` (GET fuer alle
authentifizierten User, Schreiben nur ADMIN/GL), `server/src/routes/publicCalculator.ts`.

### Bewusst nicht umgesetzt
Geo-/Dachplaner mit Modulplatzierung, 3D-Verschattung, 8760-Stunden-Simulation,
digitale Signatur mit Online-Offerte, Produktkatalog mit Kompatibilitaetsmatrix,
Stringplanung. Jeweils eigene Ausbaustufe.

## Rollen & Berechtigungen
- UserRole: ADMIN, VERTRIEB, PROJEKTLEITUNG, BUCHHALTUNG, GL, SUBUNTERNEHMEN, **CLOSER**, **SETTER**
- Jeder User hat `allowedModules: string[]` fuer individuelle Berechtigungen
- Spezial-Berechtigungen (auch in allowedModules): canDelete, canExport, canImport, canViewAllLeads/Appointments/Deals/Projects/Tasks, canEdit, canAssign
- `defaultModulesByRole` in server/src/routes/users.ts
- Bei Rollenwechsel: Module werden auf Defaults zurueckgesetzt
- Sidebar filtert Nav-Items nach user.allowedModules (Admins sehen alles)
- App.tsx: ModuleRoute Wrapper prueft allowedModules pro Route, AdminRoute fuer admin-only
- useAuth: Auto-Refresh alle 2 Min + bei Window-Focus

### Modul-IDs (komplett)
dashboard, leads, kaltakquise, appointments, richtofferten, noshow, deals, provision, calendar, **baustellen**, **kalkulation**, projects, tasks, admin, callcenter, communication, documents, passwords, **personal**, export

## Dokumentenablage (Pipeline-uebergreifend)
- Alle Kunden-Dokumente werden ueber `contact_id` verknuepft
- DocumentSection (in allen Detail-Modals): **6 fixe Ordner**
  - Vertraege, Termin, Gemeinde, Elektro, Foerderungen, Anlagendokumentation
  - Plus "Sonstiges" als Fallback fuer Legacy-Docs ohne folder_path
- Upload: Direkt zu Supabase Storage (kein Base64-Umweg, kein Function-Timeout)
- Storage-Pfad: `{contactId}/{folder}/{timestamp}_{fileName}` bzw. `personnel/{personnelId}/{folder}/...` bzw. `internal/{folder}/...`
- Backend: server/src/routes/documents.ts mit metadata-Endpoint fuer Direct-Upload-Pattern
- Hooks: useContactDocuments(contactId), usePersonnelDocuments(personnelId), useInternalDocuments()
- Eingebaut in: LeadDetailModal, AppointmentDetailModal, DealDetailModal, ProjectDetailModal, PersonnelDetailModal, CompanyVaultPage
- Ordner-Berechtigungen: allowedRoles pro Ordner (leer = alle), Admin/GL sehen immer alles

## Documents-Hub
- Route `/documents`, gruppiert nach Ordner statt Phase
- Filter: "Alle Ordner" + 6 fixe + "Sonstiges"
- Volltextsuche ueber Dateiname/Notes/folder_path

## Globale Suche
- Backend: GET /api/v1/search?q=... – sucht Kontakte (Name, Email, Telefon, Firma, Adresse)
- Liefert verknuepfte Leads, Projekte, Deals, Termine pro Kontakt
- Frontend: TopBar.tsx – Cmd+K/Ctrl+K Overlay mit Live-Suche, Tastatur-Navigation
- Sichtbar fuer: Admin, GL, Projektleitung + User mit search-Modul

## Tasks-System (Frontend + Backend)
- Module: LEAD, TERMIN, ANGEBOT, PROJEKT, ALLGEMEIN
- Status: OFFEN, IN_BEARBEITUNG, ERLEDIGT
- Prioritaet: LOW, MEDIUM, HIGH, URGENT
- Frontend: TasksPage (Kanban + Listenansicht), TaskSection in Detail-Modals
- Hooks: client/src/hooks/useTasks.ts
- Backend: server/src/routes/tasks.ts

## Meldungen-System (Notifications)
- 13 Notification-Typen: LEAD_CREATED, LEAD_ASSIGNED, APPOINTMENT_REMINDER/CONFIRMED, DEAL_STATUS_CHANGE/WON/LOST, FOLLOW_UP_DUE, TASK_ASSIGNED/OVERDUE, PROJEKT_UPDATE, DOCUMENT_UPLOADED, SYSTEM
- Automatische Erzeugung: Fire-and-forget bei Lead/Task/Deal/Projekt-Events
- NotificationService: server/src/lib/notificationService.ts (Settings-Cache 1min TTL)
- TopBar-Glocke: NotificationBell mit letzten 5 Meldungen
- Hooks: useNotifications mit 30s Polling

## Auto-Zuweisung
- Leads, Termine, Angebote: Bei Erstellung wird der eingeloggte User automatisch zugewiesen
- Backend-Pattern: `assigned_to: result.data.assignedTo ?? req.user?.userId ?? null`

## Performance-Optimierungen (06.05.2026)
### DB-Indexes (~25 angelegt)
- `leads(source, status)` partial WHERE deleted_at IS NULL
- `leads(assigned_to)`, `leads(created_at DESC)`, `leads(updated_at DESC)`, `leads(contact_id)`
- `contacts(lower(email))`, `contacts(phone)`, `contacts(last_name)`, `contacts(company)`
- Trigram-Indexes (`pg_trgm`) auf contacts.first_name/last_name/email/company fuer ILIKE %search%
- `lead_tags(tag_id)`, `lead_tags(lead_id)`
- `appointments(status, appointment_type)`, `appointments(assigned_to)`, `appointments(created_at)`
- `deals(stage, assigned_to)`
- `documents(contact_id)`, `documents(entity_type, entity_id)`
- `tasks(assigned_to)`, `tasks(module)`, `activities(contact_id)`

### Frontend Cache-Tuning (main.tsx)
- React Query staleTime: 2 Min
- gcTime: 15 Min
- refetchOnMount: false (Tab-Wechsel zeigt sofort cached)

### CDN (netlify.toml)
- /assets/* (Vite hashed) → 1 Jahr immutable
- Fonts → 1 Jahr immutable
- Bilder → 30 Tage
- index.html → no-cache

## Supabase
- Projekt-ID: `tzoquorcgygmrougevgm` (CRM-NEOSOLAR-FINISH-NEW)
- Storage Bucket: `documents` (oeffentlich, fuer alle Dokumenten-Uploads inkl. Personnel + Internal)
- Custom RPCs: `get_leads_sorted`, `count_leads_by_tag`, `get_lead_ids_by_tag`, `callcenter_lead_stats`, `callcenter_appointment_stats`, `callcenter_daily_stats`, `callcenter_user_daily`, `callcenter_call_stats`

## User (Produktiv – Stand 06.05.2026)
| ID | Name | Rolle | E-Mail |
|---|---|---|---|
| u006 | Marcel Steiert | ADMIN | marcel.steiert@neosolar.ch |
| 10f8248c-... | Roberto Reho | GL | roberto.reho@neosolar.ch |
| e3d2e915-... | Jon Turnes | GL | jon.turnes@neosolar.ch |
| 5a4f0dfb-... | Andreas Boehler | VERTRIEB | andreas.boehler@neosolar.ch |
| d77f0a56-... | Eileen Moewe | VERTRIEB | eileen.moewe@neosolar.ch |
| 380c9cbd-... | Bahar Oezdem | SETTER | bahar@neosolar.ch |
| c8ddceed-... | Deniz Algan | SETTER | deniz@neosolar.ch |
| 0e4c825b-... | Tanja Weber | CLOSER | tanja.weber@neosolar.ch |
| 772f6baf-... | Ivana Smakaus | PROJEKTLEITUNG | ivana.smakaus@neosolar.ch (inaktiv) |
| 93d8b7c7-... | Irmak Kahraman | PROJEKTLEITUNG | irmak.kahraman@neosolar.ch |
| 7cdc21a4-... | Sergej Solar-EK | SUBUNTERNEHMEN | info@solar-ek.ch |

## Tags (DB)
| ID | Name | Farbe |
|---|---|---|
| ka-heiss | Heisse Leads | #F87171 |
| ka-b2b | B2B Firmen | #60A5FA |
| ka-b2c | B2C Privat | #34D399 |
| ka-solar | Solaranfragen | #F59E0B |
| 1ff9b6a0-... | Abtelefonieren Tag1 | #FB923C |
| f5a9f35b-... | Abtelefonieren Tag 2 | #A78BFA |
| 7ef3139c-... | Abtelefonieren Tag 3 | #A78BFA |
| 2eb3c7de-... | Email gesendet | #60A5FA |
| 00457c0e-... | nicht mehr kontaktieren!!! | #F87171 |

## DB-Backup-Strategie
- **Stammdaten** (users, personnel, settings, tags, project_construction/calculation): in `DB_SNAPSHOT_2026-05-06.sql` als Wiederherstellungspunkt
- **Grosse Tabellen** (leads/contacts/lead_tags/etc.): Supabase Daily Backup (Dashboard → Database → Backups)
- **PITR**: optional kostenpflichtig fuer minutengenaue Restores
- Bei Restore: Supabase-Dashboard → Backup zurueckspielen → falls noetig DB_SNAPSHOT.sql via SQL-Editor anwenden

## Geplante Features (Backlog)
- Lead: km-Entfernung und Fahrzeit zum Kunden anzeigen
- Lead: Outlook-Schnittstelle fuer Termine direkt eintragen und bestaetigen
- Buchhaltung/Admin: Provisions-Auszahlung pro Closer (Closer-Vertrag §4 mit 5/6%-Staffel + 20k-Bonus)
- Gewonnen → Projekt: Erweiterte Checkliste + Upload-Pruefung
- Rechnungen-Modul
- Virtual Scrolling fuer lange Lead-Listen
