import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Presentation, Sun, Printer, LayoutList, FileCheck2, Mail,
} from 'lucide-react'
import { berechne } from '../../lib/pvCalculator'
import type { CalculatorConfig, CalculatorInput } from '../../lib/pvCalculator'
import { DEFAULT_CONFIG, DEFAULT_INPUT } from '../../lib/calculatorConfig'
import RechnerPanel from '../salespitch/components/RechnerPanel'
import Dachplaner from '../salespitch/components/Dachplaner'
import FolienKundenkontakt from '../salespitch/components/FolienKundenkontakt'
import { FolienZiele, LEERE_ZIELE } from '../salespitch/components/FolienZiele'
import type { Ziele } from '../salespitch/components/FolienZiele'
import { FolienVorteile } from '../salespitch/components/FolienVorteile'
import { FolienAusgangslage } from '../salespitch/components/FolienAusgangslage'
import { FolienStart } from '../salespitch/components/FolienStart'
import { FolienUmsetzung } from '../salespitch/components/FolienUmsetzung'
import { FolienModulwahl } from '../salespitch/components/FolienModulwahl'
import type { DachErgebnis, DachPlanung } from '../salespitch/components/Dachplaner'
import VariantenVergleich, { bildeVarianten } from '../salespitch/components/VariantenVergleich'
import OffertenDruck from '../salespitch/components/OffertenDruck'
import OfferteSenden from '../salespitch/components/OfferteSenden'
import { LEERE_BEDUERFNISSE } from '../salespitch/components/BeduerfnisSchritt'
import { api } from '../../lib/api'
import { offerteAlsPdf } from '../../lib/offertePdf'
import { dokumentAblegen } from '../../lib/dokumentAblegen'
import { naechsterOffertenName } from '../../lib/offerteName'
import { KOMPONENTEN } from '../../lib/calculatorConfig'
import {
  FolienAblauf, FolienWarumNeosolar, FolienWarumJetztVerbrauch, FolienStrompreis,
  FolienAblaufUmsetzung, FolienZeitplan,
} from '../salespitch/components/Folien'
import {
  FolienDreiMotive, FolienStromkostenOhne, FolienEnergiefluss, FolienAnlageUebersicht,
} from '../salespitch/components/Folien2'
import {
  BildTitelFolie, BildKontaktFolie, FolienTeam, ProduktFolien,
} from '../salespitch/components/FolienBilder'
import {
  FolienSicherheiten, FolienHaeufigeFragen, FolienEntscheidung,
} from '../salespitch/components/FolienAbschluss'
import {
  FolienGesamtvergleich, FolienMonatsvergleich, FolienFinanzierung,
} from '../salespitch/components/FolienGeld'
import {
  FolienDreiBausteine, FolienRueckblick, FolienAmortisation, FolienUnterschied,
  FolienPersoenlich,
} from '../salespitch/components/FolienBeweis'
import { FolienReferenzen, FolienZusatzrechner } from '../salespitch/components/FolienReferenzen'
import KundendatenPruefen from '../salespitch/components/KundendatenPruefen'
import { FolienSpeicherUpgrade, FolienBetreuung, FolienEmpfehlung } from '../salespitch/components/FolienExtras'
import { FolienZufriedenheitspaket, FolienAktion } from '../salespitch/components/FolienPaket'

const API = import.meta.env.VITE_API_URL ?? '/api/v1'

import { VARIANTEN, GELD_FOLIEN } from './folienListe'
import type { Variante } from './folienListe'

/** Im Admin gespeicherte Reihenfolge und Sichtbarkeit je Strecke. */
type FolienStand = Record<string, Array<{ id: string; aktiv: boolean }>>

/**
 * Legt die im Admin gespeicherte Reihenfolge ueber die Liste aus dem Code.
 *
 * Folien, die im Code neu dazugekommen sind, haengen hinten an – sonst
 * verschwaende eine neue Folie stillschweigend, weil sie im gespeicherten
 * Stand noch fehlt.
 */
function wendeStandAn(v: Variante, stand: FolienStand | null): Variante {
  const gespeichert = stand?.[v.id]
  if (!gespeichert?.length) return v

  const nachId = new Map(v.folien.map((f) => [f.id, f]))
  const sortiert = gespeichert
    .filter((s) => s.aktiv)
    .map((s) => nachId.get(s.id as Variante['folien'][number]['id']))
    .filter((f): f is Variante['folien'][number] => Boolean(f))

  const bekannt = new Set(gespeichert.map((s) => s.id))
  const neue = v.folien.filter((f) => !bekannt.has(f.id))
  const folien = [...sortiert, ...neue]

  return folien.length ? { ...v, folien } : v
}


export default function PraesentationPage() {
  const { varianteId } = useParams<{ varianteId?: string }>()
  const [suchparameter] = useSearchParams()
  const navigate = useNavigate()

  /**
   * Folienstand aus dem Admin. Bewusst ueber den oeffentlichen Endpunkt:
   * die Praesentation laeuft auch beim Kunden ohne Login.
   */
  const [folienStand, setFolienStand] = useState<FolienStand | null>(null)
  useEffect(() => {
    let abgebrochen = false
    fetch(`${API}/public/calculator/folien`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (!abgebrochen && r?.data) setFolienStand(r.data as FolienStand)
      })
      .catch(() => {
        /* Ohne Einstellung gilt die Reihenfolge aus dem Code */
      })
    return () => {
      abgebrochen = true
    }
  }, [])

  const basisVariante = VARIANTEN.find((v) => v.id === varianteId) ?? null
  const variante = useMemo(
    () => (basisVariante ? wendeStandAn(basisVariante, folienStand) : null),
    [basisVariante, folienStand]
  )
  const kundeAusLinkRoh = suchparameter.get('kunde') ?? undefined
  const contactId = suchparameter.get('contact') ?? undefined
  const terminId = suchparameter.get('termin') ?? undefined

  const [config, setConfig] = useState<CalculatorConfig>(DEFAULT_CONFIG)
  const [schritt, setSchritt] = useState(0)
  const [vollbild, setVollbild] = useState(false)
  /** Aktive Konfiguration – gilt fuer alle Folien und die Offerte. */
  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT)
  /**
   * Reglerstand vom Rechner. Die Varianten leiten sich hiervon ab, nicht von
   * `input` – sonst wuerde eine gewaehlte Variante die naechste Ableitung
   * verschieben und die Werte wandern bei jedem Wechsel weiter.
   */
  const [basisInput, setBasisInput] = useState<CalculatorInput>(DEFAULT_INPUT)
  const [gewaehlteVariante, setGewaehlteVariante] = useState<string | null>('empfehlung')
  const [druckOffen, setDruckOffen] = useState(false)
  const [sendenOffen, setSendenOffen] = useState(false)
  const [dealId, setDealId] = useState<string | null>(null)
  const [kontakt, setKontakt] = useState<{ id: string; firstName: string; lastName: string; address: string; email: string; phone: string; company?: string | null } | null>(null)
  const [offerteLaeuft, setOfferteLaeuft] = useState(false)
  const [offerteMeldung, setOfferteMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)
  /** Ergebnis der Dachbelegung – speist Rechner, Bericht und Offerte */
  const [dach, setDach] = useState<DachErgebnis | null>(null)
  /** Was dem Kunden wichtig ist – steuert das Gespräch, nicht die Rechnung */
  const [ziele, setZiele] = useState<Ziele>(LEERE_ZIELE)
  /**
   * Arbeitsstand des Dachplaners. Die Folie wird beim Blaettern
   * ausgehaengt, deshalb liegt der Zustand hier und nicht in ihr.
   */
  const [dachPlanung, setDachPlanung] = useState<DachPlanung | null>(null)
  /** Deal-ID, für die nach dem Rendern ein PDF abgelegt werden soll */
  const [pdfAblegen, setPdfAblegen] = useState<string | null>(null)
  const [standGeladen, setStandGeladen] = useState<string | null>(null)

  // Kundendaten laden – funktioniert nur mit angemeldetem Verkaeufer.
  // Ohne Login bleibt die Praesentation als reine Anschauung nutzbar.
  useEffect(() => {
    if (!contactId) return
    api
      .get<{ data: typeof kontakt }>(`/contacts/${contactId}`)
      .then((r) => setKontakt(r.data))
      .catch(() => setKontakt(null))
  }, [contactId])

  /**
   * Fortsetzen: mit `?deal=<id>` wird der zuletzt gespeicherte Arbeitsstand
   * geladen. Damit laesst sich eine Beratung jederzeit wieder oeffnen und
   * weiterbearbeiten, statt sie von vorn aufzubauen.
   */
  const fortsetzenDealId = suchparameter.get('deal')
  useEffect(() => {
    if (!fortsetzenDealId || standGeladen === fortsetzenDealId) return
    setStandGeladen(fortsetzenDealId)

    void (async () => {
      type Dok = {
        fileName: string
        storagePath: string
        createdAt?: string
        downloadUrl?: string | null
      }
      const neuste = (liste: Dok[]) =>
        liste
          .filter((d) => d.fileName.endsWith('.neosolar.json'))
          .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]

      try {
        // Zuerst am Angebot, sonst über den Kontakt suchen. Ein Stand, der
        // ohne Verknüpfung abgelegt wurde, geht sonst verloren.
        let stand: Dok | undefined
        try {
          const amAngebot = await api.get<{ data: Dok[] }>(
            `/documents?entityType=ANGEBOT&entityId=${fortsetzenDealId}`
          )
          stand = neuste(amAngebot.data ?? [])
        } catch {
          /* dann eben über den Kontakt */
        }
        if (!stand && contactId) {
          const beimKunden = await api.get<{ data: Dok[] }>(`/documents?contactId=${contactId}`)
          stand = neuste(beimKunden.data ?? [])
        }
        if (!stand) {
          setOfferteMeldung({
            art: 'ok',
            text: 'Zu diesem Angebot ist kein gespeicherter Stand hinterlegt – die Beratung startet neu.',
          })
          return
        }

        const url =
          stand.downloadUrl ??
          `https://tzoquorcgygmrougevgm.supabase.co/storage/v1/object/public/documents/${stand.storagePath}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Datei nicht lesbar (${res.status})`)
        const j = (await res.json()) as {
          input?: CalculatorInput
          dach?: DachErgebnis | null
          dachPlanung?: DachPlanung | null
        }
        if (j.input) {
          setInput(j.input)
          setBasisInput(j.input)
          setGewaehlteVariante(null)
        }
        if (j.dach) setDach(j.dach)
        if (j.dachPlanung) setDachPlanung(j.dachPlanung)
        setDealId(fortsetzenDealId)
        setOfferteMeldung({
          art: 'ok',
          text: 'Gespeicherter Stand geladen – Sie können die Beratung weiterbearbeiten.',
        })
      } catch (err) {
        setOfferteMeldung({
          art: 'fehler',
          text:
            'Der gespeicherte Stand konnte nicht geladen werden: ' +
            (err instanceof Error ? err.message : 'unbekannter Fehler') +
            '. Die Präsentation startet mit den Standardwerten.',
        })
      }
    })()
  }, [fortsetzenDealId, standGeladen, contactId])

  useEffect(() => {
    fetch(`${API}/public/calculator/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('nicht erreichbar'))))
      .then((j) => {
        if (j?.data?.pricing) setConfig({ ...DEFAULT_CONFIG, ...j.data.pricing })
      })
      .catch(() => {
        /* Standardwerte genuegen */
      })
  }, [])

  /**
   * Eine einzige Konfiguration fuer die gesamte Praesentation.
   *
   * `input` ist die Wahrheit – vom Rechner, von der Variantenwahl oder vom
   * Kundenlink. Die Varianten sind daraus abgeleitete Vorschlaege; waehlt der
   * Kunde eine, wird sie zur Konfiguration. Dadurch zeigen Anlagen-Uebersicht,
   * Energiefluss, Geld-Folien, Finanzierung und Offerte garantiert dieselben
   * Zahlen – es gibt kein zweites Ergebnis mehr, das abweichen koennte.
   */
  // Name aus dem geladenen Kontakt, sonst aus dem Link
  const kundeAusLink = kontakt ? `${kontakt.firstName} ${kontakt.lastName}`.trim() : kundeAusLinkRoh
  const beraterName = suchparameter.get('berater') ?? undefined

  const ergebnis = useMemo(() => berechne(input, config), [input, config])
  const anlagenVarianten = useMemo(() => bildeVarianten(basisInput), [basisInput])

  const varianteWaehlen = useCallback(
    (id: string) => {
      const gewaehlt = anlagenVarianten.find((v) => v.id === id)
      if (!gewaehlt) return
      setGewaehlteVariante(id)
      setInput(gewaehlt.input)
    },
    [anlagenVarianten]
  )

  const aktiveAnlage = useMemo(
    () => anlagenVarianten.find((v) => v.id === gewaehlteVariante) ?? anlagenVarianten[1],
    [anlagenVarianten, gewaehlteVariante]
  )

  /** Reglerbewegung am Rechner: setzt Basis und aktive Konfiguration gleich. */
  const patchInput = useCallback((p: Partial<CalculatorInput>) => {
    setInput((v) => ({ ...v, ...p }))
    setBasisInput((v) => ({ ...v, ...p }))
  }, [])

  /**
   * Die geplante Dachbelegung wird zur Grundlage der Anlage: Leistung,
   * Ausrichtung und Neigung kommen ab jetzt vom echten Dach und nicht mehr
   * aus den Standardwerten. Die Variantenwahl wird geloest, damit die
   * Folgefolien nicht wieder auf einen Vorschlag zurueckspringen.
   */
  const dachUebernehmen = useCallback(
    (e: DachErgebnis) => {
      setDach(e)
      patchInput({
        kwp: e.kwp,
        // Ost-West-Aufstaenderung rechnet der Rechner mit dem eigenen Faktor
        ausrichtung: e.ostWest ? 'OST_WEST' : e.ausrichtung,
        neigung: e.aufstaenderung > 0 ? e.aufstaenderung : e.neigungGrad,
        // Echte Modulzahl statt Schaetzung – der Modulaufpreis rechnet je Stueck
        modulAnzahl: e.modulAnzahl,
        ...(e.dachart === 'FLACH' ? { dachtyp: 'FLACHDACH' as const } : {}),
      })
      setGewaehlteVariante(null)
    },
    [patchInput]
  )
  const anzahl = variante?.folien.length ?? 0
  const weiter = useCallback(() => setSchritt((s) => Math.min(s + 1, anzahl - 1)), [anzahl])
  const zurueck = useCallback(() => setSchritt((s) => Math.max(s - 1, 0)), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(ziel.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') weiter()
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') zurueck()
      if (e.key === 'Escape') setVollbild(false)
      if (e.key === 'f') setVollbild((v) => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [weiter, zurueck])

  /**
   * Legt das Angebot beim Kontakt an und schliesst den Termin ab.
   * Dadurch wandert der Fall aus der Termin-Pipeline in die Angebote –
   * ohne dass der Verkaeufer das CRM separat anfassen muss.
   */
  const offerteSpeichern = async () => {
    if (!contactId || !kontakt) return
    setOfferteLaeuft(true)
    setOfferteMeldung(null)
    try {
      const module = Math.round((input.kwp * 1000) / KOMPONENTEN.modul.watt)
      const snapshot = [
        `Aus der Solarberatung vom ${new Date().toLocaleDateString('de-CH')}`,
        `Variante: ${aktiveAnlage.name}`,
        `Anlage: ${input.kwp} kWp (${module} Module ${KOMPONENTEN.modul.name})`,
        input.speicherKwh > 0 ? `Speicher: ${input.speicherKwh} kWh` : 'Ohne Speicher',
        input.wallbox ? 'Wallbox inklusive' : null,
        ...(dach
          ? [
              '',
              '— Dachbelegung —',
              `Dachflaeche: ${dach.dachflaecheM2} m2, davon belegt ${dach.belegteFlaecheM2} m2`,
              `Ausrichtung: ${dach.azimut} Grad, Neigung ${dach.neigungGrad} Grad`,
              dach.eignungText ? `Eignung laut Bund: ${dach.eignungText}` : null,
              dach.sperrflaechen ? `Sperrflaechen beruecksichtigt: ${dach.sperrflaechen}` : null,
              dach.wechselrichter
                ? `Wechselrichter: ${dach.wechselrichter} (${dach.wechselrichterAc} kW AC)`
                : null,
            ].filter((z): z is string => z !== null)
          : []),
        '',
        `Produktion: ${ergebnis.jahresertragKwh.toLocaleString('de-CH')} kWh/Jahr`,
        `Autarkie: ${Math.round(ergebnis.autarkiegrad * 100)} %`,
        `Ersparnis Jahr 1: CHF ${ergebnis.ersparnisJahr1.toLocaleString('de-CH')}`,
        `Amortisation: ${ergebnis.amortisationJahre ?? '—'} Jahre`,
        `Ersparnis ${config.betrachtungsJahre} Jahre: CHF ${ergebnis.gesamtErsparnis.toLocaleString('de-CH')}`,
        '',
        `Netto exkl. MWST: CHF ${ergebnis.nettoPreis.toLocaleString('de-CH')}`,
        `MWST: CHF ${ergebnis.mwst.toLocaleString('de-CH')}`,
        ergebnis.rabatt > 0 ? `Rabatt: CHF ${ergebnis.rabatt.toLocaleString('de-CH')}` : null,
        `Rechnungsbetrag inkl. MWST: CHF ${ergebnis.werklohn.toLocaleString('de-CH')}`,
        `Foerderung: CHF ${ergebnis.foerderung.toLocaleString('de-CH')}`,
        `Steuerersparnis: CHF ${ergebnis.steuerabzug.toLocaleString('de-CH')}`,
        `Effektive Kosten: CHF ${ergebnis.nettoInvestition.toLocaleString('de-CH')}`,
        '',
        `Grundlage: Verbrauch ${input.verbrauchKwh.toLocaleString('de-CH')} kWh, Strompreis ${input.strompreisRp} Rp./kWh`,
        'Richtofferte – verbindlich nach Drohnenvermessung.',
      ]
        .filter((z) => z !== null)
        .join('\n')

      const dealAntwort = await api.post<{ data: { id: string } }>('/deals', {
        contactId,
        title: `Offerte ${input.kwp} kWp – ${kontakt.firstName} ${kontakt.lastName}`,
        // Der Deal-Wert ist der Umsatz von NEOSOLAR, also der Rechnungsbetrag
        // inkl. MWST – nicht der Betrag nach Foerderung und Steuerersparnis.
        value: ergebnis.werklohn,
        stage: 'ERSTELLT',
        notes: snapshot,
        ...(terminId ? { appointmentId: terminId } : {}),
      })

      const neueDealId = dealAntwort?.data?.id ?? null
      setDealId(neueDealId)

      // Arbeitsstand ablegen, damit die Präsentation später mit denselben
      // Werten und derselben Dachbelegung wieder geöffnet werden kann
      try {
        const stand = JSON.stringify(
          { version: 1, gespeichertAm: new Date().toISOString(), input, dach, dachPlanung },
          null,
          1
        )
        await dokumentAblegen({
          contactId,
          datei: new Blob([stand], { type: 'application/json' }),
          dateiName: `Praesentation_${input.kwp}kWp_${new Date().toISOString().slice(0, 10)}.neosolar.json`,
          ordner: 'Termin',
          mimeType: 'application/json',
          entityType: 'ANGEBOT',
          entityId: neueDealId,
          notes: 'Arbeitsstand der Solarberatung – öffnet die Präsentation zum Weiterbearbeiten',
        })
      } catch (err) {
        // Das Angebot bleibt gültig, aber der Verkäufer muss wissen,
        // dass die Beratung nicht fortgesetzt werden kann
        setOfferteMeldung({
          art: 'fehler',
          text:
            'Angebot gespeichert, aber der Arbeitsstand konnte nicht abgelegt werden: ' +
            (err instanceof Error ? err.message : 'unbekannter Fehler'),
        })
      }

      // Termin als durchgefuehrt markieren, damit er die Pipeline verlaesst
      if (terminId) {
        try {
          await api.put(`/appointments/${terminId}`, { status: 'DURCHGEFUEHRT' })
        } catch {
          setOfferteMeldung({
            art: 'ok',
            text: 'Angebot angelegt. Der Termin konnte nicht automatisch abgeschlossen werden – bitte im CRM prüfen.',
          })
          setOfferteLaeuft(false)
          return
        }
      }

      setOfferteMeldung({
        art: 'ok',
        text: terminId
          ? 'Angebot angelegt und Termin als durchgeführt markiert. Die Offerte wird jetzt als PDF abgelegt …'
          : 'Angebot im CRM angelegt. Die Offerte wird jetzt als PDF abgelegt …',
      })

      // Offerte anzeigen und im Hintergrund als PDF in die Dokumente legen
      setDruckOffen(true)
      setPdfAblegen(dealAntwort?.data?.id ?? null)
    } catch (err) {
      setOfferteMeldung({
        art: 'fehler',
        text: err instanceof Error ? err.message : 'Angebot konnte nicht gespeichert werden',
      })
    } finally {
      setOfferteLaeuft(false)
    }
  }
  /**
   * Legt die gerade sichtbare Offerte als PDF in der Dokumentenablage ab.
   *
   * Das Rendern braucht das fertige DOM der Druckansicht, deshalb laeuft es
   * erst, wenn sie eingehaengt ist. Zwei Frames Wartezeit reichen, damit
   * Bilder und Diagramme stehen.
   */
  useEffect(() => {
    if (!pdfAblegen || !druckOffen || !contactId || !kontakt) return
    let abgebrochen = false

    const lauf = async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise((r) => setTimeout(r, 400))
      if (abgebrochen) return

      const el = document.getElementById('offerte-druck')
      if (!el) return
      try {
        const name = await naechsterOffertenName(
          contactId,
          kontakt.lastName || kontakt.firstName || 'Kunde',
          input.kwp
        )
        const pdf = await offerteAlsPdf(el, name)
        await dokumentAblegen({
          contactId,
          datei: pdf.blob,
          dateiName: pdf.dateiName,
          // Muss genau einem Ordner der DocumentSection entsprechen,
          // sonst landet die Datei unter "Sonstiges"
          ordner: 'Verträge',
          mimeType: 'application/pdf',
          entityType: 'ANGEBOT',
          entityId: pdfAblegen,
          notes: `Richtofferte ${input.kwp} kWp, ${ergebnis.werklohn.toLocaleString('de-CH')} CHF inkl. MWST`,
        })
        if (!abgebrochen) {
          setOfferteMeldung({
            art: 'ok',
            text: `Angebot angelegt und die Offerte als PDF (${pdf.seiten} Seiten) unter Dokumente abgelegt.`,
          })
        }
      } catch (err) {
        if (!abgebrochen) {
          setOfferteMeldung({
            art: 'fehler',
            text:
              'Das Angebot ist gespeichert, aber die PDF-Ablage hat nicht geklappt: ' +
              (err instanceof Error ? err.message : 'unbekannter Fehler'),
          })
        }
      } finally {
        if (!abgebrochen) setPdfAblegen(null)
      }
    }

    void lauf()
    return () => {
      abgebrochen = true
    }
  }, [pdfAblegen, druckOffen, contactId, kontakt, input.kwp, ergebnis.werklohn])

  // ── Auswahlseite ──
  if (!variante) {
    return (
      <div style={{ background: '#06080C', minHeight: '100vh' }} className="text-text">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <img src="/praesentation/logo-hell.png" alt="NEOSOLAR" className="h-12 object-contain mx-auto mb-7" />
            <h1 className="text-[34px] font-bold mb-3">Präsentation starten</h1>
            <p className="text-[15px] text-text-sec">
              Beide Strecken enthalten denselben Live-Rechner. Wählen Sie nach Termin und Kunde.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {VARIANTEN.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => navigate(`/praesentation/${v.id}${kundeAusLink ? `?kunde=${encodeURIComponent(kundeAusLink)}` : ''}`)}
                className="p-6 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'color-mix(in srgb, #F59E0B 8%, transparent)',
                  border: '1px solid color-mix(in srgb, #F59E0B 28%, transparent)',
                }}
              >
                <Presentation size={24} strokeWidth={1.7} className="text-amber mb-4" />
                <div className="text-[19px] font-bold mb-2">{v.name}</div>
                <div className="text-[13px] text-text-sec leading-snug mb-4">{v.beschreibung}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-dim">
                  <LayoutList size={12} strokeWidth={2} />
                  {wendeStandAn(v, folienStand).folien.length} Folien
                </div>
              </button>
            ))}
          </div>

          <div
            className="p-5 rounded-2xl text-[12px] text-text-sec"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="font-bold text-text mb-2">Bedienung im Termin</div>
            <ul className="space-y-1 text-text-dim">
              <li>Pfeiltasten ← → oder Leertaste blättern</li>
              <li>Taste <b className="text-text-sec">F</b> schaltet Vollbild ein und aus</li>
              <li>Auf der Rechner-Folie die Regler verschieben – alle Folgefolien rechnen mit</li>
              <li>Kundennamen anhängen: <code className="text-amber">?kunde=Familie%20Muster</code></li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const aktuell = variante.folien[Math.min(schritt, variante.folien.length - 1)]

  const inhalt = () => {
    switch (aktuell.id) {
      case 'titel':
        return <BildTitelFolie kunde={kundeAusLink} adresse={kontakt?.address} berater={beraterName} />
      case 'ablauf':
        return <FolienAblauf />
      case 'warum':
        return <FolienWarumNeosolar />
      case 'team':
        return <FolienTeam />
      case 'verbrauch':
        return <FolienWarumJetztVerbrauch input={input} config={config} />
      case 'strompreis':
        return <FolienStrompreis />
      case 'kostenOhne':
        return (
          <div className="h-full overflow-y-auto py-6">
            <FolienStromkostenOhne ergebnis={ergebnis} input={input} />
          </div>
        )
      case 'modul':
        return <FolienModulwahl input={input} onChange={patchInput} />
      case 'wechselrichter':
        return <ProduktFolien.wechselrichter />
      case 'speicher':
        return <ProduktFolien.speicher />
      case 'wallbox':
        return <ProduktFolien.wallbox />
      case 'app':
        return <ProduktFolien.app />
      case 'dachanalyse':
        return <ProduktFolien.dachanalyse />
      case 'montage':
        return <ProduktFolien.montage />
      case 'workflow':
        return <ProduktFolien.workflow />
      case 'ziele':
        return <FolienZiele ziele={ziele} onChange={setZiele} />
      case 'vorteile':
        return (
          <div className="h-full overflow-y-auto py-6">
            <FolienVorteile ergebnis={ergebnis} config={config} />
          </div>
        )
      case 'start':
        return (
          <FolienStart
            kunde={kundeAusLink}
            berater={beraterName}
            beraterMail={suchparameter.get('beraterMail') ?? undefined}
            beraterTel={suchparameter.get('beraterTel') ?? undefined}
          />
        )
      case 'kundenkontakt':
        return (
          <FolienKundenkontakt
            input={input}
            ergebnis={ergebnis}
            dach={dach}
            adresse={dach?.adresse ?? kontakt?.address}
            rid={suchparameter.get('rid')}
            onKontakt={setKontakt}
          />
        )
      case 'dachplaner':
        return (
          <Dachplaner
            startAdresse={kontakt?.address ?? null}
            gespeichert={dach}
            planung={dachPlanung}
            onPlanungAendern={setDachPlanung}
            onUebernehmen={dachUebernehmen}
          />
        )
      case 'rechner':
        return (
          <div className="h-full overflow-y-auto px-4 sm:px-6 py-6">
            <RechnerPanel input={input} ergebnis={ergebnis} config={config} onChange={patchInput} />
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
              varianten={anlagenVarianten}
              config={config}
              empfehlungId="empfehlung"
              gewaehlteId={gewaehlteVariante}
              onWaehlen={varianteWaehlen}
            />
          </div>
        )
      case 'paket':
        return <FolienZufriedenheitspaket />
      case 'aktion':
        return <FolienAktion input={input} ergebnis={ergebnis} onChange={patchInput} />
      case 'speicherUpgrade':
        return (
          <FolienSpeicherUpgrade input={input} ergebnis={ergebnis} config={config} onChange={patchInput} />
        )
      case 'betreuung':
        return <FolienBetreuung berater={beraterName} />
      case 'empfehlung':
        return <FolienEmpfehlung kontaktId={contactId} kundeName={kundeAusLink} />
      case 'referenzen':
        return <FolienReferenzen />
      case 'zusatzrechner':
        return <FolienZusatzrechner input={input} ergebnis={ergebnis} config={config} />
      case 'persoenlich':
        // Verbrauch, Preis und geplanter Mehrverbrauch werden hier gesetzt.
        // Ab dieser Folie rechnet die gesamte Beratung damit.
        return (
          <FolienAusgangslage
            kunde={kundeAusLink}
            input={input}
            config={config}
            onChange={patchInput}
          />
        )
      case 'kundendaten':
        return contactId ? (
          <KundendatenPruefen
            kontakt={kontakt}
            input={input}
            ergebnis={ergebnis}
            berater={beraterName}
            onKontaktGeaendert={setKontakt}
          />
        ) : (
          <FolienPersoenlich kunde={kundeAusLink} input={input} ergebnis={ergebnis} />
        )
      case 'rueckblick':
        return <FolienRueckblick ergebnis={ergebnis} />
      case 'bausteine':
        return (
          <div className="h-full overflow-y-auto py-6">
            <FolienDreiBausteine ergebnis={ergebnis} config={config} />
          </div>
        )
      case 'amortisation':
        return <FolienAmortisation ergebnis={ergebnis} config={config} />
      case 'unterschied':
        return <FolienUnterschied />
      case 'gesamtvergleich':
        return <FolienGesamtvergleich ergebnis={ergebnis} config={config} />
      case 'monatsvergleich':
        return <FolienMonatsvergleich ergebnis={ergebnis} config={config} />
      case 'finanzierung':
        return <FolienFinanzierung ergebnis={ergebnis} config={config} />
      case 'sicherheiten':
        return <FolienSicherheiten />
      case 'fragen':
        return <FolienHaeufigeFragen />
      case 'entscheidung':
        return (
          <FolienEntscheidung
            input={input}
            ergebnis={ergebnis}
            config={config}
            variantenName={dach ? `Dachbelegung ${dach.modulAnzahl} Module` : aktiveAnlage.name}
            kunde={kundeAusLink}
          />
        )
      case 'planung':
        return <FolienAblaufUmsetzung />
      case 'zeitplan':
        return <FolienZeitplan />
      case 'umsetzung':
        return <FolienUmsetzung />
      case 'kontakt':
        return <BildKontaktFolie />
      default:
        return null
    }
  }

  return (
    <div
      className="flex flex-col"
      style={{ background: '#06080C', height: '100vh', padding: vollbild ? 0 : '12px' }}
    >
      {/* Kopfzeile – im Vollbild ausgeblendet */}
      {!vollbild && (
        <div className="flex items-center gap-2 flex-wrap mb-2.5 px-1">
          <button
            type="button"
            onClick={() => navigate('/praesentation')}
            className="flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mr-auto"
          >
            <Sun size={15} strokeWidth={1.8} className="text-amber" />
            {variante.name}
            {kundeAusLink && <span className="text-text-dim">· {kundeAusLink}</span>}
          </button>

          {kontakt && (
            <button
              type="button"
              onClick={offerteSpeichern}
              disabled={offerteLaeuft}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-50"
              title="Angebot beim Kunden anlegen und Termin abschliessen"
            >
              <FileCheck2 size={13} strokeWidth={2} />
              Angebot speichern
            </button>
          )}

          {kontakt && (
            <button
              type="button"
              onClick={() => setSendenOffen(true)}
              className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
              title="Offerte per E-Mail an den Kunden senden und ablegen"
            >
              <Mail size={13} strokeWidth={2} />
              Offerte senden
            </button>
          )}

          <button
            type="button"
            onClick={() => setDruckOffen(true)}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
          >
            <Printer size={13} strokeWidth={2} />
            Offerte drucken
          </button>
          <button
            type="button"
            onClick={() => setVollbild(true)}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
          >
            <Maximize2 size={13} strokeWidth={2} />
            Vollbild
          </button>
        </div>
      )}

      {offerteMeldung && !vollbild && (
        <div
          className="px-4 py-2.5 mb-2.5 rounded-xl text-[12px]"
          style={{
            background: offerteMeldung.art === 'ok' ? 'color-mix(in srgb, #34D399 12%, transparent)' : 'color-mix(in srgb, #F87171 12%, transparent)',
            border: `1px solid ${offerteMeldung.art === 'ok' ? 'color-mix(in srgb, #34D399 35%, transparent)' : 'color-mix(in srgb, #F87171 35%, transparent)'}`,
            color: offerteMeldung.art === 'ok' ? '#34D399' : '#F87171',
          }}
        >
          {offerteMeldung.text}
        </div>
      )}

      {/* Folie mit dezenter Markenleiste – auf Titel- und Kontaktfolie steht
          das Logo schon gross im Bild, dort waere es doppelt. */}
      <div
        className="flex-1 min-h-0 overflow-hidden relative"
        style={{
          background:
            'radial-gradient(1200px 600px at 15% -10%, rgba(245,158,11,0.055), transparent 60%), rgba(255,255,255,0.018)',
          border: vollbild ? 'none' : '1px solid rgba(255,255,255,0.07)',
          borderRadius: vollbild ? 0 : 'var(--radius-lg)',
        }}
      >
        {!['titel', 'kontakt'].includes(aktuell.id) && (
          <>
            <img
              src="/praesentation/logo-hell.png"
              alt="NEOSOLAR"
              className="absolute z-10 pointer-events-none select-none"
              style={{ top: 18, right: 22, height: 26, opacity: 0.75 }}
            />
            {kundeAusLink && (
              <span
                className="absolute z-10 text-[10px] uppercase tracking-[0.18em] pointer-events-none"
                style={{ top: 22, left: 24, color: 'rgba(255,255,255,0.30)' }}
              >
                {kundeAusLink}
              </span>
            )}
          </>
        )}
        {/* key sorgt fuer einen sanften Einblendeffekt bei jedem Folienwechsel */}
        <div key={`${variante.id}-${schritt}`} className="h-full folie-einblenden">
          {inhalt()}
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex items-center gap-3 ${vollbild ? 'px-4 py-2.5' : 'mt-2.5 px-1'}`}>
        <button
          type="button"
          onClick={zurueck}
          disabled={schritt === 0}
          className="btn-secondary flex items-center gap-1 px-3 py-2 text-[12px] disabled:opacity-25"
        >
          <ChevronLeft size={15} strokeWidth={2} />
          Zurück
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-text truncate">
              {aktuell.titel}
              {/* Ab dem Variantenvergleich beziehen sich die Zahlen auf die gewaehlte
                  Variante – das muss im Termin jederzeit sichtbar sein. */}
              {GELD_FOLIEN.has(aktuell.id) && (
                <span className="text-text-dim font-normal">
                  {' '}· «{aktiveAnlage.name}» · {input.kwp} kWp
                  {aktiveAnlage.input.speicherKwh > 0 ? ` + ${aktiveAnlage.input.speicherKwh} kWh` : ''}
                </span>
              )}
            </span>
            <span className="text-[10px] text-text-dim tabular-nums shrink-0 ml-2">
              {schritt + 1} / {variante.folien.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${((schritt + 1) / variante.folien.length) * 100}%`,
                background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
              }}
            />
          </div>
        </div>

        {vollbild && (
          <button
            type="button"
            onClick={() => setVollbild(false)}
            className="btn-secondary flex items-center gap-1 px-3 py-2 text-[12px]"
          >
            <Minimize2 size={15} strokeWidth={2} />
          </button>
        )}

        <button
          type="button"
          onClick={weiter}
          disabled={schritt === variante.folien.length - 1}
          className="btn-primary flex items-center gap-1 px-3 py-2 text-[12px] disabled:opacity-25"
        >
          Weiter
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>

      {sendenOffen && kontakt && (
        <OfferteSenden
          kontakt={kontakt}
          dealId={dealId}
          input={input}
          ergebnis={ergebnis}
          config={config}
          variantenName={dach ? `Dachbelegung ${dach.modulAnzahl} Module` : aktiveAnlage.name}
          onClose={() => setSendenOffen(false)}
        />
      )}

      {druckOffen && (
        <OffertenDruck
          // Der geladene Kontakt hat Vorrang – nur so stehen Adresse,
          // Telefon und E-Mail auf der Offerte. Ohne Kontakt bleibt der
          // Name aus dem Link als Notloesung.
          kunde={
            kontakt ??
            (kundeAusLinkRoh
              ? {
                  firstName: kundeAusLinkRoh,
                  lastName: '',
                  address: '',
                  email: '',
                  phone: '',
                }
              : null)
          }
          variantenName={dach ? `Dachbelegung ${dach.modulAnzahl} Module` : aktiveAnlage.name}
          input={input}
          ergebnis={ergebnis}
          config={config}
          beduerfnisse={LEERE_BEDUERFNISSE}
          dach={dach}
          verkaeufer={
            beraterName
              ? {
                  firstName: beraterName.split(' ')[0],
                  lastName: beraterName.split(' ').slice(1).join(' '),
                  email: suchparameter.get('beraterMail') ?? undefined,
                  phone: suchparameter.get('beraterTel') ?? undefined,
                }
              : null
          }
          onClose={() => setDruckOffen(false)}
        />
      )}
    </div>
  )
}
