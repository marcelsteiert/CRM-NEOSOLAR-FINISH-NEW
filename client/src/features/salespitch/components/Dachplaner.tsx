import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, MousePointer2, Pencil, Ban, Plus, Trash2, RotateCw, Loader2,
  Check, Sun, Camera, ZoomIn, ZoomOut, Undo2, Info,
} from 'lucide-react'
import {
  KACHEL_GROESSE, MAX_ZOOM, MIN_ZOOM, kachelUrl, lonLatZuWelt, weltZuLonLat,
  meterProPixel, zuMeter, zuLonLat, flaecheM2, imPolygon,
  belegeDach, moduleAnPunkt, beruehrtSperrflaeche, sucheAdresse, ladeDachflaechen,
  azimutZuAusrichtung, azimutText, firstwinkelAusAzimut, waehleWechselrichter,
  MAX_KACHEL_ZOOM, MONTAGESYSTEME, reihenabstandFuer,
} from '../../../lib/dachplaner'
import type {
  LonLat, MeterPunkt, PlatziertesModul, Sperrflaeche, Dachflaeche,
  AdressTreffer, BelegungsOptionen, RechnerAusrichtung, Montagesystem,
} from '../../../lib/dachplaner'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'

/** Was der Planer an die Praesentation und die Offerte weitergibt. */
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
  /** Gewaehltes K2-System, erscheint in der Offerte als Position */
  montagesystem: string
  montageHinweis: string
  dachart: 'STEIL' | 'FLACH'
  /** Aufstaenderungswinkel, 0 = dachparallel */
  aufstaenderung: number
  ostWest: boolean
  wechselrichter: string
  wechselrichterAc: number
  /** Belegungsbild als data-URL, wird in die Offerte eingebettet */
  bild: string | null
  adresse: string
}

interface Props {
  /** Adresse des Kunden – wird beim Oeffnen automatisch gesucht */
  startAdresse?: string | null
  onUebernehmen: (e: DachErgebnis) => void
  /** Bereits geplantes Ergebnis, damit die Folie den Stand behaelt */
  gespeichert?: DachErgebnis | null
}

type Werkzeug = 'auswahl' | 'dach' | 'sperre' | 'modulPlus' | 'modulMinus'

const WERKZEUGE: Array<{ id: Werkzeug; icon: typeof Search; text: string; hilfe: string }> = [
  { id: 'auswahl', icon: MousePointer2, text: 'Bewegen', hilfe: 'Karte verschieben, Dach anklicken zum Übernehmen' },
  { id: 'dach', icon: Pencil, text: 'Dach zeichnen', hilfe: 'Ecken anklicken, letzter Punkt schliesst die Fläche' },
  { id: 'sperre', icon: Ban, text: 'Sperrfläche', hilfe: 'Kamin, Dachfenster oder Verschattung umranden' },
  { id: 'modulPlus', icon: Plus, text: 'Modul setzen', hilfe: 'Einzelnes Modul an die Klickstelle legen' },
  { id: 'modulMinus', icon: Trash2, text: 'Modul weg', hilfe: 'Einzelne Module abwählen' },
]

export default function Dachplaner({ startAdresse, onUebernehmen, gespeichert }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [groesse, setGroesse] = useState({ b: 900, h: 560 })

  const [zentrum, setZentrum] = useState<LonLat>({ lon: 8.2275, lat: 46.8182 })
  const [zoom, setZoom] = useState(19)
  const [suche, setSuche] = useState(startAdresse ?? '')
  const [treffer, setTreffer] = useState<AdressTreffer[]>([])
  const [laedt, setLaedt] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [adresseGesetzt, setAdresseGesetzt] = useState('')

  const [werkzeug, setWerkzeug] = useState<Werkzeug>('auswahl')
  const [zeichnung, setZeichnung] = useState<MeterPunkt[]>([])
  const [dachPolygon, setDachPolygon] = useState<MeterPunkt[]>([])
  const [dachDaten, setDachDaten] = useState<Dachflaeche | null>(null)
  const [gefundene, setGefundene] = useState<Dachflaeche[]>([])
  const [sperrflaechen, setSperrflaechen] = useState<Sperrflaeche[]>([])
  const [module, setModule] = useState<PlatziertesModul[]>([])

  const [system, setSystem] = useState<Montagesystem>(MONTAGESYSTEME[0])
  const [opt, setOpt] = useState<BelegungsOptionen>({
    hochformat: true,
    randabstand: 0.3,
    modulabstand: 0.02,
    reihenabstand: 0.02,
    drehungGrad: 0,
    ostWest: false,
  })
  const [neigung, setNeigung] = useState(30)
  const [azimut, setAzimut] = useState(0)
  const [bild, setBild] = useState<string | null>(gespeichert?.bild ?? null)

  const modulMasse = useMemo(
    () => ({
      laenge: KOMPONENTEN.modul.laengeM,
      breite: KOMPONENTEN.modul.breiteM,
      wattPeak: KOMPONENTEN.modul.watt,
    }),
    []
  )

  // ── Umrechnung Bildschirm <-> Meter ────────────────────────────────
  const mpp = meterProPixel(zentrum.lat, zoom)

  const meterZuPixel = useCallback(
    (p: MeterPunkt) => ({
      x: groesse.b / 2 + p.x / mpp,
      y: groesse.h / 2 - p.y / mpp,
    }),
    [groesse, mpp]
  )

  const pixelZuMeter = useCallback(
    (px: number, py: number): MeterPunkt => ({
      x: (px - groesse.b / 2) * mpp,
      y: (groesse.h / 2 - py) * mpp,
    }),
    [groesse, mpp]
  )

  // ── Grösse des Kartenfensters verfolgen ────────────────────────────
  useEffect(() => {
    const el = box.current
    if (!el) return
    const messen = () =>
      setGroesse({ b: el.clientWidth, h: Math.max(360, Math.round(el.clientWidth * 0.62)) })
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /**
   * Adresse des Kunden beim Oeffnen anfliegen und das Dach gleich mitladen.
   *
   * Der Verkaeufer soll die Folie aufschlagen und die fertige Belegung sehen.
   * Schlaegt die Suche mit der vollen Adresse fehl – etwa weil die Hausnummer
   * einen Zusatz hat –, versuchen wir es ohne Zusatz und danach nur mit der
   * Strasse. Erst wenn auch das nichts bringt, bleibt das Suchfeld stehen.
   */
  useEffect(() => {
    if (!startAdresse || adresseGesetzt === startAdresse) return
    setAdresseGesetzt(startAdresse)
    setSuche(startAdresse)

    const varianten = [
      startAdresse,
      // Hausnummer-Zusaetze wie "12a" oder "12/3" entfernen
      startAdresse.replace(/(\d+)\s*[a-zA-Z/.\-]\S*/g, '$1'),
      // Nur Strasse und Ort, ohne Nummer
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
            setZoom(20)
            setSuche(t[0].label)
            await dachAnPunkt(ziel, t[0].label, ziel)
            return
          }
        } catch {
          break
        } finally {
          setLaedt(false)
        }
      }
      setLaedt(false)
      setMeldung(
        `Die Adresse "${startAdresse}" wurde nicht gefunden. Bitte oben suchen oder das Dach von Hand einzeichnen.`
      )
    })()
    // dachAnPunkt haengt an Zustand, der sich hier nicht aendert
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

  function trefferWaehlen(t: AdressTreffer) {
    setZentrum({ lon: t.lon, lat: t.lat })
    setZoom(19)
    setTreffer([])
    setSuche(t.label)
    setMeldung('Klicken Sie auf die Dachfläche, die belegt werden soll.')
  }

  // ── Dachfläche vom Bund holen ──────────────────────────────────────
  /**
   * `bezug` ist der Ursprung der Meterprojektion. Beim automatischen Anflug
   * ist das neue Zentrum im State noch nicht gesetzt, deshalb reichen wir es
   * ausdruecklich durch statt uns auf `zentrum` zu verlassen.
   */
  async function dachAnPunkt(p: LonLat, adressText?: string, bezug?: LonLat) {
    const ursprung = bezug ?? p
    setLaedt(true)
    setMeldung(null)
    try {
      const flaechen = await ladeDachflaechen(p)
      setGefundene(flaechen)
      const klick = zuMeter(p, ursprung)
      const treffer =
        flaechen.find((f) => imPolygon(klick, f.ring.map((r) => zuMeter(r, ursprung)))) ?? flaechen[0]
      if (!treffer) {
        setMeldung(
          adressText
            ? `${adressText} gefunden, aber ohne Dachdaten im Kataster. Bitte das Dach von Hand einzeichnen.`
            : 'Für diese Stelle liegen keine Dachdaten vor. Zeichnen Sie das Dach von Hand ein.'
        )
        return
      }
      dachUebernehmen(treffer, ursprung)
    } catch {
      setMeldung('Die Dachdaten des Bundes sind gerade nicht erreichbar. Zeichnen Sie das Dach von Hand ein.')
    } finally {
      setLaedt(false)
    }
  }

  function dachUebernehmen(f: Dachflaeche, bezug?: LonLat) {
    const ursprung = bezug ?? zentrum
    const poly = f.ring.map((r) => zuMeter(r, ursprung))
    setDachPolygon(poly)
    setDachDaten(f)
    setNeigung(Math.round(f.neigungGrad))
    setAzimut(Math.round(f.azimut))
    setSperrflaechen([])

    // Flachdach erkennen und gleich das passende K2-System vorschlagen
    const flach = f.neigungGrad <= 7
    const vorschlag = flach ? MONTAGESYSTEME.find((m) => m.id === 'k2-dome-ow')! : system
    const neueOpt: BelegungsOptionen = {
      ...opt,
      drehungGrad: flach ? 0 : firstwinkelAusAzimut(f.azimut),
      hochformat: vorschlag.hochformat,
      reihenabstand: reihenabstandFuer(
        vorschlag,
        vorschlag.hochformat ? modulMasse.laenge : modulMasse.breite
      ),
      ostWest: vorschlag.ostWest,
    }
    setSystem(vorschlag)
    setOpt(neueOpt)
    setModule(belegeDach(poly, modulMasse, neueOpt, []))
    setMeldung(
      `Dachfläche übernommen: ${Math.round(f.flaecheM2)} m², ${azimutText(f.azimut)}, ` +
        `${Math.round(f.neigungGrad)}° Neigung, Eignung ${f.klasseText || f.klasse}. ` +
        `Unterkonstruktion: ${vorschlag.name}.`
    )
  }

  // ── Belegung neu rechnen, wenn sich etwas ändert ───────────────────
  const neuBelegen = useCallback(
    (
      poly = dachPolygon,
      optionen = opt,
      sperren = sperrflaechen,
      behalteManuelle = true
    ) => {
      const manuelle = behalteManuelle ? module.filter((m) => m.manuell) : []
      const raster = belegeDach(poly, modulMasse, optionen, sperren)
      setModule([...raster, ...manuelle])
    },
    [dachPolygon, opt, sperrflaechen, module, modulMasse]
  )

  /**
   * Systemwechsel setzt Modulausrichtung, Reihenabstand und die
   * Ost-West-Kippung nach den Vorgaben des K2-Systems.
   */
  function systemWaehlen(m: Montagesystem) {
    setSystem(m)
    const neu: BelegungsOptionen = {
      ...opt,
      hochformat: m.hochformat,
      reihenabstand: reihenabstandFuer(m, m.hochformat ? modulMasse.laenge : modulMasse.breite),
      ostWest: m.ostWest,
      // Auf dem Flachdach gibt kein First die Richtung vor
      drehungGrad: m.dachart === 'FLACH' ? 0 : opt.drehungGrad,
    }
    setOpt(neu)
    if (m.aufstaenderung > 0) setNeigung(m.aufstaenderung)
    if (dachPolygon.length >= 3) {
      const manuelle = module.filter((mm) => mm.manuell)
      setModule([...belegeDach(dachPolygon, modulMasse, neu, sperrflaechen), ...manuelle])
    }
  }

  function optAendern(patch: Partial<BelegungsOptionen>) {
    const neu = { ...opt, ...patch }
    setOpt(neu)
    if (dachPolygon.length >= 3) {
      const manuelle = module.filter((m) => m.manuell)
      setModule([...belegeDach(dachPolygon, modulMasse, neu, sperrflaechen), ...manuelle])
    }
  }

  // ── Klick auf die Karte ────────────────────────────────────────────
  const gezogen = useRef(false)

  function kartenKlick(ev: React.MouseEvent) {
    if (gezogen.current) return
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
    const px = ev.clientX - r.left
    const py = ev.clientY - r.top
    const m = pixelZuMeter(px, py)

    if (werkzeug === 'auswahl') {
      void dachAnPunkt(zuLonLat(m, zentrum))
      return
    }

    if (werkzeug === 'dach' || werkzeug === 'sperre') {
      // Klick nahe dem ersten Punkt schliesst die Fläche
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

    if (werkzeug === 'modulPlus') {
      const neu = moduleAnPunkt(m, modulMasse, opt, `hand${Date.now()}`)
      setModule([...module, neu])
      return
    }

    if (werkzeug === 'modulMinus') {
      const getroffen = module.find((mod) => imPolygon(m, mod.ecken))
      if (getroffen) setModule(module.filter((mod) => mod.id !== getroffen.id))
    }
  }

  function flaecheSchliessen() {
    if (zeichnung.length < 3) {
      setZeichnung([])
      return
    }
    if (werkzeug === 'dach') {
      setDachPolygon(zeichnung)
      setDachDaten(null)
      setModule(belegeDach(zeichnung, modulMasse, opt, sperrflaechen))
      setMeldung(`Dachfläche gezeichnet: ${Math.round(flaecheM2(zeichnung))} m² Grundfläche.`)
    } else {
      const neu: Sperrflaeche = {
        id: `s${Date.now()}`,
        bezeichnung: `Sperrfläche ${sperrflaechen.length + 1}`,
        punkte: zeichnung,
      }
      const alle = [...sperrflaechen, neu]
      setSperrflaechen(alle)
      // Module, die jetzt kollidieren, verschwinden – auch die von Hand gesetzten
      const manuelle = module
        .filter((m) => m.manuell)
        .filter((m) => !alle.some((s) => beruehrtSperrflaeche(m.ecken, m.mitte, s)))
      setModule([...belegeDach(dachPolygon, modulMasse, opt, alle), ...manuelle])
      setMeldung(`Sperrfläche gesetzt: ${Math.round(flaecheM2(zeichnung))} m² bleiben frei.`)
    }
    setZeichnung([])
    setWerkzeug('auswahl')
  }

  // ── Karte verschieben ──────────────────────────────────────────────
  const zieh = useRef<{ x: number; y: number; lon: number; lat: number } | null>(null)

  function ziehStart(ev: React.MouseEvent) {
    if (werkzeug !== 'auswahl') return
    gezogen.current = false
    zieh.current = { x: ev.clientX, y: ev.clientY, lon: zentrum.lon, lat: zentrum.lat }
  }

  function ziehen(ev: React.MouseEvent) {
    if (!zieh.current) return
    const dx = ev.clientX - zieh.current.x
    const dy = ev.clientY - zieh.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) gezogen.current = true
    const n = Math.pow(2, zoom) * KACHEL_GROESSE
    const start = lonLatZuWelt({ lon: zieh.current.lon, lat: zieh.current.lat })
    const neu = weltZuLonLat(start.wx - dx / n, start.wy - dy / n)
    setZentrum(neu)
  }

  function ziehEnde() {
    zieh.current = null
    // Der Klick-Handler feuert direkt danach; Flag erst im nächsten Tick lösen
    setTimeout(() => {
      gezogen.current = false
    }, 0)
  }

  // ── Kacheln des aktuellen Ausschnitts ──────────────────────────────
  const kacheln = useMemo(() => {
    // Ueber Stufe 20 liefert swisstopo nichts mehr – dann skalieren wir die
    // letzte verfuegbare Stufe hoch, damit sich Module genauer setzen lassen.
    const kachelZoom = Math.min(zoom, MAX_KACHEL_ZOOM)
    const skala = Math.pow(2, zoom - kachelZoom)
    const kachelPx = KACHEL_GROESSE * skala

    const { wx, wy } = lonLatZuWelt(zentrum)
    const n = Math.pow(2, kachelZoom)
    const mitteX = wx * n * kachelPx
    const mitteY = wy * n * kachelPx
    const linksOben = { x: mitteX - groesse.b / 2, y: mitteY - groesse.h / 2 }

    const x0 = Math.floor(linksOben.x / kachelPx)
    const y0 = Math.floor(linksOben.y / kachelPx)
    const x1 = Math.floor((linksOben.x + groesse.b) / kachelPx)
    const y1 = Math.floor((linksOben.y + groesse.h) / kachelPx)

    const liste: Array<{ url: string; links: number; oben: number; groesse: number; key: string }> = []
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
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

  // ── Kennzahlen ─────────────────────────────────────────────────────
  const aktiveModule = module.filter((m) => !m.aus)
  const kwp = Math.round((aktiveModule.length * modulMasse.wattPeak) / 10) / 100
  const belegt = aktiveModule.length * modulMasse.laenge * modulMasse.breite
  const dachGrund = dachPolygon.length >= 3 ? flaecheM2(dachPolygon) : 0
  // Die Grundflaeche aus dem Luftbild ist die Projektion; die reale
  // Dachflaeche ergibt sich ueber den Cosinus der Neigung.
  const dachReal = dachDaten?.flaecheM2 ?? dachGrund / Math.cos((neigung * Math.PI) / 180)
  const sperrSumme = sperrflaechen.reduce((s, f) => s + flaecheM2(f.punkte), 0)
  const wr = waehleWechselrichter(kwp, false)
  const wrHybrid = waehleWechselrichter(kwp, true)

  // ── Belegungsbild erzeugen ─────────────────────────────────────────
  async function bildErzeugen(): Promise<string | null> {
    const c = document.createElement('canvas')
    c.width = groesse.b
    c.height = groesse.h
    const ctx = c.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#1F2937'
    ctx.fillRect(0, 0, c.width, c.height)

    // Kacheln laden – swisstopo erlaubt CORS, deshalb bleibt das Canvas exportierbar
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

    const zeichnePoly = (punkte: MeterPunkt[], fuell: string, linie: string, breite = 2) => {
      if (punkte.length < 2) return
      ctx.beginPath()
      punkte.forEach((p, i) => {
        const s = meterZuPixel(p)
        if (i === 0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
      })
      ctx.closePath()
      ctx.fillStyle = fuell
      ctx.fill()
      ctx.strokeStyle = linie
      ctx.lineWidth = breite
      ctx.stroke()
    }

    zeichnePoly(dachPolygon, 'rgba(245,158,11,0.12)', '#F59E0B', 2.5)
    sperrflaechen.forEach((s) => zeichnePoly(s.punkte, 'rgba(248,113,113,0.35)', '#F87171', 2))
    aktiveModule.forEach((m) => zeichnePoly(m.ecken, 'rgba(30,58,95,0.92)', '#93C5FD', 1))

    // Beschriftung
    ctx.fillStyle = 'rgba(6,8,12,0.82)'
    ctx.fillRect(0, c.height - 34, c.width, 34)
    ctx.fillStyle = '#F3F4F6'
    ctx.font = '600 13px Outfit, system-ui, sans-serif'
    ctx.fillText(
      `${aktiveModule.length} Module · ${kwp.toFixed(2)} kWp · ${Math.round(dachReal)} m² Dachfläche` +
        (sperrflaechen.length ? ` · ${sperrflaechen.length} Sperrflächen` : ''),
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
      setMeldung('Das Bild konnte nicht erzeugt werden – bitte Screenshot verwenden.')
      return null
    }
  }

  async function uebernehmen() {
    if (!aktiveModule.length) {
      setMeldung('Es ist noch kein Modul platziert.')
      return
    }
    setLaedt(true)
    const neuesBild = await bildErzeugen()
    setBild(neuesBild)
    setLaedt(false)

    onUebernehmen({
      modulAnzahl: aktiveModule.length,
      kwp,
      ausrichtung: azimutZuAusrichtung(azimut),
      azimut,
      neigungGrad: neigung,
      dachflaecheM2: Math.round(dachReal),
      belegteFlaecheM2: Math.round(belegt),
      eignungKlasse: dachDaten?.klasse ?? 0,
      eignungText: dachDaten?.klasseText ?? '',
      ertragBfeKwh: dachDaten?.stromertragKwh ?? 0,
      einstrahlung: dachDaten?.einstrahlung ?? 0,
      sperrflaechen: sperrflaechen.length,
      montagesystem: system.name,
      montageHinweis: system.hinweis,
      dachart: system.dachart,
      aufstaenderung: system.aufstaenderung,
      ostWest: system.ostWest,
      wechselrichter: wr?.geraete[0]?.geraet.name ?? '',
      wechselrichterAc: wr?.acKw ?? 0,
      bild: neuesBild,
      adresse: suche,
    })
    setMeldung(`Übernommen: ${aktiveModule.length} Module, ${kwp.toFixed(2)} kWp.`)
  }

  async function bildHerunterladen() {
    const b = bild ?? (await bildErzeugen())
    if (!b) return
    setBild(b)
    const a = document.createElement('a')
    a.href = b
    a.download = `Dachbelegung_${(suche || 'Anlage').replace(/[^\w]+/g, '_')}.jpg`
    a.click()
  }

  const aktivesWerkzeug = WERKZEUGE.find((w) => w.id === werkzeug)

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5 mb-1">
          <Sun size={19} strokeWidth={1.8} className="text-amber" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber">Dachbelegung</p>
        </div>
        <h2 className="text-[26px] sm:text-[30px] font-bold text-text mb-1">
          So sieht Ihre Anlage auf dem Dach aus
        </h2>
        <p className="text-[13px] text-text-sec mb-5">
          Luftbild der swisstopo, Dachdaten aus dem Sonnendach-Kataster des Bundes.
        </p>

        {/* ── Adresssuche ── */}
        <div className="flex gap-2 mb-3 relative">
          <div className="relative flex-1">
            <Search
              size={15}
              strokeWidth={1.8}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
            />
            <input
              type="text"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adresseSuchen()}
              placeholder="Strasse, Nummer und Ort"
              className="glass-input w-full pl-9 pr-3 py-2.5 text-[13px]"
            />
            {treffer.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
                style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                {treffer.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => trefferWaehlen(t)}
                    className="block w-full text-left px-3 py-2 text-[12px] text-text-sec hover:bg-white/5"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={adresseSuchen} className="btn-secondary px-4 text-[12px]">
            Suchen
          </button>
        </div>

        {/* ── Werkzeuge ── */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {WERKZEUGE.map((w) => {
            const aktiv = werkzeug === w.id
            const Icon = w.icon
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setWerkzeug(w.id)
                  setZeichnung([])
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: aktiv ? 'color-mix(in srgb, #F59E0B 20%, transparent)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 50%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                  color: aktiv ? '#F59E0B' : undefined,
                }}
              >
                <Icon size={13} strokeWidth={2} />
                {w.text}
              </button>
            )
          })}
          <div className="flex-1" />
          {zeichnung.length >= 3 && (
            <button type="button" onClick={flaecheSchliessen} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-[11px]">
              <Check size={13} strokeWidth={2} />
              Fläche schliessen
            </button>
          )}
          {zeichnung.length > 0 && (
            <button
              type="button"
              onClick={() => setZeichnung(zeichnung.slice(0, -1))}
              className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[11px]"
            >
              <Undo2 size={13} strokeWidth={2} />
              Punkt zurück
            </button>
          )}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
            className="btn-secondary p-2"
            aria-label="Näher"
          >
            <ZoomIn size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
            className="btn-secondary p-2"
            aria-label="Weiter weg"
          >
            <ZoomOut size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-text-dim mb-3">
          <Info size={12} strokeWidth={1.8} />
          {aktivesWerkzeug?.hilfe}
        </div>

        {/* ── Karte ── */}
        <div
          ref={box}
          className="relative overflow-hidden rounded-2xl select-none"
          style={{
            height: groesse.h,
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
            <img
              key={k.key}
              src={k.url}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: k.links,
                top: k.oben,
                width: k.groesse,
                height: k.groesse,
                pointerEvents: 'none',
              }}
            />
          ))}

          <svg
            width={groesse.b}
            height={groesse.h}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {/* Dachfläche */}
            {dachPolygon.length >= 3 && (
              <polygon
                points={dachPolygon.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')}
                fill="rgba(245,158,11,0.10)"
                stroke="#F59E0B"
                strokeWidth={2.5}
              />
            )}
            {/* Module */}
            {module.map((m) => {
              const pts = m.ecken.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')
              return (
                <polygon
                  key={m.id}
                  points={pts}
                  fill={
                    m.manuell
                      ? 'rgba(52,211,153,0.85)'
                      : m.richtung === 'WEST'
                        ? 'rgba(59,90,140,0.88)'
                        : 'rgba(30,58,95,0.88)'
                  }
                  stroke={m.manuell ? '#6EE7B7' : m.richtung === 'WEST' ? '#BFDBFE' : '#93C5FD'}
                  strokeWidth={0.8}
                />
              )
            })}
            {/* Sperrflächen */}
            {sperrflaechen.map((s) => (
              <polygon
                key={s.id}
                points={s.punkte.map((p) => { const q = meterZuPixel(p); return `${q.x},${q.y}` }).join(' ')}
                fill="rgba(248,113,113,0.32)"
                stroke="#F87171"
                strokeWidth={2}
                strokeDasharray="5 3"
              />
            ))}
            {/* Zeichnung in Arbeit */}
            {zeichnung.length > 0 && (
              <>
                <polyline
                  points={zeichnung.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')}
                  fill="none"
                  stroke={werkzeug === 'sperre' ? '#F87171' : '#F59E0B'}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                {zeichnung.map((p, i) => {
                  const s = meterZuPixel(p)
                  return (
                    <circle
                      key={i}
                      cx={s.x}
                      cy={s.y}
                      r={i === 0 ? 6 : 4}
                      fill={i === 0 ? '#F59E0B' : '#FFFFFF'}
                      stroke="#0D1117"
                      strokeWidth={1.5}
                    />
                  )
                })}
              </>
            )}
          </svg>

          {laedt && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.5)' }}>
              <Loader2 size={26} strokeWidth={1.8} className="text-amber animate-spin" />
            </div>
          )}

          {/* Massstab */}
          <div
            className="absolute bottom-2 left-2 px-2 py-1 rounded text-[10px] text-white"
            style={{ background: 'rgba(6,8,12,0.7)' }}
          >
            {Math.round(50 / mpp)} px = 50 m · Zoom {zoom}
          </div>
          <div
            className="absolute bottom-2 right-2 px-2 py-1 rounded text-[9px]"
            style={{ background: 'rgba(6,8,12,0.7)', color: '#9CA3AF' }}
          >
            Luftbild swisstopo · Dachdaten BFE
          </div>
        </div>

        {meldung && (
          <div
            className="mt-3 px-3.5 py-2.5 rounded-xl text-[12px]"
            style={{
              background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 28%, transparent)',
              color: '#FCD34D',
            }}
          >
            {meldung}
          </div>
        )}

        {/* ── Weitere gefundene Dachflächen ── */}
        {gefundene.length > 1 && (
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
              Dachflächen an dieser Adresse
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gefundene.slice(0, 8).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => dachUebernehmen(f)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] transition-all"
                  style={{
                    background: dachDaten?.id === f.id ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${dachDaten?.id === f.id ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                    color: dachDaten?.id === f.id ? '#F59E0B' : undefined,
                  }}
                >
                  {Math.round(f.flaecheM2)} m² · {azimutText(f.azimut)} · {Math.round(f.neigungGrad)}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Einstellungen und Ergebnis ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 mt-4">
          {/* Belegungs-Einstellungen */}
          <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h3 className="text-[13px] font-bold text-text mb-3">Belegung einstellen</h3>

            {/* ── Unterkonstruktion ── */}
            <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
              Unterkonstruktion
            </div>
            <div className="flex gap-1.5 mb-2">
              {(['STEIL', 'FLACH'] as const).map((d) => {
                const aktiv = system.dachart === d
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const erstes = MONTAGESYSTEME.find((m) => m.dachart === d)
                      if (erstes) systemWaehlen(erstes)
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold"
                    style={{
                      background: aktiv ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                      color: aktiv ? '#F59E0B' : undefined,
                    }}
                  >
                    {d === 'STEIL' ? 'Steildach' : 'Flachdach'}
                  </button>
                )
              })}
            </div>
            <div className="space-y-1 mb-3">
              {MONTAGESYSTEME.filter((m) => m.dachart === system.dachart).map((m) => {
                const aktiv = system.id === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => systemWaehlen(m)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: aktiv ? 'color-mix(in srgb, #F59E0B 12%, transparent)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div
                      className="text-[11px] font-semibold"
                      style={{ color: aktiv ? '#F59E0B' : undefined }}
                    >
                      {m.name}
                      {m.ostWest && <span className="ml-1.5 text-[9px] font-normal">Ost-West</span>}
                    </div>
                    <div className="text-[9px] text-text-dim">
                      {m.untergrund}
                      {m.aufstaenderung > 0 ? ` · ${m.aufstaenderung}° aufgeständert` : ' · dachparallel'}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[9px] text-text-dim mb-4">{system.hinweis}</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => optAendern({ hochformat: true })}
                className="px-3 py-2 rounded-lg text-[11px] font-semibold"
                style={{
                  background: opt.hochformat ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${opt.hochformat ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                  color: opt.hochformat ? '#F59E0B' : undefined,
                }}
              >
                Hochformat
              </button>
              <button
                type="button"
                onClick={() => optAendern({ hochformat: false })}
                className="px-3 py-2 rounded-lg text-[11px] font-semibold"
                style={{
                  background: !opt.hochformat ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${!opt.hochformat ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                  color: !opt.hochformat ? '#F59E0B' : undefined,
                }}
              >
                Querformat
              </button>
            </div>

            {[
              { label: 'Drehung des Rasters', wert: opt.drehungGrad, min: -180, max: 180, schritt: 1, einheit: '°', feld: 'drehungGrad' as const },
              { label: 'Randabstand', wert: opt.randabstand, min: 0, max: 1.5, schritt: 0.05, einheit: 'm', feld: 'randabstand' as const },
              { label: 'Modulabstand in der Reihe', wert: opt.modulabstand, min: 0, max: 0.3, schritt: 0.01, einheit: 'm', feld: 'modulabstand' as const },
              { label: 'Reihenabstand', wert: opt.reihenabstand, min: 0, max: 4, schritt: 0.05, einheit: 'm', feld: 'reihenabstand' as const },
            ].map((r) => (
              <div key={r.feld} className="mb-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-dim">{r.label}</span>
                  <span className="text-text font-semibold tabular-nums">
                    {r.feld === 'drehungGrad' ? Math.round(r.wert) : r.wert.toFixed(2)} {r.einheit}
                  </span>
                </div>
                <input
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={r.schritt}
                  value={r.wert}
                  onChange={(e) => optAendern({ [r.feld]: Number(e.target.value) })}
                  className="w-full cursor-pointer"
                  style={{ height: 5, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-dim">Dachneigung</span>
                  <span className="text-text font-semibold tabular-nums">{neigung}°</span>
                </div>
                <input
                  type="range" min={0} max={60} step={1} value={neigung}
                  onChange={(e) => setNeigung(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ height: 5, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }}
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-dim">Ausrichtung</span>
                  <span className="text-text font-semibold tabular-nums">{azimutText(azimut)}</span>
                </div>
                <input
                  type="range" min={-180} max={180} step={1} value={azimut}
                  onChange={(e) => setAzimut(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ height: 5, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => neuBelegen(dachPolygon, opt, sperrflaechen, false)}
                disabled={dachPolygon.length < 3}
                className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[11px] disabled:opacity-40"
              >
                <RotateCw size={12} strokeWidth={2} />
                Neu belegen
              </button>
              {sperrflaechen.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const rest = sperrflaechen.filter((x) => x.id !== s.id)
                    setSperrflaechen(rest)
                    const manuelle = module.filter((m) => m.manuell)
                    setModule([...belegeDach(dachPolygon, modulMasse, opt, rest), ...manuelle])
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px]"
                  style={{
                    background: 'color-mix(in srgb, #F87171 12%, transparent)',
                    border: '1px solid color-mix(in srgb, #F87171 30%, transparent)',
                    color: '#F87171',
                  }}
                >
                  <Trash2 size={11} strokeWidth={2} />
                  {s.bezeichnung}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-text-dim mt-3">
              Modulmass {KOMPONENTEN.modul.masse}, {KOMPONENTEN.modul.watt} W je Modul.
              Grün eingefärbte Module wurden von Hand gesetzt.
            </p>
          </div>

          {/* Ergebnis */}
          <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h3 className="text-[13px] font-bold text-text mb-3">Ergebnis</h3>

            <div className="text-[32px] font-bold text-amber leading-none tabular-nums mb-0.5">
              {kwp.toFixed(2)} kWp
            </div>
            <p className="text-[12px] text-text-sec mb-4">
              {aktiveModule.length} Module à {modulMasse.wattPeak} W
            </p>

            <dl className="space-y-1.5 text-[11px] mb-4">
              {[
                ['Dachfläche', dachReal > 0 ? `${Math.round(dachReal)} m²` : '—'],
                ['davon belegt', belegt > 0 ? `${Math.round(belegt)} m²` : '—'],
                ['Ausrichtung', system.ostWest ? 'Ost-West' : `${azimutText(azimut)} (${azimut}°)`],
                ['Neigung', system.aufstaenderung > 0 ? `${system.aufstaenderung}° aufgeständert` : `${neigung}°`],
                ['Unterkonstruktion', system.name],
                ...(sperrflaechen.length
                  ? [[`Sperrflächen (${sperrflaechen.length})`, `${Math.round(sperrSumme)} m²`] as [string, string]]
                  : []),
                ...(dachDaten
                  ? ([
                      ['Eignung Bund', dachDaten.klasseText || `Klasse ${dachDaten.klasse}`],
                      ['Einstrahlung', `${Math.round(dachDaten.einstrahlung)} kWh/m²`],
                    ] as Array<[string, string]>)
                  : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-text-dim">{k}</dt>
                  <dd className="text-text-sec font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>

            {/* Wechselrichter-Auslegung */}
            {wr && (
              <div
                className="p-3 rounded-xl mb-4"
                style={{
                  background: 'color-mix(in srgb, #60A5FA 9%, transparent)',
                  border: '1px solid color-mix(in srgb, #60A5FA 26%, transparent)',
                }}
              >
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#60A5FA' }}>
                  Passender Wechselrichter
                </div>
                <div className="text-[13px] font-bold text-text mb-0.5">
                  {wr.geraete[0].anzahl > 1 ? `${wr.geraete[0].anzahl} × ` : ''}
                  {wr.geraete[0].geraet.name}
                </div>
                <div className="text-[10px] text-text-sec mb-1.5">
                  {wr.acKw} kW AC · DC/AC {wr.dcAcVerhaeltnis} · {wr.geraete[0].geraet.mppt} MPP-Tracker
                </div>
                {wrHybrid && wrHybrid.geraete[0].geraet.name !== wr.geraete[0].geraet.name && (
                  <div className="text-[10px] text-text-dim mb-1.5">
                    Mit Speicher: {wrHybrid.geraete[0].anzahl > 1 ? `${wrHybrid.geraete[0].anzahl} × ` : ''}
                    {wrHybrid.geraete[0].geraet.name}
                  </div>
                )}
                {wr.hinweis && (
                  <div className="text-[10px]" style={{ color: '#FCD34D' }}>{wr.hinweis}</div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={uebernehmen}
                disabled={!aktiveModule.length || laedt}
                className="btn-primary w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] disabled:opacity-40"
              >
                <Check size={14} strokeWidth={2} />
                In den Rechner und die Offerte übernehmen
              </button>
              <button
                type="button"
                onClick={bildHerunterladen}
                disabled={!aktiveModule.length}
                className="btn-secondary w-full flex items-center justify-center gap-2 px-4 py-2 text-[11px] disabled:opacity-40"
              >
                <Camera size={13} strokeWidth={1.8} />
                Belegungsbild speichern
              </button>
            </div>

            {bild && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
                  Für die Offerte gespeichert
                </div>
                <img
                  src={bild}
                  alt="Dachbelegung"
                  className="w-full rounded-lg"
                  style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
