import { useState, useEffect } from 'react'
import { X, Save, Trash2, MapPin, Calendar, Clock, User, FolderKanban } from 'lucide-react'
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  eventTypeLabels,
  eventTypeColors,
  eventStatusLabels,
  eventStatusColors,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarEventStatus,
} from '@/hooks/useCalendar'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'

const EVENT_TYPES: CalendarEventType[] = ['MONTAGE', 'ELEKTRO', 'WARTUNG', 'BEGEHUNG', 'ABNAHME', 'INTERN', 'SONSTIGES']
const EVENT_STATUSES: CalendarEventStatus[] = ['GEPLANT', 'BESTAETIGT', 'IN_ARBEIT', 'ABGESCHLOSSEN', 'ABGESAGT']

interface Props {
  event?: CalendarEvent | null
  defaultDate?: string
  onClose: () => void
}

export default function CalendarEventModal({ event, defaultDate, onClose }: Props) {
  const { user } = useAuth()
  const { data: usersResp } = useUsers()
  const users = usersResp?.data ?? []
  const createEvent = useCreateCalendarEvent()
  const updateEvent = useUpdateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState<CalendarEventType>('MONTAGE')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('17:00')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [status, setStatus] = useState<CalendarEventStatus>('GEPLANT')
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEditing = !!event

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description ?? '')
      setEventType(event.eventType)
      const sd = new Date(event.startDate)
      const ed = new Date(event.endDate)
      setStartDate(sd.toISOString().slice(0, 10))
      setStartTime(sd.toISOString().slice(11, 16))
      setEndDate(ed.toISOString().slice(0, 10))
      setEndTime(ed.toISOString().slice(11, 16))
      setAllDay(event.allDay)
      setLocation(event.location ?? '')
      setAssignedTo(event.assignedTo ?? '')
      setStatus(event.status)
      setNotes(event.notes ?? '')
    } else if (defaultDate) {
      setStartDate(defaultDate)
      setEndDate(defaultDate)
      setAssignedTo(user?.id ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, defaultDate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!title.trim() || !startDate || !endDate) return

    const startDateTime = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`
    const endDateTime = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      eventType,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay,
      location: location.trim() || null,
      color: eventTypeColors[eventType],
      assignedTo: assignedTo || null,
      status,
      notes: notes.trim() || null,
    }

    if (isEditing) {
      updateEvent.mutate({ id: event.id, ...payload }, { onSuccess: () => onClose() })
    } else {
      createEvent.mutate(payload, { onSuccess: () => onClose() })
    }
  }

  const handleDelete = () => {
    if (!event) return
    deleteEvent.mutate(event.id, { onSuccess: () => onClose() })
  }

  const isPending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass-card p-6"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-bold text-text">
            {isEditing ? 'Termin bearbeiten' : 'Neuer Termin'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-text transition-colors">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Titel */}
          <div>
            <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
              placeholder="z.B. Montage Familie Müller"
            />
          </div>

          {/* Event-Typ */}
          <div>
            <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Typ</label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => {
                const active = eventType === t
                const color = eventTypeColors[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEventType(t)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                    style={{
                      background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : 'rgba(255,255,255,0.03)',
                      color: active ? color : '#94A3B8',
                      border: `1px solid ${active ? `color-mix(in srgb, ${color} 30%, transparent)` : 'transparent'}`,
                    }}
                  >
                    {eventTypeLabels[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Ganztaegig */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${allDay ? 'bg-amber border-amber' : 'border-border'}`}
              onClick={() => setAllDay(!allDay)}
            >
              {allDay && <span className="text-[10px] text-black font-bold">✓</span>}
            </div>
            <span className="text-[11px] text-text-sec">Ganztägig</span>
          </label>

          {/* Datum + Zeit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
                <Calendar size={10} /> Start *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); if (!endDate || e.target.value > endDate) setEndDate(e.target.value) }}
                className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 mt-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
                />
              )}
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
                <Clock size={10} /> Ende *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 mt-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
                />
              )}
            </div>
          </div>

          {/* Ort */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
              <MapPin size={10} /> Ort
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
              placeholder="Adresse oder Ort"
            />
          </div>

          {/* Zugewiesen an */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
              <User size={10} /> Zugewiesen an
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
            >
              <option value="">– Niemand –</option>
              {users.filter((u) => u.isActive).map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
              <FolderKanban size={10} /> Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_STATUSES.map((s) => {
                const active = status === s
                const color = eventStatusColors[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                    style={{
                      background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : 'rgba(255,255,255,0.03)',
                      color: active ? color : '#94A3B8',
                      border: `1px solid ${active ? `color-mix(in srgb, ${color} 30%, transparent)` : 'transparent'}`,
                    }}
                  >
                    {eventStatusLabels[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50 resize-none"
              placeholder="Optionale Beschreibung..."
            />
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Notizen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50 resize-none"
              placeholder="Interne Notizen..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          {isEditing ? (
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleDelete} disabled={isPending} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-red hover:bg-red-soft transition-colors">
                    Endgültig löschen
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-[11px] text-text-dim hover:text-text transition-colors">
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-text-dim hover:text-red hover:bg-surface-hover transition-colors">
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-[12px]">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !title.trim() || !startDate || !endDate}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[12px] disabled:opacity-40"
            >
              <Save size={13} strokeWidth={2} />
              {isPending ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
