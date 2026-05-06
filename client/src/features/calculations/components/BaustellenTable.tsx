import { useMemo, useState } from 'react'
import { Search, AlertTriangle, ExternalLink } from 'lucide-react'
import {
  useTrackedProjects, useUpdateConstruction,
  type TrackedProject, type Construction,
} from '@/hooks/useProjectTracking'
import StatusPill, { DateCell, TextCell } from './StatusPill'

const formatAddr = (p: TrackedProject) => {
  const c = p.contact
  if (!c) return p.name
  const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.company || p.name
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

  const projects = useMemo(() => {
    let items = data?.data ?? []
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((p) => formatAddr(p).toLowerCase().includes(q))
    }
    if (filterMissing) items = items.filter((p) => !!p.construction?.fehltEtwas)
    if (filterBlocked) items = items.filter((p) => p.construction && !p.construction.acInstalliert)
    return items
  }, [data, search, filterMissing, filterBlocked])

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
      </div>

      {isLoading && <div className="glass-card p-12 text-center text-text-dim text-sm">Baustellen werden geladen...</div>}

      {!isLoading && projects.length === 0 && (
        <div className="glass-card p-12 text-center text-text-dim text-sm">Keine Baustellen gefunden</div>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-bg-sub/30">
                  <Th sticky>Kunde / Adresse</Th>
                  <Th>Baubewilligung</Th>
                  <Th>TAG eingereicht</Th>
                  <Th>TAG bewilligt</Th>
                  <Th>IA eingereicht</Th>
                  <Th>IA bewilligt</Th>
                  <Th>DC-Termin</Th>
                  <Th>DC ausgeführt</Th>
                  <Th>AC-Termin</Th>
                  <Th>AC installiert</Th>
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
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="baubewilligung" dateField="baubewilligungAm" />
                          <DateCell value={c?.baubewilligungAm ?? null} onChange={(d) => patch(p.id, { baubewilligungAm: d })} />
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="tagEingereicht" dateField="tagEingereichtAm" />
                          <DateCell value={c?.tagEingereichtAm ?? null} onChange={(d) => patch(p.id, { tagEingereichtAm: d })} />
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="tagBewilligt" dateField="tagBewilligtAm" />
                          <TextCell value={c?.tagNote ?? null} onSave={(v) => patch(p.id, { tagNote: v })} placeholder="Notiz..." />
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="iaEingereicht" dateField="iaEingereichtAm" />
                          <DateCell value={c?.iaEingereichtAm ?? null} onChange={(d) => patch(p.id, { iaEingereichtAm: d })} />
                        </div>
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="iaBewilligt" dateField="iaBewilligtAm" />
                          <TextCell value={c?.iaNote ?? null} onSave={(v) => patch(p.id, { iaNote: v })} placeholder="Notiz..." />
                        </div>
                      </Td>

                      <Td>
                        <DateCell value={c?.dcMontageTermin ?? null} onChange={(d) => patch(p.id, { dcMontageTermin: d })} placeholder="Termin..." />
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="dcMontageAusgefuehrt" dateField="dcMontageAm" />
                          <DateCell value={c?.dcMontageAm ?? null} onChange={(d) => patch(p.id, { dcMontageAm: d })} />
                        </div>
                      </Td>

                      <Td>
                        <DateCell value={c?.acTermin ?? null} onChange={(d) => patch(p.id, { acTermin: d })} placeholder="Termin..." />
                      </Td>

                      <Td>
                        <div className="flex flex-col gap-0.5">
                          <Pill p={p} field="acInstalliert" dateField="acInstalliertAm" />
                          <DateCell value={c?.acInstalliertAm ?? null} onChange={(d) => patch(p.id, { acInstalliertAm: d })} />
                        </div>
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
        sticky ? 'sticky left-0 bg-bg-sub/95 backdrop-blur-md z-10' : ''
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
