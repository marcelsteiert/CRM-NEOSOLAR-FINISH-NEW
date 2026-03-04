import { useState, useEffect, useRef } from 'react'
import {
  X, Pencil, Check, Phone, Mail, MapPin, Building2, Calendar, Clock,
  Trash2, ChevronDown, FileText, ArrowRight, Car, AlertTriangle, Globe,
} from 'lucide-react'
import {
  useAppointment, useUpdateAppointment, useDeleteAppointment,
  statusLabels, statusColors, priorityLabels, priorityColors,
  appointmentTypeLabels, appointmentTypeColors,
  type AppointmentStatus, type AppointmentPriority, type AppointmentType, type ChecklistItem,
} from '@/hooks/useAppointments'
import { useCreateDeal } from '@/hooks/useDeals'
import DocumentSection from '@/components/ui/DocumentSection'

interface Props {
  appointmentId: string
  onClose: () => void
}

function relativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  if (diffH < 24) return `vor ${diffH} Std.`
  if (diffD < 7) return `vor ${diffD} Tagen`
  return new Date(date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AppointmentDetailModal({ appointmentId, onClose }: Props) {
  const { data: response, isLoading } = useAppointment(appointmentId)
  const appt = response?.data ?? null

  const updateAppt = useUpdateAppointment()
  const deleteAppt = useDeleteAppointment()
  const createDeal = useCreateDeal()

  const [isEditing, setIsEditing] = useState(false)
  const [editContactName, setEditContactName] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('GEPLANT')
  const [editPriority, setEditPriority] = useState<AppointmentPriority>('MEDIUM')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editPrepNotes, setEditPrepNotes] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCreateOffer, setShowCreateOffer] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (appt) {
      setEditContactName(appt.contactName)
      setEditContactEmail(appt.contactEmail)
      setEditContactPhone(appt.contactPhone)
      setEditCompany(appt.company ?? '')
      setEditAddress(appt.address)
      setEditStatus(appt.status)
      setEditPriority(appt.priority)
      setEditDate(appt.appointmentDate ?? '')
      setEditTime(appt.appointmentTime ?? '')
      setEditPrepNotes(appt.preparationNotes ?? '')
      setEditNotes(appt.notes ?? '')
    }
  }, [appt])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false)
        else if (showCreateOffer) setShowCreateOffer(false)
        else if (isEditing) setIsEditing(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, isEditing, showDeleteConfirm, showCreateOffer])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  const handleSave = () => {
    if (!appt) return
    updateAppt.mutate({
      id: appt.id,
      contactName: editContactName.trim(),
      contactEmail: editContactEmail.trim(),
      contactPhone: editContactPhone.trim(),
      company: editCompany.trim() || undefined,
      address: editAddress.trim(),
      status: editStatus,
      priority: editPriority,
      appointmentDate: editDate || undefined,
      appointmentTime: editTime || undefined,
      preparationNotes: editPrepNotes.trim() || undefined,
      notes: editNotes.trim() || undefined,
    })
    setIsEditing(false)
    setSuccessMsg('Änderungen gespeichert')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  const handleChecklistToggle = (itemId: string) => {
    if (!appt) return
    const updated = appt.checklist.map((c) =>
      c.id === itemId ? { ...c, checked: !c.checked } : c,
    )
    updateAppt.mutate({ id: appt.id, checklist: updated } as never)
  }

  const handleDelete = () => {
    if (!appt) return
    deleteAppt.mutate(appt.id)
    setShowDeleteConfirm(false)
    setSuccessMsg('Termin gelöscht')
    setTimeout(() => { setSuccessMsg(''); onClose() }, 1200)
  }

  const handleCreateOffer = async () => {
    if (!appt) return
    const title = appt.company
      ? `Offerte ${appt.company}`
      : `Offerte ${appt.contactName}`
    try {
      await createDeal.mutateAsync({
        title,
        contactName: appt.contactName,
        contactEmail: appt.contactEmail,
        contactPhone: appt.contactPhone,
        company: appt.company ?? undefined,
        address: appt.address,
        value: appt.value,
        assignedTo: appt.assignedTo ?? undefined,
        appointmentId: appt.id,
        leadId: appt.leadId ?? undefined,
        notes: appt.notes ?? undefined,
        stage: 'ERSTELLT',
      })
      updateAppt.mutate({ id: appt.id, status: 'DURCHGEFUEHRT' as AppointmentStatus })
      setShowCreateOffer(false)
      setSuccessMsg('Angebot erstellt! Termin abgeschlossen.')
      setTimeout(() => { setSuccessMsg(''); onClose() }, 1500)
    } catch {
      setSuccessMsg('')
    }
  }

  if (isLoading || !appt) {
    return (
      <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="w-12 h-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  const isClosed = appt.status === 'DURCHGEFUEHRT' || appt.status === 'ABGESAGT'
  const checkedCount = appt.checklist.filter((c) => c.checked).length
  const totalCount = appt.checklist.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div role="dialog" aria-modal="true" className="outline-none w-full max-w-[640px] mx-4 max-h-[90vh] flex flex-col" style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-bold tracking-[-0.02em] truncate">{appt.contactName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${statusColors[appt.status]} 12%, transparent)`, color: statusColors[appt.status] }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[appt.status] }} />
                {statusLabels[appt.status]}
              </span>
              <span className="text-[11px] text-text-dim">Erstellt {relativeTime(appt.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isClosed && (
              <button type="button" onClick={() => { if (isEditing) handleSave(); else setIsEditing(true) }} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all">
                {isEditing ? <Check size={16} strokeWidth={2} /> : <Pencil size={16} strokeWidth={1.8} />}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Schliessen" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all">
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-[10px] text-[12px] font-semibold text-emerald-400" style={{ background: 'color-mix(in srgb, #34D399 8%, transparent)', border: '1px solid color-mix(in srgb, #34D399 20%, transparent)' }}>
            {successMsg}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Date/Time + Fahrzeit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, #34D399 6%, transparent)', border: '1px solid color-mix(in srgb, #34D399 15%, transparent)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">Termin</p>
              {isEditing ? (
                <div className="flex gap-2">
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="glass-input px-2 py-1 text-[13px] flex-1" />
                  <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="glass-input px-2 py-1 text-[13px] w-24" />
                </div>
              ) : (
                <p className="text-[18px] font-extrabold tabular-nums text-emerald-400">
                  {appt.appointmentDate ? `${new Date(appt.appointmentDate).toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' })}` : '\u2014'}
                  {appt.appointmentTime && <span className="text-[14px] font-bold ml-2">{appt.appointmentTime}</span>}
                </p>
              )}
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, #60A5FA 6%, transparent)', border: '1px solid color-mix(in srgb, #60A5FA 15%, transparent)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">Fahrzeit ab St. Margrethen</p>
              <div className="flex items-center gap-2">
                <Car size={16} className="text-blue-400" strokeWidth={1.8} />
                {appt.travelMinutes != null ? (
                  <p className="text-[18px] font-extrabold tabular-nums text-blue-400">
                    {appt.travelMinutes >= 60
                      ? `${Math.floor(appt.travelMinutes / 60)}h ${appt.travelMinutes % 60 > 0 ? `${appt.travelMinutes % 60}m` : ''}`
                      : `${appt.travelMinutes}m`}
                  </p>
                ) : (
                  <p className="text-[14px] font-semibold text-text-dim">Unbekannt</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Kontakt</p>
            {[
              { icon: Building2, value: isEditing ? <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Unternehmen" className="glass-input px-3 py-1 text-[12px] flex-1" /> : <span className="text-[12px] text-text-sec">{appt.company ?? '\u2014'}</span> },
              { icon: Phone, value: isEditing ? <input type="tel" value={editContactPhone} onChange={(e) => setEditContactPhone(e.target.value)} className="glass-input px-3 py-1 text-[12px] flex-1 tabular-nums" /> : <span className="text-[12px] text-text-sec tabular-nums">{appt.contactPhone}</span> },
              { icon: Mail, value: isEditing ? <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} className="glass-input px-3 py-1 text-[12px] flex-1" /> : <span className="text-[12px] text-text-sec">{appt.contactEmail}</span> },
              { icon: MapPin, value: isEditing ? <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="glass-input px-3 py-1 text-[12px] flex-1" /> : <span className="text-[12px] text-text-sec">{appt.address}</span> },
            ].map(({ icon: Icon, value }, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Icon size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                {value}
              </div>
            ))}
          </div>

          {/* Status, Priority & Type */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Status</p>
              {isEditing ? (
                <div className="relative">
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as AppointmentStatus)} className="glass-input appearance-none w-full px-3 py-1.5 pr-8 text-[12px] cursor-pointer">
                    {Object.entries(statusLabels).map(([k, l]) => <option key={k} value={k} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{l}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${statusColors[appt.status]} 12%, transparent)`, color: statusColors[appt.status] }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[appt.status] }} />
                  {statusLabels[appt.status]}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Priorität</p>
              {isEditing ? (
                <div className="relative">
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as AppointmentPriority)} className="glass-input appearance-none w-full px-3 py-1.5 pr-8 text-[12px] cursor-pointer">
                    {Object.entries(priorityLabels).map(([k, l]) => <option key={k} value={k} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{l}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                </div>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${priorityColors[appt.priority]} 12%, transparent)`, color: priorityColors[appt.priority] }}>
                  {priorityLabels[appt.priority]}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Termin-Typ</p>
              <button
                type="button"
                onClick={() => {
                  const next = appt.appointmentType === 'VOR_ORT' ? 'ONLINE' : 'VOR_ORT'
                  updateAppt.mutate({ id: appt.id, appointmentType: next })
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  background: `color-mix(in srgb, ${appointmentTypeColors[appt.appointmentType]} 12%, transparent)`,
                  color: appointmentTypeColors[appt.appointmentType],
                }}
                title="Klicken zum Wechseln"
              >
                {appt.appointmentType === 'ONLINE' ? <Globe size={12} strokeWidth={2} /> : <MapPin size={12} strokeWidth={2} />}
                {appointmentTypeLabels[appt.appointmentType]}
              </button>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Vorbereitungs-Checkliste</p>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: progress === 100 ? '#34D399' : progress >= 50 ? '#F59E0B' : '#F87171' }}>
                {checkedCount}/{totalCount} ({progress}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: progress === 100 ? '#34D399' : progress >= 50 ? '#F59E0B' : '#F87171' }} />
            </div>
            <div className="space-y-1">
              {appt.checklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !isClosed && handleChecklistToggle(item.id)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    isClosed ? 'cursor-default' : 'hover:bg-surface-hover/50 cursor-pointer',
                  ].join(' ')}
                >
                  <div
                    className="w-4.5 h-4.5 rounded-md flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      width: '18px', height: '18px',
                      background: item.checked ? 'color-mix(in srgb, #34D399 20%, transparent)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${item.checked ? '#34D399' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {item.checked && <Check size={12} className="text-emerald-400" strokeWidth={2.5} />}
                  </div>
                  <span className={`text-[12px] ${item.checked ? 'text-text-sec line-through' : 'text-text'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preparation Notes */}
          {(appt.preparationNotes || isEditing) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Vorbereitungsnotizen</p>
              {isEditing ? (
                <textarea value={editPrepNotes} onChange={(e) => setEditPrepNotes(e.target.value)} rows={3} className="glass-input w-full px-3 py-2 text-[12px] resize-none" />
              ) : (
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-text-dim shrink-0 mt-0.5" strokeWidth={1.8} />
                  <p className="text-[12px] text-text-sec whitespace-pre-wrap">{appt.preparationNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Notizen</p>
            {isEditing ? (
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="glass-input w-full px-3 py-2 text-[12px] resize-none" />
            ) : (
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-text-dim shrink-0 mt-0.5" strokeWidth={1.8} />
                <p className="text-[12px] text-text-sec whitespace-pre-wrap">{appt.notes ?? 'Keine Notizen.'}</p>
              </div>
            )}
          </div>

          {/* Dokumente */}
          <DocumentSection entityType="TERMIN" entityId={appt.id} />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          {showDeleteConfirm && (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-[12px] text-red flex-1">Termin endgültig löschen?</span>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary px-3 py-1.5 text-[11px]">Abbrechen</button>
              <button type="button" onClick={handleDelete} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: '#F87171' }}>Löschen</button>
            </div>
          )}

          {showCreateOffer && (
            <div className="mb-3">
              {progress < 100 ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl mb-2" style={{ background: 'color-mix(in srgb, #F59E0B 8%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 20%, transparent)' }}>
                  <AlertTriangle size={16} className="text-amber shrink-0" strokeWidth={2} />
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-amber">Checkliste nicht vollstaendig ({checkedCount}/{totalCount})</p>
                    <p className="text-[11px] text-text-sec mt-0.5">Bitte alle Punkte abschliessen bevor ein Angebot erstellt wird.</p>
                  </div>
                  <button type="button" onClick={() => setShowCreateOffer(false)} className="btn-secondary px-3 py-1.5 text-[11px] shrink-0">OK</button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-[12px] text-emerald-400 flex-1">Checkliste vollstaendig! Angebot jetzt erstellen?</span>
                  <button type="button" onClick={() => setShowCreateOffer(false)} className="btn-secondary px-3 py-1.5 text-[11px]">Abbrechen</button>
                  <button type="button" onClick={handleCreateOffer} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: '#34D399' }}>Angebot erstellen</button>
                </div>
              )}
            </div>
          )}

          {!showDeleteConfirm && !showCreateOffer && (
            <div className="flex items-center gap-2">
              {!isClosed && (
                <button type="button" onClick={() => setShowCreateOffer(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-emerald-400 hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(52,211,153,0.15)' }}>
                  <ArrowRight size={14} strokeWidth={1.8} />
                  Angebot erstellen
                </button>
              )}

              <a href={`tel:${appt.contactPhone}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-text-sec hover:text-text hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Phone size={14} strokeWidth={1.8} />
                Anrufen
              </a>

              <div className="flex-1" />

              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
                <Trash2 size={14} strokeWidth={1.8} />
                Löschen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
