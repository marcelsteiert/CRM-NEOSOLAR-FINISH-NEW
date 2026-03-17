import {
  Users,
  MapPin,
  GitBranch,
  Database,
  Tag,
  Zap,
  Plug,
  Webhook,
  FolderOpen,
  Bell,
  Palette,
  Sparkles,
  ScrollText,
  HardDrive,
  ClipboardList,
  KeyRound,
  CalendarCheck,
  FileText,
} from 'lucide-react'

export type AdminSection =
  | 'users'
  | 'locations'
  | 'pipelines'
  | 'products'
  | 'tags'
  | 'automations'
  | 'projectPhases'
  | 'appointmentKanban'
  | 'dealKanban'
  | 'integrations'
  | 'webhooks'
  | 'templates'
  | 'notifications'
  | 'branding'
  | 'ai'
  | 'audit'
  | 'database'
  | 'passwords'

interface AdminNavItem {
  id: AdminSection
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  color: string
}

interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

const navGroups: AdminNavGroup[] = [
  {
    label: 'Team',
    items: [
      { id: 'users', icon: Users, label: 'Benutzer & Rollen', color: '#A78BFA' },
      { id: 'locations', icon: MapPin, label: 'Firmenstandorte', color: '#60A5FA' },
    ],
  },
  {
    label: 'CRM-Konfiguration',
    items: [
      { id: 'pipelines', icon: GitBranch, label: 'Pipeline-Verwaltung', color: '#60A5FA' },
      { id: 'products', icon: Database, label: 'Stammdaten / Preise', color: '#F59E0B' },
      { id: 'tags', icon: Tag, label: 'Tag-Verwaltung', color: '#34D399' },
      { id: 'automations', icon: Zap, label: 'Automations-Regeln', color: '#F59E0B' },
      { id: 'projectPhases', icon: ClipboardList, label: 'Projekt-Phasen', color: '#34D399' },
      { id: 'appointmentKanban', icon: CalendarCheck, label: 'Termin-Kanban', color: '#34D399' },
      { id: 'dealKanban', icon: FileText, label: 'Angebote-Kanban', color: '#A78BFA' },
    ],
  },
  {
    label: 'Extern',
    items: [
      { id: 'integrations', icon: Plug, label: 'Integrationen', color: '#22D3EE' },
      { id: 'webhooks', icon: Webhook, label: 'Webhook-Verwaltung', color: '#FB923C' },
    ],
  },
  {
    label: 'Vorlagen',
    items: [
      { id: 'templates', icon: FolderOpen, label: 'Dokumenten-Vorlagen', color: '#A78BFA' },
      { id: 'notifications', icon: Bell, label: 'Benachrichtigungen', color: '#F87171' },
      { id: 'branding', icon: Palette, label: 'Firmen-Branding', color: '#F59E0B' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'ai', icon: Sparkles, label: 'KI-Einstellungen', color: '#A78BFA' },
      { id: 'audit', icon: ScrollText, label: 'Audit-Log', color: '#94A3B8' },
      { id: 'database', icon: HardDrive, label: 'Datenbank & Export', color: '#94A3B8' },
      { id: 'passwords', icon: KeyRound, label: 'Geteilte Passwörter', color: '#F59E0B' },
    ],
  },
]

interface Props {
  active: AdminSection
  onChange: (section: AdminSection) => void
}

export default function AdminNav({ active, onChange }: Props) {
  return (
    <>
      {/* Mobile: Horizontal scrollable chips */}
      <div className="lg:hidden w-full overflow-x-auto pb-1">
        <div className="flex gap-1.5 min-w-max px-1">
          {navGroups.flatMap((g) => g.items).map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={[
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-150 whitespace-nowrap shrink-0',
                  isActive
                    ? 'text-text'
                    : 'text-text-dim hover:text-text hover:bg-surface-hover',
                ].join(' ')}
                style={
                  isActive
                    ? {
                        background: `color-mix(in srgb, ${item.color} 10%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${item.color} 15%, transparent)`,
                      }
                    : { border: '1px solid transparent' }
                }
              >
                <item.icon
                  size={14}
                  strokeWidth={1.8}
                  style={{ color: isActive ? item.color : undefined }}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop: Vertical sidebar nav */}
      <div className="hidden lg:block w-[220px] shrink-0 space-y-1">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.06)' }} />}
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-text-dim px-3 mb-1">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150',
                    isActive
                      ? 'text-text'
                      : 'text-text-dim hover:text-text hover:bg-surface-hover',
                  ].join(' ')}
                  style={
                    isActive
                      ? {
                          background: `color-mix(in srgb, ${item.color} 10%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${item.color} 15%, transparent)`,
                        }
                      : { border: '1px solid transparent' }
                  }
                >
                  <item.icon
                    size={16}
                    strokeWidth={1.8}
                    style={{ color: isActive ? item.color : undefined }}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
