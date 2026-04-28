// ===========================================================================
// Portal API: Eigene Auth (separates Token), separat von CRM
// ===========================================================================

const API_BASE = '/api/v1/portal'
const TOKEN_KEY = 'portal_token'
const EMAIL_KEY = 'portal_email'

export class PortalApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getPortalToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setPortalToken(token: string, email: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}
export function getPortalEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY)
}
export function clearPortalSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getPortalToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearPortalSession()
    if (window.location.pathname !== '/portal/login') {
      window.location.href = '/portal/login'
    }
    throw new PortalApiError(401, 'Sitzung abgelaufen')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unbekannter Fehler' }))
    throw new PortalApiError(res.status, body.error?.message || body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const portalApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
}
