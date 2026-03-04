import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Document {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  entityType: 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT';
  entityId: string;
  uploadedBy: string;
  notes: string | null;
  createdAt: string;
}

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
// Validation
// ---------------------------------------------------------------------------

const uploadDocSchema = z.object({
  fileName: z.string().min(1, 'Dateiname ist erforderlich'),
  fileSize: z.number().min(1),
  mimeType: z.string().min(1),
  entityType: z.enum(['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT']),
  entityId: z.string().min(1),
  uploadedBy: z.string().optional().default('u001'),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockDocuments: Document[] = [
  {
    id: uuid(),
    fileName: 'Dach-Foto-Vorderseite.jpg',
    fileSize: 2_400_000,
    mimeType: 'image/jpeg',
    entityType: 'LEAD',
    entityId: 'l001',
    uploadedBy: 'u001',
    notes: 'Foto vom Satteldach, Suedausrichtung',
    createdAt: '2026-02-20T10:30:00.000Z',
  },
  {
    id: uuid(),
    fileName: 'Stromrechnung-2025.pdf',
    fileSize: 450_000,
    mimeType: 'application/pdf',
    entityType: 'LEAD',
    entityId: 'l001',
    uploadedBy: 'u001',
    notes: 'Jahresverbrauch 8500 kWh',
    createdAt: '2026-02-20T11:00:00.000Z',
  },
  {
    id: uuid(),
    fileName: 'Grundriss-Dach.pdf',
    fileSize: 1_200_000,
    mimeType: 'application/pdf',
    entityType: 'TERMIN',
    entityId: 't001',
    uploadedBy: 'u002',
    notes: null,
    createdAt: '2026-02-25T14:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/documents?entityType=LEAD&entityId=xxx
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId } = req.query;

    let filtered = [...mockDocuments];

    if (entityType && typeof entityType === 'string') {
      filtered = filtered.filter((d) => d.entityType === entityType);
    }
    if (entityId && typeof entityId === 'string') {
      filtered = filtered.filter((d) => d.entityId === entityId);
    }

    // Sortiert nach neueste zuerst
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/documents – Upload (Mock: speichert nur Metadaten)
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = uploadDocSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const newDoc: Document = {
      id: uuid(),
      fileName: result.data.fileName,
      fileSize: result.data.fileSize,
      mimeType: result.data.mimeType,
      entityType: result.data.entityType,
      entityId: result.data.entityId,
      uploadedBy: result.data.uploadedBy,
      notes: result.data.notes ?? null,
      createdAt: new Date().toISOString(),
    };

    mockDocuments.push(newDoc);
    res.status(201).json({ data: newDoc });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/documents/:id
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const idx = mockDocuments.findIndex((d) => d.id === req.params.id);
    if (idx === -1) throw new AppError('Dokument nicht gefunden', 404);
    mockDocuments.splice(idx, 1);
    res.json({ message: 'Dokument gelöscht' });
  } catch (err) {
    next(err);
  }
});

export default router;
