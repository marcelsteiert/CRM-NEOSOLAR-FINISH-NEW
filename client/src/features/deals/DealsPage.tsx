import { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Trophy,
  XCircle,
  X,
  Target,
  Bell,
  Phone,
  Clock,
  Users,
  LayoutGrid,
  List,
} from 'lucide-react'
import {
  useDeals,
  useUpdateDeal,
  useDealStats,
  useFollowUps,
  useDismissFollowUp,
  type Deal,
  type DealStage,
  type DealPriority,
  type FollowUp,
  priorityLabels,
  priorityColors,
  stageLabels,
  stageColors,
  formatCHF,
} from '@/hooks/useDeals'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import { useDealKanbanColumns, type DealKanbanColumn } from '@/hooks/useAdmin'
import DealTable from './components/DealTable'
import DealDetailModal from './components/DealDetailModal'
import DealCreateDialog from './components/DealCreateDialog'
import { useSearchParams } from 'react-router-dom'

/* ── Filter Types ── */

type StageFilter = 'ALL' | 'OPEN' | 'GEWONNEN' | 'VERLOREN'

/* ── Loading Skeleton ── */

function LoadingSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Angebot', 'Unternehmen', 'Wert', 'Phase', 'Priorität', 'Wahrsch.', 'Zugewiesen', 'Abschluss', 'Erstellt'].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {[180, 120, 80, 90, 70, 60, 100, 85, 75].map((w, j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="rounded-md animate-pulse" style={{ width: `${w + Math.random() * 30}px`, height: '14px', background: 'rgba(255,255,255,0.06)', animationDelay: `${i * 80 + j * 40}ms` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Error State ── */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-card p-12 text-center">
      <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
        <AlertTriangle size={20} className="text-red-400" strokeWidth={1.8} />
      </div>
      <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden der Angebote</p>
      <p className="text-[12px] text-text-sec mb-5">{message}</p>
      <button type="button" onClick={onRetry} className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]">
        <RefreshCw size={14} strokeWidth={2} />
        Erneut versuchen
      </button>
    </div>
  )
}

/* ── Stats Card ── */

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ size: number; strokeWidth: number; className?: string }>
  label: string; value: string; color: string
}) {
  return (
    <div className="glass-card px-5 py-4 flex items-center gap-4" style={{ border: `1px solid color-mix(in srgb, ${color} 10%, transparent)` }}>
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
        <Icon size={18} strokeWidth={1.8} className="text-inherit" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">{label}</p>
        <p className="text-[18px] font-extrabold tabular-nums tracking-[-0.02em]" style={{ color }}>{value}</p>
      </div>
    </div>
  )
}

/* ── Follow-Up Banner ── */

function FollowUpBanner({ followUps, onSelectDeal }: { followUps: FollowUp[]; onSelectDeal: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [dismissNote, setDismissNote] = useState('')
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set())
  const dismissFollowUp = useDismissFollowUp()

  // Lokal dismissed Follow-Ups rausfiltern
  const visibleFollowUps = followUps.filter((f) => !localDismissed.has(f.id))

  if (visibleFollowUps.length === 0) return null

  const criticalCount = visibleFollowUps.filter((f) => f.urgency === 'CRITICAL').length
  const overdueCount = visibleFollowUps.filter((f) => f.urgency === 'OVERDUE').length

  const urgencyColors = { CRITICAL: '#F87171', OVERDUE: '#FB923C', WARNING: '#F59E0B' }
  const urgencyLabels = { CRITICAL: 'Kritisch', OVERDUE: 'Überfällig', WARNING: 'Bald fällig' }

  const handleDismiss = (fuId: string) => {
    if (!dismissNote.trim()) return
    // Sofort lokal ausblenden
    setLocalDismissed((prev) => new Set(prev).add(fuId))
    dismissFollowUp.mutate({ followUpId: fuId, note: dismissNote.trim() })
    setDismissingId(null)
    setDismissNote('')
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: criticalCount > 0 ? 'color-mix(in srgb, #F87171 6%, transparent)' : 'color-mix(in srgb, #FB923C 6%, transparent)',
      border: `1px solid color-mix(in srgb, ${criticalCount > 0 ? '#F87171' : '#FB923C'} 15%, transparent)`,
    }}>
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-hover/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `color-mix(in srgb, ${criticalCount > 0 ? '#F87171' : '#FB923C'} 15%, transparent)` }}>
            <Bell size={16} strokeWidth={1.8} style={{ color: criticalCount > 0 ? '#F87171' : '#FB923C' }} />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-bold">{visibleFollowUps.length} Follow-Up{visibleFollowUps.length !== 1 ? 's' : ''} noetig</p>
            <p className="text-[11px] text-text-sec">
              {criticalCount > 0 && <span className="text-red font-semibold">{criticalCount} kritisch</span>}
              {criticalCount > 0 && overdueCount > 0 && ' · '}
              {overdueCount > 0 && <span className="text-orange-400 font-semibold">{overdueCount} überfällig</span>}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className="text-text-dim transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {visibleFollowUps.map((fu) => (
            <div key={fu.id}>
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-left" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: urgencyColors[fu.urgency], boxShadow: `0 0 8px ${urgencyColors[fu.urgency]}40` }} />
                <button type="button" onClick={() => onSelectDeal(fu.dealId)} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold truncate">{fu.dealTitle}</p>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: `color-mix(in srgb, ${urgencyColors[fu.urgency]} 15%, transparent)`, color: urgencyColors[fu.urgency] }}>
                      {urgencyLabels[fu.urgency]}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-sec mt-0.5">{fu.message}</p>
                </button>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-text-sec"><Phone size={10} strokeWidth={2} /><span>{fu.contactName}</span></div>
                  <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: urgencyColors[fu.urgency] }}><Clock size={10} strokeWidth={2} /><span className="font-semibold">{fu.daysSinceUpdate} Tage</span></div>
                </div>
                <span className="text-[12px] font-bold tabular-nums text-amber shrink-0">{formatCHF(fu.value)}</span>
                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDismissingId(dismissingId === fu.id ? null : fu.id); setDismissNote('') }}
                  className="shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"
                  title="Erledigt markieren"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Dismiss note input */}
              {dismissingId === fu.id && (
                <div className="flex items-center gap-2 mt-1.5 ml-7">
                  <input
                    type="text"
                    value={dismissNote}
                    onChange={(e) => setDismissNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDismiss(fu.id)}
                    placeholder="Kommentar eingeben (Pflicht)..."
                    className="glass-input flex-1 px-3 py-1.5 text-[11px]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleDismiss(fu.id)}
                    disabled={!dismissNote.trim()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity"
                    style={{
                      background: dismissNote.trim() ? 'color-mix(in srgb, #34D399 15%, transparent)' : 'transparent',
                      color: dismissNote.trim() ? '#34D399' : 'var(--color-text-dim)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Erledigt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDismissingId(null); setDismissNote('') }}
                    className="px-2 py-1.5 rounded-lg text-[11px] text-text-dim hover:text-text transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Kanban Card ── */

interface UserInfo { id: string; firstName: string; lastName: string; role: string }

function DealKanbanCard({ deal, users, onSelect }: { deal: Deal; users: UserInfo[]; onSelect: (d: Deal) => void }) {
  const assignee = users.find((u) => u.id === deal.assignedTo)

  return (
    <div
      onClick={() => onSelect(deal)}
      className="p-3.5 rounded-xl cursor-pointer hover:bg-surface-hover/50 transition-all duration-150 group"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text truncate">{deal.title}</p>
          <p className="text-[10px] text-text-dim truncate">{deal.contactName}</p>
        </div>
        <span
          className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold"
          style={{
            background: `color-mix(in srgb, ${priorityColors[deal.priority]} 12%, transparent)`,
            color: priorityColors[deal.priority],
          }}
        >
          {priorityLabels[deal.priority]}
        </span>
      </div>

      {/* Value + Date */}
      <div className="flex items-center gap-3 text-[11px] text-text-sec mb-2.5">
        <span className="font-bold tabular-nums text-amber">{formatCHF(deal.value)}</span>
        {deal.expectedCloseDate && (
          <span className="flex items-center gap-1 tabular-nums">
            <Clock size={10} strokeWidth={1.8} />
            {new Date(deal.expectedCloseDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>

      {/* Probability + Assignee */}
      <div className="flex items-center justify-between gap-2">
        {deal.winProbability != null ? (
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${deal.winProbability}%`,
                  background: deal.winProbability >= 70 ? '#34D399' : deal.winProbability >= 40 ? '#F59E0B' : '#F87171',
                }}
              />
            </div>
            <span className="text-[9px] font-semibold tabular-nums" style={{
              color: deal.winProbability >= 70 ? '#34D399' : deal.winProbability >= 40 ? '#F59E0B' : '#F87171',
            }}>
              {deal.winProbability}%
            </span>
          </div>
        ) : (
          <div />
        )}
        {assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-bg shrink-0"
            style={{ background: '#A78BFA' }}
            title={`${assignee.firstName} ${assignee.lastName}`}
          >
            {assignee.firstName?.[0]}{assignee.lastName?.[0]}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Kanban View with Drag & Drop ── */

const defaultDealColumns: DealKanbanColumn[] = [
  { stage: 'ERSTELLT', label: 'Angebot erstellen', color: '#60A5FA', order: 0 },
  { stage: 'GESENDET', label: 'Angebot gesendet', color: '#A78BFA', order: 1 },
  { stage: 'FOLLOW_UP', label: 'Warten auf Unterlagen', color: '#F59E0B', order: 2 },
  { stage: 'VERHANDLUNG', label: 'Verhandlung', color: '#FB923C', order: 3 },
]

function DealKanbanView({ deals, users, onSelect, columns }: { deals: Deal[]; users: UserInfo[]; onSelect: (d: Deal) => void; columns: DealKanbanColumn[] }) {
  const updateDeal = useUpdateDeal()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(stage)
  }

  const handleDragLeave = () => setDragOverCol(null)

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const dealId = e.dataTransfer.getData('dealId')
    const deal = deals.find((d) => d.id === dealId)
    if (deal && deal.stage !== targetStage) {
      updateDeal.mutate({ id: dealId, stage: targetStage as DealStage })
    }
  }

  const sorted = [...columns].sort((a, b) => a.order - b.order)

  if (deals.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[14px] font-semibold text-text mb-1">Keine Angebote gefunden</p>
        <p className="text-[12px] text-text-sec">Erstelle ein neues Angebot oder passe die Filter an.</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${sorted.length <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
      {sorted.map((col) => {
        const items = deals.filter((d) => d.stage === col.stage)
        const totalValue = items.reduce((sum, d) => sum + d.value, 0)
        const isOver = dragOverCol === col.stage
        return (
          <div
            key={col.stage}
            className="flex flex-col rounded-xl min-h-[200px] transition-all duration-150"
            style={{
              background: isOver ? `color-mix(in srgb, ${col.color} 4%, transparent)` : 'rgba(255,255,255,0.015)',
              border: isOver ? `1px solid color-mix(in srgb, ${col.color} 30%, transparent)` : '1px solid rgba(255,255,255,0.04)',
            }}
            onDragOver={(e) => handleDragOver(e, col.stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.stage)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
              <span className="text-[12px] font-bold" style={{ color: col.color }}>{col.label}</span>
              <span
                className="ml-auto text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${col.color} 12%, transparent)`, color: col.color }}
              >
                {items.length}
              </span>
            </div>

            {/* Total value */}
            {totalValue > 0 && (
              <div className="px-4 py-1.5 text-[10px] font-semibold tabular-nums text-amber" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {formatCHF(totalValue)}
              </div>
            )}

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-380px)]">
              {items.length === 0 ? (
                <p className="text-[10px] text-text-dim text-center py-6">
                  {isOver ? 'Hier ablegen' : 'Keine Angebote'}
                </p>
              ) : (
                items.map((d) => (
                  <div key={d.id} draggable onDragStart={(e) => handleDragStart(e, d.id)}>
                    <DealKanbanCard deal={d} users={users} onSelect={onSelect} />
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── View Mode Type ── */

type ViewMode = 'kanban' | 'list'

/* ── Main Component ── */

export default function DealsPage() {
  const { user: authUser, isAdmin } = useAuth()
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<DealPriority | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // URL-Parameter ?open=<dealId> auswerten
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      setSelectedDealId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewAll, setViewAll] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  const { data: kanbanColumnsRes } = useDealKanbanColumns()
  const kanbanCols = kanbanColumnsRes?.data ?? defaultDealColumns

  const canViewAll = isAdmin
  const assignedTo = (canViewAll && viewAll) ? undefined : authUser?.id

  const stageQueryMap: Record<StageFilter, DealStage | undefined> = {
    ALL: undefined,
    OPEN: undefined,
    GEWONNEN: 'GEWONNEN',
    VERLOREN: 'VERLOREN',
  }

  const { data: dealsResponse, isLoading, isError, error, refetch } = useDeals({
    stage: stageQueryMap[stageFilter],
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    assignedTo,
    search: searchQuery.trim() || undefined,
    sortBy, sortOrder,
    pageSize: 100,
  })

  const allDeals: Deal[] = dealsResponse?.data ?? []
  const filteredDeals =
    stageFilter === 'OPEN' || stageFilter === 'ALL'
      ? allDeals.filter((d) => d.stage !== 'GEWONNEN' && d.stage !== 'VERLOREN')
      : allDeals

  const { data: statsResponse } = useDealStats(assignedTo)
  const stats = statsResponse?.data

  const { data: followUpsResponse } = useFollowUps(authUser?.id)
  const followUps = followUpsResponse?.data ?? []

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []
  const currentUser = users.find((u) => u.id === authUser?.id)

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setSortOrder('asc') }
  }

  const statusTabs: { key: StageFilter; label: string }[] = [
    { key: 'ALL', label: 'Pipeline' },
    { key: 'GEWONNEN', label: 'Gewonnen' },
    { key: 'VERLOREN', label: 'Verloren' },
  ]

  const priorityOptions: { value: DealPriority | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Prioritäten' },
    ...Object.entries(priorityLabels).map(([key, label]) => ({ value: key as DealPriority, label })),
  ]

  return (
    <>
      <div className="space-y-5">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #A78BFA 12%, transparent), color-mix(in srgb, #A78BFA 4%, transparent))', border: '1px solid color-mix(in srgb, #A78BFA 10%, transparent)' }}>
              <FileText size={20} className="text-violet-400" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">
                  {canViewAll && viewAll ? 'Angebote – Alle' : 'Meine Angebote'}
                </h1>
                {currentUser && !viewAll && (
                  <span className="text-[11px] text-text-sec font-medium hidden sm:inline">({currentUser.firstName} {currentUser.lastName})</span>
                )}
                <span className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: 'color-mix(in srgb, #A78BFA 12%, transparent)', color: '#A78BFA' }}>
                  {isLoading ? '\u2014' : filteredDeals.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">Offerten verwalten und zum Abschluss fuehren</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* View Toggle */}
            <div
              className="flex rounded-[10px] p-0.5 shrink-0"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={[
                  'p-2 rounded-[8px] transition-all',
                  viewMode === 'kanban' ? 'bg-violet-400/10 text-violet-400' : 'text-text-dim hover:text-text',
                ].join(' ')}
                title="Kanban-Ansicht"
              >
                <LayoutGrid size={15} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={[
                  'p-2 rounded-[8px] transition-all',
                  viewMode === 'list' ? 'bg-violet-400/10 text-violet-400' : 'text-text-dim hover:text-text',
                ].join(' ')}
                title="Listenansicht"
              >
                <List size={15} strokeWidth={1.8} />
              </button>
            </div>

            {canViewAll && (
              <button type="button" onClick={() => setViewAll(!viewAll)} className={['flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors', viewAll ? 'bg-violet-400/10 text-violet-400' : 'text-text-dim hover:text-text hover:bg-surface-hover'].join(' ')} style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Users size={14} strokeWidth={1.8} />
                <span className="hidden sm:inline">{viewAll ? 'Alle Angebote' : 'Meine Angebote'}</span>
                <span className="sm:hidden">{viewAll ? 'Alle' : 'Meine'}</span>
              </button>
            )}
            <button type="button" className="btn-primary flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[13px]" onClick={() => setCreateDialogOpen(true)}>
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Neues Angebot</span>
              <span className="sm:hidden">Neu</span>
            </button>
          </div>
        </div>

        {/* Follow-Up Banner */}
        <FollowUpBanner followUps={followUps} onSelectDeal={(id) => setSelectedDealId(id)} />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard icon={TrendingUp} label="Pipeline-Wert" value={formatCHF(stats.pipelineValue)} color="#F59E0B" />
            <StatCard icon={TrendingUp} label="Gewichtet" value={formatCHF(stats.weightedPipelineValue)} color="#A78BFA" />
            <StatCard icon={Target} label="Offene Angebote" value={String(stats.totalDeals - stats.wonDeals - stats.lostDeals)} color="#60A5FA" />
            <StatCard icon={Trophy} label="Gewonnen" value={String(stats.wonDeals)} color="#34D399" />
            <StatCard icon={XCircle} label="Win-Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? '#34D399' : '#F87171'} />
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
          <div className="flex items-center rounded-full p-0.5 overflow-x-auto max-w-full" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {statusTabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setStageFilter(tab.key)} className={['px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 whitespace-nowrap', stageFilter === tab.key ? 'bg-violet-400/10 text-violet-400' : 'text-text-dim hover:text-text'].join(' ')}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full lg:w-auto">
            {/* Verkäufer Filter */}
            {canViewAll && viewAll && (
              <div className="relative">
                <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
                <select
                  value={assignedTo ?? 'ALL'}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'ALL') setViewAll(true)
                  }}
                  className="glass-input appearance-none pl-9 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                  style={{ minWidth: 'auto' }}
                >
                  <option value="ALL" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Alle Verkäufer</option>
                  {users.filter((u) => u.role === 'VERTRIEB' || u.role === 'GL').map((u) => (
                    <option key={u.id} value={u.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              </div>
            )}

            <div className="relative">
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as DealPriority | 'ALL')} className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer" style={{ minWidth: 'auto' }}>
                {priorityOptions.map((opt) => <option key={opt.value} value={opt.value} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{opt.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              <input type="text" placeholder="Durchsuchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="glass-input pl-9 pr-4 py-2 text-[12px] w-full sm:w-[220px]" />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? <LoadingSkeleton /> : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.'} onRetry={() => refetch()} />
        ) : viewMode === 'kanban' ? (
          <DealKanbanView
            deals={filteredDeals}
            users={users}
            onSelect={(d) => setSelectedDealId(d.id)}
            columns={kanbanCols}
          />
        ) : (
          <DealTable deals={filteredDeals} users={users} onSelectDeal={(d) => setSelectedDealId(d.id)} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
        )}
      </div>

      {selectedDealId && <DealDetailModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} />}
      {createDialogOpen && <DealCreateDialog onClose={() => setCreateDialogOpen(false)} />}
    </>
  )
}
