import { useState, useCallback, useMemo, createContext, useContext, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type FeatureFlag =
  | 'dashboard' | 'leads' | 'appointments' | 'deals' | 'projects' | 'admin'
  | 'provision' | 'calculations'
  | 'communication' | 'ai' | 'tasks'
  | 'documents' | 'notifications' | 'export'

const STORAGE_KEY = 'neosolar-feature-flags'

// Core features are always enabled
const coreFeatures: FeatureFlag[] = ['dashboard', 'leads', 'appointments', 'deals', 'projects', 'admin']

// Default state for toggleable features
const defaultFlags: Record<FeatureFlag, boolean> = {
  dashboard: true,
  leads: true,
  appointments: true,
  deals: true,
  projects: true,
  admin: true,
  provision: true,
  calculations: false,
  communication: false,
  ai: false,
  tasks: false,
  documents: false,
  notifications: true,
  export: false,
}

// localStorage als schneller Cache (bis API antwortet)
function loadCachedFlags(): Record<FeatureFlag, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...defaultFlags, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return { ...defaultFlags }
}

function saveCachedFlags(flags: Record<FeatureFlag, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch { /* ignore */ }
}

// -- Context --

interface FeatureFlagContextValue {
  flags: Record<FeatureFlag, boolean>
  toggle: (id: FeatureFlag) => void
  isEnabled: (id: FeatureFlag) => boolean
  isLoading: boolean
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: defaultFlags,
  toggle: () => {},
  isEnabled: () => false,
  isLoading: true,
})

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>(loadCachedFlags)
  const initialLoadDone = useRef(false)

  // Flags vom Server laden
  const { data: serverFlags } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => api.get<{ data: Record<FeatureFlag, boolean> }>('/settings/feature-flags'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  // Server-Daten in lokalen State uebernehmen
  useEffect(() => {
    if (serverFlags?.data) {
      const merged = { ...defaultFlags, ...serverFlags.data }
      // Core features immer true
      for (const f of coreFeatures) merged[f] = true
      setFlags(merged)
      saveCachedFlags(merged)
      initialLoadDone.current = true
    }
  }, [serverFlags])

  // Mutation: Flags auf Server speichern
  const mutation = useMutation({
    mutationFn: (newFlags: Record<FeatureFlag, boolean>) =>
      api.put<{ data: Record<FeatureFlag, boolean> }>('/settings/feature-flags', newFlags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
  })

  const toggle = useCallback((id: FeatureFlag) => {
    if (coreFeatures.includes(id)) return
    setFlags((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      saveCachedFlags(next)
      mutation.mutate(next)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEnabled = useCallback((id: FeatureFlag) => flags[id], [flags])

  const value = useMemo(() => ({
    flags,
    toggle,
    isEnabled,
    isLoading: !initialLoadDone.current && !serverFlags,
  }), [flags, toggle, isEnabled, serverFlags])

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeatureFlags() {
  return useContext(FeatureFlagContext)
}
