import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  LayoutGrid,
  List,
  MapPin,
  Globe,
  Car,
  CheckCircle2,
} from 'lucide-react'
import {
  useAppointments,
  useAppointmentStats,
  useUpdateAppointment,
  type Appointment,
  type AppointmentStatus,
  type AppointmentPriority,
  priorityLabels,
  statusLabels,
  statusColors,
  appointmentTypeLabels,
  appointmentTypeColors,
} from '@/hooks/useAppointments'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import AppointmentTable from './components/AppointmentTable'
import AppointmentDetailModal from './components/AppointmentDetailModal'
import AppointmentCreateDialog from './components/AppointmentCreateDialog'
import { useKanbanColumns, type KanbanColumn } from '@/hooks/useAdmin'

/* ── Filter Types ── */

type StatusFilter = 'ALL' | 'GEPLANT' | 'BESTAETIGT' | 'VORBEREITUNG'
type ViewMode = 'kanban' | 'list'

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

/* ── Kanban Card ── */

interface UserInfo { id: string; firstName: string; lastName: string; role: string }

function KanbanCard({ appointment: a, users, onSelect }: { appointment: Appointment; users: UserInfo[]; onSelect: (a: Appointment) => void }) {
  const updateAppt = useUpdateAppointment()
  const checkedCount = a.checklist.filter((c) => c.checked).length
  const totalCount = a.checklist.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
  const progressColor = progress === 100 ? '#34D399' : progress >= 50 ? '#F59E0B' : '#F87171'
  const assignee = users.find((u) => u.id === a.assignedTo)

  return (
    <div
      onClick={() => onSelect(a)}
      className="p-3.5 rounded-xl cursor-pointer hover:bg-surface-hover/50 transition-all duration-150 group"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text truncate">{a.contactName}</p>
          {a.company && <p className="text-[10px] text-text-dim truncate">{a.company}</p>}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const next = a.appointmentType === 'VOR_ORT' ? 'ONLINE' : 'VOR_ORT'
            updateAppt.mutate({ id: a.id, appointmentType: next })
          }}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold hover:opacity-80 transition-opacity"
          style={{
            background: `color-mix(in srgb, ${appointmentTypeColors[a.appointmentType]} 12%, transparent)`,
            color: appointmentTypeColors[a.appointmentType],
          }}
          title="Klicken zum Wechseln"
        >
          {a.appointmentType === 'ONLINE' ? <Globe size={9} strokeWidth={2} /> : <MapPin size={9} strokeWidth={2} />}
          {appointmentTypeLabels[a.appointmentType]}
        </button>
      </div>

      {/* Date + Location */}
      <div className="flex items-center gap-3 text-[11px] text-text-sec mb-2.5">
        {a.appointmentDate && (
          <span className="flex items-center gap-1 tabular-nums">
            <Clock size={10} strokeWidth={1.8} />
            {new Date(a.appointmentDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
            {a.appointmentTime && ` · ${a.appointmentTime}`}
          </span>
        )}
        {a.travelMinutes != null && (
          <span className="flex items-center gap-1">
            <Car size={10} strokeWidth={1.8} />
            {a.travelMinutes >= 60
              ? `${Math.floor(a.travelMinutes / 60)}h${a.travelMinutes % 60 > 0 ? ` ${a.travelMinutes % 60}m` : ''}`
              : `${a.travelMinutes}m`}
          </span>
        )}
      </div>

      {/* Checklist + Assignee */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progressColor }} />
          </div>
          <span className="text-[9px] font-semibold tabular-nums" style={{ color: progressColor }}>
            {checkedCount}/{totalCount}
          </span>
          {progress === 100 && <CheckCircle2 size={10} className="text-emerald-400" />}
        </div>
        {assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-bg shrink-0"
            style={{ background: '#F59E0B' }}
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

const defaultColumns: KanbanColumn[] = [
  { status: 'GEPLANT', label: 'Geplant', color: '#60A5FA', order: 0 },
  { status: 'BESTAETIGT', label: 'Bestätigt', color: '#34D399', order: 1 },
  { status: 'VORBEREITUNG', label: 'In Vorbereitung', color: '#F59E0B', order: 2 },
]

function KanbanView({ appointments, users, onSelect, columns }: { appointments: Appointment[]; users: UserInfo[]; onSelect: (a: Appointment) => void; columns: KanbanColumn[] }) {
  const updateAppt = useUpdateAppointment()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
    e.dataTransfer.setData('appointmentId', appointmentId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(status)
  }

  const handleDragLeave = () => setDragOverCol(null)

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const appointmentId = e.dataTransfer.getData('appointmentId')
    const appointment = appointments.find((a) => a.id === appointmentId)
    if (appointment && appointment.status !== targetStatus) {
      updateAppt.mutate({ id: appointmentId, status: targetStatus as AppointmentStatus })
    }
  }

  const sorted = [...columns].sort((a, b) => a.order - b.order)

  if (appointments.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[14px] font-semibold text-text mb-1">Keine Termine gefunden</p>
        <p className="text-[12px] text-text-sec">Erstelle einen neuen Termin oder passe die Filter an.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((col) => {
        const items = appointments.filter((a) => a.status === col.status)
        const isOver = dragOverCol === col.status
        return (
          <div
            key={col.status}
            className="flex flex-col rounded-xl min-h-[200px] transition-all duration-150"
            style={{
              background: isOver ? `color-mix(in srgb, ${col.color} 4%, transparent)` : 'rgba(255,255,255,0.015)',
              border: isOver ? `1px solid color-mix(in srgb, ${col.color} 30%, transparent)` : '1px solid rgba(255,255,255,0.04)',
            }}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
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

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-380px)]">
              {items.length === 0 ? (
                <p className="text-[10px] text-text-dim text-center py-6">
                  {isOver ? 'Hier ablegen' : 'Keine Termine'}
                </p>
              ) : (
                items.map((a) => (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, a.id)}
                  >
                    <KanbanCard appointment={a} users={users} onSelect={onSelect} />
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

/* ── Main Component ── */

export default function AppointmentsPage() {
  const { user: authUser, isAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<AppointmentPriority | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      setSelectedId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [sortBy, setSortBy] = useState<string>('appointmentDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewAll, setViewAll] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  const { data: kanbanColumnsRes } = useKanbanColumns()
  const kanbanCols = kanbanColumnsRes?.data ?? defaultColumns

  const canViewAll = isAdmin
  const assignedTo = (canViewAll && viewAll) ? undefined : authUser?.id

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
  const currentUser = users.find((u) => u.id === authUser?.id)

  const handleSelect = (a: Appointment) => setSelectedId(a.id)
  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setSortOrder('asc') }
  }

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Alle' },
    { key: 'GEPLANT', label: 'Geplant' },
    { key: 'BESTAETIGT', label: 'Bestätigt' },
    { key: 'VORBEREITUNG', label: 'Vorbereitung' },
  ]

  const priorityOptions: { value: AppointmentPriority | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Prioritäten' },
    ...Object.entries(priorityLabels).map(([key, label]) => ({ value: key as AppointmentPriority, label })),
  ]

  return (
    <>
      <div className="space-y-5">
        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, #34D399 12%, transparent), color-mix(in srgb, #34D399 4%, transparent))',
                border: '1px solid color-mix(in srgb, #34D399 10%, transparent)',
              }}
            >
              <CalendarCheck size={20} className="text-emerald-400" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">
                  {canViewAll && viewAll ? 'Termine – Alle' : 'Meine Termine'}
                </h1>
                {currentUser && !viewAll && (
                  <span className="text-[11px] text-text-sec font-medium hidden sm:inline">
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
              <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">Besichtigungstermine planen und vorbereiten</p>
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
                  viewMode === 'kanban' ? 'bg-emerald-400/10 text-emerald-400' : 'text-text-dim hover:text-text',
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
                  viewMode === 'list' ? 'bg-emerald-400/10 text-emerald-400' : 'text-text-dim hover:text-text',
                ].join(' ')}
                title="Listenansicht"
              >
                <List size={15} strokeWidth={1.8} />
              </button>
            </div>

            {canViewAll && (
              <button
                type="button"
                onClick={() => setViewAll(!viewAll)}
                className={[
                  'flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors',
                  viewAll ? 'bg-emerald-400/10 text-emerald-400' : 'text-text-dim hover:text-text hover:bg-surface-hover',
                ].join(' ')}
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Users size={14} strokeWidth={1.8} />
                <span className="hidden sm:inline">{viewAll ? 'Alle Termine' : 'Meine Termine'}</span>
                <span className="sm:hidden">{viewAll ? 'Alle' : 'Meine'}</span>
              </button>
            )}
            <button
              type="button"
              className="btn-primary flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[13px]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Neuer Termin</span>
              <span className="sm:hidden">Neu</span>
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={Clock} label="Anstehend" value={String(stats.upcoming)} color="#60A5FA" />
            <StatCard icon={ClipboardCheck} label="Vorbereitung" value={`${stats.checklistProgress}%`} color="#A78BFA" />
            <StatCard icon={CalendarCheck} label="Gesamt" value={String(stats.total)} color="#34D399" />
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
          <div
            className="flex items-center rounded-full p-0.5 overflow-x-auto max-w-full"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={[
                  'px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 whitespace-nowrap',
                  statusFilter === tab.key ? 'bg-emerald-400/10 text-emerald-400' : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
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
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as AppointmentPriority | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: 'auto' }}
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
                className="glass-input pl-9 pr-4 py-2 text-[12px] w-full sm:w-[220px]"
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
        ) : viewMode === 'kanban' ? (
          <KanbanView
            appointments={filteredItems}
            users={users}
            onSelect={handleSelect}
            columns={kanbanCols}
          />
        ) : (
          <AppointmentTable
            appointments={filteredItems}
            users={users}
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
