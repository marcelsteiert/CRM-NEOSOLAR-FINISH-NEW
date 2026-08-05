import { useState } from 'react'
import { Check, ShieldCheck, Snowflake, Sun } from 'lucide-react'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'
import type { CalculatorInput } from '../../../lib/pvCalculator'

const BILD = '/praesentation'

/**
 * Die Modulfolie mit Auswahl.
 *
 * Vorher stand hier nur das Standardmodul als Bild. Kunden fragen aber
 * regelmaessig nach der Optik und nach Hagel – jedes der drei Module
 * loest ein anderes Problem. Deshalb ist die Folie klickbar: sie wechselt
 * das Bild und aendert direkt die Rechnung und die Offerte.
 */
export function FolienModulwahl({
  input,
  onChange,
  preiseZeigen = true,
}: {
  input: CalculatorInput
  onChange: (p: Partial<CalculatorInput>) => void
  /** In der Kundenansicht bleiben die Preise vor der Anlagenplanung verdeckt */
  preiseZeigen?: boolean
}) {
  const aktiv = input.modulTypId ?? 'longi'
  const gewaehltesModul =
    KOMPONENTEN.modulTypen.find((m) => m.id === aktiv) ?? KOMPONENTEN.modulTypen[0]

  /**
   * Solange die Produktbilder der beiden AIKO fehlen, zeigen wir das
   * Standardbild. Ein gebrochenes Bild waere im Kundentermin peinlicher
   * als ein Symbolbild.
   */
  const [fehlendeBilder, setFehlendeBilder] = useState<string[]>([])
  const bildDatei = fehlendeBilder.includes(gewaehltesModul.bild)
    ? 'modul.png'
    : gewaehltesModul.bild

  const module =
    input.modulAnzahl && input.modulAnzahl > 0
      ? input.modulAnzahl
      : Math.max(1, Math.round((input.kwp * 1000) / 490))

  const eigenschaften = [
    { icon: ShieldCheck, text: '30 Jahre Garantie auf die Leistung' },
    { icon: Snowflake, text: 'Hagelklasse 3 – geprüft für Schweizer Wetter' },
    { icon: Sun, text: 'Sehr gutes Schwachlichtverhalten' },
  ]

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-6xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Ihre Solarmodule</p>
      <h2 className="text-[28px] sm:text-[33px] font-bold text-text mb-1.5 leading-tight">
        Drei Module – wir wählen das, was zu Ihrem Dach passt
      </h2>
      <p className="text-[13px] text-text-sec mb-6">
        Alle drei haben dieselben Garantien und dieselbe Prüfung. Der Unterschied liegt
        darin, wofür sie gebaut sind.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,32%)_minmax(0,1fr)] gap-7 items-center min-h-0">
        {/* Bild wechselt mit der Auswahl */}
        <div
          className="hidden lg:flex flex-col items-center justify-center p-6"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(245,158,11,0.13), rgba(255,255,255,0.03) 62%, transparent 78%)',
            borderRadius: 26,
          }}
        >
          <img
            key={bildDatei}
            src={`${BILD}/${bildDatei}`}
            alt={gewaehltesModul.name}
            onError={() =>
              setFehlendeBilder((v) =>
                v.includes(gewaehltesModul.bild) ? v : [...v, gewaehltesModul.bild]
              )
            }
            className="max-w-full object-contain"
            style={{ maxHeight: '34vh', filter: 'drop-shadow(0 22px 42px rgba(0,0,0,0.55))' }}
            loading="lazy"
          />
          <div className="text-[12px] font-semibold text-text mt-4 text-center leading-snug">
            {gewaehltesModul.name}
          </div>
          <div className="text-[11px] text-text-dim text-center">
            {gewaehltesModul.typ} · {gewaehltesModul.watt} Watt
          </div>
        </div>

        <div className="space-y-2 min-w-0">
          {KOMPONENTEN.modulTypen.map((m) => {
            const gewaehlt = aktiv === m.id
            const aufpreis = Math.round(m.aufpreisProModul * module)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ modulTypId: m.id, modulAufpreisProModul: m.aufpreisProModul })}
                className="w-full text-left p-4 rounded-2xl transition-all"
                style={{
                  background: gewaehlt
                    ? 'color-mix(in srgb, #F59E0B 11%, transparent)'
                    : 'rgba(255,255,255,0.035)',
                  border: `1px solid ${
                    gewaehlt
                      ? 'color-mix(in srgb, #F59E0B 42%, transparent)'
                      : 'rgba(255,255,255,0.07)'
                  }`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: gewaehlt ? '#F59E0B' : 'rgba(255,255,255,0.06)',
                      border: gewaehlt ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    {gewaehlt && <Check size={13} strokeWidth={3} className="text-[#06080C]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span
                        className="text-[15px] font-bold"
                        style={{ color: gewaehlt ? '#F59E0B' : undefined }}
                      >
                        {m.name}
                        {!m.standard && (
                          <span className="text-[11px] font-semibold text-text-dim ml-2">
                            Option
                          </span>
                        )}
                      </span>
                      {preiseZeigen && (
                        <span
                          className="text-[12px] tabular-nums font-semibold shrink-0"
                          style={{ color: aufpreis > 0 ? '#94A3B8' : '#34D399' }}
                        >
                          {aufpreis > 0
                            ? `+ CHF ${aufpreis.toLocaleString('de-CH')}`
                            : 'im Preis enthalten'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-text-dim mt-0.5">
                      {m.watt} Watt
                      {m.standard && ' · unsere Standardwahl'}
                    </div>
                    <div className="text-[12.5px] text-text-sec mt-1.5 leading-snug">
                      {m.beschreibung}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-2 px-1">
            {eigenschaften.map((e) => (
              <div key={e.text} className="flex items-center gap-1.5">
                <e.icon size={13} strokeWidth={1.9} className="text-emerald shrink-0" />
                <span className="text-[11px] text-text-dim">{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FolienModulwahl
