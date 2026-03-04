import { Download, Database, HardDrive, Clock, FileJson, FileSpreadsheet } from 'lucide-react'
import { useDbStats } from '@/hooks/useAdmin'

const ENTITIES = [
  { key: 'leads', label: 'Leads', color: '#34D399' },
  { key: 'appointments', label: 'Termine', color: '#60A5FA' },
  { key: 'deals', label: 'Angebote', color: '#F59E0B' },
  { key: 'tasks', label: 'Aufgaben', color: '#A78BFA' },
  { key: 'documents', label: 'Dokumente', color: '#FB923C' },
  { key: 'users', label: 'Benutzer', color: '#22D3EE' },
]

export default function DatabaseExportSection() {
  const { data: statsResponse } = useDbStats()
  const stats = statsResponse?.data

  return (
    <div className="space-y-4">
      {/* DB Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, #60A5FA 12%, transparent)' }}>
              <Database size={16} className="text-blue-400" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Datenbankgrösse</p>
              <p className="text-[16px] font-extrabold text-blue-400 tabular-nums">{stats.dbSize}</p>
            </div>
          </div>
          <div className="glass-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)' }}>
              <HardDrive size={16} className="text-emerald-400" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Datensätze</p>
              <p className="text-[16px] font-extrabold text-emerald-400 tabular-nums">
                {stats.leads + stats.appointments + stats.deals + stats.tasks + stats.documents + stats.users}
              </p>
            </div>
          </div>
          <div className="glass-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, #A78BFA 12%, transparent)' }}>
              <Clock size={16} className="text-violet-400" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Letztes Backup</p>
              <p className="text-[14px] font-extrabold text-violet-400 tabular-nums">
                {new Date(stats.lastBackup).toLocaleDateString('de-CH')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Cards */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-[13px] font-bold mb-4">Daten exportieren</h3>
        <div className="space-y-2">
          {ENTITIES.map((entity) => {
            const count = stats ? (stats as Record<string, number>)[entity.key] ?? 0 : 0
            return (
              <div
                key={entity.key}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: entity.color }}
                />
                <span className="text-[12px] font-medium text-text flex-1">{entity.label}</span>
                <span className="text-[11px] text-text-dim tabular-nums mr-3">{count} Einträge</span>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-text-sec hover:bg-surface-hover transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <FileSpreadsheet size={11} strokeWidth={2} /> CSV
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-text-sec hover:bg-surface-hover transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <FileJson size={11} strokeWidth={2} /> JSON
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* API Info */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-[13px] font-bold mb-3">API-Zugriff</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-semibold text-text-dim mb-1">Base URL</label>
            <code className="block text-[12px] text-text-sec font-mono bg-bg px-3 py-2 rounded-lg">
              http://localhost:3001/api/v1
            </code>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-dim mb-1">Verfügbare Endpunkte</label>
            <div className="flex flex-wrap gap-1.5">
              {['/leads', '/appointments', '/deals', '/tasks', '/users', '/documents', '/settings', '/pipelines'].map((ep) => (
                <code key={ep} className="text-[10px] text-text-dim font-mono bg-bg px-2 py-1 rounded">{ep}</code>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
