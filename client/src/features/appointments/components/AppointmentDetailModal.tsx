import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Pencil, Check, Phone, Mail, MapPin, Building2, Clock,
  Trash2, ChevronDown, FileText, ArrowRight, Car, AlertTriangle, Globe, CalendarPlus,
} from 'lucide-react'
import {
  useAppointment, useUpdateAppointment, useDeleteAppointment,
  statusLabels, statusColors, priorityLabels, priorityColors,
  appointmentTypeLabels, appointmentTypeColors,
  type AppointmentStatus, type AppointmentPriority, type AppointmentType,
} from '@/hooks/useAppointments'
import { useCreateDeal } from '@/hooks/useDeals'
import { useUsers, useUpdateLead } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import DocumentSection from '@/components/ui/DocumentSection'
import EmailSection from '@/components/ui/EmailSection'
import TaskSection from '@/components/ui/TaskSection'
import ContactTimeline from '@/components/ui/ContactTimeline'

interface Props {
  appointmentId: string
  onClose: () => void
}

type DetailTab = 'overview' | 'activities' | 'notes' | 'documents' | 'emails' | 'checklist' | 'tasks' | 'timeline'

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
  const { isAdmin, user } = useAuth()

  const updateAppt = useUpdateAppointment()
  const deleteAppt = useDeleteAppointment()
  const createDeal = useCreateDeal()
  const updateLead = useUpdateLead()

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []

  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
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
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleType, setRescheduleType] = useState<AppointmentType>('VOR_ORT')
  const [rescheduleAddress, setRescheduleAddress] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [rescheduleAssignedTo, setRescheduleAssignedTo] = useState('')
  const [showLostConfirm, setShowLostConfirm] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Notes (auto-save)
  const [notesText, setNotesText] = useState('')
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null)

  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

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
      setNotesText(appt.notes ?? '')
    }
  }, [appt])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false)
        else if (showCreateOffer) setShowCreateOffer(false)
        else if (showReschedule) setShowReschedule(false)
        else if (showLostConfirm) setShowLostConfirm(false)
        else if (isEditing) setIsEditing(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, isEditing, showDeleteConfirm, showCreateOffer, showReschedule, showLostConfirm])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

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

  const handleNotesBlur = () => {
    if (!appt) return
    if (notesText !== (appt.notes ?? '')) {
      updateAppt.mutate({ id: appt.id, notes: notesText })
      setNotesSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }))
    }
  }

  // Optimistic Checklist – sofort UI updaten, im Hintergrund speichern
  const [optimisticChecklist, setOptimisticChecklist] = useState<{ id: string; label: string; checked: boolean }[] | null>(null)

  const handleChecklistToggle = (itemId: string) => {
    if (!appt) return
    const current = optimisticChecklist ?? appt.checklist
    const updated = current.map((c) =>
      c.id === itemId ? { ...c, checked: !c.checked } : c,
    )
    setOptimisticChecklist(updated) // sofort UI updaten
    updateAppt.mutate({ id: appt.id, checklist: updated } as never, {
      onSettled: () => setOptimisticChecklist(null), // nach API-Antwort zurücksetzen
    })
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
      // Leere Strings → undefined (Validierung tolerant)
      const cleanEmail = appt.contactEmail?.trim() || undefined
      const cleanPhone = appt.contactPhone?.trim() || undefined
      const cleanAddress = appt.address?.trim() || undefined

      await createDeal.mutateAsync({
        title,
        contactName: appt.contactName,
        contactEmail: cleanEmail,
        contactPhone: cleanPhone,
        company: appt.company ?? undefined,
        address: cleanAddress,
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
    } catch (err: any) {
      setSuccessMsg('')
      const msg = err?.message ?? 'Angebot konnte nicht erstellt werden'
      alert(`Fehler beim Erstellen des Angebots:\n\n${msg}`)
    }
  }

  if (isLoading || !appt) {
    return createPortal(
      <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="w-12 h-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
      </div>,
      document.body
    )
  }

  const isClosed = appt.status === 'DURCHGEFUEHRT' || appt.status === 'ABGESAGT'
  const isRichtofferte = appt.appointmentType === 'RICHTOFFERTE'
  const checklist = optimisticChecklist ?? appt.checklist
  const checkedCount = checklist.filter((c) => c.checked).length
  const totalCount = checklist.length
  // Richtofferten haben keine Checkliste-Pflicht – direkt zu Angebot erlaubt
  const progress = isRichtofferte ? 100 : (totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0)

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'checklist', label: `Checkliste (${checkedCount}/${totalCount})` },
    { key: 'notes', label: 'Notizen' },
    { key: 'documents', label: 'Dokumente' },
    { key: 'emails', label: 'E-Mail' },
    { key: 'tasks', label: 'Aufgaben' },
    { key: 'timeline', label: 'Timeline' },
  ]

  return createPortal(
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Termin Details"
        tabIndex={-1}
        className="outline-none w-full max-w-[720px] max-h-[85vh] sm:max-h-[90vh] mx-2 sm:mx-4 flex flex-col"
        style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3.5 px-4 sm:px-6 py-4 sm:py-5 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold leading-snug truncate">{appt.contactName}</h3>
            {appt.company && <p className="text-[12px] text-text-sec truncate">{appt.company}</p>}
          </div>

          {/* Status badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0" style={{ background: `color-mix(in srgb, ${statusColors[appt.status]} 12%, transparent)`, color: statusColors[appt.status] }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[appt.status] }} />
            {statusLabels[appt.status]}
          </span>

          {/* Edit toggle */}
          {!isClosed && (
            <button type="button" onClick={() => { if (isEditing) handleSave(); else setIsEditing(true) }} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-amber hover:bg-amber-soft transition-all duration-200 shrink-0" aria-label={isEditing ? 'Speichern' : 'Bearbeiten'}>
              {isEditing ? <Check size={16} strokeWidth={1.8} /> : <Pencil size={16} strokeWidth={1.8} />}
            </button>
          )}

          {/* Close */}
          <button type="button" onClick={onClose} aria-label="Schliessen" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150 shrink-0">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* ── Success Message ── */}
        {successMsg && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-[10px] text-[12px] font-semibold text-center" style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399', border: '1px solid color-mix(in srgb, #34D399 20%, transparent)' }}>
            {successMsg}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="px-3 sm:px-6 pt-4 pb-0 shrink-0">
          <div className="flex items-center rounded-full p-0.5 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold text-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">

          {/* ────── TAB: Übersicht ────── */}
          {activeTab === 'overview' && (
            <>
              {/* Termin + Fahrzeit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* Kontaktdaten */}
              <div className="p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">Kontaktdaten</h4>
                <div className="space-y-2.5">
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
              </div>

              {/* Status, Priorität, Typ */}
              <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        const cycle = ['VOR_ORT', 'ONLINE', 'RICHTOFFERTE'] as const
                        const next = cycle[(cycle.indexOf(appt.appointmentType) + 1) % cycle.length]
                        updateAppt.mutate({ id: appt.id, appointmentType: next })
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: `color-mix(in srgb, ${appointmentTypeColors[appt.appointmentType]} 12%, transparent)`, color: appointmentTypeColors[appt.appointmentType] }}
                      title="Klicken zum Wechseln"
                    >
                      {appt.appointmentType === 'ONLINE' ? <Globe size={12} strokeWidth={2} /> : appt.appointmentType === 'RICHTOFFERTE' ? <FileText size={12} strokeWidth={2} /> : <MapPin size={12} strokeWidth={2} />}
                      {appointmentTypeLabels[appt.appointmentType]}
                    </button>
                  </div>
                </div>
              </div>

              {/* Zugewiesen an */}
              <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Zugewiesen an</p>
                {isAdmin && isEditing ? (
                  <div className="relative">
                    <select
                      value={appt.assignedTo ?? ''}
                      onChange={(e) => updateAppt.mutate({ id: appt.id, assignedTo: e.target.value || undefined })}
                      className="glass-input appearance-none w-full px-3 py-1.5 pr-8 text-[12px] cursor-pointer"
                    >
                      <option value="" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Nicht zugewiesen</option>
                      {users.filter((u) => u.role === 'VERTRIEB' || u.role === 'GL' || u.role === 'GESCHAEFTSLEITUNG' || u.role === 'ADMIN').map((u) => (
                        <option key={u.id} value={u.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                  </div>
                ) : (() => {
                  const assignee = users.find((u) => u.id === appt.assignedTo)
                  if (!assignee) return <span className="text-[12px] text-text-dim">Nicht zugewiesen</span>
                  const initials = `${assignee.firstName?.[0] ?? ''}${assignee.lastName?.[0] ?? ''}`
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-bg shrink-0" style={{ background: '#F59E0B' }}>
                        {initials}
                      </div>
                      <span className="text-[12px] text-text-sec">{assignee.firstName} {assignee.lastName}</span>
                    </div>
                  )
                })()}
              </div>

              {/* Vorbereitungsnotizen (im Übersicht-Tab) */}
              {(appt.preparationNotes || isEditing) && (
                <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
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

              {/* Erstellt / Bearbeitet / Aus Lead */}
              <div className="flex flex-col gap-1.5 text-[11px] text-text-dim px-1">
                <div className="flex items-center gap-2">
                  <Clock size={12} strokeWidth={1.8} />
                  Erstellt {relativeTime(appt.createdAt)}
                  {(() => { const u = users.find((x) => x.id === appt.assignedTo); return u ? ` · von ${u.firstName} ${u.lastName}` : '' })()}
                </div>
                {appt.updatedAt && appt.updatedAt !== appt.createdAt && (
                  <div className="flex items-center gap-2">
                    <Clock size={12} strokeWidth={1.8} />
                    Bearbeitet {relativeTime(appt.updatedAt)}
                  </div>
                )}
                {appt.leadId && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <ArrowRight size={12} strokeWidth={1.8} />
                    Aus Lead erstellt{(() => { const u = users.find((x) => x.id === appt.assignedTo); return u ? ` · von ${u.firstName} ${u.lastName}` : '' })()}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ────── TAB: Checkliste ────── */}
          {activeTab === 'checklist' && (
            <>
              {/* Progress */}
              <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
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
                  {checklist.map((item) => (
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
            </>
          )}

          {/* ────── TAB: Notizen ────── */}
          {activeTab === 'notes' && (
            <div className="p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Notizen</h4>
                {notesSavedAt && (
                  <span className="text-[10px] text-text-dim flex items-center gap-1">
                    <Clock size={10} strokeWidth={2} />
                    Gespeichert um {notesSavedAt}
                  </span>
                )}
              </div>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Notizen hier eingeben..."
                rows={12}
                className="glass-input w-full px-4 py-3 text-[13px] leading-relaxed resize-none"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          )}

          {/* ────── TAB: Dokumente ────── */}
          {activeTab === 'documents' && (
            <DocumentSection contactId={appt.contactId} entityType="TERMIN" entityId={appt.id} />
          )}

          {/* ────── TAB: E-Mail ────── */}
          {activeTab === 'emails' && (
            <EmailSection contactId={appt.contactId} contactEmail={appt.contactEmail} contactName={appt.contactName} entityType="TERMIN" entityId={appt.id} />
          )}

          {/* ────── TAB: Aufgaben ────── */}
          {activeTab === 'tasks' && (
            <TaskSection module="TERMIN" referenceId={appt.id} referenceTitle={appt.contactName || 'Termin'} />
          )}

          {/* ────── TAB: Timeline ────── */}
          {activeTab === 'timeline' && appt && (
            <ContactTimeline contactId={appt.contactId} />
          )}
        </div>

        {/* ── Footer Actions ── */}
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
                  {isRichtofferte ? 'Zum Angebot konvertieren' : 'Angebot erstellen'}
                </button>
              )}
              {!isClosed && appt.status !== 'NO_SHOW' && (
                <button
                  type="button"
                  onClick={() => {
                    updateAppt.mutate({ id: appt.id, status: 'NO_SHOW' as AppointmentStatus })
                    setSuccessMsg(isRichtofferte
                      ? 'Als No Show markiert. Callcenter kann Kunde erneut kontaktieren.'
                      : 'Als No Show markiert. Callcenter kann Kontakt erneut anrufen.')
                    setTimeout(() => setSuccessMsg(''), 2500)
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors"
                  style={{ border: '1px solid rgba(248,113,113,0.15)' }}
                  title={isRichtofferte
                    ? 'Kunde hat nicht reagiert – Richtofferte geht an Callcenter zurück'
                    : 'Kunde nicht erschienen – Termin geht an Callcenter zurück'}
                >
                  <AlertTriangle size={14} strokeWidth={1.8} />
                  No Show
                </button>
              )}
              {appt.status === 'NO_SHOW' && (
                <button
                  type="button"
                  onClick={() => {
                    // Prefill mit bestehenden Werten
                    setRescheduleDate('')
                    setRescheduleTime('')
                    setRescheduleType(appt.appointmentType)
                    setRescheduleAddress(appt.address ?? '')
                    setRescheduleNotes('')
                    setRescheduleAssignedTo(appt.assignedTo ?? '')
                    setShowReschedule(true)
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-emerald-400 hover:bg-surface-hover transition-colors"
                  style={{ border: '1px solid rgba(52,211,153,0.25)' }}
                  title={isRichtofferte
                    ? 'Richtofferte wieder aktivieren'
                    : 'Neuen Termin vereinbaren – zurueck zu Geplant'}
                >
                  <CalendarPlus size={14} strokeWidth={1.8} />
                  {isRichtofferte ? 'Als Richtofferte aktivieren' : 'Zurueck zu Termin'}
                </button>
              )}
              {!isClosed && (
                <button
                  type="button"
                  onClick={() => {
                    setLostReason('')
                    setShowLostConfirm(true)
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-red/10 transition-colors"
                  style={{ border: '1px solid rgba(248,113,113,0.3)' }}
                  title="Kunde endgueltig verloren – Termin abgesagt, Lead auf verloren setzen"
                >
                  <AlertTriangle size={14} strokeWidth={1.8} />
                  Verloren
                </button>
              )}
              <a href={`tel:${appt.contactPhone}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-text-sec hover:text-text hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Phone size={14} strokeWidth={1.8} />
                Anrufen
              </a>
              <div className="flex-1" />
              {(isAdmin || user?.allowedModules?.includes('canDelete')) && (
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
                  <Trash2 size={14} strokeWidth={1.8} />
                  Löschen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Reschedule Dialog (Zurueck zu Termin) ── */}
      {showReschedule && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center"
          style={{ background: 'rgba(6,8,12,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReschedule(false) }}
        >
          <div
            className="w-full max-w-[480px] mx-2 sm:mx-4 p-5 sm:p-6"
            style={{
              background: 'rgba(11,15,21,0.98)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #34D399 15%, transparent), color-mix(in srgb, #22D3EE 10%, transparent))' }}
              >
                <CalendarPlus size={18} className="text-emerald-400" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold">
                  {isRichtofferte ? 'Richtofferte neu planen' : 'Neuen Termin vereinbaren'}
                </h3>
                <p className="text-[11px] text-text-sec">
                  {isRichtofferte ? 'Neues Follow-Up-Datum optional' : 'Neues Datum und Zeit festlegen'}
                </p>
              </div>
            </div>

            {/* Datum & Zeit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                  Datum {isRichtofferte ? '' : '*'}
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-emerald-400/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                  Zeit {isRichtofferte ? '' : '*'}
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-emerald-400/50"
                />
              </div>
            </div>

            {/* Termin-Typ */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Termin-Typ</label>
              <div className="flex gap-2">
                {(['VOR_ORT', 'ONLINE', 'RICHTOFFERTE'] as AppointmentType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRescheduleType(t)}
                    className={[
                      'flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150',
                      rescheduleType === t
                        ? 'text-text'
                        : 'bg-surface-hover text-text-dim hover:text-text',
                    ].join(' ')}
                    style={rescheduleType === t ? {
                      background: `color-mix(in srgb, ${appointmentTypeColors[t]} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${appointmentTypeColors[t]} 40%, transparent)`,
                      color: appointmentTypeColors[t],
                    } : { border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {appointmentTypeLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Verkaeufer zuweisen */}
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Verkaeufer uebernimmt *</label>
              <select
                value={rescheduleAssignedTo}
                onChange={(e) => setRescheduleAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-emerald-400/50"
              >
                <option value="" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Benutzer auswaehlen...</option>
                {users.filter((u) => u.role === 'VERTRIEB' || u.role === 'GL' || u.role === 'ADMIN').map((u) => (
                  <option key={u.id} value={u.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                    {u.firstName} {u.lastName} – {u.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Adresse (nur bei VOR_ORT) */}
            {rescheduleType === 'VOR_ORT' && (
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Adresse</label>
                <input
                  type="text"
                  value={rescheduleAddress}
                  onChange={(e) => setRescheduleAddress(e.target.value)}
                  placeholder="Strasse, PLZ Ort"
                  className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-emerald-400/50"
                />
              </div>
            )}

            {/* Notiz */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                Notiz zum Rueckruf (optional)
              </label>
              <textarea
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="z.B. Kunde bevorzugt Rueckruf am Nachmittag..."
                rows={2}
                className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-emerald-400/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowReschedule(false)}
                className="btn-secondary flex-1 px-4 py-2.5 text-[12px] font-semibold text-center"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  // Validierung: Verkaeufer immer Pflicht, Datum/Zeit bei Terminen Pflicht
                  if (!rescheduleAssignedTo) return
                  if (rescheduleType !== 'RICHTOFFERTE' && (!rescheduleDate || !rescheduleTime)) return
                  const existingNotes = appt.notes ?? ''
                  const combinedNotes = rescheduleNotes.trim()
                    ? (existingNotes ? `${existingNotes}\n\n[Neu geplant] ${rescheduleNotes.trim()}` : `[Neu geplant] ${rescheduleNotes.trim()}`)
                    : existingNotes
                  updateAppt.mutate({
                    id: appt.id,
                    status: 'GEPLANT' as AppointmentStatus,
                    appointmentDate: rescheduleDate || null,
                    appointmentTime: rescheduleTime || null,
                    appointmentType: rescheduleType,
                    assignedTo: rescheduleAssignedTo,
                    address: rescheduleType === 'VOR_ORT' ? rescheduleAddress : appt.address,
                    notes: combinedNotes || null,
                  })
                  setShowReschedule(false)
                  setSuccessMsg(rescheduleType === 'RICHTOFFERTE'
                    ? 'Richtofferte neu geplant – erscheint unter Richtofferten.'
                    : 'Termin neu geplant – erscheint unter Termine.')
                  setTimeout(() => { setSuccessMsg(''); onClose() }, 1500)
                }}
                disabled={
                  !rescheduleAssignedTo ||
                  (rescheduleType !== 'RICHTOFFERTE' && (!rescheduleDate || !rescheduleTime)) ||
                  updateAppt.isPending
                }
                className="btn-primary flex-1 px-4 py-2.5 text-[12px] text-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {updateAppt.isPending ? 'Wird gespeichert...' : 'Termin aktivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Verloren-Dialog (Grund pflicht) ── */}
      {showLostConfirm && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center"
          style={{ background: 'rgba(6,8,12,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLostConfirm(false) }}
        >
          <div
            className="w-full max-w-[400px] mx-2 sm:mx-4 p-5 sm:p-6"
            style={{
              background: 'rgba(11,15,21,0.98)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}
            >
              <AlertTriangle size={20} className="text-red" strokeWidth={1.8} />
            </div>
            <h3 className="text-[15px] font-bold text-center mb-1">Kunde verloren?</h3>
            <p className="text-[12px] text-text-sec text-center mb-5">
              {appt.leadId
                ? 'Termin wird abgesagt und der verknuepfte Lead auf "Verloren" gesetzt.'
                : 'Termin wird abgesagt. Bitte Grund angeben.'}
            </p>

            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Grund *</label>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="z.B. Kunde hat sich fuer Mitbewerber entschieden, nicht erreichbar nach 3 Rueckrufen..."
                rows={3}
                className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-red/50 resize-none"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowLostConfirm(false)}
                className="btn-secondary flex-1 px-4 py-2.5 text-[12px] font-semibold text-center"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!lostReason.trim()) return
                  const existingNotes = appt.notes ?? ''
                  const combinedNotes = existingNotes
                    ? `${existingNotes}\n\n[Verloren] ${lostReason.trim()}`
                    : `[Verloren] ${lostReason.trim()}`
                  updateAppt.mutate({
                    id: appt.id,
                    status: 'ABGESAGT' as AppointmentStatus,
                    notes: combinedNotes,
                  })
                  // Verknuepften Lead auch auf LOST setzen
                  if (appt.leadId) {
                    updateLead.mutate({
                      id: appt.leadId,
                      status: 'LOST' as any,
                      lostReason: lostReason.trim(),
                    } as any)
                  }
                  setShowLostConfirm(false)
                  setSuccessMsg('Kunde als verloren markiert.')
                  setTimeout(() => { setSuccessMsg(''); onClose() }, 1500)
                }}
                disabled={!lostReason.trim() || updateAppt.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white text-center disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#F87171' }}
              >
                {updateAppt.isPending ? 'Wird gespeichert...' : 'Verloren markieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
