import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronUp, ChevronDown, Pencil, Trash2, Settings2, RotateCcw, Eye, EyeOff, Plus, X, Filter, ArrowUpNarrowWide, ArrowDownWideNarrow, Search } from 'lucide-react'
import { type Lead, type Tag, type LeadSource, statusLabels, useDeleteLead, useUpdateLead } from '@/hooks/useLeads'
import { useTablePreferences, defaultColumnPrefs, defaultSourceLabels } from '@/hooks/useTablePreferences'
import { useLeadSourceMaps } from '@/hooks/useAdmin'

/* ── Column Filter Types ── */

export type ColumnFilters = Record<string, string | string[]>

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
  columnFilters?: ColumnFilters
  onColumnFilterChange?: (field: string, value: string | string[] | undefined) => void
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

/* ── Source colors (fallback, dynamische aus useLeadSourceMaps) ── */

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
  { key: 'address', sortField: 'address' },
  { key: 'value', sortField: 'value' },
  { key: 'phone', sortField: 'phone' },
  { key: 'email', sortField: 'email' },
  { key: 'source', sortField: 'source' },
  { key: 'status', sortField: 'status' },
  { key: 'tags', sortField: 'tags' },
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
                  style={{ background: defaultSourceColors[key as Lead['source']]?.text ?? '#525E6F' }}
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

/* ── Filterable header component with dropdown ── */

type FilterType = 'text' | 'select' | 'none'

interface FilterableHeaderProps {
  label: string
  sortField?: string
  columnKey: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
  filterType: FilterType
  filterOptions?: { value: string; label: string; color?: string }[]
  filterValue?: string | string[]
  onFilterChange?: (field: string, value: string | string[] | undefined) => void
}

function FilterableHeader({
  label,
  sortField,
  columnKey,
  sortBy,
  sortOrder,
  onSort,
  filterType,
  filterOptions,
  filterValue,
  onFilterChange,
}: FilterableHeaderProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLThElement>(null)
  const isActive = sortField === sortBy
  const isSortable = !!sortField
  const hasFilter = filterType !== 'none'
  const isFiltered = filterValue !== undefined && filterValue !== '' && (Array.isArray(filterValue) ? filterValue.length > 0 : true)

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

  const toggleSelectValue = (val: string) => {
    if (!onFilterChange) return
    const current = (Array.isArray(filterValue) ? filterValue : []) as string[]
    const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val]
    onFilterChange(columnKey, next.length > 0 ? next : undefined)
  }

  return (
    <th
      ref={ref}
      className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 py-3 relative overflow-hidden"
    >
      <button
        type="button"
        onClick={() => hasFilter ? setOpen(v => !v) : isSortable ? onSort(sortField!) : undefined}
        className={[
          'flex items-center gap-1 select-none transition-colors w-full',
          (isSortable || hasFilter) ? 'cursor-pointer hover:text-text-sec' : '',
          (open || isFiltered) ? 'text-amber' : '',
        ].join(' ')}
      >
        <span>{label}</span>
        {isFiltered && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
        )}
        {isSortable && (
          <span className="inline-flex">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ChevronUp size={13} className="text-white/70" />
              ) : (
                <ChevronDown size={13} className="text-white/70" />
              )
            ) : (
              <ChevronDown size={13} className={open ? 'text-amber/60' : 'text-white/15'} />
            )}
          </span>
        )}
      </button>

      {/* ── Filter Dropdown ── */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[200px]"
          style={{
            background: 'rgba(12, 15, 22, 0.97)',
            backdropFilter: 'blur(24px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          }}
        >
          {/* Sort-Optionen */}
          {isSortable && (
            <div className="p-1.5 border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => { onSort(sortField!); if (sortBy === sortField && sortOrder === 'asc') { /* already asc */ } setOpen(false) }}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors',
                  isActive && sortOrder === 'asc' ? 'text-amber bg-amber/[0.08]' : 'text-text-sec hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <ArrowUpNarrowWide size={14} strokeWidth={1.8} />
                Aufsteigend sortieren
              </button>
              <button
                type="button"
                onClick={() => { onSort(sortField!); setOpen(false) }}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors',
                  isActive && sortOrder === 'desc' ? 'text-amber bg-amber/[0.08]' : 'text-text-sec hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <ArrowDownWideNarrow size={14} strokeWidth={1.8} />
                Absteigend sortieren
              </button>
            </div>
          )}

          {/* Text-Filter */}
          {filterType === 'text' && (
            <div className="p-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Filtern..."
                  value={(filterValue as string) ?? ''}
                  onChange={(e) => onFilterChange?.(columnKey, e.target.value || undefined)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-8 pr-3 py-2 text-[12px] text-text outline-none focus:border-amber/40 transition-colors placeholder:text-text-dim/50"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {isFiltered && (
                <button
                  type="button"
                  onClick={() => { onFilterChange?.(columnKey, undefined); setOpen(false) }}
                  className="mt-2 w-full text-center text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  Filter entfernen
                </button>
              )}
            </div>
          )}

          {/* Select-Filter (Checkboxen) */}
          {filterType === 'select' && filterOptions && (
            <div className="py-1.5 max-h-[240px] overflow-y-auto">
              {filterOptions.map((opt) => {
                const checked = Array.isArray(filterValue) && filterValue.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelectValue(opt.value) }}
                    className={[
                      'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                      checked ? 'bg-amber/[0.06]' : 'hover:bg-white/[0.04]',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-all',
                        checked ? 'bg-amber border-amber' : 'border-white/20',
                      ].join(' ')}
                    >
                      {checked && <span className="text-[9px] text-black font-bold">✓</span>}
                    </div>
                    {opt.color && (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
                    )}
                    <span className="text-[11px] font-medium text-text-sec">{opt.label}</span>
                  </button>
                )
              })}
              {isFiltered && (
                <div className="px-3 pt-2 pb-1 border-t border-white/[0.06] mt-1">
                  <button
                    type="button"
                    onClick={() => { onFilterChange?.(columnKey, undefined); setOpen(false) }}
                    className="w-full text-center text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    Alle Filter entfernen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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

const defaultSourceColors: Record<string, { bg: string; text: string }> = {
  HOMEPAGE: { bg: 'color-mix(in srgb, #60A5FA 10%, transparent)', text: '#60A5FA' },
  LANDINGPAGE: { bg: 'color-mix(in srgb, #22D3EE 10%, transparent)', text: '#22D3EE' },
  MESSE: { bg: 'color-mix(in srgb, #A78BFA 10%, transparent)', text: '#A78BFA' },
  EMPFEHLUNG: { bg: 'color-mix(in srgb, #34D399 10%, transparent)', text: '#34D399' },
  KALTAKQUISE: { bg: 'color-mix(in srgb, #F59E0B 10%, transparent)', text: '#F59E0B' },
  SONSTIGE: { bg: 'color-mix(in srgb, #525E6F 10%, transparent)', text: '#525E6F' },
}

function renderCell(
  key: string,
  lead: Lead,
  tagMap: Map<string, Tag>,
  customSourceLabels: Record<string, string>,
  allTags: Tag[],
  dynSourceColors?: Record<string, { bg: string; text: string }>,
) {
  switch (key) {
    case 'name':
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, #F59E0B 20%, transparent), color-mix(in srgb, #F97316 12%, transparent))',
              color: '#F59E0B',
            }}
          >
            {getInitials(lead.firstName, lead.lastName)}
          </div>
          <span className="text-[12px] font-semibold truncate" title={getDisplayName(lead.firstName, lead.lastName)}>
            {getDisplayName(lead.firstName, lead.lastName)}
          </span>
        </div>
      )
    case 'company':
      return (
        <span className="text-[12px] text-text-sec truncate block" title={lead.company || ''}>
          {lead.company || '\u2014'}
        </span>
      )
    case 'address':
      return (
        <span className="text-[12px] text-text-sec truncate block" title={lead.address || ''}>
          {lead.address || '\u2014'}
        </span>
      )
    case 'value':
      return (
        <span className="text-[12px] text-text-sec tabular-nums whitespace-nowrap">
          {lead.value != null ? chfFormatter.format(lead.value) : '\u2014'}
        </span>
      )
    case 'phone':
      return (
        <span className="text-[12px] text-text-sec tabular-nums whitespace-nowrap">
          {lead.phone || '\u2014'}
        </span>
      )
    case 'email':
      return (
        <span className="text-[12px] text-text-sec truncate block" title={lead.email || ''}>
          {lead.email || '\u2014'}
        </span>
      )
    case 'source': {
      const srcC = dynSourceColors?.[lead.source] ?? defaultSourceColors[lead.source] ?? { bg: 'color-mix(in srgb, #525E6F 10%, transparent)', text: '#525E6F' }
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold truncate"
          style={{ background: srcC.bg, color: srcC.text }}
          title={customSourceLabels[lead.source] ?? lead.source}
        >
          {customSourceLabels[lead.source] ?? lead.source}
        </span>
      )
    }
    case 'status': {
      const sc = statusColors[lead.status]
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
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
  columnFilters,
  onColumnFilterChange,
}: LeadTableProps) {
  const deleteLead = useDeleteLead()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { colors: dynSourceColors, labels: dynSourceLabels, sources: dynSources } = useLeadSourceMaps()

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

  // Filter-Optionen pro Spalte berechnen
  const sourceFilterOptions = useMemo(() =>
    dynSources.map(s => ({ value: s.id, label: s.name, color: dynSourceColors[s.id]?.text ?? defaultSourceColors[s.id as LeadSource]?.text })),
    [dynSources, dynSourceColors]
  )
  const statusFilterOptions = useMemo(() =>
    Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v, color: statusColors[k as Lead['status']]?.text })),
    []
  )
  const tagFilterOptions = useMemo(() =>
    tags.map(t => ({ value: t.id, label: t.name, color: t.color })),
    [tags]
  )

  // Welcher Filter-Typ pro Spalte
  const getFilterConfig = (colKey: string): { type: FilterType; options?: { value: string; label: string; color?: string }[] } => {
    switch (colKey) {
      case 'name': return { type: 'text' }
      case 'company': return { type: 'text' }
      case 'address': return { type: 'text' }
      case 'phone': return { type: 'text' }
      case 'email': return { type: 'text' }
      case 'source': return { type: 'select', options: sourceFilterOptions }
      case 'status': return { type: 'select', options: statusFilterOptions }
      case 'tags': return { type: 'select', options: tagFilterOptions }
      default: return { type: 'none' }
    }
  }

  // Aktive Filter zaehlen
  const activeFilterCount = columnFilters ? Object.values(columnFilters).filter(v => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)).length : 0

  // Spaltenbreiten (table-fixed)
  const columnWidths: Record<string, string> = {
    name: '14%',
    company: '14%',
    address: '16%',
    value: '7%',
    phone: '10%',
    email: '14%',
    source: '8%',
    status: '7%',
    tags: '10%',
    createdAt: '8%',
  }

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
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              if (onColumnFilterChange && columnFilters) {
                Object.keys(columnFilters).forEach(k => onColumnFilterChange(k, undefined))
              }
            }}
            className="mt-3 text-[12px] font-medium text-amber hover:text-amber/80 transition-colors"
          >
            {activeFilterCount} Filter entfernen
          </button>
        )}
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
      {/* Filter-Info Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]" style={{ background: 'rgba(245,158,11,0.04)' }}>
          <div className="flex items-center gap-2">
            <Filter size={12} strokeWidth={2} className="text-amber" />
            <span className="text-[11px] font-medium text-amber">
              {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filter'} aktiv
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onColumnFilterChange && columnFilters) {
                Object.keys(columnFilters).forEach(k => onColumnFilterChange(k, undefined))
              }
            }}
            className="text-[10px] font-medium text-text-dim hover:text-amber transition-colors flex items-center gap-1"
          >
            <X size={11} strokeWidth={2} />
            Alle entfernen
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            {onToggleSelect && <col style={{ width: '40px' }} />}
            {visibleColumns.map((col) => (
              <col key={col.key} style={{ width: columnWidths[col.key] ?? 'auto' }} />
            ))}
            <col style={{ width: '90px' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              {onToggleSelect && (
                <th className="pl-4 pr-1 py-3.5 w-8" />
              )}
              {visibleColumns.map((col) => {
                const fc = getFilterConfig(col.key)
                return (
                  <FilterableHeader
                    key={col.key}
                    label={prefs.columns[col.key]?.label ?? defaultColumnPrefs[col.key]?.label ?? col.key}
                    sortField={col.sortField}
                    columnKey={col.key}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    filterType={fc.type}
                    filterOptions={fc.options}
                    filterValue={columnFilters?.[col.key]}
                    onFilterChange={onColumnFilterChange}
                  />
                )
              })}
              <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-2 py-3">
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
                  <td key={col.key} className="px-3 py-2.5 overflow-hidden max-w-0">
                    {renderCell(col.key, lead, tagMap, { ...dynSourceLabels, ...prefs.sourceLabels }, tags, dynSourceColors)}
                  </td>
                ))}

                {/* Aktionen */}
                <td className="px-2 py-2.5">
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
