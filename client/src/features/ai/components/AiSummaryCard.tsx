import { useState } from 'react'
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface AiSummaryCardProps {
  summary: string | null | undefined
  isGenerating: boolean
  onGenerate: () => void
  error?: string | null
  compact?: boolean
}

export default function AiSummaryCard({ summary, isGenerating, onGenerate, error, compact }: AiSummaryCardProps) {
  const [expanded, setExpanded] = useState(!compact)

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(59,130,246,0.04))',
        border: '1px solid rgba(245,158,11,0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: compact ? '12px 14px' : '16px 18px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'rgba(245,158,11,0.15)',
            }}
          >
            <Sparkles size={13} className="text-amber-500" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500/80">
            KI-Zusammenfassung
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all"
            style={{
              background: isGenerating ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.15)',
              color: 'rgb(245,158,11)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <RefreshCw size={10} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Generiert...' : summary ? 'Aktualisieren' : 'Generieren'}
          </button>
          {summary && compact && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-white/30 hover:text-white/60 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {error && (
        <p className="text-[11px] text-red-400/80 mt-1">{error}</p>
      )}

      {summary && expanded && (
        <p className="text-[11px] text-white/70 leading-relaxed mt-1 whitespace-pre-line">
          {summary}
        </p>
      )}

      {!summary && !isGenerating && !error && (
        <p className="text-[10px] text-white/30 italic mt-1">
          Noch keine KI-Zusammenfassung. Klicke auf "Generieren" fuer eine automatische Analyse.
        </p>
      )}

      {isGenerating && !summary && (
        <div className="flex items-center gap-2 mt-2">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full animate-pulse"
              style={{ width: '60%', background: 'linear-gradient(90deg, rgba(245,158,11,0.3), rgba(245,158,11,0.1))' }}
            />
          </div>
          <span className="text-[9px] text-white/30 whitespace-nowrap">Analysiert...</span>
        </div>
      )}
    </div>
  )
}
