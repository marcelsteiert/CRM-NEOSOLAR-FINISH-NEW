import { useState } from 'react'
import { Sparkles, User, FileText, Briefcase, Clock, Zap, ChevronDown, RefreshCw, History, AlertTriangle } from 'lucide-react'
import { useGenerateLeadSummary, useGenerateDealSummary, useGenerateContactSummary, useGenerateBriefing, useFollowUpCheck, useAiHistory } from '@/hooks/useAi'
import { useAiSettings } from '@/hooks/useAdmin'
import { useLeads } from '@/hooks/useLeads'
import { useDeals } from '@/hooks/useDeals'
import { api } from '@/lib/api'

export default function AiSummaryPage() {
  const { data: settingsRes } = useAiSettings()
  const settings = settingsRes?.data
  const { data: historyRes } = useAiHistory({ limit: 15 })
  const history = historyRes?.data ?? []

  const { data: leadsRes } = useLeads()
  const leads = leadsRes?.data ?? []
  const { data: dealsRes } = useDeals()
  const deals = dealsRes?.data ?? []

  const leadSummary = useGenerateLeadSummary()
  const dealSummary = useGenerateDealSummary()
  const contactSummary = useGenerateContactSummary()
  const briefing = useGenerateBriefing()
  const followUpCheck = useFollowUpCheck()

  const [selectedLead, setSelectedLead] = useState('')
  const [selectedDeal, setSelectedDeal] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState('')
  const [activeResult, setActiveResult] = useState<{ title: string; text: string; model?: string; tokens?: number; duration?: number } | null>(null)

  // Kontakt-Suche ueber Search API
  const searchContacts = async (q: string) => {
    setContactSearch(q)
    if (q.length < 2) { setContactResults([]); return }
    try {
      const res = await api.get<{ data: any[] }>(`/search?q=${encodeURIComponent(q)}`)
      setContactResults(res?.data ?? [])
    } catch { setContactResults([]) }
  }

  const isConfigured = settings?.enabled && settings?.apiKey && settings.apiKey !== ''

  const handleLeadSummary = async () => {
    if (!selectedLead) return
    const res = await leadSummary.mutateAsync(selectedLead)
    const d = res?.data
    if (d?.summary) {
      const lead = leads.find((l: any) => l.id === selectedLead)
      setActiveResult({ title: `Lead: ${lead?.title || 'Unbekannt'}`, text: d.summary, model: d.model, tokens: d.tokensUsed, duration: d.durationMs })
    } else if (d?.error) {
      setActiveResult({ title: 'Fehler', text: d.error })
    }
  }

  const handleDealSummary = async () => {
    if (!selectedDeal) return
    const res = await dealSummary.mutateAsync(selectedDeal)
    const d = res?.data
    if (d?.summary) {
      const deal = deals.find((dl: any) => dl.id === selectedDeal)
      setActiveResult({ title: `Angebot: ${deal?.title || 'Unbekannt'}`, text: d.summary, model: d.model, tokens: d.tokensUsed, duration: d.durationMs })
    } else if (d?.error) {
      setActiveResult({ title: 'Fehler', text: d.error })
    }
  }

  const handleContactSummary = async () => {
    if (!selectedContact) return
    const res = await contactSummary.mutateAsync(selectedContact)
    const d = res?.data
    if (d?.summary) {
      const contact = contactResults.find((c: any) => c.contactId === selectedContact)
      setActiveResult({ title: `Kontakt: ${contact?.contactName || 'Unbekannt'}`, text: d.summary, model: d.model, tokens: d.tokensUsed, duration: d.durationMs })
    } else if (d?.error) {
      setActiveResult({ title: 'Fehler', text: d.error })
    }
  }

  const handleBriefing = async () => {
    const res = await briefing.mutateAsync()
    const d = res?.data
    if (d?.summary) {
      setActiveResult({ title: 'Tages-Briefing', text: d.summary, model: d.model, tokens: d.tokensUsed, duration: d.durationMs })
    } else if (d?.error) {
      setActiveResult({ title: 'Fehler', text: d.error })
    }
  }

  const handleFollowUpCheck = async () => {
    const res = await followUpCheck.mutateAsync()
    const d = res?.data
    if (d?.summary) {
      setActiveResult({ title: `Follow-Up Check (${d.items?.length || 0} Items)`, text: d.summary, model: d.model, tokens: d.tokensUsed, duration: d.durationMs })
    } else if (d?.error) {
      setActiveResult({ title: 'Fehler', text: d.error })
    }
  }

  const isAnyLoading = leadSummary.isPending || dealSummary.isPending || contactSummary.isPending || briefing.isPending || followUpCheck.isPending

  const entityTypeLabels: Record<string, string> = {
    LEAD: 'Lead',
    DEAL: 'Angebot',
    CONTACT: 'Kontakt',
    BRIEFING: 'Briefing',
    FOLLOW_UP: 'Follow-Up',
    EMAIL_DRAFT: 'E-Mail',
    EMAIL_REPLY: 'Antwort',
  }

  return (
    <div className="p-4 sm:p-5 md:p-7 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)' }}
          >
            <Sparkles size={20} strokeWidth={1.8} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-text">KI-Summary System</h1>
            <p className="text-[11px] text-text-sec">Automatische Zusammenfassungen und Analysen fuer das gesamte CRM</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div
        className="glass-card p-4 mb-5 flex items-center gap-3"
        style={{ borderRadius: 'var(--radius-lg)', borderLeft: `3px solid ${isConfigured ? '#34D399' : '#F87171'}` }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: isConfigured ? '#34D399' : '#F87171', boxShadow: `0 0 8px ${isConfigured ? '#34D39960' : '#F8717160'}` }}
        />
        <span className="text-[12px] text-text-sec">
          {isConfigured
            ? `KI aktiv – Modell: ${settings?.model || 'k.A.'}`
            : 'KI nicht konfiguriert – Bitte API-Key unter Admin > KI-Einstellungen hinterlegen'}
        </span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {/* Lead Summary */}
        <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-blue-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-sec">Lead-Zusammenfassung</span>
          </div>
          <div className="relative mb-2">
            <select
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none appearance-none cursor-pointer pr-8"
            >
              <option value="" style={{ background: '#0B0F15' }}>Lead auswaehlen...</option>
              {leads.slice(0, 50).map((l: any) => (
                <option key={l.id} value={l.id} style={{ background: '#0B0F15' }}>{l.title} ({l.status})</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
          </div>
          <button
            onClick={handleLeadSummary}
            disabled={!selectedLead || leadSummary.isPending || !isConfigured}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <RefreshCw size={11} className={leadSummary.isPending ? 'animate-spin' : ''} />
            {leadSummary.isPending ? 'Generiert...' : 'Zusammenfassen'}
          </button>
        </div>

        {/* Deal Summary */}
        <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={14} className="text-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-sec">Angebots-Analyse</span>
          </div>
          <div className="relative mb-2">
            <select
              value={selectedDeal}
              onChange={(e) => setSelectedDeal(e.target.value)}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none appearance-none cursor-pointer pr-8"
            >
              <option value="" style={{ background: '#0B0F15' }}>Angebot auswaehlen...</option>
              {deals.slice(0, 50).map((d: any) => (
                <option key={d.id} value={d.id} style={{ background: '#0B0F15' }}>{d.title} ({d.stage})</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
          </div>
          <button
            onClick={handleDealSummary}
            disabled={!selectedDeal || dealSummary.isPending || !isConfigured}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <RefreshCw size={11} className={dealSummary.isPending ? 'animate-spin' : ''} />
            {dealSummary.isPending ? 'Analysiert...' : 'Analysieren'}
          </button>
        </div>

        {/* Contact Summary */}
        <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-violet-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-sec">Kontakt-Uebersicht</span>
          </div>
          <div className="relative mb-2">
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => searchContacts(e.target.value)}
              placeholder="Kontakt suchen (Name, E-Mail, Firma)..."
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none"
            />
            {contactResults.length > 0 && contactSearch.length >= 2 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border overflow-hidden" style={{ background: '#0B0F15' }}>
                {contactResults.slice(0, 8).map((c: any) => (
                  <button
                    key={c.contactId}
                    type="button"
                    onClick={() => { setSelectedContact(c.contactId); setContactSearch(c.contactName); setContactResults([]) }}
                    className={`w-full text-left px-3 py-2 text-[11px] hover:bg-white/[0.04] transition-colors ${selectedContact === c.contactId ? 'bg-white/[0.06] text-amber-400' : 'text-text-sec'}`}
                  >
                    {c.contactName} {c.company ? `(${c.company})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleContactSummary}
            disabled={!selectedContact || contactSummary.isPending || !isConfigured}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}
          >
            <RefreshCw size={11} className={contactSummary.isPending ? 'animate-spin' : ''} />
            {contactSummary.isPending ? 'Generiert...' : 'Zusammenfassen'}
          </button>
        </div>

        {/* Daily Briefing */}
        <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-sec">Tages-Briefing</span>
          </div>
          <p className="text-[11px] text-text-dim mb-2">
            KI-generiertes Briefing basierend auf Pipeline, Aufgaben und Terminen.
          </p>
          <button
            onClick={handleBriefing}
            disabled={briefing.isPending || !isConfigured}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <RefreshCw size={11} className={briefing.isPending ? 'animate-spin' : ''} />
            {briefing.isPending ? 'Generiert...' : 'Briefing generieren'}
          </button>
        </div>

        {/* Follow-Up Check */}
        <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-sec">Follow-Up Check</span>
          </div>
          <p className="text-[11px] text-text-dim mb-2">
            Analysiert ueberfaellige Follow-Ups und gibt konkrete Handlungsempfehlungen.
          </p>
          <button
            onClick={handleFollowUpCheck}
            disabled={followUpCheck.isPending || !isConfigured}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <RefreshCw size={11} className={followUpCheck.isPending ? 'animate-spin' : ''} />
            {followUpCheck.isPending ? 'Prueft...' : 'Follow-Ups pruefen'}
          </button>
        </div>
      </div>

      {/* Active Result */}
      {activeResult && (
        <div
          className="glass-card p-5 mb-5"
          style={{
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(59,130,246,0.04))',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-[13px] font-bold text-text">{activeResult.title}</span>
            </div>
            {activeResult.model && (
              <div className="flex items-center gap-3 text-[9px] text-text-dim">
                <span>{activeResult.model}</span>
                {activeResult.tokens && <span>{activeResult.tokens} Tokens</span>}
                {activeResult.duration && <span>{(activeResult.duration / 1000).toFixed(1)}s</span>}
              </div>
            )}
          </div>
          <p className="text-[12px] text-white/80 leading-relaxed whitespace-pre-line">{activeResult.text}</p>
        </div>
      )}

      {/* Loading */}
      {isAnyLoading && !activeResult && (
        <div className="glass-card p-8 mb-5 flex flex-col items-center justify-center" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-[12px] text-text-sec">KI analysiert die Daten...</span>
        </div>
      )}

      {/* History */}
      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-2 mb-4">
          <History size={14} className="text-text-sec" />
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-text-sec">Generierungshistorie</h2>
          <span className="text-[10px] text-text-dim ml-auto">{historyRes?.total ?? 0} Eintraege</span>
        </div>

        {history.length === 0 ? (
          <p className="text-[11px] text-text-dim text-center py-6">Noch keine KI-Generierungen vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry: any) => (
              <button
                key={entry.id}
                type="button"
                className="w-full text-left p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
                style={{ background: 'rgba(255,255,255,0.015)' }}
                onClick={() => setActiveResult({
                  title: entry.promptSummary || entityTypeLabels[entry.entityType] || entry.entityType,
                  text: entry.result,
                  model: entry.model,
                  tokens: entry.tokensUsed,
                  duration: entry.durationMs,
                })}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded"
                      style={{
                        background: entry.entityType === 'LEAD' ? 'rgba(59,130,246,0.12)' :
                          entry.entityType === 'DEAL' ? 'rgba(52,211,153,0.12)' :
                          entry.entityType === 'CONTACT' ? 'rgba(167,139,250,0.12)' :
                          'rgba(245,158,11,0.12)',
                        color: entry.entityType === 'LEAD' ? '#60A5FA' :
                          entry.entityType === 'DEAL' ? '#34D399' :
                          entry.entityType === 'CONTACT' ? '#A78BFA' :
                          '#F59E0B',
                      }}
                    >
                      {entityTypeLabels[entry.entityType] || entry.entityType}
                    </span>
                    <span className="text-[11px] text-text">{entry.promptSummary || 'Zusammenfassung'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-text-dim">
                    <Clock size={9} />
                    {new Date(entry.createdAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <p className="text-[10px] text-text-dim line-clamp-2">{entry.result}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
