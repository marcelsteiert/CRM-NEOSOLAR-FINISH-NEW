/**
 * Rechen-Engine fuer den Verkaufsrechner (Schweizer PV-Markt).
 *
 * Laeuft im Browser, damit die Regler in der Praesentation ohne Latenz reagieren.
 * Alle Annahmen kommen als `CalculatorConfig` von aussen (Admin -> Rechner-Preise),
 * damit im Code keine Preise fest verdrahtet sind.
 *
 * Quellen der Standardannahmen siehe DEFAULT_CONFIG in calculatorConfig.ts.
 */

// ── Eingaben ──────────────────────────────────────────────────────────

export type Ausrichtung = 'SUED' | 'SUEDOST' | 'SUEDWEST' | 'OST' | 'WEST' | 'OST_WEST'
export type Dachtyp = 'ZIEGEL' | 'BLECH' | 'FLACHDACH' | 'EERNIT'

export interface CalculatorInput {
  /** Anlagengroesse in kWp */
  kwp: number
  ausrichtung: Ausrichtung
  /** Dachneigung in Grad (0 = flach) */
  neigung: number
  dachtyp: Dachtyp
  /** Heutiger Jahresstromverbrauch in kWh */
  verbrauchKwh: number
  /** Speicherkapazitaet in kWh (0 = kein Speicher) */
  speicherKwh: number
  wallbox: boolean
  /** Geplante Zusatzverbraucher – erhoehen den Verbrauch in der Prognose */
  geplantWaermepumpe: boolean
  geplantEAuto: boolean
  /** Aktueller Strompreis in Rp./kWh */
  strompreisRp: number
  /** Anzahl Geruestseiten bzw. Aufwandstufe fuer die Montage */
  geruest: boolean
  /**
   * Manuell erfasste Zusatzleistungen, die in der Offerte einzeln
   * ausgewiesen werden – z.B. Demontage der alten Anlage oder
   * Anpassungen am Zaehlerkasten.
   */
  zusatzPositionen?: ZusatzPosition[]
  /** Gewaehlte Zahlungsart – erscheint in der Offerte */
  zahlungsart?: 'TRANCHEN' | 'FINANZIERUNG' | 'ANZAHLUNG90'
  /** Aktionsrabatt in Prozent auf den Anlagenpreis (0 = keine Aktion) */
  rabattProzent?: number
  /** Bezeichnung der Aktion, erscheint in der Offerte */
  rabattTitel?: string
  /** Zufriedenheitspaket mit anbieten */
  zufriedenheitspaket?: boolean
}

export interface ZusatzPosition {
  id: string
  bezeichnung: string
  betrag: number
}

// ── Konfiguration (aus dem Admin-Bereich) ─────────────────────────────

export interface CalculatorConfig {
  /** Spezifischer Ertrag bei Sued/30° in kWh pro kWp und Jahr */
  spezifischerErtragBasis: number
  /** Ertragsfaktoren je Ausrichtung, bezogen auf Sued = 1.0 */
  ausrichtungsFaktor: Record<Ausrichtung, number>
  /** Jaehrlicher Leistungsverlust der Module (z.B. 0.005 = 0.5 %) */
  degradationProJahr: number
  /** Rueckliefervergueting in Rp./kWh */
  einspeiseverguetungRp: number
  /** Erwartete Strompreissteigerung pro Jahr (z.B. 0.02 = 2 %) */
  strompreisSteigerung: number
  /** Nutzbare Speicherzyklen pro Jahr */
  speicherZyklenProJahr: number
  /** Round-Trip-Wirkungsgrad des Speichers */
  speicherWirkungsgrad: number
  /**
   * Obergrenze fuer den Autarkiegrad (z.B. 0.8 = 80 %).
   * Ohne Saisonspeicher ist Vollautarkie in der Schweiz nicht erreichbar:
   * im Dezember/Januar liefert die Anlage nur einen Bruchteil des Jahresmittels.
   * Verhindert, dass der Rechner dem Kunden 100 % verspricht.
   */
  maxAutarkiegrad: number
  /** Betriebskosten pro Jahr (Versicherung, Monitoring, Reinigung) in CHF */
  betriebskostenProJahr: number
  /** Mehrverbrauch in kWh, wenn Waermepumpe bzw. E-Auto geplant sind */
  mehrverbrauchWaermepumpe: number
  mehrverbrauchEAuto: number

  // Foerderung (Pronovo Einmalverguetung)
  eivGrundbeitrag: number
  /** Leistungsbeitrag CHF/kWp bis 30 kWp */
  eivLeistungBis30: number
  /** Leistungsbeitrag CHF/kWp ab 30 kWp */
  eivLeistungAb30: number

  // Preise
  /** Grundpreis pro Anlage in CHF (Planung, Bewilligung, Inbetriebnahme) */
  grundpreis: number
  /** Gestaffelter Preis pro kWp – gilt bis zur jeweiligen Obergrenze */
  preisProKwpStaffel: Array<{ bisKwp: number; chfProKwp: number }>
  /** Speicherpreis pro kWh in CHF */
  speicherPreisProKwh: number
  wallboxPreis: number
  geruestPreis: number
  /** Zuschlag je Dachtyp in CHF pro kWp */
  dachtypZuschlagProKwp: Record<Dachtyp, number>
  /** Optionaler Steuerabzug in Prozent der Investition (kantonal unterschiedlich) */
  steuerabzugProzent: number
  /** Betrachtungszeitraum der Wirtschaftlichkeitsrechnung in Jahren */
  betrachtungsJahre: number
  /** Zinssatz fuer Kapitalwert und Stromgestehungskosten (z.B. 0.02 = 2 %) */
  kalkulationszinssatz: number
  /** MwSt-Satz in Prozent – wird auf den Nettopreis aufgeschlagen */
  mwstProzent: number
}

// ── Ergebnis ──────────────────────────────────────────────────────────

export interface JahresZeile {
  jahr: number
  ertragKwh: number
  eigenverbrauchKwh: number
  einspeisungKwh: number
  strompreisRp: number
  ersparnisChf: number
  kumuliertChf: number
}

export interface CalculatorResult {
  // Technik
  jahresertragKwh: number
  spezifischerErtrag: number
  prognoseVerbrauchKwh: number
  eigenverbrauchKwh: number
  einspeisungKwh: number
  /** Anteil des Solarstroms, der selbst genutzt wird */
  eigenverbrauchsquote: number
  /** Anteil des Verbrauchs, der durch die Anlage gedeckt wird */
  autarkiegrad: number
  co2EinsparungKgProJahr: number

  // Preis
  bruttoPreis: number
  foerderung: number
  steuerabzug: number
  nettoInvestition: number
  preisProKwp: number
  /** Summe der manuell erfassten Zusatzleistungen */
  zusatzSumme: number
  /** Gewaehrter Aktionsrabatt in CHF */
  rabatt: number
  /** Preis ohne MwSt */
  nettoPreis: number
  /** MwSt-Betrag */
  mwst: number

  // Wirtschaftlichkeit
  ersparnisJahr1: number
  ersparnisProMonat: number
  amortisationJahre: number | null
  gesamtErsparnis: number
  renditeProzent: number
  jahresverlauf: JahresZeile[]

  /** Kapitalwert: heutiger Wert aller Ersparnisse minus Investition */
  npv: number
  /** Interner Zinsfuss in Prozent, null wenn nicht bestimmbar */
  irr: number | null
  /** Stromgestehungskosten in Rp./kWh – Vergleichswert zum Netztarif */
  lcoe: number

  // Vergleich: was kostet Nichtstun?
  stromkostenOhneAnlage: number
  stromkostenMitAnlage: number
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────

/**
 * Neigungsfaktor: 30° ist optimal, flach und steil verlieren.
 * Bewusst flache Kurve – bei Schweizer Daechern liegt der Unterschied
 * zwischen 15° und 45° nur bei wenigen Prozent.
 */
function neigungsFaktor(neigung: number): number {
  const optimal = 30
  const abweichung = Math.abs(neigung - optimal)
  return Math.max(0.75, 1 - (abweichung / 100) * 0.55)
}

/**
 * Eigenverbrauchsquote ohne Speicher, abhaengig vom Deckungsgrad
 * e = Jahresertrag / Jahresverbrauch. Stuetzwerte aus der Praxis:
 * kleine Anlage relativ zum Verbrauch -> fast alles wird selbst genutzt,
 * grosse Anlage -> viel Ueberschuss.
 */
function eigenverbrauchsquoteOhneSpeicher(e: number): number {
  const stuetzwerte: Array<[number, number]> = [
    [0.25, 0.85],
    [0.5, 0.6],
    [0.75, 0.45],
    [1.0, 0.35],
    [1.5, 0.27],
    [2.0, 0.22],
    [3.0, 0.16],
    [5.0, 0.1],
  ]
  if (e <= stuetzwerte[0][0]) return stuetzwerte[0][1]
  const letzte = stuetzwerte[stuetzwerte.length - 1]
  if (e >= letzte[0]) return letzte[1]
  for (let i = 0; i < stuetzwerte.length - 1; i++) {
    const [e1, q1] = stuetzwerte[i]
    const [e2, q2] = stuetzwerte[i + 1]
    if (e >= e1 && e <= e2) {
      const anteil = (e - e1) / (e2 - e1)
      return q1 + (q2 - q1) * anteil
    }
  }
  return 0.35
}

function rundeAuf(wert: number, schritt: number): number {
  return Math.round(wert / schritt) * schritt
}

/** Kapitalwert einer Zahlungsreihe. cashflows[0] ist die Investition (negativ). */
function kapitalwert(cashflows: number[], zinssatz: number): number {
  return cashflows.reduce((summe, cf, jahr) => summe + cf / Math.pow(1 + zinssatz, jahr), 0)
}

/**
 * Interner Zinsfuss per Bisektion. Robuster als Newton, weil es bei
 * unguenstigen Zahlungsreihen nicht divergiert. null, wenn im
 * durchsuchten Bereich kein Vorzeichenwechsel liegt.
 */
function internerZinsfuss(cashflows: number[]): number | null {
  let unten = -0.9
  let oben = 1.0
  let fUnten = kapitalwert(cashflows, unten)
  let fOben = kapitalwert(cashflows, oben)
  if (fUnten * fOben > 0) return null

  for (let i = 0; i < 200; i++) {
    const mitte = (unten + oben) / 2
    const fMitte = kapitalwert(cashflows, mitte)
    if (Math.abs(fMitte) < 0.01) return mitte
    if (fUnten * fMitte < 0) {
      oben = mitte
      fOben = fMitte
    } else {
      unten = mitte
      fUnten = fMitte
    }
  }
  return (unten + oben) / 2
}

// ── Hauptberechnung ───────────────────────────────────────────────────

export function berechne(input: CalculatorInput, config: CalculatorConfig): CalculatorResult {
  const kwp = Math.max(0, input.kwp)

  // ── Ertrag ──
  const spezifischerErtrag =
    config.spezifischerErtragBasis *
    (config.ausrichtungsFaktor[input.ausrichtung] ?? 1) *
    neigungsFaktor(input.neigung)
  const jahresertragKwh = kwp * spezifischerErtrag

  // ── Verbrauch inklusive geplanter Zusatzverbraucher ──
  const prognoseVerbrauchKwh =
    Math.max(0, input.verbrauchKwh) +
    (input.geplantWaermepumpe ? config.mehrverbrauchWaermepumpe : 0) +
    (input.geplantEAuto ? config.mehrverbrauchEAuto : 0)

  // ── Eigenverbrauch ──
  const deckungsgrad = prognoseVerbrauchKwh > 0 ? jahresertragKwh / prognoseVerbrauchKwh : 0
  const quoteOhneSpeicher = eigenverbrauchsquoteOhneSpeicher(deckungsgrad)
  let eigenverbrauchKwh = Math.min(jahresertragKwh * quoteOhneSpeicher, prognoseVerbrauchKwh)

  // Der Speicher verschiebt Ueberschuss in den Abend. Begrenzt durch das,
  // was er physikalisch durchsetzen kann, und durch den vorhandenen Ueberschuss.
  if (input.speicherKwh > 0) {
    const ueberschuss = Math.max(0, jahresertragKwh - eigenverbrauchKwh)
    const restBedarf = Math.max(0, prognoseVerbrauchKwh - eigenverbrauchKwh)
    const speicherPotenzial =
      input.speicherKwh * config.speicherZyklenProJahr * config.speicherWirkungsgrad
    eigenverbrauchKwh += Math.min(speicherPotenzial, ueberschuss * 0.75, restBedarf)
  }

  // Saisonale Grenze: der Winter laesst sich mit einem Tagesspeicher nicht ueberbruecken.
  const autarkieObergrenze = prognoseVerbrauchKwh * config.maxAutarkiegrad
  eigenverbrauchKwh = Math.min(
    eigenverbrauchKwh,
    jahresertragKwh,
    prognoseVerbrauchKwh,
    autarkieObergrenze
  )
  const einspeisungKwh = Math.max(0, jahresertragKwh - eigenverbrauchKwh)
  const eigenverbrauchsquote = jahresertragKwh > 0 ? eigenverbrauchKwh / jahresertragKwh : 0
  const autarkiegrad = prognoseVerbrauchKwh > 0 ? eigenverbrauchKwh / prognoseVerbrauchKwh : 0

  // ── Preis ──
  let kwpPreis = 0
  let restKwp = kwp
  let untereGrenze = 0
  for (const stufe of config.preisProKwpStaffel) {
    if (restKwp <= 0) break
    const inDieserStufe = Math.min(restKwp, Math.max(0, stufe.bisKwp - untereGrenze))
    kwpPreis += inDieserStufe * stufe.chfProKwp
    restKwp -= inDieserStufe
    untereGrenze = stufe.bisKwp
  }
  // Ueber der letzten Staffelgrenze gilt der letzte Preis weiter
  if (restKwp > 0 && config.preisProKwpStaffel.length > 0) {
    kwpPreis += restKwp * config.preisProKwpStaffel[config.preisProKwpStaffel.length - 1].chfProKwp
  }

  const dachZuschlag = (config.dachtypZuschlagProKwp[input.dachtyp] ?? 0) * kwp
  // Speicherpreis: echte Staffelpreise aus der Offerte, sonst linear
  const speicherStaffel: Array<[number, number]> = [
    [6.9, 5046.8],
    [13.8, 9071.2],
    [20.7, 10889.6],
  ]
  const treffer = speicherStaffel.find(([k]) => Math.abs(k - input.speicherKwh) < 0.05)
  const speicherPreis = treffer ? treffer[1] : input.speicherKwh * config.speicherPreisProKwh
  // Manuell erfasste Zusatzleistungen zaehlen voll in den Preis
  const zusatzSumme = (input.zusatzPositionen ?? []).reduce((s, z) => s + (Number(z.betrag) || 0), 0)
  const nettoPreis = rundeAuf(
    config.grundpreis +
      kwpPreis +
      dachZuschlag +
      speicherPreis +
      (input.wallbox ? config.wallboxPreis : 0) +
      (input.geruest ? config.geruestPreis : 0) +
      zusatzSumme,
    10
  )
  // MwSt wird wie in der bestehenden Offerte separat ausgewiesen
  const mwst = rundeAuf((nettoPreis * config.mwstProzent) / 100, 5)
  const bruttoPreis = nettoPreis + mwst

  // ── Foerderung (Pronovo Einmalverguetung) ──
  const bis30 = Math.min(kwp, 30)
  const ab30 = Math.max(0, kwp - 30)
  const foerderung =
    kwp > 0
      ? rundeAuf(
          config.eivGrundbeitrag + bis30 * config.eivLeistungBis30 + ab30 * config.eivLeistungAb30,
          10
        )
      : 0

  // Aktionsrabatt wirkt auf den Anlagenpreis, nicht auf die Foerderung
  const rabatt = rundeAuf((bruttoPreis * Math.max(0, Math.min(50, input.rabattProzent ?? 0))) / 100, 10)
  const steuerabzug = rundeAuf(((bruttoPreis - rabatt) * config.steuerabzugProzent) / 100, 10)
  const nettoInvestition = Math.max(0, bruttoPreis - rabatt - foerderung - steuerabzug)

  // ── Wirtschaftlichkeit ueber den Betrachtungszeitraum ──
  const jahresverlauf: JahresZeile[] = []
  let kumuliert = -nettoInvestition
  let amortisationJahre: number | null = null
  let stromkostenOhneAnlage = 0
  let stromkostenMitAnlage = 0

  for (let jahr = 1; jahr <= config.betrachtungsJahre; jahr++) {
    const preisFaktor = Math.pow(1 + config.strompreisSteigerung, jahr - 1)
    const strompreisRp = input.strompreisRp * preisFaktor
    const leistungsFaktor = Math.pow(1 - config.degradationProJahr, jahr - 1)

    const ertragJahr = jahresertragKwh * leistungsFaktor
    const eigenJahr = Math.min(eigenverbrauchKwh * leistungsFaktor, prognoseVerbrauchKwh)
    const einspeisungJahr = Math.max(0, ertragJahr - eigenJahr)

    // Eingesparte Netzkosten + Vergueting fuer die Einspeisung, minus Betrieb
    const ersparnisChf =
      (eigenJahr * strompreisRp) / 100 +
      (einspeisungJahr * config.einspeiseverguetungRp) / 100 -
      config.betriebskostenProJahr

    const vorher = kumuliert
    kumuliert += ersparnisChf

    if (amortisationJahre === null && vorher < 0 && kumuliert >= 0) {
      // linear innerhalb des Jahres interpolieren
      amortisationJahre = jahr - 1 + Math.abs(vorher) / ersparnisChf
    }

    stromkostenOhneAnlage += (prognoseVerbrauchKwh * strompreisRp) / 100
    stromkostenMitAnlage += ((prognoseVerbrauchKwh - eigenJahr) * strompreisRp) / 100

    jahresverlauf.push({
      jahr,
      ertragKwh: Math.round(ertragJahr),
      eigenverbrauchKwh: Math.round(eigenJahr),
      einspeisungKwh: Math.round(einspeisungJahr),
      strompreisRp: Math.round(strompreisRp * 10) / 10,
      ersparnisChf: Math.round(ersparnisChf),
      kumuliertChf: Math.round(kumuliert),
    })
  }

  const ersparnisJahr1 = jahresverlauf.length ? jahresverlauf[0].ersparnisChf : 0
  const gesamtErsparnis = jahresverlauf.reduce((s, z) => s + z.ersparnisChf, 0)
  const renditeProzent =
    nettoInvestition > 0 && config.betrachtungsJahre > 0
      ? ((gesamtErsparnis - nettoInvestition) / nettoInvestition / config.betrachtungsJahre) * 100
      : 0

  // Kapitalwert und interner Zinsfuss auf Basis der jaehrlichen Ersparnisse
  const cashflows = [-nettoInvestition, ...jahresverlauf.map((z) => z.ersparnisChf)]
  const npv = Math.round(kapitalwert(cashflows, config.kalkulationszinssatz))
  const irrRoh = internerZinsfuss(cashflows)
  const irr = irrRoh !== null ? Math.round(irrRoh * 1000) / 10 : null

  // Stromgestehungskosten: Investition plus abdiskontierte Betriebskosten,
  // geteilt durch die abdiskontierte Stromproduktion.
  const z = config.kalkulationszinssatz
  let kostenBarwert = nettoInvestition
  let energieBarwert = 0
  jahresverlauf.forEach((zeile, i) => {
    const diskont = Math.pow(1 + z, i + 1)
    kostenBarwert += config.betriebskostenProJahr / diskont
    energieBarwert += zeile.ertragKwh / diskont
  })
  const lcoe = energieBarwert > 0 ? Math.round((kostenBarwert / energieBarwert) * 1000) / 10 : 0

  return {
    jahresertragKwh: Math.round(jahresertragKwh),
    spezifischerErtrag: Math.round(spezifischerErtrag),
    prognoseVerbrauchKwh: Math.round(prognoseVerbrauchKwh),
    eigenverbrauchKwh: Math.round(eigenverbrauchKwh),
    einspeisungKwh: Math.round(einspeisungKwh),
    eigenverbrauchsquote,
    autarkiegrad,
    // Schweizer Strommix-Verdraengung, bewusst konservativ mit 128 g CO2/kWh
    co2EinsparungKgProJahr: Math.round((jahresertragKwh * 128) / 1000),

    bruttoPreis,
    foerderung,
    steuerabzug,
    nettoInvestition,
    preisProKwp: kwp > 0 ? Math.round(bruttoPreis / kwp) : 0,
    zusatzSumme: Math.round(zusatzSumme),
    rabatt,
    nettoPreis,
    mwst,

    ersparnisJahr1,
    ersparnisProMonat: Math.round(ersparnisJahr1 / 12),
    amortisationJahre: amortisationJahre !== null ? Math.round(amortisationJahre * 10) / 10 : null,
    gesamtErsparnis: Math.round(gesamtErsparnis),
    renditeProzent: Math.round(renditeProzent * 10) / 10,
    jahresverlauf,
    npv,
    irr,
    lcoe,

    stromkostenOhneAnlage: Math.round(stromkostenOhneAnlage),
    stromkostenMitAnlage: Math.round(stromkostenMitAnlage),
  }
}

/** Modulanzahl <-> kWp, damit die Dachplanung in Modulen denken kann. */
export function kwpAusModulen(anzahl: number, modulWatt: number): number {
  return Math.round(((anzahl * modulWatt) / 1000) * 100) / 100
}
export function moduleAusKwp(kwp: number, modulWatt: number): number {
  return Math.round((kwp * 1000) / modulWatt)
}
