import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { resolveContactId } from '../lib/contactResolver.js'
import { getOwnerFilter } from '../lib/userFilter.js'

const router = Router()

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

const phaseDefinitions = [
  { id: 'admin', name: 'Administration', color: '#60A5FA', description: 'Vertrag, Bewilligungen, Bestellungen',
    steps: ['Vertrag unterschrieben', 'Baugesuch geprueft', 'Netzanmeldung EW', 'Materialbestellung', 'Liefertermin bestaetigt', 'Montagetermin koordiniert', 'Geruestfirma beauftragt', 'Akonto-Rechnung'] },
  { id: 'montage', name: 'Montage', color: '#FB923C', description: 'Geruest, Module, Dacharbeiten',
    steps: ['Geruest gestellt', 'Dachzustand geprueft', 'Unterkonstruktion', 'Module verlegt', 'DC-Leitungen', 'Montage-Abnahme', 'Geruest abgebaut'] },
  { id: 'elektro', name: 'Elektriker', color: '#F59E0B', description: 'Wechselrichter, Speicher, AC',
    steps: ['Wechselrichter', 'Speicher installiert', 'DC-Verkabelung', 'AC-Anschluss', 'Zaehlerkasten', 'NIV Pruefung', 'Monitoring', 'Elektro-Abnahme'] },
  { id: 'abschluss', name: 'Abschluss', color: '#34D399', description: 'Abnahme, Doku, Rechnung',
    steps: ['Inbetriebnahme', 'EW Bestaetigung', 'Endabnahme Kunde', 'Kundenzufriedenheit', 'Anlagedoku', 'Schlussrechnung', 'Nachkalkulation', 'Garantie archiviert'] },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeProgress(progress: any) {
  const all = Object.values(progress).flat() as number[]
  const total = all.length
  const done = all.filter(Boolean).length
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 }
}

function enrichProject(p: any) {
  return {
    ...p,
    address: p.contact?.address ?? '',
    phone: p.contact?.phone ?? '',
    email: p.contact?.email ?? '',
    company: p.contact?.company ?? null,
    kWp: p.kwp ?? 0,
    montagePartner: p.montage_partner_id ?? '',
    elektroPartner: p.elektro_partner_id ?? '',
    projectManager: p.project_manager_id ?? '',
    kalkulation: { soll: p.kalkulation_soll ?? 0, ist: p.kalkulation_ist ?? null },
    ...computeProgress(p.progress ?? {}),
  }
}

function determinePhase(progress: any): string {
  const phases = ['admin', 'montage', 'elektro', 'abschluss']
  for (let i = phases.length - 1; i >= 0; i--) {
    const arr = progress[phases[i]]
    if (arr && arr.some(Boolean)) return phases[i]
  }
  return 'admin'
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  contactId: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  kwp: z.number().min(0).optional(),
  kWp: z.number().min(0).optional(),
  value: z.number().min(0).optional(),
  montagePartnerId: z.string().optional(),
  elektroPartnerId: z.string().optional(),
  projectManagerId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().optional(),
  leadId: z.string().optional(),
  appointmentId: z.string().optional(),
  dealId: z.string().optional(),
  notes: z.string().optional(),
  kalkulationSoll: z.number().optional(),
})

const updateProjectSchema = createProjectSchema.partial().extend({
  phase: z.enum(['admin', 'montage', 'elektro', 'abschluss']).optional(),
  risk: z.boolean().optional(),
  riskNote: z.string().nullable().optional(),
  progress: z.record(z.array(z.number())).optional(),
  rating: z.number().nullable().optional(),
  kalkulationIst: z.number().nullable().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/v1/projects
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phase, priority, risk, search, projectManager, sortBy = 'name', sortOrder = 'asc' } = req.query

    let query = supabase
      .from('projects')
      .select('*, contact:contacts(*)', { count: 'exact' })
      .is('deleted_at', null)

    if (phase && typeof phase === 'string') query = query.eq('phase', phase)
    if (priority && typeof priority === 'string') query = query.eq('priority', priority)
    if (risk === 'true') query = query.eq('risk', true)
    if (projectManager && typeof projectManager === 'string') query = query.eq('project_manager_id', projectManager)

    // Per-User Filter: Nicht-Admins sehen nur eigene Projekte
    const ownerFilter = getOwnerFilter(req)
    if (ownerFilter) query = query.eq('project_manager_id', ownerFilter)

    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const sf = typeof sortBy === 'string' ? sortBy : 'name'
    query = query.order(sf, { ascending: sortOrder !== 'desc' })

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    const enriched = (data ?? []).map((p: any) => enrichProject(p))
    res.json({ data: enriched, total: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/projects/phases
// ---------------------------------------------------------------------------

router.get('/phases', (_req: Request, res: Response) => {
  res.json({ data: phaseDefinitions })
})

// ---------------------------------------------------------------------------
// GET /api/v1/projects/partners
// ---------------------------------------------------------------------------

router.get('/partners', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase.from('partners').select('*').is('deleted_at', null)
    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/projects/stats
// ---------------------------------------------------------------------------

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: active } = await supabase.from('projects').select('*').is('deleted_at', null)
    const items = active ?? []

    const totalValue = items.reduce((s: number, p: any) => s + Number(p.value), 0)
    const totalKwp = items.reduce((s: number, p: any) => s + Number(p.kwp ?? 0), 0)
    const avgProgress = items.reduce((s: number, p: any) => s + computeProgress(p.progress ?? {}).percent, 0) / (items.length || 1)
    const risks = items.filter((p: any) => p.risk)

    const byPhase: Record<string, { count: number; value: number }> = { admin: { count: 0, value: 0 }, montage: { count: 0, value: 0 }, elektro: { count: 0, value: 0 }, abschluss: { count: 0, value: 0 } }
    for (const p of items) { byPhase[p.phase].count++; byPhase[p.phase].value += Number(p.value) }

    const withIst = items.filter((p: any) => p.kalkulation_ist !== null)
    const totalSoll = withIst.reduce((s: number, p: any) => s + Number(p.kalkulation_soll ?? 0), 0)
    const totalIst = withIst.reduce((s: number, p: any) => s + Number(p.kalkulation_ist ?? 0), 0)

    res.json({
      data: {
        total: items.length, totalValue, totalKwp,
        avgKwp: items.length ? totalKwp / items.length : 0,
        avgProgress: Math.round(avgProgress),
        risks: risks.length, byPhase,
        kalkulation: { totalSoll, totalIst, diff: totalIst - totalSoll },
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*, contact:contacts(*)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new AppError('Projekt nicht gefunden', 404)

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('project_id', req.params.id)
      .order('created_at', { ascending: true })

    res.json({ data: { ...enrichProject(data), activities: activities ?? [] } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/projects
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createProjectSchema.safeParse(req.body)
    if (!result.success) {
      const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${msg}`, 422)
    }

    const d = result.data
    const contactId = await resolveContactId(d)

    const defaultProgress = {
      admin: phaseDefinitions[0].steps.map(() => 0),
      montage: phaseDefinitions[1].steps.map(() => 0),
      elektro: phaseDefinitions[2].steps.map(() => 0),
      abschluss: phaseDefinitions[3].steps.map(() => 0),
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        contact_id: contactId,
        name: d.name,
        description: d.description ?? '',
        kwp: d.kWp ?? d.kwp ?? 0,
        value: d.value ?? 0,
        montage_partner_id: d.montagePartnerId ?? null,
        elektro_partner_id: d.elektroPartnerId ?? null,
        project_manager_id: d.projectManagerId ?? null,
        phase: 'admin',
        priority: d.priority ?? 'MEDIUM',
        progress: defaultProgress,
        start_date: d.startDate ?? new Date().toISOString().slice(0, 10),
        kalkulation_soll: d.kalkulationSoll ?? 0,
        lead_id: d.leadId ?? null,
        appointment_id: d.appointmentId ?? null,
        deal_id: d.dealId ?? null,
        notes: d.notes ?? null,
      })
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError(error.message, 500)

    // System-Activity
    if (project) {
      await supabase.from('activities').insert({
        contact_id: project.contact_id,
        project_id: project.id,
        type: 'SYSTEM',
        text: 'Projekt erstellt',
        created_by: d.projectManagerId ?? 'u001',
      })
    }

    res.status(201).json({ data: { ...enrichProject(project), activities: [] } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/projects/:id
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateProjectSchema.safeParse(req.body)
    if (!result.success) {
      const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${msg}`, 422)
    }

    const u = result.data
    const updates: Record<string, unknown> = {}
    if (u.contactId !== undefined) updates.contact_id = u.contactId
    if (u.name !== undefined) updates.name = u.name
    if (u.description !== undefined) updates.description = u.description
    if (u.kwp !== undefined) updates.kwp = u.kwp
    if (u.value !== undefined) updates.value = u.value
    if (u.montagePartnerId !== undefined) updates.montage_partner_id = u.montagePartnerId ?? null
    if (u.elektroPartnerId !== undefined) updates.elektro_partner_id = u.elektroPartnerId ?? null
    if (u.projectManagerId !== undefined) updates.project_manager_id = u.projectManagerId ?? null
    if (u.phase !== undefined) updates.phase = u.phase
    if (u.priority !== undefined) updates.priority = u.priority
    if (u.risk !== undefined) updates.risk = u.risk
    if (u.riskNote !== undefined) updates.risk_note = u.riskNote
    if (u.startDate !== undefined) updates.start_date = u.startDate
    if (u.kalkulationSoll !== undefined) updates.kalkulation_soll = u.kalkulationSoll
    if (u.kalkulationIst !== undefined) updates.kalkulation_ist = u.kalkulationIst
    if (u.rating !== undefined) updates.rating = u.rating
    if (u.notes !== undefined) updates.notes = u.notes ?? null

    if (u.progress !== undefined) {
      updates.progress = u.progress
      updates.phase = determinePhase(u.progress)
      const prog = computeProgress(u.progress)
      if (prog.percent === 100) updates.completed_at = new Date().toISOString()
      else updates.completed_at = null
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError('Projekt nicht gefunden', 404)
    res.json({ data: enrichProject(data) })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/projects/:id/toggle-step
// ---------------------------------------------------------------------------

router.put('/:id/toggle-step', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ phase: z.enum(['admin', 'montage', 'elektro', 'abschluss']), stepIndex: z.number().min(0) })
    const result = schema.safeParse(req.body)
    if (!result.success) throw new AppError('Ungueltige Daten', 400)

    const { data: project } = await supabase.from('projects').select('progress').eq('id', req.params.id).is('deleted_at', null).single()
    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    const progress = project.progress as any
    const arr = progress[result.data.phase]
    if (!arr || result.data.stepIndex >= arr.length) throw new AppError('Ungueltiger Schritt-Index', 400)

    arr[result.data.stepIndex] = arr[result.data.stepIndex] ? 0 : 1
    const newPhase = determinePhase(progress)
    const prog = computeProgress(progress)

    const updates: Record<string, unknown> = { progress, phase: newPhase }
    if (prog.percent === 100) updates.completed_at = new Date().toISOString()
    else updates.completed_at = null

    const { data } = await supabase.from('projects').update(updates).eq('id', req.params.id).select('*, contact:contacts(*)').single()
    res.json({ data: enrichProject(data) })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:id/activities
// ---------------------------------------------------------------------------

router.post('/:id/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: project } = await supabase.from('projects').select('contact_id').eq('id', req.params.id).is('deleted_at', null).single()
    if (!project) throw new AppError('Projekt nicht gefunden', 404)

    const schema = z.object({ type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM']).default('NOTE'), text: z.string().min(1), createdBy: z.string().default('System') })
    const result = schema.safeParse(req.body)
    if (!result.success) throw new AppError('Ungueltige Daten', 400)

    const { data: activity, error } = await supabase.from('activities').insert({
      contact_id: project.contact_id,
      project_id: req.params.id,
      type: result.data.type,
      text: result.data.text,
      created_by: result.data.createdBy,
    }).select().single()

    if (error) throw new AppError(error.message, 500)
    await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id)

    res.status(201).json({ data: activity })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/projects/:id
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('deleted_at', null)

    if (error) throw new AppError('Projekt nicht gefunden', 404)
    res.json({ message: 'Projekt geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
