import { useState, useEffect } from 'react'
import { Save, RotateCcw, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  useProjectKanbanColumns,
  useUpdateProjectKanbanColumns,
  type ProjectKanbanColumn,
} from '@/hooks/useAdmin'

const presetColors = [
  '#60A5FA', '#34D399', '#F59E0B', '#A78BFA', '#F87171',
  '#22D3EE', '#FB923C', '#E879F9', '#94A3B8', '#4ADE80',
]

export default function ProjectKanbanSection() {
  const { data: res, isLoading } = useProjectKanbanColumns()
  const updateMut = useUpdateProjectKanbanColumns()
  const [columns, setColumns] = useState<ProjectKanbanColumn[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    if (res?.data) {
      setColumns([...res.data].sort((a, b) => a.order - b.order))
      setHasChanges(false)
    }
  }, [res])

  const updateColumn = (idx: number, patch: Partial<ProjectKanbanColumn>) => {
    setColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
    setHasChanges(true)
  }

  const handleSave = () => {
    const ordered = columns.map((c, i) => ({ ...c, order: i }))
    updateMut.mutate(ordered, {
      onSuccess: () => {
        setHasChanges(false)
        setSavedMsg(true)
        setTimeout(() => setSavedMsg(false), 2500)
      },
    })
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

  const handleAddColumn = () => {
    // Eindeutige neue Phase-ID generieren
    let newKey = 'phase_neu'
    let counter = 2
    while (columns.some((c) => c.phase === newKey)) {
      newKey = `phase_neu_${counter}`
      counter++
    }
    const newColumn: ProjectKanbanColumn = {
      phase: newKey,
      label: 'Neue Spalte',
      description: '',
      color: presetColors[columns.length % presetColors.length],
      order: columns.length,
    }
    setColumns((prev) => [...prev, newColumn])
    setHasChanges(true)
  }

  const handleDeleteColumn = (idx: number) => {
    const col = columns[idx]
    if (!col) return
    if (!confirm(`Spalte "${col.label}" wirklich entfernen?\n\nProjekte mit Phase '${col.phase}' bleiben in der DB, sind aber im Kanban nicht mehr sichtbar.`)) return
    setColumns((prev) => prev.filter((_, i) => i !== idx))
    setHasChanges(true)
  }

  const handlePhaseKeyChange = (idx: number, value: string) => {
    // Phase-Key bereinigen: lowercase, nur a-z, 0-9, _
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    updateColumn(idx, { phase: cleaned })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5 h-24 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
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
        Hier kannst du die Spalten des Projekt-Kanban-Boards <strong className="text-text">erstellen, benennen, einfärben und sortieren</strong>.
        Phase-ID = der technische Schlüssel (z.B. <code>montage</code>) — bei neuen Spalten frei wählbar.
        Anzeige-Name + Farbe + Reihenfolge sind frei.
        Änderungen wirken sich auf alle Benutzer aus.
      </div>

      {/* + Spalte hinzufügen */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleAddColumn}
          className="btn-primary text-xs"
        >
          <Plus size={14} strokeWidth={2} />
          Spalte hinzufügen
        </button>
      </div>

      {/* Columns */}
      <div className="space-y-2">
        {columns.map((col, idx) => (
          <div
            key={col.phase}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className="glass-card p-4 cursor-move"
            style={{
              borderRadius: 'var(--radius-md)',
              borderLeft: `4px solid ${col.color}`,
              opacity: dragIdx === idx ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <div className="flex items-start gap-3">
              <GripVertical size={16} strokeWidth={1.8} className="text-text-dim mt-2 flex-shrink-0" />

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Phase-ID (editierbar bei neuen, readonly bei Standard 4) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Phase-ID</label>
                  {(['admin', 'montage', 'elektro', 'abschluss'].includes(col.phase) ? (
                    <div
                      className="px-3 py-2 text-[12px] rounded-lg font-mono"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: '#8B95A5' }}
                      title="Standard-Phase – ID kann nicht geändert werden"
                    >
                      {col.phase} 🔒
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={col.phase}
                      onChange={(e) => handlePhaseKeyChange(idx, e.target.value)}
                      placeholder="z.B. abnahme"
                      className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50 font-mono"
                    />
                  ))}
                </div>

                {/* Label */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Anzeige-Name</label>
                  <input
                    type="text"
                    value={col.label}
                    onChange={(e) => updateColumn(idx, { label: e.target.value })}
                    placeholder="z.B. Administration"
                    className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Beschreibung</label>
                  <input
                    type="text"
                    value={col.description}
                    onChange={(e) => updateColumn(idx, { description: e.target.value })}
                    placeholder="Kurzbeschreibung"
                    className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
                  />
                </div>

                {/* Color */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Farbe</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={col.color}
                      onChange={(e) => updateColumn(idx, { color: e.target.value })}
                      className="w-10 h-9 rounded-lg cursor-pointer border-0 p-0"
                      style={{ background: 'transparent' }}
                    />
                    <input
                      type="text"
                      value={col.color}
                      onChange={(e) => updateColumn(idx, { color: e.target.value })}
                      className="flex-1 px-2 py-2 text-[11px] font-mono rounded-lg bg-surface-hover border border-border text-text"
                    />
                  </div>
                </div>

                {/* Delete-Button */}
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteColumn(idx)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-colors"
                    title="Spalte entfernen"
                    aria-label="Spalte entfernen"
                  >
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>

            {/* Preset Colors */}
            <div className="flex items-center gap-1.5 mt-3 ml-7">
              <span className="text-[10px] uppercase tracking-wider text-text-dim mr-1">Schnell:</span>
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateColumn(idx, { color: c })}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    border: col.color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2 sticky bottom-0 py-2">
        {savedMsg && <span className="text-[12px] text-emerald-400 mr-2">Gespeichert ✓</span>}
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges}
          className="btn-secondary text-xs"
        >
          <RotateCcw size={14} strokeWidth={1.8} />
          Zurücksetzen
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || updateMut.isPending}
          className="btn-primary text-xs"
        >
          <Save size={14} strokeWidth={2} />
          Speichern
        </button>
      </div>
    </div>
  )
}
