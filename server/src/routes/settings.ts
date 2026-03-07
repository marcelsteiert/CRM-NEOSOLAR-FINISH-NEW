import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updateSettingsSchema = z.object({
  defaultFollowUpDays: z.number().min(1).max(30).optional(),
  companyAddress: z.string().min(1).optional(),
  checklistTemplate: z
    .array(z.object({ id: z.string(), label: z.string().min(1) }))
    .optional(),
  followUpRules: z
    .array(
      z.object({
        stage: z.string(),
        maxDays: z.number().min(1).max(60),
        urgentMaxDays: z.number().min(1).max(60),
        message: z.string().min(1),
      }),
    )
    .optional(),
})

// ---------------------------------------------------------------------------
// Helper – read settings from Supabase
// ---------------------------------------------------------------------------

async function loadSettings() {
  const { data } = await supabase
    .from('settings')
    .select('key, value')

  const map: Record<string, any> = {}
  for (const row of data ?? []) {
    map[row.key] = row.value
  }

  return {
    defaultFollowUpDays: map.default_follow_up_days ?? 3,
    companyAddress: map.company_address ?? 'St. Margrethen',
    checklistTemplate: map.checklist_template ?? [],
    followUpRules: map.follow_up_rules ?? [],
  }
}

// Export for other routes
export async function getSettings() {
  return loadSettings()
}

// ---------------------------------------------------------------------------
// GET /api/v1/settings
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await loadSettings()
    res.json({ data: settings })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/settings
// ---------------------------------------------------------------------------

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateSettingsSchema.safeParse(req.body)
    if (!result.success) {
      throw new AppError(
        result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        422,
      )
    }

    const u = result.data

    const upserts: { key: string; value: any }[] = []
    if (u.defaultFollowUpDays !== undefined) upserts.push({ key: 'default_follow_up_days', value: u.defaultFollowUpDays })
    if (u.companyAddress !== undefined) upserts.push({ key: 'company_address', value: u.companyAddress })
    if (u.checklistTemplate !== undefined) upserts.push({ key: 'checklist_template', value: u.checklistTemplate })
    if (u.followUpRules !== undefined) upserts.push({ key: 'follow_up_rules', value: u.followUpRules })

    if (upserts.length > 0) {
      const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' })
      if (error) throw new AppError(error.message, 500)
    }

    const settings = await loadSettings()
    res.json({ data: settings })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/settings/feature-flags
// ---------------------------------------------------------------------------

router.get('/feature-flags', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'feature_flags')
      .single()

    // Default-Flags falls noch nicht gespeichert
    const defaultFlags: Record<string, boolean> = {
      dashboard: true, leads: true, appointments: true, deals: true,
      projects: true, admin: true, provision: true, calculations: false,
      communication: false, ai: false, tasks: false,
      documents: false, notifications: true, export: false,
    }

    const flags = data?.value ? { ...defaultFlags, ...(data.value as Record<string, boolean>) } : defaultFlags
    res.json({ data: flags })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/settings/feature-flags
// ---------------------------------------------------------------------------

router.put('/feature-flags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Nur Admins duerfen Feature-Flags aendern
    const userRole = (req as any).user?.role
    if (!['ADMIN', 'GL', 'GESCHAEFTSLEITUNG'].includes(userRole)) {
      throw new AppError('Nur Admins koennen Feature-Flags aendern', 403)
    }

    const flags = req.body
    if (!flags || typeof flags !== 'object') {
      throw new AppError('Ungueltige Daten', 400)
    }

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'feature_flags', value: flags }, { onConflict: 'key' })

    if (error) throw new AppError(error.message, 500)

    res.json({ data: flags })
  } catch (err) {
    next(err)
  }
})

export default router
