// Microsoft Graph API Client – OAuth2 + Token Management + API Calls
import { supabase } from './supabase.js'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const AUTH_BASE = 'https://login.microsoftonline.com'

const CLIENT_ID = () => process.env.MS_CLIENT_ID ?? ''
const CLIENT_SECRET = () => process.env.MS_CLIENT_SECRET ?? ''
const TENANT_ID = () => process.env.MS_TENANT_ID ?? 'common'
const REDIRECT_URI = () => process.env.MS_REDIRECT_URI ?? `${process.env.CLIENT_URL ?? 'https://crm-neosolar.netlify.app'}/api/v1/outlook/callback`

const SCOPES = [
  'offline_access',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'Calendars.ReadWrite',
  'User.Read',
]

// ── OAuth URLs ──

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    response_type: 'code',
    redirect_uri: REDIRECT_URI(),
    response_mode: 'query',
    scope: SCOPES.join(' '),
    state,
    prompt: 'consent',
  })
  return `${AUTH_BASE}/${TENANT_ID()}/oauth2/v2.0/authorize?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
    code,
    redirect_uri: REDIRECT_URI(),
    grant_type: 'authorization_code',
    scope: SCOPES.join(' '),
  })

  const res = await fetch(`${AUTH_BASE}/${TENANT_ID()}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Token exchange failed: ${err.error_description || res.statusText}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
    token_type: string
  }>
}

// ── Token Refresh ──

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPES.join(' '),
  })

  const res = await fetch(`${AUTH_BASE}/${TENANT_ID()}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${err.error_description || res.statusText}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>
}

// ── Connection Helper: aktuellen Token holen (mit Auto-Refresh) ──

export async function getValidToken(connectionId: string): Promise<string> {
  const { data: conn, error } = await supabase
    .from('outlook_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (error || !conn) throw new Error('Outlook-Verbindung nicht gefunden')
  if (!conn.is_active) throw new Error('Outlook-Verbindung ist deaktiviert')

  // Token noch gueltig? (5 Min Puffer)
  const expiresAt = new Date(conn.token_expires_at).getTime()
  const now = Date.now()

  if (expiresAt - now > 5 * 60 * 1000) {
    return conn.access_token
  }

  // Token refreshen
  const tokens = await refreshAccessToken(conn.refresh_token)
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('outlook_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)

  return tokens.access_token
}

// ── Graph API Wrapper ──

export async function graphGet<T = any>(connectionId: string, path: string, params?: Record<string, string>): Promise<T> {
  const token = await getValidToken(connectionId)
  const url = new URL(`${GRAPH_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Graph API ${path}: ${err.error?.message || res.statusText}`)
  }

  return res.json()
}

export async function graphPost<T = any>(connectionId: string, path: string, body: unknown): Promise<T> {
  const token = await getValidToken(connectionId)

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Graph API POST ${path}: ${err.error?.message || res.statusText}`)
  }

  // sendMail returns 202 with no body
  if (res.status === 202) return {} as T
  return res.json()
}

export async function graphPatch<T = any>(connectionId: string, path: string, body: unknown): Promise<T> {
  const token = await getValidToken(connectionId)

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Graph API PATCH ${path}: ${err.error?.message || res.statusText}`)
  }

  return res.json()
}

export async function graphDelete(connectionId: string, path: string): Promise<void> {
  const token = await getValidToken(connectionId)

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Graph API DELETE ${path}: ${err.error?.message || res.statusText}`)
  }
}

// ── User Profile holen ──

export async function getUserProfile(accessToken: string) {
  const res = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Profil konnte nicht abgerufen werden')
  return res.json() as Promise<{ displayName: string; mail: string; userPrincipalName: string }>
}
