import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'
import { logAudit, getAuditUserId } from '../../lib/auditService.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/admin/project-tracking
// Liste aller Projekte (nicht archiviert/geloescht) mit Construction + Calculation
// + Kontakt-Daten (Name, Adresse, Telefon, E-Mail) fuer die Excel-Anzeige
// ---------------------------------------------------------------------------
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id, name, created_at, archived_at, completed_at,
        contact_id,
        contact:contacts(first_name, last_name, company, phone, email, address)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new AppError(error.message, 500)

    const ids = (projects ?? []).map((p: any) => p.id)
    if (ids.length === 0) return res.json({ data: [] })

    const [{ data: constr }, { data: calc }] = await Promise.all([
      supabase.from('project_construction').select('*').in('project_id', ids),
      supabase.from('project_calculation').select('*').in('project_id', ids),
    ])

    const constrMap = new Map((constr ?? []).map((r: any) => [r.project_id, r]))
    const calcMap = new Map((calc ?? []).map((r: any) => [r.project_id, r]))

    const enriched = (projects ?? []).map((p: any) => ({
      ...p,
      construction: constrMap.get(p.id) ?? null,
      calculation: calcMap.get(p.id) ?? null,
    }))

    res.json({ data: enriched })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/admin/project-tracking/:projectId/construction – upsert
// ---------------------------------------------------------------------------
const constructionSchema = z.object({
  baubewilligung: z.boolean().nullable().optional(),
  baubewilligung_am: z.string().nullable().optional(),
  baubewilligung_note: z.string().nullable().optional(),
  tag_eingereicht: z.boolean().nullable().optional(),
  tag_eingereicht_am: z.string().nullable().optional(),
  tag_bewilligt: z.boolean().nullable().optional(),
  tag_bewilligt_am: z.string().nullable().optional(),
  tag_note: z.string().nullable().optional(),
  ia_eingereicht: z.boolean().nullable().optional(),
  ia_eingereicht_am: z.string().nullable().optional(),
  ia_bewilligt: z.boolean().nullable().optional(),
  ia_bewilligt_am: z.string().nullable().optional(),
  ia_note: z.string().nullable().optional(),
  dc_montage_termin: z.string().nullable().optional(),
  dc_montage_ausgefuehrt: z.boolean().nullable().optional(),
  dc_montage_am: z.string().nullable().optional(),
  ac_termin: z.string().nullable().optional(),
  ac_installiert: z.boolean().nullable().optional(),
  ac_installiert_am: z.string().nullable().optional(),
  fehlt_etwas: z.string().nullable().optional(),
  bemerkung: z.string().nullable().optional(),
}).passthrough()

router.put('/:projectId/construction', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = constructionSchema.safeParse(req.body)
    if (!result.success) {
      throw new AppError(`Validierungsfehler: ${result.error.issues.map((i) => i.path.join('.')).join('; ')}`, 422)
    }

    // Sicherstellen dass project existiert
    const { data: proj } = await supabase.from('projects').select('id').eq('id', req.params.projectId).single()
    if (!proj) throw new AppError('Projekt nicht gefunden', 404)

    const upsert = { project_id: req.params.projectId, ...result.data }
    const { data, error } = await supabase
      .from('project_construction')
      .upsert(upsert, { onConflict: 'project_id' })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    logAudit({ userId: getAuditUserId(req), action: 'UPDATE', entity: 'PROJECT', entityId: req.params.projectId, description: `Baustellen-Workflow aktualisiert` })
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/admin/project-tracking/:projectId/calculation – upsert
// ---------------------------------------------------------------------------
const calculationSchema = z.object({
  material_kranich: z.number().nullable().optional(),
  elektriker: z.number().nullable().optional(),
  montage_sergej: z.number().nullable().optional(),
  weitere_kosten: z.array(z.object({ label: z.string(), amount: z.number() })).nullable().optional(),
  vk_betrag: z.number().nullable().optional(),
  a1_anteil_prozent: z.number().nullable().optional(),
  a2_anteil_prozent: z.number().nullable().optional(),
  a3_anteil_prozent: z.number().nullable().optional(),
  a1_kassiert_am: z.string().nullable().optional(),
  a1_fakturiert_am: z.string().nullable().optional(),
  a2_kassiert_am: z.string().nullable().optional(),
  a2_fakturiert_am: z.string().nullable().optional(),
  a3_kassiert_am: z.string().nullable().optional(),
  a3_fakturiert_am: z.string().nullable().optional(),
  provision_satz_prozent: z.number().nullable().optional(),
  provision_status: z.enum(['OFFEN', 'AUSBEZAHLT', 'ZURUECKGEFORDERT']).nullable().optional(),
  provision_am: z.string().nullable().optional(),
  payment_status: z.enum(['OFFEN', 'IN_ARBEIT', 'KASSIERT', 'FAKTURIERT', 'VERLUST']).nullable().optional(),
  bemerkung: z.string().nullable().optional(),
}).passthrough()

router.put('/:projectId/calculation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = calculationSchema.safeParse(req.body)
    if (!result.success) {
      throw new AppError(`Validierungsfehler: ${result.error.issues.map((i) => i.path.join('.')).join('; ')}`, 422)
    }

    const { data: proj } = await supabase.from('projects').select('id').eq('id', req.params.projectId).single()
    if (!proj) throw new AppError('Projekt nicht gefunden', 404)

    const upsert = { project_id: req.params.projectId, ...result.data }
    const { data, error } = await supabase
      .from('project_calculation')
      .upsert(upsert, { onConflict: 'project_id' })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    logAudit({ userId: getAuditUserId(req), action: 'UPDATE', entity: 'PROJECT', entityId: req.params.projectId, description: `Baustellen-Kalkulation aktualisiert` })
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

export default router
