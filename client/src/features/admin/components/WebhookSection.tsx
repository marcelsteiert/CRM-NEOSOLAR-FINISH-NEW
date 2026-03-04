import { useState } from 'react'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import { useWebhooks, useCreateWebhook, useDeleteWebhook } from '@/hooks/useAdmin'

const sourceTypeLabels: Record<string, { label: string; color: string }> = {
  HOMEPAGE: { label: 'Homepage', color: '#60A5FA' },
  LANDINGPAGE: { label: 'Landingpage', color: '#34D399' },
  PARTNER: { label: 'Partner', color: '#F59E0B' },
  CUSTOM: { label: 'Benutzerdefiniert', color: '#A78BFA' },
}

export default function WebhookSection() {
  const { data: whResponse } = useWebhooks()
  const webhooks = whResponse?.data ?? []
  const createWebhook = useCreateWebhook()
  const deleteWebhook = useDeleteWebhook()

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('HOMEPAGE')
  const [copied, setCopied] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    createWebhook.mutate({ name: newName.trim(), sourceType: newType })
    setNewName('')
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Neuen Webhook erstellen..."
            className="flex-1 px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="px-3 py-2 text-[11px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none cursor-pointer"
          >
            {Object.entries(sourceTypeLabels).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#0B0F15' }}>{v.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold disabled:opacity-30"
          >
            <Plus size={12} strokeWidth={2} /> Webhook
          </button>
        </div>
      </div>

      {/* Webhook Cards */}
      <div className="space-y-3">
        {webhooks.map((wh) => {
          const st = sourceTypeLabels[wh.sourceType] ?? sourceTypeLabels.CUSTOM
          return (
            <div key={wh.id} className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: `color-mix(in srgb, ${st.color} 12%, transparent)`, color: st.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                    {st.label}
                  </span>
                  <span className="text-[13px] font-bold">{wh.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${wh.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`}
                    title={wh.isActive ? 'Aktiv' : 'Inaktiv'}
                  />
                  <button
                    type="button"
                    onClick={() => deleteWebhook.mutate(wh.id)}
                    className="text-text-dim hover:text-red p-1 transition-colors"
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {/* Endpoint URL */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-text-dim w-16 shrink-0">Endpoint</span>
                  <code className="flex-1 text-[11px] text-text-sec font-mono bg-bg px-2.5 py-1 rounded">{wh.endpointUrl}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(wh.endpointUrl, `url-${wh.id}`)}
                    className="text-text-dim hover:text-text p-1"
                  >
                    {copied === `url-${wh.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
                {/* Secret */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-text-dim w-16 shrink-0">Secret</span>
                  <code className="flex-1 text-[11px] text-text-sec font-mono bg-bg px-2.5 py-1 rounded">{wh.secret}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(wh.secret, `sec-${wh.id}`)}
                    className="text-text-dim hover:text-text p-1"
                  >
                    {copied === `sec-${wh.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 text-[10px] text-text-dim">
                <span>Empfangen: <strong className="text-text-sec">{wh.receivedCount}</strong></span>
                {wh.lastReceivedAt && (
                  <span>Letzter: <strong className="text-text-sec">{new Date(wh.lastReceivedAt).toLocaleDateString('de-CH')}</strong></span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
