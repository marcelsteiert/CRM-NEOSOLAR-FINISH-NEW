# Briefing für den NEOSOLAR-Businessplan

> **So verwendest du dieses Dokument:** Alles ab „AUFTRAG" kopieren und in
> Claude einfügen. Die mit **[AUSFÜLLEN]** markierten Stellen vorher mit
> deinen Zahlen ersetzen — was dort steht, weiss das CRM nicht.

---

## AUFTRAG

Du bist ein erfahrener Berater für Wachstumsfinanzierungen im Schweizer
Mittelstand. Erstelle für die NEOSOLAR AG einen Businessplan, der einer
Bankprüfung und einer Investoren-Due-Diligence standhält.

Anforderungen an das Ergebnis:

- **Zahlen vor Adjektiven.** Jede Behauptung, die sich rechnen lässt, wird
  gerechnet. Wo eine Annahme nötig ist, wird sie als Annahme benannt.
- **Kein Marketing-Ton.** Der Leser entscheidet über Geld, nicht über
  Sympathie. Superlative ohne Beleg schwächen das Dokument.
- **Risiken benennen.** Ein Businessplan ohne Risikokapitel wirkt naiv.
  Jedes Risiko bekommt eine Massnahme.
- Umfang: 12–18 Seiten plus Finanzteil.
- Sprache: Deutsch (Schweiz), «ss» statt scharfem S.

Gliederung:

1. Executive Summary (max. 1 Seite, für sich allein lesbar)
2. Unternehmen und Gründer
3. Markt und Wettbewerb
4. Angebot und Wertversprechen
5. **Das operative System: unser CRM als Wettbewerbsvorteil**
6. Vertriebsprozess von der Anfrage bis zur Abnahme
7. Unit Economics und Margenstruktur
8. Kostenstruktur und Skalierbarkeit
9. Finanzplanung 3 Jahre (Umsatz, Deckungsbeitrag, EBITDA, Liquidität)
10. Mittelverwendung und Finanzierungsbedarf
11. Chancen und Risiken mit Massnahmen
12. Meilensteine 24 Monate

---

## TEIL A — Unternehmen

- **Firma:** NEOSOLAR AG, Industriestrasse 28, 9100 Herisau AR
- **UID:** CHE-109.669.061
- **Geschäft:** Planung, Verkauf und schlüsselfertige Installation von
  Photovoltaikanlagen für Ein- und Mehrfamilienhäuser sowie Gewerbe in der
  Deutschschweiz
- **Positionierung:** «Dein Schweizer Solarpartner» — eigenes Montageteam
  statt wechselnder Subunternehmer, ein Ansprechpartner über den gesamten
  Ablauf, Festpreis nach Drohnenvermessung
- **Gründung / Mitarbeitende / bisheriger Umsatz:** **[AUSFÜLLEN]**
- **Rechtsform und Beteiligungsverhältnisse:** **[AUSFÜLLEN]**

---

## TEIL B — Das CRM: der eigentliche Vermögenswert

NEOSOLAR verkauft Solaranlagen. Der Unterschied zum Wettbewerb liegt aber
nicht im Modul — das kauft jeder beim selben Distributor. Er liegt darin,
**wie viele Personenstunden zwischen Anfrage und Unterschrift liegen.**

Dafür wurde ein eigenes CRM/ERP entwickelt, das den kompletten
Geschäftsprozess abbildet. Es ist kein zugekauftes Standardsystem mit
Lizenzkosten pro Nutzer, sondern Eigentum der Gesellschaft.

### Was das System heute produktiv leistet

**Vertrieb**

- Lead-Erfassung aus allen Kanälen mit automatischer Zuweisung an den
  zuständigen Verkäufer
- Kaltakquise-Modul mit Segmentierung (heisse Leads, B2B, B2C,
  Solaranfragen) und Wiedervorlage-Logik
- Terminverwaltung mit Checkliste, Fahrzeitberechnung und direkter
  Überführung Termin → Angebot
- Eigener No-Show-Hub mit Rückruf-Tracking — verlorene Termine werden
  nicht stillschweigend abgeschrieben
- Angebots-Pipeline mit Abschlusswahrscheinlichkeit und automatischem
  Nachfassen

**Beratung und Angebotserstellung — der zeitkritische Teil**

- Geführte Verkaufspräsentation mit Live-Rechner: der Kunde sieht seine
  Zahlen während des Gesprächs, nicht drei Tage später
- **Dachbelegung direkt aus amtlichen Geodaten**: Luftbild von swisstopo
  und Dachflächendaten aus dem Sonnendach-Kataster des Bundes (Fläche,
  Ausrichtung, Neigung, Ertragsprognose). Der Verkäufer legt die Module
  im Termin auf das echte Dach — ohne Vor-Ort-Aufmass, ohne Rückfrage an
  die Technik
- Automatische Wechselrichter-Auslegung nach DC/AC-Verhältnis und
  Speicherbedarf
- Siebenseitige Offerte inklusive Bestellblatt, erzeugt aus dem
  Rechenstand, **im Termin fertig** — als PDF versendet und im
  Kundendossier abgelegt, in einem Arbeitsgang
- Der komplette Beratungsstand wird gespeichert und lässt sich jederzeit
  fortsetzen — ein Zweittermin startet nicht bei null

**Nach dem Abschluss**

- Automatische Überführung Angebot → Projekt
- Baustellensteuerung mit Bewilligungen, Terminen und Statusverfolgung
- Kalkulationsmodul mit Material, Verkaufspreis, Marge, Zahlungstranchen
  und Provisionen je Baustelle — **die Marge ist pro Objekt sichtbar,
  nicht erst im Jahresabschluss**
- Provisionsabrechnung pro Verkäufer, automatisch aus den Abschlüssen

**Kundengewinnung ohne Akquisekosten**

- Öffentlicher Solarrechner für die Website: der Interessent rechnet
  selbst und hinterlässt seine Daten. Der Lead landet direkt im CRM
- Vollständige Kundenpräsentation zum Selbstdurchgehen — inklusive
  Dachbelegung und Offerte
- Kampagnenmodul für den Bestand: personalisierte E-Mails an die
  vorhandene Adressdatenbank, mit Öffnungs- und Klick-Erfassung. Ein
  Klick erzeugt automatisch eine Aufgabe mit hoher Priorität beim
  zuständigen Verkäufer

**Verwaltung**

- Dokumentenablage pro Kunde mit fester Ordnerstruktur (Verträge, Termin,
  Gemeinde, Elektro, Förderungen, Anlagendokumentation)
- Personalakte, Firmenablage, Aufgabensystem, Rollen- und
  Rechteverwaltung, Audit-Log
- E-Mail-Versand direkt aus den Postfächern der Mitarbeitenden über
  Microsoft 365 — mit einheitlicher Firmensignatur

### Technische Basis

React und TypeScript im Frontend, Express und PostgreSQL im Backend,
Serverless-Betrieb auf Netlify mit Supabase als Datenbank und
Dateispeicher. Rund 540 automatisierte Backend-Tests plus 200
End-to-End-Tests laufen gegen die Produktivumgebung.

Betriebskosten der gesamten Infrastruktur: **[AUSFÜLLEN — Hosting,
Datenbank und Microsoft-Lizenzen pro Monat einsetzen]**. Der Punkt für
den Leser: Diese Kosten steigen mit der Nutzerzahl praktisch nicht.

---

## TEIL C — Warum die Marge hält

Der übliche Kostentreiber im Solarvertrieb ist nicht das Material,
sondern der Apparat dazwischen: Innendienst, der Offerten tippt.
Technik, die Dächer nachmisst. Buchhaltung, die Provisionen von Hand
rechnet. Marketing, das Leads einkauft.

Bei NEOSOLAR übernimmt das System diese Schritte:

| Aufgabe | Branchenüblich | Bei NEOSOLAR |
|---|---|---|
| Offerte erstellen | Innendienst, 1–3 Tage Rückstand | Im Termin fertig, aus dem Rechner |
| Dach aufmessen für die Richtofferte | Technikertermin vor Ort | Amtliche Geodaten im Beratungsgespräch |
| Offerte versenden und ablegen | Manuell, mehrere Systeme | Ein Klick: PDF, Versand, Kundendossier |
| Nachfassen | Wenn jemand daran denkt | Automatisch nach Frist |
| Provision abrechnen | Excel, monatlich | Pro Abschluss im System |
| Marge je Objekt | Nach Projektabschluss | Live in der Kalkulation |
| Leads gewinnen | Zugekauft, mit Streuverlust | Eigener Rechner auf der Website |

**Die Aussage für den Businessplan lautet deshalb nicht «wir haben keine
Kosten», sondern:** Der Fixkostenblock wächst nicht proportional zum
Umsatz. Zusätzliche Verkäufer erzeugen zusätzliche Abschlüsse, ohne dass
Innendienst, Technik oder Verwaltung mitwachsen müssen. Das ist die
Kernaussage — und sie ist überprüfbar, statt nur behauptet.

Formuliere es genau so. «Kein Kostenapparat» klingt vor einem
Kreditausschuss unseriös; «unterproportional wachsende Fixkosten mit
belegtem Automatisierungsgrad» ist dieselbe Aussage in einer Sprache, die
Geld bewegt.

---

## TEIL D — Zahlen (aus 14 abgerechneten Anlagen, Stand 07/2026)

Diese Werte stammen aus echten Abschlüssen und sind im CRM hinterlegt.
Alle Beträge exkl. MWST.

| Position | CHF | Anteil am Verkaufspreis |
|---|---:|---:|
| Ø Verkaufspreis je Anlage | 32'830 | 100.0 % |
| Material | 11'192 | 34.1 % |
| Elektroinstallation | 3'250 | 9.9 % |
| Montage | 6'313 | 19.2 % |
| **Direkte Kosten** | **20'755** | **63.2 %** |
| **Rohmarge (Deckungsbeitrag I)** | **12'075** | **36.8 %** |
| Vertriebsprovisionen (5 % Verkäufer, 3 % GL, 2 % Innendienst) | 3'283 | 10.0 % |
| **Deckungsbeitrag nach Provision** | **8'792** | **26.8 %** |

### So argumentierst du die 30 %

Die Zielmarge von **30 % Deckungsbeitrag nach Vertriebsprovision** ist
kein Wunschwert, sondern liegt **5.4 % Verkaufspreis** über dem heutigen
Durchschnitt: bei unveränderter Kostenbasis entspricht sie einem
Ø-Verkaufspreis von **CHF 34'592**.

Drei belegbare Hebel dorthin:

1. **Einkauf.** Materialanteil 34.1 %. Mit steigendem Volumen sinkt der
   Modul- und Wechselrichter-Einkauf. Jeder Prozentpunkt Einkaufsvorteil
   geht direkt in die Marge.
2. **Zusatzkomponenten.** Speicher, Wallbox, Notstrom, Optimierer und
   Energiesteuerung sind im Rechner hinterlegt und werden im Termin
   angeboten. Sie erhöhen den Auftragswert bei gleichbleibendem
   Akquiseaufwand — der teuerste Teil des Verkaufs ist bereits bezahlt.
3. **Abschlussquote.** Die Offerte entsteht im Termin, nicht Tage später.
   Wer beim ersten Kontakt unterschreibt, verursacht keinen zweiten
   Anfahrtsweg und keine Nachfassschleife.

**Wichtig für die Glaubwürdigkeit:** Weise beide Zahlen aus — 36.8 %
Rohmarge und 26.8 % nach Provision — und leite die 30 % als Zielgrösse
mit Massnahmen daraus her. Eine runde Zahl ohne Herleitung wird in jeder
Due Diligence auseinandergenommen. Eine hergeleitete Zahl mit
nachvollziehbarem Weg überzeugt.

### Marktannahmen (belegt)

- Strompreis Haushalte: ElCom-Median Profil H4 2026 = 27.7 Rp./kWh
- Angenommene Preissteigerung: 2 % pro Jahr
- Förderung: Pronovo Einmalvergütung 2026, rund CHF 360/kWp bis 30 kWp,
  darüber rund CHF 300/kWp
- Typische Anlagengrösse Einfamilienhaus: 10–15 kWp

---

## TEIL E — Skalierung

Beschreibe, wie Wachstum entsteht, ohne dass die Fixkosten mitwachsen:

- **Verkäufer sind der Engpass, nicht die Verwaltung.** Ein neuer
  Verkäufer bekommt einen Zugang und arbeitet am ersten Tag mit dem
  gleichen Werkzeug wie alle anderen. Keine Einarbeitung in fünf
  Systeme, keine zusätzliche Innendienststelle.
- **Bestandsdatenbank als Umsatzquelle.** Vorhandene Adressen:
  **[AUSFÜLLEN — Anzahl]**. Das Kampagnenmodul spielt personalisierte
  Mails dosiert aus und meldet jeden Klick als Aufgabe an den Vertrieb.
  Kosten pro Kontakt: nahe null.
- **Selbstbedienung als Vorqualifikation.** Wer den öffentlichen Rechner
  komplett durchläuft und seine Daten hinterlässt, hat sich mit Preis,
  Dach und Finanzierung befasst. Diese Leads brauchen weniger
  Beratungszeit bis zum Abschluss.
- **Geografische Ausweitung.** Die Geodaten decken die gesamte Schweiz
  ab. Ein neues Einzugsgebiet erfordert Montagekapazität — aber keine
  Anpassung am System.

---

## TEIL F — Wettbewerbsvorteil

Formuliere ihn ehrlich und damit überzeugend:

Das CRM ist keine Erfindung, die niemand nachbauen kann. Es ist ein
**Zeitvorsprung von rund zwei Jahren Entwicklungsarbeit**, der bereits
finanziert und produktiv ist — und der sich im täglichen Betrieb weiter
vergrössert, weil er an den echten Prozessen entlang wächst statt an
einer Produkt-Roadmap.

Der Wettbewerber hat zwei Optionen: ein Standard-CRM lizenzieren, das
seinen Prozess nicht kennt und pro Nutzer kostet — oder selbst
entwickeln und dabei zwei Jahre verlieren. Beides führt heute nicht zu
einer Offerte im Beratungstermin.

Zusätzlich, unabhängig vom System:

- Eigenes Montageteam statt Subunternehmer
- Festpreisgarantie nach Drohnenvermessung
- Fünf Jahre Wartung, Thermografie und 24/7-Service im Preis enthalten
  (Zufriedenheitspaket, Wert CHF 2'400)

---

## TEIL G — Diese Angaben musst du selbst einsetzen

Ohne sie bleibt der Finanzteil ein Gerüst:

1. Umsatz und Ergebnis der letzten 2–3 Geschäftsjahre
2. Anzahl verkaufter Anlagen pro Jahr, Entwicklung
3. Mitarbeitende nach Funktion (Vertrieb, Montage, Verwaltung) und
   Personalkosten
4. Fixkosten pro Monat: Miete, Fahrzeuge, Versicherungen, Lizenzen,
   Software, Marketing
5. Abschlussquote: aus wie vielen Terminen wird ein Auftrag
6. Durchschnittliche Zeit von der Anfrage bis zur Unterschrift
7. Anzahl Adressen in der Bestandsdatenbank
8. **Finanzierungsbedarf: welcher Betrag, wofür, in welchen Tranchen**
9. Bestehende Finanzierungen, Sicherheiten, Bankbeziehung
10. Auftragsbestand per heute

Ohne Punkt 8 gibt es keinen Businessplan, sondern eine
Unternehmensbeschreibung.

---

## TEIL H — Anweisungen an Claude

- Rechne den Finanzteil in drei Szenarien: konservativ, realistisch,
  optimistisch. Unterschiede nur in Absatzmenge und Abschlussquote, nicht
  in der Marge — Margenoptimismus wird sofort erkannt.
- Stelle die Unit Economics als eigene Tabelle dar: Deckungsbeitrag je
  Anlage, Anlagen bis zum Break-even, Fixkostendeckung.
- Bei der Kostenstruktur unterscheide klar zwischen variablen Kosten
  (Material, Montage, Provision) und Fixkosten. Der entscheidende Satz
  für den Leser: welcher Anteil des Umsatzwachstums als Ergebnis
  durchschlägt.
- Im Risikokapitel gehören mindestens: Rückgang der Fördermittel,
  Strompreisentwicklung nach unten, Fachkräftemangel in der Montage,
  Abhängigkeit von einzelnen Verkäufern, Zinsentwicklung bei
  kundenfinanzierten Anlagen, Ausfall der IT-Infrastruktur.
- Wo eine Angabe fehlt, schreibe ausdrücklich «Angabe erforderlich» statt
  eine Zahl zu erfinden.
