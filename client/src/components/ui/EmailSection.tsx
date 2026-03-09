// EmailSection – Wiederverwendbare E-Mail-Timeline fuer Detail-Modals
// Zeigt alle E-Mails zwischen Mitarbeitern und dem Kontakt (ueber contactId)
// Integriert Outlook-Vorlagen, Absender-Info und Team-weite Verlaeufe
import { useState, useEffect } from 'react'
import {
  Mail, Send, Inbox, ChevronDown, ChevronUp, Paperclip,
  Clock, ArrowUpRight, ArrowDownLeft, Reply, Forward,
  Loader2, Plus, X, PenLine, FileText, User2,
  Eye, MousePointerClick, Sparkles,
} from 'lucide-react'
import {
  useOutlookEmails, useOutlookStatus, useSendEmail,
  useOutlookTemplates, type OutlookEmail, type OutlookTemplate,
} from '@/hooks/useOutlook'
import { useGenerateEmailDraft, useGenerateEmailReply } from '@/hooks/useAi'

interface EmailSectionProps {
  contactId: string
  contactEmail?: string
  contactName?: string
  entityType?: 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT'
  entityId?: string
}

export default function EmailSection({ contactId, contactEmail, contactName, entityType, entityId }: EmailSectionProps) {
  const { data: statusRes } = useOutlookStatus()
  const status = statusRes?.data
  const { data: emailsRes, isLoading } = useOutlookEmails({ contactId, limit: 100 })
  const emails = emailsRes?.data ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<OutlookEmail | null>(null)
  const [showCompose, setShowCompose] = useState(false)

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            E-Mail-Verlauf {emails.length > 0 ? `(${emails.length})` : ''}
          </span>
          {/* Verbindungsstatus */}
          {status?.connected && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-white/30 truncate max-w-[180px]">{status.email}</span>
            </div>
          )}
          {!status?.connected && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span className="text-[10px] text-white/25">Outlook nicht verbunden</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setShowCompose(true); setReplyTo(null) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors"
          style={{ border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <Plus size={13} strokeWidth={2} />
          Neue E-Mail
        </button>
      </div>

      {/* Compose Dialog */}
      {showCompose && (
        <ComposeEmail
          contactEmail={contactEmail}
          contactName={contactName}
          contactId={contactId}
          entityType={entityType}
          entityId={entityId}
          isConnected={!!status?.connected}
          senderEmail={status?.email}
          senderName={status?.displayName}
          onClose={() => setShowCompose(false)}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-amber-500" />
          <span className="ml-2 text-sm text-white/50">E-Mails laden...</span>
        </div>
      )}

      {/* Leerer Zustand */}
      {!isLoading && emails.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.035)' }}>
            <Inbox size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/50 mb-1">Keine E-Mails vorhanden</p>
          <p className="text-xs text-white/30">
            {status?.connected
              ? 'Sobald E-Mails mit diesem Kontakt synchronisiert werden, erscheinen sie hier.'
              : 'Verbinde Outlook unter Admin → Integrationen, um E-Mails automatisch zu synchronisieren.'}
          </p>
        </div>
      )}

      {/* E-Mail-Liste */}
      {emails.length > 0 && (
        <div className="space-y-1.5">
          {emails.map((email) => (
            <EmailItem
              key={email.id}
              email={email}
              isExpanded={expandedId === email.id}
              onToggle={() => setExpandedId(expandedId === email.id ? null : email.id)}
              onReply={() => { setReplyTo(email); setShowCompose(false) }}
              connectedEmail={status?.email}
            />
          ))}
        </div>
      )}

      {/* Reply Inline */}
      {replyTo && (
        <ReplyComposer
          email={replyTo}
          contactId={contactId}
          contactName={contactName}
          onClose={() => setReplyTo(null)}
        />
      )}
    </div>
  )
}

// ── Neue E-Mail verfassen (mit Vorlagen) ──

function ComposeEmail({
  contactEmail,
  contactName,
  contactId,
  entityType,
  entityId,
  isConnected,
  senderEmail,
  senderName,
  onClose,
}: {
  contactEmail?: string
  contactName?: string
  contactId: string
  entityType?: string
  entityId?: string
  isConnected: boolean
  senderEmail?: string
  senderName?: string
  onClose: () => void
}) {
  const [to, setTo] = useState(contactEmail ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [cc, setCc] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const sendEmail = useSendEmail()
  const generateDraft = useGenerateEmailDraft()
  const { data: templatesRes } = useOutlookTemplates()
  const templates = templatesRes?.data ?? []

  // Template anwenden
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return

    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return

    // Platzhalter ersetzen
    let subj = tpl.subject || ''
    let bodyText = tpl.bodyHtml || ''

    const replacements: Record<string, string> = {
      '{{firstName}}': contactName?.split(' ')[0] || '',
      '{{lastName}}': contactName?.split(' ').slice(1).join(' ') || '',
      '{{name}}': contactName || '',
      '{{email}}': contactEmail || '',
      '{{datum}}': new Date().toLocaleDateString('de-CH'),
      '{{absender}}': senderName || '',
    }

    for (const [key, value] of Object.entries(replacements)) {
      subj = subj.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
      bodyText = bodyText.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
    }

    setSubject(subj)
    // HTML zu Plaintext: Absaetze und Zeilenumbrueche korrekt konvertieren
    const plainText = bodyText
      .replace(/<\/p>\s*<p>/gi, '\n\n')  // Absatzwechsel
      .replace(/<br\s*\/?>/gi, '\n')      // Zeilenumbrueche
      .replace(/<\/?p>/gi, '')             // Verbleibende p-Tags
      .replace(/<strong>(.*?)<\/strong>/gi, '$1') // Bold entfernen
      .replace(/<[^>]+>/g, '')             // Restliche HTML-Tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')         // Max 2 Leerzeilen
      .trim()
    setBody(plainText)
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return
    setErrorMsg('')
    try {
      const ccRecipients = cc.trim()
        ? cc.split(',').map(e => ({ email: e.trim(), name: '' })).filter(r => r.email)
        : undefined

      await sendEmail.mutateAsync({
        to: [{ email: to.trim(), name: contactName }],
        cc: ccRecipients,
        subject: subject.trim(),
        bodyHtml: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        contactId,
        trackingEnabled: true,
      })
      setSuccessMsg('E-Mail wurde erfolgreich gesendet!')
      setTimeout(() => {
        setSuccessMsg('')
        onClose()
      }, 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Senden')
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{
        background: 'rgba(11, 15, 21, 0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)' }}
          >
            <PenLine size={13} className="text-amber-500" />
          </div>
          <div>
            <span className="text-[12px] font-semibold text-white/90">Neue E-Mail</span>
            {isConnected && senderEmail && (
              <p className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
                <User2 size={9} /> Von: {senderName || senderEmail}
              </p>
            )}
            {!isConnected && (
              <p className="text-[10px] text-amber-500/70 mt-0.5">Outlook nicht verbunden – manueller Modus</p>
            )}
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <div className="p-4 space-y-3">
        {/* Vorlage */}
        {templates.length > 0 && (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1 block">
              Vorlage
            </label>
            <div className="relative">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="glass-input appearance-none w-full text-[12px] pr-8 cursor-pointer"
              >
                <option value="" style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                  Keine Vorlage
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                    {tpl.name} {tpl.category ? `(${tpl.category})` : ''}
                  </option>
                ))}
              </select>
              <FileText
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              />
            </div>
          </div>
        )}

        {/* Empfaenger */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">An</label>
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-[10px] text-amber-500/60 hover:text-amber-500 transition-colors"
              >
                + CC
              </button>
            )}
          </div>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@beispiel.ch"
            className="glass-input w-full text-[12px]"
          />
        </div>

        {/* CC */}
        {showCc && (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1 block">CC</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Kommagetrennt: a@b.ch, c@d.ch"
              className="glass-input w-full text-[12px]"
            />
          </div>
        )}

        {/* Betreff */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1 block">Betreff</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Betreff eingeben..."
            className="glass-input w-full text-[12px]"
          />
        </div>

        {/* Nachricht */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Nachricht</label>
            <button
              type="button"
              onClick={async () => {
                if (!contactName || !entityType) return
                try {
                  const res = await generateDraft.mutateAsync({
                    contactName: contactName || '',
                    entityType: entityType || 'LEAD',
                    entityTitle: subject || 'Anfrage',
                    entityStatus: '',
                    entityId,
                  })
                  if (res?.data?.text) setBody(res.data.text)
                  if (res?.data?.error) setErrorMsg(res.data.error)
                } catch (err: any) {
                  setErrorMsg(err?.message || 'KI-Fehler')
                }
              }}
              disabled={generateDraft.isPending}
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded-md transition-all"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              {generateDraft.isPending ? (
                <><Loader2 size={9} className="animate-spin" /> Generiert...</>
              ) : (
                <><Sparkles size={9} /> KI-Entwurf</>
              )}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nachricht schreiben..."
            className="glass-input w-full px-4 py-3 text-[12px] resize-none"
            rows={8}
            style={{ lineHeight: '1.6' }}
          />
        </div>

        {/* Erfolg */}
        {successMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-emerald-400" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {successMsg}
          </div>
        )}

        {/* Fehler */}
        {(errorMsg || sendEmail.isError) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-red-400" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
            {errorMsg || (!isConnected
              ? 'Outlook ist nicht verbunden. Verbinde Outlook unter Admin → Integrationen.'
              : 'Fehler beim Senden. Bitte versuche es erneut.')}
          </div>
        )}

        {/* Aktionen */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="text-[10px] text-white/20">
            {isConnected ? 'Wird ueber Outlook gesendet' : 'Wird manuell erfasst'}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-[11px] px-3 py-1.5">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!to.trim() || !subject.trim() || sendEmail.isPending}
              className="btn-primary text-[11px] px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
            >
              {sendEmail.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {isConnected ? 'Senden' : 'Erfassen'}
            </button>
          </div>
        </div>
      </div>
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
            {/* Tracking-Info */}
            {isSent && email.openCount > 0 && (
              <span className="shrink-0 flex items-center gap-0.5 text-[9px] text-emerald-400/70">
                <Eye size={9} /> {email.openCount}×
              </span>
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
            {/* Tracking-Details bei gesendeten Mails */}
            {isSent && (email.openCount > 0 || email.clickCount > 0) && (
              <div className="flex items-center gap-3 mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {email.openCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400/60">
                    <Eye size={10} /> {email.openCount}× geoeffnet
                  </span>
                )}
                {email.clickCount > 0 && (
                  <span className="flex items-center gap-1 text-blue-400/60">
                    <MousePointerClick size={10} /> {email.clickCount}× geklickt
                  </span>
                )}
              </div>
            )}
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

function ReplyComposer({ email, contactId, contactName, onClose }: { email: OutlookEmail; contactId: string; contactName?: string; onClose: () => void }) {
  const [body, setBody] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [replyError, setReplyError] = useState('')
  const sendEmail = useSendEmail()
  const generateReply = useGenerateEmailReply()

  const handleSend = async () => {
    if (!body.trim()) return
    try {
      await sendEmail.mutateAsync({
        to: [{ email: email.senderEmail, name: email.senderName }],
        subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        bodyHtml: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        replyToMessageId: email.messageId,
        contactId,
        trackingEnabled: true,
      })
      setSuccessMsg('Antwort gesendet!')
      setTimeout(() => onClose(), 1500)
    } catch {
      // Error wird von React Query gehandelt
    }
  }

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(11, 15, 21, 0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
          <Reply size={12} className="text-amber-500" />
          Antwort an {email.senderName || email.senderEmail}
        </span>
        <button type="button" onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
          <X size={14} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-end mb-1.5">
          <button
            type="button"
            onClick={async () => {
              setReplyError('')
              try {
                const res = await generateReply.mutateAsync({
                  originalSubject: email.subject || '',
                  originalBody: email.bodyText || email.bodyPreview || '',
                  originalSender: email.senderName || email.senderEmail || '',
                  contactName: contactName || email.senderName || email.senderEmail || '',
                })
                if (res?.data?.text) setBody(res.data.text)
                if (res?.data?.error) setReplyError(res.data.error)
              } catch (err: any) {
                setReplyError(err?.message || 'KI-Fehler')
              }
            }}
            disabled={generateReply.isPending}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded-md transition-all"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            {generateReply.isPending ? (
              <><Loader2 size={9} className="animate-spin" /> Generiert...</>
            ) : (
              <><Sparkles size={9} /> KI-Antwort</>
            )}
          </button>
        </div>
        {replyError && (
          <div className="text-[10px] text-red-400 mb-2">{replyError}</div>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Antwort schreiben..."
          className="glass-input w-full px-4 py-3 text-[12px] resize-none mb-3"
          rows={5}
          style={{ lineHeight: '1.6' }}
        />

        {successMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-emerald-400 mb-3" style={{ background: 'rgba(52,211,153,0.08)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {successMsg}
          </div>
        )}

        {sendEmail.isError && (
          <div className="text-[11px] text-red-400 font-medium mb-3">
            Fehler beim Senden. Bitte versuche es erneut.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-[11px] px-3 py-1.5">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || sendEmail.isPending}
            className="btn-primary text-[11px] px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
          >
            {sendEmail.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Senden
          </button>
        </div>
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
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}
