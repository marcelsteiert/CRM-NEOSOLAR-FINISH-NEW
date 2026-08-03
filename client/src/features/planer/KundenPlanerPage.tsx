import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Sun, Loader2, Check, ArrowRight, ArrowLeft, Home, Battery,
  Car, Flame, Zap, TrendingUp, Leaf, Shield, Send, Info,
} from 'lucide-react'
import {
  KACHEL_GROESSE, MAX_KACHEL_ZOOM, kachelUrl, lonLatZuWelt,
  meterProPixel, zuMeter, imPolygon, belegeDach, rasterFuer,
  zelleAnPunkt, zellenSchluessel, sucheAdresse, ladeDachflaechen,
  azimutZuAusrichtung, azimutText, firstwinkelAusAzimut, waehleWechselrichter,
} from '../../lib/dachplaner'
import type {
  LonLat, MeterPunkt, Dachflaeche, AdressTreffer, BelegungsOptionen,
} from '../../lib/dachplaner'
import { berechne } from '../../lib/pvCalculator'
import type { CalculatorConfig, CalculatorInput } from '../../lib/pvCalculator'
import { DEFAULT_CONFIG, DEFAULT_INPUT, KOMPONENTEN } from '../../lib/calculatorConfig'

const API = import.meta.env.VITE_API_URL ?? '/api/v1'
const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')
const kwh = (n: number) => Math.round(n).toLocaleString('de-CH') + ' kWh'

type Schritt = 'adresse' | 'dach' | 'verbrauch' | 'ergebnis' | 'kontakt' | 'fertig'

const SCHRITTE: Array<{ id: Schritt; titel: string }> = [
  { id: 'adresse', titel: 'Ihr Haus' },
  { id: 'dach', titel: 'Ihr Dach' },
  { id: 'verbrauch', titel: 'Ihr Verbrauch' },
  { id: 'ergebnis', titel: 'Ihr Ergebnis' },
  { id: 'kontakt', titel: 'Kontakt' },
]

/**
 * Selbstplaner fuer den Kunden.
 *
 * Der Kunde soll ohne Verkaeufer zu einer belastbaren Zahl kommen: Adresse
 * eingeben, Dach anklicken, Verbrauch schaetzen, Ergebnis sehen. Erst ganz
 * am Schluss wird nach Kontaktdaten gefragt – wer vorher ein Formular
 * sieht, springt ab.
 *
 * Gerechnet wird mit derselben Engine wie im Verkaufsgespraech, damit die
 * Zahlen spaeter nicht auseinanderlaufen.
 */
export default function KundenPlanerPage() {
  const [suchparameter] = useSearchParams()
  const rid = suchparameter.get('rid')

  const [schritt, setSchritt] = useState<Schritt>('adresse')
  const [config, setConfig] = useState<CalculatorConfig>(DEFAULT_CONFIG)
  const [input, setInput] = useState<CalculatorInput>({ ...DEFAULT_INPUT, kwp: 0 })

  const [suche, setSuche] = useState('')
  const [treffer, setTreffer] = useState<AdressTreffer[]>([])
  const [laedt, setLaedt] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)

  const [zentrum, setZentrum] = useState<LonLat>({ lon: 8.2275, lat: 46.8182 })
  const [ursprung, setUrsprung] = useState<LonLat | null>(null)
  const [zoom, setZoom] = useState(20)
  const [dachPolygon, setDachPolygon] = useState<MeterPunkt[]>([])
  const [dachDaten, setDachDaten] = useState<Dachflaeche | null>(null)
  const [gefundene, setGefundene] = useState<Dachflaeche[]>([])
  const [entfernt, setEntfernt] = useState<string[]>([])
  const [belegungsgrad, setBelegungsgrad] = useState(100)

  const kartenBox = useRef<HTMLDivElement>(null)
  const [groesse, setGroesse] = useState({ b: 800, h: 460 })

  const modulMasse = useMemo(
    () => ({ laenge: KOMPONENTEN.modul.laengeM, breite: KOMPONENTEN.modul.breiteM, wattPeak: KOMPONENTEN.modul.watt }),
    []
  )
  const opt: BelegungsOptionen = useMemo(
    () => ({
      hochformat: true,
      randabstand: 0.3,
      modulabstand: 0.02,
      reihenabstand: 0.02,
      drehungGrad: dachDaten ? firstwinkelAusAzimut(dachDaten.azimut) : 0,
      ostWest: false,
    }),
    [dachDaten]
  )

  useEffect(() => {
    fetch(`${API}/public/calculator/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('nicht erreichbar'))))
      .then((j) => {
        if (j?.data?.pricing) setConfig({ ...DEFAULT_CONFIG, ...j.data.pricing })
      })
      .catch(() => {
        /* Standardwerte genuegen */
      })
  }, [])

  useEffect(() => {
    const el = kartenBox.current
    if (!el) return
    const messen = () => setGroesse({ b: el.clientWidth, h: el.clientHeight })
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [schritt])

  // ── Karte ──────────────────────────────────────────────────────────
  const mpp = meterProPixel(zentrum.lat, zoom)
  const bezug = ursprung ?? zentrum
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

  const kacheln = useMemo(() => {
    const kz = Math.min(zoom, MAX_KACHEL_ZOOM)
    const skala = Math.pow(2, zoom - kz)
    const px = KACHEL_GROESSE * skala
    const { wx, wy } = lonLatZuWelt(zentrum)
    const n = Math.pow(2, kz)
    const lo = { x: wx * n * px - groesse.b / 2, y: wy * n * px - groesse.h / 2 }
    const liste: Array<{ url: string; links: number; oben: number; g: number; key: string }> = []
    for (let x = Math.floor(lo.x / px); x <= Math.floor((lo.x + groesse.b) / px); x++) {
      for (let y = Math.floor(lo.y / px); y <= Math.floor((lo.y + groesse.h) / px); y++) {
        if (x < 0 || y < 0 || x >= n || y >= n) continue
        liste.push({ url: kachelUrl(kz, x, y), links: x * px - lo.x, oben: y * px - lo.y, g: px, key: `${kz}-${x}-${y}` })
      }
    }
    return liste
  }, [zentrum, zoom, groesse])

  // ── Belegung ───────────────────────────────────────────────────────
  const alleModule = useMemo(
    () => (dachPolygon.length >= 3 ? belegeDach(dachPolygon, modulMasse, opt, []) : []),
    [dachPolygon, modulMasse, opt]
  )

  /**
   * Der Regler bestimmt, wie viel Prozent des Daches belegt werden.
   * Reihenweise von unten auffuellen wirkt natuerlicher als zufaellig.
   */
  const module = useMemo(() => {
    const raus = new Set(entfernt)
    const nachRang = [...alleModule].sort((a, b) => a.reihe - b.reihe || a.spalte - b.spalte)
    const wieViele = Math.round((nachRang.length * belegungsgrad) / 100)
    return nachRang.slice(0, wieViele).filter((m) => !raus.has(m.id))
  }, [alleModule, belegungsgrad, entfernt])

  const kwp = Math.round((module.length * modulMasse.wattPeak) / 10) / 100

  useEffect(() => {
    setInput((v) => ({
      ...v,
      kwp,
      ausrichtung: dachDaten ? azimutZuAusrichtung(dachDaten.azimut) : v.ausrichtung,
      neigung: dachDaten ? Math.round(dachDaten.neigungGrad) : v.neigung,
    }))
  }, [kwp, dachDaten])

  const ergebnis = useMemo(() => berechne(input, config), [input, config])
  const wr = waehleWechselrichter(kwp, input.speicherKwh > 0)

  // ── Adresse und Dach ───────────────────────────────────────────────
  async function adresseSuchen(text?: string) {
    const q = (text ?? suche).trim()
    if (q.length < 4) return
    setLaedt(true)
    setMeldung(null)
    try {
      const t = await sucheAdresse(q)
      setTreffer(t)
      if (!t.length) setMeldung('Diese Adresse haben wir nicht gefunden. Bitte mit Strasse, Nummer und Ort versuchen.')
      else if (t.length === 1) await trefferWaehlen(t[0])
    } catch {
      setMeldung('Die Adresssuche ist gerade nicht erreichbar. Bitte später nochmals versuchen.')
    } finally {
      setLaedt(false)
    }
  }

  async function trefferWaehlen(t: AdressTreffer) {
    const ziel = { lon: t.lon, lat: t.lat }
    setZentrum(ziel)
    setUrsprung(ziel)
    setZoom(20)
    setSuche(t.label)
    setTreffer([])
    setSchritt('dach')
    await dachLaden(ziel, ziel)
  }

  async function dachLaden(p: LonLat, fest: LonLat) {
    setLaedt(true)
    try {
      const flaechen = await ladeDachflaechen(p)
      setGefundene(flaechen)
      const klick = zuMeter(p, fest)
      const treff =
        flaechen.find((f) => imPolygon(klick, f.ring.map((r) => zuMeter(r, fest)))) ?? flaechen[0]
      if (!treff) {
        setMeldung('Für dieses Haus liegen uns keine Dachdaten vor. Wir schauen es uns gerne persönlich an.')
        return
      }
      dachWaehlen(treff, fest)
    } catch {
      setMeldung('Die Dachdaten sind gerade nicht abrufbar. Bitte später nochmals versuchen.')
    } finally {
      setLaedt(false)
    }
  }

  function dachWaehlen(f: Dachflaeche, fest?: LonLat) {
    setDachDaten(f)
    setDachPolygon(f.ring.map((r) => zuMeter(r, fest ?? bezug)))
    setEntfernt([])
    setBelegungsgrad(100)
    setMeldung(null)
  }

  function kartenKlick(ev: React.MouseEvent) {
    if (schritt !== 'dach' || !dachPolygon.length) return
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
    const m = pixelZuMeter(ev.clientX - r.left, ev.clientY - r.top)
    const raster = rasterFuer(dachPolygon, modulMasse, opt)
    if (!raster) return
    const z = zelleAnPunkt(m, raster)
    const s = zellenSchluessel(z.reihe, z.spalte)
    if (!module.some((x) => x.id === s)) return
    setEntfernt((alt) => (alt.includes(s) ? alt.filter((x) => x !== s) : [...alt, s]))
  }

  // ── Bild fuer den Lead ─────────────────────────────────────────────
  async function belegungsbild(): Promise<string | null> {
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
              ctx.drawImage(img, k.links, k.oben, k.g, k.g)
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
    pfad(dachPolygon)
    ctx.strokeStyle = '#F59E0B'
    ctx.lineWidth = 2.5
    ctx.stroke()
    for (const m of module) {
      pfad(m.ecken)
      ctx.fillStyle = '#121F35'
      ctx.fill()
      ctx.strokeStyle = '#8FA9C8'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
    try {
      return c.toDataURL('image/jpeg', 0.75)
    } catch {
      return null
    }
  }

  // ── Kontaktformular ────────────────────────────────────────────────
  const [formular, setFormular] = useState({
    firstName: '', lastName: '', email: '', phone: '', bemerkung: '', website: '',
  })
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function absenden(ev: React.FormEvent) {
    ev.preventDefault()
    setSendet(true)
    setFehler(null)
    try {
      const bild = await belegungsbild()
      const res = await fetch(`${API}/public/calculator/planer-anfrage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formular,
          address: suche,
          kwp: input.kwp,
          speicherKwh: input.speicherKwh,
          verbrauchKwh: input.verbrauchKwh,
          wallbox: input.wallbox,
          geschaetzterPreis: ergebnis.werklohn,
          modulAnzahl: module.length,
          dachflaecheM2: dachDaten ? Math.round(dachDaten.flaecheM2) : null,
          belegteFlaecheM2: Math.round(module.length * modulMasse.laenge * modulMasse.breite),
          ausrichtung: dachDaten ? azimutText(dachDaten.azimut) : null,
          neigung: dachDaten ? Math.round(dachDaten.neigungGrad) : null,
          jahresertragKwh: ergebnis.jahresertragKwh,
          autarkie: Math.round(ergebnis.autarkiegrad * 100),
          ersparnisJahr: ergebnis.ersparnisJahr1,
          amortisation: ergebnis.amortisationJahre,
          bild,
          rid,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error?.message ?? 'Die Anfrage konnte nicht gesendet werden')
      }
      setSchritt('fertig')
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSendet(false)
    }
  }

  // ── Darstellung ────────────────────────────────────────────────────
  const aktuellerIndex = SCHRITTE.findIndex((s) => s.id === schritt)

  const Kachel = ({ wert, label, farbe = '#F59E0B' }: { wert: string; label: string; farbe?: string }) => (
    <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="text-[24px] sm:text-[28px] font-bold tabular-nums leading-none" style={{ color: farbe }}>{wert}</div>
      <div className="text-[11px] text-text-dim mt-1.5">{label}</div>
    </div>
  )

  const Regler = ({ label, wert, min, max, schrittweite, einheit, onChange, hinweis }: {
    label: string; wert: number; min: number; max: number; schrittweite: number
    einheit: string; onChange: (v: number) => void; hinweis?: string
  }) => (
    <div className="mb-5">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label className="text-[13px] text-text-sec">{label}</label>
        <span className="text-[18px] font-bold text-amber tabular-nums shrink-0" style={{ minWidth: 110, textAlign: 'right' }}>
          {wert.toLocaleString('de-CH')} <span className="text-[12px] text-text-dim font-medium">{einheit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={schrittweite} value={wert}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ height: 6, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }} />
      {hinweis && <p className="text-[11px] text-text-dim mt-1">{hinweis}</p>}
    </div>
  )

  return (
    <div style={{ background: '#06080C', minHeight: '100vh' }} className="text-text">
      {/* Kopf */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(6,8,12,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4">
          <img src="/praesentation/logo-hell.png" alt="NEOSOLAR" className="h-7 object-contain" />
          {schritt !== 'fertig' && (
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
              {SCHRITTE.map((s, i) => (
                <div key={s.id} className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: i <= aktuellerIndex ? 'color-mix(in srgb, #F59E0B 16%, transparent)' : 'rgba(255,255,255,0.04)',
                      color: i <= aktuellerIndex ? '#F59E0B' : '#6B7280',
                    }}>
                    {i < aktuellerIndex ? <Check size={11} strokeWidth={2.5} /> : <span className="tabular-nums">{i + 1}</span>}
                    <span className="hidden sm:inline">{s.titel}</span>
                  </div>
                  {i < SCHRITTE.length - 1 && <div style={{ width: 12, height: 1, background: 'rgba(255,255,255,0.10)' }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Adresse ── */}
        {schritt === 'adresse' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sun size={18} strokeWidth={1.8} className="text-amber" />
              <p className="text-[11px] uppercase tracking-[0.25em] text-amber">Solarrechner</p>
            </div>
            <h1 className="text-[30px] sm:text-[40px] font-bold mb-3 leading-tight">
              Was bringt eine Solaranlage<br />auf Ihrem Dach?
            </h1>
            <p className="text-[15px] text-text-sec mb-8 leading-relaxed">
              Geben Sie Ihre Adresse ein. Wir zeigen Ihnen Ihr Dach aus der Luft, legen die Module darauf
              und rechnen aus, was Sie sparen. Ohne Anmeldung, ohne Verpflichtung.
            </p>

            <div className="relative mb-3">
              <Search size={17} strokeWidth={1.8} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
              <input type="text" value={suche} onChange={(e) => setSuche(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adresseSuchen()}
                placeholder="Strasse, Hausnummer und Ort"
                autoFocus
                className="glass-input w-full pl-12 pr-4 py-4 text-[15px]" />
              {treffer.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl overflow-hidden text-left"
                  style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.10)' }}>
                  {treffer.map((t) => (
                    <button key={t.label} type="button" onClick={() => trefferWaehlen(t)}
                      className="block w-full text-left px-4 py-3 text-[13px] text-text-sec hover:bg-white/5">
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => adresseSuchen()} disabled={laedt || suche.trim().length < 4}
              className="btn-primary w-full flex items-center justify-center gap-2 px-6 py-4 text-[15px] font-semibold disabled:opacity-40">
              {laedt ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} strokeWidth={2} />}
              Mein Dach anschauen
            </button>

            {meldung && <p className="text-[13px] mt-4" style={{ color: '#FCD34D' }}>{meldung}</p>}

            <div className="grid grid-cols-3 gap-3 mt-10">
              {[
                { icon: Home, text: 'Echte Dachdaten vom Bund' },
                { icon: Zap, text: 'Ertrag für Ihren Standort' },
                { icon: Shield, text: 'Keine Anmeldung nötig' },
              ].map((p) => (
                <div key={p.text} className="text-center">
                  <p.icon size={18} strokeWidth={1.6} className="text-amber mx-auto mb-2" />
                  <p className="text-[11px] text-text-dim leading-snug">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Dach ── */}
        {schritt === 'dach' && (
          <div>
            <h2 className="text-[24px] sm:text-[30px] font-bold mb-1.5">Das ist Ihr Dach</h2>
            <p className="text-[14px] text-text-sec mb-5">
              Wir haben die Fläche automatisch belegt. Mit dem Regler bestimmen Sie, wie viel davon
              genutzt wird – einzelne Module können Sie auch anklicken.
            </p>

            <div ref={kartenBox} onClick={kartenKlick}
              className="relative overflow-hidden rounded-2xl select-none mb-4"
              style={{ height: 460, border: '1px solid rgba(255,255,255,0.10)', background: '#111827', cursor: dachPolygon.length ? 'pointer' : 'default' }}>
              {kacheln.map((k) => (
                <img key={k.key} src={k.url} alt="" draggable={false}
                  style={{ position: 'absolute', left: k.links, top: k.oben, width: k.g, height: k.g, pointerEvents: 'none' }} />
              ))}
              <svg width={groesse.b} height={groesse.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {dachPolygon.length >= 3 && (
                  <polygon points={dachPolygon.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')}
                    fill="rgba(245,158,11,0.08)" stroke="#F59E0B" strokeWidth={2.5} />
                )}
                {module.map((m) => (
                  <polygon key={m.id}
                    points={m.ecken.map((p) => { const s = meterZuPixel(p); return `${s.x},${s.y}` }).join(' ')}
                    fill="#121F35" stroke="#8FA9C8" strokeWidth={0.9} />
                ))}
              </svg>
              {laedt && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.55)' }}>
                  <Loader2 size={26} className="text-amber animate-spin" />
                </div>
              )}
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-[9px]" style={{ background: 'rgba(6,8,12,0.7)', color: '#9CA3AF' }}>
                Luftbild swisstopo · Dachdaten BFE
              </div>
            </div>

            {gefundene.length > 1 && (
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
                  Ihr Haus hat mehrere Dachflächen – welche möchten Sie belegen?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gefundene.slice(0, 6).map((f) => (
                    <button key={f.id} type="button" onClick={() => dachWaehlen(f)}
                      className="px-3 py-2 rounded-lg text-[11px] font-semibold"
                      style={{
                        background: dachDaten?.id === f.id ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${dachDaten?.id === f.id ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                        color: dachDaten?.id === f.id ? '#F59E0B' : undefined,
                      }}>
                      {Math.round(f.flaecheM2)} m² · {azimutText(f.azimut)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dachPolygon.length >= 3 && (
              <>
                <div className="glass-card p-5 mb-4" style={{ borderRadius: 'var(--radius-lg)' }}>
                  <Regler label="Wie viel vom Dach möchten Sie belegen?" wert={belegungsgrad}
                    min={10} max={100} schrittweite={5} einheit="%"
                    onChange={(v) => { setBelegungsgrad(v); setEntfernt([]) }}
                    hinweis={`${module.length} Module ergeben ${kwp.toFixed(2)} kWp`} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
                  <Kachel wert={String(module.length)} label="Module" />
                  <Kachel wert={`${kwp.toFixed(1)}`} label="kWp Leistung" />
                  <Kachel wert={dachDaten ? azimutText(dachDaten.azimut) : '—'} label="Ausrichtung" farbe="#60A5FA" />
                  <Kachel wert={dachDaten ? `${Math.round(dachDaten.neigungGrad)}°` : '—'} label="Neigung" farbe="#60A5FA" />
                </div>
              </>
            )}

            {meldung && (
              <div className="px-4 py-3 rounded-xl text-[13px] mb-4"
                style={{ background: 'color-mix(in srgb, #F59E0B 10%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 28%, transparent)', color: '#FCD34D' }}>
                {meldung}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setSchritt('adresse')} className="btn-secondary flex items-center gap-2 px-5 py-3 text-[13px]">
                <ArrowLeft size={15} strokeWidth={2} /> Zurück
              </button>
              <button type="button" onClick={() => setSchritt('verbrauch')} disabled={!module.length}
                className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold disabled:opacity-40">
                Weiter <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* ── Verbrauch ── */}
        {schritt === 'verbrauch' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-[24px] sm:text-[30px] font-bold mb-1.5">Ihr Stromverbrauch</h2>
            <p className="text-[14px] text-text-sec mb-7">
              Je genauer, desto besser die Rechnung. Den Wert finden Sie auf Ihrer Stromrechnung –
              schätzen genügt aber auch.
            </p>

            <div className="glass-card p-6 mb-5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <Regler label="Jahresverbrauch" wert={input.verbrauchKwh} min={1500} max={25000} schrittweite={500}
                einheit="kWh" onChange={(v) => setInput({ ...input, verbrauchKwh: v })}
                hinweis="Ein Haushalt mit vier Personen liegt bei etwa 4500 kWh" />

              <Regler label="Strompreis" wert={input.strompreisRp} min={15} max={45} schrittweite={0.5}
                einheit="Rp./kWh" onChange={(v) => setInput({ ...input, strompreisRp: v })}
                hinweis="Schweizer Mittel 2026: rund 28 Rappen" />

              <Regler label="Batteriespeicher" wert={input.speicherKwh} min={0} max={20.7} schrittweite={6.9}
                einheit="kWh" onChange={(v) => setInput({ ...input, speicherKwh: v })}
                hinweis={input.speicherKwh === 0 ? 'Ohne Speicher – jederzeit nachrüstbar' : `${Math.round(input.speicherKwh / 6.9)} Batteriemodule`} />
            </div>

            <p className="text-[12px] uppercase tracking-wider text-text-dim font-semibold mb-2.5">
              Haben Sie das geplant oder schon?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-7">
              {[
                { an: input.geplantWaermepumpe, icon: Flame, text: 'Wärmepumpe', feld: 'geplantWaermepumpe' as const },
                { an: input.geplantEAuto, icon: Car, text: 'Elektroauto', feld: 'geplantEAuto' as const },
                { an: input.wallbox, icon: Battery, text: 'Wallbox', feld: 'wallbox' as const },
              ].map((o) => (
                <button key={o.text} type="button"
                  onClick={() => setInput({ ...input, [o.feld]: !o.an })}
                  className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={{
                    background: o.an ? 'color-mix(in srgb, #F59E0B 16%, transparent)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${o.an ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                    color: o.an ? '#F59E0B' : undefined,
                  }}>
                  <o.icon size={16} strokeWidth={1.8} />
                  {o.text}
                  {o.an && <Check size={14} strokeWidth={2.5} className="ml-auto" />}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setSchritt('dach')} className="btn-secondary flex items-center gap-2 px-5 py-3 text-[13px]">
                <ArrowLeft size={15} strokeWidth={2} /> Zurück
              </button>
              <button type="button" onClick={() => setSchritt('ergebnis')}
                className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold">
                Ergebnis anzeigen <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* ── Ergebnis ── */}
        {schritt === 'ergebnis' && (
          <div>
            <h2 className="text-[24px] sm:text-[32px] font-bold mb-1.5">Das bringt Ihre Anlage</h2>
            <p className="text-[14px] text-text-sec mb-6">
              {kwp.toFixed(1)} kWp mit {module.length} Modulen
              {input.speicherKwh > 0 && ` und ${input.speicherKwh} kWh Speicher`} auf Ihrem Dach.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
              <Kachel wert={chf(ergebnis.ersparnisProMonat)} label="Ersparnis pro Monat" farbe="#34D399" />
              <Kachel wert={`${Math.round(ergebnis.autarkiegrad * 100)} %`} label="Unabhängigkeit" farbe="#60A5FA" />
              <Kachel wert={ergebnis.amortisationJahre ? `${ergebnis.amortisationJahre} J.` : '—'} label="Bezahlt nach" />
              <Kachel wert={kwh(ergebnis.jahresertragKwh)} label="Strom pro Jahr" farbe="#A78BFA" />
            </div>

            {/* Stromkosten-Vergleich */}
            <div className="glass-card p-5 mb-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3 className="text-[14px] font-bold mb-4">Ihre Stromkosten über {config.betrachtungsJahre} Jahre</h3>
              {[
                { label: 'Ohne Solaranlage', wert: ergebnis.stromkostenOhneAnlage, farbe: '#F87171' },
                { label: 'Mit Ihrer Anlage', wert: ergebnis.stromkostenMitAnlage, farbe: '#34D399' },
              ].map((b) => (
                <div key={b.label} className="mb-3">
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-text-sec">{b.label}</span>
                    <span className="tabular-nums font-bold">{chf(b.wert)}</span>
                  </div>
                  <div className="h-7 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-lg" style={{
                      width: `${Math.max(6, (b.wert / Math.max(ergebnis.stromkostenOhneAnlage, 1)) * 100)}%`,
                      background: b.farbe,
                    }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between mt-4 px-4 py-3.5 rounded-xl"
                style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', border: '1px solid color-mix(in srgb, #34D399 30%, transparent)' }}>
                <span className="text-[13px] font-bold text-emerald">Das bleibt bei Ihnen</span>
                <span className="text-[22px] font-bold text-emerald tabular-nums">
                  {chf(ergebnis.stromkostenOhneAnlage - ergebnis.stromkostenMitAnlage)}
                </span>
              </div>
            </div>

            {/* Kosten */}
            <div className="glass-card p-5 mb-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3 className="text-[14px] font-bold mb-3">Was die Anlage kostet</h3>
              <dl className="space-y-2 text-[13px]">
                {[
                  ['Anlage schlüsselfertig inkl. MWST', chf(ergebnis.werklohn)],
                  ['− Förderung des Bundes', '− ' + chf(ergebnis.foerderung)],
                  ...(ergebnis.steuerabzug > 0 ? [['− erwartete Steuerersparnis', '− ' + chf(ergebnis.steuerabzug)]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-text-dim">{k}</dt>
                    <dd className="text-text-sec font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 pt-3 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <dt className="font-bold text-[14px]">Ihre effektiven Kosten</dt>
                  <dd className="text-amber font-bold text-[22px] tabular-nums">{chf(ergebnis.nettoInvestition)}</dd>
                </div>
              </dl>
              {wr && (
                <p className="text-[11px] text-text-dim mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  Enthalten: {module.length} × {KOMPONENTEN.modul.name}, Wechselrichter {wr.geraete[0].geraet.name},
                  Unterkonstruktion, Montage, Bewilligungen und Anmeldung – schlüsselfertig.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Leaf size={20} strokeWidth={1.6} className="text-emerald shrink-0" />
                <div>
                  <div className="text-[15px] font-bold tabular-nums">{ergebnis.co2EinsparungKgProJahr.toLocaleString('de-CH')} kg</div>
                  <div className="text-[11px] text-text-dim">weniger CO₂ pro Jahr</div>
                </div>
              </div>
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <TrendingUp size={20} strokeWidth={1.6} className="text-amber shrink-0" />
                <div>
                  <div className="text-[15px] font-bold tabular-nums">{chf(ergebnis.gesamtErsparnis)}</div>
                  <div className="text-[11px] text-text-dim">gespart über {config.betrachtungsJahre} Jahre</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl mb-6 flex gap-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Info size={15} strokeWidth={1.8} className="text-text-dim shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-dim leading-relaxed">
                Diese Rechnung beruht auf Luftbild, Dachkataster des Bundes und Ihren Angaben. Sie ist eine
                gute Näherung, aber kein verbindliches Angebot. Den Festpreis erhalten Sie nach der
                Vermessung Ihres Daches – kostenlos und unverbindlich.
              </p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setSchritt('verbrauch')} className="btn-secondary flex items-center gap-2 px-5 py-3 text-[13px]">
                <ArrowLeft size={15} strokeWidth={2} /> Anpassen
              </button>
              <button type="button" onClick={() => setSchritt('kontakt')}
                className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3.5 text-[14px] font-semibold">
                Unverbindliches Angebot anfordern <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* ── Kontakt ── */}
        {schritt === 'kontakt' && (
          <div className="max-w-xl mx-auto">
            <h2 className="text-[24px] sm:text-[30px] font-bold mb-1.5">Fast geschafft</h2>
            <p className="text-[14px] text-text-sec mb-6">
              Wir prüfen Ihre Auslegung, vermessen Ihr Dach und melden uns mit einem verbindlichen
              Angebot. Kostenlos und ohne Verpflichtung.
            </p>

            <div className="p-4 rounded-xl mb-6" style={{ background: 'color-mix(in srgb, #F59E0B 8%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)' }}>
              <div className="text-[12px] text-text-dim mb-1">Ihre Auslegung</div>
              <div className="text-[15px] font-bold">
                {kwp.toFixed(1)} kWp · {module.length} Module · {chf(ergebnis.ersparnisProMonat)} pro Monat gespart
              </div>
            </div>

            <form onSubmit={absenden} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required value={formular.firstName} onChange={(e) => setFormular({ ...formular, firstName: e.target.value })}
                  placeholder="Vorname" className="glass-input px-4 py-3 text-[14px]" />
                <input required value={formular.lastName} onChange={(e) => setFormular({ ...formular, lastName: e.target.value })}
                  placeholder="Nachname" className="glass-input px-4 py-3 text-[14px]" />
              </div>
              <input required type="email" value={formular.email} onChange={(e) => setFormular({ ...formular, email: e.target.value })}
                placeholder="E-Mail" className="glass-input w-full px-4 py-3 text-[14px]" />
              <input required type="tel" value={formular.phone} onChange={(e) => setFormular({ ...formular, phone: e.target.value })}
                placeholder="Telefon" className="glass-input w-full px-4 py-3 text-[14px]" />
              <input readOnly value={suche} className="glass-input w-full px-4 py-3 text-[14px] opacity-60" />
              <textarea rows={3} value={formular.bemerkung} onChange={(e) => setFormular({ ...formular, bemerkung: e.target.value })}
                placeholder="Haben Sie eine Frage oder einen Wunsch? (optional)"
                className="glass-input w-full px-4 py-3 text-[14px]" />

              {/* Honeypot – für Menschen unsichtbar */}
              <input type="text" value={formular.website} onChange={(e) => setFormular({ ...formular, website: e.target.value })}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

              {fehler && <p className="text-[13px]" style={{ color: '#F87171' }}>{fehler}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSchritt('ergebnis')} className="btn-secondary flex items-center gap-2 px-5 py-3 text-[13px]">
                  <ArrowLeft size={15} strokeWidth={2} /> Zurück
                </button>
                <button type="submit" disabled={sendet}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3.5 text-[14px] font-semibold disabled:opacity-40">
                  {sendet ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} strokeWidth={2} />}
                  Angebot anfordern
                </button>
              </div>

              <p className="text-[11px] text-text-dim leading-relaxed pt-2">
                Ihre Angaben verwenden wir ausschliesslich, um Ihnen ein Angebot zu erstellen. Wir geben
                sie nicht weiter. Sie können der Nutzung jederzeit widersprechen.
              </p>
            </form>
          </div>
        )}

        {/* ── Fertig ── */}
        {schritt === 'fertig' && (
          <div className="max-w-xl mx-auto text-center py-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'color-mix(in srgb, #34D399 16%, transparent)', border: '1px solid color-mix(in srgb, #34D399 40%, transparent)' }}>
              <Check size={30} strokeWidth={2.5} className="text-emerald" />
            </div>
            <h2 className="text-[26px] sm:text-[32px] font-bold mb-3">Vielen Dank!</h2>
            <p className="text-[15px] text-text-sec mb-8 leading-relaxed">
              Ihre Anfrage ist bei uns angekommen, mitsamt Ihrer Dachbelegung. Wir melden uns innerhalb
              von zwei Werktagen bei Ihnen – mit einem Angebot, das auf Ihr Dach passt.
            </p>
            <div className="p-5 rounded-2xl text-left" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-3">So geht es weiter</div>
              <ol className="text-[13px] text-text-sec space-y-2" style={{ paddingLeft: 18 }}>
                <li>Wir prüfen Ihre Auslegung und rechnen den Ertrag genau nach.</li>
                <li>Ein Berater ruft Sie an und klärt offene Fragen.</li>
                <li>Wir vermessen Ihr Dach mit der Drohne – kostenlos.</li>
                <li>Sie erhalten das verbindliche Festpreisangebot.</li>
              </ol>
            </div>
            <p className="text-[12px] text-text-dim mt-8">
              NEOSOLAR AG · Industriestrasse 28 · 9100 Herisau · T +41 71 544 91 00
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
