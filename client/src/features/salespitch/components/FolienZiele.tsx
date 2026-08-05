import { useState } from 'react'
import {
  ShieldCheck, PiggyBank, Leaf, Home, BatteryCharging, Car, Flame,
  TrendingUp, Clock, Check,
} from 'lucide-react'

/**
 * Was der Kunde eigentlich will.
 *
 * Diese Folie hat in der Beratung gefehlt: Bevor man rechnet, sollte man
 * wissen, worauf es dem Gegenüber ankommt. Wer die Familie absichern will,
 * hört andere Argumente als jemand, der eine Rendite sucht.
 *
 * Die Auswahl steuert nichts am Rechner – sie steuert das Gespräch. Der
 * Verkäufer sieht, welche Folien er betonen muss, und in der Offerte
 * erscheint sie unter "Was Ihnen wichtig ist".
 */

export interface Ziele {
  motive: string[]
  zeitraum: string | null
  wichtigstes: string | null
}

export const LEERE_ZIELE: Ziele = { motive: [], zeitraum: null, wichtigstes: null }

const MOTIVE = [
  {
    id: 'unabhaengig',
    icon: ShieldCheck,
    farbe: '#34D399',
    titel: 'Unabhängig werden',
    text: 'Weniger abhängig von Strompreisen und politischen Entscheiden',
  },
  {
    id: 'sparen',
    icon: PiggyBank,
    farbe: '#F59E0B',
    titel: 'Kosten senken',
    text: 'Die Stromrechnung soll dauerhaft kleiner werden',
  },
  {
    id: 'vorsorge',
    icon: Clock,
    farbe: '#60A5FA',
    titel: 'Für später vorsorgen',
    text: 'Im Ruhestand tiefere Fixkosten haben',
  },
  {
    id: 'wert',
    icon: Home,
    farbe: '#A78BFA',
    titel: 'Immobilie aufwerten',
    text: 'Das Haus soll an Wert gewinnen',
  },
  {
    id: 'umwelt',
    icon: Leaf,
    farbe: '#22D3EE',
    titel: 'Umwelt schonen',
    text: 'Eigener sauberer Strom statt Netzmix',
  },
  {
    id: 'rendite',
    icon: TrendingUp,
    farbe: '#FBBF24',
    titel: 'Geld anlegen',
    text: 'Eine Investition, die sich rechnet',
  },
]

const VORHABEN = [
  { id: 'eauto', icon: Car, titel: 'Elektroauto' },
  { id: 'wp', icon: Flame, titel: 'Wärmepumpe' },
  { id: 'speicher', icon: BatteryCharging, titel: 'Batteriespeicher' },
  { id: 'sanierung', icon: Home, titel: 'Sanierung geplant' },
]

const ZEITRAEUME = ['So bald wie möglich', 'In den nächsten 3 Monaten', 'Dieses Jahr', 'Nächstes Jahr', 'Noch offen']

export function FolienZiele({
  ziele,
  onChange,
}: {
  ziele: Ziele
  onChange: (z: Ziele) => void
}) {
  const [offen, setOffen] = useState<string | null>(null)

  function motivUmschalten(id: string) {
    const drin = ziele.motive.includes(id)
    onChange({
      ...ziele,
      motive: drin ? ziele.motive.filter((m) => m !== id) : [...ziele.motive, id],
      // Das erste gewählte Motiv gilt als das wichtigste
      wichtigstes: drin && ziele.wichtigstes === id ? null : (ziele.wichtigstes ?? id),
    })
  }

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Ihre Ziele</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Was ist Ihnen am wichtigsten?
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Damit wir über das reden, worauf es Ihnen ankommt – und nicht über das, was uns wichtig
        erscheint. Mehrfachauswahl ist ausdrücklich erwünscht.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {MOTIVE.map((m) => {
          const an = ziele.motive.includes(m.id)
          const erstes = ziele.wichtigstes === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => motivUmschalten(m.id)}
              onMouseEnter={() => setOffen(m.id)}
              onMouseLeave={() => setOffen(null)}
              className="p-4 rounded-2xl text-left transition-all duration-200"
              style={{
                background: an ? `color-mix(in srgb, ${m.farbe} 12%, transparent)` : 'rgba(255,255,255,0.035)',
                border: `1px solid ${an ? `color-mix(in srgb, ${m.farbe} 40%, transparent)` : 'rgba(255,255,255,0.06)'}`,
                transform: offen === m.id ? 'translateY(-2px)' : 'none',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <m.icon size={22} strokeWidth={1.7} style={{ color: an ? m.farbe : '#6B7280' }} />
                {an && (
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full"
                    style={{ background: m.farbe }}
                  >
                    <Check size={12} strokeWidth={3} style={{ color: '#06080C' }} />
                  </span>
                )}
              </div>
              <div className="text-[14px] font-bold text-text mb-0.5">{m.titel}</div>
              <div className="text-[11px] text-text-dim leading-snug">{m.text}</div>
              {erstes && (
                <div className="text-[10px] font-semibold mt-2" style={{ color: m.farbe }}>
                  Ihr wichtigster Punkt
                </div>
              )}
            </button>
          )
        })}
      </div>

      <h3 className="text-[15px] font-bold text-text mb-3">Haben Sie etwas davon geplant?</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
        {VORHABEN.map((v) => {
          const an = ziele.motive.includes(v.id)
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => motivUmschalten(v.id)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: an ? 'color-mix(in srgb, #F59E0B 14%, transparent)' : 'rgba(255,255,255,0.035)',
                border: `1px solid ${an ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                color: an ? '#F59E0B' : undefined,
              }}
            >
              <v.icon size={16} strokeWidth={1.8} />
              {v.titel}
            </button>
          )
        })}
      </div>

      <h3 className="text-[15px] font-bold text-text mb-3">Wann möchten Sie umsetzen?</h3>
      <div className="flex flex-wrap gap-2">
        {ZEITRAEUME.map((z) => {
          const an = ziele.zeitraum === z
          return (
            <button
              key={z}
              type="button"
              onClick={() => onChange({ ...ziele, zeitraum: an ? null : z })}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: an ? 'color-mix(in srgb, #34D399 14%, transparent)' : 'rgba(255,255,255,0.035)',
                border: `1px solid ${an ? 'color-mix(in srgb, #34D399 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                color: an ? '#34D399' : undefined,
              }}
            >
              {z}
            </button>
          )
        })}
      </div>

      {ziele.motive.length > 0 && (
        <div
          className="mt-8 p-4 rounded-2xl"
          style={{
            background: 'color-mix(in srgb, #F59E0B 8%, transparent)',
            border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)',
          }}
        >
          <p className="text-[13px] text-text-sec">
            <b className="text-amber">Notiert.</b> Wir kommen darauf zurück – und Sie finden es
            später in Ihrer Offerte wieder.
          </p>
        </div>
      )}
    </div>
  )
}
