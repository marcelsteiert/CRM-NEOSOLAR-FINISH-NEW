import { useState, useMemo, useRef, useEffect } from 'react'
import { Phone, Mail, Search, ExternalLink, Save, X, ChevronDown, AlertCircle, Trophy, XCircle, Calendar, RefreshCw, MessageSquare, Bell, BellRing } from 'lucide-react'
import { useDeals, useUpdateDeal, formatCHF, type Deal, type DealStage } from '@/hooks/useDeals'
import { useUsers } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'

interface CallStatusDef {
  key: string
  label: string
  color: string
  bg: string
  icon: typeof Phone
}

const CALL_STATUSES: CallStatusDef[] = [
  { key: 'ERREICHT', label: 'Erreicht', color: '#34D399', bg: 'rgba(52,211,153,0.14)', icon: Phone },
  { key: 'NICHT_ERREICHT', label: 'Nicht erreicht', color: '#F87171', bg: 'rgba(248,113,113,0.14)', icon: PhoneOffIcon },
  { key: 'TERMIN', label: 'Termin vereinbart', color: '#A78BFA', bg: 'rgba(167,139,250,0.14)', icon: Calendar },
  { key: 'RUECKRUF', label: 'Rueckruf', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)', icon: RefreshCw },
  { key: 'KEIN_INTERESSE', label: 'Kein Interesse', color: '#94A3B8', bg: 'rgba(148,163,184,0.14)', icon: XCircle },
  { key: 'VERLOREN', label: 'Verloren', color: '#F87171', bg: 'rgba(248,113,113,0.14)', icon: XCircle },
  { key: 'GEWONNEN', label: 'Gewonnen', color: '#34D399', bg: 'rgba(52,211,153,0.14)', icon: Trophy },
]

function PhoneOffIcon(props: { size?: number; strokeWidth?: number; className?: string }) {
  return <Phone {...props} style={{ transform: 'rotate(135deg)' }} />
}

const STAGE_BADGE: Record<DealStage, { label: string; color: string }> = {
  ERSTELLT: { label: 'Erstellt', color: '#60A5FA' },
  GESENDET: { label: 'Gesendet', color: '#A78BFA' },
  FOLLOW_UP: { label: 'Follow-Up', color: '#F59E0B' },
  VERHANDLUNG: { label: 'Verhandlung', color: '#FB923C' },
  GEWONNEN: { label: 'Gewonnen', color: '#34D399' },
  VERLOREN: { label: 'Verloren', color: '#F87171' },
}

interface Props {
  onOpenDeal?: (dealId: string) => void
}

export default function AnruflisteView({ onOpenDeal }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'OFFEN_RUECKRUF'>('OPEN')
  const [assignedTo, setAssignedTo] = useState<string>('ALL')

  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GL'

  const { data: dealsResponse, isLoading } = useDeals({
    pageSize: 500,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })
  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data ?? []
  const updateDeal = useUpdateDeal()

  const allDeals = dealsResponse?.data ?? []

  const filtered = useMemo(() => {
    let items = allDeals
    // Standardmaessig offene (nicht gewonnen/verloren) Angebote
    if (filterStatus === 'OPEN') {
      items = items.filter((d) => d.stage !== 'GEWONNEN' && d.stage !== 'VERLOREN')
    } else if (filterStatus === 'OFFEN_RUECKRUF') {
      items = items.filter((d) => d.stage !== 'GEWONNEN' && d.stage !== 'VERLOREN' && (d.callStatus === 'RUECKRUF' || d.callStatus === null || !d.callStatus))
    }
    if (assignedTo !== 'ALL') {
      items = items.filter((d) => d.assignedTo === assignedTo)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((d) =>
        (d.contactName ?? '').toLowerCase().includes(q) ||
        (d.contactPhone ?? '').toLowerCase().includes(q) ||
        (d.contactEmail ?? '').toLowerCase().includes(q) ||
        (d.address ?? '').toLowerCase().includes(q) ||
        (d.title ?? '').toLowerCase().includes(q),
      )
    }
    // Neueste immer zuoberst (stabile Reihenfolge, auch nach Status-Updates)
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [allDeals, filterStatus, assignedTo, search])

  const setCallStatus = (dealId: string, status: string | null) => {
    updateDeal.mutate({
      id: dealId,
      callStatus: status,
      lastCalledAt: new Date().toISOString(),
    })
  }

  const setFollowUp = (dealId: string, date: string | null) => {
    updateDeal.mutate({ id: dealId, followUpDate: date })
  }

  return (
    <div className="space-y-3">
      {/* Filter-Leiste */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            className="glass-input w-full pl-9 text-xs"
            placeholder="Kunde / Telefon / E-Mail / Adresse suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status-Filter */}
        <div className="flex items-center rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { v: 'OPEN', label: 'Offene' },
            { v: 'OFFEN_RUECKRUF', label: 'Noch nicht angerufen' },
            { v: 'ALL', label: 'Alle' },
          ] as const).map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setFilterStatus(t.v)}
              className={`px-3 py-2 text-[11px] font-semibold transition-all whitespace-nowrap ${
                filterStatus === t.v ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="glass-input text-xs px-3 py-2 cursor-pointer min-w-[140px]"
          >
            <option value="ALL">Alle Verkaeufer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI-Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <KpiPill label="Insgesamt" value={filtered.length} color="#94A3B8" />
        <KpiPill
          label="Noch nicht angerufen"
          value={filtered.filter((d) => !d.callStatus).length}
          color="#94A3B8"
        />
        <KpiPill
          label="Erreicht"
          value={filtered.filter((d) => d.callStatus === 'ERREICHT' || d.callStatus === 'TERMIN').length}
          color="#34D399"
        />
        <KpiPill
          label="Nicht erreicht"
          value={filtered.filter((d) => d.callStatus === 'NICHT_ERREICHT').length}
          color="#F87171"
        />
        <KpiPill
          label="Rueckruf faellig"
          value={filtered.filter((d) => d.callStatus === 'RUECKRUF').length}
          color="#F59E0B"
        />
        <KpiPill
          label="Follow-up faellig"
          value={filtered.filter((d) => d.followUpDate && new Date(d.followUpDate) <= new Date()).length}
          color="#A78BFA"
        />
      </div>

      {/* Tabelle */}
      {isLoading && <div className="glass-card p-12 text-center text-text-dim text-sm">Anrufliste wird geladen...</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="glass-card p-12 text-center text-text-dim text-sm">Keine Angebote gefunden</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-border bg-bg-sub">
                  <Th sticky>Kunde</Th>
                  <Th>Adresse</Th>
                  <Th>Telefon</Th>
                  <Th>E-Mail</Th>
                  <Th>Offerte</Th>
                  <Th>Pipeline-Stage</Th>
                  <Th>Anruf-Status</Th>
                  <Th>Letzter Anruf</Th>
                  <Th>Follow-up</Th>
                  <Th>Notiz</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal, idx) => (
                  <CallRow
                    key={deal.id}
                    deal={deal}
                    rowIdx={idx}
                    users={users}
                    onSetCallStatus={setCallStatus}
                    onSetFollowUp={setFollowUp}
                    onSaveNote={(note) => updateDeal.mutate({ id: deal.id, callNote: note })}
                    onOpenDeal={onOpenDeal}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

interface RowProps {
  deal: Deal
  rowIdx: number
  users: any[]
  onSetCallStatus: (id: string, status: string | null) => void
  onSetFollowUp: (id: string, date: string | null) => void
  onSaveNote: (note: string | null) => void
  onOpenDeal?: (dealId: string) => void
}

function CallRow({ deal, rowIdx, users, onSetCallStatus, onSetFollowUp, onSaveNote, onOpenDeal }: RowProps) {
  const [statusOpen, setStatusOpen] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState(deal.callNote ?? '')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setNoteDraft(deal.callNote ?? '') }, [deal.callNote])
  useEffect(() => { if (noteEditing) noteRef.current?.focus() }, [noteEditing])

  const verkaeufer = users.find((u) => u.id === deal.assignedTo)
  const stageDef = STAGE_BADGE[deal.stage]
  const callDef = CALL_STATUSES.find((s) => s.key === deal.callStatus)
  const lastCalled = deal.lastCalledAt ? new Date(deal.lastCalledAt) : null
  const lastCalledStr = lastCalled
    ? lastCalled.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '–'

  const saveNote = () => {
    setNoteEditing(false)
    if (noteDraft.trim() !== (deal.callNote ?? '')) {
      onSaveNote(noteDraft.trim() || null)
    }
  }

  return (
    <tr
      className="border-b border-border/40 hover:bg-surface-hover/30 transition-colors"
      style={rowIdx % 2 === 1 ? { background: 'rgba(255,255,255,0.012)' } : undefined}
    >
      <Td>
        <div className="min-w-[160px] max-w-[200px]">
          <button
            type="button"
            onClick={() => onOpenDeal?.(deal.id)}
            className="text-[12.5px] font-bold text-text hover:text-amber transition-colors text-left truncate block w-full"
            title={deal.contactName}
          >
            {deal.contactName || deal.title}
          </button>
          {verkaeufer && (
            <p className="text-[10px] text-text-dim mt-0.5">{verkaeufer.firstName} {verkaeufer.lastName}</p>
          )}
        </div>
      </Td>

      <Td>
        <span className="text-[11px] text-text-sec block min-w-[180px] max-w-[260px]" title={deal.address}>
          {deal.address || '–'}
        </span>
      </Td>

      <Td>
        {deal.contactPhone ? (
          <a
            href={`tel:${deal.contactPhone}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-300 hover:text-blue-200 transition-colors"
            title="Anrufen"
          >
            <Phone size={12} strokeWidth={2} />
            {deal.contactPhone}
          </a>
        ) : <span className="text-text-dim">–</span>}
      </Td>

      <Td>
        {deal.contactEmail && !deal.contactEmail.includes('placeholder.local') ? (
          <a
            href={`mailto:${deal.contactEmail}`}
            className="text-[11px] text-text-sec hover:text-amber transition-colors flex items-center gap-1 max-w-[180px] truncate"
            title={deal.contactEmail}
          >
            <Mail size={11} strokeWidth={1.8} />
            <span className="truncate">{deal.contactEmail.split(',')[0]}</span>
          </a>
        ) : <span className="text-text-dim">–</span>}
      </Td>

      <Td>
        <span className="text-[12px] font-bold tabular-nums text-amber whitespace-nowrap">
          {formatCHF(deal.value)}
        </span>
      </Td>

      <Td>
        <span
          className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider"
          style={{ background: `color-mix(in srgb, ${stageDef.color} 14%, transparent)`, color: stageDef.color }}
        >
          {stageDef.label}
        </span>
      </Td>

      <Td>
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen(!statusOpen)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-bold uppercase tracking-wider transition-all hover:scale-105"
            style={callDef
              ? { background: callDef.bg, color: callDef.color }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
            }
          >
            {callDef
              ? <callDef.icon size={10} strokeWidth={2.5} />
              : <AlertCircle size={10} strokeWidth={2} />}
            {callDef ? callDef.label : 'Markieren'}
            <ChevronDown size={9} strokeWidth={2} />
          </button>

          {statusOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setStatusOpen(false)} />
              <div
                className="absolute top-full mt-1 left-0 z-40 rounded-lg overflow-hidden shadow-2xl min-w-[180px]"
                style={{
                  background: 'linear-gradient(180deg, #0F172A 0%, #0A0E1F 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {CALL_STATUSES.map((s) => {
                  const Icon = s.icon
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => { onSetCallStatus(deal.id, s.key); setStatusOpen(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-[11px] font-semibold hover:bg-white/[0.04] transition-colors text-left"
                      style={{ color: s.color }}
                    >
                      <Icon size={12} strokeWidth={2} />
                      {s.label}
                    </button>
                  )
                })}
                {deal.callStatus && (
                  <button
                    type="button"
                    onClick={() => { onSetCallStatus(deal.id, null); setStatusOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-[11px] font-semibold text-text-dim hover:bg-white/[0.04] transition-colors text-left border-t border-border/50"
                  >
                    <X size={12} strokeWidth={2} />
                    Zuruecksetzen
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </Td>

      <Td>
        <span className="text-[11px] text-text-dim tabular-nums whitespace-nowrap">
          {lastCalledStr}
        </span>
      </Td>

      <Td>
        <FollowUpButton
          followUpDate={deal.followUpDate}
          open={followUpOpen}
          onToggle={() => setFollowUpOpen(!followUpOpen)}
          onClose={() => setFollowUpOpen(false)}
          onSet={(date) => { onSetFollowUp(deal.id, date); setFollowUpOpen(false) }}
        />
      </Td>

      <Td>
        {noteEditing ? (
          <div className="flex items-start gap-1 min-w-[200px] max-w-[260px]">
            <textarea
              ref={noteRef}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={saveNote}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() }
                if (e.key === 'Escape') { setNoteDraft(deal.callNote ?? ''); setNoteEditing(false) }
              }}
              className="glass-input flex-1 text-[11px] px-2 py-1 resize-none"
              rows={2}
              placeholder="Notiz..."
            />
            <button type="button" onClick={saveNote} className="text-emerald-400 p-0.5">
              <Save size={11} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNoteEditing(true)}
            className="text-[11px] text-text-sec hover:text-amber transition-colors text-left max-w-[260px] line-clamp-2 flex items-start gap-1"
          >
            {deal.callNote ? (
              <>
                <MessageSquare size={10} strokeWidth={1.8} className="text-amber shrink-0 mt-0.5" />
                <span className="line-clamp-2">{deal.callNote}</span>
              </>
            ) : (
              <span className="text-text-dim italic">+ Notiz hinzufuegen</span>
            )}
          </button>
        )}
      </Td>

      <Td>
        <button
          type="button"
          onClick={() => onOpenDeal?.(deal.id)}
          className="text-text-dim hover:text-amber p-1"
          title="Detail oeffnen"
        >
          <ExternalLink size={12} strokeWidth={1.8} />
        </button>
      </Td>
    </tr>
  )
}

function Th({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <th
      className={`px-3 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-dim text-left whitespace-nowrap ${
        sticky ? 'sticky left-0 bg-bg-sub z-30' : ''
      }`}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5 align-top">{children}</td>
}

function KpiPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="px-3 py-2 rounded-lg flex items-center justify-between"
      style={{ background: `color-mix(in srgb, ${color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 18%, transparent)` }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
      <span className="text-[14px] font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}

function addDays(days: number): string {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface FollowUpButtonProps {
  followUpDate: string | null
  open: boolean
  onToggle: () => void
  onClose: () => void
  onSet: (date: string | null) => void
}

function FollowUpButton({ followUpDate, open, onToggle, onClose, onSet }: FollowUpButtonProps) {
  const hasDate = !!followUpDate
  const date = followUpDate ? new Date(followUpDate) : null
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const overdue = date && date < now
  const daysLeft = date ? Math.round((date.getTime() - now.getTime()) / (24 * 3600 * 1000)) : 0

  const labelText = !date
    ? '+ Reminder'
    : overdue
      ? `Faellig (${Math.abs(daysLeft)}T)`
      : daysLeft === 0
        ? 'Heute'
        : daysLeft === 1
          ? 'Morgen'
          : `in ${daysLeft} Tagen`

  const fg = !hasDate ? 'rgba(255,255,255,0.4)' : overdue ? '#F87171' : '#A78BFA'
  const bg = !hasDate
    ? 'rgba(255,255,255,0.05)'
    : overdue
      ? 'rgba(248,113,113,0.14)'
      : 'rgba(167,139,250,0.14)'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold transition-all hover:scale-105 whitespace-nowrap"
        style={{ background: bg, color: fg }}
        title={date ? `Follow-up am ${date.toLocaleDateString('de-CH')}` : 'Reminder setzen'}
      >
        {overdue ? <BellRing size={10} strokeWidth={2.5} /> : <Bell size={10} strokeWidth={2.5} />}
        {labelText}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <div
            className="absolute top-full mt-1 left-0 z-40 rounded-lg overflow-hidden shadow-2xl min-w-[200px] p-1"
            style={{
              background: 'linear-gradient(180deg, #0F172A 0%, #0A0E1F 100%)',
              border: '1px solid rgba(167,139,250,0.20)',
            }}
          >
            <div className="px-2 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-text-dim">Reminder setzen</div>
            <PresetBtn label="Morgen" onClick={() => onSet(addDays(1))} />
            <PresetBtn label="In 3 Tagen" onClick={() => onSet(addDays(3))} />
            <PresetBtn label="In 1 Woche" onClick={() => onSet(addDays(7))} />
            <PresetBtn label="In 2 Wochen" onClick={() => onSet(addDays(14))} />
            <div className="border-t border-border/40 mt-1 pt-1 px-1">
              <label className="block text-[9.5px] uppercase tracking-wider text-text-dim mb-1">Custom-Datum</label>
              <input
                type="date"
                value={followUpDate?.split('T')[0] ?? ''}
                onChange={(e) => onSet(e.target.value || null)}
                className="glass-input w-full text-[11px] px-2 py-1"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {hasDate && (
              <button
                type="button"
                onClick={() => onSet(null)}
                className="flex items-center gap-1.5 w-full px-2.5 py-1.5 mt-1 text-[10.5px] font-semibold text-red hover:bg-red/10 rounded transition-colors"
              >
                <X size={10} strokeWidth={2.5} />
                Reminder entfernen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-[10.5px] font-semibold text-violet-300 hover:bg-violet-400/10 rounded transition-colors text-left"
    >
      <Calendar size={10} strokeWidth={2.5} />
      {label}
    </button>
  )
}
