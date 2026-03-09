import { useState, useEffect } from 'react'
import { Save, Sparkles, Brain, Globe, ToggleLeft, ToggleRight, Key, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { useAiSettings, useUpdateAiSettings, type AiSettingsData } from '@/hooks/useAdmin'
import { useTestAiConnection } from '@/hooks/useAi'

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
  const testConnection = useTestAiConnection()
  const [settings, setSettings] = useState<AiSettingsData | null>(null)
  const [saved, setSaved] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (aiResponse?.data) {
      setSettings({ ...aiResponse.data })
      setApiKeyInput(aiResponse.data.apiKey || '')
    }
  }, [aiResponse])

  if (!settings) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const handleSave = async () => {
    const payload: any = { ...settings }
    // Nur den API-Key senden wenn er geaendert wurde (nicht maskiert)
    if (apiKeyInput && !apiKeyInput.startsWith('****')) {
      payload.apiKey = apiKeyInput
    } else {
      delete payload.apiKey
    }
    await updateAi.mutateAsync(payload)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleTest = async () => {
    setTestResult(null)
    const result = await testConnection.mutateAsync()
    setTestResult(result?.data || { success: false, message: 'Keine Antwort' })
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

      {/* API Key */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} className="text-amber-500" strokeWidth={2} />
          <label className="text-[11px] font-semibold text-text-sec uppercase tracking-wider">API-Schluessel</label>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="flex-1 px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testConnection.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all"
            style={{
              background: 'rgba(245,158,11,0.12)',
              color: '#F59E0B',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <Zap size={12} className={testConnection.isPending ? 'animate-pulse' : ''} />
            {testConnection.isPending ? 'Teste...' : 'Testen'}
          </button>
        </div>
        {testResult && (
          <div className={`flex items-center gap-1.5 mt-2 text-[11px] ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
            {testResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {testResult.message}
          </div>
        )}
        <p className="text-[9px] text-text-dim mt-2">
          Anthropic API Key fuer Claude-Modelle. Wird verschluesselt gespeichert und nie im Frontend angezeigt.
        </p>
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
            { key: 'emailDraft' as const, label: 'E-Mail-Entwurf', desc: 'KI-generierte E-Mail-Vorschlaege' },
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
