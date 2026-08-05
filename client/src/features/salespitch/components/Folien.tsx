import {
  Award, ShieldCheck, Clock, Wrench, Zap, Car, Flame, Waves, Thermometer,
  TrendingUp, Sun, Battery, Plug, CheckCircle2, Users,
} from 'lucide-react'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'

/**
 * Folien der NEOSOLAR-Verkaufspraesentation, nachgebaut fuer den
 * Praesentationsmodus. Inhalte aus "Neosolar Verkaufspraesentation_v2".
 */

export function FolienTitel({ kunde }: { kunde?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{ background: 'color-mix(in srgb, #F59E0B 16%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 35%, transparent)' }}
      >
        <Sun size={40} strokeWidth={1.6} className="text-amber" />
      </div>
      <p className="text-[13px] uppercase tracking-[0.25em] text-text-dim mb-4">Ihr Beratungstermin</p>
      <h1 className="text-[44px] sm:text-[58px] font-bold text-text leading-[1.05] mb-5">
        {kunde ? kunde : 'Ihre Solaranlage'}
      </h1>
      <p className="text-[17px] text-text-sec max-w-xl">
        Wir planen heute gemeinsam Ihre Anlage – und Sie sehen sofort, was Sie damit sparen.
      </p>
      <p className="text-[13px] text-text-dim mt-10">NEOSOLAR AG · Dein Schweizer Solarpartner</p>
    </div>
  )
}

export function FolienAblauf() {
  const punkte = [
    'Begrüssung & Ziel',
    'Ihre Wünsche',
    'Ihre Energielösung',
    'Ihre Dachplanung',
    'Offerte & Ersparnis',
    'Warum NEOSOLAR',
    'Entscheidung & Umsetzung',
  ]
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-4xl mx-auto w-full">
      <h2 className="text-[34px] font-bold text-text mb-10">Ihr Termin im Überblick</h2>
      <div className="space-y-3">
        {punkte.map((p, i) => (
          <div
            key={p}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-bold text-amber shrink-0"
              style={{ background: 'color-mix(in srgb, #F59E0B 14%, transparent)' }}
            >
              {i + 1}
            </div>
            <span className="text-[16px] text-text font-medium">{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FolienWarumNeosolar() {
  const zahlen = [
    { wert: '70+', label: 'installierte Photovoltaik-Anlagen' },
    { wert: '300+', label: 'Anlagen Erfahrung im Team' },
    { wert: '13+', label: 'qualifizierte Mitarbeitende' },
    { wert: '7+', label: 'Jahre Branchenerfahrung' },
  ]
  const versprechen = [
    { icon: Wrench, titel: 'Schlüsselfertige Umsetzung', text: 'Alles aus einer Hand – von der Bewilligung bis zur Inbetriebnahme.' },
    { icon: ShieldCheck, titel: 'Fixpreis ohne versteckte Kosten', text: 'Der vereinbarte Preis bleibt bestehen. Keine Nachträge ohne Ihre Zustimmung.' },
    { icon: Zap, titel: 'Ein abgestimmtes Energiesystem', text: 'Module, Wechselrichter, Speicher und Wallbox arbeiten zusammen.' },
    { icon: Clock, titel: 'Zeitgarantie', text: 'Ab Baubewilligung bis zur fertigen Montage maximal zwei Monate.' },
  ]
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-5xl mx-auto w-full">
      <p className="text-[12px] uppercase tracking-[0.2em] text-amber mb-2">Warum NEOSOLAR?</p>
      <h2 className="text-[32px] font-bold text-text mb-2">
        Schweizer Beratung. Bewährte Komponenten. Verbindliche Umsetzung.
      </h2>
      <p className="text-[15px] text-text-sec mb-8">Ihre Solarlösung. Alles aus einer Hand.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {zahlen.map((z) => (
          <div
            key={z.wert}
            className="p-4 rounded-2xl text-center"
            style={{ background: 'color-mix(in srgb, #F59E0B 10%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 26%, transparent)' }}
          >
            <div className="text-[32px] font-bold text-amber leading-none mb-1.5">{z.wert}</div>
            <div className="text-[11px] text-text-sec leading-snug">{z.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {versprechen.map((v) => (
          <div key={v.titel} className="flex gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <v.icon size={18} strokeWidth={1.8} className="text-amber shrink-0 mt-0.5" />
            <div>
              <div className="text-[13px] font-bold text-text mb-0.5">{v.titel}</div>
              <div className="text-[12px] text-text-dim leading-snug">{v.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FolienWarumJetztVerbrauch() {
  const verbraucher = [
    { icon: Car, label: 'Elektroauto' },
    { icon: Flame, label: 'Wärmepumpe' },
    { icon: Thermometer, label: 'Klimaanlage' },
    { icon: Waves, label: 'Pool / Sauna' },
    { icon: Zap, label: 'Warmwasser / Boiler' },
    { icon: Plug, label: 'Heizstab' },
  ]
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-4xl mx-auto w-full">
      <p className="text-[12px] uppercase tracking-[0.2em] text-amber mb-2">Warum jetzt?</p>
      <h2 className="text-[32px] font-bold text-text mb-4">
        Ihr Strombedarf bleibt nicht, wie er heute ist.
      </h2>
      <p className="text-[15px] text-text-sec mb-8 max-w-2xl">
        E-Mobilität und Wärmepumpe können den Verbrauch eines Haushalts in den kommenden Jahren deutlich
        erhöhen. Deshalb planen wir nicht nur für den Verbrauch von heute – sondern für das Leben von morgen.
      </p>

      <div
        className="p-6 rounded-2xl mb-7 flex items-center gap-6"
        style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 32%, transparent)' }}
      >
        <div className="text-[52px] font-bold text-amber leading-none">≈ 3×</div>
        <div className="text-[14px] text-text-sec">
          mehr Strombedarf ist in einem elektrifizierten Haushalt möglich.
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-3">
        Weitere mögliche Stromverbraucher
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {verbraucher.map((v) => (
          <div key={v.label} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <v.icon size={15} strokeWidth={1.8} className="text-text-dim" />
            <span className="text-[12px] text-text-sec">{v.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-text-dim mt-5">
        Illustratives Verbrauchsbeispiel. Der tatsächliche Bedarf hängt von Gebäude, Fahrleistung, Technik und
        Nutzerverhalten ab.
      </p>
    </div>
  )
}

export function FolienStrompreis() {
  // ElCom H4 Haushaltstarife, Werte in Rp./kWh
  const verlauf = [
    { jahr: 2012, preis: 20.7 },
    { jahr: 2021, preis: 21.2 },
    { jahr: 2023, preis: 27.2 },
    { jahr: 2025, preis: 29.0 },
    { jahr: 2026, preis: 27.7 },
    { jahr: 2035, preis: 33.5 },
    { jahr: 2043, preis: 39.5 },
    { jahr: 2051, preis: 47.0 },
  ]
  const max = 50
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-4xl mx-auto w-full">
      <p className="text-[12px] uppercase tracking-[0.2em] text-amber mb-2">Warum jetzt?</p>
      <h2 className="text-[32px] font-bold text-text mb-3">
        Netzstrom bleibt ein Kostenrisiko – Solarstrom macht planbarer.
      </h2>
      <p className="text-[14px] text-text-sec mb-8">
        Dokumentierte Haushaltstarife und die Projektion bis 2051.
      </p>

      <div className="flex items-end gap-2 sm:gap-3 h-56 mb-3">
        {verlauf.map((v) => {
          const hoehe = (v.preis / max) * 100
          const prognose = v.jahr > 2026
          return (
            <div key={v.jahr} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-text tabular-nums">{v.preis}</span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${hoehe}%`,
                  background: prognose
                    ? 'color-mix(in srgb, #F87171 45%, transparent)'
                    : 'color-mix(in srgb, #F59E0B 55%, transparent)',
                  border: `1px solid ${prognose ? 'color-mix(in srgb, #F87171 60%, transparent)' : 'color-mix(in srgb, #F59E0B 70%, transparent)'}`,
                  borderBottom: 'none',
                }}
              />
              <span className="text-[10px] text-text-dim tabular-nums">{v.jahr}</span>
            </div>
          )
        })}
      </div>

      <div
        className="p-5 rounded-2xl flex items-center gap-5"
        style={{ background: 'color-mix(in srgb, #F87171 10%, transparent)', border: '1px solid color-mix(in srgb, #F87171 28%, transparent)' }}
      >
        <TrendingUp size={26} strokeWidth={1.8} className="text-red shrink-0" />
        <div>
          <div className="text-[13px] font-bold text-text mb-0.5">
            Basisszenario: ≈ 47 Rp. pro kWh im Jahr 2051
          </div>
          <div className="text-[12px] text-text-sec">
            Eigener Solarstrom reduziert Ihre Abhängigkeit von künftigen Stromtarifen.
          </div>
        </div>
      </div>
      <p className="text-[10px] text-text-dim mt-4">
        Quellen: ElCom, Haushalt H4, Tarifjahre 2012 und 2021–2026. Projektion: eigene Szenariorechnung, keine
        Preisgarantie.
      </p>
    </div>
  )
}

export function FolienKomponenten() {
  const teile = [
    {
      icon: Sun,
      kategorie: 'Module',
      name: KOMPONENTEN.modul.name,
      typ: KOMPONENTEN.modul.typ,
      punkte: [
        `${KOMPONENTEN.modul.watt} Watt pro Modul`,
        `${KOMPONENTEN.modul.garantieJahre} Jahre Garantie auf die Leistung`,
        `Hagelklasse ${KOMPONENTEN.modul.hagelklasse}`,
        'Sehr gutes Schwachlichtverhalten',
      ],
    },
    {
      icon: Zap,
      kategorie: 'Wechselrichter',
      name: KOMPONENTEN.wechselrichter.name,
      typ: KOMPONENTEN.wechselrichter.typ,
      punkte: [
        'Bis zu 30 % mehr Energie mit Optimizer',
        'Battery-Ready für späteren Speicher',
        'AFCI Lichtbogenschutz',
        'Hybrid – bereit für die Zukunft',
      ],
    },
    {
      icon: Battery,
      kategorie: 'Speicher',
      name: KOMPONENTEN.speicher.name,
      typ: KOMPONENTEN.speicher.typ,
      punkte: [
        `${KOMPONENTEN.speicher.modulKwh} kWh pro Modul, bis 20.7 kWh pro Turm`,
        'LFP-Zellchemie, 100 % Entladetiefe',
        '5-stufiges Sicherheitskonzept, IP66',
        'Löschkit pro Batteriemodul',
      ],
    },
    {
      icon: Plug,
      kategorie: 'Wallbox',
      name: KOMPONENTEN.wallbox.name,
      typ: KOMPONENTEN.wallbox.typ,
      punkte: [
        'PV-Überschussladen',
        'Automatische Phasenumschaltung',
        '7.4 kW einphasig oder 22 kW dreiphasig',
        'Steuerung und Freigabe über die App',
      ],
    },
  ]
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-5xl mx-auto w-full">
      <h2 className="text-[32px] font-bold text-text mb-2">Ihre Komponenten</h2>
      <p className="text-[14px] text-text-sec mb-7">
        Bewährte Technik von LONGi und Huawei – ein System, das zusammenarbeitet.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {teile.map((t) => (
          <div key={t.kategorie} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <t.icon size={17} strokeWidth={1.8} className="text-amber" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">{t.kategorie}</div>
                <div className="text-[14px] font-bold text-text leading-tight">{t.name}</div>
              </div>
            </div>
            <div className="text-[10px] text-text-dim mb-2.5 font-mono">{t.typ}</div>
            <ul className="space-y-1">
              {t.punkte.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[12px] text-text-sec">
                  <CheckCircle2 size={13} strokeWidth={2} className="text-emerald shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FolienAblaufUmsetzung() {
  const schritte = [
    { titel: 'Persönliche Beratung', text: 'Wir stimmen die Solarlösung auf Ihr Dach, Ihren Verbrauch und Ihre Zukunftspläne ab.' },
    { titel: 'Individuelle Planung', text: 'Wir planen die optimale Modulbelegung und Ihr persönliches Energiesystem.' },
    { titel: 'Verlässliche Kalkulation', text: 'Aktuelle Geodaten bilden die Grundlage für unser verbindliches Festpreisangebot.' },
    { titel: 'Ihre Entscheidung', text: 'Sie beauftragen Ihre geplante Solaranlage mit voller Kostensicherheit von Anfang an.' },
    { titel: 'Technische Prüfung vor Ort', text: 'Unsere Fachpersonen prüfen die Gegebenheiten und finalisieren die Ausführungsplanung.' },
    { titel: 'Professionelle Umsetzung', text: 'Wir koordinieren alle Schritte bis zur fachgerechten Installation Ihrer Solaranlage.' },
  ]
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-5xl mx-auto w-full">
      <p className="text-[12px] uppercase tracking-[0.2em] text-amber mb-2">Ihre Planungssicherheit</p>
      <h2 className="text-[32px] font-bold text-text mb-7">
        Ihre Solaranlage zum verbindlichen Festpreis.
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {schritte.map((s, i) => (
          <div key={s.titel} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-amber"
                style={{ background: 'color-mix(in srgb, #F59E0B 14%, transparent)' }}
              >
                {i + 1}
              </div>
              <div className="text-[13px] font-bold text-text">{s.titel}</div>
            </div>
            <div className="text-[11px] text-text-dim leading-snug">{s.text}</div>
          </div>
        ))}
      </div>
      <div
        className="p-5 rounded-2xl flex items-start gap-5"
        style={{ background: 'color-mix(in srgb, #34D399 10%, transparent)', border: '1px solid color-mix(in srgb, #34D399 28%, transparent)' }}
      >
        <div className="text-[38px] font-bold text-emerald leading-none shrink-0">100%</div>
        <div>
          <div className="text-[14px] font-bold text-text mb-1">Festpreis – unser Versprechen</div>
          <div className="text-[12px] text-text-sec">
            Der vereinbarte Preis bleibt bestehen – von der Planung bis zur Installation. Erweiterungen werden
            nur auf Ihren ausdrücklichen Wunsch und nach vorheriger Abstimmung ergänzt.
          </div>
        </div>
      </div>
    </div>
  )
}

export function FolienZeitplan() {
  const stationen = [
    { titel: 'Heutiger Termin', text: 'Gemeinsam planen wir Ihre Anlage und erstellen Ihre individuelle Richtofferte.' },
    { titel: 'Geoportal-Basis', text: 'Die Richtofferte beruht auf Luftbild und Kataster. Ihren Festpreis erhalten Sie nach der Vermessung.' },
    { titel: 'Finales Angebot', text: 'Sie unterzeichnen das finale Angebot.' },
    { titel: 'Drohnenvermessung', text: 'Wir vermessen Ihr Dach mit der Drohne. Daraus entsteht Ihr Festpreis – und der gilt.' },
    { titel: 'Installation', text: 'Ab Baubewilligung bis zur fertigen Anlage maximal zwei Monate.' },
  ]
  return (
    <div className="h-full flex flex-col justify-center px-8 max-w-3xl mx-auto w-full">
      <h2 className="text-[32px] font-bold text-text mb-3">Wie es jetzt weitergeht</h2>
      <p className="text-[14px] text-text-sec mb-8">
        Max. 2 Monate von der Vertragsunterzeichnung bis zur fertig installierten Anlage.
      </p>
      <div className="space-y-1">
        {stationen.map((s, i) => (
          <div key={s.titel} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-amber shrink-0"
                style={{ background: 'color-mix(in srgb, #F59E0B 14%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 32%, transparent)' }}
              >
                {i + 1}
              </div>
              {i < stationen.length - 1 && <div className="w-px flex-1 my-1" style={{ background: 'rgba(255,255,255,0.10)' }} />}
            </div>
            <div className="pb-5 pt-1">
              <div className="text-[14px] font-bold text-text mb-0.5">{s.titel}</div>
              <div className="text-[12px] text-text-dim leading-snug">{s.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FolienAbschluss() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-7"
        style={{ background: 'color-mix(in srgb, #34D399 14%, transparent)', border: '1px solid color-mix(in srgb, #34D399 32%, transparent)' }}
      >
        <Award size={32} strokeWidth={1.6} className="text-emerald" />
      </div>
      <h2 className="text-[36px] font-bold text-text mb-4">Haben Sie noch Fragen?</h2>
      <p className="text-[16px] text-text-sec mb-10 max-w-lg">
        Wir nehmen uns die Zeit, bis alles geklärt ist.
      </p>
      <div
        className="p-6 rounded-2xl text-left"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} strokeWidth={1.8} className="text-amber" />
          <span className="text-[14px] font-bold text-text">NEOSOLAR AG</span>
        </div>
        <div className="text-[13px] text-text-sec space-y-1">
          <div>Industriestrasse 28, 9100 Herisau</div>
          <div>T +41 (0)71 544 91 00</div>
          <div>info@neosolar.ch · www.neosolar.ch</div>
          <div className="text-[11px] text-text-dim pt-1">CHE-109.669.061</div>
        </div>
      </div>
    </div>
  )
}
