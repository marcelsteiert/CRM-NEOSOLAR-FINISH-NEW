import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'

const router = Router()

const SETTINGS_KEY = 'calculator_pricing'

/**
 * Preise und Annahmen fuer den Verkaufsrechner.
 *
 * Die Defaults spiegeln 14 echte NEOSOLAR-Kalkulationen (Stand 07/2026):
 * Ø VK 32'830 · Ø Material 11'192 · Ø Elektriker 3'250 · Ø Montage 6'313.
 * Strompreis: ElCom-Median H4 2026 (27.7 Rp.). Foerderung: Pronovo EIV 2026.
 * Alle Werte sind im Admin unter "Rechner-Preise" aenderbar.
 */
const DEFAULT_PRICING = {
  // Technik
  spezifischerErtragBasis: 1000,
  ausrichtungsFaktor: {
    SUED: 1.0,
    SUEDOST: 0.95,
    SUEDWEST: 0.95,
    OST: 0.85,
    WEST: 0.85,
    OST_WEST: 0.88,
  },
  degradationProJahr: 0.005,
  einspeiseverguetungRp: 8,
  strompreisSteigerung: 0.02,
  speicherZyklenProJahr: 280,
  speicherWirkungsgrad: 0.9,
  maxAutarkiegrad: 0.8,
  betriebskostenProJahr: 250,
  mehrverbrauchWaermepumpe: 4500,
  mehrverbrauchEAuto: 3000,

  // Foerderung
  eivGrundbeitrag: 200,
  eivLeistungBis30: 360,
  eivLeistungAb30: 300,

  // Preise
  grundpreis: 3500,
  preisProKwpStaffel: [
    { bisKwp: 10, chfProKwp: 1550 },
    { bisKwp: 20, chfProKwp: 1350 },
    { bisKwp: 30, chfProKwp: 1150 },
    { bisKwp: 100, chfProKwp: 1000 },
  ],
  speicherPreisProKwh: 700,
  wallboxPreis: 2400,
  geruestPreis: 2000,
  dachtypZuschlagProKwp: {
    ZIEGEL: 0,
    BLECH: -50,
    FLACHDACH: 120,
    EERNIT: 80,
  },
  steuerabzugProzent: 0,
  betrachtungsJahre: 25,
  kalkulationszinssatz: 0.02,
}

export type CalculatorPricing = typeof DEFAULT_PRICING

export async function loadPricing(): Promise<CalculatorPricing> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (data?.value && typeof data.value === 'object') {
      // Flach mergen reicht: fehlende Felder kommen aus den Defaults
      return { ...DEFAULT_PRICING, ...(data.value as Partial<CalculatorPricing>) }
    }
  } catch (err) {
    console.error('[Rechner-Preise] Laden fehlgeschlagen:', err)
  }
  return DEFAULT_PRICING
}

const staffelSchema = z.object({
  bisKwp: z.number().positive(),
  chfProKwp: z.number().min(0),
})

const pricingSchema = z.object({
  spezifischerErtragBasis: z.number().min(500).max(1600).nullable().optional(),
  ausrichtungsFaktor: z.record(z.string(), z.number().min(0.3).max(1.2)).nullable().optional(),
  degradationProJahr: z.number().min(0).max(0.05).nullable().optional(),
  einspeiseverguetungRp: z.number().min(0).max(50).nullable().optional(),
  strompreisSteigerung: z.number().min(-0.05).max(0.15).nullable().optional(),
  speicherZyklenProJahr: z.number().min(0).max(400).nullable().optional(),
  speicherWirkungsgrad: z.number().min(0.5).max(1).nullable().optional(),
  maxAutarkiegrad: z.number().min(0.3).max(1).nullable().optional(),
  betriebskostenProJahr: z.number().min(0).max(5000).nullable().optional(),
  mehrverbrauchWaermepumpe: z.number().min(0).max(30000).nullable().optional(),
  mehrverbrauchEAuto: z.number().min(0).max(30000).nullable().optional(),
  eivGrundbeitrag: z.number().min(0).max(5000).nullable().optional(),
  eivLeistungBis30: z.number().min(0).max(2000).nullable().optional(),
  eivLeistungAb30: z.number().min(0).max(2000).nullable().optional(),
  grundpreis: z.number().min(0).max(50000).nullable().optional(),
  preisProKwpStaffel: z.array(staffelSchema).min(1).nullable().optional(),
  speicherPreisProKwh: z.number().min(0).max(5000).nullable().optional(),
  wallboxPreis: z.number().min(0).max(20000).nullable().optional(),
  geruestPreis: z.number().min(0).max(20000).nullable().optional(),
  dachtypZuschlagProKwp: z.record(z.string(), z.number().min(-500).max(1000)).nullable().optional(),
  steuerabzugProzent: z.number().min(0).max(50).nullable().optional(),
  betrachtungsJahre: z.number().min(5).max(40).nullable().optional(),
  kalkulationszinssatz: z.number().min(0).max(0.2).nullable().optional(),
})

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: await loadPricing() })
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = pricingSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(`Ungueltige Werte: ${parsed.error.issues[0]?.message ?? ''}`, 400)
    }

    // null-Werte aus dem Formular nicht speichern, sonst gehen Defaults verloren
    const eingaben = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== null && v !== undefined)
    )

    const aktuell = await loadPricing()
    const neu = { ...aktuell, ...eingaben }

    // Staffel muss aufsteigend sein, sonst rechnet die Engine falsch
    if (Array.isArray(neu.preisProKwpStaffel)) {
      const grenzen = neu.preisProKwpStaffel.map((s) => s.bisKwp)
      const sortiert = [...grenzen].sort((a, b) => a - b)
      if (grenzen.join() !== sortiert.join()) {
        throw new AppError('Die kWp-Staffel muss aufsteigend sortiert sein', 400)
      }
    }

    const { error } = await supabase
      .from('settings')
      .upsert({ key: SETTINGS_KEY, value: neu }, { onConflict: 'key' })

    if (error) throw new AppError(`Speichern fehlgeschlagen: ${error.message}`, 500)

    res.json({ data: neu })
  } catch (err) {
    next(err)
  }
})

/** Setzt alle Werte auf die dokumentierten Defaults zurueck. */
router.post('/reset', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: SETTINGS_KEY, value: DEFAULT_PRICING }, { onConflict: 'key' })
    if (error) throw new AppError(`Zuruecksetzen fehlgeschlagen: ${error.message}`, 500)
    res.json({ data: DEFAULT_PRICING })
  } catch (err) {
    next(err)
  }
})

export default router
