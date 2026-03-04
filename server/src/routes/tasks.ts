import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = 'OFFEN' | 'IN_BEARBEITUNG' | 'ERLEDIGT';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TaskModule = 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT' | 'ALLGEMEIN';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  module: TaskModule;
  referenceId: string | null; // ID of related lead/appointment/deal/project
  referenceTitle: string | null; // Display title of related entity
  assignedTo: string;
  assignedBy: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createTaskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  module: z.enum(['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT', 'ALLGEMEIN']).optional().default('ALLGEMEIN'),
  referenceId: z.string().optional(),
  referenceTitle: z.string().optional(),
  assignedTo: z.string().min(1, 'Zugewiesener Benutzer ist erforderlich'),
  assignedBy: z.string().optional().default('u001'),
  dueDate: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

// ---------------------------------------------------------------------------
// UUID helper
// ---------------------------------------------------------------------------

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockTasks: Task[] = [
  {
    id: uuid(),
    title: 'Rueckruf Hr. Mueller – Offerte besprechen',
    description: 'Deal CHF 89K, Entscheidung diese Woche.',
    status: 'OFFEN',
    priority: 'HIGH',
    module: 'ANGEBOT',
    referenceId: null,
    referenceTitle: 'Offerte 15kWp EFH Mueller',
    assignedTo: 'u001',
    assignedBy: 'u001',
    dueDate: '2026-03-03',
    completedAt: null,
    createdAt: '2026-03-02T08:00:00.000Z',
    updatedAt: '2026-03-02T08:00:00.000Z',
  },
  {
    id: uuid(),
    title: 'Nachfass-Mail Fam. Weber senden',
    description: 'Follow-up zur gesendeten Offerte.',
    status: 'OFFEN',
    priority: 'MEDIUM',
    module: 'ANGEBOT',
    referenceId: null,
    referenceTitle: 'Offerte MFH-Sanierung Weber',
    assignedTo: 'u001',
    assignedBy: 'u002',
    dueDate: '2026-03-04',
    completedAt: null,
    createdAt: '2026-03-02T09:00:00.000Z',
    updatedAt: '2026-03-02T09:00:00.000Z',
  },
  {
    id: uuid(),
    title: 'Vor-Ort-Termin Zuerich vorbereiten',
    description: 'Unterlagen und Kalkulation bereitstellen.',
    status: 'OFFEN',
    priority: 'HIGH',
    module: 'TERMIN',
    referenceId: null,
    referenceTitle: null,
    assignedTo: 'u001',
    assignedBy: 'u001',
    dueDate: '2026-03-03',
    completedAt: null,
    createdAt: '2026-03-01T14:00:00.000Z',
    updatedAt: '2026-03-01T14:00:00.000Z',
  },
  {
    id: uuid(),
    title: 'Kalkulation Projekt Bern aktualisieren',
    description: null,
    status: 'IN_BEARBEITUNG',
    priority: 'MEDIUM',
    module: 'PROJEKT',
    referenceId: null,
    referenceTitle: null,
    assignedTo: 'u002',
    assignedBy: 'u001',
    dueDate: '2026-03-05',
    completedAt: null,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-02T11:00:00.000Z',
  },
  {
    id: uuid(),
    title: 'Follow-up Solar Aarau – Entscheid',
    description: 'Kunde will sich bis Freitag entscheiden.',
    status: 'ERLEDIGT',
    priority: 'MEDIUM',
    module: 'ANGEBOT',
    referenceId: null,
    referenceTitle: null,
    assignedTo: 'u001',
    assignedBy: 'u001',
    dueDate: '2026-03-01',
    completedAt: '2026-03-01T16:00:00.000Z',
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-03-01T16:00:00.000Z',
  },
  {
    id: uuid(),
    title: 'Finanzierungsmodell Keller prüfen',
    description: 'Grossprojekt 450kWp, ZKB-Finanzierung',
    status: 'OFFEN',
    priority: 'URGENT',
    module: 'ANGEBOT',
    referenceId: null,
    referenceTitle: 'Offerte Industriedach Keller 450kWp',
    assignedTo: 'u001',
    assignedBy: 'u002',
    dueDate: '2026-03-04',
    completedAt: null,
    createdAt: '2026-03-02T14:00:00.000Z',
    updatedAt: '2026-03-02T14:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/tasks – List
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo, status, module: mod, priority, search, sortBy = 'dueDate', sortOrder = 'asc' } = req.query;

    let filtered = [...mockTasks];

    if (assignedTo && typeof assignedTo === 'string') filtered = filtered.filter((t) => t.assignedTo === assignedTo);
    if (status && typeof status === 'string') filtered = filtered.filter((t) => t.status === status);
    if (mod && typeof mod === 'string') filtered = filtered.filter((t) => t.module === mod);
    if (priority && typeof priority === 'string') filtered = filtered.filter((t) => t.priority === priority);
    if (search && typeof search === 'string') {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          (t.description?.toLowerCase().includes(term) ?? false) ||
          (t.referenceTitle?.toLowerCase().includes(term) ?? false),
      );
    }

    const sf = typeof sortBy === 'string' ? sortBy : 'dueDate';
    const order = sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sf];
      const bVal = (b as unknown as Record<string, unknown>)[sf];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * order;
      return 0;
    });

    res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/tasks/stats
// ---------------------------------------------------------------------------

router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.query;
    let tasks = [...mockTasks];
    if (assignedTo && typeof assignedTo === 'string') tasks = tasks.filter((t) => t.assignedTo === assignedTo);

    const open = tasks.filter((t) => t.status === 'OFFEN').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_BEARBEITUNG').length;
    const completed = tasks.filter((t) => t.status === 'ERLEDIGT').length;
    const overdue = tasks.filter(
      (t) => t.status !== 'ERLEDIGT' && t.dueDate && new Date(t.dueDate) < new Date(),
    ).length;

    res.json({ data: { open, inProgress, completed, overdue, total: tasks.length } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/tasks/:id
// ---------------------------------------------------------------------------

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = mockTasks.find((t) => t.id === req.params.id);
    if (!task) throw new AppError('Aufgabe nicht gefunden', 404);
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/tasks – Create
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createTaskSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      id: uuid(),
      title: result.data.title,
      description: result.data.description ?? null,
      status: 'OFFEN',
      priority: result.data.priority,
      module: result.data.module,
      referenceId: result.data.referenceId ?? null,
      referenceTitle: result.data.referenceTitle ?? null,
      assignedTo: result.data.assignedTo,
      assignedBy: result.data.assignedBy,
      dueDate: result.data.dueDate ?? null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    mockTasks.push(newTask);
    res.status(201).json({ data: newTask });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/tasks/:id – Update
// ---------------------------------------------------------------------------

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = mockTasks.find((t) => t.id === req.params.id);
    if (!task) throw new AppError('Aufgabe nicht gefunden', 404);

    const result = updateTaskSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const u = result.data;
    if (u.title !== undefined) task.title = u.title;
    if (u.description !== undefined) task.description = u.description ?? null;
    if (u.priority !== undefined) task.priority = u.priority;
    if (u.assignedTo !== undefined) task.assignedTo = u.assignedTo;
    if (u.dueDate !== undefined) task.dueDate = u.dueDate ?? null;

    if (u.status !== undefined) {
      task.status = u.status;
      if (u.status === 'ERLEDIGT' && !task.completedAt) {
        task.completedAt = new Date().toISOString();
      } else if (u.status !== 'ERLEDIGT') {
        task.completedAt = null;
      }
    }

    task.updatedAt = new Date().toISOString();
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/tasks/:id
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const idx = mockTasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) throw new AppError('Aufgabe nicht gefunden', 404);
    mockTasks.splice(idx, 1);
    res.json({ message: 'Aufgabe erfolgreich gelöscht' });
  } catch (err) {
    next(err);
  }
});

export default router;
