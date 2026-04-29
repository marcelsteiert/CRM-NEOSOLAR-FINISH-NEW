import { useState } from 'react'
import {
  Globe, FileText, Calendar, Loader2, AlertCircle, CheckCircle2, Sparkles, X,
  Send, PowerOff, Link as LinkIcon, Copy, Check, RefreshCw, Wrench, Clock,
} from 'lucide-react'
import {
  useDealPortalStatus, useSetupPortalFromDeal,
  useAdminPortalProject, useDeactivatePortal, useGeneratePortalLink, useUpdateMilestone,
} from '@/hooks/usePortal'
import PortalDocuments from '@/features/projects/components/PortalDocuments'

interface Props {
  dealId: string
  contactId: string
  customerEmail: string
  customerName: string
  dealTitle: string
}

export default function DealPortalSection({
  dealId, contactId, customerEmail, customerName, dealTitle,
}: Props) {
  const { data: statusRes, isLoading } = useDealPortalStatus(dealId)
  const setupMutation = useSetupPortalFromDeal(dealId)

  const [setupEmail, setSetupEmail] = useState(customerEmail)
  const [montageDate, setMontageDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [sendEmail, setSendEmail] = useState(true)
  const [error, setError] = useState('')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-text-sec" />
      </div>
    )
  }

  const projectId = statusRes?.data?.projectId

  if (projectId) {
    return (
      <DealActivePortalView
        dealId={dealId}
        projectId={projectId}
        contactId={contactId}
        customerName={customerName}
      />
    )
  }

  const handleSetup = async () => {
    setError('')
    if (!setupEmail.trim()) return setError('E-Mail-Adresse erforderlich')
    try {
      await setupMutation.mutateAsync({
        email: setupEmail.trim(),
        sendEmail,
        scheduledMontageDate: montageDate || null,
      })
    } catch (err: any) {
      setError(err.message || 'Setup fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero-Erklaerung */}
      <div
        className="glass-card p-5 sm:p-6 relative overflow-hidden"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(251,146,60,0.04))',
          border: '1px solid rgba(245,158,11,0.22)',
        }}
      >
        <div className="absolute -top-8 -right-8 opacity-10 pointer-events-none" style={{ width: 160, height: 160 }}>
          <Globe size={160} strokeWidth={0.8} style={{ color: '#F59E0B' }} />
        </div>

        <div className="relative">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <Sparkles size={20} strokeWidth={1.8} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text">Kundenportal aus Angebot eröffnen</h3>
              <p className="text-[12px] text-text-sec mt-1 leading-relaxed">
                Aktiviere für <strong>{customerName}</strong> einen persönlichen Login-Bereich. Der Kunde sieht
                die Offerte zum Download, den voraussichtlichen Montagetermin und einen Workflow was als Nächstes passiert.
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t"
            style={{ borderColor: 'rgba(245,158,11,0.15)' }}
          >
            <FeatureBullet icon={FileText} color="#F59E0B" title="Offerte sichtbar" desc="Offerte als PDF hochladen" />
            <FeatureBullet icon={Calendar} color="#FB923C" title="Montagetermin" desc="Voraussichtlich in 1 Monat" />
            <FeatureBullet icon={CheckCircle2} color="#34D399" title="Nahtlos" desc="Bleibt erhalten beim Deal-Gewinn" />
          </div>
        </div>
      </div>

      {/* Setup-Form */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">E-Mail des Kunden</label>
            <input
              type="email"
              value={setupEmail}
              onChange={(e) => setSetupEmail(e.target.value)}
              className="glass-input mt-1 w-full text-sm"
              placeholder="kunde@beispiel.ch"
            />
            <div className="text-[11px] text-text-dim mt-1">An diese Adresse geht der Anmeldelink für das Portal</div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Voraussichtlicher Montagetermin</label>
            <input
              type="date"
              value={montageDate}
              onChange={(e) => setMontageDate(e.target.value)}
              className="glass-input mt-1 w-full text-sm"
            />
            <div className="text-[11px] text-text-dim mt-1">
              Standard: heute + 1 Monat. Wird im Portal prominent angezeigt. Du kannst es jederzeit anpassen.
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-sec cursor-pointer pt-1">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Welcome-Mail mit Anmeldelink direkt versenden
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <AlertCircle size={14} strokeWidth={1.8} style={{ color: '#F87171', marginTop: 1 }} />
              <span className="text-[13px] text-red flex-1">{error}</span>
              <button onClick={() => setError('')}><X size={12} className="text-red" /></button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSetup}
            disabled={setupMutation.isPending || !setupEmail.trim()}
            className="btn-primary w-full justify-center"
          >
            {setupMutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Wird eingerichtet...</>
            ) : (
              <><Globe size={14} strokeWidth={1.8} /> Kundenportal jetzt eröffnen</>
            )}
          </button>

          <div className="text-[11px] text-text-dim text-center pt-2 border-t border-border">
            Damit wird automatisch ein Projekt im Status "Administration" angelegt – beim Deal-Gewinn fliesst alles nahtlos in das gleiche Projekt.
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureBullet({ icon: Icon, color, title, desc }: { icon: any; color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 24, height: 24, borderRadius: 6, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        <Icon size={12} strokeWidth={1.8} style={{ color }} />
      </div>
      <div>
        <div className="text-[12px] font-semibold text-text">{title}</div>
        <div className="text-[11px] text-text-sec">{desc}</div>
      </div>
    </div>
  )
}

// ─── Aktive Portal-Ansicht im Angebot (kompakt, fokussiert) ───

function DealActivePortalView({
  dealId, projectId, contactId, customerName,
}: {
  dealId: string
  projectId: string
  contactId: string
  customerName: string
}) {
  const { data, isLoading } = useAdminPortalProject(projectId)
  const deactivatePortal = useDeactivatePortal(projectId)
  const generateLink = useGeneratePortalLink(projectId)
  const updateMilestone = useUpdateMilestone(projectId)
  const reactivateMutation = useSetupPortalFromDeal(dealId)

  const [linkCopied, setLinkCopied] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')
  const [timeDraft, setTimeDraft] = useState('')

  if (isLoading || !data?.data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-text-sec" />
      </div>
    )
  }

  const { portalUser, milestones, loginUrl } = data.data
  const dcMontage = milestones.find((m) => m.milestoneKey === 'DC_MONTAGE_TERMIN')
  const isInactive = portalUser && !portalUser.isActive

  // Wenn Portal deaktiviert: zeige Reaktivierungs-Card
  if (isInactive) {
    const handleReactivate = async () => {
      try {
        await reactivateMutation.mutateAsync({
          email: portalUser.email,
          sendEmail: false,
        })
      } catch (err: any) {
        alert(`Fehler: ${err.message}`)
      }
    }
    return (
      <div
        className="glass-card p-6"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(180deg, rgba(248,113,113,0.08), rgba(248,113,113,0.02))',
          border: '1px solid rgba(248,113,113,0.25)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.25)',
            }}
          >
            <PowerOff size={20} strokeWidth={1.8} style={{ color: '#F87171' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">Kundenportal deaktiviert</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold" style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                Inaktiv
              </span>
            </div>
            <div className="text-xs text-text-sec mt-1">
              {portalUser.email} kann sich aktuell nicht einloggen.
            </div>
            <div className="text-[11px] text-text-dim mt-2 leading-relaxed">
              Beim Reaktivieren bleibt alles erhalten: Login-Link, Dokumente, Milestones, Termine.
              Der Kunde kann sich danach sofort wieder mit dem gleichen Link einloggen.
            </div>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleReactivate}
                disabled={reactivateMutation.isPending}
                className="btn-primary text-xs"
              >
                {reactivateMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Reaktivieren…</>
                ) : (
                  <><Globe size={14} strokeWidth={1.8} /> Portal reaktivieren</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {}
  }

  const handleSendMail = async () => {
    try {
      await generateLink.mutateAsync({ sendEmail: true })
    } catch (err: any) { alert(`Fehler: ${err.message}`) }
  }

  const handleRotate = async () => {
    if (!confirm('Soll ein neuer Link erstellt werden?\n\nDer alte Link wird sofort ungültig.')) return
    try {
      await generateLink.mutateAsync({ rotate: true })
    } catch (err: any) { alert(`Fehler: ${err.message}`) }
  }

  const handleDeactivate = async () => {
    if (!confirm('Portal-Zugang wirklich deaktivieren?\n\nDer Kunde kann sich dann nicht mehr einloggen.')) return
    try {
      await deactivatePortal.mutateAsync()
    } catch (err: any) { alert(`Fehler: ${err.message}`) }
  }

  const handleSaveDate = async () => {
    if (!dcMontage) return
    try {
      await updateMilestone.mutateAsync({
        id: dcMontage.id,
        scheduledDate: dateDraft || null,
        scheduledTime: timeDraft || null,
      })
      setEditingDate(false)
    } catch (err: any) { alert(`Fehler: ${err.message}`) }
  }

  const startEditDate = () => {
    setDateDraft(dcMontage?.scheduledDate ?? '')
    setTimeDraft(dcMontage?.scheduledTime ?? '')
    setEditingDate(true)
  }

  return (
    <div className="space-y-5">
      {/* Status-Card */}
      <div
        className="glass-card p-5"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(180deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
          border: '1px solid rgba(245,158,11,0.25)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <Globe size={20} strokeWidth={1.8} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">Kundenportal aktiv</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold" style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>
                  Angebot
                </span>
              </div>
              <div className="text-xs text-text-sec mt-0.5">{portalUser?.email}</div>
              {portalUser?.lastLoginAt && (
                <div className="text-[11px] text-text-dim mt-1">
                  Letzter Login: {new Date(portalUser.lastLoginAt).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSendMail}
              disabled={generateLink.isPending}
              className="btn-secondary text-xs"
            >
              {generateLink.isPending && generateLink.variables?.sendEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.8} />}
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
          </div>
        </div>

        {/* Permanenter Login-Link */}
        {loginUrl && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <LinkIcon size={13} strokeWidth={1.8} className="text-amber" />
              <span className="text-[11px] font-semibold text-text uppercase tracking-wider">
                Persoenlicher Anmeldelink
              </span>
              <span className="text-[10px] text-text-dim ml-1">(immer gleich, wiederverwendbar)</span>
              <button
                type="button"
                onClick={handleRotate}
                disabled={generateLink.isPending}
                className="ml-auto text-[10px] text-text-dim hover:text-amber transition-colors flex items-center gap-1"
                title="Neuen Link erstellen – alter wird ungültig"
              >
                <RefreshCw size={10} strokeWidth={1.8} />
                Link erneuern
              </button>
            </div>

            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <input
                type="text"
                readOnly
                value={loginUrl}
                className="flex-1 bg-transparent text-[11px] text-text-sec font-mono outline-none truncate"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => handleCopy(loginUrl)}
                className="btn-primary text-[11px] py-1 px-2.5 flex-shrink-0"
              >
                {linkCopied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={1.8} />}
                {linkCopied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voraussichtlicher Montagetermin */}
      <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Wrench size={16} strokeWidth={1.8} style={{ color: '#FB923C' }} />
          <span className="text-sm font-semibold text-text">Voraussichtlicher Montagetermin</span>
          <span className="text-[10px] text-text-sec ml-auto">Wird im Portal prominent angezeigt</span>
        </div>
        <div className="p-5">
          {editingDate ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="glass-input text-sm py-1.5"
                autoFocus
              />
              <input
                type="time"
                value={timeDraft}
                onChange={(e) => setTimeDraft(e.target.value)}
                className="glass-input text-sm py-1.5"
                style={{ width: 110 }}
              />
              <button type="button" onClick={handleSaveDate} className="btn-primary text-xs">Speichern</button>
              <button type="button" onClick={() => setEditingDate(false)} className="btn-secondary text-xs">Abbrechen</button>
            </div>
          ) : dcMontage?.scheduledDate ? (
            <button type="button" onClick={startEditDate} className="text-left rounded-lg hover:bg-surface-hover -mx-2 px-2 py-1 transition-colors">
              <div className="flex items-baseline gap-3 flex-wrap">
                <div className="text-2xl font-semibold text-text">
                  {new Date(dcMontage.scheduledDate).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                {dcMontage.scheduledTime && (
                  <div className="text-base text-text-sec flex items-center gap-1">
                    <Clock size={14} strokeWidth={1.8} />
                    {dcMontage.scheduledTime} Uhr
                  </div>
                )}
              </div>
              <div className="text-[11px] text-text-dim mt-1">Klicken zum Anpassen</div>
            </button>
          ) : (
            <button type="button" onClick={startEditDate} className="text-amber hover:text-amber/80 text-sm font-medium">
              + Datum festlegen
            </button>
          )}
        </div>
      </div>

      {/* Dokumente für den Kunden – als ANGEBOT verknuepft */}
      <PortalDocuments
        projectId={projectId}
        contactId={contactId}
        entityType="ANGEBOT"
        entityId={dealId}
        title="Offerte &amp; Dokumente für den Kunden"
      />

      {/* Hinweis */}
      <div
        className="px-4 py-3 rounded-lg flex items-start gap-2"
        style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}
      >
        <Sparkles size={14} strokeWidth={1.8} style={{ color: '#60A5FA', marginTop: 2 }} />
        <div className="text-[12px] text-text-sec leading-relaxed">
          <strong className="text-text">Bewilligungen, Montage-Schritte etc.</strong> werden automatisch im Portal sichtbar,
          sobald der Deal als "Gewonnen" markiert ist. Im Angebots-Modus zeigen wir dem Kunden bewusst nur
          das Wesentliche: Offerte, Montagetermin und einen klaren Workflow was als Nächstes passiert.
        </div>
      </div>
    </div>
  )
}
