import { ShieldCheck, Home, Clock, TrendingUp, Sun, Info } from 'lucide-react'
import type { CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

/**
 * Warum eine eigene Anlage – jenseits der Zahlen.
 *
 * Die Rechenfolien zeigen, dass es sich lohnt. Diese Folie zeigt, wofür
 * es sich lohnt: Unabhängigkeit, Vorsorge, Werterhalt. Argumente, die
 * bleiben, wenn der Kunde am Abend mit seiner Frau darüber spricht.
 */
export function FolienVorteile({
  ergebnis,
  config,
}: {
  ergebnis: CalculatorResult
  config: CalculatorConfig
}) {
  const gruende = [
    {
      icon: ShieldCheck,
      farbe: '#34D399',
      titel: 'Ihre Familie ist geschützt',
      text:
        'Strompreise werden von Politik, Netzbetreibern und Weltmarkt gemacht – nicht von Ihnen. ' +
        'Mit eigener Produktion entscheiden Sie mit, was Ihr Strom kostet.',
      zahl: `${Math.round(ergebnis.autarkiegrad * 100)} %`,
      zahlText: 'Ihres Verbrauchs decken Sie selbst',
    },
    {
      icon: Clock,
      farbe: '#60A5FA',
      titel: 'Vorsorge für später',
      text:
        'Im Ruhestand steht weniger Geld zur Verfügung, die Fixkosten bleiben. Eine Anlage, ' +
        'die heute bezahlt wird, senkt genau dann die Rechnung – über zwanzig Jahre hinweg.',
      zahl: chf(ergebnis.gesamtErsparnis),
      zahlText: `gespart über ${config.betrachtungsJahre} Jahre`,
    },
    {
      icon: Home,
      farbe: '#A78BFA',
      titel: 'Ihr Haus gewinnt an Wert',
      text:
        'Eine moderne Anlage mit Speicher verbessert die Energiebilanz des Gebäudes. ' +
        'Beim Verkauf ist das ein Argument, das im Preis ankommt.',
      zahl: `${Math.round(ergebnis.co2EinsparungKgProJahr / 1000 * 10) / 10} t`,
      zahlText: 'weniger CO₂ pro Jahr',
    },
    {
      icon: Sun,
      farbe: '#F59E0B',
      titel: 'Einfach Ruhe haben',
      text:
        'Anlage läuft, App zeigt was passiert, wir kümmern uns um den Rest. Kein Papierkrieg ' +
        'mit Behörden, keine Suche nach Handwerkern, keine Diskussion bei einer Störung.',
      zahl: '24/7',
      zahlText: 'Störungsservice inklusive',
    },
  ]

  /**
   * Renditevergleich.
   *
   * Bewusst mit Bandbreiten statt Punktwerten: Aktien und erst recht
   * Bitcoin schwanken, und wer hier eine feste Zahl hinschreibt, macht
   * ein Versprechen, das er nicht halten kann. Der Punkt ist nicht, dass
   * Solar mehr bringt – sondern dass es planbar ist.
   */
  const anlagen = [
    {
      name: 'Ihre Solaranlage',
      rendite: ergebnis.irr !== null ? `${ergebnis.irr} %` : `${ergebnis.renditeProzent} %`,
      wert: ergebnis.irr !== null ? Math.max(0, ergebnis.irr) : Math.max(0, ergebnis.renditeProzent),
      schwankung: 'sehr gering',
      farbe: '#F59E0B',
      hinweis: 'Sie kennen den Ertrag im Voraus – die Sonne verhandelt nicht',
      hervor: true,
    },
    {
      name: 'Sparkonto',
      rendite: '0.3 – 1 %',
      wert: 0.7,
      schwankung: 'keine',
      farbe: '#94A3B8',
      hinweis: 'Sicher, aber unter der Teuerung',
    },
    {
      name: 'Aktien (SMI, langfristig)',
      rendite: '5 – 7 %',
      wert: 6,
      schwankung: 'hoch',
      farbe: '#60A5FA',
      hinweis: 'Historischer Durchschnitt, einzelne Jahre auch deutlich negativ',
    },
    {
      name: 'Bitcoin',
      rendite: 'nicht vorhersehbar',
      wert: 9,
      schwankung: 'sehr hoch',
      farbe: '#A78BFA',
      hinweis: 'Kann sich vervielfachen oder halbieren – beides kam vor',
    },
  ]
  const maxWert = Math.max(...anlagen.map((a) => a.wert), 10)

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Was Sie davon haben</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Mehr als eine Stromrechnung
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Die Zahlen haben Sie gesehen. Hier steht, was dahinter steckt.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {gruende.map((g) => (
          <div
            key={g.titel}
            className="p-5 rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${g.farbe} 7%, transparent)`,
              border: `1px solid color-mix(in srgb, ${g.farbe} 22%, transparent)`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <g.icon size={24} strokeWidth={1.6} style={{ color: g.farbe }} />
              <div className="text-right">
                <div className="text-[22px] font-bold tabular-nums leading-none" style={{ color: g.farbe }}>
                  {g.zahl}
                </div>
                <div className="text-[10px] text-text-dim mt-1">{g.zahlText}</div>
              </div>
            </div>
            <h3 className="text-[15px] font-bold text-text mb-1.5">{g.titel}</h3>
            <p className="text-[12px] text-text-sec leading-relaxed">{g.text}</p>
          </div>
        ))}
      </div>

      {/* Renditevergleich */}
      <div
        className="p-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={17} strokeWidth={1.8} className="text-amber" />
          <h3 className="text-[15px] font-bold text-text">Wo Ihr Geld sonst arbeiten könnte</h3>
        </div>
        <p className="text-[12px] text-text-dim mb-5">
          Jährliche Rendite im Vergleich. Entscheidend ist nicht nur die Höhe, sondern wie sicher
          sie ist.
        </p>

        <div className="space-y-3">
          {anlagen.map((a) => (
            <div key={a.name}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span
                  className="text-[13px]"
                  style={{ color: a.hervor ? '#F59E0B' : undefined, fontWeight: a.hervor ? 700 : 500 }}
                >
                  {a.name}
                </span>
                <span className="text-[14px] font-bold tabular-nums shrink-0" style={{ color: a.farbe }}>
                  {a.rendite}
                </span>
              </div>
              <div className="h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-lg flex items-center px-3"
                  style={{
                    width: `${Math.max(8, (a.wert / maxWert) * 100)}%`,
                    background: a.hervor
                      ? `linear-gradient(90deg, ${a.farbe}, color-mix(in srgb, ${a.farbe} 70%, #FBBF24))`
                      : `color-mix(in srgb, ${a.farbe} 55%, transparent)`,
                  }}
                >
                  <span className="text-[10px] font-semibold" style={{ color: a.hervor ? '#06080C' : '#E5E7EB' }}>
                    Schwankung: {a.schwankung}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-text-dim mt-1">{a.hinweis}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Info size={13} strokeWidth={1.8} className="text-text-dim shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-dim leading-relaxed">
            Aktien- und Bitcoin-Werte sind Erfahrungswerte der Vergangenheit und keine Zusage für
            die Zukunft. Der Unterschied zur Solaranlage: Deren Ertrag hängt an der Sonne über
            Ihrem Dach, nicht an Börsenkursen. Ausserdem ist es die einzige dieser Anlagen, die
            gleichzeitig Ihre laufenden Kosten senkt.
          </p>
        </div>
      </div>
    </div>
  )
}
