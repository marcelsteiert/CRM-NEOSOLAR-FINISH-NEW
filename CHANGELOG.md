# Änderungsverlauf

Was sich im NeoSolar CRM verändert hat, nach Monat geordnet. Das Projekt hat keine
Versionsnummern – ausgeliefert wird laufend auf https://neosolar-crm.com.

Der ausführliche Gesprächsverlauf liegt unter [docs/verlauf/](docs/verlauf/),
der aktuelle Arbeitsstand in [PROJEKTSTAND.md](PROJEKTSTAND.md).

---

## August 2026

### Behoben
- Die Offerte kam nicht in der Dokumentenablage an. Drei Ursachen: der Entitätstyp
  hiess `DEAL` statt `ANGEBOT`, `uploadedBy` wurde als `null` geschickt, und der
  Ordner war ohne Umlaut geschrieben. Alle drei führten zu einem abgewiesenen Upload.
- Fehler beim Ablegen des Arbeitsstands wurden verschluckt und sind jetzt sichtbar.

### Neu
- Beim Speichern eines Angebots entsteht die Offerte als mehrseitiges PDF und landet
  unter *Dokumente → Verträge*, verknüpft mit dem Angebot.
- Der Arbeitsstand der Beratung wird als JSON abgelegt. Über den Knopf **Präsentation**
  im Angebots-Modal lässt sich die Beratung mit allen Reglerwerten und der kompletten
  Dachbelegung wieder öffnen und weiterbearbeiten.
- `PROJEKTSTAND.md` und `tools/chat-export.mjs` – Arbeitsstand und Gesprächsverlauf
  sind von jedem Rechner aus nachlesbar, Zugangsdaten werden beim Export maskiert.

---

## Juli 2026

### Dachbelegung
Neue Folie vor dem Rechner, gespeist aus öffentlichen Geodaten des Bundes.

- Luftbild der swisstopo als Kachelkarte, Mausrad-Zoom bis Stufe 23
- Klick aufs Dach übernimmt die amtliche Fläche aus dem Sonnendach-Kataster samt
  Azimut, Neigung, Eignungsklasse und Ertragsprognose
- Mehrere Teilflächen je Gebäude, jede mit eigener Ausrichtung und Unterkonstruktion
- Sperrflächen für Kamin, Dachfenster und Verschattung
- Module einzeln setzen, markieren, gemeinsam und stufenlos verschieben
- Sechs K2-Systeme für Steil- und Flachdach; der Reihenabstand bei Aufständerung
  wird aus dem Schattenwurf gerechnet
- Wechselrichter-Auslegung nach DC/AC-Verhältnis und Speicherbedarf
- Belegungsbild wandert als Projektbericht in die Offerte

### Solarberatung und Verkaufsrechner
- Geführte Präsentation mit Live-Rechner, zwei Strecken: rund 40 Folien komplett,
  17 Folien kurz
- Öffentlicher Selbstrechner unter `/rechner`; Anfragen werden zu Leads
- Präsentation direkt aus dem Termin startbar, Kundendaten werden übernommen
- Angebot mit einem Klick, Termin rutscht automatisch zu den Angeboten
- Offertenversand per E-Mail mit Verkäufersignatur und sechs Vorlagen
- Automatisches Nachfassen in sechs Stufen bei offenen Angeboten
- Referenzanlagen, Zusatzrechner, Speicher-Ausbau, Weiterempfehlung

### Offerte
- Sieben gegliederte A4-Seiten mit Zusammenfassung und Inhaltsverzeichnis
- Aufbau nach der bestehenden NEOSOLAR-Offerte, mit echten Komponentenpreisen
- Monatsertrag, Amortisationsverlauf und Energieflüsse als Grafiken
- Zusatzpositionen, Aktionsrabatt, drei Zahlungsvarianten
- Bestellseite zum Unterschreiben, mit Feldern für Kunde und NEOSOLAR

### Behoben
- Der Rechner arbeitete an mehreren Stellen mit Beträgen ohne MWST. Zahlungsplan,
  Finanzierung und der Wert im CRM rechnen jetzt durchgehend mit dem Rechnungsbetrag
  inklusive MWST.
- Die Finanzierung legte den Kredit auf den Betrag nach Förderung und Steuerersparnis
  aus. Bei 30 kWp mit Speicher war die gezeigte Monatsrate dadurch rund ein Drittel
  zu tief.
- Wallbox und Gerüst steckten unsichtbar in der Anlagenposition und erscheinen jetzt
  als eigene Zeilen.
- Der Speicherpreis wurde in der Offerte anders gerechnet als in der Engine, wodurch
  die Positionen nicht auf die Zwischensumme aufgingen.
- `RechnerPanel` las eine Eigenschaft, die es nicht bekam – die Rechner-Folie stürzte ab.
  Beim Nachprüfen fiel auf, dass der bisherige TypeScript-Befehl nichts geprüft hat;
  dabei kamen zwei weitere echte Abstürze zum Vorschein, unter anderem im Lead-Kanban.

---

## Juni 2026

- Baustellen-Tabelle mit aufklappbaren Spaltengruppen, Filter-Panel über 15 Statusfelder
- GBA-, SINA-, MPP- und Pronovo-Spalten samt Datenimport
- Excel-Export im Baustellen-Tab
- Anrufliste auf der Angebote-Seite, bidirektional und live
- Follow-up-Erinnerung und ein «Heiss»-Tab für interessierte Kunden
- Lead-Synchronisation aus Google Sheets
- Leads-Liste aktualisiert sich alle 60 Sekunden von selbst

---

## Mai 2026

- **Baustellen und Kalkulation** ersetzen den alten PV-Rechner: Workflow-Tracking und
  Finanzen als getrennte Module mit eigenen Berechtigungen
- Provisionsaufteilung Verkäufer 5 %, GL 3 %, Innendienst 2 %, pro Baustelle
  überschreibbar
- **Personal-Modul** mit Stammdaten und Personalakte in acht Ordnern
- **Firmenablage** für interne Dokumente, nur für Admin und GL
- Dokumentenablage auf sechs feste Ordner strukturiert
- Projekt-Kanban mit konfigurierbaren Spalten und zehn PV-Phasenvorlagen
- Provisionen-Seite überarbeitet, Provisionssatz je Angebot überschreibbar
- Rund 25 Datenbank-Indexe, längere Cache-Zeiten, CDN-Regeln

---

## April 2026

- **Kundenportal**: Angebote lassen sich direkt aus dem Deal freischalten, mit
  permanentem Login-Link statt Einmal-Link
- Eigenes Angebots-Layout im Portal, Verkäufersignatur, externe Dokumentlinks
- Projekte können von Admin und Projektleitung direkt eröffnet werden
- Eigene Domain https://neosolar-crm.com

---

## März 2026

Aufbaumonat mit dem Grossteil der Grundfunktionen.

- **Kaltakquise** als eigenes Modul mit Tabs für B2C, B2B und Solaranfragen
- **Callcenter-Dashboard** mit Terminierungsrate, Anruf-Tracking und PDF-Export
  je Verkäufer
- **Audit-Log** über alle Routen, mit Diff-Ansicht im Admin
- **Angebote- und Termine-Kanban** mit Drag & Drop
- Rollen CLOSER und SETTER, granulare Sichtbarkeit je Modul
- Spaltenfilter und Sortierung direkt im Tabellenkopf
- Duplikat-Erkennung bei Leads
- Globale Suche mit Sprung ins Detail
- Anmeldung wahlweise mit Benutzername oder E-Mail
- Helles und dunkles Erscheinungsbild
