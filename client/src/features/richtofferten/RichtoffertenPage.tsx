import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Receipt,
  Search,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  FileEdit,
  Send,
  CheckCircle2,
  Users,
} from 'lucide-react'
import {
  useAppointments,
  useUpdateAppointment,
  type Appointment,
  type AppointmentStatus,
  type AppointmentPriority,
  priorityLabels,
} from '@/hooks/useAppointments'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import AppointmentDetailModal from '@/features/appointments/components/AppointmentDetailModal'

/* ── Richtofferten-spezifische Bucket-Definition ──
 * Bewusst mapping auf bestehende Appointment-Status, damit keine DB-Migration nötig ist.
 * GEPLANT       → "In Erstellung"
 * VORBEREITUNG  → "Bereit zum Versand"
 * BESTAETIGT    → "Versendet" (hier erscheint Button "Zum Angebot")
 * DURCHGEFUEHRT → "Angebot erstellt" (abgeschlossen, wird rausgefiltert)
 * ABGESAGT      → Abgebrochen (wird rausgefiltert)
 */

interface BucketDef {
  status: AppointmentStatus
  label: string
  color: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

const buckets: BucketDef[] = [
  { status: 'GEPLANT', label: 'In Erstellung', color: '#60A5FA', icon: FileEdit },
  { status: 'VORBEREITUNG', label: 'Bereit zum Versand', color: '#F59E0B', icon: Send },
  { status: 'BESTAETIGT', label: 'Versendet', color: '#34D399', icon: CheckCircle2 },
]

type StatusFilter = 'ALL' | AppointmentStatus

/* ── Loading Skeleton ── */

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {buckets.map((b) => (
        <div
          key={b.status}
          className="glass-card min-h-[200px] animate-pulse"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="p-4 border-b border-border">
            <div className="h-4 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>
      ))}
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
      <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden der Richtofferten</p>
      <p className="text-[12px] text-text-sec mb-5">{message}</p>
      <button type="button" onClick={onRetry} className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]">
        <RefreshCw size={14} strokeWidth={2} />
        Erneut versuchen
      </button>
    </div>
  )
}

/* ── Karte ── */

interface UserInfo { id: string; firstName: string; lastName: string; role: string }

function RichtoffertenCard({ item, users, onSelect }: { item: Appointment; users: UserInfo[]; onSelect: (a: Appointment) => void }) {
  const assignee = users.find((u) => u.id === item.assignedTo)
  const updatedDate = item.updatedAt ? new Date(item.updatedAt) : null

  return (
    <div
      onClick={() => onSelect(item)}
      className="p-3.5 rounded-xl cursor-pointer hover:bg-surface-hover/50 transition-all duration-150 group"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text truncate">{item.contactName}</p>
          {item.company && <p className="text-[10px] text-text-dim truncate">{item.company}</p>}
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

      {item.address && (
        <p className="text-[11px] text-text-sec mb-2 truncate">{item.address}</p>
      )}

      <div className="flex items-center justify-between text-[10px] text-text-dim">
        <span>{updatedDate ? `Aktualisiert ${updatedDate.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}` : ''}</span>
        {item.value > 0 && (
          <span className="tabular-nums font-semibold text-amber">
            CHF {Math.round(item.value).toLocaleString('de-CH')}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Kanban-View ── */

function KanbanView({ items, users, onSelect }: { items: Appointment[]; users: UserInfo[]; onSelect: (a: Appointment) => void }) {
  const updateAppt = useUpdateAppointment()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('richtofferteId', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(status)
  }
  const handleDrop = (e: React.DragEvent, targetStatus: AppointmentStatus) => {
    e.preventDefault()
    setDragOverCol(null)
    const id = e.dataTransfer.getData('richtofferteId')
    const found = items.find((a) => a.id === id)
    if (found && found.status !== targetStatus) {
      updateAppt.mutate({ id, status: targetStatus })
    }
  }

  if (items.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[14px] font-semibold text-text mb-1">Keine Richtofferten gefunden</p>
        <p className="text-[12px] text-text-sec">Richtofferten entstehen aus Leads via &quot;Termin vereinbaren → Richtofferte&quot;.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {buckets.map((col) => {
        const colItems = items.filter((a) => a.status === col.status)
        const isOver = dragOverCol === col.status
        const Icon = col.icon
        return (
          <div
            key={col.status}
            className="flex flex-col rounded-xl min-h-[200px] transition-all duration-150"
            style={{
              background: isOver ? `color-mix(in srgb, ${col.color} 4%, transparent)` : 'rgba(255,255,255,0.015)',
              border: isOver ? `1px solid color-mix(in srgb, ${col.color} 30%, transparent)` : '1px solid rgba(255,255,255,0.04)',
            }}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <Icon size={14} strokeWidth={1.8} />
              <span className="text-[12px] font-bold" style={{ color: col.color }}>{col.label}</span>
              <span
                className="ml-auto text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${col.color} 12%, transparent)`, color: col.color }}
              >
                {colItems.length}
              </span>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-380px)]">
              {colItems.length === 0 ? (
                <p className="text-[10px] text-text-dim text-center py-6">{isOver ? 'Hier ablegen' : 'Keine Eintraege'}</p>
              ) : (
                colItems.map((a) => (
                  <div key={a.id} draggable onDragStart={(e) => handleDragStart(e, a.id)}>
                    <RichtoffertenCard item={a} users={users} onSelect={onSelect} />
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

/* ── Main ── */

export default function RichtoffertenPage() {
  const { user: authUser, isAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<AppointmentPriority | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Admins sehen per Default alle Richtofferten – sonst nur eigene
  const [viewAll, setViewAll] = useState(isAdmin)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null)

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      setSelectedId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const canViewAll = isAdmin || authUser?.allowedModules?.includes('canViewAllAppointments')
  const assignedTo = canViewAll
    ? (selectedSellerId ?? (viewAll ? undefined : authUser?.id))
    : authUser?.id

  const statusQueryMap: Record<StatusFilter, AppointmentStatus | undefined> = {
    ALL: undefined,
    GEPLANT: 'GEPLANT',
    BESTAETIGT: 'BESTAETIGT',
    VORBEREITUNG: 'VORBEREITUNG',
    DURCHGEFUEHRT: undefined,
    ABGESAGT: undefined,
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
    appointmentType: 'RICHTOFFERTE',
    assignedTo,
    search: searchQuery.trim() || undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    pageSize: 100,
  })

  const allItems: Appointment[] = listResponse?.data ?? []
  // Offene Richtofferten: abgeschlossene/abgesagte ausblenden
  const filteredItems = allItems.filter((a) => a.status !== 'DURCHGEFUEHRT' && a.status !== 'ABGESAGT')

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []
  const currentUser = users.find((u) => u.id === authUser?.id)

  const handleSelect = (a: Appointment) => setSelectedId(a.id)

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Alle' },
    { key: 'GEPLANT', label: 'In Erstellung' },
    { key: 'VORBEREITUNG', label: 'Bereit' },
    { key: 'BESTAETIGT', label: 'Versendet' },
  ]

  const priorityOptions: { value: AppointmentPriority | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Prioritäten' },
    ...Object.entries(priorityLabels).map(([key, label]) => ({ value: key as AppointmentPriority, label })),
  ]

  // Stats: Anzahl je Bucket
  const counts = buckets.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = filteredItems.filter((a) => a.status === b.status).length
    return acc
  }, {})

  return (
    <>
      <div className="space-y-5">
        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, #F59E0B 12%, transparent), color-mix(in srgb, #F59E0B 4%, transparent))',
                border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)',
              }}
            >
              <Receipt size={20} className="text-amber" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">
                  {canViewAll && viewAll ? 'Richtofferten – Alle' : 'Meine Richtofferten'}
                </h1>
                {currentUser && !viewAll && (
                  <span className="text-[11px] text-text-sec font-medium hidden sm:inline">
                    ({currentUser.firstName} {currentUser.lastName})
                  </span>
                )}
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', color: '#F59E0B' }}
                >
                  {isLoading ? '—' : filteredItems.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">Offerten ohne Vor-Ort-Termin erstellen und versenden</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {canViewAll && (
              <button
                type="button"
                onClick={() => setViewAll(!viewAll)}
                className={[
                  'flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors',
                  viewAll ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text hover:bg-surface-hover',
                ].join(' ')}
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Users size={14} strokeWidth={1.8} />
                <span className="hidden sm:inline">{viewAll ? 'Alle Richtofferten' : 'Meine Richtofferten'}</span>
                <span className="sm:hidden">{viewAll ? 'Alle' : 'Meine'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {buckets.map((b) => {
            const Icon = b.icon
            return (
              <div
                key={b.status}
                className="glass-card px-5 py-4 flex items-center gap-4"
                style={{ border: `1px solid color-mix(in srgb, ${b.color} 10%, transparent)` }}
              >
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${b.color} 12%, transparent)` }}>
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">{b.label}</p>
                  <p className="text-[18px] font-extrabold tabular-nums tracking-[-0.02em]" style={{ color: b.color }}>{counts[b.status] ?? 0}</p>
                </div>
              </div>
            )
          })}
        </div>

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
                  statusFilter === tab.key ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text',
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
                  value={selectedSellerId ?? 'ALL'}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedSellerId(val === 'ALL' ? null : val)
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
                placeholder="Richtofferten durchsuchen..."
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
        ) : (
          <KanbanView items={filteredItems} users={users} onSelect={handleSelect} />
        )}
      </div>

      {selectedId && (
        <AppointmentDetailModal appointmentId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
