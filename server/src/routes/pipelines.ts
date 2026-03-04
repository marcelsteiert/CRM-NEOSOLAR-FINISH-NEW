import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Bucket {
  id: string;
  name: string;
  position: number;
  pipelineId: string;
  createdAt: string;
  updatedAt: string;
}

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  buckets: Bucket[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline-Name ist erforderlich'),
  description: z.string().optional(),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline-Name ist erforderlich').optional(),
  description: z.string().optional(),
});

const createBucketSchema = z.object({
  name: z.string().min(1, 'Bucket-Name ist erforderlich'),
  position: z.number().int().min(0).optional(),
});

const updateBucketSchema = z.object({
  name: z.string().min(1, 'Bucket-Name ist erforderlich').optional(),
  position: z.number().int().min(0).optional(),
});

const reorderBucketsSchema = z.object({
  bucketIds: z
    .array(z.string().uuid())
    .min(1, 'Mindestens ein Bucket erforderlich'),
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
// Mock Data – Pipelines with buckets
// ---------------------------------------------------------------------------

// These IDs must match leads.ts mock data references
const PIPELINE_STANDARD_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const PIPELINE_AFTER_SALES_ID = 'a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d';

const mockPipelines: Pipeline[] = [
  {
    id: PIPELINE_STANDARD_ID,
    name: 'Standard Leads',
    description: 'Haupt-Pipeline für neue Leads und Vertriebsprozess',
    buckets: [
      {
        id: 'b1000001-0000-4000-a000-000000000001',
        name: 'Neu',
        position: 0,
        pipelineId: PIPELINE_STANDARD_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b1000001-0000-4000-a000-000000000002',
        name: 'Kontaktiert',
        position: 1,
        pipelineId: PIPELINE_STANDARD_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b1000001-0000-4000-a000-000000000003',
        name: 'Qualifiziert',
        position: 2,
        pipelineId: PIPELINE_STANDARD_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b1000001-0000-4000-a000-000000000004',
        name: 'Angebot',
        position: 3,
        pipelineId: PIPELINE_STANDARD_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b1000001-0000-4000-a000-000000000005',
        name: 'Verhandlung',
        position: 4,
        pipelineId: PIPELINE_STANDARD_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: PIPELINE_AFTER_SALES_ID,
    name: 'After-Sales',
    description: 'Pipeline für bestehende Kunden und After-Sales-Prozesse',
    buckets: [
      {
        id: 'b2000001-0000-4000-a000-000000000001',
        name: 'Feedback',
        position: 0,
        pipelineId: PIPELINE_AFTER_SALES_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b2000001-0000-4000-a000-000000000002',
        name: 'Upselling',
        position: 1,
        pipelineId: PIPELINE_AFTER_SALES_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b2000001-0000-4000-a000-000000000003',
        name: 'Abgeschlossen',
        position: 2,
        pipelineId: PIPELINE_AFTER_SALES_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/pipelines – List all pipelines with buckets
// ---------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  // Return pipelines with buckets sorted by position
  const data = mockPipelines.map((p) => ({
    ...p,
    buckets: [...p.buckets].sort((a, b) => a.position - b.position),
  }));

  res.json({ data });
});

// ---------------------------------------------------------------------------
// POST /api/v1/pipelines – Create pipeline
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createPipelineSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const now = new Date().toISOString();
    const newPipeline: Pipeline = {
      id: uuid(),
      name: result.data.name,
      description: result.data.description ?? null,
      buckets: [],
      createdAt: now,
      updatedAt: now,
    };

    mockPipelines.push(newPipeline);

    res.status(201).json({ data: newPipeline });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/pipelines/:id – Update pipeline
// ---------------------------------------------------------------------------

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const pipeline = mockPipelines.find((p) => p.id === req.params.id);

    if (!pipeline) {
      throw new AppError('Pipeline nicht gefunden', 404);
    }

    const result = updatePipelineSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    if (result.data.name !== undefined) pipeline.name = result.data.name;
    if (result.data.description !== undefined)
      pipeline.description = result.data.description ?? null;

    pipeline.updatedAt = new Date().toISOString();

    res.json({ data: pipeline });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/pipelines/:id/buckets – Get buckets for pipeline
// ---------------------------------------------------------------------------

router.get(
  '/:id/buckets',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipeline = mockPipelines.find((p) => p.id === req.params.id);

      if (!pipeline) {
        throw new AppError('Pipeline nicht gefunden', 404);
      }

      const sortedBuckets = [...pipeline.buckets].sort(
        (a, b) => a.position - b.position,
      );

      res.json({ data: sortedBuckets });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/v1/pipelines/:id/buckets – Create bucket in pipeline
// ---------------------------------------------------------------------------

router.post(
  '/:id/buckets',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipeline = mockPipelines.find((p) => p.id === req.params.id);

      if (!pipeline) {
        throw new AppError('Pipeline nicht gefunden', 404);
      }

      const result = createBucketSchema.safeParse(req.body);

      if (!result.success) {
        const messages = result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new AppError(`Validierungsfehler: ${messages}`, 422);
      }

      const now = new Date().toISOString();
      const position =
        result.data.position ?? pipeline.buckets.length;

      const newBucket: Bucket = {
        id: uuid(),
        name: result.data.name,
        position,
        pipelineId: pipeline.id,
        createdAt: now,
        updatedAt: now,
      };

      pipeline.buckets.push(newBucket);
      pipeline.updatedAt = now;

      res.status(201).json({ data: newBucket });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /api/v1/pipelines/:id/buckets/:bucketId – Update bucket
// ---------------------------------------------------------------------------

router.put(
  '/:id/buckets/:bucketId',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipeline = mockPipelines.find((p) => p.id === req.params.id);

      if (!pipeline) {
        throw new AppError('Pipeline nicht gefunden', 404);
      }

      const bucket = pipeline.buckets.find(
        (b) => b.id === req.params.bucketId,
      );

      if (!bucket) {
        throw new AppError('Bucket nicht gefunden', 404);
      }

      const result = updateBucketSchema.safeParse(req.body);

      if (!result.success) {
        const messages = result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new AppError(`Validierungsfehler: ${messages}`, 422);
      }

      if (result.data.name !== undefined) bucket.name = result.data.name;
      if (result.data.position !== undefined)
        bucket.position = result.data.position;

      const now = new Date().toISOString();
      bucket.updatedAt = now;
      pipeline.updatedAt = now;

      res.json({ data: bucket });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /api/v1/pipelines/:id/buckets/reorder – Reorder buckets
// ---------------------------------------------------------------------------

router.put(
  '/:id/buckets/reorder',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipeline = mockPipelines.find((p) => p.id === req.params.id);

      if (!pipeline) {
        throw new AppError('Pipeline nicht gefunden', 404);
      }

      const result = reorderBucketsSchema.safeParse(req.body);

      if (!result.success) {
        const messages = result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new AppError(`Validierungsfehler: ${messages}`, 422);
      }

      const { bucketIds } = result.data;

      // Verify all bucket IDs exist in this pipeline
      for (const bucketId of bucketIds) {
        const exists = pipeline.buckets.some((b) => b.id === bucketId);
        if (!exists) {
          throw new AppError(
            `Bucket ${bucketId} gehoert nicht zu dieser Pipeline`,
            400,
          );
        }
      }

      // Update positions according to the new order
      const now = new Date().toISOString();
      for (let i = 0; i < bucketIds.length; i++) {
        const bucket = pipeline.buckets.find((b) => b.id === bucketIds[i]);
        if (bucket) {
          bucket.position = i;
          bucket.updatedAt = now;
        }
      }

      pipeline.updatedAt = now;

      const sortedBuckets = [...pipeline.buckets].sort(
        (a, b) => a.position - b.position,
      );

      res.json({ data: sortedBuckets });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
