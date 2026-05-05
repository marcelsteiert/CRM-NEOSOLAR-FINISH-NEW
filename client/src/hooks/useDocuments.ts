import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type EntityType = 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT' | 'PERSONAL' | 'INTERNAL'

/** Singleton-ID fuer die Firmenablage (alle internen Docs haben diese entity_id) */
export const INTERNAL_VAULT_ID = 'company-vault'

export interface Document {
  id: string
  contactId: string | null
  fileName: string
  fileSize: number
  mimeType: string
  entityType: EntityType
  entityId: string | null
  folderPath: string | null
  uploadedBy: string
  notes: string | null
  storagePath: string
  downloadUrl: string | null
  createdAt: string
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
      folderPath?: string
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
  PERSONAL: 'Personal',
}

/** Hook fuer Dokumente eines Mitarbeiters (entity_type=PERSONAL, entity_id=personnel.id) */
export function usePersonnelDocuments(personnelId: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', 'personnel', personnelId],
    queryFn: () =>
      api.get<DocumentListResponse>(`/documents?entityType=PERSONAL&entityId=${personnelId}`),
    enabled: !!personnelId,
  })
}

/** Hook fuer Firmen-interne Dokumente (entity_type=INTERNAL) */
export function useInternalDocuments() {
  return useQuery({
    queryKey: ['documents', 'internal'],
    queryFn: () =>
      api.get<DocumentListResponse>(`/documents?entityType=INTERNAL&entityId=${INTERNAL_VAULT_ID}`),
  })
}
