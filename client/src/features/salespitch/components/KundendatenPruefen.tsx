import { useState, useEffect } from 'react'
import { Pencil, Check, Loader2, AlertTriangle, UserCheck } from 'lucide-react'
import { api } from '../../../lib/api'
import type { CalculatorInput, CalculatorResult } from '../../../lib/pvCalculator'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

export interface KontaktDaten {
  id: string
  firstName: string
  lastName: string
  company?: string | null
  address: string
  email: string
  phone: string
}

interface Props {
  kontakt: KontaktDaten | null
  input: CalculatorInput
  ergebnis: CalculatorResult
  berater?: string
  /** Uebernimmt geaenderte Daten in die laufende Praesentation */
  onKontaktGeaendert: (k: KontaktDaten) => void
}

/**
 * Erste inhaltliche Folie: Kundendaten pruefen und direkt korrigieren.
 *
 * Aenderungen gehen per PUT an den Kontakt im CRM und werden gleichzeitig in
 * die laufende Praesentation uebernommen. Damit stimmen Titelfolie, Offerte,
 * E-Mail und CRM-Datensatz nach dem Speichern ueberall – es gibt keine
 * zweite Wahrheit, die man nachpflegen muesste.
 */
export default function KundendatenPruefen({
  kontakt,
  input,
  ergebnis,
  berater,
  onKontaktGeaendert,
}: Props) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [form, setForm] = useState<KontaktDaten | null>(kontakt)
  const [speichert, setSpeichert] = useState(false)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)

  useEffect(() => {
    setForm(kontakt)
  }, [kontakt])

  const speichern = async () => {
    if (!form) return
    setSpeichert(true)
    setMeldung(null)
    try {
      await api.put(`/contacts/${form.id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        company: form.company?.trim() || undefined,
        address: form.address.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      })
      onKontaktGeaendert(form)
      setBearbeiten(false)
      setMeldung({ art: 'ok', text: 'Gespeichert – gilt jetzt für Präsentation, Offerte und CRM.' })
      setTimeout(() => setMeldung(null), 4000)
    } catch (err) {
      setMeldung({
        art: 'fehler',
        text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen',
      })
    } finally {
      setSpeichert(false)
    }
  }

  const feld = (
    label: string,
    key: keyof KontaktDaten,
    typ = 'text',
    breit = false
  ) => (
    <div className={breit ? 'sm:col-span-2' : ''}>
      <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">
        {label}
      </label>
      {bearbeiten ? (
        <input
          type={typ}
          value={(form?.[key] as string) ?? ''}
          onChange={(e) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f))}
          className="glass-input w-full px-2.5 py-2 text-[13px]"
        />
      ) : (
        <div className="text-[14px] text-text py-2 min-h-[38px]">
          {(form?.[key] as string) || <span className="text-text-dim">—</span>}
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-4xl mx-auto w-full">
      <div className="flex items-start gap-3 mb-1">
        <UserCheck size={20} strokeWidth={1.8} className="text-amber shrink-0 mt-1" />
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-1">Ihre Angaben</p>
          <h2 className="text-[28px] sm:text-[32px] font-bold text-text">
            Stimmen Ihre Daten so?
          </h2>
        </div>
        {kontakt && !bearbeiten && (
          <button
            type="button"
            onClick={() => setBearbeiten(true)}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px] shrink-0"
          >
            <Pencil size={12} strokeWidth={2} />
            Korrigieren
          </button>
        )}
        {bearbeiten && (
          <button
            type="button"
            onClick={speichern}
            disabled={speichert}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px] shrink-0 disabled:opacity-50"
          >
            {speichert ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
            Speichern
          </button>
        )}
      </div>
      <p className="text-[14px] text-text-sec mb-6 sm:ml-8">
        Damit auf der Offerte alles richtig steht – Sie können es direkt hier korrigieren.
      </p>

      {meldung && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-xl text-[12px]"
          style={{
            background:
              meldung.art === 'ok'
                ? 'color-mix(in srgb, #34D399 12%, transparent)'
                : 'color-mix(in srgb, #F87171 12%, transparent)',
            border: `1px solid ${meldung.art === 'ok' ? 'color-mix(in srgb, #34D399 35%, transparent)' : 'color-mix(in srgb, #F87171 35%, transparent)'}`,
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

      {kontakt ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 p-5 rounded-2xl mb-6"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {feld('Vorname', 'firstName')}
          {feld('Nachname', 'lastName')}
          {feld('Firma (optional)', 'company', 'text', true)}
          {feld('Adresse des Objekts', 'address', 'text', true)}
          {feld('Telefon', 'phone', 'tel')}
          {feld('E-Mail', 'email', 'email')}
        </div>
      ) : (
        <div
          className="p-5 rounded-2xl mb-6 text-[13px] text-text-dim"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}
        >
          Diese Präsentation läuft ohne Kundenbezug. Starten Sie sie aus einem Termin heraus, damit die
          Kundendaten automatisch erscheinen und in die Offerte übernommen werden.
        </div>
      )}

      {/* Ausgangslage – die Zahlen, mit denen gerechnet wird */}
      <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2.5">
        Womit wir rechnen
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Ihr Verbrauch', wert: `${input.verbrauchKwh.toLocaleString('de-CH')} kWh` },
          { label: 'Ihr Strompreis', wert: `${input.strompreisRp} Rp.` },
          { label: 'Geplante Anlage', wert: `${input.kwp} kWp` },
          { label: 'Ersparnis', wert: `${chf(ergebnis.ersparnisProMonat)}/Mt` },
        ].map((k) => (
          <div
            key={k.label}
            className="p-4 rounded-2xl"
            style={{
              background: 'color-mix(in srgb, #F59E0B 9%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 26%, transparent)',
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
              {k.label}
            </div>
            <div className="text-[18px] font-bold text-amber tabular-nums leading-none">{k.wert}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-text-dim">
        Verbrauch, Anlagengrösse und Strompreis passen wir gleich gemeinsam an
        {berater ? ` – ${berater} führt Sie durch` : ''}.
      </p>
    </div>
  )
}
