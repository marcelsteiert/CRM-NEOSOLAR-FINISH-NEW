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
  { to: '/notifications', icon: Bell, label: 'Benachrichtigungen', hasNotification: true },
  { to: '/roles', icon: Shield, label: 'Rollen' },
  { to: '/export', icon: Download, label: 'Export' },
  { to: '/documents', icon: FileBox, label: 'Dokumente' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[72px] flex flex-col items-center py-5 z-50 border-r border-border bg-bg/80 backdrop-blur-xl">
      {/* Logo */}
      <div
        className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, #F59E0B, #F97316)',
          boxShadow: '0 0 30px rgba(245, 158, 11, 0.25)',
        }}
      >
        <span className="text-bg font-extrabold text-sm tracking-tight">NS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative w-[44px] h-[44px] rounded-[12px] flex items-center justify-center transition-smooth group ${
                isActive
                  ? 'bg-amber-soft text-amber scale-105'
                  : 'text-text-dim hover:bg-surface-hover hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-[-14px] w-[3px] h-[22px] rounded-r-full"
                    style={{
                      background: 'linear-gradient(180deg, #F59E0B, #F97316)',
                      boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
                    }}
                  />
                )}
                <item.icon size={20} strokeWidth={1.8} />
                {/* Notification dot */}
                {item.hasNotification && (
                  <div
                    className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-full bg-red"
                    style={{ boxShadow: '0 0 6px rgba(248, 113, 113, 0.6)' }}
                  />
                )}
                {/* Tooltip */}
                <div className="absolute left-[60px] px-3 py-1.5 rounded-lg bg-bg-sub border border-border text-xs font-medium text-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-smooth z-50">
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
