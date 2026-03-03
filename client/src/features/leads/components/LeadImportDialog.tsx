import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useCreateLead, type LeadSource } from '@/hooks/useLeads'

interface LeadImportDialogProps {
  onClose: () => void
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

const SOURCE_MAP: Record<string, LeadSource> = {
  homepage: 'HOMEPAGE',
  landingpage: 'LANDINGPAGE',
  messe: 'MESSE',
  empfehlung: 'EMPFEHLUNG',
  kaltakquise: 'KALTAKQUISE',
  sonstige: 'SONSTIGE',
}

function parseSource(raw: string): LeadSource {
  const lower = raw.trim().toLowerCase()
  return SOURCE_MAP[lower] ?? 'SONSTIGE'
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ';' || ch === ',') {
        cells.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  cells.push(current.trim())
  return cells
}

function parseCsv(text: string): ParsedLead[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''))
  const leads: ParsedLead[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    if (cells.length < 3) continue

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? ''
    })

    leads.push({
      firstName: row.vorname || row.firstname || undefined,
      lastName: row.nachname || row.lastname || undefined,
      company: row.unternehmen || row.company || row.firma || undefined,
      address: row.adresse || row.address || '',
      phone: row.telefon || row.phone || row.tel || '',
      email: row.email || row.mail || '',
      source: parseSource(row.quelle || row.source || 'sonstige'),
      value: row.wert || row.value ? Number(row.wert || row.value) || 0 : undefined,
      notes: row.notizen || row.notes || undefined,
    })
  }

  return leads.filter((l) => l.address && l.phone && l.email)
}

export default function LeadImportDialog({ onClose }: LeadImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedLead[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const createLead = useCreateLead()
  const backdropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose()
  }

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f)
    setErrors([])
    setDone(false)
    setParsed([])

    try {
      const text = await f.text()
      const leads = parseCsv(text)

      if (leads.length === 0) {
        setErrors(['Keine gueltige Leads in der Datei gefunden. Pruefe das Format (Pflichtfelder: Adresse, Telefon, E-Mail).'])
        return
      }

      setParsed(leads)
    } catch {
      setErrors(['Fehler beim Lesen der Datei.'])
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
        handleFileSelect(f)
      }
    },
    [handleFileSelect],
  )

  const handleImport = async () => {
    setImporting(true)
    setErrors([])
    setProgress(0)

    const errs: string[] = []
    for (let i = 0; i < parsed.length; i++) {
      try {
        await createLead.mutateAsync(parsed[i] as Record<string, unknown>)
      } catch (err) {
        errs.push(`Zeile ${i + 2}: ${err instanceof Error ? err.message : 'Fehler'}`)
      }
      setProgress(i + 1)
    }

    setErrors(errs)
    setImporting(false)
    setDone(true)
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
        role="dialog"
        aria-modal="true"
        aria-label="Leads importieren"
        className="outline-none w-full max-w-[520px] mx-4"
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
            <h2 className="text-base font-bold tracking-[-0.02em]">Leads importieren</h2>
            <p className="text-[12px] text-text-sec mt-0.5">CSV-Datei hochladen</p>
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

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          {!done && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-amber/30 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet size={20} className="text-amber" strokeWidth={1.8} />
                  <div className="text-left">
                    <p className="text-[13px] font-semibold">{file.name}</p>
                    <p className="text-[11px] text-text-sec">{parsed.length} Leads erkannt</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-text-dim mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-[13px] text-text-sec">
                    CSV-Datei hierher ziehen oder klicken
                  </p>
                  <p className="text-[10px] text-text-dim mt-1">
                    Spalten: Vorname, Nachname, Unternehmen, Adresse*, Telefon*, E-Mail*, Quelle, Wert, Notizen
                  </p>
                </>
              )}
            </div>
          )}

          {/* Preview */}
          {parsed.length > 0 && !importing && !done && (
            <div className="max-h-[200px] overflow-y-auto rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-text-dim">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">E-Mail</th>
                    <th className="text-left px-3 py-2">Quelle</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 10).map((lead, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-3 py-1.5 text-text-sec">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || '\u2014'}
                      </td>
                      <td className="px-3 py-1.5 text-text-sec">{lead.email}</td>
                      <td className="px-3 py-1.5 text-text-sec">{lead.source}</td>
                    </tr>
                  ))}
                  {parsed.length > 10 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-1.5 text-text-dim text-center">
                        ... und {parsed.length - 10} weitere
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-amber" />
                <span className="text-[12px] text-text-sec">
                  {progress} / {parsed.length} importiert...
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress / parsed.length) * 100}%`,
                    background: 'linear-gradient(90deg, #F59E0B, #F97316)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Done */}
          {done && (
            <div className="text-center py-4">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-[14px] font-semibold">
                {parsed.length - errors.length} von {parsed.length} Leads importiert
              </p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div
              className="px-4 py-3 rounded-[10px] space-y-1"
              style={{
                background: 'color-mix(in srgb, #F87171 8%, transparent)',
                border: '1px solid color-mix(in srgb, #F87171 20%, transparent)',
              }}
            >
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle size={12} className="text-red shrink-0 mt-0.5" />
                  <span className="text-[11px] text-red">{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 px-4 py-2.5 text-[13px] font-semibold text-center"
            >
              {done ? 'Schliessen' : 'Abbrechen'}
            </button>
            {!done && (
              <button
                type="button"
                onClick={handleImport}
                disabled={parsed.length === 0 || importing}
                className="btn-primary flex-1 px-4 py-2.5 text-[13px] text-center flex items-center justify-center gap-2"
              >
                {importing && <Loader2 size={14} className="animate-spin" />}
                {parsed.length} Leads importieren
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
