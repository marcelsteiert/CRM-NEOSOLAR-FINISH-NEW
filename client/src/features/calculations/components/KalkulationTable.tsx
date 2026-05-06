import { useMemo, useState } from 'react'
import { Search, ExternalLink, Check, FileText, X as XIcon } from 'lucide-react'
import {
  useTrackedProjects, useUpdateCalculation,
  totalKosten, margeChf, margePct, trancheBetrag,
  type TrackedProject, type Calculation, type PaymentStatus,
} from '@/hooks/useProjectTracking'
import { NumberCell, TextCell, DateCell } from './StatusPill'

const formatAddr = (p: TrackedProject) => {
  const c = p.contact
  if (!c) return p.name
  const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.company || p.name
  return name
}

const CHF = (n: number) =>
  n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " CHF"

const margeColor = (pct: number) => (pct < 25 ? '#F87171' : pct < 35 ? '#F59E0B' : '#34D399')

const STATUS_OPTIONS: { id: PaymentStatus; label: string; color: string }[] = [
  { id: 'OFFEN',      label: 'Offen',      color: '#94A3B8' },
  { id: 'IN_ARBEIT',  label: 'In Arbeit',  color: '#60A5FA' },
  { id: 'KASSIERT',   label: 'Kassiert ✓', color: '#34D399' },
  { id: 'FAKTURIERT', label: 'Fakturiert →', color: '#F59E0B' },
  { id: 'VERLUST',    label: 'Verlust ✗',  color: '#F87171' },
]

interface Props {
  onOpenProject?: (projectId: string) => void
}

export default function KalkulationTable({ onOpenProject }: Props) {
  const { data, isLoading } = useTrackedProjects()
  const updateCalc = useUpdateCalculation()
  const [search, setSearch] = useState('')

  const projects = useMemo(() => {
    let items = data?.data ?? []
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((p) => formatAddr(p).toLowerCase().includes(q))
    }
    return items
  }, [data, search])

  // Footer-Summen
  const totals = useMemo(() => {
    const t = {
      material: 0, elektriker: 0, montage: 0, kosten: 0, vk: 0, marge: 0,
      a1Kassiert: 0, a1Fakturiert: 0, a1Offen: 0,
      a2Kassiert: 0, a2Fakturiert: 0, a2Offen: 0,
      a3Kassiert: 0, a3Fakturiert: 0, a3Offen: 0,
      offenTotal: 0,
    }
    for (const p of projects) {
      const c = p.calculation
      if (!c) continue
      t.material += c.materialKranich ?? 0
      t.elektriker += c.elektriker ?? 0
      t.montage += c.montageSergej ?? 0
      t.kosten += totalKosten(c)
      t.vk += c.vkBetrag ?? 0
      t.marge += margeChf(c)
      const a1 = trancheBetrag(c, 'a1')
      const a2 = trancheBetrag(c, 'a2')
      const a3 = trancheBetrag(c, 'a3')
      if (c.a1KassiertAm) t.a1Kassiert += a1
      else if (c.a1FakturiertAm) t.a1Fakturiert += a1
      else t.a1Offen += a1
      if (c.a2KassiertAm) t.a2Kassiert += a2
      else if (c.a2FakturiertAm) t.a2Fakturiert += a2
      else t.a2Offen += a2
      if (c.a3KassiertAm) t.a3Kassiert += a3
      else if (c.a3FakturiertAm) t.a3Fakturiert += a3
      else t.a3Offen += a3
    }
    t.offenTotal = t.a1Offen + t.a2Offen + t.a3Offen + t.a1Fakturiert + t.a2Fakturiert + t.a3Fakturiert
    return t
  }, [projects])

  const patch = (projectId: string, p: Partial<Calculation>) =>
    updateCalc.mutate({ projectId, patch: p })

  return (
    <div className="space-y-3">
      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            className="glass-input w-full pl-9 text-xs"
            placeholder="Baustelle suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <div className="glass-card p-12 text-center text-text-dim text-sm">Daten werden geladen...</div>}

      {!isLoading && projects.length === 0 && (
        <div className="glass-card p-12 text-center text-text-dim text-sm">Keine Baustellen gefunden</div>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-bg-sub/30">
                  <Th sticky>Baustelle</Th>
                  <Th right>Material Kranich</Th>
                  <Th right>Elektriker</Th>
                  <Th right>Montage Sergej</Th>
                  <Th right>Total Kosten</Th>
                  <Th right>VK</Th>
                  <Th right>Marge CHF</Th>
                  <Th right>Marge %</Th>
                  <Th right>A1 (50%)</Th>
                  <Th right>A2 (40%)</Th>
                  <Th right>A3 (10%)</Th>
                  <Th right>Noch offen</Th>
                  <Th>Status</Th>
                  <Th>Bemerkung</Th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const c = p.calculation
                  const tk = totalKosten(c)
                  const mc = margeChf(c)
                  const mp = margePct(c)
                  const a1 = trancheBetrag(c, 'a1')
                  const a2 = trancheBetrag(c, 'a2')
                  const a3 = trancheBetrag(c, 'a3')
                  const offenTotal = (c?.a1KassiertAm ? 0 : a1) + (c?.a2KassiertAm ? 0 : a2) + (c?.a3KassiertAm ? 0 : a3)

                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors">
                      <Td sticky>
                        <div className="flex items-center gap-2 min-w-[180px] max-w-[220px]">
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(p.id)}
                            className="text-[11px] text-text font-semibold truncate hover:text-amber transition-colors text-left flex-1"
                          >
                            {formatAddr(p)}
                          </button>
                          <button onClick={() => onOpenProject?.(p.id)} className="text-text-dim hover:text-amber"><ExternalLink size={11} strokeWidth={1.8} /></button>
                        </div>
                      </Td>
                      <Td right>
                        <NumberCell value={c?.materialKranich ?? null} onSave={(v) => patch(p.id, { materialKranich: v })} />
                      </Td>
                      <Td right>
                        <NumberCell value={c?.elektriker ?? null} onSave={(v) => patch(p.id, { elektriker: v })} />
                      </Td>
                      <Td right>
                        <NumberCell value={c?.montageSergej ?? null} onSave={(v) => patch(p.id, { montageSergej: v })} />
                      </Td>
                      <Td right><span className="text-[11px] tabular-nums text-text font-semibold">{CHF(tk)}</span></Td>
                      <Td right>
                        <NumberCell value={c?.vkBetrag ?? null} onSave={(v) => patch(p.id, { vkBetrag: v })} />
                      </Td>
                      <Td right>
                        <span className="text-[11px] tabular-nums font-semibold" style={{ color: margeColor(mp) }}>{CHF(mc)}</span>
                      </Td>
                      <Td right>
                        <span className="text-[11px] tabular-nums font-bold" style={{ color: margeColor(mp) }}>{mp.toFixed(1)}%</span>
                      </Td>

                      <TrancheCell
                        amount={a1}
                        kassiertAm={c?.a1KassiertAm ?? null}
                        fakturiertAm={c?.a1FakturiertAm ?? null}
                        onKassiert={(d) => patch(p.id, { a1KassiertAm: d })}
                        onFakturiert={(d) => patch(p.id, { a1FakturiertAm: d })}
                      />
                      <TrancheCell
                        amount={a2}
                        kassiertAm={c?.a2KassiertAm ?? null}
                        fakturiertAm={c?.a2FakturiertAm ?? null}
                        onKassiert={(d) => patch(p.id, { a2KassiertAm: d })}
                        onFakturiert={(d) => patch(p.id, { a2FakturiertAm: d })}
                      />
                      <TrancheCell
                        amount={a3}
                        kassiertAm={c?.a3KassiertAm ?? null}
                        fakturiertAm={c?.a3FakturiertAm ?? null}
                        onKassiert={(d) => patch(p.id, { a3KassiertAm: d })}
                        onFakturiert={(d) => patch(p.id, { a3FakturiertAm: d })}
                      />

                      <Td right>
                        <span className="text-[11px] tabular-nums font-semibold text-amber">{CHF(offenTotal)}</span>
                      </Td>

                      <Td>
                        <StatusSelect
                          value={c?.paymentStatus ?? 'OFFEN'}
                          onChange={(s) => patch(p.id, { paymentStatus: s })}
                        />
                      </Td>

                      <Td>
                        <TextCell value={c?.bemerkung ?? null} onSave={(v) => patch(p.id, { bemerkung: v })} placeholder="..." />
                      </Td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer-Summen */}
              <tfoot>
                <tr className="border-t-2 border-amber/30 bg-bg-sub/40">
                  <Td sticky><span className="text-[11px] font-bold uppercase tracking-[0.06em] text-amber">Total</span></Td>
                  <Td right><FootCHF n={totals.material} /></Td>
                  <Td right><FootCHF n={totals.elektriker} /></Td>
                  <Td right><FootCHF n={totals.montage} /></Td>
                  <Td right><FootCHF n={totals.kosten} bold /></Td>
                  <Td right><FootCHF n={totals.vk} bold /></Td>
                  <Td right><FootCHF n={totals.marge} bold color={margeColor(totals.vk ? totals.marge / totals.vk * 100 : 0)} /></Td>
                  <Td right>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: margeColor(totals.vk ? totals.marge / totals.vk * 100 : 0) }}>
                      {totals.vk ? ((totals.marge / totals.vk) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </Td>
                  <Td right><FootCHF n={totals.a1Kassiert + totals.a1Fakturiert + totals.a1Offen} /></Td>
                  <Td right><FootCHF n={totals.a2Kassiert + totals.a2Fakturiert + totals.a2Offen} /></Td>
                  <Td right><FootCHF n={totals.a3Kassiert + totals.a3Fakturiert + totals.a3Offen} /></Td>
                  <Td right><FootCHF n={totals.offenTotal} bold color="#F59E0B" /></Td>
                  <Td colSpan={2}></Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Zusammenfassungs-Block */}
      {!isLoading && projects.length > 0 && (
        <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">Zusammenfassung Tranchen</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <Th></Th>
                  <Th right color="#34D399">Kassiert</Th>
                  <Th right color="#F59E0B">Fakturiert (unterwegs)</Th>
                  <Th right color="#94A3B8">Noch offen</Th>
                  <Th right>Total offen + unterwegs</Th>
                </tr>
              </thead>
              <tbody>
                <SumRow label="A1 (50%)" k={totals.a1Kassiert} f={totals.a1Fakturiert} o={totals.a1Offen} />
                <SumRow label="A2 (40%)" k={totals.a2Kassiert} f={totals.a2Fakturiert} o={totals.a2Offen} />
                <SumRow label="A3 (10%)" k={totals.a3Kassiert} f={totals.a3Fakturiert} o={totals.a3Offen} />
                <SumRow
                  label="TOTAL"
                  k={totals.a1Kassiert + totals.a2Kassiert + totals.a3Kassiert}
                  f={totals.a1Fakturiert + totals.a2Fakturiert + totals.a3Fakturiert}
                  o={totals.a1Offen + totals.a2Offen + totals.a3Offen}
                  bold
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tranchen-Zelle: Klick öffnet Mini-Menü mit Kassiert / Fakturiert / Reset
// ─────────────────────────────────────────────────────────────────────────────
function TrancheCell({
  amount, kassiertAm, fakturiertAm,
  onKassiert, onFakturiert,
}: {
  amount: number
  kassiertAm: string | null
  fakturiertAm: string | null
  onKassiert: (d: string | null) => void
  onFakturiert: (d: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const status = kassiertAm ? 'kassiert' : fakturiertAm ? 'fakturiert' : 'offen'
  const color = status === 'kassiert' ? '#34D399' : status === 'fakturiert' ? '#F59E0B' : '#94A3B8'

  return (
    <td className="px-2 py-2 align-top text-right relative">
      <div className="flex flex-col items-end gap-0.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[11px] tabular-nums font-semibold hover:text-amber transition-colors"
          style={{ color }}
        >
          {amount > 0 ? CHF(amount) : '–'}
        </button>
        {status !== 'offen' && (
          <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color }}>
            {status === 'kassiert' ? '✓ kassiert' : '→ fakturiert'}
          </span>
        )}
        <DateCell value={kassiertAm ?? fakturiertAm ?? null} onChange={() => {}} />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-[70] w-44 p-1 rounded-lg shadow-xl" style={{ background: '#0E1116', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => { onKassiert(today); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left hover:bg-surface-hover"
              style={{ color: '#34D399' }}
            >
              <Check size={11} strokeWidth={2.5} /> Kassiert (heute)
            </button>
            <button
              type="button"
              onClick={() => { onFakturiert(today); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left hover:bg-surface-hover"
              style={{ color: '#F59E0B' }}
            >
              <FileText size={11} strokeWidth={2} /> Fakturiert (heute)
            </button>
            <div className="border-t border-border/40 my-1" />
            <button
              type="button"
              onClick={() => { onKassiert(null); onFakturiert(null); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left hover:bg-surface-hover text-text-dim"
            >
              <XIcon size={11} strokeWidth={2} /> Zurück auf offen
            </button>
          </div>
        </>
      )}
    </td>
  )
}

function StatusSelect({ value, onChange }: { value: PaymentStatus; onChange: (s: PaymentStatus) => void }) {
  const opt = STATUS_OPTIONS.find((o) => o.id === value) ?? STATUS_OPTIONS[0]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PaymentStatus)}
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase outline-none cursor-pointer"
      style={{ background: `color-mix(in srgb, ${opt.color} 14%, transparent)`, color: opt.color, border: 'none' }}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.id} value={o.id} style={{ background: '#0E1116', color: '#fff' }}>{o.label}</option>
      ))}
    </select>
  )
}

function Th({ children, sticky, right, color }: { children?: React.ReactNode; sticky?: boolean; right?: boolean; color?: string }) {
  return (
    <th
      className={`px-2 py-2 text-[9px] font-bold uppercase tracking-[0.06em] whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${sticky ? 'sticky left-0 bg-bg-sub/95 backdrop-blur-md z-10' : ''}`}
      style={{ color: color ?? 'var(--text-dim, #94A3B8)' }}
    >
      {children}
    </th>
  )
}

function Td({ children, sticky, right, colSpan }: { children?: React.ReactNode; sticky?: boolean; right?: boolean; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className={`px-2 py-2 align-top ${right ? 'text-right' : ''} ${sticky ? 'sticky left-0 bg-bg/95 backdrop-blur-md z-10' : ''}`}
    >
      {children}
    </td>
  )
}

function FootCHF({ n, bold, color }: { n: number; bold?: boolean; color?: string }) {
  return (
    <span
      className={`text-[11px] tabular-nums ${bold ? 'font-bold' : 'font-semibold'}`}
      style={{ color: color ?? '#FFFFFF' }}
    >
      {CHF(n)}
    </span>
  )
}

function SumRow({ label, k, f, o, bold }: { label: string; k: number; f: number; o: number; bold?: boolean }) {
  return (
    <tr className={`border-b border-border/30 ${bold ? 'border-t-2 border-amber/30' : ''}`}>
      <td className={`px-2 py-2 ${bold ? 'font-bold text-amber' : 'text-text font-semibold'} text-[11px] uppercase tracking-[0.06em]`}>{label}</td>
      <td className="px-2 py-2 text-right text-[11px] tabular-nums" style={{ color: '#34D399' }}>{CHF(k)}</td>
      <td className="px-2 py-2 text-right text-[11px] tabular-nums" style={{ color: '#F59E0B' }}>{CHF(f)}</td>
      <td className="px-2 py-2 text-right text-[11px] tabular-nums text-text-dim">{CHF(o)}</td>
      <td className={`px-2 py-2 text-right text-[11px] tabular-nums ${bold ? 'font-bold' : 'font-semibold'} text-amber`}>{CHF(f + o)}</td>
    </tr>
  )
}
