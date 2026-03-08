import { useState, useEffect } from 'react'
import { Save, RotateCcw, Plus, Trash2, MapPin, Star } from 'lucide-react'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'

interface CompanyLocation {
  id: string
  name: string
  address: string
  isPrimary: boolean
}

export default function CompanyLocationsSection() {
  const { data: settingsResponse, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const settings = settingsResponse?.data ?? null

  const [locations, setLocations] = useState<CompanyLocation[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      // If we have the old companyAddress, convert to location array
      const addr = settings.companyAddress ?? 'St. Margrethen'
      setLocations([
        { id: 'loc-1', name: 'Hauptsitz', address: addr, isPrimary: true },
      ])
    }
  }, [settings])

  const addLocation = () => {
    setLocations((prev) => [
      ...prev,
      { id: `loc-${Date.now()}`, name: '', address: '', isPrimary: false },
    ])
  }

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id))
  }

  const updateLocation = (id: string, field: keyof CompanyLocation, value: string | boolean) => {
    setLocations((prev) =>
      prev.map((l) => {
        if (l.id === id) return { ...l, [field]: value }
        if (field === 'isPrimary' && value === true) return { ...l, isPrimary: false }
        return l
      }),
    )
  }

  const handleSave = async () => {
    const primary = locations.find((l) => l.isPrimary)
    try {
      await updateSettings.mutateAsync({
        companyAddress: primary?.address ?? locations[0]?.address ?? 'St. Margrethen',
        defaultFollowUpDays: settings?.defaultFollowUpDays ?? 3,
        followUpRules: settings?.followUpRules ?? [],
        checklistTemplate: settings?.checklistTemplate ?? [],
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* error handled by mutation */ }
  }

  const handleReset = () => {
    if (settings) {
      const addr = settings.companyAddress ?? 'St. Margrethen'
      setLocations([{ id: 'loc-1', name: 'Hauptsitz', address: addr, isPrimary: true }])
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-sec">
          Der Primär-Standort wird als Ausgangspunkt für die Fahrzeit-Kalkulation zu Terminen verwendet.
        </p>
        <button
          type="button"
          onClick={addLocation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-blue-400 hover:bg-surface-hover transition-colors"
          style={{ border: '1px solid rgba(96,165,250,0.15)' }}
        >
          <Plus size={12} strokeWidth={2} />
          Standort hinzufügen
        </button>
      </div>

      <div className="space-y-3">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="glass-card p-4"
            style={
              loc.isPrimary
                ? { border: '1px solid color-mix(in srgb, #60A5FA 20%, transparent)' }
                : undefined
            }
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: loc.isPrimary
                    ? 'color-mix(in srgb, #60A5FA 12%, transparent)'
                    : 'color-mix(in srgb, var(--color-surface-hover) 80%, transparent)',
                }}
              >
                <MapPin size={16} strokeWidth={1.8} style={{ color: loc.isPrimary ? '#60A5FA' : undefined }} className={loc.isPrimary ? '' : 'text-text-dim'} />
              </div>

              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-text-dim mb-1">Name</label>
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => updateLocation(loc.id, 'name', e.target.value)}
                      placeholder="z.B. Hauptsitz"
                      className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-blue-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-dim mb-1">Adresse</label>
                    <input
                      type="text"
                      value={loc.address}
                      onChange={(e) => updateLocation(loc.id, 'address', e.target.value)}
                      placeholder="z.B. St. Margrethen"
                      className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-blue-400/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => updateLocation(loc.id, 'isPrimary', true)}
                  title={loc.isPrimary ? 'Primär-Standort' : 'Als Primär setzen'}
                  className={[
                    'p-1.5 rounded-lg transition-colors',
                    loc.isPrimary ? 'text-amber' : 'text-text-dim hover:text-amber hover:bg-surface-hover',
                  ].join(' ')}
                >
                  <Star size={14} strokeWidth={2} fill={loc.isPrimary ? 'currentColor' : 'none'} />
                </button>
                {!loc.isPrimary && (
                  <button
                    type="button"
                    onClick={() => removeLocation(loc.id)}
                    className="p-1.5 rounded-lg text-text-dim hover:text-red hover:bg-surface-hover transition-colors"
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
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
