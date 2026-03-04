import { useState, useMemo } from 'react'
import { Coins, ChevronLeft, ChevronRight, TrendingUp, Users, FileText, Printer } from 'lucide-react'
import { useProvision, useMonthlyStats } from '@/hooks/useDashboard'

/* ── Helpers ── */

function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCHFExact(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const MONTH_NAMES = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/* ── Component ── */

export default function ProvisionPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-based

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`

  const { data: provisionResponse, isLoading } = useProvision(monthKey)
  const { data: monthlyResponse } = useMonthlyStats()

  const provision = provisionResponse?.data ?? null
  const monthlyData = monthlyResponse?.data ?? []

  /* ── Navigate months ── */
  const goPrev = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const goNext = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth()

  /* ── 6-Monats-Trend ── */
  const trendMax = useMemo(() => {
    if (!monthlyData.length) return 1
    return Math.max(...monthlyData.map((m) => m.provision), 1)
  }, [monthlyData])

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[14px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, #F59E0B 12%, transparent), color-mix(in srgb, #F59E0B 4%, transparent))',
              border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)',
            }}
          >
            <Coins size={20} className="text-amber" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em]">Provision</h1>
            <p className="text-[12px] text-text-sec mt-0.5">Monatsbasierte Provisionsabrechnung (5%)</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="btn-secondary w-9 h-9 flex items-center justify-center rounded-lg"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <div
            className="px-5 py-2 rounded-lg text-[13px] font-semibold text-text min-w-[180px] text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={isCurrentMonth}
            className="btn-secondary w-9 h-9 flex items-center justify-center rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-[12px] ml-2"
          >
            <Printer size={14} strokeWidth={2} />
            Drucken
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-400" strokeWidth={1.8} />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Abschlussvolumen</span>
          </div>
          <p className="text-[22px] font-bold tabular-nums">{isLoading ? '—' : formatCHF(provision?.summary.totalValue ?? 0)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Coins size={16} className="text-amber" strokeWidth={1.8} />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Provision Total</span>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-amber">{isLoading ? '—' : formatCHFExact(provision?.summary.totalProvision ?? 0)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-blue-400" strokeWidth={1.8} />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">Gewonnene Deals</span>
          </div>
          <p className="text-[22px] font-bold tabular-nums">{isLoading ? '—' : provision?.summary.totalDeals ?? 0}</p>
        </div>
      </div>

      {/* ── Provision per Seller ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Users size={16} className="text-text-dim" strokeWidth={1.8} />
          <h2 className="text-[13px] font-bold">Provisionen nach Verkaeufer</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-dim text-[12px]">Lade Daten...</div>
        ) : !provision?.provisions.length ? (
          <div className="p-8 text-center text-text-dim text-[12px]">Keine gewonnenen Deals in diesem Monat.</div>
        ) : (
          <div className="divide-y divide-border">
            {provision.provisions.map((p) => (
              <div key={p.userId} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)', color: '#06080C' }}
                    >
                      {p.userName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">{p.userName}</p>
                      <p className="text-[11px] text-text-dim">{p.userRole}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-amber tabular-nums">{formatCHFExact(p.provision)}</p>
                    <p className="text-[10px] text-text-dim">5% von {formatCHF(p.totalValue)}</p>
                  </div>
                </div>

                {/* Deal List */}
                <div className="ml-12 space-y-1.5">
                  {p.deals.map((deal, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-text-sec">{deal.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-text-dim tabular-nums">{new Date(deal.closedAt).toLocaleDateString('de-CH')}</span>
                        <span className="font-semibold tabular-nums">{formatCHF(deal.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.04)' }}>
              <span className="text-[13px] font-bold">Total</span>
              <div className="text-right">
                <p className="text-[15px] font-bold text-amber tabular-nums">{formatCHFExact(provision.summary.totalProvision)}</p>
                <p className="text-[10px] text-text-dim">{provision.summary.totalDeals} Deals / {formatCHF(provision.summary.totalValue)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 6 Monats-Trend ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-[13px] font-bold">Provisions-Trend (6 Monate)</h2>
        </div>
        <div className="p-6">
          {!monthlyData.length ? (
            <div className="text-center text-text-dim text-[12px] py-4">Keine Daten verfuegbar</div>
          ) : (
            <div className="flex items-end gap-3 h-[140px]">
              {monthlyData.map((m) => {
                const h = Math.max((m.provision / trendMax) * 100, 4)
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
                    className="flex-1 flex flex-col items-center gap-2 group"
                  >
                    <span className="text-[10px] font-bold tabular-nums text-text-dim group-hover:text-text transition-colors">
                      {m.provision > 0 ? formatCHF(m.provision) : '—'}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-all duration-200"
                      style={{
                        height: `${h}%`,
                        minHeight: '4px',
                        background: isSelected
                          ? 'linear-gradient(180deg, #F59E0B, #F97316)'
                          : m.provision > 0
                            ? 'rgba(245,158,11,0.25)'
                            : 'rgba(255,255,255,0.04)',
                        boxShadow: isSelected ? '0 0 12px rgba(245,158,11,0.3)' : 'none',
                      }}
                    />
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-amber' : 'text-text-dim'}`}>
                      {m.label.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
