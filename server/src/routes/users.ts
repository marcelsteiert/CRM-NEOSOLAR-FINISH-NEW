import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ── Standard-Berechtigungen pro Rolle ──

type UserRole = 'ADMIN' | 'VERTRIEB' | 'PROJEKTLEITUNG' | 'BUCHHALTUNG' | 'GL' | 'SUBUNTERNEHMEN'

const defaultModulesByRole: Record<UserRole, string[]> = {
  ADMIN: ['dashboard', 'leads', 'appointments', 'deals', 'provision', 'calculations', 'projects', 'tasks', 'admin', 'communication', 'documents', 'passwords', 'export'],
  GL: ['dashboard', 'leads', 'appointments', 'deals', 'provision', 'calculations', 'projects', 'tasks', 'admin', 'communication', 'documents', 'passwords', 'export'],
  VERTRIEB: ['dashboard', 'leads', 'appointments', 'deals', 'tasks', 'communication', 'documents', 'passwords'],
  PROJEKTLEITUNG: ['dashboard', 'projects', 'calculations', 'tasks', 'appointments', 'communication', 'documents', 'passwords'],
  BUCHHALTUNG: ['dashboard', 'provision', 'deals', 'documents', 'passwords', 'export'],
  SUBUNTERNEHMEN: ['dashboard', 'projects', 'tasks', 'documents', 'passwords'],
}

// ── Validation ──

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  phone: z.string().default(''),
  role: z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN']),
  allowedModules: z.array(z.string()).optional(),
})

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN']).optional(),
  isActive: z.boolean().optional(),
  allowedModules: z.array(z.string()).optional(),
})

// ── Routes ──

// GET all users
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) throw new AppError(error.message, 500)

    const mapped = (data ?? []).map((u: any) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone ?? '',
      role: u.role,
      avatar: u.avatar_color ?? null,
      isActive: u.is_active,
      allowedModules: u.allowed_modules ?? defaultModulesByRole[u.role as UserRole] ?? [],
      createdAt: u.created_at,
    }))

    res.json({ data: mapped })
  } catch (err) {
    next(err)
  }
})

// GET role defaults
router.get('/role-defaults', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Aus Supabase settings laden, Fallback auf In-Memory Defaults
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'role_defaults')
      .single()

    if (data?.value && typeof data.value === 'object') {
      // In-Memory synchronisieren
      for (const [role, modules] of Object.entries(data.value as Record<string, string[]>)) {
        if (role in defaultModulesByRole) {
          defaultModulesByRole[role as UserRole] = modules
        }
      }
    }

    res.json({ data: defaultModulesByRole })
  } catch (err) {
    next(err)
  }
})

// PUT role defaults – persistiert in Supabase + optional auf bestehende User anwenden
router.put('/role-defaults', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      defaults: z.record(
        z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN']),
        z.array(z.string()),
      ),
      applyToUsers: z.boolean().optional(),
    })

    // Abwaertskompatibel: altes Format (direkt Record) oder neues { defaults, applyToUsers }
    const body = req.body
    const isNewFormat = body && typeof body === 'object' && 'defaults' in body
    const parsed = isNewFormat
      ? schema.safeParse(body)
      : schema.safeParse({ defaults: body })

    if (!parsed.success) return res.status(400).json({ error: 'Ungueltige Daten', details: parsed.error.issues })

    const { defaults, applyToUsers } = parsed.data

    // In-Memory aktualisieren
    for (const [role, modules] of Object.entries(defaults)) {
      defaultModulesByRole[role as UserRole] = modules
    }

    // In Supabase persistieren
    await supabase
      .from('settings')
      .upsert({ key: 'role_defaults', value: defaultModulesByRole }, { onConflict: 'key' })

    // Optional: Berechtigungen auf alle User der jeweiligen Rollen anwenden
    let updatedUsers = 0
    if (applyToUsers) {
      for (const [role, modules] of Object.entries(defaults)) {
        const { data: usersOfRole } = await supabase
          .from('users')
          .select('id')
          .eq('role', role)
          .eq('is_active', true)

        if (usersOfRole && usersOfRole.length > 0) {
          const ids = usersOfRole.map((u: any) => u.id)
          const { count } = await supabase
            .from('users')
            .update({ allowed_modules: modules })
            .in('id', ids)

          updatedUsers += count ?? usersOfRole.length
        }
      }
    }

    res.json({ data: defaultModulesByRole, updatedUsers })
  } catch (err) {
    next(err)
  }
})

// GET single user
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !data) throw new AppError('Benutzer nicht gefunden', 404)

    res.json({
      data: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone ?? '',
        role: data.role,
        avatar: data.avatar_color ?? null,
        isActive: data.is_active,
        allowedModules: data.allowed_modules ?? defaultModulesByRole[data.role as UserRole] ?? [],
        createdAt: data.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
})

// CREATE user
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Ungueltige Daten', details: parsed.error.issues })

    const { firstName, lastName, email, password, phone, role, allowedModules } = parsed.data

    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash('Neosolar2026!', 10)

    const { data, error } = await supabase
      .from('users')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        password: hashedPassword,
        phone: phone ?? '',
        role,
        is_active: true,
        allowed_modules: allowedModules ?? defaultModulesByRole[role],
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new AppError('E-Mail-Adresse bereits vergeben', 409)
      throw new AppError(error.message, 500)
    }

    res.status(201).json({
      data: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone ?? '',
        role: data.role,
        avatar: data.avatar_color ?? null,
        isActive: data.is_active,
        allowedModules: data.allowed_modules ?? [],
        createdAt: data.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
})

// UPDATE user
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Ungueltige Daten', details: parsed.error.issues })

    const d = parsed.data
    const updates: Record<string, unknown> = {}

    if (d.firstName !== undefined) updates.first_name = d.firstName
    if (d.lastName !== undefined) updates.last_name = d.lastName
    if (d.email !== undefined) updates.email = d.email
    if (d.phone !== undefined) updates.phone = d.phone
    if (d.isActive !== undefined) updates.is_active = d.isActive
    if (d.allowedModules !== undefined) updates.allowed_modules = d.allowedModules

    if (d.role !== undefined) {
      updates.role = d.role
      // If role changes and no explicit allowedModules provided, reset to role defaults
      if (!d.allowedModules) {
        updates.allowed_modules = defaultModulesByRole[d.role]
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw new AppError('Benutzer nicht gefunden', 404)

    res.json({
      data: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone ?? '',
        role: data.role,
        avatar: data.avatar_color ?? null,
        isActive: data.is_active,
        allowedModules: data.allowed_modules ?? [],
        createdAt: data.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE user (soft – deactivate)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw new AppError('Benutzer nicht gefunden', 404)

    res.json({
      message: 'Benutzer deaktiviert',
      data: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        role: data.role,
        isActive: data.is_active,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
