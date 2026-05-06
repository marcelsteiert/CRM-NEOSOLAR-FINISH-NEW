import { type ReactNode, type CSSProperties } from 'react'

type GlowVariant = 'gold' | 'electric' | 'emerald' | 'rose' | 'none'

interface Props {
  children: ReactNode
  glow?: GlowVariant
  className?: string
  style?: CSSProperties
  onClick?: () => void
  delay?: number
}

/** Premium Bento-Card mit subtle glow, layered shadows, smooth hover. */
export default function PremiumCard({ children, glow = 'none', className = '', style, onClick, delay = 0 }: Props) {
  const glowClass = glow === 'none' ? '' : `premium-card-${glow}`
  return (
    <div
      onClick={onClick}
      className={`premium-card premium-fade-up ${glowClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
    >
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
