import { X, Printer } from 'lucide-react'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'
import { AUSRICHTUNG_LABELS, DACHTYP_LABELS, KOMPONENTEN } from '../../../lib/calculatorConfig'
import type { Beduerfnisse } from './BeduerfnisSchritt'

const chf = (n: number) => "CHF " + Math.round(n).toLocaleString('de-CH')
const kwh = (n: number) => Math.round(n).toLocaleString('de-CH') + ' kWh'

/**
 * Monatliche Ertragsverteilung fuer das Schweizer Mittelland, Summe 100 %.
 * Macht das Sommer/Winter-Gefaelle sichtbar und erklaert, warum auch mit
 * Speicher ein Netzbezug im Winter bleibt.
 */
const MONATSANTEILE: Array<[string, number]> = [
  ['Jan', 3.0], ['Feb', 4.8], ['Mär', 8.0], ['Apr', 10.4],
  ['Mai', 12.2], ['Jun', 12.8], ['Jul', 13.2], ['Aug', 11.8],
  ['Sep', 9.4], ['Okt', 6.6], ['Nov', 3.6], ['Dez', 2.4],
]

interface Kunde {
  firstName: string
  lastName: string
  address: string
  email: string
  phone: string
  company?: string | null
}

/** Daten des betreuenden Verkaeufers – erscheinen im Offertenkopf. */
export interface Verkaeufer {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

interface Props {
  kunde: Kunde | null
  variantenName: string
  input: CalculatorInput
  ergebnis: CalculatorResult
  config: CalculatorConfig
  beduerfnisse: Beduerfnisse
  verkaeufer?: Verkaeufer | null
  onClose: () => void
}

/**
 * Druckansicht der Richtofferte. Nutzt window.print() – daraus entsteht im
 * Browser ein PDF ("Als PDF speichern"), ohne zusaetzliche Abhaengigkeit.
 * Die Druckregeln liegen inline, damit sie unabhaengig vom Dark-Theme greifen.
 */
export default function OffertenDruck({
  kunde, variantenName, input, ergebnis, config, beduerfnisse, verkaeufer, onClose,
}: Props) {
  const zusatz = input.zusatzPositionen ?? []
  const istFinanzierung = input.zahlungsart === 'FINANZIERUNG'
  // Zahlungsplan nach den ueblichen Tranchen
  // Zahlungsoptionen wortgleich zur bestehenden NEOSOLAR-Offerte
  const istAnzahlung90 = input.zahlungsart === 'ANZAHLUNG90'
  const tranchen = istAnzahlung90
    ? [
        { anteil: 90, wann: 'bei Unterzeichnung des Vertrags' },
        { anteil: 10, wann: 'bei erfolgreichem Abschluss der Baustelle' },
      ]
    : [
        { anteil: 50, wann: 'bei Unterzeichnung des Vertrags' },
        { anteil: 40, wann: 'bei Lieferung des erforderlichen Materials' },
        { anteil: 10, wann: 'bei erfolgreichem Abschluss der Baustelle' },
      ]
  const module = Math.round((input.kwp * 1000) / KOMPONENTEN.modul.watt)
  const speicherModule = input.speicherKwh > 0 ? Math.round(input.speicherKwh / KOMPONENTEN.speicher.modulKwh) : 0
  const heute = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })
  const gueltigBis = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-CH')

  const positionen: Array<[string, string]> = [
    [`Solarmodule ${KOMPONENTEN.modul.name} (${KOMPONENTEN.modul.typ})`, `${module} Stück à ${KOMPONENTEN.modul.watt} W`],
    [`Wechselrichter ${KOMPONENTEN.wechselrichter.name}`, '1 Stück, hybrid und Battery-Ready'],
    ...(speicherModule > 0
      ? ([[`Batteriespeicher ${KOMPONENTEN.speicher.name}`, `${speicherModule} Module, ${input.speicherKwh} kWh`]] as Array<[string, string]>)
      : []),
    ...(input.wallbox
      ? ([[`Wallbox ${KOMPONENTEN.wallbox.name}`, '1 Stück inkl. PV-Überschussladen']] as Array<[string, string]>)
      : []),
    [`Unterkonstruktion ${KOMPONENTEN.montage.name}`, `passend für ${DACHTYP_LABELS[input.dachtyp]}`],
    ['DC- und AC-Installation', 'inklusive Verkabelung und Absicherung'],
    ['Planung, Bewilligung, Netzanmeldung', 'Baugesuch, TAG und IA, Pronovo'],
    ['Montage und Inbetriebnahme', 'schlüsselfertig durch NEOSOLAR'],
    ...(input.geruest ? ([['Gerüst', 'Auf- und Abbau inklusive']] as Array<[string, string]>) : []),
    ['NEOSOLAR Zufriedenheitspaket', '5 Jahre Wartung, Thermografie, Reinigung, 24/7 Service'],
  ]

  // Leistungen des Zufriedenheitspakets, wortgleich zur bestehenden Offerte
  const paket = [
    'Thermografie-Drohnenaufnahme direkt nach Inbetriebnahme',
    '5 Jahre Wartungs- und Servicevertrag mit jährlicher Inspektion',
    'Professionelle Modulreinigung nach 3 Jahren',
    '24/7 Störungsservice mit klaren Reaktionszeiten',
    'Detaillierter Bericht mit Bildern nach jeder Inspektion',
  ]

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #offerte-druck, #offerte-druck * { visibility: visible !important; }
          #offerte-druck {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: none !important; margin: 0 !important;
            box-shadow: none !important; border-radius: 0 !important;
          }
          .offerte-keindruck { display: none !important; }
          .offerte-seitenumbruch { page-break-before: always; }
          @page { size: A4; margin: 16mm 14mm; }
        }
      `}</style>

      {/* Werkzeugleiste */}
      <div className="offerte-keindruck sticky top-0 flex items-center justify-end gap-2 p-3" style={{ background: 'rgba(6,8,12,0.9)' }}>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-[12px]"
        >
          <Printer size={14} strokeWidth={2} />
          Drucken / als PDF speichern
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex items-center gap-2 px-4 py-2 text-[12px]">
          <X size={14} strokeWidth={2} />
          Schliessen
        </button>
      </div>

      {/* Dokument – bewusst hell, damit der Druck stimmt */}
      <div
        id="offerte-druck"
        className="mx-auto my-6 p-10"
        style={{ maxWidth: 820, background: '#FFFFFF', color: '#111827', fontFamily: 'Outfit, system-ui, sans-serif' }}
      >
        {/* Kopf mit Logo */}
        <div className="flex justify-between items-start mb-7 pb-5" style={{ borderBottom: '3px solid #F59E0B' }}>
          <div>
            <img
              src="/praesentation/logo.png"
              alt="NEOSOLAR"
              style={{ height: 42, objectFit: 'contain', marginBottom: 6 }}
            />
          </div>
          <div className="text-right text-[10px]" style={{ color: '#6B7280', lineHeight: 1.7 }}>
            Industriestrasse 28, 9100 Herisau<br />
            T +41 (0)71 544 91 00<br />
            info@neosolar.ch · www.neosolar.ch<br />
            CHE-109.669.061
          </div>
        </div>

        <div className="mb-7">
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#F59E0B', fontWeight: 700 }}>
            Richtofferte
          </div>
          <h1 className="text-[26px] font-bold mb-1" style={{ color: '#111827' }}>
            Ihre Photovoltaikanlage
          </h1>
          <div className="text-[12px]" style={{ color: '#6B7280' }}>
            Variante «{variantenName}» · {heute} · gültig bis {gueltigBis}
          </div>
        </div>

        {/* Kunde */}
        {/* Kunde und Berater nebeneinander */}
        <div className="grid grid-cols-2 gap-3 mb-7">
          <div className="p-4" style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: '#6B7280', fontWeight: 700 }}>
              Offerte für
            </div>
            {kunde ? (
              <>
                {kunde.company && (
                  <div className="text-[13px] font-bold" style={{ color: '#111827' }}>{kunde.company}</div>
                )}
                <div className="text-[14px] font-bold" style={{ color: '#111827' }}>
                  {kunde.firstName} {kunde.lastName}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: '#374151' }}>{kunde.address}</div>
                <div className="text-[11px] mt-1" style={{ color: '#6B7280', lineHeight: 1.6 }}>
                  {kunde.phone && <>T {kunde.phone}<br /></>}
                  {kunde.email}
                </div>
              </>
            ) : (
              <div className="text-[12px]" style={{ color: '#9CA3AF' }}>Kundendaten werden ergänzt</div>
            )}
          </div>
          <div className="p-4" style={{ background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
            <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: '#92400E', fontWeight: 700 }}>
              Ihr Berater
            </div>
            {verkaeufer?.firstName || verkaeufer?.lastName ? (
              <>
                <div className="text-[14px] font-bold" style={{ color: '#111827' }}>
                  {[verkaeufer.firstName, verkaeufer.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: '#374151' }}>NEOSOLAR AG</div>
                <div className="text-[11px] mt-1" style={{ color: '#6B7280', lineHeight: 1.6 }}>
                  {verkaeufer.phone && <>T {verkaeufer.phone}<br /></>}
                  {verkaeufer.email}
                </div>
              </>
            ) : (
              <div className="text-[12px]" style={{ color: '#9CA3AF' }}>NEOSOLAR AG · 071 544 91 00</div>
            )}
          </div>
        </div>

        {/* Kennzahlen */}
        <div className="grid grid-cols-5 gap-2.5 mb-7">
          {[
            { label: 'Leistung', wert: `${input.kwp} kWp` },
            { label: 'Produktion', wert: `${(ergebnis.jahresertragKwh / 1000).toFixed(1).replace('.', ',')} MWh/J` },
            { label: 'Unabhängigkeit', wert: `${Math.round(ergebnis.autarkiegrad * 100)} %` },
            { label: 'Ersparnis/Monat', wert: chf(ergebnis.ersparnisProMonat).replace('CHF ', '') },
            { label: 'Amortisation', wert: ergebnis.amortisationJahre ? `${ergebnis.amortisationJahre} J.` : '—' },
          ].map((k) => (
            <div
              key={k.label}
              className="p-3 text-center"
              style={{
                background: 'linear-gradient(165deg, #FFFBEB, #FEF3C7)',
                borderRadius: 10,
                border: '1px solid #FDE68A',
              }}
            >
              <div className="text-[8px] uppercase tracking-wider mb-1" style={{ color: '#92400E', fontWeight: 700 }}>
                {k.label}
              </div>
              <div className="text-[16px] font-bold tabular-nums" style={{ color: '#B45309' }}>{k.wert}</div>
            </div>
          ))}
        </div>

        {/* Der Vergleich, der die Offerte traegt */}
        <div
          className="flex items-stretch gap-3 mb-7 p-4"
          style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}
        >
          <div className="flex-1 text-center">
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#6B7280', fontWeight: 700 }}>
              Stromkosten ohne Anlage
            </div>
            <div className="text-[19px] font-bold tabular-nums" style={{ color: '#B91C1C' }}>
              {chf(ergebnis.stromkostenOhneAnlage)}
            </div>
            <div className="text-[9px]" style={{ color: '#9CA3AF' }}>über {config.betrachtungsJahre} Jahre</div>
          </div>
          <div style={{ width: 1, background: '#E5E7EB' }} />
          <div className="flex-1 text-center">
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#6B7280', fontWeight: 700 }}>
              Mit Ihrer Anlage
            </div>
            <div className="text-[19px] font-bold tabular-nums" style={{ color: '#047857' }}>
              {chf(ergebnis.stromkostenMitAnlage)}
            </div>
            <div className="text-[9px]" style={{ color: '#9CA3AF' }}>Reststrom</div>
          </div>
          <div style={{ width: 1, background: '#E5E7EB' }} />
          <div className="flex-1 text-center">
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#92400E', fontWeight: 700 }}>
              Sie behalten
            </div>
            <div className="text-[19px] font-bold tabular-nums" style={{ color: '#B45309' }}>
              {chf(ergebnis.stromkostenOhneAnlage - ergebnis.stromkostenMitAnlage)}
            </div>
            <div className="text-[9px]" style={{ color: '#9CA3AF' }}>statt an den Versorger</div>
          </div>
        </div>

        {/* Leistungsumfang */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Leistungsumfang</h2>
        <table className="w-full text-[11px] mb-7" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {positionen.map(([pos, detail], i) => (
              <tr key={pos} style={{ background: i % 2 === 0 ? '#F9FAFB' : 'transparent' }}>
                <td className="py-2 px-3" style={{ color: '#111827', fontWeight: 600, width: '55%' }}>{pos}</td>
                <td className="py-2 px-3" style={{ color: '#6B7280' }}>{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Zusatzleistungen, falls erfasst */}
        {zusatz.length > 0 && (
          <>
            <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Zusätzliche Leistungen</h2>
            <table className="w-full text-[11px] mb-7" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {zusatz.map((z, i) => (
                  <tr key={z.id} style={{ background: i % 2 === 0 ? '#F9FAFB' : 'transparent' }}>
                    <td className="py-2 px-3" style={{ color: '#111827', fontWeight: 600, width: '70%' }}>
                      {z.bezeichnung}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                      {chf(z.betrag)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 px-3" style={{ color: '#374151', fontWeight: 700, borderTop: '1px solid #E5E7EB' }}>
                    Summe Zusatzleistungen
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ color: '#111827', fontWeight: 700, borderTop: '1px solid #E5E7EB' }}>
                    {chf(ergebnis.zusatzSumme)}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Preis */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Photovoltaikanlage – Kosten<sup>*</sup></h2>
        <table className="w-full text-[12px] mb-3" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td className="py-2" style={{ color: '#374151' }}>
                Solarstromanlage ({input.kwp} kWp)
              </td>
              <td className="py-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                {chf(ergebnis.nettoPreis - ergebnis.zusatzSumme - (speicherModule > 0 ? input.speicherKwh * config.speicherPreisProKwh : 0))}
              </td>
            </tr>
            {speicherModule > 0 && (
              <tr>
                <td className="py-2" style={{ color: '#374151' }}>
                  Batteriespeichersystem ({input.speicherKwh} kWh)
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                  {chf(input.speicherKwh * config.speicherPreisProKwh)}
                </td>
              </tr>
            )}
            {ergebnis.zusatzSumme > 0 && (
              <tr>
                <td className="py-2" style={{ color: '#374151' }}>Zusätzliche Leistungen</td>
                <td className="py-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                  {chf(ergebnis.zusatzSumme)}
                </td>
              </tr>
            )}
            {ergebnis.rabatt > 0 && (
              <tr>
                <td className="py-2" style={{ color: '#374151' }}>
                  − {input.rabattTitel?.trim() || 'Aktionsrabatt'} ({input.rabattProzent} %)
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: '#047857', fontWeight: 600 }}>
                  − {chf(ergebnis.rabatt)}
                </td>
              </tr>
            )}
            <tr>
              <td className="py-2" style={{ color: '#374151' }}>
                MWST {config.mwstProzent.toString().replace('.', ',')} %
              </td>
              <td className="py-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                {chf(ergebnis.mwst)}
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #E5E7EB' }}>
              <td className="py-2" style={{ color: '#111827', fontWeight: 700 }}>Kosten inkl. MWST</td>
              <td className="py-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 700 }}>
                {chf(ergebnis.bruttoPreis)}
              </td>
            </tr>
            <tr>
              <td className="py-2" style={{ color: '#374151' }}>
                Einmalvergütung (Photovoltaik)<sup>**</sup>
              </td>
              <td className="py-2 text-right tabular-nums" style={{ color: '#047857', fontWeight: 600 }}>
                − {chf(ergebnis.foerderung)}
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #E5E7EB' }}>
              <td className="py-2" style={{ color: '#111827', fontWeight: 700 }}>Ihre Gesamtinvestition</td>
              <td className="py-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 700 }}>
                {chf(ergebnis.bruttoPreis - ergebnis.rabatt - ergebnis.foerderung)}
              </td>
            </tr>
            {ergebnis.steuerabzug > 0 && (
              <tr>
                <td className="py-2" style={{ color: '#374151' }}>
                  Erwartete Steuerersparnis<sup>***</sup>
                </td>
                <td className="py-2 text-right tabular-nums" style={{ color: '#047857', fontWeight: 600 }}>
                  − {chf(ergebnis.steuerabzug)}
                </td>
              </tr>
            )}
            {ergebnis.steuerabzug > 0 && (
              <tr>
                <td className="py-2" style={{ color: '#374151' }}>− Steuerabzug (Schätzung)</td>
                <td className="py-2 text-right tabular-nums" style={{ color: '#047857', fontWeight: 600 }}>
                  − {chf(ergebnis.steuerabzug)}
                </td>
              </tr>
            )}
            <tr style={{ borderTop: '2px solid #F59E0B' }}>
              <td className="py-3 text-[14px] font-bold" style={{ color: '#111827' }}>Effektive Kosten</td>
              <td className="py-3 text-right text-[20px] font-bold tabular-nums" style={{ color: '#B45309' }}>
                {chf(ergebnis.nettoInvestition)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="text-[9px] mb-6" style={{ color: '#6B7280', lineHeight: 1.8 }}>
          <div><span style={{ color: '#F59E0B', fontWeight: 700 }}>*</span> Kosten gelten bei der Bestellung aller aufgelisteten Systeme</div>
          <div><span style={{ color: '#F59E0B', fontWeight: 700 }}>**</span> Die Förderungen können nicht garantiert werden</div>
          {ergebnis.steuerabzug > 0 && (
            <div>
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>***</span> Erwartete Steuerersparnis:
              {' '}{config.steuerabzugProzent} % (Annahme Grenzsteuersatz)
            </div>
          )}
          <div style={{ marginTop: 4 }}>Entspricht {chf(ergebnis.preisProKwp)} pro kWp.</div>
        </div>

        {/* Zahlungsplan */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Zahlungsplan</h2>
        {istFinanzierung ? (
          <div className="p-4 mb-7" style={{ background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
            <div className="text-[12px] font-bold mb-1" style={{ color: '#1E40AF' }}>Finanzierung gewünscht</div>
            <p className="text-[11px]" style={{ color: '#374151', lineHeight: 1.7 }}>
              Sie möchten die Anlage finanzieren. Wir stellen Ihnen die Unterlagen für Ihre Bank zusammen –
              Offerte, technische Beschreibung und Ertragsprognose. Die Konditionen erhalten Sie direkt von
              Ihrem Finanzierungspartner; NEOSOLAR vermittelt keine Kredite.
            </p>
          </div>
        ) : (
          <table className="w-full text-[11px] mb-7" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {tranchen.map((tr, i) => (
                <tr key={tr.anteil} style={{ background: i % 2 === 0 ? '#F9FAFB' : 'transparent' }}>
                  <td className="py-2 px-3" style={{ color: '#111827', fontWeight: 600, width: '20%' }}>
                    {tr.anteil} %
                  </td>
                  <td className="py-2 px-3" style={{ color: '#6B7280' }}>{tr.wann}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                    {chf((ergebnis.nettoInvestition * tr.anteil) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Zufriedenheitspaket */}
        <h2 className="text-[14px] font-bold mb-2" style={{ color: '#111827' }}>
          Im Preis enthalten: NEOSOLAR Zufriedenheitspaket
        </h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1 mb-3">
          {paket.map((p) => (
            <div key={p} className="flex items-start gap-1.5 text-[11px]" style={{ color: '#374151' }}>
              <span style={{ color: '#047857', fontWeight: 700 }}>✓</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] mb-7" style={{ color: '#9CA3AF' }}>
          Ausgenommen Sonderfälle und Materialkosten über die üblichen Grenzen hinaus.
        </p>

        {/* Seite 2 */}
        <div className="offerte-seitenumbruch" />

        <h2 className="text-[14px] font-bold mb-3 mt-2" style={{ color: '#111827' }}>
          Wohin Ihr Solarstrom geht
        </h2>
        {/* Energiefluss als Balken – druckt sauber, weil nur Flaechen */}
        <div className="mb-6">
          <div className="flex h-9 rounded-lg overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: `${Math.max(8, ergebnis.eigenverbrauchsquote * 100)}%`,
                background: '#34D399',
              }}
            >
              <span className="text-[10px] font-bold" style={{ color: '#053B29' }}>
                {Math.round(ergebnis.eigenverbrauchsquote * 100)} % selbst genutzt
              </span>
            </div>
            <div
              className="flex items-center justify-center"
              style={{ flex: 1, background: '#BFDBFE' }}
            >
              <span className="text-[10px] font-bold" style={{ color: '#1E3A8A' }}>
                {Math.round((1 - ergebnis.eigenverbrauchsquote) * 100)} % eingespeist
              </span>
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: '#6B7280' }}>
            <span>{kwh(ergebnis.eigenverbrauchKwh)} für Ihren Haushalt</span>
            <span>{kwh(ergebnis.einspeisungKwh)} ins Netz</span>
          </div>
        </div>

        {/* Stromkosten-Vergleich als Balken */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>
          Ihre Stromkosten über {config.betrachtungsJahre} Jahre
        </h2>
        <div className="mb-6">
          {[
            { label: 'Ohne Solaranlage', wert: ergebnis.stromkostenOhneAnlage, farbe: '#FCA5A5', text: '#7F1D1D' },
            { label: 'Mit Ihrer Anlage', wert: ergebnis.stromkostenMitAnlage, farbe: '#6EE7B7', text: '#053B29' },
          ].map((b) => (
            <div key={b.label} className="mb-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span style={{ color: '#374151' }}>{b.label}</span>
                <span className="tabular-nums font-bold" style={{ color: '#111827' }}>{chf(b.wert)}</span>
              </div>
              <div className="h-6 rounded" style={{ background: '#F3F4F6' }}>
                <div
                  className="h-full rounded flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(6, (b.wert / Math.max(ergebnis.stromkostenOhneAnlage, 1)) * 100)}%`,
                    background: b.farbe,
                  }}
                >
                  <span className="text-[9px] font-bold" style={{ color: b.text }}>
                    {Math.round((b.wert / Math.max(ergebnis.stromkostenOhneAnlage, 1)) * 100)} %
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div
            className="flex items-center justify-between mt-3 px-4 py-3"
            style={{ background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0' }}
          >
            <span className="text-[12px] font-bold" style={{ color: '#065F46' }}>
              Das bleibt bei Ihnen
            </span>
            <span className="text-[19px] font-bold tabular-nums" style={{ color: '#047857' }}>
              {chf(ergebnis.stromkostenOhneAnlage - ergebnis.stromkostenMitAnlage)}
            </span>
          </div>
        </div>

        {/* Kennzahlen-Ringe und Objektdaten – Aufbau wie in der bisherigen Offerte */}
        <div className="grid grid-cols-2 gap-6 mb-7 items-center">
          <div className="flex justify-around">
            {[
              { wert: Math.round(ergebnis.autarkiegrad * 100), label: 'Unabhängigkeitsgrad', farbe: '#111827' },
              { wert: Math.round(ergebnis.eigenverbrauchsquote * 100), label: 'Eigenverbrauch', farbe: '#F59E0B' },
            ].map((r) => {
              const umfang = 2 * Math.PI * 30
              return (
                <div key={r.label} className="text-center">
                  <svg width="86" height="86" viewBox="0 0 76 76">
                    <circle cx="38" cy="38" r="30" fill="none" stroke="#E5E7EB" strokeWidth="7" />
                    <circle
                      cx="38" cy="38" r="30" fill="none" stroke={r.farbe} strokeWidth="7"
                      strokeDasharray={`${(r.wert / 100) * umfang} ${umfang}`}
                      strokeLinecap="butt"
                      transform="rotate(-90 38 38)"
                    />
                    <text x="38" y="43" textAnchor="middle" style={{ fontSize: 16, fontWeight: 700, fill: '#111827' }}>
                      {r.wert}%
                    </text>
                  </svg>
                  <div className="text-[10px] mt-1" style={{ color: '#374151', fontWeight: 600 }}>{r.label}</div>
                </div>
              )
            })}
          </div>

          <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Verbrauch', `${ergebnis.prognoseVerbrauchKwh.toLocaleString('de-CH')} kWh`],
                ['Solaranlage', `${input.kwp} kWp`],
                ['Dachneigung', `${input.neigung}°`],
                ['Ausrichtung', AUSRICHTUNG_LABELS[input.ausrichtung]],
                ['Jahresertrag', `${ergebnis.jahresertragKwh.toLocaleString('de-CH')} kWh`],
                ['Batterie', speicherModule > 0 ? `${input.speicherKwh} kWh` : '—'],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td className="py-1.5 pr-3" style={{ color: '#111827', fontWeight: 600 }}>{k}</td>
                  <td className="py-1.5 pl-3 tabular-nums" style={{ color: '#B45309', fontWeight: 700, borderLeft: '1px solid #E5E7EB' }}>
                    {v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Monatliche Produktion – macht das Sommer/Winter-Gefälle sichtbar */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>
          Ihre Produktion über das Jahr
        </h2>
        <div className="mb-6">
          {(() => {
            // Monatswerte aus den Jahressummen ableiten. Der Verbrauch ist im
            // Winter hoeher, die Produktion deutlich tiefer – daraus ergibt
            // sich die monatliche Aufteilung in Direkt, Speicher und Einspeisung.
            const verbrauchAnteil = [10.4, 9.6, 8.8, 7.6, 6.8, 6.0, 6.0, 6.4, 7.2, 8.4, 9.6, 13.2]
            const zeilen = MONATSANTEILE.map(([name, anteil], i) => {
              const produktion = (ergebnis.jahresertragKwh * anteil) / 100
              const verbrauch = (ergebnis.prognoseVerbrauchKwh * verbrauchAnteil[i]) / 100
              const direktAnteil =
                ergebnis.eigenverbrauchKwh > 0 ? ergebnis.direktverbrauchKwh / ergebnis.eigenverbrauchKwh : 1
              const eigen = Math.min(produktion, verbrauch * (ergebnis.autarkiegrad + 0.05))
              const direkt = eigen * direktAnteil
              const speicher = eigen - direkt
              const einspeisung = Math.max(0, produktion - eigen)
              return { name, produktion, direkt, speicher, einspeisung }
            })
            const max = Math.max(...zeilen.map((z) => z.produktion), 1)
            return (
              <>
                <div className="flex items-end gap-1" style={{ height: 110 }}>
                  {zeilen.map((z) => (
                    <div key={z.name} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full flex flex-col justify-end" style={{ height: '88%' }}>
                        {/* Von oben: Einspeisung, Speicher, Direktverbrauch */}
                        <div style={{ height: `${(z.einspeisung / max) * 100}%`, background: '#DDE21A' }} />
                        <div style={{ height: `${(z.speicher / max) * 100}%`, background: '#D1D5DB' }} />
                        <div style={{ height: `${(z.direkt / max) * 100}%`, background: '#6B7280' }} />
                      </div>
                      <span className="text-[7px] mt-1" style={{ color: '#9CA3AF' }}>{z.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                  {[
                    ['Direktverbrauch', '#6B7280'],
                    ['Eigenverbrauch durch Batterie', '#D1D5DB'],
                    ['Netzeinspeisung', '#DDE21A'],
                  ].map(([label, farbe]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span style={{ width: 10, height: 10, background: farbe, display: 'inline-block' }} />
                      <span className="text-[9px]" style={{ color: '#6B7280' }}>{label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-2" style={{ color: '#6B7280' }}>
                  Solarstromproduktion in kWh. Im Juli produziert Ihre Anlage rund fünfmal so viel wie im
                  Dezember – deshalb bleibt auch mit Speicher ein Netzbezug im Winter.
                </p>
              </>
            )
          })()}
        </div>

        {/* Zwei Energieflüsse: wohin geht der Strom, woher kommt er */}
        <div className="grid grid-cols-2 gap-4 mb-7">
          {[
            {
              titel: 'Wohin geht mein Strom?',
              summe: ergebnis.jahresertragKwh,
              summeLabel: 'Ihre Stromproduktion pro Jahr',
              ergebnisWert: Math.round(ergebnis.eigenverbrauchsquote * 100),
              ergebnisLabel: 'Ihr Eigenverbrauch',
              teile: [
                { label: 'Batterie', wert: ergebnis.speicherverbrauchKwh, farbe: '#9CA3AF' },
                { label: 'Direktverbrauch', wert: ergebnis.direktverbrauchKwh, farbe: '#DDE21A' },
                { label: 'Stromnetz', wert: ergebnis.einspeisungKwh, farbe: '#374151' },
              ],
            },
            {
              titel: 'Woher kommt mein Strom?',
              summe: ergebnis.prognoseVerbrauchKwh,
              summeLabel: 'Ihr Stromverbrauch pro Jahr',
              ergebnisWert: Math.round(ergebnis.autarkiegrad * 100),
              ergebnisLabel: 'Ihr Unabhängigkeitsgrad',
              teile: [
                { label: 'Batterie', wert: ergebnis.speicherverbrauchKwh, farbe: '#9CA3AF' },
                { label: 'Direktverbrauch', wert: ergebnis.direktverbrauchKwh, farbe: '#DDE21A' },
                { label: 'Stromnetz', wert: ergebnis.netzbezugKwh, farbe: '#374151' },
              ],
            },
          ].map((d) => (
            <div key={d.titel} className="p-3" style={{ background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <div className="text-[11px] font-bold mb-2" style={{ color: '#111827' }}>{d.titel}</div>
              <div className="text-[9px]" style={{ color: '#6B7280' }}>{d.summeLabel}</div>
              <div className="text-[15px] font-bold tabular-nums mb-2.5" style={{ color: '#111827' }}>
                {Math.round(d.summe).toLocaleString('de-CH')} kWh
              </div>
              {/* Anteilsbalken */}
              <div className="flex h-5 rounded overflow-hidden mb-2">
                {d.teile.map((t) => (
                  <div
                    key={t.label}
                    style={{ width: `${Math.max(2, (t.wert / Math.max(d.summe, 1)) * 100)}%`, background: t.farbe }}
                  />
                ))}
              </div>
              {d.teile.map((t) => (
                <div key={t.label} className="flex items-center justify-between text-[9px] py-0.5">
                  <span className="flex items-center gap-1.5" style={{ color: '#6B7280' }}>
                    <span style={{ width: 8, height: 8, background: t.farbe, display: 'inline-block' }} />
                    {t.label}
                  </span>
                  <span className="tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                    {Math.round(t.wert).toLocaleString('de-CH')} kWh
                    <span style={{ color: '#9CA3AF', fontWeight: 400 }}>
                      {' '}({Math.round((t.wert / Math.max(d.summe, 1)) * 100)} %)
                    </span>
                  </span>
                </div>
              ))}
              <div className="mt-2 pt-2 text-[10px]" style={{ borderTop: '1px solid #E5E7EB', color: '#111827' }}>
                {d.ergebnisLabel}: <b style={{ color: '#B45309' }}>{d.ergebnisWert} %</b>
              </div>
            </div>
          ))}
        </div>

        {/* Amortisation als Verlauf */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>
          Wann sich Ihre Anlage bezahlt macht
        </h2>
        <div className="mb-6">
          {(() => {
            const werte = ergebnis.jahresverlauf.map((z) => z.kumuliertChf)
            const min = Math.min(...werte, 0)
            const max = Math.max(...werte, 1)
            const spanne = max - min || 1
            const nullLinie = ((max - 0) / spanne) * 100
            return (
              <>
                <div className="relative" style={{ height: 110 }}>
                  <div
                    className="absolute left-0 right-0"
                    style={{ top: `${nullLinie}%`, borderTop: '1px dashed #9CA3AF' }}
                  />
                  <div className="flex items-stretch gap-px h-full">
                    {ergebnis.jahresverlauf.map((z) => {
                      const positiv = z.kumuliertChf >= 0
                      const wertLinie = ((max - z.kumuliertChf) / spanne) * 100
                      return (
                        <div key={z.jahr} className="flex-1 relative">
                          <div
                            className="absolute w-full"
                            style={{
                              top: positiv ? `${wertLinie}%` : `${nullLinie}%`,
                              height: `${Math.abs(nullLinie - wertLinie)}%`,
                              background: positiv ? '#6EE7B7' : '#FCA5A5',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-[9px] mt-1.5" style={{ color: '#6B7280' }}>
                  <span>Jahr 1</span>
                  {ergebnis.amortisationJahre && (
                    <span style={{ color: '#B45309', fontWeight: 700 }}>
                      Bezahlt nach {ergebnis.amortisationJahre} Jahren
                    </span>
                  )}
                  <span>Jahr {config.betrachtungsJahre}</span>
                </div>
              </>
            )
          })()}
        </div>

        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Ihre Ersparnis im Detail</h2>
        <table className="w-full text-[11px] mb-6" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Stromproduktion pro Jahr', kwh(ergebnis.jahresertragKwh)],
              ['davon selbst genutzt', `${kwh(ergebnis.eigenverbrauchKwh)} (${Math.round(ergebnis.eigenverbrauchsquote * 100)} %)`],
              ['ins Netz eingespeist', kwh(ergebnis.einspeisungKwh)],
              ['Ihr Verbrauch (Prognose)', kwh(ergebnis.prognoseVerbrauchKwh)],
              ['Ersparnis im ersten Jahr', chf(ergebnis.ersparnisJahr1)],
              ['Ersparnis pro Monat', chf(ergebnis.ersparnisProMonat)],
              [`Ersparnis über ${config.betrachtungsJahre} Jahre`, chf(ergebnis.gesamtErsparnis)],
              ['Stromkosten ohne Anlage', chf(ergebnis.stromkostenOhneAnlage)],
              ['Stromkosten mit Anlage', chf(ergebnis.stromkostenMitAnlage)],
              ['Ihre Stromgestehungskosten', `${ergebnis.lcoe} Rp./kWh`],
              ['CO₂-Einsparung pro Jahr', `${ergebnis.co2EinsparungKgProJahr.toLocaleString('de-CH')} kg`],
            ].map(([k, v], i) => (
              <tr key={k} style={{ background: i % 2 === 0 ? '#F9FAFB' : 'transparent' }}>
                <td className="py-2 px-3" style={{ color: '#374151' }}>{k}</td>
                <td className="py-2 px-3 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Grundlage der Berechnung</h2>
        <div className="text-[10px] mb-6" style={{ color: '#374151', lineHeight: 1.8 }}>
          Dachausrichtung {AUSRICHTUNG_LABELS[input.ausrichtung]}, Neigung {input.neigung}°,{' '}
          {DACHTYP_LABELS[input.dachtyp]} · spezifischer Ertrag {ergebnis.spezifischerErtrag} kWh/kWp ·
          Strompreis {input.strompreisRp} Rp./kWh mit {(config.strompreisSteigerung * 100).toFixed(1)} %
          Steigerung pro Jahr · Rückliefervergütung {config.einspeiseverguetungRp} Rp./kWh ·
          Moduldegradation {(config.degradationProJahr * 100).toFixed(1)} % pro Jahr ·
          Betriebskosten {chf(config.betriebskostenProJahr)} pro Jahr ·
          Betrachtungszeitraum {config.betrachtungsJahre} Jahre
          {(input.geplantWaermepumpe || input.geplantEAuto) && (
            <>
              {' '}· berücksichtigter Mehrverbrauch:{' '}
              {[
                input.geplantWaermepumpe ? `Wärmepumpe ${config.mehrverbrauchWaermepumpe} kWh` : null,
                input.geplantEAuto ? `Elektroauto ${config.mehrverbrauchEAuto} kWh` : null,
              ].filter(Boolean).join(', ')}
            </>
          )}
        </div>

        {beduerfnisse.motivation.length > 0 && (
          <>
            <h2 className="text-[14px] font-bold mb-2" style={{ color: '#111827' }}>Was Ihnen wichtig ist</h2>
            <div className="text-[11px] mb-6" style={{ color: '#374151' }}>
              {beduerfnisse.motivation.join(' · ')}
              {beduerfnisse.zeitraum && <> · Realisierung: {beduerfnisse.zeitraum}</>}
            </div>
          </>
        )}

        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>So geht es weiter</h2>
        <ol className="text-[11px] mb-6" style={{ color: '#374151', lineHeight: 1.9, paddingLeft: 18 }}>
          <li>Sie prüfen diese Richtofferte in Ruhe.</li>
          <li>Bei Zusage vermessen wir Ihr Dach mit der Drohne und bestätigen den finalen Preis (Abweichung max. CHF 1–2K).</li>
          <li>Sie unterzeichnen das verbindliche Angebot.</li>
          <li>Wir übernehmen Baugesuch, Netzanmeldung und Förderantrag.</li>
          <li>Ab Baubewilligung bis zur fertigen Montage maximal zwei Monate.</li>
        </ol>

        {/* Vertragliche Sicherheiten – Formulierungen aus dem NEOSOLAR-Werkvertrag */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>Ihre vertraglichen Rechte</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            {
              titel: '7 Tage Rücktrittsrecht',
              text: 'Ab Unterzeichnung, ohne Begründung und ohne Verpflichtungen. Schriftlich an unsere Adresse.',
            },
            {
              titel: 'Keine Bewilligung, kein Vertrag',
              text: 'Wird die Baubewilligung nicht erteilt, treten Sie zurück. Bis dahin erbrachte Leistungen stellen wir nicht in Rechnung.',
            },
            {
              titel: 'Mängelrechte nach OR',
              text: '2 Jahre auf bewegliche Teile, 5 Jahre auf fest ins Gebäude integrierte Werke.',
            },
            {
              titel: 'Ein Ansprechpartner',
              text: 'Der Vertrag besteht nur zwischen Ihnen und NEOSOLAR. Verträge mit Subunternehmern berühren ihn nicht.',
            },
          ].map((r) => (
            <div key={r.titel} className="p-3" style={{ background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <div className="text-[11px] font-bold mb-1" style={{ color: '#111827' }}>{r.titel}</div>
              <div className="text-[10px]" style={{ color: '#6B7280', lineHeight: 1.6 }}>{r.text}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] mb-6" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
          Bauseits erforderlich: Internetverbindung im Technikraum für das Monitoring. Die Kosten der
          Elektrokontrolle erhebt das Kontrollorgan direkt bei Ihnen. Es gilt Schweizer Recht,
          Gerichtsstand Herisau. Der Werklohn ist indexiert und wird bei der Schlussrechnung angepasst, sofern der Landesindex der Konsumentenpreise seit Vertragsunterzeichnung um mehr als 5 Prozent gestiegen ist. Massgebend sind die beiliegenden AGB und der Werkvertrag.
        </p>

        <div className="p-4 mb-6" style={{ background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A' }}>
          <div className="text-[12px] font-bold mb-1" style={{ color: '#92400E' }}>Wichtiger Hinweis</div>
          <p className="text-[10px]" style={{ color: '#78350F', lineHeight: 1.7 }}>
            Dies ist eine Richtofferte auf Basis der im Beratungsgespräch gemachten Angaben und öffentlicher
            Geodaten – noch kein verbindliches Festpreisangebot. Ertrag, Eigenverbrauch und Autarkie sind
            rechnerische Prognosen ohne stundengenaues Lastprofil; die tatsächlichen Werte hängen von Wetter,
            Verschattung und Nutzungsverhalten ab. Die Strompreisentwicklung ist eine Annahme, keine Garantie.
            Der Förderbeitrag richtet sich nach dem zum Zeitpunkt der Anmeldung gültigen Pronovo-Tarif.
            Das verbindliche Festpreisangebot erhalten Sie nach der technischen Prüfung vor Ort.
          </p>
        </div>

        {/* Investition gegen Ertrag – der Vergleich aus der bisherigen Offerte */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>
          Investition und Ertrag im Vergleich
        </h2>
        <div className="grid grid-cols-2 gap-6 mb-6 items-end">
          <div className="flex items-end justify-around" style={{ height: 130 }}>
            {[
              { label: 'Effektive Kosten', wert: ergebnis.nettoInvestition, farbe: '#111827' },
              { label: `Ertrag über ${config.betrachtungsJahre} Jahre`, wert: ergebnis.gesamtErsparnis, farbe: '#F59E0B' },
            ].map((b) => {
              const max = Math.max(ergebnis.nettoInvestition, ergebnis.gesamtErsparnis, 1)
              return (
                <div key={b.label} className="flex flex-col items-center" style={{ width: '42%' }}>
                  <span className="text-[12px] font-bold tabular-nums mb-1" style={{ color: b.farbe }}>
                    {Math.round(b.wert).toLocaleString('de-CH')}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(6, (b.wert / max) * 95)}px`,
                      background: b.farbe,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3" style={{ background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#6B7280', fontWeight: 700 }}>
                Rendite
              </div>
              <div className="text-[19px] font-bold tabular-nums" style={{ color: '#B45309' }}>
                {ergebnis.irr !== null ? `${ergebnis.irr} %` : `${ergebnis.renditeProzent} %`}
              </div>
              <div className="text-[9px]" style={{ color: '#9CA3AF' }}>interner Zinsfuss</div>
            </div>
            <div className="p-3" style={{ background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#6B7280', fontWeight: 700 }}>
                Produktionskosten
              </div>
              <div className="text-[19px] font-bold tabular-nums" style={{ color: '#B45309' }}>
                {ergebnis.lcoe} Rp.
              </div>
              <div className="text-[9px]" style={{ color: '#9CA3AF' }}>je kWh Solarstrom</div>
            </div>
          </div>
        </div>

        {/* CO2-Bilanz mit den gewohnten Vergleichen */}
        <h2 className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>
          Ihr Beitrag für die Umwelt
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            {
              wert: Math.round((ergebnis.co2EinsparungKgProJahr / 0.2) / 10) * 10,
              einheit: 'km',
              text: 'fahren Sie mit einem Benziner für dieselbe Menge CO₂',
            },
            {
              wert: Math.round((ergebnis.co2EinsparungKgProJahr / 4050) * 100),
              einheit: '%',
              text: 'reduzieren Sie Ihren CO₂-Fussabdruck (Ø 4.05 t pro Kopf)',
            },
            {
              wert: Math.round(ergebnis.co2EinsparungKgProJahr / 12.5),
              einheit: 'Bäume',
              text: 'nehmen jährlich gleich viel CO₂ auf',
            },
          ].map((c) => (
            <div key={c.einheit} className="p-3" style={{ background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <div className="text-[18px] font-bold tabular-nums" style={{ color: '#B45309' }}>
                {c.wert.toLocaleString('de-CH')} {c.einheit}
              </div>
              <div className="text-[9px] mt-1" style={{ color: '#6B7280', lineHeight: 1.5 }}>{c.text}</div>
            </div>
          ))}
        </div>
        <p className="text-[9px] mb-6" style={{ color: '#9CA3AF' }}>
          Bei einer jährlichen Einsparung von {ergebnis.co2EinsparungKgProJahr.toLocaleString('de-CH')} kg CO₂,
          gerechnet mit 128 g CO₂ je kWh Schweizer Verbraucher-Strommix. Quellen: BAFU Umweltbilanz Strommixe,
          IEA Lebenszyklusanalyse Photovoltaik.
        </p>

        {/* Berechnungsgrundlagen – offengelegt wie im Original */}
        <h2 className="text-[14px] font-bold mb-2" style={{ color: '#111827' }}>Berechnungsgrundlagen</h2>
        <table className="w-full text-[9px] mb-6" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Strompreis', `${input.strompreisRp} Rp./kWh`, 'Nutzungsdauer', `${config.betrachtungsJahre} Jahre`],
              ['Inflation Strompreis', `${(config.strompreisSteigerung * 100).toFixed(1)} % jährlich`, 'Kalkulationszins', `${(config.kalkulationszinssatz * 100).toFixed(1)} %`],
              ['Rückliefervergütung', `${config.einspeiseverguetungRp} Rp./kWh`, 'Unterhalt', `${chf(config.betriebskostenProJahr)} jährlich`],
              ['Moduldegradation', `${(config.degradationProJahr * 100).toFixed(1)} % jährlich`, 'Ertrag je kWp', `${ergebnis.spezifischerErtrag} kWh`],
            ].map((zeile, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#F9FAFB' : 'transparent' }}>
                <td className="py-1.5 px-2" style={{ color: '#6B7280' }}>{zeile[0]}</td>
                <td className="py-1.5 px-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>{zeile[1]}</td>
                <td className="py-1.5 px-2" style={{ color: '#6B7280', borderLeft: '1px solid #E5E7EB' }}>{zeile[2]}</td>
                <td className="py-1.5 px-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>{zeile[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Optionale Komponenten mit echten Preisen */}
        <h2 className="text-[14px] font-bold mb-2" style={{ color: '#111827' }}>
          Optionale Zusatzkomponenten
        </h2>
        <table className="w-full text-[10px] mb-2" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {KOMPONENTEN.optionen.map((o, i) => (
              <tr key={o.id} style={{ background: i % 2 === 0 ? '#F9FAFB' : 'transparent' }}>
                <td className="py-1.5 px-2" style={{ color: '#111827' }}>{o.name}</td>
                <td className="py-1.5 px-2 text-right tabular-nums" style={{ color: '#111827', fontWeight: 600 }}>
                  {chf(o.preis)} / Stück
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[9px] mb-6" style={{ color: '#9CA3AF' }}>
          Alle Preise verstehen sich exkl. MwSt. und Montage. Gerne beraten wir Sie zur idealen Kombination
          für Ihre Anforderungen.
        </p>

        <div className="flex justify-between items-end pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
          <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
            NEOSOLAR AG · Richtofferte vom {heute}
          </div>
          <div className="text-right">
            <div style={{ borderTop: '1px solid #9CA3AF', width: 180, paddingTop: 4 }} className="text-[9px]">
              <span style={{ color: '#6B7280' }}>Datum und Unterschrift Kunde</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
