import { useState, useEffect } from 'react'
import { Save, RotateCcw, Plus, Trash2, GripVertical, FolderKanban, Sun, Zap, CheckCircle2 } from 'lucide-react'
import { usePhaseDefinitions, type PhaseDefinition, type ProjectPhase } from '@/hooks/useProjects'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const phaseIcons: Record<string, typeof FolderKanban> = {
  admin: FolderKanban,
  montage: Sun,
  elektro: Zap,
  abschluss: CheckCircle2,
}

export default function ProjectPhasesSection() {
  const { data: phasesData, isLoading } = usePhaseDefinitions()
  const phases = phasesData?.data ?? []

  const qc = useQueryClient()
  const updatePhases = useMutation({
    mutationFn: (data: { phases: { id: string; name: string; color: string; description: string; steps: string[] }[] }) =>
      api.put<{ data: unknown }>('/projects/phases', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectPhases'] })
    },
  })

  const [localPhases, setLocalPhases] = useState<{ id: string; name: string; color: string; description: string; steps: string[] }[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (phases.length > 0) {
      setLocalPhases(phases.map((p) => ({ id: p.id, name: p.name, color: p.color, description: p.description, steps: [...p.steps] })))
    }
  }, [phases])

  const handleSave = async () => {
    try {
      await updatePhases.mutateAsync({ phases: localPhases })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* handled */ }
  }

  const handleReset = () => {
    if (phases.length > 0) {
      setLocalPhases(phases.map((p) => ({ id: p.id, name: p.name, color: p.color, description: p.description, steps: [...p.steps] })))
    }
  }

  const addStep = (phaseIdx: number) => {
    setLocalPhases((prev) => prev.map((p, i) => i === phaseIdx ? { ...p, steps: [...p.steps, ''] } : p))
  }

  const removeStep = (phaseIdx: number, stepIdx: number) => {
    setLocalPhases((prev) => prev.map((p, i) => i === phaseIdx ? { ...p, steps: p.steps.filter((_, si) => si !== stepIdx) } : p))
  }

  const updateStep = (phaseIdx: number, stepIdx: number, value: string) => {
    setLocalPhases((prev) => prev.map((p, i) => i === phaseIdx ? { ...p, steps: p.steps.map((s, si) => si === stepIdx ? value : s) } : p))
  }

  const updatePhaseMeta = (phaseIdx: number, field: 'name' | 'description', value: string) => {
    setLocalPhases((prev) => prev.map((p, i) => i === phaseIdx ? { ...p, [field]: value } : p))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Buttons */}
      <div className="flex items-center gap-2.5 justify-end">
        <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold">
          <RotateCcw size={13} /> Zurücksetzen
        </button>
        <button onClick={handleSave} disabled={updatePhases.isPending} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold">
          <Save size={13} /> {saved ? 'Gespeichert!' : 'Speichern'}
        </button>
      </div>

      {/* Phases */}
      {localPhases.map((phase, pi) => {
        const Icon = phaseIcons[phase.id] ?? FolderKanban
        return (
          <div key={phase.id} className="glass-card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
            {/* Phase Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `color-mix(in srgb, ${phase.color} 12%, transparent)` }}>
                <Icon size={16} style={{ color: phase.color }} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.06em] text-text-dim mb-1">Phase-Name</label>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhaseMeta(pi, 'name', e.target.value)}
                    className="glass-input w-full px-3 py-2 text-[13px] font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.06em] text-text-dim mb-1">Beschreibung</label>
                  <input
                    type="text"
                    value={phase.description}
                    onChange={(e) => updatePhaseMeta(pi, 'description', e.target.value)}
                    className="glass-input w-full px-3 py-2 text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-dim">
                  Checkliste ({phase.steps.length} Schritte)
                </span>
                <button
                  onClick={() => addStep(pi)}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-[6px] hover:bg-surface-hover transition-all"
                  style={{ color: phase.color }}
                >
                  <Plus size={12} /> Schritt hinzufügen
                </button>
              </div>
              {phase.steps.map((step, si) => (
                <div key={si} className="flex items-center gap-2 group">
                  <GripVertical size={14} className="text-text-dim/40 shrink-0" />
                  <span className="text-[11px] text-text-dim font-mono w-5 shrink-0">#{si + 1}</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateStep(pi, si, e.target.value)}
                    placeholder="Schrittbezeichnung..."
                    className="glass-input flex-1 px-3 py-2 text-[13px]"
                  />
                  <button
                    onClick={() => removeStep(pi, si)}
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-text-dim/40 hover:text-red hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
