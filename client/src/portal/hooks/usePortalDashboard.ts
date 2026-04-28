import { useQuery } from '@tanstack/react-query'
import { portalApi } from '../portalApi'

export type MilestoneStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
export type GroupKey = 'BEWILLIGUNGEN' | 'MONTAGE' | 'INBETRIEBNAHME' | 'ABSCHLUSS'

export interface PortalProject {
  id: string
  name: string
  kwp: number
  value: number
  phase: string
  startDate: string | null
  completedAt: string | null
  projectManagerId: string | null
  notes: string | null
  createdAt: string
}

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
  scheduledTime: string | null
  comment: string | null
}

export interface MilestoneTemplate {
  key: string
  group: GroupKey
  label: string
  customerLabel: string
  description: string
}

export interface MilestoneGroup {
  label: string
  description: string
  color: string
  icon: string
}

export interface PortalDocument {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  entityType: string
  entityId: string
  folderPath: string | null
  createdAt: string
}

export interface PortalAppointment {
  id: string
  appointmentType: string
  appointmentDate: string
  appointmentTime: string | null
  status: string
  notes: string | null
}

export interface PortalContactPerson {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: string
  avatarColor: string | null
}

export interface PortalContact {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  address: string | null
  company: string | null
}

export interface PortalDashboardData {
  contact: PortalContact
  projects: PortalProject[]
  milestones: PortalMilestone[]
  documents: PortalDocument[]
  appointments: PortalAppointment[]
  contactPersons: PortalContactPerson[]
  milestoneTemplates: MilestoneTemplate[]
  milestoneGroups: Record<GroupKey, MilestoneGroup>
}

export function usePortalDashboard() {
  return useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => portalApi.get<{ data: PortalDashboardData }>('/dashboard'),
    staleTime: 30_000,
  })
}

export function usePortalMe() {
  return useQuery({
    queryKey: ['portal-me'],
    queryFn: () => portalApi.get<{ data: { portalUserId: string; email: string; contact: PortalContact } }>('/me'),
  })
}
