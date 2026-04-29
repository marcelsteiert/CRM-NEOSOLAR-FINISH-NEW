import { useState, useEffect, useRef } from 'react'
import {
  X, FolderPlus, Loader2, Search, User as UserIcon, AlertCircle, CheckCircle2,
  Sun, Building2, Phone, Mail, MapPin, Calendar, Sparkles,
} from 'lucide-react'
import { useCreateProject, type ProjectPriority } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

interface ContactSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  address: string | null
  company: string | null
}

const PRIORITIES: { id: ProjectPriority; label: string; color: string }[] = [
  { id: 'LOW', label: 'Niedrig', color: '#94A3B8' },
  { id: 'MEDIUM', label: 'Mittel', color: '#60A5FA' },
  { id: 'HIGH', label: 'Hoch', color: '#FB923C' },
  { id: 'URGENT', label: 'Dringend', color: '#F87171' },
]

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const { user } = useAuth()
  const { data: usersData } = useUsers()
  const users = usersData?.data ?? []
  const createProject = useCreateProject()

  const backdropRef = useRef<HTMLDivElement>(null)

  // Kontakt-Auswahl
  const [contactSearch, setContactSearch] = useState('')
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactSearchResult | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Projekt-Felder
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kwp, setKwp] = useState('')
  const [value, setValue] = useState('')
  const [kalkulationSoll, setKalkulationSoll] = useState('')
  const [priority, setPriority] = useState<ProjectPriority>('MEDIUM')
  const [projectManagerId, setProjectManagerId] = useState(user?.id ?? '')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  // Kontakt-Felder (wenn neuer Kontakt)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [company, setCompany] = useState('')

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Live-Suche
  useEffect(() => {
    if (!contactSearch.trim() || contactSearch.length < 2 || selectedContact) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get<{ data: any[] }>(`/search?q=${encodeURIComponent(contactSearch)}`)
        if (cancelled) return
        const contacts: ContactSearchResult[] = (res.data ?? []).slice(0, 8).map((row: any) => ({
          id: row.id ?? row.contactId,
          firstName: row.firstName ?? row.first_name ?? '',
          lastName: row.lastName ?? row.last_name ?? '',
          email: row.email ?? null,
          phone: row.phone ?? null,
          address: row.address ?? null,
          company: row.company ?? null,
        })).filter((c: ContactSearchResult) => c.id)
        setSearchResults(contacts)
        setShowResults(true)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [contactSearch, selectedContact])

  const handleSelectContact = (contact: ContactSearchResult) => {
    setSelectedContact(contact)
    setContactSearch(`${contact.firstName} ${contact.lastName}`.trim())
    setFirstName(contact.firstName)
    setLastName(contact.lastName)
    setEmail(contact.email ?? '')
    setPhone(contact.phone ?? '')
    setAddress(contact.address ?? '')
    setCompany(contact.company ?? '')
    if (!name) {
      setName(`PV-Anlage ${contact.address ?? `${contact.firstName} ${contact.lastName}`.trim()}`)
    }
    setShowResults(false)
  }

  const handleClearContact = () => {
    setSelectedContact(null)
    setContactSearch('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setAddress('')
    setCompany('')
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose()
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Projektname ist erforderlich')
    if (!firstName.trim() && !lastName.trim() && !selectedContact) {
      return setError('Vor- oder Nachname des Kunden ist erforderlich')
    }
    if (!email.trim() && !selectedContact) return setError('E-Mail des Kunden ist erforderlich')
    if (!address.trim() && !selectedContact?.address) return setError('Adresse des Kunden ist erforderlich')

    setSubmitting(true)
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        kWp: Number(kwp) || 0,
        value: Number(value) || 0,
        kalkulationSoll: Number(kalkulationSoll) || 0,
        priority,
        projectManagerId: projectManagerId || undefined,
        startDate,
        notes: notes.trim() || undefined,
      }

      if (selectedContact) {
        payload.contactId = selectedContact.id
      } else {
        payload.firstName = firstName.trim()
        payload.lastName = lastName.trim()
        payload.email = email.trim()
        payload.phone = phone.trim()
        payload.address = address.trim()
        if (company.trim()) payload.company = company.trim()
      }

      const res = await createProject.mutateAsync(payload)
      const newId = res?.data?.id
      if (onCreated && newId) onCreated(newId)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Projekt konnte nicht erstellt werden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <FolderPlus size={18} strokeWidth={1.8} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Neues Projekt eroeffnen</h2>
              <p className="text-[11px] text-text-sec mt-0.5">PV-Anlagenprojekt direkt anlegen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Kontakt-Auswahl */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserIcon size={14} strokeWidth={1.8} className="text-amber" />
                <span className="text-xs font-semibold text-text">Kunde</span>
                <span className="text-[10px] text-text-sec ml-1">Bestehenden waehlen oder neuen anlegen</span>
              </div>

              {selectedContact ? (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}
                >
                  <CheckCircle2 size={16} strokeWidth={2} style={{ color: '#34D399' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text">
                      {selectedContact.firstName} {selectedContact.lastName}
                    </div>
                    <div className="text-[11px] text-text-sec truncate">
                      {[selectedContact.email, selectedContact.address].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearContact}
                    className="text-[11px] text-text-sec hover:text-amber"
                  >
                    Aendern
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    placeholder="Name, E-Mail oder Adresse suchen..."
                    className="glass-input w-full text-sm pl-9"
                  />
                  {searching && (
                    <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
                  )}

                  {showResults && searchResults.length > 0 && (
                    <div
                      className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-lg shadow-2xl"
                      style={{
                        background: 'rgba(11,15,21,0.95)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectContact(c)}
                          className="w-full px-3 py-2.5 text-left hover:bg-surface-hover border-b border-border last:border-b-0"
                        >
                          <div className="text-sm font-medium text-text">{c.firstName} {c.lastName}</div>
                          <div className="text-[11px] text-text-sec truncate">
                            {[c.email, c.phone, c.address].filter(Boolean).join(' · ')}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Wenn kein Kontakt ausgewaehlt: Felder fuer neuen Kontakt */}
            {!selectedContact && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Vorname</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="glass-input mt-1 w-full text-sm"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Nachname</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="glass-input mt-1 w-full text-sm"
                    placeholder="Muster"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Firma (optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="glass-input mt-1 w-full text-sm"
                    placeholder="Muster AG"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold flex items-center gap-1">
                    <Mail size={10} strokeWidth={2} /> E-Mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input mt-1 w-full text-sm"
                    placeholder="max@beispiel.ch"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold flex items-center gap-1">
                    <Phone size={10} strokeWidth={2} /> Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="glass-input mt-1 w-full text-sm"
                    placeholder="+41 79 000 00 00"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold flex items-center gap-1">
                    <MapPin size={10} strokeWidth={2} /> Adresse
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="glass-input mt-1 w-full text-sm"
                    placeholder="Musterstrasse 12, 8000 Zuerich"
                  />
                </div>
              </div>
            )}

            {/* Projekt-Daten */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} strokeWidth={1.8} className="text-amber" />
                <span className="text-xs font-semibold text-text">Projekt-Daten</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Projektname</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input mt-1 w-full text-sm"
                    placeholder="z.B. PV-Anlage Musterstrasse 12"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Beschreibung</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="glass-input mt-1 w-full text-sm resize-none"
                    rows={2}
                    placeholder="z.B. 24 Module Sued-Dach, 9.6 kWp, Speicher 10 kWh"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold flex items-center gap-1">
                      <Sun size={10} strokeWidth={2} /> Anlagengroesse (kWp)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={kwp}
                      onChange={(e) => setKwp(e.target.value)}
                      className="glass-input mt-1 w-full text-sm"
                      placeholder="9.6"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Auftragswert (CHF)</label>
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="glass-input mt-1 w-full text-sm"
                      placeholder="28500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Kalkulation-Soll (CHF)</label>
                    <input
                      type="number"
                      min="0"
                      value={kalkulationSoll}
                      onChange={(e) => setKalkulationSoll(e.target.value)}
                      className="glass-input mt-1 w-full text-sm"
                      placeholder="22000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Projektleiter</label>
                    <select
                      value={projectManagerId}
                      onChange={(e) => setProjectManagerId(e.target.value)}
                      className="glass-input mt-1 w-full text-sm"
                    >
                      <option value="">Nicht zugewiesen</option>
                      {users
                        .filter((u: any) => u.isActive !== false)
                        .map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold flex items-center gap-1">
                      <Calendar size={10} strokeWidth={2} /> Startdatum
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="glass-input mt-1 w-full text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Prioritaet</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                        style={{
                          background: priority === p.id ? `color-mix(in srgb, ${p.color} 16%, transparent)` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${priority === p.id ? `color-mix(in srgb, ${p.color} 35%, transparent)` : 'rgba(255,255,255,0.06)'}`,
                          color: priority === p.id ? p.color : '#8B95A5',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Interne Notizen</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="glass-input mt-1 w-full text-sm resize-none"
                    rows={2}
                    placeholder="Optionale Notizen, Spezialwuensche, ..."
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <AlertCircle size={14} strokeWidth={1.8} style={{ color: '#F87171', marginTop: 1 }} />
                <span className="text-[13px] text-red flex-1">{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
              disabled={submitting}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                <>
                  <FolderPlus size={14} strokeWidth={1.8} />
                  Projekt eroeffnen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
