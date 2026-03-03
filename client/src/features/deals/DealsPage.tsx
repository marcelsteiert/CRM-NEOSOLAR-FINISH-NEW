import { useState } from 'react'
import {
  Handshake,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Trophy,
  XCircle,
  Target,
} from 'lucide-react'
import {
  useDeals,
  useDealStats,
  type Deal,
  type DealStage,
  type DealPriority,
  stageLabels,
  priorityLabels,
  formatCHF,
} from '@/hooks/useDeals'
import DealTable from './components/DealTable'
import DealDetailModal from './components/DealDetailModal'
import DealCreateDialog from './components/DealCreateDialog'

/* ── Filter Types ── */

type StageFilter = 'ALL' | 'OPEN' | 'CLOSED_WON' | 'CLOSED_LOST'

/* ── Loading Skeleton ── */

function LoadingSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Deal', 'Unternehmen', 'Wert', 'Phase', 'Prioritaet', 'Abschluss', 'Erstellt'].map(
                (header) => (
                  <th
                    key={header}
                    className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {[180, 120, 80, 90, 70, 85, 75].map((w, j) => (
                  <td key={j} className="px-6 py-4">
                    <div
                      className="rounded-md animate-pulse"
                      style={{
                        width: `${w + Math.random() * 30}px`,
                        height: '14px',
                        background: 'rgba(255,255,255,0.06)',
                        animationDelay: `${i * 80 + j * 40}ms`,
                      }}
                    />
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
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}
      >
        <AlertTriangle size={20} className="text-red-400" strokeWidth={1.8} />
      </div>
      <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden der Deals</p>
      <p className="text-[12px] text-text-sec mb-5">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
      >
        <RefreshCw size={14} strokeWidth={2} />
        Erneut versuchen
      </button>
    </div>
  )
}

/* ── Stats Card ── */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size: number; strokeWidth: number; className?: string }>
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="glass-card px-5 py-4 flex items-center gap-4"
      style={{ border: `1px solid color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
        }}
      >
        <Icon size={18} strokeWidth={1.8} className="text-inherit" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">{label}</p>
        <p className="text-[18px] font-extrabold tabular-nums tracking-[-0.02em]" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  )
}

/* ── Main Component ── */

export default function DealsPage() {
  /* ── State ── */
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<DealPriority | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  /* ── Data fetching ── */
  const stageQueryMap: Record<StageFilter, DealStage | undefined> = {
    ALL: undefined,
    OPEN: undefined, // client-side filter
    CLOSED_WON: 'CLOSED_WON',
    CLOSED_LOST: 'CLOSED_LOST',
  }

  const {
    data: dealsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useDeals({
    stage: stageQueryMap[stageFilter] ?? undefined,
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    search: searchQuery.trim() || undefined,
    sortBy,
    sortOrder,
    pageSize: 100,
  })

  const allDeals: Deal[] = dealsResponse?.data ?? []

  // Client-side filtering for "OPEN" (not CLOSED_WON or CLOSED_LOST)
  const filteredDeals =
    stageFilter === 'OPEN'
      ? allDeals.filter((d) => d.stage !== 'CLOSED_WON' && d.stage !== 'CLOSED_LOST')
      : stageFilter === 'ALL'
        ? allDeals.filter((d) => d.stage !== 'CLOSED_WON' && d.stage !== 'CLOSED_LOST')
        : allDeals

  const { data: statsResponse } = useDealStats()
  const stats = statsResponse?.data

  /* ── Handlers ── */
  const handleSelectDeal = (deal: Deal) => setSelectedDealId(deal.id)
  const handleCloseModal = () => setSelectedDealId(null)

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  /* ── Status Tabs ── */
  const statusTabs: { key: StageFilter; label: string }[] = [
    { key: 'ALL', label: 'Pipeline' },
    { key: 'CLOSED_WON', label: 'Gewonnen' },
    { key: 'CLOSED_LOST', label: 'Verloren' },
  ]

  /* ── Priority options ── */
  const priorityOptions: { value: DealPriority | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Prioritaeten' },
    ...Object.entries(priorityLabels).map(([key, label]) => ({
      value: key as DealPriority,
      label,
    })),
  ]

  return (
    <>
      <div className="space-y-5">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, #F59E0B 12%, transparent), color-mix(in srgb, #F59E0B 4%, transparent))',
                border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)',
              }}
            >
              <Handshake size={20} className="text-amber" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-[-0.02em]">Deal Hub</h1>
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{
                    background: 'color-mix(in srgb, #F59E0B 12%, transparent)',
                    color: '#F59E0B',
                  }}
                >
                  {isLoading ? '\u2014' : dealsResponse?.total ?? filteredDeals.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5">
                Deals verwalten und zum Abschluss fuehren
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[13px]"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            Neuer Deal
          </button>
        </div>

        {/* ── Stats Row ── */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={TrendingUp}
              label="Pipeline-Wert"
              value={formatCHF(stats.pipelineValue)}
              color="#F59E0B"
            />
            <StatCard
              icon={Target}
              label="Offene Deals"
              value={String(stats.totalDeals - stats.wonDeals - stats.lostDeals)}
              color="#60A5FA"
            />
            <StatCard
              icon={Trophy}
              label="Gewonnen"
              value={String(stats.wonDeals)}
              color="#34D399"
            />
            <StatCard
              icon={XCircle}
              label="Win-Rate"
              value={`${stats.winRate}%`}
              color={stats.winRate >= 50 ? '#34D399' : '#F87171'}
            />
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex items-center justify-between gap-4">
          {/* Status Tabs */}
          <div
            className="flex items-center rounded-full p-0.5"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStageFilter(tab.key)}
                className={[
                  'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  stageFilter === tab.key
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Priority Dropdown */}
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as DealPriority | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: '160px' }}
              >
                {priorityOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={{ background: '#0B0F15', color: '#F0F2F5' }}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Deals durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 text-[12px] w-[220px]"
              />
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : 'Ein unerwarteter Fehler ist aufgetreten.'
            }
            onRetry={() => refetch()}
          />
        ) : (
          <DealTable
            deals={filteredDeals}
            onSelectDeal={handleSelectDeal}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedDealId && (
        <DealDetailModal dealId={selectedDealId} onClose={handleCloseModal} />
      )}

      {/* ── Create Dialog ── */}
      {createDialogOpen && (
        <DealCreateDialog onClose={() => setCreateDialogOpen(false)} />
      )}
    </>
  )
}
