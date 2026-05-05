import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { isAdminRole } from '../middleware/auth.js'
import { logAudit, getAuditUserId } from '../lib/auditService.js'

const router = Router()

// ---------------------------------------------------------------------------
// Berechtigungs-Guard: nur ADMIN/GL oder User mit allowedModules.personal
// ---------------------------------------------------------------------------
function requirePersonalAccess(req: Request, _res: Response, next: NextFunction): void {
  const u = req.user
  if (!u) return next(new AppError('Nicht autorisiert', 401))
  if (isAdminRole(u.role)) return next()
  if (u.allowedModules?.includes('personal')) return next()
  return next(new AppError('Zugriff verweigert – Personal-Modul nicht freigeschaltet', 403))
}

router.use(requirePersonalAccess)

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  ahvNumber: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  startDate: z.string().min(1, 'Eintrittsdatum ist erforderlich'),
  endDate: z.string().nullable().optional(),
  contractType: z.enum(['VOLLZEIT', 'TEILZEIT', 'LEHRLING', 'SUBUNTERNEHMER', 'PRAKTIKUM']).nullable().optional(),
  workloadPct: z.number().int().min(0).max(100).nullable().optional(),
  vacationDaysPerYear: z.number().int().min(0).max(365).nullable().optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  salaryChf: z.number().nullable().optional(),
  salaryType: z.enum(['MONTH', 'HOUR', 'YEAR']).nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
})

const updateSchema = createSchema.partial()

// ---------------------------------------------------------------------------
// camelCase ↔ snake_case Mapping
// ---------------------------------------------------------------------------
const FIELD_MAP: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone: 'phone',
  mobile: 'mobile',
  birthDate: 'birth_date',
  nationality: 'nationality',
  ahvNumber: 'ahv_number',
  street: 'street',
  zip: 'zip',
  city: 'city',
  country: 'country',
  startDate: 'start_date',
  endDate: 'end_date',
  contractType: 'contract_type',
  workloadPct: 'workload_pct',
  vacationDaysPerYear: 'vacation_days_per_year',
  position: 'position',
  department: 'department',
  iban: 'iban',
  bankName: 'bank_name',
  salaryChf: 'salary_chf',
  salaryType: 'salary_type',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactPhone: 'emergency_contact_phone',
  notes: 'notes',
  photoUrl: 'photo_url',
  userId: 'user_id',
}

function toSnake(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    const snake = FIELD_MAP[k] ?? k
    out[snake] = v
  }
  return out
}

// ---------------------------------------------------------------------------
// GET /api/v1/personnel
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, includeArchived, contractType, department } = req.query

    let query = supabase.from('personnel').select('*', { count: 'exact' })

    if (includeArchived !== 'true') {
      query = query.is('archived_at', null)
    }
    if (typeof search === 'string' && search.trim()) {
      const s = search.trim()
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,position.ilike.%${s}%,department.ilike.%${s}%`)
    }
    if (typeof contractType === 'string') query = query.eq('contract_type', contractType)
    if (typeof department === 'string') query = query.eq('department', department)

    query = query.order('last_name', { ascending: true })

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/personnel/stats
// ---------------------------------------------------------------------------
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase.from('personnel').select('*').is('archived_at', null)
    const items = data ?? []
    const total = items.length
    const fullTime = items.filter((p: any) => p.contract_type === 'VOLLZEIT').length
    const partTime = items.filter((p: any) => p.contract_type === 'TEILZEIT').length
    const apprentice = items.filter((p: any) => p.contract_type === 'LEHRLING').length
    const sub = items.filter((p: any) => p.contract_type === 'SUBUNTERNEHMER').length
    const fteSum = items.reduce((acc: number, p: any) => acc + ((p.workload_pct ?? 100) / 100), 0)

    res.json({
      data: {
        total,
        fullTime,
        partTime,
        apprentice,
        sub,
        fteSum: Math.round(fteSum * 10) / 10,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/personnel/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !data) throw new AppError('Mitarbeiter nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/personnel
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const insert = toSnake(result.data as Record<string, unknown>)
    insert.created_by = req.user?.userId ?? null

    const { data, error } = await supabase
      .from('personnel')
      .insert(insert)
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)

    logAudit({ userId: getAuditUserId(req), action: 'CREATE', entity: 'PERSONNEL', entityId: data?.id, description: `Mitarbeiter "${result.data.firstName} ${result.data.lastName}" angelegt` })
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/personnel/:id
// ---------------------------------------------------------------------------
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates = toSnake(result.data as Record<string, unknown>)

    const { data, error } = await supabase
      .from('personnel')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error || !data) throw new AppError('Mitarbeiter nicht gefunden', 404)

    logAudit({ userId: getAuditUserId(req), action: 'UPDATE', entity: 'PERSONNEL', entityId: req.params.id, description: `Mitarbeiter aktualisiert` })
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/personnel/:id/archive – Soft Archive
// ---------------------------------------------------------------------------
router.put('/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('personnel')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error || !data) throw new AppError('Mitarbeiter nicht gefunden', 404)
    logAudit({ userId: getAuditUserId(req), action: 'ARCHIVE', entity: 'PERSONNEL', entityId: req.params.id, description: `Mitarbeiter archiviert` })
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/personnel/:id/restore – Aus Archiv zurueckholen
// ---------------------------------------------------------------------------
router.put('/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('personnel')
      .update({ archived_at: null })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error || !data) throw new AppError('Mitarbeiter nicht gefunden', 404)
    logAudit({ userId: getAuditUserId(req), action: 'RESTORE', entity: 'PERSONNEL', entityId: req.params.id, description: `Mitarbeiter aus Archiv geholt` })
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/personnel/:id – Hard delete (nur ADMIN)
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isAdminRole(req.user?.role ?? '')) {
      throw new AppError('Nur Admin darf Mitarbeiter loeschen', 403)
    }
    const { error } = await supabase
      .from('personnel')
      .delete()
      .eq('id', req.params.id)

    if (error) throw new AppError(error.message, 500)
    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'PERSONNEL', entityId: req.params.id, description: `Mitarbeiter geloescht` })
    res.json({ message: 'Mitarbeiter geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
