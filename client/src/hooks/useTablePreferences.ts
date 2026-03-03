import { useState, useCallback } from 'react'

const STORAGE_KEY = 'neosolar-lead-table-prefs'

/* ── Types ── */

export interface ColumnPref {
  visible: boolean
  label: string
}

export interface TablePreferences {
  columns: Record<string, ColumnPref>
  sourceLabels: Record<string, string>
}

/* ── Defaults ── */

export const defaultColumnPrefs: Record<string, ColumnPref> = {
  name: { visible: true, label: 'Name' },
  company: { visible: true, label: 'Unternehmen' },
  value: { visible: true, label: 'Wert' },
  phone: { visible: true, label: 'Telefon' },
  email: { visible: true, label: 'E-Mail' },
  source: { visible: true, label: 'Quelle' },
  status: { visible: true, label: 'Status' },
  tags: { visible: true, label: 'Tags' },
  createdAt: { visible: true, label: 'Erstellt' },
}

export const defaultSourceLabels: Record<string, string> = {
  HOMEPAGE: 'Homepage',
  LANDINGPAGE: 'Landingpage',
  MESSE: 'Messe',
  EMPFEHLUNG: 'Empfehlung',
  KALTAKQUISE: 'Kaltakquise',
  SONSTIGE: 'Sonstige',
}

/* ── Persistence ── */

function loadPrefs(): TablePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TablePreferences>
      return {
        columns: { ...defaultColumnPrefs, ...parsed.columns },
        sourceLabels: { ...defaultSourceLabels, ...parsed.sourceLabels },
      }
    }
  } catch {
    // ignore corrupt data
  }
  return { columns: { ...defaultColumnPrefs }, sourceLabels: { ...defaultSourceLabels } }
}

function savePrefs(prefs: TablePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // storage full or unavailable
  }
}

/* ── Hook ── */

export function useTablePreferences() {
  const [prefs, setPrefsState] = useState<TablePreferences>(loadPrefs)

  const updatePrefs = useCallback((updater: (prev: TablePreferences) => TablePreferences) => {
    setPrefsState((prev) => {
      const next = updater(prev)
      savePrefs(next)
      return next
    })
  }, [])

  const setColumnVisible = useCallback(
    (key: string, visible: boolean) => {
      updatePrefs((prev) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [key]: { ...prev.columns[key], visible },
        },
      }))
    },
    [updatePrefs],
  )

  const setColumnLabel = useCallback(
    (key: string, label: string) => {
      updatePrefs((prev) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [key]: { ...prev.columns[key], label },
        },
      }))
    },
    [updatePrefs],
  )

  const setSourceLabel = useCallback(
    (key: string, label: string) => {
      updatePrefs((prev) => ({
        ...prev,
        sourceLabels: {
          ...prev.sourceLabels,
          [key]: label,
        },
      }))
    },
    [updatePrefs],
  )

  const resetAll = useCallback(() => {
    const defaults: TablePreferences = {
      columns: { ...defaultColumnPrefs },
      sourceLabels: { ...defaultSourceLabels },
    }
    setPrefsState(defaults)
    savePrefs(defaults)
  }, [])

  return {
    prefs,
    setColumnVisible,
    setColumnLabel,
    setSourceLabel,
    resetAll,
  }
}
