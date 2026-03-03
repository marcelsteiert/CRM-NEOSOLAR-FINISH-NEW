import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import {
  type Deal,
  stageLabels,
  stageColors,
  priorityLabels,
  priorityColors,
  formatCHF,
} from '@/hooks/useDeals'

interface DealTableProps {
  deals: Deal[]
  onSelectDeal: (deal: Deal) => void
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
}

function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== field)
    return <ArrowUpDown size={12} className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
  return sortOrder === 'asc' ? (
    <ArrowUp size={12} className="text-amber" />
  ) : (
    <ArrowDown size={12} className="text-amber" />
  )
}

export default function DealTable({ deals, onSelectDeal, sortBy, sortOrder, onSort }: DealTableProps) {
  if (deals.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[14px] font-semibold text-text mb-1">Keine Deals gefunden</p>
        <p className="text-[12px] text-text-sec">
          Erstelle einen neuen Deal oder passe die Filter an.
        </p>
      </div>
    )
  }

  const columns: { key: string; label: string; sortField?: string }[] = [
    { key: 'title', label: 'Deal', sortField: 'title' },
    { key: 'company', label: 'Unternehmen', sortField: 'company' },
    { key: 'value', label: 'Wert', sortField: 'value' },
    { key: 'stage', label: 'Phase' },
    { key: 'priority', label: 'Prioritaet' },
    { key: 'expectedCloseDate', label: 'Erwarteter Abschluss', sortField: 'expectedCloseDate' },
    { key: 'createdAt', label: 'Erstellt', sortField: 'createdAt' },
  ]

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    'text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5',
                    col.sortField ? 'cursor-pointer select-none group hover:text-text transition-colors' : '',
                  ].join(' ')}
                  onClick={col.sortField ? () => onSort(col.sortField!) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortField && <SortIcon field={col.sortField} sortBy={sortBy} sortOrder={sortOrder} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr
                key={deal.id}
                onClick={() => onSelectDeal(deal)}
                className="border-b border-border cursor-pointer hover:bg-surface-hover transition-colors duration-100"
              >
                {/* Title */}
                <td className="px-6 py-3.5">
                  <div>
                    <p className="text-[13px] font-semibold text-text truncate max-w-[250px]">
                      {deal.title}
                    </p>
                    <p className="text-[11px] text-text-sec">{deal.contactName}</p>
                  </div>
                </td>

                {/* Company */}
                <td className="px-6 py-3.5">
                  <span className="text-[12px] text-text-sec">{deal.company ?? '\u2014'}</span>
                </td>

                {/* Value */}
                <td className="px-6 py-3.5">
                  <span className="text-[13px] font-bold tabular-nums text-amber">
                    {formatCHF(deal.value)}
                  </span>
                </td>

                {/* Stage */}
                <td className="px-6 py-3.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${stageColors[deal.stage]} 12%, transparent)`,
                      color: stageColors[deal.stage],
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: stageColors[deal.stage] }}
                    />
                    {stageLabels[deal.stage]}
                  </span>
                </td>

                {/* Priority */}
                <td className="px-6 py-3.5">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${priorityColors[deal.priority]} 12%, transparent)`,
                      color: priorityColors[deal.priority],
                    }}
                  >
                    {priorityLabels[deal.priority]}
                  </span>
                </td>

                {/* Expected Close */}
                <td className="px-6 py-3.5">
                  <span className="text-[12px] text-text-sec tabular-nums">
                    {deal.expectedCloseDate
                      ? new Date(deal.expectedCloseDate).toLocaleDateString('de-CH')
                      : '\u2014'}
                  </span>
                </td>

                {/* Created */}
                <td className="px-6 py-3.5">
                  <span className="text-[12px] text-text-sec tabular-nums">
                    {new Date(deal.createdAt).toLocaleDateString('de-CH')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
