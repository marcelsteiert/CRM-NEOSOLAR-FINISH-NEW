import { useState } from 'react'
import {
  CalendarCheck,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Clock,
  ClipboardCheck,
  Users,
} from 'lucide-react'
import {
  useAppointments,
  useAppointmentStats,
  type Appointment,
  type AppointmentStatus,
  type AppointmentPriority,
  priorityLabels,
} from '@/hooks/useAppointments'
import { useUsers } from '@/hooks/useLeads'
import AppointmentTable from './components/AppointmentTable'
import AppointmentDetailModal from './components/AppointmentDetailModal'
import AppointmentCreateDialog from './components/AppointmentCreateDialog'

/* ── Simulated current user ── */

const CURRENT_USER_ID = 'u001'
const CURRENT_USER_ROLE: 'ADMIN' | 'VERTRIEB' | 'PROJEKTLEITUNG' | 'BUCHHALTUNG' | 'GL' = 'VERTRIEB'

/* ── Filter Types ── */

type StatusFilter = 'ALL' | 'GEPLANT' | 'BESTAETIGT' | 'VORBEREITUNG'

/* ── Loading Skeleton ── */

function LoadingSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Kontakt', 'Unternehmen', 'Typ', 'Termin', 'Fahrzeit', 'Status', 'Checkliste', 'Erstellt'].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {[180, 120, 70, 100, 90, 80, 80, 75].map((w, j) => (
                  <td key={j} className="px-6 py-4">
                    <div
                      className="rounded-md animate-pulse"
                      style={{ width: `${w + Math.random() * 30}px`, height: '14px', background: 'rgba(255,255,255,0.06)', animationDelay: `${i * 80 + j * 40}ms` }}
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
      <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
        <AlertTriangle size={20} className="text-red-400" strokeWidth={1.8} />
      </div>
      <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden der Termine</p>
      <p className="text-[12px] text-text-sec mb-5">{message}</p>
      <button type="button" onClick={onRetry} className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]">
        <RefreshCw size={14} strokeWidth={2} />
        Erneut versuchen
      </button>
    </div>
  )
}

/* ── Stats Card ── */

function StatCard({
  icon: Icon, label, value, color,
}: {
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

/* ── Main Component ── */

export default function AppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<AppointmentPriority | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>('appointmentDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewAll, setViewAll] = useState(false)

  const canViewAll = CURRENT_USER_ROLE === 'ADMIN' || CURRENT_USER_ROLE === 'GL'
  const assignedTo = (canViewAll && viewAll) ? undefined : CURRENT_USER_ID

  // Map filter to API status
  const statusQueryMap: Record<StatusFilter, AppointmentStatus | undefined> = {
    ALL: undefined,
    GEPLANT: 'GEPLANT',
    BESTAETIGT: 'BESTAETIGT',
    VORBEREITUNG: 'VORBEREITUNG',
  }

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useAppointments({
    status: statusQueryMap[statusFilter],
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    assignedTo,
    search: searchQuery.trim() || undefined,
    sortBy,
    sortOrder,
    pageSize: 100,
  })

  const allItems: Appointment[] = listResponse?.data ?? []
  // Only show open appointments (exclude old DURCHGEFUEHRT/ABGESAGT)
  const filteredItems = allItems.filter((a) => a.status !== 'DURCHGEFUEHRT' && a.status !== 'ABGESAGT')

  const { data: statsResponse } = useAppointmentStats(assignedTo)
  const stats = statsResponse?.data

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []
  const currentUser = users.find((u) => u.id === CURRENT_USER_ID)

  const handleSelect = (a: Appointment) => setSelectedId(a.id)
  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setSortOrder('asc') }
  }

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Alle' },
    { key: 'GEPLANT', label: 'Geplant' },
    { key: 'BESTAETIGT', label: 'Bestaetigt' },
    { key: 'VORBEREITUNG', label: 'Vorbereitung' },
  ]

  const priorityOptions: { value: AppointmentPriority | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Prioritaeten' },
    ...Object.entries(priorityLabels).map(([key, label]) => ({ value: key as AppointmentPriority, label })),
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
                background: 'linear-gradient(135deg, color-mix(in srgb, #34D399 12%, transparent), color-mix(in srgb, #34D399 4%, transparent))',
                border: '1px solid color-mix(in srgb, #34D399 10%, transparent)',
              }}
            >
              <CalendarCheck size={20} className="text-emerald-400" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-[-0.02em]">
                  {canViewAll && viewAll ? 'Termine – Alle' : 'Meine Termine'}
                </h1>
                {currentUser && !viewAll && (
                  <span className="text-[11px] text-text-sec font-medium">
                    ({currentUser.firstName} {currentUser.lastName})
                  </span>
                )}
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399' }}
                >
                  {isLoading ? '\u2014' : filteredItems.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5">Besichtigungstermine planen und vorbereiten</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {canViewAll && (
              <button
                type="button"
                onClick={() => setViewAll(!viewAll)}
                className={[
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors',
                  viewAll ? 'bg-emerald-400/10 text-emerald-400' : 'text-text-dim hover:text-text hover:bg-surface-hover',
                ].join(' ')}
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Users size={14} strokeWidth={1.8} />
                {viewAll ? 'Alle Termine' : 'Meine Termine'}
              </button>
            )}
            <button
              type="button"
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[13px]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              Neuer Termin
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Clock} label="Anstehend" value={String(stats.upcoming)} color="#60A5FA" />
            <StatCard icon={ClipboardCheck} label="Vorbereitung" value={`${stats.checklistProgress}%`} color="#A78BFA" />
            <StatCard icon={CalendarCheck} label="Gesamt" value={String(stats.total)} color="#34D399" />
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex items-center justify-between gap-4">
          <div
            className="flex items-center rounded-full p-0.5"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={[
                  'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200',
                  statusFilter === tab.key ? 'bg-emerald-400/10 text-emerald-400' : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
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
                  style={{ minWidth: '160px' }}
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
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as AppointmentPriority | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: '160px' }}
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              <input
                type="text"
                placeholder="Termine durchsuchen..."
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
            message={error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.'}
            onRetry={() => refetch()}
          />
        ) : (
          <AppointmentTable
            appointments={filteredItems}
            onSelect={handleSelect}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>

      {selectedId && (
        <AppointmentDetailModal appointmentId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {createOpen && (
        <AppointmentCreateDialog onClose={() => setCreateOpen(false)} />
      )}
    </>
  )
}
