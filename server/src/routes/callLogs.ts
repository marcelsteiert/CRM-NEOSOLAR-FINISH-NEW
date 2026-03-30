import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

const createSchema = z.object({
  leadId: z.string().min(1),
  result: z.enum(['NICHT_ERREICHT', 'ERREICHT', 'TERMIN', 'ABGESAGT', 'RUECKRUF']),
  notes: z.string().optional(),
})

// POST /api/v1/call-logs – Anruf loggen
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Validierungsfehler', 422)

    const { leadId, result, notes } = parsed.data
    const userId = req.user?.userId

    const { data, error } = await supabase
      .from('call_logs')
      .insert({ lead_id: leadId, user_id: userId, result, notes: notes ?? null })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)

    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/call-logs?leadId=xxx – Anrufe für einen Lead
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leadId } = req.query

    let query = supabase
      .from('call_logs')
      .select('*, user:users(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (leadId && typeof leadId === 'string') {
      query = query.eq('lead_id', leadId)
    }

    const { data, error } = await query.limit(200)
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/call-logs/stats – Callcenter-Auswertung
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query

    const { data, error } = await supabase.rpc('callcenter_call_stats', {
      p_from: (from && typeof from === 'string') ? from : null,
      p_to: (to && typeof to === 'string') ? to : null,
    })

    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

export default router
