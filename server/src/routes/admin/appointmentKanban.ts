import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'

const router = Router()

export interface KanbanColumn {
  status: string
  label: string
  color: string
  order: number
}

const defaultColumns: KanbanColumn[] = [
  { status: 'GEPLANT', label: 'Geplant', color: '#60A5FA', order: 0 },
  { status: 'BESTAETIGT', label: 'Bestätigt', color: '#34D399', order: 1 },
  { status: 'VORBEREITUNG', label: 'In Vorbereitung', color: '#F59E0B', order: 2 },
]

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'appointment_kanban_columns')
      .single()

    const columns = (data?.value as KanbanColumn[] | null) ?? defaultColumns
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
      .upsert({ key: 'appointment_kanban_columns', value: columns }, { onConflict: 'key' })

    res.json({ data: columns })
  } catch (err) {
    next(err)
  }
})

export default router
