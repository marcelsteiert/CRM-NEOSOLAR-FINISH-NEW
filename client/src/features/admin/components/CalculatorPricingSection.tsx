import { useState, useEffect } from 'react'
import { Save, RotateCcw, Loader2, Check, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import {
  useCalculatorPricing,
  useUpdateCalculatorPricing,
  useResetCalculatorPricing,
} from '@/hooks/useCalculatorPricing'
import type { CalculatorConfig } from '@/lib/pvCalculator'

type Feld = {
  key: keyof CalculatorConfig
  label: string
  einheit: string
  schritt?: number
  hinweis?: string
}

const GRUPPEN: Array<{ titel: string; hinweis?: string; felder: Feld[] }> = [
  {
    titel: 'Preise',
    hinweis:
      'Startwerte abgeleitet aus 14 echten Kalkulationen (Ø Verkaufspreis CHF 32’830). Bitte gegen die aktuelle Einkaufslage prüfen.',
    felder: [
      { key: 'grundpreis', label: 'Grundpreis pro Anlage', einheit: 'CHF', schritt: 100, hinweis: 'Planung, Bewilligung, Inbetriebnahme' },
      { key: 'speicherPreisProKwh', label: 'Speicher pro kWh', einheit: 'CHF', schritt: 10 },
      { key: 'wallboxPreis', label: 'Wallbox', einheit: 'CHF', schritt: 50 },
      { key: 'geruestPreis', label: 'Gerüst', einheit: 'CHF', schritt: 50 },
      { key: 'steuerabzugProzent', label: 'Steuerabzug', einheit: '%', schritt: 1, hinweis: '0 = nicht ausweisen. Kantonal unterschiedlich.' },
    ],
  },
  {
    titel: 'Förderung (Pronovo Einmalvergütung)',
    hinweis: 'Stand 2026: ca. 360 CHF/kWp bis 30 kWp, darüber ca. 300. Verbindlich ist der Pronovo-Tarifrechner.',
    felder: [
      { key: 'eivGrundbeitrag', label: 'Grundbeitrag', einheit: 'CHF', schritt: 10 },
      { key: 'eivLeistungBis30', label: 'Leistungsbeitrag bis 30 kWp', einheit: 'CHF/kWp', schritt: 10 },
      { key: 'eivLeistungAb30', label: 'Leistungsbeitrag ab 30 kWp', einheit: 'CHF/kWp', schritt: 10 },
    ],
  },
  {
    titel: 'Ertrag und Technik',
    felder: [
      { key: 'spezifischerErtragBasis', label: 'Ertrag bei Süd / 30°', einheit: 'kWh/kWp', schritt: 10 },
      { key: 'degradationProJahr', label: 'Moduldegradation pro Jahr', einheit: 'Anteil', schritt: 0.001, hinweis: '0.005 = 0.5 %' },
      { key: 'speicherZyklenProJahr', label: 'Nutzbare Speicherzyklen', einheit: 'pro Jahr', schritt: 10 },
      { key: 'speicherWirkungsgrad', label: 'Speicher-Wirkungsgrad', einheit: 'Anteil', schritt: 0.01 },
      {
        key: 'maxAutarkiegrad',
        label: 'Maximale Autarkie',
        einheit: 'Anteil',
        schritt: 0.05,
        hinweis: '0.8 = 80 %. Verhindert unrealistische Versprechen – ohne Saisonspeicher sind 100 % nicht erreichbar.',
      },
    ],
  },
  {
    titel: 'Tarife und Wirtschaftlichkeit',
    hinweis: 'Strompreis-Vorgabe im Rechner: ElCom-Median H4 2026 = 27.7 Rp./kWh.',
    felder: [
      { key: 'einspeiseverguetungRp', label: 'Rückliefervergütung', einheit: 'Rp./kWh', schritt: 0.5 },
      { key: 'strompreisSteigerung', label: 'Strompreissteigerung pro Jahr', einheit: 'Anteil', schritt: 0.005, hinweis: '0.02 = 2 %' },
      { key: 'betriebskostenProJahr', label: 'Betriebskosten pro Jahr', einheit: 'CHF', schritt: 50, hinweis: 'Versicherung, Monitoring, Reinigung' },
      { key: 'betrachtungsJahre', label: 'Betrachtungszeitraum', einheit: 'Jahre', schritt: 1 },
      { key: 'kalkulationszinssatz', label: 'Kalkulationszinssatz', einheit: 'Anteil', schritt: 0.005, hinweis: 'Für Kapitalwert und Stromgestehungskosten' },
    ],
  },
  {
    titel: 'Mehrverbrauch geplanter Verbraucher',
    felder: [
      { key: 'mehrverbrauchWaermepumpe', label: 'Wärmepumpe', einheit: 'kWh/Jahr', schritt: 100 },
      { key: 'mehrverbrauchEAuto', label: 'Elektroauto', einheit: 'kWh/Jahr', schritt: 100 },
    ],
  },
]

export default function CalculatorPricingSection() {
  const { config, isLoading } = useCalculatorPricing()
  const speichern = useUpdateCalculatorPricing()
  const zuruecksetzen = useResetCalculatorPricing()

  const [form, setForm] = useState<CalculatorConfig>(config)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)

  useEffect(() => {
    setForm(config)
  }, [config])

  const setzeZahl = (key: keyof CalculatorConfig, wert: string) => {
    const zahl = wert === '' ? 0 : Number(wert)
    if (Number.isNaN(zahl)) return
    setForm((f) => ({ ...f, [key]: zahl }))
  }

  const setzeStaffel = (index: number, feld: 'bisKwp' | 'chfProKwp', wert: string) => {
    const zahl = Number(wert)
    if (Number.isNaN(zahl)) return
    setForm((f) => ({
      ...f,
      preisProKwpStaffel: f.preisProKwpStaffel.map((s, i) => (i === index ? { ...s, [feld]: zahl } : s)),
    }))
  }

  const staffelHinzufuegen = () =>
    setForm((f) => {
      const letzte = f.preisProKwpStaffel[f.preisProKwpStaffel.length - 1]
      return {
        ...f,
        preisProKwpStaffel: [
          ...f.preisProKwpStaffel,
          { bisKwp: (letzte?.bisKwp ?? 10) + 10, chfProKwp: letzte?.chfProKwp ?? 1000 },
        ],
      }
    })

  const staffelEntfernen = (index: number) =>
    setForm((f) => ({
      ...f,
      preisProKwpStaffel: f.preisProKwpStaffel.filter((_, i) => i !== index),
    }))

  const absenden = async () => {
    setMeldung(null)
    const grenzen = form.preisProKwpStaffel.map((s) => s.bisKwp)
    if (grenzen.some((g, i) => i > 0 && g <= grenzen[i - 1])) {
      setMeldung({ art: 'fehler', text: 'Die kWp-Staffel muss aufsteigend sein.' })
      return
    }
    try {
      await speichern.mutateAsync(form)
      setMeldung({ art: 'ok', text: 'Preise gespeichert. Der Rechner nutzt ab jetzt die neuen Werte.' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen' })
    }
  }

  const aufDefaults = async () => {
    setMeldung(null)
    try {
      await zuruecksetzen.mutateAsync()
      setMeldung({ art: 'ok', text: 'Auf die dokumentierten Startwerte zurückgesetzt.' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Zurücksetzen fehlgeschlagen' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-dim text-[13px]">
        <Loader2 size={15} className="animate-spin" />
        Preise werden geladen …
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[17px] font-bold text-text mb-1">Rechner-Preise</h2>
        <p className="text-[12px] text-text-dim">
          Grundlage für die Solarberatung und den Rechner auf der Homepage. Änderungen wirken sofort auf neue
          Berechnungen – bereits erstellte Offerten behalten ihre Werte, weil der Rechenstand in der Notiz des
          Angebots festgehalten wird.
        </p>
      </div>

      {meldung && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px]"
          style={{
            background:
              meldung.art === 'ok'
                ? 'color-mix(in srgb, #34D399 12%, transparent)'
                : 'color-mix(in srgb, #F87171 12%, transparent)',
            border: `1px solid ${
              meldung.art === 'ok'
                ? 'color-mix(in srgb, #34D399 35%, transparent)'
                : 'color-mix(in srgb, #F87171 35%, transparent)'
            }`,
          }}
        >
          {meldung.art === 'ok' ? (
            <Check size={14} strokeWidth={2.5} className="text-emerald" />
          ) : (
            <AlertTriangle size={14} strokeWidth={2.5} className="text-red" />
          )}
          <span className={meldung.art === 'ok' ? 'text-emerald' : 'text-red'}>{meldung.text}</span>
        </div>
      )}

      {/* kWp-Staffel */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-[13px] font-bold text-text mb-1">Preis pro kWp (gestaffelt)</h3>
        <p className="text-[11px] text-text-dim mb-4">
          Jede Stufe gilt bis zur angegebenen Grenze. Über der letzten Grenze gilt der letzte Preis weiter.
        </p>
        <div className="space-y-2">
          {form.preisProKwpStaffel.map((stufe, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-text-dim w-10 shrink-0">bis</span>
              <input
                type="number"
                value={stufe.bisKwp}
                onChange={(e) => setzeStaffel(i, 'bisKwp', e.target.value)}
                className="glass-input px-2.5 py-1.5 text-[12px] w-24 tabular-nums"
                step={1}
              />
              <span className="text-[11px] text-text-dim shrink-0">kWp →</span>
              <input
                type="number"
                value={stufe.chfProKwp}
                onChange={(e) => setzeStaffel(i, 'chfProKwp', e.target.value)}
                className="glass-input px-2.5 py-1.5 text-[12px] w-28 tabular-nums"
                step={10}
              />
              <span className="text-[11px] text-text-dim shrink-0">CHF/kWp</span>
              {form.preisProKwpStaffel.length > 1 && (
                <button
                  type="button"
                  onClick={() => staffelEntfernen(i)}
                  className="p-1.5 rounded-lg text-text-dim hover:text-red transition-colors"
                  title="Stufe entfernen"
                >
                  <Trash2 size={14} strokeWidth={1.8} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={staffelHinzufuegen}
          className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px] mt-3"
        >
          <Plus size={13} strokeWidth={2} />
          Stufe hinzufügen
        </button>
      </div>

      {/* Dachtyp-Zuschläge */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-[13px] font-bold text-text mb-4">Zuschlag je Dachtyp (CHF pro kWp)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(form.dachtypZuschlagProKwp) as Array<keyof typeof form.dachtypZuschlagProKwp>).map((typ) => (
            <div key={typ}>
              <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">
                {typ}
              </label>
              <input
                type="number"
                value={form.dachtypZuschlagProKwp[typ]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dachtypZuschlagProKwp: { ...f.dachtypZuschlagProKwp, [typ]: Number(e.target.value) || 0 },
                  }))
                }
                className="glass-input w-full px-2.5 py-1.5 text-[12px] tabular-nums"
                step={10}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Zahlenfelder */}
      {GRUPPEN.map((gruppe) => (
        <div key={gruppe.titel} className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-[13px] font-bold text-text mb-1">{gruppe.titel}</h3>
          {gruppe.hinweis && <p className="text-[11px] text-text-dim mb-4">{gruppe.hinweis}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gruppe.felder.map((feld) => (
              <div key={String(feld.key)}>
                <label className="text-[11px] text-text-sec font-semibold block mb-1">{feld.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={String(form[feld.key] ?? '')}
                    onChange={(e) => setzeZahl(feld.key, e.target.value)}
                    className="glass-input flex-1 px-2.5 py-1.5 text-[12px] tabular-nums"
                    step={feld.schritt ?? 1}
                  />
                  <span className="text-[10px] text-text-dim shrink-0 w-16">{feld.einheit}</span>
                </div>
                {feld.hinweis && <p className="text-[10px] text-text-dim mt-1">{feld.hinweis}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={absenden}
          disabled={speichern.isPending}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-[12px] disabled:opacity-50"
        >
          {speichern.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
          Speichern
        </button>
        <button
          type="button"
          onClick={aufDefaults}
          disabled={zuruecksetzen.isPending}
          className="btn-secondary flex items-center gap-2 px-4 py-2 text-[12px] disabled:opacity-50"
        >
          {zuruecksetzen.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RotateCcw size={14} strokeWidth={2} />
          )}
          Auf Startwerte zurücksetzen
        </button>
      </div>
    </div>
  )
}
