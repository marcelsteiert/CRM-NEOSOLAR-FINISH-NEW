import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string | null
  referenceType: string | null
  referenceId: string | null
  referenceTitle: string | null
  read: boolean
  readAt: string | null
  createdAt: string
}

interface NotificationListResponse {
  data: Notification[]
  total: number
}

interface UnreadCountResponse {
  data: { count: number }
}

// ── Filters ──

export interface NotificationFilters {
  type?: string
  read?: boolean
  limit?: number
  offset?: number
}

// ── Hooks ──

export function useNotifications(filters: NotificationFilters = {}) {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.read !== undefined) params.set('read', String(filters.read))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  const qs = params.toString()

  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => api.get<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ''}`),
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notificationsUnread'],
    queryFn: () => api.get<UnreadCountResponse>('/notifications/unread-count'),
    refetchInterval: 30_000, // Alle 30s pruefen
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<{ message: string }>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] })
    },
  })
}

export function useMarkAllAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.put<{ message: string }>('/notifications/mark-all-read', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] })
    },
  })
}

export function useClearReadNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ message: string }>('/notifications/clear-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] })
    },
  })
}

// ── Display Helpers ──

export const notificationTypeLabels: Record<string, string> = {
  LEAD_CREATED: 'Lead erstellt',
  LEAD_ASSIGNED: 'Lead zugewiesen',
  APPOINTMENT_REMINDER: 'Termin-Erinnerung',
  APPOINTMENT_CONFIRMED: 'Termin bestätigt',
  DEAL_STATUS_CHANGE: 'Status geändert',
  DEAL_WON: 'Angebot gewonnen',
  DEAL_LOST: 'Angebot verloren',
  FOLLOW_UP_DUE: 'Follow-Up fällig',
  TASK_ASSIGNED: 'Aufgabe zugewiesen',
  TASK_OVERDUE: 'Aufgabe überfällig',
  PROJEKT_UPDATE: 'Projekt-Update',
  DOCUMENT_UPLOADED: 'Dokument hochgeladen',
  SYSTEM: 'System',
}

export const notificationTypeColors: Record<string, string> = {
  LEAD_CREATED: '#60A5FA',
  LEAD_ASSIGNED: '#60A5FA',
  APPOINTMENT_REMINDER: '#F59E0B',
  APPOINTMENT_CONFIRMED: '#34D399',
  DEAL_STATUS_CHANGE: '#A78BFA',
  DEAL_WON: '#34D399',
  DEAL_LOST: '#F87171',
  FOLLOW_UP_DUE: '#FB923C',
  TASK_ASSIGNED: '#22D3EE',
  TASK_OVERDUE: '#F87171',
  PROJEKT_UPDATE: '#FB923C',
  DOCUMENT_UPLOADED: '#94A3B8',
  SYSTEM: '#94A3B8',
}
