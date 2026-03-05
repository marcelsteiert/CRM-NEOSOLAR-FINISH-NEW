import { useState } from 'react'
import {
  Puzzle, Mail, Calculator, Sparkles, ClipboardList, FileBox,
  Download, Bell, Coins, FolderKanban, CalendarCheck, FileText,
  Users, Shield, LayoutDashboard, ToggleLeft, ToggleRight,
  Zap, Star, Lock, Check,
} from 'lucide-react'
import { useFeatureFlags, type FeatureFlag } from '@/hooks/useFeatureFlags'

interface FeatureInfo {
  id: FeatureFlag
  name: string
  description: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  color: string
  category: 'core' | 'sales' | 'operations' | 'system'
  status: 'live' | 'beta' | 'coming'
  isCore?: boolean // core features cannot be disabled
}

const features: FeatureInfo[] = [
  // Core (always on)
  { id: 'dashboard', name: 'Dashboard', description: 'Übersicht über alle KPIs, Pipeline-Status und Aktivitäten', icon: LayoutDashboard, color: '#F59E0B', category: 'core', status: 'live', isCore: true },
  { id: 'leads', name: 'Lead Hub', description: 'Lead-Erfassung, Qualifizierung und Pipeline-Management', icon: Users, color: '#A78BFA', category: 'core', status: 'live', isCore: true },
  { id: 'appointments', name: 'Termine', description: 'Besichtigungstermine mit Vorbereitungs-Checkliste und Fahrzeit', icon: CalendarCheck, color: '#34D399', category: 'core', status: 'live', isCore: true },
  { id: 'deals', name: 'Angebote', description: 'Offerten-Verwaltung mit Phasen, Wahrscheinlichkeit und Follow-Up', icon: FileText, color: '#60A5FA', category: 'core', status: 'live', isCore: true },
  { id: 'projects', name: 'Projekte', description: 'Projekt-Kanban mit 4 Phasen, Checklisten und Nachkalkulation', icon: FolderKanban, color: '#FB923C', category: 'core', status: 'live', isCore: true },
  { id: 'admin', name: 'Administration', description: '14 Admin-Sektionen: Benutzer, Produkte, Integrationen, etc.', icon: Shield, color: '#94A3B8', category: 'core', status: 'live', isCore: true },

  // Sales (toggleable)
  { id: 'provision', name: 'Provision', description: 'Monatsbasierte Provisionsberechnung mit 5% auf Angebotswert', icon: Coins, color: '#F59E0B', category: 'sales', status: 'live' },
  { id: 'calculations', name: 'Kalkulation', description: 'PV-Anlagen kalkulieren: Module, Speicher, Wechselrichter, Arbeitszeit', icon: Calculator, color: '#A78BFA', category: 'sales', status: 'coming' },

  // Operations (toggleable)
  { id: 'communication', name: 'Kommunikation', description: 'Zentraler Posteingang: E-Mail, Telefon, Chat – alles an einem Ort', icon: Mail, color: '#60A5FA', category: 'operations', status: 'coming' },
  { id: 'ai', name: 'KI-Summary', description: 'Automatische Zusammenfassungen von Kundengesprächen und Projektstatus', icon: Sparkles, color: '#F472B6', category: 'operations', status: 'coming' },
  { id: 'tasks', name: 'Aufgaben', description: 'Modulübergreifende Aufgaben mit Zuweisung und Wiedervorlage', icon: ClipboardList, color: '#34D399', category: 'operations', status: 'beta' },

  // System (toggleable)
  { id: 'documents', name: 'Dokumente', description: 'Zentrale Dokumentenablage mit Ordnerstruktur pro Entität', icon: FileBox, color: '#FB923C', category: 'system', status: 'coming' },
  { id: 'notifications', name: 'Meldungen', description: 'Push-Benachrichtigungen und Erinnerungen für wichtige Events', icon: Bell, color: '#F87171', category: 'system', status: 'coming' },
  { id: 'export', name: 'Datenexport', description: 'CSV/Excel-Export aller Daten, Backup-Funktionalität', icon: Download, color: '#94A3B8', category: 'system', status: 'coming' },
]

const categoryLabels: Record<string, string> = {
  core: 'Kern-Module',
  sales: 'Vertrieb',
  operations: 'Betrieb',
  system: 'System',
}

const categoryColors: Record<string, string> = {
  core: '#F59E0B',
  sales: '#A78BFA',
  operations: '#60A5FA',
  system: '#94A3B8',
}

const statusConfig = {
  live: { label: 'Live', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  beta: { label: 'Beta', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  coming: { label: 'Geplant', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
}

export default function FeaturesPage() {
  const { flags, toggle } = useFeatureFlags()
  const [filter, setFilter] = useState<'all' | 'core' | 'sales' | 'operations' | 'system'>('all')

  const filtered = filter === 'all' ? features : features.filter((f) => f.category === filter)

  const enabledCount = features.filter((f) => flags[f.id]).length
  const totalCount = features.length

  return (
    <div className="flex-1 flex flex-col gap-5 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[14px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, #A78BFA 12%, transparent), color-mix(in srgb, #A78BFA 4%, transparent))',
              border: '1px solid color-mix(in srgb, #A78BFA 10%, transparent)',
            }}
          >
            <Puzzle size={20} className="text-violet-400" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em]">Features</h1>
            <p className="text-[12px] text-text-sec mt-0.5">
              {enabledCount} von {totalCount} Modulen aktiv · Sidebar wird automatisch angepasst
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex rounded-[10px] p-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'core', 'sales', 'operations', 'system'] as const).map((cat) => {
            const active = filter === cat
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all duration-150 ${
                  active ? 'text-text' : 'text-text-dim hover:text-text-sec'
                }`}
                style={active ? { background: 'rgba(255,255,255,0.08)' } : undefined}
              >
                {cat === 'all' ? 'Alle' : categoryLabels[cat]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((feature) => {
            const enabled = flags[feature.id]
            const status = statusConfig[feature.status]
            const Icon = feature.icon

            return (
              <div
                key={feature.id}
                className="glass-card p-5 transition-all duration-200 group"
                style={{
                  borderColor: enabled ? `color-mix(in srgb, ${feature.color} 15%, transparent)` : undefined,
                  opacity: enabled ? 1 : 0.65,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${feature.color} ${enabled ? '15' : '8'}%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${feature.color} ${enabled ? '20' : '8'}%, transparent)`,
                      }}
                    >
                      <Icon size={18} style={{ color: feature.color }} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-bold">{feature.name}</h3>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  {feature.isCore ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-dim mt-1 shrink-0">
                      <Lock size={10} />
                      <span className="font-semibold">Pflicht</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggle(feature.id)}
                      className="shrink-0 mt-0.5 transition-transform hover:scale-105"
                      title={enabled ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {enabled ? (
                        <ToggleRight size={28} style={{ color: feature.color }} strokeWidth={1.5} />
                      ) : (
                        <ToggleLeft size={28} className="text-text-dim" strokeWidth={1.5} />
                      )}
                    </button>
                  )}
                </div>

                <p className="text-[12px] text-text-sec leading-relaxed mb-3">{feature.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: categoryColors[feature.category] }}
                  >
                    {categoryLabels[feature.category]}
                  </span>
                  {enabled && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#34D399' }}>
                      <Check size={10} strokeWidth={2.5} /> Aktiv
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
