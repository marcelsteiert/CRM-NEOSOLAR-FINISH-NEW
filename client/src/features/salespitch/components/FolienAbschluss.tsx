import {
  ShieldCheck, Clock, BadgeCheck, Wrench, Wallet, FileCheck2, HelpCircle,
  PenLine, ArrowRight, Sun, Award,
} from 'lucide-react'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

/**
 * Abschluss-Sektion der Praesentation: Sicherheiten, typische Fragen und
 * die Entscheidungsfolie.
 *
 * Alle Zusagen stammen aus der NEOSOLAR-Verkaufspraesentation
 * (Festpreis, Zeitgarantie, 30 Jahre Modulgarantie). Bewusst KEINE
 * erfundenen Zahlungs- oder Widerrufskonditionen und keine fremden
 * Bewertungsergebnisse.
 *
 * Zur Preissprache: Wir sagen Festpreis und meinen Festpreis. Der frueher
 * genannte Zusatz "Abweichung bis CHF 2000" hat die Zusage aufgehoben,
 * kaum war sie ausgesprochen. Die Richtofferte beruht auf Katasterdaten,
 * der Festpreis entsteht nach der Vermessung – das ist die eine Aussage,
 * die ueberall gleich lauten muss.
 */

export function FolienSicherheiten() {
  const garantien = [
    {
      icon: ShieldCheck,
      farbe: '#34D399',
      titel: '100 % Festpreis',
      text: 'Der vereinbarte Preis bleibt bestehen – von der Planung bis zur Installation. Erweiterungen nur auf Ihren ausdrücklichen Wunsch und nach vorheriger Abstimmung.',
    },
    {
      icon: Clock,
      farbe: '#60A5FA',
      titel: 'Zeitgarantie: maximal 2 Monate',
      text: 'Ab Baubewilligung bis zur fertig montierten Anlage. Die Planung der Offerte dauert 1–2 Wochen.',
    },
    {
      icon: BadgeCheck,
      farbe: '#F59E0B',
      titel: `${KOMPONENTEN.modul.garantieJahre} Jahre Garantie auf die Modulleistung`,
      text: `${KOMPONENTEN.modul.name}, Hagelklasse ${KOMPONENTEN.modul.hagelklasse} – geprüft für Schweizer Wetter.`,
    },
    {
      icon: Wrench,
      farbe: '#A78BFA',
      titel: 'Alles aus einer Hand',
      text: 'Planung, Baugesuch, Netzanmeldung, Montage, Elektro, Inbetriebnahme und Förderantrag – ein Ansprechpartner, ein Vertrag.',
    },
    {
      icon: FileCheck2,
      farbe: '#34D399',
      titel: 'Verbindlich nach Vermessung',
      text: 'Nach Ihrer Zusage vermessen wir das Dach mit der Drohne. Daraus entsteht Ihr Festpreis – ohne Nachträge.',
    },
    {
      icon: Wallet,
      farbe: '#FBBF24',
      titel: 'Keine versteckten Kosten',
      text: 'Kein Nachtragsgeschäft, keine Zusatzgebühren. Was in der Offerte steht, ist der Umfang.',
    },
  ]

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Ihre Sicherheit</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Worauf Sie sich verlassen können
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Eine Solaranlage ist eine Investition für 25 Jahre und mehr. Deshalb legen wir alles schriftlich fest.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {garantien.map((g) => (
          <div
            key={g.titel}
            className="p-4 rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${g.farbe} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${g.farbe} 26%, transparent)`,
            }}
          >
            <g.icon size={20} strokeWidth={1.8} style={{ color: g.farbe }} className="mb-2.5" />
            <div className="text-[13px] font-bold text-text mb-1.5 leading-snug">{g.titel}</div>
            <div className="text-[11px] text-text-dim leading-snug">{g.text}</div>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-5 mt-6 p-5 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
          border: '1px solid color-mix(in srgb, #F59E0B 28%, transparent)',
        }}
      >
        <Award size={28} strokeWidth={1.7} className="text-amber shrink-0" />
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          {[
            ['70+', 'installierte Anlagen'],
            ['300+', 'Anlagen Team-Erfahrung'],
            ['13+', 'Mitarbeitende'],
            ['7+', 'Jahre Erfahrung'],
          ].map(([wert, label]) => (
            <div key={label}>
              <span className="text-[22px] font-bold text-amber tabular-nums">{wert}</span>{' '}
              <span className="text-[12px] text-text-sec">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FolienHaeufigeFragen() {
  const fragen = [
    {
      frage: 'Was passiert, wenn mein Dach doch nicht so ist wie geplant?',
      antwort:
        'Nach Ihrer Zusage vermessen wir das Dach mit der Drohne. Erst danach entsteht Ihr verbindlicher Festpreis. Sie sehen ihn, bevor Sie sich endgültig festlegen – und entscheiden dann erneut.',
    },
    {
      frage: 'Was ist mit Hagel und Sturm?',
      antwort: `Die Module sind nach Hagelklasse ${KOMPONENTEN.modul.hagelklasse} geprüft. Die Anlage ist über Ihre Gebäudeversicherung mitversichert – wir sagen Ihnen, was Sie Ihrer Versicherung melden müssen.`,
    },
    {
      frage: 'Und wenn ich später eine Wärmepumpe oder ein E-Auto kaufe?',
      antwort:
        'Genau darauf legen wir die Anlage aus. Der Wechselrichter ist Battery-Ready, der Speicher lässt sich in 6.9-kWh-Schritten erweitern, und die Wallbox kann jederzeit nachgerüstet werden.',
    },
    {
      frage: 'Muss ich mich um Bewilligungen kümmern?',
      antwort:
        'Nein. Wir übernehmen Baugesuch, Netzanmeldung (TAG und IA) und den Förderantrag bei Pronovo. Sie unterschreiben, wir erledigen den Papierkram.',
    },
    {
      frage: 'Wie lange dauert es, bis die Anlage läuft?',
      antwort:
        'Die Planung 1–2 Wochen. Ab Baubewilligung bis zur fertigen Montage maximal zwei Monate. Die Montage selbst dauert wenige Arbeitstage.',
    },
    {
      frage: 'Was, wenn ich das Haus verkaufe?',
      antwort:
        'Die Anlage ist Teil der Liegenschaft und steigert deren Wert. Alle Unterlagen, Garantien und die Anlagendokumentation gehen an den Käufer über.',
    },
  ]

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2.5 mb-2">
        <HelpCircle size={20} strokeWidth={1.8} className="text-amber" />
        <h2 className="text-[28px] sm:text-[32px] font-bold text-text">Was Kunden uns oft fragen</h2>
      </div>
      <p className="text-[14px] text-text-sec mb-7">
        Und falls Ihre Frage nicht dabei ist – fragen Sie jetzt.
      </p>

      <div className="space-y-2.5">
        {fragen.map((f) => (
          <div
            key={f.frage}
            className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[14px] font-bold text-text mb-1.5">{f.frage}</div>
            <div className="text-[12px] text-text-sec leading-relaxed">{f.antwort}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Die Entscheidungsfolie: fasst die gewaehlte Variante zusammen und benennt
 * den naechsten Schritt konkret. Letzte Folie vor der Unterschrift.
 */
export function FolienEntscheidung({
  input,
  ergebnis,
  config,
  variantenName,
  kunde,
}: {
  input: CalculatorInput
  ergebnis: CalculatorResult
  config: CalculatorConfig
  variantenName: string
  kunde?: string
}) {
  const module = Math.round((input.kwp * 1000) / KOMPONENTEN.modul.watt)
  const speicherModule = input.speicherKwh > 0 ? Math.round(input.speicherKwh / KOMPONENTEN.speicher.modulKwh) : 0

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Ihre Entscheidung</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-1.5">
        {kunde ? `${kunde}, das ist Ihr Paket` : 'Das ist Ihr Paket'}
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Variante «{variantenName}» – so wie wir sie gemeinsam geplant haben.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-5 mb-6">
        {/* Umfang */}
        <div
          className="p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sun size={16} strokeWidth={1.8} className="text-amber" />
            <h3 className="text-[13px] font-bold text-text">Ihr Umfang</h3>
          </div>
          <ul className="space-y-2 text-[12px]">
            {[
              `${module} Solarmodule ${KOMPONENTEN.modul.name} · ${input.kwp} kWp`,
              `Wechselrichter ${KOMPONENTEN.wechselrichter.name}, hybrid und Battery-Ready`,
              speicherModule > 0
                ? `Batteriespeicher ${KOMPONENTEN.speicher.name} · ${input.speicherKwh} kWh`
                : 'Speicher-Vorbereitung – jederzeit nachrüstbar',
              input.wallbox ? `Wallbox ${KOMPONENTEN.wallbox.name}` : null,
              'Montagesystem, DC- und AC-Installation',
              'Baugesuch, Netzanmeldung, Pronovo-Förderantrag',
              'Montage und Inbetriebnahme – schlüsselfertig',
            ]
              .filter(Boolean)
              .map((z) => (
                <li key={z as string} className="flex items-start gap-2">
                  <BadgeCheck size={14} strokeWidth={2} className="text-emerald shrink-0 mt-0.5" />
                  <span className="text-text-sec leading-snug">{z}</span>
                </li>
              ))}
          </ul>
        </div>

        {/* Zahlen */}
        <div className="space-y-3">
          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 30%, transparent)',
            }}
          >
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[12px] text-text-sec">Rechnungsbetrag inkl. MWST</span>
              <span className="text-[13px] text-text tabular-nums">{chf(ergebnis.werklohn)}</span>
            </div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[12px] text-text-sec">− Förderung Pronovo</span>
              <span className="text-[13px] text-emerald tabular-nums">− {chf(ergebnis.foerderung)}</span>
            </div>
            {ergebnis.steuerabzug > 0 && (
              <div className="flex justify-between items-baseline mb-2.5">
                <span className="text-[12px] text-text-sec">− erwartete Steuerersparnis</span>
                <span className="text-[13px] text-emerald tabular-nums">− {chf(ergebnis.steuerabzug)}</span>
              </div>
            )}
            <div
              className="flex justify-between items-baseline pt-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
            >
              <span className="text-[14px] font-bold text-text">Ihre effektiven Kosten</span>
              <span className="text-[26px] font-bold text-amber tabular-nums leading-none">
                {chf(ergebnis.nettoInvestition)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Ersparnis pro Monat', wert: chf(ergebnis.ersparnisProMonat), farbe: '#34D399' },
              { label: 'Amortisation', wert: ergebnis.amortisationJahre ? `${ergebnis.amortisationJahre} J.` : '—', farbe: '#60A5FA' },
              { label: 'Unabhängigkeit', wert: `${Math.round(ergebnis.autarkiegrad * 100)} %`, farbe: '#A78BFA' },
              { label: `Ersparnis ${config.betrachtungsJahre} J.`, wert: chf(ergebnis.gesamtErsparnis), farbe: '#FBBF24' },
            ].map((k) => (
              <div
                key={k.label}
                className="p-3.5 rounded-xl"
                style={{
                  background: `color-mix(in srgb, ${k.farbe} 9%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${k.farbe} 24%, transparent)`,
                }}
              >
                <div className="text-[9px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                  {k.label}
                </div>
                <div className="text-[19px] font-bold tabular-nums leading-none" style={{ color: k.farbe }}>
                  {k.wert}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Naechster Schritt */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, #34D399 10%, transparent)',
          border: '1px solid color-mix(in srgb, #34D399 30%, transparent)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <PenLine size={17} strokeWidth={1.8} className="text-emerald" />
          <h3 className="text-[14px] font-bold text-text">Wenn Sie heute zusagen</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { nr: '1', titel: 'Drohnenvermessung', text: 'Wir vermessen Ihr Dach und bestätigen den finalen Preis.' },
            { nr: '2', titel: 'Verbindliches Angebot', text: 'Sie unterschreiben mit voller Kostensicherheit.' },
            { nr: '3', titel: 'Umsetzung', text: 'Wir übernehmen Bewilligungen und Montage – max. 2 Monate.' },
          ].map((s) => (
            <div key={s.nr} className="flex gap-2.5">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-emerald shrink-0"
                style={{ background: 'color-mix(in srgb, #34D399 18%, transparent)' }}
              >
                {s.nr}
              </div>
              <div>
                <div className="text-[12px] font-bold text-text mb-0.5">{s.titel}</div>
                <div className="text-[11px] text-text-dim leading-snug">{s.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <ArrowRight size={15} strokeWidth={2} className="text-emerald shrink-0" />
          <p className="text-[12px] text-text-sec">
            Die Richtofferte drucken wir Ihnen direkt aus – Sie nehmen alle Zahlen schriftlich mit.
          </p>
        </div>
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Richtofferte auf Basis der heute besprochenen Angaben und öffentlicher Geodaten. Ertrag, Eigenverbrauch
        und Autarkie sind rechnerische Prognosen. Strompreisannahme {input.strompreisRp} Rp./kWh mit{' '}
        {(config.strompreisSteigerung * 100).toFixed(1)} % Steigerung pro Jahr – keine Preisgarantie.
        Förderbeitrag nach Pronovo-Tarif, verbindlich ist der Pronovo-Tarifrechner.
      </p>
    </div>
  )
}
