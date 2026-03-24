import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { logAudit, getAuditUserId } from '../lib/auditService.js'

const router = Router()

// ── Standard-Berechtigungen pro Rolle ──

type UserRole = 'ADMIN' | 'VERTRIEB' | 'PROJEKTLEITUNG' | 'BUCHHALTUNG' | 'GL' | 'SUBUNTERNEHMEN' | 'CLOSER' | 'SETTER'

const defaultModulesByRole: Record<UserRole, string[]> = {
  ADMIN: ['dashboard', 'leads', 'appointments', 'deals', 'provision', 'calculations', 'calendar', 'projects', 'tasks', 'admin', 'communication', 'documents', 'passwords', 'export', 'canViewAllLeads', 'canViewAllAppointments', 'canViewAllDeals', 'canViewAllProjects', 'canViewAllTasks'],
  GL: ['dashboard', 'leads', 'appointments', 'deals', 'provision', 'calculations', 'calendar', 'projects', 'tasks', 'admin', 'communication', 'documents', 'passwords', 'export', 'canViewAllLeads', 'canViewAllAppointments', 'canViewAllDeals', 'canViewAllProjects', 'canViewAllTasks'],
  VERTRIEB: ['dashboard', 'leads', 'appointments', 'deals', 'tasks', 'communication', 'documents', 'passwords', 'canViewAllLeads', 'canViewAllAppointments', 'canViewAllDeals', 'canViewAllTasks'],
  PROJEKTLEITUNG: ['dashboard', 'projects', 'calculations', 'calendar', 'tasks', 'appointments', 'communication', 'documents', 'passwords', 'canViewAllProjects', 'canViewAllTasks', 'canViewAllAppointments'],
  BUCHHALTUNG: ['dashboard', 'provision', 'deals', 'documents', 'passwords', 'export'],
  SUBUNTERNEHMEN: ['dashboard', 'projects', 'calendar', 'tasks', 'documents', 'passwords'],
  CLOSER: ['dashboard', 'leads', 'appointments', 'documents', 'passwords'],
  SETTER: ['dashboard', 'leads', 'appointments', 'documents', 'passwords'],
}

// ── Validation ──

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  phone: z.string().default(''),
  role: z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN', 'CLOSER', 'SETTER']),
  allowedModules: z.array(z.string()).optional(),
})

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN', 'CLOSER', 'SETTER']).optional(),
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
        z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN', 'CLOSER', 'SETTER']),
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

    logAudit({ userId: getAuditUserId(req), action: 'CREATE', entity: 'USER', entityId: data?.id, description: `Benutzer "${firstName} ${lastName}" (${role}) erstellt` })
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

    // Duplikat-Check: Pruefen ob E-Mail bereits von anderem User verwendet wird
    if (d.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', d.email)
        .neq('id', req.params.id)
        .limit(1)
      if (existing && existing.length > 0) {
        throw new AppError('E-Mail-Adresse bereits vergeben', 409)
      }
    }

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

    if (error) {
      if (error.code === '23505') throw new AppError('E-Mail-Adresse bereits vergeben', 409)
      throw new AppError('Benutzer nicht gefunden', 404)
    }

    logAudit({ userId: getAuditUserId(req), action: 'UPDATE', entity: 'USER', entityId: req.params.id, description: `Benutzer "${data.first_name} ${data.last_name}" aktualisiert` })
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

// DELETE user (hard – endgueltig loeschen inkl. aller Referenzen)
// WICHTIG: Muss VOR /:id stehen (Express Route-Order)
router.delete('/:id/hard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Pruefen ob der anfragende User Admin ist
    const reqRole = (req as any).user?.role
    if (reqRole !== 'ADMIN' && reqRole !== 'GL') {
      throw new AppError('Nur Admins koennen Benutzer endgueltig loeschen', 403)
    }

    // User laden fuer Audit-Log
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('id', req.params.id)
      .single()

    if (fetchErr || !user) throw new AppError('Benutzer nicht gefunden', 404)

    // Selbstloeschung verhindern
    if (user.id === (req as any).user?.userId) {
      throw new AppError('Sie koennen sich nicht selbst loeschen', 400)
    }

    // Alle FK-Referenzen nullen bzw. loeschen
    const uid = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    await Promise.all([
      // NOT NULL Spalten → DELETE (kann nicht null setzen)
      supabase.from('activities').delete().eq('created_by', uid),
      supabase.from('documents').delete().eq('uploaded_by', uid),
      supabase.from('reminders').delete().eq('created_by', uid),
      supabase.from('notifications').delete().eq('user_id', uid),
      // Nullable Spalten → UPDATE null
      supabase.from('tasks').update({ assigned_to: null }).eq('assigned_to', uid),
      supabase.from('tasks').update({ assigned_by: null }).eq('assigned_by', uid),
      supabase.from('audit_logs').update({ user_id: null }).eq('user_id', uid),
      supabase.from('appointments').update({ assigned_to: null }).eq('assigned_to', uid),
      supabase.from('calendar_events').update({ created_by: null }).eq('created_by', uid),
      supabase.from('calendar_events').update({ assigned_to: null }).eq('assigned_to', uid),
      supabase.from('deals').update({ assigned_to: null }).eq('assigned_to', uid),
      supabase.from('leads').update({ assigned_to: null }).eq('assigned_to', uid),
      supabase.from('projects').update({ project_manager_id: null }).eq('project_manager_id', uid),
    ])

    // User endgueltig loeschen
    const { error: delErr } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)

    if (delErr) throw new AppError(`Loeschen fehlgeschlagen: ${delErr.message}`, 500)

    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'USER', entityId: req.params.id, description: `Benutzer "${user.first_name} ${user.last_name}" (${user.email}) endgueltig geloescht` })

    res.json({
      message: 'Benutzer endgueltig geloescht',
      data: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
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
    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'USER', entityId: req.params.id, description: `Benutzer "${data.first_name} ${data.last_name}" deaktiviert` })

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
