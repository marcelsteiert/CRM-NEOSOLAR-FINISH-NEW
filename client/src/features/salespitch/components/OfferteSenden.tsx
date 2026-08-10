import { useRef, useState } from 'react'
import { X, Send, Loader2, Check, AlertTriangle, Archive, Mail, FileText } from 'lucide-react'
import { api } from '../../../lib/api'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'
import OffertenDruck from './OffertenDruck'
import { LEERE_BEDUERFNISSE } from './BeduerfnisSchritt'
import type { DachErgebnis } from './Dachplaner'
import { dokumentAblegen } from '../../../lib/dokumentAblegen'
import { naechsterOffertenName } from '../../../lib/offerteName'

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
  /** Seiten des angehaengten PDFs, null wenn keins dabei war */
  pdfSeiten?: number | null
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
  <tr><td style="padding:5px 14px;color:#4B5563;font-size:13px">Anlage schlüsselfertig exkl. MWST</td>
      <td style="padding:5px 14px;text-align:right;font-size:13px;color:#111827;font-weight:600">${chf(e.nettoPreis)}</td></tr>
  <tr><td style="padding:5px 14px;color:#4B5563;font-size:13px">MWST ${config.mwstProzent.toString().replace('.', ',')} %</td>
      <td style="padding:5px 14px;text-align:right;font-size:13px;color:#111827;font-weight:600">${chf(e.mwst)}</td></tr>
  ${
    e.rabatt > 0
      ? `<tr><td style="padding:5px 14px;color:#4B5563;font-size:13px">− ${input.rabattTitel?.trim() || 'Aktionsrabatt'}</td>
      <td style="padding:5px 14px;text-align:right;font-size:13px;color:#047857;font-weight:600">− ${chf(e.rabatt)}</td></tr>`
      : ''
  }
  <tr><td style="padding:8px 14px;font-size:14px;font-weight:700;color:#111827;border-top:1px solid #FDE68A">Rechnungsbetrag inkl. MWST</td>
      <td style="padding:8px 14px;text-align:right;font-size:15px;font-weight:700;color:#111827;border-top:1px solid #FDE68A">${chf(e.werklohn)}</td></tr>
  <tr><td style="padding:5px 14px;color:#4B5563;font-size:13px">− Einmalvergütung Pronovo</td>
      <td style="padding:5px 14px;text-align:right;font-size:13px;color:#047857;font-weight:600">− ${chf(e.foerderung)}</td></tr>
  ${
    e.steuerabzug > 0
      ? `<tr><td style="padding:5px 14px;color:#4B5563;font-size:13px">− erwartete Steuerersparnis</td>
      <td style="padding:5px 14px;text-align:right;font-size:13px;color:#047857;font-weight:600">− ${chf(e.steuerabzug)}</td></tr>`
      : ''
  }
  <tr><td style="padding:10px 14px 14px;font-size:15px;font-weight:700;color:#111827;border-top:2px solid #F59E0B">Ihre effektiven Kosten</td>
      <td style="padding:10px 14px 14px;text-align:right;font-size:20px;font-weight:700;color:#B45309;border-top:2px solid #F59E0B">${chf(e.nettoInvestition)}</td></tr>
</table>

<p style="font-size:11px;color:#6B7280;line-height:1.6;margin:18px 0 0">
Dies ist eine Richtofferte auf Basis der im Gespräch gemachten Angaben und öffentlicher Geodaten – noch kein
verbindliches Festpreisangebot. Ertrag, Eigenverbrauch und Autarkie sind rechnerische Prognosen ohne
stundengenaues Lastprofil. Die Strompreisannahme (${input.strompreisRp} Rp./kWh mit
${(config.strompreisSteigerung * 100).toFixed(1)} % Steigerung pro Jahr) ist keine Garantie. Der Förderbeitrag
richtet sich nach dem bei Anmeldung gültigen Pronovo-Tarif. Das verbindliche Angebot erhalten Sie nach der
Drohnenvermessung – danach gilt Ihr Festpreis.
</p>`
}

/**
 * Textvorlagen fuer die Begleit-E-Mail.
 *
 * Die Platzhalter werden beim Einsetzen mit den echten Werten der aktuellen
 * Konfiguration ersetzt, damit der Verkaeufer nichts abschreiben muss:
 *   {vorname} {nachname} {kwp} {speicher} {ersparnisMonat} {ersparnisJahr}
 *   {festpreis} {amortisation} {autarkie}
 * Neue Vorlagen einfach hier ergaenzen.
 */
const VORLAGEN: Array<{ id: string; name: string; betreff: string; text: string }> = [
  {
    id: 'standard',
    name: 'Standard',
    betreff: 'Ihre Richtofferte für {kwp} kWp – NEOSOLAR AG',
    text:
      'Guten Tag {vorname} {nachname}\n\n' +
      'vielen Dank für das Gespräch und Ihr Interesse. Anbei erhalten Sie wie besprochen Ihre persönliche ' +
      'Richtofferte mit allen Zahlen zum Nachlesen.\n\n' +
      'Die wichtigsten Punkte auf einen Blick: {kwp} kWp Leistung, rund {ersparnisMonat} Ersparnis pro Monat ' +
      'und eine Amortisation in {amortisation}.\n\n' +
      'Nehmen Sie sich Zeit für die Unterlagen. Bei Fragen erreichen Sie mich direkt – ich melde mich in den ' +
      'nächsten Tagen ohnehin bei Ihnen.',
  },
  {
    id: 'online',
    name: 'Nach Online-Termin',
    betreff: 'Ihre Richtofferte nach unserem Online-Termin',
    text:
      'Guten Tag {vorname} {nachname}\n\n' +
      'danke, dass Sie sich heute die Zeit für unseren Online-Termin genommen haben. Wie besprochen finden Sie ' +
      'hier Ihre Richtofferte – genau die Konfiguration, die wir gemeinsam am Bildschirm durchgerechnet haben.\n\n' +
      '{kwp} kWp, {speicher}, Festpreis {festpreis}.\n\n' +
      'Die Offerte basiert auf Geoportal-Daten. Sobald Sie grünes Licht geben, vermessen wir Ihr Dach mit der ' +
      'Drohne. Daraus entsteht Ihr Festpreis, der bis zur Schlussrechnung gilt.',
  },
  {
    id: 'vorort',
    name: 'Nach Vor-Ort-Termin',
    betreff: 'Ihre Richtofferte – vielen Dank für den Besuch',
    text:
      'Guten Tag {vorname} {nachname}\n\n' +
      'vielen Dank, dass ich mir Ihr Dach vor Ort ansehen durfte. Wie versprochen erhalten Sie hier Ihre ' +
      'Richtofferte auf Basis unserer gemeinsamen Planung.\n\n' +
      'Mit {kwp} kWp deckt die Anlage rund {autarkie} Ihres Strombedarfs und spart Ihnen etwa ' +
      '{ersparnisJahr} pro Jahr.\n\n' +
      'Melden Sie sich, wenn Sie etwas anpassen möchten – das ist jederzeit möglich.',
  },
  {
    id: 'bedenkzeit',
    name: 'Kunde will überlegen',
    betreff: 'Ihre Unterlagen zum Nachlesen – NEOSOLAR AG',
    text:
      'Guten Tag {vorname} {nachname}\n\n' +
      'wie gewünscht schicke ich Ihnen die Unterlagen, damit Sie in Ruhe darüber schauen und alles mit Ihrer ' +
      'Familie besprechen können.\n\n' +
      'Ich setze Sie unter keinen Zeitdruck. Die Offerte ist 30 Tage gültig, danach müssten wir die Preise ' +
      'anhand der aktuellen Materiallage neu rechnen.\n\n' +
      'Wenn Fragen auftauchen – auch kleine – rufen Sie mich einfach an.',
  },
  {
    id: 'sparen',
    name: 'Fokus Ersparnis',
    betreff: '{ersparnisJahr} pro Jahr – Ihre Richtofferte',
    text:
      'Guten Tag {vorname} {nachname}\n\n' +
      'hier ist Ihre Richtofferte mit den durchgerechneten Zahlen.\n\n' +
      'Kurz zusammengefasst: Die Anlage spart Ihnen im ersten Jahr rund {ersparnisJahr}, also etwa ' +
      '{ersparnisMonat} im Monat. Nach {amortisation} hat sie sich bezahlt und produziert danach weiter – ' +
      'die Module haben 30 Jahre Leistungsgarantie.\n\n' +
      'Der Betrag steigt über die Jahre, weil Netzstrom teurer wird und Ihr eigener Solarstrom gleich viel kostet.',
  },
  {
    id: 'kurz',
    name: 'Kurz und knapp',
    betreff: 'Ihre Richtofferte für {kwp} kWp',
    text:
      'Guten Tag {vorname} {nachname}\n\n' +
      'anbei Ihre Richtofferte: {kwp} kWp, Festpreis {festpreis}, Amortisation {amortisation}.\n\n' +
      'Fragen? Einfach anrufen.',
  },
]

interface Props {
  kontakt: Kontakt
  dealId?: string | null
  input: CalculatorInput
  ergebnis: CalculatorResult
  config: CalculatorConfig
  variantenName: string
  /** Dachbelegung – erzeugt den Projektbericht im PDF */
  dach?: DachErgebnis | null
  /** Verkaeufer für Kopf und Signatur der Druckofferte */
  verkaeufer?: { name?: string; email?: string; telefon?: string } | null
  onClose: () => void
}

export default function OfferteSenden({
  kontakt, dealId, input, ergebnis, config, variantenName, dach, verkaeufer, onClose,
}: Props) {
  /** Setzt die Platzhalter einer Vorlage mit den echten Werten. */
  const fuelle = (text: string) =>
    text
      .replace(/\{vorname\}/g, kontakt.firstName)
      .replace(/\{nachname\}/g, kontakt.lastName)
      .replace(/\{kwp\}/g, String(input.kwp))
      .replace(
        /\{speicher\}/g,
        input.speicherKwh > 0 ? `${input.speicherKwh} kWh Speicher` : 'ohne Speicher, jederzeit nachrüstbar'
      )
      .replace(/\{ersparnisMonat\}/g, chf(ergebnis.ersparnisProMonat))
      .replace(/\{ersparnisJahr\}/g, chf(ergebnis.ersparnisJahr1))
      // {festpreis} bleibt der effektive Betrag nach Foerderung,
      // {rechnungsbetrag} ist die Summe inkl. MWST auf der Rechnung
      .replace(/\{festpreis\}/g, chf(ergebnis.nettoInvestition))
      .replace(/\{rechnungsbetrag\}/g, chf(ergebnis.werklohn))
      .replace(
        /\{amortisation\}/g,
        ergebnis.amortisationJahre ? `${ergebnis.amortisationJahre} Jahren` : 'wenigen Jahren'
      )
      .replace(/\{autarkie\}/g, `${Math.round(ergebnis.autarkiegrad * 100)} %`)

  const [vorlageId, setVorlageId] = useState('standard')
  const [betreff, setBetreff] = useState(() => fuelle(VORLAGEN[0].betreff))
  const [nachricht, setNachricht] = useState(() => fuelle(VORLAGEN[0].text))
  const [laeuft, setLaeuft] = useState(false)
  const [antwort, setAntwort] = useState<Antwort | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const vorlageWaehlen = (id: string) => {
    const v = VORLAGEN.find((x) => x.id === id)
    if (!v) return
    setVorlageId(id)
    setBetreff(fuelle(v.betreff))
    setNachricht(fuelle(v.text))
  }

  /**
   * Die vollstaendige Offerte als PDF, gerendert aus derselben
   * Druckansicht wie beim Ausdrucken.
   *
   * Sie haengt off-screen im DOM statt auf `display:none`: html2canvas
   * braucht ein echtes Layout, ein ausgeblendetes Element hat keins.
   */
  const [pdfAn, setPdfAn] = useState(true)
  const [schritt, setSchritt] = useState<string | null>(null)
  /**
   * Die Druckansicht haengt nur waehrend des PDF-Baus im DOM.
   * Dauerhaft gemountet kostet sie beim Oeffnen des Dialogs spuerbar Zeit,
   * und ihr Overlay legt sich ueber den Bildschirm.
   */
  const [pdfRendern, setPdfRendern] = useState(false)
  const druckRef = useRef<HTMLDivElement>(null)

  /**
   * Erzeugt das PDF und laedt es direkt in den Storage.
   *
   * Bewusst nicht als Base64 durch die Function: die vertraegt nur wenige
   * Megabyte im Rumpf, und ein Offerten-PDF mit Karten und Diagrammen
   * liegt schnell darueber. Der Server holt es dann von dort und haengt es
   * an - so ist es in einem Zug abgelegt und versendet.
   */
  async function pdfBauen(): Promise<{ name: string; pfad: string; seiten: number } | null> {
    setPdfRendern(true)
    // Zwei Frames plus kurze Pause, damit React eingehaengt hat und
    // Bilder und Diagramme stehen
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    await new Promise((r) => setTimeout(r, 600))

    const el = druckRef.current?.querySelector<HTMLElement>('#offerte-druck')
    if (!el) {
      setPdfRendern(false)
      return null
    }

    const { offerteAlsPdf } = await import('../../../lib/offertePdf')
    const name = await naechsterOffertenName(
      kontakt.id,
      kontakt.lastName || kontakt.firstName || 'Kunde',
      input.kwp
    )
    const pdf = await offerteAlsPdf(el, name)

    setSchritt('PDF wird abgelegt …')
    const { storagePath } = await dokumentAblegen({
      contactId: kontakt.id,
      datei: pdf.blob,
      dateiName: pdf.dateiName,
      // Muss exakt einem Ordner der DocumentSection entsprechen
      ordner: 'Verträge',
      mimeType: 'application/pdf',
      entityType: 'ANGEBOT',
      ...(dealId ? { entityId: dealId } : {}),
      notes: `Richtofferte ${input.kwp} kWp, ${Math.round(ergebnis.werklohn).toLocaleString('de-CH')} CHF inkl. MWST`,
    })
    setPdfRendern(false)
    return { name: pdf.dateiName, pfad: storagePath, seiten: pdf.seiten }
  }

  const senden = async (nurAblegen: boolean) => {
    setLaeuft(true)
    setFehler(null)
    try {
      let pdf: { name: string; pfad: string; seiten: number } | null = null
      if (pdfAn) {
        setSchritt('Offerte wird als PDF aufbereitet …')
        try {
          pdf = await pdfBauen()
        } catch (err) {
          // Ohne PDF trotzdem senden – die Zahlen stehen auch im Mailtext
          console.error('[Offertenversand] PDF fehlgeschlagen:', err)
        } finally {
          setPdfRendern(false)
        }
      }

      setSchritt(nurAblegen ? 'Wird abgelegt …' : 'Wird versendet …')
      const r = await api.post<{ data: Antwort }>('/solar-offer/send', {
        contactId: kontakt.id,
        dealId: dealId ?? null,
        subject: betreff,
        bodyHtml: offerteHtml(input, ergebnis, config, variantenName),
        nachricht: nachricht.trim() || null,
        nurAblegen,
        ...(pdf ? { pdfPfad: pdf.pfad, pdfName: pdf.name } : {}),
      })
      setAntwort({ ...r.data, pdfSeiten: pdf?.seiten ?? null })
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSchritt(null)
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
                    Im Dokumentenarchiv des Kunden abgelegt, Ordner{' '}
                    «{antwort.pdfSeiten ? 'Verträge' : 'Angebot'}»:{' '}
                    <b className="text-text">{antwort.dateiName}</b>
                    {antwort.pdfSeiten ? (
                      <> · {antwort.pdfSeiten} Seiten, als Anhang mitgeschickt</>
                    ) : null}
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
                <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-2">
                  Vorlage
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VORLAGEN.map((v) => {
                    const aktiv = vorlageId === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => vorlageWaehlen(v.id)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150"
                        style={{
                          background: aktiv
                            ? 'color-mix(in srgb, #F59E0B 18%, transparent)'
                            : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                          color: aktiv ? '#F59E0B' : undefined,
                        }}
                      >
                        {v.name}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-text-dim mt-2">
                  Kundenname, Anlagengrösse, Ersparnis und Festpreis sind bereits eingesetzt – Text frei
                  anpassbar.
                </p>
              </div>

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
                  Ihre Nachricht
                </label>
                <textarea
                  rows={9}
                  value={nachricht}
                  onChange={(e) => setNachricht(e.target.value)}
                  placeholder="Leer lassen für den Standardtext. Ihre Signatur wird automatisch angehängt."
                  className="glass-input w-full px-3 py-2.5 text-[13px]"
                  style={{ lineHeight: 1.6 }}
                />
              </div>

              {/* Die vollstaendige Offerte gehoert als PDF in den Anhang.
                  Im Mailtext steht nur die Zusammenfassung - eine Offerte,
                  die man weiterleiten und ausdrucken kann, ist eine Datei. */}
              <button
                type="button"
                onClick={() => setPdfAn((v) => !v)}
                className="w-full flex items-start gap-2.5 p-3.5 rounded-xl text-left transition-all"
                style={{
                  background: pdfAn
                    ? 'color-mix(in srgb, #F59E0B 10%, transparent)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${pdfAn ? 'color-mix(in srgb, #F59E0B 34%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: pdfAn ? '#F59E0B' : 'rgba(255,255,255,0.06)',
                    border: pdfAn ? 'none' : '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  {pdfAn && <Check size={11} strokeWidth={3} className="text-[#06080C]" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-text flex items-center gap-1.5">
                    <FileText size={12} strokeWidth={2} className="text-amber" />
                    Vollständige Offerte als PDF anhängen
                  </div>
                  <div className="text-[11px] text-text-dim leading-snug mt-0.5">
                    Alle Seiten inklusive Bestellblatt – dieselbe Datei wie beim Drucken.
                    Das Aufbereiten dauert einen Moment. Im Mailtext steht die
                    Zusammenfassung mit {chf(ergebnis.werklohn)} inkl. MWST.
                  </div>
                </div>
              </button>

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
                {schritt ?? 'Senden und ablegen'}
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

      {/*
        Druckansicht fuer das PDF – liegt ausserhalb des Bildes statt auf
        display:none. html2canvas braucht ein echtes Layout; ein
        ausgeblendetes Element hat keins und liefert eine leere Seite.
      */}
      {pdfRendern && (
        <div
          ref={druckRef}
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 960,
            // Echte Hoehe noetig: die Huelle der Druckansicht ist
            // inset-0 und scrollt intern – bei 1px Hoehe misst
            // html2canvas eine leere Seite.
            height: 1200,
            overflow: 'visible',
            pointerEvents: 'none',
            // Der Transform macht diesen Kasten zum Bezugsrahmen fuer die
            // position:fixed-Huelle der Druckansicht. Ohne ihn spannt sie
            // sich ueber den ganzen Bildschirm und verdeckt den Dialog.
            transform: 'translateX(-20000px)',
          }}
        >
          <OffertenDruck
            kunde={{
              id: kontakt.id,
              firstName: kontakt.firstName,
              lastName: kontakt.lastName,
              email: kontakt.email,
            } as never}
            variantenName={variantenName}
            input={input}
            ergebnis={ergebnis}
            config={config}
            beduerfnisse={LEERE_BEDUERFNISSE}
            verkaeufer={verkaeufer as never}
            dach={dach ?? null}
            onClose={() => {}}
          />
        </div>
      )}
    </div>
  )
}
