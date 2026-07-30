import { PiggyBank, Unplug, Leaf, ArrowRight, Sun, Zap, Home, Plug } from 'lucide-react'
import type { CalculatorResult, CalculatorInput } from '../../../lib/pvCalculator'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')
const kwh = (n: number) => Math.round(n).toLocaleString('de-CH') + ' kWh'

/**
 * Folien, die mit den berechneten Kundenwerten arbeiten.
 * Aufbau und Dramaturgie orientieren sich an bewaehrten Verkaufsunterlagen
 * der Branche – alle Zahlen und Rahmenbedingungen sind jedoch Schweizer
 * Verhaeltnisse (ElCom, Pronovo). Deutsche Besonderheiten wie
 * EEG-Verguetung oder Umsatzsteuer-Befreiung gelten hier nicht.
 */

export function FolienDreiMotive({ ergebnis }: { ergebnis: CalculatorResult }) {
  const motive = [
    {
      icon: PiggyBank,
      farbe: '#34D399',
      titel: 'Stromkosten senken',
      wert: chf(ergebnis.ersparnisProMonat),
      einheit: 'pro Monat',
      text: 'Jede selbst produzierte Kilowattstunde müssen Sie nicht mehr einkaufen.',
    },
    {
      icon: Unplug,
      farbe: '#60A5FA',
      titel: 'Unabhängiger werden',
      wert: Math.round(ergebnis.autarkiegrad * 100) + ' %',
      einheit: 'Ihres Stroms selbst',
      text: 'Weniger abhängig davon, was der Strompreis in zehn Jahren macht.',
    },
    {
      icon: Leaf,
      farbe: '#A78BFA',
      titel: 'Klima schützen',
      wert:
        ergebnis.co2EinsparungKgProJahr >= 1000
          ? (ergebnis.co2EinsparungKgProJahr / 1000).toFixed(1).replace('.', ',') + ' t'
          : ergebnis.co2EinsparungKgProJahr + ' kg',
      einheit: 'CO₂ pro Jahr',
      text: 'Sauberer Strom vom eigenen Dach statt aus dem europäischen Netzmix.',
    },
  ]

  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-5xl mx-auto w-full">
      <h2 className="text-[32px] font-bold text-text mb-3">Was Ihnen Ihre Anlage bringt</h2>
      <p className="text-[15px] text-text-sec mb-9">
        Drei Gründe, warum sich heute so viele Hausbesitzer entscheiden – gerechnet mit Ihren Zahlen.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {motive.map((m) => (
          <div
            key={m.titel}
            className="p-6 rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${m.farbe} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${m.farbe} 28%, transparent)`,
            }}
          >
            <m.icon size={26} strokeWidth={1.7} style={{ color: m.farbe }} className="mb-4" />
            <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">{m.titel}</div>
            <div className="text-[34px] font-bold leading-none mb-1 tabular-nums" style={{ color: m.farbe }}>
              {m.wert}
            </div>
            <div className="text-[12px] text-text-sec mb-3">{m.einheit}</div>
            <div className="text-[12px] text-text-dim leading-snug">{m.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Die Kernfolie: was Strom kostet, wenn man nichts tut.
 * Zeigt den Monatsbetrag im Zeitverlauf und die Summe.
 */
export function FolienStromkostenOhne({
  ergebnis,
  input,
}: {
  ergebnis: CalculatorResult
  input: CalculatorInput
}) {
  const jahre = ergebnis.jahresverlauf.length
  const stuetzjahre = [1, 5, 10, 15, 20, jahre].filter((j, i, a) => j <= jahre && a.indexOf(j) === i)

  // Monatliche Stromrechnung ohne Anlage, je Stuetzjahr
  const punkte = stuetzjahre.map((j) => {
    const zeile = ergebnis.jahresverlauf[j - 1]
    const monat = (ergebnis.prognoseVerbrauchKwh * zeile.strompreisRp) / 100 / 12
    return { jahr: j, monat, preis: zeile.strompreisRp }
  })
  const maxMonat = Math.max(...punkte.map((p) => p.monat))
  const durchschnitt = ergebnis.stromkostenOhneAnlage / jahre / 12

  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-4xl mx-auto w-full">
      <h2 className="text-[32px] font-bold text-text mb-2">
        Ihre Stromkosten – wenn Sie nichts ändern
      </h2>
      <p className="text-[14px] text-text-sec mb-8">
        Bei {kwh(ergebnis.prognoseVerbrauchKwh)} Jahresverbrauch, {input.strompreisRp} Rp./kWh heute und 2 %
        Steigerung pro Jahr.
      </p>

      <div className="flex items-end gap-2 sm:gap-4 h-48 mb-4">
        {punkte.map((p) => (
          <div key={p.jahr} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-[13px] font-bold text-red tabular-nums">
              {Math.round(p.monat).toLocaleString('de-CH')}
            </span>
            <div
              className="w-full rounded-t-lg"
              style={{
                height: `${(p.monat / maxMonat) * 100}%`,
                background: 'linear-gradient(180deg, color-mix(in srgb, #F87171 60%, transparent), color-mix(in srgb, #F87171 25%, transparent))',
                border: '1px solid color-mix(in srgb, #F87171 55%, transparent)',
                borderBottom: 'none',
              }}
            />
            <span className="text-[10px] text-text-dim">
              {p.jahr === 1 ? 'heute' : `Jahr ${p.jahr}`}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-dim mb-7 text-center">CHF pro Monat für Netzstrom</p>

      <div
        className="p-6 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, #F87171 12%, transparent)',
          border: '1px solid color-mix(in srgb, #F87171 32%, transparent)',
        }}
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-[14px] text-text-sec">Summe Ihrer Stromkosten über {jahre} Jahre:</span>
          <span className="text-[38px] font-bold text-red leading-none tabular-nums">
            {chf(ergebnis.stromkostenOhneAnlage)}
          </span>
        </div>
        <div className="text-[12px] text-text-sec mt-2">
          Das sind im Durchschnitt {chf(durchschnitt)} pro Monat – Geld, das ohne Gegenwert abfliesst.
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <ArrowRight size={17} strokeWidth={2} className="text-emerald shrink-0" />
        <p className="text-[14px] text-text">
          Mit Ihrer Anlage sind es nur noch{' '}
          <b className="text-emerald">{chf(ergebnis.stromkostenMitAnlage)}</b> – Sie behalten{' '}
          <b className="text-emerald">
            {chf(ergebnis.stromkostenOhneAnlage - ergebnis.stromkostenMitAnlage)}
          </b>
          .
        </p>
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Prognose auf Basis ElCom-Haushaltstarife. Keine Preisgarantie – die tatsächliche Entwicklung kann
        abweichen.
      </p>
    </div>
  )
}

/** Energiefluss: wohin der Solarstrom geht und was vom Netz noch nötig ist. */
export function FolienEnergiefluss({ ergebnis }: { ergebnis: CalculatorResult }) {
  const netzbezug = Math.max(0, ergebnis.prognoseVerbrauchKwh - ergebnis.eigenverbrauchKwh)
  const anteilEigen = ergebnis.jahresertragKwh > 0 ? ergebnis.eigenverbrauchKwh / ergebnis.jahresertragKwh : 0

  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-4xl mx-auto w-full">
      <h2 className="text-[32px] font-bold text-text mb-2">Ihr Energiefluss über das Jahr</h2>
      <p className="text-[14px] text-text-sec mb-8">
        So verteilt sich der Strom, den Ihr Dach produziert.
      </p>

      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex-1 p-5 rounded-2xl text-center"
          style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 32%, transparent)' }}
        >
          <Sun size={22} strokeWidth={1.7} className="text-amber mx-auto mb-2" />
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">Produktion</div>
          <div className="text-[24px] font-bold text-amber tabular-nums leading-none">
            {ergebnis.jahresertragKwh.toLocaleString('de-CH')}
          </div>
          <div className="text-[11px] text-text-sec mt-0.5">kWh pro Jahr</div>
        </div>

        <ArrowRight size={20} strokeWidth={2} className="text-text-dim shrink-0" />

        <div className="flex-1 space-y-3">
          <div
            className="p-4 rounded-xl"
            style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', border: '1px solid color-mix(in srgb, #34D399 32%, transparent)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Home size={14} strokeWidth={1.8} className="text-emerald" />
              <span className="text-[11px] font-semibold text-text">Sie verbrauchen selbst</span>
            </div>
            <div className="text-[19px] font-bold text-emerald tabular-nums">
              {kwh(ergebnis.eigenverbrauchKwh)}
            </div>
            <div className="text-[10px] text-text-dim">{Math.round(anteilEigen * 100)} % Ihrer Produktion</div>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{ background: 'color-mix(in srgb, #60A5FA 10%, transparent)', border: '1px solid color-mix(in srgb, #60A5FA 28%, transparent)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} strokeWidth={1.8} className="text-blue-400" />
              <span className="text-[11px] font-semibold text-text">Ins Netz eingespeist</span>
            </div>
            <div className="text-[19px] font-bold tabular-nums" style={{ color: '#60A5FA' }}>
              {kwh(ergebnis.einspeisungKwh)}
            </div>
            <div className="text-[10px] text-text-dim">wird Ihnen vergütet</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Plug size={15} strokeWidth={1.8} className="text-text-dim" />
            <span className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">
              Noch vom Netz nötig
            </span>
          </div>
          <div className="text-[26px] font-bold text-text tabular-nums leading-none">{kwh(netzbezug)}</div>
          <div className="text-[11px] text-text-sec mt-1">
            vor allem im Winter und nachts
          </div>
        </div>
        <div
          className="p-5 rounded-2xl"
          style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', border: '1px solid color-mix(in srgb, #34D399 32%, transparent)' }}
        >
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
            Ihre Unabhängigkeit
          </div>
          <div className="text-[40px] font-bold text-emerald tabular-nums leading-none">
            {Math.round(ergebnis.autarkiegrad * 100)} %
          </div>
          <div className="text-[11px] text-text-sec mt-1">
            {kwh(ergebnis.eigenverbrauchKwh)} von {kwh(ergebnis.prognoseVerbrauchKwh)}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Eigenverbrauch und Autarkie sind rechnerisch geschätzt – ohne stundengenaues Lastprofil. Vollständige
        Unabhängigkeit ist ohne Saisonspeicher nicht erreichbar.
      </p>
    </div>
  )
}

/** Erklärt die Anlage anschaulich: Module, kWp, Speicher. */
export function FolienAnlageUebersicht({
  ergebnis,
  input,
}: {
  ergebnis: CalculatorResult
  input: CalculatorInput
}) {
  const module = Math.round((input.kwp * 1000) / KOMPONENTEN.modul.watt)
  const speicherModule = input.speicherKwh > 0 ? Math.round(input.speicherKwh / KOMPONENTEN.speicher.modulKwh) : 0

  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-4xl mx-auto w-full">
      <h2 className="text-[32px] font-bold text-text mb-2">Das kommt auf Ihr Dach</h2>
      <p className="text-[14px] text-text-sec mb-8">Ihre Anlage, so wie wir sie gemeinsam geplant haben.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {[
          { wert: String(module), label: 'Solarmodule', zusatz: `${KOMPONENTEN.modul.watt} W pro Modul` },
          { wert: `${input.kwp}`, label: 'kWp Leistung', zusatz: 'installierte Leistung' },
          {
            wert: speicherModule > 0 ? `${input.speicherKwh}` : '—',
            label: 'kWh Speicher',
            zusatz: speicherModule > 0 ? `${speicherModule} Batteriemodule` : 'später nachrüstbar',
          },
          {
            wert: ergebnis.jahresertragKwh.toLocaleString('de-CH'),
            label: 'kWh pro Jahr',
            zusatz: `${ergebnis.spezifischerErtrag} kWh je kWp`,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="p-5 rounded-2xl text-center"
            style={{ background: 'color-mix(in srgb, #F59E0B 10%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 26%, transparent)' }}
          >
            <div className="text-[30px] font-bold text-amber leading-none mb-1.5 tabular-nums">{k.wert}</div>
            <div className="text-[12px] font-semibold text-text">{k.label}</div>
            <div className="text-[10px] text-text-dim mt-0.5">{k.zusatz}</div>
          </div>
        ))}
      </div>

      <div
        className="p-5 rounded-2xl mb-4"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
          Was bedeutet kWp?
        </div>
        <p className="text-[13px] text-text-sec">
          kWp ist die Leistung Ihrer Anlage unter optimalen Bedingungen. Bei Ihnen:{' '}
          <b className="text-text">
            {module} Module × {KOMPONENTEN.modul.watt} Watt ÷ 1'000 = {input.kwp} kWp
          </b>
          . Daraus werden über das Jahr rund {kwh(ergebnis.jahresertragKwh)} Strom.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { titel: KOMPONENTEN.modul.name, zusatz: `${KOMPONENTEN.modul.garantieJahre} Jahre Garantie · Hagelklasse ${KOMPONENTEN.modul.hagelklasse}` },
          { titel: KOMPONENTEN.wechselrichter.name, zusatz: KOMPONENTEN.wechselrichter.hinweis },
          {
            titel: speicherModule > 0 ? KOMPONENTEN.speicher.name : 'Speicher-Vorbereitung',
            zusatz: speicherModule > 0 ? KOMPONENTEN.speicher.hinweis : 'Der Wechselrichter ist Battery-Ready',
          },
        ].map((t) => (
          <div key={t.titel} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[12px] font-bold text-text mb-1">{t.titel}</div>
            <div className="text-[10px] text-text-dim leading-snug">{t.zusatz}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
