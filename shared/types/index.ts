// ── Contact Types (zentrale Kunden-/Kontakt-Tabelle) ──

export interface Contact {
  id: string
  firstName: string
  lastName: string
  company?: string
  email: string
  phone: string
  address: string
  notes?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

// ── Role & Auth Types ──

export type Role = 'ADMIN' | 'VERTRIEB' | 'PROJEKTLEITUNG' | 'BUCHHALTUNG' | 'GESCHAEFTSLEITUNG'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  avatarColor?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthPayload {
  userId: string
  email: string
  role: Role
}

// ── Lead Types ──

export type LeadSource = 'HOMEPAGE' | 'LANDINGPAGE' | 'MESSE' | 'EMPFEHLUNG' | 'KALTAKQUISE' | 'SONSTIGE'
export type LeadStatus = 'ACTIVE' | 'CONVERTED' | 'LOST' | 'ARCHIVED'

export interface Lead {
  id: string
  contactId: string
  firstName?: string
  lastName?: string
  company?: string
  address: string
  phone: string
  email: string
  source: LeadSource
  pipelineId?: string
  bucketId?: string
  assignedTo?: string
  aiSummary?: string
  status: LeadStatus
  tags?: Tag[]
  createdAt: string
  updatedAt: string
}

// ── Deal Types ──

export type DealStatus = 'OPEN' | 'WON' | 'LOST'
export type AppointmentType = 'ONLINE' | 'VOR_ORT'

export interface Deal {
  id: string
  contactId: string
  title: string
  leadId?: string
  assignedTo?: string
  bucketId?: string
  appointmentType: AppointmentType
  dealValue?: number
  margin?: number
  marginPercent?: number
  expectedCloseDate?: string
  aiSummary?: string
  status: DealStatus
  createdAt: string
  updatedAt: string
}

// ── Order Types ──

export type OrderStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Order {
  id: string
  dealId: string
  partnerId?: string
  plannedCosts?: number
  actualCosts?: number
  customerRating?: number
  customerComment?: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

// ── Task Types ──

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE'

export interface Task {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  assignedTo?: string
  leadId?: string
  dealId?: string
  orderId?: string
  isAutomatic: boolean
  createdAt: string
  updatedAt: string
}

// ── Pipeline & Bucket Types ──

export interface Pipeline {
  id: string
  name: string
  type: 'lead' | 'deal'
  sortOrder: number
  buckets?: Bucket[]
}

export interface Bucket {
  id: string
  name: string
  pipelineId: string
  sortOrder: number
  color?: string
}

// ── Tag Types ──

export interface Tag {
  id: string
  name: string
  color?: string
}

// ── Partner Types ──

export interface Partner {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  avgRating?: number
  totalProjects: number
}

// ── API Response Types ──

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  message: string
  germanMessage: string
  statusCode: number
}
