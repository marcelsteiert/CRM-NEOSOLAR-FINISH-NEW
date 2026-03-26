import { useState, useEffect } from 'react'
import { X, Merge, Check, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useDuplicates, useMergeDuplicates, type DuplicateGroup } from '@/hooks/useAdmin'

export default function DuplicateCheckModal({ onClose }: { onClose: () => void }) {
  const { data: dupResponse, refetch, isFetching } = useDuplicates(50)
  const mergeMutation = useMergeDuplicates()
  const [mergedGroups, setMergedGroups] = useState<Set<string>>(new Set())
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [autoMerging, setAutoMerging] = useState(false)
  const [autoProgress, setAutoProgress] = useState(0)

  useEffect(() => {
    refetch()
  }, [refetch])

  const groups: DuplicateGroup[] = (dupResponse?.data ?? []).filter(g => !mergedGroups.has(g.email))
  const total = dupResponse?.total ?? 0

  const handleMerge = async (group: DuplicateGroup) => {
    // Behalte den Kontakt mit den meisten Leads, bei Gleichstand den ältesten
    const sorted = [...group.contacts].sort((a, b) => {
      if (b.leadCount !== a.leadCount) return b.leadCount - a.leadCount
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    const keeper = sorted[0]
    const removeIds = sorted.slice(1).map(c => c.id)

    await mergeMutation.mutateAsync({ keepId: keeper.id, removeIds })
    setMergedGroups(prev => new Set(prev).add(group.email))
  }

  const handleAutoMergeAll = async () => {
    setAutoMerging(true)
    setAutoProgress(0)
    for (let i = 0; i < groups.length; i++) {
      try {
        await handleMerge(groups[i])
      } catch { /* skip errors */ }
      setAutoProgress(i + 1)
    }
    setAutoMerging(false)
    refetch()
  }

  const clean = (s: string | null | undefined) => {
    const v = s?.trim()
    return v && v !== '--' && v !== '-' ? v : ''
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[800px] max-h-[85vh] mx-2 sm:mx-4 flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)' }}>
              <Merge size={18} className="text-amber" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold">Duplikate prüfen</h2>
              <p className="text-[11px] text-text-dim">
                {isFetching ? 'Suche...' : `${total} Duplikat-Gruppen gefunden`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Auto-Merge Button */}
        {groups.length > 0 && !autoMerging && (
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber" />
              <span className="text-[12px] text-text-sec">
                {groups.length} Gruppen mit Duplikaten
              </span>
            </div>
            <button
              type="button"
              onClick={handleAutoMergeAll}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-[12px]"
            >
              <Merge size={14} />
              Alle automatisch zusammenführen
            </button>
          </div>
        )}

        {/* Auto-Merge Progress */}
        {autoMerging && (
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-amber" />
              <span className="text-[12px] text-text-sec">
                Zusammenführen... {autoProgress}/{groups.length + autoProgress}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full bg-amber transition-all duration-300"
                style={{ width: `${(autoProgress / Math.max(1, groups.length + autoProgress)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {isFetching && groups.length === 0 ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 size={20} className="animate-spin text-text-dim" />
              <span className="text-[13px] text-text-dim">Duplikate werden gesucht...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <Check size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-text">Keine Duplikate gefunden</p>
              <p className="text-[12px] text-text-dim mt-1">Alle Kontakte sind einzigartig.</p>
            </div>
          ) : (
            groups.map((group) => {
              const isExpanded = expandedGroup === group.email
              return (
                <div
                  key={group.email}
                  className="rounded-xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isExpanded ? null : group.email)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}
                      >
                        {group.contacts.length}
                      </span>
                      <span className="text-[12px] font-medium text-text truncate">{group.email}</span>
                      <span className="text-[10px] text-text-dim shrink-0">
                        {group.contacts.map(c => clean(c.firstName) || clean(c.lastName) ? `${clean(c.firstName)} ${clean(c.lastName)}`.trim() : '').filter(Boolean).join(', ') || 'Ohne Namen'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMerge(group) }}
                        disabled={mergeMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-amber hover:bg-amber-soft"
                        style={{ border: '1px solid rgba(245,158,11,0.2)' }}
                      >
                        <Merge size={12} />
                        Zusammenführen
                      </button>
                      {isExpanded ? <ChevronUp size={14} className="text-text-dim" /> : <ChevronDown size={14} className="text-text-dim" />}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1.5 border-t border-white/[0.04]">
                      <p className="text-[10px] text-text-dim uppercase font-bold tracking-wide pt-2 pb-1">
                        Kontakte ({group.contacts.length})
                      </p>
                      {group.contacts.map((c, i) => {
                        const isKeeper = i === 0 || c.leadCount > 0
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{
                              background: i === 0 ? 'color-mix(in srgb, #34D399 6%, transparent)' : 'rgba(255,255,255,0.02)',
                              border: i === 0 ? '1px solid color-mix(in srgb, #34D399 15%, transparent)' : '1px solid transparent',
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium">
                                  {clean(c.firstName) || clean(c.lastName) ? `${clean(c.firstName)} ${clean(c.lastName)}`.trim() : '–'}
                                </span>
                                {i === 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-500/15 text-emerald-400">
                                    Behalten
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-text-dim mt-0.5">
                                {c.phone && c.phone !== '--' && <span>{c.phone}</span>}
                                {c.company && <span>{c.company}</span>}
                                <span className="tabular-nums">{new Date(c.createdAt).toLocaleDateString('de-CH')}</span>
                                <span>{c.leadCount} Lead{c.leadCount !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
