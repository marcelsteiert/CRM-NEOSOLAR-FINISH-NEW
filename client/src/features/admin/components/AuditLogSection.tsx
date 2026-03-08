import { useState } from 'react'
import { useAuditLog } from '@/hooks/useAdmin'
import { useUsers } from '@/hooks/useLeads'
import { ChevronDown } from 'lucide-react'

const actionLabels: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Erstellt', color: '#34D399' },
  UPDATE: { label: 'Geändert', color: '#60A5FA' },
  DELETE: { label: 'Gelöscht', color: '#F87171' },
  LOGIN: { label: 'Login', color: '#A78BFA' },
  EXPORT: { label: 'Export', color: '#F59E0B' },
  SETTING_CHANGE: { label: 'Einstellung', color: '#FB923C' },
}

export default function AuditLogSection() {
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const { data: auditResponse } = useAuditLog({ userId: userFilter || undefined, action: actionFilter || undefined, pageSize: 30 })
  const entries = auditResponse?.data ?? []

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
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
            onChange={(e) => setActionFilter(e.target.value)}
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
        <span className="text-[11px] text-text-dim ml-auto">
          {auditResponse?.total ?? 0} Einträge
        </span>
      </div>

      {/* Log Table */}
      <div className="glass-card overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
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
                        {new Date(entry.createdAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
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
                    <span className="text-[11px] text-text-dim">{entry.entityType}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="text-[11px] text-text-sec">{entry.description}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
