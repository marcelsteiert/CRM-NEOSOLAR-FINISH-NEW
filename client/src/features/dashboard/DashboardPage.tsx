import { useNavigate } from 'react-router-dom'
import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Calendar,
  CheckCircle2,
  ClipboardList,
  AlertCircle,
  Trophy,
  XCircle,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  CalendarCheck,
  FileText,
} from 'lucide-react'
import { useDashboardStats, useMonthlyStats } from '@/hooks/useDashboard'
import { useTasks, type Task, taskPriorityColors } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'

// ── Helpers ──

function formatCHF(value: number) {
  if (value >= 1_000_000) return `CHF ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `CHF ${(value / 1_000).toFixed(0)}K`
  return `CHF ${value.toLocaleString('de-CH')}`
}

// ── StatCard ──

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ size: number; strokeWidth: number; className?: string }>
  label: string
  value: string
  color: string
  subtitle?: string
  onClick?: () => void
}) {
  return (
    <div
      className={`glass-card p-5 group hover:border-border-focus transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ border: `1px solid color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {/* Subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
        style={{
          background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${color} 8%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative z-10 flex items-center gap-4">
        <div
          className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon size={20} strokeWidth={1.8} className="text-inherit" style={{ color }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">{label}</p>
          <p className="text-[22px] font-extrabold tabular-nums tracking-[-0.02em]" style={{ color }}>
            {value}
          </p>
          {subtitle && <p className="text-[10px] text-text-dim mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Mini Bar Chart (für Monatsstatistik) ──

function MiniBarChart({
  data,
  dataKey,
  color,
  maxVal,
}: {
  data: { label: string; [key: string]: number | string }[]
  dataKey: string
  color: string
  maxVal: number
}) {
  return (
    <div className="flex items-end gap-1.5 h-[80px]">
      {data.map((d, i) => {
        const val = d[dataKey] as number
        const h = maxVal > 0 ? Math.max((val / maxVal) * 100, 4) : 4
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold tabular-nums text-text-sec">
              {val > 0 ? val : ''}
            </span>
            <div
              className="w-full rounded-t-[4px] transition-all duration-500"
              style={{
                height: `${h}%`,
                background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))`,
                minHeight: '3px',
              }}
            />
            <span className="text-[8px] font-medium text-text-dim">{(d.label as string).slice(0, 3)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Task Row ──

function TaskRow({ task, onNavigate }: { task: Task; onNavigate: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'ERLEDIGT'

  return (
    <button
      type="button"
      onClick={onNavigate}
      className={[
        'w-full flex items-start gap-3 p-2.5 rounded-[10px] text-left',
        'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
        isOverdue ? 'bg-red-soft' : 'hover:bg-surface-hover',
      ].join(' ')}
    >
      <div
        className="w-[6px] h-[6px] rounded-full flex-shrink-0 mt-[7px]"
        style={{ background: taskPriorityColors[task.priority] }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium text-text-sec leading-snug line-clamp-1">
          {task.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {task.referenceTitle && (
            <span className="text-[10px] text-text-dim truncate">{task.referenceTitle}</span>
          )}
          {task.dueDate && (
            <span className={`text-[10px] tabular-nums ${isOverdue ? 'text-red font-semibold' : 'text-text-dim'}`}>
              {new Date(task.dueDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Main Dashboard ──

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUser = user?.id ?? ''

  const { data: statsRes } = useDashboardStats()
  const { data: monthlyRes } = useMonthlyStats()
  const { data: tasksRes } = useTasks({ assignedTo: currentUser, status: 'OFFEN', sortBy: 'dueDate', sortOrder: 'asc' })
  const { data: inProgressRes } = useTasks({ assignedTo: currentUser, status: 'IN_BEARBEITUNG', sortBy: 'dueDate', sortOrder: 'asc' })

  const stats = statsRes?.data
  const monthly = monthlyRes?.data || []
  const openTasks = tasksRes?.data || []
  const inProgressTasks = inProgressRes?.data || []
  const allMyTasks = [...inProgressTasks, ...openTasks].slice(0, 6)

  // Berechne Maximalwerte für Charts
  const maxWon = Math.max(...monthly.map((m) => m.wonValue), 1)
  const maxAppointments = Math.max(...monthly.map((m) => m.totalAppointments), 1)

  return (
    <div className="space-y-5">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Pipeline-Wert"
          value={stats ? formatCHF(stats.deals.pipelineValue) : '–'}
          color="#F59E0B"
          subtitle={stats ? `Gewichtet: ${formatCHF(stats.deals.weightedPipelineValue)}` : undefined}
          onClick={() => navigate('/deals')}
        />
        <StatCard
          icon={Trophy}
          label="Win-Rate"
          value={stats ? `${stats.deals.winRate}%` : '–'}
          color={stats && stats.deals.winRate >= 50 ? '#34D399' : '#F87171'}
          subtitle={stats ? `${stats.deals.wonDeals} gewonnen / ${stats.deals.lostDeals} verloren` : undefined}
        />
        <StatCard
          icon={CalendarCheck}
          label="Termine"
          value={stats ? String(stats.appointments.upcoming) : '–'}
          color="#60A5FA"
          subtitle={stats ? `${stats.appointments.completed} durchgeführt` : undefined}
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          icon={ClipboardList}
          label="Offene Aufgaben"
          value={stats ? String(stats.tasks.open + stats.tasks.inProgress) : '–'}
          color={stats && stats.tasks.overdue > 0 ? '#F87171' : '#A78BFA'}
          subtitle={stats && stats.tasks.overdue > 0 ? `${stats.tasks.overdue} überfällig` : undefined}
          onClick={() => navigate('/tasks')}
        />
      </div>

      {/* ── KI-Briefing + Tasks ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* KI Briefing */}
        <div className="xl:col-span-2">
          <div
            className="glass-card p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(96,165,250,0.025))',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent 5%, rgba(245,158,11,0.35) 30%, rgba(96,165,250,0.25) 70%, transparent 95%)',
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-amber" />
                <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-amber">
                  KI-Briefing
                </span>
                <span className="text-[10px] text-text-dim ml-auto">Heute</span>
              </div>
              {stats ? (
                <p className="text-[13px] text-text-sec leading-[1.7]">
                  {stats.deals.pipelineValue > 0 && (
                    <>
                      <span className="text-amber font-semibold">
                        {stats.deals.totalDeals - stats.deals.wonDeals - stats.deals.lostDeals} Angebote
                      </span>{' '}
                      in der Pipeline mit einem Gesamtwert von{' '}
                      <span className="text-amber font-semibold">{formatCHF(stats.deals.pipelineValue)}</span>.{' '}
                    </>
                  )}
                  {stats.deals.wonDeals > 0 && (
                    <>
                      <span className="text-green font-semibold">{stats.deals.wonDeals} Deal(s) gewonnen</span>
                      {' '}(Wert: {formatCHF(stats.deals.stages?.GEWONNEN?.value || 0)}).{' '}
                    </>
                  )}
                  {stats.tasks.overdue > 0 && (
                    <>
                      <span className="text-red font-semibold">{stats.tasks.overdue} Aufgabe(n) überfällig</span> – bitte priorisieren.{' '}
                    </>
                  )}
                  {stats.appointments.upcoming > 0 && (
                    <>
                      <span className="text-blue font-semibold">{stats.appointments.upcoming} Termine</span> stehen an.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-[13px] text-text-dim">Lade Daten...</p>
              )}
              {stats && (
                <div className="flex flex-wrap items-center gap-2 mt-5">
                  {stats.deals.wonDeals > 0 && (
                    <span className="px-3 py-1 rounded-full bg-green-soft text-green text-[11px] font-semibold">
                      {stats.deals.wonDeals} gewonnen
                    </span>
                  )}
                  {stats.tasks.overdue > 0 && (
                    <span className="px-3 py-1 rounded-full bg-red-soft text-red text-[11px] font-semibold">
                      {stats.tasks.overdue} überfällig
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-amber-soft text-amber text-[11px] font-semibold">
                    Win-Rate: {stats.deals.winRate}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meine Aufgaben */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-[-0.01em]">Meine Aufgaben</h3>
            <span className="text-[11px] font-semibold text-text-dim">
              {openTasks.length + inProgressTasks.length} offen
            </span>
          </div>
          <div className="space-y-1">
            {allMyTasks.length > 0 ? (
              allMyTasks.map((task) => (
                <TaskRow key={task.id} task={task} onNavigate={() => navigate('/tasks')} />
              ))
            ) : (
              <p className="text-[12px] text-text-dim py-4 text-center">Keine offenen Aufgaben</p>
            )}
          </div>
          {allMyTasks.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="w-full mt-3 text-[11px] font-semibold text-amber hover:text-amber/80 transition-colors text-center py-1.5"
            >
              Alle Aufgaben anzeigen
            </button>
          )}
        </div>
      </div>

      {/* ── Monatsstatistik ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Abschlüsse pro Monat */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-green" />
              <h3 className="text-sm font-bold tracking-[-0.01em]">Abschlüsse pro Monat</h3>
            </div>
            {monthly.length > 0 && (
              <span className="text-[11px] font-semibold text-text-dim">
                Letzte {monthly.length} Monate
              </span>
            )}
          </div>
          {monthly.length > 0 ? (
            <>
              <MiniBarChart data={monthly} dataKey="wonValue" color="#34D399" maxVal={maxWon} />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {monthly.slice(-3).map((m) => (
                  <div key={m.month} className="text-center">
                    <p className="text-[10px] font-bold uppercase text-text-dim">{m.label}</p>
                    <p className="text-[14px] font-extrabold tabular-nums text-green">{formatCHF(m.wonValue)}</p>
                    <p className="text-[10px] text-text-dim">{m.wonDeals} Deal(s)</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-text-dim py-8 text-center">Lade Daten...</p>
          )}
        </div>

        {/* Termine pro Monat */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue" />
              <h3 className="text-sm font-bold tracking-[-0.01em]">Termine pro Monat</h3>
            </div>
            {monthly.length > 0 && (
              <span className="text-[11px] font-semibold text-text-dim">
                Letzte {monthly.length} Monate
              </span>
            )}
          </div>
          {monthly.length > 0 ? (
            <>
              <MiniBarChart data={monthly} dataKey="totalAppointments" color="#60A5FA" maxVal={maxAppointments} />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {monthly.slice(-3).map((m) => (
                  <div key={m.month} className="text-center">
                    <p className="text-[10px] font-bold uppercase text-text-dim">{m.label}</p>
                    <p className="text-[14px] font-extrabold tabular-nums text-blue">{m.totalAppointments}</p>
                    <p className="text-[10px] text-text-dim">{m.completedAppointments} durchgeführt</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-text-dim py-8 text-center">Lade Daten...</p>
          )}
        </div>
      </div>

      {/* ── Provision (aktueller Monat) ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-amber" />
            <h3 className="text-sm font-bold tracking-[-0.01em]">Provision (aktueller Monat)</h3>
          </div>
          <span className="text-[11px] font-semibold text-text-dim">5% auf Abschlüsse</span>
        </div>
        {monthly.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {monthly.slice(-1).map((m) => (
              <div key={m.month} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-text-dim">{m.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-extrabold tabular-nums text-amber">
                    {formatCHF(m.provision)}
                  </span>
                  <span className="text-[11px] text-text-dim">Provision</span>
                </div>
                <div className="text-[11px] text-text-sec">
                  {m.wonDeals} Abschluss/Abschlüsse · Wert: {formatCHF(m.wonValue)}
                </div>
              </div>
            ))}
            <div className="md:col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-3">
                Monatsvergleich Provision
              </div>
              <div className="space-y-2">
                {monthly.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-text-dim w-[60px]">{m.label.slice(0, 3)}</span>
                    <div className="flex-1 h-[6px] rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max((m.provision / (Math.max(...monthly.map((x) => x.provision)) || 1)) * 100, 2)}%`,
                          background: m.provision > 0
                            ? 'linear-gradient(90deg, #F59E0B, color-mix(in srgb, #F59E0B 60%, transparent))'
                            : 'rgba(255,255,255,0.05)',
                          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums w-[70px] text-right">
                      {m.provision > 0 ? formatCHF(m.provision) : '–'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-text-dim py-4 text-center">Lade Daten...</p>
        )}
      </div>

      {/* ── Pipeline-Übersicht ── */}
      {stats && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-violet" />
              <h3 className="text-sm font-bold tracking-[-0.01em]">Pipeline-Übersicht</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/deals')}
              className="text-[11px] font-semibold text-amber hover:text-amber/80 transition-colors flex items-center gap-1"
            >
              Alle Angebote <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {(['ERSTELLT', 'GESENDET', 'FOLLOW_UP', 'VERHANDLUNG', 'GEWONNEN', 'VERLOREN'] as const).map((stage) => {
              const stageData = stats.deals.stages?.[stage]
              const colors: Record<string, string> = {
                ERSTELLT: '#94A3B8',
                GESENDET: '#60A5FA',
                FOLLOW_UP: '#F59E0B',
                VERHANDLUNG: '#A78BFA',
                GEWONNEN: '#34D399',
                VERLOREN: '#F87171',
              }
              const labels: Record<string, string> = {
                ERSTELLT: 'Erstellt',
                GESENDET: 'Gesendet',
                FOLLOW_UP: 'Follow-Up',
                VERHANDLUNG: 'Verhandlung',
                GEWONNEN: 'Gewonnen',
                VERLOREN: 'Verloren',
              }
              const color = colors[stage]
              return (
                <div
                  key={stage}
                  className="rounded-[12px] p-3 text-center"
                  style={{
                    background: `color-mix(in srgb, ${color} 6%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${color} 10%, transparent)`,
                  }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1">
                    {labels[stage]}
                  </p>
                  <p className="text-[20px] font-extrabold tabular-nums" style={{ color }}>
                    {stageData?.count || 0}
                  </p>
                  <p className="text-[10px] text-text-dim mt-0.5 tabular-nums">
                    {stageData?.value ? formatCHF(stageData.value) : '–'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
