import { FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import { useDocTemplates } from '@/hooks/useAdmin'
import { useState } from 'react'

const entityLabels: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Lead', color: '#34D399' },
  TERMIN: { label: 'Termin', color: '#60A5FA' },
  ANGEBOT: { label: 'Angebot', color: '#F59E0B' },
  PROJEKT: { label: 'Projekt', color: '#A78BFA' },
}

export default function DocumentTemplatesSection() {
  const { data: tplResponse } = useDocTemplates()
  const templates = tplResponse?.data ?? []
  const [expandedEntity, setExpandedEntity] = useState<string | null>('ANGEBOT')

  return (
    <div className="space-y-3">
      {templates.map((tpl) => {
        const entity = entityLabels[tpl.entityType] ?? { label: tpl.entityType, color: '#94A3B8' }
        const isExpanded = expandedEntity === tpl.entityType

        return (
          <div key={tpl.id} className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpandedEntity(isExpanded ? null : tpl.entityType)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} className="text-text-dim" /> : <ChevronRight size={14} className="text-text-dim" />}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${entity.color} 12%, transparent)` }}
              >
                <FolderOpen size={14} strokeWidth={1.8} style={{ color: entity.color }} />
              </div>
              <span className="text-[13px] font-bold">{entity.label}</span>
              <span className="text-[10px] text-text-dim ml-auto">{tpl.folders.length} Ordner</span>
            </button>

            {/* Folder Tree */}
            {isExpanded && (
              <div className="px-5 pb-4 border-t border-border pt-3">
                <div className="space-y-1.5 ml-4">
                  {tpl.folders.map((folder, fi) => (
                    <div key={fi}>
                      <div className="flex items-center gap-2 py-1">
                        <FolderOpen size={13} className="text-text-dim" strokeWidth={1.8} />
                        <span className="text-[12px] font-medium text-text">{folder.name}</span>
                      </div>
                      {folder.subfolders && folder.subfolders.length > 0 && (
                        <div className="ml-6 space-y-0.5">
                          {folder.subfolders.map((sub, si) => (
                            <div key={si} className="flex items-center gap-2 py-0.5">
                              <div className="w-3 border-l border-b border-border h-3 -mt-1.5" />
                              <span className="text-[11px] text-text-sec">{sub}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
