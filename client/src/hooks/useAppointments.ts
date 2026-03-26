import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type AppointmentStatus =
  | 'GEPLANT'
  | 'BESTAETIGT'
  | 'VORBEREITUNG'
  | 'DURCHGEFUEHRT'
  | 'ABGESAGT'

export type AppointmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type AppointmentType = 'VOR_ORT' | 'ONLINE' | 'RICHTOFFERTE'

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface Appointment {
  id: string
  contactId: string
  leadId: string | null
  contactName: string
  contactEmail: string
  contactPhone: string
  company: string | null
  address: string
  value: number
  status: AppointmentStatus
  priority: AppointmentPriority
  appointmentType: AppointmentType
  assignedTo: string | null
  appointmentDate: string | null
  appointmentTime: string | null
  preparationNotes: string | null
  checklist: ChecklistItem[]
  notes: string | null
  travelMinutes: number | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  deletedAt: string | null
}

export interface AppointmentStats {
  total: number
  upcoming: number
  totalValue: number
  statuses: Record<AppointmentStatus, number>
  completed: number
  cancelled: number
  checklistProgress: number
}

// ── API response types ──

interface AppointmentListResponse {
  data: Appointment[]
  total: number
  page: number
  pageSize: number
}

interface AppointmentResponse {
  data: Appointment
}

interface AppointmentStatsResponse {
  data: AppointmentStats
}

// ── Filter params ──

export interface AppointmentFilters {
  status?: AppointmentStatus | 'ALL'
  priority?: AppointmentPriority | 'ALL'
  appointmentType?: AppointmentType | 'ALL'
  assignedTo?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// ── Hooks ──

export function useAppointments(filters: AppointmentFilters = {}) {
  const params = new URLSearchParams()

  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status)
  if (filters.priority && filters.priority !== 'ALL') params.set('priority', filters.priority)
  if (filters.appointmentType && filters.appointmentType !== 'ALL') params.set('appointmentType', filters.appointmentType)
  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
  if (filters.search) params.set('search', filters.search)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const path = `/appointments${qs ? `?${qs}` : ''}`

  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => api.get<AppointmentListResponse>(path),
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
  })
}

export function useAppointment(id: string | null) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api.get<AppointmentResponse>(`/appointments/${id}`),
    enabled: !!id,
  })
}

export function useAppointmentStats(assignedTo?: string) {
  const qs = assignedTo ? `?assignedTo=${assignedTo}` : ''
  return useQuery({
    queryKey: ['appointmentStats', assignedTo],
    queryFn: () => api.get<AppointmentStatsResponse>(`/appointments/stats${qs}`),
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      data: Partial<Appointment> & {
        contactName: string
        contactEmail: string
        contactPhone: string
        address: string
      },
    ) => api.post<AppointmentResponse>('/appointments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['appointmentStats'] })
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Appointment> & { id: string }) =>
      api.put<AppointmentResponse>(`/appointments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['appointment'] })
      qc.invalidateQueries({ queryKey: ['appointmentStats'] })
    },
  })
}

export function useDeleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/appointments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['appointmentStats'] })
    },
  })
}

// ── Display helpers ──

export const statusLabels: Record<AppointmentStatus, string> = {
  GEPLANT: 'Geplant',
  BESTAETIGT: 'Bestätigt',
  VORBEREITUNG: 'In Vorbereitung',
  DURCHGEFUEHRT: 'Durchgeführt',
  ABGESAGT: 'Abgesagt',
}

export const statusColors: Record<AppointmentStatus, string> = {
  GEPLANT: '#60A5FA',
  BESTAETIGT: '#34D399',
  VORBEREITUNG: '#F59E0B',
  DURCHGEFUEHRT: '#A78BFA',
  ABGESAGT: '#F87171',
}

export const appointmentTypeLabels: Record<AppointmentType, string> = {
  VOR_ORT: 'Vor Ort',
  ONLINE: 'Online',
  RICHTOFFERTE: 'Richtofferte',
}

export const appointmentTypeColors: Record<AppointmentType, string> = {
  VOR_ORT: '#34D399',
  ONLINE: '#60A5FA',
  RICHTOFFERTE: '#F59E0B',
}

export const priorityLabels: Record<AppointmentPriority, string> = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
}

export const priorityColors: Record<AppointmentPriority, string> = {
  LOW: '#94A3B8',
  MEDIUM: '#60A5FA',
  HIGH: '#F59E0B',
  URGENT: '#F87171',
}

export function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
