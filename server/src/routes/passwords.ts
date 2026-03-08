import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ── Validation ──

const createSchema = z.object({
  title: z.string().min(1),
  username: z.string().default(''),
  password: z.string().min(1),
  url: z.string().default(''),
  notes: z.string().default(''),
  category: z.string().default('Allgemein'),
  isShared: z.boolean().default(false),
  allowedRoles: z.array(z.string()).default([]),
})

const updateSchema = createSchema.partial()

// ── Helper: User-ID + Role aus JWT ──

function getUser(req: Request): { userId: string; role: string } {
  const u = (req as any).user
  if (!u?.userId) throw new AppError('Nicht authentifiziert', 401)
  return { userId: u.userId, role: u.role ?? '' }
}

// ── GET /api/v1/passwords – Persoenliche Passwoerter des Users ──

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)

    const { data, error } = await supabase
      .from('user_passwords')
      .select('*')
      .eq('user_id', userId)
      .eq('is_shared', false)
      .order('category', { ascending: true })
      .order('title', { ascending: true })

    if (error) throw new AppError(error.message, 500)
    res.json({ data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/passwords/shared – Geteilte Passwoerter (Dashboard) ──

router.get('/shared', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = getUser(req)

    const { data, error } = await supabase
      .from('user_passwords')
      .select('*')
      .eq('is_shared', true)
      .order('category', { ascending: true })
      .order('title', { ascending: true })

    if (error) throw new AppError(error.message, 500)

    // Filtern: Admin/GL sehen alles, andere nur wenn Rolle erlaubt oder allowedRoles leer
    const isAdminOrGl = role === 'ADMIN' || role === 'GL'
    const filtered = (data ?? []).filter((entry: any) => {
      if (isAdminOrGl) return true
      const roles = entry.allowed_roles ?? []
      return roles.length === 0 || roles.includes(role)
    })

    res.json({ data: filtered })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/passwords ──

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = getUser(req)
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Ungueltige Daten', details: parsed.error.issues })

    // Nur Admins duerfen geteilte Passwoerter erstellen
    if (parsed.data.isShared && role !== 'ADMIN' && role !== 'GL') {
      throw new AppError('Keine Berechtigung fuer geteilte Passwoerter', 403)
    }

    const { data, error } = await supabase
      .from('user_passwords')
      .insert({
        user_id: parsed.data.isShared ? null : userId,
        title: parsed.data.title,
        username: parsed.data.username,
        password: parsed.data.password,
        url: parsed.data.url,
        notes: parsed.data.notes,
        category: parsed.data.category,
        is_shared: parsed.data.isShared,
        allowed_roles: parsed.data.allowedRoles,
      })
      .select()
      .single()

    if (error) throw new AppError(error.message, 500)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/v1/passwords/:id ──

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = getUser(req)
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Ungueltige Daten', details: parsed.error.issues })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.title !== undefined) updates.title = parsed.data.title
    if (parsed.data.username !== undefined) updates.username = parsed.data.username
    if (parsed.data.password !== undefined) updates.password = parsed.data.password
    if (parsed.data.url !== undefined) updates.url = parsed.data.url
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes
    if (parsed.data.category !== undefined) updates.category = parsed.data.category
    if (parsed.data.allowedRoles !== undefined) updates.allowed_roles = parsed.data.allowedRoles

    // Persoenlich: nur eigener User. Geteilt: nur Admin/GL
    let query = supabase.from('user_passwords').update(updates).eq('id', req.params.id)

    const isAdminOrGl = role === 'ADMIN' || role === 'GL'
    if (!isAdminOrGl) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.select().single()
    if (error) throw new AppError('Eintrag nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/passwords/:id ──

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = getUser(req)
    const isAdminOrGl = role === 'ADMIN' || role === 'GL'

    let query = supabase.from('user_passwords').delete().eq('id', req.params.id)
    if (!isAdminOrGl) {
      query = query.eq('user_id', userId)
    }

    const { error } = await query
    if (error) throw new AppError('Eintrag nicht gefunden', 404)
    res.json({ message: 'Geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
