import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type ContractType = 'VOLLZEIT' | 'TEILZEIT' | 'LEHRLING' | 'SUBUNTERNEHMER' | 'PRAKTIKUM'
export type SalaryType = 'MONTH' | 'HOUR' | 'YEAR'

export interface Personnel {
  id: string
  // Stammdaten
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  birthDate: string | null
  nationality: string | null
  ahvNumber: string | null
  // Adresse
  street: string | null
  zip: string | null
  city: string | null
  country: string | null
  // Vertrag
  startDate: string
  endDate: string | null
  contractType: ContractType
  workloadPct: number
  vacationDaysPerYear: number
  position: string | null
  department: string | null
  // Bank
  iban: string | null
  bankName: string | null
  salaryChf: number | null
  salaryType: SalaryType
  // Notfall
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  // Sonst
  notes: string | null
  photoUrl: string | null
  userId: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface PersonnelStats {
  total: number
  fullTime: number
  partTime: number
  apprentice: number
  sub: number
  fteSum: number
}

export interface CreatePersonnelInput {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  birthDate?: string | null
  nationality?: string | null
  ahvNumber?: string | null
  street?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
  startDate: string
  endDate?: string | null
  contractType?: ContractType | null
  workloadPct?: number | null
  vacationDaysPerYear?: number | null
  position?: string | null
  department?: string | null
  iban?: string | null
  bankName?: string | null
  salaryChf?: number | null
  salaryType?: SalaryType | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  notes?: string | null
  photoUrl?: string | null
  userId?: string | null
}

export type UpdatePersonnelInput = Partial<CreatePersonnelInput>

interface ListResponse {
  data: Personnel[]
  total: number
}
interface SingleResponse {
  data: Personnel
}
interface StatsResponse {
  data: PersonnelStats
}

// ── Hooks ──

export function usePersonnelList(params?: { search?: string; includeArchived?: boolean; contractType?: ContractType; department?: string }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.includeArchived) qs.set('includeArchived', 'true')
  if (params?.contractType) qs.set('contractType', params.contractType)
  if (params?.department) qs.set('department', params.department)
  const qsStr = qs.toString()

  return useQuery({
    queryKey: ['personnel', 'list', params],
    queryFn: () => api.get<ListResponse>(`/personnel${qsStr ? `?${qsStr}` : ''}`),
  })
}

export function usePersonnelStats() {
  return useQuery({
    queryKey: ['personnel', 'stats'],
    queryFn: () => api.get<StatsResponse>('/personnel/stats'),
  })
}

export function usePersonnelMember(id: string | null | undefined) {
  return useQuery({
    queryKey: ['personnel', 'member', id],
    queryFn: () => api.get<SingleResponse>(`/personnel/${id}`),
    enabled: !!id,
  })
}

export function useCreatePersonnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePersonnelInput) => api.post<SingleResponse>('/personnel', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
    },
  })
}

export function useUpdatePersonnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePersonnelInput }) =>
      api.put<SingleResponse>(`/personnel/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
    },
  })
}

export function useArchivePersonnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<SingleResponse>(`/personnel/${id}/archive`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personnel'] }),
  })
}

export function useRestorePersonnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<SingleResponse>(`/personnel/${id}/restore`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personnel'] }),
  })
}

export function useDeletePersonnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/personnel/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personnel'] }),
  })
}

// ── Helpers ──

export const contractTypeLabels: Record<ContractType, string> = {
  VOLLZEIT: 'Vollzeit',
  TEILZEIT: 'Teilzeit',
  LEHRLING: 'Lehrling',
  SUBUNTERNEHMER: 'Subunternehmer',
  PRAKTIKUM: 'Praktikum',
}

export const contractTypeColors: Record<ContractType, string> = {
  VOLLZEIT: '#34D399',
  TEILZEIT: '#60A5FA',
  LEHRLING: '#F59E0B',
  SUBUNTERNEHMER: '#A78BFA',
  PRAKTIKUM: '#22D3EE',
}

export const salaryTypeLabels: Record<SalaryType, string> = {
  MONTH: 'CHF / Monat',
  HOUR: 'CHF / Stunde',
  YEAR: 'CHF / Jahr',
}
