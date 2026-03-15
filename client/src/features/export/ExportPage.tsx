import { useState } from 'react'
import { Download, FileSpreadsheet, FileJson, Database, CheckCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface ExportEntity {
  key: string
  label: string
  description: string
  icon: string
}

const ENTITIES: ExportEntity[] = [
  { key: 'contacts', label: 'Kontakte', description: 'Alle Kontaktdaten inkl. Firma, Adresse, Telefon', icon: '👤' },
  { key: 'leads', label: 'Leads', description: 'Alle Leads mit Quelle, Status, Zuweisung', icon: '🎯' },
  { key: 'appointments', label: 'Termine', description: 'Termine mit Datum, Status, Checkliste', icon: '📅' },
  { key: 'deals', label: 'Angebote', description: 'Deals mit Wert, Phase, Wahrscheinlichkeit', icon: '💰' },
  { key: 'projects', label: 'Projekte', description: 'Projekte mit Phase, Budget, kWp', icon: '🏗️' },
  { key: 'tasks', label: 'Aufgaben', description: 'Tasks mit Priorität, Status, Modul', icon: '✅' },
  { key: 'users', label: 'Benutzer', description: 'User mit Rolle, Berechtigungen', icon: '👥' },
  { key: 'activities', label: 'Aktivitäten', description: 'Alle Aktivitäten-Logs', icon: '📋' },
]

export default function ExportPage() {
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [exporting, setExporting] = useState<string | null>(null)
  const [exported, setExported] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const res = await api.get<{ data: Record<string, number> }>('/admin/db-export/stats')
      setStats(res.data)
    } catch { /* ignore */ }
    setLoadingStats(false)
  }

  // Stats beim ersten Render laden
  if (!stats && !loadingStats) loadStats()

  const exportEntity = async (entity: string) => {
    setExporting(entity)
    try {
      if (format === 'csv') {
        const res = await fetch(`/api/v1/admin/db-export/export/${entity}?format=csv`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${entity}_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const res = await api.get<{ data: unknown[]; total: number }>(`/admin/db-export/export/${entity}?format=json`)
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${entity}_${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      setExported(prev => new Set(prev).add(entity))
    } catch { /* ignore */ }
    setExporting(null)
  }

  const exportAll = async () => {
    for (const entity of ENTITIES) {
      await exportEntity(entity.key)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Download size={20} strokeWidth={1.8} />
            Datenexport
          </h1>
          <p className="text-[11px] text-white/40 mt-0.5 hidden sm:block">
            Exportieren Sie alle CRM-Daten als CSV oder JSON
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Format Toggle */}
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            <button
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
                format === 'csv' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <FileSpreadsheet size={14} strokeWidth={1.8} /> CSV
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
                format === 'json' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <FileJson size={14} strokeWidth={1.8} /> JSON
            </button>
          </div>

          <button onClick={exportAll} className="btn-primary text-xs flex items-center gap-1.5">
            <Download size={14} strokeWidth={1.8} /> Alles exportieren
          </button>
        </div>
      </div>

      {/* DB Stats */}
      {stats && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} strokeWidth={1.8} className="text-white/30" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Datenbank-Übersicht</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {ENTITIES.map(e => (
              <div key={e.key} className="bg-white/[0.02] rounded-lg p-2.5 text-center">
                <div className="text-lg font-semibold text-white">
                  {stats[e.key]?.toLocaleString('de-CH') ?? '—'}
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">{e.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ENTITIES.map(entity => {
          const isExporting = exporting === entity.key
          const isExported = exported.has(entity.key)
          const count = stats?.[entity.key]

          return (
            <div key={entity.key} className="glass-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{entity.icon}</span>
                  {count !== undefined && (
                    <span className="text-[10px] text-white/25 bg-white/[0.04] px-2 py-0.5 rounded">
                      {count.toLocaleString('de-CH')} Einträge
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-white">{entity.label}</h3>
                <p className="text-[10px] text-white/30 mt-0.5">{entity.description}</p>
              </div>
              <button
                onClick={() => exportEntity(entity.key)}
                disabled={isExporting || count === 0}
                className={`mt-3 w-full text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  isExported
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                } disabled:opacity-30`}
              >
                {isExporting ? (
                  <><Loader2 size={14} className="animate-spin" /> Exportiere...</>
                ) : isExported ? (
                  <><CheckCircle size={14} /> Exportiert</>
                ) : (
                  <><Download size={14} strokeWidth={1.8} /> {format.toUpperCase()} exportieren</>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
