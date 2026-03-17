import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'

const router = Router()

export interface DealKanbanColumn {
  stage: string
  label: string
  color: string
  order: number
}

const defaultColumns: DealKanbanColumn[] = [
  { stage: 'ERSTELLT', label: 'Angebot erstellen', color: '#60A5FA', order: 0 },
  { stage: 'GESENDET', label: 'Angebot gesendet', color: '#A78BFA', order: 1 },
  { stage: 'FOLLOW_UP', label: 'Warten auf Unterlagen', color: '#F59E0B', order: 2 },
  { stage: 'VERHANDLUNG', label: 'Verhandlung', color: '#FB923C', order: 3 },
]

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'deal_kanban_columns')
      .single()

    const columns = (data?.value as DealKanbanColumn[] | null) ?? defaultColumns
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
      .upsert({ key: 'deal_kanban_columns', value: columns }, { onConflict: 'key' })

    res.json({ data: columns })
  } catch (err) {
    next(err)
  }
})

export default router
