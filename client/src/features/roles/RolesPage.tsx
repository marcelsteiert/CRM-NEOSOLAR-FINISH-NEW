import { useState, useEffect } from 'react'
import { Shield, Settings, Clock, Save, RotateCcw, ClipboardCheck, Plus, Trash2, GripVertical, MapPin, GitBranch, ChevronUp, ChevronDown, Pencil, Check, X } from 'lucide-react'
import {
  useSettings,
  useUpdateSettings,
  stageLabelsMap,
  type FollowUpRule,
  type ChecklistTemplate,
} from '@/hooks/useSettings'
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useCreateBucket,
  useUpdateBucket,
  useReorderBuckets,
} from '@/hooks/useLeads'

/* ── Pipeline Admin Section ── */

function PipelineAdmin() {
  const { data: pipelinesResponse } = usePipelines()
  const createPipeline = useCreatePipeline()
  const updatePipeline = useUpdatePipeline()
  const createBucket = useCreateBucket()
  const updateBucket = useUpdateBucket()
  const reorderBuckets = useReorderBuckets()

  const pipelines = pipelinesResponse?.data ?? []

  const [newPipelineName, setNewPipelineName] = useState('')
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [editingPipelineName, setEditingPipelineName] = useState('')
  const [newBucketName, setNewBucketName] = useState<Record<string, string>>({})
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null)
  const [editingBucketName, setEditingBucketName] = useState('')

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return
    createPipeline.mutate({ name: newPipelineName.trim() })
    setNewPipelineName('')
  }

  const handleSavePipelineName = (id: string) => {
    if (!editingPipelineName.trim()) return
    updatePipeline.mutate({ id, name: editingPipelineName.trim() })
    setEditingPipelineId(null)
  }

  const handleCreateBucket = (pipelineId: string) => {
    const name = newBucketName[pipelineId]?.trim()
    if (!name) return
    const pipeline = pipelines.find((p) => p.id === pipelineId)
    createBucket.mutate({ pipelineId, name, position: pipeline?.buckets.length ?? 0 })
    setNewBucketName((prev) => ({ ...prev, [pipelineId]: '' }))
  }

  const handleSaveBucketName = (pipelineId: string, bucketId: string) => {
    if (!editingBucketName.trim()) return
    updateBucket.mutate({ pipelineId, bucketId, name: editingBucketName.trim() })
    setEditingBucketId(null)
  }

  const handleMoveBucket = (pipelineId: string, bucketId: string, direction: 'up' | 'down') => {
    const pipeline = pipelines.find((p) => p.id === pipelineId)
    if (!pipeline) return
    const sorted = [...pipeline.buckets].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((b) => b.id === bucketId)
    if (direction === 'up' && idx > 0) {
      const ids = sorted.map((b) => b.id)
      ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
      reorderBuckets.mutate({ pipelineId, bucketIds: ids })
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const ids = sorted.map((b) => b.id)
      ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
      reorderBuckets.mutate({ pipelineId, bucketIds: ids })
    }
  }

  return (
    <div className="glass-card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <GitBranch size={16} className="text-blue-400" strokeWidth={2} />
          <h2 className="text-[14px] font-bold">Pipeline-Verwaltung</h2>
        </div>
      </div>

      {/* Neue Pipeline erstellen */}
      <div className="flex items-center gap-2 mb-5">
        <input
          type="text"
          value={newPipelineName}
          onChange={(e) => setNewPipelineName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreatePipeline()}
          placeholder="Neue Pipeline erstellen..."
          className="flex-1 px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-blue-400/50"
        />
        <button
          type="button"
          onClick={handleCreatePipeline}
          disabled={!newPipelineName.trim()}
          className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold disabled:opacity-30"
        >
          <Plus size={12} strokeWidth={2} />
          Pipeline
        </button>
      </div>

      {/* Pipelines List */}
      <div className="space-y-4">
        {pipelines.map((pipeline) => {
          const sortedBuckets = [...pipeline.buckets].sort((a, b) => a.position - b.position)
          return (
            <div
              key={pipeline.id}
              className="p-4 rounded-xl"
              style={{
                background: 'color-mix(in srgb, var(--color-surface-hover) 60%, transparent)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {/* Pipeline Header */}
              <div className="flex items-center gap-2 mb-3">
                {editingPipelineId === pipeline.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingPipelineName}
                      onChange={(e) => setEditingPipelineName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePipelineName(pipeline.id)}
                      className="flex-1 px-2.5 py-1 text-[13px] font-bold rounded-lg bg-bg border border-border text-text focus:outline-none focus:border-blue-400/50"
                      autoFocus
                    />
                    <button type="button" onClick={() => handleSavePipelineName(pipeline.id)} className="text-emerald-400 hover:text-emerald-300">
                      <Check size={14} strokeWidth={2} />
                    </button>
                    <button type="button" onClick={() => setEditingPipelineId(null)} className="text-text-dim hover:text-text">
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-[13px] font-bold flex-1">{pipeline.name}</span>
                    <button
                      type="button"
                      onClick={() => { setEditingPipelineId(pipeline.id); setEditingPipelineName(pipeline.name) }}
                      className="text-text-dim hover:text-text p-1"
                    >
                      <Pencil size={12} strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>

              {/* Buckets */}
              <div className="space-y-1.5 ml-2">
                {sortedBuckets.map((bucket, idx) => (
                  <div
                    key={bucket.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg group"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-[10px] font-bold text-text-dim w-5 text-center shrink-0">{idx + 1}</span>
                    {editingBucketId === bucket.id ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingBucketName}
                          onChange={(e) => setEditingBucketName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveBucketName(pipeline.id, bucket.id)}
                          className="flex-1 px-2 py-0.5 text-[12px] rounded bg-bg border border-border text-text focus:outline-none focus:border-blue-400/50"
                          autoFocus
                        />
                        <button type="button" onClick={() => handleSaveBucketName(pipeline.id, bucket.id)} className="text-emerald-400">
                          <Check size={12} strokeWidth={2} />
                        </button>
                        <button type="button" onClick={() => setEditingBucketId(null)} className="text-text-dim">
                          <X size={12} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[12px] text-text-sec flex-1">{bucket.name}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => { setEditingBucketId(bucket.id); setEditingBucketName(bucket.name) }}
                            className="text-text-dim hover:text-text p-0.5"
                          >
                            <Pencil size={10} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveBucket(pipeline.id, bucket.id, 'up')}
                            disabled={idx === 0}
                            className="text-text-dim hover:text-text p-0.5 disabled:opacity-20"
                          >
                            <ChevronUp size={12} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveBucket(pipeline.id, bucket.id, 'down')}
                            disabled={idx === sortedBuckets.length - 1}
                            className="text-text-dim hover:text-text p-0.5 disabled:opacity-20"
                          >
                            <ChevronDown size={12} strokeWidth={2} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Bucket */}
              <div className="flex items-center gap-2 mt-2 ml-2">
                <input
                  type="text"
                  value={newBucketName[pipeline.id] ?? ''}
                  onChange={(e) => setNewBucketName((prev) => ({ ...prev, [pipeline.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBucket(pipeline.id)}
                  placeholder="Neue Stufe..."
                  className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-bg border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-blue-400/50"
                />
                <button
                  type="button"
                  onClick={() => handleCreateBucket(pipeline.id)}
                  disabled={!(newBucketName[pipeline.id]?.trim())}
                  className="text-blue-400 hover:text-blue-300 p-1 disabled:opacity-30"
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function RolesPage() {
  const { data: settingsResponse, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const settings = settingsResponse?.data ?? null

  /* ── Local form state ── */
  const [defaultDays, setDefaultDays] = useState(3)
  const [rules, setRules] = useState<FollowUpRule[]>([])
  const [checklist, setChecklist] = useState<ChecklistTemplate[]>([])
  const [companyAddress, setCompanyAddress] = useState('St. Margrethen')
  const [saved, setSaved] = useState(false)

  /* ── Sync from server ── */
  useEffect(() => {
    if (settings) {
      setDefaultDays(settings.defaultFollowUpDays)
      setRules(settings.followUpRules.map((r) => ({ ...r })))
      setChecklist(settings.checklistTemplate?.map((c) => ({ ...c })) ?? [])
      setCompanyAddress(settings.companyAddress ?? 'St. Margrethen')
    }
  }, [settings])

  /* ── Handlers ── */
  const updateRule = (stage: string, field: keyof FollowUpRule, value: string | number) => {
    setRules((prev) =>
      prev.map((r) => (r.stage === stage ? { ...r, [field]: value } : r)),
    )
  }

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        defaultFollowUpDays: defaultDays,
        followUpRules: rules,
        checklistTemplate: checklist,
        companyAddress,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      /* error handled by mutation */
    }
  }

  const handleReset = () => {
    if (settings) {
      setDefaultDays(settings.defaultFollowUpDays)
      setRules(settings.followUpRules.map((r) => ({ ...r })))
      setChecklist(settings.checklistTemplate?.map((c) => ({ ...c })) ?? [])
      setCompanyAddress(settings.companyAddress ?? 'St. Margrethen')
    }
  }

  const addChecklistItem = () => {
    setChecklist((prev) => [...prev, { id: `c${Date.now()}`, label: '' }])
  }

  const removeChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== id))
  }

  const updateChecklistLabel = (id: string, label: string) => {
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, #A78BFA 14%, transparent), color-mix(in srgb, #A78BFA 5%, transparent))',
            }}
          >
            <Shield size={20} className="text-violet-400" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Einstellungen</h1>
            <p className="text-[12px] text-text-sec">
              Follow-Up Regeln und Systemkonfiguration
            </p>
          </div>
        </div>
      </div>

      {/* ── Follow-Up Einstellungen Card ── */}
      <div
        className="glass-card p-6"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-center gap-2.5 mb-5">
          <Settings size={16} className="text-amber" strokeWidth={2} />
          <h2 className="text-[14px] font-bold">Follow-Up Einstellungen</h2>
        </div>

        {/* Default Follow-Up Tage */}
        <div className="mb-6">
          <label className="block text-[11px] font-semibold text-text-sec mb-1.5 uppercase tracking-wider">
            Standard Follow-Up Tage (bei Angebotserstellung)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={30}
              value={defaultDays}
              onChange={(e) => setDefaultDays(Number(e.target.value) || 1)}
              className="w-20 px-3 py-2 text-[13px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50 text-center"
            />
            <span className="text-[12px] text-text-sec">
              Tage bis zur ersten Follow-Up Erinnerung
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-border mb-5" />

        {/* Per-Stage Rules */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-text-sec" strokeWidth={2} />
            <span className="text-[12px] font-semibold text-text-sec uppercase tracking-wider">
              Regeln pro Angebots-Phase
            </span>
          </div>

          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.stage}
                className="p-4 rounded-xl"
                style={{
                  background: 'color-mix(in srgb, var(--color-surface-hover) 60%, transparent)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {/* Stage label */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background:
                        rule.stage === 'ERSTELLT'
                          ? '#60A5FA'
                          : rule.stage === 'GESENDET'
                            ? '#34D399'
                            : rule.stage === 'FOLLOW_UP'
                              ? '#F59E0B'
                              : '#A78BFA',
                    }}
                  />
                  <span className="text-[13px] font-bold">
                    {stageLabelsMap[rule.stage] ?? rule.stage}
                  </span>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-text-dim mb-1">
                      Max. Tage
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={rule.maxDays}
                      onChange={(e) =>
                        updateRule(rule.stage, 'maxDays', Number(e.target.value) || 1)
                      }
                      className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-bg border border-border text-text focus:outline-none focus:border-amber/50 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-dim mb-1">
                      Dringend ab
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={rule.urgentMaxDays}
                      onChange={(e) =>
                        updateRule(rule.stage, 'urgentMaxDays', Number(e.target.value) || 1)
                      }
                      className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-bg border border-border text-text focus:outline-none focus:border-amber/50 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-dim mb-1">
                      Hinweis-Nachricht
                    </label>
                    <input
                      type="text"
                      value={rule.message}
                      onChange={(e) => updateRule(rule.stage, 'message', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-bg border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Standort Card ── */}
      <div
        className="glass-card p-6"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-center gap-2.5 mb-5">
          <MapPin size={16} className="text-blue-400" strokeWidth={2} />
          <h2 className="text-[14px] font-bold">Firmenstandort</h2>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-sec mb-1.5 uppercase tracking-wider">
            Standort fuer Fahrzeit-Berechnung
          </label>
          <input
            type="text"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            className="w-full max-w-xs px-3 py-2 text-[13px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-blue-400/50"
            placeholder="z.B. St. Margrethen"
          />
          <p className="text-[11px] text-text-dim mt-1.5">
            Wird als Ausgangspunkt fuer die Fahrzeit-Kalkulation zu Terminen verwendet.
          </p>
        </div>
      </div>

      {/* ── Pipeline Admin ── */}
      <PipelineAdmin />

      {/* ── Checkliste Card ── */}
      <div
        className="glass-card p-6"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck size={16} className="text-emerald-400" strokeWidth={2} />
            <h2 className="text-[14px] font-bold">Vorbereitungs-Checkliste</h2>
          </div>
          <button
            type="button"
            onClick={addChecklistItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 hover:bg-surface-hover transition-colors"
            style={{ border: '1px solid rgba(52,211,153,0.15)' }}
          >
            <Plus size={12} strokeWidth={2} />
            Punkt hinzufuegen
          </button>
        </div>

        <p className="text-[11px] text-text-sec mb-4">
          Diese Checkliste wird jedem neuen Termin zugewiesen. Alle Verkaeuer sehen dieselben Punkte.
        </p>

        <div className="space-y-2">
          {checklist.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2.5 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--color-surface-hover) 60%, transparent)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <GripVertical size={14} className="text-text-dim shrink-0" />
              <span className="text-[11px] font-semibold text-text-dim w-6 text-center shrink-0">
                {idx + 1}.
              </span>
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateChecklistLabel(item.id, e.target.value)}
                placeholder="Checklisten-Punkt beschreiben..."
                className="flex-1 px-2.5 py-1.5 text-[12px] rounded-lg bg-bg border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-emerald-400/50"
              />
              <button
                type="button"
                onClick={() => removeChecklistItem(item.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-colors shrink-0"
              >
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
            </div>
          ))}
          {checklist.length === 0 && (
            <p className="text-[12px] text-text-dim text-center py-4">
              Keine Checklisten-Punkte definiert. Klicke auf "Punkt hinzufuegen" um zu starten.
            </p>
          )}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[12px]"
        >
          {updateSettings.isPending ? (
            <div className="w-3.5 h-3.5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={14} strokeWidth={2} />
          )}
          Einstellungen speichern
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold"
        >
          <RotateCcw size={13} strokeWidth={2} />
          Zurücksetzen
        </button>
        {saved && (
          <span className="text-[12px] text-emerald-400 font-semibold animate-pulse">
            Gespeichert!
          </span>
        )}
      </div>
    </div>
  )
}
