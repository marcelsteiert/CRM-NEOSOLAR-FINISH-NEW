import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface FollowUpRule {
  stage: string
  maxDays: number
  urgentMaxDays: number
  message: string
}

export interface ChecklistTemplate {
  id: string
  label: string
}

export interface AppSettings {
  followUpRules: FollowUpRule[]
  defaultFollowUpDays: number
  checklistTemplate: ChecklistTemplate[]
  companyAddress: string
}

interface SettingsResponse {
  data: AppSettings
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SettingsResponse>('/settings'),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) =>
      api.put<SettingsResponse>('/settings', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['followUps'] })
    },
  })
}

export const stageLabelsMap: Record<string, string> = {
  ERSTELLT: 'Erstellt',
  GESENDET: 'Gesendet',
  FOLLOW_UP: 'Follow-Up',
  VERHANDLUNG: 'Verhandlung',
}
