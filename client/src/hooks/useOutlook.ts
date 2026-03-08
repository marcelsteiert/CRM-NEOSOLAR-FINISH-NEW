import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export interface OutlookStatus {
  connected: boolean
  email?: string
  displayName?: string
  lastSyncAt?: string
  connectionId?: string
}

export interface OutlookEmail {
  id: string
  messageId: string
  conversationId: string
  internetMessageId: string
  subject: string
  bodyPreview: string
  bodyHtml: string | null
  bodyText: string | null
  senderEmail: string
  senderName: string
  toRecipients: { name: string; email: string }[]
  ccRecipients: { name: string; email: string }[]
  bccRecipients: { name: string; email: string }[]
  receivedAt: string
  sentAt: string
  isRead: boolean
  isDraft: boolean
  hasAttachments: boolean
  importance: string
  folder: string
  categories: string[]
  contactId: string | null
  leadId: string | null
  dealId: string | null
  projectId: string | null
  isMatched: boolean
  matchedAt: string | null
  aiSummary: string | null
  aiSentiment: string | null
  aiFollowUpDetected: boolean
  aiFollowUpDate: string | null
  trackingId: string | null
  openedAt: string | null
  openCount: number
  clickCount: number
  createdAt: string
  updatedAt: string
  attachments?: OutlookAttachment[]
}

export interface OutlookAttachment {
  id: string
  attachmentId: string
  name: string
  contentType: string
  size: number
  isInline: boolean
  storagePath: string | null
}

export interface OutlookCalendarEvent {
  id: string
  eventId: string
  subject: string
  bodyHtml: string | null
  bodyText: string | null
  startAt: string
  endAt: string
  isAllDay: boolean
  location: string | null
  onlineMeetingUrl: string | null
  organizerEmail: string
  organizerName: string
  attendees: { name: string; email: string; response: string }[]
  status: string
  isCancelled: boolean
  contactId: string | null
  dealId: string | null
  projectId: string | null
  aiSummary: string | null
  aiActionItems: string[]
}

export interface OutlookTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string
  category: string
  variables: string[]
  isShared: boolean
  useCount: number
}

export interface OutlookSignature {
  id: string
  name: string
  bodyHtml: string
  isDefault: boolean
}

export interface OutlookStats {
  connected: boolean
  totalEmails: number
  unreadEmails: number
  matchedEmails: number
  calendarEvents: number
  recentSyncs: any[]
}

export interface EmailTrackingEntry {
  id: string
  trackingId: string
  recipientEmail: string
  subject: string
  sentAt: string
  firstOpenedAt: string | null
  lastOpenedAt: string | null
  openCount: number
  clickCount: number
}

// ── Connection ──

export function useOutlookStatus() {
  return useQuery({
    queryKey: ['outlook', 'status'],
    queryFn: () => api.get<{ data: OutlookStatus }>('/outlook/status'),
  })
}

export function useOutlookConnect() {
  return useMutation({
    mutationFn: () => api.get<{ data: { url: string } }>('/outlook/connect'),
  })
}

export function useOutlookDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ message: string }>('/outlook/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outlook'] })
    },
  })
}

// ── Sync ──

export function useOutlookSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ data: any }>('/outlook/sync', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outlook'] })
    },
  })
}

// ── Emails ──

interface EmailFilters {
  folder?: string
  search?: string
  contactId?: string
  dealId?: string
  projectId?: string
  page?: number
  limit?: number
  unreadOnly?: boolean
}

export function useOutlookEmails(filters: EmailFilters = {}) {
  const params = new URLSearchParams()
  if (filters.folder) params.set('folder', filters.folder)
  if (filters.search) params.set('search', filters.search)
  if (filters.contactId) params.set('contactId', filters.contactId)
  if (filters.dealId) params.set('dealId', filters.dealId)
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.unreadOnly) params.set('unreadOnly', 'true')

  const qs = params.toString()
  return useQuery({
    queryKey: ['outlook', 'emails', filters],
    queryFn: () => api.get<{ data: OutlookEmail[]; total: number }>(`/outlook/emails${qs ? `?${qs}` : ''}`),
    refetchInterval: 60_000,
  })
}

export function useOutlookEmail(id: string | null) {
  return useQuery({
    queryKey: ['outlook', 'email', id],
    queryFn: () => api.get<{ data: OutlookEmail }>(`/outlook/emails/${id}`),
    enabled: !!id,
  })
}

export function useOutlookEmailThread(id: string | null) {
  return useQuery({
    queryKey: ['outlook', 'thread', id],
    queryFn: () => api.get<{ data: OutlookEmail[] }>(`/outlook/emails/${id}/thread`),
    enabled: !!id,
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<{ message: string }>(`/outlook/emails/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outlook', 'emails'] })
    },
  })
}

export function useLinkEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; contactId?: string; dealId?: string; projectId?: string; leadId?: string }) =>
      api.put<{ data: OutlookEmail }>(`/outlook/emails/${id}/link`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outlook', 'emails'] })
    },
  })
}

// ── Send Email ──

interface SendEmailData {
  to: { email: string; name?: string }[]
  cc?: { email: string; name?: string }[]
  bcc?: { email: string; name?: string }[]
  subject: string
  bodyHtml: string
  importance?: 'low' | 'normal' | 'high'
  contactId?: string
  dealId?: string
  projectId?: string
  trackingEnabled?: boolean
  scheduledAt?: string
  replyToMessageId?: string
}

export function useSendEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendEmailData) => api.post<{ message: string; trackingId?: string }>('/outlook/send', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outlook', 'emails'] })
    },
  })
}

// ── Calendar ──

interface CalendarFilters {
  start?: string
  end?: string
  contactId?: string
}

export function useOutlookCalendar(filters: CalendarFilters = {}) {
  const params = new URLSearchParams()
  if (filters.start) params.set('start', filters.start)
  if (filters.end) params.set('end', filters.end)
  if (filters.contactId) params.set('contactId', filters.contactId)
  const qs = params.toString()

  return useQuery({
    queryKey: ['outlook', 'calendar', filters],
    queryFn: () => api.get<{ data: OutlookCalendarEvent[] }>(`/outlook/calendar${qs ? `?${qs}` : ''}`),
  })
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post<{ data: any }>('/outlook/calendar', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outlook', 'calendar'] })
    },
  })
}

// ── Templates ──

export function useOutlookTemplates() {
  return useQuery({
    queryKey: ['outlook', 'templates'],
    queryFn: () => api.get<{ data: OutlookTemplate[] }>('/outlook/templates'),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<OutlookTemplate>) => api.post<{ data: OutlookTemplate }>('/outlook/templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlook', 'templates'] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<OutlookTemplate> & { id: string }) =>
      api.put<{ data: OutlookTemplate }>(`/outlook/templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlook', 'templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/outlook/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlook', 'templates'] }),
  })
}

// ── Signatures ──

export function useOutlookSignatures() {
  return useQuery({
    queryKey: ['outlook', 'signatures'],
    queryFn: () => api.get<{ data: OutlookSignature[] }>('/outlook/signatures'),
  })
}

export function useCreateSignature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; bodyHtml: string; isDefault?: boolean }) =>
      api.post<{ data: OutlookSignature }>('/outlook/signatures', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlook', 'signatures'] }),
  })
}

// ── Tracking ──

export function useEmailTracking() {
  return useQuery({
    queryKey: ['outlook', 'tracking'],
    queryFn: () => api.get<{ data: EmailTrackingEntry[] }>('/outlook/tracking'),
  })
}

// ── Stats ──

export function useOutlookStats() {
  return useQuery({
    queryKey: ['outlook', 'stats'],
    queryFn: () => api.get<{ data: OutlookStats }>('/outlook/stats'),
  })
}
