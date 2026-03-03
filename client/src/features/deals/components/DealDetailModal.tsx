import { useState, useEffect, useRef } from 'react'
import {
  X, Pencil, Check, Phone, Mail, MapPin, Building2, Calendar,
  Trash2, ChevronDown, Trophy, XCircle, FileText, Clock,
  MessageSquare, PhoneCall, Users as UsersIcon,
  Zap, Send, Percent, CalendarClock,
} from 'lucide-react'
import {
  useDeal, useUpdateDeal, useDeleteDeal, useAddActivity,
  stageLabels, stageColors, priorityLabels, priorityColors, formatCHF,
  activityTypeLabels, activityTypeColors,
  type DealStage, type DealPriority, type ActivityType,
} from '@/hooks/useDeals'
import DocumentSection from '@/components/ui/DocumentSection'

interface Props {
  dealId: string
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
  const updateDeal = useUpdateDeal()
  const deleteDeal = useDeleteDeal()
  const addActivity = useAddActivity()

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
  const [lostReason, setLostReason] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Activity input
  const [activityText, setActivityText] = useState('')
  const [activityType, setActivityType] = useState<ActivityType>('NOTE')

  const backdropRef = useRef<HTMLDivElement>(null)

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
    setSuccessMsg('Aenderungen gespeichert')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  const handleMarkWon = () => {
    if (!deal) return
    updateDeal.mutate({ id: deal.id, stage: 'GEWONNEN' as DealStage })
    setShowWonConfirm(false)
    setSuccessMsg('Angebot als gewonnen markiert – Projekt wird erstellt!')
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
      <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="w-12 h-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  const isClosed = deal.stage === 'GEWONNEN' || deal.stage === 'VERLOREN'
  const sortedActivities = [...deal.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div role="dialog" aria-modal="true" className="outline-none w-full max-w-[700px] mx-4 max-h-[90vh] flex flex-col" style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {isEditing ? (
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="glass-input w-full px-3 py-1 text-base font-bold" />
            ) : (
              <h2 className="text-base font-bold tracking-[-0.02em] truncate">{deal.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${stageColors[deal.stage]} 12%, transparent)`, color: stageColors[deal.stage] }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColors[deal.stage] }} />
                {stageLabels[deal.stage]}
              </span>
              {deal.winProbability != null && (
                <span className="text-[10px] font-bold tabular-nums" style={{ color: deal.winProbability >= 70 ? '#34D399' : deal.winProbability >= 40 ? '#F59E0B' : '#F87171' }}>
                  {deal.winProbability}%
                </span>
              )}
              <span className="text-[11px] text-text-dim">Erstellt {relativeTime(deal.createdAt)}</span>
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
          {/* Value + Win Probability row */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Contact */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Kontakt</p>
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

          {/* Stage & Priority */}
          <div className="grid grid-cols-2 gap-4">
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
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Prioritaet</p>
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

          {/* Expected Close + Follow-Up Date */}
          <div className="grid grid-cols-2 gap-4">
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
              ) : (
                <div className="flex items-center gap-2">
                  <CalendarClock size={14} className="text-text-dim" strokeWidth={1.8} />
                  <span className="text-[12px] tabular-nums" style={{
                    color: deal.followUpDate
                      ? new Date(deal.followUpDate) <= new Date() ? '#F87171' : '#F59E0B'
                      : 'var(--color-text-sec)',
                  }}>
                    {deal.followUpDate ? new Date(deal.followUpDate).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Nicht gesetzt'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {deal.closedAt && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Abgeschlossen am</p>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-text-dim" strokeWidth={1.8} />
                <span className="text-[12px] text-text-sec tabular-nums">
                  {new Date(deal.closedAt).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
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
                <p className="text-[12px] text-text-sec whitespace-pre-wrap">{deal.notes ?? 'Keine Notizen vorhanden.'}</p>
              </div>
            )}
          </div>

          {/* Dokumente */}
          <DocumentSection entityType="ANGEBOT" entityId={deal.id} />

          {/* ── Activities Log ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">Aktivitaeten ({deal.activities.length})</p>

            {/* Add Activity */}
            {!isClosed && (
              <div className="flex items-start gap-2 mb-4">
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
                  placeholder="Aktivitaet hinzufuegen..."
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
            )}

            {/* Activity List */}
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {sortedActivities.map((act) => {
                const ActIcon = activityIcons[act.type] ?? Zap
                return (
                  <div key={act.id} className="flex items-start gap-2.5 py-1.5">
                    <div
                      className="w-6 h-6 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `color-mix(in srgb, ${activityTypeColors[act.type]} 12%, transparent)` }}
                    >
                      <ActIcon size={12} strokeWidth={2} style={{ color: activityTypeColors[act.type] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-text-sec">{act.text}</p>
                      <p className="text-[10px] text-text-dim mt-0.5">{relativeTime(act.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          {showDeleteConfirm && (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-[12px] text-red flex-1">Angebot endgueltig loeschen?</span>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary px-3 py-1.5 text-[11px]">Abbrechen</button>
              <button type="button" onClick={handleDelete} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: '#F87171' }}>Loeschen</button>
            </div>
          )}

          {showWonConfirm && (
            <div className="space-y-2.5 mb-3">
              <p className="text-[12px] text-emerald-400 font-semibold">Angebot als gewonnen markieren und zu Projekt konvertieren?</p>
              <p className="text-[11px] text-text-sec">Alle Aktivitaeten und Daten werden zum Projekt uebernommen.</p>
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => setShowWonConfirm(false)} className="btn-secondary flex-1 px-3 py-1.5 text-[11px] text-center">Abbrechen</button>
                <button type="button" onClick={handleMarkWon} className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white text-center" style={{ background: '#34D399' }}>Gewonnen &rarr; Projekt</button>
              </div>
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
              {!isClosed && (
                <>
                  <button type="button" onClick={() => setShowWonConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-emerald-400 hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(52,211,153,0.15)' }}>
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
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
                <Trash2 size={14} strokeWidth={1.8} />Loeschen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
