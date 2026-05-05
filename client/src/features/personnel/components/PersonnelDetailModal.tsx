import { useState } from 'react'
import { X, Pencil, Archive, ArchiveRestore, Trash2, Mail, Phone, Smartphone, MapPin, Calendar, Briefcase, CreditCard, AlertCircle, FileText } from 'lucide-react'
import {
  type Personnel, useArchivePersonnel, useRestorePersonnel, useDeletePersonnel,
  contractTypeLabels, contractTypeColors, salaryTypeLabels,
} from '@/hooks/usePersonnel'
import { useAuth } from '@/hooks/useAuth'
import PersonnelDocumentSection from '@/components/ui/PersonnelDocumentSection'
import PersonnelFormModal from './PersonnelFormModal'

interface Props {
  member: Personnel
  onClose: () => void
}

type Tab = 'overview' | 'contract' | 'bank' | 'documents' | 'notes'

const formatDate = (d: string | null) => {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const formatCHF = (n: number | null) => {
  if (n == null) return '–'
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0 }).format(n)
}

export default function PersonnelDetailModal({ member, onClose }: Props) {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const archiveMut = useArchivePersonnel()
  const restoreMut = useRestorePersonnel()
  const deleteMut = useDeletePersonnel()

  const initials = `${(member.firstName ?? '?')[0] ?? ''}${(member.lastName ?? '?')[0] ?? ''}`
  const contractColor = contractTypeColors[member.contractType] ?? '#94A3B8'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'contract', label: 'Vertrag' },
    { id: 'bank', label: 'Bank & Lohn' },
    { id: 'documents', label: 'Dokumente' },
    { id: 'notes', label: 'Notizen' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}>
        <div
          className="w-full max-w-[920px] mx-2 sm:mx-4 max-h-[92vh] flex flex-col"
          style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0" style={{ background: contractColor + '22', color: contractColor }}>
                {initials.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[18px] font-bold tracking-[-0.02em] truncate">{member.firstName} {member.lastName}</h2>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: contractColor + '22', color: contractColor }}>
                    {contractTypeLabels[member.contractType]}
                  </span>
                  {member.archivedAt && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-text-dim" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      Archiviert
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-text-dim mt-0.5 truncate">{member.position ?? '–'}{member.department ? ` · ${member.department}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing(true)} className="w-9 h-9 rounded-lg flex items-center justify-center text-text-dim hover:text-amber hover:bg-surface-hover" title="Bearbeiten">
                <Pencil size={15} strokeWidth={1.8} />
              </button>
              {!member.archivedAt ? (
                <button onClick={() => archiveMut.mutate(member.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-text-dim hover:text-amber hover:bg-surface-hover" title="Archivieren">
                  <Archive size={15} strokeWidth={1.8} />
                </button>
              ) : (
                <button onClick={() => restoreMut.mutate(member.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-text-dim hover:text-amber hover:bg-surface-hover" title="Wiederherstellen">
                  <ArchiveRestore size={15} strokeWidth={1.8} />
                </button>
              )}
              {isAdmin && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => deleteMut.mutate(member.id, { onSuccess: onClose })} className="px-2 py-1 rounded text-[11px] font-bold text-red" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>Wirklich?</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded text-[11px] text-text-dim">Nein</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="w-9 h-9 rounded-lg flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover" title="Löschen">
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                )
              )}
              <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3 sm:px-5 pt-3 shrink-0 overflow-x-auto">
            <div className="inline-flex items-center gap-1 px-1 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
                    tab === t.id
                      ? 'bg-amber text-bg'
                      : 'text-text-dim hover:text-text'
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {tab === 'overview' && (
              <div className="space-y-4">
                <Section title="Kontakt">
                  <Row icon={Mail} label="E-Mail" value={member.email} />
                  <Row icon={Phone} label="Telefon" value={member.phone} />
                  <Row icon={Smartphone} label="Mobile" value={member.mobile} />
                  <Row icon={MapPin} label="Adresse" value={[member.street, [member.zip, member.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null} />
                </Section>
                <Section title="Personal">
                  <Row icon={Calendar} label="Geburtsdatum" value={formatDate(member.birthDate)} />
                  <Row icon={Briefcase} label="Nationalität" value={member.nationality} />
                  <Row icon={AlertCircle} label="AHV-Nummer" value={member.ahvNumber} />
                </Section>
                <Section title="Notfallkontakt">
                  <Row icon={AlertCircle} label="Name" value={member.emergencyContactName} />
                  <Row icon={Phone} label="Telefon" value={member.emergencyContactPhone} />
                </Section>
              </div>
            )}

            {tab === 'contract' && (
              <div className="space-y-4">
                <Section title="Vertragsdaten">
                  <Row icon={Calendar} label="Eintritt" value={formatDate(member.startDate)} />
                  <Row icon={Calendar} label="Austritt" value={formatDate(member.endDate)} />
                  <Row icon={Briefcase} label="Vertragsart" value={contractTypeLabels[member.contractType]} />
                  <Row icon={Briefcase} label="Position" value={member.position} />
                  <Row icon={Briefcase} label="Abteilung" value={member.department} />
                  <Row icon={Calendar} label="Pensum" value={`${member.workloadPct}%`} />
                  <Row icon={Calendar} label="Ferientage / Jahr" value={String(member.vacationDaysPerYear)} />
                </Section>
              </div>
            )}

            {tab === 'bank' && (
              <div className="space-y-4">
                <Section title="Bankverbindung">
                  <Row icon={CreditCard} label="IBAN" value={member.iban} />
                  <Row icon={CreditCard} label="Bank" value={member.bankName} />
                </Section>
                <Section title="Lohn">
                  <Row icon={CreditCard} label="Betrag" value={formatCHF(member.salaryChf)} />
                  <Row icon={CreditCard} label="Typ" value={salaryTypeLabels[member.salaryType]} />
                </Section>
              </div>
            )}

            {tab === 'documents' && (
              <PersonnelDocumentSection personnelId={member.id} />
            )}

            {tab === 'notes' && (
              <Section title="Notizen">
                {member.notes
                  ? <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-text">{member.notes}</p>
                  : <p className="text-[12px] text-text-dim italic flex items-center gap-2"><FileText size={14} /> Keine Notizen erfasst</p>
                }
              </Section>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <PersonnelFormModal
          open={editing}
          member={member}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-dim w-32 shrink-0">{label}</div>
      <div className="text-[13px] text-text flex-1 truncate">{value || '–'}</div>
    </div>
  )
}
