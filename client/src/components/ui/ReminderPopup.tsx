import { useEffect, useState } from 'react'
import { Bell, X, Clock, ChevronRight } from 'lucide-react'
import { usePendingReminders, useDismissReminder, type Reminder } from '@/hooks/useLeads'

export default function ReminderPopup() {
  const { data } = usePendingReminders()
  const dismiss = useDismissReminder()
  const [visible, setVisible] = useState<Reminder[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!data?.data) return
    const pending = data.data.filter((r) => !dismissed.has(r.id))
    setVisible(pending)
  }, [data, dismissed])

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
    dismiss.mutate(id)
  }

  if (visible.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-[380px]">
      {visible.map((reminder) => {
        const isOverdue = new Date(reminder.dueAt).getTime() < Date.now()
        return (
          <div
            key={reminder.id}
            className="animate-in slide-in-from-bottom-2 fade-in"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
              border: isOverdue
                ? '1px solid color-mix(in srgb, #F87171 25%, transparent)'
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              boxShadow: isOverdue
                ? '0 8px 32px rgba(248,113,113,0.15)'
                : '0 8px 32px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-4 pt-4 pb-2">
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: isOverdue
                    ? 'color-mix(in srgb, #F87171 12%, transparent)'
                    : 'color-mix(in srgb, #F59E0B 12%, transparent)',
                }}
              >
                <Bell
                  size={16}
                  strokeWidth={1.8}
                  className={isOverdue ? 'text-red' : 'text-amber'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug">{reminder.title}</p>
                {reminder.description && (
                  <p className="text-[11px] text-text-sec mt-0.5 line-clamp-2">
                    {reminder.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDismiss(reminder.id)}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150 shrink-0"
                aria-label="Erinnerung schliessen"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-text-dim" strokeWidth={2} />
                <span
                  className={[
                    'text-[10px] font-medium',
                    isOverdue ? 'text-red' : 'text-text-dim',
                  ].join(' ')}
                >
                  {isOverdue ? 'Überfällig' : formatDueTime(reminder.dueAt)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDismiss(reminder.id)}
                className="flex items-center gap-1 text-[11px] font-semibold text-amber hover:text-amber/80 transition-colors"
              >
                Erledigt
                <ChevronRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function formatDueTime(dueAt: string): string {
  const diff = new Date(dueAt).getTime() - Date.now()
  if (diff < 0) return 'Überfällig'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `in ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `in ${days} Tagen`
}
