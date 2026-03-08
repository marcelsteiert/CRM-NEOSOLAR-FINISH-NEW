import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PasswordEntry {
  id: string
  userId: string | null
  title: string
  username: string
  password: string
  url: string
  notes: string
  category: string
  isShared: boolean
  allowedRoles: string[]
  createdAt: string
  updatedAt: string
}

interface PasswordListResponse {
  data: PasswordEntry[]
}

interface PasswordResponse {
  data: PasswordEntry
}

// Persoenliche Passwoerter
export function usePasswords() {
  return useQuery({
    queryKey: ['passwords'],
    queryFn: () => api.get<PasswordListResponse>('/passwords'),
  })
}

// Geteilte Passwoerter (Dashboard)
export function useSharedPasswords() {
  return useQuery({
    queryKey: ['passwords', 'shared'],
    queryFn: () => api.get<PasswordListResponse>('/passwords/shared'),
  })
}

export function useCreatePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PasswordEntry> & { title: string; password: string }) =>
      api.post<PasswordResponse>('/passwords', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwords'] })
    },
  })
}

export function useUpdatePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PasswordEntry> & { id: string }) =>
      api.put<PasswordResponse>(`/passwords/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwords'] })
    },
  })
}

export function useDeletePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/passwords/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwords'] })
    },
  })
}
