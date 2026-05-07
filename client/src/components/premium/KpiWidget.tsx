import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import PremiumCard from './PremiumCard'
import Sparkline from './Sparkline'

interface Props {
  label: string
  value: string | number
  icon?: ReactNode
  iconBg?: string
  delta?: number               // % change
  deltaLabel?: string          // "vs. last month"
  sparkline?: number[]
  sparklineColor?: string
  glow?: 'gold' | 'electric' | 'emerald' | 'rose' | 'none'
  textGradient?: 'default' | 'gold' | 'emerald' | 'electric'
  delay?: number
}

const formatValue = (v: string | number): string => {
  if (typeof v === 'string') return v
  return v.toLocaleString('de-CH')
}

export default function KpiWidget({
  label, value, icon, iconBg = 'rgba(255,255,255,0.04)',
  delta, deltaLabel, sparkline, sparklineColor = '#3B82F6',
  glow = 'none', textGradient = 'default', delay = 0,
}: Props) {
  const deltaUp = (delta ?? 0) >= 0
  const gradientClass = textGradient === 'default' ? 'premium-gradient-text' : `premium-gradient-text-${textGradient}`

  return (
    <PremiumCard glow={glow} delay={delay} className="p-5 sm:p-6 h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: iconBg }}
            >
              {icon}
            </div>
          )}
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-white/40">
            {label}
          </span>
        </div>
        {delta !== undefined && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
            style={{
              background: deltaUp ? 'rgba(16,185,129,0.10)' : 'rgba(251,113,133,0.10)',
              color: deltaUp ? '#6EE7B7' : '#FDA4AF',
              border: `1px solid ${deltaUp ? 'rgba(16,185,129,0.20)' : 'rgba(251,113,133,0.20)'}`,
            }}
          >
            {deltaUp ? <TrendingUp size={10} strokeWidth={2.5} /> : <TrendingDown size={10} strokeWidth={2.5} />}
            {deltaUp ? '+' : ''}{delta.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="kpi-value text-[24px] sm:text-[30px] lg:text-[34px] tabular-nums leading-tight mb-1 break-words">
        <span className={gradientClass}>{formatValue(value)}</span>
      </div>

      {deltaLabel && (
        <p className="text-[11px] text-white/35 mt-1">{deltaLabel}</p>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-4 -mx-2 -mb-2">
          <Sparkline data={sparkline} color={sparklineColor} height={48} />
        </div>
      )}
    </PremiumCard>
  )
}
