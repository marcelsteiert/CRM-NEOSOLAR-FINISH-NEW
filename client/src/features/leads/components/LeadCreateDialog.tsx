import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Loader2, AlertTriangle } from 'lucide-react'
import { useCreateLead, useUsers } from '@/hooks/useLeads'
import { useLeadSources } from '@/hooks/useAdmin'

interface LeadCreateDialogProps {
  onClose: () => void
}

export default function LeadCreateDialog({ onClose }: LeadCreateDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('HOMEPAGE')
  const [value, setValue] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [forceCreate, setForceCreate] = useState(false)
  const { data: sourcesRes } = useLeadSources()
  const sourceOptions = (sourcesRes?.data ?? []).map((s) => ({ value: s.id, label: s.name }))

  const createLead = useCreateLead()
  const { data: usersData } = useUsers()
  const users = usersData?.data ?? []

  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsDuplicate(false)

    try {
      await createLead.mutateAsync({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        company: company || undefined,
        address,
        phone,
        email,
        source,
        value: value ? Number(value) : 0,
        assignedTo: assignedTo || undefined,
        notes: notes || undefined,
        ...(forceCreate ? { skipDuplicateCheck: true } : {}),
      } as Record<string, unknown>)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Erstellen'
      if (msg.includes('Duplikat') || msg.includes('409')) {
        setIsDuplicate(true)
        setError('Ein aktiver Lead mit dieser E-Mail oder Telefonnummer existiert bereits.')
      } else {
        setError(msg)
      }
    }
  }

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Neuen Lead erstellen"
        tabIndex={-1}
        className="outline-none w-full max-w-[520px] mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold tracking-[-0.02em]">Neuer Lead</h2>
            <p className="text-[12px] text-text-sec mt-0.5">Lead-Daten erfassen</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schliessen"
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div
              className="px-4 py-3 rounded-[10px]"
              style={{
                background: isDuplicate
                  ? 'color-mix(in srgb, #F59E0B 8%, transparent)'
                  : 'color-mix(in srgb, #F87171 8%, transparent)',
                border: `1px solid ${isDuplicate
                  ? 'color-mix(in srgb, #F59E0B 20%, transparent)'
                  : 'color-mix(in srgb, #F87171 20%, transparent)'}`,
              }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className={isDuplicate ? 'text-amber mt-0.5' : 'text-red mt-0.5'} strokeWidth={2} />
                <div className="flex-1">
                  <p className={`text-[12px] font-medium ${isDuplicate ? 'text-amber' : 'text-red'}`}>{error}</p>
                  {isDuplicate && (
                    <button
                      type="button"
                      onClick={() => { setForceCreate(true); setError(null); setIsDuplicate(false) }}
                      className="mt-2 text-[11px] font-semibold text-amber underline underline-offset-2 hover:text-amber/80 transition-colors"
                    >
                      Trotzdem erstellen
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Vorname</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="z.B. Thomas"
                className="glass-input w-full px-4 py-2.5 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Nachname</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="z.B. Mueller"
                className="glass-input w-full px-4 py-2.5 text-[13px]"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Unternehmen</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="z.B. Mueller Immobilien AG"
              className="glass-input w-full px-4 py-2.5 text-[13px]"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
              Adresse <span className="text-amber">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="z.B. Bahnhofstrasse 42, 8001 Zuerich"
              className="glass-input w-full px-4 py-2.5 text-[13px]"
              required
            />
          </div>

          {/* Phone + Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                Telefon <span className="text-amber">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+41 79 234 56 78"
                className="glass-input w-full px-4 py-2.5 text-[13px] tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                E-Mail <span className="text-amber">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="t.mueller@firma.ch"
                className="glass-input w-full px-4 py-2.5 text-[13px]"
                required
              />
            </div>
          </div>

          {/* Source + Value row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Quelle</label>
              <div className="relative">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="glass-input w-full px-4 py-2.5 text-[13px] appearance-none cursor-pointer pr-9"
                >
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Wert (CHF)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="z.B. 45000"
                className="glass-input w-full px-4 py-2.5 text-[13px] tabular-nums"
                min="0"
              />
            </div>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Zustaendig</label>
            <div className="relative">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="glass-input w-full px-4 py-2.5 text-[13px] appearance-none cursor-pointer pr-9"
              >
                <option value="" style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                  Nicht zugewiesen
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">Notizen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Erste Notizen zum Lead..."
              rows={3}
              className="glass-input w-full px-4 py-2.5 text-[13px] resize-none"
            />
          </div>

          {/* Required hint */}
          <p className="text-[10px] text-text-dim">
            <span className="text-amber">*</span> Pflichtfelder
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 px-4 py-2.5 text-[13px] font-semibold text-center"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={createLead.isPending}
              className="btn-primary flex-1 px-4 py-2.5 text-[13px] text-center flex items-center justify-center gap-2"
            >
              {createLead.isPending && <Loader2 size={14} className="animate-spin" />}
              Lead erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
