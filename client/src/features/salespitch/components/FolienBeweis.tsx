import { Coins, Gift, Zap, Check, Minus, TrendingUp, Target } from 'lucide-react'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')
const chfK = (n: number) => Math.round(n).toLocaleString('de-CH')

/**
 * Die beweisführenden Folien: woraus der Vorteil entsteht, was in der
 * Vergangenheit belegt ist, wann sich die Anlage umdreht und was NEOSOLAR
 * von einem beliebigen Anbieter unterscheidet.
 *
 * Alle Werte gerechnet, alle Aussagen aus der NEOSOLAR-Praesentation belegt.
 */

/** Woraus sich der wirtschaftliche Vorteil zusammensetzt – drei Bausteine. */
export function FolienDreiBausteine({
  ergebnis,
  config,
}: {
  ergebnis: CalculatorResult
  config: CalculatorConfig
}) {
  const jahre = config.betrachtungsJahre
  const eingespart = ergebnis.jahresverlauf.reduce(
    (s, z) => s + (z.eigenverbrauchKwh * z.strompreisRp) / 100,
    0
  )
  const einspeisung = ergebnis.jahresverlauf.reduce(
    (s, z) => s + (z.einspeisungKwh * config.einspeiseverguetungRp) / 100,
    0
  )
  const foerderung = ergebnis.foerderung
  const summe = eingespart + einspeisung + foerderung

  const bausteine = [
    {
      nr: '1',
      icon: Coins,
      farbe: '#34D399',
      titel: 'Strom, den Sie nicht kaufen müssen',
      wert: eingespart,
      erklaerung:
        'Jede Kilowattstunde vom eigenen Dach ersetzt eine, die Sie sonst zum Netztarif einkaufen. Das ist der grösste Posten – und er wächst, weil Netzstrom teurer wird.',
      pro: `${ergebnis.eigenverbrauchKwh.toLocaleString('de-CH')} kWh pro Jahr selbst genutzt`,
    },
    {
      nr: '2',
      icon: Zap,
      farbe: '#60A5FA',
      titel: 'Vergütung für eingespeisten Strom',
      wert: einspeisung,
      erklaerung:
        'Was Sie nicht selbst brauchen, nimmt Ihr Netzbetreiber ab und vergütet es. Ein Speicher verschiebt diesen Anteil nach unten – dafür sparen Sie mehr beim Einkauf.',
      pro: `${ergebnis.einspeisungKwh.toLocaleString('de-CH')} kWh pro Jahr zu ${config.einspeiseverguetungRp} Rp.`,
    },
    {
      nr: '3',
      icon: Gift,
      farbe: '#F59E0B',
      titel: 'Förderbeitrag vom Bund',
      wert: foerderung,
      erklaerung:
        'Die Einmalvergütung von Pronovo erhalten Sie einmalig nach der Inbetriebnahme. Wir stellen den Antrag für Sie.',
      pro: 'einmalig, direkt nach Inbetriebnahme',
    },
  ]

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Woher das Geld kommt</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Ihr Vorteil hat drei Quellen
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Damit Sie nachvollziehen können, wie die Zahlen entstehen – kein Taschenspielertrick.
      </p>

      <div className="space-y-3 mb-6">
        {bausteine.map((b) => (
          <div
            key={b.nr}
            className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${b.farbe} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${b.farbe} 24%, transparent)`,
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${b.farbe} 18%, transparent)` }}
            >
              <b.icon size={20} strokeWidth={1.8} style={{ color: b.farbe }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-text mb-1">
                <span style={{ color: b.farbe }}>{b.nr}.</span> {b.titel}
              </div>
              <div className="text-[11px] text-text-dim leading-snug mb-1">{b.erklaerung}</div>
              <div className="text-[11px] text-text-sec">{b.pro}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[24px] font-bold tabular-nums leading-none" style={{ color: b.farbe }}>
                {chf(b.wert)}
              </div>
              <div className="text-[10px] text-text-dim mt-1">über {jahre} Jahre</div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, #F59E0B 12%, transparent)',
          border: '1px solid color-mix(in srgb, #F59E0B 32%, transparent)',
        }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Summe der drei Bausteine
          </div>
          <div className="text-[13px] text-text-sec">
            dem gegenüber steht Ihre Investition von {chf(ergebnis.nettoInvestition)}
          </div>
        </div>
        <div className="text-[36px] font-bold text-amber tabular-nums leading-none">{chf(summe)}</div>
      </div>
    </div>
  )
}

/**
 * Strompreis-Rückblick: was in der Vergangenheit tatsaechlich passiert ist.
 * Belegte Zahlen wirken staerker als jede Prognose.
 */
export function FolienRueckblick({
  ergebnis,
}: {
  ergebnis: CalculatorResult
}) {
  // ElCom-Haushaltstarife (Profil H4), Rp./kWh
  const tarife = [
    { jahr: 2012, preis: 20.7 },
    { jahr: 2020, preis: 21.0 },
    { jahr: 2022, preis: 21.2 },
    { jahr: 2023, preis: 27.2 },
    { jahr: 2024, preis: 32.1 },
    { jahr: 2025, preis: 29.0 },
    { jahr: 2026, preis: 27.7 },
  ]
  const max = Math.max(...tarife.map((t) => t.preis))
  const start = tarife[0]
  const jetzt = tarife[tarife.length - 1]
  const steigerung = ((jetzt.preis / start.preis - 1) * 100).toFixed(0)
  const verbrauch = ergebnis.prognoseVerbrauchKwh

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-4xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Ein Blick zurück</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Das ist keine Prognose – das ist passiert
      </h2>
      <p className="text-[14px] text-text-sec mb-8">
        Dokumentierte Schweizer Haushaltstarife der letzten Jahre, Profil H4.
      </p>

      <div className="flex items-end gap-2 sm:gap-3 h-52 mb-3">
        {tarife.map((t) => {
          const istJetzt = t.jahr === jetzt.jahr
          return (
            <div key={t.jahr} className="flex-1 flex flex-col items-center gap-2">
              <span
                className="text-[12px] font-bold tabular-nums"
                style={{ color: istJetzt ? '#F59E0B' : '#9CA3AF' }}
              >
                {t.preis}
              </span>
              <div
                className="w-full rounded-t-lg"
                style={{
                  height: `${(t.preis / max) * 100}%`,
                  background: istJetzt
                    ? 'linear-gradient(180deg, color-mix(in srgb, #F59E0B 70%, transparent), color-mix(in srgb, #F59E0B 30%, transparent))'
                    : 'rgba(255,255,255,0.10)',
                  border: `1px solid ${istJetzt ? 'color-mix(in srgb, #F59E0B 60%, transparent)' : 'rgba(255,255,255,0.12)'}`,
                  borderBottom: 'none',
                }}
              />
              <span className="text-[10px] text-text-dim tabular-nums">{t.jahr}</span>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-text-dim mb-7 text-center">Rappen pro Kilowattstunde</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className="p-4 rounded-2xl sm:col-span-2"
          style={{
            background: 'color-mix(in srgb, #F87171 10%, transparent)',
            border: '1px solid color-mix(in srgb, #F87171 28%, transparent)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp size={16} strokeWidth={2} className="text-red" />
            <span className="text-[11px] uppercase tracking-wider text-text-dim font-semibold">
              Seit {start.jahr}
            </span>
          </div>
          <div className="text-[13px] text-text-sec">
            Der Tarif ist von {start.preis} auf {jetzt.preis} Rp. gestiegen –{' '}
            <b className="text-red">plus {steigerung} %</b>. Bei Ihrem Verbrauch von{' '}
            {verbrauch.toLocaleString('de-CH')} kWh sind das{' '}
            <b className="text-text">
              {chf(((jetzt.preis - start.preis) * verbrauch) / 100)}
            </b>{' '}
            mehr pro Jahr als damals.
          </div>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'color-mix(in srgb, #34D399 10%, transparent)',
            border: '1px solid color-mix(in srgb, #34D399 28%, transparent)',
          }}
        >
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
            Ihr Solarstrom
          </div>
          <div className="text-[26px] font-bold text-emerald leading-none tabular-nums mb-1">
            {ergebnis.lcoe} Rp.
          </div>
          <div className="text-[11px] text-text-sec">
            pro kWh – über die ganze Laufzeit, unabhängig vom Markt.
          </div>
        </div>
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Quelle: ElCom, Haushaltsprofil H4, Tarifjahre 2012–2026. Die Spitze 2024 und der Rückgang danach zeigen,
        wie stark Netzstrom schwankt.
      </p>
    </div>
  )
}

/** Amortisation als Zeitachse: wann kippt die Investition ins Plus. */
export function FolienAmortisation({
  ergebnis,
  config,
}: {
  ergebnis: CalculatorResult
  config: CalculatorConfig
}) {
  const jahre = config.betrachtungsJahre
  const breakEven = ergebnis.amortisationJahre
  const werte = ergebnis.jahresverlauf.map((z) => z.kumuliertChf)
  const min = Math.min(...werte, 0)
  const max = Math.max(...werte, 1)
  const spanne = max - min || 1

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Der Wendepunkt</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        {breakEven ? `Nach ${breakEven} Jahren verdient die Anlage` : 'Ihre Investition über die Laufzeit'}
      </h2>
      <p className="text-[14px] text-text-sec mb-8">
        Kumulierter Verlauf: erst zahlen Sie ein, dann arbeitet die Anlage für Sie.
      </p>

      {/* Verlaufsbalken */}
      <div className="relative mb-3" style={{ height: 190 }}>
        {/* Nulllinie */}
        <div
          className="absolute left-0 right-0"
          style={{ top: `${((max - 0) / spanne) * 100}%`, borderTop: '1px dashed rgba(255,255,255,0.25)' }}
        />
        <div className="flex items-stretch gap-[2px] h-full">
          {ergebnis.jahresverlauf.map((z) => {
            const positiv = z.kumuliertChf >= 0
            const nullLinie = ((max - 0) / spanne) * 100
            const wertLinie = ((max - z.kumuliertChf) / spanne) * 100
            const hoehe = Math.abs(nullLinie - wertLinie)
            return (
              <div key={z.jahr} className="flex-1 relative" title={`Jahr ${z.jahr}: ${chf(z.kumuliertChf)}`}>
                <div
                  className="absolute w-full rounded-sm"
                  style={{
                    top: positiv ? `${wertLinie}%` : `${nullLinie}%`,
                    height: `${hoehe}%`,
                    background: positiv
                      ? 'color-mix(in srgb, #34D399 55%, transparent)'
                      : 'color-mix(in srgb, #F87171 45%, transparent)',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-text-dim mb-7">
        <span>Jahr 1</span>
        {breakEven && <span className="text-amber font-semibold">Wendepunkt Jahr {breakEven}</span>}
        <span>Jahr {jahre}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ihre Investition', wert: chf(ergebnis.nettoInvestition), farbe: '#60A5FA' },
          { label: 'Amortisation', wert: breakEven ? `${breakEven} Jahre` : '—', farbe: '#F59E0B' },
          { label: `Plus nach ${jahre} Jahren`, wert: chf(werte[werte.length - 1] ?? 0), farbe: '#34D399' },
          { label: 'Rendite pro Jahr', wert: `${ergebnis.renditeProzent} %`, farbe: '#A78BFA' },
        ].map((k) => (
          <div
            key={k.label}
            className="p-4 rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${k.farbe} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${k.farbe} 26%, transparent)`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
              {k.label}
            </div>
            <div className="text-[20px] font-bold tabular-nums leading-none" style={{ color: k.farbe }}>
              {k.wert}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Die Module haben {30} Jahre Leistungsgarantie – die Anlage produziert also deutlich länger, als sie zum
        Amortisieren braucht.
      </p>
    </div>
  )
}

/** Was NEOSOLAR anders macht – nur belegte Punkte, keine Behauptungen über Dritte. */
export function FolienUnterschied() {
  const punkte = [
    { thema: 'Preis', neosolar: 'Festpreis, schriftlich zugesichert', andere: 'oft Nachträge nach Baubeginn' },
    { thema: 'Umfang', neosolar: 'Alles aus einer Hand – ein Vertrag, ein Ansprechpartner', andere: 'mehrere Firmen koordinieren Sie selbst' },
    { thema: 'Bewilligungen', neosolar: 'Baugesuch, Netzanmeldung, Pronovo – machen wir', andere: 'häufig Sache des Kunden' },
    { thema: 'Termin', neosolar: 'Ab Baubewilligung maximal 2 Monate', andere: 'unverbindliche Zeitangaben' },
    { thema: 'Planung', neosolar: 'Drohnenvermessung vor dem verbindlichen Angebot', andere: 'Abschätzung nach Fotos' },
    { thema: 'Komponenten', neosolar: 'LONGi und Huawei, 30 Jahre Modulgarantie', andere: 'wechselnde Verfügbarkeit' },
  ]

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2.5 mb-2">
        <Target size={20} strokeWidth={1.8} className="text-amber" />
        <h2 className="text-[28px] sm:text-[32px] font-bold text-text">Worauf Sie beim Vergleichen achten sollten</h2>
      </div>
      <p className="text-[14px] text-text-sec mb-7">
        Holen Sie ruhig weitere Offerten ein. Diese sechs Punkte entscheiden am Ende über den Preis.
      </p>

      <div className="space-y-2">
        <div
          className="grid gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-text-dim font-semibold"
          style={{ gridTemplateColumns: '110px 1fr 1fr' }}
        >
          <div />
          <div>NEOSOLAR</div>
          <div>Worauf Sie sonst achten müssen</div>
        </div>
        {punkte.map((p, i) => (
          <div
            key={p.thema}
            className="grid gap-3 px-4 py-3 rounded-xl items-start"
            style={{
              gridTemplateColumns: '110px 1fr 1fr',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="text-[12px] font-bold text-text">{p.thema}</div>
            <div className="flex items-start gap-2">
              <Check size={14} strokeWidth={2.5} className="text-emerald shrink-0 mt-0.5" />
              <span className="text-[12px] text-text-sec leading-snug">{p.neosolar}</span>
            </div>
            <div className="flex items-start gap-2">
              <Minus size={14} strokeWidth={2.5} className="text-text-dim shrink-0 mt-0.5" />
              <span className="text-[12px] text-text-dim leading-snug">{p.andere}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Die rechte Spalte beschreibt verbreitete Praxis in der Branche, keine Aussage über einen bestimmten
        Mitbewerber. Fragen Sie in jeder Offerte konkret nach diesen sechs Punkten.
      </p>
    </div>
  )
}

/** Personalisierte Kopfzeile im Stil einer persoenlichen Unterlage. */
export function FolienPersoenlich({
  kunde,
  input,
  ergebnis,
}: {
  kunde?: string
  input: CalculatorInput
  ergebnis: CalculatorResult
}) {
  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-4xl mx-auto w-full text-center">
      <p className="text-[11px] uppercase tracking-[0.25em] text-amber mb-4">
        Persönliche Unterlage
      </p>
      <h2 className="text-[34px] sm:text-[44px] font-bold text-text leading-tight mb-4">
        {kunde ? `Für ${kunde}` : 'Für Sie zusammengestellt'}
      </h2>
      <p className="text-[15px] text-text-sec mb-10 max-w-xl mx-auto">
        Alle folgenden Zahlen sind mit Ihren Angaben gerechnet – nicht mit Durchschnittswerten.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ihr Verbrauch', wert: `${chfK(input.verbrauchKwh)} kWh` },
          { label: 'Ihr Strompreis', wert: `${input.strompreisRp} Rp.` },
          { label: 'Geplante Anlage', wert: `${input.kwp} kWp` },
          { label: 'Ihre Ersparnis', wert: `${chf(ergebnis.ersparnisProMonat)}/Mt` },
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
            <div className="text-[19px] font-bold text-amber tabular-nums leading-none">{k.wert}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
