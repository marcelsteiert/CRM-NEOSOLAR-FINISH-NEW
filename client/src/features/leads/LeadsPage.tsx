import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import {
  useLeads,
  useTags,
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
                        width: `${100 + Math.random() * 40}px`,
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
    pageSize: 100,
  })

  const allLeads: Lead[] = leadsResponse?.data ?? []

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
                style={{ minWidth: '140px' }}
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
                style={{ minWidth: '130px' }}
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
                style={{ minWidth: '140px' }}
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
          <LeadTable
            leads={filteredLeads}
            onSelectLead={handleSelectLead}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            tags={tags}
          />
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
        <LeadImportDialog onClose={() => setImportDialogOpen(false)} />
      )}
    </>
  )
}
