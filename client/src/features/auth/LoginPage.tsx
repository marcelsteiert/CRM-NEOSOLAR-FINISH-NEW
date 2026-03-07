import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email.trim().toLowerCase(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#06080C' }}
    >
      {/* Ambient Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        className="w-full max-w-[420px] relative"
        style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-lg, 16px)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center pt-10 pb-6 px-8">
          <div className="rounded-[12px] overflow-hidden mb-5" style={{ background: '#f0f0f0' }}>
            <img
              src="/neosolar-logo.jpeg"
              alt="NeoSolar"
              className="h-12 object-contain px-3 py-1.5"
            />
          </div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-text">NeoSolar CRM</h1>
          <p className="text-[12px] text-text-sec mt-1">Bitte melden Sie sich an</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-4">
          {error && (
            <div
              className="px-4 py-3 rounded-[10px] text-[12px] text-red"
              style={{
                background: 'color-mix(in srgb, #F87171 8%, transparent)',
                border: '1px solid color-mix(in srgb, #F87171 20%, transparent)',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">
              E-Mail
            </label>
            <div className="relative">
              <Mail
                size={16}
                strokeWidth={1.8}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@neosolar.ch"
                className="glass-input w-full pl-10 pr-4 py-2.5 text-[13px]"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">
              Passwort
            </label>
            <div className="relative">
              <Lock
                size={16}
                strokeWidth={1.8}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben"
                className="glass-input w-full pl-10 pr-4 py-2.5 text-[13px]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="btn-primary w-full py-2.5 text-[13px] font-semibold flex items-center justify-center gap-2 mt-2"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            Anmelden
          </button>
        </form>
      </div>
    </div>
  )
}
