import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Product Catalog ──

export type ProductCategory = 'PV_MODULE' | 'INVERTER' | 'BATTERY' | 'INSTALLATION' | 'PARTNER_PRICE'

export interface Product {
  id: string
  category: ProductCategory
  name: string
  manufacturer: string
  model: string
  specs: Record<string, string | number>
  unitPrice: number
  unit: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export function useProducts(category?: ProductCategory) {
  const qs = category ? `?category=${category}` : ''
  return useQuery({
    queryKey: ['products', category],
    queryFn: () => api.get<{ data: Product[]; total: number }>(`/admin/products${qs}`),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product> & { category: ProductCategory; name: string; unitPrice: number }) =>
      api.post<{ data: Product }>('/admin/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Product> & { id: string }) =>
      api.put<{ data: Product }>(`/admin/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// ── Integrations ──

export interface Integration {
  id: string
  service: string
  displayName: string
  description: string
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  apiKey: string | null
  lastSyncAt: string | null
  icon: string
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get<{ data: Integration[] }>('/integrations'),
  })
}

export function useUpdateIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; apiKey?: string; status?: string }) =>
      api.put<{ data: Integration }>(`/admin/integrations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

// ── Webhooks ──

export interface WebhookSource {
  id: string
  name: string
  sourceType: string
  endpointUrl: string
  secret: string
  isActive: boolean
  lastReceivedAt: string | null
  receivedCount: number
  createdAt: string
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get<{ data: WebhookSource[] }>('/admin/webhooks'),
  })
}

export function useCreateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; sourceType?: string }) =>
      api.post<{ data: WebhookSource }>('/admin/webhooks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useDeleteWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/admin/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

// ── Audit Log ──

export interface AuditEntry {
  id: string
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string | null
  description: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  ipAddress?: string | null
  createdAt: string
}

export function useAuditLog(filters: { userId?: string; action?: string; entity?: string; page?: number; pageSize?: number } = {}) {
  const params = new URLSearchParams()
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.action) params.set('action', filters.action)
  if (filters.entity) params.set('entity', filters.entity)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
  const qs = params.toString()
  return useQuery({
    queryKey: ['auditLog', filters],
    queryFn: () => api.get<{ data: AuditEntry[]; total: number; page: number; pageSize: number }>(`/admin/audit-log${qs ? `?${qs}` : ''}`),
  })
}

// ── Branding ──

export interface BrandingSettings {
  companyName: string
  companySlogan: string
  logoUrl: string | null
  primaryColor: string
  offerTemplate: string
  footerText: string
}

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: () => api.get<{ data: BrandingSettings }>('/admin/branding'),
  })
}

export function useUpdateBranding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<BrandingSettings>) =>
      api.put<{ data: BrandingSettings }>('/admin/branding', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branding'] }),
  })
}

// ── AI Settings ──

export interface AiSettingsData {
  enabled: boolean
  model: string
  language: string
  maxTokens: number
  systemPrompt: string
  apiKey: string
  features: {
    leadSummary: boolean
    dealAnalysis: boolean
    emailDraft: boolean
  }
}

export function useAiSettings() {
  return useQuery({
    queryKey: ['aiSettings'],
    queryFn: () => api.get<{ data: AiSettingsData }>('/admin/ai-settings'),
  })
}

export function useUpdateAiSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AiSettingsData>) =>
      api.put<{ data: AiSettingsData }>('/admin/ai-settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aiSettings'] }),
  })
}

// ── Notification Settings ──

export interface NotificationSetting {
  event: string
  label: string
  enabled: boolean
  channels: ('IN_APP' | 'EMAIL')[]
  reminderMinutes: number | null
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notifSettings'],
    queryFn: () => api.get<{ data: NotificationSetting[] }>('/admin/notification-settings'),
  })
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: NotificationSetting[]) =>
      api.put<{ data: NotificationSetting[] }>('/admin/notification-settings', { settings }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifSettings'] }),
  })
}

// ── Document Templates ──

export interface FolderDef {
  name: string
  subfolders?: string[]
  allowedRoles?: string[] // Leer = alle Rollen
}

export interface FolderTemplate {
  id: string
  entityType: string
  folders: FolderDef[]
}

export interface DocTemplatesResponse {
  data: FolderTemplate[]
  roles: string[]
}

export function useDocTemplates() {
  return useQuery({
    queryKey: ['docTemplates'],
    queryFn: () => api.get<DocTemplatesResponse>('/admin/doc-templates'),
  })
}

export function useUpdateDocTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entityType, folders }: { entityType: string; folders: FolderDef[] }) =>
      api.put<{ data: FolderTemplate }>(`/admin/doc-templates/${entityType}`, { folders }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docTemplates'] }),
  })
}

export function useAddDocFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entityType, name, subfolders, allowedRoles }: { entityType: string; name: string; subfolders?: string[]; allowedRoles?: string[] }) =>
      api.post<{ data: FolderTemplate }>(`/admin/doc-templates/${entityType}/folders`, { name, subfolders, allowedRoles }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docTemplates'] }),
  })
}

export function useUpdateDocFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entityType, folderName, ...data }: { entityType: string; folderName: string; name?: string; subfolders?: string[]; allowedRoles?: string[] }) =>
      api.put<{ data: FolderTemplate }>(`/admin/doc-templates/${entityType}/folders/${encodeURIComponent(folderName)}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docTemplates'] }),
  })
}

export function useDeleteDocFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entityType, folderName }: { entityType: string; folderName: string }) =>
      api.delete<{ message: string }>(`/admin/doc-templates/${entityType}/folders/${encodeURIComponent(folderName)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docTemplates'] }),
  })
}

// ── DB Export / Stats ──

export interface DbStats {
  leads: number
  appointments: number
  deals: number
  projects: number
  tasks: number
  documents: number
  users: number
  lastBackup: string
  dbSize: string
}

export function useDbStats() {
  return useQuery({
    queryKey: ['dbStats'],
    queryFn: () => api.get<{ data: DbStats }>('/admin/db-export/stats'),
  })
}

// ── Bulk Delete (Admin only) ──

export type BulkDeleteEntity = 'leads' | 'appointments' | 'deals' | 'projects'

export function useBulkDelete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entity: BulkDeleteEntity) =>
      api.delete<{ message: string; count: number }>(`/${entity}/all`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dbStats'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ── Category Labels ──

export const categoryLabels: Record<ProductCategory, string> = {
  PV_MODULE: 'PV-Module',
  INVERTER: 'Wechselrichter',
  BATTERY: 'Batteriespeicher',
  INSTALLATION: 'Installationskosten',
  PARTNER_PRICE: 'Partner-Preise',
}

export const categoryColors: Record<ProductCategory, string> = {
  PV_MODULE: '#F59E0B',
  INVERTER: '#60A5FA',
  BATTERY: '#34D399',
  INSTALLATION: '#A78BFA',
  PARTNER_PRICE: '#FB923C',
}

// ── Deal Kanban Columns ──

export interface DealKanbanColumn {
  stage: string
  label: string
  color: string
  order: number
}

export function useDealKanbanColumns() {
  return useQuery({
    queryKey: ['dealKanbanColumns'],
    queryFn: () => api.get<{ data: DealKanbanColumn[] }>('/admin/deal-kanban'),
  })
}

export function useUpdateDealKanbanColumns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (columns: DealKanbanColumn[]) =>
      api.put<{ data: DealKanbanColumn[] }>('/admin/deal-kanban', { columns }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dealKanbanColumns'] }),
  })
}

// ── Appointment Kanban Columns ──

export interface KanbanColumn {
  status: string
  label: string
  color: string
  order: number
}

export function useKanbanColumns() {
  return useQuery({
    queryKey: ['kanbanColumns'],
    queryFn: () => api.get<{ data: KanbanColumn[] }>('/admin/appointment-kanban'),
  })
}

export function useUpdateKanbanColumns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (columns: KanbanColumn[]) =>
      api.put<{ data: KanbanColumn[] }>('/admin/appointment-kanban', { columns }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanbanColumns'] }),
  })
}

// ── Lead Sources ──

export interface LeadSourceDef {
  id: string
  name: string
  color: string
}

export function useLeadSources() {
  return useQuery({
    queryKey: ['leadSources'],
    queryFn: () => api.get<{ data: LeadSourceDef[] }>('/lead-sources'),
    staleTime: 5 * 60_000, // 5 Min Cache – aendert sich selten
  })
}

export function useUpdateLeadSources() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sources: LeadSourceDef[]) =>
      api.put<{ data: LeadSourceDef[] }>('/admin/lead-sources', { sources }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leadSources'] }),
  })
}

/** Dynamische Label- und Farb-Maps aus den Admin-Quellen (memoisiert) */
export function useLeadSourceMaps() {
  const { data } = useLeadSources()
  const sources = data?.data ?? []
  return useMemo(() => {
    const labels: Record<string, string> = {}
    const colors: Record<string, { bg: string; text: string }> = {}
    for (const s of sources) {
      labels[s.id] = s.name
      colors[s.id] = { bg: `color-mix(in srgb, ${s.color} 10%, transparent)`, text: s.color }
    }
    return { labels, colors, sources }
  }, [sources])
}
