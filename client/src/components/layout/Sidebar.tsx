import { useState, createContext, useContext } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
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
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'

// ── Sidebar Context ──

interface SidebarContextValue {
  pinned: boolean
  setPinned: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({ pinned: false, setPinned: () => {} })

export function useSidebarPinned() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(true)
  return <SidebarContext.Provider value={{ pinned, setPinned }}>{children}</SidebarContext.Provider>
}

// ── Nav Data ──

interface NavItem {
  to: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  hasNotification?: boolean
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Vertrieb',
    items: [
      { to: '/leads', icon: Users, label: 'Leads' },
      { to: '/appointments', icon: CalendarCheck, label: 'Termine' },
      { to: '/deals', icon: FileText, label: 'Angebote' },
    ],
  },
  {
    label: 'Planung',
    items: [
      { to: '/calculations', icon: Calculator, label: 'Kalkulation' },
      { to: '/projects', icon: FolderKanban, label: 'Projekte' },
    ],
  },
  {
    label: 'Betrieb',
    items: [
      { to: '/invoices', icon: Receipt, label: 'Rechnungen' },
      { to: '/communication', icon: Mail, label: 'Kommunikation' },
      { to: '/ai', icon: Sparkles, label: 'KI-Summary' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/tasks', icon: ClipboardList, label: 'Aufgaben' },
      { to: '/notifications', icon: Bell, label: 'Meldungen', hasNotification: true },
      { to: '/roles', icon: Shield, label: 'Rollen' },
      { to: '/export', icon: Download, label: 'Export' },
      { to: '/documents', icon: FileBox, label: 'Dokumente' },
    ],
  },
]

// ── Sidebar Component ──

export default function Sidebar() {
  const { pinned, setPinned } = useSidebarPinned()
  const [hovered, setHovered] = useState(false)

  const expanded = pinned || hovered

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col items-start py-5 z-50 border-r border-border bg-bg/80 backdrop-blur-2xl"
      style={{
        width: expanded ? '220px' : '72px',
        transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => !pinned && setHovered(true)}
      onMouseLeave={() => !pinned && setHovered(false)}
    >
      {/* Logo + Pin Toggle */}
      <div className="flex items-center w-full px-[15px] mb-5 shrink-0">
        <div
          className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #F97316)',
            boxShadow: '0 0 28px rgba(245, 158, 11, 0.2)',
          }}
        >
          <span className="text-bg font-extrabold text-[13px] tracking-tight">NS</span>
        </div>
        {expanded && (
          <div className="flex items-center ml-3 flex-1 min-w-0 overflow-hidden">
            <span className="text-[13px] font-bold text-amber whitespace-nowrap">NeoSolar</span>
            <span className="text-[13px] font-medium text-text-dim ml-1 whitespace-nowrap">CRM</span>
            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              className="ml-auto shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"
              aria-label={pinned ? 'Sidebar einklappen' : 'Sidebar fixieren'}
            >
              {pinned ? <PanelLeftClose size={16} strokeWidth={1.8} /> : <PanelLeft size={16} strokeWidth={1.8} />}
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
                      textAlign: expanded ? 'left' : 'center',
                      paddingLeft: expanded ? '2px' : '0',
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
                    expanded ? 'h-[40px] px-[10px] gap-3' : 'h-[44px] w-[44px] justify-center',
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
                          top: expanded ? '8px' : '7px',
                          right: expanded ? 'auto' : '7px',
                          left: expanded ? '24px' : 'auto',
                          width: '7px',
                          height: '7px',
                        }}
                      />
                    )}
                    {expanded && (
                      <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.label}
                      </span>
                    )}
                    {/* Tooltip (only when collapsed) */}
                    {!expanded && (
                      <div
                        className="absolute left-[62px] px-3 py-1.5 rounded-lg bg-bg-sub border border-border text-[11px] font-medium text-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-[60] shadow-lg"
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
    </aside>
  )
}
