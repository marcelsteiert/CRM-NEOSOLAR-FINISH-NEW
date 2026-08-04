import { useState } from 'react'
import { Send, Loader2, Check, Shield, Clock, PhoneCall } from 'lucide-react'
import type { CalculatorInput, CalculatorResult } from '../../../lib/pvCalculator'
import type { DachErgebnis } from './Dachplaner'

const API = import.meta.env.VITE_API_URL ?? '/api/v1'
const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

interface Props {
  input: CalculatorInput
  ergebnis: CalculatorResult
  dach: DachErgebnis | null
  /** Adresse aus der Dachplanung, falls vorhanden */
  adresse?: string
  /** Kennung aus einem Kampagnenlink */
  rid?: string | null
  /**
   * Meldet die eingetragenen Daten an die Praesentation. Ab dann steht in
   * der Offerte derselbe Kopf wie beim Verkaeufertermin – der Kunde kann
   * sie also direkt drucken.
   */
  onKontakt?: (k: {
    id: string
    firstName: string
    lastName: string
    address: string
    email: string
    phone: string
  }) => void
}

/**
 * Abschlussfolie der Kundenpraesentation.
 *
 * In der Verkaeuferfassung legt der Berater hier das Angebot im CRM an –
 * er hat die Kundendaten ja schon. Geht der Kunde die Praesentation
 * allein durch, fehlen sie, und er traegt sie selbst ein. Aus der Anfrage
 * entsteht derselbe Lead, nur mit Quelle PLANER statt aus dem Termin.
 */
export default function FolienKundenkontakt({ input, ergebnis, dach, adresse, rid, onKontakt }: Props) {
  const [formular, setFormular] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: adresse ?? '', bemerkung: '', website: '',
  })
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [fertig, setFertig] = useState(false)

  async function absenden(ev: React.FormEvent) {
    ev.preventDefault()
    setSendet(true)
    setFehler(null)
    try {
      const res = await fetch(`${API}/public/calculator/planer-anfrage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formular,
          kwp: input.kwp,
          speicherKwh: input.speicherKwh,
          verbrauchKwh: input.verbrauchKwh,
          wallbox: input.wallbox,
          geschaetzterPreis: ergebnis.werklohn,
          modulAnzahl: dach?.modulAnzahl ?? null,
          dachflaecheM2: dach?.dachflaecheM2 ?? null,
          belegteFlaecheM2: dach?.belegteFlaecheM2 ?? null,
          ausrichtung: dach ? String(dach.azimut) : null,
          neigung: dach?.neigungGrad ?? null,
          jahresertragKwh: ergebnis.jahresertragKwh,
          autarkie: Math.round(ergebnis.autarkiegrad * 100),
          ersparnisJahr: ergebnis.ersparnisJahr1,
          amortisation: ergebnis.amortisationJahre,
          bild: dach?.bild ?? null,
          rid: rid ?? null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error?.message ?? 'Die Anfrage konnte nicht gesendet werden')
      }
      // Die Daten stehen ab jetzt auch in der Offerte
      onKontakt?.({
        id: 'kunde-selbst',
        firstName: formular.firstName,
        lastName: formular.lastName,
        address: formular.address,
        email: formular.email,
        phone: formular.phone,
      })
      setFertig(true)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSendet(false)
    }
  }

  if (fertig) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'color-mix(in srgb, #34D399 16%, transparent)', border: '1px solid color-mix(in srgb, #34D399 40%, transparent)' }}>
            <Check size={30} strokeWidth={2.5} className="text-emerald" />
          </div>
          <h2 className="text-[28px] sm:text-[34px] font-bold text-text mb-3">Vielen Dank!</h2>
          <p className="text-[15px] text-text-sec mb-8 leading-relaxed">
            Ihre Anfrage ist bei uns angekommen, mitsamt Ihrer Auslegung. Wir melden uns innerhalb
            von zwei Werktagen – mit einem Angebot, das auf Ihr Dach passt.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: PhoneCall, titel: 'Wir rufen an', text: 'Ein Berater klärt Ihre offenen Fragen' },
              { icon: Clock, titel: 'Dach vermessen', text: 'Mit der Drohne, kostenlos' },
              { icon: Shield, titel: 'Festpreis', text: 'Verbindlich und ohne Überraschungen' },
            ].map((s) => (
              <div key={s.titel} className="p-4 rounded-xl text-left"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <s.icon size={17} strokeWidth={1.7} className="text-amber mb-2" />
                <div className="text-[13px] font-bold text-text mb-0.5">{s.titel}</div>
                <div className="text-[11px] text-text-dim leading-snug">{s.text}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 rounded-xl text-[13px]"
            style={{ background: 'color-mix(in srgb, #F59E0B 8%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)' }}>
            <span className="text-text-sec">
              Ihre Offerte steht jetzt bereit: Oben links auf <b className="text-amber">Offerte drucken</b> –
              sie enthält Ihre Angaben und lässt sich als PDF speichern.
            </span>
          </div>

          <p className="text-[12px] text-text-dim mt-6">
            NEOSOLAR AG · Industriestrasse 28 · 9100 Herisau · T +41 71 544 91 00
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-8 py-8">
      <div className="max-w-xl mx-auto">
        <h2 className="text-[26px] sm:text-[32px] font-bold text-text mb-2">
          Sollen wir Ihnen ein Angebot machen?
        </h2>
        <p className="text-[14px] text-text-sec mb-6 leading-relaxed">
          Wir prüfen Ihre Auslegung, vermessen Ihr Dach mit der Drohne und melden uns mit einem
          verbindlichen Festpreis. Kostenlos und ohne Verpflichtung.
        </p>

        {/* Was der Kunde sich zusammengestellt hat */}
        <div className="p-4 rounded-xl mb-6"
          style={{ background: 'color-mix(in srgb, #F59E0B 8%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)' }}>
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">Ihre Auslegung</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { wert: `${input.kwp.toFixed(1)} kWp`, label: dach ? `${dach.modulAnzahl} Module` : 'Leistung' },
              { wert: chf(ergebnis.ersparnisProMonat), label: 'gespart pro Monat' },
              { wert: ergebnis.amortisationJahre ? `${ergebnis.amortisationJahre} J.` : '—', label: 'bezahlt nach' },
            ].map((k) => (
              <div key={k.label}>
                <div className="text-[17px] font-bold text-amber tabular-nums leading-none">{k.wert}</div>
                <div className="text-[10px] text-text-dim mt-1">{k.label}</div>
              </div>
            ))}
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
          <input required value={formular.address} onChange={(e) => setFormular({ ...formular, address: e.target.value })}
            placeholder="Strasse, Nummer und Ort" className="glass-input w-full px-4 py-3 text-[14px]" />
          <textarea rows={3} value={formular.bemerkung} onChange={(e) => setFormular({ ...formular, bemerkung: e.target.value })}
            placeholder="Haben Sie eine Frage oder einen Wunsch? (optional)"
            className="glass-input w-full px-4 py-3 text-[14px]" />

          {/* Honeypot – für Menschen unsichtbar */}
          <input type="text" value={formular.website} onChange={(e) => setFormular({ ...formular, website: e.target.value })}
            tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

          {fehler && <p className="text-[13px]" style={{ color: '#F87171' }}>{fehler}</p>}

          <button type="submit" disabled={sendet}
            className="btn-primary w-full flex items-center justify-center gap-2 px-6 py-4 text-[15px] font-semibold disabled:opacity-40">
            {sendet ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} strokeWidth={2} />}
            Unverbindliches Angebot anfordern
          </button>

          <p className="text-[11px] text-text-dim leading-relaxed pt-1">
            Ihre Angaben verwenden wir ausschliesslich, um Ihnen ein Angebot zu erstellen. Wir geben
            sie nicht weiter und Sie können der Nutzung jederzeit widersprechen.
          </p>
        </form>
      </div>
    </div>
  )
}
