import { useState, useEffect } from 'react'
import { Save, Mail, Bell } from 'lucide-react'
import { useNotificationSettings, useUpdateNotificationSettings, type NotificationSetting } from '@/hooks/useAdmin'

export default function NotificationSettingsSection() {
  const { data: nsResponse } = useNotificationSettings()
  const updateNS = useUpdateNotificationSettings()
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (nsResponse?.data) setSettings(nsResponse.data.map((s) => ({ ...s })))
  }, [nsResponse])

  const toggleEnabled = (event: string) => {
    setSettings((prev) => prev.map((s) => s.event === event ? { ...s, enabled: !s.enabled } : s))
  }

  const toggleChannel = (event: string, channel: 'IN_APP' | 'EMAIL') => {
    setSettings((prev) => prev.map((s) => {
      if (s.event !== event) return s
      const has = s.channels.includes(channel)
      return { ...s, channels: has ? s.channels.filter((c) => c !== channel) : [...s.channels, channel] }
    }))
  }

  const handleSave = async () => {
    await updateNS.mutateAsync(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Ereignis', 'Aktiv', 'In-App', 'E-Mail', 'Erinnerung (Min.)'].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.event} className="border-b border-border">
                <td className="px-5 py-3">
                  <span className="text-[12px] font-medium text-text">{s.label}</span>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(s.event)}
                    className={[
                      'w-9 h-5 rounded-full transition-colors relative',
                      s.enabled ? 'bg-emerald-400' : 'bg-surface-hover',
                    ].join(' ')}
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: s.enabled ? '18px' : '2px' }}
                    />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => toggleChannel(s.event, 'IN_APP')}
                    className={[
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      s.channels.includes('IN_APP') ? 'text-amber' : 'text-text-dim',
                    ].join(' ')}
                    style={s.channels.includes('IN_APP') ? { background: 'color-mix(in srgb, #F59E0B 12%, transparent)' } : {}}
                  >
                    <Bell size={14} strokeWidth={2} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => toggleChannel(s.event, 'EMAIL')}
                    className={[
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      s.channels.includes('EMAIL') ? 'text-blue-400' : 'text-text-dim',
                    ].join(' ')}
                    style={s.channels.includes('EMAIL') ? { background: 'color-mix(in srgb, #60A5FA 12%, transparent)' } : {}}
                  >
                    <Mail size={14} strokeWidth={2} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  {s.reminderMinutes !== null ? (
                    <input
                      type="number"
                      value={s.reminderMinutes}
                      onChange={(e) => setSettings((prev) => prev.map((x) =>
                        x.event === s.event ? { ...x, reminderMinutes: Number(e.target.value) || 0 } : x
                      ))}
                      className="w-16 px-2 py-1 text-[11px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none text-center"
                    />
                  ) : (
                    <span className="text-[11px] text-text-dim">{'\u2014'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={updateNS.isPending}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[12px]">
          <Save size={14} strokeWidth={2} /> Speichern
        </button>
        {saved && <span className="text-[12px] text-emerald-400 font-semibold animate-pulse">Gespeichert!</span>}
      </div>
    </div>
  )
}
