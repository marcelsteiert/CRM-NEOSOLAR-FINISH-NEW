import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Car, MapPin, Globe } from 'lucide-react'
import {
  type Appointment,
  statusLabels,
  statusColors,
  appointmentTypeLabels,
  appointmentTypeColors,
  useUpdateAppointment,
} from '@/hooks/useAppointments'

interface UserInfo {
  id: string
  firstName: string
  lastName: string
  role: string
}

interface Props {
  appointments: Appointment[]
  users?: UserInfo[]
  onSelect: (a: Appointment) => void
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
}

function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== field)
    return <ArrowUpDown size={12} className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
  return sortOrder === 'asc' ? <ArrowUp size={12} className="text-emerald-400" /> : <ArrowDown size={12} className="text-emerald-400" />
}

export default function AppointmentTable({ appointments, users = [], onSelect, sortBy, sortOrder, onSort }: Props) {
  const updateAppt = useUpdateAppointment()
  if (appointments.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[14px] font-semibold text-text mb-1">Keine Termine gefunden</p>
        <p className="text-[12px] text-text-sec">Erstelle einen neuen Termin oder passe die Filter an.</p>
      </div>
    )
  }

  const columns: { key: string; label: string; sortField?: string }[] = [
    { key: 'contact', label: 'Kontakt', sortField: 'contactName' },
    { key: 'company', label: 'Unternehmen', sortField: 'company' },
    { key: 'type', label: 'Typ' },
    { key: 'date', label: 'Termin', sortField: 'appointmentDate' },
    { key: 'fahrzeit', label: 'Fahrzeit' },
    { key: 'status', label: 'Status' },
    { key: 'assignedTo', label: 'Zugewiesen an', sortField: 'assignedTo' },
    { key: 'checklist', label: 'Checkliste' },
    { key: 'created', label: 'Erstellt', sortField: 'createdAt' },
  ]

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    'text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 sm:px-6 py-3.5',
                    col.sortField ? 'cursor-pointer select-none group hover:text-text transition-colors' : '',
                  ].join(' ')}
                  onClick={col.sortField ? () => onSort(col.sortField!) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortField && <SortIcon field={col.sortField} sortBy={sortBy} sortOrder={sortOrder} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => {
              const checkedCount = a.checklist.filter((c) => c.checked).length
              const totalCount = a.checklist.length
              const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
              const progressColor = progress === 100 ? '#34D399' : progress >= 50 ? '#F59E0B' : '#F87171'

              return (
                <tr
                  key={a.id}
                  onClick={() => onSelect(a)}
                  className="border-b border-border cursor-pointer hover:bg-surface-hover transition-colors duration-100"
                >
                  {/* Contact */}
                  <td className="px-3 sm:px-6 py-3.5">
                    <div>
                      <p className="text-[13px] font-semibold text-text truncate max-w-[200px]">{a.contactName}</p>
                      <p className="text-[11px] text-text-sec">{a.address.split(',')[1]?.trim() ?? a.address}</p>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="px-3 sm:px-6 py-3.5">
                    <span className="text-[12px] text-text-sec">{a.company ?? '\u2014'}</span>
                  </td>

                  {/* Appointment Type – click to toggle */}
                  <td className="px-3 sm:px-6 py-3.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = a.appointmentType === 'VOR_ORT' ? 'ONLINE' : 'VOR_ORT'
                        updateAppt.mutate({ id: a.id, appointmentType: next })
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        background: `color-mix(in srgb, ${appointmentTypeColors[a.appointmentType]} 12%, transparent)`,
                        color: appointmentTypeColors[a.appointmentType],
                      }}
                      title="Klicken zum Wechseln"
                    >
                      {a.appointmentType === 'ONLINE' ? <Globe size={12} strokeWidth={2} /> : <MapPin size={12} strokeWidth={2} />}
                      {appointmentTypeLabels[a.appointmentType]}
                    </button>
                  </td>

                  {/* Date/Time */}
                  <td className="px-3 sm:px-6 py-3.5">
                    <div>
                      <p className="text-[12px] font-semibold text-text tabular-nums">
                        {a.appointmentDate
                          ? new Date(a.appointmentDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '\u2014'}
                      </p>
                      {a.appointmentTime && (
                        <p className="text-[11px] text-text-sec tabular-nums">{a.appointmentTime} Uhr</p>
                      )}
                    </div>
                  </td>

                  {/* Fahrzeit */}
                  <td className="px-3 sm:px-6 py-3.5">
                    {a.travelMinutes != null ? (
                      <div className="flex items-center gap-1.5">
                        <Car size={12} className="text-text-dim" strokeWidth={1.8} />
                        <span className="text-[12px] font-semibold tabular-nums text-text-sec">
                          {a.travelMinutes >= 60
                            ? `${Math.floor(a.travelMinutes / 60)}h ${a.travelMinutes % 60 > 0 ? `${a.travelMinutes % 60}m` : ''}`
                            : `${a.travelMinutes}m`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-dim">{'\u2014'}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 sm:px-6 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${statusColors[a.status]} 12%, transparent)`,
                        color: statusColors[a.status],
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[a.status] }} />
                      {statusLabels[a.status]}
                    </span>
                  </td>

                  {/* Zugewiesen an */}
                  <td className="px-3 sm:px-6 py-3.5">
                    {(() => {
                      const assignee = users.find((u) => u.id === a.assignedTo)
                      if (!assignee) return <span className="text-[11px] text-text-dim">{'\u2014'}</span>
                      const initials = `${assignee.firstName?.[0] ?? ''}${assignee.lastName?.[0] ?? ''}`
                      return (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-bg shrink-0"
                            style={{ background: '#F59E0B' }}
                          >
                            {initials}
                          </div>
                          <span className="text-[12px] text-text-sec truncate max-w-[120px]">
                            {assignee.firstName} {assignee.lastName}
                          </span>
                        </div>
                      )
                    })()}
                  </td>

                  {/* Checklist Progress */}
                  <td className="px-3 sm:px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, background: progressColor }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: progressColor }}>
                        {checkedCount}/{totalCount}
                      </span>
                      {progress === 100 && <CheckCircle2 size={12} className="text-emerald-400" />}
                    </div>
                  </td>

                  {/* Created */}
                  <td className="px-3 sm:px-6 py-3.5">
                    <span className="text-[12px] text-text-sec tabular-nums">
                      {new Date(a.createdAt).toLocaleDateString('de-CH')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
