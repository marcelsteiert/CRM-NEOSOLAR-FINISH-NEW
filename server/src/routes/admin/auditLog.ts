import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, action, from, to, page = '1', pageSize = '20' } = req.query

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (userId && typeof userId === 'string') query = query.eq('user_id', userId)
    if (action && typeof action === 'string') query = query.eq('action', action)
    if (from && typeof from === 'string') query = query.gte('created_at', from)
    if (to && typeof to === 'string') query = query.lte('created_at', to)

    const p = Math.max(1, Number(page))
    const ps = Math.min(100, Math.max(1, Number(pageSize)))
    const start = (p - 1) * ps
    query = query.range(start, start + ps - 1)

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [], total: count ?? 0, page: p, pageSize: ps })
  } catch (err) {
    next(err)
  }
})

export default router
