import { useState } from 'react'
import { useAuditLog } from '@/hooks/useAdmin'
import { useUsers } from '@/hooks/useLeads'
import { ChevronDown, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react'

const actionLabels: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Erstellt', color: '#34D399' },
  UPDATE: { label: 'Geändert', color: '#60A5FA' },
  DELETE: { label: 'Gelöscht', color: '#F87171' },
  LOGIN: { label: 'Login', color: '#A78BFA' },
  EXPORT: { label: 'Export', color: '#F59E0B' },
  SETTING_CHANGE: { label: 'Einstellung', color: '#FB923C' },
}

const entityLabels: Record<string, string> = {
  LEAD: 'Lead',
  DEAL: 'Angebot',
  APPOINTMENT: 'Termin',
  PROJECT: 'Projekt',
  TASK: 'Aufgabe',
  CONTACT: 'Kontakt',
  USER: 'Benutzer',
  DOCUMENT: 'Dokument',
  PASSWORD: 'Passwort',
  PIPELINE: 'Pipeline',
  TAG: 'Tag',
  CALENDAR: 'Kalender',
  SETTING: 'Einstellung',
  AUTH: 'Auth',
}

const PAGE_SIZE = 25

export default function AuditLogSection() {
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: auditResponse, isLoading } = useAuditLog({
    userId: userFilter || undefined,
    action: actionFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const entries = auditResponse?.data ?? []
  const total = auditResponse?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative">
          <select
            value={userFilter}
            onChange={handleFilterChange(setUserFilter)}
            className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer w-full sm:w-auto"
            style={{ minWidth: '160px' }}
          >
            <option value="" style={{ background: '#0B0F15' }}>Alle Benutzer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id} style={{ background: '#0B0F15' }}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={actionFilter}
            onChange={handleFilterChange(setActionFilter)}
            className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
            style={{ minWidth: '160px' }}
          >
            <option value="" style={{ background: '#0B0F15' }}>Alle Aktionen</option>
            {Object.entries(actionLabels).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#0B0F15' }}>{v.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
        </div>
        <span className="text-[11px] text-text-dim ml-auto tabular-nums">
          {total} Einträge
        </span>
      </div>

      {/* Log Table */}
      <div className="glass-card overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-text-dim text-[12px]">Lade Audit-Log...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText size={32} className="text-text-dim mx-auto mb-3" strokeWidth={1.2} />
            <p className="text-text-dim text-[13px] font-medium">Keine Audit-Einträge vorhanden</p>
            <p className="text-text-dim text-[11px] mt-1">Aktionen werden automatisch protokolliert sobald Änderungen im System vorgenommen werden.</p>
          </div>
        ) : (
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="border-b border-border">
                {['Zeitpunkt', 'Benutzer', 'Aktion', 'Bereich', 'Beschreibung'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const action = actionLabels[entry.action] ?? { label: entry.action, color: '#94A3B8' }
                return (
                  <tr key={entry.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-2.5">
                      <div>
                        <p className="text-[11px] font-medium text-text tabular-nums">
                          {new Date(entry.createdAt).toLocaleDateString('de-CH')}
                        </p>
                        <p className="text-[10px] text-text-dim tabular-nums">
                          {new Date(entry.createdAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-[12px] font-medium text-text-sec">{entry.userName}</span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: `color-mix(in srgb, ${action.color} 12%, transparent)`, color: action.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: action.color }} />
                        {action.label}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-[11px] text-text-dim">{entityLabels[entry.entityType] ?? entry.entityType}</span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-[11px] text-text-sec">{entry.description}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-dim tabular-nums">
            Seite {page} von {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-secondary w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30"
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn-secondary w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30"
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
