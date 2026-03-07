import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { resolveContactId } from '../lib/contactResolver.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createLeadSchema = z.object({
  contactId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(['HOMEPAGE', 'LANDINGPAGE', 'MESSE', 'EMPFEHLUNG', 'KALTAKQUISE', 'SONSTIGE']),
  pipelineId: z.string().optional(),
  bucketId: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['ACTIVE', 'CONVERTED', 'LOST', 'ARCHIVED', 'AFTER_SALES']).optional(),
  value: z.number().min(0).optional(),
  notes: z.string().optional(),
  appointmentType: z.enum(['VOR_ORT', 'ONLINE']).optional(),
  tags: z.array(z.string()).optional(),
})

const updateLeadSchema = createLeadSchema.partial()

const moveLeadSchema = z.object({
  bucketId: z.string().min(1),
})

// ---------------------------------------------------------------------------
// GET /api/v1/leads – Liste mit Filtering, Suche, Pagination
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, source, appointmentType, pipelineId, bucketId, assignedTo, search, page: pp, pageSize: psp, sortBy = 'created_at', sortOrder = 'desc' } = req.query

    let query = supabase
      .from('leads')
      .select('*, contact:contacts(*), lead_tags(tag_id)', { count: 'exact' })
      .is('deleted_at', null)

    if (status && typeof status === 'string') query = query.eq('status', status)
    if (source && typeof source === 'string') query = query.eq('source', source)
    if (appointmentType && typeof appointmentType === 'string') query = query.eq('appointment_type', appointmentType)
    if (pipelineId && typeof pipelineId === 'string') query = query.eq('pipeline_id', pipelineId)
    if (bucketId && typeof bucketId === 'string') query = query.eq('bucket_id', bucketId)
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    if (search && typeof search === 'string') {
      query = query.or(`notes.ilike.%${search}%,source.ilike.%${search}%`)
    }

    const sf = typeof sortBy === 'string' ? sortBy : 'created_at'
    const ascending = sortOrder !== 'desc'
    query = query.order(sf, { ascending })

    const page = Math.max(1, Number(pp) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(psp) || 20))
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    // Kontakt-Daten flach + Tags als Array
    const enriched = (data ?? []).map((lead: any) => ({
      ...lead,
      firstName: lead.contact?.first_name ?? null,
      lastName: lead.contact?.last_name ?? null,
      company: lead.contact?.company ?? null,
      address: lead.contact?.address ?? '',
      phone: lead.contact?.phone ?? '',
      email: lead.contact?.email ?? '',
      tags: (lead.lead_tags ?? []).map((lt: any) => lt.tag_id),
      lead_tags: undefined,
    }))

    res.json({ data: enriched, total: count ?? 0, page, pageSize })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/leads/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*, contact:contacts(*), lead_tags(tag_id)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new AppError('Lead nicht gefunden', 404)

    res.json({
      data: {
        ...data,
        firstName: data.contact?.first_name ?? null,
        lastName: data.contact?.last_name ?? null,
        company: data.contact?.company ?? null,
        address: data.contact?.address ?? '',
        phone: data.contact?.phone ?? '',
        email: data.contact?.email ?? '',
        tags: (data.lead_tags ?? []).map((lt: any) => lt.tag_id),
        lead_tags: undefined,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/leads – Erstellen
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createLeadSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const contactId = await resolveContactId(result.data)

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        contact_id: contactId,
        source: result.data.source,
        pipeline_id: result.data.pipelineId ?? null,
        bucket_id: result.data.bucketId ?? null,
        assigned_to: result.data.assignedTo ?? null,
        status: result.data.status ?? 'ACTIVE',
        value: result.data.value ?? 0,
        notes: result.data.notes ?? null,
        appointment_type: result.data.appointmentType ?? null,
      })
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError(error.message, 500)

    // Tags setzen
    if (result.data.tags && result.data.tags.length > 0 && lead) {
      await supabase.from('lead_tags').insert(
        result.data.tags.map((tagId) => ({ lead_id: lead.id, tag_id: tagId }))
      )
    }

    res.status(201).json({ data: { ...lead, tags: result.data.tags ?? [] } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/leads/:id – Update
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateLeadSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    if (result.data.contactId !== undefined) updates.contact_id = result.data.contactId
    if (result.data.source !== undefined) updates.source = result.data.source
    if (result.data.pipelineId !== undefined) updates.pipeline_id = result.data.pipelineId ?? null
    if (result.data.bucketId !== undefined) updates.bucket_id = result.data.bucketId ?? null
    if (result.data.assignedTo !== undefined) updates.assigned_to = result.data.assignedTo ?? null
    if (result.data.status !== undefined) updates.status = result.data.status
    if (result.data.value !== undefined) updates.value = result.data.value
    if (result.data.notes !== undefined) updates.notes = result.data.notes ?? null
    if (result.data.appointmentType !== undefined) updates.appointment_type = result.data.appointmentType ?? null

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*), lead_tags(tag_id)')
      .single()

    if (error) throw new AppError('Lead nicht gefunden', 404)

    // Tags aktualisieren
    if (result.data.tags !== undefined) {
      await supabase.from('lead_tags').delete().eq('lead_id', req.params.id)
      if (result.data.tags.length > 0) {
        await supabase.from('lead_tags').insert(
          result.data.tags.map((tagId) => ({ lead_id: req.params.id, tag_id: tagId }))
        )
      }
    }

    res.json({
      data: {
        ...data,
        tags: result.data.tags ?? (data?.lead_tags ?? []).map((lt: any) => lt.tag_id),
        lead_tags: undefined,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/:id – Soft Delete
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('deleted_at', null)

    if (error) throw new AppError('Lead nicht gefunden', 404)
    res.json({ message: 'Lead erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/leads/:id/tags – Tags hinzufuegen
// ---------------------------------------------------------------------------

router.post('/:id/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ tagIds: z.array(z.string()) })
    const result = schema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    const inserts = result.data.tagIds.map((tagId) => ({ lead_id: req.params.id, tag_id: tagId }))
    await supabase.from('lead_tags').upsert(inserts, { onConflict: 'lead_id,tag_id' })

    const { data } = await supabase.from('lead_tags').select('tag_id').eq('lead_id', req.params.id)
    res.json({ data: { tags: (data ?? []).map((t: any) => t.tag_id) } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/:id/tags/:tagId – Tag entfernen
// ---------------------------------------------------------------------------

router.delete('/:id/tags/:tagId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await supabase.from('lead_tags').delete().eq('lead_id', req.params.id).eq('tag_id', req.params.tagId)
    const { data } = await supabase.from('lead_tags').select('tag_id').eq('lead_id', req.params.id)
    res.json({ data: { tags: (data ?? []).map((t: any) => t.tag_id) } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/leads/:id/move – In anderen Bucket verschieben
// ---------------------------------------------------------------------------

router.put('/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = moveLeadSchema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    const { data, error } = await supabase
      .from('leads')
      .update({ bucket_id: result.data.bucketId })
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError('Lead nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

export default router
