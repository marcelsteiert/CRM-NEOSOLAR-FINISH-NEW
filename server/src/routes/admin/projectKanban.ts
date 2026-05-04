import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'

const router = Router()

export interface ProjectKanbanColumn {
  phase: string  // 'admin' | 'montage' | 'elektro' | 'abschluss'
  label: string
  color: string
  description: string
  order: number
}

const defaultColumns: ProjectKanbanColumn[] = [
  { phase: 'admin', label: 'Administration', color: '#60A5FA', description: 'Vertrag, Bewilligungen, Bestellungen', order: 0 },
  { phase: 'montage', label: 'Montage', color: '#FB923C', description: 'Geruest, Module, Dacharbeiten', order: 1 },
  { phase: 'elektro', label: 'Elektriker', color: '#F59E0B', description: 'Wechselrichter, Speicher, AC', order: 2 },
  { phase: 'abschluss', label: 'Abschluss', color: '#34D399', description: 'Abnahme, Doku, Rechnung', order: 3 },
]

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'project_kanban_columns')
      .maybeSingle()

    const columns = (data?.value as ProjectKanbanColumn[] | null) ?? defaultColumns
    res.json({ data: columns })
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { columns } = req.body
    if (!Array.isArray(columns)) {
      return res.status(400).json({ error: 'columns muss ein Array sein' })
    }
    // Validiere: nur die 4 erlaubten Phase-Keys
    const allowedPhases = new Set(['admin', 'montage', 'elektro', 'abschluss'])
    for (const c of columns) {
      if (!c.phase || !allowedPhases.has(c.phase)) {
        return res.status(400).json({ error: `Unbekannte Phase: ${c.phase}` })
      }
    }

    await supabase
      .from('settings')
      .upsert({ key: 'project_kanban_columns', value: columns }, { onConflict: 'key' })

    res.json({ data: columns })
  } catch (err) {
    next(err)
  }
})

export default router
