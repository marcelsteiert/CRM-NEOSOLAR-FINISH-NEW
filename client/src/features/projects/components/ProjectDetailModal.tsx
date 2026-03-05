import { useState, useEffect, useRef } from 'react'
import {
  X, AlertTriangle, MapPin, Phone, Mail, Building2, Sun, Zap, CheckCircle2,
  FolderKanban, User, Clock, Star, ChevronRight, Check, Loader2, Pencil, Save, XCircle,
  ExternalLink, FileText, TrendingUp,
} from 'lucide-react'
import {
  useProject, usePhaseDefinitions, useToggleStep, useUpdateProject,
  phaseLabels, phaseColors, priorityLabels, priorityColors, formatCHF, computePhaseProgress,
  type ProjectPhase, type Project,
} from '@/hooks/useProjects'

const phaseOrder: ProjectPhase[] = ['admin', 'montage', 'elektro', 'abschluss']
const phaseIcons: Record<ProjectPhase, typeof FolderKanban> = {
  admin: FolderKanban,
  montage: Sun,
  elektro: Zap,
  abschluss: CheckCircle2,
}

interface Props {
  projectId: string
  onClose: () => void
}

export default function ProjectDetailModal({ projectId, onClose }: Props) {
  const { data: projectData, isLoading } = useProject(projectId)
  const { data: phasesData } = usePhaseDefinitions()
  const toggleStep = useToggleStep()
  const updateProject = useUpdateProject()

  const project = projectData?.data
  const phases = phasesData?.data ?? []

  const [activePhaseTab, setActivePhaseTab] = useState<ProjectPhase>('admin')
  const [editKalk, setEditKalk] = useState(false)
  const [kalkSoll, setKalkSoll] = useState('')
  const [kalkIst, setKalkIst] = useState('')
  const [editRisk, setEditRisk] = useState(false)
  const [riskNote, setRiskNote] = useState('')

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (project) {
      setActivePhaseTab(project.phase)
      setKalkSoll(String(project.kalkulation.soll))
      setKalkIst(project.kalkulation.ist !== null ? String(project.kalkulation.ist) : '')
      setRiskNote(project.riskNote ?? '')
    }
  }, [project])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

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

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Projektdetail"
        className="outline-none w-full max-w-[920px] mx-4 max-h-[92vh] flex flex-col"
        style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[18px] font-bold tracking-[-0.02em] truncate">{project.name}</h2>
              {project.risk && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                  <AlertTriangle size={10} /> Risiko
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: `color-mix(in srgb, ${priorityColors[project.priority]} 12%, transparent)`, color: priorityColors[project.priority] }}>
                {priorityLabels[project.priority]}
              </span>
            </div>
            <p className="text-[13px] text-text-sec">{project.description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Dialog schliessen" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150 ml-4 shrink-0">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Info Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-text-dim" />
                <span className="text-[12px] text-text-sec">{project.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-text-dim" />
                <span className="text-[12px] text-text-sec">{project.phone || '–'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-text-dim" />
                <span className="text-[12px] text-text-sec">{project.email}</span>
              </div>
              {project.company && (
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-text-dim" />
                  <span className="text-[12px] text-text-sec">{project.company}</span>
                </div>
              )}
            </div>

            <div className="glass-card p-4 space-y-2.5">
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
            </div>

            <div className="glass-card p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-text-dim">Montage</span>
                <span className="text-[11px] font-semibold">{project.montagePartner || '–'}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-text-dim">Elektro</span>
                <span className="text-[11px] font-semibold">{project.elektroPartner || '–'}</span>
              </div>
              {/* Linked entities */}
              {project.leadId && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-text-dim">Lead</span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: '#A78BFA' }}>
                    <ExternalLink size={10} /> Verknüpft
                  </span>
                </div>
              )}
              {project.appointmentId && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-text-dim">Termin</span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: '#34D399' }}>
                    <ExternalLink size={10} /> Verknüpft
                  </span>
                </div>
              )}
              {project.dealId && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-text-dim">Angebot</span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: '#60A5FA' }}>
                    <ExternalLink size={10} /> Verknüpft
                  </span>
                </div>
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
            <div className="grid grid-cols-4 gap-3">
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
            {/* Tabs */}
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

            {/* Checklist */}
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
                      style={{
                        background: done ? color : 'transparent',
                        border: done ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {done && <Check size={12} strokeWidth={2.5} className="text-white" />}
                    </div>
                    <span className={`text-[13px] ${done ? 'line-through text-text-dim' : 'text-text'}`}>
                      {step}
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-text-dim">#{idx + 1}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nachkalkulation + Risk */}
          <div className="grid grid-cols-2 gap-4">
            {/* Nachkalkulation */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} style={{ color: '#34D399' }} />
                  <h3 className="text-[13px] font-bold">Nachkalkulation</h3>
                </div>
                <button
                  onClick={() => setEditKalk(!editKalk)}
                  className="w-6 h-6 rounded-[6px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"
                >
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
                          <span className="font-bold tabular-nums" style={{ color: Number(margin) >= 0 ? '#34D399' : '#F87171' }}>
                            {margin}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Risiko */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={project.risk ? 'text-red' : 'text-text-dim'} />
                  <h3 className="text-[13px] font-bold">Risiko-Status</h3>
                </div>
                <button
                  onClick={handleToggleRisk}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-all"
                  style={project.risk
                    ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' }
                    : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }
                  }
                >
                  {project.risk ? 'Risiko aufheben' : 'Als Risiko markieren'}
                </button>
              </div>

              {editRisk ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-text-dim mb-1">Risiko-Beschreibung</label>
                    <textarea
                      value={riskNote}
                      onChange={(e) => setRiskNote(e.target.value)}
                      placeholder="Grund für die Risiko-Markierung..."
                      rows={3}
                      className="glass-input w-full px-3 py-2 text-[13px] resize-none"
                    />
                  </div>
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

              {/* Notizen */}
              {project.notes && (
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} className="text-text-dim" />
                    <span className="text-[11px] font-bold text-text-dim">Notizen</span>
                  </div>
                  <p className="text-[12px] text-text-sec">{project.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
