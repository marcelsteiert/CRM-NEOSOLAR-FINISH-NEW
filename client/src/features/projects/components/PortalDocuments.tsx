import { useState, useRef, useCallback, useEffect } from 'react'
import {
  FileText, Upload, Trash2, Eye, EyeOff, Loader2, Folder, Plus,
  CheckCircle2, AlertCircle, Image as ImageIcon, X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface PortalDocument {
  id: string
  contactId: string
  entityType: string
  entityId: string | null
  fileName: string
  fileSize: number
  mimeType: string
  storagePath: string
  folderPath: string | null
  portalVisible: boolean
  notes: string | null
  createdAt: string
  uploadedBy: string | null
  downloadUrl?: string
}

interface Props {
  projectId: string
  contactId: string
}

const CATEGORIES: { id: string; label: string; description: string; color: string }[] = [
  { id: 'Vertraege', label: 'Vertraege', description: 'Kaufvertrag, AGB, Vereinbarungen', color: '#F59E0B' },
  { id: 'Bewilligungen', label: 'Bewilligungen', description: 'Baubewilligung, TAG, IA, Pronovo', color: '#60A5FA' },
  { id: 'Datenblaetter', label: 'Datenblaetter', description: 'Module, Wechselrichter, Speicher', color: '#A78BFA' },
  { id: 'Plaene', label: 'Plaene & Schemas', description: 'Layout, Elektroschema, Statik', color: '#22D3EE' },
  { id: 'Messprotokolle', label: 'Messprotokolle', description: 'SINA, MPP, GBA, Pruefberichte', color: '#FB923C' },
  { id: 'Rechnungen', label: 'Rechnungen', description: 'Akonto, Schluss, Fremdrechnungen', color: '#34D399' },
  { id: 'Bilder', label: 'Bilder', description: 'Dachfotos, Montage, Anlage', color: '#F472B6' },
  { id: 'Sonstiges', label: 'Sonstiges', description: 'Korrespondenz, Notizen, Sonstige', color: '#94A3B8' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getCategory(folderPath: string | null) {
  if (!folderPath) return CATEGORIES[CATEGORIES.length - 1]
  return CATEGORIES.find((c) => c.id === folderPath) ?? CATEGORIES[CATEGORIES.length - 1]
}

function isImage(mime: string) {
  return mime.startsWith('image/')
}

export default function PortalDocuments({ projectId, contactId }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [docs, setDocs] = useState<PortalDocument[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadCategory, setUploadCategory] = useState<string>('Vertraege')
  const [uploadVisible, setUploadVisible] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const SUPABASE_URL = 'https://tzoquorcgygmrougevgm.supabase.co'
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b3F1b3JjZ3lnbXJvdWdldmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTEzODQsImV4cCI6MjA4ODM2NzM4NH0.79OVK4Zy0q08WvxOPpHZWrklcRWSmHYl2K3VPe1xZmU'

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: PortalDocument[] }>(`/documents?contactId=${contactId}&entityType=PROJEKT&entityId=${projectId}`)
      setDocs(res.data ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Dokumente konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [contactId, projectId])

  useEffect(() => {
    void loadDocs()
  }, [loadDocs])

  // Upload-Handler
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0 || uploading) return
    setUploading(true)
    setError('')

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress(`${i + 1}/${files.length}: ${file.name}`)
      try {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${contactId}/projekt/${timestamp}_${safeName}`

        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        })

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => 'Storage-Fehler')
          throw new Error(`Upload fehlgeschlagen: ${errText}`)
        }

        await api.post('/documents/metadata', {
          contactId,
          entityType: 'PROJEKT',
          entityId: projectId,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          uploadedBy: user?.id,
          folderPath: uploadCategory,
          portalVisible: uploadVisible,
        })
      } catch (err: any) {
        setError(`${file.name}: ${err.message}`)
      }
    }

    setUploading(false)
    setUploadProgress('')
    void loadDocs()
    qc.invalidateQueries({ queryKey: ['admin-portal', projectId] })
  }, [contactId, projectId, uploadCategory, uploadVisible, uploading, user, loadDocs, qc])

  const handleToggleVisibility = async (doc: PortalDocument) => {
    try {
      await api.put(`/admin/portal/documents/${doc.id}/visibility`, {
        portalVisible: !doc.portalVisible,
      })
      void loadDocs()
      qc.invalidateQueries({ queryKey: ['admin-portal', projectId] })
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/documents/${id}`)
      setConfirmDeleteId(null)
      void loadDocs()
      qc.invalidateQueries({ queryKey: ['admin-portal', projectId] })
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      void uploadFiles(e.dataTransfer.files)
    }
  }

  // Gruppieren nach Kategorie
  const grouped: Record<string, PortalDocument[]> = {}
  for (const cat of CATEGORIES) grouped[cat.id] = []
  for (const d of docs ?? []) {
    const cat = getCategory(d.folderPath)
    if (!grouped[cat.id]) grouped[cat.id] = []
    grouped[cat.id].push(d)
  }

  const totalDocs = (docs ?? []).length
  const visibleDocs = (docs ?? []).filter((d) => d.portalVisible).length

  return (
    <div
      className="glass-card overflow-hidden"
      style={{ borderRadius: 'var(--radius-lg)' }}
    >
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Folder size={16} strokeWidth={1.8} className="text-amber" />
          <span className="text-sm font-semibold text-text">Dokumente fuer den Kunden</span>
          <span className="text-xs text-text-sec">
            ({visibleDocs} sichtbar / {totalDocs} gesamt)
          </span>
        </div>
      </div>

      {/* Upload-Box */}
      <div className="px-5 py-4 border-b border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Kategorie</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="glass-input mt-1 w-full text-xs"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Sichtbarkeit</label>
            <label className="glass-input mt-1 w-full text-xs flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uploadVisible}
                onChange={(e) => setUploadVisible(e.target.checked)}
              />
              Im Kundenportal sichtbar
            </label>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed transition-all py-6 px-4 text-center"
          style={{
            borderColor: dragOver ? '#F59E0B' : 'rgba(255,255,255,0.1)',
            background: dragOver ? 'rgba(245,158,11,0.05)' : 'transparent',
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={20} className="animate-spin text-amber" />
              <span className="text-xs text-text-sec">{uploadProgress}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload size={18} strokeWidth={1.8} className="text-text-sec" />
              <span className="text-xs text-text-sec">
                <span className="text-text font-medium">Datei waehlen</span> oder hierher ziehen
              </span>
              <span className="text-[10px] text-text-dim">PDF, Bilder, Office – max. 50 MB pro Datei</span>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files)
            if (fileRef.current) fileRef.current.value = ''
          }}
        />

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertCircle size={13} strokeWidth={1.8} style={{ color: '#F87171', marginTop: 1 }} />
            <span className="text-[12px] text-red flex-1">{error}</span>
            <button onClick={() => setError('')}><X size={12} className="text-red" /></button>
          </div>
        )}
      </div>

      {/* Dokumente nach Kategorie */}
      <div className="divide-y divide-border">
        {loading && (
          <div className="px-5 py-6 text-center">
            <Loader2 size={18} className="animate-spin mx-auto text-text-sec" />
          </div>
        )}

        {!loading && totalDocs === 0 && (
          <div className="px-5 py-8 text-center">
            <FileText size={24} className="mx-auto mb-2 text-text-dim" />
            <div className="text-sm text-text-sec">Noch keine Dokumente</div>
            <div className="text-xs text-text-dim mt-1">Lade Vertraege, Baubewilligungen und mehr hoch.</div>
          </div>
        )}

        {!loading && CATEGORIES.map((cat) => {
          const items = grouped[cat.id] ?? []
          if (items.length === 0) return null

          return (
            <div key={cat.id}>
              <div
                className="px-5 py-2 flex items-center gap-2"
                style={{ background: `color-mix(in srgb, ${cat.color} 5%, transparent)` }}
              >
                <div
                  className="w-1 h-3 rounded-full"
                  style={{ background: cat.color }}
                />
                <div className="flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text">{cat.label}</div>
                </div>
                <div className="text-[11px] text-text-sec">{items.length}</div>
              </div>

              <div className="divide-y divide-border">
                {items.map((doc) => {
                  const downloadUrl = `${SUPABASE_URL}/storage/v1/object/public/documents/${doc.storagePath}`
                  const Icon = isImage(doc.mimeType) ? ImageIcon : FileText
                  const isConfirmingDelete = confirmDeleteId === doc.id

                  return (
                    <div key={doc.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-surface-hover transition-colors">
                      <div
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: doc.portalVisible ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                          border: doc.portalVisible ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <Icon size={14} strokeWidth={1.8} style={{ color: doc.portalVisible ? '#F59E0B' : '#8B95A5' }} />
                      </div>

                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-0 hover:text-amber transition-colors"
                      >
                        <div className="text-xs font-medium text-text truncate">{doc.fileName}</div>
                        <div className="text-[10px] text-text-dim mt-0.5">
                          {formatFileSize(doc.fileSize)} &middot; {new Date(doc.createdAt).toLocaleDateString('de-CH')}
                        </div>
                      </a>

                      {/* Sichtbarkeits-Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(doc)}
                        className="flex-shrink-0 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold transition-colors flex items-center gap-1"
                        style={{
                          background: doc.portalVisible ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                          color: doc.portalVisible ? '#34D399' : '#525E6F',
                          border: `1px solid ${doc.portalVisible ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                        title={doc.portalVisible ? 'Klicken um auszublenden' : 'Klicken um Kunde zu zeigen'}
                      >
                        {doc.portalVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                        {doc.portalVisible ? 'Sichtbar' : 'Versteckt'}
                      </button>

                      {/* Loeschen */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold"
                            style={{ background: '#F87171', color: '#0B0F15' }}
                          >
                            Loeschen
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-md text-[10px] text-text-dim hover:text-text"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(doc.id)}
                          className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-colors"
                          title="Loeschen"
                        >
                          <Trash2 size={12} strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
