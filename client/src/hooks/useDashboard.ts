import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export interface DashboardStats {
  deals: {
    totalDeals: number
    totalValue: number
    pipelineValue: number
    weightedPipelineValue: number
    stages: Record<string, { count: number; value: number }>
    avgDealValue: number
    wonDeals: number
    lostDeals: number
    winRate: number
  }
  appointments: {
    total: number
    upcoming: number
    totalValue: number
    completed: number
    cancelled: number
    checklistProgress: number
  }
  tasks: {
    open: number
    inProgress: number
    completed: number
    overdue: number
    total: number
  }
}

export interface MonthlyData {
  month: string
  label: string
  wonDeals: number
  wonValue: number
  lostDeals: number
  totalAppointments: number
  completedAppointments: number
  provision: number
}

export interface ProvisionEntry {
  userId: string
  userName: string
  userRole: string
  deals: { id: string; title: string; value: number; closedAt: string }[]
  totalValue: number
  provisionRate: number
  provision: number
}

export interface ProvisionData {
  month: string
  provisions: ProvisionEntry[]
  summary: {
    totalValue: number
    totalProvision: number
    totalDeals: number
  }
}

// ── Response types ──

interface StatsResponse {
  data: DashboardStats
}

interface MonthlyResponse {
  data: MonthlyData[]
}

interface ProvisionResponse {
  data: ProvisionData
}

// ── Hooks ──

export function useDashboardStats(assignedTo?: string) {
  const qs = assignedTo ? `?assignedTo=${assignedTo}` : ''
  return useQuery({
    queryKey: ['dashboardStats', assignedTo],
    queryFn: () => api.get<StatsResponse>(`/dashboard/stats${qs}`),
  })
}

export function useMonthlyStats(assignedTo?: string) {
  const qs = assignedTo ? `?assignedTo=${assignedTo}` : ''
  return useQuery({
    queryKey: ['monthlyStats', assignedTo],
    queryFn: () => api.get<MonthlyResponse>(`/dashboard/monthly${qs}`),
  })
}

export function useProvision(month?: string) {
  const qs = month ? `?month=${month}` : ''
  return useQuery({
    queryKey: ['provision', month],
    queryFn: () => api.get<ProvisionResponse>(`/dashboard/provision${qs}`),
  })
}
