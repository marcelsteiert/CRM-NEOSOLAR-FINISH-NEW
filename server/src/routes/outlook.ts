// Outlook Integration Routes – OAuth, Email CRUD, Calendar, Tracking, Templates
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  getAuthUrl, exchangeCodeForTokens, getUserProfile,
  graphGet, graphPost, graphPatch, graphDelete,
} from '../lib/outlookClient.js'
import { syncEmails, syncCalendar, matchEmailsToContacts } from '../lib/outlookSync.js'

const router = Router()

// ── Helpers ──

function getUser(req: Request): { userId: string; role: string } {
  const u = (req as any).user
  if (!u?.userId) throw new AppError('Nicht authentifiziert', 401)
  return { userId: u.userId, role: u.role ?? '' }
}

async function getUserConnection(userId: string) {
  const { data } = await supabase
    .from('outlook_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

// =====================================================================
// OAUTH FLOW
// =====================================================================

// GET /api/v1/outlook/connect – OAuth starten
router.get('/connect', (req: Request, res: Response) => {
  const { userId } = getUser(req)
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64')
  const url = getAuthUrl(state)
  res.json({ data: { url } })
})

// GET /api/v1/outlook/callback – OAuth Callback
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, error: oauthError } = req.query

    if (oauthError) {
      // Redirect zum Frontend mit Fehler
      const clientUrl = process.env.CLIENT_URL ?? 'https://crm-neosolar.netlify.app'
      return res.redirect(`${clientUrl}/communication?error=${encodeURIComponent(String(oauthError))}`)
    }

    if (!code || !state) throw new AppError('Fehlende OAuth Parameter', 400)

    // State decodieren
    const stateData = JSON.parse(Buffer.from(String(state), 'base64').toString())
    const userId = stateData.userId

    // Token austauschen
    const tokens = await exchangeCodeForTokens(String(code))
    const profile = await getUserProfile(tokens.access_token)
    const email = profile.mail || profile.userPrincipalName

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Verbindung speichern (upsert)
    await supabase
      .from('outlook_connections')
      .upsert({
        user_id: userId,
        email,
        display_name: profile.displayName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        scopes: tokens.scope?.split(' ') ?? [],
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,email' })

    // Redirect zum Frontend (Erfolg)
    const clientUrl = process.env.CLIENT_URL ?? 'https://crm-neosolar.netlify.app'
    res.redirect(`${clientUrl}/communication?connected=true`)
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/outlook/status – Verbindungsstatus
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)

    if (!conn) {
      return res.json({ data: { connected: false } })
    }

    res.json({
      data: {
        connected: true,
        email: conn.email,
        displayName: conn.display_name,
        lastSyncAt: conn.last_sync_at,
        connectionId: conn.id,
      },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/outlook/disconnect – Verbindung trennen
router.delete('/disconnect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    await supabase
      .from('outlook_connections')
      .update({ is_active: false })
      .eq('user_id', userId)
    res.json({ message: 'Outlook-Verbindung getrennt' })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// EMAIL SYNC
// =====================================================================

// POST /api/v1/outlook/sync – Manuelle Synchronisierung
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const emailResult = await syncEmails(conn.id)
    const calResult = await syncCalendar(conn.id)

    res.json({
      data: {
        emails: emailResult,
        calendar: calResult,
      },
    })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// EMAILS
// =====================================================================

// GET /api/v1/outlook/emails – Synchronisierte Emails
router.get('/emails', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const {
      folder = 'inbox',
      search,
      contactId,
      dealId,
      projectId,
      page = '1',
      limit = '50',
      unreadOnly,
    } = req.query

    let query = supabase
      .from('outlook_emails')
      .select('*', { count: 'exact' })
      .eq('connection_id', conn.id)

    if (folder && folder !== 'all') query = query.eq('folder', String(folder))
    if (contactId) query = query.eq('contact_id', String(contactId))
    if (dealId) query = query.eq('deal_id', String(dealId))
    if (projectId) query = query.eq('project_id', String(projectId))
    if (unreadOnly === 'true') query = query.eq('is_read', false)

    if (search && typeof search === 'string') {
      query = query.or(`subject.ilike.%${search}%,sender_email.ilike.%${search}%,sender_name.ilike.%${search}%,body_preview.ilike.%${search}%`)
    }

    const p = Math.max(1, parseInt(String(page)))
    const l = Math.min(100, Math.max(1, parseInt(String(limit))))
    query = query
      .order('received_at', { ascending: false })
      .range((p - 1) * l, p * l - 1)

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [], total: count ?? 0, page: p, limit: l })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/outlook/emails/:id – Einzelne Email
router.get('/emails/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const { data, error } = await supabase
      .from('outlook_emails')
      .select('*')
      .eq('id', req.params.id)
      .eq('connection_id', conn.id)
      .single()

    if (error || !data) throw new AppError('Email nicht gefunden', 404)

    // Anhaenge laden
    const { data: attachments } = await supabase
      .from('outlook_attachments')
      .select('*')
      .eq('email_id', data.id)

    res.json({ data: { ...data, attachments: attachments ?? [] } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/outlook/emails/:id/thread – Email-Thread
router.get('/emails/:id/thread', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    // Erst die Email holen
    const { data: email } = await supabase
      .from('outlook_emails')
      .select('conversation_id')
      .eq('id', req.params.id)
      .eq('connection_id', conn.id)
      .single()

    if (!email?.conversation_id) throw new AppError('Kein Thread gefunden', 404)

    // Alle Emails im selben Thread
    const { data: thread } = await supabase
      .from('outlook_emails')
      .select('*')
      .eq('connection_id', conn.id)
      .eq('conversation_id', email.conversation_id)
      .order('received_at', { ascending: true })

    res.json({ data: thread ?? [] })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/outlook/emails/:id/read – Als gelesen markieren
router.put('/emails/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const { data: email } = await supabase
      .from('outlook_emails')
      .select('message_id')
      .eq('id', req.params.id)
      .eq('connection_id', conn.id)
      .single()

    if (!email) throw new AppError('Email nicht gefunden', 404)

    // In Outlook als gelesen markieren
    await graphPatch(conn.id, `/me/messages/${email.message_id}`, { isRead: true })

    // Lokal updaten
    await supabase
      .from('outlook_emails')
      .update({ is_read: true })
      .eq('id', req.params.id)

    res.json({ message: 'Als gelesen markiert' })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/outlook/emails/:id/link – Email mit CRM-Objekt verknuepfen
router.put('/emails/:id/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const { contactId, dealId, projectId, leadId } = req.body
    const updates: Record<string, unknown> = { is_matched: true, matched_at: new Date().toISOString() }
    if (contactId !== undefined) updates.contact_id = contactId
    if (dealId !== undefined) updates.deal_id = dealId
    if (projectId !== undefined) updates.project_id = projectId
    if (leadId !== undefined) updates.lead_id = leadId

    const { data, error } = await supabase
      .from('outlook_emails')
      .update(updates)
      .eq('id', req.params.id)
      .eq('connection_id', conn.id)
      .select()
      .single()

    if (error) throw new AppError('Email nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// EMAIL SENDEN
// =====================================================================

const sendEmailSchema = z.object({
  to: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).min(1),
  cc: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).default([]),
  bcc: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).default([]),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  importance: z.enum(['low', 'normal', 'high']).default('normal'),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  projectId: z.string().optional(),
  trackingEnabled: z.boolean().default(true),
  scheduledAt: z.string().optional(),
  replyToMessageId: z.string().optional(),
})

// POST /api/v1/outlook/send – Email senden
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const parsed = sendEmailSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const d = parsed.data

    // Geplantes Senden?
    if (d.scheduledAt) {
      const { data: scheduled } = await supabase
        .from('outlook_scheduled_emails')
        .insert({
          connection_id: conn.id,
          user_id: userId,
          to_recipients: d.to,
          cc_recipients: d.cc,
          bcc_recipients: d.bcc,
          subject: d.subject,
          body_html: d.bodyHtml,
          scheduled_at: d.scheduledAt,
          contact_id: d.contactId ?? null,
          deal_id: d.dealId ?? null,
          tracking_enabled: d.trackingEnabled,
        })
        .select()
        .single()

      return res.status(201).json({ data: scheduled, scheduled: true })
    }

    // Tracking-Pixel einfuegen
    let bodyHtml = d.bodyHtml
    let trackingId: string | null = null

    if (d.trackingEnabled) {
      trackingId = crypto.randomUUID()
      const pixelUrl = `${process.env.CLIENT_URL ?? 'https://crm-neosolar.netlify.app'}/api/v1/outlook/track/${trackingId}/open.gif`
      bodyHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`

      await supabase.from('outlook_email_tracking').insert({
        tracking_id: trackingId,
        user_id: userId,
        recipient_email: d.to[0].email,
        subject: d.subject,
      })
    }

    // Graph API: Email senden
    const mapRecipients = (list: { email: string; name?: string }[]) =>
      list.map((r) => ({ emailAddress: { address: r.email, name: r.name ?? r.email } }))

    if (d.replyToMessageId) {
      // Reply
      await graphPost(conn.id, `/me/messages/${d.replyToMessageId}/reply`, {
        message: {
          toRecipients: mapRecipients(d.to),
          ccRecipients: mapRecipients(d.cc),
          body: { contentType: 'HTML', content: bodyHtml },
        },
      })
    } else {
      // Neue Email
      await graphPost(conn.id, '/me/sendMail', {
        message: {
          subject: d.subject,
          body: { contentType: 'HTML', content: bodyHtml },
          toRecipients: mapRecipients(d.to),
          ccRecipients: mapRecipients(d.cc),
          bccRecipients: mapRecipients(d.bcc),
          importance: d.importance,
        },
        saveToSentItems: true,
      })
    }

    // Activity erstellen (falls Kontakt verknuepft)
    if (d.contactId) {
      await supabase.from('activities').insert({
        contact_id: d.contactId,
        deal_id: d.dealId ?? null,
        project_id: d.projectId ?? null,
        type: 'EMAIL',
        text: `Email gesendet: ${d.subject}`,
        created_by: userId,
      })
    }

    res.json({ message: 'Email gesendet', trackingId })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// TRACKING
// =====================================================================

// GET /api/v1/outlook/track/:trackingId/open.gif – Tracking Pixel
router.get('/track/:trackingId/open.gif', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params

    // Tracking: open_count erhoehen + Timestamps setzen
    const now = new Date().toISOString()
    const { data: existing } = await supabase
      .from('outlook_email_tracking')
      .select('open_count, first_opened_at')
      .eq('tracking_id', trackingId)
      .single()

    if (existing) {
      const updates: Record<string, unknown> = {
        open_count: (existing.open_count ?? 0) + 1,
        last_opened_at: now,
      }
      if (!existing.first_opened_at) updates.first_opened_at = now

      await supabase
        .from('outlook_email_tracking')
        .update(updates)
        .eq('tracking_id', trackingId)
    }
  } catch {
    // Silent fail – Tracking darf nie die UX brechen
  }

  // 1x1 transparentes GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Content-Length': String(gif.length) })
  res.send(gif)
})

// GET /api/v1/outlook/tracking – Tracking-Statistiken
router.get('/tracking', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const { data, error } = await supabase
      .from('outlook_email_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// KALENDER
// =====================================================================

// GET /api/v1/outlook/calendar – Kalender-Events
router.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const { start, end, contactId } = req.query

    let query = supabase
      .from('outlook_calendar_events')
      .select('*')
      .eq('connection_id', conn.id)
      .eq('is_cancelled', false)

    if (start) query = query.gte('start_at', String(start))
    if (end) query = query.lte('end_at', String(end))
    if (contactId) query = query.eq('contact_id', String(contactId))

    query = query.order('start_at', { ascending: true })

    const { data, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/outlook/calendar – Event erstellen
router.post('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) throw new AppError('Keine Outlook-Verbindung', 400)

    const schema = z.object({
      subject: z.string().min(1),
      start: z.string(),
      end: z.string(),
      location: z.string().optional(),
      bodyHtml: z.string().optional(),
      attendees: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).default([]),
      isOnlineMeeting: z.boolean().default(false),
      contactId: z.string().optional(),
      dealId: z.string().optional(),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)
    const d = parsed.data

    const event = await graphPost(conn.id, '/me/events', {
      subject: d.subject,
      start: { dateTime: d.start, timeZone: 'Europe/Zurich' },
      end: { dateTime: d.end, timeZone: 'Europe/Zurich' },
      location: d.location ? { displayName: d.location } : undefined,
      body: d.bodyHtml ? { contentType: 'HTML', content: d.bodyHtml } : undefined,
      attendees: d.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: 'required',
      })),
      isOnlineMeeting: d.isOnlineMeeting,
    })

    // In DB speichern
    await supabase.from('outlook_calendar_events').insert({
      connection_id: conn.id,
      event_id: event.id,
      subject: d.subject,
      start_at: d.start,
      end_at: d.end,
      location: d.location,
      attendees: d.attendees,
      contact_id: d.contactId ?? null,
      deal_id: d.dealId ?? null,
    })

    // Activity erstellen
    if (d.contactId) {
      await supabase.from('activities').insert({
        contact_id: d.contactId,
        deal_id: d.dealId ?? null,
        type: 'MEETING',
        text: `Meeting erstellt: ${d.subject}`,
        created_by: userId,
      })
    }

    res.status(201).json({ data: event })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// TEMPLATES
// =====================================================================

// GET /api/v1/outlook/templates
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const { data, error } = await supabase
      .from('outlook_email_templates')
      .select('*')
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('use_count', { ascending: false })

    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/outlook/templates
router.post('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const schema = z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      bodyHtml: z.string().min(1),
      category: z.string().default('Allgemein'),
      variables: z.array(z.string()).default([]),
      isShared: z.boolean().default(false),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const { data, error } = await supabase
      .from('outlook_email_templates')
      .insert({ user_id: userId, ...parsed.data, body_html: parsed.data.bodyHtml })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/outlook/templates/:id
router.put('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (req.body.name) updates.name = req.body.name
    if (req.body.subject) updates.subject = req.body.subject
    if (req.body.bodyHtml) updates.body_html = req.body.bodyHtml
    if (req.body.category) updates.category = req.body.category
    if (req.body.variables) updates.variables = req.body.variables

    const { data, error } = await supabase
      .from('outlook_email_templates')
      .update(updates)
      .eq('id', req.params.id)
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .select()
      .single()

    if (error) throw new AppError('Vorlage nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/outlook/templates/:id
router.delete('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    await supabase
      .from('outlook_email_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId)

    res.json({ message: 'Vorlage geloescht' })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// SIGNATUREN
// =====================================================================

// GET /api/v1/outlook/signatures
router.get('/signatures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const { data, error } = await supabase
      .from('outlook_signatures')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })

    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/outlook/signatures
router.post('/signatures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const schema = z.object({
      name: z.string().min(1),
      bodyHtml: z.string().min(1),
      isDefault: z.boolean().default(false),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    // Wenn default: andere zuruecksetzen
    if (parsed.data.isDefault) {
      await supabase
        .from('outlook_signatures')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    const { data, error } = await supabase
      .from('outlook_signatures')
      .insert({
        user_id: userId,
        name: parsed.data.name,
        body_html: parsed.data.bodyHtml,
        is_default: parsed.data.isDefault,
      })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// =====================================================================
// STATS / SYNC-LOG
// =====================================================================

// GET /api/v1/outlook/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const conn = await getUserConnection(userId)
    if (!conn) return res.json({ data: { connected: false } })

    const { count: totalEmails } = await supabase
      .from('outlook_emails')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', conn.id)

    const { count: unreadEmails } = await supabase
      .from('outlook_emails')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', conn.id)
      .eq('is_read', false)

    const { count: matchedEmails } = await supabase
      .from('outlook_emails')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', conn.id)
      .eq('is_matched', true)

    const { count: calendarEvents } = await supabase
      .from('outlook_calendar_events')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', conn.id)
      .eq('is_cancelled', false)

    const { data: recentSync } = await supabase
      .from('outlook_sync_log')
      .select('*')
      .eq('connection_id', conn.id)
      .order('started_at', { ascending: false })
      .limit(5)

    res.json({
      data: {
        connected: true,
        totalEmails: totalEmails ?? 0,
        unreadEmails: unreadEmails ?? 0,
        matchedEmails: matchedEmails ?? 0,
        calendarEvents: calendarEvents ?? 0,
        recentSyncs: recentSync ?? [],
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
