/**
 * Geometrie und Datenzugriff fuer die Dachbelegung.
 *
 * Datenquellen (beide oeffentlich, ohne Schluessel, mit CORS-Freigabe):
 * - Luftbild: swisstopo WMTS "ch.swisstopo.swissimage", WebMercator, bis Zoom 20
 * - Dachflaechen: BFE "Solarenergie: Eignung Daecher" ueber die Identify-API
 *   von api3.geo.admin.ch. Liefert je Dachteilflaeche das Polygon, die Flaeche
 *   in m2, Azimut, Neigung, Eignungsklasse und eine Ertragsprognose.
 *
 * Rechnungen laufen in einer lokalen Meterprojektion: fuer ein einzelnes
 * Gebaeude (< 200 m Ausdehnung) ist die Verzerrung vernachlaessigbar und die
 * Mathematik bleibt einfach.
 */

export interface LonLat {
  lon: number
  lat: number
}

/** Punkt in der lokalen Meterebene: x nach Osten, y nach Norden. */
export interface MeterPunkt {
  x: number
  y: number
}

// ── Kachel-Layer ──────────────────────────────────────────────────────

export const KACHEL_GROESSE = 256
/** Hoechste Stufe, die swisstopo als Kachel liefert. */
export const MAX_KACHEL_ZOOM = 20
/**
 * Darueber hinaus skalieren wir die Kacheln hoch. Das Bild wird unschaerfer,
 * aber die Module lassen sich deutlich genauer setzen – bei 1.13 m Modulbreite
 * sind auf Stufe 20 nur rund 9 Pixel pro Modulkante verfuegbar.
 */
export const MAX_ZOOM = 23
export const MIN_ZOOM = 15

/** Luftbild der swisstopo. Reihenfolge im Pfad ist {z}/{x}/{y}. */
export function kachelUrl(z: number, x: number, y: number): string {
  return `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/${z}/${x}/${y}.jpeg`
}

/** WGS84 nach normalisierten Weltkoordinaten (0..1) in WebMercator. */
export function lonLatZuWelt({ lon, lat }: LonLat): { wx: number; wy: number } {
  const wx = (lon + 180) / 360
  const s = Math.sin((lat * Math.PI) / 180)
  const wy = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
  return { wx, wy }
}

export function weltZuLonLat(wx: number, wy: number): LonLat {
  const lon = wx * 360 - 180
  const n = Math.PI - 2 * Math.PI * wy
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { lon, lat }
}

/**
 * Meter pro Bildschirmpixel. WebMercator streckt mit dem Breitengrad,
 * deshalb die Korrektur ueber den Cosinus.
 */
export function meterProPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
}

// ── Lokale Meterprojektion ────────────────────────────────────────────

const METER_PRO_GRAD_LAT = 110540

export function meterProGradLon(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180)
}

export function zuMeter(p: LonLat, ursprung: LonLat): MeterPunkt {
  return {
    x: (p.lon - ursprung.lon) * meterProGradLon(ursprung.lat),
    y: (p.lat - ursprung.lat) * METER_PRO_GRAD_LAT,
  }
}

export function zuLonLat(p: MeterPunkt, ursprung: LonLat): LonLat {
  return {
    lon: ursprung.lon + p.x / meterProGradLon(ursprung.lat),
    lat: ursprung.lat + p.y / METER_PRO_GRAD_LAT,
  }
}

/** Flaeche eines Polygons in m2 (Gauss'sche Trapezformel). */
export function flaecheM2(punkte: MeterPunkt[]): number {
  if (punkte.length < 3) return 0
  let summe = 0
  for (let i = 0; i < punkte.length; i++) {
    const a = punkte[i]
    const b = punkte[(i + 1) % punkte.length]
    summe += a.x * b.y - b.x * a.y
  }
  return Math.abs(summe) / 2
}

/** Strahlensatz-Test, ob ein Punkt im Polygon liegt. */
export function imPolygon(p: MeterPunkt, poly: MeterPunkt[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      drin = !drin
    }
  }
  return drin
}

export function schwerpunkt(poly: MeterPunkt[]): MeterPunkt {
  if (!poly.length) return { x: 0, y: 0 }
  const s = poly.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: s.x / poly.length, y: s.y / poly.length }
}

// ── Modulbelegung ─────────────────────────────────────────────────────

export interface ModulMasse {
  /** Laenge in Metern (lange Kante) */
  laenge: number
  /** Breite in Metern (kurze Kante) */
  breite: number
  wattPeak: number
}

export interface BelegungsOptionen {
  /** Hochformat: die lange Kante zeigt die Dachschraege hinauf */
  hochformat: boolean
  /** Abstand zur Dachkante in Metern */
  randabstand: number
  /** Abstand zwischen den Modulen einer Reihe in Metern */
  modulabstand: number
  /**
   * Abstand zwischen den Reihen in Metern. Auf dem Steildach entspricht er
   * dem Modulabstand, bei aufgestaenderten Flachdach-Systemen muss er den
   * Schattenwurf der vorderen Reihe aufnehmen.
   */
  reihenabstand: number
  /** Drehung des Rasters in Grad, 0 = entlang der Firstrichtung */
  drehungGrad: number
  /** Ost-West-Aufstaenderung: die Reihen kippen abwechselnd */
  ostWest?: boolean
}

// ── Unterkonstruktion ─────────────────────────────────────────────────

export type Dachart = 'STEIL' | 'FLACH'

export interface Montagesystem {
  id: string
  name: string
  hersteller: string
  dachart: Dachart
  /** Fuer welche Dachdeckung bzw. welchen Untergrund */
  untergrund: string
  /**
   * Aufstaenderungswinkel in Grad. 0 bedeutet dachparallel – dann gilt die
   * Dachneigung selbst.
   */
  aufstaenderung: number
  /** Ost-West-Aufstaenderung: die Reihen stehen paarweise Ruecken an Ruecken */
  ostWest: boolean
  /** Empfohlener Reihenabstand als Vielfaches der Modul-Hochkante */
  reihenfaktor: number
  /** Modulausrichtung, die das System vorgibt */
  hochformat: boolean
  hinweis: string
}

/**
 * Die bei NEOSOLAR eingesetzten K2-Systeme.
 *
 * Der Reihenfaktor ist der uebliche Auslegungswert fuer das Schweizer
 * Mittelland: dachparallele Systeme brauchen keinen Verschattungsabstand,
 * eine Sued-Aufstaenderung dagegen rund das Zweieinhalbfache der Modulhoehe,
 * damit sich die Reihen im Winter nicht gegenseitig verschatten.
 * Ost-West-Systeme stehen dicht, weil sich die Reihen gegenseitig stuetzen.
 */
export const MONTAGESYSTEME: Montagesystem[] = [
  {
    id: 'k2-singlerail',
    name: 'K2 SingleRail mit SolidHook 3S Alpine',
    hersteller: 'K2 Systems',
    dachart: 'STEIL',
    untergrund: 'Ziegel- und Betonsteindach',
    aufstaenderung: 0,
    ostWest: false,
    reihenfaktor: 1.02,
    hochformat: true,
    hinweis: 'Alpin-Haken für hohe Schnee- und Windlasten, Rastmontage ohne Verschraubung an der Grundplatte',
  },
  {
    id: 'k2-solidrail',
    name: 'K2 SolidRail mit Faserzementhaken',
    hersteller: 'K2 Systems',
    dachart: 'STEIL',
    untergrund: 'Eternit- und Faserzementdach',
    aufstaenderung: 0,
    ostWest: false,
    reihenfaktor: 1.02,
    hochformat: true,
    hinweis: 'Für Wellplatten und Faserzement, Befestigung im Sparren',
  },
  {
    id: 'k2-minirail',
    name: 'K2 MiniRail',
    hersteller: 'K2 Systems',
    dachart: 'STEIL',
    untergrund: 'Trapez- und Blechdach',
    aufstaenderung: 0,
    ostWest: false,
    reihenfaktor: 1.02,
    hochformat: false,
    hinweis: 'Direktmontage auf der Sicke, geklebt oder geschraubt',
  },
  {
    id: 'k2-dome-ow',
    name: 'K2 Dome 6 Ost-West',
    hersteller: 'K2 Systems',
    dachart: 'FLACH',
    untergrund: 'Flachdach mit Bitumen oder Folie',
    aufstaenderung: 10,
    ostWest: true,
    reihenfaktor: 1.05,
    hochformat: false,
    hinweis: 'Ballastiert, keine Dachdurchdringung, höchste Flächenausnutzung',
  },
  {
    id: 'k2-sdome',
    name: 'K2 S-Dome 6 Süd',
    hersteller: 'K2 Systems',
    dachart: 'FLACH',
    untergrund: 'Flachdach mit Bitumen oder Folie',
    aufstaenderung: 15,
    ostWest: false,
    reihenfaktor: 2.4,
    hochformat: false,
    hinweis: 'Südaufständerung mit dem höchsten Ertrag je Modul, dafür grössere Reihenabstände',
  },
  {
    id: 'k2-tiltup',
    name: 'K2 TiltUp Vento',
    hersteller: 'K2 Systems',
    dachart: 'FLACH',
    untergrund: 'Flachdach und flach geneigte Blechdächer',
    aufstaenderung: 10,
    ostWest: false,
    reihenfaktor: 1.9,
    hochformat: true,
    hinweis: 'Windkanalgeprüft, geringe Ballastierung',
  },
]

/**
 * Reihenabstand in Metern.
 *
 * Dachparallel gilt der reine Montagespalt. Bei Aufstaenderung ergibt sich der
 * Abstand aus dem Schattenwurf: die aufgestaenderte Reihe wirft am 21. Dezember
 * mittags bei rund 18 Grad Sonnenhoehe einen Schatten, der die naechste Reihe
 * nicht treffen darf.
 */
export function reihenabstandFuer(system: Montagesystem, modulHochkante: number): number {
  if (system.aufstaenderung === 0) return 0.02
  const belegt = modulHochkante * Math.cos((system.aufstaenderung * Math.PI) / 180)
  return Math.max(0.05, Math.round((system.reihenfaktor * modulHochkante - belegt) * 100) / 100)
}

export interface PlatziertesModul {
  id: string
  /** Eckpunkte im Uhrzeigersinn, in lokalen Metern */
  ecken: MeterPunkt[]
  mitte: MeterPunkt
  /** Rasterzelle, aus der das Modul stammt */
  reihe: number
  spalte: number
  /** Vom Benutzer abgewaehlt – zaehlt nicht zur Anlage */
  aus?: boolean
  /** Von Hand gesetzt statt aus dem Raster erzeugt */
  manuell?: boolean
  /** Bei Ost-West-Aufstaenderung: wohin diese Reihe kippt */
  richtung?: 'OST' | 'WEST'
}

/** Schluessel einer Rasterzelle, fuer Merklisten. */
export function zellenSchluessel(reihe: number, spalte: number): string {
  return `${reihe}:${spalte}`
}

/**
 * Flaeche, die frei bleiben muss: Kamin, Dachfenster, Lukarne,
 * Abschattung durch einen Baum, Sicherheitsstreifen.
 */
export interface Sperrflaeche {
  id: string
  bezeichnung: string
  /** Umriss in lokalen Metern */
  punkte: MeterPunkt[]
}

function drehe(p: MeterPunkt, winkelRad: number): MeterPunkt {
  const c = Math.cos(winkelRad)
  const s = Math.sin(winkelRad)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

/** Schneiden sich zwei Strecken? Fuer den Ueberlappungstest der Sperrflaechen. */
function strecken(a1: MeterPunkt, a2: MeterPunkt, b1: MeterPunkt, b2: MeterPunkt): boolean {
  const d = (p: MeterPunkt, q: MeterPunkt, r: MeterPunkt) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = d(b1, b2, a1)
  const d2 = d(b1, b2, a2)
  const d3 = d(a1, a2, b1)
  const d4 = d(a1, a2, b2)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/**
 * Ein Modul ist blockiert, sobald es die Sperrflaeche irgendwie beruehrt:
 * eine Ecke darin, die Sperrflaeche komplett darunter, oder sich
 * kreuzende Kanten.
 */
export function beruehrtSperrflaeche(
  ecken: MeterPunkt[],
  mitte: MeterPunkt,
  sperre: Sperrflaeche
): boolean {
  if (sperre.punkte.length < 3) return false
  if ([...ecken, mitte].some((p) => imPolygon(p, sperre.punkte))) return true
  if (sperre.punkte.some((p) => imPolygon(p, ecken))) return true
  for (let i = 0; i < ecken.length; i++) {
    const a1 = ecken[i]
    const a2 = ecken[(i + 1) % ecken.length]
    for (let j = 0; j < sperre.punkte.length; j++) {
      const b1 = sperre.punkte[j]
      const b2 = sperre.punkte[(j + 1) % sperre.punkte.length]
      if (strecken(a1, a2, b1, b2)) return true
    }
  }
  return false
}

/** Welche Rasterzelle liegt unter diesem Punkt? */
export function zelleAnPunkt(klick: MeterPunkt, raster: Raster): { reihe: number; spalte: number } {
  const lokal = drehe(klick, -raster.winkel)
  return {
    spalte: Math.round((lokal.x - raster.startX - raster.breiteX / 2) / raster.schrittX),
    reihe: Math.round((lokal.y - raster.startY - raster.hoeheY / 2) / raster.schrittY),
  }
}

/**
 * Erzeugt das Modul einer bestimmten Rasterzelle.
 *
 * Indizes ausserhalb des urspruenglichen Rasters sind erlaubt – so laesst
 * sich die Belegung von Hand ueber die Rasterkante hinaus erweitern.
 */
export function modulAusZelle(
  raster: Raster,
  reihe: number,
  spalte: number,
  ostWest = false,
  manuell = false
): PlatziertesModul {
  const x0 = raster.startX + spalte * raster.schrittX
  const y0 = raster.startY + reihe * raster.schrittY
  const ecken = [
    { x: x0, y: y0 },
    { x: x0 + raster.breiteX, y: y0 },
    { x: x0 + raster.breiteX, y: y0 + raster.hoeheY },
    { x: x0, y: y0 + raster.hoeheY },
  ].map((p) => drehe(p, raster.winkel))

  return {
    id: zellenSchluessel(reihe, spalte),
    ecken,
    mitte: drehe({ x: x0 + raster.breiteX / 2, y: y0 + raster.hoeheY / 2 }, raster.winkel),
    reihe,
    spalte,
    manuell,
    ...(ostWest ? { richtung: reihe % 2 === 0 ? ('OST' as const) : ('WEST' as const) } : {}),
  }
}

/**
 * Winkel einer Dachkante in Grad – als Rasterdrehung verwendbar.
 * Ein Doppelklick auf die Traufe richtet die Modulreihen daran aus.
 */
export function kantenwinkel(a: MeterPunkt, b: MeterPunkt): number {
  const grad = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  // Auf -180..180 normieren; parallele Gegenrichtung ergibt dasselbe Raster
  return Math.round(((grad + 180) % 180) * 10) / 10
}

/**
 * Legt ein Modulraster in das Dachpolygon.
 *
 * Vorgehen: das Polygon wird in ein Koordinatensystem gedreht, in dem die
 * Modulreihen waagrecht liegen. Dort laesst sich ein einfaches Raster ziehen.
 * Ein Modul wird uebernommen, wenn alle vier Ecken plus der Mittelpunkt im
 * Polygon liegen – mit dem Randabstand als zusaetzlichem Puffer rundherum.
 */
/**
 * Das Belegungsraster einer Dachflaeche.
 *
 * Automatik und Handarbeit muessen dasselbe Raster verwenden, sonst liegen
 * von Hand gesetzte Module schief zwischen den uebrigen.
 */
export interface Raster {
  winkel: number
  startX: number
  startY: number
  schrittX: number
  schrittY: number
  breiteX: number
  hoeheY: number
  spalten: number
  reihen: number
}

export function rasterFuer(
  polygon: MeterPunkt[],
  modul: ModulMasse,
  opt: BelegungsOptionen
): Raster | null {
  if (polygon.length < 3) return null

  const winkel = (opt.drehungGrad * Math.PI) / 180
  const gedreht = polygon.map((p) => drehe(p, -winkel))

  const breiteX = opt.hochformat ? modul.breite : modul.laenge
  const hoeheY = opt.hochformat ? modul.laenge : modul.breite
  const schrittX = breiteX + opt.modulabstand
  const schrittY = hoeheY + opt.reihenabstand

  const minX = Math.min(...gedreht.map((p) => p.x))
  const maxX = Math.max(...gedreht.map((p) => p.x))
  const minY = Math.min(...gedreht.map((p) => p.y))
  const maxY = Math.max(...gedreht.map((p) => p.y))

  // Raster mittig ausrichten, damit die Belegung symmetrisch wirkt
  const spalten = Math.floor((maxX - minX - 2 * opt.randabstand + opt.modulabstand) / schrittX)
  const reihen = Math.floor((maxY - minY - 2 * opt.randabstand + opt.reihenabstand) / schrittY)
  if (spalten < 1 || reihen < 1) return null

  return {
    winkel,
    startX: minX + (maxX - minX - (spalten * schrittX - opt.modulabstand)) / 2,
    startY: minY + (maxY - minY - (reihen * schrittY - opt.reihenabstand)) / 2,
    schrittX,
    schrittY,
    breiteX,
    hoeheY,
    spalten,
    reihen,
  }
}

export function belegeDach(
  polygon: MeterPunkt[],
  modul: ModulMasse,
  opt: BelegungsOptionen,
  sperrflaechen: Sperrflaeche[] = []
): PlatziertesModul[] {
  const raster = rasterFuer(polygon, modul, opt)
  if (!raster) return []

  const { winkel, startX, startY, schrittX, schrittY, breiteX, hoeheY, spalten, reihen } = raster
  const gedreht = polygon.map((p) => drehe(p, -winkel))

  const module: PlatziertesModul[] = []
  const r = opt.randabstand

  for (let reihe = 0; reihe < reihen; reihe++) {
    for (let spalte = 0; spalte < spalten; spalte++) {
      const x0 = startX + spalte * schrittX
      const y0 = startY + reihe * schrittY
      const x1 = x0 + breiteX
      const y1 = y0 + hoeheY

      // Pruefpunkte mit Randabstand nach aussen versetzt
      const pruefung: MeterPunkt[] = [
        { x: x0 - r, y: y0 - r },
        { x: x1 + r, y: y0 - r },
        { x: x1 + r, y: y1 + r },
        { x: x0 - r, y: y1 + r },
        { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
      ]
      if (!pruefung.every((p) => imPolygon(p, gedreht))) continue

      const ecken = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ].map((p) => drehe(p, winkel))
      const mitte = drehe({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, winkel)

      // Kamin, Dachfenster und Verschattung bleiben frei
      if (sperrflaechen.some((s) => beruehrtSperrflaeche(ecken, mitte, s))) continue

      module.push({
        id: zellenSchluessel(reihe, spalte),
        ecken,
        mitte,
        reihe,
        spalte,
        ...(opt.ostWest ? { richtung: reihe % 2 === 0 ? ('OST' as const) : ('WEST' as const) } : {}),
      })
    }
  }
  return module
}

// ── Geodienste des Bundes ─────────────────────────────────────────────

export interface AdressTreffer {
  label: string
  lon: number
  lat: number
}

/** Adresssuche der swisstopo. Liefert die Treffer mit WGS84-Koordinaten. */
export async function sucheAdresse(text: string): Promise<AdressTreffer[]> {
  const url =
    'https://api3.geo.admin.ch/rest/services/api/SearchServer' +
    `?searchText=${encodeURIComponent(text)}&type=locations&sr=4326&limit=6`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Adresssuche nicht erreichbar')
  const daten = (await res.json()) as {
    results?: Array<{ attrs: { label: string; lon: number; lat: number } }>
  }
  return (daten.results ?? []).map((r) => ({
    // Die API liefert den Treffer mit <b>-Auszeichnung
    label: r.attrs.label.replace(/<[^>]+>/g, ''),
    lon: r.attrs.lon,
    lat: r.attrs.lat,
  }))
}

export interface Dachflaeche {
  id: number
  /** Umriss in WGS84 */
  ring: LonLat[]
  /** Reale Dachflaeche in m2, inklusive Neigung */
  flaecheM2: number
  /** Azimut in Grad: 0 = Sued, negativ = Ost, positiv = West */
  azimut: number
  neigungGrad: number
  /** Eignungsklasse des BFE, 1 (gering) bis 5 (hervorragend) */
  klasse: number
  klasseText: string
  /** Ertragsprognose des BFE fuer die ganze Flaeche in kWh pro Jahr */
  stromertragKwh: number
  /** Mittlere Einstrahlung in kWh je m2 und Jahr */
  einstrahlung: number
  gebaeudeId: number | null
}

/**
 * Fragt die Dachflaechen an einer Position ab.
 *
 * Die Identify-API braucht einen Kartenausschnitt als Bezug. Wir geben ein
 * kleines Fenster um den Klickpunkt an, damit die Toleranz in Pixeln einem
 * sinnvollen Radius in Metern entspricht.
 */
export async function ladeDachflaechen(p: LonLat): Promise<Dachflaeche[]> {
  const d = 0.0006 // rund 60 m Fenster
  const url =
    'https://api3.geo.admin.ch/rest/services/all/MapServer/identify' +
    `?geometry=${p.lon},${p.lat}` +
    '&geometryType=esriGeometryPoint' +
    '&layers=all:ch.bfe.solarenergie-eignung-daecher' +
    '&tolerance=0' +
    `&mapExtent=${p.lon - d},${p.lat - d},${p.lon + d},${p.lat + d}` +
    '&imageDisplay=600,600,96&sr=4326&returnGeometry=true'

  const res = await fetch(url)
  if (!res.ok) throw new Error('Dachdaten nicht erreichbar')
  const daten = (await res.json()) as {
    results?: Array<{
      featureId: number
      geometry?: { rings?: number[][][] }
      attributes: Record<string, unknown>
    }>
  }

  const zahl = (v: unknown, standard = 0) => (typeof v === 'number' ? v : standard)

  return (daten.results ?? [])
    .filter((r) => r.geometry?.rings?.length)
    .map((r) => ({
      id: r.featureId,
      ring: (r.geometry!.rings![0] ?? []).map(([lon, lat]) => ({ lon, lat })),
      flaecheM2: zahl(r.attributes.flaeche),
      azimut: zahl(r.attributes.ausrichtung),
      neigungGrad: zahl(r.attributes.neigung),
      klasse: zahl(r.attributes.klasse),
      klasseText: typeof r.attributes.klasse_text === 'string' ? r.attributes.klasse_text : '',
      stromertragKwh: zahl(r.attributes.stromertrag),
      einstrahlung: zahl(r.attributes.mstrahlung),
      gebaeudeId: typeof r.attributes.gwr_egid === 'number' ? r.attributes.gwr_egid : null,
    }))
    .sort((a, b) => b.flaecheM2 - a.flaecheM2)
}

// ── Wechselrichter-Auslegung ──────────────────────────────────────────

export interface Wechselrichter {
  name: string
  typ: string
  /** AC-Nennleistung in kW */
  kw: number
  phasen: 1 | 3
  /** Anzahl MPP-Tracker */
  mppt: number
  /** Maximal zulaessige DC-Leistung in kWp */
  maxDcKwp: number
  hybrid: boolean
}

/**
 * Huawei-Portfolio, wie es NEOSOLAR einsetzt.
 * Die maximale DC-Leistung folgt der ueblichen Freigabe von 1.5 x AC bei
 * den Hybridgeraeten und 1.35 x AC bei den Commercial-Geraeten.
 */
export const WECHSELRICHTER: Wechselrichter[] = [
  { name: 'SUN2000-3KTL-M1', typ: 'SUN2000-3KTL-M1', kw: 3, phasen: 3, mppt: 2, maxDcKwp: 4.5, hybrid: true },
  { name: 'SUN2000-4KTL-M1', typ: 'SUN2000-4KTL-M1', kw: 4, phasen: 3, mppt: 2, maxDcKwp: 6, hybrid: true },
  { name: 'SUN2000-5KTL-M1', typ: 'SUN2000-5KTL-M1', kw: 5, phasen: 3, mppt: 2, maxDcKwp: 7.5, hybrid: true },
  { name: 'SUN2000-6KTL-M1', typ: 'SUN2000-6KTL-M1', kw: 6, phasen: 3, mppt: 2, maxDcKwp: 9, hybrid: true },
  { name: 'SUN2000-8KTL-M1', typ: 'SUN2000-8KTL-M1', kw: 8, phasen: 3, mppt: 2, maxDcKwp: 12, hybrid: true },
  { name: 'SUN2000-10KTL-M1', typ: 'SUN2000-10KTL-M1', kw: 10, phasen: 3, mppt: 2, maxDcKwp: 15, hybrid: true },
  { name: 'SUN2000-12K-MB0', typ: 'SUN2000-12K-MB0', kw: 12, phasen: 3, mppt: 2, maxDcKwp: 16.2, hybrid: false },
  { name: 'SUN2000-15K-MB0', typ: 'SUN2000-15K-MB0', kw: 15, phasen: 3, mppt: 2, maxDcKwp: 20.3, hybrid: false },
  { name: 'SUN2000-17K-MB0', typ: 'SUN2000-17K-MB0', kw: 17, phasen: 3, mppt: 2, maxDcKwp: 23, hybrid: false },
  { name: 'SUN2000-20K-MB0', typ: 'SUN2000-20K-MB0', kw: 20, phasen: 3, mppt: 2, maxDcKwp: 27, hybrid: false },
  { name: 'SUN2000-25K-MB0', typ: 'SUN2000-25K-MB0', kw: 25, phasen: 3, mppt: 2, maxDcKwp: 33.8, hybrid: false },
]

export interface WrVorschlag {
  geraete: Array<{ geraet: Wechselrichter; anzahl: number }>
  /** Summe der AC-Leistung in kW */
  acKw: number
  /** Verhaeltnis DC zu AC – der uebliche Auslegungswert liegt bei 1.1 bis 1.25 */
  dcAcVerhaeltnis: number
  /** Wird ein Speicher geplant, muss das Geraet hybridfaehig sein */
  hybrid: boolean
  begruendung: string
  /** Warnung, wenn die Auslegung ausserhalb des ueblichen Bereichs liegt */
  hinweis: string | null
}

/**
 * Waehlt den passenden Wechselrichter zur Anlagengroesse.
 *
 * Das ist eine Auslegungsregel, keine KI: massgeblich sind das
 * DC/AC-Verhaeltnis, die maximale DC-Leistung des Geraets und die Frage,
 * ob ein Speicher dazukommt. In der Schweiz ist eine leichte
 * Ueberdimensionierung der Module ueblich, weil die Nennleistung nur an
 * wenigen Stunden im Jahr erreicht wird und der Wechselrichter im
 * Teillastbereich besser arbeitet.
 */
export function waehleWechselrichter(kwp: number, mitSpeicher: boolean): WrVorschlag | null {
  if (kwp <= 0) return null

  const ziel = kwp / 1.15
  const passend = WECHSELRICHTER.filter(
    (w) => w.maxDcKwp >= kwp && (!mitSpeicher || w.hybrid)
  ).sort((a, b) => a.kw - b.kw)

  // Ein Geraet reicht: das kleinste, das die DC-Leistung traegt
  const einzeln = passend.find((w) => w.kw >= ziel * 0.85) ?? passend[0]
  if (einzeln) {
    const verhaeltnis = kwp / einzeln.kw
    return {
      geraete: [{ geraet: einzeln, anzahl: 1 }],
      acKw: einzeln.kw,
      dcAcVerhaeltnis: Math.round(verhaeltnis * 100) / 100,
      hybrid: einzeln.hybrid,
      begruendung:
        `${kwp.toFixed(2)} kWp auf ${einzeln.kw} kW AC ergibt ein Verhältnis von ` +
        `${verhaeltnis.toFixed(2)}. ${einzeln.mppt} MPP-Tracker` +
        (einzeln.hybrid ? ', hybridfähig für den Speicher' : ', ohne Speicheranbindung') +
        '.',
      hinweis:
        verhaeltnis > 1.35
          ? 'Das DC/AC-Verhältnis liegt über 1.35 – im Sommer wird abgeregelt. Bitte prüfen.'
          : verhaeltnis < 0.9
            ? 'Der Wechselrichter ist reichlich gross gewählt, ein kleineres Gerät wäre günstiger.'
            : null,
    }
  }

  // Grosse Anlage: mehrere gleiche Geraete parallel
  const groesstes = [...WECHSELRICHTER]
    .filter((w) => !mitSpeicher || w.hybrid)
    .sort((a, b) => b.kw - a.kw)[0]
  if (!groesstes) return null

  const anzahl = Math.ceil(kwp / groesstes.maxDcKwp)
  const acKw = groesstes.kw * anzahl
  return {
    geraete: [{ geraet: groesstes, anzahl }],
    acKw,
    dcAcVerhaeltnis: Math.round((kwp / acKw) * 100) / 100,
    hybrid: groesstes.hybrid,
    begruendung:
      `${kwp.toFixed(2)} kWp überschreiten ein Einzelgerät. ${anzahl} × ${groesstes.name} ` +
      `ergeben ${acKw} kW AC.`,
    hinweis: 'Mehrere Wechselrichter: die Anmeldung beim Netzbetreiber bitte früh einreichen.',
  }
}

// ── Umrechnung fuer den Rechner ───────────────────────────────────────

export type RechnerAusrichtung = 'SUED' | 'SUEDOST' | 'SUEDWEST' | 'OST' | 'WEST' | 'OST_WEST'

/**
 * Der BFE-Azimut in die Himmelsrichtungen des Rechners.
 * 0 = Sued, negative Werte nach Osten, positive nach Westen.
 */
export function azimutZuAusrichtung(azimut: number): RechnerAusrichtung {
  const a = ((azimut + 180) % 360) - 180
  if (a >= -22.5 && a <= 22.5) return 'SUED'
  if (a > 22.5 && a <= 67.5) return 'SUEDWEST'
  if (a < -22.5 && a >= -67.5) return 'SUEDOST'
  if (a > 67.5 && a <= 112.5) return 'WEST'
  if (a < -67.5 && a >= -112.5) return 'OST'
  // Nordlagen sind fuer eine Belegung nicht sinnvoll; wir melden Ost-West,
  // damit der Rechner nicht mit einem Suedwert schoenrechnet.
  return 'OST_WEST'
}

/** Himmelsrichtung als Text, fuer die Anzeige im Bericht. */
export function azimutText(azimut: number): string {
  const a = ((azimut + 180) % 360) - 180
  const richtungen: Array<[number, string]> = [
    [-180, 'Nord'], [-135, 'Nordost'], [-90, 'Ost'], [-45, 'Südost'],
    [0, 'Süd'], [45, 'Südwest'], [90, 'West'], [135, 'Nordwest'], [180, 'Nord'],
  ]
  let beste = richtungen[0]
  let abstand = Infinity
  for (const r of richtungen) {
    const diff = Math.abs(a - r[0])
    if (diff < abstand) {
      abstand = diff
      beste = r
    }
  }
  return beste[1]
}

/**
 * Die Firstrichtung als Rasterwinkel in Grad.
 *
 * Die Falllinie zeigt in Richtung des Azimuts, die Modulreihen laufen
 * rechtwinklig dazu – also parallel zum First.
 */
export function firstwinkelAusAzimut(azimut: number): number {
  return -azimut
}
