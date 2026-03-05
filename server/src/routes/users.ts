import { Router } from 'express'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const router = Router()

// ── Types ──

type UserRole = 'ADMIN' | 'VERTRIEB' | 'PROJEKTLEITUNG' | 'BUCHHALTUNG' | 'GL'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  avatar: string | null
  isActive: boolean
  allowedModules: string[]
  createdAt: string
}

// ── Standard-Berechtigungen pro Rolle ──

const defaultModulesByRole: Record<UserRole, string[]> = {
  ADMIN: ['dashboard', 'leads', 'appointments', 'deals', 'provision', 'calculations', 'projects', 'tasks', 'admin', 'communication', 'documents', 'export'],
  GL: ['dashboard', 'leads', 'appointments', 'deals', 'provision', 'calculations', 'projects', 'tasks', 'admin', 'communication', 'documents', 'export'],
  VERTRIEB: ['dashboard', 'leads', 'appointments', 'deals', 'tasks', 'communication', 'documents'],
  PROJEKTLEITUNG: ['dashboard', 'projects', 'calculations', 'tasks', 'appointments', 'documents'],
  BUCHHALTUNG: ['dashboard', 'provision', 'deals', 'documents', 'export'],
}

// ── Mock Data ──

const users: User[] = [
  {
    id: 'u001', firstName: 'Marco', lastName: 'Bianchi', email: 'marco.bianchi@neosolar.ch', phone: '+41 71 555 01 01',
    role: 'VERTRIEB', avatar: null, isActive: true,
    allowedModules: [...defaultModulesByRole.VERTRIEB],
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'u002', firstName: 'Laura', lastName: 'Meier', email: 'laura.meier@neosolar.ch', phone: '+41 71 555 02 02',
    role: 'VERTRIEB', avatar: null, isActive: true,
    allowedModules: [...defaultModulesByRole.VERTRIEB],
    createdAt: '2025-02-01T10:00:00Z',
  },
  {
    id: 'u003', firstName: 'Simon', lastName: 'Keller', email: 'simon.keller@neosolar.ch', phone: '+41 71 555 03 03',
    role: 'PROJEKTLEITUNG', avatar: null, isActive: true,
    allowedModules: [...defaultModulesByRole.PROJEKTLEITUNG],
    createdAt: '2025-01-20T10:00:00Z',
  },
  {
    id: 'u004', firstName: 'Nina', lastName: 'Fischer', email: 'nina.fischer@neosolar.ch', phone: '+41 71 555 04 04',
    role: 'BUCHHALTUNG', avatar: null, isActive: true,
    allowedModules: [...defaultModulesByRole.BUCHHALTUNG],
    createdAt: '2025-03-01T10:00:00Z',
  },
  {
    id: 'u005', firstName: 'Adrian', lastName: 'Brunner', email: 'adrian.brunner@neosolar.ch', phone: '+41 71 555 05 05',
    role: 'GL', avatar: null, isActive: true,
    allowedModules: [...defaultModulesByRole.GL],
    createdAt: '2024-12-01T10:00:00Z',
  },
]

// ── Validation ──

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().default(''),
  role: z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL']),
  allowedModules: z.array(z.string()).optional(),
})

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL']).optional(),
  isActive: z.boolean().optional(),
  allowedModules: z.array(z.string()).optional(),
})

// ── Routes ──

// GET all users
router.get('/', (_req, res) => {
  res.json({ data: users })
})

// GET role defaults
router.get('/role-defaults', (_req, res) => {
  res.json({ data: defaultModulesByRole })
})

// PUT role defaults
router.put('/role-defaults', (req, res) => {
  const schema = z.record(
    z.enum(['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL']),
    z.array(z.string()),
  )
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues })

  for (const [role, modules] of Object.entries(parsed.data)) {
    defaultModulesByRole[role as UserRole] = modules
  }

  res.json({ data: defaultModulesByRole })
})

// GET single user
router.get('/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
  res.json({ data: user })
})

// CREATE user
router.post('/', (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues })

  const { firstName, lastName, email, phone, role, allowedModules } = parsed.data

  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ error: 'E-Mail-Adresse bereits vergeben' })
  }

  const user: User = {
    id: `u${String(users.length + 1).padStart(3, '0')}-${randomUUID().slice(0, 4)}`,
    firstName,
    lastName,
    email,
    phone: phone ?? '',
    role,
    avatar: null,
    isActive: true,
    allowedModules: allowedModules ?? [...defaultModulesByRole[role]],
    createdAt: new Date().toISOString(),
  }

  users.push(user)
  res.status(201).json({ data: user })
})

// UPDATE user
router.put('/:id', (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Benutzer nicht gefunden' })

  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues })

  const data = parsed.data

  // If role changes and no explicit allowedModules provided, reset to role defaults
  if (data.role && !data.allowedModules && data.role !== users[idx].role) {
    data.allowedModules = [...defaultModulesByRole[data.role]]
  }

  users[idx] = { ...users[idx], ...data }
  res.json({ data: users[idx] })
})

// DELETE user (soft)
router.delete('/:id', (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
  users[idx].isActive = false
  res.json({ message: 'Benutzer deaktiviert', data: users[idx] })
})

export default router
