import { Check } from 'lucide-react'

export interface Beduerfnisse {
  motivation: string[]
  wichtigkeit: Record<string, number>
  zeitraum: string
  budget: string
  finanzierung: boolean
  vergleichsofferten: boolean
  entscheider: string
  notizen: string
}

export const LEERE_BEDUERFNISSE: Beduerfnisse = {
  motivation: [],
  wichtigkeit: {},
  zeitraum: '',
  budget: '',
  finanzierung: false,
  vergleichsofferten: false,
  entscheider: '',
  notizen: '',
}

const MOTIVATIONEN = [
  'Stromkosten senken',
  'Unabhängiger vom Stromnetz werden',
  'Nachhaltigkeit',
  'Wertsteigerung der Liegenschaft',
  'Vorbereitung auf Wärmepumpe',
  'Vorbereitung auf Elektroauto',
  'Notstrom bei Ausfall',
  'Schutz vor Strompreissteigerung',
]

const WICHTIG = ['Preis', 'Qualität der Komponenten', 'Schnelle Umsetzung', 'Persönliche Betreuung', 'Garantien']

const ZEITRAEUME = ['So schnell wie möglich', 'In 3 Monaten', 'In 6 Monaten', 'Dieses Jahr', 'Nächstes Jahr', 'Noch offen']

const BUDGETS = ['bis 20’000', '20’000 – 35’000', '35’000 – 50’000', 'über 50’000', 'noch offen']

interface Props {
  werte: Beduerfnisse
  onChange: (patch: Partial<Beduerfnisse>) => void
}

export default function BeduerfnisSchritt({ werte, onChange }: Props) {
  const toggleMotivation = (m: string) =>
    onChange({
      motivation: werte.motivation.includes(m)
        ? werte.motivation.filter((x) => x !== m)
        : [...werte.motivation, m],
    })

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full">
      <h2 className="text-[30px] font-bold text-text mb-2">Was ist Ihnen wichtig?</h2>
      <p className="text-[14px] text-text-sec mb-7">
        Damit wir die Anlage auf Ihre Ziele auslegen – nicht auf einen Standard.
      </p>

      <div className="space-y-7">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-3">
            Warum möchten Sie eine Solaranlage? (Mehrfachauswahl)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MOTIVATIONEN.map((m) => {
              const aktiv = werte.motivation.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMotivation(m)}
                  className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: aktiv ? 'color-mix(in srgb, #F59E0B 14%, transparent)' : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                    style={{
                      background: aktiv ? '#F59E0B' : 'transparent',
                      border: aktiv ? 'none' : '1px solid rgba(255,255,255,0.20)',
                    }}
                  >
                    {aktiv && <Check size={11} strokeWidth={3} className="text-black" />}
                  </div>
                  <span className={`text-[13px] ${aktiv ? 'text-text font-semibold' : 'text-text-sec'}`}>{m}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-3">
            Wie wichtig ist Ihnen …? (1 = unwichtig, 5 = sehr wichtig)
          </div>
          <div className="space-y-2.5">
            {WICHTIG.map((w) => (
              <div key={w} className="flex items-center gap-3">
                <span className="text-[13px] text-text-sec w-52 shrink-0">{w}</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const aktiv = (werte.wichtigkeit[w] ?? 0) >= n
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onChange({ wichtigkeit: { ...werte.wichtigkeit, [w]: n } })}
                        className="w-8 h-8 rounded-lg text-[12px] font-bold transition-all duration-150"
                        style={{
                          background: aktiv ? 'color-mix(in srgb, #F59E0B 22%, transparent)' : 'rgba(255,255,255,0.035)',
                          border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                          color: aktiv ? '#F59E0B' : 'var(--text-dim, #6B7280)',
                        }}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
              Wann soll die Anlage realisiert werden?
            </div>
            <select
              value={werte.zeitraum}
              onChange={(e) => onChange({ zeitraum: e.target.value })}
              className="glass-input w-full px-3 py-2.5 text-[13px]"
            >
              <option value="">bitte wählen</option>
              {ZEITRAEUME.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
              Vorgesehene Investitionshöhe (CHF)
            </div>
            <select
              value={werte.budget}
              onChange={(e) => onChange({ budget: e.target.value })}
              className="glass-input w-full px-3 py-2.5 text-[13px]"
            >
              <option value="">bitte wählen</option>
              {BUDGETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'finanzierung' as const, label: 'Finanzierung gewünscht' },
            { key: 'vergleichsofferten' as const, label: 'Vergleichsofferten liegen vor' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onChange({ [f.key]: !werte[f.key] } as Partial<Beduerfnisse>)}
              className="flex items-center gap-2.5 p-3 rounded-xl text-left"
              style={{
                background: werte[f.key] ? 'color-mix(in srgb, #F59E0B 14%, transparent)' : 'rgba(255,255,255,0.035)',
                border: `1px solid ${werte[f.key] ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{
                  background: werte[f.key] ? '#F59E0B' : 'transparent',
                  border: werte[f.key] ? 'none' : '1px solid rgba(255,255,255,0.20)',
                }}
              >
                {werte[f.key] && <Check size={11} strokeWidth={3} className="text-black" />}
              </div>
              <span className={`text-[13px] ${werte[f.key] ? 'text-text font-semibold' : 'text-text-sec'}`}>
                {f.label}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
              Wer entscheidet über den Auftrag?
            </div>
            <input
              type="text"
              value={werte.entscheider}
              onChange={(e) => onChange({ entscheider: e.target.value })}
              placeholder="z.B. gemeinsam mit Partnerin"
              className="glass-input w-full px-3 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
              Notizen aus dem Gespräch
            </div>
            <input
              type="text"
              value={werte.notizen}
              onChange={(e) => onChange({ notizen: e.target.value })}
              placeholder="Stichworte"
              className="glass-input w-full px-3 py-2.5 text-[13px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
