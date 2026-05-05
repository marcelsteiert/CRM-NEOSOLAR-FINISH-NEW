import { useState, useRef, useCallback } from 'react'
import {
  FileText, Image, File, Upload, Trash2, Download,
  FolderOpen,
  Landmark, Shield, Truck, FileCheck2, Calculator, Cpu, Megaphone, FileType, HelpCircle,
} from 'lucide-react'
import {
  useInternalDocuments,
  useDeleteDocument,
  formatFileSize,
  getFileIcon,
  type Document,
  INTERNAL_VAULT_ID,
} from '@/hooks/useDocuments'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import FileViewer, { type ViewerFile } from './FileViewer'

// ── Firmenablage-Ordnerstruktur ──
const FOLDERS: { id: string; label: string; color: string; icon: typeof FileText }[] = [
  { id: 'Statuten / Gründung',         label: 'Statuten / Gründung',         color: '#A78BFA', icon: Landmark },
  { id: 'Versicherungen',              label: 'Versicherungen',              color: '#60A5FA', icon: Shield },
  { id: 'Lieferantenverträge',         label: 'Lieferantenverträge',         color: '#F59E0B', icon: Truck },
  { id: 'Bewilligungen / Lizenzen',    label: 'Bewilligungen / Lizenzen',    color: '#FBBF24', icon: FileCheck2 },
  { id: 'Buchhaltung / Steuern',       label: 'Buchhaltung / Steuern',       color: '#34D399', icon: Calculator },
  { id: 'IT / Software-Lizenzen',      label: 'IT / Software-Lizenzen',      color: '#22D3EE', icon: Cpu },
  { id: 'Marketing / Branding',        label: 'Marketing / Branding',        color: '#F472B6', icon: Megaphone },
  { id: 'Vorlagen / Templates',        label: 'Vorlagen / Templates',        color: '#FB923C', icon: FileType },
  { id: 'Sonstiges',                   label: 'Sonstiges',                   color: '#94A3B8', icon: HelpCircle },
]

const iconMap: Record<string, typeof FileText> = { image: Image, pdf: FileText, doc: FileText, file: File }
const iconColorMap: Record<string, string> = { image: '#60A5FA', pdf: '#F87171', doc: '#60A5FA', file: '#94A3B8' }

export default function InternalDocumentSection() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: docsRes } = useInternalDocuments()
  const deleteDoc = useDeleteDocument()
  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ [FOLDERS[0].id]: true })
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadFolderRef = useRef<string>(FOLDERS[0].id)

  const allDocs = docsRes?.data ?? []

  const toggleFolder = (folderId: string) =>
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }))

  const SUPABASE_URL = 'https://tzoquorcgygmrougevgm.supabase.co'
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b3F1b3JjZ3lnbXJvdWdldmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTEzODQsImV4cCI6MjA4ODM2NzM4NH0.79OVK4Zy0q08WvxOPpHZWrklcRWSmHYl2K3VPe1xZmU'

  const uploadFiles = useCallback(async (files: FileList | File[], folderPath: string) => {
    if (files.length === 0 || uploading) return
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress(`${i + 1}/${files.length}: ${file.name}`)
      try {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const safeFolder = folderPath.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
        const storagePath = `internal/${safeFolder}/${timestamp}_${safeName}`

        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        })

        if (!uploadRes.ok) {
          const errText = await uploadRes.text()
          throw new Error(`Storage: ${uploadRes.status} ${errText}`)
        }

        await api.post('/documents/metadata', {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          entityType: 'INTERNAL',
          entityId: INTERNAL_VAULT_ID,
          storagePath,
          folderPath,
          uploadedBy: user?.id,
        })
      } catch (err: any) {
        console.error('Upload fehlgeschlagen:', file.name, err?.message)
        setUploadProgress(`Fehler: ${file.name}`)
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    setUploading(false)
    setUploadProgress('')
    qc.invalidateQueries({ queryKey: ['documents'] })
  }, [user?.id, uploading, qc])

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolder(folderId)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverFolder(null)
  }
  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolder(null)
    if (e.dataTransfer.files?.length > 0) {
      uploadFiles(e.dataTransfer.files, folderId)
    }
  }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      uploadFiles(e.target.files, uploadFolderRef.current)
    }
    e.target.value = ''
  }

  const renderDoc = (doc: Document) => {
    const iconType = getFileIcon(doc.mimeType)
    const IconComp = iconMap[iconType] ?? File
    const iconColor = iconColorMap[iconType] ?? '#94A3B8'

    return (
      <div
        key={doc.id}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors group cursor-pointer"
        onClick={() => doc.downloadUrl && setViewerFile({ id: doc.id, fileName: doc.fileName, fileSize: doc.fileSize, mimeType: doc.mimeType, downloadUrl: doc.downloadUrl, createdAt: doc.createdAt })}
      >
        <div className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}>
          <IconComp size={12} strokeWidth={1.8} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-text-sec truncate">{doc.fileName}</p>
          <div className="flex items-center gap-1.5 text-[9px] text-text-dim">
            <span className="tabular-nums">{formatFileSize(doc.fileSize)}</span>
            <span>·</span>
            <span className="tabular-nums">{new Date(doc.createdAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
          </div>
        </div>
        {doc.downloadUrl && (
          <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-amber transition-all shrink-0" title="Herunterladen">
            <Download size={12} strokeWidth={1.8} />
          </a>
        )}
        {confirmDeleteId === doc.id ? (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => { deleteDoc.mutate(doc.id); setConfirmDeleteId(null) }} className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-red" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>Ja</button>
            <button onClick={() => setConfirmDeleteId(null)} className="px-1.5 py-0.5 rounded text-[9px] text-text-dim">Nein</button>
          </div>
        ) : (
          <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(doc.id) }} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-red transition-all shrink-0" title="Löschen">
            <Trash2 size={11} strokeWidth={1.8} />
          </button>
        )}
      </div>
    )
  }

  const unassignedDocs = allDocs.filter(d => !d.folderPath || !FOLDERS.some(f => f.id === d.folderPath))

  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer"
        style={{
          borderColor: dragOverFolder === '__global__' ? '#F59E0B' : 'rgba(255,255,255,0.08)',
          background: dragOverFolder === '__global__' ? 'color-mix(in srgb, #F59E0B 6%, transparent)' : 'rgba(255,255,255,0.02)',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOverFolder('__global__') }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => { e.preventDefault(); setDragOverFolder(null); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files, FOLDERS[0].id) }}
        onClick={() => { uploadFolderRef.current = FOLDERS[0].id; fileRef.current?.click() }}
      >
        <Upload size={18} className="text-text-dim shrink-0" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          {uploading ? (
            <p className="text-[12px] font-medium text-amber">{uploadProgress}</p>
          ) : (
            <>
              <p className="text-[12px] font-medium text-text-sec">Datei hochladen</p>
              <p className="text-[10px] text-text-dim">Drag & Drop in einen Ordner unten oder klicken (→ Statuten / Gründung)</p>
            </>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-1">
        Firmenablage ({allDocs.length})
      </div>

      {FOLDERS.map((folder) => {
        const folderDocs = allDocs.filter(d => d.folderPath === folder.id)
        const isExpanded = expandedFolders[folder.id]
        const isDragOver = dragOverFolder === folder.id
        const FolderIcon = folder.icon

        return (
          <div
            key={folder.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{
              background: isDragOver ? `color-mix(in srgb, ${folder.color} 6%, transparent)` : 'rgba(255,255,255,0.025)',
              border: isDragOver
                ? `2px dashed color-mix(in srgb, ${folder.color} 40%, transparent)`
                : '1px solid rgba(255,255,255,0.04)',
            }}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
          >
            <button
              type="button"
              onClick={() => toggleFolder(folder.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-hover/30 transition-colors"
            >
              {isExpanded
                ? <FolderOpen size={14} style={{ color: folder.color }} strokeWidth={1.8} />
                : <FolderIcon size={14} style={{ color: folder.color }} strokeWidth={1.8} />}
              <span className="text-[11px] font-bold" style={{ color: folder.color }}>{folder.label}</span>
              <span className="ml-auto text-[10px] text-text-dim tabular-nums">{folderDocs.length}</span>
            </button>

            {isExpanded && (
              <div className="px-2 pb-2 space-y-0.5">
                {folderDocs.length === 0 ? (
                  <p className="text-[10px] text-text-dim text-center py-3">
                    {isDragOver ? 'Hier ablegen' : 'Keine Dokumente'}
                  </p>
                ) : (
                  folderDocs.map(renderDoc)
                )}
                <button
                  type="button"
                  onClick={() => { uploadFolderRef.current = folder.id; fileRef.current?.click() }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium text-text-dim hover:text-amber hover:bg-amber-soft/30 transition-all"
                >
                  <Upload size={10} strokeWidth={2} />
                  Hochladen
                </button>
              </div>
            )}
          </div>
        )
      })}

      {unassignedDocs.length > 0 && (
        <div className="rounded-xl overflow-hidden transition-all" style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => toggleFolder('__legacy__')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-hover/30 transition-colors"
          >
            <HelpCircle size={14} style={{ color: '#94A3B8' }} strokeWidth={1.8} />
            <span className="text-[11px] font-bold text-text-dim">Nicht zugeordnet</span>
            <span className="ml-auto text-[10px] text-text-dim tabular-nums">{unassignedDocs.length}</span>
          </button>
          {expandedFolders['__legacy__'] && (
            <div className="px-2 pb-2 space-y-0.5">
              {unassignedDocs.map(renderDoc)}
            </div>
          )}
        </div>
      )}

      {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </div>
  )
}
