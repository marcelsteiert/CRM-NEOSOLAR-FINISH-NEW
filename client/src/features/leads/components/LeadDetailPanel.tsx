import { useState } from 'react'
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  GitBranch,
  User,
  Tag,
  Plus,
  Sparkles,
  PhoneCall,
  Send,
  Handshake,
} from 'lucide-react'
import { type Lead, sourceLabels, statusLabels } from '../LeadsPage'

interface LeadDetailPanelProps {
  lead: Lead
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

/* ── Kanban bucket labels ── */

const bucketLabels: Record<Lead['bucketId'], string> = {
  neu: 'Neu',
  kontaktiert: 'Kontaktiert',
  qualifiziert: 'Qualifiziert',
  angebot: 'Angebot',
  verhandlung: 'Verhandlung',
}

/* ── Tab Type ── */

type DetailTab = 'overview' | 'activities' | 'documents'

/* ── Component ── */

export default function LeadDetailPanel({ lead }: LeadDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  const sc = statusColors[lead.status]
  const initials = `${lead.firstName[0]}${lead.lastName[0]}`

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Uebersicht' },
    { key: 'activities', label: 'Aktivitaeten' },
    { key: 'documents', label: 'Dokumente' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* ── Lead Header ── */}
      <div className="flex items-center gap-3.5 mb-5">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[14px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #F97316)',
            color: '#06080C',
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-snug">
            {lead.firstName} {lead.lastName}
          </h3>
          {lead.company && (
            <p className="text-[12px] text-text-sec truncate">{lead.company}</p>
          )}
        </div>
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
          style={{ background: sc.bg, color: sc.text }}
        >
          {statusLabels[lead.status]}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex items-center rounded-full p-0.5 mb-5"
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex-1 px-3 py-1.5 rounded-full text-[11px] font-semibold text-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
              activeTab === tab.key
                ? 'bg-amber-soft text-amber'
                : 'text-text-dim hover:text-text',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* Contact Info Card */}
            <div
              className="p-4 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">
                Kontaktdaten
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-text-dim shrink-0 mt-0.5" strokeWidth={1.8} />
                  <span className="text-[12px] text-text-sec leading-relaxed">{lead.address}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                  <span className="text-[12px] text-text-sec tabular-nums">{lead.phone}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                  <span className="text-[12px] text-text-sec">{lead.email}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Globe size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                  <span className="text-[12px] text-text-sec">{sourceLabels[lead.source]}</span>
                </div>
              </div>
            </div>

            {/* Pipeline Info Card */}
            <div
              className="p-4 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">
                Pipeline
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <GitBranch size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                  <div className="flex-1">
                    <span className="text-[11px] text-text-dim">Pipeline</span>
                    <p className="text-[12px] text-text-sec font-medium">Solar Hauptpipeline</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: 'color-mix(in srgb, #F59E0B 15%, transparent)',
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#F59E0B' }}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] text-text-dim">Stufe</span>
                    <p className="text-[12px] text-text-sec font-medium">
                      {bucketLabels[lead.bucketId]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <User size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                  <div className="flex-1">
                    <span className="text-[11px] text-text-dim">Zustaendig</span>
                    <p className="text-[12px] text-text-sec font-medium">{lead.assignedTo}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div
              className="p-4"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim flex items-center gap-1.5">
                  <Tag size={12} strokeWidth={1.8} />
                  Tags
                </h4>
                <button
                  type="button"
                  className="w-5 h-5 rounded-full flex items-center justify-center text-text-dim hover:text-amber hover:bg-amber-soft transition-all duration-150"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {lead.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium text-text-sec"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {lead.tags.length === 0 && (
                  <span className="text-[11px] text-text-dim">Keine Tags vorhanden</span>
                )}
              </div>
            </div>

            {/* KI-Summary Card */}
            <div
              className="p-4 relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, #F59E0B 6%, transparent), color-mix(in srgb, #A78BFA 4%, transparent))',
                border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {/* Subtle glow */}
              <div
                className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, color-mix(in srgb, #F59E0B 8%, transparent), transparent 70%)',
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles size={14} className="text-amber" strokeWidth={1.8} />
                  <h4 className="text-[11px] font-bold text-amber uppercase tracking-[0.06em]">
                    KI-Zusammenfassung
                  </h4>
                </div>
                <p className="text-[12px] text-text-sec leading-relaxed">
                  {lead.notes ||
                    'Keine Notizen vorhanden. Die KI-Zusammenfassung wird automatisch generiert, sobald genügend Interaktionsdaten vorliegen.'}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'activities' && (
          <div
            className="p-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p className="text-text-dim text-[12px] font-medium">
              Noch keine Aktivitaeten erfasst.
            </p>
            <p className="text-text-dim text-[11px] mt-1">
              Aktivitaeten werden hier chronologisch angezeigt.
            </p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div
            className="p-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p className="text-text-dim text-[12px] font-medium">
              Keine Dokumente vorhanden.
            </p>
            <p className="text-text-dim text-[11px] mt-1">
              Offerten, Vertraege und weitere Dokumente erscheinen hier.
            </p>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-2.5 pt-5 mt-auto border-t border-border">
        <button
          type="button"
          className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold flex-1 justify-center"
        >
          <PhoneCall size={14} strokeWidth={1.8} />
          Anrufen
        </button>
        <button
          type="button"
          className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold flex-1 justify-center"
        >
          <Send size={14} strokeWidth={1.8} />
          E-Mail
        </button>
        <button
          type="button"
          className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[12px] flex-1 justify-center"
        >
          <Handshake size={14} strokeWidth={2} />
          Deal erstellen
        </button>
      </div>
    </div>
  )
}
