import { Sun, Battery, Car, Flame, Home, TrendingUp, Plus, Trash2 } from 'lucide-react'
import type { CalculatorInput, CalculatorResult, Ausrichtung, Dachtyp } from '../../../lib/pvCalculator'
import { AUSRICHTUNG_LABELS, DACHTYP_LABELS, KOMPONENTEN } from '../../../lib/calculatorConfig'
import { moduleAusKwp } from '../../../lib/pvCalculator'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

/**
 * Haeufige Zusatzleistungen mit Erfahrungswerten. Beim Anklicken landen sie
 * als Position in der Offerte und im Preis – Betrag bleibt danach editierbar.
 */
/**
 * Zusatzleistungen zum Anklicken.
 *
 * Die Hardware-Optionen tragen die echten Listenpreise aus der bestehenden
 * NEOSOLAR-Offerte (KOMPONENTEN.optionen). Die Bauleistungen darunter sind
 * Erfahrungswerte und im Rechner jederzeit ueberschreibbar.
 */
const HARDWARE_OPTIONEN = KOMPONENTEN.optionen
  .filter((o) => o.kwh === 0)
  .map((o) => ({ bezeichnung: o.name, betrag: o.preis }))

const ZUSATZ_VORSCHLAEGE: Array<{ bezeichnung: string; betrag: number }> = [
  ...HARDWARE_OPTIONEN,
  { bezeichnung: 'Demontage alte Anlage', betrag: 1800 },
  { bezeichnung: 'Zählerkasten anpassen', betrag: 1500 },
  { bezeichnung: 'Erdarbeiten / Leerrohr', betrag: 1200 },
  { bezeichnung: 'Blitzschutz-Anbindung', betrag: 900 },
  { bezeichnung: 'Schneefang ergänzen', betrag: 700 },
  { bezeichnung: 'Dachdurchführung Spengler', betrag: 600 },
  { bezeichnung: 'Zusätzliche Kabelwege', betrag: 500 },
]
const kwh = (n: number) => Math.round(n).toLocaleString('de-CH') + ' kWh'
const pct = (n: number) => Math.round(n * 100) + ' %'

interface ReglerProps {
  label: string
  wert: number
  min: number
  max: number
  schritt: number
  einheit: string
  onChange: (v: number) => void
  hinweis?: string
}

function Regler({ label, wert, min, max, schritt, einheit, onChange, hinweis }: ReglerProps) {
  const anteil = ((wert - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">{label}</label>
        <span className="text-[17px] font-bold text-amber tabular-nums">
          {wert.toLocaleString('de-CH')} <span className="text-[12px] text-text-dim font-medium">{einheit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={schritt}
        value={wert}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber cursor-pointer"
        style={{
          height: 6,
          borderRadius: 999,
          background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${anteil}%, rgba(255,255,255,0.10) ${anteil}%, rgba(255,255,255,0.10) 100%)`,
          appearance: 'none',
        }}
      />
      {hinweis && <p className="text-[10px] text-text-dim mt-1">{hinweis}</p>}
    </div>
  )
}

function Schalter({
  aktiv,
  onClick,
  icon: Icon,
  label,
  zusatz,
}: {
  aktiv: boolean
  onClick: () => void
  icon: typeof Car
  label: string
  zusatz?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-left w-full"
      style={{
        background: aktiv ? 'color-mix(in srgb, #F59E0B 14%, transparent)' : 'rgba(255,255,255,0.035)',
        border: `1px solid ${aktiv ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <Icon size={16} strokeWidth={1.8} className={aktiv ? 'text-amber' : 'text-text-dim'} />
      <span className="flex-1">
        <span className={`block text-[12px] font-semibold ${aktiv ? 'text-text' : 'text-text-sec'}`}>{label}</span>
        {zusatz && <span className="block text-[10px] text-text-dim">{zusatz}</span>}
      </span>
    </button>
  )
}

function Kennzahl({
  label,
  wert,
  zusatz,
  farbe = '#F59E0B',
  gross = false,
}: {
  label: string
  wert: string
  zusatz?: string
  farbe?: string
  gross?: boolean
}) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: `color-mix(in srgb, ${farbe} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${farbe} 28%, transparent)`,
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">{label}</div>
      <div
        className={`font-bold tabular-nums leading-tight ${gross ? 'text-[30px]' : 'text-[21px]'}`}
        style={{ color: farbe }}
      >
        {wert}
      </div>
      {zusatz && <div className="text-[11px] text-text-sec mt-0.5">{zusatz}</div>}
    </div>
  )
}

interface Props {
  input: CalculatorInput
  ergebnis: CalculatorResult
  onChange: (patch: Partial<CalculatorInput>) => void
  /** Preise ausblenden, solange der Verkaeufer sie nicht zeigen will */
  preiseSichtbar?: boolean
}

export default function RechnerPanel({ input, ergebnis, onChange, preiseSichtbar = true }: Props) {
  const module = moduleAusKwp(input.kwp, KOMPONENTEN.modul.watt)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-5">
      {/* ── Regler ── */}
      <div className="glass-card p-5 space-y-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-2">
          <Sun size={17} strokeWidth={1.8} className="text-amber" />
          <h3 className="text-[13px] font-bold text-text">Ihre Anlage</h3>
        </div>

        <Regler
          label="Anlagengrösse"
          wert={input.kwp}
          min={4}
          max={60}
          schritt={0.5}
          einheit="kWp"
          onChange={(v) => onChange({ kwp: v })}
          hinweis={`entspricht ${module} Modulen à ${KOMPONENTEN.modul.watt} W`}
        />

        <Regler
          label="Ihr Stromverbrauch"
          wert={input.verbrauchKwh}
          min={2000}
          max={40000}
          schritt={500}
          einheit="kWh/Jahr"
          onChange={(v) => onChange({ verbrauchKwh: v })}
          hinweis="Steht auf Ihrer Stromrechnung"
        />

        <Regler
          label="Batteriespeicher"
          wert={input.speicherKwh}
          min={0}
          max={41.4}
          schritt={6.9}
          einheit="kWh"
          onChange={(v) => onChange({ speicherKwh: v })}
          hinweis={
            input.speicherKwh > 0
              ? `${Math.round(input.speicherKwh / KOMPONENTEN.speicher.modulKwh)} × ${KOMPONENTEN.speicher.name} Modul`
              : 'Ohne Speicher – jederzeit nachrüstbar'
          }
        />

        <Regler
          label="Aktueller Strompreis"
          wert={input.strompreisRp}
          min={15}
          max={50}
          schritt={0.5}
          einheit="Rp./kWh"
          onChange={(v) => onChange({ strompreisRp: v })}
          hinweis="Schweizer Mittel 2026: 27.7 Rp."
        />

        <div className="space-y-2 pt-1">
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">
            Kommt in den nächsten Jahren dazu?
          </div>
          <Schalter
            aktiv={input.geplantEAuto}
            onClick={() => onChange({ geplantEAuto: !input.geplantEAuto })}
            icon={Car}
            label="Elektroauto"
            zusatz="+ 3'000 kWh pro Jahr"
          />
          <Schalter
            aktiv={input.geplantWaermepumpe}
            onClick={() => onChange({ geplantWaermepumpe: !input.geplantWaermepumpe })}
            icon={Flame}
            label="Wärmepumpe"
            zusatz="+ 4'500 kWh pro Jahr"
          />
          <Schalter
            aktiv={input.wallbox}
            onClick={() => onChange({ wallbox: !input.wallbox })}
            icon={Battery}
            label="Wallbox einbauen"
            zusatz={KOMPONENTEN.wallbox.name}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
              Ausrichtung
            </label>
            <select
              value={input.ausrichtung}
              onChange={(e) => onChange({ ausrichtung: e.target.value as Ausrichtung })}
              className="glass-input w-full px-2.5 py-2 text-[12px]"
            >
              {Object.entries(AUSRICHTUNG_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
              Dachtyp
            </label>
            <select
              value={input.dachtyp}
              onChange={(e) => onChange({ dachtyp: e.target.value as Dachtyp })}
              className="glass-input w-full px-2.5 py-2 text-[12px]"
            >
              {Object.entries(DACHTYP_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Regler
          label="Dachneigung"
          wert={input.neigung}
          min={0}
          max={60}
          schritt={5}
          einheit="Grad"
          onChange={(v) => onChange({ neigung: v })}
        />

        {/* ── Zusatzleistungen ── */}
        <div className="pt-1">
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
            Zusatzleistungen
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {ZUSATZ_VORSCHLAEGE.map((v) => {
              const drin = (input.zusatzPositionen ?? []).some((p) => p.bezeichnung === v.bezeichnung)
              return (
                <button
                  key={v.bezeichnung}
                  type="button"
                  onClick={() => {
                    const aktuell = input.zusatzPositionen ?? []
                    onChange({
                      zusatzPositionen: drin
                        ? aktuell.filter((p) => p.bezeichnung !== v.bezeichnung)
                        : [...aktuell, { id: `z${Date.now()}`, bezeichnung: v.bezeichnung, betrag: v.betrag }],
                    })
                  }}
                  className="px-2.5 py-1.5 rounded-full text-[10px] font-semibold transition-all"
                  style={{
                    background: drin ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${drin ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                    color: drin ? '#F59E0B' : undefined,
                  }}
                >
                  {drin ? '− ' : '+ '}
                  {v.bezeichnung}
                </button>
              )
            })}
          </div>

          {(input.zusatzPositionen ?? []).length > 0 && (
            <div className="space-y-1.5">
              {(input.zusatzPositionen ?? []).map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={p.bezeichnung}
                    onChange={(e) =>
                      onChange({
                        zusatzPositionen: (input.zusatzPositionen ?? []).map((x) =>
                          x.id === p.id ? { ...x, bezeichnung: e.target.value } : x
                        ),
                      })
                    }
                    className="glass-input flex-1 min-w-0 px-2 py-1.5 text-[11px]"
                  />
                  <input
                    type="number"
                    value={p.betrag}
                    onChange={(e) =>
                      onChange({
                        zusatzPositionen: (input.zusatzPositionen ?? []).map((x) =>
                          x.id === p.id ? { ...x, betrag: Number(e.target.value) || 0 } : x
                        ),
                      })
                    }
                    step={50}
                    className="glass-input w-20 px-2 py-1.5 text-[11px] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        zusatzPositionen: (input.zusatzPositionen ?? []).filter((x) => x.id !== p.id),
                      })
                    }
                    className="p-1.5 rounded-lg text-text-dim hover:text-red transition-colors shrink-0"
                    aria-label="Position entfernen"
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              onChange({
                zusatzPositionen: [
                  ...(input.zusatzPositionen ?? []),
                  { id: `z${Date.now()}`, bezeichnung: 'Eigene Position', betrag: 0 },
                ],
              })
            }
            className="btn-secondary flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] mt-2"
          >
            <Plus size={12} strokeWidth={2} />
            Eigene Position
          </button>
        </div>

        {/* ── Zahlungsart ── */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
            Zahlungsart für die Offerte
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'TRANCHEN' as const, label: 'Kauf', zusatz: '50/40/10' },
              { id: 'ANZAHLUNG90' as const, label: 'Anzahlung', zusatz: '90/10' },
              { id: 'FINANZIERUNG' as const, label: 'Finanzierung', zusatz: 'monatlich' },
            ].map((z) => {
              const aktiv = (input.zahlungsart ?? 'TRANCHEN') === z.id
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => onChange({ zahlungsart: z.id })}
                  className="px-3 py-2 rounded-xl text-left transition-all"
                  style={{
                    background: aktiv ? 'color-mix(in srgb, #34D399 14%, transparent)' : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${aktiv ? 'color-mix(in srgb, #34D399 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className={`block text-[12px] font-semibold ${aktiv ? 'text-emerald' : 'text-text-sec'}`}>
                    {z.label}
                  </span>
                  <span className="block text-[10px] text-text-dim">{z.zusatz}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Ergebnis ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kennzahl
            label="Ihre Ersparnis"
            wert={chf(ergebnis.ersparnisJahr1)}
            zusatz={`${chf(ergebnis.ersparnisProMonat)} pro Monat`}
            farbe="#34D399"
            gross
          />
          <Kennzahl
            label="Amortisation"
            wert={ergebnis.amortisationJahre ? `${ergebnis.amortisationJahre} J.` : '—'}
            zusatz="dann verdient die Anlage"
            farbe="#F59E0B"
            gross
          />
          <Kennzahl
            label="Unabhängigkeit"
            wert={pct(ergebnis.autarkiegrad)}
            zusatz="Ihres Stroms selbst erzeugt"
            farbe="#60A5FA"
            gross
          />
          <Kennzahl
            label={`Ersparnis über ${ergebnis.jahresverlauf.length} Jahre`}
            wert={chf(ergebnis.gesamtErsparnis)}
            zusatz={`${ergebnis.renditeProzent} % Rendite pro Jahr`}
            farbe="#A78BFA"
            gross
          />
        </div>

        {/* Der zentrale Vergleich: nichts tun kostet auch Geld */}
        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} strokeWidth={1.8} className="text-amber" />
            <h3 className="text-[13px] font-bold text-text">
              Was kostet Sie Strom in den nächsten {ergebnis.jahresverlauf.length} Jahren?
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-text-sec">Ohne Solaranlage</span>
                <span className="font-bold text-red tabular-nums">{chf(ergebnis.stromkostenOhneAnlage)}</span>
              </div>
              <div className="h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full" style={{ width: '100%', background: 'color-mix(in srgb, #F87171 55%, transparent)' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-text-sec">Mit Ihrer Solaranlage</span>
                <span className="font-bold text-emerald tabular-nums">{chf(ergebnis.stromkostenMitAnlage)}</span>
              </div>
              <div className="h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${ergebnis.stromkostenOhneAnlage > 0 ? Math.max(2, (ergebnis.stromkostenMitAnlage / ergebnis.stromkostenOhneAnlage) * 100) : 0}%`,
                    background: 'color-mix(in srgb, #34D399 55%, transparent)',
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-text-dim mt-3">
            Angenommen wird eine Strompreissteigerung von 2 % pro Jahr – das Basisszenario führt bis 2051 auf
            rund 47 Rp./kWh.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Technik */}
          <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Home size={16} strokeWidth={1.8} className="text-amber" />
              <h3 className="text-[13px] font-bold text-text">Ihre Anlage in Zahlen</h3>
            </div>
            <dl className="space-y-2 text-[12px]">
              {[
                ['Stromproduktion pro Jahr', kwh(ergebnis.jahresertragKwh)],
                ['davon selbst genutzt', `${kwh(ergebnis.eigenverbrauchKwh)} (${pct(ergebnis.eigenverbrauchsquote)})`],
                ['ins Netz eingespeist', kwh(ergebnis.einspeisungKwh)],
                ['Ihr Verbrauch (Prognose)', kwh(ergebnis.prognoseVerbrauchKwh)],
                ['Ertrag pro kWp', `${ergebnis.spezifischerErtrag} kWh`],
                ['CO₂-Einsparung pro Jahr', `${ergebnis.co2EinsparungKgProJahr.toLocaleString('de-CH')} kg`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-text-dim">{k}</dt>
                  <dd className="text-text font-semibold tabular-nums text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Preis */}
          {preiseSichtbar ? (
            <div
              className="p-5 rounded-2xl"
              style={{
                background: 'color-mix(in srgb, #F59E0B 8%, transparent)',
                border: '1px solid color-mix(in srgb, #F59E0B 30%, transparent)',
              }}
            >
              <h3 className="text-[13px] font-bold text-text mb-3">Ihre Investition</h3>
              <dl className="space-y-2 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-dim">Anlage schlüsselfertig exkl. MWST</dt>
                  <dd className="text-text font-semibold tabular-nums">
                    {chf(ergebnis.nettoPreis - ergebnis.zusatzSumme)}
                  </dd>
                </div>
                {ergebnis.zusatzSumme > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-dim">
                      Zusatzleistungen ({(input.zusatzPositionen ?? []).length})
                    </dt>
                    <dd className="text-text font-semibold tabular-nums">+ {chf(ergebnis.zusatzSumme)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-text-dim">MWST {config.mwstProzent.toString().replace('.', ',')} %</dt>
                  <dd className="text-text font-semibold tabular-nums">+ {chf(ergebnis.mwst)}</dd>
                </div>
                {ergebnis.rabatt > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-dim">− {input.rabattTitel?.trim() || 'Aktionsrabatt'}</dt>
                    <dd className="text-emerald font-semibold tabular-nums">− {chf(ergebnis.rabatt)}</dd>
                  </div>
                )}
                <div
                  className="flex justify-between gap-3 pt-2 mt-1"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <dt className="text-text font-bold">Rechnungsbetrag inkl. MWST</dt>
                  <dd className="text-text font-bold text-[14px] tabular-nums">{chf(ergebnis.werklohn)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-dim">− Förderung Pronovo</dt>
                  <dd className="text-emerald font-semibold tabular-nums">− {chf(ergebnis.foerderung)}</dd>
                </div>
                {ergebnis.steuerabzug > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-dim">− Steuerersparnis</dt>
                    <dd className="text-emerald font-semibold tabular-nums">− {chf(ergebnis.steuerabzug)}</dd>
                  </div>
                )}
                <div
                  className="flex justify-between gap-3 pt-2 mt-1"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <dt className="text-text font-bold text-[13px]">Ihre effektiven Kosten</dt>
                  <dd className="text-amber font-bold text-[19px] tabular-nums">{chf(ergebnis.nettoInvestition)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-dim">Preis pro kWp</dt>
                  <dd className="text-text-sec tabular-nums">{chf(ergebnis.preisProKwp)}</dd>
                </div>
              </dl>
              <p className="text-[10px] text-text-dim mt-3">
                Festpreis, keine versteckten Kosten. Richtofferte auf Basis von Geoportal-Daten – nach der
                Drohnenvermessung bestätigen wir den finalen Preis (Abweichung max. CHF 1–2K).
              </p>
            </div>
          ) : (
            <div
              className="p-5 rounded-2xl flex items-center justify-center text-center"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[12px] text-text-dim">
                Den Preis besprechen wir gleich –<br />
                zuerst schauen wir, was Sie sparen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
