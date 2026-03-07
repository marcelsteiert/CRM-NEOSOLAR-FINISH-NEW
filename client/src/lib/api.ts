import { getAuthToken } from '@/hooks/useAuth'

const API_BASE = '/api/v1'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Bei 401: Token entfernen und zur Login-Seite weiterleiten
  if (res.status === 401) {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new ApiError(401, 'Sitzung abgelaufen')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unbekannter Fehler' }))
    throw new ApiError(res.status, body.error?.message || body.message || `HTTP ${res.status}`)
  }

  return res.json()
}

// Typed API helpers
export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),

  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
