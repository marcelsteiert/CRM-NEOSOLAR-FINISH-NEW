// ===========================================================================
// Kundenportal Service: Magic Links, JWT, E-Mail-Versand
// ===========================================================================

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { supabase } from './supabase.js'
import { getMilestoneTemplate } from './portalConfig.js'

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

// ── Magic Link ──

const MAGIC_LINK_TTL_MIN = 30

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

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

const PORTAL_BASE_URL = process.env.PORTAL_URL || process.env.CLIENT_URL || 'https://crm-neosolar.netlify.app'

function brandedEmailWrapper(content: string, ctaUrl?: string, ctaLabel?: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>NeoSolar</title></head>
<body style="margin:0;padding:0;background:#0B0F15;font-family:'Outfit','Segoe UI',sans-serif;color:#F0F2F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F15;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:32px 32px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:11px;letter-spacing:0.18em;color:#F59E0B;text-transform:uppercase;font-weight:600;">NEOSOLAR</div>
          <div style="font-size:13px;color:#8B95A5;margin-top:4px;">Ihre PV-Anlage</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="font-size:15px;line-height:1.6;color:#F0F2F5;">${content}</div>
          ${ctaUrl ? `<div style="margin-top:32px;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;background:#F59E0B;color:#0B0F15;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px;font-size:14px;">${ctaLabel ?? 'Zum Portal'}</a>
          </div>` : ''}
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#525E6F;text-align:center;">
          NEOSOLAR AG &middot; <a href="${PORTAL_BASE_URL}/portal" style="color:#8B95A5;text-decoration:none;">Kundenportal</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function buildMagicLinkEmail(magicLink: string): { subject: string; html: string } {
  const url = `${PORTAL_BASE_URL}/portal/login?token=${magicLink}`
  const content = `
    <p style="font-size:18px;font-weight:600;margin:0 0 16px;color:#F0F2F5;">Anmeldung Kundenportal</p>
    <p style="margin:0 0 16px;">Klicken Sie auf den Button, um sich in Ihrem persoenlichen NeoSolar-Kundenportal anzumelden.</p>
    <p style="margin:0 0 16px;color:#8B95A5;font-size:13px;">Der Link ist 30 Minuten gueltig und kann nur einmal verwendet werden.</p>
  `
  return {
    subject: 'Ihr Anmeldelink fuer das NeoSolar Kundenportal',
    html: brandedEmailWrapper(content, url, 'Jetzt anmelden'),
  }
}

export function buildMilestoneCompletedEmail(milestoneKey: string, customerName: string, projectName: string): { subject: string; html: string } | null {
  const tpl = getMilestoneTemplate(milestoneKey)
  if (!tpl) return null
  const url = `${PORTAL_BASE_URL}/portal`
  const content = `
    <p style="font-size:18px;font-weight:600;margin:0 0 16px;color:#F0F2F5;">${tpl.emailSubject}</p>
    <p style="margin:0 0 16px;">Hallo ${customerName},</p>
    <p style="margin:0 0 16px;">${tpl.emailBody}</p>
    <p style="margin:0 0 16px;color:#8B95A5;font-size:14px;">Projekt: <strong style="color:#F0F2F5;">${projectName}</strong></p>
    <p style="margin:0 0 16px;color:#8B95A5;font-size:13px;">Den aktuellen Stand sehen Sie jederzeit in Ihrem Kundenportal.</p>
  `
  return {
    subject: `${tpl.emailSubject} | NeoSolar`,
    html: brandedEmailWrapper(content, url, 'Zum Kundenportal'),
  }
}

export function buildPortalActivatedEmail(magicLink: string, customerName: string, projectName: string): { subject: string; html: string } {
  const url = `${PORTAL_BASE_URL}/portal/login?token=${magicLink}`
  const content = `
    <p style="font-size:20px;font-weight:600;margin:0 0 16px;color:#F0F2F5;">Willkommen im NeoSolar Kundenportal</p>
    <p style="margin:0 0 16px;">Hallo ${customerName},</p>
    <p style="margin:0 0 16px;">wir haben fuer Sie ein persoenliches Kundenportal eingerichtet. Hier sehen Sie jederzeit den aktuellen Stand Ihrer PV-Anlage <strong style="color:#F0F2F5;">${projectName}</strong>:</p>
    <ul style="padding-left:20px;color:#8B95A5;line-height:1.9;font-size:14px;">
      <li>Live-Status zu allen 14 Projektphasen</li>
      <li>Dokumente und Vertraege zum Download</li>
      <li>Anstehende Termine und Ansprechpartner</li>
      <li>Fortschrittsuebersicht von Bewilligung bis Inbetriebnahme</li>
    </ul>
    <p style="margin:24px 0 16px;">Klicken Sie auf den Button, um sich erstmalig anzumelden:</p>
    <p style="margin:0;color:#525E6F;font-size:12px;">Der Link ist 30 Minuten gueltig. Sie koennen jederzeit einen neuen Link unter "Anmelden" anfordern.</p>
  `
  return {
    subject: 'Ihr persoenliches NeoSolar Kundenportal ist bereit',
    html: brandedEmailWrapper(content, url, 'Portal oeffnen'),
  }
}
