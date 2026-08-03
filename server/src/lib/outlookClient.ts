// Microsoft Graph API Client – OAuth2 + Token Management + API Calls
import { supabase } from './supabase.js'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const AUTH_BASE = 'https://login.microsoftonline.com'

const CLIENT_ID = () => process.env.MS_CLIENT_ID ?? ''
const CLIENT_SECRET = () => process.env.MS_CLIENT_SECRET ?? ''
const TENANT_ID = () => process.env.MS_TENANT_ID ?? 'common'
const REDIRECT_URI = () => process.env.MS_REDIRECT_URI ?? `${process.env.CLIENT_URL ?? 'https://neosolar-crm.com'}/api/v1/outlook/callback`

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

// ── Systempostfach (Client Credentials) ──────────────────────────────
//
// Fuer automatische Mails taugt der Delegated-Flow oben nicht: er braucht
// einen angemeldeten Benutzer, und das Refresh-Token laeuft nach laengerer
// Inaktivitaet ab. Automatische Nachfassmails wuerden dann irgendwann still
// aufhoeren.
//
// Stattdessen holt sich der Server ein eigenes Token ueber Client
// Credentials und sendet als festes Postfach (info@neosolar.ch). Das
// braucht in der Azure-App die *Anwendungsberechtigung* Mail.Send mit
// Administratorzustimmung – Delegated reicht dafuer nicht.
//
// Einschraenken laesst sich das im Tenant mit einer Application Access
// Policy, damit die App nur fuer dieses eine Postfach senden darf.

const SYSTEM_ABSENDER = () => process.env.MS_SENDER_ADDRESS ?? 'info@neosolar.ch'

/** Zwischengespeichertes App-Token – gilt eine Stunde. */
let appToken: { wert: string; gueltigBis: number } | null = null

export function systemMailKonfiguriert(): boolean {
  return Boolean(CLIENT_ID() && CLIENT_SECRET() && TENANT_ID() && TENANT_ID() !== 'common')
}

export async function getAppToken(): Promise<string> {
  if (appToken && appToken.gueltigBis - Date.now() > 5 * 60 * 1000) {
    return appToken.wert
  }
  if (!systemMailKonfiguriert()) {
    throw new Error(
      'Systempostfach nicht eingerichtet: MS_CLIENT_ID, MS_CLIENT_SECRET und MS_TENANT_ID fehlen'
    )
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const res = await fetch(`${AUTH_BASE}/${TENANT_ID()}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error_description?: string }
    throw new Error(`App-Token fehlgeschlagen: ${err.error_description || res.statusText}`)
  }

  const daten = (await res.json()) as { access_token: string; expires_in: number }
  appToken = {
    wert: daten.access_token,
    gueltigBis: Date.now() + daten.expires_in * 1000,
  }
  return daten.access_token
}

export interface SystemMail {
  an: string
  betreff: string
  html: string
  /** Kopie an den zustaendigen Verkaeufer, damit er den Verlauf sieht */
  kopieAn?: string | null
  /** Antworten sollen beim Verkaeufer landen, nicht im Sammelpostfach */
  antwortAn?: string | null
  anhaenge?: Array<{ name: string; mimeType: string; inhaltBase64: string }>
}

/**
 * Verschickt eine Mail ueber das Systempostfach.
 * Wirft, wenn die App-Berechtigung fehlt – der Aufrufer entscheidet dann,
 * ob er auf das Postfach des Verkaeufers ausweicht.
 */
export async function sendeSystemMail(mail: SystemMail): Promise<void> {
  const token = await getAppToken()
  const absender = SYSTEM_ABSENDER()

  const nachricht: Record<string, unknown> = {
    subject: mail.betreff,
    body: { contentType: 'HTML', content: mail.html },
    toRecipients: [{ emailAddress: { address: mail.an } }],
  }
  if (mail.kopieAn) {
    nachricht.ccRecipients = [{ emailAddress: { address: mail.kopieAn } }]
  }
  if (mail.antwortAn) {
    nachricht.replyTo = [{ emailAddress: { address: mail.antwortAn } }]
  }
  if (mail.anhaenge?.length) {
    nachricht.attachments = mail.anhaenge.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentType: a.mimeType,
      contentBytes: a.inhaltBase64,
    }))
  }

  const res = await fetch(
    `${GRAPH_BASE}/users/${encodeURIComponent(absender)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: nachricht, saveToSentItems: true }),
    }
  )

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } }
    const code = err.error?.code ?? ''
    const text = err.error?.message ?? res.statusText
    // Die haeufigste Ursache verstaendlich machen
    if (code === 'ErrorAccessDenied' || res.status === 403) {
      throw new Error(
        `Zugriff verweigert beim Senden als ${absender}. ` +
          'Vermutlich fehlt in der Azure-App die Anwendungsberechtigung Mail.Send ' +
          `mit Administratorzustimmung, oder eine Application Access Policy sperrt das Postfach. (${text})`
      )
    }
    throw new Error(`Systemversand fehlgeschlagen (${res.status}): ${text}`)
  }
}

/** Prueft die Einrichtung, ohne eine Mail zu verschicken. */
export async function pruefeSystempostfach(): Promise<{
  konfiguriert: boolean
  absender: string
  tokenOk: boolean
  postfachOk: boolean
  meldung: string
}> {
  const absender = SYSTEM_ABSENDER()
  if (!systemMailKonfiguriert()) {
    return {
      konfiguriert: false,
      absender,
      tokenOk: false,
      postfachOk: false,
      meldung:
        'MS_CLIENT_ID, MS_CLIENT_SECRET oder MS_TENANT_ID fehlen. MS_TENANT_ID muss die echte Tenant-ID sein, nicht "common".',
    }
  }

  let token: string
  try {
    token = await getAppToken()
  } catch (err) {
    return {
      konfiguriert: true,
      absender,
      tokenOk: false,
      postfachOk: false,
      meldung: err instanceof Error ? err.message : String(err),
    }
  }

  // Postfach lesen – zeigt, ob die Anwendungsberechtigung greift
  const res = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(absender)}?$select=mail,displayName`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    return {
      konfiguriert: true,
      absender,
      tokenOk: true,
      postfachOk: false,
      meldung:
        `Das Postfach ${absender} ist nicht erreichbar: ${err.error?.message ?? res.statusText}. ` +
        'Prüfen Sie, ob die Adresse existiert und ob die Anwendungsberechtigung User.Read.All bzw. Mail.Send erteilt wurde.',
    }
  }

  const profil = (await res.json()) as { displayName?: string; mail?: string }
  return {
    konfiguriert: true,
    absender,
    tokenOk: true,
    postfachOk: true,
    meldung: `Verbunden mit ${profil.displayName ?? absender} (${profil.mail ?? absender}).`,
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
