import { useEffect, useState } from 'react'
import {
  Megaphone, Users, Send, Eye, Play, Pause, Trash2, Plus, Save, Loader2,
  AlertTriangle, CheckCircle2, MousePointerClick, MailOpen, UserCheck, Filter, Info,
} from 'lucide-react'
import { api } from '@/lib/api'

interface Kampagne {
  id: string
  name: string
  betreff: string
  inhalt: string
  status: 'ENTWURF' | 'LAEUFT' | 'PAUSIERT' | 'FERTIG'
  tagesbudget: number
  von_stunde: number
  bis_stunde: number
  filter: Filterwerte
  empfaenger?: number
  offen?: number
  gesendet?: number
  geoeffnet?: number
  geklickt?: number
  konvertiert?: number
}

interface Filterwerte {
  quellen?: string[]
  status?: string[]
  abDatum?: string | null
  bisDatum?: string | null
  mitAngebot?: 'EGAL' | 'NUR_MIT' | 'NUR_OHNE'
  limit?: number
}

const VORLAGE = `<p>Guten Tag {anrede}</p>

<p>Die Strompreise in {ort} sind in den letzten Jahren deutlich gestiegen – und sie werden
weiter steigen. Viele Hausbesitzer fragen sich, ob sich eine eigene Solaranlage lohnt.</p>

<p>Wir haben dafür einen Rechner gebaut, der Ihr Dach aus der Luft anschaut, die Module
darauf legt und Ihnen in zwei Minuten zeigt, was Sie sparen würden. Ohne Anmeldung,
ohne Verpflichtung, ohne dass Sie mit jemandem sprechen müssen.</p>

<p style="margin:28px 0">
  <a href="{link}" style="background:#F59E0B;color:#111827;padding:14px 28px;border-radius:8px;
     text-decoration:none;font-weight:700;display:inline-block">Mein Dach berechnen</a>
</p>

<p>Es dauert wirklich nur zwei Minuten – und Sie wissen danach, woran Sie sind.</p>`

const STATUS_FARBE: Record<string, string> = {
  ENTWURF: '#94A3B8',
  LAEUFT: '#34D399',
  PAUSIERT: '#FBBF24',
  FERTIG: '#60A5FA',
}

/**
 * Kampagnen: Massenversand an Leads.
 *
 * Der Aufbau fuehrt bewusst ueber die Vorschau: erst sehen, wie viele
 * Empfaenger die Filter treffen, dann eine Testmail, dann starten.
 */
export default function KampagnenSection() {
  const [kampagnen, setKampagnen] = useState<Kampagne[]>([])
  const [laedt, setLaedt] = useState(true)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)
  const [bearbeitet, setBearbeitet] = useState<Kampagne | null>(null)
  const [arbeitet, setArbeitet] = useState(false)
  const [filterWerte, setFilterWerte] = useState<{ quellen: Array<{ wert: string; anzahl: number }>; status: Array<{ wert: string; anzahl: number }> }>({ quellen: [], status: [] })
  const [empfaengerVorschau, setEmpfaengerVorschau] = useState<{
    anzahl: number
    gefiltert: Record<string, number>
    beispiele: Array<{ email: string; name: string; ort: string }>
  } | null>(null)

  async function laden() {
    setLaedt(true)
    try {
      const r = await api.get<{ data: Kampagne[] }>('/admin/campaigns')
      setKampagnen(r.data)
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Laden fehlgeschlagen' })
    } finally {
      setLaedt(false)
    }
  }

  useEffect(() => {
    void laden()
    api.get<{ data: typeof filterWerte }>('/admin/campaigns/filter-werte')
      .then((r) => setFilterWerte(r.data))
      .catch(() => {
        /* Filter bleiben leer */
      })
  }, [])

  async function neueKampagne() {
    setArbeitet(true)
    try {
      const r = await api.post<{ data: Kampagne }>('/admin/campaigns', {
        name: 'Neue Kampagne',
        betreff: 'Was Ihr Dach in {ort} an Strom liefern könnte',
        inhalt: VORLAGE,
        tagesbudget: 100,
        vonStunde: 9,
        bisStunde: 17,
        filter: { limit: 1000, mitAngebot: 'EGAL' },
      })
      setKampagnen([r.data, ...kampagnen])
      setBearbeitet(r.data)
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Anlegen fehlgeschlagen' })
    } finally {
      setArbeitet(false)
    }
  }

  async function speichern() {
    if (!bearbeitet) return
    setArbeitet(true)
    try {
      const r = await api.put<{ data: Kampagne }>(`/admin/campaigns/${bearbeitet.id}`, {
        name: bearbeitet.name,
        betreff: bearbeitet.betreff,
        inhalt: bearbeitet.inhalt,
        tagesbudget: bearbeitet.tagesbudget,
        vonStunde: bearbeitet.von_stunde,
        bisStunde: bearbeitet.bis_stunde,
        filter: bearbeitet.filter,
      })
      setKampagnen((alt) => alt.map((k) => (k.id === r.data.id ? { ...k, ...r.data } : k)))
      setMeldung({ art: 'ok', text: 'Gespeichert.' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen' })
    } finally {
      setArbeitet(false)
    }
  }

  async function empfaengerPruefen() {
    if (!bearbeitet) return
    setArbeitet(true)
    try {
      const r = await api.post<{ data: typeof empfaengerVorschau }>('/admin/campaigns/empfaenger/vorschau', bearbeitet.filter)
      setEmpfaengerVorschau(r.data)
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Vorschau fehlgeschlagen' })
    } finally {
      setArbeitet(false)
    }
  }

  async function empfaengerLaden() {
    if (!bearbeitet) return
    if (!confirm('Die gefundenen Empfänger werden der Kampagne zugeordnet. Fortfahren?')) return
    setArbeitet(true)
    try {
      const r = await api.post<{ data: { eingefuegt: number; bereitsVorhanden: number } }>(
        `/admin/campaigns/${bearbeitet.id}/empfaenger-laden`, {}
      )
      setMeldung({
        art: 'ok',
        text: `${r.data.eingefuegt} Empfänger übernommen${r.data.bereitsVorhanden ? `, ${r.data.bereitsVorhanden} waren schon drin` : ''}.`,
      })
      void laden()
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Laden fehlgeschlagen' })
    } finally {
      setArbeitet(false)
    }
  }

  async function testmail() {
    if (!bearbeitet) return
    const an = prompt('An welche Adresse soll die Testmail gehen?')
    if (!an) return
    setArbeitet(true)
    try {
      await api.post(`/admin/campaigns/${bearbeitet.id}/testmail`, { an })
      setMeldung({ art: 'ok', text: `Testmail an ${an} verschickt.` })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Testmail fehlgeschlagen' })
    } finally {
      setArbeitet(false)
    }
  }

  async function statusSetzen(k: Kampagne, status: Kampagne['status']) {
    if (status === 'LAEUFT' && !confirm(
      `Die Kampagne verschickt ab jetzt bis zu ${k.tagesbudget} echte E-Mails pro Werktag. Fortfahren?`
    )) return
    setArbeitet(true)
    try {
      const r = await api.post<{ data: Kampagne }>(`/admin/campaigns/${k.id}/status`, { status })
      setKampagnen((alt) => alt.map((x) => (x.id === k.id ? { ...x, ...r.data } : x)))
      if (bearbeitet?.id === k.id) setBearbeitet({ ...bearbeitet, ...r.data })
      setMeldung({ art: 'ok', text: `Status: ${status}` })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Status setzen fehlgeschlagen' })
    } finally {
      setArbeitet(false)
    }
  }

  async function loeschen(k: Kampagne) {
    if (!confirm(`Kampagne "${k.name}" mit allen Empfängern löschen?`)) return
    await api.delete(`/admin/campaigns/${k.id}`)
    setKampagnen((alt) => alt.filter((x) => x.id !== k.id))
    if (bearbeitet?.id === k.id) setBearbeitet(null)
  }

  function filterAendern(patch: Partial<Filterwerte>) {
    if (!bearbeitet) return
    setBearbeitet({ ...bearbeitet, filter: { ...bearbeitet.filter, ...patch } })
    setEmpfaengerVorschau(null)
  }

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
        <div className="px-4 py-3 rounded-xl text-[13px] flex items-start gap-2"
          style={{
            background: meldung.art === 'ok' ? 'color-mix(in srgb, #34D399 10%, transparent)' : 'color-mix(in srgb, #F87171 10%, transparent)',
            border: `1px solid color-mix(in srgb, ${meldung.art === 'ok' ? '#34D399' : '#F87171'} 30%, transparent)`,
            color: meldung.art === 'ok' ? '#34D399' : '#F87171',
          }}>
          {meldung.art === 'ok' ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
          {meldung.text}
        </div>
      )}

      {/* Hinweis zur Zustellbarkeit */}
      <div className="px-4 py-3 rounded-xl text-[12px] flex items-start gap-2"
        style={{ background: 'color-mix(in srgb, #F59E0B 8%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)' }}>
        <Info size={14} className="shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
        <div className="text-text-dim leading-relaxed">
          <b style={{ color: '#F59E0B' }}>Vor dem ersten Start:</b> Ein Abmeldelink ist in jeder Mail
          eingebaut und Pflicht. Beginnen Sie mit einem kleinen Tagesbudget – 20 bis 30 Mails –
          und erhöhen Sie es über zwei Wochen. Wer sofort hundert kalte Mails am Tag verschickt,
          riskiert, dass künftig auch Offerten und Rechnungen im Spam landen.
        </div>
      </div>

      {/* Liste */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone size={16} strokeWidth={1.8} className="text-amber" />
          <h3 className="text-[14px] font-bold text-text">Kampagnen</h3>
        </div>
        <button type="button" onClick={neueKampagne} disabled={arbeitet}
          className="btn-primary flex items-center gap-1.5 px-3 py-2 text-[12px] disabled:opacity-40">
          <Plus size={13} strokeWidth={2} /> Neue Kampagne
        </button>
      </div>

      {kampagnen.length === 0 ? (
        <p className="text-[13px] text-text-dim py-6 text-center">Noch keine Kampagne angelegt.</p>
      ) : (
        <div className="space-y-2">
          {kampagnen.map((k) => (
            <div key={k.id} className="rounded-xl p-4"
              style={{
                background: bearbeitet?.id === k.id ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${bearbeitet?.id === k.id ? 'color-mix(in srgb, #F59E0B 30%, transparent)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <button type="button" onClick={() => { setBearbeitet(k); setEmpfaengerVorschau(null) }} className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-bold text-text truncate">{k.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                      style={{ background: `color-mix(in srgb, ${STATUS_FARBE[k.status]} 15%, transparent)`, color: STATUS_FARBE[k.status] }}>
                      {k.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-text-dim truncate">{k.betreff}</div>
                </button>
                <div className="flex gap-1.5 shrink-0">
                  {k.status !== 'LAEUFT' ? (
                    <button type="button" onClick={() => statusSetzen(k, 'LAEUFT')} disabled={arbeitet}
                      className="p-2 rounded-lg" title="Starten"
                      style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399' }}>
                      <Play size={13} strokeWidth={2} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => statusSetzen(k, 'PAUSIERT')} disabled={arbeitet}
                      className="p-2 rounded-lg" title="Pausieren"
                      style={{ background: 'color-mix(in srgb, #FBBF24 12%, transparent)', color: '#FBBF24' }}>
                      <Pause size={13} strokeWidth={2} />
                    </button>
                  )}
                  <button type="button" onClick={() => loeschen(k)} className="p-2 rounded-lg text-text-dim hover:text-red" title="Löschen">
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { icon: Users, wert: k.empfaenger ?? 0, label: 'Empfänger', farbe: '#94A3B8' },
                  { icon: Send, wert: k.gesendet ?? 0, label: 'gesendet', farbe: '#60A5FA' },
                  { icon: MailOpen, wert: k.geoeffnet ?? 0, label: 'geöffnet', farbe: '#A78BFA' },
                  { icon: MousePointerClick, wert: k.geklickt ?? 0, label: 'geklickt', farbe: '#F59E0B' },
                  { icon: UserCheck, wert: k.konvertiert ?? 0, label: 'Anfragen', farbe: '#34D399' },
                ].map((z) => (
                  <div key={z.label} className="px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-1.5">
                      <z.icon size={11} strokeWidth={2} style={{ color: z.farbe }} />
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: z.farbe }}>{z.wert}</span>
                    </div>
                    <div className="text-[10px] text-text-dim mt-0.5">{z.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bearbeiten */}
      {bearbeitet && (
        <div className="glass-card p-5 space-y-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-text">{bearbeitet.name} bearbeiten</h3>
            <div className="flex gap-2">
              <button type="button" onClick={testmail} disabled={arbeitet}
                className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-40">
                <Send size={12} strokeWidth={2} /> Testmail
              </button>
              <button type="button" onClick={speichern} disabled={arbeitet}
                className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-40">
                {arbeitet ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} strokeWidth={2} />} Speichern
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Name (intern)</label>
              <input value={bearbeitet.name} onChange={(e) => setBearbeitet({ ...bearbeitet, name: e.target.value })}
                className="glass-input w-full px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Betreff</label>
              <input value={bearbeitet.betreff} onChange={(e) => setBearbeitet({ ...bearbeitet, betreff: e.target.value })}
                className="glass-input w-full px-3 py-2 text-[13px]" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">
              Inhalt (HTML)
            </label>
            <textarea rows={12} value={bearbeitet.inhalt} onChange={(e) => setBearbeitet({ ...bearbeitet, inhalt: e.target.value })}
              className="glass-input w-full px-3 py-2 text-[12px]" style={{ fontFamily: 'ui-monospace, monospace', lineHeight: 1.6 }} />
            <div className="flex flex-wrap gap-1 mt-2">
              {['{anrede}', '{vorname}', '{nachname}', '{name}', '{ort}', '{link}', '{abmelden}'].map((p) => (
                <button key={p} type="button"
                  onClick={() => setBearbeitet({ ...bearbeitet, inhalt: bearbeitet.inhalt + ' ' + p })}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#60A5FA' }}>
                  {p}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-dim mt-1.5">
              <b>{'{link}'}</b> führt zum Selbstplaner und zählt den Klick. <b>{'{abmelden}'}</b> wird
              automatisch angehängt, falls Sie es weglassen – ohne Abmeldelink darf nicht versendet werden.
            </p>
          </div>

          {/* Vorschau */}
          <div className="p-4 rounded-lg" style={{ background: '#FFFFFF' }}>
            <div className="text-[10px] mb-2 font-semibold" style={{ color: '#6B7280' }}>Vorschau</div>
            <div className="text-[14px] font-bold mb-3" style={{ color: '#111827' }}>
              {bearbeitet.betreff.replace(/\{ort\}/g, 'Herisau').replace(/\{vorname\}/g, 'Peter').replace(/\{anrede\}/g, 'Peter')}
            </div>
            <div className="text-[13px]" style={{ color: '#374151' }}
              dangerouslySetInnerHTML={{
                __html: bearbeitet.inhalt
                  .replace(/\{anrede\}/g, 'Herr Muster')
                  .replace(/\{vorname\}/g, 'Peter')
                  .replace(/\{nachname\}/g, 'Muster')
                  .replace(/\{name\}/g, 'Peter Muster')
                  .replace(/\{ort\}/g, 'Herisau')
                  .replace(/\{link\}/g, '#')
                  .replace(/\{abmelden\}/g, '#'),
              }} />
          </div>

          {/* Versandtempo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Pro Werktag</label>
              <input type="number" min={1} max={2000} value={bearbeitet.tagesbudget}
                onChange={(e) => setBearbeitet({ ...bearbeitet, tagesbudget: Number(e.target.value) })}
                className="glass-input w-full px-3 py-2 text-[13px] tabular-nums" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Ab Uhr</label>
              <input type="number" min={0} max={23} value={bearbeitet.von_stunde}
                onChange={(e) => setBearbeitet({ ...bearbeitet, von_stunde: Number(e.target.value) })}
                className="glass-input w-full px-3 py-2 text-[13px] tabular-nums" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Bis Uhr</label>
              <input type="number" min={1} max={24} value={bearbeitet.bis_stunde}
                onChange={(e) => setBearbeitet({ ...bearbeitet, bis_stunde: Number(e.target.value) })}
                className="glass-input w-full px-3 py-2 text-[13px] tabular-nums" />
            </div>
          </div>

          {/* Empfaenger */}
          <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} strokeWidth={1.8} className="text-amber" />
              <h4 className="text-[13px] font-bold text-text">Wer wird angeschrieben?</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">Quellen</label>
                <div className="flex flex-wrap gap-1">
                  {filterWerte.quellen.slice(0, 12).map((q) => {
                    const an = bearbeitet.filter.quellen?.includes(q.wert) ?? false
                    return (
                      <button key={q.wert} type="button"
                        onClick={() => {
                          const alt = bearbeitet.filter.quellen ?? []
                          filterAendern({ quellen: an ? alt.filter((x) => x !== q.wert) : [...alt, q.wert] })
                        }}
                        className="px-2 py-1 rounded-md text-[10px] font-semibold"
                        style={{
                          background: an ? 'color-mix(in srgb, #F59E0B 16%, transparent)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${an ? 'color-mix(in srgb, #F59E0B 40%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                          color: an ? '#F59E0B' : undefined,
                        }}>
                        {q.wert} <span className="opacity-60">{q.anzahl}</span>
                      </button>
                    )
                  })}
                  {!filterWerte.quellen.length && <span className="text-[11px] text-text-dim">keine Angabe – es werden alle Quellen genommen</span>}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">Angebot vorhanden</label>
                <select value={bearbeitet.filter.mitAngebot ?? 'EGAL'}
                  onChange={(e) => filterAendern({ mitAngebot: e.target.value as Filterwerte['mitAngebot'] })}
                  className="glass-input w-full px-3 py-2 text-[13px]">
                  <option value="EGAL">Egal</option>
                  <option value="NUR_MIT">Nur Kontakte mit Angebot</option>
                  <option value="NUR_OHNE">Nur Kontakte ohne Angebot</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Lead ab</label>
                <input type="date" value={bearbeitet.filter.abDatum?.slice(0, 10) ?? ''}
                  onChange={(e) => filterAendern({ abDatum: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="glass-input w-full px-3 py-2 text-[12px]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Lead bis</label>
                <input type="date" value={bearbeitet.filter.bisDatum?.slice(0, 10) ?? ''}
                  onChange={(e) => filterAendern({ bisDatum: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="glass-input w-full px-3 py-2 text-[12px]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Höchstens</label>
                <input type="number" min={1} max={200000} value={bearbeitet.filter.limit ?? 1000}
                  onChange={(e) => filterAendern({ limit: Number(e.target.value) })}
                  className="glass-input w-full px-3 py-2 text-[12px] tabular-nums" />
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <button type="button" onClick={empfaengerPruefen} disabled={arbeitet}
                className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px] disabled:opacity-40">
                {arbeitet ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} strokeWidth={2} />}
                Wie viele wären das?
              </button>
              {empfaengerVorschau && (
                <button type="button" onClick={empfaengerLaden} disabled={arbeitet || !empfaengerVorschau.anzahl}
                  className="btn-primary flex items-center gap-1.5 px-3 py-2 text-[12px] disabled:opacity-40">
                  <Users size={13} strokeWidth={2} /> {empfaengerVorschau.anzahl} übernehmen
                </button>
              )}
            </div>

            {empfaengerVorschau && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[20px] font-bold text-amber tabular-nums mb-1">{empfaengerVorschau.anzahl}</div>
                <div className="text-[11px] text-text-dim mb-2">Empfänger nach Abzug von Abmeldungen, Rückläufern und Dubletten</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-dim mb-2">
                  {Object.entries(empfaengerVorschau.gefiltert)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <span key={k}>
                        {({
                          ohneAdresse: 'ohne E-Mail', abgemeldet: 'abgemeldet oder Rückläufer',
                          doppelt: 'Dubletten', angebotsfilter: 'durch Angebotsfilter', ruecklaeufer: 'Rückläufer',
                        } as Record<string, string>)[k] ?? k}: <b>{v}</b>
                      </span>
                    ))}
                </div>
                {empfaengerVorschau.beispiele.length > 0 && (
                  <div className="text-[10px] text-text-dim">
                    Zum Beispiel: {empfaengerVorschau.beispiele.slice(0, 3).map((b) => `${b.name || b.email}${b.ort ? ` (${b.ort})` : ''}`).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
