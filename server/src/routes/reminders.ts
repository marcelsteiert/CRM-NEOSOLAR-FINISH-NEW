import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createReminderSchema = z.object({
  leadId: z.string(),
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().optional(),
  dueAt: z.string(),
  createdBy: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/v1/reminders
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leadId, pending } = req.query

    let query = supabase.from('reminders').select('*').order('due_at', { ascending: true })

    if (leadId && typeof leadId === 'string') {
      query = query.or(`lead_id.eq.${leadId},lead_id.is.null`)
    }

    if (pending === 'true') {
      query = query.eq('dismissed', false).lte('due_at', new Date().toISOString())
    }

    const { data, error } = await query
    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/reminders
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createReminderSchema.safeParse(req.body)
    if (!result.success) {
      const msg = result.error.errors.map((e) => e.message).join('; ')
      throw new AppError(`Validierungsfehler: ${msg}`, 422)
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        lead_id: result.data.leadId,
        title: result.data.title,
        description: result.data.description ?? null,
        due_at: result.data.dueAt,
        dismissed: false,
        created_by: result.data.createdBy ?? 'System',
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
// PUT /api/v1/reminders/:id/dismiss
// ---------------------------------------------------------------------------

router.put('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .update({ dismissed: true })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw new AppError('Erinnerung nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/reminders/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', req.params.id)

    if (error) throw new AppError('Erinnerung nicht gefunden', 404)
    res.json({ message: 'Erinnerung geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
