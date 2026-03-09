import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ── GET /api/v1/notifications ──

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('Nicht authentifiziert', 401)

    const { type, read: readFilter, limit: limitStr, offset: offsetStr } = req.query

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (type && typeof type === 'string') query = query.eq('type', type)
    if (readFilter === 'true') query = query.eq('read', true)
    if (readFilter === 'false') query = query.eq('read', false)

    const limit = Math.min(parseInt(limitStr as string) || 50, 100)
    const offset = parseInt(offsetStr as string) || 0
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/notifications/unread-count ──

router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('Nicht authentifiziert', 401)

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .is('deleted_at', null)

    if (error) throw new AppError(error.message, 500)
    res.json({ data: { count: count ?? 0 } })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/v1/notifications/:id/read ──

router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('Nicht authentifiziert', 401)

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', req.params.id as string)
      .eq('user_id', userId)

    if (error) throw new AppError(error.message, 500)
    res.json({ message: 'Gelesen' })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/v1/notifications/mark-all-read ──

router.put('/mark-all-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('Nicht authentifiziert', 401)

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)
      .is('deleted_at', null)

    if (error) throw new AppError(error.message, 500)
    res.json({ message: 'Alle als gelesen markiert' })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/notifications/clear-read ──

router.delete('/clear-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('Nicht authentifiziert', 401)

    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', true)
      .is('deleted_at', null)

    if (error) throw new AppError(error.message, 500)
    res.json({ message: 'Gelesene Meldungen gelöscht' })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/notifications/:id ──

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId
    if (!userId) throw new AppError('Nicht authentifiziert', 401)

    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id as string)
      .eq('user_id', userId)

    if (error) throw new AppError(error.message, 500)
    res.json({ message: 'Meldung gelöscht' })
  } catch (err) {
    next(err)
  }
})

export default router
