import { useState, useEffect, memo } from 'react'
import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'

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
  '/roles': 'Rollen & Rechte',
  '/export': 'Datenexport',
  '/documents': 'Dokumente',
}

const integrations = [
  { name: 'Pexio', connected: false },
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
    <time className="tabular-nums text-sm font-medium text-text-sec" dateTime={time.toISOString()}>
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

export default function TopBar() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  // Update document title
  useEffect(() => {
    document.title = `${title} – NeoSolar CRM`
  }, [title])

  return (
    <header
      className="h-[60px] border-b border-border flex items-center justify-between px-7 sticky top-0 z-40"
      style={{
        background: 'rgba(6, 8, 12, 0.75)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
      }}
    >
      {/* Left: Page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h1>
        <span className="px-2.5 py-0.5 rounded-full bg-amber-soft text-amber text-[10px] font-bold tracking-[0.06em] uppercase">
          CRM
        </span>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-8">
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

      {/* Right: Integrations + Clock */}
      <div className="flex items-center gap-5">
        {/* Integration status */}
        <div className="hidden lg:flex items-center gap-4">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center gap-1.5">
              <div
                className={`w-[6px] h-[6px] rounded-full ${
                  integration.connected ? 'bg-green' : 'bg-text-dim'
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
