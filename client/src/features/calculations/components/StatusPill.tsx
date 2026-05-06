import { useState, useRef, useEffect } from 'react'
import { Check, X } from 'lucide-react'

interface Props {
  value: boolean
  onChange: (next: boolean, dateIso: string | null) => void
  date?: string | null
  showDate?: boolean
  disabled?: boolean
  yesLabel?: string
  noLabel?: string
}

/**
 * Bool-Toggle als grüne (Ja) / rote (Nein) Pill — klickbar.
 * Optional setzt es beim Umschalten auf "Ja" automatisch das heutige Datum.
 */
export default function StatusPill({ value, onChange, date, showDate, disabled, yesLabel = 'Ja', noLabel = 'Nein' }: Props) {
  const handleClick = () => {
    if (disabled) return
    const next = !value
    const newDate = next ? new Date().toISOString().split('T')[0] : null
    onChange(next, newDate)
  }

  const color = value ? '#34D399' : '#F87171'
  const bg = `color-mix(in srgb, ${color} 14%, transparent)`

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: bg, color }}
      title={showDate && date ? `Seit ${new Date(date).toLocaleDateString('de-CH')}` : undefined}
    >
      {value ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
      {value ? yesLabel : noLabel}
    </button>
  )
}

interface DateCellProps {
  value: string | null
  onChange: (next: string | null) => void
  disabled?: boolean
  placeholder?: string
}

/** Editierbare Datums-Zelle — Klick öffnet Date-Picker inline. */
export function DateCell({ value, onChange, disabled, placeholder = '–' }: DateCellProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        onBlur={() => setEditing(false)}
        className="bg-transparent border border-amber/50 rounded px-1 py-0.5 text-[10px] text-text outline-none w-[110px]"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className="text-[10px] font-medium text-text-dim tabular-nums hover:text-amber transition-colors disabled:cursor-not-allowed"
    >
      {value ? new Date(value).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : placeholder}
    </button>
  )
}

interface TextCellProps {
  value: string | null
  onSave: (next: string | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

/** Inline editierbares Text-Feld (single line). */
export function TextCell({ value, onSave, disabled, placeholder = 'Klick zum Bearbeiten', className }: TextCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value ?? '') }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft.trim() !== (value ?? '')) onSave(draft.trim() || null)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false) }
        }}
        className={`bg-transparent border border-amber/50 rounded px-1 py-0.5 text-[11px] text-text outline-none w-full min-w-[100px] ${className ?? ''}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={`text-[11px] text-text-sec hover:text-amber transition-colors text-left w-full min-h-[18px] ${className ?? ''}`}
    >
      {value || <span className="text-text-dim italic">{placeholder}</span>}
    </button>
  )
}

interface NumberCellProps {
  value: number | null
  onSave: (next: number | null) => void
  disabled?: boolean
  suffix?: string
  className?: string
  placeholder?: string
}

/** Inline editierbare Zahl (für CHF-Beträge). */
export function NumberCell({ value, onSave, disabled, suffix = 'CHF', className, placeholder = '0' }: NumberCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value != null ? String(value) : '') }, [value])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const commit = () => {
    setEditing(false)
    const parsed = draft.trim() === '' ? null : Number(draft.replace(',', '.'))
    if (parsed !== value && !(parsed != null && isNaN(parsed))) {
      onSave(parsed)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(value != null ? String(value) : ''); setEditing(false) }
        }}
        className={`bg-transparent border border-amber/50 rounded px-1 py-0.5 text-[11px] tabular-nums text-text outline-none w-full text-right ${className ?? ''}`}
      />
    )
  }

  const display = value != null
    ? `${value.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${suffix}`
    : <span className="text-text-dim">{placeholder}</span>

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={`text-[11px] tabular-nums text-text-sec hover:text-amber transition-colors text-right w-full ${className ?? ''}`}
    >
      {display}
    </button>
  )
}
