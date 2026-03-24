import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Menu, Cloud, CloudOff, User, Briefcase, FileText, Calendar, X, Bell, ArrowRight, CheckCheck } from 'lucide-react'
import { useSidebarPinned } from './Sidebar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useIntegrations } from '@/hooks/useAdmin'
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, notificationTypeColors } from '@/hooks/useNotifications'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Lead Hub',
  '/deals': 'Deal Pipeline',
  '/calculations': 'Kalkulation',
  '/projects': 'Projekte',
  '/invoices': 'Rechnungen',
  '/communication': 'Kommunikation',
  '/ai': 'KI-Summary',
  '/tasks': 'Aufgaben',
  '/notifications': 'Benachrichtigungen',
  '/admin': 'Administration',
  '/export': 'Datenexport',
  '/documents': 'Dokumente',
}

const defaultIntegrations = [
  { name: 'Bexio', service: 'bexio' },
  { name: '3CX', service: '3cx' },
  { name: 'Outlook', service: 'outlook' },
]

// ── Search Result Types ──

interface SearchContact {
  id: string
  firstName: string
  lastName: string
  company: string | null
  email: string
  phone: string
  address: string
  leads: { id: string; status: string; value: number; source: string }[]
  projects: { id: string; name: string; phase: string; value: number }[]
  deals: { id: string; title: string; stage: string; value: number }[]
  appointments: { id: string; status: string; appointmentDate: string | null }[]
}

// Isolated clock component to prevent full TopBar re-renders
const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <time className="tabular-nums text-sm font-medium text-text-sec hidden sm:block" dateTime={time.toISOString()}>
      {time.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  )
})

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  const basePath = '/' + pathname.split('/')[1]
  return pageTitles[basePath] || 'NeoSolar'
}

function SupabaseStatus() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ supabase: string }>('/health'),
    refetchInterval: 30000,
    retry: 1,
  })

  const connected = data?.supabase === 'connected'
  const statusColor = isError ? 'text-red' : connected ? 'text-emerald' : 'text-text-dim'
  const label = isError ? 'Offline' : connected ? 'Cloud Live' : 'Prüfe...'

  return (
    <div className="flex items-center gap-1.5" title={`Supabase: ${label}`}>
      {connected ? (
        <Cloud size={14} strokeWidth={1.8} className={statusColor} />
      ) : (
        <CloudOff size={14} strokeWidth={1.8} className={statusColor} />
      )}
      <span className={`text-[11px] font-semibold ${statusColor}`}>
        {label}
      </span>
      {connected && (
        <div
          className="w-[6px] h-[6px] rounded-full bg-emerald"
          style={{ boxShadow: '0 0 6px rgba(52, 211, 153, 0.5)' }}
        />
      )}
    </div>
  )
}

// ── Search Overlay ──

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: searchRes, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<{ data: SearchContact[] }>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 5000,
  })

  const results = searchRes?.data ?? []

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const goToResult = useCallback((contact: SearchContact) => {
    // Navigate to the most relevant entity and open its detail modal
    if (contact.projects.length > 0) {
      navigate(`/projects?open=${contact.projects[0].id}`)
    } else if (contact.deals.length > 0) {
      navigate(`/deals?open=${contact.deals[0].id}`)
    } else if (contact.leads.length > 0) {
      navigate(`/leads?open=${contact.leads[0].id}`)
    } else if (contact.appointments.length > 0) {
      navigate(`/appointments?open=${contact.appointments[0].id}`)
    } else {
      navigate('/leads')
    }
    onClose()
  }, [navigate, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      goToResult(results[selectedIdx])
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Search Panel */}
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12, 14, 20, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search size={18} className="text-text-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name, E-Mail, Telefonnummer suchen..."
            className="flex-1 bg-transparent text-[15px] text-text placeholder:text-text-dim focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-text-dim hover:text-text transition-colors">
              <X size={16} strokeWidth={2} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-text-dim border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 && (
            <div className="px-5 py-8 text-center text-[12px] text-text-dim">
              Mindestens 2 Zeichen eingeben...
            </div>
          )}

          {query.length >= 2 && isFetching && (
            <div className="px-5 py-6 text-center text-[12px] text-amber">
              Suche...
            </div>
          )}

          {query.length >= 2 && !isFetching && results.length === 0 && (
            <div className="px-5 py-8 text-center text-[12px] text-text-dim">
              Keine Ergebnisse fuer &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((contact, idx) => {
                const isSelected = idx === selectedIdx
                const entityCount = contact.leads.length + contact.projects.length + contact.deals.length + contact.appointments.length

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => goToResult(contact)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className="w-full text-left px-5 py-3 flex items-start gap-3.5 transition-colors"
                    style={{ background: isSelected ? 'rgba(245, 158, 11, 0.06)' : 'transparent' }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5"
                      style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', color: '#F59E0B' }}
                    >
                      {contact.firstName?.[0]}{contact.lastName?.[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-text truncate">
                          {contact.firstName} {contact.lastName}
                        </span>
                        {contact.company && (
                          <span className="text-[11px] text-text-dim truncate">({contact.company})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-dim">
                        {contact.email && <span className="truncate">{contact.email}</span>}
                        {contact.phone && <span>{contact.phone}</span>}
                      </div>
                      {contact.address && (
                        <div className="text-[10px] text-text-dim mt-0.5 truncate">{contact.address}</div>
                      )}

                      {/* Linked entities – klickbar mit Status */}
                      {entityCount > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {contact.leads.map((l) => (
                            <span key={l.id}
                              onClick={(e) => { e.stopPropagation(); navigate(`/leads?open=${l.id}`); onClose() }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer hover:brightness-125 transition-all"
                              style={{ background: 'color-mix(in srgb, #94A3B8 12%, transparent)', color: '#94A3B8' }}>
                              <User size={8} strokeWidth={2} />
                              Lead
                            </span>
                          ))}
                          {contact.appointments.map((a) => (
                            <span key={a.id}
                              onClick={(e) => { e.stopPropagation(); navigate(`/appointments?open=${a.id}`); onClose() }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer hover:brightness-125 transition-all"
                              style={{ background: 'color-mix(in srgb, #60A5FA 12%, transparent)', color: '#60A5FA' }}>
                              <Calendar size={8} strokeWidth={2} />
                              Termin
                            </span>
                          ))}
                          {contact.deals.map((d) => (
                            <span key={d.id}
                              onClick={(e) => { e.stopPropagation(); navigate(`/deals?open=${d.id}`); onClose() }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer hover:brightness-125 transition-all"
                              style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', color: '#F59E0B' }}>
                              <Briefcase size={8} strokeWidth={2} />
                              Angebot
                            </span>
                          ))}
                          {contact.projects.map((p) => (
                            <span key={p.id}
                              onClick={(e) => { e.stopPropagation(); navigate(`/projects?open=${p.id}`); onClose() }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer hover:brightness-125 transition-all"
                              style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399' }}>
                              <FileText size={8} strokeWidth={2} />
                              Projekt
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Enter hint */}
                    {isSelected && (
                      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono text-text-dim border border-border mt-1 shrink-0">
                        Enter
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-5 py-2.5 border-t border-border flex items-center gap-4 text-[10px] text-text-dim">
            <span><kbd className="px-1 py-0.5 rounded border border-border font-mono text-[9px]">↑↓</kbd> Navigieren</span>
            <span><kbd className="px-1 py-0.5 rounded border border-border font-mono text-[9px]">Enter</kbd> Oeffnen</span>
            <span><kbd className="px-1 py-0.5 rounded border border-border font-mono text-[9px]">Esc</kbd> Schliessen</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Notification Bell ──

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: unreadRes } = useUnreadCount()
  const { data: notifRes } = useNotifications({ limit: 5 })
  const markRead = useMarkAsRead()
  const markAllRead = useMarkAllAsRead()

  const unreadCount = unreadRes?.data?.count ?? 0
  const notifications = notifRes?.data ?? []

  // Click-outside schliessen
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = (n: { id: string; read: boolean; referenceType: string | null }) => {
    if (!n.read) markRead.mutate(n.id)
    setOpen(false)
    if (n.referenceType === 'LEAD') navigate('/leads')
    else if (n.referenceType === 'TERMIN') navigate('/appointments')
    else if (n.referenceType === 'ANGEBOT') navigate('/deals')
    else if (n.referenceType === 'PROJEKT') navigate('/projects')
    else if (n.referenceType === 'TASK') navigate('/tasks')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => { if (isMobile) { navigate('/notifications') } else { setOpen(!open) } }}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-colors"
        aria-label="Meldungen"
      >
        <Bell size={18} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <div
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: '#F87171', boxShadow: '0 0 8px rgba(248,113,113,0.5)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="fixed right-3 left-3 top-[58px] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+6px)] sm:w-[360px] max-h-[420px] rounded-2xl overflow-hidden z-50"
          style={{
            background: 'rgba(12, 14, 20, 0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[13px] font-bold">Meldungen</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="text-[10px] font-semibold text-amber hover:text-amber/80 flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  Alle gelesen
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[320px]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-text-dim">
                Keine Meldungen
              </div>
            ) : (
              notifications.map((n) => {
                const color = notificationTypeColors[n.type] ?? '#94A3B8'
                const timeDiff = Date.now() - new Date(n.createdAt).getTime()
                const mins = Math.floor(timeDiff / 60_000)
                const timeLabel = mins < 1 ? 'Jetzt' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-surface-hover border-b border-border/30 ${!n.read ? '' : 'opacity-60'}`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] leading-tight ${!n.read ? 'font-semibold' : 'text-text-sec'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-[11px] text-text-dim mt-0.5 truncate">{n.message}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-text-dim shrink-0 mt-0.5">{timeLabel}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/notifications') }}
            className="w-full px-4 py-2.5 border-t border-border text-center text-[12px] font-semibold text-amber hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5"
          >
            Alle anzeigen
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main TopBar ──

export default function TopBar() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)
  const { setMobileOpen } = useSidebarPinned()
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const { data: intData } = useIntegrations()
  const integrationsList = intData?.data ?? []

  const integrations = defaultIntegrations.map((di) => {
    const match = integrationsList.find(
      (i) => i.service.toLowerCase() === di.service || i.displayName.toLowerCase() === di.name.toLowerCase()
    )
    return { name: di.name, connected: match?.status === 'CONNECTED' }
  })

  // Update document title
  useEffect(() => {
    document.title = `${title} – NeoSolar CRM`
  }, [title])

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Suche nur fuer berechtigte User
  const canSearch = user?.role === 'ADMIN' || user?.role === 'GESCHAEFTSLEITUNG' || user?.role === 'GL' ||
    user?.role === 'PROJEKTLEITUNG' || (user?.allowedModules ?? []).includes('search')

  return (
    <>
      <header
        className="h-[52px] md:h-[60px] border-b border-border flex items-center justify-between px-4 md:px-7 sticky top-0 z-40"
        style={{
          background: 'rgba(6, 8, 12, 0.75)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        }}
      >
        {/* Left: Hamburger (mobile) + Page title */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-text-sec hover:text-text hover:bg-surface-hover transition-colors shrink-0"
            aria-label="Menü öffnen"
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <h1 className="text-lg md:text-xl font-extrabold tracking-[-0.02em] truncate">{title}</h1>
          <span className="px-2 md:px-2.5 py-0.5 rounded-full bg-amber-soft text-amber text-[10px] font-bold tracking-[0.06em] uppercase shrink-0 hidden sm:inline-flex">
            CRM
          </span>
        </div>

        {/* Center: Search */}
        {canSearch && (
          <div className="flex-1 max-w-md mx-4 md:mx-8 hidden sm:block">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="glass-input w-full pl-10 pr-4 py-2 text-sm text-left text-text-dim relative cursor-pointer hover:border-amber/30 transition-colors"
            >
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
              Suchen... <kbd className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">⌘K</kbd>
            </button>
          </div>
        )}

        {/* Right: Supabase Status + Integrations + Clock */}
        <div className="flex items-center gap-3 md:gap-5 shrink-0">
          {/* Mobile search button */}
          {canSearch && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-colors"
              aria-label="Suche oeffnen"
            >
              <Search size={18} strokeWidth={1.8} />
            </button>
          )}

          <NotificationBell />

          <SupabaseStatus />

          <div className="hidden lg:block w-px h-5 bg-border" />

          <div className="hidden lg:flex items-center gap-4">
            {integrations.map((integration) => (
              <div key={integration.name} className="flex items-center gap-1.5">
                <div
                  className={`w-[6px] h-[6px] rounded-full ${
                    integration.connected ? 'bg-emerald' : 'bg-text-dim'
                  }`}
                  style={integration.connected ? { boxShadow: '0 0 6px rgba(52, 211, 153, 0.5)' } : {}}
                />
                <span className="text-[11px] font-medium text-text-dim">{integration.name}</span>
              </div>
            ))}
          </div>

          <LiveClock />
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}
