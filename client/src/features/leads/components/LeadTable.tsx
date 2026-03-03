import { ChevronUp, ChevronDown } from 'lucide-react'
import { type Lead, type Tag, sourceLabels, statusLabels } from '@/hooks/useLeads'

/* ── Props ── */

interface LeadTableProps {
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
  tags: Tag[]
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

interface Column {
  key: string
  label: string
  sortField?: string // if present, column is sortable by this field
}

const columns: Column[] = [
  { key: 'name', label: 'Name', sortField: 'lastName' },
  { key: 'company', label: 'Unternehmen', sortField: 'company' },
  { key: 'value', label: 'Wert', sortField: 'value' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'source', label: 'Quelle' },
  { key: 'status', label: 'Status' },
  { key: 'tags', label: 'Tags' },
  { key: 'createdAt', label: 'Erstellt', sortField: 'createdAt' },
]

/* ── Sortable header component ── */

function SortableHeader({
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: Column
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
}) {
  const isActive = column.sortField === sortBy
  const isSortable = !!column.sortField

  return (
    <th
      className={`text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5 ${
        isSortable ? 'cursor-pointer select-none hover:text-text-sec transition-colors' : ''
      }`}
      onClick={isSortable ? () => onSort(column.sortField!) : undefined}
    >
      <div className="flex items-center gap-1">
        <span>{column.label}</span>
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

/* ── Component ── */

export default function LeadTable({
  leads,
  onSelectLead,
  sortBy,
  sortOrder,
  onSort,
  tags,
}: LeadTableProps) {
  // Build a tag lookup map
  const tagMap = new Map(tags.map((t) => [t.id, t]))

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
              {columns.map((col) => (
                <SortableHeader
                  key={col.key}
                  column={col}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const sc = statusColors[lead.status]
              const srcC = sourceColors[lead.source]

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="border-b border-border cursor-pointer hover:bg-surface-hover transition-colors duration-150"
                >
                  {/* Name */}
                  <td className="px-6 py-4">
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
                  </td>

                  {/* Unternehmen */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec whitespace-nowrap">
                      {lead.company || '\u2014'}
                    </span>
                  </td>

                  {/* Wert */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec tabular-nums whitespace-nowrap">
                      {lead.value != null ? chfFormatter.format(lead.value) : '\u2014'}
                    </span>
                  </td>

                  {/* Telefon */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec tabular-nums whitespace-nowrap">
                      {lead.phone || '\u2014'}
                    </span>
                  </td>

                  {/* E-Mail */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec whitespace-nowrap">
                      {lead.email || '\u2014'}
                    </span>
                  </td>

                  {/* Quelle */}
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                      style={{
                        background: srcC.bg,
                        color: srcC.text,
                      }}
                    >
                      {sourceLabels[lead.source]}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                      style={{
                        background: sc.bg,
                        color: sc.text,
                      }}
                    >
                      {statusLabels[lead.status]}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {lead.tags.map((tagId) => {
                        const tag = tagMap.get(tagId)
                        return (
                          <span
                            key={tagId}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-text-sec whitespace-nowrap"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {tag?.name ?? tagId}
                          </span>
                        )
                      })}
                    </div>
                  </td>

                  {/* Erstellt */}
                  <td className="px-6 py-4">
                    <span className="text-[12px] text-text-dim tabular-nums whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </span>
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
