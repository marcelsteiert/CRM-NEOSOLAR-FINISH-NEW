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
  color = '#F59E0B',
}: PlaceholderScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
      <div className="glass-card p-12 text-center max-w-md" style={{ borderRadius: '24px' }}>
        {/* Gradient icon box */}
        <div
          className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-5"
          style={{
            background: `linear-gradient(135deg, ${color}20, ${color}08)`,
            border: `1px solid ${color}15`,
          }}
        >
          <Icon size={28} style={{ color }} />
        </div>
        <h2 className="text-xl font-bold tracking-[-0.02em] mb-2">{title}</h2>
        <p className="text-text-sec text-sm">{description}</p>
      </div>
    </div>
  )
}
