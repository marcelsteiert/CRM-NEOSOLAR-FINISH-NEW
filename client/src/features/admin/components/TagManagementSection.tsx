import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useTags } from '@/hooks/useLeads'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const TAG_COLORS = [
  '#F87171', '#FB923C', '#F59E0B', '#34D399', '#22D3EE',
  '#60A5FA', '#A78BFA', '#F472B6', '#94A3B8', '#E879F9',
]

interface Tag {
  id: string
  name: string
  color: string
}

export default function TagManagementSection() {
  const { data: tagsResponse } = useTags()
  const tags: Tag[] = (tagsResponse?.data ?? []) as Tag[]
  const qc = useQueryClient()

  const createTag = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post<{ data: Tag }>('/tags', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })

  const deleteTag = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/tags/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    createTag.mutate({ name: newName.trim(), color: newColor })
    setNewName('')
  }

  return (
    <div className="space-y-4">
      {/* Create new tag */}
      <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Neuen Tag erstellen..."
            className="flex-1 px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-emerald-400/50"
          />
          {/* Color picker */}
          <div className="flex items-center gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  background: c,
                  transform: newColor === c ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: newColor === c ? `0 0 8px ${c}40` : 'none',
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || createTag.isPending}
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold disabled:opacity-30"
          >
            <Plus size={12} strokeWidth={2} />
            Tag
          </button>
        </div>
      </div>

      {/* Tags List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="glass-card p-3 flex items-center gap-3 group"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: tag.color, boxShadow: `0 0 6px ${tag.color}30` }}
            />
            {editingId === tag.id ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-0.5 text-[12px] rounded bg-bg border border-border text-text focus:outline-none"
                  autoFocus
                />
                <button type="button" onClick={() => setEditingId(null)} className="text-emerald-400">
                  <Check size={12} strokeWidth={2} />
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-text-dim">
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-[12px] font-medium text-text flex-1">{tag.name}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => { setEditingId(tag.id); setEditName(tag.name) }}
                    className="text-text-dim hover:text-text p-1"
                  >
                    <Pencil size={10} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTag.mutate(tag.id)}
                    className="text-text-dim hover:text-red p-1"
                  >
                    <Trash2 size={10} strokeWidth={2} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-[13px] font-semibold text-text mb-1">Keine Tags vorhanden</p>
          <p className="text-[11px] text-text-sec">Erstelle deinen ersten Tag über das Formular oben.</p>
        </div>
      )}
    </div>
  )
}
