import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'

const router = Router()

export interface NoShowKanbanColumn {
  key: string
  label: string
  color: string
  order: number
}

const defaultColumns: NoShowKanbanColumn[] = [
  { key: 'NEW', label: 'Neu No-Show', color: '#F87171', order: 0 },
  { key: 'CALL_1', label: '1. Rückruf versucht', color: '#FB923C', order: 1 },
  { key: 'CALL_2', label: '2. Rückruf versucht', color: '#F59E0B', order: 2 },
  { key: 'REACHED', label: 'Erreicht – neuer Termin', color: '#34D399', order: 3 },
]

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'noShowKanbanColumns')
      .single()

    const columns = (data?.value as NoShowKanbanColumn[] | null) ?? defaultColumns
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

    await supabase
      .from('settings')
      .upsert({ key: 'noShowKanbanColumns', value: columns }, { onConflict: 'key' })

    res.json({ data: columns })
  } catch (err) {
    next(err)
  }
})

export default router
