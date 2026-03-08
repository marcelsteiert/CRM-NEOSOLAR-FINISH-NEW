import { useState, useEffect } from 'react'
import { Clock, Save, RotateCcw, Plus, Trash2, GripVertical, ClipboardCheck } from 'lucide-react'
import {
  useSettings,
  useUpdateSettings,
  stageLabelsMap,
  type FollowUpRule,
  type ChecklistTemplate,
} from '@/hooks/useSettings'

export default function AutomationRulesSection() {
  const { data: settingsResponse, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const settings = settingsResponse?.data ?? null

  const [defaultDays, setDefaultDays] = useState(3)
  const [rules, setRules] = useState<FollowUpRule[]>([])
  const [checklist, setChecklist] = useState<ChecklistTemplate[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setDefaultDays(settings.defaultFollowUpDays)
      setRules(settings.followUpRules.map((r) => ({ ...r })))
      setChecklist(settings.checklistTemplate?.map((c) => ({ ...c })) ?? [])
    }
  }, [settings])

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
        companyAddress: settings?.companyAddress ?? 'St. Margrethen',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* error handled by mutation */ }
  }

  const handleReset = () => {
    if (settings) {
      setDefaultDays(settings.defaultFollowUpDays)
      setRules(settings.followUpRules.map((r) => ({ ...r })))
      setChecklist(settings.checklistTemplate?.map((c) => ({ ...c })) ?? [])
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
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Follow-Up Einstellungen */}
      <div className="glass-card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <Clock size={16} className="text-amber" strokeWidth={2} />
          <h3 className="text-[14px] font-bold">Follow-Up Einstellungen</h3>
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
            <span className="text-[12px] text-text-sec">Tage bis zur ersten Follow-Up Erinnerung</span>
          </div>
        </div>

        <div className="h-px bg-border mb-5" />

        {/* Per-Stage Rules */}
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
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      rule.stage === 'ERSTELLT' ? '#60A5FA'
                        : rule.stage === 'GESENDET' ? '#34D399'
                          : rule.stage === 'FOLLOW_UP' ? '#F59E0B'
                            : '#A78BFA',
                  }}
                />
                <span className="text-[13px] font-bold">{stageLabelsMap[rule.stage] ?? rule.stage}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr] gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim mb-1">Max. Tage</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={rule.maxDays}
                    onChange={(e) => updateRule(rule.stage, 'maxDays', Number(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-bg border border-border text-text focus:outline-none focus:border-amber/50 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim mb-1">Dringend ab</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={rule.urgentMaxDays}
                    onChange={(e) => updateRule(rule.stage, 'urgentMaxDays', Number(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-bg border border-border text-text focus:outline-none focus:border-amber/50 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim mb-1">Hinweis-Nachricht</label>
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

      {/* Vorbereitungs-Checkliste */}
      <div className="glass-card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck size={16} className="text-emerald-400" strokeWidth={2} />
            <h3 className="text-[14px] font-bold">Vorbereitungs-Checkliste</h3>
          </div>
          <button
            type="button"
            onClick={addChecklistItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 hover:bg-surface-hover transition-colors"
            style={{ border: '1px solid rgba(52,211,153,0.15)' }}
          >
            <Plus size={12} strokeWidth={2} />
            Punkt hinzufügen
          </button>
        </div>

        <p className="text-[11px] text-text-sec mb-4">
          Diese Checkliste wird jedem neuen Termin zugewiesen. Alle Verkäufer sehen dieselben Punkte.
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
              <span className="text-[11px] font-semibold text-text-dim w-6 text-center shrink-0">{idx + 1}.</span>
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
              Keine Checklisten-Punkte definiert. Klicke auf "Punkt hinzufügen" um zu starten.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
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
          Speichern
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
          <span className="text-[12px] text-emerald-400 font-semibold animate-pulse">Gespeichert!</span>
        )}
      </div>
    </div>
  )
}
