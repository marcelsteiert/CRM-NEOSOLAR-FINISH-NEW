import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'

const router = Router()

interface LeadSource {
  id: string
  name: string
  color: string
}

const defaultSources: LeadSource[] = [
  { id: 'HOMEPAGE', name: 'Homepage', color: '#60A5FA' },
  { id: 'LANDINGPAGE', name: 'Landingpage', color: '#A78BFA' },
  { id: 'MESSE', name: 'Messe', color: '#F59E0B' },
  { id: 'EMPFEHLUNG', name: 'Empfehlung', color: '#34D399' },
  { id: 'KALTAKQUISE', name: 'Kaltakquise', color: '#FB923C' },
  { id: 'SONSTIGE', name: 'Sonstige', color: '#94A3B8' },
]

// GET – alle Quellen laden
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'lead_sources')
      .single()

    const sources = (data?.value as LeadSource[] | null) ?? defaultSources
    res.json({ data: sources })
  } catch (err) {
    next(err)
  }
})

// PUT – Quellen speichern (komplettes Array)
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sources } = req.body
    if (!Array.isArray(sources)) {
      return res.status(400).json({ error: 'sources muss ein Array sein' })
    }

    await supabase
      .from('settings')
      .upsert({ key: 'lead_sources', value: sources }, { onConflict: 'key' })

    res.json({ data: sources })
  } catch (err) {
    next(err)
  }
})

export default router
