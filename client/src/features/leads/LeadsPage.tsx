import { useState, useMemo, useCallback } from 'react'
import {
  Users,
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Upload,
  Download,
  Tag as TagIcon,
  Trash2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react'
import {
  useLeads,
  useTags,
  useDeleteAllLeads,
  useDeleteLead,
  useUpdateLead,
  type Lead,
  type LeadSource,
  type LeadStatus,
  statusLabels,
} from '@/hooks/useLeads'
import { useTablePreferences } from '@/hooks/useTablePreferences'
import LeadTable from './components/LeadTable'
import LeadDetailModal from './components/LeadDetailModal'
import LeadCreateDialog from './components/LeadCreateDialog'
import LeadImportDialog from './components/LeadImportDialog'
import { useAuth } from '@/hooks/useAuth'

/* ── Filter Tab Type ── */

type StatusFilter = 'ALL' | 'ACTIVE' | 'CONVERTED' | 'LOST' | 'AFTER_SALES'

/* ── Loading Skeleton ── */

function LoadingSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'Unternehmen', 'Adresse', 'Telefon', 'E-Mail', 'Quelle', 'Status', 'Erstellt'].map(
                (header) => (
                  <th
                    key={header}
                    className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full shrink-0 animate-pulse"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    />
                    <div
                      className="h-3.5 rounded-md animate-pulse"
                      style={{
                        width: `${100 + (i % 5) * 10}px`,
                        background: 'rgba(255,255,255,0.06)',
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                </td>
                {[80, 120, 110, 130, 70, 65, 75].map((w, j) => (
                  <td key={j} className="px-6 py-4">
                    <div
                      className={`rounded-${j >= 5 ? 'full' : 'md'} animate-pulse`}
                      style={{
                        width: `${w + Math.random() * (j < 5 ? 40 : 0)}px`,
                        height: j >= 5 ? '20px' : '14px',
                        background: 'rgba(255,255,255,0.06)',
                        animationDelay: `${i * 80 + j * 40}ms`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Error State ── */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-card p-12 text-center">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, #F87171 12%, transparent)',
        }}
      >
        <AlertTriangle size={20} className="text-red-400" strokeWidth={1.8} />
      </div>
      <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden der Leads</p>
      <p className="text-[12px] text-text-sec mb-5">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]"
      >
        <RefreshCw size={14} strokeWidth={2} />
        Erneut versuchen
      </button>
    </div>
  )
}

/* ── CSV Export helper ── */

function exportLeadsCsv(leads: Lead[], sourceLabels: Record<string, string>) {
  const headers = ['Vorname', 'Nachname', 'Unternehmen', 'Adresse', 'Telefon', 'E-Mail', 'Quelle', 'Status', 'Wert', 'Erstellt']
  const rows = leads.map((l) => [
    l.firstName ?? '',
    l.lastName ?? '',
    l.company ?? '',
    l.address,
    l.phone,
    l.email,
    sourceLabels[l.source] ?? l.source,
    statusLabels[l.status],
    l.value != null ? String(l.value) : '',
    l.createdAt,
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/* ── Main Component ── */

export default function LeadsPage() {
  const { isAdmin } = useAuth()
  /* ── State ── */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'ALL'>('ALL')
  const [tagFilter, setTagFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState<'VOR_ORT' | 'ONLINE' | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchAction, setBatchAction] = useState<'delete' | 'status' | null>(null)
  const [batchStatus, setBatchStatus] = useState<LeadStatus>('ACTIVE')

  /* ── Preferences (custom source labels) ── */
  const { prefs } = useTablePreferences()

  /* ── Data fetching via React Query ── */
  const {
    data: leadsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useLeads({
    status: statusFilter === 'ALL' ? 'ACTIVE' : statusFilter as LeadStatus,
    source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
    appointmentType: appointmentTypeFilter !== 'ALL' ? appointmentTypeFilter : undefined,
    search: searchQuery.trim() || undefined,
    sortBy,
    sortOrder,
    pageSize: 500,
  })

  const deleteAllLeads = useDeleteAllLeads()
  const deleteLead = useDeleteLead()
  const updateLead = useUpdateLead()
  const allLeads: Lead[] = leadsResponse?.data ?? []

  // Batch-Helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === allLeads.length) return new Set()
      return new Set(allLeads.map(l => l.id))
    })
  }, [allLeads])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setBatchAction(null)
  }, [])

  const executeBatchDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteLead.mutateAsync(id)
    }
    clearSelection()
    refetch()
  }, [selectedIds, deleteLead, clearSelection, refetch])

  const executeBatchStatus = useCallback(async () => {
    for (const id of selectedIds) {
      await updateLead.mutateAsync({ id, status: batchStatus })
    }
    clearSelection()
    refetch()
  }, [selectedIds, updateLead, batchStatus, clearSelection, refetch])

  const { data: tagsData } = useTags()

  const tags = tagsData?.data ?? []

  /* ── Client-side tag filtering ── */
  const filteredLeads = useMemo(() => {
    if (tagFilter === 'ALL') return allLeads
    return allLeads.filter((lead) => lead.tags.includes(tagFilter))
  }, [allLeads, tagFilter])

  /* ── Handlers ── */

  const handleSelectLead = (lead: Lead) => {
    setSelectedLeadId(lead.id)
  }

  const handleCloseModal = () => {
    setSelectedLeadId(null)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleExport = () => {
    exportLeadsCsv(filteredLeads, prefs.sourceLabels)
  }

  /* ── Permissions ── */
  const canExport = isAdmin
  const canImport = isAdmin

  /* ── Status filter tabs ── */

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Aktive Leads' },
    { key: 'CONVERTED', label: 'Konvertiert' },
    { key: 'AFTER_SALES', label: 'After Sales' },
    { key: 'LOST', label: 'Verloren' },
  ]

  /* ── Source options for dropdown (use custom labels) ── */

  const sourceOptions: { value: LeadSource | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Quellen' },
    ...Object.keys(prefs.sourceLabels).map((key) => ({
      value: key as LeadSource,
      label: prefs.sourceLabels[key],
    })),
  ]

  /* ── Tag options for dropdown ── */

  const tagOptions: { value: string; label: string }[] = [
    { value: 'ALL', label: 'Alle Tags' },
    ...tags.map((t) => ({ value: t.id, label: t.name })),
  ]

  return (
    <>
      <div className="space-y-5">
        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, #60A5FA 12%, transparent), color-mix(in srgb, #60A5FA 4%, transparent))',
                border: '1px solid color-mix(in srgb, #60A5FA 10%, transparent)',
              }}
            >
              <Users size={20} className="text-blue" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">Lead Hub</h1>
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{
                    background: 'color-mix(in srgb, #60A5FA 12%, transparent)',
                    color: '#60A5FA',
                  }}
                >
                  {isLoading ? '\u2014' : leadsResponse?.total ?? filteredLeads.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">
                Leads verwalten und qualifizieren
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* Alle loeschen Button (nur Admin) */}
            {isAdmin && allLeads.length > 0 && !confirmDeleteAll && (
              <button
                type="button"
                className="btn-secondary flex items-center gap-2 px-3 sm:px-4 py-2.5 text-[12px] text-red hover:bg-red/10"
                onClick={() => setConfirmDeleteAll(true)}
              >
                <Trash2 size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Alle löschen</span>
              </button>
            )}
            {isAdmin && confirmDeleteAll && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="px-3 py-2.5 rounded-lg text-[12px] font-semibold text-red"
                  style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}
                  onClick={() => {
                    deleteAllLeads.mutate(undefined, {
                      onSuccess: () => setConfirmDeleteAll(false),
                    })
                  }}
                  disabled={deleteAllLeads.isPending}
                >
                  {deleteAllLeads.isPending ? 'Lösche...' : 'Ja, alle löschen!'}
                </button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-2.5 text-[12px]"
                  onClick={() => setConfirmDeleteAll(false)}
                >
                  Abbrechen
                </button>
              </div>
            )}

            {/* Import button */}
            {canImport && (
              <button
                type="button"
                className="btn-secondary flex items-center gap-2 px-3 sm:px-4 py-2.5 text-[12px]"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {/* Export button */}
            {canExport && (
              <button
                type="button"
                className="btn-secondary flex items-center gap-2 px-3 sm:px-4 py-2.5 text-[12px]"
                onClick={handleExport}
                disabled={filteredLeads.length === 0}
              >
                <Download size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {/* New Lead Button */}
            <button
              type="button"
              className="btn-primary flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[13px] ml-auto sm:ml-0"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Neuer Lead</span>
              <span className="sm:hidden">Neu</span>
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
          {/* Status Tabs */}
          <div
            className="flex items-center rounded-full p-0.5 overflow-x-auto max-w-full"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={[
                  'px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap',
                  statusFilter === tab.key
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full lg:w-auto">
            {/* Tag Dropdown */}
            <div className="relative">
              <TagIcon
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="glass-input appearance-none pl-8 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: 'auto' }}
              >
                {tagOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={{ background: '#0B0F15', color: '#F0F2F5' }}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
            </div>

            {/* Termin-Typ Dropdown */}
            <div className="relative">
              <select
                value={appointmentTypeFilter}
                onChange={(e) => setAppointmentTypeFilter(e.target.value as 'VOR_ORT' | 'ONLINE' | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: 'auto' }}
              >
                <option value="ALL" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Alle Termine</option>
                <option value="VOR_ORT" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Vor Ort</option>
                <option value="ONLINE" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Online</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
            </div>

            {/* Source Dropdown */}
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as LeadSource | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: 'auto' }}
              >
                {sourceOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={{ background: '#0B0F15', color: '#F0F2F5' }}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Leads durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 text-[12px] w-full sm:w-[220px]"
              />
            </div>
          </div>
        </div>

        {/* ── Content View ── */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : 'Ein unerwarteter Fehler ist aufgetreten.'
            }
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {/* Batch-Toolbar */}
            {selectedIds.size > 0 && (
              <div className="glass-card p-3 mb-3 flex items-center gap-3 border border-amber-500/20">
                <span className="text-xs text-amber-400 font-medium">
                  {selectedIds.size} ausgewählt
                </span>
                <div className="h-4 w-px bg-white/10" />
                {batchAction === 'delete' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Wirklich löschen?</span>
                    <button onClick={executeBatchDelete} className="text-[11px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      Ja, löschen
                    </button>
                    <button onClick={() => setBatchAction(null)} className="text-[11px] px-2 py-1 rounded bg-white/[0.04] text-white/40 hover:text-white/60">
                      Abbrechen
                    </button>
                  </div>
                ) : batchAction === 'status' ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="glass-input text-[11px] py-1"
                      value={batchStatus}
                      onChange={e => setBatchStatus(e.target.value as LeadStatus)}
                    >
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button onClick={executeBatchStatus} className="text-[11px] px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                      Anwenden
                    </button>
                    <button onClick={() => setBatchAction(null)} className="text-[11px] px-2 py-1 rounded bg-white/[0.04] text-white/40 hover:text-white/60">
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setBatchAction('status')}
                      className="text-[11px] px-2.5 py-1 rounded bg-white/[0.04] text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                    >
                      Status ändern
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setBatchAction('delete')}
                        className="text-[11px] px-2.5 py-1 rounded bg-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 size={12} className="inline mr-1" />Löschen
                      </button>
                    )}
                  </>
                )}
                <div className="flex-1" />
                <button onClick={clearSelection} className="text-white/20 hover:text-white/50">
                  <X size={14} strokeWidth={1.8} />
                </button>
              </div>
            )}

            {/* Select-All Checkbox */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <button onClick={toggleSelectAll} className="text-white/25 hover:text-white/50">
                {selectedIds.size === allLeads.length && allLeads.length > 0
                  ? <CheckSquare size={16} strokeWidth={1.8} className="text-amber-500" />
                  : <Square size={16} strokeWidth={1.8} />
                }
              </button>
              <span className="text-[10px] text-white/20">
                {selectedIds.size > 0 ? `${selectedIds.size}/${allLeads.length}` : 'Alle auswählen'}
              </span>
            </div>

            <LeadTable
              leads={filteredLeads}
              onSelectLead={handleSelectLead}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              tags={tags}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </>
        )}
      </div>

      {/* ── Detail Modal (centered) ── */}
      {selectedLeadId && (
        <LeadDetailModal leadId={selectedLeadId} onClose={handleCloseModal} />
      )}

      {/* ── Create Dialog ── */}
      {createDialogOpen && (
        <LeadCreateDialog onClose={() => setCreateDialogOpen(false)} />
      )}

      {/* ── Import Dialog ── */}
      {importDialogOpen && (
        <LeadImportDialog
          onClose={() => setImportDialogOpen(false)}
          defaultStatus={statusFilter === 'AFTER_SALES' ? 'AFTER_SALES' : 'ACTIVE'}
        />
      )}
    </>
  )
}
