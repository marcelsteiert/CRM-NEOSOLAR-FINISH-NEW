import { useState } from 'react'
import { Calendar, Clock, Wrench, Zap, CheckCircle2, X, Plus, Loader2, ChevronRight } from 'lucide-react'
import { useUpdateMilestone, type PortalMilestone } from '@/hooks/usePortal'

interface Props {
  projectId: string
  milestones: PortalMilestone[]
}

// Welche Milestones sind "Termine" – diese erscheinen prominent oben
const TERMIN_KEYS: { key: string; icon: typeof Wrench; color: string; defaultLabel: string }[] = [
  { key: 'DC_MONTAGE_TERMIN', icon: Wrench, color: '#FB923C', defaultLabel: 'DC-Montage (Solarmodule)' },
  { key: 'AC_TERMIN', icon: Zap, color: '#F59E0B', defaultLabel: 'AC-Termin (Wechselrichter)' },
  { key: 'KOMPLETT_ERLEDIGT', icon: CheckCircle2, color: '#34D399', defaultLabel: 'Inbetriebnahme / Uebergabe' },
]

function formatDisplay(date: string | null, time: string | null): string {
  if (!date) return ''
  const d = new Date(date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  return time ? `${d} um ${time} Uhr` : d
}

function daysUntil(date: string | null): { text: string; color: string } | null {
  if (!date) return null
  const target = new Date(date).setHours(0, 0, 0, 0)
  const today = new Date().setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: `vor ${Math.abs(diff)} Tag${Math.abs(diff) === 1 ? '' : 'en'}`, color: '#525E6F' }
  if (diff === 0) return { text: 'Heute', color: '#F59E0B' }
  if (diff === 1) return { text: 'Morgen', color: '#F59E0B' }
  if (diff <= 7) return { text: `in ${diff} Tagen`, color: '#FB923C' }
  return { text: `in ${diff} Tagen`, color: '#8B95A5' }
}

export default function PortalTermine({ projectId, milestones }: Props) {
  const updateMilestone = useUpdateMilestone(projectId)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [dateDraft, setDateDraft] = useState('')
  const [timeDraft, setTimeDraft] = useState('')

  // Termine im richtigen Sort_order zeigen, basierend auf den definierten Keys
  const items = TERMIN_KEYS.map((t) => {
    const m = milestones.find((m) => m.milestoneKey === t.key)
    return { template: t, milestone: m }
  }).filter((i) => i.milestone)

  const handleSave = async (m: PortalMilestone) => {
    try {
      await updateMilestone.mutateAsync({
        id: m.id,
        scheduledDate: dateDraft || null,
        scheduledTime: timeDraft || null,
      })
      setEditingKey(null)
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleClear = async (m: PortalMilestone) => {
    try {
      await updateMilestone.mutateAsync({
        id: m.id,
        scheduledDate: null,
        scheduledTime: null,
      })
      setEditingKey(null)
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  return (
    <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Calendar size={16} strokeWidth={1.8} className="text-amber" />
        <span className="text-sm font-semibold text-text">Wichtige Termine fuer den Kunden</span>
        <span className="text-[11px] text-text-sec ml-auto">Wird im Portal prominent angezeigt</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {items.map(({ template, milestone }) => {
          if (!milestone) return null
          const Icon = template.icon
          const isEditing = editingKey === milestone.id
          const hasDate = !!milestone.scheduledDate
          const countdown = daysUntil(milestone.scheduledDate)

          return (
            <div key={template.key} className="px-5 py-4 flex flex-col gap-2">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `color-mix(in srgb, ${template.color} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${template.color} 25%, transparent)`,
                  }}
                >
                  <Icon size={14} strokeWidth={1.8} style={{ color: template.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-text-sec font-semibold truncate">
                    {milestone.label}
                  </div>
                </div>
              </div>

              {/* Body */}
              {isEditing ? (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={dateDraft}
                      onChange={(e) => setDateDraft(e.target.value)}
                      className="glass-input flex-1 text-xs py-1.5"
                      autoFocus
                    />
                    <input
                      type="time"
                      value={timeDraft}
                      onChange={(e) => setTimeDraft(e.target.value)}
                      className="glass-input text-xs py-1.5"
                      style={{ width: 90 }}
                      placeholder="Zeit"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSave(milestone)}
                      disabled={updateMilestone.isPending}
                      className="btn-primary text-[11px] py-1 px-2 flex-1"
                    >
                      {updateMilestone.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Speichern'}
                    </button>
                    {hasDate && (
                      <button
                        type="button"
                        onClick={() => handleClear(milestone)}
                        className="btn-secondary text-[11px] py-1 px-2"
                        title="Datum entfernen"
                      >
                        <X size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="btn-secondary text-[11px] py-1 px-2"
                    >
                      Abbr.
                    </button>
                  </div>
                </div>
              ) : hasDate ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingKey(milestone.id)
                    setDateDraft(milestone.scheduledDate ?? '')
                    setTimeDraft(milestone.scheduledTime ?? '')
                  }}
                  className="text-left rounded-lg px-2 py-1.5 hover:bg-surface-hover transition-colors -mx-2"
                >
                  <div className="text-sm font-semibold text-text">
                    {formatDisplay(milestone.scheduledDate, milestone.scheduledTime)}
                  </div>
                  {countdown && (
                    <div className="text-[11px] mt-0.5 font-medium" style={{ color: countdown.color }}>
                      {countdown.text}
                    </div>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingKey(milestone.id)
                    setDateDraft('')
                    setTimeDraft('')
                  }}
                  className="flex items-center gap-1.5 text-xs text-text-dim hover:text-amber transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-hover -mx-2"
                >
                  <Plus size={12} strokeWidth={1.8} />
                  Datum festlegen
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
