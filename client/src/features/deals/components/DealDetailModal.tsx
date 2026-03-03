import { useState, useEffect, useRef } from 'react'
import {
  X,
  Pencil,
  Check,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Trophy,
  XCircle,
  FileText,
  Clock,
} from 'lucide-react'
import {
  useDeal,
  useUpdateDeal,
  useDeleteDeal,
  stageLabels,
  stageColors,
  priorityLabels,
  priorityColors,
  formatCHF,
  type DealStage,
  type DealPriority,
} from '@/hooks/useDeals'

interface DealDetailModalProps {
  dealId: string
  onClose: () => void
}

function relativeTime(date: string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  if (diffH < 24) return `vor ${diffH} Std.`
  if (diffD < 7) return `vor ${diffD} Tagen`

  return new Date(date).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function DealDetailModal({ dealId, onClose }: DealDetailModalProps) {
  const { data: dealResponse, isLoading } = useDeal(dealId)
  const deal = dealResponse?.data ?? null

  const updateDeal = useUpdateDeal()
  const deleteDeal = useDeleteDeal()

  /* ── Edit state ── */
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContactName, setEditContactName] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editStage, setEditStage] = useState<DealStage>('QUALIFICATION')
  const [editPriority, setEditPriority] = useState<DealPriority>('MEDIUM')
  const [editExpectedClose, setEditExpectedClose] = useState('')
  const [editNotes, setEditNotes] = useState('')

  /* ── Action state ── */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showWonConfirm, setShowWonConfirm] = useState(false)
  const [showLostConfirm, setShowLostConfirm] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const backdropRef = useRef<HTMLDivElement>(null)

  /* ── Init edit fields when deal loads ── */
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
      setEditNotes(deal.notes ?? '')
    }
  }, [deal])

  /* ── Escape handler ── */
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose()
  }

  /* ── Save edits ── */
  const handleSave = () => {
    if (!deal) return
    updateDeal.mutate({
      id: deal.id,
      title: editTitle.trim(),
      contactName: editContactName.trim(),
      contactEmail: editContactEmail.trim(),
      contactPhone: editContactPhone.trim(),
      company: editCompany.trim() || undefined,
      address: editAddress.trim(),
      value: Number(editValue) || 0,
      stage: editStage,
      priority: editPriority,
      expectedCloseDate: editExpectedClose || undefined,
      notes: editNotes.trim() || undefined,
    })
    setIsEditing(false)
    setSuccessMsg('Aenderungen gespeichert')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  /* ── Mark Won ── */
  const handleMarkWon = () => {
    if (!deal) return
    updateDeal.mutate({ id: deal.id, stage: 'CLOSED_WON' as DealStage })
    setShowWonConfirm(false)
    setSuccessMsg('Deal als gewonnen markiert!')
    setTimeout(() => { setSuccessMsg(''); onClose() }, 1500)
  }

  /* ── Mark Lost ── */
  const handleMarkLost = () => {
    if (!deal || !lostReason.trim()) return
    const prevNotes = deal.notes ?? ''
    const lostNote = `[VERLOREN] ${new Date().toLocaleDateString('de-CH')}: ${lostReason.trim()}`
    const updatedNotes = prevNotes ? `${lostNote}\n\n${prevNotes}` : lostNote
    updateDeal.mutate({
      id: deal.id,
      stage: 'CLOSED_LOST' as DealStage,
      notes: updatedNotes,
    })
    setShowLostConfirm(false)
    setLostReason('')
    setSuccessMsg('Deal als verloren markiert')
    setTimeout(() => { setSuccessMsg(''); onClose() }, 1500)
  }

  /* ── Delete ── */
  const handleDelete = () => {
    if (!deal) return
    deleteDeal.mutate(deal.id)
    setShowDeleteConfirm(false)
    setSuccessMsg('Deal geloescht')
    setTimeout(() => { setSuccessMsg(''); onClose() }, 1200)
  }

  if (isLoading || !deal) {
    return (
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-[90] flex items-center justify-center"
        style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}
      >
        <div className="w-12 h-12 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    )
  }

  const isClosed = deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST'

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{
        background: 'rgba(6, 8, 12, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="outline-none w-full max-w-[640px] mx-4 max-h-[90vh] flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="glass-input w-full px-3 py-1 text-base font-bold"
              />
            ) : (
              <h2 className="text-base font-bold tracking-[-0.02em] truncate">{deal.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: `color-mix(in srgb, ${stageColors[deal.stage]} 12%, transparent)`,
                  color: stageColors[deal.stage],
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColors[deal.stage] }} />
                {stageLabels[deal.stage]}
              </span>
              <span className="text-[11px] text-text-dim">
                Erstellt {relativeTime(deal.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isClosed && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) handleSave()
                  else setIsEditing(true)
                }}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"
              >
                {isEditing ? <Check size={16} strokeWidth={2} /> : <Pencil size={16} strokeWidth={1.8} />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Dialog schliessen"
              className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Success Message ── */}
        {successMsg && (
          <div
            className="mx-6 mt-4 px-4 py-2.5 rounded-[10px] text-[12px] font-semibold text-emerald-400"
            style={{
              background: 'color-mix(in srgb, #34D399 8%, transparent)',
              border: '1px solid color-mix(in srgb, #34D399 20%, transparent)',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Value Card */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: 'color-mix(in srgb, #F59E0B 6%, transparent)',
              border: '1px solid color-mix(in srgb, #F59E0B 15%, transparent)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">Deal-Wert</p>
            {isEditing ? (
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="glass-input px-3 py-1 text-lg font-bold tabular-nums w-full"
              />
            ) : (
              <p className="text-[22px] font-extrabold tabular-nums text-amber">{formatCHF(deal.value)}</p>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Kontakt</p>

            <div className="flex items-center gap-2.5">
              <Building2 size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
              {isEditing ? (
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="Unternehmen"
                  className="glass-input px-3 py-1 text-[12px] flex-1"
                />
              ) : (
                <span className="text-[12px] text-text-sec">{deal.company ?? '\u2014'}</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Phone size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
              {isEditing ? (
                <input
                  type="tel"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  className="glass-input px-3 py-1 text-[12px] flex-1 tabular-nums"
                />
              ) : (
                <span className="text-[12px] text-text-sec tabular-nums">{deal.contactPhone}</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Mail size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
              {isEditing ? (
                <input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  className="glass-input px-3 py-1 text-[12px] flex-1"
                />
              ) : (
                <span className="text-[12px] text-text-sec">{deal.contactEmail}</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin size={14} className="text-text-dim shrink-0" strokeWidth={1.8} />
              {isEditing ? (
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="glass-input px-3 py-1 text-[12px] flex-1"
                />
              ) : (
                <span className="text-[12px] text-text-sec">{deal.address}</span>
              )}
            </div>
          </div>

          {/* Stage & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Phase</p>
              {isEditing ? (
                <div className="relative">
                  <select
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value as DealStage)}
                    className="glass-input appearance-none w-full px-3 py-1.5 pr-8 text-[12px] cursor-pointer"
                  >
                    {Object.entries(stageLabels).map(([key, label]) => (
                      <option key={key} value={key} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                </div>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${stageColors[deal.stage]} 12%, transparent)`,
                    color: stageColors[deal.stage],
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColors[deal.stage] }} />
                  {stageLabels[deal.stage]}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Prioritaet</p>
              {isEditing ? (
                <div className="relative">
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as DealPriority)}
                    className="glass-input appearance-none w-full px-3 py-1.5 pr-8 text-[12px] cursor-pointer"
                  >
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <option key={key} value={key} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                </div>
              ) : (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${priorityColors[deal.priority]} 12%, transparent)`,
                    color: priorityColors[deal.priority],
                  }}
                >
                  {priorityLabels[deal.priority]}
                </span>
              )}
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Erwarteter Abschluss</p>
            {isEditing ? (
              <input
                type="date"
                value={editExpectedClose}
                onChange={(e) => setEditExpectedClose(e.target.value)}
                className="glass-input px-3 py-1.5 text-[12px]"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-text-dim" strokeWidth={1.8} />
                <span className="text-[12px] text-text-sec tabular-nums">
                  {deal.expectedCloseDate
                    ? new Date(deal.expectedCloseDate).toLocaleDateString('de-CH', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '\u2014'}
                </span>
              </div>
            )}
          </div>

          {/* Closed At */}
          {deal.closedAt && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Abgeschlossen am</p>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-text-dim" strokeWidth={1.8} />
                <span className="text-[12px] text-text-sec tabular-nums">
                  {new Date(deal.closedAt).toLocaleDateString('de-CH', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Notizen</p>
            {isEditing ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                className="glass-input w-full px-3 py-2 text-[12px] resize-none"
              />
            ) : (
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-text-dim shrink-0 mt-0.5" strokeWidth={1.8} />
                <p className="text-[12px] text-text-sec whitespace-pre-wrap">
                  {deal.notes ?? 'Keine Notizen vorhanden.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          {/* Confirm dialogs */}
          {showDeleteConfirm && (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-[12px] text-red flex-1">Deal endgueltig loeschen?</span>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary px-3 py-1.5 text-[11px]">
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                style={{ background: '#F87171' }}
              >
                Loeschen
              </button>
            </div>
          )}

          {showWonConfirm && (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-[12px] text-emerald-400 flex-1">Deal als gewonnen markieren?</span>
              <button type="button" onClick={() => setShowWonConfirm(false)} className="btn-secondary px-3 py-1.5 text-[11px]">
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleMarkWon}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                style={{ background: '#34D399' }}
              >
                Gewonnen!
              </button>
            </div>
          )}

          {showLostConfirm && (
            <div className="space-y-2.5 mb-3">
              <p className="text-[12px] text-red font-semibold">Begruendung (Pflicht):</p>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Warum wurde der Deal verloren?"
                rows={2}
                className="glass-input w-full px-3 py-2 text-[12px] resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => { setShowLostConfirm(false); setLostReason('') }} className="btn-secondary flex-1 px-3 py-1.5 text-[11px] text-center">
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleMarkLost}
                  disabled={!lostReason.trim()}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-opacity"
                  style={{
                    background: lostReason.trim() ? '#F87171' : 'rgba(248,113,113,0.3)',
                    color: lostReason.trim() ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  Als verloren markieren
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!showDeleteConfirm && !showWonConfirm && !showLostConfirm && (
            <div className="flex items-center gap-2">
              {/* Won */}
              {!isClosed && (
                <button
                  type="button"
                  onClick={() => setShowWonConfirm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-emerald-400 hover:bg-surface-hover transition-colors"
                  style={{ border: '1px solid rgba(52,211,153,0.15)' }}
                >
                  <Trophy size={14} strokeWidth={1.8} />
                  Gewonnen
                </button>
              )}

              {/* Lost */}
              {!isClosed && (
                <button
                  type="button"
                  onClick={() => setShowLostConfirm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors"
                  style={{ border: '1px solid rgba(248,113,113,0.15)' }}
                >
                  <XCircle size={14} strokeWidth={1.8} />
                  Verloren
                </button>
              )}

              {/* Phone */}
              <a
                href={`tel:${deal.contactPhone}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-text-sec hover:text-text hover:bg-surface-hover transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Phone size={14} strokeWidth={1.8} />
                Anrufen
              </a>

              {/* Email */}
              <a
                href={`mailto:${deal.contactEmail}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-text-sec hover:text-text hover:bg-surface-hover transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Mail size={14} strokeWidth={1.8} />
                E-Mail
              </a>

              <div className="flex-1" />

              {/* Delete */}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red hover:bg-surface-hover transition-colors"
                style={{ border: '1px solid rgba(248,113,113,0.15)' }}
              >
                <Trash2 size={14} strokeWidth={1.8} />
                Loeschen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invisible overlay for confirmations */}
      {(showDeleteConfirm || showWonConfirm || showLostConfirm) && (
        <div className="absolute inset-0 z-[-1]" />
      )}
    </div>
  )
}
