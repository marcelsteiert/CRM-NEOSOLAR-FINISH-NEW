import { useState } from 'react'
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
  Target,
  Bell,
  Phone,
  Clock,
  Users,
} from 'lucide-react'
import {
  useDeals,
  useDealStats,
  useFollowUps,
  type Deal,
  type DealStage,
  type DealPriority,
  type FollowUp,
  stageLabels,
  stageColors,
  priorityLabels,
  formatCHF,
} from '@/hooks/useDeals'
import { useUsers } from '@/hooks/useLeads'
import DealTable from './components/DealTable'
import DealDetailModal from './components/DealDetailModal'
import DealCreateDialog from './components/DealCreateDialog'

/* ── Simulated current user ── */

const CURRENT_USER_ID = 'u001'
const CURRENT_USER_ROLE: 'ADMIN' | 'VERTRIEB' | 'PROJEKTLEITUNG' | 'BUCHHALTUNG' | 'GL' = 'VERTRIEB'

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
              {['Angebot', 'Unternehmen', 'Wert', 'Phase', 'Prioritaet', 'Abschluss', 'Erstellt'].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {[180, 120, 80, 90, 70, 85, 75].map((w, j) => (
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
  if (followUps.length === 0) return null

  const criticalCount = followUps.filter((f) => f.urgency === 'CRITICAL').length
  const overdueCount = followUps.filter((f) => f.urgency === 'OVERDUE').length

  const urgencyColors = { CRITICAL: '#F87171', OVERDUE: '#FB923C', WARNING: '#F59E0B' }
  const urgencyLabels = { CRITICAL: 'Kritisch', OVERDUE: 'Ueberfaellig', WARNING: 'Bald faellig' }

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
            <p className="text-[13px] font-bold">{followUps.length} Follow-Up{followUps.length !== 1 ? 's' : ''} noetig</p>
            <p className="text-[11px] text-text-sec">
              {criticalCount > 0 && <span className="text-red font-semibold">{criticalCount} kritisch</span>}
              {criticalCount > 0 && overdueCount > 0 && ' · '}
              {overdueCount > 0 && <span className="text-orange-400 font-semibold">{overdueCount} ueberfaellig</span>}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className="text-text-dim transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {followUps.map((fu) => (
            <button key={fu.id} type="button" onClick={() => onSelectDeal(fu.dealId)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-surface-hover/50 transition-colors text-left" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: urgencyColors[fu.urgency], boxShadow: `0 0 8px ${urgencyColors[fu.urgency]}40` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold truncate">{fu.dealTitle}</p>
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: `color-mix(in srgb, ${urgencyColors[fu.urgency]} 15%, transparent)`, color: urgencyColors[fu.urgency] }}>
                    {urgencyLabels[fu.urgency]}
                  </span>
                </div>
                <p className="text-[11px] text-text-sec mt-0.5">{fu.message}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-[11px] text-text-sec"><Phone size={10} strokeWidth={2} /><span>{fu.contactName}</span></div>
                <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: urgencyColors[fu.urgency] }}><Clock size={10} strokeWidth={2} /><span className="font-semibold">{fu.daysSinceUpdate} Tage</span></div>
              </div>
              <span className="text-[12px] font-bold tabular-nums text-amber shrink-0">{formatCHF(fu.value)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */

export default function DealsPage() {
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<DealPriority | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewAll, setViewAll] = useState(false)

  const canViewAll = CURRENT_USER_ROLE === 'ADMIN' || CURRENT_USER_ROLE === 'GL'
  const assignedTo = (canViewAll && viewAll) ? undefined : CURRENT_USER_ID

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

  const { data: followUpsResponse } = useFollowUps(CURRENT_USER_ID)
  const followUps = followUpsResponse?.data ?? []

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []
  const currentUser = users.find((u) => u.id === CURRENT_USER_ID)

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
    { value: 'ALL', label: 'Alle Prioritaeten' },
    ...Object.entries(priorityLabels).map(([key, label]) => ({ value: key as DealPriority, label })),
  ]

  return (
    <>
      <div className="space-y-5">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #A78BFA 12%, transparent), color-mix(in srgb, #A78BFA 4%, transparent))', border: '1px solid color-mix(in srgb, #A78BFA 10%, transparent)' }}>
              <FileText size={20} className="text-violet-400" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-[-0.02em]">
                  {canViewAll && viewAll ? 'Angebote – Alle' : 'Meine Angebote'}
                </h1>
                {currentUser && !viewAll && (
                  <span className="text-[11px] text-text-sec font-medium">({currentUser.firstName} {currentUser.lastName})</span>
                )}
                <span className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums" style={{ background: 'color-mix(in srgb, #A78BFA 12%, transparent)', color: '#A78BFA' }}>
                  {isLoading ? '\u2014' : filteredDeals.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5">Offerten verwalten und zum Abschluss fuehren</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {canViewAll && (
              <button type="button" onClick={() => setViewAll(!viewAll)} className={['flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors', viewAll ? 'bg-violet-400/10 text-violet-400' : 'text-text-dim hover:text-text hover:bg-surface-hover'].join(' ')} style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Users size={14} strokeWidth={1.8} />
                {viewAll ? 'Alle Angebote' : 'Meine Angebote'}
              </button>
            )}
            <button type="button" className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[13px]" onClick={() => setCreateDialogOpen(true)}>
              <Plus size={16} strokeWidth={2.5} />
              Neues Angebot
            </button>
          </div>
        </div>

        {/* Follow-Up Banner */}
        <FollowUpBanner followUps={followUps} onSelectDeal={(id) => setSelectedDealId(id)} />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="Pipeline-Wert" value={formatCHF(stats.pipelineValue)} color="#F59E0B" />
            <StatCard icon={Target} label="Offene Angebote" value={String(stats.totalDeals - stats.wonDeals - stats.lostDeals)} color="#60A5FA" />
            <StatCard icon={Trophy} label="Gewonnen" value={String(stats.wonDeals)} color="#34D399" />
            <StatCard icon={XCircle} label="Win-Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? '#34D399' : '#F87171'} />
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center rounded-full p-0.5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {statusTabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setStageFilter(tab.key)} className={['px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200', stageFilter === tab.key ? 'bg-violet-400/10 text-violet-400' : 'text-text-dim hover:text-text'].join(' ')}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as DealPriority | 'ALL')} className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer" style={{ minWidth: '160px' }}>
                {priorityOptions.map((opt) => <option key={opt.value} value={opt.value} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{opt.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              <input type="text" placeholder="Angebote durchsuchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="glass-input pl-9 pr-4 py-2 text-[12px] w-[220px]" />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? <LoadingSkeleton /> : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.'} onRetry={() => refetch()} />
        ) : (
          <DealTable deals={filteredDeals} onSelectDeal={(d) => setSelectedDealId(d.id)} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
        )}
      </div>

      {selectedDealId && <DealDetailModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} />}
      {createDialogOpen && <DealCreateDialog onClose={() => setCreateDialogOpen(false)} />}
    </>
  )
}
