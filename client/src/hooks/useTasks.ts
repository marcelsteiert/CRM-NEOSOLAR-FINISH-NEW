import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type TaskStatus = 'OFFEN' | 'IN_BEARBEITUNG' | 'ERLEDIGT'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskModule = 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT' | 'ALLGEMEIN'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  module: TaskModule
  referenceId: string | null
  referenceTitle: string | null
  assignedTo: string
  assignedBy: string
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskStats {
  open: number
  inProgress: number
  completed: number
  overdue: number
  total: number
}

// ── Response types ──

interface TaskListResponse {
  data: Task[]
  total: number
}

interface TaskResponse {
  data: Task
}

interface TaskStatsResponse {
  data: TaskStats
}

// ── Filters ──

export interface TaskFilters {
  assignedTo?: string
  status?: TaskStatus
  module?: TaskModule
  priority?: TaskPriority
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ── Hooks ──

export function useTasks(filters: TaskFilters = {}) {
  const params = new URLSearchParams()

  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
  if (filters.status) params.set('status', filters.status)
  if (filters.module) params.set('module', filters.module)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.search) params.set('search', filters.search)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

  const qs = params.toString()
  const path = `/tasks${qs ? `?${qs}` : ''}`

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.get<TaskListResponse>(path),
  })
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get<TaskResponse>(`/tasks/${id}`),
    enabled: !!id,
  })
}

export function useTaskStats(assignedTo?: string) {
  const qs = assignedTo ? `?assignedTo=${assignedTo}` : ''
  return useQuery({
    queryKey: ['taskStats', assignedTo],
    queryFn: () => api.get<TaskStatsResponse>(`/tasks/stats${qs}`),
  })
}

// ── Mutations ──

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      description?: string
      priority?: TaskPriority
      module?: TaskModule
      referenceId?: string
      referenceTitle?: string
      assignedTo: string
      assignedBy?: string
      dueDate?: string
    }) => api.post<TaskResponse>('/tasks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['taskStats'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assignedTo' | 'dueDate'>>) =>
      api.put<TaskResponse>(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
      qc.invalidateQueries({ queryKey: ['taskStats'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['taskStats'] })
    },
  })
}

// ── Display helpers ──

export const taskStatusLabels: Record<TaskStatus, string> = {
  OFFEN: 'Offen',
  IN_BEARBEITUNG: 'In Bearbeitung',
  ERLEDIGT: 'Erledigt',
}

export const taskStatusColors: Record<TaskStatus, string> = {
  OFFEN: '#60A5FA',
  IN_BEARBEITUNG: '#F59E0B',
  ERLEDIGT: '#34D399',
}

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
}

export const taskPriorityColors: Record<TaskPriority, string> = {
  LOW: '#94A3B8',
  MEDIUM: '#60A5FA',
  HIGH: '#F59E0B',
  URGENT: '#F87171',
}

export const taskModuleLabels: Record<TaskModule, string> = {
  LEAD: 'Lead',
  TERMIN: 'Termin',
  ANGEBOT: 'Angebot',
  PROJEKT: 'Projekt',
  ALLGEMEIN: 'Allgemein',
}

export const taskModuleColors: Record<TaskModule, string> = {
  LEAD: '#60A5FA',
  TERMIN: '#34D399',
  ANGEBOT: '#A78BFA',
  PROJEKT: '#FB923C',
  ALLGEMEIN: '#94A3B8',
}
