import { useState, useEffect } from 'react'
import { Save, Building2 } from 'lucide-react'
import { useBranding, useUpdateBranding, type BrandingSettings } from '@/hooks/useAdmin'

const TEMPLATES = [
  { id: 'standard', label: 'Standard', desc: 'Klassisches Layout mit Logo oben' },
  { id: 'premium', label: 'Premium', desc: 'Modernes Layout mit Seitenleiste' },
  { id: 'minimal', label: 'Minimal', desc: 'Schlichtes Design ohne Bilder' },
]

export default function CompanyBrandingSection() {
  const { data: brandingResponse } = useBranding()
  const updateBranding = useUpdateBranding()
  const [form, setForm] = useState<BrandingSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (brandingResponse?.data) setForm({ ...brandingResponse.data })
  }, [brandingResponse])

  if (!form) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const handleSave = async () => {
    await updateBranding.mutateAsync(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div className="glass-card p-6" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${form.primaryColor}, color-mix(in srgb, ${form.primaryColor} 70%, #F97316))`, boxShadow: `0 0 28px ${form.primaryColor}30` }}
          >
            <Building2 size={24} className="text-bg" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-[18px] font-extrabold" style={{ color: form.primaryColor }}>{form.companyName}</h3>
            <p className="text-[12px] text-text-sec">{form.companySlogan}</p>
          </div>
        </div>
        <p className="text-[10px] text-text-dim">{form.footerText}</p>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Firmenname</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
          />
        </div>
        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Slogan</label>
          <input
            type="text"
            value={form.companySlogan}
            onChange={(e) => setForm({ ...form, companySlogan: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
          />
        </div>
      </div>

      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Logo URL</label>
        <input
          type="text"
          value={form.logoUrl ?? ''}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value || null })}
          placeholder="https://example.com/logo.png"
          className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
        />
      </div>

      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <label className="block text-[10px] font-semibold text-text-dim mb-1 uppercase tracking-wider">Fusszeile</label>
        <input
          type="text"
          value={form.footerText}
          onChange={(e) => setForm({ ...form, footerText: e.target.value })}
          className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
        />
      </div>

      {/* Offer Template */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <label className="block text-[10px] font-semibold text-text-dim mb-3 uppercase tracking-wider">Angebotsvorlage</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setForm({ ...form, offerTemplate: t.id })}
              className={[
                'p-3 rounded-xl text-left transition-all',
                form.offerTemplate === t.id ? 'ring-1' : 'hover:bg-surface-hover',
              ].join(' ')}
              style={{
                background: form.offerTemplate === t.id ? 'color-mix(in srgb, #F59E0B 8%, transparent)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${form.offerTemplate === t.id ? 'color-mix(in srgb, #F59E0B 25%, transparent)' : 'rgba(255,255,255,0.04)'}`,
                ringColor: '#F59E0B',
              }}
            >
              <p className="text-[12px] font-bold text-text">{t.label}</p>
              <p className="text-[10px] text-text-dim mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={updateBranding.isPending}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[12px]">
          <Save size={14} strokeWidth={2} /> Speichern
        </button>
        {saved && <span className="text-[12px] text-emerald-400 font-semibold animate-pulse">Gespeichert!</span>}
      </div>
    </div>
  )
}
