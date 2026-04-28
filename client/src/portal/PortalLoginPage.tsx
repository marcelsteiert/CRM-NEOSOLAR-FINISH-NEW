import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sun, Mail, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { portalApi, setPortalToken, getPortalToken } from './portalApi'

export default function PortalLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tokenFromUrl = params.get('token')

  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'sent' | 'verifying' | 'error'>(tokenFromUrl ? 'verifying' : 'email')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-redirect wenn bereits eingeloggt
  useEffect(() => {
    if (!tokenFromUrl && getPortalToken()) {
      navigate('/portal', { replace: true })
    }
  }, [tokenFromUrl, navigate])

  // Magic-Link-Token einloesen
  useEffect(() => {
    if (!tokenFromUrl) return
    let cancelled = false

    async function verify() {
      try {
        const res = await portalApi.post<{ data: { token: string; email: string } }>(
          '/auth/verify',
          { token: tokenFromUrl },
        )
        if (cancelled) return
        setPortalToken(res.data.token, res.data.email)
        navigate('/portal', { replace: true })
      } catch (err: any) {
        if (cancelled) return
        setError(err.message || 'Anmeldelink konnte nicht verifiziert werden')
        setStep('error')
      }
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [tokenFromUrl, navigate])

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await portalApi.post('/auth/request-link', { email: email.trim() })
      setStep('sent')
    } catch (err: any) {
      setError(err.message || 'Fehler beim Versenden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(245,158,11,0.06), transparent 60%), #06080C',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center mb-4"
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.25)',
              boxShadow: '0 0 24px rgba(245,158,11,0.2)',
            }}
          >
            <Sun size={26} strokeWidth={1.8} style={{ color: '#F59E0B' }} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber font-semibold">NEOSOLAR</div>
          <div className="text-[13px] text-text-sec mt-1">Kundenportal</div>
        </div>

        <div
          className="glass-card p-7"
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          {step === 'email' && (
            <>
              <h1 className="text-xl font-semibold text-text mb-1">Anmelden</h1>
              <p className="text-[13px] text-text-sec mb-6">
                Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Anmeldelink per E-Mail – kein Passwort noetig.
              </p>

              <form onSubmit={handleRequestLink} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">
                    E-Mail-Adresse
                  </label>
                  <div className="relative mt-1.5">
                    <Mail size={16} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input w-full text-sm"
                      style={{ paddingLeft: 38 }}
                      placeholder="ihre.adresse@beispiel.ch"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <AlertCircle size={14} strokeWidth={1.8} style={{ color: '#F87171', marginTop: 2 }} />
                    <span className="text-[13px] text-red">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="btn-primary w-full justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Wird gesendet…
                    </>
                  ) : (
                    <>
                      Anmeldelink anfordern
                      <ArrowRight size={16} strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <div className="text-center py-4">
              <div
                className="inline-flex items-center justify-center mb-4"
                style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.25)',
                }}
              >
                <CheckCircle2 size={26} strokeWidth={1.8} style={{ color: '#34D399' }} />
              </div>
              <h2 className="text-lg font-semibold text-text mb-2">Pruefen Sie Ihre E-Mails</h2>
              <p className="text-[13px] text-text-sec leading-relaxed">
                Falls die Adresse <span className="text-text">{email}</span> bekannt ist, haben wir einen Anmeldelink gesendet. Der Link ist 30 Minuten gueltig.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError('')
                }}
                className="btn-secondary mt-6 text-xs"
              >
                Andere E-Mail verwenden
              </button>
            </div>
          )}

          {step === 'verifying' && (
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin mx-auto mb-4 text-amber" />
              <p className="text-sm text-text-sec">Sie werden angemeldet…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4">
              <div
                className="inline-flex items-center justify-center mb-4"
                style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'rgba(248,113,113,0.12)',
                  border: '1px solid rgba(248,113,113,0.25)',
                }}
              >
                <AlertCircle size={26} strokeWidth={1.8} style={{ color: '#F87171' }} />
              </div>
              <h2 className="text-lg font-semibold text-text mb-2">Anmeldung fehlgeschlagen</h2>
              <p className="text-[13px] text-text-sec mb-6">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError('')
                }}
                className="btn-primary justify-center"
              >
                Neuen Link anfordern
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-[11px] text-text-dim">
          NEOSOLAR AG &middot; <a href="/" className="hover:text-text-sec underline">Mitarbeiter-Login</a>
        </div>
      </div>
    </div>
  )
}
