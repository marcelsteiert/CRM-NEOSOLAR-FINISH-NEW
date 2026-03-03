import { type Lead, sourceLabels, statusLabels } from '../LeadsPage'

interface LeadTableProps {
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
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

/* ── Date formatter ── */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/* ── Component ── */

export default function LeadTable({ leads, onSelectLead }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-text-dim text-sm">Keine Leads gefunden.</p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Name
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Unternehmen
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Adresse
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Telefon
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                E-Mail
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Quelle
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Status
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Tags
              </th>
              <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-6 py-3.5">
                Erstellt
              </th>
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
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                        style={{
                          background: `linear-gradient(135deg, color-mix(in srgb, #F59E0B 20%, transparent), color-mix(in srgb, #F97316 12%, transparent))`,
                          color: '#F59E0B',
                        }}
                      >
                        {lead.firstName[0]}
                        {lead.lastName[0]}
                      </div>
                      <span className="text-[13px] font-semibold whitespace-nowrap">
                        {lead.firstName} {lead.lastName}
                      </span>
                    </div>
                  </td>

                  {/* Unternehmen */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec whitespace-nowrap">
                      {lead.company || '\u2014'}
                    </span>
                  </td>

                  {/* Adresse */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec whitespace-nowrap max-w-[200px] truncate block">
                      {lead.address}
                    </span>
                  </td>

                  {/* Telefon */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec tabular-nums whitespace-nowrap">
                      {lead.phone}
                    </span>
                  </td>

                  {/* E-Mail */}
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-sec whitespace-nowrap">
                      {lead.email}
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
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
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
                      {lead.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-text-sec whitespace-nowrap"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
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
