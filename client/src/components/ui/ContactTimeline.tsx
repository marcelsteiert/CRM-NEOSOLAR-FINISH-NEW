import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Clock, UserPlus, Calendar, FileText, CheckCircle, AlertTriangle,
  ArrowRight, MessageSquare, Phone, Mail, Edit, Upload, Tag
} from 'lucide-react'

// ── Types ──

interface TimelineEvent {
  id: string
  type: string
  title: string
  description?: string
  entityType?: string
  entityId?: string
  createdAt: string
  createdBy?: string
}

interface TimelineProps {
  contactId: string | null | undefined
}

// ── Helpers ──

const typeConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  NOTE: { icon: MessageSquare, color: '#F59E0B', label: 'Notiz' },
  CALL: { icon: Phone, color: '#22D3EE', label: 'Anruf' },
  EMAIL: { icon: Mail, color: '#60A5FA', label: 'E-Mail' },
  MEETING: { icon: Calendar, color: '#A78BFA', label: 'Meeting' },
  STATUS_CHANGE: { icon: ArrowRight, color: '#F87171', label: 'Statusänderung' },
  SYSTEM: { icon: Edit, color: '#9CA3AF', label: 'System' },
  DOCUMENT_UPLOAD: { icon: Upload, color: '#34D399', label: 'Dokument' },
  LEAD_CREATED: { icon: UserPlus, color: '#F59E0B', label: 'Lead erstellt' },
  TASK_COMPLETED: { icon: CheckCircle, color: '#34D399', label: 'Aufgabe erledigt' },
  DEAL_WON: { icon: CheckCircle, color: '#34D399', label: 'Deal gewonnen' },
  DEAL_LOST: { icon: AlertTriangle, color: '#F87171', label: 'Deal verloren' },
  TAG_ADDED: { icon: Tag, color: '#A78BFA', label: 'Tag gesetzt' },
}

const defaultConfig = { icon: Clock, color: '#9CA3AF', label: 'Aktivität' }

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tagen`
  return new Date(dateStr).toLocaleDateString('de-CH')
}

// ── Komponente ──

export default function ContactTimeline({ contactId }: TimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['activities', 'contact', contactId],
    queryFn: () => api.get<{ data: TimelineEvent[] }>(`/activities?contactId=${contactId}`),
    enabled: !!contactId,
  })

  const events = useMemo(() => {
    const items = data?.data ?? []
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [data])

  // Gruppierung nach Datum
  const grouped = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {}
    events.forEach(e => {
      const date = new Date(e.createdAt).toLocaleDateString('de-CH')
      if (!map[date]) map[date] = []
      map[date].push(e)
    })
    return Object.entries(map)
  }, [events])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock size={24} className="mx-auto text-white/10 mb-2" />
        <p className="text-xs text-white/25">Noch keine Aktivitäten</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1.5">
        <Clock size={12} strokeWidth={1.8} /> Kunden-Timeline
      </h3>

      {grouped.map(([date, dateEvents]) => (
        <div key={date}>
          <div className="text-[10px] text-white/20 uppercase tracking-wider mb-2">{date}</div>
          <div className="relative pl-6 space-y-3">
            {/* Vertikale Linie */}
            <div className="absolute left-[9px] top-1 bottom-1 w-px bg-white/[0.06]" />

            {dateEvents.map(event => {
              const config = typeConfig[event.type] ?? defaultConfig
              const Icon = config.icon

              return (
                <div key={event.id} className="relative flex gap-3">
                  {/* Punkt auf der Timeline */}
                  <div
                    className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2"
                    style={{
                      borderColor: config.color,
                      backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                    }}
                  >
                    <Icon size={9} strokeWidth={2} style={{ color: config.color }} />
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/70">{event.title || config.label}</span>
                      <span className="text-[9px] text-white/20">{relativeTime(event.createdAt)}</span>
                    </div>
                    {event.description && (
                      <p className="text-[11px] text-white/30 mt-0.5 line-clamp-2">{event.description}</p>
                    )}
                    {FileText && event.entityType && (
                      <span
                        className="inline-block text-[9px] px-1.5 py-0.5 rounded mt-1"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${config.color} 8%, transparent)`,
                          color: config.color,
                        }}
                      >
                        {event.entityType}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
