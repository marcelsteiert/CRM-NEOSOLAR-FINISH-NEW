import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type CalendarEventType = 'MONTAGE' | 'ELEKTRO' | 'WARTUNG' | 'BEGEHUNG' | 'ABNAHME' | 'INTERN' | 'SONSTIGES'
export type CalendarEventStatus = 'GEPLANT' | 'BESTAETIGT' | 'IN_ARBEIT' | 'ABGESCHLOSSEN' | 'ABGESAGT'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  eventType: CalendarEventType
  startDate: string
  endDate: string
  allDay: boolean
  location: string | null
  color: string | null
  contactId: string | null
  projectId: string | null
  assignedTo: string | null
  createdBy: string | null
  status: CalendarEventStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  // Joins
  contact?: { firstName: string; lastName: string; company: string | null } | null
  project?: { name: string } | null
  assignee?: { firstName: string; lastName: string } | null
}

// ── Response types ──

interface EventListResponse {
  data: CalendarEvent[]
  total: number
}

interface EventResponse {
  data: CalendarEvent
}

// ── Filters ──

export interface CalendarFilters {
  startDate?: string
  endDate?: string
  eventType?: CalendarEventType | 'ALL'
  assignedTo?: string
  status?: CalendarEventStatus | 'ALL'
  projectId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ── Hooks ──

export function useCalendarEvents(filters: CalendarFilters = {}) {
  const params = new URLSearchParams()

  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.eventType && filters.eventType !== 'ALL') params.set('eventType', filters.eventType)
  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status)
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

  const qs = params.toString()
  const path = `/calendar${qs ? `?${qs}` : ''}`

  return useQuery({
    queryKey: ['calendarEvents', filters],
    queryFn: () => api.get<EventListResponse>(path),
  })
}

export function useCalendarEvent(id: string | null) {
  return useQuery({
    queryKey: ['calendarEvent', id],
    queryFn: () => api.get<EventResponse>(`/calendar/${id}`),
    enabled: !!id,
  })
}

// ── Mutations ──

export function useCreateCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      description?: string | null
      eventType?: CalendarEventType
      startDate: string
      endDate: string
      allDay?: boolean
      location?: string | null
      color?: string | null
      contactId?: string | null
      projectId?: string | null
      assignedTo?: string | null
      status?: CalendarEventStatus
      notes?: string | null
    }) => api.post<EventResponse>('/calendar', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendarEvents'] })
    },
  })
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'contact' | 'project' | 'assignee'>>) =>
      api.put<EventResponse>(`/calendar/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendarEvents'] })
      qc.invalidateQueries({ queryKey: ['calendarEvent'] })
    },
  })
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/calendar/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendarEvents'] })
    },
  })
}

// ── Display helpers ──

export const eventTypeLabels: Record<CalendarEventType, string> = {
  MONTAGE: 'Montage',
  ELEKTRO: 'Elektro',
  WARTUNG: 'Wartung',
  BEGEHUNG: 'Begehung',
  ABNAHME: 'Abnahme',
  INTERN: 'Intern',
  SONSTIGES: 'Sonstiges',
}

export const eventTypeColors: Record<CalendarEventType, string> = {
  MONTAGE: '#F59E0B',
  ELEKTRO: '#60A5FA',
  WARTUNG: '#34D399',
  BEGEHUNG: '#A78BFA',
  ABNAHME: '#FB923C',
  INTERN: '#94A3B8',
  SONSTIGES: '#F472B6',
}

export const eventStatusLabels: Record<CalendarEventStatus, string> = {
  GEPLANT: 'Geplant',
  BESTAETIGT: 'Bestätigt',
  IN_ARBEIT: 'In Arbeit',
  ABGESCHLOSSEN: 'Abgeschlossen',
  ABGESAGT: 'Abgesagt',
}

export const eventStatusColors: Record<CalendarEventStatus, string> = {
  GEPLANT: '#60A5FA',
  BESTAETIGT: '#34D399',
  IN_ARBEIT: '#F59E0B',
  ABGESCHLOSSEN: '#10B981',
  ABGESAGT: '#F87171',
}
