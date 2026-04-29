// ===========================================================================
// Kundenportal Service: Magic Links, JWT, E-Mail-Versand
// ===========================================================================

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { supabase } from './supabase.js'
import { getMilestoneTemplate } from './portalConfig.js'
import { loadBranding } from '../routes/admin/branding.js'

// ── JWT ──

function getPortalJwtSecret(): string {
  const secret = process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('FATAL: JWT_SECRET / PORTAL_JWT_SECRET muss gesetzt sein')
  return secret + '__portal__'
}

const PORTAL_JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] = '30d'

export interface PortalAuthUser {
  portalUserId: string
  contactId: string
  email: string
  type: 'portal'
}

export function signPortalToken(user: Omit<PortalAuthUser, 'type'>): string {
  return jwt.sign(
    { ...user, type: 'portal' },
    getPortalJwtSecret(),
    { expiresIn: PORTAL_JWT_EXPIRES_IN },
  )
}

export function verifyPortalToken(token: string): PortalAuthUser | null {
  try {
    const decoded = jwt.verify(token, getPortalJwtSecret()) as PortalAuthUser
    if (decoded.type !== 'portal') return null
    return decoded
  } catch {
    return null
  }
}

// ── Permanent Access Token (immer gleicher Link, rotierbar) ──

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Liefert den existierenden Permanent-Token zurueck oder erstellt einen neuen.
 * Token: 9 bytes = 12 Zeichen base64url, 72 bit Entropy (sicher gegen Brute-Force).
 * Bestehende laenger Tokens (43 Zeichen) bleiben funktional.
 */
export async function getOrCreateAccessToken(portalUserId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('portal_users')
    .select('access_token')
    .eq('id', portalUserId)
    .maybeSingle()

  const currentToken = (existing as any)?.access_token
  if (currentToken && typeof currentToken === 'string' && currentToken.length >= 8) {
    return currentToken
  }

  const rawToken = crypto.randomBytes(9).toString('base64url')
  await supabase
    .from('portal_users')
    .update({ access_token: rawToken })
    .eq('id', portalUserId)

  return rawToken
}

/**
 * Erzeugt einen neuen Permanent-Token, alter wird dadurch ungueltig.
 */
export async function rotateAccessToken(portalUserId: string): Promise<string> {
  const rawToken = crypto.randomBytes(9).toString('base64url')
  await supabase
    .from('portal_users')
    .update({ access_token: rawToken })
    .eq('id', portalUserId)
  return rawToken
}

export async function verifyAccessToken(rawToken: string): Promise<{ portalUserId: string } | null> {
  const { data: user } = await supabase
    .from('portal_users')
    .select('id, is_active')
    .eq('access_token', rawToken)
    .is('deleted_at', null)
    .maybeSingle()

  if (!user || !(user as any).is_active) return null

  await supabase
    .from('portal_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', (user as any).id)

  return { portalUserId: (user as any).id }
}

// ── Magic Link (Legacy – fuer Welcome-Mail bei Erstaktivierung) ──

const MAGIC_LINK_TTL_MIN = 30

export async function createMagicLinkForPortalUser(portalUserId: string, ipAddress?: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60_000).toISOString()

  await supabase.from('portal_magic_links').insert({
    portal_user_id: portalUserId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ipAddress ?? null,
  })

  return rawToken
}

export async function consumeMagicLink(rawToken: string): Promise<{ portalUserId: string } | null> {
  const tokenHash = hashToken(rawToken)
  const { data: link } = await supabase
    .from('portal_magic_links')
    .select('id, portal_user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!link) return null
  if (link.used_at) return null
  if (new Date(link.expires_at).getTime() < Date.now()) return null

  await supabase
    .from('portal_magic_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', link.id)

  await supabase
    .from('portal_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', link.portal_user_id)

  return { portalUserId: link.portal_user_id }
}

// ── E-Mail-Versand ──

interface PortalEmailParams {
  portalUserId: string | null
  projectId: string | null
  emailType: string
  recipient: string
  subject: string
  bodyHtml: string
}

export async function sendPortalEmail(params: PortalEmailParams): Promise<void> {
  // Versuche via Outlook-Verbindung zu senden, falls vorhanden
  let status: 'SENT' | 'LOGGED' | 'FAILED' = 'LOGGED'
  let errorMessage: string | null = null

  try {
    const { data: conn } = await supabase
      .from('outlook_connections')
      .select('id, email, display_name, access_token, refresh_token, expires_at')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (conn) {
      const { graphPost } = await import('./outlookClient.js')
      await graphPost(conn.id, '/me/sendMail', {
        message: {
          subject: params.subject,
          body: { contentType: 'HTML', content: params.bodyHtml },
          toRecipients: [{ emailAddress: { address: params.recipient } }],
        },
        saveToSentItems: true,
      })
      status = 'SENT'
    }
  } catch (err: any) {
    errorMessage = err?.message ?? String(err)
    status = 'FAILED'
    console.error('[PortalService] E-Mail-Versand fehlgeschlagen:', errorMessage)
  }

  await supabase.from('portal_email_log').insert({
    portal_user_id: params.portalUserId,
    project_id: params.projectId,
    email_type: params.emailType,
    recipient: params.recipient,
    subject: params.subject,
    body_html: params.bodyHtml,
    status,
    error_message: errorMessage,
    sent_at: status === 'SENT' ? new Date().toISOString() : null,
  })
}

// ── E-Mail-Templates ──

const PORTAL_BASE_URL = process.env.PORTAL_URL || process.env.CLIENT_URL || 'https://neosolar-crm.com'

async function brandedEmailWrapper(content: string, ctaUrl?: string, ctaLabel?: string): Promise<string> {
  const logoUrl = `${PORTAL_BASE_URL}/neosolar-logo.jpeg`
  const b = await loadBranding()

  const addressLine = [b.companyAddress, [b.companyZip, b.companyCity].filter(Boolean).join(' ')]
    .filter(Boolean).join(' &middot; ')
  const contactLine = [b.companyPhone, b.companyEmail].filter(Boolean).join(' &middot; ')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${b.companyName}</title></head>
<body style="margin:0;padding:0;background:#0B0F15;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#F0F2F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F15;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <tr><td align="center" style="padding:32px 32px 24px;background:#FFFFFF;border-bottom:1px solid rgba(255,255,255,0.06);">
          <img src="${logoUrl}" alt="${b.companyName}" style="height:48px;display:block;" />
        </td></tr>
        <tr><td style="padding:8px 32px 0;background:linear-gradient(180deg,rgba(245,158,11,0.06),transparent);">
          <div style="font-size:12px;color:#8B95A5;padding-top:18px;">Ihr Kundenportal</div>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <div style="font-size:15px;line-height:1.65;color:#F0F2F5;">${content}</div>
          ${ctaUrl ? `<div style="margin-top:32px;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;background:${b.primaryColor};color:#0B0F15;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:12px;font-size:14px;letter-spacing:0.02em;">${ctaLabel ?? 'Zum Portal'}</a>
          </div>` : ''}
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#525E6F;text-align:center;line-height:1.7;">
          <div style="color:#8B95A5;font-weight:600;font-size:12px;margin-bottom:4px;">${b.companyName}</div>
          ${addressLine ? `<div>${addressLine}</div>` : ''}
          ${contactLine ? `<div style="margin-top:2px;">${contactLine}</div>` : ''}
          ${b.companyWebsite ? `<div style="margin-top:6px;"><a href="https://${b.companyWebsite.replace(/^https?:\/\//, '')}" style="color:${b.primaryColor};text-decoration:none;">${b.companyWebsite}</a> &middot; <a href="${PORTAL_BASE_URL}/portal" style="color:${b.primaryColor};text-decoration:none;">Kundenportal</a></div>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function buildMagicLinkEmail(magicLink: string): Promise<{ subject: string; html: string }> {
  const url = `${PORTAL_BASE_URL}/p/${magicLink}`
  const b = await loadBranding()
  const content = `
    <p style="font-size:18px;font-weight:600;margin:0 0 16px;color:#F0F2F5;">Anmeldung Kundenportal</p>
    <p style="margin:0 0 16px;">Klicken Sie auf den Button, um sich in Ihrem persoenlichen ${b.companyName}-Kundenportal anzumelden.</p>
    <p style="margin:0 0 16px;color:#8B95A5;font-size:13px;">Der Link ist 30 Minuten gueltig und kann nur einmal verwendet werden.</p>
  `
  return {
    subject: `Ihr Anmeldelink fuer das ${b.companyName} Kundenportal`,
    html: await brandedEmailWrapper(content, url, 'Jetzt anmelden'),
  }
}

export async function buildMilestoneCompletedEmail(milestoneKey: string, customerName: string, projectName: string): Promise<{ subject: string; html: string } | null> {
  const tpl = getMilestoneTemplate(milestoneKey)
  if (!tpl) return null
  const url = `${PORTAL_BASE_URL}/portal`
  const b = await loadBranding()
  const content = `
    <p style="font-size:18px;font-weight:600;margin:0 0 16px;color:#F0F2F5;">${tpl.emailSubject}</p>
    <p style="margin:0 0 16px;">Hallo ${customerName},</p>
    <p style="margin:0 0 16px;">${tpl.emailBody}</p>
    <p style="margin:0 0 16px;color:#8B95A5;font-size:14px;">Projekt: <strong style="color:#F0F2F5;">${projectName}</strong></p>
    <p style="margin:0 0 16px;color:#8B95A5;font-size:13px;">Den aktuellen Stand sehen Sie jederzeit in Ihrem Kundenportal.</p>
  `
  return {
    subject: `${tpl.emailSubject} | ${b.companyName}`,
    html: await brandedEmailWrapper(content, url, 'Zum Kundenportal'),
  }
}

export async function buildPortalActivatedEmail(magicLink: string, customerName: string, projectName: string): Promise<{ subject: string; html: string }> {
  const url = `${PORTAL_BASE_URL}/p/${magicLink}`
  const b = await loadBranding()
  const content = `
    <p style="font-size:20px;font-weight:600;margin:0 0 16px;color:#F0F2F5;">Willkommen im ${b.companyName} Kundenportal</p>
    <p style="margin:0 0 16px;">Hallo ${customerName},</p>
    <p style="margin:0 0 16px;">wir haben fuer Sie ein persoenliches Kundenportal eingerichtet. Hier sehen Sie jederzeit den aktuellen Stand Ihrer PV-Anlage <strong style="color:#F0F2F5;">${projectName}</strong>:</p>
    <ul style="padding-left:20px;color:#8B95A5;line-height:1.9;font-size:14px;">
      <li>Live-Status zu allen Projektphasen</li>
      <li>Dokumente und Vertraege zum Download</li>
      <li>Anstehende Termine und Ansprechpartner</li>
      <li>Fortschrittsuebersicht von Bewilligung bis Inbetriebnahme</li>
    </ul>
    <p style="margin:24px 0 16px;">Klicken Sie auf den Button, um sich erstmalig anzumelden:</p>
    <p style="margin:0;color:#525E6F;font-size:12px;">Der Link ist 30 Minuten gueltig. Sie koennen jederzeit einen neuen Link unter "Anmelden" anfordern.</p>
  `
  return {
    subject: `Ihr persoenliches ${b.companyName} Kundenportal ist bereit`,
    html: await brandedEmailWrapper(content, url, 'Portal oeffnen'),
  }
}
