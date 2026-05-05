import { useState, useMemo } from 'react'
import { Users, UserPlus, Search, Briefcase, Archive, ArchiveRestore } from 'lucide-react'
import {
  usePersonnelList, usePersonnelStats,
  type Personnel, type ContractType,
  contractTypeLabels, contractTypeColors,
} from '@/hooks/usePersonnel'
import PersonnelFormModal from './components/PersonnelFormModal'
import PersonnelDetailModal from './components/PersonnelDetailModal'

const CONTRACT_TYPES: ContractType[] = ['VOLLZEIT', 'TEILZEIT', 'LEHRLING', 'SUBUNTERNEHMER', 'PRAKTIKUM']

const formatDate = (d: string | null) => {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PersonnelPage() {
  const [search, setSearch] = useState('')
  const [filterContract, setFilterContract] = useState<ContractType | ''>('')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Personnel | null>(null)

  const { data: listRes, isLoading } = usePersonnelList({
    search: search || undefined,
    includeArchived: showArchived,
    contractType: filterContract || undefined,
  })
  const { data: statsRes } = usePersonnelStats()
  const stats = statsRes?.data
  const all = listRes?.data ?? []

  const items = useMemo(() => {
    return [...all].sort((a, b) => {
      if (!!a.archivedAt !== !!b.archivedAt) return a.archivedAt ? 1 : -1
      return a.lastName.localeCompare(b.lastName)
    })
  }, [all])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={20} strokeWidth={1.8} />
            Personal
            {listRes && (
              <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full">
                {listRes.total}
              </span>
            )}
          </h1>
          <p className="text-[11px] text-text-dim mt-0.5 hidden sm:block">
            Mitarbeiter-Stammdaten, Verträge, Bankdaten und Personalakten
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={14} strokeWidth={1.8} />
          Neuer Mitarbeiter
        </button>
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KPI label="Gesamt" value={stats.total} color="#F59E0B" />
          <KPI label="Vollzeit" value={stats.fullTime} color={contractTypeColors.VOLLZEIT} />
          <KPI label="Teilzeit" value={stats.partTime} color={contractTypeColors.TEILZEIT} />
          <KPI label="Lehrlinge" value={stats.apprentice} color={contractTypeColors.LEHRLING} />
          <KPI label="FTE" value={stats.fteSum} color="#A78BFA" />
        </div>
      )}

      {/* Filter */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            className="glass-input w-full pl-9 text-xs"
            placeholder="Mitarbeiter suchen (Name, E-Mail, Position)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="glass-input text-xs"
          value={filterContract}
          onChange={e => setFilterContract(e.target.value as ContractType | '')}
        >
          <option value="">Alle Vertragsarten</option>
          {CONTRACT_TYPES.map(c => <option key={c} value={c}>{contractTypeLabels[c]}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
            showArchived
              ? 'bg-amber-soft text-amber'
              : 'text-text-dim hover:text-text hover:bg-surface-hover'
          }`}
        >
          {showArchived ? <ArchiveRestore size={14} strokeWidth={1.8} /> : <Archive size={14} strokeWidth={1.8} />}
          {showArchived ? 'Mit Archiv' : 'Nur aktive'}
        </button>
      </div>

      {/* Liste */}
      {isLoading && (
        <div className="glass-card p-12 text-center text-white/30 text-sm">Mitarbeiter werden geladen...</div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Users size={32} className="mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/30">Keine Mitarbeiter erfasst</p>
          <p className="text-[11px] text-white/20 mt-1">Klicke oben auf "Neuer Mitarbeiter" um zu starten</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>Name</Th>
                  <Th>Position</Th>
                  <Th>Vertrag</Th>
                  <Th>Pensum</Th>
                  <Th>Eintritt</Th>
                  <Th>Telefon</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => {
                  const c = contractTypeColors[p.contractType] ?? '#94A3B8'
                  const initials = `${(p.firstName[0] ?? '')}${(p.lastName[0] ?? '')}`.toUpperCase()
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={`border-b border-border/50 hover:bg-surface-hover/40 transition-colors cursor-pointer ${p.archivedAt ? 'opacity-60' : ''}`}
                    >
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: c + '22', color: c }}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-text">{p.firstName} {p.lastName}</p>
                            <p className="text-[10px] text-text-dim">{p.email ?? '–'}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <p className="text-[12px] text-text truncate max-w-[180px]">{p.position ?? '–'}</p>
                        {p.department && <p className="text-[10px] text-text-dim truncate max-w-[180px]">{p.department}</p>}
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: c + '22', color: c }}>
                          <Briefcase size={10} strokeWidth={2} />
                          {contractTypeLabels[p.contractType]}
                        </span>
                      </Td>
                      <Td className="tabular-nums">{p.workloadPct}%</Td>
                      <Td className="tabular-nums text-text-dim">{formatDate(p.startDate)}</Td>
                      <Td className="text-text-dim">{p.phone ?? p.mobile ?? '–'}</Td>
                      <Td>
                        {p.archivedAt
                          ? <span className="text-[10px] font-bold uppercase text-text-dim">Archiviert</span>
                          : p.endDate && new Date(p.endDate) < new Date()
                            ? <span className="text-[10px] font-bold uppercase text-red">Ausgetreten</span>
                            : <span className="text-[10px] font-bold uppercase" style={{ color: '#34D399' }}>Aktiv</span>}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <PersonnelFormModal open={showCreate} onClose={() => setShowCreate(false)} />
      )}
      {selected && (
        <PersonnelDetailModal member={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">{label}</p>
      <p className="text-[22px] font-bold tabular-nums mt-1" style={{ color }}>{value}</p>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">{children}</th>
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ''}`}>{children}</td>
}
