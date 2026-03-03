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
} from 'lucide-react'

// KPI data (mock)
const kpis = [
  { label: 'Neue Leads', value: '47', trend: '+12.5%', up: true, color: '#60A5FA', icon: Users },
  { label: 'Pipeline-Wert', value: "CHF 2.4M", trend: '+8.3%', up: true, color: '#F59E0B', icon: TrendingUp },
  { label: 'Abschlussquote', value: '34.2%', trend: '+2.1%', up: true, color: '#34D399', icon: Target },
  { label: 'Umsatz Monat', value: "CHF 847K", trend: '-3.2%', up: false, color: '#A78BFA', icon: DollarSign },
]

const tasks = [
  { text: 'Rückruf Hr. Müller – Offerte besprechen', type: 'call', overdue: true },
  { text: 'Nachfass-Mail Fam. Weber senden', type: 'email', overdue: false },
  { text: 'Vor-Ort-Termin Zürich – 14:30', type: 'meeting', overdue: false },
  { text: 'Kalkulation Projekt Bern aktualisieren', type: 'call', overdue: false },
]

const activities = [
  { icon: Phone, text: 'Anruf mit Hr. Schneider – 12 Min.', time: 'vor 23 Min.', color: '#F59E0B' },
  { icon: Mail, text: 'Offerte an Fam. Weber gesendet', time: 'vor 1 Std.', color: '#60A5FA' },
  { icon: Target, text: 'Deal "Solar Winterthur" gewonnen', time: 'vor 2 Std.', color: '#34D399' },
  { icon: Calendar, text: 'Termin mit Hr. Brunner geplant', time: 'vor 3 Std.', color: '#A78BFA' },
]

const taskTypeColors: Record<string, string> = {
  call: '#F59E0B',
  email: '#60A5FA',
  meeting: '#A78BFA',
}

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-5">
            {/* Glow effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at top right, ${kpi.color}12, transparent 70%)`,
              }}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                {/* Icon */}
                <div
                  className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
                  style={{ background: `${kpi.color}1A` }}
                >
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
                {/* Trend badge */}
                <div
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded-pill text-[11px] font-semibold"
                  style={{
                    background: kpi.up ? 'rgba(52, 211, 153, 0.10)' : 'rgba(248, 113, 113, 0.10)',
                    color: kpi.up ? '#34D399' : '#F87171',
                  }}
                >
                  {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.trend}
                </div>
              </div>
              <div className="text-[28px] font-extrabold tracking-[-0.03em] tabular-nums">{kpi.value}</div>
              <div className="text-xs font-medium text-text-sec mt-1">{kpi.label}</div>

              {/* Mini area chart placeholder */}
              <svg className="w-full h-10 mt-3" viewBox="0 0 200 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`grad-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={kpi.color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={kpi.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,35 Q25,30 50,25 T100,15 T150,20 T200,8 V40 H0 Z"
                  fill={`url(#grad-${kpi.label})`}
                />
                <path
                  d="M0,35 Q25,30 50,25 T100,15 T150,20 T200,8"
                  fill="none"
                  stroke={kpi.color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="200" cy="8" r="2.5" fill={kpi.color} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* KI Briefing */}
        <div className="xl:col-span-2">
          <div
            className="glass-card p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(96,165,250,0.03))',
            }}
          >
            {/* Top highlight line */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), rgba(96,165,250,0.3), transparent)',
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-amber" />
                <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-amber">
                  KI-Briefing
                </span>
              </div>
              <p className="text-sm text-text-sec leading-relaxed">
                <span className="text-amber font-semibold">3 Deals</span> stehen kurz vor dem Abschluss
                (Gesamtwert CHF 284K). <span className="text-red font-semibold">2 Leads</span> zeigen
                Inaktivität seit {'>'} 7 Tagen – Wiedervorlage empfohlen.{' '}
                <span className="text-green font-semibold">Abschlussquote</span> liegt 5% über dem
                Monatsdurchschnitt. Priorität: Rückruf bei Hr. Müller (Deal CHF 89K, Entscheidung diese
                Woche).
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="px-3 py-1 rounded-pill bg-amber-soft text-amber text-[11px] font-semibold">
                  3 Deals priorisiert
                </span>
                <span className="px-3 py-1 rounded-pill bg-red-soft text-red text-[11px] font-semibold">
                  2 Risiko-Leads
                </span>
                <span className="px-3 py-1 rounded-pill bg-green-soft text-green text-[11px] font-semibold">
                  Quote über Durchschnitt
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold tracking-[-0.01em] mb-4">Aufgaben heute</h3>
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-2.5 rounded-[10px] transition-smooth ${
                  task.overdue ? 'bg-red-soft' : ''
                }`}
              >
                {/* Checkbox */}
                <div className="w-[22px] h-[22px] rounded-[6px] border-[1.5px] border-text-dim flex-shrink-0 mt-0.5" />
                {/* Type indicator dot */}
                <div
                  className="w-[6px] h-[6px] rounded-full flex-shrink-0 mt-2"
                  style={{ background: taskTypeColors[task.type] }}
                />
                <span className="text-sm text-text-sec">{task.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Lead Sources */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold tracking-[-0.01em] mb-5">Leadquellen</h3>
          <div className="space-y-4">
            {[
              { name: 'Homepage', value: 38, color: '#60A5FA' },
              { name: 'Empfehlung', value: 27, color: '#34D399' },
              { name: 'Landingpage', value: 20, color: '#F59E0B' },
              { name: 'Messe', value: 10, color: '#A78BFA' },
              { name: 'Kaltakquise', value: 5, color: '#22D3EE' },
            ].map((source) => (
              <div key={source.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-text-sec">{source.name}</span>
                  <span className="text-xs font-semibold tabular-nums">{source.value}%</span>
                </div>
                <div className="h-[6px] rounded-[3px] bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-[3px]"
                    style={{
                      width: `${source.value}%`,
                      background: `linear-gradient(90deg, ${source.color}, ${source.color}AA)`,
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
          <div className="space-y-4">
            {activities.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${activity.color}1A` }}
                >
                  <activity.icon size={15} style={{ color: activity.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-[450] text-text-sec">{activity.text}</p>
                  <p className="text-[10px] text-text-dim mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
