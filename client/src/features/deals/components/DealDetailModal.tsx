import { useState, useEffect, useRef } from 'react'
import {
  X, Pencil, Check, Phone, Mail, MapPin, Building2, Calendar,
  Trash2, ChevronDown, Trophy, XCircle, Clock, AlertTriangle,
  MessageSquare, PhoneCall, Users as UsersIcon,
  Zap, Send, Percent, CalendarClock,
} from 'lucide-react'
import {
  useDeal, useUpdateDeal, useDeleteDeal, useAddActivity,
  stageLabels, stageColors, priorityLabels, priorityColors, formatCHF,
  activityTypeLabels, activityTypeColors,
  type DealStage, type DealPriority, type ActivityType,
} from '@/hooks/useDeals'
import { useCreateProject } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import DocumentSection from '@/components/ui/DocumentSection'
import EmailSection from '@/components/ui/EmailSection'
import AiSummaryCard from '@/features/ai/components/AiSummaryCard'
import TaskSection from '@/components/ui/TaskSection'
import ContactTimeline from '@/components/ui/ContactTimeline'
import { useGenerateDealSummary } from '@/hooks/useAi'

interface Props {
  dealId: string
  onClose: () => void
}

type DetailTab = 'overview' | 'activities' | 'notes' | 'documents' | 'emails' | 'tasks' | 'timeline'

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

const activityIcons: Record<ActivityType, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  NOTE: MessageSquare,
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: UsersIcon,
  STATUS_CHANGE: Zap,
  SYSTEM: Zap,
}

export default function DealDetailModal({ dealId, onClose }: Props) {
  const { data: dealResponse, isLoading } = useDeal(dealId)
  const deal = dealResponse?.data ?? null
  const { isAdmin, user: authUser } = useAuth()
  const generateDealSummary = useGenerateDealSummary()
  const updateDeal = useUpdateDeal()
  const deleteDeal = useDeleteDeal()
  const addActivity = useAddActivity()
  const createProject = useCreateProject()

  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []

  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContactName, setEditContactName] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editStage, setEditStage] = useState<DealStage>('ERSTELLT')
  const [editPriority, setEditPriority] = useState<DealPriority>('MEDIUM')
  const [editExpectedClose, setEditExpectedClose] = useState('')
  const [editWinProb, setEditWinProb] = useState('')
  const [editFollowUpDate, setEditFollowUpDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showWonConfirm, setShowWonConfirm] = useState(false)
  const [showLostConfirm, setShowLostConfirm] = useState(false)
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [wonSeller, setWonSeller] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Activity input
  const [activityText, setActivityText] = useState('')
  const [activityType, setActivityType] = useState<ActivityType>('NOTE')

  // Notes (auto-save)
  const [notesText, setNotesText] = useState('')
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null)

  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (deal) {
      setEditTitle(deal.title)
      setEditContactName(deal.contactName)
      setEditContactEmail(deal.contactEmail)
      setEditContactPhone(deal.contactPhone)
      setEditCompany(deal.company ?? '')
      setEditAddress(deal.address)
      setEditValue(String(deal.value))
      setEditStage(deal.stage)
      setEditPriority(deal.priority)
      setEditExpectedClose(deal.expectedCloseDate ?? '')
      setEditWinProb(deal.winProbability != null ? String(deal.winProbability) : '')
      setEditFollowUpDate(deal.followUpDate ?? '')
      setEditNotes(deal.notes ?? '')
      setNotesText(deal.notes ?? '')
    }
  }, [deal])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false)
        else if (showWonConfirm) setShowWonConfirm(false)
        else if (showLostConfirm) setShowLostConfirm(false)
        else if (isEditing) setIsEditing(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, isEditing, showDeleteConfirm, showWonConfirm, showLostConfirm])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const handleBackdropClick = (e: React.MouseEvent) => { if (e.target === backdropRef.current) onClose() }

  const handleSave = () => {
    if (!deal) return
    updateDeal.mutate({
      id: deal.id, title: editTitle.trim(), contactName: editContactName.trim(),
      contactEmail: editContactEmail.trim(), contactPhone: editContactPhone.trim(),
      company: editCompany.trim() || undefined, address: editAddress.trim(),
      value: Number(editValue) || 0, stage: editStage, priority: editPriority,
      expectedCloseDate: editExpectedClose || undefined, notes: editNotes.trim() || undefined,
      winProbability: editWinProb ? Number(editWinProb) : undefined,
      followUpDate: editFollowUpDate || undefined,
    })
    setIsEditing(false)
    setSuccessMsg('Änderungen gespeichert')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  const handleNotesBlur = () => {
    if (!deal) return
    if (notesText !== (deal.notes ?? '')) {
      updateDeal.mutate({ id: deal.id, notes: notesText })
      setNotesSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }))
    }
  }

  const handleMarkWon = async () => {
    if (!deal) return
    // Wenn im Edit-Modus, zuerst Änderungen speichern (inkl. Wert)
    if (isEditing) {
      updateDeal.mutate({
        id: deal.id, title: editTitle.trim(), contactName: editContactName.trim(),
        contactEmail: editContactEmail.trim(), contactPhone: editContactPhone.trim(),
        company: editCompany.trim() || undefined, address: editAddress.trim(),
        value: Number(editValue) || 0, stage: 'GEWONNEN' as DealStage, priority: editPriority,
        expectedCloseDate: editExpectedClose || undefined, notes: editNotes.trim() || undefined,
        winProbability: editWinProb ? Number(editWinProb) : undefined,
        followUpDate: editFollowUpDate || undefined,
      })
      setIsEditing(false)
    } else {
      updateDeal.mutate({ id: deal.id, stage: 'GEWONNEN' as DealStage })
    }

    const now = new Date().toISOString()
    const historyActivities: Array<{ type: string; text: string; createdBy: string; createdAt: string }> = []

    if (deal.leadId) {
      historyActivities.push({ type: 'SYSTEM', text: `Lead erstellt (ID: ${deal.leadId})`, createdBy: 'System', createdAt: deal.createdAt })
    }
    if (deal.appointmentId) {
      historyActivities.push({ type: 'SYSTEM', text: `Besichtigungstermin durchgeführt (ID: ${deal.appointmentId})`, createdBy: 'System', createdAt: deal.createdAt })
    }
    for (const act of deal.activities) {
      historyActivities.push({ type: act.type, text: `[Angebot] ${act.text}`, createdBy: act.createdBy, createdAt: act.createdAt })
    }
    if (deal.notes?.trim()) {
      historyActivities.push({ type: 'NOTE', text: `[Angebot-Notizen] ${deal.notes}`, createdBy: 'System', createdAt: now })
    }
    historyActivities.push({ type: 'SYSTEM', text: `Angebot "${deal.title}" als gewonnen markiert → Projekt erstellt`, createdBy: 'System', createdAt: now })

    try {
      await createProject.mutateAsync({
        name: deal.company || deal.contactName,
        description: deal.title,
        kWp: 0,
        value: isEditing ? (Number(editValue) || deal.value) : deal.value,
        address: isEditing ? editAddress.trim() || deal.address : deal.address,
        phone: isEditing ? editContactPhone.trim() || deal.contactPhone : deal.contactPhone,
        email: isEditing ? editContactEmail.trim() || deal.contactEmail : deal.contactEmail,
        company: (isEditing ? editCompany.trim() : deal.company) || undefined,
        leadId: deal.leadId ?? undefined,
        appointmentId: deal.appointmentId ?? undefined,
        dealId: deal.id,
        notes: deal.notes ?? undefined,
        priority: deal.priority === 'URGENT' ? 'URGENT' : deal.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        projectManagerId: wonSeller || undefined,
        activities: historyActivities,
      })
    } catch { /* non-blocking */ }

    setShowWonConfirm(false)
    setSuccessMsg('Angebot als gewonnen markiert – Projekt erstellt!')
    setTimeout(() => { setSuccessMsg(''); onClose() }, 1500)
  }

  const handleMarkLost = () => {
    if (!deal || !lostReason.trim()) return
    const prevNotes = deal.notes ?? ''
    const lostNote = `[VERLOREN] ${new Date().toLocaleDateString('de-CH')}: ${lostReason.trim()}`
    const updatedNotes = prevNotes ? `${lostNote}\n\n${prevNotes}` : lostNote
    updateDeal.mutate({ id: deal.id, stage: 'VERLOREN' as DealStage, notes: updatedNotes })
    setShowLostConfirm(false); setLostReason('')
    setSuccessMsg('Angebot als verloren markiert')
    setTimeout(() => { setSuccessMsg(''); onClose() }, 1500)
  }

  const handleDelete = () => {
    if (!deal) return
    deleteDeal.mutate(deal.id)
    setShowDeleteConfirm(false)
    setSuccessMsg('Angebot geloescht')
    setTimeout(() => { setSuccessMsg(''); onClose() }, 1200)
  }

  const handleAddActivity = () => {
    if (!deal || !activityText.trim()) return
    addActivity.mutate({ dealId: deal.id, type: activityType, text: activityText.trim() })
    setActivityText('')
    setActivityType('NOTE')
  }

  if (isLoading || !deal) {
    return (
      <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="w-12 h-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  const isClosed = deal.stage === 'GEWONNEN' || deal.stage === 'VERLOREN'
  const sortedActivities = [...deal.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'activities', label: `Aktivitäten (${deal.activities.length})` },
    { key: 'notes', label: 'Notizen' },
    { key: 'documents', label: 'Dokumente' },
    { key: 'emails', label: 'E-Mail' },
    { key: 'tasks', label: 'Aufgaben' },
    { key: 'timeline', label: 'Timeline' },
  ]

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Angebot Details"
        tabIndex={-1}
        className="outline-none w-full max-w-[720px] max-h-[85vh] sm:max-h-[90vh] mx-2 sm:mx-4 flex flex-col"
        style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3.5 px-4 sm:px-6 py-4 sm:py-5 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="glass-input w-full px-3 py-1 text-[15px] font-bold" />
            ) : (
              <h3 className="text-[15px] font-bold leading-snug truncate">{deal.title}</h3>
            )}
            {deal.company && !isEditing && <p className="text-[12px] text-text-sec truncate">{deal.company}</p>}
          </div>

          {/* Status badge + win % */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${stageColors[deal.stage]} 12%, transparent)`, color: stageColors[deal.stage] }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColors[deal.stage] }} />
              {stageLabels[deal.stage]}
            </span>
            {deal.winProbability != null && (
              <span className="text-[10px] font-bold tabular-nums" style={{ color: deal.winProbability >= 70 ? '#34D399' : deal.winProbability >= 40 ? '#F59E0B' : '#F87171' }}>
                {deal.winProbability}%
              </span>
            )}
          </div>

          {/* Edit toggle */}
          {(!isClosed || isAdmin) && (
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
        <div className="px-6 pt-4 pb-0 shrink-0">
          <div className="flex items-center rounded-full p-0.5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
        </div>

        {/* ── Tab Content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">

          {/* ────── TAB: Übersicht ────── */}
          {activeTab === 'overview' && (
            <>
              {/* Wert + Abschlusswahrscheinlichkeit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, #F59E0B 6%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 15%, transparent)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">Angebotswert</p>
                  {isEditing ? (
                    <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="glass-input px-3 py-1 text-lg font-bold tabular-nums w-full" />
                  ) : (
                    <p className="text-[22px] font-extrabold tabular-nums text-amber">{formatCHF(deal.value)}</p>
                  )}
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, #A78BFA 6%, transparent)', border: '1px solid color-mix(in srgb, #A78BFA 15%, transparent)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1 flex items-center gap-1">
                    <Percent size={10} strokeWidth={2} /> Abschlusswahrscheinlichkeit
                  </p>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="100" step="5" value={editWinProb || '50'} onChange={(e) => setEditWinProb(e.target.value)} className="flex-1 accent-violet-400" />
                      <span className="text-lg font-extrabold tabular-nums text-violet-400 w-12 text-right">{editWinProb || '50'}%</span>
                    </div>
                  ) : (
                    <p className="text-[22px] font-extrabold tabular-nums" style={{ color: (deal.winProbability ?? 0) >= 70 ? '#34D399' : (deal.winProbability ?? 0) >= 40 ? '#F59E0B' : '#F87171' }}>
                      {deal.winProbability != null ? `${deal.winProbability}%` : '\u2014'}
                    </p>
                  )}
                </div>
              </div>

              {/* Kontaktdaten */}
              <div className="p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">Kontaktdaten</h4>
                <div className="space-y-2.5">
                  {[
                    { icon: Building2, ed: <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Unternehmen" className="glass-input px-3 py-1 text-[12px] flex-1" />, val: deal.company ?? '\u2014' },
                    { icon: Phone, ed: <input type="tel" value={editContactPhone} onChange={(e) => setEditContactPhone(e.target.value)} className="glass-input px-3 py-1 text-[12px] flex-1 tabular-nums" />, val: deal.contactPhone },
                    { icon: Mail, ed: <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} className="glass-input px-3 py-1 text-[12px] flex-1" />, val: deal.contactEmail },
                    { icon: MapPin, ed: <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="glass-input px-3 py-1 text-[12px] flex-1" />, val: deal.address },
                  ].map(({ icon: Icon, ed, val }, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Icon size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                      {isEditing ? ed : <span className="text-[12px] text-text-sec">{val}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase & Priorität */}
              <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Phase</p>
                    {isEditing ? (
                      <div className="relative">
                        <select value={editStage} onChange={(e) => setEditStage(e.target.value as DealStage)} className="glass-input appearance-none w-full px-3 py-1.5 pr-8 text-[12px] cursor-pointer">
                          {Object.entries(stageLabels).map(([k, l]) => <option key={k} value={k} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{l}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${stageColors[deal.stage]} 12%, transparent)`, color: stageColors[deal.stage] }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColors[deal.stage] }} />
                        {stageLabels[deal.stage]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Priorität</p>
                    {isEditing ? (
                      <div className="relative">
                        <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as DealPriority)} className="glass-input appearance-none w-full px-3 py-1.5 pr-8 text-[12px] cursor-pointer">
                          {Object.entries(priorityLabels).map(([k, l]) => <option key={k} value={k} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{l}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${priorityColors[deal.priority]} 12%, transparent)`, color: priorityColors[deal.priority] }}>
                        {priorityLabels[deal.priority]}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Zugewiesen an */}
              <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Zugewiesen an</p>
                {isAdmin && isEditing ? (
                  <div className="relative">
                    <select
                      value={deal.assignedTo ?? ''}
                      onChange={(e) => updateDeal.mutate({ id: deal.id, assignedTo: e.target.value || undefined })}
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
                  const assignee = users.find((u) => u.id === deal.assignedTo)
                  if (!assignee) return <span className="text-[12px] text-text-dim">Nicht zugewiesen</span>
                  const initials = `${assignee.firstName?.[0] ?? ''}${assignee.lastName?.[0] ?? ''}`
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-bg shrink-0" style={{ background: '#A78BFA' }}>
                        {initials}
                      </div>
                      <span className="text-[12px] text-text-sec">{assignee.firstName} {assignee.lastName}</span>
                    </div>
                  )
                })()}
              </div>

              {/* Erwarteter Abschluss + Follow-Up */}
              <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Erwarteter Abschluss</p>
                    {isEditing ? (
                      <input type="date" value={editExpectedClose} onChange={(e) => setEditExpectedClose(e.target.value)} className="glass-input px-3 py-1.5 text-[12px] w-full" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-text-dim" strokeWidth={1.8} />
                        <span className="text-[12px] text-text-sec tabular-nums">
                          {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' }) : '\u2014'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 flex items-center gap-1">
                      <CalendarClock size={10} strokeWidth={2} /> Naechstes Follow-Up
                    </p>
                    {isEditing ? (
                      <input type="date" value={editFollowUpDate} onChange={(e) => setEditFollowUpDate(e.target.value)} className="glass-input px-3 py-1.5 text-[12px] w-full" />
                    ) : showFollowUpPicker ? (
                      <div className="space-y-2">
                        <input
                          type="date"
                          defaultValue={deal.followUpDate ?? ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              updateDeal.mutate({ id: deal.id, followUpDate: e.target.value })
                              setShowFollowUpPicker(false)
                              setSuccessMsg('Follow-Up gesetzt')
                              setTimeout(() => setSuccessMsg(''), 2000)
                            }
                          }}
                          className="glass-input px-3 py-1.5 text-[12px] w-full"
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: 'Morgen', days: 1 },
                            { label: 'In 3 Tagen', days: 3 },
                            { label: '1 Woche', days: 7 },
                            { label: '2 Wochen', days: 14 },
                          ].map(({ label, days }) => {
                            const d = new Date(); d.setDate(d.getDate() + days)
                            const dateStr = d.toISOString().slice(0, 10)
                            return (
                              <button
                                key={days}
                                type="button"
                                onClick={() => {
                                  updateDeal.mutate({ id: deal.id, followUpDate: dateStr })
                                  setShowFollowUpPicker(false)
                                  setSuccessMsg('Follow-Up gesetzt')
                                  setTimeout(() => setSuccessMsg(''), 2000)
                                }}
                                className="px-2 py-1 rounded-md text-[10px] font-semibold text-amber hover:bg-amber/10 transition-colors"
                                style={{ border: '1px solid rgba(245,158,11,0.2)' }}
                              >
                                {label}
                              </button>
                            )
                          })}
                          {deal.followUpDate && (
                            <button
                              type="button"
                              onClick={() => {
                                updateDeal.mutate({ id: deal.id, followUpDate: null })
                                setShowFollowUpPicker(false)
                                setSuccessMsg('Follow-Up entfernt')
                                setTimeout(() => setSuccessMsg(''), 2000)
                              }}
                              className="px-2 py-1 rounded-md text-[10px] font-semibold text-red hover:bg-red/10 transition-colors"
                              style={{ border: '1px solid rgba(248,113,113,0.2)' }}
                            >
                              Entfernen
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowFollowUpPicker(false)}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold text-text-dim hover:bg-surface-hover transition-colors"
                            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isClosed && setShowFollowUpPicker(true)}
                        className="flex items-center gap-2 group"
                        disabled={isClosed}
                      >
                        <CalendarClock size={14} className="text-text-dim" strokeWidth={1.8} />
                        <span className="text-[12px] tabular-nums" style={{
                          color: deal.followUpDate
                            ? new Date(deal.followUpDate) <= new Date() ? '#F87171' : '#F59E0B'
                            : 'var(--color-text-sec)',
                        }}>
                          {deal.followUpDate ? new Date(deal.followUpDate).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Nicht gesetzt'}
                        </span>
                        {!isClosed && (
                          <Pencil size={11} className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {deal.closedAt && (
                <div className="p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Abgeschlossen am</p>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-text-dim" strokeWidth={1.8} />
                    <span className="text-[12px] text-text-sec tabular-nums">
                      {new Date(deal.closedAt).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}

              {/* Erstellt + Zuletzt bearbeitet */}
              <div className="flex flex-col gap-1 text-[11px] text-text-dim px-1">
                <div className="flex items-center gap-2">
                  <Clock size={12} strokeWidth={1.8} />
                  Erstellt {relativeTime(deal.createdAt)}
                </div>
                {deal.updatedAt && deal.updatedAt !== deal.createdAt && (() => {
                  const lastAct = [...deal.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                  const lastEditor = lastAct ? users.find((u) => u.id === lastAct.createdBy) : null
                  const editorName = lastEditor ? `${lastEditor.firstName} ${lastEditor.lastName}` : null
                  return (
                    <div className="flex items-center gap-2">
                      <Pencil size={11} strokeWidth={1.8} />
                      Zuletzt bearbeitet {relativeTime(deal.updatedAt)}{editorName ? ` von ${editorName}` : ''}
                    </div>
                  )
                })()}
              </div>

              {/* KI-Analyse */}
              <AiSummaryCard
                summary={deal.aiSummary}
                isGenerating={generateDealSummary.isPending}
                onGenerate={() => generateDealSummary.mutate(deal.id)}
                error={generateDealSummary.error?.message || (generateDealSummary.data as Record<string, Record<string, string>> | undefined)?.data?.error}
                compact
              />
            </>
          )}

          {/* ────── TAB: Aktivitäten ────── */}
          {activeTab === 'activities' && (
            <>
              {/* Neue Aktivität */}
              {(!isClosed || isAdmin) && (
                <div className="p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Neue Aktivität</h4>
                  <div className="flex items-start gap-2">
                    <div className="relative shrink-0">
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as ActivityType)}
                        className="glass-input appearance-none pl-3 pr-7 py-2 text-[11px] font-medium cursor-pointer"
                        style={{ minWidth: '90px' }}
                      >
                        {(['NOTE', 'CALL', 'EMAIL', 'MEETING'] as ActivityType[]).map((t) => (
                          <option key={t} value={t} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                            {activityTypeLabels[t]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                    </div>
                    <input
                      type="text"
                      value={activityText}
                      onChange={(e) => setActivityText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                      placeholder="Aktivität hinzufügen..."
                      className="glass-input flex-1 px-3 py-2 text-[12px]"
                    />
                    <button
                      type="button"
                      onClick={handleAddActivity}
                      disabled={!activityText.trim()}
                      className="shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center transition-all"
                      style={{
                        background: activityText.trim() ? 'color-mix(in srgb, #A78BFA 15%, transparent)' : 'transparent',
                        color: activityText.trim() ? '#A78BFA' : 'var(--color-text-dim)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <Send size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Aktivitäten-Liste */}
              {sortedActivities.length > 0 ? (
                <div className="space-y-0.5">
                  {sortedActivities.map((act) => {
                    const ActIcon = activityIcons[act.type] ?? Zap
                    const actUser = users.find((u) => u.id === act.createdBy)
                    const actUserName = actUser ? `${actUser.firstName} ${actUser.lastName}` : act.createdBy
                    return (
                      <div key={act.id} className="flex items-start gap-3 p-3 rounded-[12px] hover:bg-surface-hover transition-colors duration-150">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${activityTypeColors[act.type]} 12%, transparent)` }}>
                          <ActIcon size={14} strokeWidth={1.8} style={{ color: activityTypeColors[act.type] }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] text-text-sec">{act.text}</p>
                            <span className="text-[10px] text-text-dim shrink-0 tabular-nums">{relativeTime(act.createdAt)}</span>
                          </div>
                          <p className="text-[10px] text-text-dim mt-0.5">{actUserName}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-text-dim text-[12px] font-medium">Noch keine Aktivitäten erfasst.</p>
                  <p className="text-text-dim text-[11px] mt-1">Aktivitäten werden hier chronologisch angezeigt.</p>
                </div>
              )}
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
            <DocumentSection contactId={deal.contactId} entityType="ANGEBOT" entityId={deal.id} />
          )}

          {/* ────── TAB: E-Mail ────── */}
          {activeTab === 'emails' && (
            <EmailSection contactId={deal.contactId} contactEmail={deal.contactEmail} contactName={deal.contactName} entityType="ANGEBOT" entityId={deal.id} />
          )}

          {/* ────── TAB: Aufgaben ────── */}
          {activeTab === 'tasks' && (
            <TaskSection module="ANGEBOT" referenceId={deal.id} referenceTitle={deal.title || 'Angebot'} />
          )}

          {/* ────── TAB: Timeline ────── */}
          {activeTab === 'timeline' && deal && (
            <ContactTimeline contactId={deal.contactId} />
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          {showDeleteConfirm && (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-[12px] text-red flex-1">Angebot endgültig löschen?</span>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary px-3 py-1.5 text-[11px]">Abbrechen</button>
              <button type="button" onClick={handleDelete} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: '#F87171' }}>Löschen</button>
            </div>
          )}

          {showWonConfirm && (
            <div className="space-y-2.5 mb-3">
              <p className="text-[12px] text-emerald-400 font-semibold">Angebot als gewonnen markieren und zu Projekt konvertieren?</p>
              {deal && (isEditing ? Number(editValue) || 0 : deal.value) <= 0 ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, #F87171 8%, transparent)', border: '1px solid color-mix(in srgb, #F87171 15%, transparent)' }}>
                    <AlertTriangle size={14} className="text-red shrink-0" strokeWidth={2} />
                    <p className="text-[11px] text-red font-semibold">Bitte zuerst einen Angebotswert (CHF) erfassen, bevor du das Angebot als gewonnen markierst.</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={() => { setShowWonConfirm(false); setIsEditing(true) }} className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber text-center" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'color-mix(in srgb, #F59E0B 8%, transparent)' }}>Wert bearbeiten</button>
                    <button type="button" onClick={() => setShowWonConfirm(false)} className="btn-secondary flex-1 px-3 py-1.5 text-[11px] text-center">Abbrechen</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-text-sec">Alle Aktivitäten und Daten werden zum Projekt übernommen.</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Verkäufer / Projektleiter bestätigen</label>
                    <select
                      value={wonSeller}
                      onChange={(e) => setWonSeller(e.target.value)}
                      className="glass-input w-full px-3 py-2 text-[12px]"
                    >
                      <option value="">— Bitte auswählen —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={() => setShowWonConfirm(false)} className="btn-secondary flex-1 px-3 py-1.5 text-[11px] text-center">Abbrechen</button>
                    <button type="button" onClick={handleMarkWon} disabled={!wonSeller} className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white text-center transition-opacity" style={{ background: wonSeller ? '#34D399' : 'rgba(52,211,153,0.3)', color: wonSeller ? '#fff' : 'rgba(255,255,255,0.4)' }}>Gewonnen &rarr; Projekt</button>
                  </div>
                </>
              )}
            </div>
          )}

          {showLostConfirm && (
            <div className="space-y-2.5 mb-3">
              <p className="text-[12px] text-red font-semibold">Begruendung (Pflicht):</p>
              <textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Warum wurde das Angebot verloren?" rows={2} className="glass-input w-full px-3 py-2 text-[12px] resize-none" autoFocus />
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => { setShowLostConfirm(false); setLostReason('') }} className="btn-secondary flex-1 px-3 py-1.5 text-[11px] text-center">Abbrechen</button>
                <button type="button" onClick={handleMarkLost} disabled={!lostReason.trim()} className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-opacity" style={{ background: lostReason.trim() ? '#F87171' : 'rgba(248,113,113,0.3)', color: lostReason.trim() ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                  Als verloren markieren
                </button>
              </div>
            </div>
          )}

          {!showDeleteConfirm && !showWonConfirm && !showLostConfirm && (
            <div className="flex items-center gap-2">
              {(!isClosed || isAdmin) && (
                <>
                  <button type="button" onClick={() => { setWonSeller(deal?.assignedTo ?? ''); setShowWonConfirm(true) }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-emerald-400 hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(52,211,153,0.15)' }}>
                    <Trophy size={14} strokeWidth={1.8} />Gewonnen
                  </button>
                  <button type="button" onClick={() => setShowLostConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
                    <XCircle size={14} strokeWidth={1.8} />Verloren
                  </button>
                </>
              )}
              <a href={`tel:${deal.contactPhone}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-text-sec hover:text-text hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Phone size={14} strokeWidth={1.8} />Anrufen
              </a>
              <a href={`mailto:${deal.contactEmail}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-text-sec hover:text-text hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mail size={14} strokeWidth={1.8} />E-Mail
              </a>
              <div className="flex-1" />
              {(isAdmin || authUser?.allowedModules?.includes('canDelete')) && (
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
                  <Trash2 size={14} strokeWidth={1.8} />Löschen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
