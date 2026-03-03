import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type EntityType = 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT'

export interface Document {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  entityType: EntityType
  entityId: string
  uploadedBy: string
  notes: string | null
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
      fileName: string
      fileSize: number
      mimeType: string
      entityType: EntityType
      entityId: string
      uploadedBy?: string
      notes?: string
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
