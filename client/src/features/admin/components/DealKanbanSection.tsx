import { useState, useEffect } from 'react'
import { Save, RotateCcw, GripVertical } from 'lucide-react'
import { useDealKanbanColumns, useUpdateDealKanbanColumns, type DealKanbanColumn } from '@/hooks/useAdmin'

const presetColors = [
  '#60A5FA', '#34D399', '#F59E0B', '#A78BFA', '#F87171',
  '#22D3EE', '#FB923C', '#E879F9', '#94A3B8', '#4ADE80',
]

export default function DealKanbanSection() {
  const { data: res, isLoading } = useDealKanbanColumns()
  const updateMut = useUpdateDealKanbanColumns()
  const [columns, setColumns] = useState<DealKanbanColumn[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  useEffect(() => {
    if (res?.data) {
      setColumns([...res.data].sort((a, b) => a.order - b.order))
      setHasChanges(false)
    }
  }, [res])

  const updateColumn = (idx: number, patch: Partial<DealKanbanColumn>) => {
    setColumns((prev) => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
    setHasChanges(true)
  }

  const handleSave = () => {
    const ordered = columns.map((c, i) => ({ ...c, order: i }))
    updateMut.mutate(ordered)
    setHasChanges(false)
  }

  const handleReset = () => {
    if (res?.data) {
      setColumns([...res.data].sort((a, b) => a.order - b.order))
      setHasChanges(false)
    }
  }

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setColumns((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(idx)
    setHasChanges(true)
  }
  const handleDragEnd = () => setDragIdx(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5 h-20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Info */}
      <div
        className="p-4 rounded-xl text-[12px] text-text-sec"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        Hier kannst du die Spalten des Angebote-Kanban-Boards benennen, einfaerben und per Drag & Drop sortieren.
        Die Aenderungen wirken sich auf alle Benutzer aus.
      </div>

      {/* Columns */}
      <div className="space-y-2">
        {columns.map((col, idx) => (
          <div
            key={col.stage}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className="glass-card p-4 flex items-center gap-4 transition-all"
            style={{
              border: dragIdx === idx ? `1px solid ${col.color}` : '1px solid rgba(255,255,255,0.06)',
              opacity: dragIdx === idx ? 0.7 : 1,
            }}
          >
            {/* Drag handle */}
            <div className="cursor-grab active:cursor-grabbing text-text-dim hover:text-text transition-colors">
              <GripVertical size={16} strokeWidth={1.8} />
            </div>

            {/* Color dot */}
            <div className="w-4 h-4 rounded-full shrink-0" style={{ background: col.color }} />

            {/* Stage (read-only) */}
            <div className="w-[130px] shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-dim">Stage-Key</p>
              <p className="text-[12px] font-mono text-text-sec">{col.stage}</p>
            </div>

            {/* Label (editable) */}
            <div className="flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">Anzeigename</p>
              <input
                type="text"
                value={col.label}
                onChange={(e) => updateColumn(idx, { label: e.target.value })}
                className="glass-input w-full px-3 py-1.5 text-[13px] font-semibold"
              />
            </div>

            {/* Color picker */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">Farbe</p>
              <div className="flex gap-1">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateColumn(idx, { color: c })}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c,
                      border: col.color === c ? '2px solid white' : '2px solid transparent',
                      boxShadow: col.color === c ? `0 0 8px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {hasChanges && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[13px]"
          >
            <Save size={14} strokeWidth={2} />
            {updateMut.isPending ? 'Speichern...' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2 px-5 py-2.5 text-[13px]"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Zurücksetzen
          </button>
        </div>
      )}

      {updateMut.isSuccess && !hasChanges && (
        <p className="text-[11px] text-emerald-400 font-semibold">Gespeichert!</p>
      )}
    </div>
  )
}
