import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types (aligned with backend) ──

export type LeadSource =
  | 'HOMEPAGE'
  | 'LANDINGPAGE'
  | 'MESSE'
  | 'EMPFEHLUNG'
  | 'KALTAKQUISE'
  | 'SONSTIGE'

export type LeadStatus = 'ACTIVE' | 'CONVERTED' | 'LOST' | 'ARCHIVED' | 'AFTER_SALES'

export interface Lead {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  address: string
  phone: string
  email: string
  source: LeadSource
  pipelineId: string | null
  bucketId: string | null
  assignedTo: string | null
  status: LeadStatus
  tags: string[]
  value?: number
  notes?: string
  appointmentType: 'VOR_ORT' | 'ONLINE' | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Pipeline {
  id: string
  name: string
  description: string | null
  buckets: Bucket[]
}

export interface Bucket {
  id: string
  name: string
  position: number
  pipelineId: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

// ── API response types ──

interface LeadListResponse {
  data: Lead[]
  total: number
  page: number
  pageSize: number
}

interface LeadResponse {
  data: Lead
}

interface PipelineListResponse {
  data: Pipeline[]
}

interface TagListResponse {
  data: Tag[]
}

// ── Query params ──

export interface LeadFilters {
  status?: LeadStatus | 'ALL'
  source?: LeadSource | 'ALL'
  appointmentType?: 'VOR_ORT' | 'ONLINE' | 'ALL'
  search?: string
  pipelineId?: string
  bucketId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// ── Hooks ──

export function useLeads(filters: LeadFilters = {}) {
  const params = new URLSearchParams()

  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status)
  if (filters.source && filters.source !== 'ALL') params.set('source', filters.source)
  if (filters.appointmentType && filters.appointmentType !== 'ALL') params.set('appointmentType', filters.appointmentType)
  if (filters.search) params.set('search', filters.search)
  if (filters.pipelineId) params.set('pipelineId', filters.pipelineId)
  if (filters.bucketId) params.set('bucketId', filters.bucketId)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const path = `/leads${qs ? `?${qs}` : ''}`

  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => api.get<LeadListResponse>(path),
  })
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get<LeadResponse>(`/leads/${id}`),
    enabled: !!id,
  })
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get<PipelineListResponse>('/pipelines'),
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<TagListResponse>('/tags'),
  })
}

// ── Mutations ──

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Lead>) => api.post<LeadResponse>('/leads', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Lead> & { id: string }) =>
      api.put<LeadResponse>(`/leads/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead'] })
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useMoveLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bucketId }: { id: string; bucketId: string }) =>
      api.put<LeadResponse>(`/leads/${id}/move`, { bucketId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useAddLeadTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tagIds }: { id: string; tagIds: string[] }) =>
      api.post<LeadResponse>(`/leads/${id}/tags`, { tagIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead'] })
    },
  })
}

export function useRemoveLeadTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tagId }: { id: string; tagId: string }) =>
      api.delete<LeadResponse>(`/leads/${id}/tags/${tagId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead'] })
    },
  })
}

// ── Pipeline Mutations ──

export function useCreatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<{ data: Pipeline }>('/pipelines', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useUpdatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      api.put<{ data: Pipeline }>(`/pipelines/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useCreateBucket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pipelineId, ...data }: { pipelineId: string; name: string; position?: number }) =>
      api.post<{ data: Bucket }>(`/pipelines/${pipelineId}/buckets`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useUpdateBucket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pipelineId, bucketId, ...data }: { pipelineId: string; bucketId: string; name?: string }) =>
      api.put<{ data: Bucket }>(`/pipelines/${pipelineId}/buckets/${bucketId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useReorderBuckets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pipelineId, bucketIds }: { pipelineId: string; bucketIds: string[] }) =>
      api.put<{ data: Bucket[] }>(`/pipelines/${pipelineId}/buckets/reorder`, { bucketIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

// ── Users ──

export type UserRole = 'ADMIN' | 'VERTRIEB' | 'PROJEKTLEITUNG' | 'BUCHHALTUNG' | 'GL'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  avatar: string | null
  isActive: boolean
  allowedModules: string[]
  createdAt: string
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ data: User[] }>('/users'),
  })
}

export function useRoleDefaults() {
  return useQuery({
    queryKey: ['roleDefaults'],
    queryFn: () => api.get<{ data: Record<UserRole, string[]> }>('/users/role-defaults'),
  })
}

export function useUpdateRoleDefaults() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, string[]>) =>
      api.put<{ data: Record<UserRole, string[]> }>('/users/role-defaults', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roleDefaults'] }),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { firstName: string; lastName: string; email: string; phone?: string; role: UserRole; allowedModules?: string[] }) =>
      api.post<{ data: User }>('/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; firstName?: string; lastName?: string; email?: string; phone?: string; role?: UserRole; isActive?: boolean; allowedModules?: string[] }) =>
      api.put<{ data: User }>(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string; data: User }>(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ── Pipeline Delete ──

export function useDeletePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/pipelines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

export function useDeleteBucket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pipelineId, bucketId }: { pipelineId: string; bucketId: string }) =>
      api.delete<{ message: string }>(`/pipelines/${pipelineId}/buckets/${bucketId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipelines'] }),
  })
}

// ── Activities ──

export type ActivityType = 'CALL' | 'EMAIL' | 'NOTE' | 'MEETING' | 'STATUS_CHANGE' | 'TASK' | 'DOCUMENT' | 'REMINDER' | 'DEAL_CREATED'

export interface Activity {
  id: string
  leadId: string
  type: ActivityType
  title: string
  description: string | null
  createdBy: string
  createdAt: string
}

export function useActivities(leadId: string | null) {
  return useQuery({
    queryKey: ['activities', leadId],
    queryFn: () => api.get<{ data: Activity[] }>(`/activities?leadId=${leadId}`),
    enabled: !!leadId,
  })
}

export function useCreateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { leadId: string; type: ActivityType; title: string; description?: string; createdBy?: string }) =>
      api.post<{ data: Activity }>('/activities', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

// ── Reminders ──

export interface Reminder {
  id: string
  leadId: string
  title: string
  description: string | null
  dueAt: string
  dismissed: boolean
  createdBy: string
  createdAt: string
}

export function useReminders(leadId?: string | null) {
  const path = leadId ? `/reminders?leadId=${leadId}` : '/reminders'
  return useQuery({
    queryKey: ['reminders', leadId ?? 'all'],
    queryFn: () => api.get<{ data: Reminder[] }>(path),
  })
}

export function usePendingReminders() {
  return useQuery({
    queryKey: ['reminders', 'pending'],
    queryFn: () => api.get<{ data: Reminder[] }>('/reminders?pending=true'),
    refetchInterval: 30000, // check every 30s
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { leadId: string; title: string; description?: string; dueAt: string; createdBy?: string }) =>
      api.post<{ data: Reminder }>('/reminders', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

export function useDismissReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<{ data: Reminder }>(`/reminders/${id}/dismiss`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
    },
  })
}

// ── Email Templates ──

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => api.get<{ data: EmailTemplate[] }>('/emails/templates'),
  })
}

export function useSendEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { leadId: string; to: string; subject: string; body: string; templateId?: string; sentBy?: string }) =>
      api.post<{ data: unknown; message: string }>('/emails/send', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

// ── Display helpers ──

export const sourceLabels: Record<LeadSource, string> = {
  HOMEPAGE: 'Homepage',
  LANDINGPAGE: 'Landingpage',
  MESSE: 'Messe',
  EMPFEHLUNG: 'Empfehlung',
  KALTAKQUISE: 'Kaltakquise',
  SONSTIGE: 'Sonstige',
}

export const statusLabels: Record<LeadStatus, string> = {
  ACTIVE: 'Aktiv',
  CONVERTED: 'Konvertiert',
  LOST: 'Verloren',
  ARCHIVED: 'Archiviert',
  AFTER_SALES: 'After Sales',
}
