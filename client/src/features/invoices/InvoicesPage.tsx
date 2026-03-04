import { useState, useRef } from 'react'
import {
  Receipt,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Printer,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
import { useProvision, useMonthlyStats, type ProvisionEntry } from '@/hooks/useDashboard'

// ── Helpers ──

function formatCHF(value: number) {
  return `CHF ${value.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// ── ProvisionTable (druckbar) ──

function ProvisionTable({
  data,
  month,
  printRef,
}: {
  data: { provisions: ProvisionEntry[]; summary: { totalValue: number; totalProvision: number; totalDeals: number } }
  month: string
  printRef: React.RefObject<HTMLDivElement | null>
}) {
  const [yearStr, monthStr] = month.split('-')
  const monthLabel = `${monthNames[parseInt(monthStr, 10) - 1]} ${yearStr}`

  return (
    <div ref={printRef} className="space-y-5 print-provision">
      {/* Print Header (nur beim Drucken sichtbar) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">NEOSOLAR AG – Provisionsabrechnung</h1>
        <p className="text-sm text-gray-600">{monthLabel}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 print:gap-2">
        <div
          className="glass-card p-4 print:border print:border-gray-300 print:bg-white"
          style={{ border: '1px solid color-mix(in srgb, #34D399 10%, transparent)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center print:hidden"
              style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)' }}
            >
              <Trophy size={18} strokeWidth={1.8} className="text-green" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim print:text-gray-500">
                Abschlüsse
              </p>
              <p className="text-[20px] font-extrabold tabular-nums text-green print:text-green-700">
                {data.summary.totalDeals}
              </p>
            </div>
          </div>
        </div>
        <div
          className="glass-card p-4 print:border print:border-gray-300 print:bg-white"
          style={{ border: '1px solid color-mix(in srgb, #60A5FA 10%, transparent)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center print:hidden"
              style={{ background: 'color-mix(in srgb, #60A5FA 12%, transparent)' }}
            >
              <TrendingUp size={18} strokeWidth={1.8} className="text-blue" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim print:text-gray-500">
                Gesamtwert
              </p>
              <p className="text-[20px] font-extrabold tabular-nums text-blue print:text-blue-700">
                {formatCHF(data.summary.totalValue)}
              </p>
            </div>
          </div>
        </div>
        <div
          className="glass-card p-4 print:border print:border-gray-300 print:bg-white"
          style={{ border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center print:hidden"
              style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)' }}
            >
              <DollarSign size={18} strokeWidth={1.8} className="text-amber" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim print:text-gray-500">
                Provision Total
              </p>
              <p className="text-[20px] font-extrabold tabular-nums text-amber print:text-amber-700">
                {formatCHF(data.summary.totalProvision)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Salesperson Tables */}
      {data.provisions.length > 0 ? (
        <div className="space-y-4">
          {data.provisions.map((entry) => (
            <div
              key={entry.userId}
              className="glass-card p-5 print:border print:border-gray-300 print:bg-white print:p-4"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              {/* User Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[12px] font-bold print:hidden"
                    style={{ background: 'color-mix(in srgb, #A78BFA 12%, transparent)', color: '#A78BFA' }}
                  >
                    {entry.userName.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold">{entry.userName}</p>
                    <p className="text-[11px] text-text-dim print:text-gray-500">{entry.userRole}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-text-dim print:text-gray-500">Provision</p>
                  <p className="text-[18px] font-extrabold tabular-nums text-amber print:text-amber-700">
                    {formatCHF(entry.provision)}
                  </p>
                </div>
              </div>

              {/* Deals Table */}
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border print:border-gray-300">
                    <th className="text-left py-2 text-[10px] font-bold uppercase text-text-dim print:text-gray-500">
                      Angebot
                    </th>
                    <th className="text-right py-2 text-[10px] font-bold uppercase text-text-dim print:text-gray-500">
                      Abschluss
                    </th>
                    <th className="text-right py-2 text-[10px] font-bold uppercase text-text-dim print:text-gray-500">
                      Wert
                    </th>
                    <th className="text-right py-2 text-[10px] font-bold uppercase text-text-dim print:text-gray-500">
                      5% Provision
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.deals.map((deal, i) => (
                    <tr key={i} className="border-b border-border/50 print:border-gray-200">
                      <td className="py-2.5 text-text-sec print:text-gray-700">{deal.title}</td>
                      <td className="py-2.5 text-right text-text-dim print:text-gray-500 tabular-nums">
                        {formatDate(deal.closedAt)}
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums print:text-gray-800">
                        {formatCHF(deal.value)}
                      </td>
                      <td className="py-2.5 text-right font-bold tabular-nums text-amber print:text-amber-700">
                        {formatCHF(deal.value * 0.05)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border print:border-gray-400">
                    <td colSpan={2} className="py-2.5 font-bold text-text-sec print:text-gray-700">
                      Total {entry.userName}
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums print:text-gray-800">
                      {formatCHF(entry.totalValue)}
                    </td>
                    <td className="py-2.5 text-right font-extrabold tabular-nums text-amber print:text-amber-700">
                      {formatCHF(entry.provision)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-[13px] text-text-dim">Keine Abschlüsse in diesem Monat</p>
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-[10px] text-gray-500">
        <p>NEOSOLAR AG · Provisionsabrechnung · {monthLabel} · Generiert am {new Date().toLocaleDateString('de-CH')}</p>
      </div>
    </div>
  )
}

// ── Main ──

export default function InvoicesPage() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  )
  const printRef = useRef<HTMLDivElement>(null)

  const { data: provisionRes, isLoading } = useProvision(selectedMonth)
  const { data: monthlyRes } = useMonthlyStats()

  const provision = provisionRes?.data
  const monthly = monthlyRes?.data || []

  const navigateMonth = (dir: -1 | 1) => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const handlePrint = () => {
    window.print()
  }

  const [yearStr, monthStr] = selectedMonth.split('-')
  const monthLabel = `${monthNames[parseInt(monthStr, 10) - 1]} ${yearStr}`

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, #A78BFA 14%, transparent), color-mix(in srgb, #A78BFA 5%, transparent))',
            }}
          >
            <Receipt size={20} className="text-violet-400" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Rechnungen & Provision</h1>
            <p className="text-[12px] text-text-sec">5% Provision auf Monatsabschlüsse</p>
          </div>
        </div>

        {/* Month Navigation + Print */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 glass-card px-1 py-1">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors"
            >
              <ChevronLeft size={16} className="text-text-sec" />
            </button>
            <span className="text-[13px] font-bold px-3 min-w-[130px] text-center">{monthLabel}</span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors"
            >
              <ChevronRight size={16} className="text-text-sec" />
            </button>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-[12px] font-semibold print:hidden"
          >
            <Printer size={14} strokeWidth={1.8} />
            Drucken
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : provision ? (
        <ProvisionTable data={provision} month={selectedMonth} printRef={printRef} />
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-[13px] text-text-dim">Keine Daten verfügbar</p>
        </div>
      )}

      {/* ── Jahresübersicht ── */}
      {monthly.length > 0 && (
        <div className="glass-card p-5 print:hidden">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-violet" />
            <h3 className="text-sm font-bold tracking-[-0.01em]">Provisions-Verlauf</h3>
          </div>
          <div className="space-y-2.5">
            {monthly.map((m) => (
              <button
                key={m.month}
                type="button"
                onClick={() => setSelectedMonth(m.month)}
                className={[
                  'w-full flex items-center gap-3 p-2.5 rounded-[10px] transition-colors text-left',
                  m.month === selectedMonth ? 'bg-amber-soft' : 'hover:bg-surface-hover',
                ].join(' ')}
              >
                <span className="text-[12px] font-semibold w-[80px]">{m.label}</span>
                <div className="flex-1 h-[6px] rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((m.provision / (Math.max(...monthly.map((x) => x.provision)) || 1)) * 100, 2)}%`,
                      background: m.provision > 0
                        ? 'linear-gradient(90deg, #F59E0B, color-mix(in srgb, #F59E0B 60%, transparent))'
                        : 'rgba(255,255,255,0.05)',
                    }}
                  />
                </div>
                <span className="text-[12px] font-bold tabular-nums w-[90px] text-right">
                  {m.provision > 0 ? formatCHF(m.provision) : '–'}
                </span>
                <span className="text-[10px] text-text-dim w-[60px] text-right">
                  {m.wonDeals} Deal(s)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
