import { useState } from 'react'
import { X, Send, Loader2, Check, AlertTriangle, Archive, Mail } from 'lucide-react'
import { api } from '../../../lib/api'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')
const kwh = (n: number) => Math.round(n).toLocaleString('de-CH') + ' kWh'

interface Kontakt {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Antwort {
  versand: 'SENT' | 'KEINE_VERBINDUNG' | 'FAILED'
  versandFehler: string | null
  abgelegt: boolean
  ablageFehler: string | null
  empfaenger: string
  dateiName: string | null
}

/**
 * Baut das Offerten-HTML fuer die E-Mail. Bewusst mit Inline-Styles und
 * Tabellen, weil E-Mail-Clients kein modernes CSS zuverlaessig rendern.
 */
function offerteHtml(
  input: CalculatorInput,
  e: CalculatorResult,
  config: CalculatorConfig,
  variantenName: string
): string {
  const module = Math.round((input.kwp * 1000) / KOMPONENTEN.modul.watt)
  const zeile = (k: string, v: string, fett = false) =>
    `<tr><td style="padding:7px 0;color:#4B5563;font-size:13px">${k}</td>` +
    `<td style="padding:7px 0;text-align:right;font-size:${fett ? '16px' : '13px'};color:${fett ? '#B45309' : '#111827'};font-weight:${fett ? 700 : 600}">${v}</td></tr>`

  return `
<h2 style="font-size:19px;color:#111827;margin:0 0 4px">Ihre Richtofferte – Variante «${variantenName}»</h2>
<p style="font-size:13px;color:#6B7280;margin:0 0 18px">Erstellt am ${new Date().toLocaleDateString('de-CH')} · gültig 30 Tage</p>

<table style="width:100%;border-collapse:collapse;margin-bottom:22px">
  <tr><td colspan="2" style="padding:0 0 8px;font-size:14px;font-weight:700;color:#111827">Ihre Anlage</td></tr>
  ${zeile('Leistung', `${input.kwp} kWp`)}
  ${zeile('Solarmodule', `${module} × ${KOMPONENTEN.modul.name} (${KOMPONENTEN.modul.watt} W)`)}
  ${zeile('Wechselrichter', KOMPONENTEN.wechselrichter.name)}
  ${input.speicherKwh > 0 ? zeile('Batteriespeicher', `${input.speicherKwh} kWh ${KOMPONENTEN.speicher.name}`) : zeile('Speicher', 'nicht enthalten, nachrüstbar')}
  ${input.wallbox ? zeile('Wallbox', KOMPONENTEN.wallbox.name) : ''}
</table>

<table style="width:100%;border-collapse:collapse;margin-bottom:22px">
  <tr><td colspan="2" style="padding:0 0 8px;font-size:14px;font-weight:700;color:#111827">Was Sie damit erreichen</td></tr>
  ${zeile('Stromproduktion pro Jahr', kwh(e.jahresertragKwh))}
  ${zeile('davon selbst genutzt', `${kwh(e.eigenverbrauchKwh)} (${Math.round(e.eigenverbrauchsquote * 100)} %)`)}
  ${zeile('Unabhängigkeit vom Netz', `${Math.round(e.autarkiegrad * 100)} %`)}
  ${zeile('Ersparnis im ersten Jahr', chf(e.ersparnisJahr1))}
  ${zeile('Ersparnis pro Monat', chf(e.ersparnisProMonat))}
  ${zeile('Amortisation', e.amortisationJahre ? `${e.amortisationJahre} Jahre` : '—')}
  ${zeile(`Ersparnis über ${config.betrachtungsJahre} Jahre`, chf(e.gesamtErsparnis))}
</table>

<table style="width:100%;border-collapse:collapse;margin-bottom:8px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px">
  <tr><td colspan="2" style="padding:12px 14px 6px;font-size:14px;font-weight:700;color:#111827">Ihre Investition</td></tr>
  <tr><td style="padding:5px 14px;color:#4B5563;font-size:13px">Anlage schlüsselfertig</td>
      <td style="padding:5px 14px;text-align:right;font-size:13px;color:#111827;font-weight:600">${chf(e.bruttoPreis)}</td></tr>
  <tr><td style="padding:5px 14px;color:#4B5563;font-size:13px">− Förderbeitrag Pronovo</td>
      <td style="padding:5px 14px;text-align:right;font-size:13px;color:#047857;font-weight:600">− ${chf(e.foerderung)}</td></tr>
  <tr><td style="padding:10px 14px 14px;font-size:15px;font-weight:700;color:#111827;border-top:2px solid #F59E0B">Ihr Festpreis</td>
      <td style="padding:10px 14px 14px;text-align:right;font-size:20px;font-weight:700;color:#B45309;border-top:2px solid #F59E0B">${chf(e.nettoInvestition)}</td></tr>
</table>

<p style="font-size:11px;color:#6B7280;line-height:1.6;margin:18px 0 0">
Dies ist eine Richtofferte auf Basis der im Gespräch gemachten Angaben und öffentlicher Geodaten – noch kein
verbindliches Festpreisangebot. Ertrag, Eigenverbrauch und Autarkie sind rechnerische Prognosen ohne
stundengenaues Lastprofil. Die Strompreisannahme (${input.strompreisRp} Rp./kWh mit
${(config.strompreisSteigerung * 100).toFixed(1)} % Steigerung pro Jahr) ist keine Garantie. Der Förderbeitrag
richtet sich nach dem bei Anmeldung gültigen Pronovo-Tarif. Das verbindliche Angebot erhalten Sie nach der
Drohnenvermessung, die Abweichung beträgt maximal CHF 1–2K.
</p>`
}

interface Props {
  kontakt: Kontakt
  dealId?: string | null
  input: CalculatorInput
  ergebnis: CalculatorResult
  config: CalculatorConfig
  variantenName: string
  onClose: () => void
}

export default function OfferteSenden({
  kontakt, dealId, input, ergebnis, config, variantenName, onClose,
}: Props) {
  const [betreff, setBetreff] = useState(
    `Ihre Richtofferte für ${input.kwp} kWp – NEOSOLAR AG`
  )
  const [nachricht, setNachricht] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [antwort, setAntwort] = useState<Antwort | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const senden = async (nurAblegen: boolean) => {
    setLaeuft(true)
    setFehler(null)
    try {
      const r = await api.post<{ data: Antwort }>('/solar-offer/send', {
        contactId: kontakt.id,
        dealId: dealId ?? null,
        subject: betreff,
        bodyHtml: offerteHtml(input, ergebnis, config, variantenName),
        nachricht: nachricht.trim() || null,
        nurAblegen,
      })
      setAntwort(r.data)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(4,6,10,0.86)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="glass-card w-full max-w-lg p-6"
        style={{ borderRadius: 'var(--radius-lg)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-start gap-3 mb-5">
          <Mail size={20} strokeWidth={1.8} className="text-amber shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-text">Offerte an den Kunden senden</h3>
            <p className="text-[12px] text-text-dim mt-0.5">
              An {kontakt.firstName} {kontakt.lastName} · {kontakt.email || 'keine E-Mail hinterlegt'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text"
          >
            <X size={17} strokeWidth={1.8} />
          </button>
        </div>

        {antwort ? (
          <div className="space-y-3">
            {/* Versand */}
            <div
              className="flex items-start gap-2.5 p-4 rounded-xl"
              style={{
                background:
                  antwort.versand === 'SENT'
                    ? 'color-mix(in srgb, #34D399 12%, transparent)'
                    : 'color-mix(in srgb, #F59E0B 12%, transparent)',
                border: `1px solid ${antwort.versand === 'SENT' ? 'color-mix(in srgb, #34D399 35%, transparent)' : 'color-mix(in srgb, #F59E0B 35%, transparent)'}`,
              }}
            >
              {antwort.versand === 'SENT' ? (
                <Check size={16} strokeWidth={2.5} className="text-emerald shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={16} strokeWidth={2.5} className="text-amber shrink-0 mt-0.5" />
              )}
              <div className="text-[12px]">
                {antwort.versand === 'SENT' && (
                  <span className="text-emerald">
                    E-Mail an {antwort.empfaenger} gesendet – mit Ihrer Signatur, aus Ihrem Postfach.
                  </span>
                )}
                {antwort.versand === 'KEINE_VERBINDUNG' && (
                  <span className="text-text-sec">
                    <b className="text-amber">Nicht gesendet:</b> Ihr Outlook-Konto ist noch nicht mit dem CRM
                    verbunden. Die Offerte wurde aber abgelegt. Verbinden Sie Outlook unter Admin →
                    Integrationen, dann läuft der Versand direkt aus Ihrem Postfach.
                  </span>
                )}
                {antwort.versand === 'FAILED' && (
                  <span className="text-text-sec">
                    <b className="text-red">Versand fehlgeschlagen:</b> {antwort.versandFehler}
                  </span>
                )}
              </div>
            </div>

            {/* Ablage */}
            <div
              className="flex items-start gap-2.5 p-4 rounded-xl"
              style={{
                background: antwort.abgelegt
                  ? 'color-mix(in srgb, #34D399 10%, transparent)'
                  : 'color-mix(in srgb, #F87171 10%, transparent)',
                border: `1px solid ${antwort.abgelegt ? 'color-mix(in srgb, #34D399 30%, transparent)' : 'color-mix(in srgb, #F87171 30%, transparent)'}`,
              }}
            >
              <Archive
                size={16}
                strokeWidth={2}
                className={`shrink-0 mt-0.5 ${antwort.abgelegt ? 'text-emerald' : 'text-red'}`}
              />
              <div className="text-[12px] text-text-sec">
                {antwort.abgelegt ? (
                  <>
                    Im Dokumentenarchiv des Kunden abgelegt, Ordner «Angebot»:{' '}
                    <b className="text-text">{antwort.dateiName}</b>
                  </>
                ) : (
                  <>
                    <b className="text-red">Ablage fehlgeschlagen:</b> {antwort.ablageFehler}
                  </>
                )}
              </div>
            </div>

            <button type="button" onClick={onClose} className="btn-primary w-full py-2.5 text-[12px] mt-2">
              Fertig
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
                  Betreff
                </label>
                <input
                  type="text"
                  value={betreff}
                  onChange={(e) => setBetreff(e.target.value)}
                  className="glass-input w-full px-3 py-2.5 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
                  Persönliche Nachricht (optional)
                </label>
                <textarea
                  rows={4}
                  value={nachricht}
                  onChange={(e) => setNachricht(e.target.value)}
                  placeholder="Leer lassen für den Standardtext. Ihre Signatur wird automatisch angehängt."
                  className="glass-input w-full px-3 py-2.5 text-[13px]"
                />
              </div>

              <div
                className="p-3.5 rounded-xl text-[11px] text-text-dim"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Die E-Mail enthält Anlage, Ertrag, Ersparnis, Amortisation und den Festpreis von{' '}
                <b className="text-text-sec">{chf(ergebnis.nettoInvestition)}</b> – plus den Hinweis, dass es
                eine Richtofferte ist. Sie wird zusätzlich im Dokumentenarchiv des Kunden abgelegt.
              </div>

              {fehler && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-[12px]"
                  style={{
                    background: 'color-mix(in srgb, #F87171 12%, transparent)',
                    border: '1px solid color-mix(in srgb, #F87171 35%, transparent)',
                  }}
                >
                  <AlertTriangle size={14} strokeWidth={2.5} className="text-red shrink-0 mt-0.5" />
                  <span className="text-red">{fehler}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => senden(false)}
                disabled={laeuft || !kontakt.email}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] disabled:opacity-50"
              >
                {laeuft ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2} />}
                Senden und ablegen
              </button>
              <button
                type="button"
                onClick={() => senden(true)}
                disabled={laeuft}
                className="btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] disabled:opacity-50"
                title="Nur im Dokumentenarchiv ablegen, nicht senden"
              >
                <Archive size={14} strokeWidth={2} />
                Nur ablegen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
