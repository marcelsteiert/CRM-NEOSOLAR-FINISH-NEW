import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types – Angebote ──

export type DealStage =
  | 'ERSTELLT'
  | 'GESENDET'
  | 'FOLLOW_UP'
  | 'VERHANDLUNG'
  | 'GEWONNEN'
  | 'VERLOREN'

export type DealPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Deal {
  id: string
  title: string
  leadId: string | null
  appointmentId: string | null
  contactName: string
  contactEmail: string
  contactPhone: string
  company: string | null
  address: string
  value: number
  stage: DealStage
  priority: DealPriority
  assignedTo: string | null
  expectedCloseDate: string | null
  notes: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  closedAt: string | null
  deletedAt: string | null
}

export interface DealStats {
  totalDeals: number
  totalValue: number
  pipelineValue: number
  stages: Record<DealStage, { count: number; value: number }>
  avgDealValue: number
  wonDeals: number
  lostDeals: number
  winRate: number
}

// ── API response types ──

interface DealListResponse {
  data: Deal[]
  total: number
  page: number
  pageSize: number
}

interface DealResponse {
  data: Deal
}

interface DealStatsResponse {
  data: DealStats
}

// ── Follow-Up types ──

export interface FollowUp {
  id: string
  dealId: string
  dealTitle: string
  contactName: string
  contactPhone: string
  company: string | null
  stage: DealStage
  priority: DealPriority
  value: number
  assignedTo: string | null
  daysSinceUpdate: number
  maxDays: number
  overdue: boolean
  message: string
  urgency: 'WARNING' | 'OVERDUE' | 'CRITICAL'
}

export interface FollowUpResponse {
  data: FollowUp[]
  total: number
  critical: number
  overdue: number
  warning: number
}

// ── Query params ──

export interface DealFilters {
  stage?: DealStage | 'ALL'
  priority?: DealPriority | 'ALL'
  assignedTo?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// ── Hooks ──

export function useDeals(filters: DealFilters = {}) {
  const params = new URLSearchParams()

  if (filters.stage && filters.stage !== 'ALL') params.set('stage', filters.stage)
  if (filters.priority && filters.priority !== 'ALL') params.set('priority', filters.priority)
  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
  if (filters.search) params.set('search', filters.search)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))

  const qs = params.toString()
  const path = `/deals${qs ? `?${qs}` : ''}`

  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () => api.get<DealListResponse>(path),
  })
}

export function useDeal(id: string | null) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.get<DealResponse>(`/deals/${id}`),
    enabled: !!id,
  })
}

export function useDealStats(assignedTo?: string) {
  const qs = assignedTo ? `?assignedTo=${assignedTo}` : ''
  return useQuery({
    queryKey: ['dealStats', assignedTo],
    queryFn: () => api.get<DealStatsResponse>(`/deals/stats${qs}`),
  })
}

export function useFollowUps(assignedTo?: string) {
  const qs = assignedTo ? `?assignedTo=${assignedTo}` : ''
  return useQuery({
    queryKey: ['followUps', assignedTo],
    queryFn: () => api.get<FollowUpResponse>(`/deals/follow-ups${qs}`),
    refetchInterval: 60000,
  })
}

// ── Mutations ──

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Deal> & { title: string; contactName: string; contactEmail: string; contactPhone: string; address: string }) =>
      api.post<DealResponse>('/deals', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['dealStats'] })
    },
  })
}

export function useUpdateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Deal> & { id: string }) =>
      api.put<DealResponse>(`/deals/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['deal'] })
      qc.invalidateQueries({ queryKey: ['dealStats'] })
    },
  })
}

export function useDeleteDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/deals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['dealStats'] })
    },
  })
}

// ── Display helpers ──

export const stageLabels: Record<DealStage, string> = {
  ERSTELLT: 'Erstellt',
  GESENDET: 'Gesendet',
  FOLLOW_UP: 'Follow-Up',
  VERHANDLUNG: 'Verhandlung',
  GEWONNEN: 'Gewonnen',
  VERLOREN: 'Verloren',
}

export const stageColors: Record<DealStage, string> = {
  ERSTELLT: '#60A5FA',
  GESENDET: '#A78BFA',
  FOLLOW_UP: '#F59E0B',
  VERHANDLUNG: '#FB923C',
  GEWONNEN: '#34D399',
  VERLOREN: '#F87171',
}

export const priorityLabels: Record<DealPriority, string> = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
}

export const priorityColors: Record<DealPriority, string> = {
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
