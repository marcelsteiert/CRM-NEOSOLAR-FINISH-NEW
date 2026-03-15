import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Pencil,
  Check,
  Phone,
  Mail,
  FileText,
  MapPin,
  ArrowRight,
  CheckSquare,
  FileUp,
  Bell,
  CalendarCheck,
  Plus,
  Trash2,
  PhoneCall,
  Send,
  Sparkles,
  Globe,
  GitBranch,
  User,
  Tag,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import {
  useLead,
  useUpdateLead,
  useDeleteLead,
  useUsers,
  useTags,
  usePipelines,
  useActivities,
  useCreateActivity,
  useReminders,
  useCreateReminder,
  useDismissReminder,
  useAddLeadTags,
  useRemoveLeadTag,
  sourceLabels,
  statusLabels,
  type LeadSource,
  type LeadStatus,
  type ActivityType,
} from '@/hooks/useLeads'
import { useCreateAppointment } from '@/hooks/useAppointments'
import DocumentSection from '@/components/ui/DocumentSection'
import EmailSection from '@/components/ui/EmailSection'
import AiSummaryCard from '@/features/ai/components/AiSummaryCard'
import TaskSection from '@/components/ui/TaskSection'
import { useGenerateLeadSummary } from '@/hooks/useAi'

/* ── Props ── */

interface LeadDetailModalProps {
  leadId: string
  open?: boolean
  onClose: () => void
}

/* ── Relative Time Helper ── */

function relativeTime(date: string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Minuten`
  if (diffH < 24) return `vor ${diffH} Stunden`
  if (diffD < 7) return `vor ${diffD} Tagen`

  return new Date(date).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/* ── Status Colors ── */

const statusColors: Record<LeadStatus, { bg: string; text: string }> = {
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

/* ── Activity Type Config ── */

const activityTypeConfig: Record<ActivityType, { icon: typeof Phone; color: string; label: string }> = {
  CALL: { icon: Phone, color: '#34D399', label: 'Anruf' },
  EMAIL: { icon: Mail, color: '#60A5FA', label: 'E-Mail' },
  NOTE: { icon: FileText, color: '#F59E0B', label: 'Notiz' },
  MEETING: { icon: MapPin, color: '#A78BFA', label: 'Meeting' },
  STATUS_CHANGE: { icon: ArrowRight, color: '#525E6F', label: 'Statusänderung' },
  TASK: { icon: CheckSquare, color: '#22D3EE', label: 'Aufgabe' },
  DOCUMENT: { icon: FileUp, color: '#F59E0B', label: 'Dokument' },
  REMINDER: { icon: Bell, color: '#F87171', label: 'Erinnerung' },
  DEAL_CREATED: { icon: CalendarCheck, color: '#34D399', label: 'Termin erstellt' },
}

/* ── Tab Type ── */

type DetailTab = 'overview' | 'activities' | 'notes' | 'documents' | 'emails' | 'reminders' | 'tasks'

/* ── Mock Documents ── */

/* ── Component ── */

export default function LeadDetailModal({ leadId, onClose }: LeadDetailModalProps) {
  /* ── Data hooks ── */
  const { data: leadResponse, isLoading } = useLead(leadId)
  const lead = leadResponse?.data ?? null

  const generateLeadSummary = useGenerateLeadSummary()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const { data: usersResponse } = useUsers()
  const { data: tagsResponse } = useTags()
  const { data: pipelinesResponse } = usePipelines()
  const { data: activitiesResponse } = useActivities(leadId)
  const createActivity = useCreateActivity()
  const createAppointment = useCreateAppointment()
  const { data: remindersResponse } = useReminders(leadId)
  const createReminder = useCreateReminder()
  const dismissReminder = useDismissReminder()
  const addLeadTags = useAddLeadTags()
  const removeLeadTag = useRemoveLeadTag()

  const users = usersResponse?.data ?? []
  const allTags = tagsResponse?.data ?? []
  const pipelines = pipelinesResponse?.data ?? []
  const activities = activitiesResponse?.data ?? []
  const reminders = remindersResponse?.data ?? []
  /* ── Local state ── */
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [isEditing, setIsEditing] = useState(false)

  // Editable fields
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editSource, setEditSource] = useState<LeadSource>('HOMEPAGE')
  const [editBucketId, setEditBucketId] = useState('')
  const [editPipelineId, setEditPipelineId] = useState('')
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [editValue, setEditValue] = useState('')

  // Notes
  const [notesText, setNotesText] = useState('')
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null)

  // New activity form
  const [showNewActivity, setShowNewActivity] = useState(false)
  const [newActivityType, setNewActivityType] = useState<ActivityType>('CALL')
  const [newActivityTitle, setNewActivityTitle] = useState('')
  const [newActivityDesc, setNewActivityDesc] = useState('')

  // New reminder form
  const [showNewReminder, setShowNewReminder] = useState(false)
  const [newReminderTitle, setNewReminderTitle] = useState('')
  const [newReminderDesc, setNewReminderDesc] = useState('')
  const [newReminderDate, setNewReminderDate] = useState('')
  const [newReminderTime, setNewReminderTime] = useState('')

  // Tags dropdown
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Confirmations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDealConfirm, setShowDealConfirm] = useState(false)
  const [showLostConfirm, setShowLostConfirm] = useState(false)
  const [lostReason, setLostReason] = useState('')

  // Termin-Formular
  const [apptAssignedTo, setApptAssignedTo] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [apptTime, setApptTime] = useState('')
  const [apptAddress, setApptAddress] = useState('')
  const [apptType, setApptType] = useState<'VOR_ORT' | 'ONLINE'>('VOR_ORT')

  // Success message
  const [successMsg, setSuccessMsg] = useState('')

  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  /* ── Sync lead data to edit state (nur wenn NICHT im Bearbeitungsmodus) ── */
  useEffect(() => {
    if (lead && !isEditing) {
      setEditFirstName(lead.firstName ?? '')
      setEditLastName(lead.lastName ?? '')
      setEditCompany(lead.company ?? '')
      setEditAddress(lead.address ?? '')
      setEditPhone(lead.phone ?? '')
      setEditEmail(lead.email ?? '')
      setEditSource(lead.source)
      setEditBucketId(lead.bucketId ?? '')
      setEditPipelineId(lead.pipelineId ?? '')
      setEditAssignedTo(lead.assignedTo ?? '')
      setEditValue(lead.value != null ? String(lead.value) : '')
      setNotesText(lead.notes ?? '')
    }
  }, [lead, isEditing])

  /* ── Escape key handler ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
        } else if (showDealConfirm) {
          setShowDealConfirm(false)
        } else if (showLostConfirm) {
          setShowLostConfirm(false)
          setLostReason('')
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, showDeleteConfirm, showDealConfirm, showLostConfirm])

  /* ── Focus dialog on mount ── */
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  /* ── Backdrop click ── */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }

  /* ── Save edits ── */
  const [saveError, setSaveError] = useState('')
  const handleSave = useCallback(() => {
    if (!lead) return
    setSaveError('')
    updateLead.mutate(
      {
        id: lead.id,
        firstName: editFirstName || null,
        lastName: editLastName || null,
        company: editCompany || null,
        address: editAddress,
        phone: editPhone,
        email: editEmail,
        source: editSource,
        pipelineId: editPipelineId || null,
        bucketId: editBucketId || null,
        assignedTo: editAssignedTo || null,
        value: editValue ? Number(editValue) : undefined,
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          setSaveError('')
          setSuccessMsg('Gespeichert')
          setTimeout(() => setSuccessMsg(''), 2000)
        },
        onError: (err) => {
          setSuccessMsg('')
          const msg = err instanceof Error ? err.message : 'Speichern fehlgeschlagen'
          setSaveError(msg)
        },
      },
    )
  }, [lead, editFirstName, editLastName, editCompany, editAddress, editPhone, editEmail, editSource, editPipelineId, editBucketId, editAssignedTo, editValue, updateLead])

  /* ── Notes auto-save on blur ── */
  const handleNotesBlur = useCallback(() => {
    if (!lead) return
    if (notesText !== (lead.notes ?? '')) {
      updateLead.mutate({ id: lead.id, notes: notesText })
      setNotesSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }))
    }
  }, [lead, notesText, updateLead])

  /* ── Create activity ── */
  const handleCreateActivity = () => {
    if (!newActivityTitle.trim()) return
    createActivity.mutate({
      leadId,
      type: newActivityType,
      title: newActivityTitle.trim(),
      description: newActivityDesc.trim() || undefined,
    })
    setNewActivityTitle('')
    setNewActivityDesc('')
    setShowNewActivity(false)
  }

  /* ── Create reminder ── */
  const handleCreateReminder = () => {
    if (!newReminderTitle.trim() || !newReminderDate) return
    const dueAt = newReminderTime
      ? `${newReminderDate}T${newReminderTime}:00`
      : `${newReminderDate}T09:00:00`
    createReminder.mutate({
      leadId,
      title: newReminderTitle.trim(),
      description: newReminderDesc.trim() || undefined,
      dueAt,
    })
    setNewReminderTitle('')
    setNewReminderDesc('')
    setNewReminderDate('')
    setNewReminderTime('')
    setShowNewReminder(false)
  }

  /* ── Tags ── */
  const handleAddTag = (tagId: string) => {
    addLeadTags.mutate({ id: leadId, tagIds: [tagId] })
    setShowTagDropdown(false)
  }

  const handleRemoveTag = (tagId: string) => {
    removeLeadTag.mutate({ id: leadId, tagId })
  }


  /* ── Termin erstellen (Lead → Termin) ── */
  const handleCreateDeal = async () => {
    if (!lead || !apptAssignedTo || !apptDate || !apptTime) return
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unbekannt'

    try {
      await createAppointment.mutateAsync({
        contactName: name,
        contactEmail: lead.email,
        contactPhone: lead.phone,
        company: lead.company ?? undefined,
        address: apptAddress || lead.address,
        value: lead.value ?? 0,
        leadId: lead.id,
        assignedTo: apptAssignedTo,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        appointmentType: apptType,
        notes: lead.notes ?? undefined,
      })
      updateLead.mutate({ id: lead.id, status: 'CONVERTED' as LeadStatus, appointmentType: apptType })
      createActivity.mutate({
        leadId: lead.id,
        type: 'DEAL_CREATED' as ActivityType,
        title: 'Termin erstellt',
        description: `Lead wurde zu Termin konvertiert – ${name} (zugewiesen an ${users.find(u => u.id === apptAssignedTo)?.firstName ?? apptAssignedTo})`,
      })
      setShowDealConfirm(false)
      setSuccessMsg('Termin erstellt! Lead wurde konvertiert.')
      setTimeout(() => {
        setSuccessMsg('')
        onClose()
      }, 1500)
    } catch {
      setSuccessMsg('')
    }
  }

  /* ── Mark as lost ── */
  const handleMarkLost = () => {
    if (!lead || !lostReason.trim()) return
    const prevNotes = lead.notes ?? ''
    const lostNote = `[VERLOREN] ${new Date().toLocaleDateString('de-CH')}: ${lostReason.trim()}`
    const updatedNotes = prevNotes ? `${lostNote}\n\n${prevNotes}` : lostNote
    updateLead.mutate({ id: lead.id, status: 'LOST' as LeadStatus, notes: updatedNotes })
    createActivity.mutate({
      leadId: lead.id,
      type: 'STATUS_CHANGE' as ActivityType,
      title: 'Lead als verloren markiert',
      description: lostReason.trim(),
    })
    setShowLostConfirm(false)
    setLostReason('')
    setSuccessMsg('Lead als verloren markiert')
    setTimeout(() => {
      setSuccessMsg('')
      onClose()
    }, 1500)
  }

  /* ── Delete lead ── */
  const handleDelete = () => {
    deleteLead.mutate(leadId, {
      onSuccess: () => {
        onClose()
      },
    })
  }

  /* ── Derived ── */
  const initials = lead
    ? `${(lead.firstName ?? '?')[0]}${(lead.lastName ?? '?')[0]}`.toUpperCase()
    : '??'
  const sc = lead ? statusColors[lead.status] : statusColors.ACTIVE

  const selectedPipeline = pipelines.find((p) => p.id === editPipelineId)
  const buckets = selectedPipeline?.buckets ?? []

  // Available tags (not already on the lead)
  const leadTagNames = lead?.tags ?? []
  const availableTags = allTags.filter((t) => !leadTagNames.includes(t.name))

  // Find tag objects for lead tags (match by name)
  const leadTagObjects = allTags.filter((t) => leadTagNames.includes(t.name))

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'activities', label: 'Aktivitäten' },
    { key: 'notes', label: 'Notizen' },
    { key: 'documents', label: 'Dokumente' },
    { key: 'emails', label: 'E-Mail' },
    { key: 'reminders', label: 'Erinnerungen' },
    { key: 'tasks', label: 'Aufgaben' },
  ]

  /* ── Source options ── */
  const sourceOptions: { value: LeadSource; label: string }[] = (
    Object.entries(sourceLabels) as [LeadSource, string][]
  ).map(([value, label]) => ({ value, label }))

  /* ── Activity type options ── */
  const activityTypeOptions: { value: ActivityType; label: string }[] = (
    Object.entries(activityTypeConfig) as [ActivityType, { icon: typeof Phone; color: string; label: string }][]
  ).map(([value, cfg]) => ({ value, label: cfg.label }))

  /* ── Render ── */

  if (isLoading || !lead) {
    return (
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{
          background: 'rgba(6, 8, 12, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="w-[720px] max-h-[90vh] p-12 text-center"
          style={{
            background: 'rgba(255,255,255,0.035)',
            backdropFilter: 'blur(24px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full mx-auto mb-3 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
          <p className="text-[13px] text-text-sec">Lead wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'rgba(6, 8, 12, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Lead Details"
        tabIndex={-1}
        className="outline-none w-[720px] max-h-[90vh] mx-4 flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3.5 px-6 py-5 border-b border-border shrink-0">
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

          {/* Name / Company */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="Vorname"
                  className="glass-input px-3 py-1 text-[14px] font-bold w-[140px]"
                />
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Nachname"
                  className="glass-input px-3 py-1 text-[14px] font-bold w-[140px]"
                />
              </div>
            ) : (
              <h3 className="text-[15px] font-bold leading-snug">
                {lead.firstName} {lead.lastName}
              </h3>
            )}
            {isEditing ? (
              <input
                type="text"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                placeholder="Unternehmen"
                className="glass-input px-3 py-1 text-[12px] mt-1 w-[290px]"
              />
            ) : (
              lead.company && (
                <p className="text-[12px] text-text-sec truncate">{lead.company}</p>
              )
            )}
          </div>

          {/* Status badge */}
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
            style={{ background: sc.bg, color: sc.text }}
          >
            {statusLabels[lead.status]}
          </span>

          {/* Edit / Save toggle */}
          <button
            type="button"
            disabled={updateLead.isPending}
            onClick={() => {
              if (isEditing) {
                handleSave()
              } else {
                setIsEditing(true)
              }
            }}
            className={[
              'w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-200 shrink-0',
              updateLead.isPending
                ? 'text-text-dim opacity-50 cursor-wait'
                : 'text-text-dim hover:text-amber hover:bg-amber-soft',
            ].join(' ')}
            aria-label={isEditing ? 'Speichern' : 'Bearbeiten'}
          >
            {updateLead.isPending ? (
              <span className="w-4 h-4 border-2 border-amber/40 border-t-amber rounded-full animate-spin" />
            ) : isEditing ? (
              <Check size={16} strokeWidth={1.8} />
            ) : (
              <Pencil size={16} strokeWidth={1.8} />
            )}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Schliessen"
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150 shrink-0"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* ── Success Message ── */}
        {successMsg && (
          <div
            className="mx-6 mt-3 px-4 py-2.5 rounded-[10px] text-[12px] font-semibold text-center"
            style={{
              background: 'color-mix(in srgb, #34D399 12%, transparent)',
              color: '#34D399',
              border: '1px solid color-mix(in srgb, #34D399 20%, transparent)',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* ── Error Message ── */}
        {saveError && (
          <div
            className="mx-6 mt-3 px-4 py-2.5 rounded-[10px] text-[12px] font-semibold text-center"
            style={{
              background: 'color-mix(in srgb, #F87171 12%, transparent)',
              color: '#F87171',
              border: '1px solid color-mix(in srgb, #F87171 20%, transparent)',
            }}
          >
            {saveError}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="px-6 pt-4 pb-0 shrink-0">
          <div
            className="flex items-center rounded-full p-0.5"
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
        </div>

        {/* ── Tab Content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* ────────── TAB 1: Übersicht ────────── */}
          {activeTab === 'overview' && (
            <>
              {/* Kontaktdaten */}
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
                  {/* Address */}
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-text-dim shrink-0 mt-0.5" strokeWidth={1.8} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="glass-input px-3 py-1 text-[12px] flex-1"
                      />
                    ) : (
                      <span className="text-[12px] text-text-sec leading-relaxed">{lead.address}</span>
                    )}
                  </div>
                  {/* Phone */}
                  <div className="flex items-center gap-2.5">
                    <Phone size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="glass-input px-3 py-1 text-[12px] flex-1 tabular-nums"
                      />
                    ) : (
                      <span className="text-[12px] text-text-sec tabular-nums">{lead.phone}</span>
                    )}
                  </div>
                  {/* Email */}
                  <div className="flex items-center gap-2.5">
                    <Mail size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                    {isEditing ? (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="glass-input px-3 py-1 text-[12px] flex-1"
                      />
                    ) : (
                      <span className="text-[12px] text-text-sec">{lead.email}</span>
                    )}
                  </div>
                  {/* Source */}
                  <div className="flex items-center gap-2.5">
                    <Globe size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                    {isEditing ? (
                      <div className="relative flex-1">
                        <select
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value as LeadSource)}
                          className="glass-input appearance-none px-3 py-1 pr-8 text-[12px] w-full cursor-pointer"
                        >
                          {sourceOptions.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              style={{ background: '#0B0F15', color: '#F0F2F5' }}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={12}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                          strokeWidth={2}
                        />
                      </div>
                    ) : (
                      <span className="text-[12px] text-text-sec">{sourceLabels[lead.source]}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pipeline */}
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
                  {/* Pipeline name */}
                  <div className="flex items-center gap-2.5">
                    <GitBranch size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                    <div className="flex-1">
                      <span className="text-[11px] text-text-dim">Pipeline</span>
                      {isEditing ? (
                        <div className="relative mt-0.5">
                          <select
                            value={editPipelineId}
                            onChange={(e) => {
                              setEditPipelineId(e.target.value)
                              setEditBucketId('')
                            }}
                            className="glass-input appearance-none px-3 py-1 pr-8 text-[12px] w-full cursor-pointer"
                          >
                            <option value="" style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                              Keine Pipeline
                            </option>
                            {pipelines.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                style={{ background: '#0B0F15', color: '#F0F2F5' }}
                              >
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                            strokeWidth={2}
                          />
                        </div>
                      ) : (
                        <p className="text-[12px] text-text-sec font-medium">
                          {selectedPipeline?.name ?? 'Keine Pipeline'}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Bucket / Stage */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'color-mix(in srgb, #F59E0B 15%, transparent)' }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B' }} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[11px] text-text-dim">Stufe</span>
                      {isEditing ? (
                        <div className="relative mt-0.5">
                          <select
                            value={editBucketId}
                            onChange={(e) => setEditBucketId(e.target.value)}
                            className="glass-input appearance-none px-3 py-1 pr-8 text-[12px] w-full cursor-pointer"
                            disabled={!editPipelineId}
                          >
                            <option value="" style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                              Keine Stufe
                            </option>
                            {buckets.map((b) => (
                              <option
                                key={b.id}
                                value={b.id}
                                style={{ background: '#0B0F15', color: '#F0F2F5' }}
                              >
                                {b.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                            strokeWidth={2}
                          />
                        </div>
                      ) : (
                        <p className="text-[12px] text-text-sec font-medium">
                          {buckets.find((b) => b.id === lead.bucketId)?.name ?? 'Keine Stufe'}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Assigned user */}
                  <div className="flex items-center gap-2.5">
                    <User size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
                    <div className="flex-1">
                      <span className="text-[11px] text-text-dim">Zustaendig</span>
                      {isEditing ? (
                        <div className="relative mt-0.5">
                          <select
                            value={editAssignedTo}
                            onChange={(e) => setEditAssignedTo(e.target.value)}
                            className="glass-input appearance-none px-3 py-1 pr-8 text-[12px] w-full cursor-pointer"
                          >
                            <option value="" style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                              Nicht zugewiesen
                            </option>
                            {users.map((u) => (
                              <option
                                key={u.id}
                                value={u.id}
                                style={{ background: '#0B0F15', color: '#F0F2F5' }}
                              >
                                {u.firstName} {u.lastName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                            strokeWidth={2}
                          />
                        </div>
                      ) : (
                        <p className="text-[12px] text-text-sec font-medium">
                          {users.find((u) => u.id === lead.assignedTo)
                            ? `${users.find((u) => u.id === lead.assignedTo)!.firstName} ${users.find((u) => u.id === lead.assignedTo)!.lastName}`
                            : lead.assignedTo ?? 'Nicht zugewiesen'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wert */}
              <div
                className="p-4"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">
                  Wert
                </h4>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-sec font-medium">CHF</span>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="0"
                      className="glass-input px-3 py-1.5 text-[14px] font-bold tabular-nums w-[160px]"
                      min={0}
                      step={100}
                    />
                  </div>
                ) : (
                  <p className="text-[18px] font-bold tabular-nums">
                    CHF {lead.value != null ? lead.value.toLocaleString('de-CH') : '0'}
                  </p>
                )}
              </div>

              {/* Tags */}
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTagDropdown(!showTagDropdown)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-text-dim hover:text-amber hover:bg-amber-soft transition-all duration-150"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                    {showTagDropdown && availableTags.length > 0 && (
                      <div
                        className="absolute right-0 top-7 z-10 py-1 min-w-[160px] max-h-[200px] overflow-y-auto"
                        style={{
                          background: 'rgba(11, 15, 21, 0.95)',
                          backdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        }}
                      >
                        {availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleAddTag(tag.id)}
                            className="w-full text-left px-3 py-1.5 text-[12px] text-text-sec hover:text-text hover:bg-surface-hover transition-colors duration-150 flex items-center gap-2"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: tag.color }}
                            />
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {leadTagObjects.length > 0
                    ? leadTagObjects.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-text-sec group"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: tag.color }}
                          />
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag.id)}
                            className="ml-0.5 text-text-dim hover:text-red opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            aria-label={`Tag ${tag.name} entfernen`}
                          >
                            <X size={10} strokeWidth={2.5} />
                          </button>
                        </span>
                      ))
                    : leadTagNames.length > 0
                      ? leadTagNames.map((tagName) => (
                          <span
                            key={tagName}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium text-text-sec"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {tagName}
                          </span>
                        ))
                      : (
                          <span className="text-[11px] text-text-dim">Keine Tags vorhanden</span>
                        )}
                </div>
              </div>

              {/* KI-Zusammenfassung */}
              <div
                className="p-4 relative overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, #F59E0B 6%, transparent), color-mix(in srgb, #A78BFA 4%, transparent))',
                  border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
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
                      'Keine Notizen vorhanden. Die KI-Zusammenfassung wird automatisch generiert, sobald genuegend Interaktionsdaten vorliegen.'}
                  </p>
                </div>
              </div>

              {/* KI-Zusammenfassung */}
              <AiSummaryCard
                summary={lead.aiSummary}
                isGenerating={generateLeadSummary.isPending}
                onGenerate={() => generateLeadSummary.mutate(lead.id)}
                error={generateLeadSummary.error?.message || (generateLeadSummary.data as Record<string, Record<string, string>> | undefined)?.data?.error}
                compact
              />
            </>
          )}

          {/* ────────── TAB 2: Aktivitäten ────────── */}
          {activeTab === 'activities' && (
            <>
              {/* Add activity button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewActivity(!showNewActivity)}
                  className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold"
                >
                  <Plus size={14} strokeWidth={2} />
                  Aktivität
                </button>
              </div>

              {/* New activity form */}
              {showNewActivity && (
                <div
                  className="p-4 space-y-3"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">
                    Neue Aktivität
                  </h4>
                  <div className="relative">
                    <select
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value as ActivityType)}
                      className="glass-input appearance-none px-3 py-2 pr-8 text-[12px] w-full cursor-pointer"
                    >
                      {activityTypeOptions.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          style={{ background: '#0B0F15', color: '#F0F2F5' }}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                      strokeWidth={2}
                    />
                  </div>
                  <input
                    type="text"
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                    placeholder="Titel"
                    className="glass-input w-full px-3 py-2 text-[12px]"
                  />
                  <textarea
                    value={newActivityDesc}
                    onChange={(e) => setNewActivityDesc(e.target.value)}
                    placeholder="Beschreibung (optional)"
                    rows={2}
                    className="glass-input w-full px-3 py-2 text-[12px] resize-none"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowNewActivity(false)}
                      className="btn-secondary px-3.5 py-1.5 text-[12px] font-semibold"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateActivity}
                      className="btn-primary px-3.5 py-1.5 text-[12px]"
                      disabled={!newActivityTitle.trim()}
                    >
                      Hinzufuegen
                    </button>
                  </div>
                </div>
              )}

              {/* Activity timeline */}
              {activities.length > 0 ? (
                <div className="space-y-0.5">
                  {activities.map((activity) => {
                    const cfg = activityTypeConfig[activity.type]
                    const IconComp = cfg.icon
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-[12px] hover:bg-surface-hover transition-colors duration-150"
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                          }}
                        >
                          <IconComp size={14} strokeWidth={1.8} style={{ color: cfg.color }} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold truncate">{activity.text || activity.title}</p>
                            <span className="text-[11px] text-text-dim shrink-0 tabular-nums">
                              {relativeTime(activity.createdAt)}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-[12px] text-text-sec mt-0.5 leading-relaxed">
                              {activity.description}
                            </p>
                          )}
                          <p className="text-[11px] text-text-dim mt-1">
                            {activity.createdBy}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div
                  className="p-8 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <p className="text-text-dim text-[12px] font-medium">
                    Noch keine Aktivitäten erfasst.
                  </p>
                  <p className="text-text-dim text-[11px] mt-1">
                    Aktivitäten werden hier chronologisch angezeigt.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ────────── TAB 3: Notizen ────────── */}
          {activeTab === 'notes' && (
            <div
              className="p-4 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">
                  Notizen
                </h4>
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

          {/* ────────── TAB 4: Dokumente ────────── */}
          {activeTab === 'documents' && (
            <DocumentSection contactId={lead.contactId} entityType="LEAD" entityId={lead.id} />
          )}

          {/* ────────── TAB 5: E-Mail ────────── */}
          {activeTab === 'emails' && (
            <EmailSection contactId={lead.contactId} contactEmail={lead.email} contactName={[lead.firstName, lead.lastName].filter(Boolean).join(' ')} entityType="LEAD" entityId={lead.id} />
          )}

          {/* ────────── TAB 6: Erinnerungen ────────── */}
          {activeTab === 'reminders' && (
            <>
              {/* Add reminder button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewReminder(!showNewReminder)}
                  className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold"
                >
                  <Plus size={14} strokeWidth={2} />
                  Erinnerung
                </button>
              </div>

              {/* New reminder form */}
              {showNewReminder && (
                <div
                  className="p-4 space-y-3"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">
                    Neue Erinnerung
                  </h4>
                  <input
                    type="text"
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    placeholder="Titel"
                    className="glass-input w-full px-3 py-2 text-[12px]"
                  />
                  <textarea
                    value={newReminderDesc}
                    onChange={(e) => setNewReminderDesc(e.target.value)}
                    placeholder="Beschreibung (optional)"
                    rows={2}
                    className="glass-input w-full px-3 py-2 text-[12px] resize-none"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-sec mb-1">
                        Datum
                      </label>
                      <input
                        type="date"
                        value={newReminderDate}
                        onChange={(e) => setNewReminderDate(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-sec mb-1">
                        Uhrzeit
                      </label>
                      <input
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowNewReminder(false)}
                      className="btn-secondary px-3.5 py-1.5 text-[12px] font-semibold"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateReminder}
                      className="btn-primary px-3.5 py-1.5 text-[12px]"
                      disabled={!newReminderTitle.trim() || !newReminderDate}
                    >
                      Hinzufuegen
                    </button>
                  </div>
                </div>
              )}

              {/* Reminders list */}
              {reminders.length > 0 ? (
                <div className="space-y-1.5">
                  {reminders
                    .filter((r) => !r.dismissed)
                    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
                    .map((reminder) => {
                      const isOverdue = new Date(reminder.dueAt).getTime() < Date.now()
                      return (
                        <div
                          key={reminder.id}
                          className="flex items-start gap-3 p-3 rounded-[12px] transition-colors duration-150"
                          style={{
                            background: isOverdue
                              ? 'color-mix(in srgb, #F87171 6%, transparent)'
                              : undefined,
                            border: isOverdue
                              ? '1px solid color-mix(in srgb, #F87171 15%, transparent)'
                              : undefined,
                          }}
                        >
                          {/* Icon */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: isOverdue
                                ? 'color-mix(in srgb, #F87171 15%, transparent)'
                                : 'color-mix(in srgb, #F59E0B 12%, transparent)',
                            }}
                          >
                            {isOverdue ? (
                              <AlertTriangle size={14} strokeWidth={1.8} style={{ color: '#F87171' }} />
                            ) : (
                              <Bell size={14} strokeWidth={1.8} className="text-amber" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className="text-[13px] font-semibold truncate"
                                style={{ color: isOverdue ? '#F87171' : undefined }}
                              >
                                {reminder.title}
                              </p>
                              <button
                                type="button"
                                onClick={() => dismissReminder.mutate(reminder.id)}
                                className="btn-secondary px-2.5 py-1 text-[11px] font-semibold shrink-0"
                              >
                                Erledigt
                              </button>
                            </div>
                            {reminder.description && (
                              <p className="text-[12px] text-text-sec mt-0.5 leading-relaxed">
                                {reminder.description}
                              </p>
                            )}
                            <p className="text-[11px] text-text-dim mt-1 tabular-nums flex items-center gap-1">
                              <Clock size={10} strokeWidth={2} />
                              {new Date(reminder.dueAt).toLocaleDateString('de-CH', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}{' '}
                              {new Date(reminder.dueAt).toLocaleTimeString('de-CH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {isOverdue && (
                                <span className="text-red font-semibold ml-1">Überfällig</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div
                  className="p-8 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <p className="text-text-dim text-[12px] font-medium">
                    Keine Erinnerungen vorhanden.
                  </p>
                  <p className="text-text-dim text-[11px] mt-1">
                    Erstellen Sie Erinnerungen, um wichtige Termine nicht zu verpassen.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ────────── TAB 7: Aufgaben ────────── */}
          {activeTab === 'tasks' && lead && (
            <TaskSection
              module="LEAD"
              referenceId={lead.id}
              referenceTitle={[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Lead'}
            />
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center gap-2.5 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold"
            onClick={() => {
              if (lead.phone) window.open(`tel:${lead.phone}`)
            }}
          >
            <PhoneCall size={14} strokeWidth={1.8} />
            Anrufen
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold"
            onClick={() => setActiveTab('emails')}
          >
            <Send size={14} strokeWidth={1.8} />
            E-Mail
          </button>
          <button
            type="button"
            onClick={() => setShowLostConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold text-text-dim hover:text-red transition-colors duration-150 rounded-full"
            style={{ border: '1px solid rgba(248,113,113,0.15)' }}
          >
            <AlertTriangle size={13} strokeWidth={1.8} />
            Verloren
          </button>
          <button
            type="button"
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-[12px] flex-1 justify-center"
            onClick={() => {
              if (lead) {
                setApptAddress(lead.address ?? '')
                setApptAssignedTo('')
                setApptDate('')
                setApptTime('')
              }
              setShowDealConfirm(true)
            }}
          >
            <CalendarCheck size={14} strokeWidth={2} />
            Termin vereinbaren
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium text-text-dim hover:text-red transition-colors duration-150"
          >
            <Trash2 size={13} strokeWidth={1.8} />
            Löschen
          </button>
        </div>

        {/* ── Delete Confirmation ── */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{
              background: 'rgba(6, 8, 12, 0.6)',
              backdropFilter: 'blur(4px)',
              borderRadius: 'var(--radius-lg)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDeleteConfirm(false)
            }}
          >
            <div
              className="w-[360px] mx-4 p-6 text-center"
              style={{
                background: 'rgba(11, 15, 21, 0.98)',
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
                <Trash2 size={20} className="text-red" strokeWidth={1.8} />
              </div>
              <h3 className="text-[15px] font-bold mb-1">Lead wirklich löschen?</h3>
              <p className="text-[12px] text-text-sec mb-5">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1 px-4 py-2.5 text-[12px] font-semibold text-center"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 text-[12px] font-bold text-center rounded-full cursor-pointer transition-all duration-200"
                  style={{
                    background: 'color-mix(in srgb, #F87171 15%, transparent)',
                    color: '#F87171',
                    border: '1px solid color-mix(in srgb, #F87171 25%, transparent)',
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Deal Confirmation ── */}
        {showDealConfirm && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{
              background: 'rgba(6, 8, 12, 0.6)',
              backdropFilter: 'blur(4px)',
              borderRadius: 'var(--radius-lg)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDealConfirm(false)
            }}
          >
            <div
              className="w-[440px] mx-4 p-6"
              style={{
                background: 'rgba(11, 15, 21, 0.98)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, color-mix(in srgb, #F59E0B 15%, transparent), color-mix(in srgb, #F97316 10%, transparent))',
                  }}
                >
                  <CalendarCheck size={18} className="text-amber" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold">Termin vereinbaren</h3>
                  <p className="text-[11px] text-text-sec">Verkäufer, Datum, Zeit und Ort festlegen</p>
                </div>
              </div>

              {/* Verkäufer */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                  Verkäufer zuweisen *
                </label>
                <select
                  value={apptAssignedTo}
                  onChange={(e) => setApptAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
                >
                  <option value="">Verkäufer auswählen...</option>
                  {users
                    .filter((u) => u.role === 'VERTRIEB' || u.role === 'GL')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} – {u.role === 'VERTRIEB' ? 'Vertrieb' : 'Geschäftsleitung'}
                      </option>
                    ))}
                </select>
              </div>

              {/* Termin-Typ */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                  Termin-Typ *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApptType('VOR_ORT')}
                    className={[
                      'flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 border',
                      apptType === 'VOR_ORT'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-surface-hover border-border text-text-dim hover:text-text',
                    ].join(' ')}
                  >
                    <MapPin size={14} className="inline mr-1.5 -mt-0.5" strokeWidth={1.8} />
                    Vor Ort
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptType('ONLINE')}
                    className={[
                      'flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 border',
                      apptType === 'ONLINE'
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        : 'bg-surface-hover border-border text-text-dim hover:text-text',
                    ].join(' ')}
                  >
                    <Globe size={14} className="inline mr-1.5 -mt-0.5" strokeWidth={1.8} />
                    Online
                  </button>
                </div>
              </div>

              {/* Datum & Zeit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                    Zeit *
                  </label>
                  <input
                    type="time"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
                  />
                </div>
              </div>

              {/* Adresse / Ort */}
              <div className="mb-5">
                <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                  Ort / Adresse
                </label>
                <input
                  type="text"
                  value={apptAddress}
                  onChange={(e) => setApptAddress(e.target.value)}
                  placeholder="Adresse des Termins"
                  className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
                />
              </div>

              {/* Info */}
              <div
                className="mb-5 px-3 py-2.5 rounded-lg text-[11px] text-text-sec"
                style={{ background: 'color-mix(in srgb, #F59E0B 6%, transparent)' }}
              >
                Der Termin erscheint beim zugewiesenen Verkäufer unter <strong className="text-amber">Meine Termine</strong>. Der Lead-Status wird auf &quot;Konvertiert&quot; gesetzt.
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDealConfirm(false)}
                  className="btn-secondary flex-1 px-4 py-2.5 text-[12px] font-semibold text-center"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleCreateDeal}
                  disabled={!apptAssignedTo || !apptDate || !apptTime}
                  className="btn-primary flex-1 px-4 py-2.5 text-[12px] text-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Termin erstellen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Lost Confirmation with required reason ── */}
        {showLostConfirm && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{
              background: 'rgba(6, 8, 12, 0.6)',
              backdropFilter: 'blur(4px)',
              borderRadius: 'var(--radius-lg)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLostConfirm(false)
                setLostReason('')
              }
            }}
          >
            <div
              className="w-[400px] mx-4 p-6"
              style={{
                background: 'rgba(11, 15, 21, 0.98)',
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
              <h3 className="text-[15px] font-bold mb-1 text-center">Lead als verloren markieren?</h3>
              <p className="text-[12px] text-text-sec mb-4 text-center">
                Bitte gib eine Begruendung an, warum der Lead verloren ist.
              </p>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="z.B. Kein Budget, anderer Anbieter gewaehlt, kein Interesse mehr..."
                rows={3}
                className="glass-input w-full px-4 py-2.5 text-[12px] resize-none mb-4"
                autoFocus
              />
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowLostConfirm(false)
                    setLostReason('')
                  }}
                  className="btn-secondary flex-1 px-4 py-2.5 text-[12px] font-semibold text-center"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleMarkLost}
                  disabled={!lostReason.trim()}
                  className="flex-1 px-4 py-2.5 text-[12px] font-bold text-center rounded-full cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'color-mix(in srgb, #F87171 15%, transparent)',
                    color: '#F87171',
                    border: '1px solid color-mix(in srgb, #F87171 25%, transparent)',
                  }}
                >
                  Als verloren markieren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
