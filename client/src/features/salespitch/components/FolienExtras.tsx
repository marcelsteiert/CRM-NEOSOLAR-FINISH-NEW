import { useState } from 'react'
import {
  Battery, Check, Phone, HardHat, Headphones, Gift, Users, Plus, Trash2, Send, Loader2,
} from 'lucide-react'
import { berechne } from '../../../lib/pvCalculator'
import type { CalculatorInput, CalculatorResult, CalculatorConfig } from '../../../lib/pvCalculator'
import { KOMPONENTEN } from '../../../lib/calculatorConfig'
import { api } from '../../../lib/api'

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

/**
 * Speicher-Upgrade: zeigt zu jeder Ausbaustufe den zusaetzlichen Nutzen
 * gegenueber der aktuellen Konfiguration – und uebernimmt sie per Klick.
 * Der Kunde sieht, was ein groesserer Speicher bringt, statt es zu raten.
 */
export function FolienSpeicherUpgrade({
  input,
  ergebnis,
  config,
  onChange,
}: {
  input: CalculatorInput
  ergebnis: CalculatorResult
  config: CalculatorConfig
  onChange: (patch: Partial<CalculatorInput>) => void
}) {
  const modulKwh = KOMPONENTEN.speicher.modulKwh
  const stufen = [0, 1, 2, 3, 4].map((n) => Math.round(n * modulKwh * 10) / 10)

  const varianten = stufen.map((kwh) => {
    const e = berechne({ ...input, speicherKwh: kwh }, config)
    return {
      kwh,
      module: Math.round(kwh / modulKwh),
      ergebnis: e,
      mehrProMonat: e.ersparnisProMonat - ergebnis.ersparnisProMonat,
      mehrpreis: e.nettoInvestition - ergebnis.nettoInvestition,
      aktuell: Math.abs(kwh - input.speicherKwh) < 0.05,
    }
  })

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-2.5 mb-2">
        <Battery size={20} strokeWidth={1.8} className="text-amber" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber">Speicher-Ausbau</p>
      </div>
      <h2 className="text-[28px] sm:text-[32px] font-bold text-text mb-2">
        Wie viel Speicher lohnt sich für Sie?
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Jede Stufe ist ein Batteriemodul à {modulKwh} kWh. Klicken Sie eine an – die ganze Präsentation
        rechnet sofort damit.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {varianten.map((v) => (
          <button
            key={v.kwh}
            type="button"
            onClick={() => onChange({ speicherKwh: v.kwh })}
            className="p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: v.aktuell
                ? 'color-mix(in srgb, #F59E0B 16%, transparent)'
                : 'rgba(255,255,255,0.035)',
              border: `1px solid ${v.aktuell ? 'color-mix(in srgb, #F59E0B 50%, transparent)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1.5">
              {v.module === 0 ? 'Ohne Speicher' : `${v.module} Modul${v.module > 1 ? 'e' : ''}`}
            </div>
            <div
              className="text-[24px] font-bold tabular-nums leading-none mb-2"
              style={{ color: v.aktuell ? '#F59E0B' : undefined }}
            >
              {v.kwh > 0 ? `${v.kwh}` : '—'}
              {v.kwh > 0 && <span className="text-[12px] text-text-dim font-medium"> kWh</span>}
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-text-sec">
                Autarkie <b className="text-text">{Math.round(v.ergebnis.autarkiegrad * 100)} %</b>
              </div>
              {!v.aktuell && (
                <>
                  <div className="text-[11px]" style={{ color: v.mehrProMonat >= 0 ? '#34D399' : '#F87171' }}>
                    {v.mehrProMonat >= 0 ? '+' : ''}
                    {chf(v.mehrProMonat)}/Mt
                  </div>
                  <div className="text-[10px] text-text-dim">
                    {v.mehrpreis >= 0 ? '+' : ''}
                    {chf(v.mehrpreis)} Preis
                  </div>
                </>
              )}
              {v.aktuell && (
                <div className="flex items-center gap-1 text-[11px] text-amber font-semibold">
                  <Check size={12} strokeWidth={2.5} />
                  gewählt
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div
        className="p-5 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="text-[13px] font-bold text-text mb-2">Was ein Speicher wirklich bringt</div>
        <p className="text-[12px] text-text-sec leading-relaxed">
          Ohne Speicher nutzen Sie den Solarstrom nur, während die Sonne scheint – abends kaufen Sie wieder
          ein. Der Speicher verschiebt den Überschuss in den Abend. Der Zugewinn wird pro Modul kleiner: Das
          erste Modul bringt am meisten, ab dem dritten sinkt der Nutzen, weil im Winter schlicht zu wenig
          Sonne für die Ladung da ist.
        </p>
      </div>

      <p className="text-[10px] text-text-dim mt-4">
        Werte gerechnet mit {config.speicherZyklenProJahr} nutzbaren Zyklen pro Jahr und
        {' '}{Math.round(config.speicherWirkungsgrad * 100)} % Wirkungsgrad. Autarkie ist auf
        {' '}{Math.round(config.maxAutarkiegrad * 100)} % begrenzt – Vollautarkie ist ohne Saisonspeicher nicht
        erreichbar.
      </p>
    </div>
  )
}

/** Wer ist wann für den Kunden da – von der Beratung bis zum Betrieb. */
export function FolienBetreuung({ berater }: { berater?: string }) {
  const phasen = [
    {
      icon: Phone,
      farbe: '#F59E0B',
      phase: 'Jetzt, in der Beratung',
      person: berater ? berater : 'Ihr Berater',
      text: 'Plant mit Ihnen die Anlage, erstellt die Offerte und bleibt Ihr Ansprechpartner bis zur Unterschrift.',
    },
    {
      icon: HardHat,
      farbe: '#60A5FA',
      phase: 'Während der Umsetzung',
      person: 'Ihre Projektleitung',
      text: 'Übernimmt Baugesuch, Netzanmeldung und Terminplanung. Sie erfahren vorab, wann wer bei Ihnen ist.',
    },
    {
      icon: Headphones,
      farbe: '#34D399',
      phase: 'Nach der Inbetriebnahme',
      person: 'NEOSOLAR Service',
      text: 'Garantieabwicklung, Fragen zur App, Erweiterungen. Ihre Anlage bleibt bei uns in Betreuung.',
    },
  ]

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2.5 mb-2">
        <Users size={20} strokeWidth={1.8} className="text-amber" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber">Ihre Betreuung</p>
      </div>
      <h2 className="text-[28px] sm:text-[32px] font-bold text-text mb-2">
        Sie werden nicht weitergereicht
      </h2>
      <p className="text-[14px] text-text-sec mb-8">
        Drei Phasen, drei feste Ansprechpartner – und keine Warteschleife dazwischen.
      </p>

      <div className="space-y-3">
        {phasen.map((p, i) => (
          <div key={p.phase} className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${p.farbe} 16%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${p.farbe} 34%, transparent)`,
                }}
              >
                <p.icon size={19} strokeWidth={1.8} style={{ color: p.farbe }} />
              </div>
              {i < phasen.length - 1 && (
                <div className="w-px flex-1 my-1.5" style={{ background: 'rgba(255,255,255,0.10)' }} />
              )}
            </div>
            <div className="pb-5 pt-1">
              <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                {p.phase}
              </div>
              <div className="text-[15px] font-bold text-text mb-1">{p.person}</div>
              <div className="text-[12px] text-text-dim leading-snug">{p.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="p-5 rounded-2xl mt-2"
        style={{
          background: 'color-mix(in srgb, #34D399 10%, transparent)',
          border: '1px solid color-mix(in srgb, #34D399 28%, transparent)',
        }}
      >
        <div className="text-[13px] text-text-sec">
          Bei 13 Mitarbeitenden kennen wir jedes Projekt. Sie erklären Ihr Anliegen einmal – nicht jedem
          Mitarbeiter neu.
        </div>
      </div>
    </div>
  )
}

/**
 * Weiterempfehlung: erfasst Empfehlungen direkt im Termin und legt sie als
 * Leads im CRM an. Bewusst ohne Praemienversprechen – welche Verguetung
 * NEOSOLAR gewaehrt, gehoert in die Hand der Geschaeftsleitung, nicht in
 * eine automatisch generierte Folie.
 */
export function FolienEmpfehlung({
  kontaktId,
  kundeName,
}: {
  kontaktId?: string
  kundeName?: string
}) {
  const [empfehlungen, setEmpfehlungen] = useState<
    Array<{ id: string; name: string; ort: string; telefon: string }>
  >([{ id: 'e1', name: '', ort: '', telefon: '' }])
  const [speichert, setSpeichert] = useState(false)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)

  const gefuellt = empfehlungen.filter((e) => e.name.trim() && e.telefon.trim())

  const speichern = async () => {
    if (!gefuellt.length) return
    setSpeichert(true)
    setMeldung(null)
    let ok = 0
    let fehler = 0
    for (const e of gefuellt) {
      try {
        const teile = e.name.trim().split(' ')
        const nachname = teile.length > 1 ? teile.slice(1).join(' ') : teile[0]
        const vorname = teile.length > 1 ? teile[0] : ''
        const kontakt = await api.post<{ data: { id: string } }>('/contacts', {
          firstName: vorname,
          lastName: nachname,
          email: '',
          phone: e.telefon.trim(),
          address: e.ort.trim(),
          notes: `Empfehlung von ${kundeName ?? 'einem Kunden'}${kontaktId ? ` (Kontakt ${kontaktId})` : ''}`,
        })
        await api.post('/leads', {
          contactId: kontakt.data.id,
          source: 'EMPFEHLUNG',
          status: 'ACTIVE',
          value: 0,
          notes: `Empfohlen von ${kundeName ?? 'einem Kunden'} während der Solarberatung.`,
        })
        ok++
      } catch {
        fehler++
      }
    }
    setSpeichert(false)
    setMeldung(
      fehler === 0
        ? { art: 'ok', text: `${ok} Empfehlung${ok > 1 ? 'en' : ''} als Lead angelegt. Vielen Dank!` }
        : { art: 'fehler', text: `${ok} angelegt, ${fehler} fehlgeschlagen. Bitte im CRM prüfen.` }
    )
  }

  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2.5 mb-2">
        <Gift size={20} strokeWidth={1.8} className="text-amber" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber">Weiterempfehlung</p>
      </div>
      <h2 className="text-[28px] sm:text-[32px] font-bold text-text mb-2">
        Kennen Sie jemanden, für den das auch passt?
      </h2>
      <p className="text-[14px] text-text-sec mb-7">
        Die meisten unserer Kunden kommen über eine Empfehlung. Wenn Ihnen jemand einfällt – Nachbar,
        Verwandte, Arbeitskollegin – nehmen wir gerne Kontakt auf.
      </p>

      {meldung && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-xl text-[12px]"
          style={{
            background:
              meldung.art === 'ok'
                ? 'color-mix(in srgb, #34D399 12%, transparent)'
                : 'color-mix(in srgb, #F87171 12%, transparent)',
            border: `1px solid ${meldung.art === 'ok' ? 'color-mix(in srgb, #34D399 35%, transparent)' : 'color-mix(in srgb, #F87171 35%, transparent)'}`,
          }}
        >
          <Check size={14} strokeWidth={2.5} className={meldung.art === 'ok' ? 'text-emerald' : 'text-red'} />
          <span className={meldung.art === 'ok' ? 'text-emerald' : 'text-red'}>{meldung.text}</span>
        </div>
      )}

      <div className="space-y-2.5 mb-4">
        {empfehlungen.map((e, i) => (
          <div key={e.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_36px] gap-2">
            <input
              type="text"
              value={e.name}
              onChange={(ev) =>
                setEmpfehlungen((l) => l.map((x) => (x.id === e.id ? { ...x, name: ev.target.value } : x)))
              }
              placeholder={i === 0 ? 'Name' : ''}
              className="glass-input px-3 py-2.5 text-[13px]"
            />
            <input
              type="text"
              value={e.ort}
              onChange={(ev) =>
                setEmpfehlungen((l) => l.map((x) => (x.id === e.id ? { ...x, ort: ev.target.value } : x)))
              }
              placeholder={i === 0 ? 'Ort' : ''}
              className="glass-input px-3 py-2.5 text-[13px]"
            />
            <input
              type="tel"
              value={e.telefon}
              onChange={(ev) =>
                setEmpfehlungen((l) => l.map((x) => (x.id === e.id ? { ...x, telefon: ev.target.value } : x)))
              }
              placeholder={i === 0 ? 'Telefon' : ''}
              className="glass-input px-3 py-2.5 text-[13px]"
            />
            {empfehlungen.length > 1 && (
              <button
                type="button"
                onClick={() => setEmpfehlungen((l) => l.filter((x) => x.id !== e.id))}
                className="flex items-center justify-center rounded-lg text-text-dim hover:text-red transition-colors"
                aria-label="Zeile entfernen"
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() =>
            setEmpfehlungen((l) => [...l, { id: `e${Date.now()}`, name: '', ort: '', telefon: '' }])
          }
          className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px]"
        >
          <Plus size={13} strokeWidth={2} />
          Weitere Person
        </button>
        <button
          type="button"
          onClick={speichern}
          disabled={!gefuellt.length || speichert}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-[12px] disabled:opacity-40"
        >
          {speichert ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2} />}
          {gefuellt.length > 0 ? `${gefuellt.length} übernehmen` : 'Übernehmen'}
        </button>
      </div>

      <p className="text-[10px] text-text-dim mt-5">
        Wir melden uns nur mit dem Hinweis, dass Sie uns empfohlen haben. Bitte fragen Sie die genannten
        Personen vorher, ob das für sie in Ordnung ist – dann ist der erste Anruf für alle angenehmer.
      </p>
    </div>
  )
}
