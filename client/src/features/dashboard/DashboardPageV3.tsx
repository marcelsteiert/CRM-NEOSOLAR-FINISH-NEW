import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, DollarSign, Calendar, Trophy, Sparkles,
  ArrowUpRight, Activity, Brain, Target, Zap,
  CalendarCheck, FileText, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { useDashboardStats, useMonthlyStats } from '@/hooks/useDashboard'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import KpiWidget from '@/components/premium/KpiWidget'
import PremiumCard from '@/components/premium/PremiumCard'
import Sparkline from '@/components/premium/Sparkline'

const formatCHF = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString('de-CH')
}

export default function DashboardPageV3() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: statsRes } = useDashboardStats()
  const { data: monthRes } = useMonthlyStats(6)
  const { data: tasksRes } = useTasks()

  const stats = statsRes?.data
  const monthly = monthRes?.data ?? []
  const tasks = tasksRes?.data ?? []

  const wonSpark = useMemo(() => monthly.map(m => m.wonValue || 0), [monthly])
  const apptSpark = useMemo(() => monthly.map(m => m.totalAppointments || 0), [monthly])
  const provSpark = useMemo(() => monthly.map(m => m.provision || 0), [monthly])

  // AI Insights — heuristisch berechnet aus echten Daten
  const insights = useMemo(() => {
    if (!stats) return null
    const winRate = stats.deals.winRate || 0
    const overdueTasks = stats.tasks.overdue
    const upcoming = stats.appointments.upcoming
    const pipelineHot = stats.deals.weightedPipelineValue
    const lastWonValue = monthly[monthly.length - 1]?.wonValue ?? 0
    const prevWonValue = monthly[monthly.length - 2]?.wonValue ?? 0
    const monthOverMonth = prevWonValue > 0 ? ((lastWonValue - prevWonValue) / prevWonValue) * 100 : 0

    return {
      winRate,
      overdueTasks,
      upcoming,
      pipelineHot,
      monthOverMonth,
      // Vorhersage: einfaches Trend-basiertes Forecasting
      forecastNext: lastWonValue * (1 + monthOverMonth / 100),
    }
  }, [stats, monthly])

  const upcomingTasks = tasks
    .filter(t => t.status !== 'ERLEDIGT')
    .slice(0, 5)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 11) return 'Guten Morgen'
    if (h < 17) return 'Guten Tag'
    return 'Guten Abend'
  })()

  return (
    <div className="relative space-y-6 max-w-[1600px] mx-auto">
      {/* Ambient Glow Orbs */}
      <div className="premium-glow-orb" style={{ top: '-100px', left: '20%', width: '500px', height: '500px', background: '#D4AF37' }} />
      <div className="premium-glow-orb" style={{ bottom: '-100px', right: '10%', width: '450px', height: '450px', background: '#3B82F6' }} />

      {/* Header */}
      <div className="relative z-[1] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-white/40 mb-1">{greeting}, {user?.firstName}</p>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.025em] premium-gradient-text">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="premium-badge premium-badge-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 premium-pulse" />
            Live
          </span>
          <span className="text-[11px] text-white/40">
            {new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ═══════ BENTO GRID ═══════ */}
      <div className="premium-bento relative z-[1]">

        {/* KPI: Pipeline Value (4 cols, glow gold) */}
        <div className="col-span-12 sm:col-span-1 lg:col-span-4">
          <KpiWidget
            label="Pipeline (gewichtet)"
            value={`CHF ${formatCHF(stats?.deals.weightedPipelineValue ?? 0)}`}
            icon={<DollarSign size={16} strokeWidth={2} className="text-amber-300" />}
            iconBg="rgba(212,175,55,0.12)"
            delta={insights?.monthOverMonth}
            deltaLabel="vs. Vormonat"
            sparkline={wonSpark}
            sparklineColor="#D4AF37"
            glow="gold"
            textGradient="gold"
            delay={0}
          />
        </div>

        {/* KPI: Won Deals (4 cols, glow emerald) */}
        <div className="col-span-12 sm:col-span-1 lg:col-span-4">
          <KpiWidget
            label="Gewonnen (Monat)"
            value={stats?.deals.wonDeals ?? 0}
            icon={<Trophy size={16} strokeWidth={2} className="text-emerald-300" />}
            iconBg="rgba(16,185,129,0.12)"
            delta={insights?.winRate}
            deltaLabel={`Win-Rate ${(insights?.winRate ?? 0).toFixed(0)}%`}
            sparkline={wonSpark}
            sparklineColor="#10B981"
            glow="emerald"
            textGradient="emerald"
            delay={80}
          />
        </div>

        {/* KPI: Termine (4 cols, glow electric) */}
        <div className="col-span-12 sm:col-span-2 lg:col-span-4">
          <KpiWidget
            label="Anstehende Termine"
            value={stats?.appointments.upcoming ?? 0}
            icon={<Calendar size={16} strokeWidth={2} className="text-blue-300" />}
            iconBg="rgba(59,130,246,0.12)"
            delta={(stats?.appointments.checklistProgress ?? 0)}
            deltaLabel={`Checklisten-Fortschritt`}
            sparkline={apptSpark}
            sparklineColor="#3B82F6"
            glow="electric"
            textGradient="electric"
            delay={160}
          />
        </div>

        {/* AI INSIGHTS — Hero Card (12 cols) */}
        <div className="col-span-12">
          <PremiumCard glow="gold" delay={240} className="p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-30 pointer-events-none">
              <div className="w-full h-full" style={{ background: 'radial-gradient(circle, #D4AF37, transparent 70%)' }} />
            </div>
            <div className="flex items-start justify-between gap-4 mb-5 relative z-[1]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(59,130,246,0.15))' }}>
                  <Brain size={18} strokeWidth={2} className="text-amber-300" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-white">AI Insights</h2>
                  <p className="text-[11px] text-white/40">Echtzeit-Analyse deiner Pipeline</p>
                </div>
              </div>
              <span className="premium-badge premium-badge-gold">
                <Sparkles size={9} strokeWidth={2.5} />
                Smart
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-[1]">
              <InsightTile
                icon={<Target size={14} className="text-emerald-300" />}
                label="Win-Probability"
                value={`${(insights?.winRate ?? 0).toFixed(0)}%`}
                hint={`${stats?.deals.wonDeals ?? 0} gewonnen / ${stats?.deals.lostDeals ?? 0} verloren`}
                color="#10B981"
              />
              <InsightTile
                icon={<TrendingUp size={14} className="text-amber-300" />}
                label="Forecast naechster Monat"
                value={`CHF ${formatCHF(insights?.forecastNext ?? 0)}`}
                hint={`Trend: ${insights?.monthOverMonth?.toFixed(1)}%`}
                color="#D4AF37"
              />
              <InsightTile
                icon={<AlertCircle size={14} className="text-rose-300" />}
                label="Risk-Score"
                value={String(insights?.overdueTasks ?? 0)}
                hint={`${insights?.overdueTasks ?? 0} ueberfaellige Tasks`}
                color="#FB7185"
              />
              <InsightTile
                icon={<Zap size={14} className="text-blue-300" />}
                label="Hot Pipeline"
                value={`CHF ${formatCHF(insights?.pipelineHot ?? 0)}`}
                hint="Gewichteter Wert"
                color="#3B82F6"
              />
            </div>
          </PremiumCard>
        </div>

        {/* Activity / Tasks (8 cols) */}
        <div className="col-span-12 lg:col-span-8">
          <PremiumCard delay={320} className="p-5 sm:p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Activity size={14} strokeWidth={2} className="text-white/60" />
                </div>
                <h3 className="text-[13px] font-bold text-white">Aktive Aufgaben</h3>
              </div>
              <button onClick={() => navigate('/tasks')} className="flex items-center gap-1 text-[11px] text-white/40 hover:text-amber-300 transition-colors">
                Alle ansehen <ArrowUpRight size={11} strokeWidth={2} />
              </button>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={28} className="mx-auto text-white/20 mb-2" />
                <p className="text-[12px] text-white/40">Keine offenen Aufgaben — alles erledigt</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all premium-fade-up cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <div
                      className="w-1.5 h-10 rounded-full"
                      style={{
                        background: t.priority === 'URGENT' ? '#F87171'
                          : t.priority === 'HIGH' ? '#F59E0B'
                          : t.priority === 'MEDIUM' ? '#60A5FA'
                          : '#94A3B8',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-white truncate">{t.title}</p>
                      {t.referenceTitle && (
                        <p className="text-[10.5px] text-white/40 truncate">{t.referenceTitle}</p>
                      )}
                    </div>
                    {t.dueDate && (
                      <span className="text-[10px] text-white/40 tabular-nums whitespace-nowrap">
                        {new Date(t.dueDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PremiumCard>
        </div>

        {/* Provision Mini-Card (4 cols, glow gold) */}
        <div className="col-span-12 lg:col-span-4">
          <PremiumCard glow="gold" delay={400} className="p-5 sm:p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
                  <Trophy size={14} strokeWidth={2} className="text-amber-300" />
                </div>
                <h3 className="text-[13px] font-bold text-white">Provision Monat</h3>
              </div>
              <button onClick={() => navigate('/provision')} className="text-white/40 hover:text-amber-300">
                <ArrowUpRight size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="text-[28px] font-bold tabular-nums tracking-[-0.02em] mt-2">
              <span className="premium-gradient-text-gold">
                CHF {formatCHF(monthly[monthly.length - 1]?.provision ?? 0)}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              {monthly[monthly.length - 1]?.label ?? 'aktueller Monat'}
            </p>
            <div className="mt-auto pt-4 -mx-2 -mb-2">
              <Sparkline data={provSpark} color="#D4AF37" height={56} />
            </div>
          </PremiumCard>
        </div>

        {/* Quick-Actions (12 cols) */}
        <div className="col-span-12">
          <PremiumCard delay={480} className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Sparkles size={14} strokeWidth={2} className="text-white/60" />
              </div>
              <h3 className="text-[13px] font-bold text-white">Schnellaktionen</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction icon={<FileText size={16} />} label="Neuer Lead" onClick={() => navigate('/leads')} color="#3B82F6" />
              <QuickAction icon={<CalendarCheck size={16} />} label="Termin planen" onClick={() => navigate('/appointments')} color="#10B981" />
              <QuickAction icon={<DollarSign size={16} />} label="Angebot erstellen" onClick={() => navigate('/deals')} color="#D4AF37" />
              <QuickAction icon={<Target size={16} />} label="Kalkulation" onClick={() => navigate('/kalkulation')} color="#A78BFA" />
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  )
}

/** Insight-Tile innerhalb der AI-Insights-Card. */
function InsightTile({ icon, label, value, hint, color }: {
  icon: React.ReactNode; label: string; value: string; hint: string; color: string
}) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: `linear-gradient(180deg, ${color}10 0%, transparent 100%)`,
        border: `1px solid ${color}20`,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: color + 'CC' }}>{label}</span>
      </div>
      <div className="text-[22px] font-bold tabular-nums tracking-[-0.02em]" style={{ color }}>{value}</div>
      <p className="text-[10.5px] text-white/45 mt-1">{hint}</p>
    </div>
  )
}

function QuickAction({ icon, label, onClick, color }: {
  icon: React.ReactNode; label: string; onClick: () => void; color: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 p-4 rounded-2xl transition-all hover:translate-y-[-2px]"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, transparent 100%)`,
        border: `1px solid ${color}20`,
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <span className="text-[12.5px] font-semibold text-white/80 group-hover:text-white">{label}</span>
      <ArrowUpRight size={13} className="ml-auto text-white/30 group-hover:text-white/60" strokeWidth={2} />
    </button>
  )
}
