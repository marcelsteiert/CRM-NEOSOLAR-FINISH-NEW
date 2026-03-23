import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Pencil, Trash2, Settings2, RotateCcw, Eye, EyeOff, Plus, X } from 'lucide-react'
import { type Lead, type Tag, statusLabels, useDeleteLead, useUpdateLead } from '@/hooks/useLeads'
import { useTablePreferences, defaultColumnPrefs, defaultSourceLabels } from '@/hooks/useTablePreferences'

/* ── Props ── */

interface LeadTableProps {
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
  tags: Tag[]
  onEditLead?: (lead: Lead) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

/* ── Status color mapping ── */

const statusColors: Record<Lead['status'], { bg: string; text: string }> = {
  ACTIVE: {
    bg: 'color-mix(in srgb, #34D399 12%, transparent)',
    text: '#34D399',
  },
  CONVERTED: {
    bg: 'color-mix(in srgb, #60A5FA 12%, transparent)',
    text: '#60A5FA',
  },
  LOST: {
    bg: 'color-mix(in srgb, #F87171 12%, transparent)',
    text: '#F87171',
  },
  ARCHIVED: {
    bg: 'color-mix(in srgb, #525E6F 12%, transparent)',
    text: '#525E6F',
  },
  AFTER_SALES: {
    bg: 'color-mix(in srgb, #A78BFA 12%, transparent)',
    text: '#A78BFA',
  },
}

/* ── Source color mapping ── */

const sourceColors: Record<Lead['source'], { bg: string; text: string }> = {
  HOMEPAGE: {
    bg: 'color-mix(in srgb, #60A5FA 10%, transparent)',
    text: '#60A5FA',
  },
  LANDINGPAGE: {
    bg: 'color-mix(in srgb, #22D3EE 10%, transparent)',
    text: '#22D3EE',
  },
  MESSE: {
    bg: 'color-mix(in srgb, #A78BFA 10%, transparent)',
    text: '#A78BFA',
  },
  EMPFEHLUNG: {
    bg: 'color-mix(in srgb, #34D399 10%, transparent)',
    text: '#34D399',
  },
  KALTAKQUISE: {
    bg: 'color-mix(in srgb, #F59E0B 10%, transparent)',
    text: '#F59E0B',
  },
  SONSTIGE: {
    bg: 'color-mix(in srgb, #525E6F 10%, transparent)',
    text: '#525E6F',
  },
}

/* ── Formatters ── */

const chfFormatter = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/* ── Helpers ── */

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.trim()?.[0]?.toUpperCase() ?? ''
  const l = lastName?.trim()?.[0]?.toUpperCase() ?? ''
  return f + l || '--'
}

function getDisplayName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '--'
}

/* ── Column definitions ── */

interface ColumnDef {
  key: string
  sortField?: string
}

const columnDefs: ColumnDef[] = [
  { key: 'name', sortField: 'lastName' },
  { key: 'company', sortField: 'company' },
  { key: 'value', sortField: 'value' },
  { key: 'phone' },
  { key: 'email' },
  { key: 'source' },
  { key: 'status' },
  { key: 'tags' },
  { key: 'createdAt', sortField: 'createdAt' },
]

/* ── Settings Panel ── */

function SettingsPanel({
  prefs,
  onToggleColumn,
  onRenameColumn,
  onRenameSource,
  onReset,
  onClose,
}: {
  prefs: ReturnType<typeof useTablePreferences>['prefs']
  onToggleColumn: (key: string, visible: boolean) => void
  onRenameColumn: (key: string, label: string) => void
  onRenameSource: (key: string, label: string) => void
  onReset: () => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const columnKeys = Object.keys(defaultColumnPrefs)
  const sourceKeys = Object.keys(defaultSourceLabels)

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 z-50 w-[340px] max-h-[70vh] overflow-y-auto"
      style={{
        background: 'rgba(15, 18, 25, 0.95)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <span className="text-[13px] font-bold">Tabelle anpassen</span>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 text-[11px] font-medium text-text-dim hover:text-amber transition-colors"
        >
          <RotateCcw size={12} strokeWidth={2} />
          Zuruecksetzen
        </button>
      </div>

      {/* Columns section */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">
          Spalten
        </p>
        <div className="space-y-1.5">
          {columnKeys.map((key) => {
            const col = prefs.columns[key]
            const isNameCol = key === 'name'
            return (
              <div
                key={key}
                className="flex items-center gap-2 group"
              >
                <button
                  type="button"
                  onClick={() => !isNameCol && onToggleColumn(key, !col.visible)}
                  disabled={isNameCol}
                  className={[
                    'w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 transition-all duration-150',
                    isNameCol
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-surface-hover',
                    col.visible ? 'text-amber' : 'text-text-dim',
                  ].join(' ')}
                  title={isNameCol ? 'Name ist immer sichtbar' : col.visible ? 'Ausblenden' : 'Einblenden'}
                >
                  {col.visible ? <Eye size={13} strokeWidth={2} /> : <EyeOff size={13} strokeWidth={2} />}
                </button>
                <input
                  type="text"
                  value={col.label}
                  onChange={(e) => onRenameColumn(key, e.target.value)}
                  className="flex-1 bg-transparent border-b border-transparent focus:border-amber/40 outline-none text-[12px] font-medium text-text py-1 px-1 transition-colors"
                  spellCheck={false}
                />
                <span className="text-[10px] text-text-dim opacity-0 group-hover:opacity-100 transition-opacity">
                  {defaultColumnPrefs[key].label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Source labels section */}
      <div className="px-4 pt-3 pb-4 border-t border-border mt-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">
          Quellen-Bezeichnungen
        </p>
        <div className="space-y-1.5">
          {sourceKeys.map((key) => {
            const label = prefs.sourceLabels[key]
            return (
              <div
                key={key}
                className="flex items-center gap-2 group"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: sourceColors[key as Lead['source']]?.text ?? '#525E6F' }}
                />
                <input
                  type="text"
                  value={label}
                  onChange={(e) => onRenameSource(key, e.target.value)}
                  className="flex-1 bg-transparent border-b border-transparent focus:border-amber/40 outline-none text-[12px] font-medium text-text py-1 px-1 transition-colors"
                  spellCheck={false}
                />
                <span className="text-[10px] text-text-dim opacity-0 group-hover:opacity-100 transition-opacity">
                  {defaultSourceLabels[key]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Sortable header component ── */

function SortableHeader({
  label,
  sortField,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string
  sortField?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
}) {
  const isActive = sortField === sortBy
  const isSortable = !!sortField

  return (
    <th
      className={`text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 sm:px-6 py-3.5 ${
        isSortable ? 'cursor-pointer select-none hover:text-text-sec transition-colors' : ''
      }`}
      onClick={isSortable ? () => onSort(sortField!) : undefined}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isSortable && (
          <span className="inline-flex">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ChevronUp size={13} className="text-white/70" />
              ) : (
                <ChevronDown size={13} className="text-white/70" />
              )
            ) : (
              <ChevronDown size={13} className="text-white/15" />
            )}
          </span>
        )}
      </div>
    </th>
  )
}

/* ── Inline Tag Picker ── */

function InlineTagCell({
  lead,
  tagMap,
  allTags,
}: {
  lead: Lead
  tagMap: Map<string, Tag>
  allTags: Tag[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const updateLead = useUpdateLead()

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const toggleTag = (tagId: string) => {
    const newTags = lead.tags.includes(tagId)
      ? lead.tags.filter((t) => t !== tagId)
      : [...lead.tags, tagId]
    updateLead.mutate({ id: lead.id, tags: newTags })
  }

  const removeTag = (tagId: string) => {
    updateLead.mutate({ id: lead.id, tags: lead.tags.filter((t) => t !== tagId) })
  }

  return (
    <div ref={ref} className="relative flex items-center gap-1 flex-wrap">
      {lead.tags.map((tagId) => {
        const tag = tagMap.get(tagId)
        return (
          <span
            key={tagId}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-text-sec whitespace-nowrap group/tag"
            style={{
              background: tag?.color ? `color-mix(in srgb, ${tag.color} 15%, transparent)` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tag?.color ? `color-mix(in srgb, ${tag.color} 20%, transparent)` : 'rgba(255,255,255,0.06)'}`,
              color: tag?.color || undefined,
            }}
          >
            {tag?.name ?? tagId}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tagId) }}
              className="opacity-0 group-hover/tag:opacity-100 transition-opacity ml-0.5"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        )
      })}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="w-5 h-5 rounded-full flex items-center justify-center text-text-dim hover:text-amber hover:bg-amber-soft transition-all shrink-0"
        title="Tag hinzufuegen"
      >
        <Plus size={12} strokeWidth={2.5} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-[180px] py-1.5 max-h-[200px] overflow-y-auto"
          style={{
            background: 'rgba(15, 18, 25, 0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {allTags.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-text-dim">Keine Tags verfügbar</p>
          ) : (
            allTags.map((tag) => {
              const isActive = lead.tags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleTag(tag.id) }}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                    isActive ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                  ].join(' ')}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: tag.color || '#525E6F' }}
                  />
                  <span className="text-[11px] font-medium flex-1">{tag.name}</span>
                  {isActive && (
                    <span className="text-[10px] font-bold text-amber">✓</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/* ── Cell renderer ── */

function renderCell(
  key: string,
  lead: Lead,
  tagMap: Map<string, Tag>,
  customSourceLabels: Record<string, string>,
  allTags: Tag[],
) {
  switch (key) {
    case 'name':
      return (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, #F59E0B 20%, transparent), color-mix(in srgb, #F97316 12%, transparent))',
              color: '#F59E0B',
            }}
          >
            {getInitials(lead.firstName, lead.lastName)}
          </div>
          <span className="text-[13px] font-semibold whitespace-nowrap">
            {getDisplayName(lead.firstName, lead.lastName)}
          </span>
        </div>
      )
    case 'company':
      return (
        <span className="text-[13px] text-text-sec whitespace-nowrap">
          {lead.company || '\u2014'}
        </span>
      )
    case 'value':
      return (
        <span className="text-[13px] text-text-sec tabular-nums whitespace-nowrap">
          {lead.value != null ? chfFormatter.format(lead.value) : '\u2014'}
        </span>
      )
    case 'phone':
      return (
        <span className="text-[13px] text-text-sec tabular-nums whitespace-nowrap">
          {lead.phone || '\u2014'}
        </span>
      )
    case 'email':
      return (
        <span className="text-[13px] text-text-sec whitespace-nowrap">
          {lead.email || '\u2014'}
        </span>
      )
    case 'source': {
      const srcC = sourceColors[lead.source]
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{ background: srcC.bg, color: srcC.text }}
        >
          {customSourceLabels[lead.source] ?? lead.source}
        </span>
      )
    }
    case 'status': {
      const sc = statusColors[lead.status]
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{ background: sc.bg, color: sc.text }}
        >
          {statusLabels[lead.status]}
        </span>
      )
    }
    case 'tags':
      return <InlineTagCell lead={lead} tagMap={tagMap} allTags={allTags} />
    case 'createdAt':
      return (
        <span className="text-[12px] text-text-dim tabular-nums whitespace-nowrap">
          {formatDate(lead.createdAt)}
        </span>
      )
    default:
      return null
  }
}

/* ── Component ── */

export default function LeadTable({
  leads,
  onSelectLead,
  sortBy,
  sortOrder,
  onSort,
  tags,
  onEditLead,
  selectedIds,
  onToggleSelect,
}: LeadTableProps) {
  const deleteLead = useDeleteLead()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const {
    prefs,
    setColumnVisible,
    setColumnLabel,
    setSourceLabel,
    resetAll,
  } = useTablePreferences()

  const tagMap = new Map(tags.map((t) => [t.id, t]))

  // Filter visible columns
  const visibleColumns = columnDefs.filter((col) => prefs.columns[col.key]?.visible !== false)

  if (leads.length === 0) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p className="text-text-dim text-sm">Keine Leads gefunden.</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {onToggleSelect && (
                <th className="pl-4 pr-1 py-3.5 w-8" />
              )}
              {visibleColumns.map((col) => (
                <SortableHeader
                  key={col.key}
                  label={prefs.columns[col.key]?.label ?? defaultColumnPrefs[col.key]?.label ?? col.key}
                  sortField={col.sortField}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              ))}
              <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 sm:px-6 py-3.5">
                <div className="flex items-center justify-end gap-2 relative">
                  <span>Aktionen</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSettingsOpen((v) => !v)
                    }}
                    className={[
                      'w-6 h-6 rounded-[6px] flex items-center justify-center transition-all duration-150',
                      settingsOpen
                        ? 'text-amber bg-amber-soft'
                        : 'text-text-dim hover:text-text hover:bg-surface-hover',
                    ].join(' ')}
                    title="Tabelle anpassen"
                  >
                    <Settings2 size={13} strokeWidth={2} />
                  </button>
                  {settingsOpen && (
                    <SettingsPanel
                      prefs={prefs}
                      onToggleColumn={setColumnVisible}
                      onRenameColumn={setColumnLabel}
                      onRenameSource={setSourceLabel}
                      onReset={resetAll}
                      onClose={() => setSettingsOpen(false)}
                    />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="border-b border-border cursor-pointer hover:bg-surface-hover transition-colors duration-150"
              >
                {/* Batch-Checkbox */}
                {onToggleSelect && (
                  <td className="pl-4 pr-1 py-4 w-8">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(lead.id) }}
                      className="text-white/25 hover:text-white/50"
                    >
                      {selectedIds?.has(lead.id)
                        ? <span className="text-amber-500">☑</span>
                        : <span>☐</span>
                      }
                    </button>
                  </td>
                )}
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-3 sm:px-6 py-3 sm:py-4">
                    {renderCell(col.key, lead, tagMap, prefs.sourceLabels, tags)}
                  </td>
                ))}

                {/* Aktionen */}
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center justify-end gap-1.5">
                    {confirmDeleteId === lead.id ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteLead.mutate(lead.id)
                            setConfirmDeleteId(null)
                          }}
                          className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold text-red transition-all duration-150"
                          style={{
                            background: 'color-mix(in srgb, #F87171 12%, transparent)',
                          }}
                        >
                          Ja, löschen
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteId(null)
                          }}
                          className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold text-text-dim hover:text-text transition-all duration-150"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                          }}
                        >
                          Nein
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onEditLead) {
                              onEditLead(lead)
                            } else {
                              onSelectLead(lead)
                            }
                          }}
                          aria-label="Lead bearbeiten"
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-amber hover:bg-amber-soft transition-all duration-150"
                        >
                          <Pencil size={14} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteId(lead.id)
                          }}
                          aria-label="Lead löschen"
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-red hover:bg-red/10 transition-all duration-150"
                        >
                          <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
