import { type ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  iconColor?: string
  iconBg?: string
  title: string
  subtitle?: string
  count?: number
  countColor?: string
  badge?: ReactNode
  actions?: ReactNode
  /** Extra header elements (e.g. tab bar) below the main row */
  extra?: ReactNode
  /** Show ambient glow orb behind the header */
  glow?: boolean
}

/** Premium-Page-Header mit gradient title + optional badge + ambient glow */
export default function PageHeader({
  icon, iconColor = '#D4AF37', iconBg,
  title, subtitle, count, countColor,
  badge, actions, extra, glow = true,
}: Props) {
  const finalIconBg = iconBg ?? `linear-gradient(135deg, ${iconColor}25, ${iconColor}08)`

  return (
    <div className="relative">
      {glow && (
        <div
          className="premium-glow-orb"
          style={{
            top: '-50px',
            left: '0',
            width: '320px',
            height: '320px',
            background: iconColor,
            opacity: 0.15,
          }}
        />
      )}

      <div className="relative z-[1] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {icon && (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: finalIconBg,
                border: `1px solid ${iconColor}30`,
                boxShadow: `0 4px 20px -4px ${iconColor}30, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.025em] premium-gradient-text leading-tight">
                {title}
              </h1>
              {count !== undefined && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tabular-nums"
                  style={{
                    background: `${countColor ?? iconColor}18`,
                    color: countColor ?? iconColor,
                    border: `1px solid ${countColor ?? iconColor}25`,
                  }}
                >
                  {count.toLocaleString('de-CH')}
                </span>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-[12px] text-white/40 mt-1 hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {extra && <div className="relative z-[1] mt-4">{extra}</div>}
    </div>
  )
}
