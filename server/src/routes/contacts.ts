import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createContactSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  company: z.string().optional(),
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  phone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  address: z.string().min(1, 'Adresse ist erforderlich'),
  notes: z.string().optional(),
})

const updateContactSchema = createContactSchema.partial()

// ---------------------------------------------------------------------------
// GET /api/v1/contacts – Liste mit Suche + Pagination
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page: pp, pageSize: psp, sortBy = 'last_name', sortOrder = 'asc' } = req.query

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)

    if (search && typeof search === 'string') {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%`
      )
    }

    const sf = typeof sortBy === 'string' ? sortBy : 'last_name'
    const ascending = sortOrder !== 'desc'
    query = query.order(sf, { ascending })

    const page = Math.max(1, Number(pp) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(psp) || 20))
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [], total: count ?? 0, page, pageSize })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/:id – Einzelner Kontakt mit allen Verknuepfungen
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !contact) throw new AppError('Kontakt nicht gefunden', 404)

    // Alle verknuepften Entitaeten laden
    const [leads, appointments, deals, projects, activities, tasks, documents] = await Promise.all([
      supabase.from('leads').select('id, status, value, source, created_at').eq('contact_id', req.params.id).is('deleted_at', null),
      supabase.from('appointments').select('id, status, priority, appointment_date, appointment_type, value').eq('contact_id', req.params.id).is('deleted_at', null),
      supabase.from('deals').select('id, title, stage, priority, value, win_probability, created_at').eq('contact_id', req.params.id).is('deleted_at', null),
      supabase.from('projects').select('id, name, phase, priority, value, kwp, created_at').eq('contact_id', req.params.id).is('deleted_at', null),
      supabase.from('activities').select('id, type, text, created_by, created_at').eq('contact_id', req.params.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('tasks').select('id, title, status, priority, module, due_date').eq('contact_id', req.params.id).is('deleted_at', null),
      supabase.from('documents').select('id, file_name, file_size, mime_type, entity_type, created_at').eq('contact_id', req.params.id),
    ])

    res.json({
      data: {
        ...contact,
        leads: leads.data ?? [],
        appointments: appointments.data ?? [],
        deals: deals.data ?? [],
        projects: projects.data ?? [],
        activities: activities.data ?? [],
        tasks: tasks.data ?? [],
        documents: documents.data ?? [],
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/contacts – Kontakt erstellen
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createContactSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        first_name: result.data.firstName,
        last_name: result.data.lastName,
        company: result.data.company ?? null,
        email: result.data.email,
        phone: result.data.phone,
        address: result.data.address,
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
// PUT /api/v1/contacts/:id – Kontakt aktualisieren
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateContactSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    if (result.data.firstName !== undefined) updates.first_name = result.data.firstName
    if (result.data.lastName !== undefined) updates.last_name = result.data.lastName
    if (result.data.company !== undefined) updates.company = result.data.company ?? null
    if (result.data.email !== undefined) updates.email = result.data.email
    if (result.data.phone !== undefined) updates.phone = result.data.phone
    if (result.data.address !== undefined) updates.address = result.data.address
    if (result.data.notes !== undefined) updates.notes = result.data.notes ?? null

    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new AppError('Kontakt nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/contacts/:id – Soft Delete
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('deleted_at', null)

    if (error) throw new AppError('Kontakt nicht gefunden', 404)
    res.json({ message: 'Kontakt erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
