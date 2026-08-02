# Projektstand NeoSolar CRM

Kurzer Überblick, wo die Arbeit steht – gedacht zum Nachlesen von jedem Rechner aus.
Technische Details stehen in [CLAUDE.md](CLAUDE.md), der Gesprächsverlauf in [docs/verlauf/](docs/verlauf/).

**Stand: 1. August 2026** · Produktion: https://neosolar-crm.com

---

## Woran zuletzt gearbeitet wurde

### Solarberatung, Rechner und Offerte
Gefühlt das grösste Paket der letzten Wochen. Der Verkäufer startet aus einem Termin heraus
die Präsentation, plant mit dem Kunden die Anlage und erzeugt daraus die Offerte.

- **Präsentation** unter `/praesentation/komplett` (rund 40 Folien) und `/praesentation/kurz`
- **Rechner** in `client/src/lib/pvCalculator.ts` – Ertrag, Eigenverbrauch, Autarkie,
  Amortisation, Kapitalwert, IRR und Stromgestehungskosten
- **Offerte** als siebenseitiges Dokument mit Bestellseite zum Unterschreiben
- Alle Folien und die Offerte rechnen mit derselben Konfiguration; ein Reglerausschlag
  wirkt bis in die Bestellung

### Dachbelegung
Neue Folie vor dem Rechner. Datenquellen sind das swisstopo-Luftbild und das
Sonnendach-Kataster des Bundes – beide öffentlich und ohne Schlüssel nutzbar.

- Klick aufs Dach übernimmt die amtliche Dachfläche samt Azimut, Neigung und Eignung
- Mehrere Teilflächen möglich, jede mit eigener Unterkonstruktion
- Sperrflächen für Kamin, Dachfenster und Verschattung
- Module lassen sich einzeln oder als Markierung stufenlos verschieben
- Sechs K2-Systeme für Steil- und Flachdach, Reihenabstand aus dem Schattenwurf gerechnet
- Wechselrichter-Auslegung nach DC/AC-Verhältnis (eine Regel, keine KI)
- Belegungsbild wandert in die Offerte als Projektbericht

### Ablage und Fortsetzen
- Beim Speichern des Angebots wird die Offerte als PDF unter *Dokumente → Verträge* abgelegt
- Der Arbeitsstand landet als JSON unter *Dokumente → Termin*
- Im Angebots-Modal öffnet der Knopf **Präsentation** die Beratung mit genau diesem Stand

---

## Was als Nächstes ansteht

### Vom Nutzer bereits angesprochen
- Beim erneuten Speichern entsteht ein **neues** Angebot statt das bestehende zu
  aktualisieren. Bewusst so gelassen – ob ein zweiter Durchgang die erste Offerte
  ersetzen soll, ist eine fachliche Entscheidung.

### Zahlen, die fachlich geprüft gehören
- **Zusatzleistungen** (Demontage 1'800, Zählerkasten 1'500, Erdarbeiten 1'200 usw.)
  sind Schätzwerte, im Rechner pro Offerte überschreibbar
- **Reihenfaktoren der Aufständerung** (2.4 bei Süd, 1.05 bei Ost-West) sind
  Auslegungswerte fürs Mittelland, keine Herstellerangaben von K2
- **kWp-Preisstaffel** aus 14 echten Kalkulationen abgeleitet, in denen die kWp-Werte
  aber nicht erfasst waren – über die Gesamtsummen plausibilisiert
- **Steuerersparnis 15 %** als Grenzsteuersatz angenommen, kantonal sehr unterschiedlich

### Technische Schulden
- Der Client hat **93 bestehende TypeScript-Fehler**. Der Vite-Build merkt davon nichts,
  weil esbuild nur transpiliert. Darunter gingen schon echte Abstürze unter.
  Aufräumen wäre ein eigener Durchgang.
- **RLS in Supabase ist aus.** Der Anon-Key hat damit vollen Datenzugriff.
- Die **Referenzliste** im Verkaufsgespräch ist fest im Code, nicht aus der Projekttabelle
- **Follow-up-Mails** bleiben still, solange kein Verkäufer Outlook verbunden hat
  (`outlook_connections` ist leer)

### Aus dem Backlog
- Rechnungen-Modul
- Provisions-Auszahlung pro Closer
- km-Entfernung und Fahrzeit zum Kunden
- Outlook-Schnittstelle für Termine

---

## Wichtige Handgriffe

```bash
# TypeScript prüfen – NICHT "-p client", das prüft nichts
npx tsc --noEmit -p client/tsconfig.app.json

# Bauen
cd client && npm run build

# Nach dem Push den Build anstossen (Auto-Deploy ist unzuverlässig)
curl -X POST https://api.netlify.com/build_hooks/<hook-id>

# Gesprächsverlauf aktualisieren
node tools/chat-export.mjs
```

---

## Verlauf nachlesen

Unter [docs/verlauf/](docs/verlauf/) liegt der Gesprächsverlauf als Markdown, erzeugt mit
`node tools/chat-export.mjs`. Zugangsdaten werden dabei maskiert – die Rohdateien unter
`~/.claude/projects/` enthalten Schlüssel und gehören **nicht** ins Repository.
