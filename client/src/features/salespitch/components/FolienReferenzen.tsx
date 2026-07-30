import { useState } from 'react'
import { MapPin, Car, Flame, Ruler, Info } from 'lucide-react'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')
const chfK = (n: number) => Math.round(n).toLocaleString('de-CH')

/**
 * Referenzen und Zusatzrechner.
 *
 * Die Ortsliste stammt aus den echten NEOSOLAR-Projekten (Stand 07/2026),
 * bewusst nur PLZ und Ort – keine Namen, Adressen oder Auftragssummen.
 */

const REFERENZ_ORTE: Array<{ kanton: string; orte: string[] }> = [
  { kanton: 'St. Gallen', orte: ['Wittenbach', 'Berg', 'Rorschacherberg', 'Altenrhein', 'St. Margrethen', 'Berneck', 'Diepoldsau', 'Wil', 'Flawil', 'Andwil', 'Mosnang'] },
  { kanton: 'Zürich', orte: ['Winterthur', 'Bülach', 'Bassersdorf', 'Niederhasli', 'Windlach', 'Buchs', 'Watt', 'Wetzikon', 'Nänikon', 'Au ZH', 'Mettmenstetten'] },
  { kanton: 'Schaffhausen', orte: ['Schaffhausen', 'Neuhausen am Rheinfall', 'Stetten', 'Lohn'] },
  { kanton: 'Thurgau', orte: ['Balterswil', 'Niederneunforn', 'Wängi'] },
  { kanton: 'Schwyz', orte: ['Freienbach', 'Pfäffikon', 'Muotathal'] },
  { kanton: 'Aargau', orte: ['Frick'] },
  { kanton: 'Solothurn', orte: ['Recherswil'] },
  { kanton: 'Appenzell', orte: ['Gais'] },
  { kanton: 'Zug', orte: ['Buonas'] },
  { kanton: 'Graubünden', orte: ['Schnaus'] },
]

/** Bilder, die der Verkaeufer im Termin gross zeigen kann. */
const REFERENZ_BILDER = [
  { datei: 'haus.jpg', titel: 'Einfamilienhaus mit Vollbelegung', text: 'Schwarzmodule flächig verlegt – so wirkt eine Anlage, die zum Dach passt.' },
  { datei: 'montage.jpg', titel: 'Montage durch unser Team', text: 'Gesichert, aufgeräumt, in wenigen Arbeitstagen. Symbolbild.' },
  { datei: 'dachanalyse.jpg', titel: 'Planung über das Geoportal', text: 'Damit legen wir gemeinsam die Modulbelegung fest.' },
  { datei: 'app.jpg', titel: 'Ihre Anlage in der App', text: 'Produktion, Verbrauch und Speicher jederzeit im Blick.' },
]

export function FolienReferenzen() {
  const gesamt = REFERENZ_ORTE.reduce((s, k) => s + k.orte.length, 0)
  const [grossesBild, setGrossesBild] = useState<number | null>(null)

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      {/* Lightbox */}
      {grossesBild !== null && (
        <div
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-6 cursor-zoom-out"
          style={{ background: 'rgba(4,6,10,0.94)', backdropFilter: 'blur(6px)' }}
          onClick={() => setGrossesBild(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setGrossesBild(null)}
        >
          <img
            src={`/praesentation/${REFERENZ_BILDER[grossesBild].datei}`}
            alt={REFERENZ_BILDER[grossesBild].titel}
            className="max-w-full max-h-[76vh] object-contain rounded-2xl"
            style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.9)' }}
          />
          <div className="text-center mt-5 max-w-xl">
            <div className="text-[17px] font-bold text-text mb-1">
              {REFERENZ_BILDER[grossesBild].titel}
            </div>
            <div className="text-[13px] text-text-sec">{REFERENZ_BILDER[grossesBild].text}</div>
            <div className="text-[11px] text-text-dim mt-3">Klicken zum Schliessen</div>
          </div>
        </div>
      )}
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Referenzen</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Wir bauen in Ihrer Nachbarschaft
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Anlagen an {gesamt} Standorten in {REFERENZ_ORTE.length} Kantonen der Deutschschweiz. Auf Wunsch nennen
        wir Ihnen eine Referenz in Ihrer Nähe – nach Rücksprache mit den betreffenden Kunden.
      </p>

      {/* Anklickbare Bilder – im Termin gross zeigen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {REFERENZ_BILDER.map((b, i) => (
          <button
            key={b.datei}
            type="button"
            onClick={() => setGrossesBild(i)}
            className="group relative overflow-hidden text-left transition-transform duration-200 hover:scale-[1.03]"
            style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <img
              src={`/praesentation/${b.datei}`}
              alt={b.titel}
              className="w-full h-28 sm:h-32 object-cover"
              loading="lazy"
            />
            <div
              className="absolute inset-x-0 bottom-0 px-2.5 py-2"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(6,8,12,0.92))' }}
            >
              <div className="text-[11px] font-semibold text-text leading-tight">{b.titel}</div>
              <div className="text-[9px] text-amber mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                grösser zeigen
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {REFERENZ_ORTE.filter((k) => k.orte.length > 1).map((k) => (
          <div
            key={k.kanton}
            className="p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} strokeWidth={1.9} className="text-amber" />
              <span className="text-[13px] font-bold text-text">{k.kanton}</span>
              <span className="text-[10px] text-text-dim ml-auto tabular-nums">{k.orte.length}</span>
            </div>
            <div className="text-[11px] text-text-dim leading-relaxed">{k.orte.join(' · ')}</div>
          </div>
        ))}
      </div>

      <div
        className="p-4 rounded-2xl mb-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
          Ausserdem gebaut in
        </div>
        <div className="text-[12px] text-text-sec">
          {REFERENZ_ORTE.filter((k) => k.orte.length === 1)
            .map((k) => `${k.orte[0]} (${k.kanton})`)
            .join(' · ')}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['70+', 'installierte Anlagen'],
          ['300+', 'Anlagen Team-Erfahrung'],
          ['13+', 'Mitarbeitende'],
          ['7+', 'Jahre Erfahrung'],
        ].map(([wert, label]) => (
          <div
            key={label}
            className="p-4 rounded-2xl text-center"
            style={{
              background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 26%, transparent)',
            }}
          >
            <div className="text-[26px] font-bold text-amber leading-none mb-1.5 tabular-nums">{wert}</div>
            <div className="text-[11px] text-text-sec leading-snug">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Zusatzrechner für den Termin: Dachfläche, Elektroauto und Wärmepumpe.
 * Jeder rechnet mit den aktuellen Konfigurations- und Preiswerten.
 */
export function FolienZusatzrechner({
  input,
  ergebnis,
  config,
}: {
  input: CalculatorInput
  ergebnis: CalculatorResult
  config: CalculatorConfig
}) {
  const [tab, setTab] = useState<'dach' | 'auto' | 'waerme'>('dach')

  // ── Dachfläche ──
  const [flaeche, setFlaeche] = useState(60)
  // Modulmass Hi-MO X10 (54 Zellen): rund 1.72 x 1.13 m brutto inkl. Montageabstand
  const modulFlaeche = 1.95
  const nutzbar = 0.85 // Rand-, Wartungs- und Verschattungsabzug
  const moduleMoeglich = Math.floor((flaeche * nutzbar) / modulFlaeche)
  const kwpMoeglich = Math.round(((moduleMoeglich * KOMPONENTEN.modul.watt) / 1000) * 10) / 10
  const ertragMoeglich = Math.round(kwpMoeglich * ergebnis.spezifischerErtrag)

  // ── Elektroauto ──
  const [km, setKm] = useState(15000)
  const [verbrauch100, setVerbrauch100] = useState(18)
  const autoKwh = (km * verbrauch100) / 100
  const netzKosten = (autoKwh * input.strompreisRp) / 100
  // Realistisch laedt ein Auto nur teilweise mit eigenem Solarstrom
  const solarAnteil = 0.6
  const solarKosten = ((autoKwh * (1 - solarAnteil) * input.strompreisRp) / 100) +
    ((autoKwh * solarAnteil * config.einspeiseverguetungRp) / 100)
  const benzinPreis = 1.75
  const benzinVerbrauch = 7.0
  const benzinKosten = (km / 100) * benzinVerbrauch * benzinPreis

  // ── Wärmepumpe ──
  const [heizoel, setHeizoel] = useState(2000)
  const oelPreis = 1.1 // CHF pro Liter
  const oelKosten = heizoel * oelPreis
  const oelKwh = heizoel * 10 // ca. 10 kWh Heizwert pro Liter
  const jaz = 3.8 // Jahresarbeitszahl einer modernen Luft-Wasser-WP
  const wpStrom = oelKwh / jaz
  const wpNetz = (wpStrom * input.strompreisRp) / 100
  const wpSolarAnteil = 0.35 // Heizperiode = wenig Sonne
  const wpMitSolar =
    ((wpStrom * (1 - wpSolarAnteil) * input.strompreisRp) / 100) +
    ((wpStrom * wpSolarAnteil * config.einspeiseverguetungRp) / 100)

  const tabs = [
    { id: 'dach' as const, icon: Ruler, label: 'Dachfläche' },
    { id: 'auto' as const, icon: Car, label: 'Elektroauto' },
    { id: 'waerme' as const, icon: Flame, label: 'Wärmepumpe' },
  ]

  const regler = (
    label: string,
    wert: number,
    min: number,
    max: number,
    schritt: number,
    einheit: string,
    setzen: (v: number) => void
  ) => (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">{label}</span>
        <span className="text-[16px] font-bold text-amber tabular-nums">
          {wert.toLocaleString('de-CH')} <span className="text-[11px] text-text-dim font-medium">{einheit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={schritt}
        value={wert}
        onChange={(e) => setzen(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          height: 6,
          borderRadius: 999,
          appearance: 'none',
          background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${((wert - min) / (max - min)) * 100}%, rgba(255,255,255,0.10) ${((wert - min) / (max - min)) * 100}%, rgba(255,255,255,0.10) 100%)`,
        }}
      />
    </div>
  )

  const kachel = (label: string, wert: string, zusatz: string, farbe: string) => (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: `color-mix(in srgb, ${farbe} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${farbe} 28%, transparent)`,
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">{label}</div>
      <div className="text-[24px] font-bold tabular-nums leading-none" style={{ color: farbe }}>
        {wert}
      </div>
      <div className="text-[11px] text-text-sec mt-1">{zusatz}</div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <h2 className="text-[28px] sm:text-[32px] font-bold text-text mb-2">Rechnen wir es durch</h2>
      <p className="text-[14px] text-text-sec mb-6">
        Drei Fragen, die im Gespräch fast immer kommen – hier direkt beantwortet.
      </p>

      <div
        className="inline-flex items-center rounded-full p-0.5 mb-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all',
              tab === t.id ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text',
            ].join(' ')}
          >
            <t.icon size={14} strokeWidth={2} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dach' && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <div className="glass-card p-5 space-y-5" style={{ borderRadius: 'var(--radius-lg)' }}>
            {regler('Nutzbare Dachfläche', flaeche, 15, 300, 5, 'm²', setFlaeche)}
            <p className="text-[11px] text-text-dim">
              Grobe Faustregel: ein Modul braucht rund {modulFlaeche} m² inklusive Abstände. Für Ränder,
              Wartungswege und Hindernisse rechnen wir {Math.round((1 - nutzbar) * 100)} % Abzug.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 content-start">
            {kachel('Module', `${moduleMoeglich}`, `à ${KOMPONENTEN.modul.watt} W`, '#F59E0B')}
            {kachel('Leistung', `${kwpMoeglich}`, 'kWp installierbar', '#60A5FA')}
            {kachel('Ertrag', `${chfK(ertragMoeglich)}`, 'kWh pro Jahr', '#34D399')}
            <div
              className="sm:col-span-3 p-4 rounded-xl text-[12px] text-text-sec"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Verbindlich ist die Drohnenvermessung – dann kennen wir jede Dachluke und jeden Kamin. Diese
              Rechnung zeigt Ihnen die Grössenordnung.
            </div>
          </div>
        </div>
      )}

      {tab === 'auto' && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <div className="glass-card p-5 space-y-5" style={{ borderRadius: 'var(--radius-lg)' }}>
            {regler('Fahrleistung', km, 5000, 40000, 1000, 'km/Jahr', setKm)}
            {regler('Verbrauch', verbrauch100, 12, 28, 0.5, 'kWh/100 km', setVerbrauch100)}
            <p className="text-[11px] text-text-dim">
              Angenommen werden {Math.round(solarAnteil * 100)} % Ladung mit eigenem Solarstrom – realistisch mit
              Wallbox und Überschussladen.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 content-start">
            {kachel('Benziner', chf(benzinKosten), `${benzinVerbrauch} l/100 km à ${benzinPreis.toFixed(2)}`, '#F87171')}
            {kachel('Strom ab Netz', chf(netzKosten), `${chfK(autoKwh)} kWh à ${input.strompreisRp} Rp.`, '#F59E0B')}
            {kachel('Mit Ihrer Anlage', chf(solarKosten), 'pro Jahr', '#34D399')}
            <div
              className="sm:col-span-3 p-4 rounded-xl"
              style={{
                background: 'color-mix(in srgb, #34D399 10%, transparent)',
                border: '1px solid color-mix(in srgb, #34D399 28%, transparent)',
              }}
            >
              <div className="text-[13px] text-text-sec">
                Gegenüber dem Benziner sparen Sie{' '}
                <b className="text-emerald">{chf(benzinKosten - solarKosten)}</b> pro Jahr – bei{' '}
                {chfK(km)} km Fahrleistung.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'waerme' && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <div className="glass-card p-5 space-y-5" style={{ borderRadius: 'var(--radius-lg)' }}>
            {regler('Heizölverbrauch heute', heizoel, 500, 6000, 100, 'Liter/Jahr', setHeizoel)}
            <p className="text-[11px] text-text-dim">
              Gerechnet mit Jahresarbeitszahl {jaz} für eine moderne Luft-Wasser-Wärmepumpe. Im Winter liefert
              die Anlage weniger, deshalb nur {Math.round(wpSolarAnteil * 100)} % Solaranteil.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 content-start">
            {kachel('Heizöl heute', chf(oelKosten), `${chfK(heizoel)} l à ${oelPreis.toFixed(2)}`, '#F87171')}
            {kachel('WP ab Netz', chf(wpNetz), `${chfK(wpStrom)} kWh Strom`, '#F59E0B')}
            {kachel('WP mit Solar', chf(wpMitSolar), 'pro Jahr', '#34D399')}
            <div
              className="sm:col-span-3 p-4 rounded-xl"
              style={{
                background: 'color-mix(in srgb, #34D399 10%, transparent)',
                border: '1px solid color-mix(in srgb, #34D399 28%, transparent)',
              }}
            >
              <div className="text-[13px] text-text-sec">
                Wärmepumpe plus Solaranlage spart gegenüber Heizöl rund{' '}
                <b className="text-emerald">{chf(oelKosten - wpMitSolar)}</b> pro Jahr. Der Mehrverbrauch ist in
                Ihrer Anlagenplanung bereits berücksichtigt, wenn Sie die Wärmepumpe aktiviert haben.
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex items-start gap-2.5 p-4 rounded-xl mt-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}
      >
        <Info size={15} strokeWidth={1.8} className="text-text-dim shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-dim leading-relaxed">
          Überschlagsrechnungen mit gerundeten Annahmen (Benzinpreis {benzinPreis.toFixed(2)} CHF/l, Heizöl{' '}
          {oelPreis.toFixed(2)} CHF/l). Sie dienen der Grössenordnung, nicht der Angebotsgrundlage. NEOSOLAR
          liefert keine Wärmepumpen – wir planen die Anlage aber so, dass sie dazu passt.
        </p>
      </div>
    </div>
  )
}
