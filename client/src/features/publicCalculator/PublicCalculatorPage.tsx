import { useState, useEffect, useMemo } from 'react'
import {
  Sun, Battery, Car, Flame, Plug, Loader2, Check, AlertTriangle, ArrowRight, TrendingUp,
} from 'lucide-react'
import { berechne } from '../../lib/pvCalculator'
import type { CalculatorConfig, CalculatorInput, Ausrichtung, Dachtyp } from '../../lib/pvCalculator'
import {
  DEFAULT_CONFIG, DEFAULT_INPUT, AUSRICHTUNG_LABELS, DACHTYP_LABELS, KOMPONENTEN,
} from '../../lib/calculatorConfig'

/**
 * Oeffentlicher Solarrechner fuer die Homepage – ohne Login.
 * Holt Preise und Firmendaten von /public/calculator und legt am Ende
 * eine Richtofferten-Anfrage als Lead an.
 */

const API = import.meta.env.VITE_API_URL ?? '/api/v1'
const chf = (n: number) => "CHF " + Math.round(n).toLocaleString('de-CH')
const kwh = (n: number) => Math.round(n).toLocaleString('de-CH') + ' kWh'

interface Firma {
  name: string
  telefon: string
  email: string
  website: string
}

function Regler({
  label, wert, min, max, schritt, einheit, onChange, hinweis,
}: {
  label: string
  wert: number
  min: number
  max: number
  schritt: number
  einheit: string
  onChange: (v: number) => void
  hinweis?: string
}) {
  const anteil = ((wert - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">{label}</label>
        <span className="text-[17px] font-bold text-amber tabular-nums">
          {wert.toLocaleString('de-CH')} <span className="text-[12px] text-text-dim font-medium">{einheit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={schritt}
        value={wert}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          height: 6,
          borderRadius: 999,
          appearance: 'none',
          background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${anteil}%, rgba(255,255,255,0.10) ${anteil}%, rgba(255,255,255,0.10) 100%)`,
        }}
      />
      {hinweis && <p className="text-[10px] text-text-dim mt-1">{hinweis}</p>}
    </div>
  )
}

export default function PublicCalculatorPage() {
  const [config, setConfig] = useState<CalculatorConfig>(DEFAULT_CONFIG)
  const [firma, setFirma] = useState<Firma | null>(null)
  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT)
  const [formular, setFormular] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '', bemerkung: '', website: '',
  })
  const [senden, setSenden] = useState(false)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)

  useEffect(() => {
    fetch(`${API}/public/calculator/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Konfiguration nicht erreichbar'))))
      .then((j) => {
        if (j?.data?.pricing) setConfig({ ...DEFAULT_CONFIG, ...j.data.pricing })
        if (j?.data?.firma) setFirma(j.data.firma)
      })
      .catch(() => {
        /* Standardwerte genuegen, der Rechner bleibt bedienbar */
      })
  }, [])

  const ergebnis = useMemo(() => berechne(input, config), [input, config])
  const patch = (p: Partial<CalculatorInput>) => setInput((v) => ({ ...v, ...p }))
  const module = Math.round((input.kwp * 1000) / KOMPONENTEN.modul.watt)

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault()
    setMeldung(null)
    setSenden(true)
    try {
      const res = await fetch(`${API}/public/calculator/anfrage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formular,
          kwp: input.kwp,
          speicherKwh: input.speicherKwh,
          verbrauchKwh: input.verbrauchKwh,
          wallbox: input.wallbox,
          // Umsatzrelevanter Wert fuer den Lead: Rechnungsbetrag inkl. MWST
          geschaetzterPreis: ergebnis.werklohn,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error?.message ?? 'Anfrage konnte nicht gesendet werden')
      }
      setMeldung({
        art: 'ok',
        text: 'Vielen Dank! Wir melden uns innerhalb eines Arbeitstages mit Ihrer persönlichen Richtofferte.',
      })
      setFormular({ firstName: '', lastName: '', email: '', phone: '', address: '', bemerkung: '', website: '' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Unbekannter Fehler' })
    } finally {
      setSenden(false)
    }
  }

  return (
    <div style={{ background: '#06080C', minHeight: '100vh' }} className="text-text">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Kopf */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'color-mix(in srgb, #F59E0B 16%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 35%, transparent)',
            }}
          >
            <Sun size={28} strokeWidth={1.6} className="text-amber" />
          </div>
          <h1 className="text-[32px] sm:text-[42px] font-bold leading-tight mb-3">
            Was bringt Ihnen eine Solaranlage?
          </h1>
          <p className="text-[15px] text-text-sec max-w-2xl mx-auto">
            Verschieben Sie die Regler und sehen Sie sofort, was Sie sparen. Ohne Anmeldung,
            ohne Verpflichtung.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-5 mb-8">
          {/* Regler */}
          <div className="glass-card p-5 space-y-5" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h2 className="text-[13px] font-bold">Ihre Angaben</h2>

            <Regler
              label="Anlagengrösse"
              wert={input.kwp} min={4} max={40} schritt={0.5} einheit="kWp"
              onChange={(v) => patch({ kwp: v })}
              hinweis={`${module} Module à ${KOMPONENTEN.modul.watt} W`}
            />
            <Regler
              label="Ihr Stromverbrauch"
              wert={input.verbrauchKwh} min={2000} max={30000} schritt={500} einheit="kWh/Jahr"
              onChange={(v) => patch({ verbrauchKwh: v })}
              hinweis="Steht auf Ihrer Stromrechnung"
            />
            <Regler
              label="Batteriespeicher"
              wert={input.speicherKwh} min={0} max={27.6} schritt={6.9} einheit="kWh"
              onChange={(v) => patch({ speicherKwh: v })}
              hinweis={input.speicherKwh > 0 ? 'Mehr Strom abends selbst nutzen' : 'Ohne Speicher – später nachrüstbar'}
            />
            <Regler
              label="Ihr Strompreis"
              wert={input.strompreisRp} min={15} max={50} schritt={0.5} einheit="Rp./kWh"
              onChange={(v) => patch({ strompreisRp: v })}
              hinweis="Schweizer Mittel 2026: 27.7 Rp."
            />

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">
                Kommt in den nächsten Jahren dazu?
              </div>
              {[
                { key: 'geplantEAuto' as const, icon: Car, label: 'Elektroauto' },
                { key: 'geplantWaermepumpe' as const, icon: Flame, label: 'Wärmepumpe' },
                { key: 'wallbox' as const, icon: Battery, label: 'Wallbox' },
              ].map((f) => {
                const aktiv = Boolean(input[f.key])
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => patch({ [f.key]: !aktiv } as Partial<CalculatorInput>)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-full text-left transition-all"
                    style={{
                      background: aktiv ? 'color-mix(in srgb, #F59E0B 14%, transparent)' : 'rgba(255,255,255,0.035)',
                      border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <f.icon size={16} strokeWidth={1.8} className={aktiv ? 'text-amber' : 'text-text-dim'} />
                    <span className={`text-[12px] font-semibold ${aktiv ? 'text-text' : 'text-text-sec'}`}>
                      {f.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
                  Ausrichtung
                </label>
                <select
                  value={input.ausrichtung}
                  onChange={(e) => patch({ ausrichtung: e.target.value as Ausrichtung })}
                  className="glass-input w-full px-2.5 py-2 text-[12px]"
                >
                  {Object.entries(AUSRICHTUNG_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
                  Dachtyp
                </label>
                <select
                  value={input.dachtyp}
                  onChange={(e) => patch({ dachtyp: e.target.value as Dachtyp })}
                  className="glass-input w-full px-2.5 py-2 text-[12px]"
                >
                  {Object.entries(DACHTYP_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ergebnis */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Ersparnis pro Jahr', wert: chf(ergebnis.ersparnisJahr1), zusatz: `${chf(ergebnis.ersparnisProMonat)} pro Monat`, farbe: '#34D399' },
                { label: 'Amortisation', wert: ergebnis.amortisationJahre ? `${ergebnis.amortisationJahre} J.` : '—', zusatz: 'dann verdient sie', farbe: '#F59E0B' },
                { label: 'Unabhängigkeit', wert: `${Math.round(ergebnis.autarkiegrad * 100)} %`, zusatz: 'Strom selbst erzeugt', farbe: '#60A5FA' },
                { label: `Über ${config.betrachtungsJahre} Jahre`, wert: chf(ergebnis.gesamtErsparnis), zusatz: 'Gesamtersparnis', farbe: '#A78BFA' },
              ].map((k) => (
                <div
                  key={k.label}
                  className="p-4 rounded-2xl"
                  style={{
                    background: `color-mix(in srgb, ${k.farbe} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${k.farbe} 28%, transparent)`,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">{k.label}</div>
                  <div className="text-[26px] font-bold tabular-nums leading-tight" style={{ color: k.farbe }}>
                    {k.wert}
                  </div>
                  <div className="text-[11px] text-text-sec mt-0.5">{k.zusatz}</div>
                </div>
              ))}
            </div>

            <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} strokeWidth={1.8} className="text-amber" />
                <h3 className="text-[13px] font-bold">
                  Ihre Stromkosten über {config.betrachtungsJahre} Jahre
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="text-text-sec">Ohne Solaranlage</span>
                    <span className="font-bold text-red tabular-nums">{chf(ergebnis.stromkostenOhneAnlage)}</span>
                  </div>
                  <div className="h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full" style={{ width: '100%', background: 'color-mix(in srgb, #F87171 55%, transparent)' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="text-text-sec">Mit Solaranlage</span>
                    <span className="font-bold text-emerald tabular-nums">{chf(ergebnis.stromkostenMitAnlage)}</span>
                  </div>
                  <div className="h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${ergebnis.stromkostenOhneAnlage > 0 ? Math.max(2, (ergebnis.stromkostenMitAnlage / ergebnis.stromkostenOhneAnlage) * 100) : 0}%`,
                        background: 'color-mix(in srgb, #34D399 55%, transparent)',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <ArrowRight size={15} strokeWidth={2} className="text-emerald shrink-0" />
                <p className="text-[13px]">
                  Sie behalten{' '}
                  <b className="text-emerald">
                    {chf(ergebnis.stromkostenOhneAnlage - ergebnis.stromkostenMitAnlage)}
                  </b>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
                <h3 className="text-[13px] font-bold mb-3">Ihre Anlage</h3>
                <dl className="space-y-2 text-[12px]">
                  {[
                    ['Stromproduktion', `${kwh(ergebnis.jahresertragKwh)}/Jahr`],
                    ['davon selbst genutzt', kwh(ergebnis.eigenverbrauchKwh)],
                    ['ins Netz eingespeist', kwh(ergebnis.einspeisungKwh)],
                    ['CO₂-Einsparung', `${ergebnis.co2EinsparungKgProJahr.toLocaleString('de-CH')} kg/Jahr`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-text-dim">{k}</dt>
                      <dd className="font-semibold tabular-nums text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: 'color-mix(in srgb, #F59E0B 8%, transparent)',
                  border: '1px solid color-mix(in srgb, #F59E0B 30%, transparent)',
                }}
              >
                <h3 className="text-[13px] font-bold mb-3">Richtwert Investition</h3>
                <dl className="space-y-2 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-dim">Anlage schlüsselfertig inkl. MWST</dt>
                    <dd className="font-semibold tabular-nums">{chf(ergebnis.werklohn)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-dim">− Förderung Pronovo</dt>
                    <dd className="text-emerald font-semibold tabular-nums">− {chf(ergebnis.foerderung)}</dd>
                  </div>
                  {ergebnis.steuerabzug > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-dim">− erwartete Steuerersparnis</dt>
                      <dd className="text-emerald font-semibold tabular-nums">− {chf(ergebnis.steuerabzug)}</dd>
                    </div>
                  )}
                  <div
                    className="flex justify-between gap-3 pt-2 mt-1"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    <dt className="font-bold text-[13px]">Richtwert effektive Kosten</dt>
                    <dd className="text-amber font-bold text-[19px] tabular-nums">{chf(ergebnis.nettoInvestition)}</dd>
                  </div>
                </dl>
                <p className="text-[10px] text-text-dim mt-3">
                  Unverbindlicher Richtwert. Den Festpreis erhalten Sie nach der Dachvermessung.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Anfrage */}
        <div className="glass-card p-6 sm:p-8" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h2 className="text-[22px] font-bold mb-2">Persönliche Richtofferte anfordern</h2>
          <p className="text-[13px] text-text-sec mb-6">
            Wir prüfen Ihr Dach anhand von Geodaten und melden uns mit einer konkreten Offerte – kostenlos und
            unverbindlich.
          </p>

          {meldung && (
            <div
              className="flex items-start gap-2 px-4 py-3 mb-5 rounded-xl text-[13px]"
              style={{
                background: meldung.art === 'ok'
                  ? 'color-mix(in srgb, #34D399 12%, transparent)'
                  : 'color-mix(in srgb, #F87171 12%, transparent)',
                border: `1px solid ${meldung.art === 'ok'
                  ? 'color-mix(in srgb, #34D399 35%, transparent)'
                  : 'color-mix(in srgb, #F87171 35%, transparent)'}`,
              }}
            >
              {meldung.art === 'ok'
                ? <Check size={15} strokeWidth={2.5} className="text-emerald shrink-0 mt-0.5" />
                : <AlertTriangle size={15} strokeWidth={2.5} className="text-red shrink-0 mt-0.5" />}
              <span className={meldung.art === 'ok' ? 'text-emerald' : 'text-red'}>{meldung.text}</span>
            </div>
          )}

          <form onSubmit={absenden} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Honeypot: fuer Menschen unsichtbar */}
            <input
              type="text"
              name="website"
              value={formular.website}
              onChange={(e) => setFormular((f) => ({ ...f, website: e.target.value }))}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
            {[
              { key: 'firstName' as const, label: 'Vorname', typ: 'text', pflicht: true },
              { key: 'lastName' as const, label: 'Nachname', typ: 'text', pflicht: true },
              { key: 'email' as const, label: 'E-Mail', typ: 'email', pflicht: true },
              { key: 'phone' as const, label: 'Telefon', typ: 'tel', pflicht: true },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
                  {f.label} {f.pflicht && <span className="text-amber">*</span>}
                </label>
                <input
                  type={f.typ}
                  required={f.pflicht}
                  value={formular[f.key]}
                  onChange={(e) => setFormular((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="glass-input w-full px-3 py-2.5 text-[13px]"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
                Adresse des Objekts <span className="text-amber">*</span>
              </label>
              <input
                type="text"
                required
                value={formular.address}
                onChange={(e) => setFormular((v) => ({ ...v, address: e.target.value }))}
                placeholder="Strasse Nr., PLZ Ort"
                className="glass-input w-full px-3 py-2.5 text-[13px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
                Bemerkung
              </label>
              <textarea
                rows={3}
                value={formular.bemerkung}
                onChange={(e) => setFormular((v) => ({ ...v, bemerkung: e.target.value }))}
                placeholder="Gibt es etwas, das wir wissen sollten?"
                className="glass-input w-full px-3 py-2.5 text-[13px]"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={senden}
                className="btn-primary flex items-center gap-2 px-6 py-3 text-[13px] disabled:opacity-50"
              >
                {senden ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} strokeWidth={2} />}
                Richtofferte anfordern
              </button>
              <p className="text-[11px] text-text-dim">
                Ihre Daten verwenden wir ausschliesslich für diese Anfrage.
              </p>
            </div>
          </form>
        </div>

        {/* Fuss */}
        <div className="text-center mt-10 text-[12px] text-text-dim">
          {firma ? (
            <>
              <div className="font-semibold text-text-sec mb-1">{firma.name}</div>
              <div>
                {firma.telefon} · {firma.email} · {firma.website}
              </div>
            </>
          ) : (
            <div>NEOSOLAR AG · Dein Schweizer Solarpartner</div>
          )}
          <p className="mt-4 max-w-3xl mx-auto leading-relaxed">
            Alle Werte sind Richtwerte auf Basis Ihrer Angaben. Ertragsprognose für Schweizer Standorte,
            Eigenverbrauch und Autarkie rechnerisch geschätzt. Strompreisannahme nach ElCom-Haushaltstarifen
            mit 2 % Steigerung pro Jahr – keine Preisgarantie. Förderbeiträge nach Pronovo-Tarif 2026,
            verbindlich ist der Pronovo-Tarifrechner.
          </p>
        </div>
      </div>
    </div>
  )
}
