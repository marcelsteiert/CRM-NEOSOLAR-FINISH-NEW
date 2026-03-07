import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type EntityType = 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT'

export interface Document {
  id: string
  contact_id: string
  file_name: string
  file_size: number
  mime_type: string
  entity_type: EntityType
  entity_id: string | null
  uploaded_by: string
  notes: string | null
  storage_path: string
  downloadUrl: string | null
  created_at: string
}

// ── Response types ──

interface DocumentListResponse {
  data: Document[]
  total: number
}

interface DocumentResponse {
  data: Document
}

// ── Hooks ──

/** Alle Dokumente eines Kontakts (ueber alle Phasen hinweg) */
export function useContactDocuments(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', 'contact', contactId],
    queryFn: () =>
      api.get<DocumentListResponse>(`/documents?contactId=${contactId}`),
    enabled: !!contactId,
  })
}

/** Dokumente fuer eine spezifische Entity (Legacy-Kompatibilitaet) */
export function useDocuments(entityType: EntityType, entityId: string | null) {
  return useQuery({
    queryKey: ['documents', entityType, entityId],
    queryFn: () =>
      api.get<DocumentListResponse>(`/documents?entityType=${entityType}&entityId=${entityId}`),
    enabled: !!entityId,
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      contactId: string
      fileName: string
      fileSize: number
      mimeType: string
      entityType: EntityType
      entityId: string
      uploadedBy?: string
      notes?: string
      fileBase64: string
    }) => api.post<DocumentResponse>('/documents', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// ── Helpers ──

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileIcon(mimeType: string): 'image' | 'pdf' | 'doc' | 'file' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc'
  return 'file'
}

export const entityTypeLabels: Record<EntityType, string> = {
  LEAD: 'Lead',
  TERMIN: 'Termin',
  ANGEBOT: 'Angebot',
  PROJEKT: 'Projekt',
}
