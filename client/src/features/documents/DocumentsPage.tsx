import { useState, useMemo } from 'react'
import {
  FileBox, Search, File, Image, FileText, Trash2, Download, FolderOpen, Filter, Eye,
  FileSignature, Calendar, Building2, Zap, Coins, BookOpen, FolderQuestion,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatFileSize, type Document } from '@/hooks/useDocuments'
import FileViewer, { type ViewerFile } from '@/components/ui/FileViewer'

// ── Feste Ordner-Struktur (NeoSolar Standard, identisch zu DocumentSection) ──
const FOLDERS: { id: string; label: string; color: string; icon: typeof FileText }[] = [
  { id: 'Verträge',              label: 'Verträge',              color: '#F59E0B', icon: FileSignature },
  { id: 'Termin',                label: 'Termin',                color: '#60A5FA', icon: Calendar },
  { id: 'Gemeinde',              label: 'Gemeinde',              color: '#A78BFA', icon: Building2 },
  { id: 'Elektro',               label: 'Elektro',               color: '#FBBF24', icon: Zap },
  { id: 'Förderungen',           label: 'Förderungen',           color: '#34D399', icon: Coins },
  { id: 'Anlagendokumentation',  label: 'Anlagendokumentation',  color: '#22D3EE', icon: BookOpen },
]
const UNASSIGNED = { id: '__unassigned__', label: 'Sonstiges', color: '#94A3B8', icon: FolderQuestion }

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image size={16} strokeWidth={1.8} className="text-blue-400" />
  if (mimeType === 'application/pdf') return <FileText size={16} strokeWidth={1.8} className="text-red-400" />
  return <File size={16} strokeWidth={1.8} className="text-white/40" />
}

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [filterFolder, setFilterFolder] = useState<string>('')
  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: () => api.get<{ data: Document[]; total: number }>(`/documents`),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const docs = useMemo(() => {
    let all = data?.data ?? []
    if (filterFolder) {
      if (filterFolder === UNASSIGNED.id) {
        all = all.filter(d => !d.folderPath || !FOLDERS.some(f => f.id === d.folderPath))
      } else {
        all = all.filter(d => d.folderPath === filterFolder)
      }
    }
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter(d =>
      d.fileName.toLowerCase().includes(q) ||
      (d.folderPath ?? '').toLowerCase().includes(q) ||
      (d.notes ?? '').toLowerCase().includes(q)
    )
  }, [data, search, filterFolder])

  // Gruppierung nach Ordner (folder_path)
  const grouped = useMemo(() => {
    const map: Record<string, Document[]> = {}
    docs.forEach(d => {
      const key = d.folderPath && FOLDERS.some(f => f.id === d.folderPath)
        ? d.folderPath
        : UNASSIGNED.id
      if (!map[key]) map[key] = []
      map[key].push(d)
    })
    return map
  }, [docs])

  // Reihenfolge der Anzeige: feste Ordner in definierter Reihenfolge, "Sonstiges" zuletzt
  const orderedKeys = useMemo(() => {
    const keys: string[] = []
    FOLDERS.forEach(f => { if (grouped[f.id]?.length) keys.push(f.id) })
    if (grouped[UNASSIGNED.id]?.length) keys.push(UNASSIGNED.id)
    return keys
  }, [grouped])

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
            Alle Dokumente kategorisiert nach Verträge, Termin, Gemeinde, Elektro, Förderungen und Anlagendokumentation
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
            value={filterFolder}
            onChange={e => setFilterFolder(e.target.value)}
          >
            <option value="">Alle Ordner</option>
            {FOLDERS.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
            <option value={UNASSIGNED.id}>{UNASSIGNED.label}</option>
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
          <p className="text-[11px] text-white/20 mt-1">Dokumente werden in den Detail-Modals (Lead, Termin, Angebot, Projekt) hochgeladen</p>
        </div>
      )}

      {/* Gruppierte Dokumente */}
      {orderedKeys.map(key => {
        const folder = FOLDERS.find(f => f.id === key) ?? UNASSIGNED
        const FolderIcon = folder.icon
        const folderDocs = grouped[key] ?? []

        return (
          <div key={key} className="glass-card overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${folder.color} 12%, transparent)` }}
              >
                <FolderIcon size={16} strokeWidth={1.8} style={{ color: folder.color }} />
              </div>
              <h3 className="text-sm font-medium text-white">{folder.label}</h3>
              <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded">
                {folderDocs.length}
              </span>
            </div>

            <div className="divide-y divide-white/[0.03]">
              {folderDocs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => {
                    if (doc.downloadUrl) setViewerFile({ id: doc.id, fileName: doc.fileName, fileSize: doc.fileSize, mimeType: doc.mimeType, downloadUrl: doc.downloadUrl, createdAt: doc.createdAt })
                  }}
                >
                  <FileIcon mimeType={doc.mimeType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/25">{formatFileSize(doc.fileSize)}</span>
                      <span className="text-[10px] text-white/25">
                        · {new Date(doc.createdAt).toLocaleDateString('de-CH')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.downloadUrl && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewerFile({ id: doc.id, fileName: doc.fileName, fileSize: doc.fileSize, mimeType: doc.mimeType, downloadUrl: doc.downloadUrl, createdAt: doc.createdAt }) }}
                        className="p-1.5 rounded hover:bg-white/[0.05] text-white/30 hover:text-white/60"
                        title="Vorschau"
                      >
                        <Eye size={14} strokeWidth={1.8} />
                      </button>
                    )}
                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded hover:bg-white/[0.05] text-white/30 hover:text-white/60"
                        title="Herunterladen"
                      >
                        <Download size={14} strokeWidth={1.8} />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Dokument löschen?')) deleteMut.mutate(doc.id) }}
                      className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400"
                      title="Löschen"
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

      {/* ── Datei-Viewer ── */}
      {viewerFile && (
        <FileViewer
          file={viewerFile}
          files={docs
            .filter((d) => d.downloadUrl)
            .map((d) => ({
              id: d.id,
              fileName: d.fileName,
              fileSize: d.fileSize,
              mimeType: d.mimeType,
              downloadUrl: d.downloadUrl,
              createdAt: d.createdAt,
            }))}
          onClose={() => setViewerFile(null)}
          onNavigate={(f) => setViewerFile(f)}
        />
      )}
    </div>
  )
}
