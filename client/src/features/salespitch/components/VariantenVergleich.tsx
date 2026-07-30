import { useMemo } from 'react'
import { Star, Check } from 'lucide-react'
import { berechne } from '../../../lib/pvCalculator'
import type { CalculatorConfig, CalculatorInput } from '../../../lib/pvCalculator'

const chf = (n: number) => "CHF " + Math.round(n).toLocaleString('de-CH')

export interface Variante {
  id: string
  name: string
  beschreibung: string
  input: CalculatorInput
}

/**
 * Erzeugt drei Varianten aus der aktuellen Konfiguration:
 * Basis (ohne Speicher), Empfehlung (mit passendem Speicher) und
 * Maximal (groessere Anlage + mehr Speicher + Wallbox).
 */
export function bildeVarianten(basis: CalculatorInput): Variante[] {
  // Speicher grob am Tagesverbrauch orientiert, in 6.9-kWh-Modulen
  const tagesverbrauch = basis.verbrauchKwh / 365
  const module = Math.max(1, Math.min(3, Math.round(tagesverbrauch / 6.9)))
  const empfehlungSpeicher = Math.round(module * 6.9 * 10) / 10

  return [
    {
      id: 'basis',
      name: 'Basis',
      beschreibung: 'Solarstrom ohne Speicher – der günstigste Einstieg, jederzeit erweiterbar.',
      input: { ...basis, speicherKwh: 0, wallbox: false },
    },
    {
      id: 'empfehlung',
      name: 'Empfehlung',
      beschreibung: 'Anlage mit passendem Speicher – bestes Verhältnis von Investition und Unabhängigkeit.',
      input: { ...basis, speicherKwh: empfehlungSpeicher },
    },
    {
      id: 'maximal',
      name: 'Maximale Nutzung',
      beschreibung: 'Grösste sinnvolle Anlage mit Speicher und Wallbox – vorbereitet für Wärmepumpe und E-Auto.',
      input: {
        ...basis,
        kwp: Math.round(basis.kwp * 1.35 * 2) / 2,
        speicherKwh: Math.round((empfehlungSpeicher + 6.9) * 10) / 10,
        wallbox: true,
        geplantEAuto: true,
      },
    },
  ]
}

interface Props {
  varianten: Variante[]
  config: CalculatorConfig
  empfehlungId: string
  gewaehlteId: string | null
  onWaehlen: (id: string) => void
  preiseSichtbar?: boolean
}

export default function VariantenVergleich({
  varianten,
  config,
  empfehlungId,
  gewaehlteId,
  onWaehlen,
  preiseSichtbar = true,
}: Props) {
  const berechnet = useMemo(
    () => varianten.map((v) => ({ variante: v, ergebnis: berechne(v.input, config) })),
    [varianten, config]
  )

  const zeilen: Array<{ label: string; wert: (i: number) => string; hervor?: boolean }> = [
    { label: 'Anlagengrösse', wert: (i) => `${berechnet[i].variante.input.kwp} kWp` },
    { label: 'Speicher', wert: (i) => (berechnet[i].variante.input.speicherKwh > 0 ? `${berechnet[i].variante.input.speicherKwh} kWh` : '—') },
    { label: 'Wallbox', wert: (i) => (berechnet[i].variante.input.wallbox ? 'inklusive' : '—') },
    { label: 'Stromproduktion', wert: (i) => `${berechnet[i].ergebnis.jahresertragKwh.toLocaleString('de-CH')} kWh/Jahr` },
    { label: 'Unabhängigkeit', wert: (i) => `${Math.round(berechnet[i].ergebnis.autarkiegrad * 100)} %`, hervor: true },
    { label: 'Ersparnis pro Jahr', wert: (i) => chf(berechnet[i].ergebnis.ersparnisJahr1), hervor: true },
    { label: 'Ersparnis pro Monat', wert: (i) => chf(berechnet[i].ergebnis.ersparnisProMonat) },
    { label: 'Amortisation', wert: (i) => (berechnet[i].ergebnis.amortisationJahre ? `${berechnet[i].ergebnis.amortisationJahre} Jahre` : '—'), hervor: true },
    { label: `Ersparnis über ${config.betrachtungsJahre} Jahre`, wert: (i) => chf(berechnet[i].ergebnis.gesamtErsparnis) },
    { label: 'Ihre Stromkosten', wert: (i) => `${berechnet[i].ergebnis.lcoe} Rp./kWh` },
  ]

  const preisZeilen: Array<{ label: string; wert: (i: number) => string; hervor?: boolean }> = [
    { label: 'Rechnungsbetrag inkl. MWST', wert: (i) => chf(berechnet[i].ergebnis.werklohn) },
    { label: 'Förderung Pronovo', wert: (i) => '− ' + chf(berechnet[i].ergebnis.foerderung) },
    { label: 'Steuerersparnis', wert: (i) => '− ' + chf(berechnet[i].ergebnis.steuerabzug) },
    { label: 'Effektive Kosten', wert: (i) => chf(berechnet[i].ergebnis.nettoInvestition), hervor: true },
  ]

  return (
    <div className="h-full flex flex-col justify-center px-4 sm:px-8 max-w-6xl mx-auto w-full">
      <h2 className="text-[30px] font-bold text-text mb-2">Ihre drei Möglichkeiten</h2>
      <p className="text-[14px] text-text-sec mb-6">
        Alle Varianten mit identischer Technik – Sie entscheiden über den Umfang.
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Kopfzeile */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `170px repeat(${berechnet.length}, minmax(0, 1fr))` }}>
            <div />
            {berechnet.map(({ variante }) => {
              const istEmpfehlung = variante.id === empfehlungId
              const istGewaehlt = variante.id === gewaehlteId
              return (
                <button
                  key={variante.id}
                  type="button"
                  onClick={() => onWaehlen(variante.id)}
                  className="p-4 rounded-2xl text-left transition-all duration-200"
                  style={{
                    background: istGewaehlt
                      ? 'color-mix(in srgb, #F59E0B 16%, transparent)'
                      : istEmpfehlung
                        ? 'color-mix(in srgb, #F59E0B 8%, transparent)'
                        : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${
                      istGewaehlt
                        ? 'color-mix(in srgb, #F59E0B 55%, transparent)'
                        : istEmpfehlung
                          ? 'color-mix(in srgb, #F59E0B 30%, transparent)'
                          : 'rgba(255,255,255,0.06)'
                    }`,
                  }}
                >
                  {istEmpfehlung && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Star size={11} strokeWidth={2.5} className="text-amber" fill="currentColor" />
                      <span className="text-[9px] uppercase tracking-wider font-bold text-amber">
                        Unsere Empfehlung
                      </span>
                    </div>
                  )}
                  <div className="text-[17px] font-bold text-text mb-1">{variante.name}</div>
                  <div className="text-[11px] text-text-dim leading-snug">{variante.beschreibung}</div>
                  {istGewaehlt && (
                    <div className="flex items-center gap-1.5 mt-2.5 text-amber">
                      <Check size={13} strokeWidth={2.5} />
                      <span className="text-[11px] font-bold">Gewählt</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Werte */}
          <div className="mt-3 space-y-px">
            {[...zeilen, ...(preiseSichtbar ? preisZeilen : [])].map((zeile) => (
              <div
                key={zeile.label}
                className="grid gap-3 items-center py-2.5 px-1"
                style={{
                  gridTemplateColumns: `170px repeat(${berechnet.length}, minmax(0, 1fr))`,
                  background: zeile.hervor ? 'rgba(255,255,255,0.028)' : 'transparent',
                  borderRadius: 8,
                }}
              >
                <div className={`text-[11px] ${zeile.hervor ? 'text-text-sec font-semibold' : 'text-text-dim'}`}>
                  {zeile.label}
                </div>
                {berechnet.map((_, i) => (
                  <div
                    key={i}
                    className={`text-center tabular-nums ${
                      zeile.hervor ? 'text-[15px] font-bold text-text' : 'text-[13px] text-text-sec'
                    }`}
                  >
                    {zeile.wert(i)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Richtwerte auf Basis der heute besprochenen Angaben. Eigenverbrauch und Autarkie sind rechnerisch
        geschätzt (kein stundengenaues Lastprofil). Verbindlich ist die Offerte nach der Dachvermessung.
      </p>
    </div>
  )
}
