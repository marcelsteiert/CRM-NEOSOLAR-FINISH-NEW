import { useState, useRef } from 'react'
import {
  FileText, Image, File, Upload, Trash2, Download, ChevronDown, ChevronRight,
  Folder, FolderOpen, Plus,
} from 'lucide-react'
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
import { useDocTemplates } from '@/hooks/useAdmin'

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

interface FolderNode {
  name: string
  path: string
  subfolders: FolderNode[]
  docs: Document[]
}

export default function DocumentSection({ contactId, entityType, entityId }: DocumentSectionProps) {
  const { user } = useAuth()
  const { data: docsRes } = useContactDocuments(contactId)
  const { data: templatesRes } = useDocTemplates()
  const uploadDoc = useUploadDocument()
  const deleteDoc = useDeleteDocument()
  const [notes, setNotes] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ [entityType]: true })
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_uploadTarget, setUploadTarget] = useState<{ phase: EntityType; folderPath: string } | null>(null)
  const uploadTargetRef = useRef<{ phase: EntityType; folderPath: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const allDocs = docsRes?.data ?? []
  const templates = templatesRes?.data ?? []

  // Ordner-Phasen in richtiger Reihenfolge, aktuelle zuerst
  const phaseOrder: EntityType[] = ['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT']
  const sortedPhases = [entityType, ...phaseOrder.filter((p) => p !== entityType)]

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }))
  }

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const userRole = user?.role ?? ''

  // Template-Ordner fuer eine Phase holen (gefiltert nach User-Rolle)
  const getPhaseTemplate = (phase: EntityType) => {
    const folders = templates.find((t) => t.entityType === phase)?.folders ?? []
    // Admins sehen alles, sonst nur Ordner mit passender Rolle oder ohne Einschraenkung
    if (userRole === 'ADMIN' || userRole === 'GESCHAEFTSLEITUNG' || userRole === 'GL') return folders
    return folders.filter((f) => {
      const roles = (f as Record<string, unknown>).allowedRoles as string[] | undefined
      return !roles || roles.length === 0 || roles.includes(userRole)
    })
  }

  // Dokumente einem Ordnerbaum zuordnen
  const buildFolderTree = (phase: EntityType): FolderNode[] => {
    const phaseDocs = allDocs.filter((d) => d.entityType === phase)
    const templateFolders = getPhaseTemplate(phase)

    const tree: FolderNode[] = templateFolders.map((folder) => {
      const folderPath = folder.name
      const subfolders: FolderNode[] = (((folder as Record<string, unknown>).subfolders ?? []) as string[]).map((sub: string) => {
        const subPath = `${folderPath}/${sub}`
        return {
          name: sub,
          path: subPath,
          subfolders: [],
          docs: phaseDocs.filter((d) => d.folderPath === subPath),
        }
      })
      return {
        name: folder.name,
        path: folderPath,
        subfolders,
        docs: phaseDocs.filter((d) => d.folderPath === folderPath),
      }
    })

    // Dokumente ohne Ordnerzuweisung als "Allgemein" anhaengen
    const assignedPaths = new Set<string>()
    tree.forEach((f) => {
      assignedPaths.add(f.path)
      f.subfolders.forEach((sf) => assignedPaths.add(sf.path))
    })
    const unassigned = phaseDocs.filter(
      (d) => !d.folderPath || !assignedPaths.has(d.folderPath),
    )
    if (unassigned.length > 0) {
      tree.push({
        name: 'Allgemein',
        path: '__allgemein__',
        subfolders: [],
        docs: unassigned,
      })
    }

    return tree
  }

  const handleUploadToFolder = (phase: EntityType, folderPath: string) => {
    const target = { phase, folderPath }
    setUploadTarget(target)
    uploadTargetRef.current = target
    fileRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Ref lesen statt State – vermeidet Race Condition bei setState + click()
    const currentTarget = uploadTargetRef.current
    const targetPhase = currentTarget?.phase ?? entityType
    const targetFolder = currentTarget?.folderPath

    for (const file of Array.from(files)) {
      const base64 = await fileToBase64(file)
      uploadDoc.mutate({
        contactId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        entityType: targetPhase,
        entityId,
        folderPath: targetFolder || undefined,
        uploadedBy: user?.id,
        notes: notes.trim() || undefined,
        fileBase64: base64,
      })
    }
    setNotes('')
    setUploadTarget(null)
    uploadTargetRef.current = null
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

  const totalDocs = allDocs.length

  const renderDoc = (doc: Document) => {
    const iconType = getFileIcon(doc.mimeType)
    const IconComp = iconMap[iconType]
    const iconColor = iconColorMap[iconType]

    return (
      <div
        key={doc.id}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors group"
      >
        <div
          className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}
        >
          <IconComp size={12} strokeWidth={1.8} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-text-sec truncate">{doc.fileName}</p>
          <div className="flex items-center gap-1.5 text-[8px] text-text-dim">
            <span className="tabular-nums">{formatFileSize(doc.fileSize)}</span>
            {doc.notes && <><span>·</span><span className="truncate">{doc.notes}</span></>}
            <span>·</span>
            <span className="tabular-nums">
              {new Date(doc.createdAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </span>
          </div>
        </div>
        {doc.downloadUrl && (
          <a
            href={doc.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-text-dim hover:text-amber transition-all shrink-0"
            title="Herunterladen"
          >
            <Download size={11} strokeWidth={1.8} />
          </a>
        )}
        {confirmDeleteId === doc.id ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => { deleteDoc.mutate(doc.id); setConfirmDeleteId(null) }}
              className="px-1.5 py-0.5 rounded text-[8px] font-semibold text-red"
              style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}
            >
              Ja
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="px-1.5 py-0.5 rounded text-[8px] text-text-dim"
            >
              Nein
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDeleteId(doc.id)}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-text-dim hover:text-red transition-all shrink-0"
          >
            <Trash2 size={11} strokeWidth={1.8} />
          </button>
        )}
      </div>
    )
  }

  const renderFolder = (folder: FolderNode, phase: EntityType, depth: number) => {
    const key = `${phase}:${folder.path}`
    const isExpanded = expandedFolders[key] ?? false
    // hasContent intentionally unused – kept for future use
    const docCount = folder.docs.length + folder.subfolders.reduce((sum, sf) => sum + sf.docs.length, 0)
    const FolderIcon = isExpanded ? FolderOpen : Folder
    const paddingLeft = depth * 16

    return (
      <div key={folder.path}>
        {/* Ordner-Header */}
        <div
          className="flex items-center gap-1.5 py-1 px-1 rounded-md hover:bg-surface-hover/50 transition-colors cursor-pointer group/folder"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => toggleFolder(key)}
        >
          {folder.subfolders.length > 0 || folder.docs.length > 0 ? (
            <ChevronRight
              size={10}
              className={`text-text-dim shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <div className="w-[10px] shrink-0" />
          )}
          <FolderIcon size={13} className="text-text-dim shrink-0" strokeWidth={1.8} style={{ color: entityTypeColors[phase] }} />
          <span className="text-[11px] font-medium text-text-sec flex-1">{folder.name}</span>
          {docCount > 0 && (
            <span className="text-[8px] text-text-dim tabular-nums mr-1">{docCount}</span>
          )}
          {/* Upload-Button pro Ordner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleUploadToFolder(phase, folder.path)
            }}
            className="opacity-0 group-hover/folder:opacity-100 w-4 h-4 rounded flex items-center justify-center text-text-dim hover:text-amber transition-all shrink-0"
            title={`In "${folder.name}" hochladen`}
          >
            <Plus size={10} strokeWidth={2} />
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div>
            {/* Subfolders */}
            {folder.subfolders.map((sf) => renderFolder(sf, phase, depth + 1))}
            {/* Docs in this folder */}
            <div style={{ paddingLeft: `${paddingLeft + 16}px` }}>
              {folder.docs.map(renderDoc)}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-bold tracking-[0.08em] uppercase text-text-dim">
          Dokumentenablage ({totalDocs})
        </h4>
      </div>

      {/* Upload area (allgemein) */}
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

      {/* Phasen-Ordnerstruktur */}
      <div className="space-y-1">
        {sortedPhases.map((phase) => {
          const phaseColor = entityTypeColors[phase]
          const isExpanded = expandedPhases[phase] ?? false
          const phaseDocs = allDocs.filter((d) => d.entityType === phase)
          const isCurrentPhase = phase === entityType
          const tree = buildFolderTree(phase)

          return (
            <div
              key={phase}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {/* Phase Header */}
              <button
                type="button"
                onClick={() => togglePhase(phase)}
                className="w-full flex items-center gap-2.5 py-2.5 px-3 hover:bg-surface-hover/30 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={12} style={{ color: phaseColor }} />
                ) : (
                  <ChevronRight size={12} style={{ color: phaseColor }} />
                )}
                <FolderOpen size={15} strokeWidth={1.8} style={{ color: phaseColor }} />
                <span className="text-[12px] font-bold" style={{ color: phaseColor }}>
                  {entityTypeLabels[phase]}
                </span>
                {phaseDocs.length > 0 && (
                  <span className="text-[9px] text-text-dim">({phaseDocs.length})</span>
                )}
                {isCurrentPhase && (
                  <span
                    className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold ml-auto"
                    style={{ background: `color-mix(in srgb, ${phaseColor} 12%, transparent)`, color: phaseColor }}
                  >
                    Aktuell
                  </span>
                )}
              </button>

              {/* Ordner-Baum */}
              {isExpanded && (
                <div className="px-2 pb-2">
                  {tree.length > 0 ? (
                    tree.map((folder) => renderFolder(folder, phase, 1))
                  ) : (
                    <p className="text-[9px] text-text-dim text-center py-2 ml-6">Keine Ordner definiert</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Helper: File zu Base64 ──

function fileToBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
