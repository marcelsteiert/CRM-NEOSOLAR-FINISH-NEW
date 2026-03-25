import { useState } from 'react'
import { PhoneOutgoing, Users, Building2, Sun } from 'lucide-react'
import LeadsPage from './LeadsPage'

const TABS = [
  { id: 'ALL', label: 'Alle', icon: PhoneOutgoing, count: null },
  { id: 'ka-b2c', label: 'B2C Privat', icon: Users, color: '#34D399' },
  { id: 'ka-b2b', label: 'B2B Firmen', icon: Building2, color: '#60A5FA' },
  { id: 'ka-solar', label: 'Solaranfragen', icon: Sun, color: '#F59E0B' },
] as const

export default function KaltakquisePage() {
  const [activeTab, setActiveTab] = useState<string>('ALL')

  const tabBar = (
    <div
      className="flex items-center rounded-full p-0.5 overflow-x-auto max-w-full"
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 whitespace-nowrap',
              isActive ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text',
            ].join(' ')}
          >
            <Icon size={13} strokeWidth={2} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <LeadsPage
      fixedSource="KALTAKQUISE"
      fixedTag={activeTab !== 'ALL' ? activeTab : undefined}
      pageTitle="Kaltakquise"
      pageDescription="Kaltakquise-Leads verwalten und zu Terminen konvertieren"
      pageIcon={PhoneOutgoing}
      defaultPageSize={50}
      headerExtra={tabBar}
    />
  )
}
