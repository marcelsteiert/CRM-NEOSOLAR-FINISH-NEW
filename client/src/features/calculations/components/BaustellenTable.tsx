import { useMemo, useState } from 'react'
import { Search, AlertTriangle, ExternalLink, FileSpreadsheet, ChevronDown, ChevronRight, Minimize2, Maximize2 } from 'lucide-react'
import {
  useTrackedProjects, useUpdateConstruction,
  type TrackedProject, type Construction,
} from '@/hooks/useProjectTracking'
import StatusPill, { DateCell, TextCell } from './StatusPill'
import { exportBaustellenToExcel } from './exportBaustellen'

const formatAddr = (p: TrackedProject) => {
  const c = p.contact
  if (!c) return p.name
  // Wenn der Kontaktname unbekannt/leer ist, fallback auf Projekt-Name
  const rawName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
  const isUnknown = !rawName || /^unbekannt\b/i.test(rawName)
  const name = isUnknown ? (c.company || p.name) : rawName
  return c.address ? `${name}, ${c.address}` : name
}

interface Props {
  onOpenProject?: (projectId: string) => void
}

export default function BaustellenTable({ onOpenProject }: Props) {
  const { data, isLoading } = useTrackedProjects()
  const updateConstr = useUpdateConstruction()
  const [search, setSearch] = useState('')
  const [filterMissing, setFilterMissing] = useState(false)
  const [filterBlocked, setFilterBlocked] = useState(false)
  const [filterSinaMissing, setFilterSinaMissing] = useState(false)
  const [compact, setCompact] = useState(false)
  const [expandedPronovo, setExpandedPronovo] = useState<Set<string>>(new Set())

  const togglePronovo = (id: string) => {
    setExpandedPronovo((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const projects = useMemo(() => {
    let items = data?.data ?? []
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((p) => formatAddr(p).toLowerCase().includes(q))
    }
    if (filterMissing) items = items.filter((p) => !!p.construction?.fehltEtwas)
    if (filterBlocked) items = items.filter((p) => p.construction && !p.construction.acInstalliert)
    if (filterSinaMissing) items = items.filter((p) => p.construction && !p.construction.sina)
    // Sortier-Regel:
    //   1. Projekte ohne displayOrder (NEU) → ganz oben, neueste zuerst (createdAt DESC)
    //   2. Projekte mit displayOrder → in dieser Reihenfolge (Excel-Position ASC)
    return [...items].sort((a, b) => {
      const oa = a.construction?.displayOrder ?? null
      const ob = b.construction?.displayOrder ?? null
      if (oa == null && ob == null) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (oa == null) return -1   // a ist NEU → oben
      if (ob == null) return 1    // b ist NEU → oben
      return oa - ob              // beide haben Order → Excel-Reihenfolge
    })
  }, [data, search, filterMissing, filterBlocked, filterSinaMissing])

  const patch = (projectId: string, p: Partial<Construction>) =>
    updateConstr.mutate({ projectId, patch: p })

  const Pill = ({ p, field, dateField }: { p: TrackedProject; field: keyof Construction; dateField: keyof Construction }) => (
    <StatusPill
      value={!!p.construction?.[field]}
      date={(p.construction?.[dateField] as string | null) ?? null}
      showDate
      onChange={(next, dateIso) => patch(p.id, { [field]: next, [dateField]: dateIso } as any)}
    />
  )

  return (
    <div className="space-y-3">
      {/* Filterleiste */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            className="glass-input w-full pl-9 text-xs"
            placeholder="Kunde / Adresse suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterMissing(!filterMissing)}
          className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
            filterMissing ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text hover:bg-surface-hover'
          }`}
        >
          Nur "Fehlt etwas"
        </button>
        <button
          type="button"
          onClick={() => setFilterBlocked(!filterBlocked)}
          className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
            filterBlocked ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text hover:bg-surface-hover'
          }`}
        >
          Nur offene Baustellen
        </button>
        <button
          type="button"
          onClick={() => setFilterSinaMissing(!filterSinaMissing)}
          className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
            filterSinaMissing ? 'bg-red/10 text-red' : 'text-text-dim hover:text-text hover:bg-surface-hover'
          }`}
          style={filterSinaMissing ? { background: 'color-mix(in srgb, #F87171 14%, transparent)', color: '#F87171' } : undefined}
        >
          SINA fehlt
        </button>
        <button
          type="button"
          onClick={() => setCompact(!compact)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
            compact ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text hover:bg-surface-hover'
          }`}
          title={compact ? 'Details anzeigen (Daten/Notizen)' : 'Kompakt – nur Pills anzeigen'}
        >
          {compact ? <Maximize2 size={13} strokeWidth={1.8} /> : <Minimize2 size={13} strokeWidth={1.8} />}
          {compact ? 'Detail' : 'Kompakt'}
        </button>
        <button
          type="button"
          onClick={() => exportBaustellenToExcel(projects)}
          disabled={projects.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-emerald-300 hover:bg-emerald-400/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: '1px solid rgba(52,211,153,0.20)' }}
          title="Aktuelle gefilterte Liste als Excel herunterladen"
        >
          <FileSpreadsheet size={13} strokeWidth={1.8} />
          Excel
        </button>
      </div>

      {isLoading && <div className="glass-card p-12 text-center text-text-dim text-sm">Baustellen werden geladen...</div>}

      {!isLoading && projects.length === 0 && (
        <div className="glass-card p-12 text-center text-text-dim text-sm">Keine Baustellen gefunden</div>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-border bg-bg-sub">
                  <Th sticky>Kunde / Adresse</Th>
                  <Th>GBA</Th>
                  <Th>Baubewilligung</Th>
                  <Th>TAG eingereicht</Th>
                  <Th>TAG bewilligt</Th>
                  <Th>IA eingereicht</Th>
                  <Th>IA bewilligt</Th>
                  <Th>DC-Termin</Th>
                  <Th>DC ausgeführt</Th>
                  <Th>AC-Termin</Th>
                  <Th>AC installiert</Th>
                  <Th>SINA</Th>
                  <Th>MPP</Th>
                  <Th>Pronovo</Th>
                  <Th>Fehlt etwas</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const c = p.construction
                  const allDone = !!c
                    && c.baubewilligung && c.tagBewilligt && c.iaBewilligt
                    && c.dcMontageAusgefuehrt && c.acInstalliert
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors">
                      <Td sticky>
                        <div className="flex items-center gap-2 min-w-[220px] max-w-[300px]">
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(p.id)}
                            className="text-[11px] text-text font-semibold truncate hover:text-amber transition-colors text-left flex-1"
                            title={formatAddr(p)}
                          >
                            {formatAddr(p)}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(p.id)}
                            className="text-text-dim hover:text-amber"
                            title="Projekt öffnen"
                          >
                            <ExternalLink size={11} strokeWidth={1.8} />
                          </button>
                        </div>
                      </Td>

                      <Td>
                        <Pill p={p} field="gba" dateField="gbaAm" />
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="baubewilligung" dateField="baubewilligungAm" />
                          {!compact && <DateCell value={c?.baubewilligungAm ?? null} onChange={(d) => patch(p.id, { baubewilligungAm: d })} />}
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="tagEingereicht" dateField="tagEingereichtAm" />
                          {!compact && <DateCell value={c?.tagEingereichtAm ?? null} onChange={(d) => patch(p.id, { tagEingereichtAm: d })} />}
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="tagBewilligt" dateField="tagBewilligtAm" />
                          {!compact && <TextCell value={c?.tagNote ?? null} onSave={(v) => patch(p.id, { tagNote: v })} placeholder="Notiz..." />}
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="iaEingereicht" dateField="iaEingereichtAm" />
                          {!compact && <DateCell value={c?.iaEingereichtAm ?? null} onChange={(d) => patch(p.id, { iaEingereichtAm: d })} />}
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="iaBewilligt" dateField="iaBewilligtAm" />
                          {!compact && <TextCell value={c?.iaNote ?? null} onSave={(v) => patch(p.id, { iaNote: v })} placeholder="Notiz..." />}
                        </div>
                      </Td>

                      <Td>
                        <DateCell value={c?.dcMontageTermin ?? null} onChange={(d) => patch(p.id, { dcMontageTermin: d })} placeholder="Termin..." />
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="dcMontageAusgefuehrt" dateField="dcMontageAm" />
                          {!compact && <DateCell value={c?.dcMontageAm ?? null} onChange={(d) => patch(p.id, { dcMontageAm: d })} />}
                        </div>
                      </Td>

                      <Td>
                        <DateCell value={c?.acTermin ?? null} onChange={(d) => patch(p.id, { acTermin: d })} placeholder="Termin..." />
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="acInstalliert" dateField="acInstalliertAm" />
                          {!compact && <DateCell value={c?.acInstalliertAm ?? null} onChange={(d) => patch(p.id, { acInstalliertAm: d })} />}
                        </div>
                      </Td>

                      <Td>
                        <Pill p={p} field="sina" dateField="sinaAm" />
                      </Td>

                      <Td>
                        <Pill p={p} field="mpp" dateField="mppAm" />
                      </Td>

                      <Td>
                        <button
                          type="button"
                          onClick={() => togglePronovo(p.id)}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-dim hover:text-amber transition-colors"
                          title="Pronovo Details ein-/ausklappen"
                        >
                          {expandedPronovo.has(p.id) ? <ChevronDown size={11} strokeWidth={2} /> : <ChevronRight size={11} strokeWidth={2} />}
                          <StatusPill
                            value={!!c?.pronovo}
                            onChange={(next, dateIso) => patch(p.id, { pronovo: next, pronovoAm: dateIso })}
                            date={c?.pronovoAm ?? null}
                          />
                        </button>
                        {expandedPronovo.has(p.id) && (
                          <div className="mt-1.5 p-2 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="text-text-dim mb-0.5">Pronovo Datum:</div>
                            <DateCell value={c?.pronovoAm ?? null} onChange={(d) => patch(p.id, { pronovoAm: d })} />
                          </div>
                        )}
                      </Td>

                      <Td>
                        <div className="flex items-center gap-1 min-w-[120px]">
                          {c?.fehltEtwas && <AlertTriangle size={10} className="text-red shrink-0" strokeWidth={2.5} />}
                          <TextCell
                            value={c?.fehltEtwas ?? null}
                            onSave={(v) => patch(p.id, { fehltEtwas: v })}
                            placeholder="z.B. Batterie fehlt"
                            className={c?.fehltEtwas ? 'text-red font-semibold' : ''}
                          />
                        </div>
                      </Td>

                      <Td>
                        {allDone
                          ? <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'color-mix(in srgb, #34D399 14%, transparent)', color: '#34D399' }}>Fertig ✓</span>
                          : !c
                            ? <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-text-dim" style={{ background: 'rgba(255,255,255,0.04)' }}>Neu</span>
                            : <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'color-mix(in srgb, #F59E0B 14%, transparent)', color: '#F59E0B' }}>Offen</span>}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <th
      className={`px-2 py-2 text-[9px] font-bold uppercase tracking-[0.06em] text-text-dim text-left whitespace-nowrap ${
        sticky ? 'sticky left-0 bg-bg-sub z-30' : ''
      }`}
    >
      {children}
    </th>
  )
}

function Td({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <td
      className={`px-2 py-2 align-top ${sticky ? 'sticky left-0 bg-bg/95 backdrop-blur-md z-10' : ''}`}
    >
      {children}
    </td>
  )
}
