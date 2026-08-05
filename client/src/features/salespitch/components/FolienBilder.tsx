import { CheckCircle2 } from 'lucide-react'

/**
 * Folien mit den Originalbildern aus der NEOSOLAR-Verkaufspraesentation.
 * Die Bilder liegen unter client/public/praesentation/ (aus der PPTX
 * extrahiert, skaliert und komprimiert: 26 MB -> 1.5 MB).
 */

const BILD = '/praesentation'

/** Grossflaechiges Bild mit Textspalte – das Layout der Produktfolien. */
export function BildFolie({
  bild,
  kategorie,
  titel,
  typ,
  punkte,
  hinweis,
  bildLinks = false,
}: {
  bild: string
  kategorie?: string
  titel: string
  typ?: string
  punkte: string[]
  hinweis?: string
  bildLinks?: boolean
}) {
  // Die Produktbilder stammen aus der PPTX und haben weissen Hintergrund.
  // Auf einer hellen Karte wirkt das wie ein Produktdatenblatt statt wie ein
  // Bild mit falschem Rand auf dunklem Grund.
  const bildSpalte = (
    <div className="flex items-center justify-center min-h-0">
      <div
        className="p-6 sm:p-9 flex items-center justify-center max-h-full"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(245,158,11,0.13), rgba(255,255,255,0.03) 62%, transparent 78%)',
          borderRadius: 26,
        }}
      >
        <img
          src={`${BILD}/${bild}`}
          alt={titel}
          className="max-h-full max-w-full object-contain"
          style={{ maxHeight: '60vh', filter: 'drop-shadow(0 22px 42px rgba(0,0,0,0.55))' }}
          loading="lazy"
        />
      </div>
    </div>
  )

  const textSpalte = (
    <div className="flex flex-col justify-center min-w-0">
      {kategorie && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">{kategorie}</p>
      )}
      <h2 className="text-[26px] sm:text-[32px] font-bold text-text leading-tight mb-1.5">{titel}</h2>
      {typ && <p className="text-[11px] text-text-dim font-mono mb-5">{typ}</p>}
      <ul className="space-y-2.5">
        {punkte.map((p) => (
          <li key={p} className="flex items-start gap-2.5">
            <CheckCircle2 size={16} strokeWidth={2} className="text-emerald shrink-0 mt-0.5" />
            <span className="text-[14px] text-text-sec leading-snug">{p}</span>
          </li>
        ))}
      </ul>
      {hinweis && <p className="text-[11px] text-text-dim mt-5">{hinweis}</p>}
    </div>
  )

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 px-6 sm:px-10 py-8 max-w-6xl mx-auto w-full">
      {bildLinks ? (
        <>
          {bildSpalte}
          {textSpalte}
        </>
      ) : (
        <>
          {textSpalte}
          {bildSpalte}
        </>
      )}
    </div>
  )
}

/** Titelfolie mit dem Originalbild im Hintergrund. */
export function BildTitelFolie({
  kunde,
  untertitel,
  adresse,
  berater,
}: {
  kunde?: string
  untertitel?: string
  adresse?: string
  berater?: string
}) {
  return (
    <div className="relative h-full overflow-hidden">
      <img
        src={`${BILD}/haus.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(6,8,12,0.35) 0%, rgba(6,8,12,0.72) 45%, rgba(6,8,12,0.95) 100%)' }}
      />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-8">
        <img src={`${BILD}/logo-hell.png`} alt="NEOSOLAR" className="h-14 object-contain mb-8" />
        <p className="text-[12px] uppercase tracking-[0.25em] text-amber mb-4">Ihr Beratungstermin</p>
        <h1 className="text-[40px] sm:text-[58px] font-bold text-text leading-[1.05] mb-5">
          {kunde ?? 'Ihre Solaranlage'}
        </h1>
        <p className="text-[16px] sm:text-[18px] text-text-sec max-w-xl">
          {untertitel ?? 'Wir planen heute gemeinsam Ihre Anlage – und Sie sehen sofort, was Sie damit sparen.'}
        </p>

        {/* Kundendaten – zeigt dem Kunden, dass die Unterlage fuer ihn gemacht ist */}
        {(adresse || berater) && (
          <div
            className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 mt-9 px-6 py-3.5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.055)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {adresse && (
              <span className="text-[13px] text-text-sec">
                <span className="text-text-dim">Objekt: </span>
                {adresse}
              </span>
            )}
            <span className="text-[13px] text-text-sec">
              <span className="text-text-dim">Termin: </span>
              {new Date().toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            {berater && (
              <span className="text-[13px] text-text-sec">
                <span className="text-text-dim">Ihr Berater: </span>
                {berater}
              </span>
            )}
          </div>
        )}

        <p className="text-[13px] text-text-dim mt-10">NEOSOLAR AG · Dein Schweizer Solarpartner</p>
      </div>
    </div>
  )
}

/** Das Team hinter NEOSOLAR – mit den Originalfotos. */
export function FolienTeam() {
  const zahlen = [
    ['70+', 'installierte Anlagen'],
    ['300+', 'Anlagen Team-Erfahrung'],
    ['13+', 'Mitarbeitende'],
    ['7+', 'Jahre Erfahrung'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-5xl mx-auto w-full">
      <h2 className="text-[30px] font-bold text-text mb-2">Die Gesichter hinter NEOSOLAR</h2>
      <p className="text-[14px] text-text-sec mb-8">
        Sie sprechen direkt mit der Geschäftsleitung – keine Callcenter-Kette.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { bild: 'team-1.jpg', name: 'Jon Turnes', rolle: 'Geschäftsleitung' },
          { bild: 'team-2.jpg', name: 'Eileen Moewe', rolle: 'Geschäftsleitung' },
        ].map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <img
              src={`${BILD}/${p.bild}`}
              alt={p.name}
              className="w-20 h-20 rounded-xl object-cover shrink-0"
              loading="lazy"
            />
            <div>
              <div className="text-[16px] font-bold text-text">{p.name}</div>
              <div className="text-[12px] text-text-dim">{p.rolle}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {zahlen.map(([wert, label]) => (
          <div
            key={label}
            className="p-4 rounded-2xl text-center"
            style={{
              background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 26%, transparent)',
            }}
          >
            <div className="text-[28px] font-bold text-amber leading-none mb-1.5">{wert}</div>
            <div className="text-[11px] text-text-sec leading-snug">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
        <div
          className="p-4 rounded-xl"
          style={{ background: 'color-mix(in srgb, #34D399 10%, transparent)', border: '1px solid color-mix(in srgb, #34D399 28%, transparent)' }}
        >
          <div className="text-[13px] font-bold text-text mb-1">Preisgarantie</div>
          <div className="text-[12px] text-text-sec">Festpreis, keine versteckten Kosten oder Gebühren.</div>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ background: 'color-mix(in srgb, #34D399 10%, transparent)', border: '1px solid color-mix(in srgb, #34D399 28%, transparent)' }}
        >
          <div className="text-[13px] font-bold text-text mb-1">Zeitgarantie</div>
          <div className="text-[12px] text-text-sec">
            Ab Baubewilligung bis zur fertigen Montage maximal zwei Monate.
          </div>
        </div>
      </div>
    </div>
  )
}

/** Bild-Folien der Produkte, aus der Originalpräsentation. */
export const ProduktFolien = {
  modul: () => (
    <BildFolie
      bild="modul.png"
      kategorie="Ihre Solarmodule"
      titel="LONGi Hi-MO X10 Explorer"
      typ="LR7-54HVH · 490 Watt"
      punkte={[
        '490 Watt pro Modul',
        '30 Jahre Garantie auf die Leistung',
        'Hagelklasse 3 – geprüft für Schweizer Wetter',
        'Sehr gutes Schwachlichtverhalten',
        'Glas-Folien-Aufbau',
      ]}
    />
  ),
  wechselrichter: () => (
    <BildFolie
      bild="wechselrichter.png"
      bildLinks
      kategorie="Ihr Wechselrichter"
      titel="Huawei SUN2000"
      typ="SUN2000-12/15/17/20/25K-MB0"
      punkte={[
        'Bis zu 30 % mehr Energie mit Optimizern',
        'Battery-Ready – Speicher jederzeit nachrüstbar',
        'AFCI Lichtbogen-Schutz für maximale Sicherheit',
        'Hybrid-Wechselrichter, bereit für die Zukunft',
      ]}
    />
  ),
  speicher: () => (
    <BildFolie
      bild="speicher.png"
      kategorie="Ihr Batteriespeicher"
      titel="Huawei LUNA2000"
      typ="LUNA2000-7/14/21-S1"
      punkte={[
        '6.9 kWh pro Modul, skalierbar bis 20.7 kWh pro Turm',
        'LFP-Zellchemie mit 100 % Entladetiefe',
        '5-stufiges Sicherheitskonzept, IP66-zertifiziert',
        'Löschkit pro Batteriemodul',
        'Betrieb von −20 °C bis +55 °C',
      ]}
    />
  ),
  wallbox: () => (
    <BildFolie
      bild="wallbox.png"
      bildLinks
      kategorie="Ihre Wallbox"
      titel="Huawei sCharger"
      typ="sCharger-7KS-S0 (7.4 kW) · sCharger-22KT-S0 (22 kW)"
      punkte={[
        'PV-Überschussladen – laden mit eigenem Solarstrom',
        'Automatische Phasenumschaltung für bis zu 100 % Solaranteil',
        'Lastmanagement verhindert Überlastung',
        'Freigabe über App oder RFID-Karte',
      ]}
    />
  ),
  app: () => (
    <BildFolie
      bild="app.jpg"
      kategorie="Ihre App"
      titel="Alles im Blick"
      punkte={[
        'Aktuelle Produktion und Verbrauch in Echtzeit',
        'Ladezustand des Speichers',
        'Steuerung der Wallbox',
        'Monats- und Jahresauswertungen',
        'Störungsmeldungen direkt aufs Handy',
      ]}
    />
  ),
  dachanalyse: () => (
    <BildFolie
      bild="dachanalyse.jpg"
      bildLinks
      kategorie="Gemeinsame Dachanalyse"
      titel="Wir planen die Module auf Ihrem Dach"
      punkte={[
        'Wir zeichnen die Modulbelegung direkt auf Ihr Dach ein',
        'Grundlage sind aktuelle Geoportal-Daten',
        'Sie sehen sofort, wie viele Module Platz haben',
        'Nach Ihrer Zusage vermessen wir das Dach mit der Drohne',
      ]}
      hinweis="Aus der Vermessung entsteht Ihr Festpreis. Was dort steht, gilt bis zur Schlussrechnung."
    />
  ),
  montage: () => (
    <BildFolie
      bild="montage.jpg"
      bildLinks
      kategorie="Die Montage"
      titel="In wenigen Arbeitstagen auf Ihrem Dach"
      punkte={[
        'Eigenes Montageteam – keine wechselnden Subunternehmer auf dem Dach',
        'Gerüst und Absturzsicherung gehören zum Umfang',
        'Wir räumen die Baustelle auf, als wären wir nie da gewesen',
        'Elektroanschluss und Inbetriebnahme durch konzessionierte Fachpersonen',
      ]}
      hinweis="Symbolbild"
    />
  ),
  /**
   * Ablauf als Prozess-Darstellung. Die PPTX hatte hier nur ein Deko-Bild;
   * eine Timeline zeigt den Weg vom Termin zur Anlage deutlich klarer.
   */
  workflow: () => (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-5xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Unser Ablauf</p>
      <h2 className="text-[30px] sm:text-[34px] font-bold text-text mb-2">
        Von der Beratung bis zur fertigen Anlage
      </h2>
      <p className="text-[14px] text-text-sec mb-9">
        Fünf Schritte, ein Ansprechpartner – Sie müssen nichts koordinieren.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {[
          { nr: '1', titel: 'Beratung', text: 'Wir klären alle Ihre Fragen und planen gemeinsam.', dauer: 'heute' },
          { nr: '2', titel: 'Planung', text: 'Drohnenvermessung, Ausführungsplanung, verbindliche Offerte.', dauer: '1–2 Wochen' },
          { nr: '3', titel: 'Bewilligung', text: 'Baugesuch, Netzanmeldung, Förderantrag – machen wir.', dauer: 'läuft parallel' },
          { nr: '4', titel: 'Montage', text: 'Gerüst, Module, Elektro – in wenigen Arbeitstagen.', dauer: 'wenige Tage' },
          { nr: '5', titel: 'Abschluss', text: 'Inbetriebnahme, Dokumentation, App-Einrichtung.', dauer: 'Ihre Anlage läuft' },
        ].map((s, i) => (
          <div key={s.nr} className="relative">
            {/* Verbindungslinie zwischen den Schritten */}
            {i < 4 && (
              <div
                className="hidden sm:block absolute top-5 left-full w-3 h-px z-0"
                style={{ background: 'rgba(245,158,11,0.35)' }}
              />
            )}
            <div
              className="relative h-full p-4 rounded-2xl"
              style={{
                background:
                  i === 0
                    ? 'color-mix(in srgb, #F59E0B 13%, transparent)'
                    : i === 4
                      ? 'color-mix(in srgb, #34D399 12%, transparent)'
                      : 'rgba(255,255,255,0.035)',
                border: `1px solid ${
                  i === 0
                    ? 'color-mix(in srgb, #F59E0B 34%, transparent)'
                    : i === 4
                      ? 'color-mix(in srgb, #34D399 32%, transparent)'
                      : 'rgba(255,255,255,0.07)'
                }`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-bold mb-3"
                style={{
                  background:
                    i === 4 ? 'color-mix(in srgb, #34D399 20%, transparent)' : 'color-mix(in srgb, #F59E0B 18%, transparent)',
                  color: i === 4 ? '#34D399' : '#F59E0B',
                }}
              >
                {s.nr}
              </div>
              <div className="text-[14px] font-bold text-text mb-1.5">{s.titel}</div>
              <div className="text-[11px] text-text-dim leading-snug mb-3">{s.text}</div>
              <div
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: i === 4 ? '#34D399' : '#F59E0B' }}
              >
                {s.dauer}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-4 mt-6 p-5 rounded-2xl"
        style={{
          background: 'color-mix(in srgb, #34D399 10%, transparent)',
          border: '1px solid color-mix(in srgb, #34D399 30%, transparent)',
        }}
      >
        <div className="text-[30px] font-bold text-emerald leading-none shrink-0">2</div>
        <div className="text-[13px] text-text-sec">
          <b className="text-text">Monate maximal</b> – ab Baubewilligung bis zur fertig montierten Anlage.
          Das ist unsere Zeitgarantie, und sie steht im Vertrag.
        </div>
      </div>
    </div>
  ),
}

/** Abschlussfolie mit Kontaktbild. */
export function BildKontaktFolie() {
  return (
    <div className="relative h-full overflow-hidden">
      <img
        src={`${BILD}/kontakt.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.3 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(6,8,12,0.6) 0%, rgba(6,8,12,0.94) 100%)' }}
      />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-8">
        <img src={`${BILD}/logo-hell.png`} alt="NEOSOLAR" className="h-12 object-contain mb-7" />
        <h2 className="text-[34px] font-bold text-text mb-4">Haben Sie noch Fragen?</h2>
        <p className="text-[15px] text-text-sec mb-9 max-w-lg">
          Wir nehmen uns die Zeit, bis alles geklärt ist.
        </p>
        <div
          className="p-6 rounded-2xl text-[13px] text-text-sec"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="text-[15px] font-bold text-text mb-2">NEOSOLAR AG</div>
          <div>Industriestrasse 28, 9100 Herisau</div>
          <div>T +41 (0)71 544 91 00</div>
          <div>info@neosolar.ch · www.neosolar.ch</div>
          <div className="text-[11px] text-text-dim mt-2">CHE-109.669.061</div>
        </div>
      </div>
    </div>
  )
}
