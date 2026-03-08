import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import {
  useCreateAppointment,
  type AppointmentStatus,
  type AppointmentPriority,
  statusLabels,
  priorityLabels,
} from '@/hooks/useAppointments'

interface Props {
  onClose: () => void
  prefill?: {
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    company?: string
    address?: string
    value?: number
    leadId?: string
    notes?: string
  }
}

export default function AppointmentCreateDialog({ onClose, prefill }: Props) {
  const [contactName, setContactName] = useState(prefill?.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(prefill?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(prefill?.contactPhone ?? '')
  const [company, setCompany] = useState(prefill?.company ?? '')
  const [address, setAddress] = useState(prefill?.address ?? '')
  const [value, setValue] = useState(prefill?.value?.toString() ?? '')
  const [status, setStatus] = useState<AppointmentStatus>('GEPLANT')
  const [priority, setPriority] = useState<AppointmentPriority>('MEDIUM')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [notes, setNotes] = useState(prefill?.notes ?? '')
  const [error, setError] = useState('')

  const createAppt = useCreateAppointment()
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim() || !address.trim()) {
      setError('Bitte alle Pflichtfelder ausfuellen.')
      return
    }

    try {
      await createAppt.mutateAsync({
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        company: company.trim() || undefined,
        address: address.trim(),
        value: value ? Number(value) : 0,
        status,
        priority,
        appointmentDate: appointmentDate || undefined,
        appointmentTime: appointmentTime || undefined,
        notes: notes.trim() || undefined,
        leadId: prefill?.leadId,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Termins')
    }
  }

  const isValid = contactName.trim() && contactEmail.trim() && contactPhone.trim() && address.trim()

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div role="dialog" aria-modal="true" aria-label="Neuer Termin" className="outline-none w-full max-w-[560px] mx-4 max-h-[90vh] flex flex-col" style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold tracking-[-0.02em]">Neuer Termin</h2>
            <p className="text-[12px] text-text-sec mt-0.5">Besichtigungstermin erfassen</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Dialog schliessen" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {/* Contact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Kontaktperson *</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Vor- und Nachname" className="glass-input w-full px-4 py-2.5 text-[13px]" autoFocus />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Unternehmen</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Firmenname" className="glass-input w-full px-4 py-2.5 text-[13px]" />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">E-Mail *</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@beispiel.ch" className="glass-input w-full px-4 py-2.5 text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Telefon *</label>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+41 44 123 45 67" className="glass-input w-full px-4 py-2.5 text-[13px]" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Adresse *</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Strasse, PLZ Ort" className="glass-input w-full px-4 py-2.5 text-[13px]" />
            </div>

            {/* Date + Time + Value */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Datum</label>
                <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="glass-input w-full px-4 py-2.5 text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Uhrzeit</label>
                <input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="glass-input w-full px-4 py-2.5 text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Gesch. Wert (CHF)</label>
                <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" min="0" className="glass-input w-full px-4 py-2.5 text-[13px] tabular-nums" />
              </div>
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)} className="glass-input w-full appearance-none px-4 py-2.5 text-[13px] cursor-pointer">
                  {Object.entries(statusLabels)
                    .filter(([k]) => k !== 'DURCHGEFUEHRT' && k !== 'ABGESAGT')
                    .map(([k, l]) => <option key={k} value={k} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Priorität</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as AppointmentPriority)} className="glass-input w-full appearance-none px-4 py-2.5 text-[13px] cursor-pointer">
                  {Object.entries(priorityLabels).map(([k, l]) => <option key={k} value={k} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5">Notizen</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Zusaetzliche Informationen..." rows={3} className="glass-input w-full px-4 py-2.5 text-[13px] resize-none" />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-[10px] text-[12px] text-red" style={{ background: 'color-mix(in srgb, #F87171 8%, transparent)', border: '1px solid color-mix(in srgb, #F87171 20%, transparent)' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2.5 px-6 py-4 border-t border-border shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 px-4 py-2.5 text-[13px] font-semibold text-center">Abbrechen</button>
            <button type="submit" disabled={!isValid || createAppt.isPending} className="btn-primary flex-1 px-4 py-2.5 text-[13px] text-center flex items-center justify-center gap-2">
              {createAppt.isPending && <Loader2 size={14} className="animate-spin" />}
              Termin erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
