import { useState } from 'react'
import { TrendingDown, Wallet, Receipt, Percent, ArrowRight, Info } from 'lucide-react'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'
import { berechneFinanzierung } from '../../../lib/pvCalculator'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')
const chfKurz = (n: number) => Math.round(n).toLocaleString('de-CH')

/**
 * Die geldgetriebenen Folien – der Teil, der beim Kunden die Entscheidung
 * ausloest. Aufbau nach bewaehrter Branchendramaturgie, aber durchgehend
 * mit den eigenen berechneten Werten.
 *
 * Bewusst NICHT enthalten: Stromhandel/Direktvermarktung und eigener
 * Stromtarif (bietet NEOSOLAR nicht an) sowie erfundene Rabatt- oder
 * Zahlungsversprechen.
 */

/**
 * Gesamtvergleich ueber den Betrachtungszeitraum: Nichtstun kostet auch Geld.
 * Stellt die Vollkosten gegenueber – inklusive der Investition.
 */
export function FolienGesamtvergleich({
  ergebnis,
  config,
}: {
  ergebnis: CalculatorResult
  config: CalculatorConfig
}) {
  const jahre = config.betrachtungsJahre

  // Einspeiseerloese ueber die Laufzeit separat ausweisen – der Kunde soll
  // sehen, dass ein Teil der Investition zurueckkommt.
  const einspeiseErloes = ergebnis.jahresverlauf.reduce(
    (s, z) => s + (z.einspeisungKwh * config.einspeiseverguetungRp) / 100,
    0
  )
  const betriebskosten = config.betriebskostenProJahr * jahre

  const ohne = ergebnis.stromkostenOhneAnlage
  const mit = ergebnis.stromkostenMitAnlage + ergebnis.nettoInvestition + betriebskosten - einspeiseErloes
  const vorteil = ohne - mit
  const senkung = ohne > 0 ? Math.round(((ohne - ergebnis.stromkostenMitAnlage) / ohne) * 100) : 0
  const maxWert = Math.max(ohne, mit, 1)

  const balken = (
    posten: Array<{ label: string; wert: number; farbe: string }>,
    summe: number,
    titel: string,
    hervor: boolean
  ) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] font-bold text-text">{titel}</span>
        <span
          className="text-[22px] font-bold tabular-nums leading-none"
          style={{ color: hervor ? '#34D399' : '#F87171' }}
        >
          {chf(summe)}
        </span>
      </div>
      <div
        className="flex h-11 rounded-xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)', width: `${(summe / maxWert) * 100}%`, minWidth: '35%' }}
      >
        {posten
          .filter((p) => p.wert > 0)
          .map((p) => (
            <div
              key={p.label}
              title={`${p.label}: ${chf(p.wert)}`}
              style={{
                width: `${(p.wert / summe) * 100}%`,
                background: `color-mix(in srgb, ${p.farbe} 55%, transparent)`,
                borderRight: '1px solid rgba(6,8,12,0.35)',
              }}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {posten.map((p) => (
          <div key={p.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: `color-mix(in srgb, ${p.farbe} 55%, transparent)` }}
            />
            <span className="text-[11px] text-text-dim">
              {p.label} <b className="text-text-sec tabular-nums">{p.wert < 0 ? '−' : ''}{chfKurz(Math.abs(p.wert))}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Der Vergleich, der zählt</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Was Sie über {jahre} Jahre wirklich bezahlen
      </h2>
      <p className="text-[14px] text-text-sec mb-8">
        Nicht nur der Anlagenpreis – die Vollkosten auf beiden Seiten, inklusive Investition, Betrieb und
        Einspeiseerlös.
      </p>

      <div className="space-y-7 mb-8">
        {balken(
          [{ label: 'Stromrechnung', wert: ohne, farbe: '#F87171' }],
          ohne,
          'Ohne Solaranlage',
          false
        )}
        {balken(
          [
            { label: 'Reststrom', wert: ergebnis.stromkostenMitAnlage, farbe: '#F59E0B' },
            { label: 'Ihre Investition', wert: ergebnis.nettoInvestition, farbe: '#60A5FA' },
            { label: 'Betrieb', wert: betriebskosten, farbe: '#A78BFA' },
            { label: 'Einspeiseerlös', wert: -einspeiseErloes, farbe: '#34D399' },
          ],
          mit,
          'Mit Ihrer Solaranlage',
          true
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className="p-5 rounded-2xl sm:col-span-2"
          style={{
            background: 'color-mix(in srgb, #34D399 12%, transparent)',
            border: '1px solid color-mix(in srgb, #34D399 32%, transparent)',
          }}
        >
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
            Ihr Gesamtvorteil über {jahre} Jahre
          </div>
          <div className="text-[42px] font-bold text-emerald leading-none tabular-nums mb-1.5">
            {chf(vorteil)}
          </div>
          <div className="text-[12px] text-text-sec">
            Das Geld bleibt bei Ihnen – statt beim Stromversorger.
          </div>
        </div>
        <div className="space-y-3">
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 28%, transparent)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown size={13} strokeWidth={2} className="text-amber" />
              <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">
                Stromkosten
              </span>
            </div>
            <div className="text-[24px] font-bold text-amber leading-none tabular-nums">−{senkung} %</div>
          </div>
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'color-mix(in srgb, #A78BFA 10%, transparent)',
              border: '1px solid color-mix(in srgb, #A78BFA 28%, transparent)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Percent size={13} strokeWidth={2} style={{ color: '#A78BFA' }} />
              <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Rendite</span>
            </div>
            <div className="text-[24px] font-bold leading-none tabular-nums" style={{ color: '#A78BFA' }}>
              {ergebnis.renditeProzent} %
            </div>
            <div className="text-[10px] text-text-dim mt-0.5">pro Jahr</div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Annahmen: Strompreissteigerung {(config.strompreisSteigerung * 100).toFixed(1)} % pro Jahr,
        Rückliefervergütung {config.einspeiseverguetungRp} Rp./kWh, Betriebskosten{' '}
        {chf(config.betriebskostenProJahr)} pro Jahr, Moduldegradation{' '}
        {(config.degradationProJahr * 100).toFixed(1)} % pro Jahr. Prognose, keine Garantie.
      </p>
    </div>
  )
}

/** Monatsvergleich: was zahle ich heute, was nachher. */
export function FolienMonatsvergleich({
  ergebnis,
  config,
}: {
  ergebnis: CalculatorResult
  config: CalculatorConfig
}) {
  const jahre = config.betrachtungsJahre
  const heuteMonat = ergebnis.jahresverlauf.length
    ? (ergebnis.prognoseVerbrauchKwh * ergebnis.jahresverlauf[0].strompreisRp) / 100 / 12
    : 0
  const restMonat = ergebnis.stromkostenMitAnlage / jahre / 12
  const einspeiseMonat =
    ergebnis.jahresverlauf.reduce((s, z) => s + (z.einspeisungKwh * config.einspeiseverguetungRp) / 100, 0) /
    jahre /
    12
  const nachher = Math.max(0, restMonat - einspeiseMonat)

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-4xl mx-auto w-full">
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">Ihre Stromrechnung pro Monat</h2>
      <p className="text-[14px] text-text-sec mb-9">
        Heute – und im Durchschnitt der nächsten {jahre} Jahre mit Ihrer Anlage.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-5 items-center mb-8">
        <div
          className="p-6 rounded-2xl text-center"
          style={{
            background: 'color-mix(in srgb, #F87171 10%, transparent)',
            border: '1px solid color-mix(in srgb, #F87171 30%, transparent)',
          }}
        >
          <Receipt size={22} strokeWidth={1.7} className="text-red mx-auto mb-3" />
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">Heute</div>
          <div className="text-[40px] font-bold text-red leading-none tabular-nums">{chfKurz(heuteMonat)}</div>
          <div className="text-[12px] text-text-sec mt-1">CHF pro Monat an den Stromversorger</div>
        </div>

        <ArrowRight size={26} strokeWidth={2} className="text-text-dim mx-auto hidden sm:block" />

        <div
          className="p-6 rounded-2xl text-center"
          style={{
            background: 'color-mix(in srgb, #34D399 12%, transparent)',
            border: '1px solid color-mix(in srgb, #34D399 32%, transparent)',
          }}
        >
          <Wallet size={22} strokeWidth={1.7} className="text-emerald mx-auto mb-3" />
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
            Mit Ihrer Anlage
          </div>
          <div className="text-[40px] font-bold text-emerald leading-none tabular-nums">
            {chfKurz(nachher)}
          </div>
          <div className="text-[12px] text-text-sec mt-1">CHF pro Monat im Durchschnitt</div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {[
          ['Reststrom vom Netz', restMonat, '#F59E0B'],
          ['− Vergütung für eingespeisten Strom', -einspeiseMonat, '#34D399'],
        ].map(([label, wert, farbe]) => (
          <div
            key={label as string}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-[12px] text-text-sec">{label as string}</span>
            <span className="text-[14px] font-bold tabular-nums" style={{ color: farbe as string }}>
              {(wert as number) < 0 ? '−' : ''}
              {chf(Math.abs(wert as number))}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-4 p-5 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
          border: '1px solid color-mix(in srgb, #F59E0B 28%, transparent)',
        }}
      >
        <div className="text-[34px] font-bold text-amber leading-none tabular-nums shrink-0">
          {chfKurz(Math.max(0, heuteMonat - nachher))}
        </div>
        <div className="text-[13px] text-text-sec">
          CHF weniger pro Monat – und der Betrag wächst, weil der Netzstrom teurer wird und Ihr Solarstrom
          gleich viel kostet.
        </div>
      </div>
    </div>
  )
}

/**
 * Finanzierungs-Beispielrechnung. Zins und Laufzeit sind im Termin
 * verstellbar, damit nichts Falsches suggeriert wird – NEOSOLAR vermittelt
 * keine Kredite, die Konditionen kommen von der Bank des Kunden.
 */
export function FolienFinanzierung({
  ergebnis,
  config,
}: {
  ergebnis: CalculatorResult
  config: CalculatorConfig
}) {
  const [zins, setZins] = useState(3.5)
  const [laufzeit, setLaufzeit] = useState(15)

  // Finanziert wird der Rechnungsbetrag inklusive MwSt – die Foerderung
  // trifft erst rund ein Jahr spaeter ein und dient als Sondertilgung.
  const fin = berechneFinanzierung(ergebnis, zins, laufzeit)
  const kredit = fin.kredit
  const rate = fin.monatsrate
  const gesamtKosten = fin.gesamtKosten
  const zinsKosten = fin.zinsKosten

  const heuteMonat = ergebnis.jahresverlauf.length
    ? (ergebnis.prognoseVerbrauchKwh * ergebnis.jahresverlauf[0].strompreisRp) / 100 / 12
    : 0
  const ersparnisMonat = ergebnis.ersparnisProMonat
  const differenz = rate - ersparnisMonat

  // Wortlaut wie im Werkvertrag und in der gedruckten Offerte
  const tranchen = [
    { name: 'A1', anteil: 50, wann: 'bei Unterzeichnung des Vertrags' },
    { name: 'A2', anteil: 40, wann: 'bei Lieferung des Materials' },
    { name: 'A3', anteil: 10, wann: 'nach Abschluss der Baustelle' },
  ]

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Kaufen oder finanzieren?
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Beides möglich. Hier sehen Sie, wie sich eine Finanzierung zu Ihrer heutigen Stromrechnung verhält.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Kauf */}
        <div
          className="p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-[14px] font-bold text-text mb-3">Kauf</h3>
          <div className="text-[32px] font-bold text-amber leading-none tabular-nums mb-1">
            {chf(ergebnis.werklohn)}
          </div>
          <p className="text-[12px] text-text-sec mb-4">
            Rechnungsbetrag inkl. MWST · effektiv {chf(ergebnis.nettoInvestition)} nach Förderung
            {ergebnis.steuerabzug > 0 ? ' und Steuerersparnis' : ''}
          </p>
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
            Zahlungsplan
          </div>
          <div className="space-y-1.5">
            {tranchen.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-[12px]">
                <span className="text-text-sec">
                  <b className="text-text">{t.anteil} %</b> {t.wann}
                </span>
                <span className="text-text tabular-nums font-semibold">
                  {chf((ergebnis.werklohn * t.anteil) / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Finanzierung */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'color-mix(in srgb, #60A5FA 9%, transparent)',
            border: '1px solid color-mix(in srgb, #60A5FA 28%, transparent)',
          }}
        >
          <h3 className="text-[14px] font-bold text-text mb-3">Finanzierung (Beispiel)</h3>
          <div className="text-[32px] font-bold leading-none tabular-nums mb-1" style={{ color: '#60A5FA' }}>
            {chf(rate)}
          </div>
          <p className="text-[12px] text-text-sec mb-4">
            pro Monat über {laufzeit} Jahre · Kreditbetrag {chf(kredit)} inkl. MWST
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-text-dim">Zinssatz</span>
                <span className="text-text font-semibold tabular-nums">{zins.toFixed(1)} %</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={0.1}
                value={zins}
                onChange={(e) => setZins(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ height: 5, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }}
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-text-dim">Laufzeit</span>
                <span className="text-text font-semibold tabular-nums">{laufzeit} Jahre</span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={laufzeit}
                onChange={(e) => setLaufzeit(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ height: 5, borderRadius: 999, appearance: 'none', background: 'rgba(255,255,255,0.12)' }}
              />
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-text-dim">Zinskosten insgesamt</span>
              <span className="text-text-sec tabular-nums">{chf(zinsKosten)}</span>
            </div>
            <div
              className="flex justify-between text-[11px] pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-text-dim">
                Rate nach Sondertilgung mit der Förderung ({chf(ergebnis.foerderung)})
              </span>
              <span className="tabular-nums font-semibold" style={{ color: '#34D399' }}>
                {chf(fin.rateNachSondertilgung)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Der entscheidende Vergleich */}
      <div
        className="p-5 rounded-2xl mb-5"
        style={{
          background: 'color-mix(in srgb, #34D399 10%, transparent)',
          border: '1px solid color-mix(in srgb, #34D399 30%, transparent)',
        }}
      >
        <h3 className="text-[13px] font-bold text-text mb-4">
          Finanzierungsrate gegen Ihre Stromersparnis
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
              Monatsrate
            </div>
            <div className="text-[24px] font-bold tabular-nums leading-none" style={{ color: '#60A5FA' }}>
              {chf(rate)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
              Ersparnis pro Monat
            </div>
            <div className="text-[24px] font-bold text-emerald tabular-nums leading-none">
              − {chf(ersparnisMonat)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
              {differenz > 0 ? 'Bleibt pro Monat' : 'Sie sparen zusätzlich'}
            </div>
            <div
              className="text-[24px] font-bold tabular-nums leading-none"
              style={{ color: differenz > 0 ? '#F59E0B' : '#34D399' }}
            >
              {chf(Math.abs(differenz))}
            </div>
          </div>
        </div>
        <p className="text-[12px] text-text-sec mt-4">
          {differenz <= 0 ? (
            <>
              Die Ersparnis trägt die Rate vollständig – die Anlage finanziert sich aus dem, was Sie heute
              ohnehin für Strom zahlen. Nach {laufzeit} Jahren gehört sie Ihnen und produziert weiter.
            </>
          ) : (
            <>
              Ihre heutige Stromrechnung liegt bei {chf(heuteMonat)} pro Monat. Von der Rate bleiben nach Abzug
              der Ersparnis {chf(differenz)} – nach {laufzeit} Jahren ist die Anlage bezahlt und produziert
              weitere Jahrzehnte.
            </>
          )}
        </p>
      </div>

      <div
        className="flex items-start gap-2.5 p-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}
      >
        <Info size={15} strokeWidth={1.8} className="text-text-dim shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-dim leading-relaxed">
          Unverbindliche Beispielrechnung mit frei gewähltem Zinssatz. NEOSOLAR vermittelt keine Kredite – die
          Konditionen erhalten Sie von Ihrer Bank. Der Zahlungsplan beim Kauf entspricht unseren üblichen
          Tranchen und wird im Vertrag festgelegt.
        </p>
      </div>
    </div>
  )
}
