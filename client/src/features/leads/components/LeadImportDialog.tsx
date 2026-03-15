import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react'
import { useCreateLead, type LeadSource } from '@/hooks/useLeads'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'

// ── Typen ──

interface LeadImportDialogProps {
  onClose: () => void
  defaultStatus?: 'ACTIVE' | 'AFTER_SALES'
}

interface ParsedLead {
  firstName?: string
  lastName?: string
  company?: string
  address: string
  phone: string
  email: string
  source: LeadSource
  value?: number
  notes?: string
}

type CrmField = keyof ParsedLead | 'fullName' | 'skip'

// ── Konstanten ──

const CRM_FIELDS: { value: CrmField; label: string }[] = [
  { value: 'skip', label: '-- Ignorieren --' },
  { value: 'firstName', label: 'Vorname' },
  { value: 'lastName', label: 'Nachname' },
  { value: 'fullName', label: 'Vollständiger Name' },
  { value: 'company', label: 'Firma' },
  { value: 'address', label: 'Adresse (wird zusammengeführt)' },
  { value: 'phone', label: 'Telefon' },
  { value: 'email', label: 'E-Mail' },
  { value: 'source', label: 'Quelle' },
  { value: 'value', label: 'Wert (CHF)' },
  { value: 'notes', label: 'Notizen' },
]

const SOURCE_MAP: Record<string, LeadSource> = {
  homepage: 'HOMEPAGE', landingpage: 'LANDINGPAGE', messe: 'MESSE',
  empfehlung: 'EMPFEHLUNG', kaltakquise: 'KALTAKQUISE', sonstige: 'SONSTIGE',
  'kalt akquise': 'KALTAKQUISE', 'kalt-akquise': 'KALTAKQUISE',
  website: 'HOMEPAGE', web: 'HOMEPAGE', referral: 'EMPFEHLUNG',
  fair: 'MESSE', andere: 'SONSTIGE', other: 'SONSTIGE',
}

// ── Auto-Erkennung ──

const COLUMN_MAP: Record<string, CrmField> = {
  // Vorname
  vorname: 'firstName', firstname: 'firstName', 'first name': 'firstName', vname: 'firstName',
  // Nachname
  nachname: 'lastName', lastname: 'lastName', 'last name': 'lastName',
  familienname: 'lastName', zuname: 'lastName',
  // Vollstaendiger Name (z.B. "Name" Spalte → wird in Vor+Nachname aufgeteilt)
  name: 'fullName', 'full name': 'fullName', fullname: 'fullName',
  kontaktname: 'fullName', 'kontakt name': 'fullName', kundenname: 'fullName',
  // Firma
  unternehmen: 'company', company: 'company', firma: 'company', firmenname: 'company',
  organisation: 'company', betrieb: 'company', arbeitgeber: 'company',
  // Adresse (mehrere Spalten werden zusammengefuehrt)
  adresse: 'address', address: 'address', strasse: 'address', anschrift: 'address',
  wohnort: 'address', ort: 'address', plz: 'address', postleitzahl: 'address',
  'strasse nr': 'address', strassenr: 'address', wohnadresse: 'address',
  standort: 'address', 'plz ort': 'address', stadt: 'address', gemeinde: 'address',
  // Telefon
  telefon: 'phone', phone: 'phone', telefonnummer: 'phone', mobilnummer: 'phone',
  handy: 'phone', mobile: 'phone', mobil: 'phone', natel: 'phone',
  festnetz: 'phone', rufnummer: 'phone',
  // E-Mail
  email: 'email', 'e mail': 'email', emailadresse: 'email', mailadresse: 'email',
  // Quelle
  quelle: 'source', source: 'source', quellenherkunft: 'source', herkunft: 'source',
  kanal: 'source', akquise: 'source',
  // Wert
  wert: 'value', value: 'value', betrag: 'value', umsatz: 'value', volumen: 'value',
  // Notizen
  notizen: 'notes', notes: 'notes', bemerkung: 'notes', bemerkungen: 'notes',
  kommentar: 'notes', beschreibung: 'notes', info: 'notes', hinweis: 'notes',
  label: 'notes', tag: 'notes', tags: 'notes',
}

// Fuzzy-Patterns: Laengere Begriffe die im Header enthalten sein muessen (mind. 4 Zeichen)
const FUZZY_PATTERNS: { pattern: string; field: keyof ParsedLead }[] = [
  { pattern: 'vorname', field: 'firstName' },
  { pattern: 'first', field: 'firstName' },
  { pattern: 'nachname', field: 'lastName' },
  { pattern: 'familien', field: 'lastName' },
  { pattern: 'firma', field: 'company' },
  { pattern: 'unternehm', field: 'company' },
  { pattern: 'adress', field: 'address' },
  { pattern: 'anschrift', field: 'address' },
  { pattern: 'strasse', field: 'address' },
  { pattern: 'telefon', field: 'phone' },
  { pattern: 'phone', field: 'phone' },
  { pattern: 'mobil', field: 'phone' },
  { pattern: 'handy', field: 'phone' },
  { pattern: 'natel', field: 'phone' },
  { pattern: 'email', field: 'email' },
  { pattern: 'mail', field: 'email' },
  { pattern: 'quelle', field: 'source' },
  { pattern: 'herkunft', field: 'source' },
  { pattern: 'notiz', field: 'notes' },
  { pattern: 'bemerk', field: 'notes' },
  { pattern: 'komment', field: 'notes' },
]

function normalizeHeader(s: string): string {
  return s.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function autoDetectField(header: string): CrmField {
  const norm = normalizeHeader(header)
  // Auch Variante ohne Umlaute-Expansion (a statt ae)
  const normSimple = header.toLowerCase()
    .replace(/[äÄ]/g, 'a').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

  // 1. Direkte Suche (exakter Match)
  if (COLUMN_MAP[norm]) return COLUMN_MAP[norm]
  if (COLUMN_MAP[normSimple]) return COLUMN_MAP[normSimple]

  // 2. Einzelne Woerter pruefen (z.B. "Kontakt Telefon" → "telefon" matched)
  const words = normSimple.split(' ')
  for (const word of words) {
    if (COLUMN_MAP[word]) return COLUMN_MAP[word]
  }

  // 3. Letztes Wort nach Prefix (z.B. "Lead - Adresse" → "adresse")
  const parts = header.split(/\s*[-–:]\s*/)
  if (parts.length >= 2) {
    const lastPart = normalizeHeader(parts[parts.length - 1])
    if (COLUMN_MAP[lastPart]) return COLUMN_MAP[lastPart]
    const lastSimple = parts[parts.length - 1].toLowerCase()
      .replace(/[äÄ]/g, 'a').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9 ]/g, ' ').trim()
    if (COLUMN_MAP[lastSimple]) return COLUMN_MAP[lastSimple]
  }

  // 4. Fuzzy: Laengere Patterns (mind. 4 Zeichen) im Header suchen
  for (const { pattern, field } of FUZZY_PATTERNS) {
    if (normSimple.includes(pattern)) return field
  }

  return 'skip'
}

function parseSource(raw: string): LeadSource {
  if (!raw) return 'SONSTIGE'
  const upper = raw.trim().toUpperCase()
  if (['HOMEPAGE', 'LANDINGPAGE', 'MESSE', 'EMPFEHLUNG', 'KALTAKQUISE', 'SONSTIGE'].includes(upper)) return upper as LeadSource
  return SOURCE_MAP[raw.trim().toLowerCase()] ?? 'SONSTIGE'
}

// ── Datei-Parser ──

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else current += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ';' || ch === ',') { cells.push(current.trim()); current = '' }
      else current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

async function parseFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  if (isExcel) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    if (!sheet) return { headers: [], rows: [] }
    const all = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]
    if (all.length < 2) return { headers: [], rows: [] }
    const headers = (all[0]).map((h) => String(h ?? ''))
    const rows = all.slice(1).map((r) => (r as unknown[]).map((c) => String(c ?? '').trim()))
    return { headers, rows }
  } else {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const headers = parseCsvLine(lines[0])
    const rows = lines.slice(1).map((l) => parseCsvLine(l))
    return { headers, rows }
  }
}

function looksLikeEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

function looksLikePhone(val: string): boolean {
  const digits = val.replace(/\D/g, '')
  return digits.length >= 7 && /^[+\d()\s./-]+$/.test(val)
}

function buildLeads(rows: string[][], mappings: CrmField[]): ParsedLead[] {
  const leads: ParsedLead[] = []

  for (const cells of rows) {
    if (cells.filter(Boolean).length < 2) continue

    const lead: ParsedLead = { address: '', phone: '', email: '', source: 'SONSTIGE' }
    const notesParts: string[] = []

    mappings.forEach((field, idx) => {
      const val = cells[idx]?.trim() ?? ''
      if (!val || field === 'skip') return
      switch (field) {
        case 'firstName': lead.firstName = val; break
        case 'lastName': lead.lastName = val; break
        case 'fullName': {
          const parts = val.trim().split(/\s+/)
          lead.firstName = parts[0] || ''
          lead.lastName = parts.slice(1).join(' ') || ''
          break
        }
        case 'company': lead.company = val; break
        case 'address': lead.address = lead.address ? `${lead.address}, ${val}` : val; break
        case 'phone': lead.phone = val; break
        case 'email': lead.email = val; break
        case 'source': lead.source = parseSource(val); break
        case 'value': lead.value = Number(val) || undefined; break
        case 'notes': notesParts.push(val); break
      }
    })

    if (notesParts.length > 0) lead.notes = notesParts.join(' | ')

    // Auto-Korrektur: Vertauschte Felder erkennen und tauschen
    // E-Mail in Telefon-Feld → tauschen
    if (looksLikeEmail(lead.phone) && !lead.email) {
      lead.email = lead.phone
      lead.phone = ''
    }
    // Telefon in E-Mail-Feld → tauschen
    if (looksLikePhone(lead.email) && !looksLikeEmail(lead.email) && !lead.phone) {
      lead.phone = lead.email
      lead.email = ''
    }
    // E-Mail in Adresse-Feld
    if (looksLikeEmail(lead.address) && !lead.email) {
      lead.email = lead.address
      lead.address = ''
    }
    // Telefon in Adresse-Feld
    if (looksLikePhone(lead.address) && lead.address.length < 20 && !lead.phone) {
      lead.phone = lead.address
      lead.address = ''
    }

    // Mindestens ein Kontaktfeld
    if (lead.email || lead.phone || lead.address || lead.firstName || lead.lastName) {
      leads.push(lead)
    }
  }

  return leads
}

function downloadTemplate() {
  const headers = [
    'Vorname', 'Nachname', 'Firma', 'Adresse', 'Telefon', 'E-Mail',
    'Quelle', 'Wert (CHF)', 'Notizen',
  ]
  const example = [
    'Max', 'Muster', 'Muster AG', 'Musterstrasse 1, 8000 Zuerich',
    '+41 79 123 45 67', 'max@muster.ch', 'HOMEPAGE', '25000', 'Interesse an 10kWp Anlage',
  ]
  const example2 = [
    'Anna', 'Beispiel', 'Solar GmbH', 'Sonnenweg 5, 3000 Bern',
    '+41 78 987 65 43', 'anna@beispiel.ch', 'EMPFEHLUNG', '35000', '',
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, example, example2])
  ws['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 35 },
    { wch: 20 }, { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')
  XLSX.writeFile(wb, 'NeoSolar_Lead_Import_Vorlage.xlsx')
}

// ── Hauptkomponente ──

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done'

export default function LeadImportDialog({ onClose, defaultStatus = 'ACTIVE' }: LeadImportDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mappings, setMappings] = useState<CrmField[]>([])
  const [parsed, setParsed] = useState<ParsedLead[]>([])
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<Array<{ index: number; lead: ParsedLead; existingEmail: string }>>([])
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  const createLead = useCreateLead()
  const backdropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Datei laden → Auto-Mapping → zum Mapping-Schritt
  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f)
    setErrors([])
    try {
      const result = await parseFile(f)
      if (result.headers.length === 0) {
        setErrors(['Keine Spalten in der Datei gefunden.'])
        return
      }
      setHeaders(result.headers)
      setRows(result.rows)
      // Auto-Mapping
      setMappings(result.headers.map((h) => autoDetectField(h)))
      setStep('mapping')
    } catch {
      setErrors(['Fehler beim Lesen der Datei.'])
    }
  }, [])

  // Mapping-Änderung
  const updateMapping = (idx: number, field: CrmField) => {
    setMappings((prev) => {
      const next = [...prev]
      next[idx] = field
      return next
    })
  }

  // Vorschau generieren + Duplikat-Check
  const goToPreview = async () => {
    const leads = buildLeads(rows, mappings)
    if (leads.length === 0) {
      setErrors(['Keine gueltigen Leads mit dieser Zuordnung. Pruefe ob mindestens ein Kontaktfeld (Name, E-Mail, Telefon oder Adresse) zugeordnet ist.'])
      return
    }
    setErrors([])
    setParsed(leads)
    setDuplicates([])
    setCheckingDuplicates(true)
    setStep('preview')

    // Duplikate pruefen (im Hintergrund)
    const found: typeof duplicates = []
    // Interne Duplikate (gleiche E-Mail innerhalb der Import-Datei)
    const seenEmails = new Map<string, number>()
    for (let i = 0; i < leads.length; i++) {
      const email = leads[i].email?.toLowerCase()
      if (email && seenEmails.has(email)) {
        found.push({ index: i, lead: leads[i], existingEmail: email })
      } else if (email) {
        seenEmails.set(email, i)
      }
    }
    // Gegen DB pruefen (Batch – max. 50 auf einmal)
    const uniqueEmails = [...new Set(leads.filter(l => l.email).map(l => l.email.toLowerCase()))]
    try {
      for (let batch = 0; batch < uniqueEmails.length; batch += 50) {
        const chunk = uniqueEmails.slice(batch, batch + 50)
        for (const email of chunk) {
          try {
            const res = await api.post<{ data: { isDuplicate: boolean } }>('/leads/check-duplicate', { email })
            if (res.data.isDuplicate) {
              leads.forEach((lead, idx) => {
                if (lead.email?.toLowerCase() === email && !found.some(d => d.index === idx)) {
                  found.push({ index: idx, lead, existingEmail: email })
                }
              })
            }
          } catch { /* ignore individual check errors */ }
        }
      }
    } catch { /* ignore batch errors */ }
    setDuplicates(found)
    setCheckingDuplicates(false)
  }

  // Import starten
  const handleImport = async () => {
    setStep('importing')
    setErrors([])
    setProgress(0)
    const errs: string[] = []
    const duplicateIndices = new Set(skipDuplicates ? duplicates.map(d => d.index) : [])
    let skippedCount = 0

    for (let i = 0; i < parsed.length; i++) {
      if (duplicateIndices.has(i)) {
        skippedCount++
        setProgress(i + 1)
        continue
      }
      try {
        await createLead.mutateAsync({ ...parsed[i], status: defaultStatus, skipDuplicateCheck: true } as Record<string, unknown>)
      } catch (err) {
        errs.push(`Zeile ${i + 2}: ${err instanceof Error ? err.message : 'Fehler'}`)
      }
      setProgress(i + 1)
    }
    if (skippedCount > 0) {
      errs.unshift(`${skippedCount} Duplikat${skippedCount > 1 ? 'e' : ''} übersprungen`)
    }
    setErrors(errs)
    setStep('done')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect])

  // Beispielwerte pro Spalte (erste 3 nicht-leere Werte)
  const getSampleValues = (colIdx: number): string[] => {
    const samples: string[] = []
    for (const row of rows) {
      const val = row[colIdx]?.trim()
      if (val && samples.length < 3) samples.push(val)
      if (samples.length >= 3) break
    }
    return samples
  }

  const mappedFieldCount = mappings.filter((m) => m !== 'skip').length

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="outline-none w-full max-w-[680px] mx-4 max-h-[85vh] flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold tracking-[-0.02em]">
              {defaultStatus === 'AFTER_SALES' ? 'After-Sales importieren' : 'Leads importieren'}
            </h2>
            <p className="text-[12px] text-text-sec mt-0.5">
              {step === 'upload' && 'Schritt 1/3 – Datei hochladen'}
              {step === 'mapping' && 'Schritt 2/3 – Spalten zuordnen'}
              {step === 'preview' && 'Schritt 3/3 – Vorschau & Import'}
              {step === 'importing' && 'Importiere...'}
              {step === 'done' && 'Import abgeschlossen'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all duration-150">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-amber/30 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                <Upload size={28} className="text-text-dim mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[13px] text-text-sec">
                  Excel (.xlsx) oder CSV-Datei hierher ziehen oder klicken
                </p>
                <p className="text-[10px] text-text-dim mt-1">
                  Spalten werden im naechsten Schritt zugeordnet
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-amber hover:text-amber/80 transition-colors"
                  style={{ background: 'color-mix(in srgb, #F59E0B 8%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 15%, transparent)' }}
                >
                  <Download size={12} strokeWidth={2} />
                  Vorlage herunterladen (.xlsx)
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Mapping ── */}
          {step === 'mapping' && (
            <>
              <div className="flex items-center gap-3 mb-1">
                <FileSpreadsheet size={16} className="text-amber" strokeWidth={1.8} />
                <span className="text-[13px] font-semibold">{file?.name}</span>
                <span className="text-[11px] text-text-dim">{rows.length} Zeilen, {headers.length} Spalten</span>
              </div>

              <p className="text-[11px] text-text-sec mb-3">
                Ordne jede Spalte einem CRM-Feld zu. Automatisch erkannte Felder sind vorausgefuellt.
              </p>

              <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
                {headers.map((header, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{
                      background: mappings[idx] !== 'skip' ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${mappings[idx] !== 'skip' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)'}`,
                    }}
                  >
                    {/* Spalten-Name + Beispielwerte */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-text truncate">{header}</p>
                      <p className="text-[10px] text-text-dim truncate">
                        {getSampleValues(idx).join(' | ') || '(leer)'}
                      </p>
                    </div>

                    {/* Pfeil */}
                    <ArrowRight size={14} className="text-text-dim shrink-0" />

                    {/* Dropdown */}
                    <div className="relative shrink-0 w-[160px]">
                      <select
                        value={mappings[idx]}
                        onChange={(e) => updateMapping(idx, e.target.value as CrmField)}
                        className="glass-input appearance-none w-full px-3 py-1.5 pr-7 text-[12px] cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        {CRM_FIELDS.map((f) => (
                          <option key={f.value} value={f.value} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-text-dim">
                {mappedFieldCount} von {headers.length} Spalten zugeordnet
              </p>
            </>
          )}

          {/* ── STEP 3: Preview ── */}
          {step === 'preview' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-semibold">{parsed.length} Leads bereit zum Import</span>
                {checkingDuplicates && (
                  <span className="flex items-center gap-1.5 text-[11px] text-text-dim">
                    <Loader2 size={12} className="animate-spin" /> Duplikate werden geprüft...
                  </span>
                )}
              </div>

              {/* Duplikat-Warnung */}
              {duplicates.length > 0 && (
                <div
                  className="px-4 py-3 rounded-[10px] mb-2"
                  style={{ background: 'color-mix(in srgb, #F59E0B 8%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 20%, transparent)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber" strokeWidth={2} />
                      <span className="text-[12px] font-semibold text-amber">
                        {duplicates.length} Duplikat{duplicates.length > 1 ? 'e' : ''} gefunden
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-text-sec">
                        {skipDuplicates ? 'Duplikate überspringen' : 'Trotzdem importieren'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSkipDuplicates(!skipDuplicates)}
                        className="relative w-9 h-5 rounded-full transition-colors"
                        style={{ background: skipDuplicates ? '#F59E0B' : 'rgba(255,255,255,0.1)' }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ left: skipDuplicates ? '18px' : '2px' }}
                        />
                      </button>
                    </label>
                  </div>
                  <p className="text-[10px] text-text-dim mt-1.5">
                    Leads mit gleicher E-Mail-Adresse die bereits im System existieren oder doppelt in der Datei vorkommen.
                  </p>
                </div>
              )}

              <div className="max-h-[280px] overflow-y-auto rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-text-dim sticky top-0" style={{ background: 'rgba(11,15,21,0.95)' }}>
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">E-Mail</th>
                      <th className="text-left px-3 py-2">Telefon</th>
                      <th className="text-left px-3 py-2">Adresse</th>
                      <th className="text-left px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 20).map((lead, i) => {
                      const isDuplicate = duplicates.some(d => d.index === i)
                      return (
                        <tr
                          key={i}
                          className="border-b border-border/50"
                          style={isDuplicate && skipDuplicates ? { opacity: 0.4, textDecoration: 'line-through' } : undefined}
                        >
                          <td className="px-3 py-1.5 text-text-dim">{i + 1}</td>
                          <td className="px-3 py-1.5 text-text-sec">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.company || '\u2014'}
                          </td>
                          <td className="px-3 py-1.5 text-text-sec">{lead.email || '\u2014'}</td>
                          <td className="px-3 py-1.5 text-text-sec tabular-nums">{lead.phone || '\u2014'}</td>
                          <td className="px-3 py-1.5 text-text-sec truncate max-w-[150px]">{lead.address || '\u2014'}</td>
                          <td className="px-3 py-1.5">
                            {isDuplicate ? (
                              <span className="text-[10px] font-semibold text-amber">Duplikat</span>
                            ) : (
                              <span className="text-[10px] text-text-sec">{lead.source}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {parsed.length > 20 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-1.5 text-text-dim text-center">
                          ... und {parsed.length - 20} weitere
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── STEP: Importing ── */}
          {step === 'importing' && (
            <div className="space-y-3 py-6">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-amber" />
                <span className="text-[13px] text-text-sec">
                  {progress} / {parsed.length} importiert...
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(progress / parsed.length) * 100}%`, background: 'linear-gradient(90deg, #F59E0B, #F97316)' }}
                />
              </div>
            </div>
          )}

          {/* ── STEP: Done ── */}
          {step === 'done' && (
            <div className="text-center py-8">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-[15px] font-semibold">
                {parsed.length - errors.length} von {parsed.length} Leads importiert
              </p>
              {errors.length > 0 && (
                <p className="text-[11px] text-red-400 mt-1">{errors.length} Fehler</p>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div
              className="px-4 py-3 rounded-[10px] space-y-1 max-h-[100px] overflow-y-auto"
              style={{ background: 'color-mix(in srgb, #F87171 8%, transparent)', border: '1px solid color-mix(in srgb, #F87171 20%, transparent)' }}
            >
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle size={12} className="text-red shrink-0 mt-0.5" />
                  <span className="text-[11px] text-red">{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-2.5">
          {step === 'mapping' && (
            <button type="button" onClick={() => { setStep('upload'); setFile(null); setHeaders([]); setRows([]) }}
              className="btn-secondary px-4 py-2.5 text-[13px] font-semibold flex items-center gap-1.5">
              <ArrowLeft size={14} /> Zurueck
            </button>
          )}
          {step === 'preview' && (
            <button type="button" onClick={() => setStep('mapping')}
              className="btn-secondary px-4 py-2.5 text-[13px] font-semibold flex items-center gap-1.5">
              <ArrowLeft size={14} /> Mapping aendern
            </button>
          )}

          <div className="flex-1" />

          {step === 'upload' && (
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-[13px] font-semibold">
              Abbrechen
            </button>
          )}

          {step === 'mapping' && (
            <button type="button" onClick={goToPreview} disabled={mappedFieldCount === 0}
              className="btn-primary px-5 py-2.5 text-[13px] flex items-center gap-1.5 disabled:opacity-40">
              Vorschau <ArrowRight size={14} />
            </button>
          )}

          {step === 'preview' && (
            <button type="button" onClick={handleImport}
              disabled={checkingDuplicates}
              className="btn-primary px-5 py-2.5 text-[13px] flex items-center gap-2 disabled:opacity-40">
              {parsed.length - (skipDuplicates ? duplicates.length : 0)} Leads importieren
            </button>
          )}

          {step === 'done' && (
            <button type="button" onClick={onClose} className="btn-primary px-5 py-2.5 text-[13px]">
              Schliessen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
