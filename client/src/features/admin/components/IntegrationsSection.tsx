import { useState } from 'react'
import { Mail, Phone, Video, Receipt, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useIntegrations, useUpdateIntegration } from '@/hooks/useAdmin'

const iconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  mail: Mail, phone: Phone, video: Video, receipt: Receipt,
}

const statusLabels: Record<string, { label: string; color: string }> = {
  CONNECTED: { label: 'Verbunden', color: '#34D399' },
  DISCONNECTED: { label: 'Nicht verbunden', color: '#94A3B8' },
  ERROR: { label: 'Fehler', color: '#F87171' },
}

export default function IntegrationsSection() {
  const { data: intResponse } = useIntegrations()
  const integrations = intResponse?.data ?? []
  const updateIntegration = useUpdateIntegration()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleConnect = (id: string) => {
    if (!apiKeyInput.trim()) return
    updateIntegration.mutate({ id, apiKey: apiKeyInput.trim() })
    setEditingId(null)
    setApiKeyInput('')
  }

  const handleDisconnect = (id: string) => {
    updateIntegration.mutate({ id, apiKey: '', status: 'DISCONNECTED' })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {integrations.map((int) => {
        const Icon = iconMap[int.icon] ?? Mail
        const status = statusLabels[int.status] ?? statusLabels.DISCONNECTED
        const isEditing = editingId === int.id

        return (
          <div key={int.id} className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${status.color} 12%, transparent)` }}
              >
                <Icon size={18} strokeWidth={1.8} style={{ color: status.color }} />
              </div>
              <div className="flex-1">
                <h4 className="text-[13px] font-bold">{int.displayName}</h4>
                <p className="text-[11px] text-text-sec mt-0.5">{int.description}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: status.color }} />
              <span className="text-[11px] font-semibold" style={{ color: status.color }}>{status.label}</span>
              {int.lastSyncAt && (
                <span className="text-[10px] text-text-dim ml-auto">
                  Letzter Sync: {new Date(int.lastSyncAt).toLocaleDateString('de-CH')}
                </span>
              )}
            </div>

            {/* API Key */}
            {isEditing ? (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect(int.id)}
                    placeholder="API-Key eingeben..."
                    className="w-full px-3 py-2 pr-9 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim">
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleConnect(int.id)} disabled={!apiKeyInput.trim()}
                    className="btn-primary px-3 py-1.5 text-[11px] disabled:opacity-30">Verbinden</button>
                  <button type="button" onClick={() => { setEditingId(null); setApiKeyInput('') }}
                    className="btn-secondary px-3 py-1.5 text-[11px] font-semibold">Abbrechen</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {int.status === 'CONNECTED' ? (
                  <>
                    <span className="text-[11px] text-text-dim">API-Key: {int.apiKey}</span>
                    <button type="button" onClick={() => handleDisconnect(int.id)}
                      className="ml-auto text-[11px] font-semibold text-red hover:opacity-80 transition-opacity">Trennen</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setEditingId(int.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber hover:bg-surface-hover transition-colors"
                    style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
                    <RefreshCw size={12} strokeWidth={2} /> Verbinden
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
