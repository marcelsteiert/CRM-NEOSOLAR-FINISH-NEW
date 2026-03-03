import { useState, useMemo } from 'react'
import {
  Users,
  Plus,
  List,
  Columns3,
  Search,
  ChevronDown,
} from 'lucide-react'
import SlidePanel from '@/components/ui/SlidePanel'
import LeadTable from './components/LeadTable'
import LeadKanban from './components/LeadKanban'
import LeadDetailPanel from './components/LeadDetailPanel'
import LeadCreateDialog from './components/LeadCreateDialog'

/* ── Types ── */

export type LeadSource =
  | 'HOMEPAGE'
  | 'EMPFEHLUNG'
  | 'MESSE'
  | 'TELEFON'
  | 'PARTNER'
  | 'SOCIAL_MEDIA'
  | 'INSERAT'

export type LeadStatus = 'ACTIVE' | 'CONVERTED' | 'LOST' | 'ARCHIVED'

export type KanbanBucket = 'neu' | 'kontaktiert' | 'qualifiziert' | 'angebot' | 'verhandlung'

export interface Lead {
  id: string
  firstName: string
  lastName: string
  company: string
  address: string
  phone: string
  email: string
  source: LeadSource
  status: LeadStatus
  pipelineId: string
  bucketId: KanbanBucket
  tags: string[]
  value: number
  assignedTo: string
  createdAt: string
  notes?: string
}

/* ── Mock Data ── */

export const mockLeads: Lead[] = [
  {
    id: '1',
    firstName: 'Thomas',
    lastName: 'Mueller',
    company: 'Mueller Immobilien AG',
    address: 'Bahnhofstrasse 42, 8001 Zuerich',
    phone: '+41 79 234 56 78',
    email: 't.mueller@mueller-immo.ch',
    source: 'HOMEPAGE',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'qualifiziert',
    tags: ['VIP', 'Dringend'],
    value: 85000,
    assignedTo: 'Marco Bianchi',
    createdAt: '2024-03-01',
    notes: 'Interesse an 30kWp Anlage fuer Mehrfamilienhaus.',
  },
  {
    id: '2',
    firstName: 'Sandra',
    lastName: 'Keller',
    company: 'Keller Holzbau GmbH',
    address: 'Spitalgasse 18, 3011 Bern',
    phone: '+41 78 345 67 89',
    email: 's.keller@keller-holzbau.ch',
    source: 'EMPFEHLUNG',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'angebot',
    tags: ['Gewerbe'],
    value: 120000,
    assignedTo: 'Laura Meier',
    createdAt: '2024-02-28',
    notes: 'Referenz von Elektro Schmid. Grosses Flachdach verfuegbar.',
  },
  {
    id: '3',
    firstName: 'Andreas',
    lastName: 'Brunner',
    company: 'Brunner & Soehne Elektro',
    address: 'Freie Strasse 7, 4001 Basel',
    phone: '+41 76 456 78 90',
    email: 'a.brunner@brunner-elektro.ch',
    source: 'MESSE',
    status: 'CONVERTED',
    pipelineId: '1',
    bucketId: 'verhandlung',
    tags: ['Bestandskunde'],
    value: 45000,
    assignedTo: 'Marco Bianchi',
    createdAt: '2024-02-15',
    notes: 'Kontakt von Solar Expo 2024. Eigenes Geschaeftsgebaeude.',
  },
  {
    id: '4',
    firstName: 'Claudia',
    lastName: 'Frei',
    company: '',
    address: 'Technikumstrasse 21, 8400 Winterthur',
    phone: '+41 79 567 89 01',
    email: 'c.frei@bluewin.ch',
    source: 'HOMEPAGE',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'neu',
    tags: ['Privat'],
    value: 32000,
    assignedTo: 'Laura Meier',
    createdAt: '2024-03-02',
    notes: 'Einfamilienhaus, Suedausrichtung. Interessiert an Batteriespeicher.',
  },
  {
    id: '5',
    firstName: 'Peter',
    lastName: 'Zimmermann',
    company: 'Hotel Alpina',
    address: 'Pilatusstrasse 5, 6003 Luzern',
    phone: '+41 77 678 90 12',
    email: 'p.zimmermann@hotel-alpina.ch',
    source: 'TELEFON',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'kontaktiert',
    tags: ['Gewerbe', 'Dringend'],
    value: 210000,
    assignedTo: 'Marco Bianchi',
    createdAt: '2024-02-20',
    notes: 'Grosses Hoteldach, ca. 800m2. Foerdermittel bereits beantragt.',
  },
  {
    id: '6',
    firstName: 'Monika',
    lastName: 'Huber',
    company: 'Huber Landtechnik',
    address: 'Rorschacher Strasse 150, 9000 St. Gallen',
    phone: '+41 71 789 01 23',
    email: 'm.huber@huber-landtechnik.ch',
    source: 'PARTNER',
    status: 'LOST',
    pipelineId: '1',
    bucketId: 'qualifiziert',
    tags: ['Landwirtschaft'],
    value: 65000,
    assignedTo: 'Laura Meier',
    createdAt: '2024-01-10',
    notes: 'Hat sich fuer Mitbewerber entschieden. Eventuell Nachfassgespraech.',
  },
  {
    id: '7',
    firstName: 'Reto',
    lastName: 'Steiner',
    company: 'Steiner Architekten',
    address: 'Laurenzenvorstadt 88, 5000 Aarau',
    phone: '+41 79 890 12 34',
    email: 'r.steiner@steiner-arch.ch',
    source: 'SOCIAL_MEDIA',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'neu',
    tags: ['Architektur', 'Neubau'],
    value: 150000,
    assignedTo: 'Marco Bianchi',
    createdAt: '2024-03-03',
    notes: 'Plant Neubau-Projekt mit integrierter PV-Anlage.',
  },
  {
    id: '8',
    firstName: 'Isabella',
    lastName: 'Weber',
    company: 'Weber Consulting',
    address: 'Bielstrasse 12, 4500 Solothurn',
    phone: '+41 76 901 23 45',
    email: 'i.weber@weber-consulting.ch',
    source: 'INSERAT',
    status: 'CONVERTED',
    pipelineId: '1',
    bucketId: 'verhandlung',
    tags: ['Buerogebaeude'],
    value: 55000,
    assignedTo: 'Laura Meier',
    createdAt: '2024-02-05',
    notes: 'Buerogebaeude mit Flachdach. Deal abgeschlossen.',
  },
  {
    id: '9',
    firstName: 'Marcel',
    lastName: 'Gerber',
    company: '',
    address: 'Seestrasse 33, 6004 Luzern',
    phone: '+41 78 012 34 56',
    email: 'm.gerber@gmx.ch',
    source: 'HOMEPAGE',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'kontaktiert',
    tags: ['Privat', 'Batteriespeicher'],
    value: 28000,
    assignedTo: 'Marco Bianchi',
    createdAt: '2024-02-25',
    notes: 'Rueckruf gewuenscht. Interesse an Komplettloesung mit Speicher.',
  },
  {
    id: '10',
    firstName: 'Franziska',
    lastName: 'Ammann',
    company: 'Gemeinde Wettingen',
    address: 'Rathausplatz 1, 5430 Wettingen',
    phone: '+41 56 123 45 67',
    email: 'f.ammann@wettingen.ch',
    source: 'TELEFON',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'angebot',
    tags: ['Oeffentlich', 'Grossanlage'],
    value: 340000,
    assignedTo: 'Laura Meier',
    createdAt: '2024-02-18',
    notes: 'Gemeindezentrum und Schulhaus. Oeffentliche Ausschreibung.',
  },
  {
    id: '11',
    firstName: 'Daniel',
    lastName: 'Schaerer',
    company: 'Schaerer Metallbau AG',
    address: 'Industriestrasse 45, 3600 Thun',
    phone: '+41 79 234 56 00',
    email: 'd.schaerer@schaerer-metall.ch',
    source: 'MESSE',
    status: 'LOST',
    pipelineId: '1',
    bucketId: 'angebot',
    tags: ['Industrie'],
    value: 95000,
    assignedTo: 'Marco Bianchi',
    createdAt: '2024-01-25',
    notes: 'Budget wurde intern nicht freigegeben. Vielleicht naechstes Jahr.',
  },
  {
    id: '12',
    firstName: 'Nadine',
    lastName: 'Roth',
    company: 'BioFarm Roth',
    address: 'Dorfstrasse 8, 8200 Schaffhausen',
    phone: '+41 77 345 67 00',
    email: 'n.roth@biofarm-roth.ch',
    source: 'EMPFEHLUNG',
    status: 'ACTIVE',
    pipelineId: '1',
    bucketId: 'qualifiziert',
    tags: ['Landwirtschaft', 'Nachhaltig'],
    value: 78000,
    assignedTo: 'Laura Meier',
    createdAt: '2024-03-01',
    notes: 'Bio-Bauernhof mit grosser Scheunenflaeche. Empfehlung Huber.',
  },
]

/* ── Source Display Mapping ── */

export const sourceLabels: Record<LeadSource, string> = {
  HOMEPAGE: 'Homepage',
  EMPFEHLUNG: 'Empfehlung',
  MESSE: 'Messe',
  TELEFON: 'Telefon',
  PARTNER: 'Partner',
  SOCIAL_MEDIA: 'Social Media',
  INSERAT: 'Inserat',
}

export const statusLabels: Record<LeadStatus, string> = {
  ACTIVE: 'Aktiv',
  CONVERTED: 'Konvertiert',
  LOST: 'Verloren',
  ARCHIVED: 'Archiviert',
}

/* ── Filter Tab Type ── */

type StatusFilter = 'ALL' | 'ACTIVE' | 'CONVERTED' | 'LOST'

/* ── Component ── */

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  /* ── Filtering ── */

  const filteredLeads = useMemo(() => {
    let result = mockLeads

    if (statusFilter !== 'ALL') {
      result = result.filter((l) => l.status === statusFilter)
    }

    if (sourceFilter !== 'ALL') {
      result = result.filter((l) => l.source === sourceFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (l) =>
          l.firstName.toLowerCase().includes(q) ||
          l.lastName.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q),
      )
    }

    return result
  }, [statusFilter, sourceFilter, searchQuery])

  /* ── Handlers ── */

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead)
    setPanelOpen(true)
  }

  const handleClosePanel = () => {
    setPanelOpen(false)
  }

  /* ── Status filter tabs ── */

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Alle' },
    { key: 'ACTIVE', label: 'Aktiv' },
    { key: 'CONVERTED', label: 'Konvertiert' },
    { key: 'LOST', label: 'Verloren' },
  ]

  /* ── Source options ── */

  const sourceOptions: { value: LeadSource | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Alle Quellen' },
    { value: 'HOMEPAGE', label: 'Homepage' },
    { value: 'EMPFEHLUNG', label: 'Empfehlung' },
    { value: 'MESSE', label: 'Messe' },
    { value: 'TELEFON', label: 'Telefon' },
    { value: 'PARTNER', label: 'Partner' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media' },
    { value: 'INSERAT', label: 'Inserat' },
  ]

  return (
    <>
      <div className="space-y-5">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, #60A5FA 12%, transparent), color-mix(in srgb, #60A5FA 4%, transparent))',
                border: '1px solid color-mix(in srgb, #60A5FA 10%, transparent)',
              }}
            >
              <Users size={20} className="text-blue" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-[-0.02em]">Lead Hub</h1>
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{
                    background: 'color-mix(in srgb, #60A5FA 12%, transparent)',
                    color: '#60A5FA',
                  }}
                >
                  {filteredLeads.length}
                </span>
              </div>
              <p className="text-[12px] text-text-sec mt-0.5">
                Leads verwalten und qualifizieren
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Toggle */}
            <div
              className="flex items-center rounded-full p-0.5"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  viewMode === 'list'
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                <List size={14} strokeWidth={2} />
                Liste
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  viewMode === 'kanban'
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                <Columns3 size={14} strokeWidth={2} />
                Kanban
              </button>
            </div>

            {/* New Lead Button */}
            <button
              type="button"
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-[13px]"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              Neuer Lead
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex items-center justify-between gap-4">
          {/* Status Tabs */}
          <div
            className="flex items-center rounded-full p-0.5"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={[
                  'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  statusFilter === tab.key
                    ? 'bg-amber-soft text-amber'
                    : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Source Dropdown */}
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as LeadSource | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: '140px' }}
              >
                {sourceOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={{ background: '#0B0F15', color: '#F0F2F5' }}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Leads durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 text-[12px] w-[220px]"
              />
            </div>
          </div>
        </div>

        {/* ── Content View ── */}
        {viewMode === 'list' ? (
          <LeadTable leads={filteredLeads} onSelectLead={handleSelectLead} />
        ) : (
          <LeadKanban leads={filteredLeads} onSelectLead={handleSelectLead} />
        )}
      </div>

      {/* ── Detail Panel ── */}
      <SlidePanel
        open={panelOpen}
        onClose={handleClosePanel}
        title={selectedLead ? `${selectedLead.firstName} ${selectedLead.lastName}` : ''}
        subtitle={selectedLead?.company || undefined}
        width="520px"
      >
        {selectedLead && <LeadDetailPanel lead={selectedLead} />}
      </SlidePanel>

      {/* ── Create Dialog ── */}
      {createDialogOpen && (
        <LeadCreateDialog onClose={() => setCreateDialogOpen(false)} />
      )}
    </>
  )
}
