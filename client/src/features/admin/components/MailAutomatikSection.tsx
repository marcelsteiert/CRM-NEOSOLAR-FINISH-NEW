import { useEffect, useState } from 'react'
import {
  Repeat, Mail, ListChecks, Play, Eye, Save, RotateCcw, Plus, Trash2,
  Loader2, AlertTriangle, CheckCircle2, Clock, Power,
} from 'lucide-react'
import { api } from '@/lib/api'

interface Stufe {
  kuerzel: string
  tage: number
  kanal: 'AUFGABE' | 'EMAIL'
  titel: string
  text: string
  prioritaet: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  aktiv?: boolean
  mailBetreff?: string | null
  mailText?: string | null
}

interface Einstellungen {
  aktiv: boolean
  abDatum: string | null
  testEmpfaenger: string | null
  versandbereit: boolean
  versandMeldung: string
  absender: string
}

interface VorschauZeile {
  kunde: string
  kundenMail: string
  alterTage: number
  stufe: string
  aktion: 'MAIL' | 'AUFGABE'
  betreff?: string
  empfaenger?: string
}

/**
 * Steuert das automatische Nachfassen bei offenen Angeboten.
 *
 * Der Aufbau folgt dem Weg, den man vor dem Scharfschalten gehen sollte:
 * erst sehen, was passieren wuerde, dann mit einem Testempfaenger pruefen,
 * dann einschalten.
 */
export default function MailAutomatikSection() {
  const [stufen, setStufen] = useState<Stufe[]>([])
  const [platzhalter, setPlatzhalter] = useState<Array<{ name: string; beschreibung: string }>>([])
  const [einst, setEinst] = useState<Einstellungen | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [speichert, setSpeichert] = useState(false)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)
  const [vorschau, setVorschau] = useState<{ zeilen: VorschauZeile[]; mails: number; aufgaben: number } | null>(null)
  const [offen, setOffen] = useState<string | null>(null)

  async function laden() {
    setLaedt(true)
    try {
      const [s, e] = await Promise.all([
        api.get<{ data: { stufen: Stufe[]; platzhalter: Array<{ name: string; beschreibung: string }> } }>('/follow-up/stufen'),
        api.get<{ data: Einstellungen }>('/follow-up/einstellungen'),
      ])
      setStufen(s.data.stufen)
      setPlatzhalter(s.data.platzhalter)
      setEinst(e.data)
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Laden fehlgeschlagen' })
    } finally {
      setLaedt(false)
    }
  }

  useEffect(() => {
    void laden()
  }, [])

  async function stufenSpeichern() {
    setSpeichert(true)
    setMeldung(null)
    try {
      await api.put('/follow-up/stufen', { stufen })
      setMeldung({ art: 'ok', text: 'Die Stufen wurden gespeichert.' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen' })
    } finally {
      setSpeichert(false)
    }
  }

  async function einstellungenSpeichern(neu: Partial<Einstellungen>) {
    if (!einst) return
    const zusammen = { ...einst, ...neu }
    setEinst(zusammen)
    try {
      await api.put('/follow-up/einstellungen', {
        aktiv: zusammen.aktiv,
        abDatum: zusammen.abDatum,
        testEmpfaenger: zusammen.testEmpfaenger,
      })
      setMeldung({ art: 'ok', text: 'Einstellung übernommen.' })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen' })
      void laden()
    }
  }

  async function vorschauHolen() {
    setMeldung(null)
    try {
      const r = await api.post<{ data: { vorschau: VorschauZeile[]; mailsGesendet: number; aufgabenErstellt: number } }>(
        '/follow-up/vorschau', {}
      )
      setVorschau({
        zeilen: r.data.vorschau ?? [],
        mails: r.data.mailsGesendet,
        aufgaben: r.data.aufgabenErstellt,
      })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Vorschau fehlgeschlagen' })
    }
  }

  async function jetztAusfuehren() {
    if (!confirm('Der Lauf verschickt jetzt echte E-Mails und legt Aufgaben an. Fortfahren?')) return
    setSpeichert(true)
    try {
      const r = await api.post<{ data: { mailsGesendet: number; aufgabenErstellt: number; mailsFehlgeschlagen: number } }>(
        '/follow-up/jetzt-ausfuehren', {}
      )
      setMeldung({
        art: 'ok',
        text: `${r.data.mailsGesendet} Mails verschickt, ${r.data.aufgabenErstellt} Aufgaben angelegt, ${r.data.mailsFehlgeschlagen} fehlgeschlagen.`,
      })
    } catch (err) {
      setMeldung({ art: 'fehler', text: err instanceof Error ? err.message : 'Lauf fehlgeschlagen' })
    } finally {
      setSpeichert(false)
    }
  }

  function stufeAendern(i: number, patch: Partial<Stufe>) {
    setStufen((alt) => alt.map((s, j) => (j === i ? { ...s, ...patch } : s)))
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

      {/* Hauptschalter */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Power size={16} strokeWidth={1.8} className={einst?.aktiv ? 'text-emerald' : 'text-text-dim'} />
              <h3 className="text-[14px] font-bold text-text">
                Automatik ist {einst?.aktiv ? 'eingeschaltet' : 'ausgeschaltet'}
              </h3>
            </div>
            <p className="text-[12px] text-text-dim">
              {einst?.aktiv
                ? 'Der tägliche Lauf verschickt Mails und legt Aufgaben an.'
                : 'Es wird nichts verschickt. Der Trockenlauf funktioniert trotzdem.'}
            </p>
          </div>
          <button type="button" onClick={() => einstellungenSpeichern({ aktiv: !einst?.aktiv })}
            className={einst?.aktiv ? 'btn-secondary px-4 py-2 text-[12px]' : 'btn-primary px-4 py-2 text-[12px]'}>
            {einst?.aktiv ? 'Ausschalten' : 'Einschalten'}
          </button>
        </div>

        <div className="p-3 rounded-lg mb-4 text-[12px] flex items-start gap-2"
          style={{
            background: einst?.versandbereit ? 'color-mix(in srgb, #34D399 8%, transparent)' : 'color-mix(in srgb, #F59E0B 8%, transparent)',
            border: `1px solid color-mix(in srgb, ${einst?.versandbereit ? '#34D399' : '#F59E0B'} 25%, transparent)`,
          }}>
          <Mail size={14} className="shrink-0 mt-0.5" style={{ color: einst?.versandbereit ? '#34D399' : '#F59E0B' }} />
          <div>
            <div className="font-semibold" style={{ color: einst?.versandbereit ? '#34D399' : '#F59E0B' }}>
              Absender {einst?.absender}
            </div>
            <div className="text-text-dim mt-0.5">{einst?.versandMeldung}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
              Nur Angebote ab diesem Datum
            </label>
            <input type="date" value={einst?.abDatum?.slice(0, 10) ?? ''}
              onChange={(e) => einstellungenSpeichern({ abDatum: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="glass-input w-full px-3 py-2 text-[13px]" />
            <p className="text-[10px] text-text-dim mt-1">
              Schützt den Altbestand. Ohne Stichtag würde beim ersten Lauf jeder Kunde mit
              offenem Angebot der letzten 120 Tage angeschrieben.
            </p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-dim font-semibold block mb-1.5">
              Testempfänger
            </label>
            <input type="email" value={einst?.testEmpfaenger ?? ''}
              onChange={(e) => setEinst((v) => (v ? { ...v, testEmpfaenger: e.target.value } : v))}
              onBlur={() => einstellungenSpeichern({ testEmpfaenger: einst?.testEmpfaenger || null })}
              placeholder="leer lassen für echten Versand"
              className="glass-input w-full px-3 py-2 text-[13px]" />
            <p className="text-[10px] text-text-dim mt-1">
              Ist eine Adresse eingetragen, gehen alle Mails dorthin statt an den Kunden.
              Der eigentliche Empfänger steht im Betreff.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button type="button" onClick={vorschauHolen} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px]">
            <Eye size={13} strokeWidth={2} /> Trockenlauf
          </button>
          <button type="button" onClick={jetztAusfuehren} disabled={speichert}
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px] disabled:opacity-40">
            {speichert ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} strokeWidth={2} />}
            Jetzt ausführen
          </button>
        </div>
      </div>

      {/* Vorschau */}
      {vorschau && (
        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-[14px] font-bold text-text mb-1">Das würde der nächste Lauf tun</h3>
          <p className="text-[12px] text-text-dim mb-4">
            {vorschau.mails} E-Mails und {vorschau.aufgaben} Aufgaben. Es wurde nichts verschickt.
          </p>
          {vorschau.zeilen.length === 0 ? (
            <p className="text-[13px] text-text-dim">Zurzeit ist keine Stufe fällig.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Stufe', 'Kunde', 'Alter', 'Aktion', 'Empfänger'].map((h) => (
                      <th key={h} className="py-2 px-2 text-left text-text-dim font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vorschau.zeilen.slice(0, 50).map((z, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td className="py-1.5 px-2 font-semibold text-amber">{z.stufe}</td>
                      <td className="py-1.5 px-2 text-text-sec">{z.kunde}</td>
                      <td className="py-1.5 px-2 text-text-dim tabular-nums">{z.alterTage} T.</td>
                      <td className="py-1.5 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: z.aktion === 'MAIL' ? 'color-mix(in srgb, #60A5FA 15%, transparent)' : 'color-mix(in srgb, #FBBF24 15%, transparent)',
                            color: z.aktion === 'MAIL' ? '#60A5FA' : '#FBBF24',
                          }}>
                          {z.aktion === 'MAIL' ? 'E-Mail' : 'Aufgabe'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-text-dim">{z.empfaenger ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vorschau.zeilen.length > 50 && (
                <p className="text-[11px] text-text-dim mt-2">… und {vorschau.zeilen.length - 50} weitere</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stufen */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListChecks size={16} strokeWidth={1.8} className="text-amber" />
            <h3 className="text-[14px] font-bold text-text">Ablauf: wann was passiert</h3>
          </div>
          <div className="flex gap-2">
            <button type="button"
              onClick={async () => {
                if (!confirm('Alle Stufen auf die Vorgabe zurücksetzen?')) return
                const r = await api.post<{ data: Stufe[] }>('/follow-up/stufen/zuruecksetzen', {})
                setStufen(r.data)
                setMeldung({ art: 'ok', text: 'Zurückgesetzt.' })
              }}
              className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]">
              <RotateCcw size={12} strokeWidth={2} /> Zurücksetzen
            </button>
            <button type="button" onClick={stufenSpeichern} disabled={speichert}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-40">
              {speichert ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} strokeWidth={2} />}
              Speichern
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {stufen.map((s, i) => {
            const auf = offen === s.kuerzel
            return (
              <div key={s.kuerzel} className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button type="button" onClick={() => setOffen(auf ? null : s.kuerzel)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02]">
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold shrink-0"
                    style={{ background: 'color-mix(in srgb, #F59E0B 14%, transparent)', color: '#F59E0B' }}>
                    <Clock size={11} strokeWidth={2} /> Tag {s.tage}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                    style={{
                      background: s.kanal === 'EMAIL' ? 'color-mix(in srgb, #60A5FA 15%, transparent)' : 'color-mix(in srgb, #FBBF24 15%, transparent)',
                      color: s.kanal === 'EMAIL' ? '#60A5FA' : '#FBBF24',
                    }}>
                    {s.kanal === 'EMAIL' ? 'E-Mail' : 'Aufgabe'}
                  </span>
                  <span className="text-[13px] text-text flex-1 truncate">{s.titel}</span>
                  {s.aktiv === false && <span className="text-[10px] text-text-dim shrink-0">ausgeschaltet</span>}
                </button>

                {auf && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Kürzel</label>
                        <input value={s.kuerzel} onChange={(e) => stufeAendern(i, { kuerzel: e.target.value })}
                          className="glass-input w-full px-2.5 py-1.5 text-[12px]" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Nach Tagen</label>
                        <input type="number" value={s.tage} onChange={(e) => stufeAendern(i, { tage: Number(e.target.value) })}
                          className="glass-input w-full px-2.5 py-1.5 text-[12px] tabular-nums" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Art</label>
                        <select value={s.kanal} onChange={(e) => stufeAendern(i, { kanal: e.target.value as 'AUFGABE' | 'EMAIL' })}
                          className="glass-input w-full px-2.5 py-1.5 text-[12px]">
                          <option value="AUFGABE">Aufgabe für den Verkäufer</option>
                          <option value="EMAIL">E-Mail an den Kunden</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Aktiv</label>
                        <button type="button" onClick={() => stufeAendern(i, { aktiv: s.aktiv === false })}
                          className="w-full px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
                          style={{
                            background: s.aktiv !== false ? 'color-mix(in srgb, #34D399 14%, transparent)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${s.aktiv !== false ? 'color-mix(in srgb, #34D399 35%, transparent)' : 'rgba(255,255,255,0.07)'}`,
                            color: s.aktiv !== false ? '#34D399' : undefined,
                          }}>
                          {s.aktiv !== false ? 'Ja' : 'Nein'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Bezeichnung</label>
                      <input value={s.titel} onChange={(e) => stufeAendern(i, { titel: e.target.value })}
                        className="glass-input w-full px-3 py-2 text-[12px]" />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">
                        {s.kanal === 'EMAIL' ? 'Notiz im Verlauf' : 'Beschreibung der Aufgabe'}
                      </label>
                      <textarea rows={2} value={s.text} onChange={(e) => stufeAendern(i, { text: e.target.value })}
                        className="glass-input w-full px-3 py-2 text-[12px]" />
                    </div>

                    {s.kanal === 'EMAIL' && (
                      <>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">Betreff</label>
                          <input value={s.mailBetreff ?? ''} onChange={(e) => stufeAendern(i, { mailBetreff: e.target.value })}
                            className="glass-input w-full px-3 py-2 text-[12px]" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-text-dim font-semibold block mb-1">
                            Text der E-Mail (HTML erlaubt)
                          </label>
                          <textarea rows={6} value={s.mailText ?? ''} onChange={(e) => stufeAendern(i, { mailText: e.target.value })}
                            className="glass-input w-full px-3 py-2 text-[12px]" style={{ fontFamily: 'ui-monospace, monospace', lineHeight: 1.6 }} />
                          <div className="flex flex-wrap gap-1 mt-2">
                            {platzhalter.map((p) => (
                              <button key={p.name} type="button" title={p.beschreibung}
                                onClick={() => stufeAendern(i, { mailText: (s.mailText ?? '') + ' ' + p.name })}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#60A5FA' }}>
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Vorschau mit Beispieldaten */}
                        <div className="p-3 rounded-lg" style={{ background: '#FFFFFF' }}>
                          <div className="text-[10px] mb-2 font-semibold" style={{ color: '#6B7280' }}>Vorschau</div>
                          <div className="text-[13px] font-bold mb-2" style={{ color: '#111827' }}>
                            {(s.mailBetreff ?? '').replace(/\{kunde\}/g, 'Familie Muster').replace(/\{betrag\}/g, "CHF 32'800")}
                          </div>
                          <div className="text-[12px]" style={{ color: '#374151', lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{
                              __html: (s.mailText ?? '')
                                .replace(/\{kunde\}/g, 'Familie Muster')
                                .replace(/\{vorname\}/g, 'Peter')
                                .replace(/\{betrag\}/g, "CHF 32'800")
                                .replace(/\{angebot\}/g, 'Offerte 12 kWp')
                                .replace(/\{tage\}/g, '5')
                                .replace(/\{verkaeufer\}/g, 'Andreas Böhler'),
                            }} />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end pt-1">
                      <button type="button"
                        onClick={() => { setStufen((alt) => alt.filter((_, j) => j !== i)); setOffen(null) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
                        style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', border: '1px solid color-mix(in srgb, #F87171 30%, transparent)', color: '#F87171' }}>
                        <Trash2 size={12} strokeWidth={2} /> Stufe entfernen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button type="button"
          onClick={() => {
            const neu: Stufe = {
              kuerzel: `NF${Date.now().toString().slice(-3)}`,
              tage: (stufen[stufen.length - 1]?.tage ?? 0) + 10,
              kanal: 'AUFGABE',
              titel: 'Neue Stufe',
              text: 'Was soll passieren?',
              prioritaet: 'MEDIUM',
            }
            setStufen([...stufen, neu])
            setOffen(neu.kuerzel)
          }}
          className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px] mt-3">
          <Plus size={13} strokeWidth={2} /> Stufe hinzufügen
        </button>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-text-dim px-1">
        <Repeat size={13} className="shrink-0 mt-0.5" />
        <p>
          Der Lauf startet werktags um 9:15 Uhr. Jede Stufe greift nur einmal je Angebot – das
          wird über das Kürzel in Aufgabe und Verlauf geprüft. Bei Angeboten mit Status Gewonnen
          oder Verloren passiert nichts mehr.
        </p>
      </div>
    </div>
  )
}
