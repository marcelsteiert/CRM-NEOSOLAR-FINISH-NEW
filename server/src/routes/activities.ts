import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/activities?contactId=xxx oder ?leadId=xxx oder ?dealId=xxx
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactId, leadId, dealId, projectId } = req.query

    let query = supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(100)

    if (contactId && typeof contactId === 'string') query = query.eq('contact_id', contactId)
    if (leadId && typeof leadId === 'string') query = query.eq('lead_id', leadId)
    if (dealId && typeof dealId === 'string') query = query.eq('deal_id', dealId)
    if (projectId && typeof projectId === 'string') query = query.eq('project_id', projectId)

    const { data, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/activities
// ---------------------------------------------------------------------------

const createActivitySchema = z.object({
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  projectId: z.string().optional(),
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM', 'DOCUMENT_UPLOAD']),
  text: z.string().min(1),
  createdBy: z.string().optional().default('u001'),
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createActivitySchema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    const { data, error } = await supabase
      .from('activities')
      .insert({
        contact_id: result.data.contactId ?? null,
        lead_id: result.data.leadId ?? null,
        deal_id: result.data.dealId ?? null,
        project_id: result.data.projectId ?? null,
        type: result.data.type,
        text: result.data.text,
        created_by: result.data.createdBy,
      })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

export default router
