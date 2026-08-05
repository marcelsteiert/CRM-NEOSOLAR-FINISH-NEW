import { Plane, Wrench, Sparkles, PhoneCall, FileText, Star, Tag, Check } from 'lucide-react'
import type { CalculatorInput, CalculatorResult } from '../../../lib/pvCalculator'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

/**
 * Das NEOSOLAR Zufriedenheitspaket.
 * Leistungen und Kennzahlen stammen wörtlich aus der aktuellen
 * NEOSOLAR-Offerte (Stand 2026) – nicht geschätzt.
 */
export function FolienZufriedenheitspaket() {
  const leistungen = [
    {
      icon: Plane,
      farbe: '#F59E0B',
      titel: 'Thermografie-Drohnenaufnahme',
      text: 'Direkt nach der Inbetriebnahme erfassen wir Ihren Dachzustand mit Wärmebildtechnik und erkennen kritische Punkte frühzeitig.',
    },
    {
      icon: Wrench,
      farbe: '#60A5FA',
      titel: '5 Jahre Wartung und Service',
      text: 'Jährliche Inspektionen, permanente Überwachung, kleine Reparaturen und garantierter Störungsdienst – alles inklusive.',
    },
    {
      icon: Sparkles,
      farbe: '#34D399',
      titel: 'Reinigung nach 3 Jahren',
      text: 'Professionelle Modulreinigung, damit Ihr Ertrag langfristig erhalten bleibt.',
    },
    {
      icon: PhoneCall,
      farbe: '#A78BFA',
      titel: '24/7 Störungsservice',
      text: 'Bei Defekten sind wir schnell vor Ort – mit klaren Reaktionszeiten und transparentem Vorgehen.',
    },
    {
      icon: FileText,
      farbe: '#FBBF24',
      titel: 'Bericht und Dokumentation',
      text: 'Nach jeder Inspektion erhalten Sie einen verständlichen Report mit Bildern und Empfehlungen.',
    },
  ]

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Das NEOSOLAR Paket</p>
      <h2 className="text-[28px] sm:text-[32px] font-bold text-text mb-2">
        Zufriedenheitspaket – bei jeder neuen Anlage dabei
      </h2>

      {/* Der Wert soll sichtbar sein. Was nichts kostet, wirkt schnell,
          als wäre es nichts wert – deshalb der durchgestrichene Preis. */}
      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <span
          className="text-[26px] font-bold tabular-nums"
          style={{ color: '#6B7280', textDecoration: 'line-through', textDecorationThickness: 2 }}
        >
          CHF 2'400
        </span>
        <span className="text-[26px] font-bold text-emerald">für Sie kostenlos</span>
      </div>
      <p className="text-[14px] text-text-sec mb-7">
        Fünf Jahre Wartung, Überwachung und Service. Bei anderen ein Abonnement, bei uns
        Bestandteil jeder Anlage – <b className="text-text">Ihre Sicherheit hat keinen Preis.</b>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {leistungen.map((l) => (
          <div
            key={l.titel}
            className="p-4 rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${l.farbe} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${l.farbe} 26%, transparent)`,
            }}
          >
            <l.icon size={20} strokeWidth={1.8} style={{ color: l.farbe }} className="mb-2.5" />
            <div className="text-[13px] font-bold text-text mb-1.5 leading-snug">{l.titel}</div>
            <div className="text-[11px] text-text-dim leading-snug">{l.text}</div>
          </div>
        ))}

        {/* Bewertungen – echte Zahlen aus der Offerte */}
        <div
          className="p-4 rounded-2xl flex flex-col justify-center"
          style={{
            background: 'color-mix(in srgb, #F59E0B 14%, transparent)',
            border: '1px solid color-mix(in srgb, #F59E0B 34%, transparent)',
          }}
        >
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={14} strokeWidth={0} fill="#F59E0B" />
            ))}
            <span className="text-[15px] font-bold text-amber ml-1.5">5.0</span>
          </div>
          <div className="text-[12px] text-text-sec mb-1">aus 20 Google-Bewertungen</div>
          <div className="text-[22px] font-bold text-amber leading-none">227+</div>
          <div className="text-[11px] text-text-sec">zufriedene Kunden</div>
        </div>
      </div>

      <div
        className="p-4 rounded-2xl text-[12px] text-text-sec"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        Ausgenommen sind Sonderfälle und Materialkosten, die über die üblichen Grenzen hinausgehen.
      </div>
    </div>
  )
}

/**
 * Aktionsfolie. Prozentsatz und Titel kommen aus der Konfiguration, damit
 * keine abgelaufene Aktion fest im Code steht – der Verkaeufer entscheidet
 * im Termin, ob und mit welchem Rabatt sie gezeigt wird.
 */
export function FolienAktion({
  input,
  ergebnis,
  onChange,
}: {
  input: CalculatorInput
  ergebnis: CalculatorResult
  onChange: (patch: Partial<CalculatorInput>) => void
}) {
  const aktiv = (input.rabattProzent ?? 0) > 0

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2.5 mb-2">
        <Tag size={20} strokeWidth={1.8} className="text-amber" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber">Aktion</p>
      </div>
      <h2 className="text-[28px] sm:text-[32px] font-bold text-text mb-2">
        {aktiv ? `${input.rabattProzent} % Rabatt für Sie` : 'Aktuelle Aktion'}
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        {aktiv
          ? 'Der Rabatt ist in Ihrem Preis bereits enthalten und steht so auch auf der Offerte.'
          : 'Aktuell ist keine Aktion hinterlegt. Der Verkäufer kann hier eine aktivieren.'}
      </p>

      {/* Steuerung – bewusst sichtbar, damit im Termin nichts Falsches steht */}
      <div
        className="p-5 rounded-2xl mb-5"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
              Bezeichnung der Aktion
            </label>
            <input
              type="text"
              value={input.rabattTitel ?? ''}
              onChange={(e) => onChange({ rabattTitel: e.target.value })}
              placeholder="z.B. Ferien-Aktion, gültig bis 31.08."
              className="glass-input w-full px-3 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
              Rabatt
            </label>
            <div className="flex items-center gap-1.5">
              {[0, 5, 10, 15].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ rabattProzent: p })}
                  className="px-3 py-2 rounded-xl text-[12px] font-bold tabular-nums transition-all"
                  style={{
                    background:
                      (input.rabattProzent ?? 0) === p
                        ? 'color-mix(in srgb, #F59E0B 20%, transparent)'
                        : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${(input.rabattProzent ?? 0) === p ? 'color-mix(in srgb, #F59E0B 48%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                    color: (input.rabattProzent ?? 0) === p ? '#F59E0B' : undefined,
                  }}
                >
                  {p === 0 ? 'keine' : `${p} %`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {aktiv && (
        <div
          className="p-6 rounded-2xl"
          style={{
            background: 'color-mix(in srgb, #34D399 12%, transparent)',
            border: '1px solid color-mix(in srgb, #34D399 32%, transparent)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                {input.rabattTitel?.trim() || 'Aktionsrabatt'}
              </div>
              <div className="text-[13px] text-text-sec">
                Sie sparen gegenüber dem regulären Preis
              </div>
            </div>
            <div className="text-[36px] font-bold text-emerald tabular-nums leading-none">
              − {chf(ergebnis.rabatt)}
            </div>
          </div>
          <div
            className="flex items-center gap-2 mt-4 pt-3.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
          >
            <Check size={15} strokeWidth={2.5} className="text-emerald shrink-0" />
            <span className="text-[13px] text-text">
              Rechnungsbetrag mit Aktion: <b className="text-emerald">{chf(ergebnis.werklohn)}</b> inkl. MWST
              {' '}· effektiv <b className="text-emerald">{chf(ergebnis.nettoInvestition)}</b>
            </span>
          </div>
        </div>
      )}

      <p className="text-[10px] text-text-dim mt-5">
        Aktionen sind zeitlich befristet. Bitte nur eine Aktion zeigen, die zum Zeitpunkt des Gesprächs
        tatsächlich gilt – auf der Offerte erscheint sie mit Bezeichnung und Betrag.
      </p>
    </div>
  )
}
