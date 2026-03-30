import { useState, useRef, useCallback } from 'react'
import {
  FileText, Image, File, Upload, Trash2, Download, Eye,
  Folder, FolderOpen,
} from 'lucide-react'
import {
  useContactDocuments,
  useDeleteDocument,
  formatFileSize,
  getFileIcon,
  type EntityType,
  type Document,
} from '@/hooks/useDocuments'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import FileViewer, { type ViewerFile } from './FileViewer'

interface DocumentSectionProps {
  contactId: string
  entityType: EntityType
  entityId: string
}

const PHASES: { id: EntityType; label: string; color: string }[] = [
  { id: 'LEAD', label: 'Lead', color: '#94A3B8' },
  { id: 'TERMIN', label: 'Termin', color: '#60A5FA' },
  { id: 'ANGEBOT', label: 'Angebot', color: '#F59E0B' },
  { id: 'PROJEKT', label: 'Projekt', color: '#34D399' },
]

const iconMap: Record<string, typeof FileText> = { image: Image, pdf: FileText, doc: FileText, file: File }
const iconColorMap: Record<string, string> = { image: '#60A5FA', pdf: '#F87171', doc: '#60A5FA', file: '#94A3B8' }

export default function DocumentSection({ contactId, entityType, entityId }: DocumentSectionProps) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: docsRes } = useContactDocuments(contactId)
  const deleteDoc = useDeleteDocument()
  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ [entityType]: true })
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadPhase, setUploadPhase] = useState<EntityType>(entityType)

  const allDocs = docsRes?.data ?? []

  // Sortierte Phasen (aktuelle zuerst)
  const sortedPhases = [entityType, ...PHASES.map(p => p.id).filter(p => p !== entityType)]

  const togglePhase = (phase: string) => setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }))

  // ── Upload-Funktion (direkt Base64 → API) ──
  const uploadFiles = useCallback(async (files: FileList | File[], targetPhase: EntityType) => {
    if (files.length === 0 || uploading) return
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress(`${i + 1}/${files.length}: ${file.name}`)
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1] || result)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        await api.post('/documents', {
          contactId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          entityType: targetPhase,
          entityId,
          uploadedBy: user?.id,
          fileBase64: base64,
        })
      } catch (err: any) {
        console.error('Upload fehlgeschlagen:', file.name, err?.message)
      }
    }

    setUploading(false)
    setUploadProgress('')
    qc.invalidateQueries({ queryKey: ['documents'] })
  }, [contactId, entityId, user?.id, uploading, qc])

  // ── Drag & Drop Handlers ──
  const handleDragOver = (e: React.DragEvent, phase: EntityType) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPhase(phase)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverPhase(null)
  }

  const handleDrop = (e: React.DragEvent, phase: EntityType) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPhase(null)
    if (e.dataTransfer.files?.length > 0) {
      uploadFiles(e.dataTransfer.files, phase)
    }
  }

  // ── File Input Handler ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      uploadFiles(e.target.files, uploadPhase)
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

  return (
    <div className="space-y-3">
      {/* Upload Area – Drag & Drop */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer"
        style={{
          borderColor: dragOverPhase === '__global__' ? '#F59E0B' : 'rgba(255,255,255,0.08)',
          background: dragOverPhase === '__global__' ? 'color-mix(in srgb, #F59E0B 6%, transparent)' : 'rgba(255,255,255,0.02)',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOverPhase('__global__') }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => { e.preventDefault(); setDragOverPhase(null); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files, entityType) }}
        onClick={() => { setUploadPhase(entityType); fileRef.current?.click() }}
      >
        <Upload size={18} className="text-text-dim shrink-0" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          {uploading ? (
            <p className="text-[12px] font-medium text-amber">{uploadProgress}</p>
          ) : (
            <>
              <p className="text-[12px] font-medium text-text-sec">Datei hochladen</p>
              <p className="text-[10px] text-text-dim">Drag & Drop oder klicken · PDF, Bilder, Dokumente</p>
            </>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

      {/* Ablage nach Phase */}
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-1">
        Ablage ({allDocs.length})
      </div>

      {sortedPhases.map((phaseId) => {
        const phase = PHASES.find(p => p.id === phaseId)!
        const phaseDocs = allDocs.filter(d => d.entityType === phaseId)
        const isExpanded = expandedPhases[phaseId]
        const isDragOver = dragOverPhase === phaseId
        const isCurrentPhase = phaseId === entityType

        return (
          <div
            key={phaseId}
            className="rounded-xl overflow-hidden transition-all"
            style={{
              background: isDragOver ? `color-mix(in srgb, ${phase.color} 6%, transparent)` : 'rgba(255,255,255,0.025)',
              border: isDragOver
                ? `2px dashed color-mix(in srgb, ${phase.color} 40%, transparent)`
                : isCurrentPhase
                  ? `1px solid color-mix(in srgb, ${phase.color} 20%, transparent)`
                  : '1px solid rgba(255,255,255,0.04)',
            }}
            onDragOver={(e) => handleDragOver(e, phaseId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, phaseId)}
          >
            {/* Phase Header */}
            <button
              type="button"
              onClick={() => togglePhase(phaseId)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-hover/30 transition-colors"
            >
              {isExpanded ? <FolderOpen size={14} style={{ color: phase.color }} strokeWidth={1.8} /> : <Folder size={14} style={{ color: phase.color }} strokeWidth={1.8} />}
              <span className="text-[11px] font-bold" style={{ color: phase.color }}>{phase.label}</span>
              {isCurrentPhase && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${phase.color} 12%, transparent)`, color: phase.color }}>Aktuell</span>}
              <span className="ml-auto text-[10px] text-text-dim tabular-nums">{phaseDocs.length}</span>
            </button>

            {/* Docs */}
            {isExpanded && (
              <div className="px-2 pb-2 space-y-0.5">
                {phaseDocs.length === 0 ? (
                  <p className="text-[10px] text-text-dim text-center py-3">
                    {isDragOver ? 'Hier ablegen' : 'Keine Dokumente'}
                  </p>
                ) : (
                  phaseDocs.map(renderDoc)
                )}
                {/* Upload Button pro Phase */}
                <button
                  type="button"
                  onClick={() => { setUploadPhase(phaseId); fileRef.current?.click() }}
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

      {/* File Viewer */}
      {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </div>
  )
}
