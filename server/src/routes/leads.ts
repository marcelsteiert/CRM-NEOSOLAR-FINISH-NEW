import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address: string;
  phone: string;
  email: string;
  source: LeadSource;
  pipelineId: string | null;
  bucketId: string | null;
  assignedTo: string | null;
  status: LeadStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

type LeadSource =
  | 'HOMEPAGE'
  | 'LANDINGPAGE'
  | 'MESSE'
  | 'EMPFEHLUNG'
  | 'KALTAKQUISE'
  | 'SONSTIGE';

type LeadStatus = 'ACTIVE' | 'CONVERTED' | 'LOST' | 'ARCHIVED';

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const createLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address: z.string().min(1, 'Adresse ist erforderlich'),
  phone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  source: z.enum([
    'HOMEPAGE',
    'LANDINGPAGE',
    'MESSE',
    'EMPFEHLUNG',
    'KALTAKQUISE',
    'SONSTIGE',
  ]),
  pipelineId: z.string().uuid().optional(),
  bucketId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  status: z
    .enum(['ACTIVE', 'CONVERTED', 'LOST', 'ARCHIVED'])
    .optional(),
  tags: z.array(z.string()).optional(),
});

const updateLeadSchema = createLeadSchema.partial();

const addTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

const moveLeadSchema = z.object({
  bucketId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Helper – generate UUID v4 (simple implementation for mock data)
// ---------------------------------------------------------------------------

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Mock Data – 20 realistic Swiss PV leads
// ---------------------------------------------------------------------------

// Pipeline & bucket IDs (must match pipelines.ts mock data)
const PIPELINE_STANDARD = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const BUCKET_NEU = 'b1000001-0000-4000-a000-000000000001';
const BUCKET_KONTAKTIERT = 'b1000001-0000-4000-a000-000000000002';
const BUCKET_QUALIFIZIERT = 'b1000001-0000-4000-a000-000000000003';
const BUCKET_ANGEBOT = 'b1000001-0000-4000-a000-000000000004';
const BUCKET_VERHANDLUNG = 'b1000001-0000-4000-a000-000000000005';

// Tag IDs (must match tags.ts mock data)
const TAG_1X_ANGERUFEN = 't0000001-0000-4000-a000-000000000001';
const TAG_2X_ANGERUFEN = 't0000001-0000-4000-a000-000000000002';
const TAG_3X_ANGERUFEN = 't0000001-0000-4000-a000-000000000003';
const TAG_UNQUALIFIZIERT = 't0000001-0000-4000-a000-000000000004';
const TAG_AFTER_SALES = 't0000001-0000-4000-a000-000000000005';
const TAG_HOMEPAGE = 't0000001-0000-4000-a000-000000000006';
const TAG_EMPFEHLUNG = 't0000001-0000-4000-a000-000000000007';
const TAG_DRINGEND = 't0000001-0000-4000-a000-000000000008';
const TAG_VIP = 't0000001-0000-4000-a000-000000000009';

const mockLeads: Lead[] = [
  {
    id: uuid(),
    firstName: 'Hans',
    lastName: 'Mueller',
    company: 'Mueller Elektro AG',
    address: 'Bahnhofstrasse 12, 8001 Zuerich',
    phone: '+41 44 123 45 67',
    email: 'hans.mueller@mueller-elektro.ch',
    source: 'HOMEPAGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_NEU,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_HOMEPAGE],
    createdAt: '2026-02-15T10:30:00.000Z',
    updatedAt: '2026-02-15T10:30:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Anna',
    lastName: 'Schneider',
    company: 'Schneider Solar GmbH',
    address: 'Marktgasse 28, 3011 Bern',
    phone: '+41 31 234 56 78',
    email: 'anna.schneider@schneider-solar.ch',
    source: 'MESSE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_KONTAKTIERT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_1X_ANGERUFEN, TAG_VIP],
    createdAt: '2026-02-14T09:15:00.000Z',
    updatedAt: '2026-02-16T14:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Peter',
    lastName: 'Brunner',
    company: null,
    address: 'Steinenvorstadt 5, 4051 Basel',
    phone: '+41 61 345 67 89',
    email: 'peter.brunner@bluewin.ch',
    source: 'EMPFEHLUNG',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_QUALIFIZIERT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_EMPFEHLUNG, TAG_2X_ANGERUFEN],
    createdAt: '2026-02-12T08:00:00.000Z',
    updatedAt: '2026-02-18T11:30:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Claudia',
    lastName: 'Weber',
    company: 'Weber Immobilien',
    address: 'Technikumstrasse 9, 8400 Winterthur',
    phone: '+41 52 456 78 90',
    email: 'claudia.weber@weber-immobilien.ch',
    source: 'LANDINGPAGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_ANGEBOT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_DRINGEND],
    createdAt: '2026-02-10T13:45:00.000Z',
    updatedAt: '2026-02-20T09:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Thomas',
    lastName: 'Keller',
    company: 'Keller Dachtechnik AG',
    address: 'Kirchgasse 17, 9000 St. Gallen',
    phone: '+41 71 567 89 01',
    email: 'thomas.keller@keller-dach.ch',
    source: 'KALTAKQUISE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_VERHANDLUNG,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_3X_ANGERUFEN, TAG_VIP],
    createdAt: '2026-02-08T07:30:00.000Z',
    updatedAt: '2026-02-22T16:15:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Monika',
    lastName: 'Fischer',
    company: 'Solartec Fischer',
    address: 'Zentralstrasse 42, 6003 Luzern',
    phone: '+41 41 678 90 12',
    email: 'monika.fischer@solartec-fischer.ch',
    source: 'HOMEPAGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_NEU,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_HOMEPAGE],
    createdAt: '2026-02-20T11:00:00.000Z',
    updatedAt: '2026-02-20T11:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Daniel',
    lastName: 'Huber',
    company: null,
    address: 'Hauptstrasse 55, 4600 Olten',
    phone: '+41 62 789 01 23',
    email: 'daniel.huber@gmail.com',
    source: 'LANDINGPAGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_KONTAKTIERT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_1X_ANGERUFEN],
    createdAt: '2026-02-19T15:30:00.000Z',
    updatedAt: '2026-02-21T10:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Sandra',
    lastName: 'Zimmermann',
    company: 'Zimmermann & Partner',
    address: 'Theaterstrasse 8, 8400 Winterthur',
    phone: '+41 52 890 12 34',
    email: 'sandra.zimmermann@zp-architekten.ch',
    source: 'EMPFEHLUNG',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_QUALIFIZIERT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_EMPFEHLUNG, TAG_DRINGEND],
    createdAt: '2026-02-17T12:15:00.000Z',
    updatedAt: '2026-02-23T08:45:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Markus',
    lastName: 'Steiner',
    company: 'Steiner Hausbau AG',
    address: 'Dufourstrasse 33, 8008 Zuerich',
    phone: '+41 44 901 23 45',
    email: 'markus.steiner@steiner-hausbau.ch',
    source: 'MESSE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_ANGEBOT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_VIP, TAG_2X_ANGERUFEN],
    createdAt: '2026-02-11T09:00:00.000Z',
    updatedAt: '2026-02-24T14:30:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Ursula',
    lastName: 'Graf',
    company: null,
    address: 'Spitalgasse 21, 3011 Bern',
    phone: '+41 31 012 34 56',
    email: 'ursula.graf@sunrise.ch',
    source: 'HOMEPAGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_NEU,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_HOMEPAGE],
    createdAt: '2026-02-25T16:00:00.000Z',
    updatedAt: '2026-02-25T16:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Stefan',
    lastName: 'Baumann',
    company: 'Baumann Energie Consulting',
    address: 'Freiestrasse 77, 8032 Zuerich',
    phone: '+41 44 112 33 44',
    email: 'stefan.baumann@baumann-energie.ch',
    source: 'KALTAKQUISE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_KONTAKTIERT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_1X_ANGERUFEN],
    createdAt: '2026-02-22T10:30:00.000Z',
    updatedAt: '2026-02-26T09:15:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Nicole',
    lastName: 'Gerber',
    company: 'SunPower Solutions AG',
    address: 'Industriestrasse 14, 5000 Aarau',
    phone: '+41 62 223 44 55',
    email: 'nicole.gerber@sunpower-solutions.ch',
    source: 'MESSE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_VERHANDLUNG,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_3X_ANGERUFEN, TAG_DRINGEND],
    createdAt: '2026-02-05T08:30:00.000Z',
    updatedAt: '2026-02-27T11:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Reto',
    lastName: 'Frei',
    company: null,
    address: 'Obergrundstrasse 101, 6005 Luzern',
    phone: '+41 41 334 55 66',
    email: 'reto.frei@bluewin.ch',
    source: 'SONSTIGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_NEU,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [],
    createdAt: '2026-02-28T14:00:00.000Z',
    updatedAt: '2026-02-28T14:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Barbara',
    lastName: 'Wyss',
    company: 'Wyss Gebaudetechnik',
    address: 'Neuengasse 15, 3001 Bern',
    phone: '+41 31 445 66 77',
    email: 'barbara.wyss@wyss-gt.ch',
    source: 'EMPFEHLUNG',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_QUALIFIZIERT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_EMPFEHLUNG, TAG_VIP],
    createdAt: '2026-02-13T11:45:00.000Z',
    updatedAt: '2026-02-25T13:20:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Christian',
    lastName: 'Meier',
    company: 'Meier Solar Montagen',
    address: 'Schaffhauserstrasse 200, 8057 Zuerich',
    phone: '+41 44 556 77 88',
    email: 'christian.meier@meier-solar.ch',
    source: 'HOMEPAGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_ANGEBOT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_HOMEPAGE, TAG_2X_ANGERUFEN],
    createdAt: '2026-02-09T07:00:00.000Z',
    updatedAt: '2026-02-26T15:45:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Sabine',
    lastName: 'Brun',
    company: null,
    address: 'Rue du Marche 10, 1003 Lausanne',
    phone: '+41 21 667 88 99',
    email: 'sabine.brun@gmail.com',
    source: 'LANDINGPAGE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_NEU,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [],
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Beat',
    lastName: 'Schwarz',
    company: 'Schwarz PV Systeme GmbH',
    address: 'Grabenstrasse 44, 6340 Baar',
    phone: '+41 41 778 99 00',
    email: 'beat.schwarz@schwarz-pv.ch',
    source: 'KALTAKQUISE',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_KONTAKTIERT,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_1X_ANGERUFEN],
    createdAt: '2026-02-27T13:30:00.000Z',
    updatedAt: '2026-03-01T10:15:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Karin',
    lastName: 'Bauer',
    company: 'Bauer Architektur',
    address: 'Rheinsprung 1, 4001 Basel',
    phone: '+41 61 889 00 11',
    email: 'karin.bauer@bauer-architektur.ch',
    source: 'EMPFEHLUNG',
    pipelineId: PIPELINE_STANDARD,
    bucketId: BUCKET_VERHANDLUNG,
    assignedTo: null,
    status: 'ACTIVE',
    tags: [TAG_EMPFEHLUNG, TAG_3X_ANGERUFEN, TAG_DRINGEND],
    createdAt: '2026-02-06T10:00:00.000Z',
    updatedAt: '2026-03-02T08:30:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Marcel',
    lastName: 'Roth',
    company: null,
    address: 'Haldenstrasse 60, 6006 Luzern',
    phone: '+41 41 990 11 22',
    email: 'marcel.roth@gmx.ch',
    source: 'HOMEPAGE',
    pipelineId: null,
    bucketId: null,
    assignedTo: null,
    status: 'LOST',
    tags: [TAG_UNQUALIFIZIERT],
    createdAt: '2026-01-20T12:00:00.000Z',
    updatedAt: '2026-02-15T14:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    firstName: 'Eva',
    lastName: 'Hofer',
    company: 'Hofer Solartechnik',
    address: 'Pilatusstrasse 3, 6003 Luzern',
    phone: '+41 41 101 22 33',
    email: 'eva.hofer@hofer-solar.ch',
    source: 'MESSE',
    pipelineId: null,
    bucketId: null,
    assignedTo: null,
    status: 'CONVERTED',
    tags: [TAG_AFTER_SALES, TAG_VIP],
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-28T17:00:00.000Z',
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/leads – List leads with filtering & pagination
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      source,
      pipelineId,
      bucketId,
      assignedTo,
      search,
      page: pageParam,
      pageSize: pageSizeParam,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    let filtered = mockLeads.filter((l) => l.deletedAt === null);

    // Filter by status
    if (status && typeof status === 'string') {
      filtered = filtered.filter((l) => l.status === status);
    }

    // Filter by source
    if (source && typeof source === 'string') {
      filtered = filtered.filter((l) => l.source === source);
    }

    // Filter by pipelineId
    if (pipelineId && typeof pipelineId === 'string') {
      filtered = filtered.filter((l) => l.pipelineId === pipelineId);
    }

    // Filter by bucketId
    if (bucketId && typeof bucketId === 'string') {
      filtered = filtered.filter((l) => l.bucketId === bucketId);
    }

    // Filter by assignedTo
    if (assignedTo && typeof assignedTo === 'string') {
      filtered = filtered.filter((l) => l.assignedTo === assignedTo);
    }

    // Full-text search across name, company, email, address
    if (search && typeof search === 'string') {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.firstName?.toLowerCase().includes(term) ?? false) ||
          (l.lastName?.toLowerCase().includes(term) ?? false) ||
          (l.company?.toLowerCase().includes(term) ?? false) ||
          l.email.toLowerCase().includes(term) ||
          l.address.toLowerCase().includes(term) ||
          l.phone.includes(term),
      );
    }

    // Sorting
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortField];
      const bVal = (b as unknown as Record<string, unknown>)[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * order;
      }
      return 0;
    });

    // Pagination
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 20));
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    res.json({
      data: paginated,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/leads/:id – Get single lead with relations
// ---------------------------------------------------------------------------

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = mockLeads.find(
      (l) => l.id === req.params.id && l.deletedAt === null,
    );

    if (!lead) {
      throw new AppError('Lead nicht gefunden', 404);
    }

    res.json({ data: lead });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/leads – Create new lead
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createLeadSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const now = new Date().toISOString();
    const newLead: Lead = {
      id: uuid(),
      firstName: result.data.firstName ?? null,
      lastName: result.data.lastName ?? null,
      company: result.data.company ?? null,
      address: result.data.address,
      phone: result.data.phone,
      email: result.data.email,
      source: result.data.source,
      pipelineId: result.data.pipelineId ?? null,
      bucketId: result.data.bucketId ?? null,
      assignedTo: result.data.assignedTo ?? null,
      status: result.data.status ?? 'ACTIVE',
      tags: result.data.tags ?? [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    mockLeads.push(newLead);

    res.status(201).json({ data: newLead });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/leads/:id – Update lead
// ---------------------------------------------------------------------------

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = mockLeads.find(
      (l) => l.id === req.params.id && l.deletedAt === null,
    );

    if (!lead) {
      throw new AppError('Lead nicht gefunden', 404);
    }

    const result = updateLeadSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const updates = result.data;

    if (updates.firstName !== undefined) lead.firstName = updates.firstName ?? null;
    if (updates.lastName !== undefined) lead.lastName = updates.lastName ?? null;
    if (updates.company !== undefined) lead.company = updates.company ?? null;
    if (updates.address !== undefined) lead.address = updates.address;
    if (updates.phone !== undefined) lead.phone = updates.phone;
    if (updates.email !== undefined) lead.email = updates.email;
    if (updates.source !== undefined) lead.source = updates.source;
    if (updates.pipelineId !== undefined) lead.pipelineId = updates.pipelineId ?? null;
    if (updates.bucketId !== undefined) lead.bucketId = updates.bucketId ?? null;
    if (updates.assignedTo !== undefined) lead.assignedTo = updates.assignedTo ?? null;
    if (updates.status !== undefined) lead.status = updates.status;
    if (updates.tags !== undefined) lead.tags = updates.tags;

    lead.updatedAt = new Date().toISOString();

    res.json({ data: lead });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/:id – Soft delete lead
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = mockLeads.find(
      (l) => l.id === req.params.id && l.deletedAt === null,
    );

    if (!lead) {
      throw new AppError('Lead nicht gefunden', 404);
    }

    lead.deletedAt = new Date().toISOString();
    lead.updatedAt = lead.deletedAt;

    res.json({ message: 'Lead erfolgreich geloescht' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/leads/:id/tags – Add tags to lead
// ---------------------------------------------------------------------------

router.post('/:id/tags', (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = mockLeads.find(
      (l) => l.id === req.params.id && l.deletedAt === null,
    );

    if (!lead) {
      throw new AppError('Lead nicht gefunden', 404);
    }

    const result = addTagsSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    // Add only tags that are not already on the lead
    for (const tagId of result.data.tagIds) {
      if (!lead.tags.includes(tagId)) {
        lead.tags.push(tagId);
      }
    }

    lead.updatedAt = new Date().toISOString();

    res.json({ data: lead });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/:id/tags/:tagId – Remove tag from lead
// ---------------------------------------------------------------------------

router.delete(
  '/:id/tags/:tagId',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = mockLeads.find(
        (l) => l.id === req.params.id && l.deletedAt === null,
      );

      if (!lead) {
        throw new AppError('Lead nicht gefunden', 404);
      }

      const tagId = req.params.tagId as string;
      const tagIndex = lead.tags.indexOf(tagId);

      if (tagIndex === -1) {
        throw new AppError('Tag nicht auf diesem Lead vorhanden', 404);
      }

      lead.tags.splice(tagIndex, 1);
      lead.updatedAt = new Date().toISOString();

      res.json({ data: lead });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /api/v1/leads/:id/move – Move lead to different bucket
// ---------------------------------------------------------------------------

router.put('/:id/move', (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = mockLeads.find(
      (l) => l.id === req.params.id && l.deletedAt === null,
    );

    if (!lead) {
      throw new AppError('Lead nicht gefunden', 404);
    }

    const result = moveLeadSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    lead.bucketId = result.data.bucketId;
    lead.updatedAt = new Date().toISOString();

    res.json({ data: lead });
  } catch (err) {
    next(err);
  }
});

export default router;
