// ===========================================================================
// CRM Admin: Portal-Verwaltung
// - Portal-User aktivieren/deaktivieren
// - Milestones eines Projekts verwalten
// - Manueller Magic-Link
// ===========================================================================

import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'
import { logAudit, getAuditUserId } from '../../lib/auditService.js'
import {
  createMagicLinkForPortalUser,
  sendPortalEmail,
  buildPortalActivatedEmail,
  buildMagicLinkEmail,
  buildMilestoneCompletedEmail,
} from '../../lib/portalService.js'
import {
  milestoneTemplates,
  milestoneGroups,
  getInitialMilestoneRows,
  getMilestoneTemplate,
} from '../../lib/portalConfig.js'

const router = Router()

// ============================================================================
// GET /portal/projects/:projectId – Portal-Status + Milestones eines Projekts
// ============================================================================

router.get('/projects/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, contact_id')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single()

    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    // Portal-User
    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('id, email, is_active, last_login_at, created_at')
      .eq('contact_id', project.contact_id)
      .is('deleted_at', null)
      .maybeSingle()

    // Milestones
    let { data: milestones } = await supabase
      .from('portal_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    // Auto-Init falls keine Milestones existieren
    if (!milestones || milestones.length === 0) {
      const rows = getInitialMilestoneRows(projectId)
      const { data: created } = await supabase
        .from('portal_milestones')
        .insert(rows)
        .select('*')
      milestones = created ?? []
    }

    // Email-Log fuer dieses Projekt
    const { data: emailLog } = await supabase
      .from('portal_email_log')
      .select('id, email_type, recipient, subject, status, sent_at, created_at, error_message')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      data: {
        project,
        portalUser: portalUser ?? null,
        milestones: milestones ?? [],
        milestoneGroups,
        milestoneTemplates,
        emailLog: emailLog ?? [],
      },
    })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// POST /portal/projects/:projectId/activate – Portal-Zugang aktivieren
// ============================================================================

const activateSchema = z.object({
  email: z.string().email().optional(),
  sendEmail: z.boolean().optional().default(true),
})

router.post('/projects/:projectId/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string
    const parsed = activateSchema.safeParse(req.body ?? {})
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, contact_id')
      .eq('id', projectId)
      .is('deleted_at', null)
      .single()

    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('id', project.contact_id)
      .single()

    if (!contact) throw new AppError('Kontakt nicht gefunden', 404)

    const targetEmail = (parsed.data.email ?? contact.email ?? '').toLowerCase().trim()
    if (!targetEmail) throw new AppError('E-Mail-Adresse erforderlich (Kontakt hat keine E-Mail)', 400)

    // Existiert bereits?
    const { data: existing } = await supabase
      .from('portal_users')
      .select('id, is_active')
      .eq('contact_id', project.contact_id)
      .is('deleted_at', null)
      .maybeSingle()

    let portalUserId: string

    if (existing) {
      portalUserId = existing.id
      if (!existing.is_active) {
        await supabase
          .from('portal_users')
          .update({ is_active: true, email: targetEmail })
          .eq('id', existing.id)
      } else if (existing && targetEmail) {
        await supabase
          .from('portal_users')
          .update({ email: targetEmail })
          .eq('id', existing.id)
      }
    } else {
      const { data: created, error: insertErr } = await supabase
        .from('portal_users')
        .insert({
          contact_id: project.contact_id,
          email: targetEmail,
          is_active: true,
        })
        .select('id')
        .single()

      if (insertErr || !created) {
        throw new AppError(`Portal-User konnte nicht erstellt werden: ${insertErr?.message ?? 'unbekannt'}`, 500)
      }
      portalUserId = created.id
    }

    // Milestones initialisieren falls leer
    const { count: msCount } = await supabase
      .from('portal_milestones')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (!msCount || msCount === 0) {
      await supabase.from('portal_milestones').insert(getInitialMilestoneRows(projectId))
    }

    // Magic Link + Welcome-Mail
    if (parsed.data.sendEmail) {
      const rawToken = await createMagicLinkForPortalUser(portalUserId)
      const customerName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Kunde'
      const { subject, html } = buildPortalActivatedEmail(rawToken, customerName, project.name)
      await sendPortalEmail({
        portalUserId,
        projectId,
        emailType: 'PORTAL_ACTIVATED',
        recipient: targetEmail,
        subject,
        bodyHtml: html,
      })
    }

    logAudit({
      userId: getAuditUserId(req),
      action: 'CREATE',
      entity: 'PORTAL_USER',
      entityId: portalUserId,
      description: `Kundenportal aktiviert fuer "${project.name}" (${targetEmail})`,
    })

    res.json({ data: { portalUserId, email: targetEmail } })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// POST /portal/projects/:projectId/send-link – Neuer Magic Link
// ============================================================================

const sendLinkSchema = z.object({
  sendEmail: z.boolean().optional().default(false),
})

router.post('/projects/:projectId/send-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string
    const parsed = sendLinkSchema.safeParse(req.body ?? {})
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, contact_id')
      .eq('id', projectId)
      .single()

    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('id, email, is_active')
      .eq('contact_id', project.contact_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!portalUser || !portalUser.is_active) {
      throw new AppError('Portal-Zugang nicht aktiv – bitte zuerst aktivieren', 400)
    }

    const rawToken = await createMagicLinkForPortalUser(portalUser.id)
    const baseUrl = process.env.PORTAL_URL || process.env.CLIENT_URL || 'https://crm-neosolar.netlify.app'
    const loginUrl = `${baseUrl}/portal/login?token=${rawToken}`

    let sent = false
    if (parsed.data.sendEmail) {
      const { subject, html } = buildMagicLinkEmail(rawToken)
      await sendPortalEmail({
        portalUserId: portalUser.id,
        projectId,
        emailType: 'MAGIC_LINK',
        recipient: portalUser.email,
        subject,
        bodyHtml: html,
      })
      sent = true
    }

    logAudit({
      userId: getAuditUserId(req),
      action: 'UPDATE',
      entity: 'PORTAL_USER',
      entityId: portalUser.id,
      description: parsed.data.sendEmail
        ? `Anmeldelink an ${portalUser.email} gesendet`
        : `Anmeldelink generiert fuer ${portalUser.email} (manueller Versand)`,
    })

    res.json({
      data: {
        loginUrl,
        recipient: portalUser.email,
        sent,
        expiresInMinutes: 30,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// POST /portal/projects/:projectId/deactivate
// ============================================================================

router.post('/projects/:projectId/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, contact_id')
      .eq('id', projectId)
      .single()

    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('id')
      .eq('contact_id', project.contact_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!portalUser) throw new AppError('Kein aktiver Portal-User', 404)

    await supabase
      .from('portal_users')
      .update({ is_active: false })
      .eq('id', portalUser.id)

    logAudit({
      userId: getAuditUserId(req),
      action: 'UPDATE',
      entity: 'PORTAL_USER',
      entityId: portalUser.id,
      description: `Kundenportal deaktiviert fuer "${project.name}"`,
    })

    res.json({ message: 'Portal-Zugang deaktiviert' })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// PUT /portal/milestones/:id – Status / Datum / Kommentar einer Milestone
// ============================================================================

const updateMilestoneSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'BLOCKED']).optional(),
  scheduledDate: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  label: z.string().min(1).max(120).optional(),
  sendEmail: z.boolean().optional(),
})

router.put('/milestones/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateMilestoneSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const { data: milestone } = await supabase
      .from('portal_milestones')
      .select('id, project_id, milestone_key, label, status')
      .eq('id', req.params.id)
      .single()

    if (!milestone) throw new AppError('Milestone nicht gefunden', 404)

    const updates: Record<string, unknown> = { updated_by: req.user?.userId ?? null }

    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status
      if (parsed.data.status === 'DONE') {
        updates.completed_at = new Date().toISOString()
      } else {
        updates.completed_at = null
      }
    }
    if (parsed.data.scheduledDate !== undefined) {
      updates.scheduled_date = parsed.data.scheduledDate
    }
    if (parsed.data.comment !== undefined) {
      updates.comment = parsed.data.comment
    }
    if (parsed.data.label !== undefined) {
      updates.label = parsed.data.label.trim()
    }

    const { data: updated, error } = await supabase
      .from('portal_milestones')
      .update(updates)
      .eq('id', milestone.id)
      .select('*')
      .single()

    if (error) throw new AppError(error.message, 500)

    // E-Mail an Kunde wenn auf DONE gewechselt + sendEmail=true (default true bei DONE)
    const wasCompleted = milestone.status !== 'DONE' && parsed.data.status === 'DONE'
    const shouldSendEmail = parsed.data.sendEmail ?? wasCompleted

    if (wasCompleted && shouldSendEmail) {
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, contact_id')
        .eq('id', milestone.project_id)
        .single()

      if (project) {
        const { data: portalUser } = await supabase
          .from('portal_users')
          .select('id, email, is_active')
          .eq('contact_id', project.contact_id)
          .is('deleted_at', null)
          .maybeSingle()

        const { data: contact } = await supabase
          .from('contacts')
          .select('first_name, last_name, email')
          .eq('id', project.contact_id)
          .single()

        if (portalUser?.is_active && contact) {
          const customerName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Kunde'
          const built = buildMilestoneCompletedEmail(milestone.milestone_key, customerName, project.name)
          if (built) {
            await sendPortalEmail({
              portalUserId: portalUser.id,
              projectId: project.id,
              emailType: `MILESTONE_${milestone.milestone_key}`,
              recipient: portalUser.email,
              subject: built.subject,
              bodyHtml: built.html,
            })
          }
        }
      }
    }

    logAudit({
      userId: getAuditUserId(req),
      action: 'UPDATE',
      entity: 'PORTAL_MILESTONE',
      entityId: milestone.id,
      description: `Milestone "${milestone.label}" aktualisiert${parsed.data.status ? ` → ${parsed.data.status}` : ''}`,
    })

    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// POST /portal/projects/:projectId/init-milestones – Milestones neu anlegen (Admin-Reset)
// ============================================================================

router.post('/projects/:projectId/init-milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    // Existierende loeschen
    await supabase.from('portal_milestones').delete().eq('project_id', projectId)
    // Neu anlegen
    const { data: created, error } = await supabase
      .from('portal_milestones')
      .insert(getInitialMilestoneRows(projectId))
      .select('*')

    if (error) throw new AppError(error.message, 500)

    res.json({ data: created ?? [] })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// POST /portal/projects/:projectId/milestones – Custom Milestone hinzufuegen
// ============================================================================

const createMilestoneSchema = z.object({
  groupKey: z.enum(['BEWILLIGUNGEN', 'MONTAGE', 'INBETRIEBNAHME', 'ABSCHLUSS']),
  label: z.string().min(1).max(120),
  scheduledDate: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
})

router.post('/projects/:projectId/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string
    const parsed = createMilestoneSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    // Naechste sort_order finden
    const { data: existing } = await supabase
      .from('portal_milestones')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0

    // Custom-Key mit Timestamp
    const customKey = `CUSTOM_${Date.now()}`

    const { data: created, error } = await supabase
      .from('portal_milestones')
      .insert({
        project_id: projectId,
        milestone_key: customKey,
        group_key: parsed.data.groupKey,
        label: parsed.data.label.trim(),
        sort_order: nextOrder,
        status: 'OPEN',
        scheduled_date: parsed.data.scheduledDate ?? null,
        comment: parsed.data.comment ?? null,
        updated_by: req.user?.userId ?? null,
      })
      .select('*')
      .single()

    if (error) throw new AppError(error.message, 500)

    logAudit({
      userId: getAuditUserId(req),
      action: 'CREATE',
      entity: 'PORTAL_MILESTONE',
      entityId: created.id,
      description: `Milestone "${parsed.data.label}" erstellt`,
    })

    res.status(201).json({ data: created })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// DELETE /portal/milestones/:id – Milestone loeschen
// ============================================================================

router.delete('/milestones/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: milestone } = await supabase
      .from('portal_milestones')
      .select('id, label')
      .eq('id', req.params.id)
      .single()

    if (!milestone) throw new AppError('Milestone nicht gefunden', 404)

    const { error } = await supabase
      .from('portal_milestones')
      .delete()
      .eq('id', req.params.id)

    if (error) throw new AppError(error.message, 500)

    logAudit({
      userId: getAuditUserId(req),
      action: 'DELETE',
      entity: 'PORTAL_MILESTONE',
      entityId: req.params.id,
      description: `Milestone "${milestone.label}" geloescht`,
    })

    res.json({ message: 'Milestone geloescht' })
  } catch (err) {
    next(err)
  }
})

// ============================================================================
// PUT /portal/documents/:id/visibility – Dokument-Sichtbarkeit toggeln
// ============================================================================

const visibilitySchema = z.object({ portalVisible: z.boolean() })

router.put('/documents/:id/visibility', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = visibilitySchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const { data, error } = await supabase
      .from('documents')
      .update({ portal_visible: parsed.data.portalVisible })
      .eq('id', req.params.id)
      .select('id, file_name, portal_visible')
      .single()

    if (error) throw new AppError(error.message, 500)

    res.json({ data })
  } catch (err) {
    next(err)
  }
})

export default router
