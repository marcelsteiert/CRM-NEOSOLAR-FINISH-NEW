// ===========================================================================
// Kundenportal: Oeffentliche Auth-Routes + Geschuetzte Daten-Routes
// ===========================================================================

import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  createMagicLinkForPortalUser,
  consumeMagicLink,
  signPortalToken,
  sendPortalEmail,
  buildMagicLinkEmail,
  verifyAccessToken,
} from '../lib/portalService.js'
import { milestoneTemplates, milestoneGroups } from '../lib/portalConfig.js'
import { portalAuthMiddleware } from '../middleware/portalAuth.js'
import { loadBranding } from './admin/branding.js'

const router = Router()

// ============================================================================
// OEFFENTLICH: Magic Link anfordern
// ============================================================================

const requestLinkSchema = z.object({
  email: z.string().email(),
})

router.post('/auth/request-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = requestLinkSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('E-Mail erforderlich', 400)

    const email = parsed.data.email.toLowerCase().trim()

    // Portal-User suchen
    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('id, email, contact_id, is_active')
      .ilike('email', email)
      .is('deleted_at', null)
      .maybeSingle()

    // Aus Sicherheitsgruenden: Immer 200 zurueck (kein User-Enumeration)
    if (!portalUser || !portalUser.is_active) {
      return res.json({ message: 'Falls die E-Mail bekannt ist, wurde ein Anmeldelink versendet.' })
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip
    const rawToken = await createMagicLinkForPortalUser(portalUser.id, ip)

    const { subject, html } = await buildMagicLinkEmail(rawToken)
    await sendPortalEmail({
      portalUserId: portalUser.id,
      projectId: null,
      emailType: 'MAGIC_LINK',
      recipient: portalUser.email,
      subject,
      bodyHtml: html,
    })

    res.json({ message: 'Falls die E-Mail bekannt ist, wurde ein Anmeldelink versendet.' })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// OEFFENTLICH: Magic Link einloesen → JWT
// ============================================================================

const verifySchema = z.object({
  token: z.string().min(10),
})

router.post('/auth/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifySchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Token erforderlich', 400)

    // Erst Magic-Link versuchen (single-use), dann permanenten Access-Token
    let result = await consumeMagicLink(parsed.data.token)
    if (!result) {
      result = await verifyAccessToken(parsed.data.token)
    }
    if (!result) throw new AppError('Anmeldelink ist ungueltig oder abgelaufen', 401)

    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('id, email, contact_id')
      .eq('id', result.portalUserId)
      .single()

    if (!portalUser) throw new AppError('Portal-User nicht gefunden', 404)

    const token = signPortalToken({
      portalUserId: portalUser.id,
      contactId: portalUser.contact_id,
      email: portalUser.email,
    })

    res.json({ data: { token, email: portalUser.email } })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// AB HIER: Auth erforderlich
// ============================================================================

router.use(portalAuthMiddleware)

// GET /me – Portal-User Profil + Kontakt
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const portal = req.portalUser!

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, address, company')
      .eq('id', portal.contactId)
      .single()

    if (!contact) throw new AppError('Kontakt nicht gefunden', 404)

    res.json({
      data: {
        portalUserId: portal.portalUserId,
        email: portal.email,
        contact,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /dashboard – Komplettes Dashboard-Datenpaket
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const portal = req.portalUser!

    // Kontakt
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, address, company')
      .eq('id', portal.contactId)
      .single()

    if (!contact) throw new AppError('Kontakt nicht gefunden', 404)

    // Aktive Projekte des Kontakts
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, kwp, value, phase, priority, start_date, completed_at, project_manager_id, montage_partner_id, elektro_partner_id, notes, created_at, deal_id')
      .eq('contact_id', portal.contactId)
      .is('deleted_at', null)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    const projectIds = (projects ?? []).map((p: any) => p.id)

    // Pruefen welche Projekte noch im Angebot-Modus sind (Deal nicht gewonnen/verloren)
    const dealIds = Array.from(new Set((projects ?? []).map((p: any) => p.deal_id).filter(Boolean)))
    let openDealIds = new Set<string>()
    if (dealIds.length > 0) {
      const { data: dealStatus } = await supabase
        .from('deals')
        .select('id, status')
        .in('id', dealIds)
      for (const d of dealStatus ?? []) {
        if ((d as any).status === 'OPEN') openDealIds.add((d as any).id)
      }
    }

    // Anreichern: inOfferMode flag pro Projekt
    const enrichedProjects = (projects ?? []).map((p: any) => ({
      ...p,
      inOfferMode: !!p.deal_id && openDealIds.has(p.deal_id),
    }))

    // Milestones aller Projekte
    const { data: milestones } = projectIds.length
      ? await supabase
          .from('portal_milestones')
          .select('*')
          .in('project_id', projectIds)
          .order('sort_order', { ascending: true })
      : { data: [] }

    // Sichtbare Dokumente (portal_visible = true)
    const { data: documents } = await supabase
      .from('documents')
      .select('id, file_name, file_size, mime_type, entity_type, entity_id, folder_path, created_at, uploaded_by')
      .eq('contact_id', portal.contactId)
      .eq('portal_visible', true)
      .order('created_at', { ascending: false })

    // Anstehende Termine
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, appointment_type, appointment_date, appointment_time, status, notes')
      .eq('contact_id', portal.contactId)
      .gte('appointment_date', new Date().toISOString())
      .is('deleted_at', null)
      .order('appointment_date', { ascending: true })
      .limit(5)

    // Verkaeufer / Projektleiter (Ansprechpartner)
    const userIds = Array.from(
      new Set(
        (projects ?? [])
          .flatMap((p: any) => [p.project_manager_id])
          .filter(Boolean),
      ),
    )

    const { data: contactPersons } = userIds.length
      ? await supabase
          .from('users')
          .select('id, first_name, last_name, email, phone, role, avatar_color')
          .in('id', userIds)
      : { data: [] }

    const branding = await loadBranding()

    res.json({
      data: {
        contact,
        projects: enrichedProjects,
        milestones: milestones ?? [],
        documents: documents ?? [],
        appointments: appointments ?? [],
        contactPersons: contactPersons ?? [],
        milestoneTemplates,
        milestoneGroups,
        branding,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /documents/:id/download – Signed URL fuer Download
router.get('/documents/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const portal = req.portalUser!

    const { data: doc } = await supabase
      .from('documents')
      .select('id, contact_id, storage_path, file_name, portal_visible')
      .eq('id', req.params.id)
      .single()

    if (!doc) throw new AppError('Dokument nicht gefunden', 404)
    if (doc.contact_id !== portal.contactId) throw new AppError('Kein Zugriff', 403)
    if (!doc.portal_visible) throw new AppError('Dokument nicht freigegeben', 403)

    const { data: signed, error } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 300)

    if (error || !signed) throw new AppError('Download-Link konnte nicht erstellt werden', 500)

    res.json({ data: { url: signed.signedUrl, fileName: doc.file_name } })
  } catch (err) {
    next(err)
  }
})

export default router
