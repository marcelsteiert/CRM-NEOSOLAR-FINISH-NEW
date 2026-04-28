// ===========================================================================
// CRM Hooks: Kundenportal-Verwaltung (Admin-Seite)
// ===========================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type MilestoneStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
export type GroupKey = 'BEWILLIGUNGEN' | 'MONTAGE' | 'INBETRIEBNAHME' | 'ABSCHLUSS'

export interface PortalMilestone {
  id: string
  projectId: string
  milestoneKey: string
  groupKey: GroupKey
  label: string
  sortOrder: number
  status: MilestoneStatus
  completedAt: string | null
  scheduledDate: string | null
  comment: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface MilestoneTemplate {
  key: string
  group: GroupKey
  label: string
  customerLabel: string
  description: string
  emailSubject: string
  emailBody: string
}

export interface MilestoneGroup {
  label: string
  description: string
  color: string
  icon: string
}

export interface PortalUser {
  id: string
  email: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface PortalEmailLogEntry {
  id: string
  emailType: string
  recipient: string
  subject: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'LOGGED'
  sentAt: string | null
  createdAt: string
  errorMessage: string | null
}

export interface AdminPortalProjectData {
  project: { id: string; name: string; contactId: string }
  portalUser: PortalUser | null
  milestones: PortalMilestone[]
  milestoneGroups: Record<GroupKey, MilestoneGroup>
  milestoneTemplates: MilestoneTemplate[]
  emailLog: PortalEmailLogEntry[]
}

// ── Queries ──

export function useAdminPortalProject(projectId: string | null) {
  return useQuery({
    queryKey: ['admin-portal', projectId],
    queryFn: () => api.get<{ data: AdminPortalProjectData }>(`/admin/portal/projects/${projectId}`),
    enabled: !!projectId,
  })
}

// ── Mutations ──

export function useActivatePortal(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { email?: string; sendEmail?: boolean }) =>
      api.post<{ data: { portalUserId: string; email: string } }>(
        `/admin/portal/projects/${projectId}/activate`,
        params,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portal', projectId] }),
  })
}

export function useDeactivatePortal(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ message: string }>(`/admin/portal/projects/${projectId}/deactivate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portal', projectId] }),
  })
}

export function useGeneratePortalLink(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { sendEmail?: boolean } = {}) =>
      api.post<{ data: { loginUrl: string; recipient: string; sent: boolean; expiresInMinutes: number } }>(
        `/admin/portal/projects/${projectId}/send-link`,
        { sendEmail: params.sendEmail ?? false },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portal', projectId] }),
  })
}

export function useUpdateMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      id: string
      status?: MilestoneStatus
      scheduledDate?: string | null
      comment?: string | null
      label?: string
      sendEmail?: boolean
    }) =>
      api.put<{ data: PortalMilestone }>(`/admin/portal/milestones/${params.id}`, {
        status: params.status,
        scheduledDate: params.scheduledDate,
        comment: params.comment,
        label: params.label,
        sendEmail: params.sendEmail,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portal', projectId] }),
  })
}

export function useCreateMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      groupKey: GroupKey
      label: string
      scheduledDate?: string | null
      comment?: string | null
    }) =>
      api.post<{ data: PortalMilestone }>(`/admin/portal/projects/${projectId}/milestones`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portal', projectId] }),
  })
}

export function useDeleteMilestone(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/admin/portal/milestones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portal', projectId] }),
  })
}

export function useInitMilestones(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ data: PortalMilestone[] }>(
        `/admin/portal/projects/${projectId}/init-milestones`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portal', projectId] }),
  })
}

// ── Helper ──

export const milestoneStatusLabels: Record<MilestoneStatus, string> = {
  OPEN: 'Offen',
  IN_PROGRESS: 'In Bearbeitung',
  DONE: 'Erledigt',
  BLOCKED: 'Blockiert',
}

export const milestoneStatusColors: Record<MilestoneStatus, string> = {
  OPEN: '#525E6F',
  IN_PROGRESS: '#F59E0B',
  DONE: '#34D399',
  BLOCKED: '#F87171',
}
