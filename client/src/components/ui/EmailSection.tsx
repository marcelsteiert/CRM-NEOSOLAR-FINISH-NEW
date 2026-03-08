// EmailSection – Wiederverwendbare E-Mail-Timeline fuer Detail-Modals
// Zeigt alle E-Mails zwischen Mitarbeitern und dem Kontakt (ueber contactId)
import { useState } from 'react'
import {
  Mail, Send, Inbox, ChevronDown, ChevronUp, Paperclip,
  Clock, ArrowUpRight, ArrowDownLeft, Eye, Reply, Forward,
  AlertCircle, Loader2,
} from 'lucide-react'
import { useOutlookEmails, useOutlookStatus, useSendEmail, type OutlookEmail } from '@/hooks/useOutlook'

interface EmailSectionProps {
  contactId: string
  entityType?: 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT'
  entityId?: string
}

export default function EmailSection({ contactId }: EmailSectionProps) {
  const { data: statusRes } = useOutlookStatus()
  const status = statusRes?.data
  const { data: emailsRes, isLoading } = useOutlookEmails({ contactId, limit: 100 })
  const emails = emailsRes?.data ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<OutlookEmail | null>(null)

  // Nicht verbunden
  if (!status?.connected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <Mail size={20} className="text-amber-500" />
        </div>
        <p className="text-sm text-white/50 mb-1">Outlook nicht verbunden</p>
        <p className="text-xs text-white/30">
          Verbinde Outlook unter Kommunikation, um E-Mails hier zu sehen.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-amber-500" />
        <span className="ml-2 text-sm text-white/50">E-Mails laden...</span>
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.035)' }}>
          <Inbox size={20} className="text-white/30" />
        </div>
        <p className="text-sm text-white/50 mb-1">Keine E-Mails vorhanden</p>
        <p className="text-xs text-white/30">
          Sobald E-Mails mit diesem Kontakt synchronisiert werden, erscheinen sie hier.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          E-Mail-Verlauf ({emails.length})
        </span>
      </div>

      {/* E-Mail-Liste */}
      <div className="space-y-1.5">
        {emails.map((email) => (
          <EmailItem
            key={email.id}
            email={email}
            isExpanded={expandedId === email.id}
            onToggle={() => setExpandedId(expandedId === email.id ? null : email.id)}
            onReply={() => setReplyTo(email)}
            connectedEmail={status.email}
          />
        ))}
      </div>

      {/* Reply Modal */}
      {replyTo && (
        <ReplyComposer
          email={replyTo}
          onClose={() => setReplyTo(null)}
        />
      )}
    </div>
  )
}

// ── Einzelne E-Mail ──

function EmailItem({
  email,
  isExpanded,
  onToggle,
  onReply,
  connectedEmail,
}: {
  email: OutlookEmail
  isExpanded: boolean
  onToggle: () => void
  onReply: () => void
  connectedEmail?: string
}) {
  const isSent = email.senderEmail?.toLowerCase() === connectedEmail?.toLowerCase()
    || email.folder === 'sentitems'
    || email.folder === 'sent items'
    || email.folder === 'gesendete elemente'

  const date = new Date(email.receivedAt || email.sentAt)
  const isToday = new Date().toDateString() === date.toDateString()
  const timeStr = isToday
    ? date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="rounded-lg transition-all duration-200"
      style={{
        background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
      }}
    >
      {/* Header Row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors rounded-lg"
      >
        {/* Richtung Icon */}
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: isSent
              ? 'rgba(96,165,250,0.12)'
              : 'rgba(52,211,153,0.12)',
          }}
        >
          {isSent ? (
            <ArrowUpRight size={13} className="text-blue-400" />
          ) : (
            <ArrowDownLeft size={13} className="text-emerald-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-medium text-white/90 truncate">
              {isSent ? (email.toRecipients?.[0]?.name || email.toRecipients?.[0]?.email || 'Empfaenger') : (email.senderName || email.senderEmail)}
            </span>
            {!email.isRead && !isSent && (
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
            {email.hasAttachments && (
              <Paperclip size={11} className="shrink-0 text-white/30" />
            )}
          </div>
          <p className="text-[11px] font-medium text-white/70 truncate">{email.subject || '(Kein Betreff)'}</p>
          {!isExpanded && (
            <p className="text-[10px] text-white/35 truncate mt-0.5">{email.bodyPreview}</p>
          )}
        </div>

        {/* Zeit + Expand */}
        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-white/30">{timeStr}</span>
          {isExpanded ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
        </div>
      </button>

      {/* Expandierter Inhalt */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          {/* Details */}
          <div className="text-[10px] text-white/40 space-y-0.5 mb-3 pl-10">
            <p>Von: {email.senderName} &lt;{email.senderEmail}&gt;</p>
            <p>An: {email.toRecipients?.map(r => r.name || r.email).join(', ')}</p>
            {email.ccRecipients && email.ccRecipients.length > 0 && (
              <p>CC: {email.ccRecipients.map(r => r.name || r.email).join(', ')}</p>
            )}
            <p className="flex items-center gap-1">
              <Clock size={10} /> {date.toLocaleDateString('de-CH')} {date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Body */}
          <div className="pl-10 mb-3">
            {email.bodyHtml ? (
              <div
                className="text-[11px] text-white/60 leading-relaxed max-h-[300px] overflow-y-auto prose prose-invert prose-sm"
                style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.bodyHtml) }}
              />
            ) : (
              <pre className="text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto"
                   style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
                {email.bodyText || email.bodyPreview}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="pl-10 mb-3">
              <p className="text-[10px] text-white/40 mb-1.5">Anhaenge:</p>
              <div className="flex flex-wrap gap-1.5">
                {email.attachments.map(att => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] text-white/60"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Paperclip size={10} />
                    {att.name}
                    <span className="text-white/30">({formatSize(att.size)})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Aktionen */}
          <div className="pl-10 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReply() }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
              style={{ border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <Reply size={11} /> Antworten
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reply Composer (Inline) ──

function ReplyComposer({ email, onClose }: { email: OutlookEmail; onClose: () => void }) {
  const [body, setBody] = useState('')
  const sendEmail = useSendEmail()

  const handleSend = async () => {
    if (!body.trim()) return
    try {
      await sendEmail.mutateAsync({
        to: [{ email: email.senderEmail, name: email.senderName }],
        subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        bodyHtml: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        replyToMessageId: email.messageId,
      })
      onClose()
    } catch {
      // Error wird von React Query gehandelt
    }
  }

  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-white/70">
          <Reply size={12} className="inline mr-1" />
          Antwort an {email.senderName || email.senderEmail}
        </span>
        <button type="button" onClick={onClose} className="text-[10px] text-white/30 hover:text-white/60">
          Abbrechen
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Antwort schreiben..."
        className="glass-input w-full h-24 text-[12px] resize-none mb-2"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSend}
          disabled={!body.trim() || sendEmail.isPending}
          className="btn-primary text-[11px] px-3 py-1.5 flex items-center gap-1.5"
        >
          {sendEmail.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Senden
        </button>
      </div>
    </div>
  )
}

// ── Helpers ──

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sanitizeHtml(html: string): string {
  // Einfache Sanitierung: Script-Tags entfernen
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}
