import { useState, useCallback, useMemo, createContext, useContext } from 'react'

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

function loadFlags(): Record<FeatureFlag, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults (in case new features were added)
      return { ...defaultFlags, ...parsed }
    }
  } catch { /* ignore */ }
  return { ...defaultFlags }
}

function saveFlags(flags: Record<FeatureFlag, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch { /* ignore */ }
}

// ── Context for global state ──

interface FeatureFlagContextValue {
  flags: Record<FeatureFlag, boolean>
  toggle: (id: FeatureFlag) => void
  isEnabled: (id: FeatureFlag) => boolean
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: defaultFlags,
  toggle: () => {},
  isEnabled: () => false,
})

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>(loadFlags)

  const toggle = useCallback((id: FeatureFlag) => {
    if (coreFeatures.includes(id)) return // Core features cannot be toggled
    setFlags((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      saveFlags(next)
      return next
    })
  }, [])

  const isEnabled = useCallback((id: FeatureFlag) => flags[id], [flags])

  const value = useMemo(() => ({ flags, toggle, isEnabled }), [flags, toggle, isEnabled])

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext)
}
