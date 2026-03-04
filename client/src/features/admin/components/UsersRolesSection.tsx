import { useState } from 'react'
import { useUsers } from '@/hooks/useLeads'
import { Shield, Check, X, Pencil } from 'lucide-react'

const ROLES = ['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL'] as const
const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  VERTRIEB: 'Vertrieb',
  PROJEKTLEITUNG: 'Projektleitung',
  BUCHHALTUNG: 'Buchhaltung',
  GL: 'Geschäftsleitung',
}
const roleColors: Record<string, string> = {
  ADMIN: '#A78BFA',
  VERTRIEB: '#34D399',
  PROJEKTLEITUNG: '#60A5FA',
  BUCHHALTUNG: '#F59E0B',
  GL: '#F87171',
}

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'appointments', label: 'Termine' },
  { id: 'deals', label: 'Angebote' },
  { id: 'provision', label: 'Provision' },
  { id: 'calculations', label: 'Kalkulation' },
  { id: 'projects', label: 'Projekte' },
  { id: 'tasks', label: 'Aufgaben' },
  { id: 'admin', label: 'Administration' },
]

export default function UsersRolesSection() {
  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')

  return (
    <div className="space-y-4">
      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'E-Mail', 'Rolle', 'Status'].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                <td className="px-5 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-text">{user.firstName} {user.lastName}</p>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="text-[12px] text-text-sec">{user.email}</span>
                </td>
                <td className="px-5 py-3">
                  {editingId === user.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="px-2 py-1 text-[11px] rounded-lg bg-bg border border-border text-text focus:outline-none focus:border-amber/50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setEditingId(null)} className="text-emerald-400">
                        <Check size={12} strokeWidth={2} />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-text-dim">
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingId(user.id); setEditRole(user.role) }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold hover:opacity-80 transition-opacity"
                      style={{
                        background: `color-mix(in srgb, ${roleColors[user.role] ?? '#94A3B8'} 12%, transparent)`,
                        color: roleColors[user.role] ?? '#94A3B8',
                      }}
                    >
                      <Shield size={10} strokeWidth={2} />
                      {roleLabels[user.role] ?? user.role}
                      <Pencil size={9} strokeWidth={2} className="ml-0.5 opacity-50" />
                    </button>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Aktiv
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Module-Berechtigungen */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-[13px] font-bold mb-4">Modul-Berechtigungen pro Rolle</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 py-2">Modul</th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-2"
                    style={{ color: roleColors[r] }}>
                    {roleLabels[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => (
                <tr key={mod.id} className="border-b border-border">
                  <td className="px-3 py-2 text-[12px] text-text-sec">{mod.label}</td>
                  {ROLES.map((r) => {
                    // Admin + GL have all, others depend on module
                    const hasAccess = r === 'ADMIN' || r === 'GL'
                      || (r === 'VERTRIEB' && ['dashboard', 'leads', 'appointments', 'deals', 'tasks'].includes(mod.id))
                      || (r === 'PROJEKTLEITUNG' && ['dashboard', 'projects', 'calculations', 'tasks'].includes(mod.id))
                      || (r === 'BUCHHALTUNG' && ['dashboard', 'provision', 'deals'].includes(mod.id))
                    return (
                      <td key={r} className="text-center px-3 py-2">
                        <div
                          className="w-5 h-5 rounded mx-auto flex items-center justify-center cursor-pointer"
                          style={{
                            background: hasAccess
                              ? `color-mix(in srgb, ${roleColors[r]} 15%, transparent)`
                              : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          {hasAccess && <Check size={12} strokeWidth={2.5} style={{ color: roleColors[r] }} />}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
