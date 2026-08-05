# Änderungsverlauf

Jeder Arbeitstag mit allen Änderungen dieses Tages, neueste zuerst.
Das Projekt hat keine Versionsnummern – ausgeliefert wird laufend auf
https://neosolar-crm.com.

**375 Änderungen** vom Dienstag, 3. März 2026 bis Dienstag, 4. August 2026
an 45 Arbeitstagen.

Erzeugt mit `node tools/changelog.mjs`. Der aktuelle Arbeitsstand steht in
[PROJEKTSTAND.md](PROJEKTSTAND.md), der Gesprächsverlauf unter [docs/verlauf/](docs/verlauf/).

---

## August 2026

### Dienstag, 4. August 2026

**Neu**

- vollstaendige Praesentation fuer externe Kunden im Selbstplaner `c500d77`
- die komplette Verkaufspraesentation als Kundenfassung `c5caf40`

**Behoben**

- Offerte druckt alle sieben Seiten und laesst sich herunterladen `52fbf52`
- Offerte bricht sauber um, Bestellseite passt auf ein Blatt `3ee62c8`
- Offerte als echte Seiten statt zerschnittenem Bild `b715e58`
- Seiten werden vollstaendig gerendert, Bildschirmansicht als Blaetter `863a6d0`

### Montag, 3. August 2026

**Neu**

- automatische Mails laufen ueber info@neosolar.ch `43b7128`
- Nachfassen mit Freigabeschalter, Trockenlauf und Stufen im Admin `31e082e`
- Selbstplaner fuer Kunden und Kampagnenversand an Leads `fa16ef8`

**Behoben**

- Chat-Export maskiert auch Azure-Clientgeheimnisse `7c38f70`

### Sonntag, 2. August 2026

**Unterlagen**

- Projektstand und Gespraechsverlauf im Repository `fe76890`
- Changelog ergaenzt, CLAUDE.md auf den aktuellen Stand gebracht `2ff8aa3`
- Changelog tagesgenau aus der Git-Historie erzeugt `d8ccbff`

### Samstag, 1. August 2026

**Neu**

- Offerte wird als PDF abgelegt, Beratung laesst sich fortsetzen `77a0aba`

**Behoben**

- Ablage der Offerte funktioniert - falscher Entity-Typ und Ordner `1276e3e`

## Juli 2026

### Freitag, 31. Juli 2026

**Neu**

- Dachbelegung mit Luftbild, Sperrflaechen und Wechselrichter-Auslegung `a0b423a`
- Unterkonstruktion waehlbar, Adresse laedt das Dach automatisch `bcd00d6`
- Dachplaner mit mehreren Flaechen, echten Modulen und Bemassung `eacbce8`
- Module einzeln ziehen, Dachflaeche an der Umrandung anfassen `ce56ca9`
- Module markieren und gemeinsam verschieben `f8b48fd`
- Module stufenlos verschieben statt nur um ganze Rasterfelder `675cd83`

**Behoben**

- config-Prop im RechnerPanel und zwei weitere Laufzeitfehler `4e84bec`
- Flaechen bleiben liegen, Einstellungen wirken auf vorhandene Module `a85fd1a`
- Dachauslegung bleibt beim Blaettern erhalten `b1e4ac3`

### Donnerstag, 30. Juli 2026

**Neu**

- Modul Solarberatung - gefuehrte Praesentation mit Live-Rechner `b456b1b`
- Oeffentlicher Solarrechner und druckbare Richtofferte `eb453a2`
- Zwei Online-Praesentationen mit den Originalbildern `32a2c02`
- Beide Praesentationen zu einer Abschluss-Strecke zusammengefuehrt `d0f9208`
- Rechner durchgaengig, mehr Beweisfolien, Design ueberarbeitet `1539e24`
- Referenzen, Zusatzrechner, generierte Stimmungsbilder `4917279`
- Praesentation direkt aus dem Termin starten, Angebot mit einem Klick `3b2a6f0`
- Offertenversand per E-Mail mit Signatur und automatischer Ablage `bb23721`
- Automatisches Nachfassen bei offenen Angeboten `c5c65b6`
- Sechs E-Mail-Vorlagen im Offertenversand `8bacf67`
- Offerte mit Zusatzpositionen, Zahlungsplan und allen Beteiligten `0174033`
- Kundendaten pruefbar und editierbar, Offerte visuell `2aff6d2`
- Speicher-Ausbau, Betreuung und Weiterempfehlung `23cb5e8`
- Zufriedenheitspaket, Aktionsrabatt und echte Zahlungsoptionen `3dbcf11`
- Technische Daten und Vertragsrechte aus der bestehenden Offerte `1d4ee28`
- Monatsertrag und Amortisationsverlauf als Grafiken in der Offerte `18d62bd`
- Offerte nach dem Aufbau der bestehenden NEOSOLAR-Offerte `91b0e5e`
- Offerte vervollstaendigt mit echten Komponentenpreisen und Grafiken `be9d6de`
- Gestapeltes Monatsdiagramm und die beiden Energiefluesse `289215b`
- Offerte in klare A4-Seiten gegliedert mit Zusammenfassung und Inhalt `27a9a36`
- Bestellseite mit Unterschrift von Kunde und NEOSOLAR `825beb9`

**Behoben**

- Honeypot antwortet still statt mit 400 `178875f`
- Richtige Produktbilder, lesbares Logo, korrekte Geschaeftsleitung `52da534`
- Referenz-Kacheln zeigen Anlagen statt eigener Folien `7e171bd`
- Offerte zeigt die vollstaendigen Kundendaten `a156880`
- durchgehend mit den Kosten inkl. MWST rechnen `121e6d4`
- alle Zusatzkomponenten sauber in die Offerte rechnen `0916d47`

**Unterlagen**

- Solarberatung in CLAUDE.md dokumentiert `f21d92d`
- Solarberatung in der Sidebar-Struktur ergaenzt `e59844a`
- Praesentations-Routen in CLAUDE.md dokumentiert `23f2892`

### Freitag, 17. Juli 2026

**Behoben**

- Verloren-Leads besser sichtbar - Tab-Labels + Bestaetigungs-Message `0d6d07a`

## Juni 2026

### Donnerstag, 25. Juni 2026

**Behoben**

- Sync-Dedup-Logik - maybeSingle -> limit(1) verhindert Duplikate-Explosion `6108b4e`

### Montag, 22. Juni 2026

**Neu**

- Baustellen erweiterte Filter + Excel mit GBA/SINA/MPP/Pronovo `15feff4`
- Baustellen Filter-Panel mit allen 15 Status-Feldern (gruppiert) `f718b6f`

### Donnerstag, 18. Juni 2026

**Neu**

- Google-Sheet Lead-Sync Endpoint `6da958e`
- Sync-Quelle 'Sebastian' statt HOMEPAGE `1dbeea1`
- Leads-Liste auto-refresht alle 60s (Live-Sync sichtbar ohne F5) `2f73660`

### Freitag, 12. Juni 2026

**Neu**

- 'Heiss'-Tab in Anrufliste fuer interessierte Kunden `6653364`

**Behoben**

- Anrufliste-Layout - Stats + doppelte Filter ausblenden `ff6c85b`

### Donnerstag, 11. Juni 2026

**Neu**

- Anrufliste-View auf Deals-Seite (live + bidirektional) `9c589dc`
- Follow-up Reminder-Button in Anrufliste `9251352`

**Behoben**

- Anrufliste sortiert nach createdAt DESC (neueste zuoberst) `edbfad0`

### Mittwoch, 10. Juni 2026

**Neu**

- Excel-Export-Button im Baustellen-Tab mit CRM-Farben `4ee669e`
- GBA/SINA/MPP/Pronovo-Spalte in Baustellen-Tab + DB-Daten importiert `eae94fb`
- 'SINA fehlt'-Filter-Button in Baustellen-Tab `949a48b`
- Baustellen-Layout neu - GBA vorne, SINA/MPP hinten, Pronovo aufklappbar `fb9a350`
- Spalten-Gruppen aufklappbar in Baustellen-Tabelle `75c977c`

### Dienstag, 2. Juni 2026

**Behoben**

- Angebote-Seite zeigt alle Deals - pageSize 100 -> 500 `c327143`
- Deals-API pageSize-Cap 100 -> 500 `e3489e9`

## Mai 2026

### Freitag, 8. Mai 2026

**Neu**

- No-Show-Button im Angebote-Detail (Deal) `636850c`

### Donnerstag, 7. Mai 2026

**Neu**

- Premium Page-Header auf Hauptseiten (Phase 4) `f3a76b0`
- Premium Headers auf allen Pages (Phase 5a) `0028ae4`
- Globaler CSS-Polish (Phase 5b) `6c33c09`
- Light-Theme komplett entfernt + Polish-Welle (Phase 5c) `f963879`
- Final Polish-Welle (Phase 5d) `632b10b`
- 3 Module aus UI entfernt (Features, Kommunikation, KI-Summary) `e742f30`
- Provision-Override pro Deal (provision_rate) `ec1afa1`
- Provisionen-Seite komplett premium redesign `9dd4f46`
- Anruf-Button im Lead-Detail + alle Lead-Aktivitaeten geloescht `6cb4aef`
- heisse Leads sortieren - Vor+Nachname zuoberst `0868e37`

**Behoben**

- Provisionen-Layout fuer Print/Mobile saubere Darstellung `de01452`
- KI-Zusammenfassung aus Detail-Modals entfernt + Print-KPI-Font `80e5c89`
- Modals via React Portal direkt unter document.body `2c612db`

### Mittwoch, 6. Mai 2026

**Neu**

- Kalkulation komplett neu – Baustellen-Tracker + Excel-Kalkulation (Admin-only) `3158b7e`
- Baustellen+Kalkulation sortieren nach zuletzt bearbeitet (max updated_at) `1e333a2`
- Baustellen + Kalkulation als 2 separate Module `07cac9b`
- Tabellen-Header bei Baustellen+Kalkulation sticky beim Scrollen `0bbf0c5`
- Sidebar nur 1 Kalkulation-Eintrag + Excel-Kalkulation importiert `b80592a`
- 3 Provisions-Spalten in Kalkulation – Verkaeufer 5% / GL 3% / Innendienst 2% `d2bfe3d`
- Lead-Sortierung — Eintraege mit Vor+Nachname zuerst, Tags geleert `1ff0b29`
- Premium Dashboard mit Bento Grid + AI-Insights (Phase 1+2) `a302efe`
- Sidebar + TopBar Premium-Redesign (Phase 3) `dd70e30`

**Behoben**

- Baustellen-Liste leer – contacts.city/zip gibt es nicht `2f720b6`
- Baustellen-Liste – 'Unbekannt' fallback auf Projekt-Name `f3ddb15`
- Tabellen-Header sticky am Top — eigener Scroll-Container statt Page-Scroll `7ed63c7`
- Termine-Stats 'Anstehend' synchron mit angezeigter Liste `a8a6f3a`

**Schneller**

- DB-Indexes + Cache-Tuning + CDN-Headers + Features ausgeblendet `b1ea490`

**Unterlagen**

- CLAUDE.md aktualisiert auf Stand 06.05.2026 `9eb565c`

**Wartung**

- DB-Snapshot vom 06.05.2026 als Wiederherstellungspunkt `6f7601e`

**Sonstiges**

- Lead-Sortierung 'Vor+Nachname zuerst' rueckgaengig `2b69712`

### Dienstag, 5. Mai 2026

**Neu**

- Dokumentenablage mit 6 festen Ordnern strukturiert `7243566`
- Personal-Modul (HR) komplett `60f6262`
- Firmenablage (Company Vault) – wichtige interne Dokumente, nur Admin `1f6cdb8`

**Behoben**

- FolderQuestion durch HelpCircle ersetzt (lucide-react Export-Fehler) `dd11b3e`

### Montag, 4. Mai 2026

**Neu**

- Projekt-Kanban Admin-Sektion (Spalten konfigurierbar) `36e3499`
- Projekt-Kanban Spalten hinzufuegen + loeschen `47d0d6c`
- Phasen-Vorlagen-Button mit 10 vordefinierten PV-Phasen `e0ab009`
- '+ Spalte hinzufuegen' direkt im Projekte-Kanban `891b052`

**Behoben**

- Aktivitaeten im Projekt speichern jetzt korrekt `a624c78`
- phaseColors/phaseLabels Renaming hat ProjectsPage gebrochen `f56695d`
- computePhaseProgress crash bei Custom-Phasen `b127108`
- Projekt-Kanban-Spalten fuer alle User lesbar (nicht nur Admin) `85aec7f`

### Freitag, 1. Mai 2026

**Behoben**

- 'Angebot erstellen'-Bug + Followup-Logik entfernt `48de93b`

**Wartung**

- .claude/ komplett gitignoren `1531fba`

## April 2026

### Mittwoch, 29. April 2026

**Neu**

- Admins + Projektleitung koennen Projekte direkt eroeffnen `38b502f`
- Schoenerer 'Neues Projekt'-Button mit Glow + Rotate-Animation `1d6491a`
- Kundenportal direkt aus Angebot/Deal aktivierbar `9457137`
- Spezielles Angebots-Layout im Kundenportal `0c31b6c`
- Permanenter Login-Link statt Single-Use Magic-Link `8e082b9`
- Fokussierte Angebot-Ansicht im Deal Portal-Tab `08d240c`
- Verkaeufer-Signatur + Externe Doc-Links + Portal-Hero verbessert `5065235`
- Datei-Upload und Link-Eingabe gleichzeitig sichtbar (kein Toggle mehr) `0984a9d`
- Echte NeoSolar AG Adresse + Telefon in Defaults `46ddc83`
- Kuerzere Login-Links + Reaktivierung im Deal-Modal `cee3b37`
- Firmen-Telefon als Fallback im Ansprechpartner-Block `8b6da90`

**Behoben**

- inOfferMode pruefte falsche deal-Spalte (status statt stage) `b4a71d4`
- Portal-Routes auch fuer Verkaeufer + Projektleitung freigegeben `97208de`
- E-Mail-Validierung + Adress-Min-Length + Search-Performance `9276a5a`
- useSetupPortalFromDeal invalidates auch admin-portal cache `755cea8`

**Wartung**

- Custom Domain neosolar-crm.com einrichten `acf7779`
- .claude/scheduled_tasks.lock gitignoren `71f1cac`

### Dienstag, 28. April 2026

**Neu**

- Kundenportal mit Magic-Link-Auth + Milestone-Tracking `15309a4`
- NeoSolar Logo im Kundenportal + E-Mail-Templates `4485a6c`
- Magic-Link manuell generieren + kopieren (ohne automatische Mail) `88a0915`
- Dokumenten-Ablage im Portal-Tab mit Kategorien `c3f3ac4`
- Milestones individuell editierbar (Bezeichnung, hinzufuegen, loeschen) `cf3881a`
- Prominente Termin-Karte (Montagedatum + AC + Inbetriebnahme) `5f26f0c`
- Firmen-Kontaktdaten im Admin-Bereich bearbeitbar `becbb05`

### Montag, 27. April 2026

**Neu**

- Verloren-Button in jedem offenen Termin-Status verfuegbar `5875b21`
- Richtofferten fuer alle Verkaeufer sichtbar (kein Owner-Filter) `3832cbd`

### Mittwoch, 22. April 2026

**Neu**

- Richtofferten als eigenes Modul mit Kanban-Hub `fd3a198`
- Callcenter-Statistik – Termine und Richtofferten getrennt anzeigen `21e4f0c`
- Termin-Status NO_SHOW + Callcenter-Statistik saubere Zaehlung `c6f8512`
- No Show und Richtofferten als eigene Module + eigener No-Show-Hub `1d57dfb`
- No-Show-Workflow mit konfigurierbaren Callcenter-Phasen `2dbfc9c`
- No-Show-Termin kann im Detail-Modal wieder aktiviert werden `cee06c8`
- No-Show zurueck zu Termin mit Datum/Zeit/Typ/Adresse-Dialog `02ecaeb`
- Reschedule-Dialog mit Verkaeufer-Auswahl + Verloren-Button bei No Show `cd18185`

**Behoben**

- Termin-Suche – status.ilike entfernt (Enum-Spalte, operator error) `786d7b8`
- Termine – abgeschlossene/abgesagte per Default im Backend ausblenden `6a3d0fc`
- Richtofferten – Admins sehen per Default alle `b6c48af`
- Verkaeufer-Filter-Dropdown funktionslos in Angebote/Termine/Richtofferten `e0fc971`

### Dienstag, 21. April 2026

**Behoben**

- Termin-Suche durchsucht nun auch Kontaktdaten (Name, Firma, Email, Telefon, Adresse) `88428e4`

### Freitag, 10. April 2026

**Behoben**

- Modals im Light Mode komplett dunkel – attribute selector + Tailwind classes `d2870df`
- Alle Inputs/Textareas/Selects in Modals dunkel im Light Mode `22993cd`
- Light Mode – alle Schrift schwarz, Modals weiss mit dunkler Schrift `12cb4c7`

### Donnerstag, 9. April 2026

**Neu**

- Heisse Leads Tab in Kaltakquise + 3244 Leads importiert `6ee8d51`

**Behoben**

- Alle Detail-Modals dunkel im Light Mode – z-Index basierter Selektor `34a1207`

### Dienstag, 7. April 2026

**Behoben**

- Modals/Overlays immer dunkel – auch im Light Mode `e7e28d8`

### Mittwoch, 1. April 2026

**Schneller**

- Optimistic Updates fuer Checklisten – sofortige UI-Reaktion `94078e3`

## März 2026

### Montag, 30. März 2026

**Neu**

- Login mit Benutzername oder Vorname (case-insensitive) `fc95c2a`
- Erstellt/Bearbeitet von User-Name in Lead, Termin und Angebot Detail `f785389`
- Bearbeiten + Zuweisen Berechtigungen im Admin-Benutzerportal `f1bdaa7`
- Wer hat bearbeitet + wer hat zu Termin konvertiert `81ff539`
- Callcenter-Dashboard – Lead-Konvertierung und Termin-Performance `1b30360`
- PDF-Export pro Verkaeufer im Callcenter-Dashboard `d92ca4d`
- Callcenter Datums-Filter – Heute, Woche, Monat, Custom Range `2d093fe`
- Call-Tracking – Nicht erreicht / Termin Buttons + Callcenter-Auswertung `4b638ea`
- Callcenter als Feature-Toggle im Admin ein-/ausblendbar `106f521`
- Callcenter als Modul pro User zuweisbar im Admin-Benutzerportal `2c4f89c`
- Callcenter zaehlt wer Termin GESENDET hat, nicht wer ihn bekommt `3102c62`
- Dokumenten-Upload komplett neu – Drag&Drop + nur 4 Ordner `6003909`
- Verloren-Dialog mit Grund-Auswahl – nur echte Anrufe zaehlen `a066883`
- Terminierungsrate im Callcenter – KPI + pro User Balken `596fd78`

**Behoben**

- Globale Suche Namen sichtbar, Tag-Filter Pagination, Document-Upload Logging `3e5f2e9`
- Globale Suche komplett dunkel – alle Farben hardcoded statt CSS-Variablen `4cd86c4`
- Documents komplett auf Public URLs umgestellt – kein createSignedUrl mehr `fa8f174`
- "Alle Termine/Angebote" Button fuer User mit canViewAll-Berechtigung `0f56a69`
- Tag-Filter (Abtelefonieren Tag 1 etc.) funktioniert jetzt mit Pagination `f16e4d0`
- PDF-Export Button direkt in der Callcenter-Tabelle sichtbar `abeb2d8`
- Verloren loggt auch Anruf (ABGESAGT) im Call-Tracking `52bde91`
- Nicht-erreicht Button mit Debounce – kein Doppelklick mehr `f2856bb`
- Upload direkt zu Supabase Storage – kein Netlify Function Timeout mehr `b3c751e`
- Callcenter Detail zeigt Termine/Leads korrekt pro User `1494118`
- Uhrzeit bei Leads im Callcenter Detail + PDF anzeigen `b447715`
- Conversion KPI entfernt – Terminierungsrate reicht `f7d093f`

### Freitag, 27. März 2026

**Behoben**

- Tag-Filter (Abtelefonieren Tag 1 etc.) funktioniert jetzt mit Pagination `5d94d4c`
- Documents-Endpoint absichert gegen fehlende storage_path `1b9dca1`

### Donnerstag, 26. März 2026

**Neu**

- Spaltenfilter + Sortierung direkt in Tabellen-Header (Leads/Kaltakquise) `011646e`
- Adresse-Spalte in Lead-Tabelle hinzugefuegt `cf64f76`
- Richtofferte als dritten Termin-Typ hinzugefuegt `8a05aa3`
- Audit-Log detailliert – aufklappbare Zeilen, Diff-Viewer, Entity-Filter `b533db3`
- Duplikat-Erkennung + Performance-Optimierung + korrekte ABC-Sortierung `c1e2a4a`

**Behoben**

- Tabelle nicht mehr abgeschnitten – table-fixed mit Spaltenbreiten + Truncation `15425a3`
- Termin-erstellen Error-Handling + Spaltenbreiten Erstellt-Datum `3611a01`
- Tags-Dropdown abgeschnitten durch overflow-hidden auf td `8b3b0c3`
- Tag-Namen im Dropdown nicht sichtbar – explizite Textfarbe `c24472d`
- Suchfeld funktioniert jetzt – client-seitige Suche als Fallback `9b9df62`
- Mobile-Version komplett ueberarbeitet – Touch-Targets, Tabs, Sidebar, Padding `dfec04f`
- Leads Mobile-Ansicht komplett – Card-Layout statt Tabelle auf Handy `411ed27`
- Suche funktioniert ab 1 Buchstabe – global + Leads `482e10a`
- Spaltenheader sortiert direkt per Klick, Filter separat per Icon `73c7d1e`
- Leads ohne Namen zeigen E-Mail statt "--" an `cf5dfaa`
- RPC-Sortierung funktioniert – Enum-Cast + snake_case Feldnamen `08ea532`

**Schneller**

- Standard-PageSize von 500 auf 50 Leads reduziert `36bc2d7`
- High-End Performance – alle Seiten massiv optimiert `0e41e79`
- RPC nur noch bei Suche, Standard-Query 0.1ms statt 627ms `9333e1f`

### Mittwoch, 25. März 2026

**Neu**

- Login und User-Erstellung mit Benutzername (zusaetzlich zu E-Mail) `186a1ef`
- Kaltakquise-Modul – eigene Seite mit komplettem Lead→Termin Flow `b3b9bfb`
- Light/Dark Theme Toggle – helle und dunkle Version `3951b7c`
- Kaltakquise Tabs (B2C/B2B/Solar) + Pagination + Leads-Trennung `a6113b5`
- Kaltakquise Tabs (B2C/B2B/Solar) + Pagination + Leads-Trennung `9b53b04`

**Behoben**

- username in useCreateUser und useUpdateUser Mutation-Types `fdb835e`
- User-Erstellung – DB Role-Enum um CLOSER/SETTER/GL erweitert + Fehleranzeige `679b058`
- Kontaktdaten-Aenderungen werden jetzt in contacts-Tabelle gespeichert `51c2de2`
- Lead Kontakt-Update – NOT NULL Spalten mit leerem String statt null `69566c8`
- Lead-Suche durchsucht jetzt Kontakt-Name/Email/Telefon + Light-Mode CSS `0a43026`
- Mobile Responsive – 5 Overflow-Probleme behoben `3d835fd`
- Kaltakquise Tag-Filter komplett neu – eigene Query mit Pagination `33e5cad`
- sourceColors Fehler + Sortierung fuer alle Spalten in Leads/Kaltakquise `0137448`

**Sonstiges**

- Add files via upload `861fbfb`

### Dienstag, 24. März 2026

**Neu**

- Suche oeffnet direkt das Detail-Modal des Ergebnisses `2015438`
- Suche zeigt Lead/Termin/Angebot/Projekt Badges einzeln + klickbar `d9c26ac`
- Neue Rollen CLOSER und SETTER mit minimalen Standardberechtigungen `1f63d9a`

**Behoben**

- Feature-Flags 401 Fehler – Query nur mit Token ausfuehren `165e3d0`
- Berechtigungen greifen sofort – /auth/me liefert frisches JWT-Token `92aa7c5`
- 403-Fehler Lead-Sources/Integrations + Adresse kein Pflichtfeld `e4e4570`
- Dokumenten-Upload 500 – activities.created_by NOT NULL Guard `e800e4d`
- Dokumenten-Upload bessere Fehlermeldungen + uploaded_by Fix `42aee6a`
- Dokumenten-Upload Debug-Logging + MIME-Type Restriction entfernt `e9caf8e`
- Dokument-Upload Debug – direkte JSON-Fehler-Response `4606d87`

### Montag, 23. März 2026

**Neu**

- Tags-Spalte in Lead-Tabelle sortierbar `be44883`
- Dynamische Lead-Quellen-Verwaltung im Admin + Sortierung `dad8c71`
- Alle Lead-Spalten sortierbar (inkl. Status) `cc1a85f`
- Provision User-Switcher fuer Admin + Hard-Delete Fix + Quellen-Verwaltung `85f5676`
- Provision Inline-Editing – Deal-Werte direkt bearbeiten + loeschen `fc9cf07`

**Behoben**

- Mobile-Responsive – Tabellen, Modals, Filter, Stats, Buttons, Kalkulationen `a328994`
- Mobile-Navigation – Backdrop z-index unter Sidebar, Body-Scroll-Lock `adbc0e2`
- Benachrichtigungen Mobile-Responsive – Karten, Dropdown, Filter `f456cfb`
- Notification-Bell auf Mobile navigiert direkt zu /notifications `5ca99e0`
- Hard-Delete Route-Order + alle FK-Referenzen nullen `e7d9496`
- Performance – useLeadSourceMaps nur einmal pro Page statt pro Card `e82637a`
- Projekt-Phasen Speichern-Button – PUT Route hinzugefuegt `71d7fcf`
- Hard-Delete – NOT NULL Spalten (activities, documents, reminders) per DELETE statt UPDATE null `95e6538`

### Donnerstag, 19. März 2026

**Neu**

- Hard-Delete für Benutzer – endgültiges Löschen mit Bestätigung `fedae3d`
- canViewAll Berechtigung + Löschen-Button bei aktiven Usern `967ad8b`
- Granulare Sichtbarkeits-Berechtigungen pro Modul `d7af593`

**Behoben**

- Vertrieb + Projektleitung sehen alle Leads/Tasks/Daten (Owner-Filter entfernt) `54a9ecf`
- Alle Leads anzeigen – PageSize von 100 auf 500 erhöht `564f72e`
- Lead-Tabelle Spaltenverschiebung – fehlende Checkbox-Header-Zelle ergänzt `4e52fb4`

### Dienstag, 17. März 2026

**Neu**

- Datei/Foto-Viewer + Dropdown Dark-Theme + Test-User bereinigt `68d6bd5`
- Termine Kanban-Ansicht mit View-Toggle (Kanban/Liste) `3e15065`
- Angebote-Kanban – Drag & Drop zwischen Phasen + Admin-Konfiguration `afd3c3e`
- Provisions-Disclaimer – vorläufige Werte, Nettobetrag, Monatsabschluss `3e04fba`
- Aktivitäten-Bearbeiter anzeigen, Verkäufer-Bestätigung bei Gewonnen, KI-Notizen `767dba4`
- Audit-Log komplett – Fire-and-forget Logging in allen Routen + Admin-Ansicht mit Pagination `28ebf2f`

**Behoben**

- Termin-Dialog zeigt alle Benutzer statt nur Vertrieb/GL `e34be3f`
- Angebote-Tabelle – Wahrscheinlichkeit-Spalte + Sortierfehler behoben `6f00531`
- Projekt-Modal – PL als User-Dropdown + Kundenreise ohne UUIDs `8fbdfda`
- Angebot→Projekt Konvertierung erfordert Preis > 0 `c98dbac`
- Gewonnen-Konvertierung funktioniert auch im Edit-Modus mit neuem Wert `1e660f6`

**Schneller**

- Code-Splitting – React.lazy() für alle 17 Seiten `701255b`

### Montag, 16. März 2026

**Behoben**

- Projekt-Detail-Modal Layout – AiSummaryCard in Sidebar verschoben `cab8210`
- Layout-Bugs in 4 Modals + Sidebar vor Go-Live behoben `fd308b5`

### Sonntag, 15. März 2026

**Neu**

- CEO-Audit – 3 neue Module + 5 UX-Verbesserungen + erweiterte E2E-Tests `625f087`
- Kalender-Modul – Montage/Elektro/Wartung planen mit Berechtigungssteuerung `e8e7b3f`

**Behoben**

- Sicherheit + Code-Qualität – Admin-Rollencheck, JWT Fail-Fast, 102 ESLint-Fehler behoben `bd304d5`

**Unterlagen**

- CLAUDE.md aktualisiert – CEO-Audit, neue Module, 204 E2E-Tests `fa88e5d`

**Tests**

- E2E V5 Komplett-Test – 235 Tests, alle Module + Verknüpfungen + echte User-IDs `5cb43d5`
- Online E2E Komplett-Test – 150 Tests gegen Production (alle grün) `127e506`
- Online E2E erweitert – 183 Tests, komplette Cross-Module Verknüpfungen `ef01f1e`

### Montag, 9. März 2026

**Neu**

- Bugfixes + E2E-Test V3 (125 Tests) + FK-Hardcode entfernt `5bc4542`
- Admin Bulk-Delete + Import-Mapping verbessert `92d51b6`
- Duplikatmanagement – doppelte Leads werden erkannt und verhindert `c0a0ff7`
- Import direkt in After-Sales-Tab moeglich `f0a157e`
- Dynamische Integrations-Indikatoren in TopBar `645951a`
- Vorlagen-Verwaltung in Kommunikation – Erstellen, Bearbeiten, Löschen `7325d8f`
- KI-Summary System komplett implementiert `1f2b977`
- KI-Vertriebsassistent – E-Mail-Entwurf, Antwort-KI, Follow-Up-Check `b29fb93`
- Aufgaben-Modul – Kanban + Liste + Integration in alle Detail-Modals `ac95f83`
- Meldungen-System – Echtzeit-Notifications mit TopBar-Glocke `8377d5e`

**Behoben**

- Activity-Interface Frontend↔Backend synchronisiert (title→text) `cac1f8d`
- Speichern-Button funktioniert jetzt bei Null-Feldern (Zod nullable) `a6c42f9`
- LeadDetailModal Speichern-Bug + useEffect Edit-Guard `c900fdf`
- E-Mail-Vorlagen HTML-zu-Text Konvertierung korrigiert `35783e8`
- Vorlagen-Verwaltung – sichtbare Buttons + Textarea-Padding `1a15086`
- Textarea border-radius von pill (9999px) auf md überschrieben `7007177`
- Doppelte style-Props in EmailSection Textareas korrigiert `98ee59c`
- textarea.glass-input globale CSS-Regel für border-radius `c528ad8`
- textarea border-radius mit !important erzwungen (Tailwind v4 Layer) `ab75449`
- @anthropic-ai/sdk im Root installiert fuer Netlify Functions `1614009`
- AI Routes an echte DB-Struktur angepasst `6c597aa`
- KI-Generierung Fehleranzeige + robustes Error-Handling `adb439f`

**Umgebaut**

- E-Mail-Modul vereinheitlicht + Aufräumen `237e147`

**Unterlagen**

- CLAUDE.md aktualisiert – Tasks + Meldungen fertig, 541 Tests, echte User-IDs `5d93fef`

**Tests**

- E2E-Tests für Aufgaben + Meldungen – 71 Tests (100% grün) `8e1b3f6`

**Wartung**

- .claude/settings.local.json aus Git entfernen (Secret) `08870e3`

### Sonntag, 8. März 2026

**Neu**

- Rollen-Defaults ↔ individuelle Berechtigungen verknüpft `5d509fa`
- Komplette Mobile-Version – alle Seiten responsive für iPhone/Android `713af3d`
- Projekt-Archiv + Admin-Löschfunktion `31c42c6`
- Passwort-System – persönlicher Tresor + geteilte Team-Passwörter `86c0429`
- Passwörter-Modul in Berechtigungsmatrix + Subunternehmen-Einschränkungen `bcd6edf`
- Vollständige Outlook-Integration mit Microsoft Graph API `70edf87`
- E-Mail-Tab in allen Detail-Modals + Outlook Callback Auth-Fix `09e3e8a`
- Kommunikationsseite komplett redesigned + Gesendet-Ordner Sync `b3bd97c`
- Team-weiter E-Mail-Verlauf + weisser E-Mail-Body `0af010a`

**Behoben**

- Subunternehmen sieht alle Projekte (ohne Preise) + Passwörter Team-Sektion `ee9333a`
- E-Mail-Anzeige in Kommunikation + Compose in Detail-Modals `cb6fd9d`

### Samstag, 7. März 2026

**Neu**

- Komplette Supabase-Integration – alle Backend-Routen live `8025c0b`
- Login-System mit JWT-Auth, Per-User-Pipelines und NeoSolar-Logo `0693ed8`
- Zuweisungs-System, Lösch-Berechtigung, Admin-Phase-Rückschiebung `909318f`
- Modul-Berechtigungen, Provision exakt, Dokumentenablage pipeline-uebergreifend `e0125f5`
- Globale Suche, Rolle Subunternehmen, Dokumenten-Vorlagen CRUD + Berechtigungen `137fd74`
- Feature-Flags serverseitig persistieren + Frontend/Backend-Abgleich `25ba7a9`
- Netlify Deployment – Serverless Express + dynamische CORS + Build-Fix `6c426b4`

**Behoben**

- Auth-Integration, Rollen-Berechtigungen, DB-Reset und UI-Verbesserungen `23e45a4`
- allowedModules uebersteuert Feature-Flags in Sidebar `29d8a96`
- snake_case → camelCase in Frontend-Interfaces (Document-Upload Bug) `397655f`
- Admin User-Formular – Passwort-Feld + Fokus-Verlust behoben `299f27b`

**Tests**

- E2E-V2 auf 212 Tests erweitert – Auth, Per-User-Filter, Multi-Role, Edge Cases `e5baca0`
- 248 E2E-Tests – Echtes Login pro Rolle, CRUD pro Rolle, Modul-Toggle `498a665`
- 287 E2E-Tests – Modul-Rechte, Rollen-Defaults & Endpoint-Mapping `de25744`
- 350 E2E-Tests – 100% Endpoint-Abdeckung + Error-Cases + Query-Parameter `0fe0a2f`
- 406 E2E-Tests – Sidebar-Logik, Berechtigungs-Flow & ModuleRoute Guard `0b2e717`
- 64 Frontend-Backend E2E-Tests – Response-Struktur + User-Flows `8dbbebf`
- Umfassender E2E-Test – 112 eigenständige Tests ohne shared State `0648029`

**Sonstiges**

- test+fix: 139 E2E-Tests (100% grün) + Route-Fixes für Supabase-Kompatibilität `c2be9c7`

### Donnerstag, 5. März 2026

**Neu**

- Editierbare Rollen-Berechtigungsmatrix `72b1cbc`
- Follow-Up direkt im Deal-Modal setzen `04ed880`
- Projekte-Modul komplett implementiert `9f9b8b2`
- ProjectDetailModal – Edit-Modus, Activities-Log, Dokumente `c5feabe`
- Deal→Projekt Konvertierung mit kompletter Datenübernahme `f014f57`
- Kanban Drag & Drop – Projekte zwischen Phasen verschieben `c1a6aef`
- Feature-Seite mit Toggle-System + dynamische Sidebar `49b4d2c`
- Vollständig responsive Design – Mobile + Tablet + Desktop `1108b1e`

**Behoben**

- Error Boundary + CLAUDE.md aktualisiert `5403283`
- TopBar /roles → /admin Seitentitel korrigiert `3f9afa6`
- UsersRolesSection Rollenverteilung komplett ueberarbeitet `238f479`
- Verkäufer-Dropdown + Checkliste-Sync `83ed60c`
- useFeatureFlags .ts → .tsx (JSX erfordert .tsx Endung) `db14e7b`

**Tests**

- 313 Tests (100% grün) – 9 neue Testdateien + Dashboard-Bugfix `74d9a36`
- Umfassender E2E-Test – 150 eigenständige Tests ohne shared State `9805dcf`

### Mittwoch, 4. März 2026

**Neu**

- After Sales Tab, Termin-Typ (Online/Vor Ort), Provision-Seite, Pipeline-Admin `bfaeb6a`
- Termin-Typ (Online/Vor Ort) in Termin-Tabelle anzeigen `9ce8d0e`
- Termin-Typ (Online/Vor Ort) mit Text anzeigen + klickbar zum Wechseln `7394b9b`
- Vollständiges Admin-Menü mit 14 Sektionen `be08964`
- User CRUD + Pipeline Delete + 181 Admin-Tests `949adf8`

**Behoben**

- Follow-Up Dismiss bleibt jetzt persistent ausgeblendet `1e3d9d0`
- Deutsche Umlaute korrigiert (ä, ö, ü, ß) in allen UI-Texten, Labels, Mock-Daten und Tests `c682b08`

### Dienstag, 3. März 2026

**Neu**

- Lead Hub API-Routen mit Mock-Daten implementiert `17f23c2`
- Lead Hub Frontend mit Liste, Kanban, Detail-Panel und Create-Dialog `0e4c1d0`
- Lead Hub komplett ausgebaut – API-Anbindung, Edit, Kanban D&D, Erinnerungen, E-Mail `d84fd03`
- Bearbeiten- und Loeschen-Buttons in Lead-Tabelle `24549d4`
- Spalten-Personalisierung, Tag-Filter, Lead Import/Export `16ab79b`
- Verloren-Button mit Pflicht-Begruendung im Lead-Detail `33e9e5c`
- Deal Hub Modul + Lead-Tests + CLAUDE.md `3cdd1ba`
- Persoenlicher Deal Hub + automatisches Follow-Up System `19e7a69`
- Sales-Pipeline Umbau – Leads → Termine → Angebote `012b40f`
- Termin-Zuweisung, konfigurierbare Follow-Ups + Admin-UI `4080313`
- Fahrzeit-Kalkulation, Checklisten-Admin, Termin-Flow vereinfacht `9e06f74`
- Aktivitaeten-Log, winProbability, Follow-Up Dismiss, Tasks-Backend, Sidebar expandable `c158480`
- Dashboard mit Echtdaten, Dokumenten-Upload, Inline-Tags, Provisions-Berechnung `138ece3`

**Behoben**

- Konvertierte Leads aus der Hauptliste ausblenden `c9d8df9`

**Umgebaut**

- Kanban-Ansicht aus Lead Hub entfernt `06c055b`
- Termin-Filter wie Leads, Gesch. Wert entfernt, Tabs aufgeraeumt `3289ffc`

**Sonstiges**

- Initial commit: CRM NeoSolar project setup with Prisma schema `daf66ae`
- Projekt-Grundgerüst komplett - Frontend + Backend + DB Schema `6cd07e4`
- Design modernisiert + 17 Bugs gefixt - perfekter Build `632f3d6`
- Logo-Tooltip zeigt "NeoSolar CRM" bei Hover `1d140f3`
- Sidebar-Tooltips sichtbar - overflow-Clipping behoben `261730f`
- Slide-in Detail-Panel von rechts implementiert `0799b77`
