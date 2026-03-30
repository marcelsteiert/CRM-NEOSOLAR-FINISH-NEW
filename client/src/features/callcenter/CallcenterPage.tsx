import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Headphones, Phone, PhoneOff, ArrowRight, CalendarCheck, TrendingUp,
  ChevronDown, ChevronUp, X, Users, Target, Award, FileDown, Printer,
} from 'lucide-react'

/* ── Types ── */

interface LeadStat {
  userId: string
  firstName: string
  lastName: string
  role: string
  totalLeads: number
  converted: number
  lost: number
  active: number
  conversionRate: number
}

interface ApptStat {
  userId: string
  firstName: string
  lastName: string
  totalAppointments: number
  geplant: number
  bestaetigt: number
  durchgefuehrt: number
}

interface DailyStat {
  day: string
  userId: string
  firstName: string
  lastName: string
  converted: number
  lost: number
  appointmentsCreated: number
}

interface UserDetail {
  leads: any[]
  appointments: any[]
  daily: { day: string; converted: number; lost: number; appointmentsCreated: number }[]
}

/* ── Hooks ── */

function useCallcenterStats(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return useQuery({
    queryKey: ['callcenter', from, to],
    queryFn: () => api.get<{ data: { leadStats: LeadStat[]; appointmentStats: ApptStat[]; dailyStats: DailyStat[] } }>(`/dashboard/callcenter${qs ? `?${qs}` : ''}`),
    staleTime: 2 * 60_000,
  })
}

function useCallcenterUserDetail(userId: string | null) {
  return useQuery({
    queryKey: ['callcenter', 'user', userId],
    queryFn: () => api.get<{ data: UserDetail }>(`/dashboard/callcenter/user/${userId}`),
    enabled: !!userId,
    staleTime: 60_000,
  })
}

/* ── Helpers ── */

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin', VERTRIEB: 'Vertrieb', SETTER: 'Setter', CLOSER: 'Closer',
  PROJEKTLEITUNG: 'PL', GL: 'GL', BUCHHALTUNG: 'Buchhaltung', SUBUNTERNEHMEN: 'Sub',
}

/* ── PDF Export Funktion ── */

function exportUserPdf(userName: string, detail: UserDetail, leadStats?: LeadStat) {
  const today = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const converted = detail.leads.filter((l: any) => l.status === 'CONVERTED')
  const lost = detail.leads.filter((l: any) => l.status === 'LOST')
  const rate = (converted.length + lost.length) > 0
    ? Math.round(converted.length / (converted.length + lost.length) * 100)
    : 0

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Callcenter Report – ${userName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; font-size: 12px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  .logo { font-size: 14px; font-weight: 700; color: #F59E0B; margin-bottom: 4px; }
  .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
  .kpi { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-value { font-size: 28px; font-weight: 800; }
  .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
  .green { color: #059669; }
  .red { color: #dc2626; }
  .blue { color: #2563eb; }
  .amber { color: #d97706; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
  .section { margin-top: 24px; }
  .section-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #F59E0B; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
  .badge-green { background: #d1fae5; color: #059669; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .footer { margin-top: 32px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<div class="logo">NeoSolar CRM</div>
<h1>Callcenter Report – ${userName}</h1>
<div class="subtitle">Erstellt am ${today}</div>

<div class="kpi-row">
  <div class="kpi"><div class="kpi-value green">${converted.length}</div><div class="kpi-label">Konvertiert</div></div>
  <div class="kpi"><div class="kpi-value red">${lost.length}</div><div class="kpi-label">Verloren</div></div>
  <div class="kpi"><div class="kpi-value blue">${detail.appointments.length}</div><div class="kpi-label">Termine</div></div>
  <div class="kpi"><div class="kpi-value amber">${rate}%</div><div class="kpi-label">Conversion</div></div>
</div>

${detail.daily.length > 0 ? `
<div class="section">
  <div class="section-title">Tägliche Aktivität</div>
  <table>
    <thead><tr><th>Datum</th><th>Konvertiert</th><th>Verloren</th><th>Termine erstellt</th></tr></thead>
    <tbody>
      ${detail.daily.slice(0, 30).map((d: any) => `<tr>
        <td>${new Date(d.day).toLocaleDateString('de-CH')}</td>
        <td class="green">${d.converted || '–'}</td>
        <td class="red">${d.lost || '–'}</td>
        <td class="blue">${d.appointmentsCreated || '–'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

${converted.length > 0 ? `
<div class="section">
  <div class="section-title">Konvertierte Leads (${converted.length})</div>
  <table>
    <thead><tr><th>Status</th><th>Name</th><th>Firma</th><th>Datum</th></tr></thead>
    <tbody>
      ${converted.map((l: any) => `<tr>
        <td><span class="badge badge-green">TERMIN</span></td>
        <td>${l.contact?.firstName ?? ''} ${l.contact?.lastName ?? ''}</td>
        <td>${l.contact?.company ?? '–'}</td>
        <td>${new Date(l.updatedAt).toLocaleDateString('de-CH')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

${lost.length > 0 ? `
<div class="section">
  <div class="section-title">Verlorene Leads (${lost.length})</div>
  <table>
    <thead><tr><th>Status</th><th>Name</th><th>Firma</th><th>Datum</th></tr></thead>
    <tbody>
      ${lost.map((l: any) => `<tr>
        <td><span class="badge badge-red">VERLOREN</span></td>
        <td>${l.contact?.firstName ?? ''} ${l.contact?.lastName ?? ''}</td>
        <td>${l.contact?.company ?? '–'}</td>
        <td>${new Date(l.updatedAt).toLocaleDateString('de-CH')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

${detail.appointments.length > 0 ? `
<div class="section">
  <div class="section-title">Termine (${detail.appointments.length})</div>
  <table>
    <thead><tr><th>Status</th><th>Name</th><th>Typ</th><th>Datum</th><th>Uhrzeit</th></tr></thead>
    <tbody>
      ${detail.appointments.map((a: any) => `<tr>
        <td>${a.status}</td>
        <td>${a.contact?.firstName ?? ''} ${a.contact?.lastName ?? ''}</td>
        <td>${a.appointmentType ?? '–'}</td>
        <td>${a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString('de-CH') : '–'}</td>
        <td>${a.appointmentTime ?? '–'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">NeoSolar AG – Callcenter Report – ${today}</div>
</body></html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}

/* ── User Detail Modal ── */

function UserDetailModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const { data: detailRes, isLoading } = useCallcenterUserDetail(userId)
  const detail = detailRes?.data

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[800px] max-h-[85vh] mx-2 sm:mx-4 flex flex-col" style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(24px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold" style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)', color: '#06080C' }}>
              {userName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-[15px] font-bold">{userName}</h2>
              <p className="text-[11px] text-text-dim">Detail-Ansicht Aktivitäten</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {detail && (
              <button
                onClick={() => exportUserPdf(userName, detail)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber hover:bg-amber-soft transition-all"
                style={{ border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <FileDown size={13} strokeWidth={1.8} />
                PDF Export
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all">
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-text-dim text-[12px]">Lade Details...</div>
          ) : (
            <>
              {/* Tägliche Übersicht */}
              {detail?.daily && detail.daily.length > 0 && (
                <div className="glass-card p-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-dim mb-3">Tägliche Aktivität</h3>
                  <div className="space-y-1">
                    {detail.daily.slice(0, 30).map((d) => (
                      <div key={d.day} className="flex items-center gap-3 py-1.5 text-[11px] border-b border-white/[0.03] last:border-0">
                        <span className="text-text-dim tabular-nums w-[75px] shrink-0">{formatDate(d.day)}</span>
                        {d.converted > 0 && (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <ArrowRight size={10} /> {d.converted} Termin{d.converted !== 1 ? 'e' : ''}
                          </span>
                        )}
                        {d.lost > 0 && (
                          <span className="flex items-center gap-1 text-red-400 font-semibold">
                            <PhoneOff size={10} /> {d.lost} Verloren
                          </span>
                        )}
                        {d.appointmentsCreated > 0 && (
                          <span className="flex items-center gap-1 text-blue-400 font-semibold">
                            <CalendarCheck size={10} /> {d.appointmentsCreated} Termin{d.appointmentsCreated !== 1 ? 'e' : ''} erstellt
                          </span>
                        )}
                        {d.converted === 0 && d.lost === 0 && d.appointmentsCreated === 0 && (
                          <span className="text-text-dim">Keine Aktivität</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Konvertierte Leads */}
              {detail?.leads && detail.leads.length > 0 && (
                <div className="glass-card p-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-dim mb-3">
                    Leads ({detail.leads.length})
                  </h3>
                  <div className="space-y-1">
                    {detail.leads.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-3 py-1.5 text-[11px] border-b border-white/[0.03] last:border-0">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0"
                          style={{
                            background: l.status === 'CONVERTED' ? 'color-mix(in srgb, #34D399 12%, transparent)' : 'color-mix(in srgb, #F87171 12%, transparent)',
                            color: l.status === 'CONVERTED' ? '#34D399' : '#F87171',
                          }}
                        >
                          {l.status === 'CONVERTED' ? 'Termin' : 'Verloren'}
                        </span>
                        <span className="text-text-sec font-medium truncate">
                          {l.contact?.firstName} {l.contact?.lastName}
                        </span>
                        {l.contact?.company && <span className="text-text-dim truncate hidden sm:inline">({l.contact.company})</span>}
                        <span className="ml-auto text-text-dim tabular-nums shrink-0">{formatDate(l.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */

export default function CallcenterPage() {
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null)
  const { data: statsRes, isLoading } = useCallcenterStats()
  const stats = statsRes?.data

  const leadStats = stats?.leadStats ?? []
  const apptStats = stats?.appointmentStats ?? []

  // Merge lead + appointment stats per user
  const merged = new Map<string, LeadStat & Partial<ApptStat>>()
  for (const ls of leadStats) {
    merged.set(ls.userId, { ...ls })
  }
  for (const as2 of apptStats) {
    const existing = merged.get(as2.userId)
    if (existing) {
      merged.set(as2.userId, { ...existing, ...as2 })
    } else {
      merged.set(as2.userId, { userId: as2.userId, firstName: as2.firstName, lastName: as2.lastName, role: '', totalLeads: 0, converted: 0, lost: 0, active: 0, conversionRate: 0, ...as2 })
    }
  }
  const allUsers = [...merged.values()].sort((a, b) => b.converted - a.converted)

  // Totals
  const totalConverted = allUsers.reduce((s, u) => s + u.converted, 0)
  const totalLost = allUsers.reduce((s, u) => s + u.lost, 0)
  const totalAppts = allUsers.reduce((s, u) => s + (u.totalAppointments ?? 0), 0)
  const totalRate = (totalConverted + totalLost) > 0 ? Math.round(totalConverted / (totalConverted + totalLost) * 100) : 0

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #F59E0B 12%, transparent), color-mix(in srgb, #F59E0B 4%, transparent))', border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)' }}>
            <Headphones size={20} className="text-amber" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">Callcenter</h1>
            <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">Lead-Konvertierung und Termin-Performance</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)' }}>
                <ArrowRight size={14} className="text-emerald-400" strokeWidth={1.8} />
              </div>
              <span className="text-[10px] text-text-dim uppercase tracking-[0.06em] font-bold">Konvertiert</span>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-emerald-400">{totalConverted}</p>
          </div>
          <div className="glass-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
                <PhoneOff size={14} className="text-red-400" strokeWidth={1.8} />
              </div>
              <span className="text-[10px] text-text-dim uppercase tracking-[0.06em] font-bold">Verloren</span>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-red-400">{totalLost}</p>
          </div>
          <div className="glass-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'color-mix(in srgb, #60A5FA 12%, transparent)' }}>
                <CalendarCheck size={14} className="text-blue-400" strokeWidth={1.8} />
              </div>
              <span className="text-[10px] text-text-dim uppercase tracking-[0.06em] font-bold">Termine</span>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-blue-400">{totalAppts}</p>
          </div>
          <div className="glass-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)' }}>
                <Target size={14} className="text-amber" strokeWidth={1.8} />
              </div>
              <span className="text-[10px] text-text-dim uppercase tracking-[0.06em] font-bold">Conversion</span>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-amber">{totalRate}%</p>
          </div>
        </div>

        {/* User Table */}
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-text-dim text-[12px]">Lade Callcenter-Daten...</div>
          ) : allUsers.length === 0 ? (
            <div className="p-12 text-center text-text-dim text-[13px]">Keine Daten vorhanden</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Mitarbeiter', 'Rolle', 'Konvertiert', 'Verloren', 'Rate', 'Termine', 'Offen', ''].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((user) => {
                    const rate = user.conversionRate ?? 0
                    return (
                      <tr
                        key={user.userId}
                        className="border-b border-border hover:bg-surface-hover transition-colors cursor-pointer"
                        onClick={() => setSelectedUser({ id: user.userId, name: `${user.firstName} ${user.lastName}` })}
                      >
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: 'color-mix(in srgb, #F59E0B 15%, transparent)', color: '#F59E0B' }}>
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <span className="text-[13px] font-semibold">{user.firstName} {user.lastName}</span>
                          </div>
                        </td>
                        {/* Rolle */}
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-text-dim">{roleLabels[user.role] ?? user.role}</span>
                        </td>
                        {/* Konvertiert */}
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-bold tabular-nums text-emerald-400">{user.converted}</span>
                        </td>
                        {/* Verloren */}
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-bold tabular-nums text-red-400">{user.lost}</span>
                        </td>
                        {/* Rate */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, rate)}%`, background: rate >= 60 ? '#34D399' : rate >= 30 ? '#F59E0B' : '#F87171' }} />
                            </div>
                            <span className="text-[11px] font-semibold tabular-nums" style={{ color: rate >= 60 ? '#34D399' : rate >= 30 ? '#F59E0B' : '#F87171' }}>
                              {rate}%
                            </span>
                          </div>
                        </td>
                        {/* Termine total */}
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-bold tabular-nums text-blue-400">{user.totalAppointments ?? 0}</span>
                        </td>
                        {/* Offen */}
                        <td className="px-4 py-3">
                          <span className="text-[11px] tabular-nums text-text-dim">{user.active}</span>
                        </td>
                        {/* Detail */}
                        <td className="px-4 py-3">
                          <ChevronDown size={14} className="text-text-dim" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal userId={selectedUser.id} userName={selectedUser.name} onClose={() => setSelectedUser(null)} />
      )}
    </>
  )
}
