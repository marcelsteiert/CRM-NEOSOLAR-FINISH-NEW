import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type ProjectPhase = 'admin' | 'montage' | 'elektro' | 'abschluss'
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface PhaseProgress {
  admin: number[]
  montage: number[]
  elektro: number[]
  abschluss: number[]
}

export interface Kalkulation {
  soll: number
  ist: number | null
}

export type ProjectActivityType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM'

export interface ProjectActivity {
  id: string
  type: ProjectActivityType
  text: string
  createdBy: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  kWp: number
  value: number
  address: string
  phone: string
  email: string
  company: string | null
  montagePartner: string
  elektroPartner: string
  projectManager: string
  phase: ProjectPhase
  priority: ProjectPriority
  progress: PhaseProgress
  risk: boolean
  riskNote: string | null
  startDate: string
  kalkulation: Kalkulation
  rating: number | null
  leadId: string | null
  appointmentId: string | null
  dealId: string | null
  notes: string | null
  activities: ProjectActivity[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
  deletedAt: string | null
  // computed
  total?: number
  done?: number
  percent?: number
}

export interface PhaseDefinition {
  id: ProjectPhase
  name: string
  color: string
  description: string
  steps: string[]
}

export interface Partner {
  id: string
  name: string
  type: 'montage' | 'elektro'
  projects: number
  avgDays: number
  rating: number
  onTimePercent: number
  activeProjects: number
}

export interface ProjectStats {
  total: number
  totalValue: number
  totalKwp: number
  avgKwp: number
  avgProgress: number
  risks: number
  byPhase: Record<ProjectPhase, { count: number; value: number }>
  kalkulation: { totalSoll: number; totalIst: number; diff: number }
}

// ── API response types ──

interface ProjectListResponse {
  data: Project[]
  total: number
}

interface ProjectResponse {
  data: Project
}

interface PhaseListResponse {
  data: PhaseDefinition[]
}

interface PartnerListResponse {
  data: Partner[]
}

interface StatsResponse {
  data: ProjectStats
}

// ── Query params ──

export interface ProjectFilters {
  phase?: ProjectPhase | 'ALL'
  priority?: ProjectPriority | 'ALL'
  risk?: boolean
  search?: string
  projectManager?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ── Hooks ──

export function useProjects(filters: ProjectFilters = {}) {
  const params = new URLSearchParams()

  if (filters.phase && filters.phase !== 'ALL') params.set('phase', filters.phase)
  if (filters.priority && filters.priority !== 'ALL') params.set('priority', filters.priority)
  if (filters.risk) params.set('risk', 'true')
  if (filters.search) params.set('search', filters.search)
  if (filters.projectManager) params.set('projectManager', filters.projectManager)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

  const qs = params.toString()
  const path = `/projects${qs ? `?${qs}` : ''}`

  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => api.get<ProjectListResponse>(path),
  })
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<ProjectResponse>(`/projects/${id}`),
    enabled: !!id,
  })
}

export function usePhaseDefinitions() {
  return useQuery({
    queryKey: ['projectPhases'],
    queryFn: () => api.get<PhaseListResponse>('/projects/phases'),
    staleTime: Infinity,
  })
}

export function usePartners() {
  return useQuery({
    queryKey: ['projectPartners'],
    queryFn: () => api.get<PartnerListResponse>('/projects/partners'),
  })
}

export function useProjectStats() {
  return useQuery({
    queryKey: ['projectStats'],
    queryFn: () => api.get<StatsResponse>('/projects/stats'),
  })
}

// ── Mutations ──

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Project> & { name: string; description: string; kWp: number; value: number; address: string; email: string }) =>
      api.post<ProjectResponse>('/projects', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projectStats'] })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Project> & { id: string }) =>
      api.put<ProjectResponse>(`/projects/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['projectStats'] })
    },
  })
}

export function useToggleStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, phase, stepIndex }: { projectId: string; phase: ProjectPhase; stepIndex: number }) =>
      api.put<ProjectResponse>(`/projects/${projectId}/toggle-step`, { phase, stepIndex }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['projectStats'] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projectStats'] })
    },
  })
}

export function useAddProjectActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, ...data }: { projectId: string; type?: ProjectActivityType; text: string; createdBy?: string }) =>
      api.post<{ data: ProjectActivity }>(`/projects/${projectId}/activities`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ── Display helpers ──

export const phaseLabels: Record<ProjectPhase, string> = {
  admin: 'Administration',
  montage: 'Montage',
  elektro: 'Elektriker',
  abschluss: 'Abschluss',
}

export const phaseColors: Record<ProjectPhase, string> = {
  admin: '#60A5FA',
  montage: '#FB923C',
  elektro: '#F59E0B',
  abschluss: '#34D399',
}

export const priorityLabels: Record<ProjectPriority, string> = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
}

export const priorityColors: Record<ProjectPriority, string> = {
  LOW: '#94A3B8',
  MEDIUM: '#60A5FA',
  HIGH: '#F59E0B',
  URGENT: '#F87171',
}

export const activityTypeLabels: Record<ProjectActivityType, string> = {
  NOTE: 'Notiz',
  CALL: 'Anruf',
  EMAIL: 'E-Mail',
  MEETING: 'Meeting',
  STATUS_CHANGE: 'Status',
  SYSTEM: 'System',
}

export const activityTypeColors: Record<ProjectActivityType, string> = {
  NOTE: '#94A3B8',
  CALL: '#F59E0B',
  EMAIL: '#60A5FA',
  MEETING: '#A78BFA',
  STATUS_CHANGE: '#34D399',
  SYSTEM: '#64748B',
}

export function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function computePhaseProgress(progress: PhaseProgress, phase: ProjectPhase) {
  const arr = progress[phase]
  const done = arr.filter(Boolean).length
  return { done, total: arr.length, percent: arr.length ? Math.round((done / arr.length) * 100) : 0 }
}
