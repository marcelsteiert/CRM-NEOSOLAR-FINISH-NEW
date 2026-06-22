import { useMemo, useState } from 'react'
import { Search, AlertTriangle, ExternalLink, FileSpreadsheet, ChevronDown, ChevronRight, Minimize2, Maximize2, Filter, X } from 'lucide-react'
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
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  // Erweiterte Status-Filter (alle: nur Eintraege wo Status fehlt/false ist)
  const [extraFilters, setExtraFilters] = useState({
    // Bewilligungen
    baubewilligungOffen: false,
    tagEingereichtOffen: false,
    tagBewilligtOffen: false,
    iaEingereichtOffen: false,
    iaBewilligtOffen: false,
    // Montage
    dcTerminFehlt: false,
    dcAusgefuehrtOffen: false,
    acTerminFehlt: false,
    acInstalliertOffen: false,
    // Inbetriebnahme
    gbaOffen: false,
    sinaOffen: false,
    mppOffen: false,
    pronovoOffen: false,
    // Sonstiges
    fehltEtwasGesetzt: false,
    hatBemerkung: false,
  })
  const toggleExtra = (key: keyof typeof extraFilters) =>
    setExtraFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  const resetExtraFilters = () =>
    setExtraFilters({
      baubewilligungOffen: false, tagEingereichtOffen: false, tagBewilligtOffen: false,
      iaEingereichtOffen: false, iaBewilligtOffen: false,
      dcTerminFehlt: false, dcAusgefuehrtOffen: false, acTerminFehlt: false, acInstalliertOffen: false,
      gbaOffen: false, sinaOffen: false, mppOffen: false, pronovoOffen: false,
      fehltEtwasGesetzt: false, hatBemerkung: false,
    })
  const activeExtraCount = Object.values(extraFilters).filter(Boolean).length
  const [expandedPronovo, setExpandedPronovo] = useState<Set<string>>(new Set())
  // Spalten-Gruppen: Welche sind eingeklappt? Default alle offen
  const [collapsedGroups, setCollapsedGroups] = useState<Set<'bewilligung' | 'montage' | 'inbetrieb'>>(new Set())
  const toggleGroup = (g: 'bewilligung' | 'montage' | 'inbetrieb') => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }
  const isCollapsed = (g: 'bewilligung' | 'montage' | 'inbetrieb') => collapsedGroups.has(g)

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
    // Erweiterte Status-Filter (alle: AND - jeder aktive Filter muss erfuellt sein)
    if (extraFilters.baubewilligungOffen) items = items.filter((p) => !p.construction?.baubewilligung)
    if (extraFilters.tagEingereichtOffen) items = items.filter((p) => !p.construction?.tagEingereicht)
    if (extraFilters.tagBewilligtOffen) items = items.filter((p) => !p.construction?.tagBewilligt)
    if (extraFilters.iaEingereichtOffen) items = items.filter((p) => !p.construction?.iaEingereicht)
    if (extraFilters.iaBewilligtOffen) items = items.filter((p) => !p.construction?.iaBewilligt)
    if (extraFilters.dcTerminFehlt) items = items.filter((p) => !p.construction?.dcMontageTermin)
    if (extraFilters.dcAusgefuehrtOffen) items = items.filter((p) => !p.construction?.dcMontageAusgefuehrt)
    if (extraFilters.acTerminFehlt) items = items.filter((p) => !p.construction?.acTermin)
    if (extraFilters.acInstalliertOffen) items = items.filter((p) => !p.construction?.acInstalliert)
    if (extraFilters.gbaOffen) items = items.filter((p) => !p.construction?.gba)
    if (extraFilters.sinaOffen) items = items.filter((p) => !p.construction?.sina)
    if (extraFilters.mppOffen) items = items.filter((p) => !p.construction?.mpp)
    if (extraFilters.pronovoOffen) items = items.filter((p) => !p.construction?.pronovo)
    if (extraFilters.fehltEtwasGesetzt) items = items.filter((p) => !!p.construction?.fehltEtwas)
    if (extraFilters.hatBemerkung) items = items.filter((p) => !!p.construction?.bemerkung)
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
  }, [data, search, filterMissing, filterBlocked, filterSinaMissing, extraFilters])

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

        {/* Status-Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
              activeExtraCount > 0 ? 'bg-violet-400/15 text-violet-300' : 'text-text-dim hover:text-text hover:bg-surface-hover'
            }`}
            title="Erweiterte Status-Filter"
            style={activeExtraCount > 0 ? { border: '1px solid rgba(167,139,250,0.30)' } : undefined}
          >
            <Filter size={13} strokeWidth={1.8} />
            Filter{activeExtraCount > 0 ? ` (${activeExtraCount})` : ''}
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {showFilterPanel && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowFilterPanel(false)} />
              <div
                className="absolute top-full mt-1 right-0 z-40 rounded-lg overflow-hidden shadow-2xl min-w-[300px] max-h-[80vh] overflow-y-auto p-2"
                style={{
                  background: 'linear-gradient(180deg, #0F172A 0%, #0A0E1F 100%)',
                  border: '1px solid rgba(167,139,250,0.20)',
                }}
              >
                <div className="flex items-center justify-between px-2 py-1.5 sticky top-0 z-10" style={{ background: 'linear-gradient(180deg, #0F172A 0%, #0F172A 100%)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Status-Filter (15)</span>
                  {activeExtraCount > 0 && (
                    <button
                      type="button"
                      onClick={resetExtraFilters}
                      className="text-[10px] text-red font-semibold hover:underline flex items-center gap-1"
                    >
                      <X size={9} strokeWidth={2.5} />
                      Reset ({activeExtraCount})
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-text-dim px-2 pb-2">AND-Logik: alle aktiven Filter muessen erfuellt sein</div>

                {[
                  {
                    group: 'Bewilligungen', color: '#60A5FA',
                    items: [
                      { key: 'baubewilligungOffen' as const, label: 'Baubewilligung fehlt' },
                      { key: 'tagEingereichtOffen' as const, label: 'TAG eingereicht fehlt' },
                      { key: 'tagBewilligtOffen' as const, label: 'TAG bewilligt fehlt' },
                      { key: 'iaEingereichtOffen' as const, label: 'IA eingereicht fehlt' },
                      { key: 'iaBewilligtOffen' as const, label: 'IA bewilligt fehlt' },
                    ],
                  },
                  {
                    group: 'Montage', color: '#F59E0B',
                    items: [
                      { key: 'dcTerminFehlt' as const, label: 'DC-Termin fehlt' },
                      { key: 'dcAusgefuehrtOffen' as const, label: 'DC nicht ausgefuehrt' },
                      { key: 'acTerminFehlt' as const, label: 'AC-Termin fehlt' },
                      { key: 'acInstalliertOffen' as const, label: 'AC nicht installiert' },
                    ],
                  },
                  {
                    group: 'Inbetriebnahme', color: '#34D399',
                    items: [
                      { key: 'gbaOffen' as const, label: 'GBA fehlt' },
                      { key: 'sinaOffen' as const, label: 'SINA fehlt' },
                      { key: 'mppOffen' as const, label: 'MPP fehlt' },
                      { key: 'pronovoOffen' as const, label: 'Pronovo fehlt' },
                    ],
                  },
                  {
                    group: 'Sonstiges', color: '#F87171',
                    items: [
                      { key: 'fehltEtwasGesetzt' as const, label: 'Hat "Fehlt etwas"-Eintrag' },
                      { key: 'hatBemerkung' as const, label: 'Hat Bemerkung' },
                    ],
                  },
                ].map((group) => (
                  <div key={group.group} className="mb-1">
                    <div
                      className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1.5 mt-1"
                      style={{ color: group.color }}
                    >
                      {group.group}
                    </div>
                    {group.items.map((opt) => (
                      <label
                        key={opt.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-[11.5px] hover:bg-white/[0.04] cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={extraFilters[opt.key]}
                          onChange={() => toggleExtra(opt.key)}
                          className="w-3.5 h-3.5 cursor-pointer accent-violet-400"
                        />
                        <span className={extraFilters[opt.key] ? 'text-violet-300 font-semibold' : 'text-text-sec'}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
                {/* Gruppen-Header */}
                <tr className="border-b border-border/50 bg-bg-sub">
                  <th className="sticky left-0 bg-bg-sub z-30" />
                  <th />
                  <GroupTh
                    label="Bewilligungen"
                    color="#60A5FA"
                    collapsed={isCollapsed('bewilligung')}
                    onToggle={() => toggleGroup('bewilligung')}
                    colSpan={isCollapsed('bewilligung') ? 1 : 5}
                  />
                  <GroupTh
                    label="Montage"
                    color="#F59E0B"
                    collapsed={isCollapsed('montage')}
                    onToggle={() => toggleGroup('montage')}
                    colSpan={isCollapsed('montage') ? 1 : 4}
                  />
                  <GroupTh
                    label="Inbetriebnahme"
                    color="#34D399"
                    collapsed={isCollapsed('inbetrieb')}
                    onToggle={() => toggleGroup('inbetrieb')}
                    colSpan={isCollapsed('inbetrieb') ? 1 : 3}
                  />
                  <th />
                  <th />
                </tr>
                {/* Spalten-Header */}
                <tr className="border-b border-border bg-bg-sub">
                  <Th sticky>Kunde / Adresse</Th>
                  <Th>GBA</Th>
                  {isCollapsed('bewilligung') ? (
                    <th className="px-2 py-2" />
                  ) : (
                    <>
                      <Th>Baubewilligung</Th>
                      <Th>TAG eingereicht</Th>
                      <Th>TAG bewilligt</Th>
                      <Th>IA eingereicht</Th>
                      <Th>IA bewilligt</Th>
                    </>
                  )}
                  {isCollapsed('montage') ? (
                    <th className="px-2 py-2" />
                  ) : (
                    <>
                      <Th>DC-Termin</Th>
                      <Th>DC ausgeführt</Th>
                      <Th>AC-Termin</Th>
                      <Th>AC installiert</Th>
                    </>
                  )}
                  {isCollapsed('inbetrieb') ? (
                    <th className="px-2 py-2" />
                  ) : (
                    <>
                      <Th>SINA</Th>
                      <Th>MPP</Th>
                      <Th>Pronovo</Th>
                    </>
                  )}
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

                      {isCollapsed('bewilligung') ? (
                        <Td>
                          <BewilligungSummary c={c} />
                        </Td>
                      ) : (
                        <>
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
                        </>
                      )}

                      {isCollapsed('montage') ? (
                        <Td>
                          <MontageSummary c={c} />
                        </Td>
                      ) : (
                        <>
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
                        </>
                      )}

                      {isCollapsed('inbetrieb') ? (
                        <Td>
                          <InbetriebSummary c={c} />
                        </Td>
                      ) : (
                        <>
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
                        </>
                      )}

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

function GroupTh({ label, color, collapsed, onToggle, colSpan }: {
  label: string; color: string; collapsed: boolean; onToggle: () => void; colSpan: number
}) {
  return (
    <th colSpan={colSpan} className="px-2 py-1.5 text-left" style={{ background: `color-mix(in srgb, ${color} 6%, transparent)` }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] hover:opacity-80 transition-opacity"
        style={{ color }}
        title={collapsed ? `${label} ausklappen` : `${label} einklappen`}
      >
        {collapsed ? <ChevronRight size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
        {label}
      </button>
    </th>
  )
}

function StatusDot({ value, label }: { value: boolean | null | undefined; label: string }) {
  const color = value === true ? '#34D399' : value === false ? '#F87171' : 'rgba(255,255,255,0.15)'
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[9px] font-semibold text-text-dim uppercase">{label}</span>
    </div>
  )
}

function BewilligungSummary({ c }: { c: any }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <StatusDot value={c?.baubewilligung} label="Baubew." />
      <StatusDot value={c?.tagEingereicht && c?.tagBewilligt ? true : (c?.tagEingereicht === false && c?.tagBewilligt === false ? false : null)} label="TAG" />
      <StatusDot value={c?.iaEingereicht && c?.iaBewilligt ? true : (c?.iaEingereicht === false && c?.iaBewilligt === false ? false : null)} label="IA" />
    </div>
  )
}

function MontageSummary({ c }: { c: any }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <StatusDot value={c?.dcMontageAusgefuehrt} label="DC" />
      <StatusDot value={c?.acInstalliert} label="AC" />
    </div>
  )
}

function InbetriebSummary({ c }: { c: any }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <StatusDot value={c?.sina} label="SINA" />
      <StatusDot value={c?.mpp} label="MPP" />
      <StatusDot value={c?.pronovo} label="Pronovo" />
    </div>
  )
}
