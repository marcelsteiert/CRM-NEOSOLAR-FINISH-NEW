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

const createTaskSchema = z.object({
  contactId: z.string().optional(),
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  module: z.enum(['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT', 'ALLGEMEIN']).optional().default('ALLGEMEIN'),
  referenceId: z.string().optional(),
  referenceTitle: z.string().optional(),
  assignedTo: z.string().min(1, 'Zugewiesener Benutzer ist erforderlich'),
  assignedBy: z.string().optional(),
  dueDate: z.string().optional(),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/v1/tasks
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo, status, module: mod, priority, search, sortBy = 'due_date', sortOrder = 'asc' } = req.query

    let query = supabase
      .from('tasks')
      .select('*, contact:contacts(first_name, last_name, company)', { count: 'exact' })
      .is('deleted_at', null)

    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    // Per-User Filter: Nicht-Admins sehen nur eigene Tasks
    const ownerFilter = getOwnerFilter(req)
    if (ownerFilter && !assignedTo) query = query.eq('assigned_to', ownerFilter)

    if (status && typeof status === 'string') query = query.eq('status', status)
    if (mod && typeof mod === 'string') query = query.eq('module', mod)
    if (priority && typeof priority === 'string') query = query.eq('priority', priority)
    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,reference_title.ilike.%${search}%`)
    }

    const sf = typeof sortBy === 'string' ? toSnakeCase(sortBy) : 'due_date'
    query = query.order(sf, { ascending: sortOrder !== 'desc', nullsFirst: false })

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/tasks/stats
// ---------------------------------------------------------------------------

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase.from('tasks').select('*').is('deleted_at', null)
    const { assignedTo } = req.query
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    const { data: tasks } = await query
    const items = tasks ?? []

    const open = items.filter((t: any) => t.status === 'OFFEN').length
    const inProgress = items.filter((t: any) => t.status === 'IN_BEARBEITUNG').length
    const completed = items.filter((t: any) => t.status === 'ERLEDIGT').length
    const overdue = items.filter(
      (t: any) => t.status !== 'ERLEDIGT' && t.due_date && new Date(t.due_date) < new Date()
    ).length

    res.json({ data: { open, inProgress, completed, overdue, total: items.length } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/tasks/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, contact:contacts(first_name, last_name, company)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new AppError('Aufgabe nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/tasks
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createTaskSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        contact_id: result.data.contactId ?? null,
        title: result.data.title,
        description: result.data.description ?? null,
        status: 'OFFEN',
        priority: result.data.priority,
        module: result.data.module,
        reference_id: result.data.referenceId ?? null,
        reference_title: result.data.referenceTitle ?? null,
        assigned_to: result.data.assignedTo,
        assigned_by: result.data.assignedBy || req.user?.userId || null,
        due_date: result.data.dueDate ?? null,
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
// PUT /api/v1/tasks/:id
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateTaskSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    const u = result.data
    if (u.title !== undefined) updates.title = u.title
    if (u.description !== undefined) updates.description = u.description ?? null
    if (u.priority !== undefined) updates.priority = u.priority
    if (u.assignedTo !== undefined) updates.assigned_to = u.assignedTo
    if (u.dueDate !== undefined) updates.due_date = u.dueDate ?? null

    if (u.status !== undefined) {
      updates.status = u.status
      if (u.status === 'ERLEDIGT') updates.completed_at = new Date().toISOString()
      else updates.completed_at = null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new AppError('Aufgabe nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/tasks/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('deleted_at', null)

    if (error) throw new AppError('Aufgabe nicht gefunden', 404)
    res.json({ message: 'Aufgabe erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
