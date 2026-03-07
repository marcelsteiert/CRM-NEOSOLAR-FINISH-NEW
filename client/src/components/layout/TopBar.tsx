import { useState, useEffect, memo } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Menu, Cloud, CloudOff } from 'lucide-react'
import { useSidebarPinned } from './Sidebar'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

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

const integrations = [
  { name: 'Bexio', connected: false },
  { name: '3CX', connected: false },
  { name: 'Outlook', connected: false },
]

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
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname]
  // Try base path for parameterized routes like /leads/123
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

export default function TopBar() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)
  const { setMobileOpen } = useSidebarPinned()

  // Update document title
  useEffect(() => {
    document.title = `${title} – NeoSolar CRM`
  }, [title])

  return (
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

      {/* Center: Search (hidden on small mobile) */}
      <div className="flex-1 max-w-md mx-4 md:mx-8 hidden sm:block">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="search"
            placeholder="Suchen... ⌘K"
            aria-label="Globale Suche"
            className="glass-input w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Right: Supabase Status + Integrations + Clock */}
      <div className="flex items-center gap-3 md:gap-5 shrink-0">
        {/* Supabase Cloud Status */}
        <SupabaseStatus />

        {/* Integration status divider */}
        <div className="hidden lg:block w-px h-5 bg-border" />

        {/* Integration status */}
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
  )
}
