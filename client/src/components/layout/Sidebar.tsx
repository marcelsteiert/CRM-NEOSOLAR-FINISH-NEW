import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Handshake,
  FolderKanban,
  Receipt,
  Mail,
  Sparkles,
  Bell,
  Shield,
  ClipboardList,
  Download,
  FileBox,
  Calculator,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/deals', icon: Handshake, label: 'Deals' },
  { to: '/calculations', icon: Calculator, label: 'Kalkulation' },
  { to: '/projects', icon: FolderKanban, label: 'Projekte' },
  { to: '/invoices', icon: Receipt, label: 'Rechnungen' },
  { to: '/communication', icon: Mail, label: 'Kommunikation' },
  { to: '/ai', icon: Sparkles, label: 'KI-Summary' },
  { to: '/tasks', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/notifications', icon: Bell, label: 'Meldungen', hasNotification: true },
  { to: '/roles', icon: Shield, label: 'Rollen' },
  { to: '/export', icon: Download, label: 'Export' },
  { to: '/documents', icon: FileBox, label: 'Dokumente' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[72px] flex flex-col items-center py-5 z-50 border-r border-border bg-bg/80 backdrop-blur-2xl">
      {/* Logo */}
      <div className="relative group/logo mb-8 shrink-0">
        <div
          className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #F97316)',
            boxShadow: '0 0 28px rgba(245, 158, 11, 0.2)',
          }}
        >
          <span className="text-bg font-extrabold text-[13px] tracking-tight">NS</span>
        </div>
        {/* Logo tooltip */}
        <div
          className="absolute left-[62px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-bg-sub border border-border text-[11px] font-semibold text-amber whitespace-nowrap opacity-0 pointer-events-none group-hover/logo:opacity-100 transition-opacity duration-150 z-[60] shadow-lg"
          role="tooltip"
        >
          NeoSolar CRM
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 py-1" aria-label="Hauptnavigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-label={item.label}
            className={({ isActive }) =>
              [
                'relative w-[44px] h-[44px] rounded-[12px] flex items-center justify-center group',
                'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                isActive
                  ? 'bg-amber-soft text-amber scale-[1.04]'
                  : 'text-text-dim hover:bg-surface-hover hover:text-text',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-[-14px] w-[3px] h-[20px] rounded-r-full"
                    style={{
                      background: 'linear-gradient(180deg, #F59E0B, #F97316)',
                      boxShadow: '0 0 10px rgba(245, 158, 11, 0.35)',
                    }}
                  />
                )}
                <item.icon size={20} strokeWidth={1.8} />
                {/* Notification dot */}
                {item.hasNotification && (
                  <div
                    className="absolute top-[7px] right-[7px] w-[7px] h-[7px] rounded-full bg-red"
                    style={{ boxShadow: '0 0 6px rgba(248, 113, 113, 0.6)' }}
                  />
                )}
                {/* Tooltip */}
                <div
                  className="absolute left-[62px] px-3 py-1.5 rounded-lg bg-bg-sub border border-border text-[11px] font-medium text-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-[60] shadow-lg"
                  role="tooltip"
                >
                  {item.label}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
