import { useState, useMemo } from 'react'
import {
  Users,
  Plus,
  List,
  Columns3,
  Search,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import {
  useLeads,
  usePipelines,
  useTags,
  useMoveLead,
  type Lead,
  type LeadSource,
  type LeadStatus,
  sourceLabels,
  statusLabels,
} from '@/hooks/useLeads'
import LeadTable from './components/LeadTable'
import LeadKanban from './components/LeadKanban'
import LeadDetailModal from './components/LeadDetailModal'
import LeadCreateDialog from './components/LeadCreateDialog'

/* ── Filter Tab Type ── */

type StatusFilter = 'ALL' | 'ACTIVE' | 'CONVERTED' | 'LOST'

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
                {/* Name cell with avatar */}
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
                {/* Unternehmen */}
                <td className="px-6 py-4">
                  <div
                    className="h-3.5 rounded-md animate-pulse"
                    style={{
                      width: `${80 + Math.random() * 60}px`,
                      background: 'rgba(255,255,255,0.06)',
                      animationDelay: `${i * 80 + 40}ms`,
                    }}
                  />
                </td>
                {/* Adresse */}
                <td className="px-6 py-4">
                  <div
                    className="h-3.5 rounded-md animate-pulse"
                    style={{
                      width: `${120 + Math.random() * 60}px`,
                      background: 'rgba(255,255,255,0.06)',
                      animationDelay: `${i * 80 + 80}ms`,
                    }}
                  />
                </td>
                {/* Telefon */}
                <td className="px-6 py-4">
                  <div
                    className="h-3.5 rounded-md animate-pulse"
                    style={{
                      width: '110px',
                      background: 'rgba(255,255,255,0.06)',
                      animationDelay: `${i * 80 + 120}ms`,
                    }}
                  />
                </td>
                {/* E-Mail */}
                <td className="px-6 py-4">
                  <div
                    className="h-3.5 rounded-md animate-pulse"
                    style={{
                      width: `${130 + Math.random() * 40}px`,
                      background: 'rgba(255,255,255,0.06)',
                      animationDelay: `${i * 80 + 160}ms`,
                    }}
                  />
                </td>
                {/* Quelle */}
                <td className="px-6 py-4">
                  <div
                    className="h-5 rounded-full animate-pulse"
                    style={{
                      width: '70px',
                      background: 'rgba(255,255,255,0.06)',
                      animationDelay: `${i * 80 + 200}ms`,
                    }}
                  />
                </td>
                {/* Status */}
                <td className="px-6 py-4">
                  <div
                    className="h-5 rounded-full animate-pulse"
                    style={{
                      width: '65px',
                      background: 'rgba(255,255,255,0.06)',
                      animationDelay: `${i * 80 + 240}ms`,
                    }}
                  />
                </td>
                {/* Erstellt */}
                <td className="px-6 py-4">
                  <div
                    className="h-3.5 rounded-md animate-pulse"
                    style={{
                      width: '75px',
                      background: 'rgba(255,255,255,0.06)',
                      animationDelay: `${i * 80 + 280}ms`,
                    }}
                  />
                </td>
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

/* ── Main Component ── */

export default function LeadsPage() {
  /* ── State ── */
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  /* ── Data fetching via React Query ── */
  const {
    data: leadsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useLeads({
    status: statusFilter === 'ALL' ? 'ACTIVE' : statusFilter,
    source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
    search: searchQuery.trim() || undefined,
    sortBy,
    sortOrder,
    pageSize: 100,
  })

  const leads: Lead[] = leadsResponse?.data ?? []

  const { data: pipelinesData } = usePipelines()
  const { data: tagsData } = useTags()
  const moveLead = useMoveLead()

  const buckets = pipelinesData?.data?.[0]?.buckets ?? []
  const tags = tagsData?.data ?? []

  /* ── Client-side filtering (search acts as a backup for instant feedback) ── */
  const filteredLeads = useMemo(() => {
    // The API handles filtering, but we keep client-side search for instant UX
    // while the debounced API call catches up
    return leads
  }, [leads])

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

  /* ── Status filter tabs ── */

  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Aktive Leads' },
    { key: 'CONVERTED', label: 'Konvertiert' },
    { key: 'LOST', label: 'Verloren' },
  ]

  /* ── Source options for dropdown ── */

  const sourceOptions: { value: LeadSource | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Quellen' },
    ...Object.entries(sourceLabels).map(([value, label]) => ({
      value: value as LeadSource,
      label,
    })),
  ]

  return (
    <>
      <div className="space-y-5">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center"
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
                <h1 className="text-xl font-bold tracking-[-0.02em]">Lead Hub</h1>
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
              <p className="text-[12px] text-text-sec mt-0.5">
                Leads verwalten und qualifizieren
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Toggle */}
            <div
              className="flex items-center rounded-full p-0.5"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  viewMode === 'list'
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                <List size={14} strokeWidth={2} />
                Liste
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  viewMode === 'kanban'
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                <Columns3 size={14} strokeWidth={2} />
                Kanban
              </button>
            </div>

            {/* New Lead Button */}
            <button
              type="button"
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[13px]"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              Neuer Lead
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex items-center justify-between gap-4">
          {/* Status Tabs */}
          <div
            className="flex items-center rounded-full p-0.5"
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
                  'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  statusFilter === tab.key
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
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
                className="glass-input pl-9 pr-4 py-2 text-[12px] w-[220px]"
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
        ) : viewMode === 'list' ? (
          <LeadTable
            leads={filteredLeads}
            onSelectLead={handleSelectLead}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            tags={tags}
          />
        ) : (
          <LeadKanban
            leads={filteredLeads}
            onSelectLead={handleSelectLead}
            buckets={buckets}
            tags={tags}
            onMoveLead={(leadId, bucketId) => moveLead.mutate({ id: leadId, bucketId })}
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
    </>
  )
}
