import { useState } from 'react'
import { FileText, Image, File, Upload, Trash2, Plus } from 'lucide-react'
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  formatFileSize,
  getFileIcon,
  type EntityType,
} from '@/hooks/useDocuments'

interface DocumentSectionProps {
  entityType: EntityType
  entityId: string
}

export default function DocumentSection({ entityType, entityId }: DocumentSectionProps) {
  const { data: docsRes } = useDocuments(entityType, entityId)
  const uploadDoc = useUploadDocument()
  const deleteDoc = useDeleteDocument()
  const [notes, setNotes] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const docs = docsRes?.data || []

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      uploadDoc.mutate({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        entityType,
        entityId,
        notes: notes.trim() || undefined,
      })
    }
    setNotes('')
    e.target.value = ''
  }

  const iconMap = {
    image: Image,
    pdf: FileText,
    doc: FileText,
    file: File,
  }

  const iconColorMap = {
    image: '#60A5FA',
    pdf: '#F87171',
    doc: '#60A5FA',
    file: '#94A3B8',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-bold tracking-[0.08em] uppercase text-text-dim">
          Dokumente ({docs.length})
        </h4>
      </div>

      {/* Upload area */}
      <div
        className="rounded-xl p-3 mb-3 flex items-center gap-3"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
        }}
      >
        <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)' }}
          >
            <Upload size={14} strokeWidth={1.8} className="text-amber" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-sec">Datei hochladen</p>
            <p className="text-[9px] text-text-dim">PDF, Bilder, Dokumente</p>
          </div>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notiz (optional)..."
          className="glass-input px-2.5 py-1.5 text-[10px] w-[140px]"
        />
      </div>

      {/* Document list */}
      {docs.length > 0 ? (
        <div className="space-y-1.5">
          {docs.map((doc) => {
            const iconType = getFileIcon(doc.mimeType)
            const IconComp = iconMap[iconType]
            const iconColor = iconColorMap[iconType]

            return (
              <div
                key={doc.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-surface-hover transition-colors group"
              >
                <div
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}
                >
                  <IconComp size={13} strokeWidth={1.8} style={{ color: iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-text-sec truncate">{doc.fileName}</p>
                  <div className="flex items-center gap-2 text-[9px] text-text-dim">
                    <span className="tabular-nums">{formatFileSize(doc.fileSize)}</span>
                    {doc.notes && (
                      <>
                        <span>·</span>
                        <span className="truncate">{doc.notes}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="tabular-nums">
                      {new Date(doc.createdAt).toLocaleDateString('de-CH', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                {confirmDeleteId === doc.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => { deleteDoc.mutate(doc.id); setConfirmDeleteId(null) }}
                      className="px-2 py-0.5 rounded text-[9px] font-semibold text-red"
                      style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-0.5 rounded text-[9px] text-text-dim"
                    >
                      Nein
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(doc.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-[6px] flex items-center justify-center text-text-dim hover:text-red hover:bg-red/10 transition-all shrink-0"
                  >
                    <Trash2 size={12} strokeWidth={1.8} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[10px] text-text-dim text-center py-3">Noch keine Dokumente</p>
      )}
    </div>
  )
}
