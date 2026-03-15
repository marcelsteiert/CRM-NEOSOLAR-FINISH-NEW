import { useState, createContext, useContext, useMemo, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  FolderKanban,
  Coins,
  Mail,
  Sparkles,
  Bell,
  Shield,
  ClipboardList,
  Download,
  FileBox,
  Calculator,
  PanelLeftClose,
  PanelLeft,
  Puzzle,
  KeyRound,
  X,
  LogOut,
} from 'lucide-react'
import { useFeatureFlags, type FeatureFlag } from '@/hooks/useFeatureFlags'
import { useAuth } from '@/hooks/useAuth'

// ── Sidebar Context ──

interface SidebarContextValue {
  pinned: boolean
  setPinned: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({ pinned: false, setPinned: () => {}, mobileOpen: false, setMobileOpen: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebarPinned() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  return <SidebarContext.Provider value={{ pinned, setPinned, mobileOpen, setMobileOpen }}>{children}</SidebarContext.Provider>
}

// ── Nav Data ──

interface NavItem {
  to: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  hasNotification?: boolean
  featureId?: FeatureFlag
  adminOnly?: boolean
  moduleId?: string
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const allNavGroups: NavGroup[] = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', featureId: 'dashboard', moduleId: 'dashboard' },
    ],
  },
  {
    label: 'Vertrieb',
    items: [
      { to: '/leads', icon: Users, label: 'Leads', featureId: 'leads', moduleId: 'leads' },
      { to: '/appointments', icon: CalendarCheck, label: 'Termine', featureId: 'appointments', moduleId: 'appointments' },
      { to: '/deals', icon: FileText, label: 'Angebote', featureId: 'deals', moduleId: 'deals' },
      { to: '/provision', icon: Coins, label: 'Provision', featureId: 'provision', moduleId: 'provision' },
    ],
  },
  {
    label: 'Planung',
    items: [
      { to: '/calculations', icon: Calculator, label: 'Kalkulation', featureId: 'calculations', moduleId: 'calculations' },
      { to: '/projects', icon: FolderKanban, label: 'Projekte', featureId: 'projects', moduleId: 'projects' },
    ],
  },
  {
    label: 'Betrieb',
    items: [
      { to: '/communication', icon: Mail, label: 'Kommunikation', featureId: 'communication', moduleId: 'communication' },
      { to: '/ai', icon: Sparkles, label: 'KI-Summary', featureId: 'ai' },
      { to: '/tasks', icon: ClipboardList, label: 'Aufgaben', featureId: 'tasks', moduleId: 'tasks' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/notifications', icon: Bell, label: 'Meldungen', hasNotification: true, featureId: 'notifications' },
      { to: '/admin', icon: Shield, label: 'Admin', featureId: 'admin', adminOnly: true, moduleId: 'admin' },
      { to: '/export', icon: Download, label: 'Export', featureId: 'export', moduleId: 'export' },
      { to: '/documents', icon: FileBox, label: 'Dokumente', featureId: 'documents', moduleId: 'documents' },
      { to: '/passwords', icon: KeyRound, label: 'Passwörter', moduleId: 'passwords' },
      { to: '/features', icon: Puzzle, label: 'Features' },
    ],
  },
]

// ── Sidebar Component ──

export default function Sidebar() {
  const { pinned, setPinned, mobileOpen, setMobileOpen } = useSidebarPinned()
  const [hovered, setHovered] = useState(false)
  const { flags } = useFeatureFlags()
  const { user, logout } = useAuth()
  const location = useLocation()
  const isMobile = useIsMobile()

  const expanded = pinned || hovered || isMobile

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, setMobileOpen])

  const isAdminUser = user?.role === 'ADMIN' || user?.role === 'GL' || user?.role === 'GESCHAEFTSLEITUNG'
  const userModules = user?.allowedModules ?? []
  // Stabiler Key fuer memo-Invalidierung bei Modul-Aenderungen
  const userModulesKey = userModules.join(',')

  // Filter nav groups based on enabled features + admin-only + allowedModules
  // Prioritaet: allowedModules uebersteuert Feature-Flags
  const navGroups = useMemo(() => {
    return allNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.adminOnly && !isAdminUser) return false
          // Admins sehen alles
          if (isAdminUser) return true
          // Wenn User dieses Modul explizit hat → anzeigen (Feature-Flag ignorieren)
          if (item.moduleId && userModules.includes(item.moduleId)) return true
          // Kein moduleId (z.B. KI-Summary, Features) → Feature-Flag entscheidet
          if (!item.moduleId && item.featureId && !flags[item.featureId]) return false
          // Modul nicht in allowedModules → ausblenden
          if (item.moduleId && !userModules.includes(item.moduleId)) return false
          return true
        }),
      }))
      .filter((group) => group.items.length > 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, isAdminUser, userModulesKey])

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[49] bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          'fixed left-0 top-0 bottom-0 flex flex-col items-start py-5 z-50 border-r border-border bg-bg/95 backdrop-blur-2xl',
          'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          // Mobile: slide in/out, always expanded width
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
        style={{
          width: isMobile ? '260px' : expanded ? '220px' : '72px',
          transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={() => !pinned && setHovered(true)}
        onMouseLeave={() => !pinned && setHovered(false)}
      >
        {/* Logo + Pin Toggle */}
        <div className="flex items-center w-full px-[15px] mb-5 shrink-0">
          <div className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center shrink-0 overflow-hidden" style={{ background: '#f0f0f0' }}>
            <img src="/neosolar-logo.jpeg" alt="NeoSolar" className="w-[38px] object-contain" />
          </div>
          {(expanded || mobileOpen) && (
            <div className="flex items-center ml-3 flex-1 min-w-0 overflow-hidden">
              <span className="text-[13px] font-bold text-amber whitespace-nowrap">NeoSolar</span>
              <span className="text-[13px] font-medium text-text-dim ml-1 whitespace-nowrap">CRM</span>
              {/* Desktop: Pin toggle */}
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className="ml-auto shrink-0 w-7 h-7 rounded-[8px] items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all hidden md:flex"
                aria-label={pinned ? 'Sidebar einklappen' : 'Sidebar fixieren'}
              >
                {pinned ? <PanelLeftClose size={16} strokeWidth={1.8} /> : <PanelLeft size={16} strokeWidth={1.8} />}
              </button>
              {/* Mobile: Close button */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="ml-auto shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all md:hidden"
                aria-label="Menü schliessen"
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation with Groups */}
        <nav className="flex-1 flex flex-col w-full gap-0 py-1 overflow-y-auto overflow-x-hidden" aria-label="Hauptnavigation">
          {navGroups.map((group, gi) => (
            <div key={gi} className="w-full flex flex-col">
              {/* Section label + separator */}
              {gi > 0 && (
                <div className="w-full flex flex-col px-[15px] my-1.5">
                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  {group.label && (
                    <span
                      className="text-[8px] font-bold uppercase tracking-[0.12em] text-text-dim mt-1.5 mb-0.5 select-none whitespace-nowrap overflow-hidden"
                      style={{
                        textAlign: (expanded || mobileOpen) ? 'left' : 'center',
                        paddingLeft: (expanded || mobileOpen) ? '2px' : '0',
                      }}
                    >
                      {group.label}
                    </span>
                  )}
                </div>
              )}

              {/* Nav items */}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    [
                      'relative flex items-center group mx-[14px] rounded-[12px]',
                      'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      (expanded || mobileOpen) ? 'h-[40px] px-[10px] gap-3' : 'h-[44px] w-[44px] justify-center',
                      isActive
                        ? 'bg-amber-soft text-amber scale-[1.02]'
                        : 'text-text-dim hover:bg-surface-hover hover:text-text',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
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
                      {item.hasNotification && (
                        <div
                          className="absolute rounded-full bg-red"
                          style={{
                            boxShadow: '0 0 6px rgba(248, 113, 113, 0.6)',
                            top: (expanded || mobileOpen) ? '8px' : '7px',
                            right: (expanded || mobileOpen) ? 'auto' : '7px',
                            left: (expanded || mobileOpen) ? '24px' : 'auto',
                            width: '7px',
                            height: '7px',
                          }}
                        />
                      )}
                      {(expanded || mobileOpen) && (
                        <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {item.label}
                        </span>
                      )}
                      {/* Tooltip (only when collapsed on desktop) */}
                      {!expanded && !mobileOpen && (
                        <div
                          className="absolute left-[62px] px-3 py-1.5 rounded-lg bg-bg-sub border border-border text-[11px] font-medium text-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-[60] shadow-lg hidden md:block"
                          role="tooltip"
                        >
                          {item.label}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        {user && (
          <div className="w-full px-[15px] pt-2 pb-1 shrink-0 border-t border-border mt-1">
            {(expanded || mobileOpen) ? (
              <div className="flex items-center gap-2.5 px-[10px] py-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-bg"
                  style={{ background: user.avatar || '#F59E0B' }}
                >
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-text-dim truncate">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-all shrink-0"
                  aria-label="Abmelden"
                  title="Abmelden"
                >
                  <LogOut size={14} strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={logout}
                className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-all mx-auto"
                aria-label="Abmelden"
                title="Abmelden"
              >
                <LogOut size={20} strokeWidth={1.8} />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
