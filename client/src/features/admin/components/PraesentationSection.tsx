import { useEffect, useState } from 'react'
import {
  Presentation, Eye, EyeOff, ArrowUp, ArrowDown, Save, RotateCcw,
  Loader2, CheckCircle2, AlertTriangle, GripVertical, ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/api'
import { VARIANTEN } from '@/features/praesentation/folienListe'
import type { FolienId } from '@/features/praesentation/folienListe'

interface Stand {
  id: FolienId
  aktiv: boolean
}

/**
 * Reihenfolge und Sichtbarkeit der Praesentationsfolien.
 *
 * Wer eine Folie weglassen will – etwa die Aktion, wenn gerade keine
 * laeuft – kann das hier selbst tun, ohne einen Entwickler zu fragen.
 * Gespeichert wird nur die Abweichung; die Folien selbst bleiben im Code.
 */
export default function PraesentationSection() {
  const [variante, setVariante] = useState(VARIANTEN[0]?.id ?? 'komplett')
  const [folien, setFolien] = useState<Stand[]>([])
  const [laedt, setLaedt] = useState(true)
  const [speichert, setSpeichert] = useState(false)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)

  const aktuelleVariante = VARIANTEN.find((v) => v.id === variante)
  /** Titel je Folien-ID, damit die Liste lesbar ist. */
  const titel = new Map(aktuelleVariante?.folien.map((f) => [f.id, f.titel]) ?? [])

  async function laden() {
    setLaedt(true)
    try {
      const r = await api.get<{ data: Record<string, Stand[]> }>('/admin/praesentation/folien')
      const gespeichert = r.data?.[variante]
      if (gespeichert?.length) {
        // Neue Folien aus dem Code hinten anhaengen, damit nichts fehlt
        const bekannt = new Set(gespeichert.map((f) => f.id))
        const neue = (aktuelleVariante?.folien ?? [])
          .filter((f) => !bekannt.has(f.id))
          .map((f) => ({ id: f.id, aktiv: true }))
        setFolien([...gespeichert, ...neue])
      } else {
        setFolien((aktuelleVariante?.folien ?? []).map((f) => ({ id: f.id, aktiv: true })))
      }
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Laden fehlgeschlagen' })
    } finally {
      setLaedt(false)
    }
  }

  useEffect(() => {
    void laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variante])

  async function speichern() {
    setSpeichert(true)
    setMeldung(null)
    try {
      await api.put('/admin/praesentation/folien', { variante, folien })
      setMeldung({ art: 'ok', text: 'Gespeichert. Die Präsentation zeigt ab sofort diese Reihenfolge.' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen' })
    } finally {
      setSpeichert(false)
    }
  }

  async function zuruecksetzen() {
    if (!confirm('Reihenfolge und Sichtbarkeit auf den Auslieferungsstand zurücksetzen?')) return
    setSpeichert(true)
    try {
      await api.delete(`/admin/praesentation/folien/${variante}`)
      setFolien((aktuelleVariante?.folien ?? []).map((f) => ({ id: f.id, aktiv: true })))
      setMeldung({ art: 'ok', text: 'Zurückgesetzt.' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Zurücksetzen fehlgeschlagen' })
    } finally {
      setSpeichert(false)
    }
  }

  function verschieben(i: number, richtung: -1 | 1) {
    const ziel = i + richtung
    if (ziel < 0 || ziel >= folien.length) return
    const neu = [...folien]
    ;[neu[i], neu[ziel]] = [neu[ziel], neu[i]]
    setFolien(neu)
  }

  const aktive = folien.filter((f) => f.aktiv).length

  if (laedt) {
    return (
      <div className="flex items-center gap-2 text-text-dim text-[13px] py-10">
        <Loader2 size={16} className="animate-spin" /> Wird geladen …
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {meldung && (
        <div
          className="px-4 py-3 rounded-xl text-[13px] flex items-start gap-2"
          style={{
            background: meldung.art === 'ok' ? 'color-mix(in srgb, #34D399 10%, transparent)' : 'color-mix(in srgb, #F87171 10%, transparent)',
            border: `1px solid color-mix(in srgb, ${meldung.art === 'ok' ? '#34D399' : '#F87171'} 30%, transparent)`,
            color: meldung.art === 'ok' ? '#34D399' : '#F87171',
          }}
        >
          {meldung.art === 'ok' ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
          {meldung.text}
        </div>
      )}

      {/* Strecke wählen */}
      <div className="flex flex-wrap items-center gap-2">
        {VARIANTEN.map((v) => {
          const an = v.id === variante
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariante(v.id)}
              className="px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: an ? 'color-mix(in srgb, #F59E0B 16%, transparent)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${an ? 'color-mix(in srgb, #F59E0B 45%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                color: an ? '#F59E0B' : undefined,
              }}
            >
              {v.name}
            </button>
          )
        })}
        <div className="flex-1" />
        <a
          href={`/praesentation/${variante}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px]"
        >
          <ExternalLink size={13} strokeWidth={2} />
          Ansehen
        </a>
      </div>

      <p className="text-[12px] text-text-dim">
        {aktuelleVariante?.beschreibung}
      </p>

      {/* Aktionen */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-text-sec">
          <b className="text-text">{aktive}</b> von {folien.length} Folien aktiv
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={zuruecksetzen} disabled={speichert} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px] disabled:opacity-40">
            <RotateCcw size={13} strokeWidth={2} /> Zurücksetzen
          </button>
          <button type="button" onClick={speichern} disabled={speichert} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-[12px] disabled:opacity-40">
            {speichert ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2} />}
            Speichern
          </button>
        </div>
      </div>

      {/* Folienliste */}
      <div className="space-y-1">
        {folien.map((f, i) => {
          const name = titel.get(f.id) ?? f.id
          return (
            <div
              key={f.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{
                background: f.aktiv ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: f.aktiv ? 1 : 0.5,
              }}
            >
              <GripVertical size={14} strokeWidth={1.8} className="text-text-dim shrink-0" />
              <span
                className="text-[11px] tabular-nums font-semibold shrink-0"
                style={{ minWidth: 24, color: f.aktiv ? '#F59E0B' : '#6B7280' }}
              >
                {f.aktiv ? folien.slice(0, i + 1).filter((x) => x.aktiv).length : '–'}
              </span>
              <span className="text-[13px] text-text flex-1 truncate">{name}</span>
              <span className="text-[10px] text-text-dim font-mono shrink-0 hidden sm:inline">{f.id}</span>

              <div className="flex gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => verschieben(i, -1)}
                  disabled={i === 0}
                  className="p-1.5 rounded-lg text-text-dim hover:text-amber disabled:opacity-20"
                  aria-label="Nach oben"
                >
                  <ArrowUp size={13} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => verschieben(i, 1)}
                  disabled={i === folien.length - 1}
                  className="p-1.5 rounded-lg text-text-dim hover:text-amber disabled:opacity-20"
                  aria-label="Nach unten"
                >
                  <ArrowDown size={13} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setFolien(folien.map((x, j) => (j === i ? { ...x, aktiv: !x.aktiv } : x)))}
                  className="p-1.5 rounded-lg"
                  style={{ color: f.aktiv ? '#34D399' : '#6B7280' }}
                  aria-label={f.aktiv ? 'Ausblenden' : 'Einblenden'}
                  title={f.aktiv ? 'Folie überspringen' : 'Folie wieder zeigen'}
                >
                  {f.aktiv ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-text-dim px-1">
        <Presentation size={13} className="shrink-0 mt-0.5" />
        <p>
          Ausgeblendete Folien werden übersprungen, bleiben aber erhalten – Sie können sie
          jederzeit wieder einschalten. Nützlich etwa für die Aktions-Folie, wenn gerade keine
          Aktion läuft. Die Änderung gilt sofort für alle Verkäufer.
        </p>
      </div>
    </div>
  )
}
