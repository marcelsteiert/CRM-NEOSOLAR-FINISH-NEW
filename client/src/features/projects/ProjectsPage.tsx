import { useState, useMemo, useRef, useCallback } from 'react'
import {
  FolderKanban, LayoutDashboard, Users2, Search, AlertTriangle, ChevronRight,
  TrendingUp, Sun, Zap, CheckCircle2, Clock, Star, ArrowUpRight, Loader2, Building2,
  GripVertical,
} from 'lucide-react'
import {
  useProjects, useProjectStats, usePartners, usePhaseDefinitions, useUpdateProject,
  phaseLabels, phaseColors, priorityColors, formatCHF, computePhaseProgress,
  type Project, type ProjectPhase,
} from '@/hooks/useProjects'
import ProjectDetailModal from './components/ProjectDetailModal'

type ViewTab = 'kanban' | 'dashboard' | 'partner'

const phaseOrder: ProjectPhase[] = ['admin', 'montage', 'elektro', 'abschluss']
const phaseIcons: Record<ProjectPhase, typeof FolderKanban> = {
  admin: FolderKanban,
  montage: Sun,
  elektro: Zap,
  abschluss: CheckCircle2,
}

export default function ProjectsPage() {
  const [view, setView] = useState<ViewTab>('kanban')
  const [search, setSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const { data: projectsData, isLoading } = useProjects({ search: search || undefined })
  const { data: statsData } = useProjectStats()
  const { data: partnersData } = usePartners()
  const { data: phasesData } = usePhaseDefinitions()
  const updateProject = useUpdateProject()

  const projects = projectsData?.data ?? []
  const stats = statsData?.data
  const partners = partnersData?.data ?? []
  const phases = phasesData?.data ?? []

  const projectsByPhase = useMemo(() => {
    const map: Record<ProjectPhase, Project[]> = { admin: [], montage: [], elektro: [], abschluss: [] }
    for (const p of projects) {
      if (map[p.phase]) map[p.phase].push(p)
    }
    return map
  }, [projects])

  const riskProjects = useMemo(() => projects.filter((p) => p.risk), [projects])

  const views: { id: ViewTab; label: string; icon: typeof FolderKanban }[] = [
    { id: 'kanban', label: 'Kanban', icon: FolderKanban },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'partner', label: 'Partner', icon: Users2 },
  ]

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold tracking-[-0.03em]">Projekte</h1>
          <p className="text-[12px] sm:text-[13px] text-text-sec mt-0.5">
            {projects.length} aktive Projekte · {stats ? formatCHF(stats.totalValue) : '–'} Auftragsvolumen
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Projekt suchen..."
              className="glass-input pl-9 pr-4 py-2 text-[13px] w-full sm:w-[220px]"
            />
          </div>

          {/* View Tabs */}
          <div className="flex rounded-[10px] p-0.5 shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {views.map((v) => {
              const Icon = v.icon
              const active = view === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all duration-150 ${
                    active ? 'text-text' : 'text-text-dim hover:text-text-sec'
                  }`}
                  style={active ? { background: 'rgba(255,255,255,0.08)' } : undefined}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-text-dim" />
          </div>
        ) : view === 'kanban' ? (
          <KanbanView projectsByPhase={projectsByPhase} phases={phases} onSelect={setSelectedProjectId} onMoveProject={(projectId, targetPhase) => updateProject.mutate({ id: projectId, phase: targetPhase })} />
        ) : view === 'dashboard' ? (
          <DashboardView stats={stats} riskProjects={riskProjects} projects={projects} onSelect={setSelectedProjectId} />
        ) : (
          <PartnerView partners={partners} />
        )}
      </div>

      {/* Detail Modal */}
      {selectedProjectId && (
        <ProjectDetailModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </div>
  )
}

// ─── Kanban View ───

function KanbanView({
  projectsByPhase,
  phases,
  onSelect,
  onMoveProject,
}: {
  projectsByPhase: Record<ProjectPhase, Project[]>
  phases: { id: string; name: string; color: string; steps: string[] }[]
  onSelect: (id: string) => void
  onMoveProject: (projectId: string, targetPhase: ProjectPhase) => void
}) {
  const [dragOverPhase, setDragOverPhase] = useState<ProjectPhase | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('text/plain', projectId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(projectId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDragOverPhase(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, phaseId: ProjectPhase) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPhase(phaseId)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverPhase(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetPhase: ProjectPhase) => {
    e.preventDefault()
    const projectId = e.dataTransfer.getData('text/plain')
    if (projectId) {
      // Find the project's current phase
      const currentPhase = phaseOrder.find((ph) => projectsByPhase[ph].some((p) => p.id === projectId))
      if (currentPhase !== targetPhase) {
        onMoveProject(projectId, targetPhase)
      }
    }
    setDragOverPhase(null)
    setDraggingId(null)
  }, [onMoveProject, projectsByPhase])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full overflow-hidden overflow-x-auto">
      {phaseOrder.map((phaseId) => {
        const phaseDef = phases.find((p) => p.id === phaseId)
        const color = phaseColors[phaseId]
        const items = projectsByPhase[phaseId]
        const Icon = phaseIcons[phaseId]
        const totalValue = items.reduce((s, p) => s + p.value, 0)
        const isOver = dragOverPhase === phaseId && !items.some((p) => p.id === draggingId)

        return (
          <div
            key={phaseId}
            className="flex flex-col gap-3 h-full overflow-hidden transition-all duration-200"
            onDragOver={(e) => handleDragOver(e, phaseId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, phaseId)}
          >
            {/* Column Header */}
            <div
              className="glass-card px-4 py-3 shrink-0 transition-all duration-200"
              style={isOver ? { borderColor: color, boxShadow: `0 0 12px ${color}30` } : undefined}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <Icon size={14} style={{ color }} />
                <span className="text-[13px] font-bold">{phaseDef?.name ?? phaseLabels[phaseId]}</span>
                <span className="ml-auto text-[11px] text-text-dim font-mono">{items.length}</span>
              </div>
              <p className="text-[11px] text-text-dim">{formatCHF(totalValue)}</p>
            </div>

            {/* Cards */}
            <div
              className={`flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin rounded-xl transition-all duration-200 ${isOver ? 'ring-1 ring-opacity-40' : ''}`}
              style={isOver ? { background: `color-mix(in srgb, ${color} 4%, transparent)`, ringColor: color } : undefined}
            >
              {items.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  phaseId={phaseId}
                  onClick={() => onSelect(project.id)}
                  onDragStart={(e) => handleDragStart(e, project.id)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingId === project.id}
                />
              ))}
              {items.length === 0 && (
                <div className={`text-center py-8 text-[12px] ${isOver ? 'text-text-sec' : 'text-text-dim'}`}>
                  {isOver ? 'Hier ablegen' : 'Keine Projekte'}
                </div>
              )}
              {/* Drop indicator at bottom */}
              {isOver && items.length > 0 && (
                <div className="h-12 rounded-xl border-2 border-dashed flex items-center justify-center text-[11px] font-semibold transition-all duration-200"
                  style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, color }}
                >
                  Hier ablegen
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProjectCard({
  project, phaseId, onClick, onDragStart, onDragEnd, isDragging,
}: {
  project: Project; phaseId: ProjectPhase; onClick: () => void
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void; isDragging: boolean
}) {
  const color = phaseColors[phaseId]
  const pp = computePhaseProgress(project.progress, phaseId)
  const totalProgress = project.percent ?? 0

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`glass-card w-full text-left p-4 hover:border-[rgba(255,255,255,0.12)] transition-all duration-150 group cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <GripVertical size={14} className="text-text-dim/40 shrink-0 mt-0.5 group-hover:text-text-dim transition-colors" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate group-hover:text-white transition-colors">{project.name}</p>
            <p className="text-[11px] text-text-dim mt-0.5">{project.description}</p>
          </div>
        </div>
        {project.risk && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2" style={{ background: 'rgba(248,113,113,0.15)' }}>
            <AlertTriangle size={11} className="text-red" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-text-dim">{phaseLabels[phaseId]}: {pp.done}/{pp.total}</span>
          <span className="font-mono" style={{ color }}>{pp.percent}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pp.percent}%`, background: color }} />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-dim">{project.kWp} kWp</span>
        <span className="font-mono tabular-nums" style={{ color: '#F59E0B' }}>{formatCHF(project.value)}</span>
      </div>

      {/* Total progress */}
      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px]">
        <span className="text-text-dim">Gesamt</span>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${totalProgress}%`, background: totalProgress === 100 ? '#34D399' : 'rgba(255,255,255,0.3)' }} />
          </div>
          <span className="font-mono text-text-sec">{totalProgress}%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard View ───

function DashboardView({
  stats,
  riskProjects,
  projects,
  onSelect,
}: {
  stats: ReturnType<typeof useProjectStats>['data'] extends { data: infer T } ? T : undefined
  riskProjects: Project[]
  projects: Project[]
  onSelect: (id: string) => void
}) {
  if (!stats) return null

  const kpis = [
    { label: 'Aktive Projekte', value: String(stats.total), icon: FolderKanban, color: '#60A5FA' },
    { label: 'Auftragsvolumen', value: formatCHF(stats.totalValue), icon: TrendingUp, color: '#34D399' },
    { label: 'Gesamt kWp', value: `${stats.totalKwp.toFixed(1)} kWp`, icon: Sun, color: '#F59E0B' },
    { label: 'Ø Fortschritt', value: `${stats.avgProgress}%`, icon: CheckCircle2, color: '#A78BFA' },
  ]

  // Nächste Meilensteine: projects sorted by lowest progress
  const upcoming = [...projects]
    .filter((p) => (p.percent ?? 0) < 100)
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
    .slice(0, 5)

  return (
    <div className="h-full overflow-y-auto space-y-5 pr-1">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="glass-card px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `color-mix(in srgb, ${kpi.color} 12%, transparent)` }}>
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
                <span className="text-[11px] text-text-dim uppercase tracking-[0.06em] font-bold">{kpi.label}</span>
              </div>
              <p className="text-[20px] font-bold tracking-[-0.02em] tabular-nums">{kpi.value}</p>
            </div>
          )
        })}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk Projects */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-red" />
            <h3 className="text-[13px] font-bold">Risiko-Projekte</h3>
            <span className="ml-auto text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
              {riskProjects.length}
            </span>
          </div>
          {riskProjects.length === 0 ? (
            <p className="text-[12px] text-text-dim">Keine Risiko-Projekte</p>
          ) : (
            <div className="space-y-3">
              {riskProjects.map((p) => (
                <button key={p.id} onClick={() => onSelect(p.id)} className="w-full text-left flex items-start gap-3 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-red mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate group-hover:text-white transition-colors">{p.name}</p>
                    <p className="text-[11px] text-red/80 mt-0.5">{p.riskNote}</p>
                  </div>
                  <ChevronRight size={14} className="text-text-dim mt-0.5 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nächste Meilensteine */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color: '#60A5FA' }} />
            <h3 className="text-[13px] font-bold">Nächste Meilensteine</h3>
          </div>
          <div className="space-y-3">
            {upcoming.map((p) => {
              const color = phaseColors[p.phase]
              return (
                <button key={p.id} onClick={() => onSelect(p.id)} className="w-full text-left flex items-center gap-3 group">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate group-hover:text-white transition-colors">{p.name}</p>
                    <p className="text-[11px] text-text-dim">{phaseLabels[p.phase]} · {p.percent ?? 0}%</p>
                  </div>
                  <ArrowUpRight size={13} className="text-text-dim shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Phase Distribution */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4">Verteilung nach Phase</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {phaseOrder.map((ph) => {
            const data = stats.byPhase[ph]
            const Icon = phaseIcons[ph]
            const color = phaseColors[ph]
            return (
              <div key={ph} className="text-center">
                <div className="w-10 h-10 rounded-[12px] mx-auto mb-2 flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="text-[18px] font-bold tabular-nums">{data.count}</p>
                <p className="text-[11px] text-text-dim">{phaseLabels[ph]}</p>
                <p className="text-[11px] font-mono mt-0.5" style={{ color }}>{formatCHF(data.value)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nachkalkulation */}
      {stats.kalkulation.totalSoll > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3">Nachkalkulation (Gesamt)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-text-dim mb-1">Soll</p>
              <p className="text-[16px] font-bold tabular-nums">{formatCHF(stats.kalkulation.totalSoll)}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-dim mb-1">Ist</p>
              <p className="text-[16px] font-bold tabular-nums">{formatCHF(stats.kalkulation.totalIst)}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-dim mb-1">Differenz</p>
              <p className="text-[16px] font-bold tabular-nums" style={{ color: stats.kalkulation.diff <= 0 ? '#34D399' : '#F87171' }}>
                {stats.kalkulation.diff <= 0 ? '' : '+'}{formatCHF(stats.kalkulation.diff)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Partner View ───

function PartnerView({ partners }: { partners: ReturnType<typeof usePartners>['data'] extends { data: infer T } ? T : [] }) {
  const montagePartners = partners.filter((p) => p.type === 'montage')
  const elektroPartners = partners.filter((p) => p.type === 'elektro')

  return (
    <div className="h-full overflow-y-auto space-y-5 pr-1">
      {/* Partner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {partners.map((p) => {
          const color = p.type === 'montage' ? '#FB923C' : '#F59E0B'
          return (
            <div key={p.id} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                  <Building2 size={15} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate">{p.name}</p>
                  <p className="text-[11px] text-text-dim capitalize">{p.type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <div>
                  <p className="text-text-dim">Projekte</p>
                  <p className="font-bold tabular-nums">{p.projects}</p>
                </div>
                <div>
                  <p className="text-text-dim">Ø Tage</p>
                  <p className="font-bold tabular-nums">{p.avgDays}</p>
                </div>
                <div>
                  <p className="text-text-dim">Bewertung</p>
                  <div className="flex items-center gap-1">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold tabular-nums">{p.rating}</span>
                  </div>
                </div>
                <div>
                  <p className="text-text-dim">Pünktlich</p>
                  <p className="font-bold tabular-nums" style={{ color: p.onTimePercent >= 90 ? '#34D399' : '#F59E0B' }}>{p.onTimePercent}%</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Partner Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[13px] font-bold">Partner-Übersicht</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-text-dim">
                <th className="text-left font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px]">Partner</th>
                <th className="text-left font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px]">Typ</th>
                <th className="text-right font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px]">Projekte</th>
                <th className="text-right font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px]">Ø Tage</th>
                <th className="text-right font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px]">Bewertung</th>
                <th className="text-right font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px]">Pünktlich</th>
                <th className="text-right font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px]">Aktiv</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3 font-semibold">{p.name}</td>
                  <td className="px-5 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={{
                        background: p.type === 'montage' ? 'rgba(251,146,60,0.12)' : 'rgba(245,158,11,0.12)',
                        color: p.type === 'montage' ? '#FB923C' : '#F59E0B',
                      }}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{p.projects}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{p.avgDays}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      {p.rating}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums" style={{ color: p.onTimePercent >= 90 ? '#34D399' : '#F59E0B' }}>
                    {p.onTimePercent}%
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{p.activeProjects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
