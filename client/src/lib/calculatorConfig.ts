import type { CalculatorConfig, CalculatorInput } from './pvCalculator'

/**
 * Startwerte fuer den Verkaufsrechner.
 *
 * Preise: abgeleitet aus 14 echten NEOSOLAR-Kalkulationen (Stand 07/2026).
 *   Ø Verkaufspreis CHF 32'830 · Ø Material 11'192 · Ø Elektriker 3'250
 *   Ø Montage 6'313 · Ø Rohmarge 12'075 (36.8 %)
 *   Die kWp-Werte waren in den Projekten nicht erfasst, die Staffel ist deshalb
 *   an marktuebliche Schweizer Preise angelehnt und trifft im Mittel die echten
 *   Abschluesse. -> Im Admin unter "Rechner-Preise" pruefen und feinjustieren.
 *
 * Strompreis: ElCom-Median H4 2026 = 27.7 Rp./kWh.
 * Foerderung: Pronovo EIV 2026, Leistungsbeitrag ca. 360 CHF/kWp bis 30 kWp,
 *   darueber ca. 300 CHF/kWp. Verbindlich ist immer der Pronovo-Tarifrechner.
 * Strompreissteigerung 2 %/Jahr entspricht dem Basisszenario der
 *   Verkaufspraesentation (≈ 47 Rp./kWh im Jahr 2051).
 */
export const DEFAULT_CONFIG: CalculatorConfig = {
  // ── Technik ──
  spezifischerErtragBasis: 1000,
  ausrichtungsFaktor: {
    SUED: 1.0,
    SUEDOST: 0.95,
    SUEDWEST: 0.95,
    OST: 0.85,
    WEST: 0.85,
    OST_WEST: 0.88,
  },
  degradationProJahr: 0.005,
  einspeiseverguetungRp: 8,
  strompreisSteigerung: 0.02,
  speicherZyklenProJahr: 280,
  speicherWirkungsgrad: 0.9,
  maxAutarkiegrad: 0.8,
  betriebskostenProJahr: 250,
  mehrverbrauchWaermepumpe: 4500,
  mehrverbrauchEAuto: 3000,

  // ── Foerderung ──
  eivGrundbeitrag: 200,
  eivLeistungBis30: 360,
  eivLeistungAb30: 300,

  // ── Preise ──
  grundpreis: 3500,
  preisProKwpStaffel: [
    { bisKwp: 10, chfProKwp: 1550 },
    { bisKwp: 20, chfProKwp: 1350 },
    { bisKwp: 30, chfProKwp: 1150 },
    { bisKwp: 100, chfProKwp: 1000 },
  ],
  speicherPreisProKwh: 700,
  wallboxPreis: 2400,
  geruestPreis: 2000,
  dachtypZuschlagProKwp: {
    ZIEGEL: 0,
    BLECH: -50,
    FLACHDACH: 120,
    EERNIT: 80,
  },
  steuerabzugProzent: 15,
  betrachtungsJahre: 25,
  kalkulationszinssatz: 0.02,
  mwstProzent: 8.1,
}

/** Ausgangswerte fuer ein typisches Schweizer Einfamilienhaus. */
export const DEFAULT_INPUT: CalculatorInput = {
  kwp: 12,
  ausrichtung: 'SUED',
  neigung: 30,
  dachtyp: 'ZIEGEL',
  verbrauchKwh: 4500,
  speicherKwh: 0,
  wallbox: false,
  geplantWaermepumpe: false,
  geplantEAuto: false,
  strompreisRp: 27.7,
  geruest: true,
}

export const AUSRICHTUNG_LABELS: Record<CalculatorInput['ausrichtung'], string> = {
  SUED: 'Süd',
  SUEDOST: 'Südost',
  SUEDWEST: 'Südwest',
  OST: 'Ost',
  WEST: 'West',
  OST_WEST: 'Ost/West',
}

export const DACHTYP_LABELS: Record<CalculatorInput['dachtyp'], string> = {
  ZIEGEL: 'Ziegeldach',
  BLECH: 'Blechdach',
  FLACHDACH: 'Flachdach',
  EERNIT: 'Eternit',
}

/** Komponenten aus der Verkaufspraesentation – erscheinen in der Offerte. */
export const KOMPONENTEN = {
  modul: {
    name: 'LONGi Hi-MO X10 Explorer',
    typ: 'LR7-54HVH',
    watt: 490,
    garantieJahre: 30,
    hagelklasse: 3,
    // Technische Daten aus dem Datenblatt der bestehenden NEOSOLAR-Offerte
    zellen: '108 Halbzellen',
    masse: '1800 × 1134 × 30 mm',
    /** Masse in Metern – Grundlage fuer die Dachbelegung */
    laengeM: 1.8,
    breiteM: 1.134,
    gewichtKg: 21.6,
    wirkungsgrad: 24.0,
    degradationErstesJahr: 1.0,
    degradationFolgejahre: 0.35,
    lastDruckPa: 5400,
    lastZugPa: 2400,
  },
  wechselrichter: {
    name: 'Huawei SUN2000',
    typ: 'SUN2000-12/15/17/20/25K-MB0',
    hinweis: 'Hybrid, Battery-Ready, AFCI Lichtbogenschutz',
  },
  speicher: {
    name: 'Huawei LUNA2000',
    typ: 'LUNA2000-7/14/21-S1',
    modulKwh: 6.9,
    hinweis: 'LFP-Zellchemie, 100 % Entladetiefe, IP66',
  },
  /**
   * Optionale Komponenten mit den Preisen aus der bestehenden
   * NEOSOLAR-Offerte (exkl. MwSt und Montage, Stand 2026).
   */
  optionen: [
    { id: 's7', name: 'Speicher LUNA2000-7 (S7)', kwh: 6.9, preis: 5046.8 },
    { id: 's14', name: 'Speicher LUNA2000-14 (S14)', kwh: 13.8, preis: 9071.2 },
    { id: 's21', name: 'Speicher LUNA2000-21 (S21)', kwh: 20.7, preis: 10889.6 },
    { id: 'backup', name: 'Huawei Backup Box (Notstrom)', kwh: 0, preis: 1109.6 },
    { id: 'charger', name: 'Huawei Smart Charger SCharger-22KT-S0', kwh: 0, preis: 1400.0 },
  ] as Array<{ id: string; name: string; kwh: number; preis: number }>,
  montage: {
    name: 'K2 SingleRail mit CrossHook 3S',
    hinweis: 'Kreuzverbund für hohe Lasten, Rastmontage ohne Verschraubung an der Grundplatte',
  },
  wallbox: {
    name: 'Huawei sCharger',
    typ: 'sCharger-7KS-S0 / 22KT-S0',
    hinweis: 'PV-Überschussladen, Phasenumschaltung, App-Steuerung',
  },
} as const
