import { useState } from 'react'
import {
  Globe, Mail, Send, Power, PowerOff, CheckCircle2, Circle, Clock, AlertCircle,
  FileCheck, Wrench, Zap, Sparkles, Loader2, Link as LinkIcon, Copy, Check, X,
  MessageSquare, ChevronDown, ChevronRight, Pencil, Plus, Trash2,
} from 'lucide-react'
import {
  useAdminPortalProject,
  useActivatePortal,
  useDeactivatePortal,
  useGeneratePortalLink,
  useUpdateMilestone,
  useCreateMilestone,
  useDeleteMilestone,
  useInitMilestones,
  milestoneStatusLabels,
  milestoneStatusColors,
  type MilestoneStatus,
  type GroupKey,
  type PortalMilestone,
} from '@/hooks/usePortal'
import PortalDocuments from './PortalDocuments'

interface Props {
  projectId: string
  customerEmail: string
  customerName: string
  contactId: string
}

const groupIcons: Record<GroupKey, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  BEWILLIGUNGEN: FileCheck,
  MONTAGE: Wrench,
  INBETRIEBNAHME: Zap,
  ABSCHLUSS: Sparkles,
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

export default function PortalSection({ projectId, customerEmail, customerName, contactId }: Props) {
  const { data, isLoading } = useAdminPortalProject(projectId)
  const activatePortal = useActivatePortal(projectId)
  const deactivatePortal = useDeactivatePortal(projectId)
  const generateLink = useGeneratePortalLink(projectId)
  const updateMilestone = useUpdateMilestone(projectId)
  const createMilestone = useCreateMilestone(projectId)
  const deleteMilestone = useDeleteMilestone(projectId)
  const initMilestones = useInitMilestones(projectId)

  const [showActivate, setShowActivate] = useState(false)
  const [activateEmail, setActivateEmail] = useState(customerEmail)
  const [activateSendEmail, setActivateSendEmail] = useState(true)
  const [showEmailLog, setShowEmailLog] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [addingToGroup, setAddingToGroup] = useState<GroupKey | null>(null)
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('')
  const [confirmDeleteMilestone, setConfirmDeleteMilestone] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<{ url: string; sent: boolean; recipient: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  if (isLoading || !data?.data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-text-sec" />
      </div>
    )
  }

  const { portalUser, milestones, milestoneGroups, emailLog } = data.data

  const total = milestones.length
  const done = milestones.filter((m) => m.status === 'DONE').length
  const inProgress = milestones.filter((m) => m.status === 'IN_PROGRESS').length
  const percent = total ? Math.round((done / total) * 100) : 0

  const groupedMilestones: Record<GroupKey, PortalMilestone[]> = {
    BEWILLIGUNGEN: [],
    MONTAGE: [],
    INBETRIEBNAHME: [],
    ABSCHLUSS: [],
  }
  for (const m of milestones) {
    groupedMilestones[m.groupKey]?.push(m)
  }

  const handleActivate = async () => {
    try {
      await activatePortal.mutateAsync({
        email: activateEmail.trim() || undefined,
        sendEmail: activateSendEmail,
      })
      setShowActivate(false)
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('Portal-Zugang wirklich deaktivieren?')) return
    try {
      await deactivatePortal.mutateAsync()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleGenerateLink = async (sendEmail: boolean) => {
    try {
      const res = await generateLink.mutateAsync({ sendEmail })
      setGeneratedLink({ url: res.data.loginUrl, sent: res.data.sent, recipient: res.data.recipient })
      setLinkCopied(false)
      if (sendEmail && !generatedLink) {
        // Beim ersten Generieren mit E-Mail: kurz Hinweis
        setTimeout(() => {}, 0)
      }
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleCopyLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink.url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = generatedLink.url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const handleStatusChange = async (m: PortalMilestone, status: MilestoneStatus) => {
    const sendEmail = status === 'DONE' && m.status !== 'DONE'
    let confirmEmail = false
    if (sendEmail && portalUser?.isActive) {
      confirmEmail = confirm(
        `Status auf "Erledigt" setzen?\n\nKunde wird automatisch per E-Mail informiert.\nFortfahren?`,
      )
      if (!confirmEmail) return
    }
    try {
      await updateMilestone.mutateAsync({
        id: m.id,
        status,
        sendEmail: confirmEmail,
      })
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleScheduleDate = async (m: PortalMilestone, date: string) => {
    try {
      await updateMilestone.mutateAsync({
        id: m.id,
        scheduledDate: date || null,
      })
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleSaveComment = async (m: PortalMilestone) => {
    try {
      await updateMilestone.mutateAsync({
        id: m.id,
        comment: commentDraft.trim() || null,
      })
      setEditingComment(null)
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleSaveLabel = async (m: PortalMilestone) => {
    const trimmed = labelDraft.trim()
    if (!trimmed || trimmed === m.label) {
      setEditingLabel(null)
      return
    }
    try {
      await updateMilestone.mutateAsync({ id: m.id, label: trimmed })
      setEditingLabel(null)
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleAddMilestone = async (groupKey: GroupKey) => {
    const trimmed = newMilestoneLabel.trim()
    if (!trimmed) return
    try {
      await createMilestone.mutateAsync({ groupKey, label: trimmed })
      setNewMilestoneLabel('')
      setAddingToGroup(null)
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleDeleteMilestone = async (id: string) => {
    try {
      await deleteMilestone.mutateAsync(id)
      setConfirmDeleteMilestone(null)
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  return (
    <div className="space-y-5">
      {/* Portal-Status-Card */}
      <div
        className="glass-card p-5"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: portalUser?.isActive
            ? 'linear-gradient(180deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))'
            : undefined,
          border: portalUser?.isActive ? '1px solid rgba(245,158,11,0.25)' : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: portalUser?.isActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Globe size={20} strokeWidth={1.8} style={{ color: portalUser?.isActive ? '#F59E0B' : '#8B95A5' }} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text">Kundenportal</div>
              <div className="text-xs text-text-sec mt-0.5">
                {portalUser?.isActive
                  ? `Aktiv – ${portalUser.email}`
                  : portalUser
                  ? 'Deaktiviert'
                  : 'Nicht aktiviert'}
              </div>
              {portalUser?.lastLoginAt && (
                <div className="text-[11px] text-text-dim mt-1">
                  Letzter Login: {relativeTime(portalUser.lastLoginAt)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!portalUser?.isActive && (
              <button
                type="button"
                onClick={() => setShowActivate(true)}
                className="btn-primary text-xs"
              >
                <Power size={14} strokeWidth={1.8} />
                Portal aktivieren
              </button>
            )}
            {portalUser?.isActive && (
              <>
                <button
                  type="button"
                  onClick={() => handleGenerateLink(false)}
                  disabled={generateLink.isPending}
                  className="btn-secondary text-xs"
                  title="Neuen Anmeldelink generieren – zum manuellen Versand (WhatsApp, SMS, ...)"
                >
                  {generateLink.isPending && !generateLink.variables?.sendEmail ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <LinkIcon size={14} strokeWidth={1.8} />
                  )}
                  Link generieren
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateLink(true)}
                  disabled={generateLink.isPending}
                  className="btn-secondary text-xs"
                  title="Neuen Anmeldelink per E-Mail an den Kunden senden"
                >
                  {generateLink.isPending && generateLink.variables?.sendEmail ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} strokeWidth={1.8} />
                  )}
                  Per Mail senden
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={deactivatePortal.isPending}
                  className="btn-secondary text-xs"
                  style={{ color: '#F87171' }}
                >
                  <PowerOff size={14} strokeWidth={1.8} />
                  Deaktivieren
                </button>
              </>
            )}
          </div>
        </div>

        {/* Generierter Link – Anzeige */}
        {generatedLink && (
          <div
            className="mt-4 pt-4 border-t border-border space-y-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} strokeWidth={2} style={{ color: '#34D399' }} />
              <span className="text-xs font-semibold text-text">
                {generatedLink.sent
                  ? `Anmeldelink an ${generatedLink.recipient} versendet`
                  : 'Anmeldelink generiert (30 Min gueltig, einmal verwendbar)'}
              </span>
              <button
                type="button"
                onClick={() => setGeneratedLink(null)}
                className="ml-auto text-text-dim hover:text-text"
                title="Schliessen"
              >
                <X size={14} />
              </button>
            </div>

            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <input
                type="text"
                readOnly
                value={generatedLink.url}
                className="flex-1 bg-transparent text-[11px] text-text-sec font-mono outline-none truncate"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-primary text-[11px] py-1 px-2.5 flex-shrink-0"
                title="Link in Zwischenablage kopieren"
              >
                {linkCopied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={1.8} />}
                {linkCopied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>

            <div className="text-[11px] text-text-dim">
              Du kannst den Link manuell per WhatsApp, SMS oder Telefon weitergeben.
              {generatedLink.sent && ' Zusaetzlich wurde er per E-Mail versendet.'}
            </div>
          </div>
        )}

        {/* Aktivierungs-Form */}
        {showActivate && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">
                E-Mail des Kunden
              </label>
              <input
                type="email"
                value={activateEmail}
                onChange={(e) => setActivateEmail(e.target.value)}
                className="glass-input mt-1 w-full text-sm"
                placeholder="kunde@beispiel.ch"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-text-sec cursor-pointer">
              <input
                type="checkbox"
                checked={activateSendEmail}
                onChange={(e) => setActivateSendEmail(e.target.checked)}
              />
              Willkommens-Mail mit Anmeldelink direkt versenden
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleActivate}
                disabled={activatePortal.isPending || !activateEmail.trim()}
                className="btn-primary text-xs"
              >
                {activatePortal.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Aktivieren
              </button>
              <button
                type="button"
                onClick={() => setShowActivate(false)}
                className="btn-secondary text-xs"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Fortschritt */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-text-sec font-semibold">
              Fortschritt
            </span>
            <span className="text-sm font-semibold text-text">
              {done} / {total} <span className="text-text-sec text-xs font-normal">({percent}%)</span>
            </span>
          </div>
          <div
            className="w-full overflow-hidden"
            style={{
              height: 8,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #F59E0B, #FB923C)',
                borderRadius: 999,
                boxShadow: '0 0 12px rgba(245,158,11,0.4)',
              }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-text-sec">
            <span><span className="text-green font-semibold">{done}</span> erledigt</span>
            <span><span className="text-amber font-semibold">{inProgress}</span> in Arbeit</span>
            <span><span className="font-semibold">{total - done - inProgress}</span> offen</span>
          </div>
        </div>
      </div>

      {/* Milestone-Gruppen */}
      <div className="space-y-3">
        {(Object.keys(groupedMilestones) as GroupKey[]).map((groupKey) => {
          const items = groupedMilestones[groupKey]
          if (!items.length) return null
          const groupInfo = milestoneGroups[groupKey]
          const GroupIcon = groupIcons[groupKey]
          const groupDone = items.filter((m) => m.status === 'DONE').length
          const groupColor = groupInfo.color

          return (
            <div
              key={groupKey}
              className="glass-card overflow-hidden"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-border"
                style={{
                  background: `color-mix(in srgb, ${groupColor} 8%, transparent)`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `color-mix(in srgb, ${groupColor} 16%, transparent)`,
                    }}
                  >
                    <GroupIcon size={16} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text">{groupInfo.label}</div>
                    <div className="text-[11px] text-text-sec">{groupInfo.description}</div>
                  </div>
                </div>
                <div className="text-xs text-text-sec">
                  <span style={{ color: groupColor }} className="font-semibold">{groupDone}</span>
                  <span className="text-text-dim"> / {items.length}</span>
                </div>
              </div>

              <div className="divide-y divide-border">
                {items.map((m) => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    onStatusChange={(status) => handleStatusChange(m, status)}
                    onScheduleDate={(date) => handleScheduleDate(m, date)}
                    onSaveComment={() => handleSaveComment(m)}
                    editingComment={editingComment === m.id}
                    onStartEditComment={() => {
                      setEditingComment(m.id)
                      setCommentDraft(m.comment ?? '')
                    }}
                    onCancelEditComment={() => setEditingComment(null)}
                    commentDraft={commentDraft}
                    setCommentDraft={setCommentDraft}
                    editingLabel={editingLabel === m.id}
                    onStartEditLabel={() => {
                      setEditingLabel(m.id)
                      setLabelDraft(m.label)
                    }}
                    onCancelEditLabel={() => setEditingLabel(null)}
                    onSaveLabel={() => handleSaveLabel(m)}
                    labelDraft={labelDraft}
                    setLabelDraft={setLabelDraft}
                    confirmDelete={confirmDeleteMilestone === m.id}
                    onStartDelete={() => setConfirmDeleteMilestone(m.id)}
                    onCancelDelete={() => setConfirmDeleteMilestone(null)}
                    onConfirmDelete={() => handleDeleteMilestone(m.id)}
                    color={groupColor}
                  />
                ))}

                {/* Add new milestone */}
                {addingToGroup === groupKey ? (
                  <div className="px-5 py-3 flex items-center gap-2" style={{ background: `color-mix(in srgb, ${groupColor} 4%, transparent)` }}>
                    <Plus size={14} strokeWidth={1.8} style={{ color: groupColor }} />
                    <input
                      type="text"
                      autoFocus
                      value={newMilestoneLabel}
                      onChange={(e) => setNewMilestoneLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddMilestone(groupKey)
                        if (e.key === 'Escape') {
                          setAddingToGroup(null)
                          setNewMilestoneLabel('')
                        }
                      }}
                      placeholder="Bezeichnung des neuen Schritts..."
                      className="glass-input flex-1 text-xs py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddMilestone(groupKey)}
                      disabled={!newMilestoneLabel.trim() || createMilestone.isPending}
                      className="btn-primary text-[11px] py-1.5 px-3"
                    >
                      Hinzufuegen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingToGroup(null)
                        setNewMilestoneLabel('')
                      }}
                      className="btn-secondary text-[11px] py-1.5 px-3"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingToGroup(groupKey)
                      setNewMilestoneLabel('')
                    }}
                    className="w-full px-5 py-2.5 text-left text-[12px] text-text-dim hover:text-amber hover:bg-surface-hover transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={13} strokeWidth={1.8} />
                    Schritt hinzufuegen
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dokumenten-Ablage */}
      <PortalDocuments projectId={projectId} contactId={contactId} />

      {/* E-Mail-Log */}
      <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
        <button
          type="button"
          onClick={() => setShowEmailLog((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Mail size={16} strokeWidth={1.8} className="text-text-sec" />
            <span className="text-sm font-semibold text-text">E-Mail-Verlauf</span>
            <span className="text-xs text-text-sec">({emailLog.length})</span>
          </div>
          {showEmailLog ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {showEmailLog && (
          <div className="border-t border-border max-h-64 overflow-y-auto">
            {emailLog.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-text-sec">
                Noch keine E-Mails versendet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {emailLog.map((entry) => (
                  <div key={entry.id} className="px-5 py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text truncate">{entry.subject}</div>
                        <div className="text-text-sec mt-0.5 truncate">
                          {entry.recipient} &middot; {relativeTime(entry.createdAt)}
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold"
                        style={{
                          background:
                            entry.status === 'SENT' ? 'rgba(52,211,153,0.12)'
                            : entry.status === 'FAILED' ? 'rgba(248,113,113,0.12)'
                            : 'rgba(245,158,11,0.12)',
                          color:
                            entry.status === 'SENT' ? '#34D399'
                            : entry.status === 'FAILED' ? '#F87171'
                            : '#F59E0B',
                        }}
                      >
                        {entry.status === 'SENT' ? 'Gesendet' : entry.status === 'FAILED' ? 'Fehler' : entry.status === 'LOGGED' ? 'Geloggt' : 'Pending'}
                      </span>
                    </div>
                    {entry.errorMessage && (
                      <div className="mt-1 text-red text-[11px]">{entry.errorMessage}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset (Danger Zone) */}
      <div className="text-right">
        <button
          type="button"
          onClick={async () => {
            if (!confirm('Alle Milestones zuruecksetzen? Vorhandener Status geht verloren.')) return
            try {
              await initMilestones.mutateAsync()
            } catch (err: any) {
              alert(`Fehler: ${err.message}`)
            }
          }}
          className="text-[11px] text-text-dim hover:text-red transition-colors underline"
        >
          Milestones zuruecksetzen
        </button>
      </div>
    </div>
  )
}

// ── Milestone-Row ──

interface MilestoneRowProps {
  milestone: PortalMilestone
  onStatusChange: (s: MilestoneStatus) => void
  onScheduleDate: (d: string) => void
  onSaveComment: () => void
  editingComment: boolean
  onStartEditComment: () => void
  onCancelEditComment: () => void
  commentDraft: string
  setCommentDraft: (s: string) => void
  editingLabel: boolean
  onStartEditLabel: () => void
  onCancelEditLabel: () => void
  onSaveLabel: () => void
  labelDraft: string
  setLabelDraft: (s: string) => void
  confirmDelete: boolean
  onStartDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  color: string
}

function MilestoneRow(props: MilestoneRowProps) {
  const {
    milestone: m, onStatusChange, onScheduleDate, onSaveComment,
    editingComment, onStartEditComment, onCancelEditComment, commentDraft, setCommentDraft,
    editingLabel, onStartEditLabel, onCancelEditLabel, onSaveLabel, labelDraft, setLabelDraft,
    confirmDelete, onStartDelete, onCancelDelete, onConfirmDelete,
  } = props

  const StatusIcon = m.status === 'DONE' ? CheckCircle2 : m.status === 'IN_PROGRESS' ? Clock : m.status === 'BLOCKED' ? AlertCircle : Circle
  const statusColor = milestoneStatusColors[m.status]

  return (
    <div className="px-5 py-3 hover:bg-surface-hover transition-colors group">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            const next: MilestoneStatus = m.status === 'DONE' ? 'OPEN' : 'DONE'
            onStatusChange(next)
          }}
          className="flex-shrink-0 mt-0.5"
          title={m.status === 'DONE' ? 'Auf "Offen" setzen' : 'Als erledigt markieren'}
        >
          <StatusIcon size={20} strokeWidth={1.8} style={{ color: statusColor }} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              {editingLabel ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="glass-input text-sm flex-1 py-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveLabel()
                      if (e.key === 'Escape') onCancelEditLabel()
                    }}
                  />
                  <button type="button" onClick={onSaveLabel} className="btn-primary text-[11px] py-1 px-2">
                    <Check size={12} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={onCancelEditLabel} className="btn-secondary text-[11px] py-1 px-2">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onStartEditLabel}
                    className={`text-sm font-medium text-left hover:text-amber transition-colors ${m.status === 'DONE' ? 'text-text-sec line-through' : 'text-text'}`}
                    title="Klicken zum Umbenennen"
                  >
                    {m.label}
                  </button>
                  <button
                    type="button"
                    onClick={onStartEditLabel}
                    className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-amber transition-all"
                    title="Bezeichnung bearbeiten"
                  >
                    <Pencil size={11} strokeWidth={1.8} />
                  </button>
                </div>
              )}
              {m.completedAt && (
                <div className="text-[11px] text-green mt-0.5">
                  Erledigt: {new Date(m.completedAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={m.status}
                onChange={(e) => onStatusChange(e.target.value as MilestoneStatus)}
                className="glass-input text-[11px] py-1 px-2"
                style={{ minWidth: 'auto', width: 'auto' }}
              >
                {(Object.keys(milestoneStatusLabels) as MilestoneStatus[]).map((s) => (
                  <option key={s} value={s}>{milestoneStatusLabels[s]}</option>
                ))}
              </select>
              <input
                type="date"
                value={m.scheduledDate ?? ''}
                onChange={(e) => onScheduleDate(e.target.value)}
                className="glass-input text-[11px] py-1 px-2"
                style={{ minWidth: 'auto', width: 'auto' }}
                title="Geplantes Datum"
              />
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onConfirmDelete}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold"
                    style={{ background: '#F87171', color: '#0B0F15' }}
                  >
                    Loeschen
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="px-2 py-1 rounded-md text-[10px] text-text-dim hover:text-text"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStartDelete}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-all"
                  title="Schritt loeschen"
                >
                  <Trash2 size={11} strokeWidth={1.8} />
                </button>
              )}
            </div>
          </div>

          {/* Kommentar */}
          {editingComment ? (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                className="glass-input text-xs flex-1"
                placeholder="Notiz fuer Kunde (sichtbar im Portal)"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveComment()
                  if (e.key === 'Escape') onCancelEditComment()
                }}
              />
              <button type="button" onClick={onSaveComment} className="btn-primary text-[11px] py-1 px-2">
                Speichern
              </button>
              <button type="button" onClick={onCancelEditComment} className="btn-secondary text-[11px] py-1 px-2">
                Abbrechen
              </button>
            </div>
          ) : m.comment ? (
            <button
              type="button"
              onClick={onStartEditComment}
              className="mt-1.5 text-[11px] text-text-sec hover:text-text text-left flex items-start gap-1.5"
            >
              <MessageSquare size={11} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{m.comment}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartEditComment}
              className="mt-1.5 text-[11px] text-text-dim hover:text-text-sec underline"
            >
              + Notiz hinzufuegen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
