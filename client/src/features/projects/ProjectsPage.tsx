import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FolderKanban, LayoutDashboard, Users2, Search, AlertTriangle, ChevronRight,
  TrendingUp, Sun, Zap, CheckCircle2, Clock, Star, ArrowUpRight, Loader2, Building2,
  GripVertical, Archive, Plus,
} from 'lucide-react'
import {
  useProjects, useProjectStats, usePartners, usePhaseDefinitions, useUpdateProject,
  phaseLabels, phaseColors, formatCHF, computePhaseProgress,
  type Project, type ProjectPhase, type Partner, type ProjectStats,
} from '@/hooks/useProjects'
import { useProjectKanbanColumns, useUpdateProjectKanbanColumns, type ProjectKanbanColumn } from '@/hooks/useAdmin'
import { useAuth } from '@/hooks/useAuth'
import ProjectDetailModal from './components/ProjectDetailModal'
import CreateProjectModal from './components/CreateProjectModal'

type ViewTab = 'kanban' | 'dashboard' | 'partner' | 'archiv'

const phaseOrder: ProjectPhase[] = ['admin', 'montage', 'elektro', 'abschluss']
const phaseIcons: Record<ProjectPhase, typeof FolderKanban> = {
  admin: FolderKanban,
  montage: Sun,
  elektro: Zap,
  abschluss: CheckCircle2,
}

// Fallback-Icon fuer Custom-Phasen
const defaultPhaseIcon = FolderKanban

export default function ProjectsPage() {
  const { isAdmin, isSubunternehmen, canCreateProjects } = useAuth()
  const [view, setView] = useState<ViewTab>('kanban')
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      setSelectedProjectId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const isArchivView = view === 'archiv'
  const { data: projectsData, isLoading } = useProjects({ search: search || undefined, archived: isArchivView })
  const { data: statsData } = useProjectStats()
  const { data: partnersData } = usePartners()
  const { data: phasesData } = usePhaseDefinitions()
  const { data: kanbanColsRes } = useProjectKanbanColumns()
  const updateProject = useUpdateProject()
  const canEdit = isAdmin

  const projects = projectsData?.data ?? []
  const stats = statsData?.data
  const partners = partnersData?.data ?? []
  const phases = phasesData?.data ?? []

  // Kanban-Custom-Settings: ueberschreibt Labels/Farben/Reihenfolge + Custom-Phasen
  const kanbanColumns = kanbanColsRes?.data ?? []
  // Aus Kanban-Settings (kann auch CUSTOM phases enthalten) ODER Fallback auf 4 Defaults
  const sortedPhaseOrder: string[] = kanbanColumns.length > 0
    ? [...kanbanColumns].sort((a, b) => a.order - b.order).map((c) => c.phase)
    : phaseOrder
  const customPhaseLabels: Record<string, string> = {}
  const customPhaseColors: Record<string, string> = {}
  for (const c of kanbanColumns) {
    customPhaseLabels[c.phase] = c.label
    customPhaseColors[c.phase] = c.color
  }
  // Defaults fuer die 4 Standard-Phasen (Fallback)
  for (const p of phaseOrder) {
    if (!customPhaseLabels[p]) customPhaseLabels[p] = phaseLabels[p]
    if (!customPhaseColors[p]) customPhaseColors[p] = phaseColors[p]
  }

  const projectsByPhase = useMemo(() => {
    const map: Record<string, Project[]> = { admin: [], montage: [], elektro: [], abschluss: [] }
    // Auch Custom-Phasen aus Kanban-Settings initialisieren
    for (const c of kanbanColumns) {
      if (!map[c.phase]) map[c.phase] = []
    }
    for (const p of projects) {
      if (!map[p.phase]) map[p.phase] = []
      map[p.phase].push(p)
    }
    return map
  }, [projects, kanbanColumns])

  const riskProjects = useMemo(() => projects.filter((p) => p.risk), [projects])

  const allViews: { id: ViewTab; label: string; icon: typeof FolderKanban }[] = [
    { id: 'kanban', label: 'Kanban', icon: FolderKanban },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'partner', label: 'Partner', icon: Users2 },
    { id: 'archiv', label: 'Archiv', icon: Archive },
  ]
  // Subunternehmen: nur Kanban (keine Preise/Stats)
  const views = isSubunternehmen ? allViews.filter((v) => v.id === 'kanban') : allViews

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.025em] premium-gradient-text leading-tight">Projekte</h1>
          <p className="text-[12px] sm:text-[13px] text-text-sec mt-0.5">
            {projects.length} aktive Projekte{!isSubunternehmen && stats ? ` · ${formatCHF(stats.totalValue)} Auftragsvolumen` : ''}
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

          {/* Neues Projekt Button (nur Admin + Projektleitung) */}
          {canCreateProjects && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              title="Neues Projekt eroeffnen"
              className="group flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-[10px] shrink-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-1px]"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,146,60,0.06))',
                border: '1px solid rgba(245,158,11,0.25)',
                boxShadow: '0 0 0 0 rgba(245,158,11,0)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.18)'
                e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0 rgba(245,158,11,0)'
                e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'
              }}
            >
              <span
                className="flex items-center justify-center transition-transform duration-200 group-hover:rotate-90"
                style={{
                  width: 24, height: 24,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #F59E0B, #F97316)',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                  color: '#06080C',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
              </span>
              <span className="text-[12px] font-semibold text-text hidden sm:inline tracking-tight">
                Neues Projekt
              </span>
            </button>
          )}

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
          <KanbanView
            projectsByPhase={projectsByPhase}
            phases={phases}
            onSelect={setSelectedProjectId}
            onMoveProject={canEdit ? (projectId, targetPhase) => updateProject.mutate({ id: projectId, phase: targetPhase }) : undefined}
            hidePrice={isSubunternehmen}
            phaseOrder={sortedPhaseOrder}
            phaseLabels={customPhaseLabels}
            phaseColors={customPhaseColors}
            existingColumns={kanbanColumns}
            canEdit={isAdmin}
          />
        ) : view === 'dashboard' ? (
          <DashboardView stats={stats} riskProjects={riskProjects} projects={projects} onSelect={setSelectedProjectId} />
        ) : view === 'archiv' ? (
          <ArchivView projects={projects} onSelect={setSelectedProjectId} />
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

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newProjectId) => {
            setShowCreateModal(false)
            setSelectedProjectId(newProjectId)
          }}
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
  hidePrice = false,
  phaseOrder: phaseOrderProp,
  phaseLabels: phaseLabelsProp,
  phaseColors: phaseColorsProp,
  existingColumns = [],
  canEdit = false,
}: {
  projectsByPhase: Record<string, Project[]>
  phases: { id: string; name: string; color: string; steps: string[] }[]
  onSelect: (id: string) => void
  onMoveProject?: (projectId: string, targetPhase: string) => void
  hidePrice?: boolean
  phaseOrder?: string[]
  phaseLabels?: Record<string, string>
  phaseColors?: Record<string, string>
  existingColumns?: ProjectKanbanColumn[]
  canEdit?: boolean
}) {
  const updateKanban = useUpdateProjectKanbanColumns()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const effectivePhaseOrder: string[] = phaseOrderProp ?? phaseOrder
  const effectivePhaseLabels: Record<string, string> = phaseLabelsProp ?? phaseLabels
  const effectivePhaseColors: Record<string, string> = phaseColorsProp ?? phaseColors
  const canDrag = !!onMoveProject
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
      const currentPhase = effectivePhaseOrder.find((ph) => projectsByPhase[ph].some((p) => p.id === projectId))
      if (currentPhase !== targetPhase && onMoveProject) {
        onMoveProject(projectId, targetPhase)
      }
    }
    setDragOverPhase(null)
    setDraggingId(null)
  }, [onMoveProject, projectsByPhase, effectivePhaseOrder])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full overflow-hidden overflow-x-auto">
      {effectivePhaseOrder.map((phaseId) => {
        const phaseDef = phases.find((p) => p.id === phaseId)
        const color = effectivePhaseColors[phaseId] ?? '#94A3B8'
        const items = projectsByPhase[phaseId] ?? []
        const Icon = phaseIcons[phaseId as ProjectPhase] ?? defaultPhaseIcon
        const totalValue = items.reduce((s, p) => s + p.value, 0)
        const isOver = dragOverPhase === phaseId && !items.some((p) => p.id === draggingId)

        return (
          <div
            key={phaseId}
            className="flex flex-col gap-3 h-full overflow-hidden transition-all duration-200"
            onDragOver={canDrag ? (e) => handleDragOver(e, phaseId) : undefined}
            onDragLeave={canDrag ? handleDragLeave : undefined}
            onDrop={canDrag ? (e) => handleDrop(e, phaseId) : undefined}
          >
            {/* Column Header */}
            <div
              className="glass-card px-4 py-3 shrink-0 transition-all duration-200"
              style={isOver ? { borderColor: color, boxShadow: `0 0 12px ${color}30` } : undefined}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <Icon size={14} style={{ color }} />
                <span className="text-[13px] font-bold">{phaseDef?.name ?? effectivePhaseLabels[phaseId]}</span>
                <span className="ml-auto text-[11px] text-text-dim font-mono">{items.length}</span>
              </div>
              {!hidePrice && <p className="text-[11px] text-text-dim">{formatCHF(totalValue)}</p>}
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
                  onDragStart={canDrag ? (e) => handleDragStart(e, project.id) : undefined}
                  onDragEnd={canDrag ? handleDragEnd : undefined}
                  isDragging={draggingId === project.id}
                  draggable={canDrag}
                  hidePrice={hidePrice}
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

      {/* + Spalte hinzufügen (nur Admin/GL) */}
      {canEdit && (
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="flex flex-col items-center justify-center min-h-[150px] rounded-xl border-2 border-dashed transition-all hover:border-amber/50 hover:bg-amber/5 group"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.01)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,146,60,0.06))',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <Plus size={18} strokeWidth={2} style={{ color: '#F59E0B' }} />
          </div>
          <span className="text-[12px] font-semibold text-text mt-2">Spalte hinzufügen</span>
          <span className="text-[10px] text-text-dim mt-0.5">Neue Phase fürs Kanban</span>
        </button>
      )}

      {/* Add-Dialog */}
      {showAddDialog && (
        <AddPhaseDialog
          existingColumns={existingColumns}
          onClose={() => setShowAddDialog(false)}
          onSubmit={async (newCol) => {
            const updated = [...existingColumns, { ...newCol, order: existingColumns.length }]
            await updateKanban.mutateAsync(updated)
            setShowAddDialog(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Add-Phase Dialog ───

const phaseTemplates: { phase: string; label: string; description: string; color: string }[] = [
  { phase: 'admin',                  label: 'Administration',           description: 'Vertrag, Bewilligungen, Bestellungen', color: '#60A5FA' },
  { phase: 'montage',                label: 'Montage',                  description: 'Geruest, Module, Dacharbeiten',        color: '#FB923C' },
  { phase: 'elektro',                label: 'Elektriker',               description: 'Wechselrichter, Speicher, AC',         color: '#F59E0B' },
  { phase: 'elektro_offen',          label: 'Elektriker noch nicht fertig', description: 'Wartet auf Abschluss',             color: '#FCD34D' },
  { phase: 'pronovo',                label: 'Pronovo',                  description: 'Anmeldung & Foerderung',               color: '#A78BFA' },
  { phase: 'abschluss',              label: 'Abschluss',                description: 'Abnahme, Doku, Rechnung',              color: '#34D399' },
  { phase: 'komplett_erledigt',      label: 'Komplett erledigt',        description: 'Alles abgeschlossen',                  color: '#22D3EE' },
  { phase: 'bewilligung',            label: 'Bewilligung läuft',        description: 'Wartet auf Behörden',                  color: '#E879F9' },
  { phase: 'material',               label: 'Material bestellt',        description: 'Komponenten unterwegs',                color: '#94A3B8' },
  { phase: 'inbetriebnahme',         label: 'Inbetriebnahme',           description: 'Wird scharfgeschaltet',                color: '#4ADE80' },
]

function AddPhaseDialog({
  existingColumns,
  onClose,
  onSubmit,
}: {
  existingColumns: ProjectKanbanColumn[]
  onClose: () => void
  onSubmit: (newCol: { phase: string; label: string; description: string; color: string }) => Promise<void>
}) {
  const [label, setLabel] = useState('')
  const [phase, setPhase] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#A78BFA')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const existingPhases = new Set(existingColumns.map((c) => c.phase))

  const handleTemplate = (tpl: typeof phaseTemplates[number]) => {
    setLabel(tpl.label)
    setPhase(tpl.phase)
    setDescription(tpl.description)
    setColor(tpl.color)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanedPhase = phase.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!label.trim()) return setError('Anzeige-Name erforderlich')
    if (!cleanedPhase) return setError('Phase-ID erforderlich')
    if (existingPhases.has(cleanedPhase)) return setError(`Phase-ID "${cleanedPhase}" existiert bereits`)
    setSubmitting(true)
    try {
      await onSubmit({ phase: cleanedPhase, label: label.trim(), description: description.trim(), color })
    } catch (err: any) {
      setError(err?.message ?? 'Fehler beim Speichern')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Plus size={18} strokeWidth={1.8} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Neue Kanban-Spalte</h2>
              <p className="text-[11px] text-text-sec mt-0.5">Vorlage wählen oder eigene Phase</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-text-dim hover:text-text">
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Vorlagen */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Vorlage wählen (optional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {phaseTemplates.map((tpl) => {
                const exists = existingPhases.has(tpl.phase)
                return (
                  <button
                    key={tpl.phase}
                    type="button"
                    disabled={exists}
                    onClick={() => handleTemplate(tpl)}
                    className="text-left flex items-start gap-2 p-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-hover"
                    style={{
                      background: phase === tpl.phase ? `color-mix(in srgb, ${tpl.color} 15%, transparent)` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${phase === tpl.phase ? tpl.color : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1" style={{ background: tpl.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-text">{tpl.label}</div>
                      <div className="text-[10px] text-text-sec line-clamp-1">{tpl.description}</div>
                      {exists && <div className="text-[10px] text-green mt-0.5">✓ schon da</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Felder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Anzeige-Name</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="glass-input mt-1 w-full text-sm"
                placeholder="z.B. Pronovo"
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Phase-ID</label>
              <input
                type="text"
                value={phase}
                onChange={(e) => setPhase(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                className="glass-input mt-1 w-full text-sm font-mono"
                placeholder="pronovo"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Beschreibung</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="glass-input mt-1 w-full text-sm"
                placeholder="Kurzbeschreibung für die Spalte"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Farbe</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-9 rounded-lg cursor-pointer border-0 p-0" />
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="glass-input flex-1 text-sm font-mono" />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <span className="text-[13px] text-red flex-1">{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button type="button" onClick={onClose} className="btn-secondary text-xs" disabled={submitting}>
            Abbrechen
          </button>
          <button type="submit" disabled={submitting || !label.trim() || !phase.trim()} className="btn-primary text-xs">
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Speichern…</> : <><Plus size={14} strokeWidth={2} /> Spalte hinzufügen</>}
          </button>
        </div>
      </form>
    </div>
  )
}

function ProjectCard({
  project, phaseId, onClick, onDragStart, onDragEnd, isDragging, draggable = true, hidePrice = false,
}: {
  project: Project; phaseId: ProjectPhase; onClick: () => void
  onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; isDragging: boolean; draggable?: boolean; hidePrice?: boolean
}) {
  const color = phaseColors[phaseId]
  const pp = computePhaseProgress(project.progress, phaseId)
  const totalProgress = project.percent ?? 0

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`glass-card w-full text-left p-4 hover:border-[rgba(255,255,255,0.12)] transition-all duration-150 group ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDragging ? 'opacity-40 scale-95' : ''}`}
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
        {!hidePrice && <span className="font-mono tabular-nums" style={{ color: '#F59E0B' }}>{formatCHF(project.value)}</span>}
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
  stats: ProjectStats | undefined
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

function PartnerView({ partners }: { partners: Partner[] }) {
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

// ─── Archiv View ───

function ArchivView({
  projects,
  onSelect,
}: {
  projects: Project[]
  onSelect: (id: string) => void
}) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'color-mix(in srgb, #34D399 10%, transparent)' }}>
          <Archive size={28} className="text-emerald-400" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-semibold text-text-sec">Kein archiviertes Projekt</p>
        <p className="text-[12px] text-text-dim mt-1">Abgeschlossene Projekte (100%) können archiviert werden</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full space-y-3 pb-4">
      {projects.map((p) => {
        const archivedDate = p.archivedAt ? new Date(p.archivedAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className="w-full glass-card p-4 sm:p-5 text-left hover:bg-surface-hover transition-all group"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)' }}>
                  <CheckCircle2 size={18} className="text-emerald-400" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate">{p.name}</p>
                  <p className="text-[11px] text-text-dim truncate">{p.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0 pl-4 sm:pl-0">
                <div>
                  <p className="text-[10px] text-text-dim uppercase">Wert</p>
                  <p className="text-[13px] font-bold tabular-nums text-amber">{formatCHF(p.value)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-dim uppercase">kWp</p>
                  <p className="text-[13px] font-bold tabular-nums">{p.kWp}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-dim uppercase">Archiviert</p>
                  <p className="text-[12px] font-medium text-emerald-400">{archivedDate}</p>
                </div>
                <ChevronRight size={16} className="text-text-dim group-hover:text-text transition-colors" />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
