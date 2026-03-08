import { useState, useEffect } from 'react'
import { Save, Sparkles, Brain, Globe, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAiSettings, useUpdateAiSettings, type AiSettingsData } from '@/hooks/useAdmin'

const MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'gpt-4o', label: 'GPT-4o' },
]

const LANGUAGES = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'it', label: 'Italiano' },
]

export default function AiSettingsSection() {
  const { data: aiResponse } = useAiSettings()
  const updateAi = useUpdateAiSettings()
  const [settings, setSettings] = useState<AiSettingsData | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (aiResponse?.data) setSettings({ ...aiResponse.data })
  }, [aiResponse])

  if (!settings) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const handleSave = async () => {
    await updateAi.mutateAsync(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <div className="glass-card p-5 flex items-center justify-between" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: settings.enabled ? 'color-mix(in srgb, #A78BFA 12%, transparent)' : 'rgba(255,255,255,0.04)' }}
          >
            <Sparkles size={18} strokeWidth={1.8} style={{ color: settings.enabled ? '#A78BFA' : '#94A3B8' }} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold">{settings.enabled ? 'KI aktiviert' : 'KI deaktiviert'}</h3>
            <p className="text-[11px] text-text-sec">AI Summary und Analyse-Funktionen</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
          className="transition-colors"
        >
          {settings.enabled
            ? <ToggleRight size={32} className="text-violet-400" strokeWidth={1.5} />
            : <ToggleLeft size={32} className="text-text-dim" strokeWidth={1.5} />}
        </button>
      </div>

      {/* Model & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} className="text-violet-400" strokeWidth={2} />
            <label className="text-[11px] font-semibold text-text-sec uppercase tracking-wider">Modell</label>
          </div>
          <select
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none cursor-pointer"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id} style={{ background: '#0B0F15' }}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-blue-400" strokeWidth={2} />
            <label className="text-[11px] font-semibold text-text-sec uppercase tracking-wider">Sprache</label>
          </div>
          <select
            value={settings.language}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} style={{ background: '#0B0F15' }}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Features */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-[12px] font-bold mb-3 uppercase tracking-wider text-text-sec">KI-Funktionen</h3>
        <div className="space-y-2.5">
          {[
            { key: 'leadSummary' as const, label: 'Lead-Zusammenfassung', desc: 'Automatische Zusammenfassung neuer Leads' },
            { key: 'dealAnalysis' as const, label: 'Angebots-Analyse', desc: 'Win-Probability und Empfehlungen' },
            { key: 'emailDraft' as const, label: 'E-Mail-Entwurf', desc: 'KI-generierte E-Mail-Vorschläge' },
          ].map((feat) => (
            <div key={feat.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <p className="text-[12px] font-medium text-text">{feat.label}</p>
                <p className="text-[10px] text-text-dim">{feat.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  features: { ...settings.features, [feat.key]: !settings.features[feat.key] },
                })}
              >
                {settings.features[feat.key]
                  ? <ToggleRight size={24} className="text-violet-400" strokeWidth={1.5} />
                  : <ToggleLeft size={24} className="text-text-dim" strokeWidth={1.5} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System Prompt */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <label className="block text-[11px] font-semibold text-text-sec uppercase tracking-wider mb-2">System-Prompt</label>
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-violet-400/50 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={updateAi.isPending}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[12px]">
          <Save size={14} strokeWidth={2} /> Speichern
        </button>
        {saved && <span className="text-[12px] text-emerald-400 font-semibold animate-pulse">Gespeichert!</span>}
      </div>
    </div>
  )
}
