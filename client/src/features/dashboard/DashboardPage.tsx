import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
} from 'lucide-react'

// ── Design token colors as CSS vars for consistency ──
const colors = {
  blue: 'var(--color-blue)',
  amber: 'var(--color-amber)',
  green: 'var(--color-green)',
  red: 'var(--color-red)',
  violet: 'var(--color-violet)',
  cyan: 'var(--color-cyan)',
} as const

// ── Mock data ──

const kpis = [
  {
    id: 'leads',
    label: 'Neue Leads',
    value: '47',
    trend: '+12.5%',
    up: true,
    color: colors.blue,
    rawColor: '#60A5FA',
    icon: Users,
    path: 'M0,32 C20,28 40,22 60,20 C80,18 100,12 120,14 C140,16 160,10 180,6 L200,4',
  },
  {
    id: 'pipeline',
    label: 'Pipeline-Wert',
    value: 'CHF 2.4M',
    trend: '+8.3%',
    up: true,
    color: colors.amber,
    rawColor: '#F59E0B',
    icon: TrendingUp,
    path: 'M0,30 C20,26 40,24 60,18 C80,14 100,16 120,12 C140,10 160,8 180,6 L200,2',
  },
  {
    id: 'quote',
    label: 'Abschlussquote',
    value: '34.2%',
    trend: '+2.1%',
    up: true,
    color: colors.green,
    rawColor: '#34D399',
    icon: Target,
    path: 'M0,28 C20,30 40,26 60,22 C80,20 100,24 120,18 C140,14 160,16 180,10 L200,6',
  },
  {
    id: 'revenue',
    label: 'Umsatz Monat',
    value: 'CHF 847K',
    trend: '-3.2%',
    up: false,
    color: colors.violet,
    rawColor: '#A78BFA',
    icon: DollarSign,
    path: 'M0,12 C20,14 40,18 60,16 C80,20 100,22 120,18 C140,24 160,26 180,22 L200,28',
  },
]

const tasks = [
  { text: 'Rückruf Hr. Müller – Offerte besprechen', type: 'call' as const, overdue: true },
  { text: 'Nachfass-Mail Fam. Weber senden', type: 'email' as const, overdue: false },
  { text: 'Vor-Ort-Termin Zürich – 14:30', type: 'meeting' as const, overdue: false },
  { text: 'Kalkulation Projekt Bern aktualisieren', type: 'call' as const, overdue: false },
  { text: 'Follow-up Solar Aarau – Entscheid', type: 'email' as const, overdue: false, done: true },
]

const activities = [
  { icon: Phone, text: 'Anruf mit Hr. Schneider – 12 Min.', time: 'vor 23 Min.', rawColor: '#F59E0B' },
  { icon: Mail, text: 'Offerte an Fam. Weber gesendet', time: 'vor 1 Std.', rawColor: '#60A5FA' },
  { icon: Target, text: 'Deal "Solar Winterthur" gewonnen', time: 'vor 2 Std.', rawColor: '#34D399' },
  { icon: Calendar, text: 'Termin mit Hr. Brunner geplant', time: 'vor 3 Std.', rawColor: '#A78BFA' },
  { icon: CheckCircle2, text: 'Auftrag Bern abgeschlossen', time: 'vor 4 Std.', rawColor: '#22D3EE' },
]

const taskTypeColors: Record<string, string> = {
  call: '#F59E0B',
  email: '#60A5FA',
  meeting: '#A78BFA',
}

const leadSources = [
  { name: 'Homepage', value: 38, rawColor: '#60A5FA' },
  { name: 'Empfehlung', value: 27, rawColor: '#34D399' },
  { name: 'Landingpage', value: 20, rawColor: '#F59E0B' },
  { name: 'Messe', value: 10, rawColor: '#A78BFA' },
  { name: 'Kaltakquise', value: 5, rawColor: '#22D3EE' },
]

// ── Sparkline SVG component ──

function Sparkline({ path, color, id }: { path: string; color: string; id: string }) {
  return (
    <svg className="w-full h-10 mt-3" viewBox="0 0 200 36" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkline-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} V36 H0 Z`} fill={`url(#sparkline-${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* End dot */}
      <circle
        cx={path.split('L')[1]?.split(',')[0] || '200'}
        cy={path.split('L')[1]?.split(',')[1] || '4'}
        r="2.5"
        fill={color}
      />
    </svg>
  )
}

// ── Main Dashboard ──

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="glass-card p-5 group hover:border-border-focus transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            {/* Subtle glow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${kpi.rawColor} 8%, transparent), transparent 70%)`,
              }}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                {/* Icon */}
                <div
                  className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
                  style={{ background: `color-mix(in srgb, ${kpi.rawColor} 12%, transparent)` }}
                >
                  <kpi.icon size={18} style={{ color: kpi.rawColor }} />
                </div>
                {/* Trend badge */}
                <div
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background: kpi.up
                      ? 'var(--color-green-soft)'
                      : 'var(--color-red-soft)',
                    color: kpi.up ? 'var(--color-green)' : 'var(--color-red)',
                  }}
                >
                  {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.trend}
                </div>
              </div>
              <div className="text-[28px] font-extrabold tracking-[-0.03em] tabular-nums">{kpi.value}</div>
              <div className="text-xs font-medium text-text-sec mt-1">{kpi.label}</div>
              <Sparkline path={kpi.path} color={kpi.rawColor} id={kpi.id} />
            </div>
          </div>
        ))}
      </div>

      {/* ── KI Briefing + Tasks ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* KI Briefing */}
        <div className="xl:col-span-2">
          <div
            className="glass-card p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(96,165,250,0.025))',
            }}
          >
            {/* Top highlight line */}
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
                <span className="text-[10px] text-text-dim ml-auto">Aktualisiert vor 5 Min.</span>
              </div>
              <p className="text-[13px] text-text-sec leading-[1.7]">
                <span className="text-amber font-semibold">3 Deals</span> stehen kurz vor dem Abschluss
                (Gesamtwert CHF 284K). <span className="text-red font-semibold">2 Leads</span> zeigen
                Inaktivität seit &gt; 7 Tagen – Wiedervorlage empfohlen.{' '}
                <span className="text-green font-semibold">Abschlussquote</span> liegt 5% über dem
                Monatsdurchschnitt. Priorität: Rückruf bei Hr. Müller (Deal CHF 89K, Entscheidung diese
                Woche).
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-5">
                <span className="px-3 py-1 rounded-full bg-amber-soft text-amber text-[11px] font-semibold">
                  3 Deals priorisiert
                </span>
                <span className="px-3 py-1 rounded-full bg-red-soft text-red text-[11px] font-semibold">
                  2 Risiko-Leads
                </span>
                <span className="px-3 py-1 rounded-full bg-green-soft text-green text-[11px] font-semibold">
                  Quote über Durchschnitt
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-[-0.01em]">Aufgaben heute</h3>
            <span className="text-[11px] font-semibold text-text-dim">{tasks.filter(t => !t.done).length} offen</span>
          </div>
          <div className="space-y-1.5">
            {tasks.map((task, i) => (
              <div
                key={i}
                className={[
                  'flex items-start gap-3 p-2.5 rounded-[10px]',
                  'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  task.overdue ? 'bg-red-soft' : 'hover:bg-surface-hover',
                  task.done ? 'opacity-40' : '',
                ].join(' ')}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={!!task.done}
                  aria-label={`Aufgabe: ${task.text}`}
                  className={[
                    'w-[20px] h-[20px] rounded-[6px] border-[1.5px] flex-shrink-0 mt-0.5 flex items-center justify-center',
                    'transition-colors duration-150',
                    task.done ? 'border-green bg-green-soft' : 'border-text-dim hover:border-text-sec',
                  ].join(' ')}
                >
                  {task.done && <CheckCircle2 size={12} className="text-green" />}
                </button>
                {/* Type indicator dot */}
                <div
                  className="w-[5px] h-[5px] rounded-full flex-shrink-0 mt-[7px]"
                  style={{ background: taskTypeColors[task.type] }}
                />
                <span className={`text-[13px] leading-snug ${task.done ? 'line-through text-text-dim' : 'text-text-sec'}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Lead Sources */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold tracking-[-0.01em] mb-5">Leadquellen</h3>
          <div className="space-y-4">
            {leadSources.map((source) => (
              <div key={source.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-text-sec">{source.name}</span>
                  <span className="text-xs font-semibold tabular-nums">{source.value}%</span>
                </div>
                <div className="h-[5px] rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${source.value}%`,
                      background: `linear-gradient(90deg, ${source.rawColor}, color-mix(in srgb, ${source.rawColor} 60%, transparent))`,
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold tracking-[-0.01em] mb-5">Letzte Aktivitäten</h3>
          <div className="space-y-3.5">
            {activities.map((activity, i) => (
              <div
                key={i}
                className="flex items-start gap-3 group/activity hover:bg-surface-hover rounded-[10px] p-2 -mx-2 transition-colors duration-150"
              >
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${activity.rawColor} 12%, transparent)` }}
                >
                  <activity.icon size={14} style={{ color: activity.rawColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-[450] text-text-sec leading-snug">{activity.text}</p>
                  <p className="text-[10px] text-text-dim mt-0.5 font-medium">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
