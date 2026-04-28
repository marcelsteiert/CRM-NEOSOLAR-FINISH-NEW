import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'

const router = Router()

export interface BrandingSettings {
  companyName: string
  companySlogan: string
  logoUrl: string | null
  primaryColor: string
  offerTemplate: string
  footerText: string
  // Kontaktdaten – erscheinen im Kundenportal + E-Mails
  companyAddress: string
  companyZip: string
  companyCity: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  companyOpeningHours: string
}

const DEFAULT_BRANDING: BrandingSettings = {
  companyName: 'NEOSOLAR AG',
  companySlogan: 'Ihre Solarenergie-Partner',
  logoUrl: null,
  primaryColor: '#F59E0B',
  offerTemplate: 'standard',
  footerText: 'NEOSOLAR AG – Ihr Partner fuer Photovoltaik in der Schweiz',
  companyAddress: 'Industriestrasse 12',
  companyZip: '9430',
  companyCity: 'St. Margrethen',
  companyPhone: '+41 71 000 00 00',
  companyEmail: 'info@neosolar.ch',
  companyWebsite: 'www.neosolar.ch',
  companyOpeningHours: 'Mo–Fr 08:00–17:00 Uhr',
}

const SETTINGS_KEY = 'branding'

export async function loadBranding(): Promise<BrandingSettings> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (data?.value && typeof data.value === 'object') {
      return { ...DEFAULT_BRANDING, ...(data.value as Partial<BrandingSettings>) }
    }
  } catch (err) {
    console.error('[Branding] Load fehlgeschlagen:', err)
  }
  return DEFAULT_BRANDING
}

const brandingSchema = z.object({
  companyName: z.string().optional(),
  companySlogan: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  offerTemplate: z.string().optional(),
  footerText: z.string().optional(),
  companyAddress: z.string().optional(),
  companyZip: z.string().optional(),
  companyCity: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyOpeningHours: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const branding = await loadBranding()
    res.json({ data: branding })
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = brandingSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const current = await loadBranding()
    const updated: BrandingSettings = { ...current, ...parsed.data }

    const { error } = await supabase
      .from('settings')
      .upsert({ key: SETTINGS_KEY, value: updated }, { onConflict: 'key' })

    if (error) throw new AppError(`Speichern fehlgeschlagen: ${error.message}`, 500)

    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
})

export default router
