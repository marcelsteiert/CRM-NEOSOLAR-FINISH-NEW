import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { logAudit } from '../lib/auditService.js'

const router = Router()

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('FATAL: JWT_SECRET Umgebungsvariable muss gesetzt sein')
  return secret
}
const JWT_SECRET: string = getJwtSecret()
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn']

// Inline Auth-Check (um zirkulaere Imports zu vermeiden)
function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Nicht autorisiert – Token fehlt', 401))
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId: string; email: string; role: string }
    ;(req as any).user = decoded
    next()
  } catch {
    next(new AppError('Nicht autorisiert – Token ungueltig', 401))
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError('E-Mail und Passwort sind erforderlich', 400)
    }

    const { email, password } = parsed.data

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .single()

    if (error || !user) {
      throw new AppError('Ungueltige Anmeldedaten', 401)
    }

    if (!user.is_active) {
      throw new AppError('Konto ist deaktiviert', 403)
    }

    const validPassword = await bcrypt.compare(password, user.password || '')
    if (!validPassword) {
      throw new AppError('Ungueltige Anmeldedaten', 401)
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    )

    logAudit({ userId: user.id, action: 'LOGIN', entity: 'AUTH', description: `${user.first_name} ${user.last_name} (${user.role}) angemeldet` })

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone ?? '',
          role: user.role,
          avatar: user.avatar_color ?? null,
          isActive: user.is_active,
          allowedModules: user.allowed_modules ?? [],
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) throw new AppError('Nicht autorisiert', 401)

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .single()

    if (error || !user) throw new AppError('Benutzer nicht gefunden', 404)

    res.json({
      data: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone ?? '',
        role: user.role,
        avatar: user.avatar_color ?? null,
        isActive: user.is_active,
        allowedModules: user.allowed_modules ?? [],
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /auth/change-password
const changePwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = changePwSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten', 400)

    const userId = (req as any).user?.userId
    const { data: user } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single()

    if (!user) throw new AppError('Benutzer nicht gefunden', 404)

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password || '')
    if (!valid) throw new AppError('Aktuelles Passwort ist falsch', 401)

    const hashed = await bcrypt.hash(parsed.data.newPassword, 10)
    await supabase.from('users').update({ password: hashed }).eq('id', userId)

    res.json({ message: 'Passwort erfolgreich geaendert' })
  } catch (err) {
    next(err)
  }
})

export default router
