import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { getOwnerFilter, toSnakeCase } from '../lib/userFilter.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createEventSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().nullable().optional(),
  eventType: z.enum(['MONTAGE', 'ELEKTRO', 'WARTUNG', 'BEGEHUNG', 'ABNAHME', 'INTERN', 'SONSTIGES']).optional().default('MONTAGE'),
  startDate: z.string().min(1, 'Startdatum ist erforderlich'),
  endDate: z.string().min(1, 'Enddatum ist erforderlich'),
  allDay: z.boolean().optional().default(false),
  location: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(['GEPLANT', 'BESTAETIGT', 'IN_ARBEIT', 'ABGESCHLOSSEN', 'ABGESAGT']).optional().default('GEPLANT'),
  notes: z.string().nullable().optional(),
})

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  eventType: z.enum(['MONTAGE', 'ELEKTRO', 'WARTUNG', 'BEGEHUNG', 'ABNAHME', 'INTERN', 'SONSTIGES']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(['GEPLANT', 'BESTAETIGT', 'IN_ARBEIT', 'ABGESCHLOSSEN', 'ABGESAGT']).optional(),
  notes: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/v1/calendar
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, eventType, assignedTo, status, projectId, sortBy = 'start_date', sortOrder = 'asc' } = req.query

    let query = supabase
      .from('calendar_events')
      .select('*, contact:contacts(first_name, last_name, company), project:projects(name), assignee:users!calendar_events_assigned_to_fkey(first_name, last_name)', { count: 'exact' })
      .is('deleted_at', null)

    // Datumsbereich-Filter (Hauptfilter fuer Kalenderansicht)
    if (startDate && typeof startDate === 'string') query = query.gte('start_date', startDate)
    if (endDate && typeof endDate === 'string') query = query.lte('start_date', endDate)

    if (eventType && typeof eventType === 'string') query = query.eq('event_type', eventType)
    if (status && typeof status === 'string') query = query.eq('status', status)
    if (projectId && typeof projectId === 'string') query = query.eq('project_id', projectId)

    if (assignedTo && typeof assignedTo === 'string') {
      query = query.eq('assigned_to', assignedTo)
    } else {
      // Per-User Filter: Nicht-Admins sehen nur eigene + nicht-zugewiesene Events
      const ownerFilter = getOwnerFilter(req)
      if (ownerFilter) {
        query = query.or(`assigned_to.eq.${ownerFilter},assigned_to.is.null`)
      }
    }

    const sf = typeof sortBy === 'string' ? toSnakeCase(sortBy) : 'start_date'
    query = query.order(sf, { ascending: sortOrder !== 'desc' })

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/calendar/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*, contact:contacts(first_name, last_name, company), project:projects(name), assignee:users!calendar_events_assigned_to_fkey(first_name, last_name)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new AppError('Termin nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/calendar
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createEventSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        title: result.data.title,
        description: result.data.description ?? null,
        event_type: result.data.eventType,
        start_date: result.data.startDate,
        end_date: result.data.endDate,
        all_day: result.data.allDay,
        location: result.data.location ?? null,
        color: result.data.color ?? null,
        contact_id: result.data.contactId ?? null,
        project_id: result.data.projectId ?? null,
        assigned_to: result.data.assignedTo ?? req.user?.userId ?? null,
        created_by: req.user?.userId ?? null,
        status: result.data.status,
        notes: result.data.notes ?? null,
      })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/calendar/:id
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateEventSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    const u = result.data
    if (u.title !== undefined) updates.title = u.title
    if (u.description !== undefined) updates.description = u.description ?? null
    if (u.eventType !== undefined) updates.event_type = u.eventType
    if (u.startDate !== undefined) updates.start_date = u.startDate
    if (u.endDate !== undefined) updates.end_date = u.endDate
    if (u.allDay !== undefined) updates.all_day = u.allDay
    if (u.location !== undefined) updates.location = u.location ?? null
    if (u.color !== undefined) updates.color = u.color ?? null
    if (u.contactId !== undefined) updates.contact_id = u.contactId ?? null
    if (u.projectId !== undefined) updates.project_id = u.projectId ?? null
    if (u.assignedTo !== undefined) updates.assigned_to = u.assignedTo ?? null
    if (u.status !== undefined) updates.status = u.status
    if (u.notes !== undefined) updates.notes = u.notes ?? null

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new AppError('Termin nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/calendar/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('deleted_at', null)

    if (error) throw new AppError('Termin nicht gefunden', 404)
    res.json({ message: 'Termin erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
