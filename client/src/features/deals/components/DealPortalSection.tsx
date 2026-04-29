import { useState } from 'react'
import { Globe, FileText, Calendar, Loader2, AlertCircle, CheckCircle2, Sparkles, X } from 'lucide-react'
import { useDealPortalStatus, useSetupPortalFromDeal } from '@/hooks/usePortal'
import PortalSection from '@/features/projects/components/PortalSection'

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

  // Wenn schon eingerichtet → existierende PortalSection rendern
  if (projectId) {
    return (
      <PortalSection
        projectId={projectId}
        customerEmail={customerEmail}
        customerName={customerName}
        contactId={contactId}
      />
    )
  }

  // Sonst: Setup-Card zeigen
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
        <div
          className="absolute -top-8 -right-8 opacity-10 pointer-events-none"
          style={{ width: 160, height: 160 }}
        >
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
              <h3 className="text-base font-semibold text-text">Kundenportal aus Angebot eroeffnen</h3>
              <p className="text-[12px] text-text-sec mt-1 leading-relaxed">
                Aktiviere fuer <strong>{customerName}</strong> einen persoenlichen Login-Bereich – schon waehrend
                der Verkaufsphase. Der Kunde sieht die Offerte, den voraussichtlichen Montagetermin
                und alle weiteren Dokumente sobald du sie hochlaedst.
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t"
            style={{ borderColor: 'rgba(245,158,11,0.15)' }}
          >
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(245,158,11,0.12)' }}>
                <FileText size={12} strokeWidth={1.8} className="text-amber" />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-text">Offerte sichtbar</div>
                <div className="text-[11px] text-text-sec">Lade die Offerte als PDF hoch</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(251,146,60,0.12)' }}>
                <Calendar size={12} strokeWidth={1.8} style={{ color: '#FB923C' }} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-text">Montagetermin</div>
                <div className="text-[11px] text-text-sec">Voraussichtlich in 1 Monat</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(52,211,153,0.12)' }}>
                <CheckCircle2 size={12} strokeWidth={1.8} style={{ color: '#34D399' }} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-text">Nahtlos</div>
                <div className="text-[11px] text-text-sec">Bleibt erhalten beim Deal-Gewinn</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup-Form */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">
              E-Mail des Kunden
            </label>
            <input
              type="email"
              value={setupEmail}
              onChange={(e) => setSetupEmail(e.target.value)}
              className="glass-input mt-1 w-full text-sm"
              placeholder="kunde@beispiel.ch"
            />
            <div className="text-[11px] text-text-dim mt-1">
              An diese Adresse geht der Anmeldelink fuer das Portal
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">
              Voraussichtlicher Montagetermin
            </label>
            <input
              type="date"
              value={montageDate}
              onChange={(e) => setMontageDate(e.target.value)}
              className="glass-input mt-1 w-full text-sm"
            />
            <div className="text-[11px] text-text-dim mt-1">
              Standard: heute + 1 Monat. Wird beim DC-Montage-Termin im Portal angezeigt.
              Du kannst es spaeter jederzeit anpassen.
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-sec cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Willkommens-Mail mit Anmeldelink direkt versenden
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
              <>
                <Loader2 size={14} className="animate-spin" />
                Wird eingerichtet...
              </>
            ) : (
              <>
                <Globe size={14} strokeWidth={1.8} />
                Kundenportal jetzt eroeffnen
              </>
            )}
          </button>

          <div className="text-[11px] text-text-dim text-center pt-2 border-t border-border">
            Damit wird automatisch ein Projekt im Status "Administration" angelegt –
            beim Deal-Gewinn fliesst alles nahtlos in das gleiche Projekt.
          </div>
        </div>
      </div>
    </div>
  )
}
