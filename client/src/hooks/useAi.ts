import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export interface AiSummaryResult {
  summary: string | null
  model?: string
  tokensUsed?: number
  durationMs?: number
  error?: string
}

export interface AiGeneration {
  id: string
  entityType: string
  entityId: string | null
  userId: string
  promptSummary: string | null
  result: string
  model: string
  tokensUsed: number
  durationMs: number
  createdAt: string
}

export interface AiTestResult {
  success: boolean
  message: string
  model?: string
}

// ── Lead Summary ──

export function useGenerateLeadSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leadId: string) =>
      api.post<{ data: AiSummaryResult }>(`/ai/lead-summary/${leadId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['aiHistory'] })
    },
  })
}

// ── Deal Summary ──

export function useGenerateDealSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dealId: string) =>
      api.post<{ data: AiSummaryResult }>(`/ai/deal-summary/${dealId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['aiHistory'] })
    },
  })
}

// ── Contact Summary ──

export function useGenerateContactSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) =>
      api.post<{ data: AiSummaryResult }>(`/ai/contact-summary/${contactId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aiHistory'] })
    },
  })
}

// ── Briefing ──

export function useGenerateBriefing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ data: AiSummaryResult }>('/ai/briefing', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aiHistory'] })
    },
  })
}

// ── Test Connection ──

export function useTestAiConnection() {
  return useMutation({
    mutationFn: () =>
      api.post<{ data: AiTestResult }>('/ai/test', {}),
  })
}

// ── History ──

interface HistoryFilters {
  entityType?: string
  page?: number
  limit?: number
}

export function useAiHistory(filters: HistoryFilters = {}) {
  const params = new URLSearchParams()
  if (filters.entityType) params.set('entityType', filters.entityType)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()

  return useQuery({
    queryKey: ['aiHistory', filters],
    queryFn: () => api.get<{ data: AiGeneration[]; total: number }>(`/ai/history${qs ? `?${qs}` : ''}`),
  })
}
