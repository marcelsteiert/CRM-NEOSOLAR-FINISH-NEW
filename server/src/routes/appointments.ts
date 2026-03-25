import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { resolveContactId } from '../lib/contactResolver.js'
import { getAppointmentOwnerFilter, toSnakeCase } from '../lib/userFilter.js'
import { logAudit, getAuditUserId } from '../lib/auditService.js'

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
  contactId: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  value: z.number().min(0).nullable().optional(),
  status: z.enum(['GEPLANT', 'BESTAETIGT', 'VORBEREITUNG', 'DURCHGEFUEHRT', 'ABGESAGT']).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).nullable().optional(),
  appointmentType: z.enum(['VOR_ORT', 'ONLINE']).nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  appointmentDate: z.string().nullable().optional(),
  appointmentTime: z.string().nullable().optional(),
  preparationNotes: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
    const ownerFilter = getAppointmentOwnerFilter(req)
    if (ownerFilter) query = query.eq('assigned_to', ownerFilter)

    if (search && typeof search === 'string') {
      query = query.or(`notes.ilike.%${search}%,status.ilike.%${search}%`)
    }

    const sf = typeof sortBy === 'string' ? toSnakeCase(sortBy) : 'appointment_date'
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
        assigned_to: result.data.assignedTo ?? req.user?.userId ?? null,
        appointment_date: result.data.appointmentDate ?? null,
        appointment_time: result.data.appointmentTime ?? null,
        preparation_notes: result.data.preparationNotes ?? null,
        checklist: (defaultChecklist as any[]).map((c: any) => ({ ...c, checked: false })),
        notes: result.data.notes ?? null,
      })
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError(error.message, 500)
    logAudit({ userId: getAuditUserId(req), action: 'CREATE', entity: 'APPOINTMENT', entityId: data?.id, description: `Termin erstellt (${result.data.appointmentType ?? 'VOR_ORT'})` })
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

    // Kontaktdaten auf contacts-Tabelle aktualisieren
    if (u.contactEmail !== undefined || u.contactPhone !== undefined || u.contactName !== undefined || u.company !== undefined || u.address !== undefined) {
      // Zuerst contact_id ermitteln
      const { data: apptData } = await supabase.from('appointments').select('contact_id').eq('id', req.params.id).single()
      if (apptData?.contact_id) {
        const contactUpdates: Record<string, unknown> = {}
        if (u.contactEmail !== undefined) contactUpdates.email = u.contactEmail
        if (u.contactPhone !== undefined) contactUpdates.phone = u.contactPhone
        if (u.company !== undefined) contactUpdates.company = u.company || null
        if (u.address !== undefined) contactUpdates.address = u.address
        if (u.contactName !== undefined) {
          const parts = (u.contactName ?? '').trim().split(/\s+/)
          contactUpdates.first_name = parts[0] ?? ''
          contactUpdates.last_name = parts.slice(1).join(' ') || ''
        }
        if (Object.keys(contactUpdates).length > 0) {
          await supabase.from('contacts').update(contactUpdates).eq('id', apptData.contact_id)
        }
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError('Termin nicht gefunden', 404)
    logAudit({ userId: getAuditUserId(req), action: 'UPDATE', entity: 'APPOINTMENT', entityId: req.params.id, description: `Termin aktualisiert` })
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
// DELETE /api/v1/appointments/all – Alle Termine loeschen (nur Admin)
// ---------------------------------------------------------------------------

router.delete('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') throw new AppError('Nur Admins koennen alle Termine loeschen', 403)
    const now = new Date().toISOString()
    const { count, error } = await supabase
      .from('appointments')
      .update({ deleted_at: now }, { count: 'exact' })
      .is('deleted_at', null)
    if (error) throw new AppError(error.message, 500)
    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'APPOINTMENT', description: `${count ?? 0} Termine gelöscht (Massenoperation)` })
    res.json({ message: `${count ?? 0} Termine erfolgreich geloescht`, count: count ?? 0 })
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
    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'APPOINTMENT', entityId: req.params.id, description: `Termin gelöscht` })
    res.json({ message: 'Termin erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
