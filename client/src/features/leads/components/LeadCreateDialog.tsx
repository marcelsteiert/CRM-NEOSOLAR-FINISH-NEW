import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { LeadSource } from '../LeadsPage'

interface LeadCreateDialogProps {
  onClose: () => void
}

/* ── Source options ── */

const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: 'HOMEPAGE', label: 'Homepage' },
  { value: 'EMPFEHLUNG', label: 'Empfehlung' },
  { value: 'MESSE', label: 'Messe' },
  { value: 'TELEFON', label: 'Telefon' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'INSERAT', label: 'Inserat' },
]

/* ── Component ── */

export default function LeadCreateDialog({ onClose }: LeadCreateDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState<LeadSource>('HOMEPAGE')

  const backdropRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  /* Close on Escape */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  /* Focus trap - focus dialog on mount */
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  /* Close on backdrop click */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, just close the dialog (no actual API call)
    onClose()
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
        className="outline-none w-full max-w-[480px] mx-4"
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
          {/* First + Last name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                Vorname
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="z.B. Thomas"
                className="glass-input w-full px-4 py-2.5 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
                Nachname
              </label>
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
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
              Unternehmen
            </label>
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
              Adresse
              <span className="text-amber ml-0.5">*</span>
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

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
              Telefon
              <span className="text-amber ml-0.5">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="z.B. +41 79 234 56 78"
              className="glass-input w-full px-4 py-2.5 text-[13px] tabular-nums"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
              E-Mail
              <span className="text-amber ml-0.5">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="z.B. t.mueller@firma.ch"
              className="glass-input w-full px-4 py-2.5 text-[13px]"
              required
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-[11px] font-semibold text-text-sec mb-1.5">
              Quelle
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="glass-input w-full px-4 py-2.5 text-[13px] appearance-none cursor-pointer"
            >
              {sourceOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{ background: '#0B0F15', color: '#F0F2F5' }}
                >
                  {opt.label}
                </option>
              ))}
            </select>
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
              className="btn-primary flex-1 px-4 py-2.5 text-[13px] text-center"
            >
              Lead erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
