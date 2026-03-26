import { useState } from 'react'
import { useAuditLog } from '@/hooks/useAdmin'
import { useUsers } from '@/hooks/useLeads'
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ScrollText,
  Search, Calendar, Globe, ArrowRight,
} from 'lucide-react'

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

const entityColors: Record<string, string> = {
  LEAD: '#60A5FA',
  DEAL: '#A78BFA',
  APPOINTMENT: '#22D3EE',
  PROJECT: '#F59E0B',
  TASK: '#34D399',
  CONTACT: '#FB923C',
  USER: '#F87171',
  DOCUMENT: '#6EE7B7',
  AUTH: '#A78BFA',
}

/* ── Feldnamen-Übersetzung ── */
const fieldLabels: Record<string, string> = {
  first_name: 'Vorname', last_name: 'Nachname', firstName: 'Vorname', lastName: 'Nachname',
  company: 'Firma', email: 'E-Mail', phone: 'Telefon', address: 'Adresse',
  status: 'Status', source: 'Quelle', value: 'Wert', notes: 'Notizen',
  stage: 'Phase', priority: 'Priorität', title: 'Titel', description: 'Beschreibung',
  assigned_to: 'Zugewiesen an', assignedTo: 'Zugewiesen an',
  win_probability: 'Gewinnwahrsch.', winProbability: 'Gewinnwahrsch.',
  follow_up_date: 'Follow-Up', followUpDate: 'Follow-Up',
  expected_close_date: 'Abschlussdatum', expectedCloseDate: 'Abschlussdatum',
  appointment_date: 'Termindatum', appointmentDate: 'Termindatum',
  appointment_time: 'Terminzeit', appointmentTime: 'Terminzeit',
  appointment_type: 'Terminart', appointmentType: 'Terminart',
  due_date: 'Fällig am', dueDate: 'Fällig am',
  role: 'Rolle', is_active: 'Aktiv', isActive: 'Aktiv',
  allowed_modules: 'Berechtigungen', allowedModules: 'Berechtigungen',
  tags: 'Tags', checklist: 'Checkliste', risk: 'Risiko',
  phase: 'Phase', kwp: 'kWp', name: 'Name',
}

const PAGE_SIZE = 25

/* ── Diff-Viewer für Änderungen ── */
function DiffViewer({ oldData, newData }: { oldData?: Record<string, unknown> | null; newData?: Record<string, unknown> | null }) {
  if (!oldData && !newData) return null

  // Alle geänderten Felder finden
  const allKeys = new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ])

  // Interne/technische Felder ausblenden
  const skipFields = new Set(['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 'deleted_at', 'deletedAt', 'contact_id', 'contactId', 'assigned_by', 'assignedBy', 'password'])

  const changes: { field: string; from: unknown; to: unknown }[] = []
  for (const key of allKeys) {
    if (skipFields.has(key)) continue
    const oldVal = oldData?.[key]
    const newVal = newData?.[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, from: oldVal, to: newVal })
    }
  }

  if (changes.length === 0) return null

  const formatVal = (v: unknown): string => {
    if (v === null || v === undefined) return '–'
    if (typeof v === 'boolean') return v ? 'Ja' : 'Nein'
    if (Array.isArray(v)) return v.length === 0 ? '–' : v.join(', ')
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  return (
    <div className="mt-2 space-y-1">
      {changes.map((c) => (
        <div key={c.field} className="flex items-center gap-2 text-[10px] flex-wrap">
          <span className="font-semibold text-text-dim uppercase tracking-wide min-w-[80px]">
            {fieldLabels[c.field] ?? c.field}
          </span>
          {c.from !== undefined && c.from !== null && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 line-through max-w-[180px] truncate" title={formatVal(c.from)}>
              {formatVal(c.from)}
            </span>
          )}
          <ArrowRight size={10} className="text-text-dim shrink-0" />
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 max-w-[180px] truncate" title={formatVal(c.to)}>
            {formatVal(c.to)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Aufklappbare Log-Zeile ── */
function AuditRow({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false)
  const action = actionLabels[entry.action] ?? { label: entry.action, color: '#94A3B8' }
  const entColor = entityColors[entry.entityType] ?? '#525E6F'
  const hasDetails = entry.oldData || entry.newData || entry.ipAddress || entry.entityId

  return (
    <>
      <tr
        className={[
          'border-b border-border transition-colors cursor-pointer',
          expanded ? 'bg-surface-hover' : 'hover:bg-surface-hover',
        ].join(' ')}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Zeitpunkt */}
        <td className="px-3 sm:px-5 py-2.5">
          <div>
            <p className="text-[11px] font-medium text-text tabular-nums">
              {new Date(entry.createdAt).toLocaleDateString('de-CH')}
            </p>
            <p className="text-[10px] text-text-dim tabular-nums">
              {new Date(entry.createdAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </td>
        {/* Benutzer */}
        <td className="px-3 sm:px-5 py-2.5">
          <span className="text-[12px] font-medium text-text-sec">{entry.userName}</span>
        </td>
        {/* Aktion */}
        <td className="px-3 sm:px-5 py-2.5">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `color-mix(in srgb, ${action.color} 12%, transparent)`, color: action.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: action.color }} />
            {action.label}
          </span>
        </td>
        {/* Bereich */}
        <td className="px-3 sm:px-5 py-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `color-mix(in srgb, ${entColor} 10%, transparent)`, color: entColor }}
          >
            {entityLabels[entry.entityType] ?? entry.entityType}
          </span>
        </td>
        {/* Beschreibung */}
        <td className="px-3 sm:px-5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-sec flex-1 min-w-0 truncate">{entry.description}</span>
            {hasDetails && (
              expanded
                ? <ChevronUp size={12} className="text-text-dim shrink-0" />
                : <ChevronDown size={12} className="text-text-dim shrink-0" />
            )}
          </div>
        </td>
      </tr>
      {/* Aufklappbare Details */}
      {expanded && hasDetails && (
        <tr className="border-b border-border">
          <td colSpan={5} className="px-5 py-3" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <div className="space-y-2">
              {/* Meta-Info */}
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-dim">
                {entry.entityId && (
                  <span className="flex items-center gap-1">
                    <span className="font-semibold uppercase">ID:</span>
                    <code className="font-mono text-text-sec bg-white/[0.04] px-1.5 py-0.5 rounded">{entry.entityId}</code>
                  </span>
                )}
                {entry.ipAddress && (
                  <span className="flex items-center gap-1">
                    <Globe size={10} strokeWidth={2} />
                    <code className="font-mono text-text-sec">{entry.ipAddress}</code>
                  </span>
                )}
              </div>
              {/* Änderungen (Diff) */}
              <DiffViewer oldData={entry.oldData} newData={entry.newData} />
              {/* Rohdaten wenn kein Diff aber Daten vorhanden */}
              {!entry.oldData && entry.newData && (
                <div className="mt-1">
                  <p className="text-[10px] font-semibold text-text-dim uppercase tracking-wide mb-1">Neue Daten</p>
                  <pre className="text-[10px] text-text-sec bg-white/[0.02] rounded-lg p-2 overflow-x-auto max-h-[120px]">
                    {JSON.stringify(entry.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Hauptkomponente ── */

export default function AuditLogSection() {
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const { data: auditResponse, isLoading } = useAuditLog({
    userId: userFilter || undefined,
    action: actionFilter || undefined,
    entity: entityFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const allEntries = auditResponse?.data ?? []
  const total = auditResponse?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []

  // Client-seitige Textsuche in Beschreibung
  const entries = searchQuery.trim()
    ? allEntries.filter((e: any) =>
        (e.description ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (e.userName ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (e.entityId ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : allEntries

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Benutzer-Filter */}
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

          {/* Aktions-Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={handleFilterChange(setActionFilter)}
              className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
              style={{ minWidth: '140px' }}
            >
              <option value="" style={{ background: '#0B0F15' }}>Alle Aktionen</option>
              {Object.entries(actionLabels).map(([k, v]) => (
                <option key={k} value={k} style={{ background: '#0B0F15' }}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
          </div>

          {/* Entity-Filter */}
          <div className="relative">
            <select
              value={entityFilter}
              onChange={handleFilterChange(setEntityFilter)}
              className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
              style={{ minWidth: '140px' }}
            >
              <option value="" style={{ background: '#0B0F15' }}>Alle Bereiche</option>
              {Object.entries(entityLabels).map(([k, v]) => (
                <option key={k} value={k} style={{ background: '#0B0F15' }}>{v}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
          </div>

          <span className="text-[11px] text-text-dim ml-auto tabular-nums shrink-0">
            {total} Einträge
          </span>
        </div>

        {/* Textsuche */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="In Beschreibung suchen..."
            className="glass-input pl-9 pr-4 py-2 text-[12px] w-full"
          />
        </div>
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
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 sm:px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
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
              className="btn-secondary w-10 h-10 flex items-center justify-center rounded-lg disabled:opacity-30"
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn-secondary w-10 h-10 flex items-center justify-center rounded-lg disabled:opacity-30"
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
