import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

type ActivityType = 'CALL' | 'EMAIL' | 'NOTE' | 'MEETING' | 'STATUS_CHANGE' | 'TASK' | 'DOCUMENT' | 'REMINDER' | 'DEAL_CREATED';

interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  title: string;
  description: string | null;
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

// Pre-seeded activities for demo
const mockActivities: Activity[] = [
  { id: uuid(), leadId: '*', type: 'CALL', title: 'Erstgespräch geführt', description: 'Interesse an 15kWp Anlage bestätigt. Termin für Dachbesichtigung vereinbart.', createdBy: 'Marco Bianchi', createdAt: '2026-02-15T11:00:00.000Z' },
  { id: uuid(), leadId: '*', type: 'EMAIL', title: 'Offerte versendet', description: 'Standard-Offerte für EFH mit 15kWp versendet.', createdBy: 'Laura Meier', createdAt: '2026-02-16T09:30:00.000Z' },
  { id: uuid(), leadId: '*', type: 'NOTE', title: 'Notiz hinzugefügt', description: 'Kunde bevorzugt Schweizer Panels. Budget ca. CHF 40k.', createdBy: 'Marco Bianchi', createdAt: '2026-02-17T14:15:00.000Z' },
  { id: uuid(), leadId: '*', type: 'MEETING', title: 'Vor-Ort-Besichtigung', description: 'Dachbesichtigung durchgeführt. Südausrichtung bestätigt, keine Verschattung.', createdBy: 'Simon Keller', createdAt: '2026-02-20T10:00:00.000Z' },
  { id: uuid(), leadId: '*', type: 'STATUS_CHANGE', title: 'Status geändert: Qualifiziert', description: null, createdBy: 'System', createdAt: '2026-02-20T10:30:00.000Z' },
];

const createActivitySchema = z.object({
  leadId: z.string(),
  type: z.enum(['CALL', 'EMAIL', 'NOTE', 'MEETING', 'STATUS_CHANGE', 'TASK', 'DOCUMENT', 'REMINDER', 'DEAL_CREATED']),
  title: z.string().min(1),
  description: z.string().optional(),
  createdBy: z.string().optional(),
});

// GET /api/v1/activities?leadId=xxx
router.get('/', (req: Request, res: Response) => {
  const { leadId } = req.query;
  let results = mockActivities;
  if (leadId && typeof leadId === 'string') {
    // Return activities for this lead (use * as wildcard for demo)
    results = mockActivities.filter((a) => a.leadId === leadId || a.leadId === '*');
  }
  // Sort newest first
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ data: results });
});

// POST /api/v1/activities
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createActivitySchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError('Validierungsfehler', 422);
    }
    const activity: Activity = {
      id: uuid(),
      leadId: result.data.leadId,
      type: result.data.type,
      title: result.data.title,
      description: result.data.description ?? null,
      createdBy: result.data.createdBy ?? 'System',
      createdAt: new Date().toISOString(),
    };
    mockActivities.unshift(activity);
    res.status(201).json({ data: activity });
  } catch (err) {
    next(err);
  }
});

export default router;
