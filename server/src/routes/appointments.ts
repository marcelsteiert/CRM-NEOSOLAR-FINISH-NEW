import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { resolveContactId } from '../lib/contactResolver.js'
import { getOwnerFilter } from '../lib/userFilter.js'

const router = Router()

// ---------------------------------------------------------------------------
// Fahrzeit-Lookup ab St. Margrethen (Minuten)
// ---------------------------------------------------------------------------

const TRAVEL_TIMES: Record<string, number> = {
  'st. margrethen': 0, 'st. gallen': 25, 'rorschach': 15, 'heerbrugg': 5,
  'altstaetten': 10, 'frauenfeld': 55, 'kreuzlingen': 50, 'winterthur': 65,
  'wetzikon': 75, 'zuerich': 80, 'zürich': 80, 'baden': 90, 'aarau': 95,
  'olten': 100, 'basel': 120, 'bern': 135, 'luzern': 110, 'baar': 90,
  'zug': 95, 'schaffhausen': 70, 'chur': 65, 'lausanne': 210, 'genf': 240,
}

function estimateTravelMinutes(address: string): number | null {
  const lower = address.toLowerCase()
  for (const [city, minutes] of Object.entries(TRAVEL_TIMES)) {
    if (lower.includes(city)) return minutes
  }
  return null
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createAppointmentSchema = z.object({
  contactId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  leadId: z.string().optional(),
  value: z.number().min(0).optional(),
  status: z.enum(['GEPLANT', 'BESTAETIGT', 'VORBEREITUNG', 'DURCHGEFUEHRT', 'ABGESAGT']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  appointmentType: z.enum(['VOR_ORT', 'ONLINE']).optional(),
  assignedTo: z.string().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  preparationNotes: z.string().optional(),
  notes: z.string().optional(),
})

const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  checklist: z.array(z.object({ id: z.string(), label: z.string(), checked: z.boolean() })).optional(),
})

// ---------------------------------------------------------------------------
// GET /api/v1/appointments
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, appointmentType, assignedTo, search, page: pp, pageSize: psp, sortBy = 'appointment_date', sortOrder = 'asc' } = req.query

    let query = supabase
      .from('appointments')
      .select('*, contact:contacts(*)', { count: 'exact' })
      .is('deleted_at', null)

    if (status && typeof status === 'string') query = query.eq('status', status)
    if (priority && typeof priority === 'string') query = query.eq('priority', priority)
    if (appointmentType && typeof appointmentType === 'string') query = query.eq('appointment_type', appointmentType)
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    // Per-User Filter: Nicht-Admins sehen nur eigene Termine
    const ownerFilter = getOwnerFilter(req)
    if (ownerFilter) query = query.eq('assigned_to', ownerFilter)

    if (search && typeof search === 'string') {
      query = query.or(`notes.ilike.%${search}%,status.ilike.%${search}%`)
    }

    const sf = typeof sortBy === 'string' ? sortBy : 'appointment_date'
    query = query.order(sf, { ascending: sortOrder !== 'desc' })

    const page = Math.max(1, Number(pp) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(psp) || 20))
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    const enriched = (data ?? []).map((a: any) => ({
      ...a,
      contactName: a.contact ? `${a.contact.first_name} ${a.contact.last_name}` : '',
      contactEmail: a.contact?.email ?? '',
      contactPhone: a.contact?.phone ?? '',
      company: a.contact?.company ?? null,
      address: a.contact?.address ?? '',
      travelMinutes: a.contact ? estimateTravelMinutes(a.contact.address) : null,
    }))

    res.json({ data: enriched, total: count ?? 0, page, pageSize })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/appointments/stats
// ---------------------------------------------------------------------------

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase.from('appointments').select('*').is('deleted_at', null)
    const { assignedTo } = req.query
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    const { data: active } = await query
    const items = active ?? []

    const statuses: Record<string, number> = { GEPLANT: 0, BESTAETIGT: 0, VORBEREITUNG: 0, DURCHGEFUEHRT: 0, ABGESAGT: 0 }
    for (const a of items) statuses[a.status]++

    const upcoming = items.filter((a: any) => a.status !== 'DURCHGEFUEHRT' && a.status !== 'ABGESAGT')
    const totalValue = upcoming.reduce((s: number, a: any) => s + Number(a.value), 0)

    const openWithChecklist = upcoming.filter((a: any) => Array.isArray(a.checklist) && a.checklist.length > 0)
    const totalItems = openWithChecklist.reduce((s: number, a: any) => s + a.checklist.length, 0)
    const checkedItems = openWithChecklist.reduce((s: number, a: any) => s + a.checklist.filter((c: any) => c.checked).length, 0)

    res.json({
      data: {
        total: items.length,
        upcoming: upcoming.length,
        totalValue,
        statuses,
        completed: statuses.DURCHGEFUEHRT,
        cancelled: statuses.ABGESAGT,
        checklistProgress: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/appointments/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, contact:contacts(*)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new AppError('Termin nicht gefunden', 404)
    res.json({ data: {
      ...data,
      contactName: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : '',
      contactEmail: data.contact?.email ?? '',
      contactPhone: data.contact?.phone ?? '',
      company: data.contact?.company ?? null,
      address: data.contact?.address ?? '',
      travelMinutes: data.contact ? estimateTravelMinutes(data.contact.address) : null,
    } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/appointments
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createAppointmentSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const contactId = await resolveContactId(result.data)

    // Default-Checkliste aus Settings laden
    const { data: settingsRow } = await supabase.from('settings').select('value').eq('key', 'checklistTemplate').single()
    const defaultChecklist = settingsRow?.value ?? []

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        contact_id: contactId,
        lead_id: result.data.leadId ?? null,
        value: result.data.value ?? 0,
        status: result.data.status ?? 'GEPLANT',
        priority: result.data.priority ?? 'MEDIUM',
        appointment_type: result.data.appointmentType ?? 'VOR_ORT',
        assigned_to: result.data.assignedTo ?? null,
        appointment_date: result.data.appointmentDate ?? null,
        appointment_time: result.data.appointmentTime ?? null,
        preparation_notes: result.data.preparationNotes ?? null,
        checklist: (defaultChecklist as any[]).map((c: any) => ({ ...c, checked: false })),
        notes: result.data.notes ?? null,
      })
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError(error.message, 500)
    res.status(201).json({ data: {
      ...data,
      contactName: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : '',
      contactEmail: data.contact?.email ?? '',
      contactPhone: data.contact?.phone ?? '',
      company: data.contact?.company ?? null,
      address: data.contact?.address ?? '',
      travelMinutes: data.contact ? estimateTravelMinutes(data.contact.address) : null,
    } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/appointments/:id
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateAppointmentSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    const u = result.data
    if (u.contactId !== undefined) updates.contact_id = u.contactId
    if (u.leadId !== undefined) updates.lead_id = u.leadId ?? null
    if (u.value !== undefined) updates.value = u.value
    if (u.priority !== undefined) updates.priority = u.priority
    if (u.appointmentType !== undefined) updates.appointment_type = u.appointmentType
    if (u.assignedTo !== undefined) updates.assigned_to = u.assignedTo ?? null
    if (u.appointmentDate !== undefined) updates.appointment_date = u.appointmentDate ?? null
    if (u.appointmentTime !== undefined) updates.appointment_time = u.appointmentTime ?? null
    if (u.preparationNotes !== undefined) updates.preparation_notes = u.preparationNotes ?? null
    if (u.notes !== undefined) updates.notes = u.notes ?? null
    if (u.checklist !== undefined) updates.checklist = u.checklist

    if (u.status !== undefined) {
      updates.status = u.status
      if (u.status === 'DURCHGEFUEHRT') updates.completed_at = new Date().toISOString()
      else updates.completed_at = null
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError('Termin nicht gefunden', 404)
    res.json({ data: {
      ...data,
      contactName: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : '',
      contactEmail: data.contact?.email ?? '',
      contactPhone: data.contact?.phone ?? '',
      company: data.contact?.company ?? null,
      address: data.contact?.address ?? '',
      travelMinutes: data.contact ? estimateTravelMinutes(data.contact.address) : null,
    } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/appointments/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('appointments')
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
