import { useState, useEffect } from 'react'
import { Calculator, HardHat, Lock } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import BaustellenTable from './components/BaustellenTable'
import KalkulationTable from './components/KalkulationTable'

type Tab = 'baustellen' | 'kalkulation'

export default function CalculationsPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'baustellen'
  const [tab, setTab] = useState<Tab>(initialTab)

  // URL-Sync (damit Direktlinks aus Projekt-Modal funktionieren)
  useEffect(() => {
    const current = searchParams.get('tab')
    if (current !== tab) {
      const next = new URLSearchParams(searchParams)
      next.set('tab', tab)
      setSearchParams(next, { replace: true })
    }
  }, [tab, searchParams, setSearchParams])

  // Projekt im Modal öffnen — über Navigation zu /projects?openId=xxx
  const handleOpenProject = (projectId: string) => {
    navigate(`/projects?open=${projectId}`)
  }

  if (!isAdmin) {
    return (
      <div className="glass-card p-12 text-center">
        <Lock size={32} className="mx-auto text-text-dim mb-3" />
        <p className="text-sm text-text">Diese Seite ist nur für Admins zugänglich.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator size={20} strokeWidth={1.8} />
            Kalkulation & Baustellen
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}>
              <Lock size={9} strokeWidth={2.5} />
              Admin
            </span>
          </h1>
          <p className="text-[11px] text-text-dim mt-0.5 hidden sm:block">
            Operatives Tracking aller Baustellen und finanzielle Auswertung pro Projekt
          </p>
        </div>
      </div>

      {/* Tab-Switcher */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <TabBtn active={tab === 'baustellen'} onClick={() => setTab('baustellen')}>
          <HardHat size={13} strokeWidth={1.8} />
          Baustellen
        </TabBtn>
        <TabBtn active={tab === 'kalkulation'} onClick={() => setTab('kalkulation')}>
          <Calculator size={13} strokeWidth={1.8} />
          Kalkulation
        </TabBtn>
      </div>

      {/* Tab Content */}
      {tab === 'baustellen' && <BaustellenTable onOpenProject={handleOpenProject} />}
      {tab === 'kalkulation' && <KalkulationTable onOpenProject={handleOpenProject} />}
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
