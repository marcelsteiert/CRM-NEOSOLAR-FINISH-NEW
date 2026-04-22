import { useState, useEffect } from 'react'
import { Save, RotateCcw, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  useNoShowKanbanColumns,
  useUpdateNoShowKanbanColumns,
  type NoShowKanbanColumn,
} from '@/hooks/useAdmin'

const presetColors = [
  '#F87171', '#FB923C', '#F59E0B', '#FACC15', '#84CC16',
  '#34D399', '#22D3EE', '#60A5FA', '#A78BFA', '#E879F9',
]

function makeKey(label: string, existing: NoShowKanbanColumn[]): string {
  const base = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'PHASE'
  let key = base
  let i = 2
  while (existing.some((c) => c.key === key)) {
    key = `${base}_${i}`
    i++
  }
  return key
}

export default function NoShowKanbanSection() {
  const { data: res, isLoading } = useNoShowKanbanColumns()
  const updateMut = useUpdateNoShowKanbanColumns()
  const [columns, setColumns] = useState<NoShowKanbanColumn[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  useEffect(() => {
    if (res?.data) {
      setColumns([...res.data].sort((a, b) => a.order - b.order))
      setHasChanges(false)
    }
  }, [res])

  const updateColumn = (idx: number, patch: Partial<NoShowKanbanColumn>) => {
    setColumns((prev) => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
    setHasChanges(true)
  }

  const addColumn = () => {
    const label = 'Neue Phase'
    const next: NoShowKanbanColumn = {
      key: makeKey(`${label}_${columns.length + 1}`, columns),
      label,
      color: presetColors[columns.length % presetColors.length],
      order: columns.length,
    }
    setColumns((prev) => [...prev, next])
    setHasChanges(true)
  }

  const removeColumn = (idx: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })))
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 h-20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div
        className="p-4 rounded-xl text-[12px] text-text-sec"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        Phasen des No-Show-Kanban-Boards. Das Callcenter verschiebt Kunden per Drag & Drop
        zwischen diesen Phasen. Eigene Phasen (z.B. "3. Rückruf", "Kunde abgelehnt") können
        hinzugefügt werden.
      </div>

      <div className="space-y-2">
        {columns.map((col, idx) => (
          <div
            key={col.key}
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
            <div className="cursor-grab active:cursor-grabbing text-text-dim hover:text-text transition-colors">
              <GripVertical size={16} strokeWidth={1.8} />
            </div>

            <div className="w-4 h-4 rounded-full shrink-0" style={{ background: col.color }} />

            <div className="w-[130px] shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-dim">Key</p>
              <p className="text-[12px] font-mono text-text-sec">{col.key}</p>
            </div>

            <div className="flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">Anzeigename</p>
              <input
                type="text"
                value={col.label}
                onChange={(e) => updateColumn(idx, { label: e.target.value })}
                className="glass-input w-full px-3 py-1.5 text-[13px] font-semibold"
              />
            </div>

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

            <button
              type="button"
              onClick={() => removeColumn(idx)}
              disabled={columns.length <= 1}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-dim hover:text-red hover:bg-red/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Phase löschen"
            >
              <Trash2 size={14} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addColumn}
        className="btn-secondary flex items-center gap-2 px-4 py-2 text-[12px]"
      >
        <Plus size={14} strokeWidth={2} />
        Phase hinzufügen
      </button>

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
