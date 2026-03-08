import { useState, useEffect } from 'react'
import {
  Mail, Send, Inbox, SendHorizontal, Search, RefreshCw,
  Plus, Paperclip, Eye, EyeOff, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, MailOpen, Calendar, BarChart3,
  Link2, User, Building2, FileText, X, Loader2, Wifi,
  Reply, Forward, ExternalLink,
  Video, MapPin, Users as UsersIcon,
  LayoutTemplate,
} from 'lucide-react'
import {
  useOutlookStatus, useOutlookEmails, useOutlookEmail, useOutlookEmailThread,
  useOutlookSync, useSendEmail, useMarkAsRead, useLinkEmail,
  useOutlookCalendar, useOutlookStats, useOutlookTemplates,
  useOutlookConnect, useOutlookDisconnect,
  type OutlookEmail, type OutlookCalendarEvent, type OutlookTemplate,
} from '@/hooks/useOutlook'

type ViewTab = 'inbox' | 'sent' | 'calendar' | 'templates' | 'tracking'

// ── Helpers ──

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `${min} Min.`
  if (hr < 24) return `${hr} Std.`
  if (day < 7) return `${day}d`
  return new Date(date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str
}

// =====================================================================
// OUTLOOK CONNECT SCREEN
// =====================================================================

function OutlookConnectScreen() {
  const connect = useOutlookConnect()
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await connect.mutateAsync()
      window.location.href = res.data.url
    } catch {
      setConnecting(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="glass-card p-8 max-w-md text-center" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #60A5FA 12%, transparent), color-mix(in srgb, #60A5FA 4%, transparent))' }}>
          <Mail size={36} className="text-blue-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-[18px] font-bold mb-2">Outlook verbinden</h2>
        <p className="text-[13px] text-text-sec mb-6 leading-relaxed">
          Verbinde dein Microsoft 365 Konto, um Emails und Kalender direkt im CRM zu verwalten.
          Deine Emails werden automatisch mit Kontakten, Leads und Deals verknuepft.
        </p>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn-primary px-6 py-3 text-[13px] font-semibold flex items-center gap-2 mx-auto"
        >
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {connecting ? 'Verbinde...' : 'Mit Microsoft 365 verbinden'}
        </button>
        <div className="mt-6 space-y-2 text-[11px] text-text-dim text-left">
          <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> Emails lesen und senden</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> Kalender synchronisieren</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> Automatische Kontakt-Zuordnung</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> Oeffnungs- und Klick-Tracking</div>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// EMAIL LIST ITEM
// =====================================================================

function EmailListItem({
  email, isActive, onClick,
}: { email: OutlookEmail; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-3 border-b border-border/30 transition-all duration-100',
        isActive ? 'bg-blue-500/8 border-l-2 border-l-blue-400' : 'hover:bg-surface-hover border-l-2 border-l-transparent',
        !email.isRead ? 'bg-surface/50' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${!email.isRead ? 'bg-blue-500/15 text-blue-400' : 'bg-surface text-text-dim'}`}>
          {(email.senderName || email.senderEmail || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-[12px] truncate ${!email.isRead ? 'font-bold text-text' : 'font-medium text-text-sec'}`}>
              {email.senderName || email.senderEmail}
            </span>
            <span className="text-[10px] text-text-dim shrink-0 tabular-nums">{timeAgo(email.receivedAt)}</span>
          </div>
          <p className={`text-[12px] truncate ${!email.isRead ? 'font-semibold text-text-sec' : 'text-text-dim'}`}>
            {email.subject || '(Kein Betreff)'}
          </p>
          <p className="text-[11px] text-text-dim truncate mt-0.5">{truncate(email.bodyPreview || '', 80)}</p>
          <div className="flex items-center gap-2 mt-1">
            {email.hasAttachments && <Paperclip size={10} className="text-text-dim" />}
            {email.isMatched && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399' }}>
                Zugeordnet
              </span>
            )}
            {email.aiFollowUpDetected && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', color: '#F59E0B' }}>
                Follow-Up
              </span>
            )}
            {email.importance === 'high' && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}>
                Wichtig
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// =====================================================================
// EMAIL DETAIL VIEW
// =====================================================================

function EmailDetailView({
  emailId, onClose, onReply, onForward,
}: { emailId: string; onClose: () => void; onReply: (email: OutlookEmail) => void; onForward: (email: OutlookEmail) => void }) {
  const { data: res } = useOutlookEmail(emailId)
  const markRead = useMarkAsRead()
  const linkEmail = useLinkEmail()
  const email = res?.data
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkContactId, setLinkContactId] = useState('')
  const [linkDealId, setLinkDealId] = useState('')

  useEffect(() => {
    if (email && !email.isRead) {
      markRead.mutate(emailId)
    }
  }, [email?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-dim" />
      </div>
    )
  }

  const handleLink = () => {
    linkEmail.mutate({ id: emailId, contactId: linkContactId || undefined, dealId: linkDealId || undefined })
    setShowLinkForm(false)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onReply(email)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all" title="Antworten">
              <Reply size={15} />
            </button>
            <button onClick={() => onForward(email)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all" title="Weiterleiten">
              <Forward size={15} />
            </button>
            <button onClick={() => setShowLinkForm(!showLinkForm)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${email.isMatched ? 'text-emerald-400' : 'text-text-dim hover:text-amber'} hover:bg-surface-hover`} title="Verknuepfen">
              <Link2 size={15} />
            </button>
          </div>
        </div>

        <h2 className="text-[16px] font-bold leading-snug mb-2">{email.subject || '(Kein Betreff)'}</h2>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 text-[13px] font-bold shrink-0">
            {(email.senderName || email.senderEmail || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-semibold">{email.senderName}</p>
            <p className="text-[11px] text-text-dim">{email.senderEmail}</p>
          </div>
          <span className="ml-auto text-[11px] text-text-dim tabular-nums">
            {new Date(email.receivedAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Link Form */}
        {showLinkForm && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] font-bold mb-2">Mit CRM-Objekt verknuepfen</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Contact-ID" value={linkContactId} onChange={(e) => setLinkContactId(e.target.value)}
                className="glass-input px-2 py-1.5 text-[11px] flex-1" />
              <input type="text" placeholder="Deal-ID" value={linkDealId} onChange={(e) => setLinkDealId(e.target.value)}
                className="glass-input px-2 py-1.5 text-[11px] flex-1" />
              <button onClick={handleLink} className="btn-primary px-3 py-1.5 text-[10px]">Verknuepfen</button>
            </div>
          </div>
        )}

        {/* CRM Tags */}
        {email.isMatched && (
          <div className="flex items-center gap-2 mt-2">
            {email.contactId && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'color-mix(in srgb, #34D399 10%, transparent)', color: '#34D399' }}>
                <User size={9} /> Kontakt
              </span>
            )}
            {email.dealId && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'color-mix(in srgb, #F59E0B 10%, transparent)', color: '#F59E0B' }}>
                <FileText size={9} /> Deal
              </span>
            )}
            {email.projectId && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'color-mix(in srgb, #60A5FA 10%, transparent)', color: '#60A5FA' }}>
                <Building2 size={9} /> Projekt
              </span>
            )}
          </div>
        )}

        {email.toRecipients && email.toRecipients.length > 0 && (
          <p className="text-[10px] text-text-dim mt-2">
            An: {email.toRecipients.map((r) => r.name || r.email).join(', ')}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {email.bodyHtml ? (
          <div
            className="prose prose-invert prose-sm max-w-none text-[13px] leading-relaxed"
            style={{ color: 'var(--color-text-sec)' }}
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        ) : (
          <pre className="text-[13px] text-text-sec whitespace-pre-wrap font-sans leading-relaxed">
            {email.bodyText || email.bodyPreview}
          </pre>
        )}

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/30">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider mb-2">
              Anhaenge ({email.attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Paperclip size={12} className="text-text-dim" />
                  <span className="font-medium">{att.name}</span>
                  <span className="text-text-dim">({Math.round(att.size / 1024)} KB)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// COMPOSE EMAIL
// =====================================================================

function ComposeEmail({
  onClose, replyTo, forwardEmail,
}: {
  onClose: () => void
  replyTo?: OutlookEmail | null
  forwardEmail?: OutlookEmail | null
}) {
  const send = useSendEmail()
  const { data: templatesRes } = useOutlookTemplates()
  const templates = templatesRes?.data ?? []

  const [to, setTo] = useState(replyTo ? replyTo.senderEmail : '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` :
    forwardEmail ? `Fwd: ${forwardEmail.subject}` : ''
  )
  const [body, setBody] = useState(
    forwardEmail ? `\n\n---------- Weitergeleitete Nachricht ----------\n${forwardEmail.bodyPreview || ''}` : ''
  )
  const [trackingEnabled, setTrackingEnabled] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return
    setSending(true)
    try {
      const toList = to.split(',').map((e) => ({ email: e.trim() })).filter((e) => e.email)
      const ccList = cc ? cc.split(',').map((e) => ({ email: e.trim() })).filter((e) => e.email) : []

      await send.mutateAsync({
        to: toList,
        cc: ccList,
        subject,
        bodyHtml: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
        trackingEnabled,
        replyToMessageId: replyTo?.messageId,
      })
      onClose()
    } catch {
      setSending(false)
    }
  }

  const applyTemplate = (t: OutlookTemplate) => {
    setSubject(t.subject)
    setBody(t.bodyHtml)
    setShowTemplates(false)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[680px] mx-0 sm:mx-4 glass-card flex flex-col"
        style={{ borderRadius: 'var(--radius-lg)', maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
          <h3 className="text-[14px] font-bold">
            {replyTo ? 'Antworten' : forwardEmail ? 'Weiterleiten' : 'Neue Email'}
          </h3>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowTemplates(!showTemplates)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all" title="Vorlagen">
              <LayoutTemplate size={14} />
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Template Picker */}
        {showTemplates && templates.length > 0 && (
          <div className="px-5 py-3 border-b border-border/30 space-y-1.5 max-h-[200px] overflow-y-auto">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Vorlagen</p>
            {templates.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors text-[12px]">
                <span className="font-semibold">{t.name}</span>
                <span className="text-text-dim ml-2">{t.subject}</span>
              </button>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className="px-5 py-3 space-y-2 border-b border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-text-dim w-8">An:</span>
            <input type="text" value={to} onChange={(e) => setTo(e.target.value)}
              placeholder="empfaenger@firma.ch, ..."
              className="flex-1 bg-transparent text-[13px] outline-none text-text placeholder:text-text-dim/50" autoFocus />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-text-dim w-8">Cc:</span>
            <input type="text" value={cc} onChange={(e) => setCc(e.target.value)}
              placeholder="optional"
              className="flex-1 bg-transparent text-[13px] outline-none text-text placeholder:text-text-dim/50" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-text-dim w-8">Betr:</span>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff eingeben..."
              className="flex-1 bg-transparent text-[13px] font-semibold outline-none text-text placeholder:text-text-dim/50" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nachricht schreiben..."
            rows={12}
            className="w-full bg-transparent text-[13px] leading-relaxed outline-none text-text-sec placeholder:text-text-dim/40 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
          <button
            onClick={() => setTrackingEnabled(!trackingEnabled)}
            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${trackingEnabled ? 'text-amber' : 'text-text-dim'}`}
          >
            {trackingEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
            Tracking {trackingEnabled ? 'an' : 'aus'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary px-4 py-2 text-[12px]">Verwerfen</button>
            <button
              onClick={handleSend}
              disabled={!to.trim() || !subject.trim() || sending}
              className="btn-primary px-5 py-2 text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Senden
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// CALENDAR VIEW
// =====================================================================

function CalendarView() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
  const { data: res, isLoading } = useOutlookCalendar({ start, end })
  const events = res?.data ?? []

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-text-dim" /></div>

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Calendar size={32} className="text-text-dim mb-3" strokeWidth={1.5} />
        <p className="text-[13px] text-text-dim">Keine Kalender-Events in diesem Monat</p>
      </div>
    )
  }

  const byDay = events.reduce<Record<string, OutlookCalendarEvent[]>>((acc, evt) => {
    const day = new Date(evt.startAt).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' })
    if (!acc[day]) acc[day] = []
    acc[day].push(evt)
    return acc
  }, {})

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      {Object.entries(byDay).map(([day, dayEvents]) => (
        <div key={day}>
          <p className="text-[11px] font-bold text-text-dim uppercase tracking-wider mb-2">{day}</p>
          <div className="space-y-2">
            {dayEvents.map((evt) => {
              const startTime = new Date(evt.startAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
              const endTime = new Date(evt.endAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={evt.id} className="glass-card p-4 hover:border-border-focus transition-all">
                  <div className="flex items-start gap-3">
                    <div className="text-center shrink-0 w-14">
                      <p className="text-[13px] font-bold text-blue-400 tabular-nums">{startTime}</p>
                      <p className="text-[10px] text-text-dim">{endTime}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{evt.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-text-dim">
                        {evt.location && <span className="flex items-center gap-1"><MapPin size={10} />{evt.location}</span>}
                        {evt.onlineMeetingUrl && (
                          <a href={evt.onlineMeetingUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                            <Video size={10} /> Online
                          </a>
                        )}
                        {evt.attendees && evt.attendees.length > 0 && (
                          <span className="flex items-center gap-1"><UsersIcon size={10} />{evt.attendees.length}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// =====================================================================
// TEMPLATES VIEW
// =====================================================================

function TemplatesView() {
  const { data: res, isLoading } = useOutlookTemplates()
  const templates = res?.data ?? []

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-text-dim" /></div>

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold">Email-Vorlagen</h3>
        <button className="btn-primary px-3 py-1.5 text-[11px] flex items-center gap-1">
          <Plus size={12} /> Neue Vorlage
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <LayoutTemplate size={28} className="text-text-dim mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[12px] text-text-dim">Noch keine Vorlagen erstellt</p>
          <p className="text-[11px] text-text-dim mt-1">Erstelle Vorlagen fuer haeufig verwendete Emails</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-bold">{t.name}</p>
                {t.isShared && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #60A5FA 12%, transparent)', color: '#60A5FA' }}>Team</span>
                )}
              </div>
              <p className="text-[11px] text-text-sec">{t.subject}</p>
              <p className="text-[10px] text-text-dim mt-1">{t.useCount}x verwendet</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// TRACKING / STATS VIEW
// =====================================================================

function TrackingView() {
  const { data: statsRes } = useOutlookStats()
  const stats = statsRes?.data

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Emails gesamt', value: stats?.totalEmails ?? 0, color: '#60A5FA', icon: Mail },
          { label: 'Ungelesen', value: stats?.unreadEmails ?? 0, color: '#F59E0B', icon: MailOpen },
          { label: 'Zugeordnet', value: stats?.matchedEmails ?? 0, color: '#34D399', icon: Link2 },
          { label: 'Kalender', value: stats?.calendarEvents ?? 0, color: '#A78BFA', icon: Calendar },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)` }}>
                  <Icon size={14} style={{ color: s.color }} />
                </div>
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-[20px] font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          )
        })}
      </div>

      {stats?.recentSyncs && stats.recentSyncs.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-[13px] font-bold mb-3">Letzte Synchronisierungen</h3>
          <div className="space-y-2">
            {stats.recentSyncs.map((sync: any) => (
              <div key={sync.id} className="flex items-center justify-between text-[12px] py-2 border-b border-border/20 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${sync.status === 'success' ? 'bg-emerald-400' : sync.status === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-text-sec capitalize">{sync.syncType}</span>
                </div>
                <div className="flex items-center gap-3 text-text-dim">
                  <span>{sync.emailsSynced ?? 0} Emails</span>
                  {sync.durationMs && <span>{(sync.durationMs / 1000).toFixed(1)}s</span>}
                  <span className="tabular-nums">{timeAgo(sync.startedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// MAIN COMMUNICATION PAGE
// =====================================================================

export default function CommunicationPage() {
  const { data: statusRes, isLoading: statusLoading } = useOutlookStatus()
  const status = statusRes?.data
  const sync = useOutlookSync()

  const [view, setView] = useState<ViewTab>('inbox')
  const [search, setSearch] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyTo, setReplyTo] = useState<OutlookEmail | null>(null)
  const [forwardEmail, setForwardEmail] = useState<OutlookEmail | null>(null)
  const [page, setPage] = useState(1)

  const { data: emailsRes, isLoading: emailsLoading } = useOutlookEmails({
    folder: view === 'sent' ? 'sentitems' : 'inbox',
    search: search || undefined,
    page,
    limit: 50,
  })

  const emails = emailsRes?.data ?? []
  const totalEmails = emailsRes?.total ?? 0

  // URL-Parameter pruefen (connected=true nach OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      sync.mutate()
      window.history.replaceState({}, '', '/communication')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (statusLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-dim" />
      </div>
    )
  }

  if (!status?.connected) {
    return <OutlookConnectScreen />
  }

  const handleReply = (email: OutlookEmail) => {
    setReplyTo(email)
    setForwardEmail(null)
    setShowCompose(true)
  }

  const handleForward = (email: OutlookEmail) => {
    setForwardEmail(email)
    setReplyTo(null)
    setShowCompose(true)
  }

  const handleNewEmail = () => {
    setReplyTo(null)
    setForwardEmail(null)
    setShowCompose(true)
  }

  const navItems: { id: ViewTab; icon: typeof Inbox; label: string }[] = [
    { id: 'inbox', icon: Inbox, label: 'Posteingang' },
    { id: 'sent', icon: SendHorizontal, label: 'Gesendet' },
    { id: 'calendar', icon: Calendar, label: 'Kalender' },
    { id: 'templates', icon: LayoutTemplate, label: 'Vorlagen' },
    { id: 'tracking', icon: BarChart3, label: 'Statistiken' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden gap-0">
      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Wifi size={12} className="text-emerald-400" />
            <span className="text-[11px] text-text-dim">{status.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-text-dim hover:text-text hover:bg-surface-hover transition-all"
          >
            <RefreshCw size={12} className={sync.isPending ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button onClick={handleNewEmail}
            className="btn-primary px-3 sm:px-4 py-1.5 text-[11px] font-semibold flex items-center gap-1.5">
            <Plus size={13} />
            <span className="hidden sm:inline">Neue Email</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 flex items-center gap-1 px-4 sm:px-5 py-2 border-b border-border/20 overflow-x-auto">
        {navItems.map((v) => {
          const Icon = v.icon
          const active = view === v.id
          return (
            <button
              key={v.id}
              onClick={() => { setView(v.id); setSelectedEmailId(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0 transition-all ${
                active ? 'text-text bg-surface-hover' : 'text-text-dim hover:text-text-sec'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {view === 'calendar' ? (
        <CalendarView />
      ) : view === 'templates' ? (
        <TemplatesView />
      ) : view === 'tracking' ? (
        <TrackingView />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className={`${selectedEmailId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] lg:w-[420px] border-r border-border/30 shrink-0 overflow-hidden`}>
            {/* Search */}
            <div className="px-3 py-2 border-b border-border/20 shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Emails durchsuchen..."
                  className="glass-input w-full pl-9 pr-3 py-2 text-[12px]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {emailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-text-dim" />
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-12">
                  <Mail size={24} className="text-text-dim mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-[12px] text-text-dim">
                    {search ? `Keine Ergebnisse fuer "${search}"` : 'Keine Emails'}
                  </p>
                </div>
              ) : (
                emails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    isActive={selectedEmailId === email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalEmails > 50 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/20 text-[11px] text-text-dim shrink-0">
                <span>{(page - 1) * 50 + 1}–{Math.min(page * 50, totalEmails)} von {totalEmails}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-hover disabled:opacity-30">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(page + 1)} disabled={page * 50 >= totalEmails}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-hover disabled:opacity-30">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Email Detail */}
          {selectedEmailId ? (
            <EmailDetailView
              emailId={selectedEmailId}
              onClose={() => setSelectedEmailId(null)}
              onReply={handleReply}
              onForward={handleForward}
            />
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center">
                <Mail size={36} className="text-text-dim/30 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[13px] text-text-dim">Email auswaehlen</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <ComposeEmail
          onClose={() => { setShowCompose(false); setReplyTo(null); setForwardEmail(null) }}
          replyTo={replyTo}
          forwardEmail={forwardEmail}
        />
      )}
    </div>
  )
}
