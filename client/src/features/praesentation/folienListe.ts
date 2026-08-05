/**
 * Die Folien der Verkaufspraesentation.
 *
 * Bewusst in einer eigenen Datei: Sowohl die Praesentation selbst als auch
 * die Folienverwaltung im Admin brauchen diese Liste. Zwei Kopien waeren
 * sofort auseinandergelaufen.
 */

export type FolienId =
  | 'titel' | 'ablauf' | 'warum' | 'team' | 'verbrauch' | 'strompreis' | 'kostenOhne'
  | 'modul' | 'wechselrichter' | 'speicher' | 'wallbox' | 'app' | 'dachanalyse'
  | 'dachplaner'
  | 'rechner' | 'anlage' | 'energiefluss' | 'motive' | 'varianten'
  | 'gesamtvergleich' | 'monatsvergleich' | 'finanzierung'
  | 'persoenlich' | 'rueckblick' | 'bausteine' | 'amortisation' | 'unterschied'
  | 'referenzen' | 'zusatzrechner' | 'montage' | 'umsetzung'
  | 'speicherUpgrade' | 'betreuung' | 'empfehlung' | 'paket' | 'aktion'
  | 'sicherheiten' | 'fragen' | 'entscheidung'
  | 'planung' | 'workflow' | 'zeitplan' | 'kontakt'
  | 'kundenkontakt' | 'ziele' | 'vorteile' | 'start' | 'kundendaten'

export interface Variante {
  id: string
  name: string
  beschreibung: string
  folien: Array<{ id: FolienId; titel: string }>
}

/** Folien, deren Zahlen sich auf die gewaehlte Anlagenvariante beziehen. */
export const GELD_FOLIEN = new Set<FolienId>([
  'anlage', 'energiefluss', 'motive', 'bausteine', 'gesamtvergleich',
  'monatsvergleich', 'amortisation', 'varianten', 'finanzierung', 'entscheidung', 'zusatzrechner', 'speicherUpgrade', 'aktion',
])

/**
 * Zwei Praesentations-Strecken, beide mit demselben Live-Rechner:
 *
 * "verkauf" folgt der NEOSOLAR-Verkaufspraesentation inklusive der
 *   Originalbilder (Produkte, Team, App).
 * "premium" ist die kompaktere, zahlengetriebene Strecke: erst die
 *   Stromkosten ohne Anlage, dann Rechner, Energiefluss und Varianten.
 */
export const VARIANTEN: Variante[] = [
  {
    id: 'komplett',
    name: 'Komplette Beratung',
    beschreibung:
      'Der volle Ablauf: Bedarf, Produkte, Rechner, Geld-Vergleich, Sicherheiten und Abschluss. Für den regulären Beratungstermin.',
    folien: [
      // 1. Ankommen: begruessen, Rahmen setzen, Ziele des Kunden aufnehmen
      { id: 'titel', titel: 'Begrüssung' },
      { id: 'ziele', titel: 'Ihre Ziele' },
      { id: 'ablauf', titel: 'Ablauf des Termins' },
      { id: 'persoenlich', titel: 'Ihre Ausgangslage' },
      // 2. Problem aufbauen – erst belegte Vergangenheit, dann Prognose
      { id: 'rueckblick', titel: 'Was bisher passiert ist' },
      { id: 'verbrauch', titel: 'Ihr Strombedarf steigt' },
      { id: 'strompreis', titel: 'Strompreis-Entwicklung' },
      { id: 'kostenOhne', titel: 'Kosten ohne Anlage' },
      // 3. Loesung zeigen: erst die Technik, dann das eigene Dach
      { id: 'modul', titel: 'Solarmodule' },
      { id: 'wechselrichter', titel: 'Wechselrichter' },
      { id: 'speicher', titel: 'Speicher' },
      { id: 'wallbox', titel: 'Wallbox' },
      { id: 'app', titel: 'Die App' },
      { id: 'dachanalyse', titel: 'Dachanalyse' },
      // 4. Gemeinsam planen – erst das Dach belegen, dann die Regler
      { id: 'dachplaner', titel: 'Ihr Dach belegen' },
      { id: 'rechner', titel: 'Ihre Anlage planen' },
      { id: 'anlage', titel: 'Das kommt auf Ihr Dach' },
      { id: 'energiefluss', titel: 'Ihr Energiefluss' },
      { id: 'motive', titel: 'Ihr Nutzen' },
      { id: 'zusatzrechner', titel: 'Rechnen wir es durch' },
      // 5. Das Geld – die Kernsequenz
      { id: 'bausteine', titel: 'Woher das Geld kommt' },
      { id: 'gesamtvergleich', titel: 'Vollkosten-Vergleich' },
      { id: 'monatsvergleich', titel: 'Pro Monat' },
      { id: 'amortisation', titel: 'Der Wendepunkt' },
      { id: 'varianten', titel: 'Ihre drei Möglichkeiten' },
      { id: 'finanzierung', titel: 'Kauf oder Finanzierung' },
      { id: 'aktion', titel: 'Aktion' },
      { id: 'speicherUpgrade', titel: 'Speicher-Ausbau' },
      // 6. Wofuer sich das lohnt – jenseits der Zahlen
      { id: 'vorteile', titel: 'Was Sie davon haben' },
      // 7. Vertrauen: erst jetzt, wenn die Zahlen ueberzeugt haben
      { id: 'warum', titel: 'Warum NEOSOLAR' },
      { id: 'team', titel: 'Das Team' },
      { id: 'referenzen', titel: 'Referenzen' },
      // 8. Sicherheit geben
      { id: 'paket', titel: 'Zufriedenheitspaket' },
      { id: 'sicherheiten', titel: 'Ihre Sicherheiten' },
      { id: 'planung', titel: 'Planungssicherheit' },
      { id: 'betreuung', titel: 'Ihre Betreuung' },
      { id: 'unterschied', titel: 'Offerten vergleichen' },
      { id: 'fragen', titel: 'Häufige Fragen' },
      // 9. Umsetzung in einer Folie statt in dreien
      { id: 'umsetzung', titel: 'So geht es weiter' },
      // 10. Abschluss
      { id: 'entscheidung', titel: 'Ihre Entscheidung' },
      { id: 'empfehlung', titel: 'Weiterempfehlung' },
      { id: 'start', titel: 'Auf die Zusammenarbeit' },
    ],
  },
  {
    /**
     * Dieselbe Strecke wie die komplette Beratung, nur ohne Verkaeufer.
     *
     * Zwei Unterschiede, mehr nicht: Die Folien, die Kundendaten brauchen,
     * fallen weg – wir haben sie ja noch nicht. Und am Schluss traegt der
     * Kunde sie selbst ein, statt dass der Berater das Angebot anlegt.
     */
    id: 'kunde',
    name: 'Für Sie zum Durchgehen',
    beschreibung:
      'Dieselbe Beratung wie im Termin, zum Selberdurchgehen. Am Schluss tragen Sie Ihre Daten ein und erhalten Ihre Offerte.',
    // Bewusst dieselbe Liste wie oben, nur mit der Kontaktfolie am Schluss
    // statt der Verkaeufer-Entscheidungsfolie.
    folien: [
      { id: 'titel', titel: 'Willkommen' },
      { id: 'ablauf', titel: 'Ablauf' },
      { id: 'rueckblick', titel: 'Was bisher passiert ist' },
      { id: 'verbrauch', titel: 'Ihr Strombedarf steigt' },
      { id: 'strompreis', titel: 'Strompreis-Entwicklung' },
      { id: 'kostenOhne', titel: 'Kosten ohne Anlage' },
      { id: 'warum', titel: 'Warum NEOSOLAR' },
      { id: 'team', titel: 'Das Team' },
      { id: 'referenzen', titel: 'Referenzen' },
      { id: 'modul', titel: 'Solarmodule' },
      { id: 'wechselrichter', titel: 'Wechselrichter' },
      { id: 'speicher', titel: 'Speicher' },
      { id: 'wallbox', titel: 'Wallbox' },
      { id: 'app', titel: 'Die App' },
      { id: 'dachanalyse', titel: 'Dachanalyse' },
      { id: 'dachplaner', titel: 'Ihr Dach belegen' },
      { id: 'rechner', titel: 'Ihre Anlage planen' },
      { id: 'anlage', titel: 'Das kommt auf Ihr Dach' },
      { id: 'energiefluss', titel: 'Ihr Energiefluss' },
      { id: 'motive', titel: 'Ihr Nutzen' },
      { id: 'zusatzrechner', titel: 'Rechnen wir es durch' },
      { id: 'bausteine', titel: 'Woher das Geld kommt' },
      { id: 'gesamtvergleich', titel: 'Vollkosten-Vergleich' },
      { id: 'monatsvergleich', titel: 'Pro Monat' },
      { id: 'amortisation', titel: 'Der Wendepunkt' },
      { id: 'varianten', titel: 'Ihre drei Möglichkeiten' },
      { id: 'finanzierung', titel: 'Kauf oder Finanzierung' },
      { id: 'aktion', titel: 'Aktion' },
      { id: 'speicherUpgrade', titel: 'Speicher-Ausbau' },
      { id: 'paket', titel: 'Zufriedenheitspaket' },
      { id: 'sicherheiten', titel: 'Ihre Sicherheiten' },
      { id: 'planung', titel: 'Planungssicherheit' },
      { id: 'betreuung', titel: 'Ihre Betreuung' },
      { id: 'unterschied', titel: 'Offerten vergleichen' },
      { id: 'fragen', titel: 'Häufige Fragen' },
      { id: 'umsetzung', titel: 'So geht es weiter' },
      { id: 'empfehlung', titel: 'Weiterempfehlung' },
      // Statt der Verkaeufer-Entscheidungsfolie: der Kunde traegt seine
      // Daten ein. Danach stehen sie in der Offerte, die er drucken kann.
      { id: 'kundenkontakt', titel: 'Ihre Offerte anfordern' },
    ],
  },
  {
    id: 'kurz',
    name: 'Kurzfassung',
    beschreibung:
      'Zahlengetrieben in 14 Folien – für den Online-Termin mit wenig Zeit oder den zweiten Kontakt.',
    folien: [
      { id: 'titel', titel: 'Begrüssung' },
      { id: 'verbrauch', titel: 'Ihr Strombedarf steigt' },
      { id: 'kostenOhne', titel: 'Kosten ohne Anlage' },
      { id: 'warum', titel: 'Warum NEOSOLAR' },
      { id: 'dachplaner', titel: 'Ihr Dach belegen' },
      { id: 'rechner', titel: 'Ihre Anlage planen' },
      { id: 'anlage', titel: 'Das kommt auf Ihr Dach' },
      { id: 'energiefluss', titel: 'Ihr Energiefluss' },
      { id: 'bausteine', titel: 'Woher das Geld kommt' },
      { id: 'gesamtvergleich', titel: 'Vollkosten-Vergleich' },
      { id: 'monatsvergleich', titel: 'Pro Monat' },
      { id: 'amortisation', titel: 'Der Wendepunkt' },
      { id: 'varianten', titel: 'Ihre drei Möglichkeiten' },
      { id: 'finanzierung', titel: 'Kauf oder Finanzierung' },
      { id: 'sicherheiten', titel: 'Ihre Sicherheiten' },
      { id: 'umsetzung', titel: 'Umsetzung' },
      { id: 'entscheidung', titel: 'Ihre Entscheidung' },
      { id: 'kontakt', titel: 'Fragen offen?' },
    ],
  },
]
