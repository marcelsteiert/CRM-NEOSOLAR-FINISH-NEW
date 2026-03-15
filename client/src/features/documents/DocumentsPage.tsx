import { useState, useMemo } from 'react'
import { FileBox, Search, File, Image, FileText, Trash2, Download, FolderOpen, Filter } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatFileSize, type EntityType, entityTypeLabels, type Document } from '@/hooks/useDocuments'

const ENTITY_TYPES: EntityType[] = ['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT']

const entityColors: Record<EntityType, string> = {
  LEAD: '#F59E0B',
  TERMIN: '#22D3EE',
  ANGEBOT: '#34D399',
  PROJEKT: '#A78BFA',
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image size={16} strokeWidth={1.8} className="text-blue-400" />
  if (mimeType === 'application/pdf') return <FileText size={16} strokeWidth={1.8} className="text-red-400" />
  return <File size={16} strokeWidth={1.8} className="text-white/40" />
}

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<EntityType | ''>('')
  const qc = useQueryClient()

  // Alle Dokumente laden (ohne contactId-Filter = systemweit)
  const { data, isLoading } = useQuery({
    queryKey: ['documents', 'all', filterType],
    queryFn: () => {
      const params = filterType ? `?entityType=${filterType}` : ''
      return api.get<{ data: Document[]; total: number }>(`/documents${params}`)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const docs = useMemo(() => {
    const all = data?.data ?? []
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter(d =>
      d.fileName.toLowerCase().includes(q) ||
      (d.folderPath ?? '').toLowerCase().includes(q) ||
      (d.notes ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  // Gruppierung nach entityType
  const grouped = useMemo(() => {
    const map: Record<string, Document[]> = {}
    docs.forEach(d => {
      const key = d.entityType || 'SONSTIGE'
      if (!map[key]) map[key] = []
      map[key].push(d)
    })
    return map
  }, [docs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileBox size={20} strokeWidth={1.8} />
            Dokumentenablage
            {data && (
              <span className="text-[10px] bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full">
                {data.total} Dokumente
              </span>
            )}
          </h1>
          <p className="text-[11px] text-white/40 mt-0.5 hidden sm:block">
            Alle Dokumente aus Leads, Terminen, Angeboten und Projekten
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            className="glass-input w-full pl-9 text-xs"
            placeholder="Dokumente suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-white/30" />
          <select
            className="glass-input text-xs"
            value={filterType}
            onChange={e => setFilterType(e.target.value as EntityType | '')}
          >
            <option value="">Alle Phasen</option>
            {ENTITY_TYPES.map(t => (
              <option key={t} value={t}>{entityTypeLabels[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="glass-card p-12 text-center text-white/30 text-sm">Dokumente werden geladen...</div>
      )}

      {/* Leerer Zustand */}
      {!isLoading && docs.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FolderOpen size={32} className="mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/30">Keine Dokumente gefunden</p>
          <p className="text-[11px] text-white/20 mt-1">Dokumente werden aus Lead-, Termin-, Angebot- und Projekt-Modals hochgeladen</p>
        </div>
      )}

      {/* Gruppierte Dokumente */}
      {Object.entries(grouped).map(([type, typeDocs]) => {
        const label = entityTypeLabels[type as EntityType] ?? type
        const color = entityColors[type as EntityType] ?? '#9CA3AF'

        return (
          <div key={type} className="glass-card overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
              <div
                className="w-2 h-8 rounded-full"
                style={{ backgroundColor: color }}
              />
              <h3 className="text-sm font-medium text-white">{label}</h3>
              <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded">
                {typeDocs.length}
              </span>
            </div>

            <div className="divide-y divide-white/[0.03]">
              {typeDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                  <FileIcon mimeType={doc.mimeType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/25">{formatFileSize(doc.fileSize)}</span>
                      {doc.folderPath && (
                        <span className="text-[10px] text-white/25">· {doc.folderPath}</span>
                      )}
                      <span className="text-[10px] text-white/25">
                        · {new Date(doc.createdAt).toLocaleDateString('de-CH')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-white/[0.05] text-white/30 hover:text-white/60"
                      >
                        <Download size={14} strokeWidth={1.8} />
                      </a>
                    )}
                    <button
                      onClick={() => { if (confirm('Dokument löschen?')) deleteMut.mutate(doc.id) }}
                      className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400"
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
