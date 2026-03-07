import { useState, useRef } from 'react'
import { FileText, Image, File, Upload, Trash2, Download, ChevronDown } from 'lucide-react'
import {
  useContactDocuments,
  useUploadDocument,
  useDeleteDocument,
  formatFileSize,
  getFileIcon,
  entityTypeLabels,
  type EntityType,
  type Document,
} from '@/hooks/useDocuments'
import { useAuth } from '@/hooks/useAuth'

interface DocumentSectionProps {
  contactId: string
  entityType: EntityType
  entityId: string
}

const entityTypeColors: Record<EntityType, string> = {
  LEAD: '#94A3B8',
  TERMIN: '#60A5FA',
  ANGEBOT: '#F59E0B',
  PROJEKT: '#34D399',
}

export default function DocumentSection({ contactId, entityType, entityId }: DocumentSectionProps) {
  const { user } = useAuth()
  const { data: docsRes } = useContactDocuments(contactId)
  const uploadDoc = useUploadDocument()
  const deleteDoc = useDeleteDocument()
  const [notes, setNotes] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const allDocs = docsRes?.data ?? []

  // Gruppiert nach entity_type, aktuelle Phase zuerst
  const phaseOrder: EntityType[] = ['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT']
  const currentIdx = phaseOrder.indexOf(entityType)
  const sortedPhases = [
    entityType,
    ...phaseOrder.filter((p) => p !== entityType),
  ]

  const grouped = sortedPhases.reduce<Record<EntityType, Document[]>>((acc, phase) => {
    const phaseDocs = allDocs.filter((d) => d.entity_type === phase)
    if (phaseDocs.length > 0) acc[phase] = phaseDocs
    return acc
  }, {} as Record<EntityType, Document[]>)

  const totalDocs = allDocs.length

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      // File zu Base64 konvertieren
      const base64 = await fileToBase64(file)
      uploadDoc.mutate({
        contactId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        entityType,
        entityId,
        uploadedBy: user?.id,
        notes: notes.trim() || undefined,
        fileBase64: base64,
      })
    }
    setNotes('')
    e.target.value = ''
  }

  const toggleGroup = (phase: EntityType) => {
    setCollapsedGroups((prev) => ({ ...prev, [phase]: !prev[phase] }))
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
          Dokumentenablage ({totalDocs})
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
            ref={fileRef}
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

      {uploadDoc.isPending && (
        <p className="text-[10px] text-amber text-center py-1 mb-2">Wird hochgeladen...</p>
      )}

      {/* Grouped document list */}
      {totalDocs > 0 ? (
        <div className="space-y-2">
          {Object.entries(grouped).map(([phase, docs]) => {
            const phaseColor = entityTypeColors[phase as EntityType]
            const isCurrentPhase = phase === entityType
            const isCollapsed = collapsedGroups[phase] ?? false

            return (
              <div key={phase}>
                {/* Phase Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(phase as EntityType)}
                  className="w-full flex items-center gap-2 py-1.5 px-1 hover:bg-surface-hover/50 rounded-lg transition-colors"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: phaseColor }}
                  />
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: phaseColor }}>
                    {entityTypeLabels[phase as EntityType]}
                  </span>
                  <span className="text-[9px] text-text-dim">({docs.length})</span>
                  {isCurrentPhase && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: `color-mix(in srgb, ${phaseColor} 12%, transparent)`, color: phaseColor }}>
                      Aktuell
                    </span>
                  )}
                  <ChevronDown
                    size={10}
                    className={`ml-auto text-text-dim transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {/* Documents */}
                {!isCollapsed && (
                  <div className="space-y-1 ml-3">
                    {docs.map((doc) => {
                      const iconType = getFileIcon(doc.mime_type)
                      const IconComp = iconMap[iconType]
                      const iconColor = iconColorMap[iconType]

                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] hover:bg-surface-hover transition-colors group"
                        >
                          <div
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                            style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}
                          >
                            <IconComp size={13} strokeWidth={1.8} style={{ color: iconColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-text-sec truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-2 text-[9px] text-text-dim">
                              <span className="tabular-nums">{formatFileSize(doc.file_size)}</span>
                              {doc.notes && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{doc.notes}</span>
                                </>
                              )}
                              <span>·</span>
                              <span className="tabular-nums">
                                {new Date(doc.created_at).toLocaleDateString('de-CH', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Download */}
                          {doc.downloadUrl && (
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-[6px] flex items-center justify-center text-text-dim hover:text-amber hover:bg-amber/10 transition-all shrink-0"
                              title="Herunterladen"
                            >
                              <Download size={12} strokeWidth={1.8} />
                            </a>
                          )}

                          {/* Delete */}
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

// ── Helper: File zu Base64 ──

function fileToBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // data:mime;base64,XXXX → nur den Base64-Teil
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
