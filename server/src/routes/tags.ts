import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag-Name ist erforderlich'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein gueltiger Hex-Code sein (z.B. #FF5733)')
    .optional()
    .default('#6B7280'),
});

// ---------------------------------------------------------------------------
// Helper – generate UUID v4
// ---------------------------------------------------------------------------

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Mock Data – Tags (IDs must match leads.ts references)
// ---------------------------------------------------------------------------

const mockTags: Tag[] = [
  {
    id: 't0000001-0000-4000-a000-000000000001',
    name: '1x angerufen',
    color: '#3B82F6',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000002',
    name: '2x angerufen',
    color: '#F59E0B',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000003',
    name: '3x angerufen',
    color: '#EF4444',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000004',
    name: 'Unqualifiziert',
    color: '#6B7280',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000005',
    name: 'After-Sales-Potenzial',
    color: '#8B5CF6',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000006',
    name: 'Homepage',
    color: '#10B981',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000007',
    name: 'Empfehlung',
    color: '#06B6D4',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000008',
    name: 'Dringend',
    color: '#DC2626',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't0000001-0000-4000-a000-000000000009',
    name: 'VIP',
    color: '#D97706',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/tags – List all tags
// ---------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ data: mockTags });
});

// ---------------------------------------------------------------------------
// POST /api/v1/tags – Create tag
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createTagSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    // Check for duplicate tag name
    const exists = mockTags.some(
      (t) => t.name.toLowerCase() === result.data.name.toLowerCase(),
    );
    if (exists) {
      throw new AppError(
        `Tag mit dem Namen "${result.data.name}" existiert bereits`,
        409,
      );
    }

    const now = new Date().toISOString();
    const newTag: Tag = {
      id: uuid(),
      name: result.data.name,
      color: result.data.color,
      createdAt: now,
      updatedAt: now,
    };

    mockTags.push(newTag);

    res.status(201).json({ data: newTag });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/tags/:id – Delete tag
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const index = mockTags.findIndex((t) => t.id === req.params.id);

    if (index === -1) {
      throw new AppError('Tag nicht gefunden', 404);
    }

    mockTags.splice(index, 1);

    res.json({ message: 'Tag erfolgreich gelöscht' });
  } catch (err) {
    next(err);
  }
});

export default router;
