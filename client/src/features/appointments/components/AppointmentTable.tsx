import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react'
import {
  type Appointment,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  formatCHF,
} from '@/hooks/useAppointments'

interface Props {
  appointments: Appointment[]
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

export default function AppointmentTable({ appointments, onSelect, sortBy, sortOrder, onSort }: Props) {
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
    { key: 'date', label: 'Termin', sortField: 'appointmentDate' },
    { key: 'status', label: 'Status' },
    { key: 'checklist', label: 'Checkliste' },
    { key: 'value', label: 'Wert', sortField: 'value' },
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
                    'text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5',
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
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="text-[13px] font-semibold text-text truncate max-w-[200px]">{a.contactName}</p>
                      <p className="text-[11px] text-text-sec">{a.address.split(',')[1]?.trim() ?? a.address}</p>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="px-6 py-3.5">
                    <span className="text-[12px] text-text-sec">{a.company ?? '\u2014'}</span>
                  </td>

                  {/* Date/Time */}
                  <td className="px-6 py-3.5">
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

                  {/* Status */}
                  <td className="px-6 py-3.5">
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

                  {/* Checklist Progress */}
                  <td className="px-6 py-3.5">
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

                  {/* Value */}
                  <td className="px-6 py-3.5">
                    <span className="text-[13px] font-bold tabular-nums text-amber">{formatCHF(a.value)}</span>
                  </td>

                  {/* Created */}
                  <td className="px-6 py-3.5">
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
