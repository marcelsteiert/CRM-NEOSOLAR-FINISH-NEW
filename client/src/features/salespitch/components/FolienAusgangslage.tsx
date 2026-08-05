import { Car, Flame, Zap, TrendingUp, Info } from 'lucide-react'
import type { CalculatorInput, CalculatorConfig } from '../../../lib/pvCalculator'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

/**
 * Die Ausgangslage – und zwar zum Anfassen.
 *
 * Bisher stand hier eine feste Zusammenfassung. Jetzt trägt der Verkäufer
 * die echten Zahlen des Kunden gleich hier ein: Verbrauch, Strompreis und
 * was demnächst dazukommt. Ab dieser Folie rechnet die gesamte
 * Präsentation mit diesen Werten – es gibt keine zweite Stelle, an der
 * man sie nachtragen müsste.
 */
export function FolienAusgangslage({
  kunde,
  input,
  config,
  onChange,
}: {
  kunde?: string
  input: CalculatorInput
  config: CalculatorConfig
  onChange: (p: Partial<CalculatorInput>) => void
}) {
  const mehrverbrauch =
    (input.geplantWaermepumpe ? config.mehrverbrauchWaermepumpe : 0) +
    (input.geplantEAuto ? config.mehrverbrauchEAuto : 0)
  const kuenftig = input.verbrauchKwh + mehrverbrauch
  const heuteJahr = (input.verbrauchKwh * input.strompreisRp) / 100
  const kuenftigJahr = (kuenftig * input.strompreisRp) / 100

  const Regler = ({
    label,
    wert,
    min,
    max,
    schritt,
    einheit,
    nachkomma = 0,
    onWert,
    hinweis,
  }: {
    label: string
    wert: number
    min: number
    max: number
    schritt: number
    einheit: string
    nachkomma?: number
    onWert: (v: number) => void
    hinweis?: string
  }) => (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label className="text-[12px] uppercase tracking-wider text-text-dim font-semibold">{label}</label>
        <span
          className="text-[22px] font-bold text-amber tabular-nums shrink-0 text-right"
          style={{ minWidth: 140 }}
        >
          {wert.toLocaleString('de-CH', { minimumFractionDigits: nachkomma, maximumFractionDigits: nachkomma })}{' '}
          <span className="text-[13px] text-text-dim font-medium">{einheit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={schritt}
        value={wert}
        onChange={(e) => onWert(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ height: 6, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }}
      />
      {hinweis && <p className="text-[11px] text-text-dim mt-1.5">{hinweis}</p>}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Ihre Ausgangslage</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        {kunde ? `${kunde}, wo stehen Sie heute?` : 'Wo stehen Sie heute?'}
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Diese drei Angaben bestimmen alles Weitere. Je genauer sie stimmen, desto belastbarer die
        Rechnung – ändern lassen sie sich jederzeit.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="glass-card p-6 space-y-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <Regler
            label="Stromverbrauch heute"
            wert={input.verbrauchKwh}
            min={1500}
            max={30000}
            schritt={100}
            einheit="kWh/Jahr"
            onWert={(v) => onChange({ verbrauchKwh: v })}
            hinweis="Steht auf der Jahresabrechnung. Vier Personen im Einfamilienhaus liegen bei etwa 4500 kWh."
          />

          <Regler
            label="Was Sie pro Kilowattstunde zahlen"
            wert={input.strompreisRp}
            min={15}
            max={50}
            schritt={0.5}
            nachkomma={1}
            einheit="Rp."
            onWert={(v) => onChange({ strompreisRp: v })}
            hinweis={`Schweizer Median 2026: 27.7 Rp. Erwartete Steigerung ${(config.strompreisSteigerung * 100).toFixed(1)} % pro Jahr.`}
          />

          <div>
            <div className="text-[12px] uppercase tracking-wider text-text-dim font-semibold mb-2.5">
              Was kommt in den nächsten Jahren dazu?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  an: input.geplantEAuto,
                  icon: Car,
                  titel: 'Elektroauto',
                  zusatz: `+ ${config.mehrverbrauchEAuto.toLocaleString('de-CH')} kWh`,
                  feld: 'geplantEAuto' as const,
                },
                {
                  an: input.geplantWaermepumpe,
                  icon: Flame,
                  titel: 'Wärmepumpe',
                  zusatz: `+ ${config.mehrverbrauchWaermepumpe.toLocaleString('de-CH')} kWh`,
                  feld: 'geplantWaermepumpe' as const,
                },
              ].map((o) => (
                <button
                  key={o.titel}
                  type="button"
                  onClick={() => onChange({ [o.feld]: !o.an })}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                  style={{
                    background: o.an ? 'color-mix(in srgb, #F59E0B 14%, transparent)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${o.an ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <o.icon size={19} strokeWidth={1.7} style={{ color: o.an ? '#F59E0B' : '#6B7280' }} />
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: o.an ? '#F59E0B' : undefined }}>
                      {o.titel}
                    </div>
                    <div className="text-[11px] text-text-dim">{o.zusatz} pro Jahr</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Was daraus folgt */}
        <div className="space-y-3">
          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'color-mix(in srgb, #F87171 8%, transparent)',
              border: '1px solid color-mix(in srgb, #F87171 25%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} strokeWidth={1.8} style={{ color: '#F87171' }} />
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#F87171' }}>
                Ihre Stromrechnung
              </span>
            </div>
            <div className="mb-3">
              <div className="text-[11px] text-text-dim mb-0.5">heute</div>
              <div className="text-[24px] font-bold tabular-nums leading-none text-text">
                {chf(heuteJahr)}
                <span className="text-[12px] text-text-dim font-medium ml-1.5">im Jahr</span>
              </div>
            </div>
            {mehrverbrauch > 0 && (
              <div className="pt-3" style={{ borderTop: '1px solid rgba(248,113,113,0.2)' }}>
                <div className="text-[11px] text-text-dim mb-0.5">
                  mit {input.geplantEAuto && input.geplantWaermepumpe ? 'Auto und Wärmepumpe' : input.geplantEAuto ? 'Elektroauto' : 'Wärmepumpe'}
                </div>
                <div className="text-[24px] font-bold tabular-nums leading-none" style={{ color: '#F87171' }}>
                  {chf(kuenftigJahr)}
                  <span className="text-[12px] text-text-dim font-medium ml-1.5">im Jahr</span>
                </div>
                <div className="text-[11px] mt-1.5" style={{ color: '#F87171' }}>
                  + {chf(kuenftigJahr - heuteJahr)} jedes Jahr, beim heutigen Preis
                </div>
              </div>
            )}
          </div>

          <div
            className="p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} strokeWidth={1.8} className="text-text-dim" />
              <span className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">
                Womit wir rechnen
              </span>
            </div>
            <dl className="space-y-1.5 text-[12px]">
              {[
                ['Verbrauch künftig', `${kuenftig.toLocaleString('de-CH')} kWh`],
                ['Strompreis heute', `${input.strompreisRp} Rp./kWh`],
                ['Steigerung pro Jahr', `${(config.strompreisSteigerung * 100).toFixed(1)} %`],
                ['Betrachtung', `${config.betrachtungsJahre} Jahre`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-text-dim">{k}</dt>
                  <dd className="text-text-sec font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex items-start gap-2 px-1">
            <Info size={12} strokeWidth={1.8} className="text-text-dim shrink-0 mt-0.5" />
            <p className="text-[10px] text-text-dim leading-relaxed">
              Ab hier rechnet die ganze Beratung mit diesen Werten – bis zur Offerte.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
