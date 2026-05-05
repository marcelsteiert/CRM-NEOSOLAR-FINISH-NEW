import { useState, useEffect } from 'react'
import { X, Save, UserPlus } from 'lucide-react'
import {
  useCreatePersonnel, useUpdatePersonnel,
  type Personnel, type ContractType, type SalaryType,
  contractTypeLabels, salaryTypeLabels,
} from '@/hooks/usePersonnel'

interface Props {
  open: boolean
  member?: Personnel | null
  onClose: () => void
  onSaved?: (m: Personnel) => void
}

const CONTRACT_TYPES: ContractType[] = ['VOLLZEIT', 'TEILZEIT', 'LEHRLING', 'SUBUNTERNEHMER', 'PRAKTIKUM']
const SALARY_TYPES: SalaryType[] = ['MONTH', 'HOUR', 'YEAR']

export default function PersonnelFormModal({ open, member, onClose, onSaved }: Props) {
  const isEdit = !!member
  const createMut = useCreatePersonnel()
  const updateMut = useUpdatePersonnel()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [mobile, setMobile] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [nationality, setNationality] = useState('')
  const [ahvNumber, setAhvNumber] = useState('')
  const [street, setStreet] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('CH')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [contractType, setContractType] = useState<ContractType>('VOLLZEIT')
  const [workloadPct, setWorkloadPct] = useState<number>(100)
  const [vacationDays, setVacationDays] = useState<number>(25)
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [iban, setIban] = useState('')
  const [bankName, setBankName] = useState('')
  const [salaryChf, setSalaryChf] = useState<string>('')
  const [salaryType, setSalaryType] = useState<SalaryType>('MONTH')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (member) {
      setFirstName(member.firstName ?? '')
      setLastName(member.lastName ?? '')
      setEmail(member.email ?? '')
      setPhone(member.phone ?? '')
      setMobile(member.mobile ?? '')
      setBirthDate(member.birthDate ?? '')
      setNationality(member.nationality ?? '')
      setAhvNumber(member.ahvNumber ?? '')
      setStreet(member.street ?? '')
      setZip(member.zip ?? '')
      setCity(member.city ?? '')
      setCountry(member.country ?? 'CH')
      setStartDate(member.startDate ?? '')
      setEndDate(member.endDate ?? '')
      setContractType(member.contractType ?? 'VOLLZEIT')
      setWorkloadPct(member.workloadPct ?? 100)
      setVacationDays(member.vacationDaysPerYear ?? 25)
      setPosition(member.position ?? '')
      setDepartment(member.department ?? '')
      setIban(member.iban ?? '')
      setBankName(member.bankName ?? '')
      setSalaryChf(member.salaryChf != null ? String(member.salaryChf) : '')
      setSalaryType(member.salaryType ?? 'MONTH')
      setEmergencyName(member.emergencyContactName ?? '')
      setEmergencyPhone(member.emergencyContactPhone ?? '')
      setNotes(member.notes ?? '')
    } else {
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setMobile('')
      setBirthDate(''); setNationality(''); setAhvNumber('')
      setStreet(''); setZip(''); setCity(''); setCountry('CH')
      setStartDate(new Date().toISOString().split('T')[0])
      setEndDate(''); setContractType('VOLLZEIT'); setWorkloadPct(100); setVacationDays(25)
      setPosition(''); setDepartment(''); setIban(''); setBankName('')
      setSalaryChf(''); setSalaryType('MONTH')
      setEmergencyName(''); setEmergencyPhone(''); setNotes('')
    }
    setError(null)
  }, [member, open])

  if (!open) return null

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !startDate) {
      setError('Vorname, Nachname und Eintrittsdatum sind Pflicht')
      return
    }
    setError(null)
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      mobile: mobile.trim() || null,
      birthDate: birthDate || null,
      nationality: nationality.trim() || null,
      ahvNumber: ahvNumber.trim() || null,
      street: street.trim() || null,
      zip: zip.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      startDate,
      endDate: endDate || null,
      contractType,
      workloadPct: Number(workloadPct) || 0,
      vacationDaysPerYear: Number(vacationDays) || 0,
      position: position.trim() || null,
      department: department.trim() || null,
      iban: iban.trim() || null,
      bankName: bankName.trim() || null,
      salaryChf: salaryChf.trim() ? Number(salaryChf) : null,
      salaryType,
      emergencyContactName: emergencyName.trim() || null,
      emergencyContactPhone: emergencyPhone.trim() || null,
      notes: notes.trim() || null,
    }

    const onSuccess = (res: any) => {
      onSaved?.(res.data)
      onClose()
    }
    const onError = (err: any) => setError(err?.message ?? 'Speichern fehlgeschlagen')

    if (isEdit && member) {
      updateMut.mutate({ id: member.id, data: payload }, { onSuccess, onError })
    } else {
      createMut.mutate(payload, { onSuccess, onError })
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-[820px] mx-2 sm:mx-4 max-h-[90vh] flex flex-col"
        style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-[16px] font-bold flex items-center gap-2">
            <UserPlus size={18} strokeWidth={1.8} className="text-amber" />
            {isEdit ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover">
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {/* Stammdaten */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">Stammdaten</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Vorname *"><input className="glass-input w-full" value={firstName} onChange={e => setFirstName(e.target.value)} /></Field>
              <Field label="Nachname *"><input className="glass-input w-full" value={lastName} onChange={e => setLastName(e.target.value)} /></Field>
              <Field label="E-Mail"><input type="email" className="glass-input w-full" value={email} onChange={e => setEmail(e.target.value)} /></Field>
              <Field label="Telefon"><input className="glass-input w-full" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
              <Field label="Mobile"><input className="glass-input w-full" value={mobile} onChange={e => setMobile(e.target.value)} /></Field>
              <Field label="Geburtsdatum"><input type="date" className="glass-input w-full" value={birthDate} onChange={e => setBirthDate(e.target.value)} /></Field>
              <Field label="Nationalität"><input className="glass-input w-full" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="z.B. Schweiz" /></Field>
              <Field label="AHV-Nummer"><input className="glass-input w-full" value={ahvNumber} onChange={e => setAhvNumber(e.target.value)} placeholder="756.xxxx.xxxx.xx" /></Field>
            </div>
          </section>

          {/* Adresse */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">Adresse</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field className="sm:col-span-4" label="Strasse / Nr."><input className="glass-input w-full" value={street} onChange={e => setStreet(e.target.value)} /></Field>
              <Field label="PLZ"><input className="glass-input w-full" value={zip} onChange={e => setZip(e.target.value)} /></Field>
              <Field className="sm:col-span-2" label="Ort"><input className="glass-input w-full" value={city} onChange={e => setCity(e.target.value)} /></Field>
              <Field label="Land"><input className="glass-input w-full" value={country} onChange={e => setCountry(e.target.value)} /></Field>
            </div>
          </section>

          {/* Vertrag */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">Vertrag</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Eintritt *"><input type="date" className="glass-input w-full" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
              <Field label="Austritt"><input type="date" className="glass-input w-full" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
              <Field label="Vertragsart">
                <select className="glass-input w-full" value={contractType} onChange={e => setContractType(e.target.value as ContractType)}>
                  {CONTRACT_TYPES.map(c => <option key={c} value={c}>{contractTypeLabels[c]}</option>)}
                </select>
              </Field>
              <Field label="Pensum %"><input type="number" min={0} max={100} className="glass-input w-full" value={workloadPct} onChange={e => setWorkloadPct(Number(e.target.value))} /></Field>
              <Field label="Position"><input className="glass-input w-full" value={position} onChange={e => setPosition(e.target.value)} placeholder="z.B. Monteur, Verkauf" /></Field>
              <Field label="Abteilung"><input className="glass-input w-full" value={department} onChange={e => setDepartment(e.target.value)} placeholder="z.B. Montage, Vertrieb" /></Field>
              <Field label="Ferientage / Jahr"><input type="number" min={0} max={365} className="glass-input w-full" value={vacationDays} onChange={e => setVacationDays(Number(e.target.value))} /></Field>
            </div>
          </section>

          {/* Bank / Lohn */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">Bank & Lohn</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="IBAN"><input className="glass-input w-full" value={iban} onChange={e => setIban(e.target.value)} placeholder="CH00 0000 0000 0000 0000 0" /></Field>
              <Field label="Bank"><input className="glass-input w-full" value={bankName} onChange={e => setBankName(e.target.value)} /></Field>
              <Field label="Lohn (CHF)"><input type="number" step="0.01" className="glass-input w-full" value={salaryChf} onChange={e => setSalaryChf(e.target.value)} /></Field>
              <Field label="Lohn-Typ">
                <select className="glass-input w-full" value={salaryType} onChange={e => setSalaryType(e.target.value as SalaryType)}>
                  {SALARY_TYPES.map(s => <option key={s} value={s}>{salaryTypeLabels[s]}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Notfallkontakt */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">Notfallkontakt</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name"><input className="glass-input w-full" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} /></Field>
              <Field label="Telefon"><input className="glass-input w-full" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} /></Field>
            </div>
          </section>

          {/* Notizen */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-2">Notizen</h3>
            <textarea className="glass-input w-full min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} />
          </section>

          {error && (
            <div className="px-3 py-2 rounded-lg text-[12px] font-medium text-red" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex items-center gap-2">
            <Save size={14} strokeWidth={1.8} />
            {isEdit ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-dim">{label}</span>
      {children}
    </label>
  )
}
