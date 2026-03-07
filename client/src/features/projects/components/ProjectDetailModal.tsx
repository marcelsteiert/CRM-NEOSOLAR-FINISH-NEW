import { useState, useEffect, useRef } from 'react'
import {
  X, AlertTriangle, MapPin, Phone, Mail, Building2, Sun, Zap, CheckCircle2,
  FolderKanban, Check, Loader2, Pencil, Save, XCircle,
  ExternalLink, FileText, TrendingUp, MessageSquare, PhoneCall,
  Users as UsersIcon, Send, GitBranch, Calendar, FileCheck, Clock,
} from 'lucide-react'
import {
  useProject, usePhaseDefinitions, useToggleStep, useUpdateProject, useAddProjectActivity,
  phaseLabels, phaseColors, priorityLabels, priorityColors, formatCHF, computePhaseProgress,
  activityTypeLabels, activityTypeColors,
  type ProjectPhase, type ProjectPriority, type ProjectActivityType,
} from '@/hooks/useProjects'
import { usePartners } from '@/hooks/useProjects'
import DocumentSection from '@/components/ui/DocumentSection'

const phaseOrder: ProjectPhase[] = ['admin', 'montage', 'elektro', 'abschluss']
const phaseIcons: Record<ProjectPhase, typeof FolderKanban> = {
  admin: FolderKanban,
  montage: Sun,
  elektro: Zap,
  abschluss: CheckCircle2,
}

const activityIcons: Record<ProjectActivityType, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  NOTE: MessageSquare,
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: UsersIcon,
  STATUS_CHANGE: Zap,
  SYSTEM: Zap,
}

type ProjectTab = 'overview' | 'activities' | 'notes' | 'documents'

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

interface Props {
  projectId: string
  onClose: () => void
}

export default function ProjectDetailModal({ projectId, onClose }: Props) {
  const { data: projectData, isLoading } = useProject(projectId)
  const { data: phasesData } = usePhaseDefinitions()
  const { data: partnersData } = usePartners()
  const toggleStep = useToggleStep()
  const updateProject = useUpdateProject()
  const addActivity = useAddProjectActivity()

  const project = projectData?.data
  const phases = phasesData?.data ?? []
  const partners = partnersData?.data ?? []

  // Tab state
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview')

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editKwp, setEditKwp] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editMontagePartner, setEditMontagePartner] = useState('')
  const [editElektroPartner, setEditElektroPartner] = useState('')
  const [editProjectManager, setEditProjectManager] = useState('')
  const [editPriority, setEditPriority] = useState<ProjectPriority>('MEDIUM')
  const [editStartDate, setEditStartDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Other state
  const [activePhaseTab, setActivePhaseTab] = useState<ProjectPhase>('admin')
  const [editKalk, setEditKalk] = useState(false)
  const [kalkSoll, setKalkSoll] = useState('')
  const [kalkIst, setKalkIst] = useState('')
  const [editRisk, setEditRisk] = useState(false)
  const [riskNote, setRiskNote] = useState('')
  const [activityText, setActivityText] = useState('')
  const [activityType, setActivityType] = useState<ProjectActivityType>('NOTE')
  const [successMsg, setSuccessMsg] = useState('')

  // Notes (auto-save)
  const [notesText, setNotesText] = useState('')
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null)

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (project) {
      setActivePhaseTab(project.phase)
      setKalkSoll(String(project.kalkulation.soll))
      setKalkIst(project.kalkulation.ist !== null ? String(project.kalkulation.ist) : '')
      setRiskNote(project.riskNote ?? '')
      setNotesText(project.notes ?? '')
    }
  }, [project])

  const startEditing = () => {
    if (!project) return
    setEditName(project.name)
    setEditDesc(project.description)
    setEditKwp(String(project.kWp))
    setEditValue(String(project.value))
    setEditAddress(project.address)
    setEditPhone(project.phone)
    setEditEmail(project.email)
    setEditCompany(project.company ?? '')
    setEditMontagePartner(project.montagePartner)
    setEditElektroPartner(project.elektroPartner)
    setEditProjectManager(project.projectManager)
    setEditPriority(project.priority)
    setEditStartDate(project.startDate)
    setEditNotes(project.notes ?? '')
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (!project) return
    updateProject.mutate({
      id: projectId,
      name: editName.trim(),
      description: editDesc.trim(),
      kWp: Number(editKwp) || 0,
      value: Number(editValue) || 0,
      address: editAddress.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      company: editCompany.trim() || undefined,
      montagePartner: editMontagePartner,
      elektroPartner: editElektroPartner,
      projectManager: editProjectManager.trim(),
      priority: editPriority,
      startDate: editStartDate,
      notes: editNotes.trim() || undefined,
    })
    setIsEditing(false)
    setSuccessMsg('Gespeichert')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  const handleNotesBlur = () => {
    if (!project) return
    if (notesText !== (project.notes ?? '')) {
      updateProject.mutate({ id: projectId, notes: notesText.trim() || undefined })
      setNotesSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }))
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) setIsEditing(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, isEditing])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose()
  }

  const handleToggleStep = (phase: ProjectPhase, stepIndex: number) => {
    toggleStep.mutate({ projectId, phase, stepIndex })
  }

  const handleSaveKalk = () => {
    updateProject.mutate({
      id: projectId,
      kalkulation: { soll: Number(kalkSoll) || 0, ist: kalkIst ? Number(kalkIst) : null },
    })
    setEditKalk(false)
  }

  const handleToggleRisk = () => {
    if (!project) return
    if (project.risk) {
      updateProject.mutate({ id: projectId, risk: false, riskNote: null })
    } else {
      setEditRisk(true)
    }
  }

  const handleSaveRisk = () => {
    updateProject.mutate({ id: projectId, risk: true, riskNote: riskNote.trim() || null })
    setEditRisk(false)
  }

  const handleAddActivity = () => {
    if (!project || !activityText.trim()) return
    addActivity.mutate({ projectId: project.id, type: activityType, text: activityText.trim() })
    setActivityText('')
    setActivityType('NOTE')
  }

  if (isLoading || !project) {
    return (
      <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="glass-card p-8">
          <Loader2 size={24} className="animate-spin text-text-dim" />
        </div>
      </div>
    )
  }

  const totalDone = Object.values(project.progress).flat().filter(Boolean).length
  const totalSteps = Object.values(project.progress).flat().length
  const totalPercent = totalSteps ? Math.round((totalDone / totalSteps) * 100) : 0

  const kalkDiff = project.kalkulation.ist !== null ? project.kalkulation.ist - project.kalkulation.soll : null
  const margin = project.kalkulation.ist !== null && project.value > 0
    ? ((project.value - project.kalkulation.ist) / project.value * 100).toFixed(1)
    : null

  const activePhaseDef = phases.find((p) => p.id === activePhaseTab)
  const activePhaseSteps = activePhaseDef?.steps ?? []
  const activePhaseProgress = project.progress[activePhaseTab] ?? []

  const montagePartners = partners.filter((p) => p.type === 'montage')
  const elektroPartners = partners.filter((p) => p.type === 'elektro')

  const sortedActivities = [...(project.activities ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const tabs: { key: ProjectTab; label: string }[] = [
    { key: 'overview', label: 'Übersicht' },
    { key: 'activities', label: `Aktivitäten (${sortedActivities.length})` },
    { key: 'notes', label: 'Notizen' },
    { key: 'documents', label: 'Dokumente' },
  ]

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Projektdetail"
        className="outline-none w-full max-w-[960px] mx-4 max-h-[92vh] flex flex-col"
        style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              {isEditing ? (
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="glass-input px-3 py-1.5 text-[17px] font-bold flex-1" autoFocus />
              ) : (
                <h2 className="text-[18px] font-bold tracking-[-0.02em] truncate">{project.name}</h2>
              )}
              {project.risk && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                  <AlertTriangle size={10} /> Risiko
                </span>
              )}
              {isEditing ? (
                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as ProjectPriority)} className="glass-input px-2 py-1 text-[11px] shrink-0">
                  {Object.entries(priorityLabels).map(([k, l]) => <option key={k} value={k} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{l}</option>)}
                </select>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0" style={{ background: `color-mix(in srgb, ${priorityColors[project.priority]} 12%, transparent)`, color: priorityColors[project.priority] }}>
                  {priorityLabels[project.priority]}
                </span>
              )}
            </div>
            {isEditing ? (
              <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Beschreibung" className="glass-input w-full px-3 py-1.5 text-[13px] mt-1" />
            ) : (
              <p className="text-[13px] text-text-sec">{project.description}</p>
            )}
            {successMsg && <p className="text-[11px] text-emerald-400 mt-1">{successMsg}</p>}
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="btn-secondary px-3 py-1.5 text-[11px]">Abbrechen</button>
                <button onClick={handleSaveEdit} className="btn-primary px-3 py-1.5 text-[11px] flex items-center gap-1"><Save size={12} /> Speichern</button>
              </>
            ) : (
              <button onClick={startEditing} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all">
                <Pencil size={14} strokeWidth={1.8} />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Dialog schliessen" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150">
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ────── TAB: Übersicht ────── */}
          {activeTab === 'overview' && (
            <div className="flex flex-col md:flex-row gap-5 px-4 sm:px-6 py-5">
              {/* LEFT COLUMN */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Contact */}
                  <div className="glass-card p-4 space-y-2.5">
                    {isEditing ? (
                      <>
                        <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Adresse" className="glass-input w-full px-3 py-1.5 text-[12px]" />
                        <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Telefon" className="glass-input w-full px-3 py-1.5 text-[12px]" />
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="E-Mail" className="glass-input w-full px-3 py-1.5 text-[12px]" />
                        <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Unternehmen" className="glass-input w-full px-3 py-1.5 text-[12px]" />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-text-dim shrink-0" />
                          <span className="text-[12px] text-text-sec">{project.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-text-dim shrink-0" />
                          <a href={`tel:${project.phone}`} className="text-[12px] text-text-sec hover:text-text transition-colors">{project.phone || '–'}</a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-text-dim shrink-0" />
                          <a href={`mailto:${project.email}`} className="text-[12px] text-text-sec hover:text-text transition-colors truncate">{project.email}</a>
                        </div>
                        {project.company && (
                          <div className="flex items-center gap-2">
                            <Building2 size={13} className="text-text-dim shrink-0" />
                            <span className="text-[12px] text-text-sec">{project.company}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Project data */}
                  <div className="glass-card p-4 space-y-2.5">
                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-dim w-12 shrink-0">kWp</span>
                          <input type="number" value={editKwp} onChange={(e) => setEditKwp(e.target.value)} className="glass-input flex-1 px-2 py-1 text-[12px] tabular-nums" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-dim w-12 shrink-0">CHF</span>
                          <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="glass-input flex-1 px-2 py-1 text-[12px] tabular-nums" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-dim w-12 shrink-0">Start</span>
                          <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="glass-input flex-1 px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-dim w-12 shrink-0">PL</span>
                          <input type="text" value={editProjectManager} onChange={(e) => setEditProjectManager(e.target.value)} placeholder="Projektleiter" className="glass-input flex-1 px-2 py-1 text-[12px]" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Leistung</span>
                          <span className="font-bold">{project.kWp} kWp</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Auftragswert</span>
                          <span className="font-bold" style={{ color: '#F59E0B' }}>{formatCHF(project.value)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Start</span>
                          <span className="font-mono text-[11px]">{new Date(project.startDate).toLocaleDateString('de-CH')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Projektleiter</span>
                          <span className="font-semibold">{project.projectManager || '–'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Partners */}
                  <div className="glass-card p-4 space-y-2.5">
                    {isEditing ? (
                      <>
                        <div>
                          <span className="text-[10px] text-text-dim">Montage-Partner</span>
                          <select value={editMontagePartner} onChange={(e) => setEditMontagePartner(e.target.value)} className="glass-input w-full px-2 py-1 text-[12px] mt-0.5">
                            <option value="" style={{ background: '#0B0F15' }}>– Kein Partner –</option>
                            {montagePartners.map((p) => <option key={p.id} value={p.name} style={{ background: '#0B0F15' }}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-dim">Elektro-Partner</span>
                          <select value={editElektroPartner} onChange={(e) => setEditElektroPartner(e.target.value)} className="glass-input w-full px-2 py-1 text-[12px] mt-0.5">
                            <option value="" style={{ background: '#0B0F15' }}>– Kein Partner –</option>
                            {elektroPartners.map((p) => <option key={p.id} value={p.name} style={{ background: '#0B0F15' }}>{p.name}</option>)}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Montage</span>
                          <span className="text-[11px] font-semibold">{project.montagePartner || '–'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Elektro</span>
                          <span className="text-[11px] font-semibold">{project.elektroPartner || '–'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-bold">Gesamtfortschritt</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: totalPercent === 100 ? '#34D399' : '#F59E0B' }}>
                      {totalPercent}% · {totalDone}/{totalSteps} Schritte
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {phaseOrder.map((ph) => {
                      const pp = computePhaseProgress(project.progress, ph)
                      const color = phaseColors[ph]
                      const Icon = phaseIcons[ph]
                      return (
                        <div key={ph}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={12} style={{ color }} />
                            <span className="text-[11px] text-text-dim">{phaseLabels[ph]}</span>
                            <span className="ml-auto text-[10px] font-mono" style={{ color }}>{pp.percent}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pp.percent}%`, background: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Phase Tabs + Checklist */}
                <div className="glass-card overflow-hidden">
                  <div className="flex border-b border-border">
                    {phaseOrder.map((ph) => {
                      const active = activePhaseTab === ph
                      const color = phaseColors[ph]
                      const Icon = phaseIcons[ph]
                      const pp = computePhaseProgress(project.progress, ph)
                      return (
                        <button
                          key={ph}
                          onClick={() => setActivePhaseTab(ph)}
                          className={`flex items-center gap-1.5 px-5 py-3 text-[12px] font-semibold transition-all duration-150 border-b-2 ${
                            active ? 'text-text' : 'text-text-dim hover:text-text-sec border-transparent'
                          }`}
                          style={active ? { borderBottomColor: color } : undefined}
                        >
                          <Icon size={13} style={{ color: active ? color : undefined }} />
                          {phaseLabels[ph]}
                          <span className="ml-1 text-[10px] font-mono tabular-nums">({pp.done}/{pp.total})</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="p-5 space-y-1.5">
                    {activePhaseSteps.map((step, idx) => {
                      const done = activePhaseProgress[idx] === 1
                      const color = phaseColors[activePhaseTab]
                      return (
                        <button
                          key={idx}
                          onClick={() => handleToggleStep(activePhaseTab, idx)}
                          disabled={toggleStep.isPending}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-left transition-all duration-150 ${
                            done ? 'opacity-70' : 'hover:bg-surface-hover'
                          }`}
                          style={done ? { background: `color-mix(in srgb, ${color} 6%, transparent)` } : undefined}
                        >
                          <div
                            className="w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0 transition-all duration-200"
                            style={{ background: done ? color : 'transparent', border: done ? 'none' : '1.5px solid rgba(255,255,255,0.15)' }}
                          >
                            {done && <Check size={12} strokeWidth={2.5} className="text-white" />}
                          </div>
                          <span className={`text-[13px] ${done ? 'line-through text-text-dim' : 'text-text'}`}>{step}</span>
                          <span className="ml-auto text-[10px] font-mono text-text-dim">#{idx + 1}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Nachkalkulation + Risiko */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} style={{ color: '#34D399' }} />
                        <h3 className="text-[13px] font-bold">Nachkalkulation</h3>
                      </div>
                      <button onClick={() => setEditKalk(!editKalk)} className="w-6 h-6 rounded-[6px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all">
                        {editKalk ? <XCircle size={13} /> : <Pencil size={12} />}
                      </button>
                    </div>
                    {editKalk ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-text-dim mb-1">Soll (CHF)</label>
                          <input type="number" value={kalkSoll} onChange={(e) => setKalkSoll(e.target.value)} className="glass-input w-full px-3 py-2 text-[13px] tabular-nums" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-text-dim mb-1">Ist (CHF)</label>
                          <input type="number" value={kalkIst} onChange={(e) => setKalkIst(e.target.value)} placeholder="Noch nicht erfasst" className="glass-input w-full px-3 py-2 text-[13px] tabular-nums" />
                        </div>
                        <button onClick={handleSaveKalk} className="btn-primary w-full py-2 text-[12px] flex items-center justify-center gap-1.5">
                          <Save size={12} /> Speichern
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Soll</span>
                          <span className="font-bold tabular-nums">{formatCHF(project.kalkulation.soll)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-dim">Ist</span>
                          <span className="font-bold tabular-nums">{project.kalkulation.ist !== null ? formatCHF(project.kalkulation.ist) : '–'}</span>
                        </div>
                        {kalkDiff !== null && (
                          <>
                            <div className="border-t border-border my-1" />
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="text-text-dim">Differenz</span>
                              <span className="font-bold tabular-nums" style={{ color: kalkDiff <= 0 ? '#34D399' : '#F87171' }}>
                                {kalkDiff <= 0 ? '' : '+'}{formatCHF(kalkDiff)}
                              </span>
                            </div>
                            {margin && (
                              <div className="flex items-center justify-between text-[12px]">
                                <span className="text-text-dim">Marge</span>
                                <span className="font-bold tabular-nums" style={{ color: Number(margin) >= 0 ? '#34D399' : '#F87171' }}>{margin}%</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className={project.risk ? 'text-red' : 'text-text-dim'} />
                        <h3 className="text-[13px] font-bold">Risiko-Status</h3>
                      </div>
                      <button onClick={handleToggleRisk} className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-all"
                        style={project.risk ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' } : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
                      >
                        {project.risk ? 'Risiko aufheben' : 'Als Risiko markieren'}
                      </button>
                    </div>
                    {editRisk ? (
                      <div className="space-y-3">
                        <textarea value={riskNote} onChange={(e) => setRiskNote(e.target.value)} placeholder="Grund für die Risiko-Markierung..." rows={3} className="glass-input w-full px-3 py-2 text-[13px] resize-none" />
                        <button onClick={handleSaveRisk} className="btn-primary w-full py-2 text-[12px] flex items-center justify-center gap-1.5">
                          <Save size={12} /> Risiko speichern
                        </button>
                      </div>
                    ) : project.risk ? (
                      <div className="px-3 py-2.5 rounded-[8px] text-[12px]" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                        <p className="text-red font-semibold mb-0.5">Aktives Risiko</p>
                        <p className="text-text-sec">{project.riskNote || 'Kein Beschrieb'}</p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-text-dim">Kein Risiko markiert</p>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="w-full md:w-[280px] shrink-0 space-y-5">
                {/* Kundenreise */}
                {(project.leadId || project.appointmentId || project.dealId) && (
                  <div className="glass-card p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <GitBranch size={12} className="text-text-dim" />
                      <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-text-dim">Kundenreise</span>
                    </div>
                    <div className="space-y-0">
                      {[
                        { id: project.leadId, label: 'Lead', icon: UsersIcon, color: '#A78BFA', desc: 'Erstkontakt' },
                        { id: project.appointmentId, label: 'Termin', icon: Calendar, color: '#34D399', desc: 'Besichtigung' },
                        { id: project.dealId, label: 'Angebot', icon: FileCheck, color: '#60A5FA', desc: 'Offerte' },
                        { id: project.id, label: 'Projekt', icon: FolderKanban, color: '#F59E0B', desc: 'Ausführung' },
                      ].map((step, i, arr) => {
                        const active = !!step.id
                        const StepIcon = step.icon
                        const isLast = i === arr.length - 1
                        return (
                          <div key={step.label} className="flex items-stretch gap-3">
                            <div className="flex flex-col items-center w-6 shrink-0">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  background: active ? `color-mix(in srgb, ${step.color} 20%, transparent)` : 'rgba(255,255,255,0.05)',
                                  border: `1.5px solid ${active ? step.color : 'rgba(255,255,255,0.1)'}`,
                                }}
                              >
                                {active && <StepIcon size={10} style={{ color: step.color }} strokeWidth={2} />}
                              </div>
                              {!isLast && (
                                <div className="w-px flex-1 min-h-[16px]" style={{ background: active && arr[i + 1]?.id ? step.color : 'rgba(255,255,255,0.08)' }} />
                              )}
                            </div>
                            <div className="pb-2.5">
                              <span className={`text-[11px] font-semibold ${active ? 'text-text' : 'text-text-dim'}`}>{step.label}</span>
                              {active && step.id !== project.id && (
                                <span className="flex items-center gap-1 text-[9px] mt-0.5" style={{ color: step.color }}>
                                  <ExternalLink size={8} /> {step.id}
                                </span>
                              )}
                              {isLast && <span className="text-[9px] text-text-dim block mt-0.5">{step.desc}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ────── TAB: Aktivitäten ────── */}
          {activeTab === 'activities' && (
            <div className="px-4 sm:px-6 py-5 space-y-4">
              {/* Neue Aktivität */}
              <div className="p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Neue Aktivität</h4>
                <div className="flex gap-1.5">
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as ProjectActivityType)}
                    className="glass-input px-2 py-1.5 text-[10px] w-[90px] shrink-0"
                  >
                    {(['NOTE', 'CALL', 'EMAIL', 'MEETING'] as ProjectActivityType[]).map((t) => (
                      <option key={t} value={t} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{activityTypeLabels[t]}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddActivity() }}
                    placeholder="Aktivität hinzufügen..."
                    className="glass-input flex-1 px-2.5 py-1.5 text-[11px]"
                  />
                  <button
                    onClick={handleAddActivity}
                    disabled={!activityText.trim() || addActivity.isPending}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-dim hover:text-amber transition-all shrink-0"
                    style={{ background: activityText.trim() ? 'color-mix(in srgb, #F59E0B 12%, transparent)' : undefined }}
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>

              {/* Aktivitäten-Liste */}
              {sortedActivities.length === 0 ? (
                <div className="p-8 text-center" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-text-dim text-[12px] font-medium">Noch keine Aktivitäten</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {sortedActivities.map((act) => {
                    const IconComp = activityIcons[act.type] ?? MessageSquare
                    const color = activityTypeColors[act.type] ?? '#94A3B8'
                    return (
                      <div key={act.id} className="flex items-start gap-3 p-3 rounded-[12px] hover:bg-surface-hover transition-colors duration-150">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                          <IconComp size={13} strokeWidth={1.8} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-text-sec leading-relaxed">{act.text}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-dim">
                            <span style={{ color }}>{activityTypeLabels[act.type]}</span>
                            <span>·</span>
                            <span>{relativeTime(act.createdAt)}</span>
                            <span>·</span>
                            <span>{act.createdBy}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ────── TAB: Notizen ────── */}
          {activeTab === 'notes' && (
            <div className="px-4 sm:px-6 py-5">
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
                  placeholder="Notizen zum Projekt..."
                  rows={12}
                  className="glass-input w-full px-4 py-3 text-[13px] leading-relaxed resize-none"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>
          )}

          {/* ────── TAB: Dokumente ────── */}
          {activeTab === 'documents' && (
            <div className="px-4 sm:px-6 py-5">
              <DocumentSection contactId={project.contactId} entityType="PROJEKT" entityId={project.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
