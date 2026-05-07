import { useState, useEffect, useMemo } from 'react'
import { Calculator, HardHat, Lock } from 'lucide-react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import BaustellenTable from './components/BaustellenTable'
import KalkulationTable from './components/KalkulationTable'

type Tab = 'baustellen' | 'kalkulation'

interface Props {
  defaultTab?: Tab
}

export default function CalculationsPage({ defaultTab }: Props = {}) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const canBaustellen = isAdmin || !!user?.allowedModules?.includes('baustellen')
  const canKalkulation = isAdmin || !!user?.allowedModules?.includes('kalkulation')

  const allowedTabs = useMemo<Tab[]>(() => {
    const t: Tab[] = []
    if (canBaustellen) t.push('baustellen')
    if (canKalkulation) t.push('kalkulation')
    return t
  }, [canBaustellen, canKalkulation])

  const requestedTab = (defaultTab ?? (searchParams.get('tab') as Tab)) || allowedTabs[0]
  const initialTab = allowedTabs.includes(requestedTab) ? requestedTab : allowedTabs[0]
  const [tab, setTab] = useState<Tab>(initialTab as Tab)

  // URL-Sync
  useEffect(() => {
    const current = searchParams.get('tab')
    if (current !== tab && tab) {
      const next = new URLSearchParams(searchParams)
      next.set('tab', tab)
      setSearchParams(next, { replace: true })
    }
  }, [tab, searchParams, setSearchParams])

  // Wenn der gewaehlte Tab nicht erlaubt ist → auf erlaubten Tab wechseln
  useEffect(() => {
    if (allowedTabs.length && !allowedTabs.includes(tab)) {
      setTab(allowedTabs[0])
    }
  }, [allowedTabs, tab])

  const handleOpenProject = (projectId: string) => {
    navigate(`/projects?open=${projectId}`)
  }

  // Kein Modul freigeschaltet → zur Startseite
  if (allowedTabs.length === 0) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.025em] premium-gradient-text leading-tight flex items-center gap-2">
            {tab === 'kalkulation' ? <Calculator size={20} strokeWidth={1.8} /> : <HardHat size={20} strokeWidth={1.8} />}
            {canBaustellen && canKalkulation ? 'Baustellen & Kalkulation' : tab === 'baustellen' ? 'Baustellen' : 'Kalkulation'}
            {!isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, #60A5FA 12%, transparent)', color: '#60A5FA' }}>
                <Lock size={9} strokeWidth={2.5} />
                Eingeschränkt
              </span>
            )}
          </h1>
          <p className="text-[11px] text-text-dim mt-0.5 hidden sm:block">
            {tab === 'baustellen'
              ? 'Operatives Tracking: Bewilligungen, Termine, Status pro Baustelle'
              : 'Finanzielle Auswertung: Kosten, Marge, Tranchen pro Projekt'}
          </p>
        </div>
      </div>

      {/* Tab-Switcher (nur wenn beide Tabs erlaubt) */}
      {allowedTabs.length > 1 && (
        <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {canBaustellen && (
            <TabBtn active={tab === 'baustellen'} onClick={() => setTab('baustellen')}>
              <HardHat size={13} strokeWidth={1.8} />
              Baustellen
            </TabBtn>
          )}
          {canKalkulation && (
            <TabBtn active={tab === 'kalkulation'} onClick={() => setTab('kalkulation')}>
              <Calculator size={13} strokeWidth={1.8} />
              Kalkulation
            </TabBtn>
          )}
        </div>
      )}

      {tab === 'baustellen' && canBaustellen && <BaustellenTable onOpenProject={handleOpenProject} />}
      {tab === 'kalkulation' && canKalkulation && <KalkulationTable onOpenProject={handleOpenProject} />}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${
        active ? 'bg-amber text-bg shadow-lg' : 'text-text-dim hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}
