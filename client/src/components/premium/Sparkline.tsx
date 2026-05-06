interface Props {
  data: number[]
  color?: string
  height?: number
  fill?: boolean
}

/** Inline-SVG Sparkline — keine Library nötig. */
export default function Sparkline({ data, color = '#3B82F6', height = 40, fill = true }: Props) {
  if (data.length < 2) return <div style={{ height }} />

  const w = 100
  const h = 100
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = w / (data.length - 1)

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: h - ((v - min) / range) * (h - 10) - 5,
  }))

  const path = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx1 = prev.x + stepX / 2
    const cx2 = p.x - stepX / 2
    return `${acc} C ${cx1} ${prev.y}, ${cx2} ${p.y}, ${p.x} ${p.y}`
  }, '')

  const fillPath = `${path} L ${w} ${h} L 0 ${h} Z`
  const id = `spark-grad-${color.replace('#', '')}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill={`url(#${id})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* End-dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={1.8}
        fill={color}
      />
    </svg>
  )
}
