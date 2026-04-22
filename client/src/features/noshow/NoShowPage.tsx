import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  PhoneOff,
  Search,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Users,
  RotateCcw,
  MapPin,
  Globe,
  Receipt,
} from 'lucide-react'
import {
  useAppointments,
  useUpdateAppointment,
  type Appointment,
  type AppointmentPriority,
  priorityLabels,
  appointmentTypeLabels,
  appointmentTypeColors,
} from '@/hooks/useAppointments'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import { useNoShowKanbanColumns, type NoShowKanbanColumn } from '@/hooks/useAdmin'
import AppointmentDetailModal from '@/features/appointments/components/AppointmentDetailModal'

const defaultColumns: NoShowKanbanColumn[] = [
  { key: 'NEW', label: 'Neu No-Show', color: '#F87171', order: 0 },
  { key: 'CALL_1', label: '1. Rückruf versucht', color: '#FB923C', order: 1 },
  { key: 'CALL_2', label: '2. Rückruf versucht', color: '#F59E0B', order: 2 },
  { key: 'REACHED', label: 'Erreicht – neuer Termin', color: '#34D399', order: 3 },
]

/* ── Loading / Error States ── */

function LoadingSkeleton({ cols }: { cols: NoShowKanbanColumn[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cols.map((c) => (
        <div key={c.key} className="glass-card min-h-[200px] animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="p-4 border-b border-border">
            <div className="h-4 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-card p-12 text-center">
      <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
        <AlertTriangle size={20} className="text-red-400" strokeWidth={1.8} />
      </div>
      <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden der No-Show-Liste</p>
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

function TypeBadge({ type }: { type: Appointment['appointmentType'] }) {
  const color = appointmentTypeColors[type]
  const Icon = type === 'ONLINE' ? Globe : type === 'RICHTOFFERTE' ? Receipt : MapPin
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <Icon size={9} strokeWidth={2} />
      {appointmentTypeLabels[type]}
    </span>
  )
}

function NoShowCard({ item, users, onSelect }: { item: Appointment; users: UserInfo[]; onSelect: (a: Appointment) => void }) {
  const updateAppt = useUpdateAppointment()
  const assignee = users.find((u) => u.id === item.assignedTo)

  const handleRevert = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateAppt.mutate({ id: item.id, status: 'GEPLANT' })
  }

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
        <TypeBadge type={item.appointmentType} />
      </div>

      {item.contactPhone && (
        <a
          href={`tel:${item.contactPhone}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-block text-[11px] text-text-sec hover:text-amber transition-colors mb-2 tabular-nums"
        >
          📞 {item.contactPhone}
        </a>
      )}

      {item.appointmentDate && (
        <p className="text-[10px] text-text-dim mb-2 tabular-nums">
          Termin war: {new Date(item.appointmentDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          {item.appointmentTime && ` ${item.appointmentTime}`}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        <button
          type="button"
          onClick={handleRevert}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-emerald-400 hover:bg-emerald-400/10 transition-colors"
          style={{ border: '1px solid rgba(52,211,153,0.2)' }}
          title="Zurück zu Geplant setzen"
        >
          <RotateCcw size={10} strokeWidth={2} />
          Neu planen
        </button>
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

/* ── Kanban mit Drag & Drop zwischen Phasen ── */

function KanbanView({ items, users, onSelect, columns }: { items: Appointment[]; users: UserInfo[]; onSelect: (a: Appointment) => void; columns: NoShowKanbanColumn[] }) {
  const updateAppt = useUpdateAppointment()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('appointmentId', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(key)
  }

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const id = e.dataTransfer.getData('appointmentId')
    const found = items.find((a) => a.id === id)
    if (found && found.noShowPhase !== targetKey) {
      updateAppt.mutate({ id, noShowPhase: targetKey })
    }
  }

  const sorted = [...columns].sort((a, b) => a.order - b.order)

  if (items.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[14px] font-semibold text-text mb-1">Keine No-Show-Eintraege</p>
        <p className="text-[12px] text-text-sec">Termine, die als No Show markiert wurden, erscheinen hier.</p>
      </div>
    )
  }

  // Columns dynamisch: Grid auf bis zu 4-Spalten pro Zeile
  const gridCols = sorted.length >= 4 ? 'lg:grid-cols-4' : sorted.length === 3 ? 'lg:grid-cols-3' : sorted.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-4`}>
      {sorted.map((col) => {
        // Karten ohne Phase oder ohne Match landen in erster Spalte (NEW) als Fallback
        const colItems = items.filter((a) => (a.noShowPhase ?? sorted[0]?.key ?? 'NEW') === col.key)
        const isOver = dragOverCol === col.key
        return (
          <div
            key={col.key}
            className="flex flex-col rounded-xl min-h-[200px] transition-all duration-150"
            style={{
              background: isOver ? `color-mix(in srgb, ${col.color} 4%, transparent)` : 'rgba(255,255,255,0.015)',
              border: isOver ? `1px solid color-mix(in srgb, ${col.color} 30%, transparent)` : '1px solid rgba(255,255,255,0.04)',
            }}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
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
                    <NoShowCard item={a} users={users} onSelect={onSelect} />
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

export default function NoShowPage() {
  const { user: authUser, isAdmin } = useAuth()
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'VOR_ORT' | 'ONLINE' | 'RICHTOFFERTE'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<AppointmentPriority | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewAll, setViewAll] = useState(isAdmin)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null)

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      setSelectedId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data: colsRes } = useNoShowKanbanColumns()
  const columns = colsRes?.data ?? defaultColumns

  const canViewAll = isAdmin || authUser?.allowedModules?.includes('canViewAllAppointments')
  const assignedTo = canViewAll
    ? (selectedSellerId ?? (viewAll ? undefined : authUser?.id))
    : authUser?.id

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useAppointments({
    status: 'NO_SHOW',
    appointmentType: typeFilter !== 'ALL' ? typeFilter : undefined,
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    assignedTo,
    search: searchQuery.trim() || undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    pageSize: 100,
  })

  const items: Appointment[] = listResponse?.data ?? []

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []
  const currentUser = users.find((u) => u.id === authUser?.id)

  const handleSelect = (a: Appointment) => setSelectedId(a.id)

  const typeTabs: { key: 'ALL' | 'VOR_ORT' | 'ONLINE' | 'RICHTOFFERTE'; label: string }[] = [
    { key: 'ALL', label: 'Alle' },
    { key: 'VOR_ORT', label: 'Vor Ort' },
    { key: 'ONLINE', label: 'Online' },
    { key: 'RICHTOFFERTE', label: 'Richtofferten' },
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
                background: 'linear-gradient(135deg, color-mix(in srgb, #F87171 12%, transparent), color-mix(in srgb, #F87171 4%, transparent))',
                border: '1px solid color-mix(in srgb, #F87171 10%, transparent)',
              }}
            >
              <PhoneOff size={20} className="text-red" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">
                  {canViewAll && viewAll ? 'No Show – Alle' : 'Meine No-Show-Termine'}
                </h1>
                {currentUser && !viewAll && (
                  <span className="text-[11px] text-text-sec font-medium hidden sm:inline">
                    ({currentUser.firstName} {currentUser.lastName})
                  </span>
                )}
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}
                >
                  {isLoading ? '—' : items.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">Callcenter-Rückruf-Workflow – Drag&Drop zwischen Phasen</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {canViewAll && (
              <button
                type="button"
                onClick={() => setViewAll(!viewAll)}
                className={[
                  'flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors',
                  viewAll ? 'bg-red/10 text-red' : 'text-text-dim hover:text-text hover:bg-surface-hover',
                ].join(' ')}
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Users size={14} strokeWidth={1.8} />
                <span className="hidden sm:inline">{viewAll ? 'Alle No-Shows' : 'Meine No-Shows'}</span>
                <span className="sm:hidden">{viewAll ? 'Alle' : 'Meine'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
          <div
            className="flex items-center rounded-full p-0.5 overflow-x-auto max-w-full"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {typeTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTypeFilter(tab.key)}
                className={[
                  'px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 whitespace-nowrap',
                  typeFilter === tab.key ? 'bg-red/10 text-red' : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full lg:w-auto">
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
                placeholder="Durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 text-[12px] w-full sm:w-[220px]"
              />
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <LoadingSkeleton cols={columns} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.'}
            onRetry={() => refetch()}
          />
        ) : (
          <KanbanView items={items} users={users} onSelect={handleSelect} columns={columns} />
        )}
      </div>

      {selectedId && (
        <AppointmentDetailModal appointmentId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
