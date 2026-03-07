import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  avatar: string | null
  isActive: boolean
  allowedModules: string[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_BASE = '/api/v1'
const TOKEN_KEY = 'crm_token'
const USER_KEY = 'crm_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })
  const [isLoading, setIsLoading] = useState(true)

  // User-Daten vom Server holen (frische allowedModules etc.)
  const refreshUser = useCallback(() => {
    if (!token) return
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Token ungueltig')
        const body = await res.json()
        const userData = body.data
        setUser(userData)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      })
      .catch(() => {
        setToken(null)
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      })
  }, [token])

  // Token validieren beim Start
  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Token ungueltig')
        const body = await res.json()
        const userData = body.data
        setUser(userData)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      })
      .catch(() => {
        setToken(null)
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      })
      .finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Berechtigungen automatisch aktualisieren: bei Window-Focus + alle 30 Sekunden
  useEffect(() => {
    if (!token) return

    const onFocus = () => refreshUser()
    window.addEventListener('focus', onFocus)

    const interval = setInterval(refreshUser, 30_000)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [token, refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error?.message || body.message || 'Anmeldung fehlgeschlagen')
    }

    const body = await res.json()
    const { token: newToken, user: userData } = body.data

    setToken(newToken)
    setUser(userData)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GL' || user?.role === 'GESCHAEFTSLEITUNG'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  return ctx
}

/**
 * Gibt den aktuellen Token zurueck (fuer API-Calls)
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
