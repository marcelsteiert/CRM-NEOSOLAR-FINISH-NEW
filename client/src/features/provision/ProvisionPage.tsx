import { useState, useMemo, useRef } from 'react'
import {
  Coins, ChevronLeft, ChevronRight, TrendingUp, Users, FileText, Printer,
  Info, Eye, Pencil, Check, X, Trash2, Sparkles,
} from 'lucide-react'
import { useProvision, useMonthlyStats } from '@/hooks/useDashboard'
import { useAuth } from '@/hooks/useAuth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import KpiWidget from '@/components/premium/KpiWidget'
import PremiumCard from '@/components/premium/PremiumCard'
import Sparkline from '@/components/premium/Sparkline'

/* ── Helpers ── */

function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatCHFExact(value: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/* ── Component ── */

export default function ProvisionPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [viewUserId, setViewUserId] = useState<string>('ALL')

  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GL'
  const qc = useQueryClient()

  const [editingDealId, setEditingDealId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const updateDeal = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      api.put(`/deals/${id}`, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provision'] })
      qc.invalidateQueries({ queryKey: ['monthlyStats'] })
      setEditingDealId(null)
    },
  })

  const deleteDeal = useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provision'] })
      qc.invalidateQueries({ queryKey: ['monthlyStats'] })
    },
  })

  const startEdit = (dealId: string, currentValue: number) => {
    setEditingDealId(dealId)
    setEditValue(String(currentValue))
    setTimeout(() => editInputRef.current?.select(), 50)
  }

  const saveEdit = (dealId: string) => {
    const num = parseFloat(editValue.replace(/[^\d.,]/g, '').replace(',', '.'))
    if (isNaN(num) || num < 0) { setEditingDealId(null); return }
    updateDeal.mutate({ id: dealId, value: Math.round(num) })
  }

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`

  const { data: provisionResponse, isLoading } = useProvision(monthKey)
  const { data: monthlyResponse } = useMonthlyStats()

  const provisionRaw = provisionResponse?.data ?? null
  const monthlyData = monthlyResponse?.data ?? []

  const provision = useMemo(() => {
    if (!provisionRaw) return null
    if (viewUserId === 'ALL') return provisionRaw
    const filtered = provisionRaw.provisions.filter((p) => p.userId === viewUserId)
    const totalValue = filtered.reduce((s, p) => s + p.totalValue, 0)
    const totalProvision = filtered.reduce((s, p) => s + p.provision, 0)
    const totalDeals = filtered.reduce((s, p) => s + p.deals.length, 0)
    return { ...provisionRaw, provisions: filtered, summary: { totalValue, totalProvision, totalDeals } }
  }, [provisionRaw, viewUserId])

  const goPrev = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1) }
    else setSelectedMonth(selectedMonth - 1)
  }
  const goNext = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1) }
    else setSelectedMonth(selectedMonth + 1)
  }

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth()

  /* Sparklines aus monthlyData */
  const provisionSpark = useMemo(() => monthlyData.map(m => m.provision || 0), [monthlyData])
  const valueSpark = useMemo(() => monthlyData.map(m => m.wonValue || 0), [monthlyData])
  const dealsSpark = useMemo(() => monthlyData.map(m => m.wonDeals || 0), [monthlyData])

  const trendMax = useMemo(() => {
    if (!monthlyData.length) return 1
    return Math.max(...monthlyData.map((m) => m.provision), 1)
  }, [monthlyData])

  const lastMonthProv = monthlyData[monthlyData.length - 2]?.provision ?? 0
  const currentMonthProv = monthlyData[monthlyData.length - 1]?.provision ?? 0
  const monthDelta = lastMonthProv > 0 ? ((currentMonthProv - lastMonthProv) / lastMonthProv) * 100 : 0

  return (
    <div className="space-y-5 relative">
      {/* Ambient orbs */}
      <div className="premium-glow-orb" style={{ top: '-50px', left: '10%', width: '420px', height: '420px', background: '#D4AF37', opacity: 0.18 }} />
      <div className="premium-glow-orb" style={{ top: '40%', right: '5%', width: '340px', height: '340px', background: '#10B981', opacity: 0.10 }} />

      {/* ── Header ── */}
      <div className="relative z-[1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.06))',
              border: '1px solid rgba(212, 175, 55, 0.30)',
              boxShadow: '0 4px 20px -4px rgba(212, 175, 55, 0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <Coins size={20} className="text-amber-300" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.025em] premium-gradient-text leading-tight">Provision</h1>
            <p className="text-[12px] text-white/40 mt-0.5 hidden sm:block">Monatsbasierte Provisionsabrechnung</p>
          </div>
        </div>

        {/* Month Selector + Filter + Print */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div
            className="flex items-center rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button type="button" onClick={goPrev} className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-amber-300 hover:bg-white/[0.04] transition-all">
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            <div className="px-4 py-2 text-[12.5px] font-bold tabular-nums min-w-[140px] text-center">
              {monthLabel}
            </div>
            <button type="button" onClick={goNext} disabled={isCurrentMonth} className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-amber-300 hover:bg-white/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>

          {isAdmin && provisionRaw && provisionRaw.provisions.length > 0 && (
            <div className="relative">
              <Eye size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" strokeWidth={2} />
              <select
                value={viewUserId}
                onChange={(e) => setViewUserId(e.target.value)}
                className="appearance-none pl-9 pr-9 py-2.5 text-[12px] font-medium cursor-pointer rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                <option value="ALL">Alle Verkäufer</option>
                {provisionRaw.provisions.map((p) => (
                  <option key={p.userId} value={p.userId}>{p.userName}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium rounded-2xl transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            <Printer size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Drucken</span>
          </button>
        </div>
      </div>

      {/* User-Filter Hinweis */}
      {viewUserId !== 'ALL' && provision && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] relative z-[1]"
          style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.20)' }}
        >
          <Eye size={14} className="text-blue-300 shrink-0" strokeWidth={1.8} />
          <span className="text-blue-200">
            Ansicht: <span className="font-semibold">{provision.provisions[0]?.userName ?? 'Unbekannt'}</span>
          </span>
          <button type="button" onClick={() => setViewUserId('ALL')} className="ml-auto text-[11px] font-semibold text-blue-300 hover:text-blue-100 transition-colors">
            Alle anzeigen
          </button>
        </div>
      )}

      {/* ── KPI Bento (3 cols) ── */}
      <div className="premium-bento relative z-[1]">
        <div className="col-span-12 sm:col-span-2 lg:col-span-4">
          <KpiWidget
            label="Abschlussvolumen"
            value={`CHF ${(provision?.summary.totalValue ?? 0).toLocaleString('de-CH')}`}
            icon={<TrendingUp size={16} strokeWidth={2} className="text-emerald-300" />}
            iconBg="rgba(16, 185, 129, 0.12)"
            sparkline={valueSpark}
            sparklineColor="#10B981"
            glow="emerald"
            textGradient="emerald"
            delay={0}
          />
        </div>
        <div className="col-span-12 sm:col-span-2 lg:col-span-4">
          <KpiWidget
            label="Provision Total"
            value={formatCHFExact(provision?.summary.totalProvision ?? 0)}
            icon={<Coins size={16} strokeWidth={2} className="text-amber-300" />}
            iconBg="rgba(212, 175, 55, 0.12)"
            delta={Number(monthDelta.toFixed(1))}
            deltaLabel="vs. Vormonat"
            sparkline={provisionSpark}
            sparklineColor="#D4AF37"
            glow="gold"
            textGradient="gold"
            delay={80}
          />
        </div>
        <div className="col-span-12 sm:col-span-2 lg:col-span-4">
          <KpiWidget
            label="Gewonnene Deals"
            value={provision?.summary.totalDeals ?? 0}
            icon={<FileText size={16} strokeWidth={2} className="text-blue-300" />}
            iconBg="rgba(59, 130, 246, 0.12)"
            sparkline={dealsSpark}
            sparklineColor="#3B82F6"
            glow="electric"
            textGradient="electric"
            delay={160}
          />
        </div>
      </div>

      {/* ── Provisionen nach Verkäufer ── */}
      <PremiumCard delay={240} className="p-5 sm:p-6 relative z-[1]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Users size={14} strokeWidth={2} className="text-white/60" />
            </div>
            <h3 className="text-[13px] font-bold text-white">Provisionen nach Verkäufer</h3>
          </div>
          {isLoading ? null : provision?.provisions.length ? (
            <span className="premium-badge premium-badge-gold">{provision.provisions.length} Verkäufer</span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-white/30 text-[12px]">Lade Daten...</div>
        ) : !provision?.provisions.length ? (
          <div className="py-12 text-center">
            <Coins size={28} className="mx-auto text-white/15 mb-3" strokeWidth={1.5} />
            <p className="text-[13px] text-white/40">Keine gewonnenen Deals in {monthLabel}.</p>
            <p className="text-[11px] text-white/25 mt-1">Wechsle den Monat oben rechts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {provision.provisions.map((p, idx) => {
              const initials = p.userName.split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase()
              const ratePct = (p.provisionRate * 100).toFixed(p.provisionRate < 0.05 || p.provisionRate > 0.05 ? 2 : 0)
              return (
                <div
                  key={p.userId}
                  className="rounded-2xl p-4 sm:p-5 premium-fade-up"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    animationDelay: `${idx * 60}ms`,
                  }}
                >
                  <div className="flex items-center justify-between gap-4 mb-3.5 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #FCD34D, #D4AF37)',
                          color: '#06080C',
                          boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        {isAdmin && viewUserId === 'ALL' ? (
                          <button type="button" onClick={() => setViewUserId(p.userId)} className="text-[14px] font-bold text-white hover:text-amber-300 transition-colors text-left">
                            {p.userName}
                          </button>
                        ) : (
                          <p className="text-[14px] font-bold text-white">{p.userName}</p>
                        )}
                        <p className="text-[10px] text-white/40 uppercase tracking-[0.06em] font-semibold">{p.userRole}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[20px] sm:text-[22px] font-bold tabular-nums premium-gradient-text-gold leading-none">
                        {formatCHFExact(p.provision)}
                      </p>
                      <p className="text-[10.5px] text-white/40 mt-1">{ratePct}% Ø von {formatCHF(p.totalValue)}</p>
                    </div>
                  </div>

                  {/* Deal List */}
                  <div className="space-y-1.5 mt-2">
                    {p.deals.map((deal: any) => {
                      const dealRate = deal.provisionRate ?? 5
                      const isOverride = dealRate !== 5
                      return (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between gap-2 group/deal text-[11.5px] py-1.5 px-3 rounded-xl"
                          style={{ background: 'rgba(255, 255, 255, 0.018)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-1 h-4 rounded-full" style={{ background: isOverride ? '#A78BFA' : '#D4AF37' }} />
                            <span className="text-white/70 truncate font-medium">{deal.title}</span>
                            {isOverride && (
                              <span className="premium-badge premium-badge-gold text-[8.5px] px-1.5 py-0.5">
                                <Sparkles size={8} strokeWidth={2.5} />
                                {dealRate}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <span className="text-white/35 tabular-nums">
                              {new Date(deal.closedAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                            </span>
                            {editingDealId === deal.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(deal.id)
                                    if (e.key === 'Escape') setEditingDealId(null)
                                  }}
                                  className="w-20 px-2 py-0.5 text-[11px] rounded bg-[#0F172A] border border-amber-500/40 text-white tabular-nums text-right focus:outline-none focus:border-amber-400"
                                  autoFocus
                                />
                                <button type="button" onClick={() => saveEdit(deal.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5" disabled={updateDeal.isPending}>
                                  <Check size={11} strokeWidth={2.5} />
                                </button>
                                <button type="button" onClick={() => setEditingDealId(null)} className="text-white/40 hover:text-white/80 p-0.5">
                                  <X size={11} strokeWidth={2} />
                                </button>
                              </div>
                            ) : (
                              <span
                                className={`font-bold tabular-nums text-white ${isAdmin ? 'cursor-pointer hover:text-amber-300 transition-colors' : ''}`}
                                onClick={isAdmin ? () => startEdit(deal.id, deal.value) : undefined}
                              >
                                {formatCHF(deal.value)}
                              </span>
                            )}
                            {isAdmin && editingDealId !== deal.id && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/deal:opacity-100 transition-opacity">
                                <button type="button" onClick={() => startEdit(deal.id, deal.value)} className="text-white/40 hover:text-amber-300 p-0.5" title="Wert bearbeiten">
                                  <Pencil size={10} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { if (confirm(`Deal "${deal.title}" wirklich löschen?`)) deleteDeal.mutate(deal.id) }}
                                  className="text-white/40 hover:text-rose-400 p-0.5"
                                  title="Deal löschen"
                                >
                                  <Trash2 size={10} strokeWidth={2} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Total Row */}
            <div
              className="rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.10), rgba(212, 175, 55, 0.02))',
                border: '1px solid rgba(212, 175, 55, 0.20)',
                boxShadow: '0 0 24px rgba(212, 175, 55, 0.08)',
              }}
            >
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-amber-300/70">Total</p>
                <p className="text-[10.5px] text-white/40 mt-0.5">{provision.summary.totalDeals} Deals · {formatCHF(provision.summary.totalValue)}</p>
              </div>
              <p className="text-[24px] font-bold tabular-nums premium-gradient-text-gold leading-none">{formatCHFExact(provision.summary.totalProvision)}</p>
            </div>
          </div>
        )}
      </PremiumCard>

      {/* ── Hinweis ── */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl relative z-[1]"
        style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
      >
        <Info size={15} className="text-white/30 shrink-0 mt-0.5" strokeWidth={1.8} />
        <div className="text-[11px] text-white/55 leading-relaxed space-y-1">
          <p className="font-bold text-white/70">Hinweis zur Provisionsberechnung</p>
          <p>
            Die hier angezeigten Provisionen sind <span className="text-white/85 font-semibold">vorläufige Richtwerte</span> und dienen ausschliesslich der Orientierung.
            Die verbindliche Abrechnung erfolgt nach dem jeweiligen Monatsabschluss.
          </p>
          <p>
            Massgebend ist der <span className="text-white/85 font-semibold">Nettobetrag der PV-Anlage</span> (ohne Zubehör/Zusatzleistungen).
            Die endgültige Provision wird durch die Buchhaltung nach Monatsabschluss bestätigt.
          </p>
        </div>
      </div>

      {/* ── 6 Monats-Trend ── */}
      <PremiumCard delay={320} className="p-5 sm:p-6 relative z-[1]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212, 175, 55, 0.10)' }}>
              <TrendingUp size={14} strokeWidth={2} className="text-amber-300" />
            </div>
            <h3 className="text-[13px] font-bold text-white">Provisions-Trend (6 Monate)</h3>
          </div>
        </div>

        {!monthlyData.length ? (
          <div className="text-center text-white/40 text-[12px] py-8">Keine Daten verfügbar</div>
        ) : (
          <>
            {/* Sparkline-Hintergrund-Curve */}
            <div className="-mx-2 mb-2 opacity-50">
              <Sparkline data={provisionSpark} color="#D4AF37" height={56} />
            </div>
            {/* Bars */}
            <div className="flex items-end gap-2 sm:gap-3 h-[120px]">
              {monthlyData.map((m) => {
                const h = Math.max((m.provision / trendMax) * 100, 3)
                const isSelected = m.month === monthKey
                return (
                  <button
                    key={m.month}
                    type="button"
                    onClick={() => {
                      const [y, mo] = m.month.split('-')
                      setSelectedYear(parseInt(y, 10))
                      setSelectedMonth(parseInt(mo, 10) - 1)
                    }}
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    <span className="text-[10px] font-bold tabular-nums text-white/50 group-hover:text-white transition-colors">
                      {m.provision > 0 ? formatCHF(m.provision) : '—'}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-300"
                      style={{
                        height: `${h}%`,
                        minHeight: '4px',
                        background: isSelected
                          ? 'linear-gradient(180deg, #FCD34D 0%, #D4AF37 100%)'
                          : m.provision > 0
                            ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.40), rgba(212, 175, 55, 0.10))'
                            : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: isSelected ? '0 0 24px rgba(212, 175, 55, 0.40)' : 'none',
                      }}
                    />
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-amber-300' : 'text-white/40'}`}>
                      {m.label.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </PremiumCard>
    </div>
  )
}
