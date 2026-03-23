import { useState, useMemo } from 'react'
import {
  Bell, CheckCheck, Trash2, Loader2, AlertTriangle, RefreshCw,
  Users, CalendarCheck, FileText, FolderKanban, ClipboardList,
  Clock, Trophy, XCircle, ArrowRight, FileBox, Zap,
} from 'lucide-react'
import {
  useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead,
  useClearReadNotifications, useDeleteNotification,
  notificationTypeLabels, notificationTypeColors,
  type Notification,
} from '@/hooks/useNotifications'
import { useNavigate } from 'react-router-dom'

/* ── Types ── */

type FilterType = 'ALL' | 'UNREAD' | string

/* ── Icon mapping ── */

const typeIcons: Record<string, typeof Bell> = {
  LEAD_CREATED: Users,
  LEAD_ASSIGNED: Users,
  APPOINTMENT_REMINDER: CalendarCheck,
  APPOINTMENT_CONFIRMED: CalendarCheck,
  DEAL_STATUS_CHANGE: FileText,
  DEAL_WON: Trophy,
  DEAL_LOST: XCircle,
  FOLLOW_UP_DUE: Clock,
  TASK_ASSIGNED: ClipboardList,
  TASK_OVERDUE: ClipboardList,
  PROJEKT_UPDATE: FolderKanban,
  DOCUMENT_UPLOADED: FileBox,
  SYSTEM: Zap,
}

/* ── Helpers ── */

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Gestern'
  if (days < 7) return `vor ${days} Tagen`
  return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups: Record<string, Notification[]> = { today: [], yesterday: [], older: [] }

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() === today.getTime()) groups.today.push(n)
    else if (d.getTime() === yesterday.getTime()) groups.yesterday.push(n)
    else groups.older.push(n)
  }

  const result: { label: string; items: Notification[] }[] = []
  if (groups.today.length > 0) result.push({ label: 'Heute', items: groups.today })
  if (groups.yesterday.length > 0) result.push({ label: 'Gestern', items: groups.yesterday })
  if (groups.older.length > 0) result.push({ label: 'Älter', items: groups.older })
  return result
}

function getNavigationPath(n: Notification): string | null {
  if (!n.referenceType || !n.referenceId) return null
  switch (n.referenceType) {
    case 'LEAD': return '/leads'
    case 'TERMIN': return '/appointments'
    case 'ANGEBOT': return '/deals'
    case 'PROJEKT': return '/projects'
    case 'TASK': return '/tasks'
    default: return null
  }
}

/* ── Main ── */

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('ALL')

  const readFilter = filter === 'UNREAD' ? false : undefined
  const typeFilter = filter !== 'ALL' && filter !== 'UNREAD' ? filter : undefined

  const { data: notifRes, isLoading, isError, error, refetch } = useNotifications({
    read: readFilter,
    type: typeFilter,
    limit: 100,
  })
  const { data: unreadRes } = useUnreadCount()
  const markRead = useMarkAsRead()
  const markAllRead = useMarkAllAsRead()
  const clearRead = useClearReadNotifications()
  const deleteNotif = useDeleteNotification()
  const navigate = useNavigate()

  const notifications = notifRes?.data ?? []
  const unreadCount = unreadRes?.data?.count ?? 0

  const grouped = useMemo(() => groupByDate(notifications), [notifications])

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id)
    const path = getNavigationPath(n)
    if (path) navigate(path)
  }

  /* Filter-Tabs */
  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'ALL', label: 'Alle' },
    { key: 'UNREAD', label: `Ungelesen (${unreadCount})` },
  ]

  /* Typ-Filter Dropdown */
  const typeOptions = [
    { value: 'ALL', label: 'Alle Typen' },
    ...Object.entries(notificationTypeLabels).map(([key, label]) => ({ value: key, label })),
  ]

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, #F87171 12%, transparent), color-mix(in srgb, #F87171 4%, transparent))',
              border: '1px solid color-mix(in srgb, #F87171 10%, transparent)',
            }}
          >
            <Bell size={20} className="text-red-400" strokeWidth={1.8} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">Meldungen</h1>
              {unreadCount > 0 && (
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}
                >
                  {unreadCount} neu
                </span>
              )}
            </div>
            <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">
              Benachrichtigungen und Erinnerungen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="btn-secondary flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[12px]"
              disabled={markAllRead.isPending}
            >
              <CheckCheck size={14} strokeWidth={2} />
              <span className="hidden sm:inline">Alle gelesen</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => clearRead.mutate()}
            className="btn-secondary flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[12px] text-text-dim hover:text-red"
            disabled={clearRead.isPending}
          >
            <Trash2 size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Gelesene löschen</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div
          className="flex items-center rounded-full p-0.5 overflow-x-auto max-w-full"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={[
                'px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 whitespace-nowrap',
                filter === tab.key ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Typ-Filter */}
        {filter !== 'UNREAD' && (
          <div className="relative">
            <select
              value={filter === 'ALL' ? 'ALL' : filter}
              onChange={(e) => setFilter(e.target.value === 'ALL' ? 'ALL' : e.target.value)}
              className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
              style={{ minWidth: 'auto' }}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-text-dim" />
        </div>
      ) : isError ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
            <AlertTriangle size={20} className="text-red-400" strokeWidth={1.8} />
          </div>
          <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden</p>
          <p className="text-[12px] text-text-sec mb-5">{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
          <button type="button" onClick={() => refetch()} className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]">
            <RefreshCw size={14} strokeWidth={2} />
            Erneut versuchen
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'color-mix(in srgb, #34D399 10%, transparent)' }}>
            <Bell size={24} className="text-emerald-400" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-semibold text-text mb-1">Keine Meldungen</p>
          <p className="text-[12px] text-text-dim">Du bist auf dem neuesten Stand!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2 px-1">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((n) => {
                  const Icon = typeIcons[n.type] ?? Bell
                  const color = notificationTypeColors[n.type] ?? '#94A3B8'

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full glass-card p-3 sm:p-4 text-left flex items-start gap-2.5 sm:gap-3 transition-all hover:border-[rgba(255,255,255,0.12)] group ${
                        !n.read ? '' : 'opacity-60'
                      }`}
                      style={!n.read ? { borderLeft: `3px solid ${color}` } : undefined}
                    >
                      {/* Icon */}
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                      >
                        <Icon size={14} className="sm:!w-4 sm:!h-4" style={{ color }} strokeWidth={1.8} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                          <span
                            className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase"
                            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                          >
                            {notificationTypeLabels[n.type] ?? n.type}
                          </span>
                          <span className="text-[10px] text-text-dim whitespace-nowrap sm:hidden">{relativeTime(n.createdAt)}</span>
                          {!n.read && (
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#F87171', boxShadow: '0 0 6px rgba(248,113,113,0.5)' }} />
                          )}
                        </div>
                        <p className={`text-[12px] sm:text-[13px] leading-tight ${!n.read ? 'font-semibold' : 'font-medium text-text-sec'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-[11px] sm:text-[12px] text-text-dim mt-0.5 line-clamp-2 sm:truncate">{n.message}</p>
                        )}
                        {n.referenceTitle && (
                          <p className="text-[10px] sm:text-[11px] text-text-dim mt-1 flex items-center gap-1">
                            <ArrowRight size={10} />
                            <span className="truncate">{n.referenceTitle}</span>
                          </p>
                        )}
                      </div>

                      {/* Time + Delete */}
                      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] text-text-dim whitespace-nowrap">{relativeTime(n.createdAt)}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(n.id) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Löschen"
                        >
                          <Trash2 size={12} className="text-text-dim hover:text-red transition-colors" />
                        </button>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
