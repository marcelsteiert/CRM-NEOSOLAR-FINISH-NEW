import { useState, useMemo } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  List,
  LayoutGrid,
  Clock,
  MapPin,
  User,
} from 'lucide-react'
import {
  useCalendarEvents,
  eventTypeLabels,
  eventTypeColors,
  eventStatusLabels,
  eventStatusColors,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarEventStatus,
} from '@/hooks/useCalendar'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useLeads'
import CalendarEventModal from './components/CalendarEventModal'

type ViewMode = 'month' | 'week' | 'day' | 'list'

const EVENT_TYPES: CalendarEventType[] = ['MONTAGE', 'ELEKTRO', 'WARTUNG', 'BEGEHUNG', 'ABNAHME', 'INTERN', 'SONSTIGES']

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export default function CalendarPage() {
  const { isAdmin } = useAuth()
  const { data: usersResp } = useUsers()
  const users = usersResp?.data?.filter((u) => u.isActive) ?? []

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [defaultDate, setDefaultDate] = useState<string>('')
  const [filterType, setFilterType] = useState<CalendarEventType | 'ALL'>('ALL')
  const [filterUser, setFilterUser] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Berechne Datumsbereich fuer Query
  const dateRange = useMemo(() => {
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth()

    if (viewMode === 'month') {
      const first = new Date(y, m, 1)
      const last = new Date(y, m + 1, 0)
      // Erweitere auf volle Wochen
      const start = getMonday(first)
      const end = addDays(last, 7 - (last.getDay() || 7))
      return { startDate: formatDate(start), endDate: formatDate(addDays(end, 1)) }
    }
    if (viewMode === 'week') {
      const monday = getMonday(currentDate)
      return { startDate: formatDate(monday), endDate: formatDate(addDays(monday, 7)) }
    }
    // day
    return { startDate: formatDate(currentDate), endDate: formatDate(addDays(currentDate, 1)) }
  }, [currentDate, viewMode])

  const { data: eventsResp, isLoading } = useCalendarEvents({
    ...dateRange,
    eventType: filterType !== 'ALL' ? filterType : undefined,
    assignedTo: filterUser || undefined,
  })
  const events = eventsResp?.data ?? []

  // Navigation
  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir)
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  const openCreate = (date?: string) => {
    setEditEvent(null)
    setDefaultDate(date || formatDate(new Date()))
    setShowModal(true)
  }

  const openEdit = (ev: CalendarEvent) => {
    setEditEvent(ev)
    setShowModal(true)
  }

  // Title
  const title = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions =
      viewMode === 'month' ? { month: 'long', year: 'numeric' } :
      viewMode === 'week' ? { day: 'numeric', month: 'short', year: 'numeric' } :
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    if (viewMode === 'week') {
      const monday = getMonday(currentDate)
      const sunday = addDays(monday, 6)
      return `${monday.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('de-CH', opts)}`
    }
    return currentDate.toLocaleDateString('de-CH', opts)
  }, [currentDate, viewMode])

  // Helfer: Events fuer einen Tag
  const eventsForDay = (date: Date) =>
    events.filter((ev) => {
      const start = new Date(ev.startDate)
      const end = new Date(ev.endDate)
      return date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
             date <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
    })

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-bold text-text flex items-center gap-2">
            <CalendarDays size={22} strokeWidth={1.8} className="text-amber" />
            Kalender
          </h1>
          <p className="text-[12px] text-text-dim mt-0.5 hidden sm:block">
            Montage, Elektro, Wartung – alle Termine im Überblick
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[11px]">
            <Filter size={13} strokeWidth={2} /> Filter
          </button>
          <button type="button" onClick={() => openCreate()} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-[11px]">
            <Plus size={13} strokeWidth={2} /> Neuer Termin
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="glass-card p-4 flex flex-wrap items-center gap-3" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">Typ:</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                style={{
                  background: filterType === 'ALL' ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'rgba(255,255,255,0.03)',
                  color: filterType === 'ALL' ? '#F59E0B' : '#94A3B8',
                }}
              >
                Alle
              </button>
              {EVENT_TYPES.map((t) => {
                const active = filterType === t
                const color = eventTypeColors[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(active ? 'ALL' : t)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                    style={{
                      background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : 'rgba(255,255,255,0.03)',
                      color: active ? color : '#94A3B8',
                    }}
                  >
                    {eventTypeLabels[t]}
                  </button>
                )
              })}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">Mitarbeiter:</span>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="px-2 py-1 text-[11px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
              >
                <option value="">Alle</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Navigation + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-text transition-colors">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button type="button" onClick={goToday} className="px-3 py-1 rounded-lg text-[11px] font-medium text-text-dim hover:text-text hover:bg-surface-hover transition-colors">
            Heute
          </button>
          <button type="button" onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-text transition-colors">
            <ChevronRight size={18} strokeWidth={2} />
          </button>
          <span className="text-[14px] font-semibold text-text ml-2 capitalize">{title}</span>
        </div>
        <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-0.5">
          {([['month', LayoutGrid], ['week', CalendarDays], ['day', Clock], ['list', List]] as [ViewMode, typeof LayoutGrid][]).map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className="p-1.5 rounded-md transition-all"
              style={{
                background: viewMode === v ? 'color-mix(in srgb, #F59E0B 15%, transparent)' : 'transparent',
                color: viewMode === v ? '#F59E0B' : '#94A3B8',
              }}
              title={v === 'month' ? 'Monat' : v === 'week' ? 'Woche' : v === 'day' ? 'Tag' : 'Liste'}
            >
              <Icon size={15} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Views */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : viewMode === 'month' ? (
        <MonthView
          currentDate={currentDate}
          events={events}
          onDayClick={(d) => openCreate(d)}
          onEventClick={openEdit}
          eventsForDay={eventsForDay}
        />
      ) : viewMode === 'week' ? (
        <WeekView
          currentDate={currentDate}
          events={events}
          onDayClick={(d) => openCreate(d)}
          onEventClick={openEdit}
          eventsForDay={eventsForDay}
        />
      ) : viewMode === 'day' ? (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={openEdit}
          eventsForDay={eventsForDay}
        />
      ) : (
        <ListView events={events} onEventClick={openEdit} />
      )}

      {/* Modal */}
      {showModal && (
        <CalendarEventModal
          event={editEvent}
          defaultDate={defaultDate}
          onClose={() => { setShowModal(false); setEditEvent(null) }}
        />
      )}
    </div>
  )
}

// ── Month View ──

function MonthView({ currentDate, events: _events, onDayClick, onEventClick, eventsForDay }: {
  currentDate: Date
  events: CalendarEvent[]
  onDayClick: (date: string) => void
  onEventClick: (ev: CalendarEvent) => void
  eventsForDay: (d: Date) => CalendarEvent[]
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startMonday = getMonday(firstDay)
  const today = new Date()

  // Generiere alle Tage im Grid (6 Wochen)
  const days: Date[] = []
  let d = new Date(startMonday)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }

  return (
    <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
      {/* Wochentag-Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center py-2 text-[10px] font-bold uppercase tracking-wider text-text-dim">
            {wd}
          </div>
        ))}
      </div>

      {/* Tage-Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const dayEvents = eventsForDay(day)
          const dateStr = formatDate(day)

          return (
            <div
              key={i}
              className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border/50 p-1 cursor-pointer hover:bg-surface-hover/50 transition-colors"
              onClick={() => onDayClick(dateStr)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-amber text-black font-bold' : isCurrentMonth ? 'text-text' : 'text-text-dim/40'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                    className="px-1.5 py-0.5 rounded text-[9px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: `color-mix(in srgb, ${eventTypeColors[ev.eventType]} 20%, transparent)`,
                      color: eventTypeColors[ev.eventType],
                    }}
                    title={`${ev.title} (${eventTypeLabels[ev.eventType]})`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-text-dim pl-1">+{dayEvents.length - 3} mehr</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week View ──

function WeekView({ currentDate, events: _events, onDayClick, onEventClick, eventsForDay }: {
  currentDate: Date
  events: CalendarEvent[]
  onDayClick: (date: string) => void
  onEventClick: (ev: CalendarEvent) => void
  eventsForDay: (d: Date) => CalendarEvent[]
}) {
  const monday = getMonday(currentDate)
  const today = new Date()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  return (
    <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="grid grid-cols-7">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayEvents = eventsForDay(day)
          const dateStr = formatDate(day)

          return (
            <div key={i} className="border-r border-border/50 last:border-r-0">
              {/* Day header */}
              <div
                className="text-center py-3 border-b border-border cursor-pointer hover:bg-surface-hover/50 transition-colors"
                onClick={() => onDayClick(dateStr)}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{WEEKDAYS[i]}</div>
                <div className={`text-[16px] font-bold mt-0.5 ${isToday ? 'text-amber' : 'text-text'}`}>
                  {day.getDate()}
                </div>
              </div>
              {/* Events */}
              <div className="min-h-[300px] p-1 space-y-1">
                {dayEvents.map((ev) => {
                  const startTime = new Date(ev.startDate).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        background: `color-mix(in srgb, ${eventTypeColors[ev.eventType]} 12%, transparent)`,
                        borderLeft: `3px solid ${eventTypeColors[ev.eventType]}`,
                      }}
                    >
                      <div className="text-[10px] font-bold truncate" style={{ color: eventTypeColors[ev.eventType] }}>
                        {ev.title}
                      </div>
                      {!ev.allDay && (
                        <div className="text-[9px] text-text-dim mt-0.5">{startTime}</div>
                      )}
                      {ev.location && (
                        <div className="text-[9px] text-text-dim truncate mt-0.5 flex items-center gap-0.5">
                          <MapPin size={8} /> {ev.location}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Day View ──

function DayView({ currentDate, events: _events, onEventClick, eventsForDay }: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (ev: CalendarEvent) => void
  eventsForDay: (d: Date) => CalendarEvent[]
}) {
  const dayEvents = eventsForDay(currentDate)
  const hours = Array.from({ length: 14 }, (_, i) => i + 6) // 06:00 - 19:00

  return (
    <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
      {/* Zeitleiste */}
      <div className="divide-y divide-border/50">
        {hours.map((h) => {
          const hourEvents = dayEvents.filter((ev) => {
            if (ev.allDay) return h === 6
            const start = new Date(ev.startDate).getHours()
            return start === h
          })
          return (
            <div key={h} className="flex min-h-[60px]">
              <div className="w-16 shrink-0 py-2 px-3 text-[11px] font-medium text-text-dim text-right border-r border-border/50">
                {h.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-1 space-y-1">
                {hourEvents.map((ev) => {
                  const statusColor = eventStatusColors[ev.status]
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        background: `color-mix(in srgb, ${eventTypeColors[ev.eventType]} 10%, transparent)`,
                        borderLeft: `3px solid ${eventTypeColors[ev.eventType]}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-text truncate">{ev.title}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0"
                            style={{ background: `color-mix(in srgb, ${eventTypeColors[ev.eventType]} 18%, transparent)`, color: eventTypeColors[ev.eventType] }}
                          >
                            {eventTypeLabels[ev.eventType]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-text-dim">
                          {!ev.allDay && (
                            <span className="flex items-center gap-0.5">
                              <Clock size={9} />
                              {new Date(ev.startDate).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} – {new Date(ev.endDate).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {ev.location && <span className="flex items-center gap-0.5"><MapPin size={9} /> {ev.location}</span>}
                          {ev.assignee && <span className="flex items-center gap-0.5"><User size={9} /> {ev.assignee.firstName} {ev.assignee.lastName}</span>}
                        </div>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0"
                        style={{ background: `color-mix(in srgb, ${statusColor} 15%, transparent)`, color: statusColor }}
                      >
                        {eventStatusLabels[ev.status]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── List View ──

function ListView({ events, onEventClick }: {
  events: CalendarEvent[]
  onEventClick: (ev: CalendarEvent) => void
}) {
  // Sortiert nach Datum gruppiert
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((ev) => {
      const key = new Date(ev.startDate).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return Array.from(map.entries())
  }, [events])

  if (events.length === 0) {
    return (
      <div className="glass-card p-10 text-center" style={{ borderRadius: 'var(--radius-lg)' }}>
        <CalendarDays size={32} className="text-text-dim mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[13px] text-text-dim">Keine Termine in diesem Zeitraum</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateLabel, dayEvents]) => (
        <div key={dateLabel}>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-dim mb-2 capitalize">{dateLabel}</h3>
          <div className="space-y-1.5">
            {dayEvents.map((ev) => {
              const color = eventTypeColors[ev.eventType]
              const statusColor = eventStatusColors[ev.status]
              return (
                <div
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="glass-card flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                  style={{ borderRadius: 'var(--radius-lg)', borderLeft: `3px solid ${color}` }}
                >
                  {/* Zeit */}
                  <div className="w-14 shrink-0 text-center">
                    {ev.allDay ? (
                      <span className="text-[10px] font-bold text-text-dim">Ganztag</span>
                    ) : (
                      <>
                        <div className="text-[12px] font-bold text-text">
                          {new Date(ev.startDate).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-text-dim">
                          {new Date(ev.endDate).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-text truncate">{ev.title}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0"
                        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
                      >
                        {eventTypeLabels[ev.eventType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-dim">
                      {ev.location && <span className="flex items-center gap-0.5"><MapPin size={9} /> {ev.location}</span>}
                      {ev.assignee && <span className="flex items-center gap-0.5"><User size={9} /> {ev.assignee.firstName} {ev.assignee.lastName}</span>}
                      {ev.contact && <span className="truncate">{ev.contact.firstName} {ev.contact.lastName}</span>}
                    </div>
                  </div>

                  {/* Status */}
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0"
                    style={{ background: `color-mix(in srgb, ${statusColor} 15%, transparent)`, color: statusColor }}
                  >
                    {eventStatusLabels[ev.status]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
