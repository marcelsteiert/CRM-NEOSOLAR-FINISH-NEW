import type { LucideIcon } from 'lucide-react'

interface PlaceholderScreenProps {
  icon: LucideIcon
  title: string
  description?: string
  color?: string
}

export default function PlaceholderScreen({
  icon: Icon,
  title,
  description = 'Wird als nächstes implementiert',
  color = 'var(--color-amber)',
}: PlaceholderScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
      <div className="glass-card p-14 text-center max-w-sm" style={{ borderRadius: 'var(--radius-xl)' }}>
        {/* Gradient icon box */}
        <div
          className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center mx-auto mb-6"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, transparent), color-mix(in srgb, ${color} 4%, transparent))`,
            border: `1px solid color-mix(in srgb, ${color} 10%, transparent)`,
          }}
        >
          <Icon size={30} style={{ color }} strokeWidth={1.6} />
        </div>
        <h2 className="text-lg font-bold tracking-[-0.02em] mb-2">{title}</h2>
        <p className="text-text-sec text-sm leading-relaxed">{description}</p>
        <div className="mt-6 h-px w-16 mx-auto bg-border" />
        <p className="text-text-dim text-[11px] mt-4 font-medium tracking-wide uppercase">Modul in Planung</p>
      </div>
    </div>
  )
}
