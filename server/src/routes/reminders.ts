import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

interface Reminder {
  id: string;
  leadId: string;
  title: string;
  description: string | null;
  dueAt: string;
  dismissed: boolean;
  createdBy: string;
  createdAt: string;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const mockReminders: Reminder[] = [
  {
    id: uuid(),
    leadId: '*',
    title: 'Nachfassen bei Mueller Elektro',
    description: 'Offerte nachfragen – 1 Woche seit Versand.',
    dueAt: new Date(Date.now() + 5 * 60000).toISOString(), // 5 min from now (demo popup)
    dismissed: false,
    createdBy: 'Marco Bianchi',
    createdAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: uuid(),
    leadId: '*',
    title: 'Dachbesichtigung planen',
    description: 'Termin mit Kunde vereinbaren für Vor-Ort-Analyse.',
    dueAt: new Date(Date.now() + 3600000).toISOString(), // 1h from now
    dismissed: false,
    createdBy: 'Laura Meier',
    createdAt: '2026-03-02T10:00:00.000Z',
  },
];

const createReminderSchema = z.object({
  leadId: z.string(),
  title: z.string().min(1, 'Titel erforderlich'),
  description: z.string().optional(),
  dueAt: z.string(),
  createdBy: z.string().optional(),
});

// GET /api/v1/reminders?leadId=xxx&pending=true
router.get('/', (req: Request, res: Response) => {
  const { leadId, pending } = req.query;
  let results = [...mockReminders];

  if (leadId && typeof leadId === 'string') {
    results = results.filter((r) => r.leadId === leadId || r.leadId === '*');
  }

  if (pending === 'true') {
    const now = new Date().getTime();
    results = results.filter((r) => !r.dismissed && new Date(r.dueAt).getTime() <= now);
  }

  results.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  res.json({ data: results });
});

// POST /api/v1/reminders
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createReminderSchema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.errors.map((e) => e.message).join('; ');
      throw new AppError(`Validierungsfehler: ${msg}`, 422);
    }
    const reminder: Reminder = {
      id: uuid(),
      leadId: result.data.leadId,
      title: result.data.title,
      description: result.data.description ?? null,
      dueAt: result.data.dueAt,
      dismissed: false,
      createdBy: result.data.createdBy ?? 'System',
      createdAt: new Date().toISOString(),
    };
    mockReminders.push(reminder);
    res.status(201).json({ data: reminder });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/reminders/:id/dismiss
router.put('/:id/dismiss', (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminder = mockReminders.find((r) => r.id === req.params.id);
    if (!reminder) {
      throw new AppError('Erinnerung nicht gefunden', 404);
    }
    reminder.dismissed = true;
    res.json({ data: reminder });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/reminders/:id
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const idx = mockReminders.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      throw new AppError('Erinnerung nicht gefunden', 404);
    }
    mockReminders.splice(idx, 1);
    res.json({ message: 'Erinnerung gelöscht' });
  } catch (err) {
    next(err);
  }
});

export default router;
