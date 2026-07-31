import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Eye, EyeOff,
  FileText, Loader2, Check, X, Presentation, Printer,
} from 'lucide-react'
import { berechne } from '../../lib/pvCalculator'
import type { CalculatorInput } from '../../lib/pvCalculator'
import { DEFAULT_INPUT, KOMPONENTEN } from '../../lib/calculatorConfig'
import { useCalculatorPricing } from '../../hooks/useCalculatorPricing'
import { api } from '../../lib/api'
import RechnerPanel from './components/RechnerPanel'
import VariantenVergleich, { bildeVarianten } from './components/VariantenVergleich'
import BeduerfnisSchritt, { LEERE_BEDUERFNISSE } from './components/BeduerfnisSchritt'
import type { Beduerfnisse } from './components/BeduerfnisSchritt'
import OffertenDruck from './components/OffertenDruck'
import {
  FolienTitel, FolienAblauf, FolienWarumNeosolar, FolienWarumJetztVerbrauch,
  FolienStrompreis, FolienKomponenten, FolienAblaufUmsetzung, FolienZeitplan, FolienAbschluss,
} from './components/Folien'
import {
  FolienDreiMotive, FolienStromkostenOhne, FolienEnergiefluss, FolienAnlageUebersicht,
} from './components/Folien2'

interface Kontakt {
  id: string
  firstName: string
  lastName: string
  address: string
  email: string
  phone: string
}

/** Zustand einer Beratung – wird lokal zwischengespeichert. */
interface Sitzung {
  input: CalculatorInput
  beduerfnisse: Beduerfnisse
  gewaehlteVariante: string | null
  schritt: number
}

/**
 * Ablauf der Beratung. Dramaturgie: erst Bedarf und Problem (Stromkosten),
 * dann Loesung, dann Zahlen, dann Preis, dann Umsetzung.
 * Der Rechner kommt bewusst NACH der Kostenfolie – der Kunde soll den
 * Vergleichswert im Kopf haben, bevor er den Preis sieht.
 */
const SCHRITTE = [
  { id: 'titel', titel: 'Begrüssung' },
  { id: 'ablauf', titel: 'Ablauf' },
  { id: 'beduerfnis', titel: 'Ihre Wünsche' },
  { id: 'warum', titel: 'Warum NEOSOLAR' },
  { id: 'verbrauch', titel: 'Ihr Strombedarf' },
  { id: 'strompreis', titel: 'Strompreise' },
  { id: 'kostenOhne', titel: 'Kosten ohne Anlage' },
  { id: 'komponenten', titel: 'Komponenten' },
  { id: 'rechner', titel: 'Ihre Anlage planen' },
  { id: 'anlage', titel: 'Ihre Anlage' },
  { id: 'energiefluss', titel: 'Energiefluss' },
  { id: 'motive', titel: 'Ihr Nutzen' },
  { id: 'varianten', titel: 'Varianten' },
  { id: 'planung', titel: 'Planungssicherheit' },
  { id: 'zeitplan', titel: 'Umsetzung' },
  { id: 'abschluss', titel: 'Fragen' },
] as const

const speicherKey = (id: string) => `neosolar-beratung-${id}`

export default function SalesPitchPage() {
  const { contactId } = useParams<{ contactId?: string }>()
  const navigate = useNavigate()
  const { config } = useCalculatorPricing()

  const [kontakt, setKontakt] = useState<Kontakt | null>(null)
  const [schritt, setSchritt] = useState(0)
  const [vollbild, setVollbild] = useState(false)
  const [kundenansicht, setKundenansicht] = useState(false)
  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT)
  const [beduerfnisse, setBeduerfnisse] = useState<Beduerfnisse>(LEERE_BEDUERFNISSE)
  const [gewaehlteVariante, setGewaehlteVariante] = useState<string | null>('empfehlung')
  const [offerteLaeuft, setOfferteLaeuft] = useState(false)
  const [offerteMeldung, setOfferteMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)
  const [druckOffen, setDruckOffen] = useState(false)

  // ── Kontakt laden ──
  useEffect(() => {
    if (!contactId) return
    api
      .get<{ data: Kontakt }>(`/contacts/${contactId}`)
      .then((r) => setKontakt(r.data))
      .catch(() => setKontakt(null))
  }, [contactId])

  // ── Sitzung wiederherstellen ──
  useEffect(() => {
    const key = speicherKey(contactId ?? 'frei')
    try {
      const roh = localStorage.getItem(key)
      if (!roh) return
      const s = JSON.parse(roh) as Partial<Sitzung>
      if (s.input) setInput({ ...DEFAULT_INPUT, ...s.input })
      if (s.beduerfnisse) setBeduerfnisse({ ...LEERE_BEDUERFNISSE, ...s.beduerfnisse })
      if (s.gewaehlteVariante !== undefined) setGewaehlteVariante(s.gewaehlteVariante)
      if (typeof s.schritt === 'number') setSchritt(Math.min(s.schritt, SCHRITTE.length - 1))
    } catch {
      /* beschaedigter Eintrag – frisch starten */
    }
  }, [contactId])

  // ── Automatisch speichern ──
  useEffect(() => {
    const key = speicherKey(contactId ?? 'frei')
    const daten: Sitzung = { input, beduerfnisse, gewaehlteVariante, schritt }
    try {
      localStorage.setItem(key, JSON.stringify(daten))
    } catch {
      /* Speicher voll – Beratung laeuft trotzdem weiter */
    }
  }, [contactId, input, beduerfnisse, gewaehlteVariante, schritt])

  const ergebnis = useMemo(() => berechne(input, config), [input, config])
  const varianten = useMemo(() => bildeVarianten(input), [input])
  const aktiveVariante = useMemo(
    () => varianten.find((v) => v.id === gewaehlteVariante) ?? varianten[1],
    [varianten, gewaehlteVariante]
  )
  const variantenErgebnis = useMemo(
    () => berechne(aktiveVariante.input, config),
    [aktiveVariante, config]
  )

  const patchInput = useCallback((p: Partial<CalculatorInput>) => setInput((v) => ({ ...v, ...p })), [])
  const patchBeduerfnisse = useCallback(
    (p: Partial<Beduerfnisse>) => setBeduerfnisse((v) => ({ ...v, ...p })),
    []
  )

  const weiter = useCallback(() => setSchritt((s) => Math.min(s + 1, SCHRITTE.length - 1)), [])
  const zurueck = useCallback(() => setSchritt((s) => Math.max(s - 1, 0)), [])

  // ── Tastatursteuerung fuer die Praesentation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(ziel.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') weiter()
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') zurueck()
      if (e.key === 'Escape') setVollbild(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [weiter, zurueck])

  // ── Offerte als Angebot im CRM anlegen ──
  const offerteErstellen = async () => {
    if (!contactId || !kontakt) {
      setOfferteMeldung({ art: 'fehler', text: 'Für eine Offerte muss die Beratung von einem Kontakt aus gestartet werden.' })
      return
    }
    setOfferteLaeuft(true)
    setOfferteMeldung(null)
    try {
      const v = aktiveVariante
      const e = variantenErgebnis
      // Snapshot: haelt fest, womit gerechnet wurde. Aendern sich die
      // Preise spaeter, bleibt die Offerte nachvollziehbar.
      const snapshot = [
        `Variante: ${v.name}`,
        `Anlage: ${v.input.kwp} kWp (${Math.round((v.input.kwp * 1000) / KOMPONENTEN.modul.watt)} Module ${KOMPONENTEN.modul.name})`,
        v.input.speicherKwh > 0 ? `Speicher: ${v.input.speicherKwh} kWh ${KOMPONENTEN.speicher.name}` : 'Ohne Speicher',
        v.input.wallbox ? `Wallbox: ${KOMPONENTEN.wallbox.name}` : null,
        `Ausrichtung ${v.input.ausrichtung}, Neigung ${v.input.neigung}°, ${v.input.dachtyp}`,
        '',
        `Stromproduktion: ${e.jahresertragKwh.toLocaleString('de-CH')} kWh/Jahr`,
        `Eigenverbrauch: ${e.eigenverbrauchKwh.toLocaleString('de-CH')} kWh (${Math.round(e.eigenverbrauchsquote * 100)} %)`,
        `Autarkie: ${Math.round(e.autarkiegrad * 100)} %`,
        `Ersparnis Jahr 1: CHF ${e.ersparnisJahr1.toLocaleString('de-CH')}`,
        `Amortisation: ${e.amortisationJahre ?? '—'} Jahre`,
        `Ersparnis über ${config.betrachtungsJahre} Jahre: CHF ${e.gesamtErsparnis.toLocaleString('de-CH')}`,
        `Stromgestehungskosten: ${e.lcoe} Rp./kWh`,
        '',
        `Anlage schlüsselfertig exkl. MWST: CHF ${e.nettoPreis.toLocaleString('de-CH')}`,
        `MWST: CHF ${e.mwst.toLocaleString('de-CH')}`,
        `Rechnungsbetrag inkl. MWST: CHF ${e.werklohn.toLocaleString('de-CH')}`,
        `Förderung Pronovo: CHF ${e.foerderung.toLocaleString('de-CH')}`,
        `Steuerersparnis: CHF ${e.steuerabzug.toLocaleString('de-CH')}`,
        `Effektive Kosten: CHF ${e.nettoInvestition.toLocaleString('de-CH')}`,
        '',
        '— Angaben des Kunden —',
        `Verbrauch heute: ${v.input.verbrauchKwh.toLocaleString('de-CH')} kWh`,
        `Strompreis: ${v.input.strompreisRp} Rp./kWh`,
        beduerfnisse.motivation.length ? `Motivation: ${beduerfnisse.motivation.join(', ')}` : null,
        beduerfnisse.zeitraum ? `Zeitraum: ${beduerfnisse.zeitraum}` : null,
        beduerfnisse.budget ? `Budget: ${beduerfnisse.budget}` : null,
        beduerfnisse.finanzierung ? 'Finanzierung gewünscht' : null,
        beduerfnisse.vergleichsofferten ? 'Vergleichsofferten liegen vor' : null,
        beduerfnisse.entscheider ? `Entscheider: ${beduerfnisse.entscheider}` : null,
        beduerfnisse.notizen ? `Notizen: ${beduerfnisse.notizen}` : null,
        '',
        'Richtofferte auf Basis der Beratung. Verbindlich nach Dachvermessung.',
      ]
        .filter((z) => z !== null)
        .join('\n')

      await api.post('/deals', {
        contactId,
        title: `Richtofferte ${v.input.kwp} kWp – ${kontakt.firstName} ${kontakt.lastName}`,
        // Umsatzwert für die Pipeline: Rechnungsbetrag inkl. MWST
        value: e.werklohn,
        stage: 'ERSTELLT',
        notes: snapshot,
      })

      setOfferteMeldung({ art: 'ok', text: 'Offerte wurde als Angebot im CRM angelegt.' })
    } catch (err) {
      setOfferteMeldung({
        art: 'fehler',
        text: err instanceof Error ? err.message : 'Offerte konnte nicht angelegt werden',
      })
    } finally {
      setOfferteLaeuft(false)
    }
  }

  const kundeName = kontakt ? `${kontakt.firstName} ${kontakt.lastName}` : undefined
  const aktuell = SCHRITTE[schritt]
  // In der Kundenansicht erscheinen Preise erst ab der Anlagenplanung –
  // vorher soll der Kunde nur den Nutzen sehen.
  const preisAbSchritt = SCHRITTE.findIndex((s) => s.id === 'rechner')
  const preiseSichtbar = !kundenansicht || schritt >= preisAbSchritt

  const inhalt = () => {
    switch (aktuell.id) {
      case 'titel':
        return <FolienTitel kunde={kundeName} />
      case 'ablauf':
        return <FolienAblauf />
      case 'beduerfnis':
        return <BeduerfnisSchritt werte={beduerfnisse} onChange={patchBeduerfnisse} />
      case 'warum':
        return <FolienWarumNeosolar />
      case 'verbrauch':
        return <FolienWarumJetztVerbrauch />
      case 'strompreis':
        return <FolienStrompreis />
      case 'kostenOhne':
        return <FolienStromkostenOhne ergebnis={ergebnis} input={input} />
      case 'komponenten':
        return <FolienKomponenten />
      case 'rechner':
        return (
          <div className="h-full overflow-y-auto px-4 sm:px-6 py-6">
            <RechnerPanel
              input={input}
              ergebnis={ergebnis}
              config={config}
              onChange={patchInput}
              preiseSichtbar={preiseSichtbar}
            />
          </div>
        )
      case 'anlage':
        return (
          <div className="h-full overflow-y-auto py-6">
            <FolienAnlageUebersicht ergebnis={ergebnis} input={input} />
          </div>
        )
      case 'energiefluss':
        return (
          <div className="h-full overflow-y-auto py-6">
            <FolienEnergiefluss ergebnis={ergebnis} />
          </div>
        )
      case 'motive':
        return (
          <div className="h-full overflow-y-auto py-6">
            <FolienDreiMotive ergebnis={ergebnis} />
          </div>
        )
      case 'varianten':
        return (
          <div className="h-full overflow-y-auto py-6">
            <VariantenVergleich
              varianten={varianten}
              config={config}
              empfehlungId="empfehlung"
              gewaehlteId={gewaehlteVariante}
              onWaehlen={setGewaehlteVariante}
              preiseSichtbar={preiseSichtbar}
            />
          </div>
        )
      case 'planung':
        return <FolienAblaufUmsetzung />
      case 'zeitplan':
        return <FolienZeitplan />
      case 'abschluss':
        return <FolienAbschluss />
      default:
        return null
    }
  }

  return (
    <div
      className={vollbild ? 'fixed inset-0 z-[95] flex flex-col' : 'flex flex-col'}
      style={{
        background: vollbild ? '#06080C' : 'transparent',
        height: vollbild ? '100vh' : 'calc(100vh - 140px)',
        minHeight: vollbild ? undefined : 560,
      }}
    >
      {/* ── Kopfzeile ── */}
      <div className="flex items-center gap-3 flex-wrap mb-3 px-1">
        <div className="flex items-center gap-2 mr-auto">
          <Presentation size={17} strokeWidth={1.8} className="text-amber" />
          <h1 className="text-[15px] font-bold text-text">Solarberatung</h1>
          {kundeName && <span className="text-[13px] text-text-dim">· {kundeName}</span>}
        </div>

        <button
          type="button"
          onClick={() => setKundenansicht((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
          style={{
            background: kundenansicht ? 'color-mix(in srgb, #34D399 14%, transparent)' : 'rgba(255,255,255,0.035)',
            border: `1px solid ${kundenansicht ? 'color-mix(in srgb, #34D399 40%, transparent)' : 'rgba(255,255,255,0.06)'}`,
            color: kundenansicht ? '#34D399' : undefined,
          }}
          title="In der Kundenansicht bleiben interne Hinweise ausgeblendet"
        >
          {kundenansicht ? <Eye size={13} strokeWidth={2} /> : <EyeOff size={13} strokeWidth={2} />}
          {kundenansicht ? 'Kundenansicht' : 'Verkäuferansicht'}
        </button>

        <a
          href={
            kundeName
              ? `/praesentation?kunde=${encodeURIComponent(kundeName)}`
              : '/praesentation'
          }
          target="_blank"
          rel="noreferrer"
          className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
          title="Präsentation in einem eigenen Fenster öffnen – ideal für die Bildschirmfreigabe"
        >
          <Presentation size={13} strokeWidth={2} />
          Präsentation
        </a>

        <button
          type="button"
          onClick={() => setDruckOffen(true)}
          className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
        >
          <Printer size={13} strokeWidth={2} />
          Offerte drucken
        </button>

        {contactId && (
          <button
            type="button"
            onClick={offerteErstellen}
            disabled={offerteLaeuft}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-50"
          >
            {offerteLaeuft ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} strokeWidth={2} />}
            Offerte ins CRM
          </button>
        )}

        <button
          type="button"
          onClick={() => setVollbild((v) => !v)}
          className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
        >
          {vollbild ? <Minimize2 size={13} strokeWidth={2} /> : <Maximize2 size={13} strokeWidth={2} />}
          {vollbild ? 'Verlassen' : 'Vollbild'}
        </button>

        {!vollbild && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
          >
            <X size={13} strokeWidth={2} />
            Schliessen
          </button>
        )}
      </div>

      {offerteMeldung && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 mb-3 rounded-xl text-[12px]"
          style={{
            background:
              offerteMeldung.art === 'ok'
                ? 'color-mix(in srgb, #34D399 12%, transparent)'
                : 'color-mix(in srgb, #F87171 12%, transparent)',
            border: `1px solid ${
              offerteMeldung.art === 'ok'
                ? 'color-mix(in srgb, #34D399 35%, transparent)'
                : 'color-mix(in srgb, #F87171 35%, transparent)'
            }`,
          }}
        >
          {offerteMeldung.art === 'ok' ? (
            <Check size={14} strokeWidth={2.5} className="text-emerald" />
          ) : (
            <X size={14} strokeWidth={2.5} className="text-red" />
          )}
          <span className={offerteMeldung.art === 'ok' ? 'text-emerald' : 'text-red'}>{offerteMeldung.text}</span>
        </div>
      )}

      {/* ── Folie ── */}
      <div
        className="flex-1 min-h-0 glass-card overflow-hidden"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        {inhalt()}
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center gap-3 mt-3 px-1">
        <button
          type="button"
          onClick={zurueck}
          disabled={schritt === 0}
          className="btn-secondary flex items-center gap-1 px-3 py-2 text-[12px] disabled:opacity-30"
        >
          <ChevronLeft size={15} strokeWidth={2} />
          Zurück
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-text truncate">{aktuell.titel}</span>
            <span className="text-[10px] text-text-dim tabular-nums shrink-0 ml-2">
              {schritt + 1} / {SCHRITTE.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${((schritt + 1) / SCHRITTE.length) * 100}%`,
                background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={weiter}
          disabled={schritt === SCHRITTE.length - 1}
          className="btn-primary flex items-center gap-1 px-3 py-2 text-[12px] disabled:opacity-30"
        >
          Weiter
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>

      {/* ── Interne Leiste: nur in der Verkäuferansicht ── */}
      {!kundenansicht && (
        <div
          className="flex items-center gap-4 flex-wrap mt-3 px-4 py-2.5 rounded-xl text-[11px]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.10)' }}
        >
          <span className="text-text-dim uppercase tracking-wider font-semibold">Intern</span>
          <span className="text-text-sec">
            Gewählt: <b className="text-text">{aktiveVariante.name}</b>
          </span>
          <span className="text-text-sec">
            VK inkl. MWST: <b className="text-text tabular-nums">CHF {variantenErgebnis.werklohn.toLocaleString('de-CH')}</b>
          </span>
          <span className="text-text-sec">
            Rendite Kunde: <b className="text-text tabular-nums">{variantenErgebnis.renditeProzent} %/J</b>
          </span>
          {variantenErgebnis.irr !== null && (
            <span className="text-text-sec">
              IRR: <b className="text-text tabular-nums">{variantenErgebnis.irr} %</b>
            </span>
          )}
          <span className="text-text-sec">
            Kapitalwert: <b className="text-text tabular-nums">CHF {variantenErgebnis.npv.toLocaleString('de-CH')}</b>
          </span>
          <span className="text-text-dim ml-auto">Pfeiltasten ← → zum Blättern</span>
        </div>
      )}

      {druckOffen && (
        <OffertenDruck
          kunde={kontakt}
          variantenName={aktiveVariante.name}
          input={aktiveVariante.input}
          ergebnis={variantenErgebnis}
          config={config}
          beduerfnisse={beduerfnisse}
          onClose={() => setDruckOffen(false)}
        />
      )}
    </div>
  )
}
