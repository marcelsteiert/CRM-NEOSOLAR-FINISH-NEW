import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { resolveContactId } from '../lib/contactResolver.js'
import { getOwnerFilter, toSnakeCase } from '../lib/userFilter.js'
import { createNotification, createNotificationForUsers, getAdminUserIds } from '../lib/notificationService.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const STAGES = ['ERSTELLT', 'GESENDET', 'FOLLOW_UP', 'VERHANDLUNG', 'GEWONNEN', 'VERLOREN'] as const

const createDealSchema = z.object({
  contactId: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  title: z.string().min(1, 'Titel ist erforderlich'),
  leadId: z.string().nullable().optional(),
  appointmentId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  value: z.number().min(0).nullable().optional(),
  stage: z.enum(STAGES).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).nullable().optional(),
  winProbability: z.number().min(0).max(100).nullable().optional(),
  followUpDate: z.string().nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

const updateDealSchema = createDealSchema.partial()

const addActivitySchema = z.object({
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM']).optional().default('NOTE'),
  text: z.string().min(1, 'Aktivitaetstext ist erforderlich'),
  createdBy: z.string().optional(),
})

const dismissFollowUpSchema = z.object({
  note: z.string().min(1, 'Begruendung ist erforderlich'),
  dismissedBy: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/v1/deals
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage, priority, assignedTo, search, page: pp, pageSize: psp, sortBy = 'created_at', sortOrder = 'desc' } = req.query

    let query = supabase
      .from('deals')
      .select('*, contact:contacts(*), deal_tags(tag_id)', { count: 'exact' })
      .is('deleted_at', null)

    if (stage && typeof stage === 'string') query = query.eq('stage', stage)
    if (priority && typeof priority === 'string') query = query.eq('priority', priority)
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    // Per-User Filter: Nicht-Admins sehen nur eigene Deals
    const ownerFilter = getOwnerFilter(req)
    if (ownerFilter) query = query.eq('assigned_to', ownerFilter)

    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%`)
    }

    const allowedSortFields = ['title', 'value', 'stage', 'priority', 'assigned_to', 'expected_close_date', 'created_at', 'updated_at', 'win_probability']
    const sf = typeof sortBy === 'string' ? toSnakeCase(sortBy) : 'created_at'
    const safeSortField = allowedSortFields.includes(sf) ? sf : 'created_at'
    query = query.order(safeSortField, { ascending: sortOrder !== 'desc' })

    const page = Math.max(1, Number(pp) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(psp) || 20))
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, count, error } = await query
    // Range-Fehler bei out-of-bounds Pagination ignorieren → leere Ergebnisse
    if (error && !data) {
      res.json({ data: [], total: count ?? 0, page, pageSize })
      return
    }

    const enriched = (data ?? []).map((deal: any) => ({
      ...deal,
      contactName: deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '',
      contactEmail: deal.contact?.email ?? '',
      contactPhone: deal.contact?.phone ?? '',
      company: deal.contact?.company ?? null,
      address: deal.contact?.address ?? '',
      tags: (deal.deal_tags ?? []).map((dt: any) => dt.tag_id),
      deal_tags: undefined,
    }))

    res.json({ data: enriched, total: count ?? 0, page, pageSize })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/deals/stats
// ---------------------------------------------------------------------------

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase.from('deals').select('*').is('deleted_at', null)
    const { assignedTo } = req.query
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    const { data: active } = await query
    const items = active ?? []

    const stages: Record<string, { count: number; value: number }> = {}
    for (const s of STAGES) stages[s] = { count: 0, value: 0 }
    for (const d of items) {
      stages[d.stage].count++
      stages[d.stage].value += Number(d.value)
    }

    const totalValue = items.reduce((s: number, d: any) => s + Number(d.value), 0)
    const openDeals = items.filter((d: any) => d.stage !== 'GEWONNEN' && d.stage !== 'VERLOREN')
    const pipelineValue = openDeals.reduce((s: number, d: any) => s + Number(d.value), 0)
    const weightedPipelineValue = Math.round(
      openDeals.reduce((s: number, d: any) => s + Number(d.value) * ((d.win_probability ?? 50) / 100), 0)
    )

    res.json({
      data: {
        totalDeals: items.length,
        totalValue,
        pipelineValue,
        weightedPipelineValue,
        stages,
        avgDealValue: items.length > 0 ? Math.round(totalValue / items.length) : 0,
        wonDeals: stages.GEWONNEN.count,
        lostDeals: stages.VERLOREN.count,
        winRate: stages.GEWONNEN.count + stages.VERLOREN.count > 0
          ? Math.round((stages.GEWONNEN.count / (stages.GEWONNEN.count + stages.VERLOREN.count)) * 100) : 0,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/deals/follow-ups
// ---------------------------------------------------------------------------

router.get('/follow-ups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.query

    // Follow-Up-Regeln aus Settings
    const { data: settingsRow } = await supabase.from('settings').select('value').eq('key', 'followUpRules').single()
    const rules: any[] = settingsRow?.value ?? []
    const ruleMap: Record<string, any> = {}
    for (const r of rules) ruleMap[r.stage] = r

    let query = supabase.from('deals').select('*, contact:contacts(*)').is('deleted_at', null)
      .not('stage', 'in', '(GEWONNEN,VERLOREN)')
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    const { data: openDeals } = await query
    const now = Date.now()
    const followUps: any[] = []

    for (const deal of openDeals ?? []) {
      const rule = ruleMap[deal.stage]
      if (!rule) continue

      const daysSinceUpdate = Math.floor((now - new Date(deal.updated_at).getTime()) / 86400000)
      const maxDays = deal.priority === 'URGENT' || deal.priority === 'HIGH' ? rule.urgentMaxDays : rule.maxDays

      if (daysSinceUpdate >= Math.ceil(maxDays * 0.5)) {
        let urgency = 'WARNING'
        if (daysSinceUpdate >= maxDays * 2) urgency = 'CRITICAL'
        else if (daysSinceUpdate >= maxDays) urgency = 'OVERDUE'

        followUps.push({
          id: `fu-${deal.id}`,
          dealId: deal.id,
          dealTitle: deal.title,
          contactName: deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '',
          contactPhone: deal.contact?.phone ?? '',
          company: deal.contact?.company ?? null,
          stage: deal.stage,
          priority: deal.priority,
          value: Number(deal.value),
          assignedTo: deal.assigned_to,
          daysSinceUpdate,
          maxDays,
          overdue: daysSinceUpdate >= maxDays,
          message: rule.message,
          urgency,
        })
      }
    }

    const urgencyOrder: Record<string, number> = { CRITICAL: 0, OVERDUE: 1, WARNING: 2 }
    followUps.sort((a, b) => (urgencyOrder[a.urgency] - urgencyOrder[b.urgency]) || b.value - a.value)

    res.json({
      data: followUps,
      total: followUps.length,
      critical: followUps.filter((f) => f.urgency === 'CRITICAL').length,
      overdue: followUps.filter((f) => f.urgency === 'OVERDUE').length,
      warning: followUps.filter((f) => f.urgency === 'WARNING').length,
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/deals/follow-ups/:id/dismiss
// ---------------------------------------------------------------------------

router.post('/follow-ups/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = dismissFollowUpSchema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    const dealId = (req.params.id as string).replace(/^fu-/, '')
    const { data: deal } = await supabase.from('deals').select('*, contact:contacts(*)').eq('id', dealId).is('deleted_at', null).single()
    if (!deal) throw new AppError('Angebot nicht gefunden', 404)

    // Activity erstellen + Deal updatedAt zuruecksetzen
    await supabase.from('activities').insert({
      contact_id: deal.contact_id,
      deal_id: dealId,
      type: 'NOTE',
      text: `Follow-Up erledigt: ${result.data.note}`,
      created_by: result.data.dismissedBy || req.user?.userId || null,
    })

    await supabase.from('deals').update({ updated_at: new Date().toISOString() }).eq('id', dealId)

    res.json({ message: 'Follow-Up erledigt' })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/deals/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*, contact:contacts(*), deal_tags(tag_id)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new AppError('Angebot nicht gefunden', 404)

    // Activities fuer diesen Deal laden
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', req.params.id)
      .order('created_at', { ascending: true })

    res.json({
      data: {
        ...data,
        contactName: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : '',
        contactEmail: data.contact?.email ?? '',
        contactPhone: data.contact?.phone ?? '',
        company: data.contact?.company ?? null,
        address: data.contact?.address ?? '',
        tags: (data.deal_tags ?? []).map((dt: any) => dt.tag_id),
        deal_tags: undefined,
        activities: activities ?? [],
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/deals
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createDealSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const contactId = await resolveContactId(result.data)

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        contact_id: contactId,
        title: result.data.title,
        lead_id: result.data.leadId ?? null,
        appointment_id: result.data.appointmentId ?? null,
        assigned_to: result.data.assignedTo ?? req.user?.userId ?? null,
        value: result.data.value ?? 0,
        stage: result.data.stage ?? 'ERSTELLT',
        priority: result.data.priority ?? 'MEDIUM',
        win_probability: result.data.winProbability ?? null,
        follow_up_date: result.data.followUpDate ?? null,
        expected_close_date: result.data.expectedCloseDate ?? null,
        notes: result.data.notes ?? null,
      })
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError(error.message, 500)

    // System-Activity
    if (deal) {
      await supabase.from('activities').insert({
        contact_id: deal.contact_id,
        deal_id: deal.id,
        type: 'SYSTEM',
        text: 'Angebot erstellt',
        created_by: result.data.assignedTo ?? req.user?.userId ?? null,
      })
    }

    // Tags
    if (result.data.tags && result.data.tags.length > 0 && deal) {
      await supabase.from('deal_tags').insert(result.data.tags.map((tagId) => ({ deal_id: deal.id, tag_id: tagId })))
    }

    res.status(201).json({ data: {
      ...deal,
      contactName: deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '',
      contactEmail: deal.contact?.email ?? '',
      contactPhone: deal.contact?.phone ?? '',
      company: deal.contact?.company ?? null,
      address: deal.contact?.address ?? '',
      tags: result.data.tags ?? [],
      activities: [],
    } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/deals/:id/activities
// ---------------------------------------------------------------------------

router.post('/:id/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: deal } = await supabase.from('deals').select('contact_id').eq('id', req.params.id).is('deleted_at', null).single()
    if (!deal) throw new AppError('Angebot nicht gefunden', 404)

    const result = addActivitySchema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        contact_id: deal.contact_id,
        deal_id: req.params.id,
        type: result.data.type,
        text: result.data.text,
        created_by: result.data.createdBy || req.user?.userId || null,
      })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    await supabase.from('deals').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id)

    res.status(201).json({ data: activity })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/deals/:id
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateDealSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    // Alte Stage lesen fuer Activity
    const { data: oldDeal } = await supabase.from('deals').select('stage, contact_id').eq('id', req.params.id).single()

    const updates: Record<string, unknown> = {}
    const u = result.data
    if (u.contactId !== undefined) updates.contact_id = u.contactId
    if (u.title !== undefined) updates.title = u.title
    if (u.leadId !== undefined) updates.lead_id = u.leadId ?? null
    if (u.appointmentId !== undefined) updates.appointment_id = u.appointmentId ?? null
    if (u.assignedTo !== undefined) updates.assigned_to = u.assignedTo ?? null
    if (u.value !== undefined) updates.value = u.value
    if (u.priority !== undefined) updates.priority = u.priority
    if (u.winProbability !== undefined) updates.win_probability = u.winProbability ?? null
    if (u.followUpDate !== undefined) updates.follow_up_date = u.followUpDate ?? null
    if (u.expectedCloseDate !== undefined) updates.expected_close_date = u.expectedCloseDate ?? null
    if (u.notes !== undefined) updates.notes = u.notes ?? null

    // Immer updated_at setzen damit Supabase min. 1 Feld hat
    updates.updated_at = new Date().toISOString()

    if (u.stage !== undefined) {
      updates.stage = u.stage
      if (u.stage === 'GEWONNEN' || u.stage === 'VERLOREN') {
        updates.closed_at = new Date().toISOString()
        updates.win_probability = u.stage === 'GEWONNEN' ? 100 : 0
      } else {
        updates.closed_at = null
      }
    }

    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*), deal_tags(tag_id)')
      .single()

    if (error) throw new AppError('Angebot nicht gefunden', 404)

    // Notifications bei Status-Aenderung
    if (u.stage && oldDeal && oldDeal.stage !== u.stage && data) {
      const dealTitle = data.title || 'Angebot'
      const assignee = data.assigned_to

      if (u.stage === 'GEWONNEN') {
        // Notification an Admins + Zugewiesener
        const adminIds = await getAdminUserIds()
        const allIds = [...new Set([...(assignee ? [assignee] : []), ...adminIds])]
        createNotificationForUsers(allIds, {
          type: 'DEAL_WON',
          title: 'Angebot gewonnen!',
          message: `"${dealTitle}" wurde gewonnen`,
          referenceType: 'ANGEBOT',
          referenceId: data.id,
          referenceTitle: dealTitle,
        })
      } else if (u.stage === 'VERLOREN') {
        if (assignee) {
          createNotification({
            userId: assignee,
            type: 'DEAL_LOST',
            title: 'Angebot verloren',
            message: `"${dealTitle}" wurde als verloren markiert`,
            referenceType: 'ANGEBOT',
            referenceId: data.id,
            referenceTitle: dealTitle,
          })
        }
      } else if (assignee) {
        createNotification({
          userId: assignee,
          type: 'DEAL_STATUS_CHANGE',
          title: 'Angebotsstatus geändert',
          message: `"${dealTitle}": ${oldDeal.stage} → ${u.stage}`,
          referenceType: 'ANGEBOT',
          referenceId: data.id,
          referenceTitle: dealTitle,
        })
      }
    }

    // Stage-Change Activity
    if (u.stage && oldDeal && oldDeal.stage !== u.stage) {
      await supabase.from('activities').insert({
        contact_id: oldDeal.contact_id,
        deal_id: req.params.id,
        type: 'STATUS_CHANGE',
        text: `Phase geaendert: ${oldDeal.stage} → ${u.stage}`,
        created_by: req.user?.userId ?? null,
      })
    }

    // Tags aktualisieren
    if (u.tags !== undefined) {
      await supabase.from('deal_tags').delete().eq('deal_id', req.params.id)
      if (u.tags.length > 0) {
        await supabase.from('deal_tags').insert(u.tags.map((tagId) => ({ deal_id: req.params.id, tag_id: tagId })))
      }
    }

    res.json({
      data: {
        ...data,
        contactName: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : '',
        contactEmail: data.contact?.email ?? '',
        contactPhone: data.contact?.phone ?? '',
        company: data.contact?.company ?? null,
        address: data.contact?.address ?? '',
        tags: u.tags ?? (data?.deal_tags ?? []).map((dt: any) => dt.tag_id),
        deal_tags: undefined,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/deals/all – Alle Angebote loeschen (nur Admin)
// ---------------------------------------------------------------------------

router.delete('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') throw new AppError('Nur Admins koennen alle Angebote loeschen', 403)
    const now = new Date().toISOString()
    const { count, error } = await supabase
      .from('deals')
      .update({ deleted_at: now }, { count: 'exact' })
      .is('deleted_at', null)
    if (error) throw new AppError(error.message, 500)
    res.json({ message: `${count ?? 0} Angebote erfolgreich geloescht`, count: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/deals/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('deals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('deleted_at', null)

    if (error) throw new AppError('Angebot nicht gefunden', 404)
    res.json({ message: 'Angebot erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
