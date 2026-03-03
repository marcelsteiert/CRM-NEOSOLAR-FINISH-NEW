import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type DealStage =
  | 'QUALIFICATION'
  | 'NEEDS_ANALYSIS'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

export type DealPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Deal {
  id: string
  title: string
  leadId: string | null
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

// ── Query params ──

export interface DealFilters {
  stage?: DealStage | 'ALL'
  priority?: DealPriority | 'ALL'
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

export function useDealStats() {
  return useQuery({
    queryKey: ['dealStats'],
    queryFn: () => api.get<DealStatsResponse>('/deals/stats'),
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
  QUALIFICATION: 'Qualifikation',
  NEEDS_ANALYSIS: 'Bedarfsanalyse',
  PROPOSAL: 'Offerte',
  NEGOTIATION: 'Verhandlung',
  CLOSED_WON: 'Gewonnen',
  CLOSED_LOST: 'Verloren',
}

export const stageColors: Record<DealStage, string> = {
  QUALIFICATION: '#60A5FA',
  NEEDS_ANALYSIS: '#A78BFA',
  PROPOSAL: '#F59E0B',
  NEGOTIATION: '#FB923C',
  CLOSED_WON: '#34D399',
  CLOSED_LOST: '#F87171',
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
