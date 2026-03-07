import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag-Name ist erforderlich'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein gueltiger Hex-Code sein (z.B. #FF5733)')
    .optional()
    .default('#6B7280'),
})

// ---------------------------------------------------------------------------
// GET /api/v1/tags
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/tags
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createTagSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: result.data.name,
        color: result.data.color,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new AppError(`Tag mit dem Namen "${result.data.name}" existiert bereits`, 409)
      throw new AppError(error.message, 500)
    }

    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/tags/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', req.params.id)

    if (error) throw new AppError('Tag nicht gefunden', 404)
    res.json({ message: 'Tag erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
