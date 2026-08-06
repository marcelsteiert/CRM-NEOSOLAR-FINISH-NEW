import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, MousePointer2, Pencil, Ban, Plus, Trash2, RotateCw, Loader2,
  Check, Sun, Camera, ZoomIn, ZoomOut, Undo2, Info, Layers, X,
  SquareDashedMousePointer, CheckSquare, Square,
} from 'lucide-react'
import {
  KACHEL_GROESSE, MAX_ZOOM, MIN_ZOOM, MAX_KACHEL_ZOOM, kachelUrl,
  lonLatZuWelt, weltZuLonLat, meterProPixel, zuMeter, zuLonLat,
  flaecheM2, imPolygon, belegeDach, beruehrtSperrflaeche, rasterFuer,
  modulAusZelle, zelleAnPunkt, zellenSchluessel, kantenwinkel,
  sucheAdresse, ladeDachflaechen, azimutZuAusrichtung, azimutText,
  firstwinkelAusAzimut, waehleWechselrichter, MONTAGESYSTEME, reihenabstandFuer,
} from '../../../lib/dachplaner'
import type {
  LonLat, MeterPunkt, PlatziertesModul, Sperrflaeche, Dachflaeche,
  AdressTreffer, BelegungsOptionen, RechnerAusrichtung, Montagesystem,
} from '../../../lib/dachplaner'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'

/** Eine belegbare Teilfläche des Dachs – ein Haus kann mehrere haben. */
export interface Dachfeld {
  id: string
  name: string
  polygon: MeterPunkt[]
  /** Katasterdaten, falls die Fläche vom Bund kam */
  daten: Dachflaeche | null
  neigung: number
  azimut: number
  system: Montagesystem
  opt: BelegungsOptionen
  sperrflaechen: Sperrflaeche[]
  /**
   * Von Hand abgewaehlte Rasterzellen. Bleibt beim Aendern von Abstand oder
   * Drehung erhalten – die Auswahl des Planers soll nicht verloren gehen,
   * nur weil er den Reihenabstand nachjustiert.
   */
  entfernt: string[]
  /** Von Hand zusaetzlich gesetzte Rasterzellen */
  zusaetzlich: string[]
  /**
   * Freie Feinverschiebung einzelner Module in Metern, relativ zu ihrer
   * Rasterzelle. Damit laesst sich ein Modul um wenige Zentimeter versetzen,
   * etwa um an einem Dachfenster vorbeizukommen.
   */
  versatz: Record<string, { dx: number; dy: number }>
}

/** Was der Planer an die Präsentation und die Offerte weitergibt. */
export interface DachErgebnis {
  modulAnzahl: number
  kwp: number
  ausrichtung: RechnerAusrichtung
  azimut: number
  neigungGrad: number
  dachflaecheM2: number
  belegteFlaecheM2: number
  eignungKlasse: number
  eignungText: string
  ertragBfeKwh: number
  einstrahlung: number
  sperrflaechen: number
  /** Anzahl belegter Teilflächen */
  felder: number
  /** Aufstellung je Teilfläche für den Projektbericht */
  felderDetail: Array<{
    name: string
    module: number
    kwp: number
    flaecheM2: number
    ausrichtung: string
    neigung: number
    system: string
  }>
  montagesystem: string
  montageHinweis: string
  dachart: 'STEIL' | 'FLACH'
  aufstaenderung: number
  ostWest: boolean
  wechselrichter: string
  wechselrichterAc: number
  bild: string | null
  adresse: string
}

/**
 * Der komplette Planungsstand.
 *
 * Die Folie wird beim Blaettern aus- und wieder eingehaengt. Damit die
 * Auslegung dabei nicht verloren geht, liegt der Zustand in der
 * Praesentation und wird von dort zurueckgegeben.
 */
export interface DachPlanung {
  zentrum: LonLat
  ursprung: LonLat | null
  zoom: number
  suche: string
  felder: Dachfeld[]
  aktivId: string | null
  gefundene: Dachflaeche[]
}

interface Props {
  startAdresse?: string | null
  onUebernehmen: (e: DachErgebnis) => void
  gespeichert?: DachErgebnis | null
  /** Zuletzt gesehener Planungsstand, wird beim Aufschlagen wiederhergestellt */
  planung?: DachPlanung | null
  onPlanungAendern?: (p: DachPlanung) => void
}

type Werkzeug = 'auswahl' | 'markieren' | 'dach' | 'sperre' | 'modulPlus' | 'modulMinus'

const WERKZEUGE: Array<{ id: Werkzeug; icon: typeof Search; text: string; hilfe: string }> = [
  { id: 'auswahl', icon: MousePointer2, text: 'Bewegen', hilfe: 'Modul stufenlos ziehen · Umrandung ziehen verschiebt die Fläche · Ecke anklicken und Entf löscht sie · Plus auf einer Kante setzt eine neue Ecke · Doppelklick auf eine Kante richtet die Module aus' },
  { id: 'markieren', icon: SquareDashedMousePointer, text: 'Markieren', hilfe: 'Module anklicken oder ein Rechteck aufziehen · markierte gemeinsam verschieben · Entf löscht sie · Strg+Z macht rückgängig' },
  { id: 'dach', icon: Pencil, text: 'Dachfläche', hilfe: 'Ecken anklicken, Klick auf den ersten Punkt schliesst die Fläche' },
  { id: 'sperre', icon: Ban, text: 'Sperrfläche', hilfe: 'Kamin, Dachfenster oder Verschattung umranden – dort bleibt frei' },
  { id: 'modulPlus', icon: Plus, text: 'Modul setzen', hilfe: 'Modul einzeln setzen, es rastet am Raster ein' },
  { id: 'modulMinus', icon: Trash2, text: 'Modul weg', hilfe: 'Einzelne Module wieder entfernen' },
]

const FELD_FARBEN = ['#F59E0B', '#34D399', '#60A5FA', '#A78BFA', '#FB923C', '#F472B6']

const STANDARD_OPT: BelegungsOptionen = {
  hochformat: true,
  randabstand: 0.3,
  modulabstand: 0.02,
  reihenabstand: 0.02,
  drehungGrad: 0,
  ostWest: false,
}

/** Punkt auf der Strecke zwischen a und b. */
function auf(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/**
 * Zeichnet ein Modul so, wie es auf dem Dach aussieht: dunkle Zellfläche,
 * heller Rahmen, Zellenraster. Ohne das Raster wirken die Module wie bunte
 * Rechtecke und der Kunde erkennt seine Anlage nicht wieder.
 *
 * Die Zelllinien werden zwischen den Kanten interpoliert und stimmen dadurch
 * bei jeder Drehung.
 */
function ModulZeichnung({
  modul,
  nachPixel,
  zellenZeigen,
  markiert,
}: {
  modul: PlatziertesModul
  nachPixel: (p: MeterPunkt) => { x: number; y: number }
  zellenZeigen: boolean
  markiert?: boolean
}) {
  const [a, b, c, d] = modul.ecken.map(nachPixel)
  const pts = [a, b, c, d].map((p) => `${p.x},${p.y}`).join(' ')

  const linien: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  if (zellenZeigen) {
    // 108 Halbzellen entsprechen 6 Spalten und 2 x 9 Reihen
    for (let i = 1; i < 6; i++) {
      const p1 = auf(a, b, i / 6)
      const p2 = auf(d, c, i / 6)
      linien.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
    }
    for (let i = 1; i < 18; i++) {
      const p1 = auf(a, d, i / 18)
      const p2 = auf(b, c, i / 18)
      linien.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
    }
  }

  return (
    <g>
      {/* Die abgewandte Reihe einer Ost-West-Aufständerung liegt im Schatten */}
      <polygon points={pts} fill={modul.richtung === 'WEST' ? '#0A1220' : '#121F35'} />
      {linien.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(125,165,215,0.28)" strokeWidth={0.5} />
      ))}
      {markiert && <polygon points={pts} fill="rgba(245,158,11,0.35)" />}
      <polygon
        points={pts}
        fill="none"
        stroke={markiert ? '#F59E0B' : modul.manuell ? '#34D399' : '#8FA9C8'}
        strokeWidth={markiert ? 2 : modul.manuell ? 1.3 : 0.9}
      />
    </g>
  )
}

export default function Dachplaner({
  startAdresse,
  onUebernehmen,
  gespeichert,
  planung,
  onPlanungAendern,
}: Props) {
  const kartenBox = useRef<HTMLDivElement>(null)
  const [groesse, setGroesse] = useState({ b: 800, h: 560 })

  const [zentrum, setZentrum] = useState<LonLat>(planung?.zentrum ?? { lon: 8.2275, lat: 46.8182 })
  /**
   * Fester Bezugspunkt der Meterkoordinaten.
   *
   * Alle Flaechen werden in Metern relativ zu diesem Punkt gespeichert. Er
   * darf sich nie aendern – sonst wandern die eingezeichneten Flaechen mit,
   * sobald man die Karte verschiebt. Er wird einmal gesetzt, wenn die erste
   * Adresse gefunden ist, und bleibt dann stehen.
   */
  const [ursprung, setUrsprung] = useState<LonLat | null>(planung?.ursprung ?? null)
  const [zoom, setZoom] = useState(planung?.zoom ?? 20)
  const [suche, setSuche] = useState(planung?.suche ?? startAdresse ?? '')
  const [treffer, setTreffer] = useState<AdressTreffer[]>([])
  const [laedt, setLaedt] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)
  // Wenn schon geplant wurde, nicht erneut anfliegen und ueberschreiben
  const [adresseGesetzt, setAdresseGesetzt] = useState(planung?.felder.length ? (startAdresse ?? '') : '')

  const [werkzeug, setWerkzeug] = useState<Werkzeug>('auswahl')
  const [zeichnung, setZeichnung] = useState<MeterPunkt[]>([])
  const [felder, setFelder] = useState<Dachfeld[]>(planung?.felder ?? [])
  const [aktivId, setAktivId] = useState<string | null>(planung?.aktivId ?? null)
  const [gefundene, setGefundene] = useState<Dachflaeche[]>(planung?.gefundene ?? [])
  /** Markierte Module des aktiven Feldes, als Zellschlüssel */
  const [markiert, setMarkiert] = useState<string[]>([])
  /**
   * Verlauf der letzten Arbeitsstände.
   *
   * Wer im Kundentermin eine Fläche verschiebt oder Module löscht, will
   * das rückgängig machen können, ohne die Belegung neu aufzubauen.
   * Gespeichert werden nur die Flächen – Karte, Zoom und Auswahl gehören
   * zur Ansicht, nicht zur Planung.
   */
  const [verlauf, setVerlauf] = useState<Dachfeld[][]>([])
  const felderRef = useRef<Dachfeld[]>(felder)
  felderRef.current = felder

  /** Sichert den Stand vor einer Änderung. Vor der Änderung aufrufen. */
  const merkeSchritt = useCallback(() => {
    // Dreissig Schritte reichen für einen Termin und halten den Speicher klein
    setVerlauf((v) => [...v.slice(-29), felderRef.current])
  }, [])

  /**
   * Angewählte Ecke einer Fläche. Der Dachumriss aus dem Kataster hat oft
   * mehr Punkte als das echte Dach – wer eine Ecke wegnehmen will, wählt
   * sie an und drückt Entf.
   */
  const [gewaehlteEcke, setGewaehlteEcke] = useState<{
    feldId: string
    art: 'dach' | 'sperre'
    sperreId?: string
    index: number
  } | null>(null)
  /** Beim Verschieben aufs Raster einrasten statt frei zu positionieren */
  const [einrasten, setEinrasten] = useState(false)
  const [bild, setBild] = useState<string | null>(gespeichert?.bild ?? null)
  const [masseZeigen, setMasseZeigen] = useState(true)

  /**
   * Planungsstand nach oben melden, damit er das Blaettern ueberlebt.
   * Die Praesentation reicht ihn beim naechsten Aufschlagen zurueck.
   */
  useEffect(() => {
    onPlanungAendern?.({ zentrum, ursprung, zoom, suche, felder, aktivId, gefundene })
    // onPlanungAendern ist stabil; auf die Werte reagieren genuegt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zentrum, ursprung, zoom, suche, felder, aktivId, gefundene])

  const modulMasse = useMemo(
    () => ({
      laenge: KOMPONENTEN.modul.laengeM,
      breite: KOMPONENTEN.modul.breiteM,
      wattPeak: KOMPONENTEN.modul.watt,
    }),
    []
  )

  /**
   * Die Module eines Feldes ergeben sich immer neu aus Polygon, Optionen und
   * der Auswahl des Planers. Aendert er einen Abstand, verschieben sich die
   * vorhandenen Module – die Belegung wird nicht von vorn aufgebaut.
   */
  const modulenVon = useCallback(
    (feld: Dachfeld): PlatziertesModul[] => {
      const raster = rasterFuer(feld.polygon, modulMasse, feld.opt)
      if (!raster) return []

      const raus = new Set(feld.entfernt)
      const automatisch = belegeDach(feld.polygon, modulMasse, feld.opt, feld.sperrflaechen).filter(
        (m) => !raus.has(m.id)
      )
      const schon = new Set(automatisch.map((m) => m.id))

      const dazu = feld.zusaetzlich
        .filter((s) => !schon.has(s) && !raus.has(s))
        .map((s) => {
          const [reihe, spalte] = s.split(':').map(Number)
          return modulAusZelle(raster, reihe, spalte, feld.opt.ostWest, true)
        })

      // Feinverschiebung anwenden, danach erst gegen die Sperrflaechen pruefen
      const verschoben = [...automatisch, ...dazu].map((m) => {
        const v = feld.versatz[m.id]
        if (!v) return m
        return {
          ...m,
          ecken: m.ecken.map((p) => ({ x: p.x + v.dx, y: p.y + v.dy })),
          mitte: { x: m.mitte.x + v.dx, y: m.mitte.y + v.dy },
        }
      })

      return verschoben.filter(
        (m) => !feld.sperrflaechen.some((sp) => beruehrtSperrflaeche(m.ecken, m.mitte, sp))
      )
    },
    [modulMasse]
  )

  /**
   * Felder samt berechneter Belegung. Die Module sind ein abgeleiteter Wert,
   * kein gespeicherter – dadurch wirkt jede Aenderung an den Einstellungen
   * sofort auf die vorhandenen Module.
   */
  const felderMitModulen = useMemo(
    () => felder.map((f) => ({ ...f, module: modulenVon(f) })),
    [felder, modulenVon]
  )
  const aktiv = felderMitModulen.find((f) => f.id === aktivId) ?? null

  // ── Umrechnung Bildschirm <-> Meter ────────────────────────────────
  const mpp = meterProPixel(zentrum.lat, zoom)
  const bezug = ursprung ?? zentrum
  /** Wie weit das Kartenzentrum vom festen Bezugspunkt entfernt liegt. */
  const versatz = useMemo(() => zuMeter(zentrum, bezug), [zentrum, bezug])

  const meterZuPixel = useCallback(
    (p: MeterPunkt) => ({
      x: groesse.b / 2 + (p.x - versatz.x) / mpp,
      y: groesse.h / 2 - (p.y - versatz.y) / mpp,
    }),
    [groesse, mpp, versatz]
  )
  const pixelZuMeter = useCallback(
    (px: number, py: number): MeterPunkt => ({
      x: (px - groesse.b / 2) * mpp + versatz.x,
      y: (groesse.h / 2 - py) * mpp + versatz.y,
    }),
    [groesse, mpp, versatz]
  )

  useEffect(() => {
    const el = kartenBox.current
    if (!el) return
    const messen = () => setGroesse({ b: el.clientWidth, h: el.clientHeight })
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /**
   * Zoom mit dem Mausrad, auf den Zeiger zentriert.
   *
   * Der Punkt unter der Maus muss nach dem Zoomen an derselben Stelle liegen,
   * sonst laeuft einem das Dach beim Heranzoomen aus dem Bild. Der Listener
   * wird von Hand gesetzt, weil React das Rad-Ereignis passiv anmeldet und
   * preventDefault dort wirkungslos waere – die Seite wuerde mitscrollen.
   */
  useEffect(() => {
    const el = kartenBox.current
    if (!el) return

    const beiRad = (ev: WheelEvent) => {
      ev.preventDefault()
      const r = el.getBoundingClientRect()
      const px = ev.clientX - r.left
      const py = ev.clientY - r.top

      setZoom((alterZoom) => {
        /*
         * Halbe Stufen statt ganzer.
         *
         * Eine ganze Zoomstufe verdoppelt die Darstellung – beim Setzen
         * einzelner Module springt das Bild dabei so weit, dass man die
         * Stelle wiederfinden muss. Halbe Schritte fuehlen sich beim
         * Mausrad deutlich ruhiger an.
         */
        const stufe = ev.deltaY < 0 ? 0.5 : -0.5
        const neuerZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, alterZoom + stufe))
        if (neuerZoom === alterZoom) return alterZoom

        setZentrum((altesZentrum) => {
          const altMpp = meterProPixel(altesZentrum.lat, alterZoom)
          // Geografischer Punkt unter dem Mauszeiger
          const unterMaus = zuLonLat(
            { x: (px - r.width / 2) * altMpp, y: (r.height / 2 - py) * altMpp },
            altesZentrum
          )
          // Neues Zentrum so legen, dass dieser Punkt wieder dort liegt
          const neuMpp = meterProPixel(unterMaus.lat, neuerZoom)
          return zuLonLat(
            { x: -(px - r.width / 2) * neuMpp, y: -(r.height / 2 - py) * neuMpp },
            unterMaus
          )
        })
        return neuerZoom
      })
    }

    el.addEventListener('wheel', beiRad, { passive: false })
    return () => el.removeEventListener('wheel', beiRad)
  }, [])

  // ── Feld anlegen und ändern ────────────────────────────────────────
  const feldAendern = useCallback((id: string, patch: Partial<Dachfeld>) => {
    setFelder((alle) => alle.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  function feldAusKataster(f: Dachflaeche, bezug: LonLat): Dachfeld {
    const flach = f.neigungGrad <= 7
    const system = flach ? MONTAGESYSTEME.find((m) => m.id === 'k2-dome-ow')! : MONTAGESYSTEME[0]
    const opt: BelegungsOptionen = {
      ...STANDARD_OPT,
      drehungGrad: flach ? 0 : firstwinkelAusAzimut(f.azimut),
      hochformat: system.hochformat,
      reihenabstand: reihenabstandFuer(system, system.hochformat ? modulMasse.laenge : modulMasse.breite),
      ostWest: system.ostWest,
    }
    const polygon = f.ring.map((r) => zuMeter(r, bezug))
    return {
      id: `f${f.id}`,
      name: `${azimutText(f.azimut)} ${Math.round(f.flaecheM2)} m²`,
      polygon,
      daten: f,
      neigung: Math.round(f.neigungGrad),
      azimut: Math.round(f.azimut),
      system,
      opt,
      sperrflaechen: [],
      entfernt: [],
      zusaetzlich: [],
      versatz: {},
    }
  }

  // ── Adresse anfliegen und Dach gleich mitladen ─────────────────────
  useEffect(() => {
    if (!startAdresse || adresseGesetzt === startAdresse) return
    setAdresseGesetzt(startAdresse)
    setSuche(startAdresse)

    const varianten = [
      startAdresse,
      startAdresse.replace(/(\d+)\s*[a-zA-Z/.\-]\S*/g, '$1'),
      startAdresse.replace(/\d+\S*/g, '').replace(/\s{2,}/g, ' ').trim(),
    ].filter((v, i, alle) => v.length > 3 && alle.indexOf(v) === i)

    void (async () => {
      setLaedt(true)
      for (const v of varianten) {
        try {
          const t = await sucheAdresse(v)
          if (t.length) {
            const ziel = { lon: t[0].lon, lat: t[0].lat }
            setZentrum(ziel)
            setUrsprung(ziel)
            setZoom(20)
            setSuche(t[0].label)
            await dachAnPunkt(ziel, ziel, t[0].label)
            setLaedt(false)
            return
          }
        } catch {
          break
        }
      }
      setLaedt(false)
      setMeldung(`"${startAdresse}" wurde nicht gefunden. Bitte oben suchen oder das Dach einzeichnen.`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAdresse, adresseGesetzt])

  async function adresseSuchen() {
    if (!suche.trim()) return
    setLaedt(true)
    setMeldung(null)
    try {
      const t = await sucheAdresse(suche)
      setTreffer(t)
      if (!t.length) setMeldung('Keine Adresse gefunden.')
    } catch {
      setMeldung('Die Adresssuche ist gerade nicht erreichbar.')
    } finally {
      setLaedt(false)
    }
  }

  async function trefferWaehlen(t: AdressTreffer) {
    const ziel = { lon: t.lon, lat: t.lat }
    setZentrum(ziel)
    setZoom(20)
    setTreffer([])
    setSuche(t.label)
    await dachAnPunkt(ziel, ziel, t.label)
  }

  // ── Dachfläche vom Bund holen ──────────────────────────────────────
  async function dachAnPunkt(p: LonLat, neuerUrsprung?: LonLat, adressText?: string) {
    // Beim ersten Aufruf legen wir den Bezugspunkt fest und behalten ihn
    const fest = ursprung ?? neuerUrsprung ?? p
    if (!ursprung) setUrsprung(fest)

    setLaedt(true)
    setMeldung(null)
    try {
      const flaechen = await ladeDachflaechen(p)
      setGefundene(flaechen)
      const klick = zuMeter(p, fest)
      const treff =
        flaechen.find((f) => imPolygon(klick, f.ring.map((r) => zuMeter(r, fest)))) ?? flaechen[0]
      if (!treff) {
        setMeldung(
          adressText
            ? `${adressText} gefunden, aber ohne Katasterdaten. Bitte das Dach einzeichnen.`
            : 'Für diese Stelle liegen keine Dachdaten vor. Zeichnen Sie die Fläche ein.'
        )
        return
      }
      feldHinzufuegen(treff, fest)
    } catch {
      setMeldung('Die Dachdaten des Bundes sind nicht erreichbar. Zeichnen Sie die Fläche ein.')
    } finally {
      setLaedt(false)
    }
  }

  function feldHinzufuegen(f: Dachflaeche, festerBezug?: LonLat) {
    const neu = feldAusKataster(f, festerBezug ?? ursprung ?? zentrum)
    setFelder((alle) => {
      if (alle.some((x) => x.id === neu.id)) return alle
      return [...alle, neu]
    })
    setAktivId(neu.id)
    setMeldung(
      `${neu.name} übernommen · ${Math.round(f.neigungGrad)}° Neigung · Eignung ${f.klasseText || f.klasse} · ${neu.system.name}`
    )
  }

  function feldEntfernen(id: string) {
    merkeSchritt()
    setFelder((alle) => alle.filter((f) => f.id !== id))
    if (aktivId === id) setAktivId(null)
  }

  function systemWaehlen(m: Montagesystem) {
    if (!aktiv) return
    feldAendern(aktiv.id, {
      system: m,
      neigung: m.aufstaenderung > 0 ? m.aufstaenderung : aktiv.neigung,
      opt: {
        ...aktiv.opt,
        hochformat: m.hochformat,
        reihenabstand: reihenabstandFuer(m, m.hochformat ? modulMasse.laenge : modulMasse.breite),
        ostWest: m.ostWest,
        drehungGrad: m.dachart === 'FLACH' ? 0 : aktiv.opt.drehungGrad,
      },
      // Format- und Systemwechsel aendern das Raster grundlegend,
      // die alte Zellauswahl passt dann nicht mehr
      ...(m.hochformat !== aktiv.opt.hochformat ? { entfernt: [], zusaetzlich: [], versatz: {} } : {}),
    })
  }

  function optAendern(patch: Partial<BelegungsOptionen>) {
    if (!aktiv) return
    const formatWechsel = patch.hochformat !== undefined && patch.hochformat !== aktiv.opt.hochformat
    feldAendern(aktiv.id, {
      opt: { ...aktiv.opt, ...patch },
      ...(formatWechsel ? { entfernt: [], zusaetzlich: [], versatz: {} } : {}),
    })
  }

  // ── Raster des aktiven Feldes ──────────────────────────────────────
  const raster = useMemo(
    () => (aktiv && aktiv.polygon.length >= 3 ? rasterFuer(aktiv.polygon, modulMasse, aktiv.opt) : null),
    [aktiv, modulMasse]
  )
  const pixelProModul = aktiv
    ? (aktiv.opt.hochformat ? modulMasse.breite : modulMasse.laenge) / mpp
    : modulMasse.breite / mpp

  // ── Klick auf die Karte ────────────────────────────────────────────
  const gezogen = useRef(false)

  function kartenKlick(ev: React.MouseEvent) {
    if (gezogen.current) return
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
    const px = ev.clientX - r.left
    const py = ev.clientY - r.top
    const m = pixelZuMeter(px, py)

    if (werkzeug === 'auswahl') {
      // Klick in ein vorhandenes Feld wählt es aus, sonst Kataster fragen
      const getroffen = felder.find((f) => imPolygon(m, f.polygon))
      if (getroffen) {
        setAktivId(getroffen.id)
        return
      }
      void dachAnPunkt(zuLonLat(m, bezug))
      return
    }

    if (werkzeug === 'dach' || werkzeug === 'sperre') {
      // Spaetestens jetzt den Bezugspunkt festnageln, sonst wandert die
      // gezeichnete Flaeche beim naechsten Verschieben der Karte mit
      if (!ursprung) setUrsprung(zentrum)
      if (zeichnung.length >= 3) {
        const erst = meterZuPixel(zeichnung[0])
        if (Math.hypot(erst.x - px, erst.y - py) < 14) {
          flaecheSchliessen()
          return
        }
      }
      setZeichnung([...zeichnung, m])
      return
    }

    if (!aktiv) {
      setMeldung('Bitte zuerst eine Dachfläche auswählen.')
      return
    }

    if (werkzeug === 'markieren') {
      const getroffen = aktiv.module.find((mod) => imPolygon(m, mod.ecken))
      if (!getroffen) return
      setMarkiert((alt) =>
        alt.includes(getroffen.id) ? alt.filter((x) => x !== getroffen.id) : [...alt, getroffen.id]
      )
      return
    }

    if (!raster) return

    if (werkzeug === 'modulPlus') {
      const zelle = zelleAnPunkt(m, raster)
      const s = zellenSchluessel(zelle.reihe, zelle.spalte)
      if (aktiv.module.some((x) => x.id === s)) return
      merkeSchritt()
      feldAendern(aktiv.id, {
        entfernt: aktiv.entfernt.filter((x) => x !== s),
        zusaetzlich: aktiv.zusaetzlich.includes(s) ? aktiv.zusaetzlich : [...aktiv.zusaetzlich, s],
      })
      return
    }

    if (werkzeug === 'modulMinus') {
      const getroffen = aktiv.module.find((mod) => imPolygon(m, mod.ecken))
      if (!getroffen) return
      merkeSchritt()
      feldAendern(aktiv.id, {
        zusaetzlich: aktiv.zusaetzlich.filter((x) => x !== getroffen.id),
        entfernt: aktiv.entfernt.includes(getroffen.id)
          ? aktiv.entfernt
          : [...aktiv.entfernt, getroffen.id],
      })
    }
  }

  function flaecheSchliessen() {
    if (zeichnung.length < 3) {
      setZeichnung([])
      return
    }
    merkeSchritt()
    if (werkzeug === 'dach') {
      const opt = { ...STANDARD_OPT }
      const feld: Dachfeld = {
        id: `hand${Date.now()}`,
        name: `Dachfläche ${felder.length + 1}`,
        polygon: zeichnung,
        daten: null,
        neigung: 30,
        azimut: 0,
        system: MONTAGESYSTEME[0],
        opt,
        sperrflaechen: [],
        entfernt: [],
        zusaetzlich: [],
        versatz: {},
      }
      setFelder((alle) => [...alle, feld])
      setAktivId(feld.id)
      setMeldung(`${feld.name} gezeichnet · ${Math.round(flaecheM2(zeichnung))} m² Grundfläche`)
    } else {
      if (!aktiv) {
        setMeldung('Sperrflächen gehören zu einer Dachfläche – bitte zuerst eine auswählen.')
        setZeichnung([])
        return
      }
      const neu: Sperrflaeche = {
        id: `s${Date.now()}`,
        bezeichnung: `Sperrfläche ${aktiv.sperrflaechen.length + 1}`,
        punkte: zeichnung,
      }
      feldAendern(aktiv.id, { sperrflaechen: [...aktiv.sperrflaechen, neu] })
      setMeldung(`Sperrfläche gesetzt · ${Math.round(flaecheM2(zeichnung))} m² bleiben frei`)
    }
    setZeichnung([])
    setWerkzeug('auswahl')
  }

  // ── Karte ziehen, Flächen bearbeiten ───────────────────────────────
  const zieh = useRef<{ x: number; y: number; lon: number; lat: number } | null>(null)
  const griff = useRef<{ feldId: string; art: 'dach' | 'sperre'; sperreId?: string; index: number } | null>(null)
  const schieben = useRef<{
    feldId: string
    art: 'dach' | 'sperre'
    sperreId?: string
    start: MeterPunkt
    original: MeterPunkt[]
  } | null>(null)

  function griffAnfassen(ev: React.MouseEvent, feldId: string, art: 'dach' | 'sperre', index: number, sperreId?: string) {
    ev.stopPropagation()
    merkeSchritt()
    gezogen.current = false
    griff.current = { feldId, art, index, sperreId }
    // Anfassen waehlt die Ecke gleich aus – dann geht Loeschen ohne
    // zweiten Klick, und ein reiner Klick markiert sie ebenfalls.
    setGewaehlteEcke({ feldId, art, index, sperreId })
  }

  /**
   * Loescht die gewaehlte Ecke.
   *
   * Ein Dreieck ist die kleinste Flaeche, die noch eine ist – darunter
   * bliebe eine Linie zurueck, mit der weder Belegung noch Flaeche etwas
   * anfangen koennen.
   */
  /** Setzt den letzten Arbeitsschritt zurück. */
  function rueckgaengig() {
    if (!verlauf.length) return
    setFelder(verlauf[verlauf.length - 1])
    setVerlauf(verlauf.slice(0, -1))
    setMarkiert([])
    setGewaehlteEcke(null)
  }

  /** Entfernt alle markierten Module aus der Belegung. */
  function markierteEntfernen() {
    if (!aktiv || !markiert.length) return
    merkeSchritt()
    feldAendern(aktiv.id, {
      zusaetzlich: aktiv.zusaetzlich.filter((x) => !markiert.includes(x)),
      entfernt: [...new Set([...aktiv.entfernt, ...markiert])],
    })
    setMarkiert([])
  }

  function eckeLoeschen() {
    const g = gewaehlteEcke
    if (!g) return

    // Erst pruefen, dann aendern. Ein Seiteneffekt im Updater von setFelder
    // liefe im StrictMode doppelt und meldete Unsinn.
    const feld = felder.find((f) => f.id === g.feldId)
    if (!feld) return
    const punkte =
      g.art === 'dach'
        ? feld.polygon
        : (feld.sperrflaechen.find((s) => s.id === g.sperreId)?.punkte ?? [])
    if (punkte.length <= 3) {
      setMeldung('Eine Fläche braucht mindestens drei Ecken.')
      return
    }

    merkeSchritt()
    setFelder((alle) =>
      alle.map((f) => {
        if (f.id !== g.feldId) return f
        if (g.art === 'dach') {
          return { ...f, polygon: f.polygon.filter((_, i) => i !== g.index) }
        }
        return {
          ...f,
          sperrflaechen: f.sperrflaechen.map((s) =>
            s.id === g.sperreId
              ? { ...s, punkte: s.punkte.filter((_, i) => i !== g.index) }
              : s
          ),
        }
      })
    )
    setGewaehlteEcke(null)
  }

  /** Setzt einen neuen Punkt in die Mitte einer Kante. */
  function eckeEinfuegen(
    ev: React.MouseEvent,
    feldId: string,
    art: 'dach' | 'sperre',
    index: number,
    sperreId?: string
  ) {
    ev.stopPropagation()
    merkeSchritt()
    gezogen.current = true
    const einsetzen = (punkte: MeterPunkt[]) => {
      const naechster = punkte[(index + 1) % punkte.length]
      const mitte = {
        x: (punkte[index].x + naechster.x) / 2,
        y: (punkte[index].y + naechster.y) / 2,
      }
      return [...punkte.slice(0, index + 1), mitte, ...punkte.slice(index + 1)]
    }
    setFelder((alle) =>
      alle.map((f) => {
        if (f.id !== feldId) return f
        if (art === 'dach') return { ...f, polygon: einsetzen(f.polygon) }
        return {
          ...f,
          sperrflaechen: f.sperrflaechen.map((s) =>
            s.id === sperreId ? { ...s, punkte: einsetzen(s.punkte) } : s
          ),
        }
      })
    )
    setGewaehlteEcke({ feldId, art, index: index + 1, sperreId })
  }

  function ziehStart(ev: React.MouseEvent) {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
    const m = pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top)

    // Im Markieren-Werkzeug zieht man ein Auswahlrechteck auf
    if (werkzeug === 'markieren') {
      gezogen.current = false
      auswahlBox.current = m
      setBox({ von: m, bis: m })
      return
    }

    if (werkzeug !== 'auswahl') return
    gezogen.current = false

    // Sperrflächen lassen sich innen anfassen – auf ihnen liegen keine Module
    if (aktiv) {
      const sperre = aktiv.sperrflaechen.find((s) => imPolygon(m, s.punkte))
      if (sperre) {
        schieben.current = { feldId: aktiv.id, art: 'sperre', sperreId: sperre.id, start: m, original: sperre.punkte }
        return
      }
    }

    // Innerhalb der Dachfläche liegen die Module. Die Fläche selbst wird
    // deshalb an ihrer Umrandung angefasst, nicht in der Mitte.
    zieh.current = { x: ev.clientX, y: ev.clientY, lon: zentrum.lon, lat: zentrum.lat }
  }

  /**
   * Module lassen sich frei verschieben, nicht nur um ganze Rasterfelder.
   * Gezogen wird in Metern; erst wenn "Einrasten" eingeschaltet ist, faellt
   * das Modul auf die naechste Rasterposition.
   */
  const modulZug = useRef<{ feldId: string; vonId: string; start: MeterPunkt } | null>(null)
  const [modulVersatz, setModulVersatz] = useState<{ dx: number; dy: number } | null>(null)
  /** Gemeinsam verschieben: alle markierten Module um dasselbe Delta */
  const gruppenZug = useRef<{ feldId: string; start: MeterPunkt } | null>(null)
  const [gruppenVersatz, setGruppenVersatz] = useState<{ dx: number; dy: number } | null>(null)
  /** Aufziehendes Auswahlrechteck in lokalen Metern */
  const auswahlBox = useRef<MeterPunkt | null>(null)
  const [box, setBox] = useState<{ von: MeterPunkt; bis: MeterPunkt } | null>(null)

  function modulAnfassen(ev: React.MouseEvent, feldId: string, modulId: string) {
    merkeSchritt()
    if (werkzeug !== 'auswahl' && werkzeug !== 'markieren') return
    ev.stopPropagation()
    gezogen.current = false
    setAktivId(feldId)

    const r = (ev.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect()
    const start = pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top)

    // Ist das Modul markiert, wandert die ganze Markierung mit
    if (werkzeug === 'markieren' && markiert.includes(modulId)) {
      gruppenZug.current = { feldId, start }
      return
    }
    if (werkzeug === 'markieren') return

    modulZug.current = { feldId, vonId: modulId, start }
  }

  /**
   * Rundet eine Verschiebung auf ganze Rasterschritte, wenn Einrasten
   * eingeschaltet ist. Sonst bleibt sie zentimetergenau.
   */
  function delta(feld: Dachfeld, dx: number, dy: number) {
    if (!einrasten) {
      return { dx: Math.round(dx * 100) / 100, dy: Math.round(dy * 100) / 100 }
    }
    const ras = rasterFuer(feld.polygon, modulMasse, feld.opt)
    if (!ras) return { dx, dy }
    // Im gedrehten System runden, damit das Raster stimmt
    const c = Math.cos(-ras.winkel)
    const s = Math.sin(-ras.winkel)
    const lx = dx * c - dy * s
    const ly = dx * s + dy * c
    const rx = Math.round(lx / ras.schrittX) * ras.schrittX
    const ry = Math.round(ly / ras.schrittY) * ras.schrittY
    return {
      dx: rx * Math.cos(ras.winkel) - ry * Math.sin(ras.winkel),
      dy: rx * Math.sin(ras.winkel) + ry * Math.cos(ras.winkel),
    }
  }

  /** Verschiebt alle markierten Module um dasselbe Delta in Metern. */
  function markierteVerschieben(feldId: string, dx: number, dy: number) {
    const feld = felder.find((f) => f.id === feldId)
    if (!feld || (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005)) return
    const neu = { ...feld.versatz }
    for (const id of markiert) {
      const alt = neu[id] ?? { dx: 0, dy: 0 }
      neu[id] = { dx: alt.dx + dx, dy: alt.dy + dy }
    }
    feldAendern(feldId, { versatz: neu })
  }

  function flaecheAnfassen(ev: React.MouseEvent, feldId: string) {
    merkeSchritt()
    if (werkzeug !== 'auswahl') return
    ev.stopPropagation()
    const feld = felder.find((f) => f.id === feldId)
    if (!feld) return
    const r = (ev.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect()
    gezogen.current = false
    setAktivId(feldId)
    schieben.current = {
      feldId,
      art: 'dach',
      start: pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top),
      original: feld.polygon,
    }
  }

  function ziehen(ev: React.MouseEvent) {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()

    // Auswahlrechteck aufziehen
    if (auswahlBox.current) {
      gezogen.current = true
      setBox({ von: auswahlBox.current, bis: pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top) })
      return
    }

    // Markierte Gruppe verschieben
    if (gruppenZug.current) {
      gezogen.current = true
      const feld = felder.find((f) => f.id === gruppenZug.current!.feldId)
      if (!feld) return
      const jetzt = pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top)
      setGruppenVersatz(
        delta(feld, jetzt.x - gruppenZug.current.start.x, jetzt.y - gruppenZug.current.start.y)
      )
      return
    }

    // Einzelnes Modul frei verschieben
    if (modulZug.current) {
      gezogen.current = true
      const feld = felder.find((f) => f.id === modulZug.current!.feldId)
      if (!feld) return
      const jetzt = pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top)
      setModulVersatz(
        delta(feld, jetzt.x - modulZug.current.start.x, jetzt.y - modulZug.current.start.y)
      )
      return
    }

    if (griff.current) {
      gezogen.current = true
      const m = pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top)
      const g = griff.current
      setFelder((alle) =>
        alle.map((f) => {
          if (f.id !== g.feldId) return f
          if (g.art === 'dach') return { ...f, polygon: f.polygon.map((p, i) => (i === g.index ? m : p)) }
          return {
            ...f,
            sperrflaechen: f.sperrflaechen.map((s) =>
              s.id === g.sperreId ? { ...s, punkte: s.punkte.map((p, i) => (i === g.index ? m : p)) } : s
            ),
          }
        })
      )
      return
    }

    if (schieben.current) {
      gezogen.current = true
      const m = pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top)
      const s = schieben.current
      const dx = m.x - s.start.x
      const dy = m.y - s.start.y
      const versetzt = s.original.map((p) => ({ x: p.x + dx, y: p.y + dy }))
      setFelder((alle) =>
        alle.map((f) => {
          if (f.id !== s.feldId) return f
          if (s.art === 'dach') {
            // Sperrflächen und Handmodule wandern mit
            return {
              ...f,
              polygon: versetzt,
              sperrflaechen: f.sperrflaechen.map((sp) => ({
                ...sp,
                punkte: sp.punkte.map((p) => ({ x: p.x + dx, y: p.y + dy })),
              })),

            }
          }
          return {
            ...f,
            sperrflaechen: f.sperrflaechen.map((sp) => (sp.id === s.sperreId ? { ...sp, punkte: versetzt } : sp)),
          }
        })
      )
      return
    }

    if (!zieh.current) return
    const dx = ev.clientX - zieh.current.x
    const dy = ev.clientY - zieh.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) gezogen.current = true
    const n = Math.pow(2, zoom) * KACHEL_GROESSE
    const start = lonLatZuWelt({ lon: zieh.current.lon, lat: zieh.current.lat })
    setZentrum(weltZuLonLat(start.wx - dx / n, start.wy - dy / n))
  }

  function ziehEnde() {
    // Auswahlrechteck auswerten: alle Module darin markieren
    if (auswahlBox.current) {
      const b = box
      auswahlBox.current = null
      setBox(null)
      if (b && aktiv) {
        const x1 = Math.min(b.von.x, b.bis.x)
        const x2 = Math.max(b.von.x, b.bis.x)
        const y1 = Math.min(b.von.y, b.bis.y)
        const y2 = Math.max(b.von.y, b.bis.y)
        // Ein Klick ohne Zug hebt die Markierung auf
        if (Math.abs(x2 - x1) < 0.4 && Math.abs(y2 - y1) < 0.4) {
          setMarkiert([])
        } else {
          const drin = aktiv.module
            .filter((m) => m.mitte.x >= x1 && m.mitte.x <= x2 && m.mitte.y >= y1 && m.mitte.y <= y2)
            .map((m) => m.id)
          setMarkiert(drin)
          setMeldung(
            drin.length
              ? `${drin.length} Module markiert – jetzt anfassen und verschieben.`
              : 'In diesem Bereich liegen keine Module.'
          )
        }
      }
      setTimeout(() => {
        gezogen.current = false
      }, 0)
      return
    }

    // Markierte Gruppe absetzen
    if (gruppenZug.current) {
      const feldId = gruppenZug.current.feldId
      gruppenZug.current = null
      if (gruppenVersatz) markierteVerschieben(feldId, gruppenVersatz.dx, gruppenVersatz.dy)
      setGruppenVersatz(null)
      setTimeout(() => {
        gezogen.current = false
      }, 0)
      return
    }

    // Einzelnes Modul absetzen – der Versatz bleibt zentimetergenau erhalten
    if (modulZug.current && modulVersatz) {
      const { feldId, vonId } = modulZug.current
      const feld = felder.find((f) => f.id === feldId)
      if (feld && (Math.abs(modulVersatz.dx) > 0.005 || Math.abs(modulVersatz.dy) > 0.005)) {
        const alt = feld.versatz[vonId] ?? { dx: 0, dy: 0 }
        feldAendern(feldId, {
          versatz: {
            ...feld.versatz,
            [vonId]: { dx: alt.dx + modulVersatz.dx, dy: alt.dy + modulVersatz.dy },
          },
        })
      }
    }
    modulZug.current = null
    setModulVersatz(null)

    // Die Belegung ist ein abgeleiteter Wert und folgt der Fläche von selbst
    zieh.current = null
    griff.current = null
    schieben.current = null
    setTimeout(() => {
      gezogen.current = false
    }, 0)
  }

  /**
   * Entf löscht die angewählte Ecke, Escape hebt die Auswahl auf.
   *
   * Der Handler hängt am Fenster, damit er greift, ohne dass die Karte den
   * Fokus hat. Eingabefelder sind ausgenommen – sonst würde Entf in der
   * Adresssuche eine Ecke löschen statt ein Zeichen.
   */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement | null
      if (ziel && ['INPUT', 'SELECT', 'TEXTAREA'].includes(ziel.tagName)) return

      // Strg+Z – der Griff, den jeder kennt
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        rueckgaengig()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Erst die angewählte Ecke, sonst die markierten Module
        if (gewaehlteEcke) {
          e.preventDefault()
          eckeLoeschen()
        } else if (markiert.length) {
          e.preventDefault()
          markierteEntfernen()
        }
        return
      }
      if (e.key === 'Escape') {
        setGewaehlteEcke(null)
        setMarkiert([])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // Die Handler lesen den Zustand über die Abhängigkeiten – neu binden genügt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gewaehlteEcke, markiert, verlauf, aktiv])

  // ── Kacheln ────────────────────────────────────────────────────────
  const kacheln = useMemo(() => {
    // Kacheln gibt es nur in ganzen Stufen; halbe Zoomschritte werden
    // ueber die Skalierung aufgefangen
    const kachelZoom = Math.min(Math.floor(zoom), MAX_KACHEL_ZOOM)
    const skala = Math.pow(2, zoom - kachelZoom)
    const kachelPx = KACHEL_GROESSE * skala

    const { wx, wy } = lonLatZuWelt(zentrum)
    const n = Math.pow(2, kachelZoom)
    const linksOben = { x: wx * n * kachelPx - groesse.b / 2, y: wy * n * kachelPx - groesse.h / 2 }

    const liste: Array<{ url: string; links: number; oben: number; groesse: number; key: string }> = []
    for (let x = Math.floor(linksOben.x / kachelPx); x <= Math.floor((linksOben.x + groesse.b) / kachelPx); x++) {
      for (let y = Math.floor(linksOben.y / kachelPx); y <= Math.floor((linksOben.y + groesse.h) / kachelPx); y++) {
        if (x < 0 || y < 0 || x >= n || y >= n) continue
        liste.push({
          url: kachelUrl(kachelZoom, x, y),
          links: x * kachelPx - linksOben.x,
          oben: y * kachelPx - linksOben.y,
          groesse: kachelPx,
          key: `${kachelZoom}-${x}-${y}`,
        })
      }
    }
    return liste
  }, [zentrum, zoom, groesse])

  // ── Kennzahlen über alle Felder ────────────────────────────────────
  const zusammen = useMemo(() => {
    const alleModule = felderMitModulen.flatMap((f) => f.module.filter((m) => !m.aus))
    const kwp = Math.round((alleModule.length * modulMasse.wattPeak) / 10) / 100
    const belegt = alleModule.length * modulMasse.laenge * modulMasse.breite
    const dachReal = felderMitModulen.reduce(
      (s, f) => s + (f.daten?.flaecheM2 ?? flaecheM2(f.polygon) / Math.cos((f.neigung * Math.PI) / 180)),
      0
    )
    const sperren = felderMitModulen.reduce((s, f) => s + f.sperrflaechen.length, 0)

    // Ausrichtung und Neigung nach Modulzahl gewichten
    const belegteFelder = felderMitModulen.filter((f) => f.module.length > 0)
    const gewicht = belegteFelder.reduce((s, f) => s + f.module.length, 0) || 1
    const azimut = Math.round(
      belegteFelder.reduce((s, f) => s + f.azimut * f.module.length, 0) / gewicht
    )
    const neigung = Math.round(
      belegteFelder.reduce(
        (s, f) => s + (f.system.aufstaenderung > 0 ? f.system.aufstaenderung : f.neigung) * f.module.length,
        0
      ) / gewicht
    )
    // Weit auseinanderliegende Ausrichtungen ergeben faktisch eine Ost-West-Anlage
    const spanne = belegteFelder.length
      ? Math.max(...belegteFelder.map((f) => f.azimut)) - Math.min(...belegteFelder.map((f) => f.azimut))
      : 0
    const ostWest = belegteFelder.some((f) => f.system.ostWest) || spanne > 90

    return {
      module: alleModule.length,
      kwp,
      belegt,
      dachReal,
      sperren,
      azimut,
      neigung,
      ostWest,
      ertragBfe: felderMitModulen.reduce((s, f) => s + (f.daten?.stromertragKwh ?? 0), 0),
    }
  }, [felderMitModulen, modulMasse])

  const wr = waehleWechselrichter(zusammen.kwp, false)
  const wrHybrid = waehleWechselrichter(zusammen.kwp, true)

  // ── Belegungsbild ──────────────────────────────────────────────────
  async function bildErzeugen(): Promise<string | null> {
    const c = document.createElement('canvas')
    c.width = groesse.b
    c.height = groesse.h
    const ctx = c.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#1F2937'
    ctx.fillRect(0, 0, c.width, c.height)

    await Promise.all(
      kacheln.map(
        (k) =>
          new Promise<void>((fertig) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              ctx.drawImage(img, k.links, k.oben, k.groesse, k.groesse)
              fertig()
            }
            img.onerror = () => fertig()
            img.src = k.url
          })
      )
    )

    const pfad = (punkte: MeterPunkt[]) => {
      ctx.beginPath()
      punkte.forEach((p, i) => {
        const s = meterZuPixel(p)
        if (i === 0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
      })
      ctx.closePath()
    }

    felderMitModulen.forEach((f, i) => {
      const farbe = FELD_FARBEN[i % FELD_FARBEN.length]
      pfad(f.polygon)
      ctx.fillStyle = 'rgba(245,158,11,0.10)'
      ctx.fill()
      ctx.strokeStyle = farbe
      ctx.lineWidth = 2.5
      ctx.stroke()

      f.sperrflaechen.forEach((s) => {
        pfad(s.punkte)
        ctx.fillStyle = 'rgba(248,113,113,0.35)'
        ctx.fill()
        ctx.strokeStyle = '#F87171'
        ctx.lineWidth = 2
        ctx.stroke()
      })

      f.module
        .filter((m) => !m.aus)
        .forEach((m) => {
          const ecken = m.ecken.map(meterZuPixel)
          pfad(m.ecken)
          ctx.fillStyle = m.richtung === 'WEST' ? '#0A1220' : '#121F35'
          ctx.fill()
          ctx.strokeStyle = '#8FA9C8'
          ctx.lineWidth = 0.9
          ctx.stroke()
          // Zellenraster nur, wenn es im Druck noch erkennbar ist
          if (pixelProModul > 26) {
            ctx.strokeStyle = 'rgba(125,165,215,0.28)'
            ctx.lineWidth = 0.5
            const [a, b, cc, d] = ecken
            for (let j = 1; j < 6; j++) {
              const p1 = auf(a, b, j / 6)
              const p2 = auf(d, cc, j / 6)
              ctx.beginPath()
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.stroke()
            }
            for (let j = 1; j < 18; j++) {
              const p1 = auf(a, d, j / 18)
              const p2 = auf(b, cc, j / 18)
              ctx.beginPath()
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.stroke()
            }
          }
        })
    })

    ctx.fillStyle = 'rgba(6,8,12,0.82)'
    ctx.fillRect(0, c.height - 34, c.width, 34)
    ctx.fillStyle = '#F3F4F6'
    ctx.font = '600 13px Outfit, system-ui, sans-serif'
    ctx.fillText(
      `${zusammen.module} Module · ${zusammen.kwp.toFixed(2)} kWp · ${Math.round(zusammen.dachReal)} m² Dachfläche` +
        (felder.length > 1 ? ` · ${felder.length} Teilflächen` : '') +
        (zusammen.sperren ? ` · ${zusammen.sperren} Sperrflächen` : ''),
      12,
      c.height - 12
    )
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '400 10px Outfit, system-ui, sans-serif'
    const quelle = 'Luftbild swisstopo · Dachdaten BFE Sonnendach'
    ctx.fillText(quelle, c.width - ctx.measureText(quelle).width - 12, c.height - 12)

    try {
      return c.toDataURL('image/jpeg', 0.82)
    } catch {
      setMeldung('Das Bild konnte nicht erzeugt werden – bitte einen Screenshot verwenden.')
      return null
    }
  }

  async function uebernehmen() {
    if (!zusammen.module) {
      setMeldung('Es ist noch kein Modul platziert.')
      return
    }
    setLaedt(true)
    const neuesBild = await bildErzeugen()
    setBild(neuesBild)
    setLaedt(false)

    const groesstes = [...felderMitModulen].sort((a, b) => b.module.length - a.module.length)[0]
    onUebernehmen({
      modulAnzahl: zusammen.module,
      kwp: zusammen.kwp,
      ausrichtung: zusammen.ostWest ? 'OST_WEST' : azimutZuAusrichtung(zusammen.azimut),
      azimut: zusammen.azimut,
      neigungGrad: zusammen.neigung,
      dachflaecheM2: Math.round(zusammen.dachReal),
      belegteFlaecheM2: Math.round(zusammen.belegt),
      eignungKlasse: groesstes?.daten?.klasse ?? 0,
      eignungText: groesstes?.daten?.klasseText ?? '',
      ertragBfeKwh: zusammen.ertragBfe,
      einstrahlung: groesstes?.daten?.einstrahlung ?? 0,
      sperrflaechen: zusammen.sperren,
      felder: felderMitModulen.filter((f) => f.module.length > 0).length,
      felderDetail: felderMitModulen
        .filter((f) => f.module.length > 0)
        .map((f) => ({
          name: f.name,
          module: f.module.filter((m) => !m.aus).length,
          kwp: Math.round((f.module.filter((m) => !m.aus).length * modulMasse.wattPeak) / 10) / 100,
          flaecheM2: Math.round(f.daten?.flaecheM2 ?? flaecheM2(f.polygon)),
          ausrichtung: f.system.ostWest ? 'Ost-West' : azimutText(f.azimut),
          neigung: f.system.aufstaenderung > 0 ? f.system.aufstaenderung : f.neigung,
          system: f.system.name,
        })),
      montagesystem: groesstes?.system.name ?? '',
      montageHinweis: groesstes?.system.hinweis ?? '',
      dachart: groesstes?.system.dachart ?? 'STEIL',
      aufstaenderung: groesstes?.system.aufstaenderung ?? 0,
      ostWest: zusammen.ostWest,
      wechselrichter: wr?.geraete[0]?.geraet.name ?? '',
      wechselrichterAc: wr?.acKw ?? 0,
      bild: neuesBild,
      adresse: suche,
    })
    setMeldung(`Übernommen: ${zusammen.module} Module, ${zusammen.kwp.toFixed(2)} kWp.`)
  }

  async function bildHerunterladen() {
    const b = await bildErzeugen()
    if (!b) return
    setBild(b)
    const a = document.createElement('a')
    a.href = b
    a.download = `Dachbelegung_${(suche || 'Anlage').replace(/[^\w]+/g, '_')}.jpg`
    a.click()
  }

  const hilfe = WERKZEUGE.find((w) => w.id === werkzeug)?.hilfe

  /** Kanten einer Fläche mit Länge, Mittelpunkt und Winkel. */
  function kanten(punkte: MeterPunkt[]) {
    return punkte.map((p, i) => {
      const q = punkte[(i + 1) % punkte.length]
      const a = meterZuPixel(p)
      const b = meterZuPixel(q)
      const mitte = meterZuPixel({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
      return {
        laenge: Math.hypot(q.x - p.x, q.y - p.y),
        winkel: kantenwinkel(p, q),
        x: mitte.x,
        y: mitte.y,
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
        key: `${i}`,
      }
    })
  }

  /**
   * Doppelklick auf eine Dachkante richtet die Modulreihen daran aus.
   *
   * Traufe oder First anklicken statt am Drehregler zu suchen. Ein zweiter
   * Doppelklick auf dieselbe Kante wechselt zwischen Hoch- und Querformat.
   */
  const letzteKante = useRef<{ feldId: string; winkel: number } | null>(null)

  function kanteAusrichten(feldId: string, winkel: number) {
    const feld = felder.find((f) => f.id === feldId)
    if (!feld) return
    setAktivId(feldId)

    const gleich = letzteKante.current?.feldId === feldId && letzteKante.current?.winkel === winkel
    letzteKante.current = { feldId, winkel }

    if (gleich) {
      feldAendern(feldId, {
        opt: { ...feld.opt, hochformat: !feld.opt.hochformat },
        entfernt: [],
        zusaetzlich: [],
        versatz: {},
      })
      setMeldung(
        `Module ${!feld.opt.hochformat ? 'im Hochformat' : 'im Querformat'} an dieser Kante ausgerichtet.`
      )
      return
    }

    feldAendern(feldId, { opt: { ...feld.opt, drehungGrad: winkel } })
    setMeldung('Modulreihen an dieser Kante ausgerichtet. Nochmals doppelklicken wechselt das Format.')
  }

  return (
    <div className="h-full flex flex-col px-3 sm:px-5 py-4 overflow-hidden">
      {/* Kopf */}
      <div className="flex items-baseline gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sun size={17} strokeWidth={1.8} className="text-amber" />
          <h2 className="text-[19px] font-bold text-text">So sieht Ihre Anlage auf dem Dach aus</h2>
        </div>
        <p className="text-[11px] text-text-dim hidden md:block">
          Luftbild swisstopo · Dachdaten Sonnendach-Kataster des Bundes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[336px_1fr] gap-3 flex-1 min-h-0">
        {/* ══════════ Linke Spalte: einstellen ══════════ */}
        <div className="overflow-y-auto pr-1 space-y-3 min-h-0">
          {/* Adresse */}
          <div className="relative">
            <Search size={14} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <input
              type="text"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adresseSuchen()}
              placeholder="Strasse, Nummer und Ort"
              className="glass-input w-full pl-9 pr-3 py-2 text-[12px]"
            />
            {treffer.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl overflow-hidden"
                style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.10)' }}>
                {treffer.map((t) => (
                  <button key={t.label} type="button" onClick={() => trefferWaehlen(t)}
                    className="block w-full text-left px-3 py-2 text-[11px] text-text-sec hover:bg-white/5">
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Werkzeuge */}
          <div className="grid grid-cols-2 gap-1.5">
            {WERKZEUGE.map((w) => {
              const an = werkzeug === w.id
              const Icon = w.icon
              return (
                <button key={w.id} type="button"
                  onClick={() => {
                  setWerkzeug(w.id)
                  setZeichnung([])
                  if (w.id !== 'markieren') setMarkiert([])
                }}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: an ? 'color-mix(in srgb, #F59E0B 20%, transparent)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${an ? 'color-mix(in srgb, #F59E0B 50%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                    color: an ? '#F59E0B' : undefined,
                  }}>
                  <Icon size={12} strokeWidth={2} />
                  {w.text}
                </button>
              )
            })}
          </div>

          {/* Dachflächen */}
          <div className="glass-card p-3" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Layers size={13} strokeWidth={1.8} className="text-amber" />
                <h3 className="text-[12px] font-bold text-text">
                  Dachflächen {felder.length > 0 && `(${felder.length})`}
                </h3>
              </div>
              {felder.length > 0 && (
                <span className="text-[10px] text-text-dim tabular-nums">
                  {zusammen.module} Module
                </span>
              )}
            </div>

            {felder.length === 0 ? (
              <p className="text-[10px] text-text-dim">
                Klicken Sie auf ein Dach im Bild – die Fläche kommt aus dem Kataster.
                Mehrere Flächen sind möglich, etwa Ost- und Westseite.
              </p>
            ) : (
              <div className="space-y-1">
                {felderMitModulen.map((f, i) => {
                  const an = f.id === aktivId
                  const farbe = FELD_FARBEN[i % FELD_FARBEN.length]
                  return (
                    <div key={f.id} className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setAktivId(f.id)}
                        className="flex-1 text-left px-2.5 py-1.5 rounded-lg transition-all"
                        style={{
                          background: an ? `color-mix(in srgb, ${farbe} 14%, transparent)` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${an ? `color-mix(in srgb, ${farbe} 45%, transparent)` : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        <div className="flex items-center gap-1.5">
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: farbe, flexShrink: 0 }} />
                          <span className="text-[11px] font-semibold" style={{ color: an ? farbe : undefined }}>
                            {f.name}
                          </span>
                        </div>
                        <div className="text-[9px] text-text-dim ml-3.5">
                          {f.module.filter((m) => !m.aus).length} Module ·{' '}
                          {((f.module.filter((m) => !m.aus).length * modulMasse.wattPeak) / 1000).toFixed(2)} kWp
                          {f.sperrflaechen.length > 0 && ` · ${f.sperrflaechen.length} Sperrfl.`}
                        </div>
                      </button>
                      <button type="button" onClick={() => feldEntfernen(f.id)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-red transition-colors shrink-0"
                        aria-label="Fläche entfernen">
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Weitere Katasterflächen am selben Haus */}
            {gefundene.length > 1 && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[9px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                  Weitere Flächen am Haus
                </div>
                <div className="flex flex-wrap gap-1">
                  {gefundene
                    .filter((g) => !felder.some((f) => f.id === `f${g.id}`))
                    .slice(0, 6)
                    .map((g) => (
                      <button key={g.id} type="button" onClick={() => feldHinzufuegen(g)}
                        className="px-2 py-1 rounded-md text-[9px]"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        + {Math.round(g.flaecheM2)} m² {azimutText(g.azimut)}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Einstellungen der aktiven Fläche */}
          {aktiv && (
            <div className="glass-card p-3" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3 className="text-[12px] font-bold text-text mb-2">
                {aktiv.name} einstellen
              </h3>

              <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
                Unterkonstruktion
              </div>
              <div className="flex gap-1.5 mb-1.5">
                {(['STEIL', 'FLACH'] as const).map((d) => {
                  const an = aktiv.system.dachart === d
                  return (
                    <button key={d} type="button"
                      onClick={() => { const e = MONTAGESYSTEME.find((m) => m.dachart === d); if (e) systemWaehlen(e) }}
                      className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
                      style={{
                        background: an ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${an ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                        color: an ? '#F59E0B' : undefined,
                      }}>
                      {d === 'STEIL' ? 'Steildach' : 'Flachdach'}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-1 mb-2">
                {MONTAGESYSTEME.filter((m) => m.dachart === aktiv.system.dachart).map((m) => {
                  const an = aktiv.system.id === m.id
                  return (
                    <button key={m.id} type="button" onClick={() => systemWaehlen(m)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg"
                      style={{
                        background: an ? 'color-mix(in srgb, #F59E0B 12%, transparent)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${an ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      <div className="text-[10px] font-semibold" style={{ color: an ? '#F59E0B' : undefined }}>
                        {m.name}{m.ostWest && <span className="ml-1 text-[8px] font-normal">Ost-West</span>}
                      </div>
                      <div className="text-[8px] text-text-dim">
                        {m.untergrund}{m.aufstaenderung > 0 ? ` · ${m.aufstaenderung}°` : ' · dachparallel'}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {[true, false].map((hoch) => (
                  <button key={String(hoch)} type="button" onClick={() => optAendern({ hochformat: hoch })}
                    className="px-2 py-1.5 rounded-lg text-[10px] font-semibold"
                    style={{
                      background: aktiv.opt.hochformat === hoch ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${aktiv.opt.hochformat === hoch ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                      color: aktiv.opt.hochformat === hoch ? '#F59E0B' : undefined,
                    }}>
                    {hoch ? 'Hochformat' : 'Querformat'}
                  </button>
                ))}
              </div>

              {([
                { label: 'Drehung', wert: aktiv.opt.drehungGrad, min: -180, max: 180, schritt: 1, einheit: '°', feld: 'drehungGrad' as const, k: 0 },
                { label: 'Randabstand', wert: aktiv.opt.randabstand, min: 0, max: 1.5, schritt: 0.05, einheit: 'm', feld: 'randabstand' as const, k: 2 },
                { label: 'Abstand in der Reihe', wert: aktiv.opt.modulabstand, min: 0, max: 0.3, schritt: 0.005, einheit: 'm', feld: 'modulabstand' as const, k: 3 },
                { label: 'Reihenabstand', wert: aktiv.opt.reihenabstand, min: 0, max: 4, schritt: 0.05, einheit: 'm', feld: 'reihenabstand' as const, k: 2 },
              ]).map((r) => (
                <div key={r.feld} className="mb-2">
                  <div className="flex justify-between items-baseline gap-2 text-[10px] mb-0.5">
                    <span className="text-text-dim">{r.label}</span>
                    <span className="text-text font-semibold tabular-nums shrink-0" style={{ minWidth: 54, textAlign: 'right' }}>
                      {r.wert.toFixed(r.k)} {r.einheit}
                    </span>
                  </div>
                  <input type="range" min={r.min} max={r.max} step={r.schritt} value={r.wert}
                    onChange={(e) => optAendern({ [r.feld]: Number(e.target.value) })}
                    className="w-full cursor-pointer"
                    style={{ height: 4, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }} />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="flex justify-between items-baseline text-[10px] mb-0.5">
                    <span className="text-text-dim">Neigung</span>
                    <span className="text-text font-semibold tabular-nums">{aktiv.neigung}°</span>
                  </div>
                  <input type="range" min={0} max={60} step={1} value={aktiv.neigung}
                    onChange={(e) => feldAendern(aktiv.id, { neigung: Number(e.target.value) })}
                    className="w-full cursor-pointer"
                    style={{ height: 4, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }} />
                </div>
                <div>
                  <div className="flex justify-between items-baseline text-[10px] mb-0.5">
                    <span className="text-text-dim">Ausrichtung</span>
                    <span className="text-text font-semibold tabular-nums">{azimutText(aktiv.azimut)}</span>
                  </div>
                  <input type="range" min={-180} max={180} step={1} value={aktiv.azimut}
                    onChange={(e) => feldAendern(aktiv.id, { azimut: Number(e.target.value) })}
                    className="w-full cursor-pointer"
                    style={{ height: 4, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }} />
                </div>
              </div>

              {/* Markierung */}
              {werkzeug === 'markieren' && (
                <div
                  className="p-2 rounded-lg mb-2"
                  style={{
                    background: 'color-mix(in srgb, #F59E0B 8%, transparent)',
                    border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold" style={{ color: '#F59E0B' }}>
                      {markiert.length} von {aktiv.module.length} markiert
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => setMarkiert(aktiv.module.map((m) => m.id))}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px]"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <CheckSquare size={10} strokeWidth={2} />
                      Alle
                    </button>
                    <button type="button" onClick={() => setMarkiert([])}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px]"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Square size={10} strokeWidth={2} />
                      Keine
                    </button>
                    {markiert.length > 0 && (
                      <button
                        type="button"
                        onClick={markierteEntfernen}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px]"
                        style={{
                          background: 'color-mix(in srgb, #F87171 12%, transparent)',
                          border: '1px solid color-mix(in srgb, #F87171 30%, transparent)',
                          color: '#F87171',
                        }}
                      >
                        <Trash2 size={10} strokeWidth={2} />
                        Markierte entfernen
                      </button>
                    )}
                  </div>
                  {markiert.length > 0 && (
                    <p className="text-[9px] text-text-dim mt-1.5">
                      Ein markiertes Modul anfassen verschiebt die ganze Auswahl.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => { merkeSchritt(); feldAendern(aktiv.id, { entfernt: [], zusaetzlich: [], versatz: {} }); setMarkiert([]) }}
                  className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-[10px]">
                  <RotateCw size={11} strokeWidth={2} />
                  Neu belegen
                </button>
                {aktiv.sperrflaechen.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => {
                      merkeSchritt()
                      feldAendern(aktiv.id, {
                        sperrflaechen: aktiv.sperrflaechen.filter((x) => x.id !== s.id),
                      })
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px]"
                    style={{
                      background: 'color-mix(in srgb, #F87171 12%, transparent)',
                      border: '1px solid color-mix(in srgb, #F87171 30%, transparent)',
                      color: '#F87171',
                    }}>
                    <Trash2 size={10} strokeWidth={2} />
                    {s.bezeichnung}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ergebnis */}
          <div className="glass-card p-3" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h3 className="text-[12px] font-bold text-text mb-2">Ergebnis gesamt</h3>
            <div className="text-[28px] font-bold text-amber leading-none tabular-nums mb-0.5">
              {zusammen.kwp.toFixed(2)} kWp
            </div>
            <p className="text-[11px] text-text-sec mb-3">
              {zusammen.module} Module à {modulMasse.wattPeak} W
              {felder.length > 1 && ` auf ${felderMitModulen.filter((f) => f.module.length).length} Flächen`}
            </p>

            <dl className="space-y-1 text-[10px] mb-3">
              {[
                ['Dachfläche', zusammen.dachReal > 0 ? `${Math.round(zusammen.dachReal)} m²` : '—'],
                ['davon belegt', zusammen.belegt > 0 ? `${Math.round(zusammen.belegt)} m²` : '—'],
                ['Ausrichtung', zusammen.ostWest ? 'Ost-West' : `${azimutText(zusammen.azimut)} (${zusammen.azimut}°)`],
                ['Neigung', `${zusammen.neigung}°`],
                ...(zusammen.sperren ? [['Sperrflächen', String(zusammen.sperren)] as [string, string]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-text-dim">{k}</dt>
                  <dd className="text-text-sec font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>

            {wr && (
              <div className="p-2.5 rounded-lg mb-3"
                style={{
                  background: 'color-mix(in srgb, #60A5FA 9%, transparent)',
                  border: '1px solid color-mix(in srgb, #60A5FA 26%, transparent)',
                }}>
                <div className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: '#60A5FA' }}>
                  Passender Wechselrichter
                </div>
                <div className="text-[12px] font-bold text-text">
                  {wr.geraete[0].anzahl > 1 ? `${wr.geraete[0].anzahl} × ` : ''}{wr.geraete[0].geraet.name}
                </div>
                <div className="text-[9px] text-text-sec">
                  {wr.acKw} kW AC · DC/AC {wr.dcAcVerhaeltnis} · {wr.geraete[0].geraet.mppt} MPPT
                </div>
                {wrHybrid && wrHybrid.geraete[0].geraet.name !== wr.geraete[0].geraet.name && (
                  <div className="text-[9px] text-text-dim mt-0.5">
                    Mit Speicher: {wrHybrid.geraete[0].geraet.name}
                  </div>
                )}
                {wr.hinweis && <div className="text-[9px] mt-0.5" style={{ color: '#FCD34D' }}>{wr.hinweis}</div>}
              </div>
            )}

            <div className="space-y-1.5">
              <button type="button" onClick={uebernehmen} disabled={!zusammen.module || laedt}
                className="btn-primary w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] disabled:opacity-40">
                <Check size={13} strokeWidth={2} />
                In Rechner und Offerte übernehmen
              </button>
              <button type="button" onClick={bildHerunterladen} disabled={!zusammen.module}
                className="btn-secondary w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] disabled:opacity-40">
                <Camera size={12} strokeWidth={1.8} />
                Belegungsbild speichern
              </button>
            </div>

            {bild && (
              <img src={bild} alt="Dachbelegung" className="w-full rounded-lg mt-2"
                style={{ border: '1px solid rgba(255,255,255,0.10)' }} />
            )}
          </div>
        </div>

        {/* ══════════ Rechte Spalte: Karte ══════════ */}
        <div className="flex flex-col min-h-0 gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-text-dim flex-1 min-w-0">
              <Info size={11} strokeWidth={1.8} className="shrink-0" />
              <span className="truncate">{hilfe}</span>
            </div>
            {zeichnung.length >= 3 && (
              <button type="button" onClick={flaecheSchliessen} className="btn-primary flex items-center gap-1 px-2.5 py-1.5 text-[10px]">
                <Check size={11} strokeWidth={2} />
                Schliessen
              </button>
            )}
            {zeichnung.length > 0 && (
              <button type="button" onClick={() => setZeichnung(zeichnung.slice(0, -1))}
                className="btn-secondary flex items-center gap-1 px-2.5 py-1.5 text-[10px]">
                <Undo2 size={11} strokeWidth={2} />
                Zurück
              </button>
            )}
            {/* Rückgängig – Schritt für Schritt, bis der Verlauf leer ist */}
            <button
              type="button"
              onClick={rueckgaengig}
              disabled={!verlauf.length}
              title={
                verlauf.length
                  ? `Letzten Schritt rückgängig (Strg+Z) · ${verlauf.length} gespeichert`
                  : 'Nichts rückgängig zu machen'
              }
              className="btn-secondary flex items-center gap-1 px-2.5 py-1.5 text-[10px] disabled:opacity-30"
            >
              <Undo2 size={11} strokeWidth={2} />
              Rückgängig
              {verlauf.length > 0 && (
                <span className="tabular-nums text-amber">{verlauf.length}</span>
              )}
            </button>
            {markiert.length > 0 && (
              <button
                type="button"
                onClick={markierteEntfernen}
                title="Markierte Module entfernen (Entf)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold"
                style={{
                  background: 'color-mix(in srgb, #F87171 14%, transparent)',
                  border: '1px solid color-mix(in srgb, #F87171 34%, transparent)',
                  color: '#F87171',
                }}
              >
                <Trash2 size={11} strokeWidth={2} />
                {markiert.length} löschen
              </button>
            )}
            <button type="button" onClick={() => setEinrasten((e) => !e)}
              title="Module beim Verschieben auf das Raster einrasten lassen"
              className="px-2 py-1.5 rounded-lg text-[10px] font-semibold"
              style={{
                background: einrasten ? 'color-mix(in srgb, #F59E0B 16%, transparent)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${einrasten ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                color: einrasten ? '#F59E0B' : undefined,
              }}>
              Einrasten
            </button>
            <button type="button" onClick={() => setMasseZeigen((m) => !m)}
              className="px-2 py-1.5 rounded-lg text-[10px] font-semibold"
              style={{
                background: masseZeigen ? 'color-mix(in srgb, #F59E0B 16%, transparent)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${masseZeigen ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                color: masseZeigen ? '#F59E0B' : undefined,
              }}>
              Masse
            </button>
            <button type="button" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))} className="btn-secondary p-1.5" aria-label="Näher">
              <ZoomIn size={13} strokeWidth={1.8} />
            </button>
            <button type="button" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))} className="btn-secondary p-1.5" aria-label="Weiter weg">
              <ZoomOut size={13} strokeWidth={1.8} />
            </button>
          </div>

          <div
            ref={kartenBox}
            className="relative overflow-hidden rounded-xl select-none flex-1 min-h-0"
            style={{
              border: '1px solid rgba(255,255,255,0.10)',
              cursor: werkzeug === 'auswahl' ? 'grab' : 'crosshair',
              background: '#111827',
            }}
            onMouseDown={ziehStart}
            onMouseMove={ziehen}
            onMouseUp={ziehEnde}
            onMouseLeave={ziehEnde}
            onClick={kartenKlick}
          >
            {kacheln.map((k) => (
              <img key={k.key} src={k.url} alt="" draggable={false}
                style={{ position: 'absolute', left: k.links, top: k.oben, width: k.groesse, height: k.groesse, pointerEvents: 'none' }} />
            ))}

            <svg width={groesse.b} height={groesse.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {felderMitModulen.map((f, fi) => {
                const farbe = FELD_FARBEN[fi % FELD_FARBEN.length]
                const an = f.id === aktivId
                return (
                  <g key={f.id}>
                    <polygon
                      points={f.polygon.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')}
                      fill={an ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)'}
                      stroke={farbe}
                      strokeWidth={an ? 2.5 : 1.5}
                      strokeOpacity={an ? 1 : 0.6}
                    />
                    {/* Module – einzeln oder als Markierung frei verschiebbar */}
                    {f.module.map((m) => {
                      const istMarkiert = an && markiert.includes(m.id)
                      // Der laufende Zug wird als Vorschau darüber gezeichnet
                      const zug =
                        modulZug.current?.feldId === f.id && modulZug.current.vonId === m.id
                          ? modulVersatz
                          : gruppenZug.current?.feldId === f.id && istMarkiert
                            ? gruppenVersatz
                            : null
                      const anfassbar = werkzeug === 'auswahl' || werkzeug === 'markieren'
                      const gezeigt = zug
                        ? {
                            ...m,
                            ecken: m.ecken.map((p) => ({ x: p.x + zug.dx, y: p.y + zug.dy })),
                            mitte: { x: m.mitte.x + zug.dx, y: m.mitte.y + zug.dy },
                          }
                        : m
                      return (
                        <g
                          key={m.id}
                          style={anfassbar ? { pointerEvents: 'auto', cursor: 'move' } : undefined}
                          onMouseDown={(e) => modulAnfassen(e, f.id, m.id)}
                        >
                          {/* Ausgangslage bleibt blass sichtbar */}
                          {zug && (
                            <polygon
                              points={m.ecken.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')}
                              fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} strokeDasharray="3 2"
                            />
                          )}
                          <ModulZeichnung
                            modul={gezeigt}
                            nachPixel={meterZuPixel}
                            zellenZeigen={pixelProModul > 26}
                            markiert={istMarkiert}
                          />
                        </g>
                      )
                    })}
                    {/* Sperrflächen */}
                    {f.sperrflaechen.map((s) => (
                      <g key={s.id}>
                        <polygon
                          points={s.punkte.map((p) => { const q = meterZuPixel(p); return `${q.x},${q.y}` }).join(' ')}
                          fill="rgba(248,113,113,0.32)" stroke="#F87171" strokeWidth={1.8} strokeDasharray="5 3"
                        />
                        {an && werkzeug === 'auswahl' && s.punkte.map((p, i) => {
                          const q = meterZuPixel(p)
                          const gewaehlt =
                            gewaehlteEcke?.feldId === f.id &&
                            gewaehlteEcke.art === 'sperre' &&
                            gewaehlteEcke.sperreId === s.id &&
                            gewaehlteEcke.index === i
                          return (
                            <g key={i} style={{ pointerEvents: 'auto', cursor: 'move' }}
                              onMouseDown={(e) => griffAnfassen(e, f.id, 'sperre', i, s.id)}>
                              {gewaehlt && (
                                <circle cx={q.x} cy={q.y} r={9} fill="none" stroke="#FFFFFF"
                                  strokeWidth={1.5} strokeDasharray="3 2" />
                              )}
                              <circle cx={q.x} cy={q.y} r={gewaehlt ? 5.5 : 4.5} fill="#F87171"
                                stroke={gewaehlt ? '#FFFFFF' : '#0D1117'} strokeWidth={1.5} />
                            </g>
                          )
                        })}
                      </g>
                    ))}
                    {/* Kanten: Doppelklick richtet die Modulreihen daran aus */}
                    {kanten(f.polygon).map((k) => (
                      <g key={k.key}>
                        {/* Umrandung anfassen verschiebt die ganze Fläche,
                            Doppelklick richtet die Modulreihen daran aus */}
                        <line
                          x1={k.ax} y1={k.ay} x2={k.bx} y2={k.by}
                          stroke="transparent" strokeWidth={14}
                          style={{ pointerEvents: 'auto', cursor: 'move' }}
                          onMouseDown={(e) => flaecheAnfassen(e, f.id)}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            kanteAusrichten(f.id, k.winkel)
                          }}
                        />
                        {masseZeigen && (
                          <>
                            <rect x={k.x - 15} y={k.y - 6} width={30} height={11} rx={2} fill="rgba(6,8,12,0.72)" />
                            <text x={k.x} y={k.y + 2.5} textAnchor="middle"
                              style={{ fontSize: 8, fill: farbe, fontWeight: 600 }}>
                              {k.laenge.toFixed(1)} m
                            </text>
                          </>
                        )}
                      </g>
                    ))}
                    {/* Neue Ecke einsetzen.
                        Das Plus sitzt nicht auf der Kantenmitte, sondern
                        senkrecht daneben nach aussen versetzt – auf der
                        Mitte lag es unter der Massangabe und war weder
                        lesbar noch treffbar. */}
                    {an && werkzeug === 'auswahl' && f.polygon.map((p, i) => {
                      const naechster = f.polygon[(i + 1) % f.polygon.length]
                      const a = meterZuPixel(p)
                      const b = meterZuPixel(naechster)
                      const mx = (a.x + b.x) / 2
                      const my = (a.y + b.y) / 2

                      // Senkrechte zur Kante, nach aussen gedreht
                      const laenge = Math.hypot(b.x - a.x, b.y - a.y) || 1
                      let nx = -(b.y - a.y) / laenge
                      let ny = (b.x - a.x) / laenge
                      const mitteFeld = f.polygon.reduce(
                        (s, punkt) => {
                          const z = meterZuPixel(punkt)
                          return { x: s.x + z.x / f.polygon.length, y: s.y + z.y / f.polygon.length }
                        },
                        { x: 0, y: 0 }
                      )
                      if ((mx - mitteFeld.x) * nx + (my - mitteFeld.y) * ny < 0) {
                        nx = -nx
                        ny = -ny
                      }
                      const q = { x: mx + nx * 17, y: my + ny * 17 }

                      return (
                        <g key={`plus-${i}`} style={{ pointerEvents: 'auto', cursor: 'copy' }}
                          onMouseDown={(e) => eckeEinfuegen(e, f.id, 'dach', i)}
                          onClick={(e) => e.stopPropagation()}>
                          <title>Hier eine neue Ecke einsetzen</title>
                          {/* Dünner Steg zur Kante, damit die Zuordnung klar ist */}
                          <line x1={mx} y1={my} x2={q.x} y2={q.y}
                            stroke={farbe} strokeWidth={1} strokeOpacity={0.45} />
                          <circle cx={q.x} cy={q.y} r={7} fill="#0D1117" fillOpacity={0.85}
                            stroke={farbe} strokeWidth={1.4} />
                          <path d={`M ${q.x - 3.2} ${q.y} H ${q.x + 3.2} M ${q.x} ${q.y - 3.2} V ${q.y + 3.2}`}
                            stroke={farbe} strokeWidth={1.6} strokeLinecap="round" />
                        </g>
                      )
                    })}
                    {/* Griffe an den Ecken der aktiven Fläche */}
                    {an && werkzeug === 'auswahl' && f.polygon.map((p, i) => {
                      const q = meterZuPixel(p)
                      const gewaehlt =
                        gewaehlteEcke?.feldId === f.id &&
                        gewaehlteEcke.art === 'dach' &&
                        gewaehlteEcke.index === i
                      return (
                        <g key={i}>
                          <g style={{ pointerEvents: 'auto', cursor: 'move' }}
                            onMouseDown={(e) => griffAnfassen(e, f.id, 'dach', i)}
                            onClick={(e) => e.stopPropagation()}>
                            {gewaehlt && (
                              <circle cx={q.x} cy={q.y} r={10} fill="none" stroke="#F87171"
                                strokeWidth={1.6} strokeDasharray="3 2" />
                            )}
                            <circle cx={q.x} cy={q.y} r={gewaehlt ? 6 : 5}
                              fill={gewaehlt ? '#F87171' : '#FFFFFF'}
                              stroke={gewaehlt ? '#FFFFFF' : farbe} strokeWidth={2} />
                          </g>
                          {/* Loeschknopf an der gewaehlten Ecke.
                              Die Entf-Taste allein reicht nicht: im Kundentermin
                              hat die Karte nicht immer den Fokus, und niemand
                              raet eine Tastenkombination. */}
                          {gewaehlt && f.polygon.length > 3 && (
                            <g style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                              onMouseDown={(e) => { e.stopPropagation(); eckeLoeschen() }}
                              onClick={(e) => e.stopPropagation()}>
                              <title>Diese Ecke löschen</title>
                              <circle cx={q.x + 15} cy={q.y - 15} r={9} fill="#F87171"
                                stroke="#FFFFFF" strokeWidth={1.6} />
                              <path
                                d={`M ${q.x + 11.5} ${q.y - 18.5} L ${q.x + 18.5} ${q.y - 11.5} M ${q.x + 18.5} ${q.y - 18.5} L ${q.x + 11.5} ${q.y - 11.5}`}
                                stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
                            </g>
                          )}
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {/* Auswahlrechteck */}
              {box && (() => {
                const a = meterZuPixel(box.von)
                const b = meterZuPixel(box.bis)
                return (
                  <rect
                    x={Math.min(a.x, b.x)}
                    y={Math.min(a.y, b.y)}
                    width={Math.abs(b.x - a.x)}
                    height={Math.abs(b.y - a.y)}
                    fill="rgba(245,158,11,0.12)"
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                  />
                )
              })()}

              {/* Zeichnung in Arbeit */}
              {zeichnung.length > 0 && (
                <>
                  <polyline
                    points={zeichnung.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')}
                    fill="none" stroke={werkzeug === 'sperre' ? '#F87171' : '#F59E0B'} strokeWidth={2} strokeDasharray="6 4"
                  />
                  {masseZeigen && zeichnung.slice(0, -1).map((p, i) => {
                    const q = zeichnung[i + 1]
                    const laenge = Math.hypot(q.x - p.x, q.y - p.y)
                    const m = meterZuPixel({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
                    return (
                      <g key={i}>
                        <rect x={m.x - 15} y={m.y - 6} width={30} height={11} rx={2} fill="rgba(6,8,12,0.72)" />
                        <text x={m.x} y={m.y + 2.5} textAnchor="middle" style={{ fontSize: 8, fill: '#F59E0B', fontWeight: 600 }}>
                          {laenge.toFixed(1)} m
                        </text>
                      </g>
                    )
                  })}
                  {zeichnung.map((p, i) => {
                    const s = meterZuPixel(p)
                    return <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 6 : 4} fill={i === 0 ? '#F59E0B' : '#FFFFFF'} stroke="#0D1117" strokeWidth={1.5} />
                  })}
                </>
              )}
            </svg>

            {laedt && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.5)' }}>
                <Loader2 size={24} strokeWidth={1.8} className="text-amber animate-spin" />
              </div>
            )}

            <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-[9px] text-white" style={{ background: 'rgba(6,8,12,0.7)' }}>
              Zoom {zoom.toFixed(1)}{zoom > MAX_KACHEL_ZOOM ? ' (vergrössert)' : ''} · 1 Modul ≈ {Math.round(pixelProModul)} px
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-[8px]" style={{ background: 'rgba(6,8,12,0.7)', color: '#9CA3AF' }}>
              swisstopo · BFE
            </div>
          </div>

          {meldung && (
            <div className="px-3 py-2 rounded-lg text-[11px] shrink-0"
              style={{
                background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
                border: '1px solid color-mix(in srgb, #F59E0B 28%, transparent)',
                color: '#FCD34D',
              }}>
              {meldung}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
