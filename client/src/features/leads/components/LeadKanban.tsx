import { type Lead, type KanbanBucket, sourceLabels } from '../LeadsPage'

interface LeadKanbanProps {
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
}

/* ── Column definitions ── */

interface KanbanColumn {
  id: KanbanBucket
  title: string
  color: string
}

const columns: KanbanColumn[] = [
  { id: 'neu', title: 'Neu', color: '#60A5FA' },
  { id: 'kontaktiert', title: 'Kontaktiert', color: '#A78BFA' },
  { id: 'qualifiziert', title: 'Qualifiziert', color: '#F59E0B' },
  { id: 'angebot', title: 'Angebot', color: '#22D3EE' },
  { id: 'verhandlung', title: 'Verhandlung', color: '#34D399' },
]

/* ── Source color mapping ── */

const sourceColors: Record<Lead['source'], { bg: string; text: string }> = {
  HOMEPAGE: {
    bg: 'color-mix(in srgb, #60A5FA 10%, transparent)',
    text: '#60A5FA',
  },
  EMPFEHLUNG: {
    bg: 'color-mix(in srgb, #34D399 10%, transparent)',
    text: '#34D399',
  },
  MESSE: {
    bg: 'color-mix(in srgb, #A78BFA 10%, transparent)',
    text: '#A78BFA',
  },
  TELEFON: {
    bg: 'color-mix(in srgb, #F59E0B 10%, transparent)',
    text: '#F59E0B',
  },
  PARTNER: {
    bg: 'color-mix(in srgb, #22D3EE 10%, transparent)',
    text: '#22D3EE',
  },
  SOCIAL_MEDIA: {
    bg: 'color-mix(in srgb, #A78BFA 10%, transparent)',
    text: '#A78BFA',
  },
  INSERAT: {
    bg: 'color-mix(in srgb, #F59E0B 10%, transparent)',
    text: '#F59E0B',
  },
}

/* ── CHF formatter ── */

function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/* ── Component ── */

export default function LeadKanban({ leads, onSelectLead }: LeadKanbanProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {columns.map((col) => {
        const columnLeads = leads.filter((l) => l.bucketId === col.id)
        const totalValue = columnLeads.reduce((sum, l) => sum + l.value, 0)

        return (
          <div
            key={col.id}
            className="flex-shrink-0 flex flex-col"
            style={{ flex: '0 0 260px' }}
          >
            {/* Column Header */}
            <div className="glass-card px-4 py-3.5 mb-3" style={{ borderRadius: 'var(--radius-md)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Colored dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: col.color,
                      boxShadow: `0 0 8px color-mix(in srgb, ${col.color} 40%, transparent)`,
                    }}
                  />
                  <span className="text-[13px] font-semibold">{col.title}</span>
                  {/* Count badge */}
                  <span
                    className="inline-flex items-center justify-center h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums"
                    style={{
                      background: `color-mix(in srgb, ${col.color} 12%, transparent)`,
                      color: col.color,
                    }}
                  >
                    {columnLeads.length}
                  </span>
                </div>
              </div>
              {/* CHF subtotal */}
              <p className="text-[11px] text-text-dim mt-1 tabular-nums">
                {formatCHF(totalValue)}
              </p>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5 flex-1">
              {columnLeads.map((lead) => {
                const srcC = sourceColors[lead.source]
                return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-lg"
                    style={{
                      background: 'rgba(255,255,255,0.035)',
                      backdropFilter: 'blur(24px) saturate(1.2)',
                      WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      padding: '14px',
                    }}
                  >
                    {/* Lead Name */}
                    <p className="text-[13px] font-semibold leading-snug">
                      {lead.firstName} {lead.lastName}
                    </p>

                    {/* Company */}
                    {lead.company && (
                      <p className="text-[11px] text-text-sec mt-0.5 truncate">
                        {lead.company}
                      </p>
                    )}

                    {/* Value */}
                    <p className="text-[13px] font-bold text-amber mt-2 tabular-nums">
                      {formatCHF(lead.value)}
                    </p>

                    {/* Source badge + Tags row */}
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: srcC.bg,
                          color: srcC.text,
                        }}
                      >
                        {sourceLabels[lead.source]}
                      </span>
                      {lead.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium text-text-dim"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Empty state */}
              {columnLeads.length === 0 && (
                <div
                  className="flex items-center justify-center py-8 text-text-dim text-[11px] font-medium"
                  style={{
                    border: '1px dashed rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                  }}
                >
                  Keine Leads
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
