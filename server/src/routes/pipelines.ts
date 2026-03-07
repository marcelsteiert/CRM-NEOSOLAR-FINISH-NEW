import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline-Name ist erforderlich'),
  description: z.string().optional(),
})

const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
})

const createBucketSchema = z.object({
  name: z.string().min(1, 'Bucket-Name ist erforderlich'),
  position: z.number().int().min(0).optional(),
  color: z.string().optional(),
})

const updateBucketSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
  color: z.string().optional(),
})

const reorderBucketsSchema = z.object({
  bucketIds: z.array(z.string().uuid()).min(1, 'Mindestens ein Bucket erforderlich'),
})

// ---------------------------------------------------------------------------
// GET /api/v1/pipelines
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select('*, buckets(*)')
      .order('sort_order', { ascending: true })

    if (error) throw new AppError(error.message, 500)

    const result = (pipelines ?? []).map((p: any) => ({
      ...p,
      buckets: (p.buckets ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))

    res.json({ data: result })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/pipelines
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createPipelineSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const { data, error } = await supabase
      .from('pipelines')
      .insert({
        name: result.data.name,
        description: result.data.description ?? null,
      })
      .select('*, buckets(*)')
      .single()

    if (error) throw new AppError(error.message, 500)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/pipelines/:id
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updatePipelineSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    if (result.data.name !== undefined) updates.name = result.data.name
    if (result.data.description !== undefined) updates.description = result.data.description ?? null

    const { data, error } = await supabase
      .from('pipelines')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, buckets(*)')
      .single()

    if (error) throw new AppError('Pipeline nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/pipelines/:id/buckets
// ---------------------------------------------------------------------------

router.get('/:id/buckets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('buckets')
      .select('*')
      .eq('pipeline_id', req.params.id)
      .order('sort_order', { ascending: true })

    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/pipelines/:id/buckets
// ---------------------------------------------------------------------------

router.post('/:id/buckets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createBucketSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    let position = result.data.position
    if (position === undefined) {
      const { data: existing } = await supabase
        .from('buckets')
        .select('sort_order')
        .eq('pipeline_id', req.params.id)
        .order('sort_order', { ascending: false })
        .limit(1)
      position = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0
    }

    const { data, error } = await supabase
      .from('buckets')
      .insert({
        name: result.data.name,
        pipeline_id: req.params.id,
        sort_order: position,
        color: result.data.color ?? null,
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
// PUT /api/v1/pipelines/:id/buckets/reorder
// ---------------------------------------------------------------------------

router.put('/:id/buckets/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = reorderBucketsSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const { bucketIds } = result.data

    for (let i = 0; i < bucketIds.length; i++) {
      await supabase
        .from('buckets')
        .update({ sort_order: i })
        .eq('id', bucketIds[i])
        .eq('pipeline_id', req.params.id)
    }

    const { data } = await supabase
      .from('buckets')
      .select('*')
      .eq('pipeline_id', req.params.id)
      .order('sort_order', { ascending: true })

    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/pipelines/:id/buckets/:bucketId
// ---------------------------------------------------------------------------

router.put('/:id/buckets/:bucketId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateBucketSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    if (result.data.name !== undefined) updates.name = result.data.name
    if (result.data.position !== undefined) updates.sort_order = result.data.position
    if (result.data.color !== undefined) updates.color = result.data.color

    const { data, error } = await supabase
      .from('buckets')
      .update(updates)
      .eq('id', req.params.bucketId)
      .eq('pipeline_id', req.params.id)
      .select()
      .single()

    if (error) throw new AppError('Bucket nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/pipelines/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', req.params.id)

    if (error) throw new AppError('Pipeline nicht gefunden oder hat noch Referenzen', 400)
    res.json({ message: 'Pipeline geloescht' })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/pipelines/:id/buckets/:bucketId
// ---------------------------------------------------------------------------

router.delete('/:id/buckets/:bucketId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('buckets')
      .delete()
      .eq('id', req.params.bucketId)
      .eq('pipeline_id', req.params.id)

    if (error) throw new AppError('Bucket nicht gefunden', 404)
    res.json({ message: 'Bucket geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
