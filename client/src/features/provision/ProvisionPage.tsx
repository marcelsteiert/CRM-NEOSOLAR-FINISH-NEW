import { useState, useMemo, useRef } from 'react'
import { Coins, ChevronLeft, ChevronRight, TrendingUp, Users, FileText, Printer, Info, Eye, Pencil, Check, X, Trash2 } from 'lucide-react'
import { useProvision, useMonthlyStats } from '@/hooks/useDashboard'
import { useAuth } from '@/hooks/useAuth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

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

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/* ── Component ── */

export default function ProvisionPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-based
  const [viewUserId, setViewUserId] = useState<string>('ALL')

  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GL'
  const qc = useQueryClient()

  // Inline-Editing State
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

  // Gefilterte Provision basierend auf User-Auswahl
  const provision = useMemo(() => {
    if (!provisionRaw) return null
    if (viewUserId === 'ALL') return provisionRaw
    const filtered = provisionRaw.provisions.filter((p) => p.userId === viewUserId)
    const totalValue = filtered.reduce((s, p) => s + p.totalValue, 0)
    const totalProvision = filtered.reduce((s, p) => s + p.provision, 0)
    const totalDeals = filtered.reduce((s, p) => s + p.deals.length, 0)
    return { ...provisionRaw, provisions: filtered, summary: { totalValue, totalProvision, totalDeals } }
  }, [provisionRaw, viewUserId])

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, #F59E0B 12%, transparent), color-mix(in srgb, #F59E0B 4%, transparent))',
              border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)',
            }}
          >
            <Coins size={20} className="text-amber" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">Provision</h1>
            <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">Monatsbasierte Provisionsabrechnung (5%)</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={goPrev}
            className="btn-secondary w-9 h-9 flex items-center justify-center rounded-lg shrink-0"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <div
            className="px-3 sm:px-5 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold text-text min-w-0 sm:min-w-[180px] text-center flex-1 sm:flex-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={isCurrentMonth}
            className="btn-secondary w-9 h-9 flex items-center justify-center rounded-lg disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
          {/* User-Switcher (nur Admin) */}
          {isAdmin && provisionRaw && provisionRaw.provisions.length > 0 && (
            <div className="relative ml-auto sm:ml-2">
              <Eye size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              <select
                value={viewUserId}
                onChange={(e) => setViewUserId(e.target.value)}
                className="glass-input appearance-none pl-8 pr-8 py-2 text-[12px] font-medium cursor-pointer"
              >
                <option value="ALL" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Alle Verkäufer</option>
                {provisionRaw.provisions.map((p) => (
                  <option key={p.userId} value={p.userId} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                    {p.userName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2 px-3 sm:px-4 py-2 text-[12px] sm:ml-2 shrink-0"
          >
            <Printer size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Drucken</span>
          </button>
        </div>
      </div>

      {/* User-Filter Hinweis */}
      {viewUserId !== 'ALL' && provision && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px]"
          style={{ background: 'color-mix(in srgb, #60A5FA 8%, transparent)', border: '1px solid color-mix(in srgb, #60A5FA 15%, transparent)' }}
        >
          <Eye size={14} className="text-blue-400 shrink-0" strokeWidth={1.8} />
          <span className="text-blue-300">
            Ansicht: <span className="font-semibold text-blue-200">{provision.provisions[0]?.userName ?? 'Unbekannt'}</span>
          </span>
          <button
            type="button"
            onClick={() => setViewUserId('ALL')}
            className="ml-auto text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Alle anzeigen
          </button>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
          <h2 className="text-[13px] font-bold">Provisionen nach Verkäufer</h2>
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
                      {isAdmin && viewUserId === 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => setViewUserId(p.userId)}
                          className="text-[13px] font-semibold hover:text-amber transition-colors text-left"
                        >
                          {p.userName}
                        </button>
                      ) : (
                        <p className="text-[13px] font-semibold">{p.userName}</p>
                      )}
                      <p className="text-[11px] text-text-dim">{p.userRole}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-amber tabular-nums">{formatCHFExact(p.provision)}</p>
                    <p className="text-[10px] text-text-dim">5% von {formatCHF(p.totalValue)}</p>
                  </div>
                </div>

                {/* Deal List */}
                <div className="ml-0 sm:ml-12 space-y-1.5">
                  {p.deals.map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between text-[11px] gap-2 group/deal">
                      <span className="text-text-sec truncate">{deal.title}</span>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="text-text-dim tabular-nums">{new Date(deal.closedAt).toLocaleDateString('de-CH')}</span>
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
                              className="w-16 sm:w-24 px-2 py-0.5 text-[11px] rounded bg-bg border border-amber/30 text-text tabular-nums text-right focus:outline-none focus:border-amber"
                              autoFocus
                            />
                            <button type="button" onClick={() => saveEdit(deal.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5" disabled={updateDeal.isPending}>
                              <Check size={11} strokeWidth={2.5} />
                            </button>
                            <button type="button" onClick={() => setEditingDealId(null)} className="text-text-dim hover:text-text p-0.5">
                              <X size={11} strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`font-semibold tabular-nums ${isAdmin ? 'cursor-pointer hover:text-amber transition-colors' : ''}`}
                            onClick={isAdmin ? () => startEdit(deal.id, deal.value) : undefined}
                          >
                            {formatCHF(deal.value)}
                          </span>
                        )}
                        {isAdmin && editingDealId !== deal.id && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/deal:opacity-100 transition-opacity">
                            <button type="button" onClick={() => startEdit(deal.id, deal.value)} className="text-text-dim hover:text-amber p-0.5" title="Wert bearbeiten">
                              <Pencil size={10} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (confirm(`Deal "${deal.title}" wirklich löschen?`)) deleteDeal.mutate(deal.id) }}
                              className="text-text-dim hover:text-red p-0.5"
                              title="Deal löschen"
                            >
                              <Trash2 size={10} strokeWidth={2} />
                            </button>
                          </div>
                        )}
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

      {/* ── Hinweis ── */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        <Info size={16} className="text-text-dim shrink-0 mt-0.5" strokeWidth={1.8} />
        <div className="text-[11px] text-text-sec leading-relaxed space-y-1">
          <p className="font-semibold text-text-dim">Hinweis zur Provisionsberechnung</p>
          <p>
            Die hier angezeigten Provisionen sind <span className="text-text font-medium">vorläufige Richtwerte</span> und dienen ausschliesslich der Orientierung.
            Die verbindliche Abrechnung erfolgt nach dem jeweiligen Monatsabschluss auf Basis der tatsaechlich abgeschlossenen und abgerechneten Baustellen im Abrechnungstool.
          </p>
          <p>
            Massgebend fuer die Provisionsberechnung ist der <span className="text-text font-medium">Nettobetrag der PV-Anlage (ohne Zubehoer und Zusatzleistungen)</span>.
            Abweichungen zwischen den hier dargestellten Werten und der finalen Abrechnung sind moeglich und kein Fehler.
          </p>
          <p>Die endgueltige Provision wird durch die Buchhaltung nach Monatsabschluss bestaetigt.</p>
        </div>
      </div>

      {/* ── 6 Monats-Trend ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-[13px] font-bold">Provisions-Trend (6 Monate)</h2>
        </div>
        <div className="p-6">
          {!monthlyData.length ? (
            <div className="text-center text-text-dim text-[12px] py-4">Keine Daten verfügbar</div>
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
