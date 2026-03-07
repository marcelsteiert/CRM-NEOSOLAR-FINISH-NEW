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

export default router
