import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Deal {
  id: string;
  title: string;
  leadId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company: string | null;
  address: string;
  value: number;
  stage: DealStage;
  priority: DealPriority;
  assignedTo: string | null;
  expectedCloseDate: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  deletedAt: string | null;
}

type DealStage =
  | 'QUALIFICATION'
  | 'NEEDS_ANALYSIS'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

type DealPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ---------------------------------------------------------------------------
// Follow-Up Regeln: Max Tage pro Phase bevor Erinnerung ausgeloest wird
// ---------------------------------------------------------------------------

const FOLLOW_UP_RULES: Record<string, { maxDays: number; urgentMaxDays: number; message: string }> = {
  QUALIFICATION: { maxDays: 3, urgentMaxDays: 1, message: 'Kunde muss qualifiziert werden – bitte anrufen!' },
  NEEDS_ANALYSIS: { maxDays: 5, urgentMaxDays: 2, message: 'Bedarfsanalyse steht aus – Follow-Up noetig!' },
  PROPOSAL: { maxDays: 5, urgentMaxDays: 3, message: 'Offerte wurde gesendet – Nachfassen beim Kunden!' },
  NEGOTIATION: { maxDays: 3, urgentMaxDays: 1, message: 'Verhandlung laeuft – dranbleiben!' },
};

interface FollowUp {
  id: string;
  dealId: string;
  dealTitle: string;
  contactName: string;
  contactPhone: string;
  company: string | null;
  stage: DealStage;
  priority: DealPriority;
  value: number;
  assignedTo: string | null;
  daysSinceUpdate: number;
  maxDays: number;
  overdue: boolean;
  message: string;
  urgency: 'WARNING' | 'OVERDUE' | 'CRITICAL';
}

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const createDealSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  leadId: z.string().optional(),
  contactName: z.string().min(1, 'Kontaktname ist erforderlich'),
  contactEmail: z.string().email('Ungueltige E-Mail-Adresse'),
  contactPhone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  company: z.string().optional(),
  address: z.string().min(1, 'Adresse ist erforderlich'),
  value: z.number().min(0).optional(),
  stage: z
    .enum([
      'QUALIFICATION',
      'NEEDS_ANALYSIS',
      'PROPOSAL',
      'NEGOTIATION',
      'CLOSED_WON',
      'CLOSED_LOST',
    ])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateDealSchema = createDealSchema.partial();

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
// Mock Data – 10 realistic Swiss PV deals
// ---------------------------------------------------------------------------

const mockDeals: Deal[] = [
  {
    id: uuid(),
    title: 'PV-Anlage 15kWp EFH Mueller',
    leadId: null,
    contactName: 'Hans Mueller',
    contactEmail: 'hans.mueller@mueller-elektro.ch',
    contactPhone: '+41 44 123 45 67',
    company: 'Mueller Elektro AG',
    address: 'Bahnhofstrasse 12, 8001 Zuerich',
    value: 42000,
    stage: 'PROPOSAL',
    priority: 'MEDIUM',
    assignedTo: 'u001',
    expectedCloseDate: '2026-04-15',
    notes: 'Offerte fuer 15kWp Anlage mit Speicher erstellt. Wartet auf Rueckmeldung.',
    tags: [],
    createdAt: '2026-02-20T10:30:00.000Z',
    updatedAt: '2026-02-28T14:00:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Gewerbe-Flachdach 500m2 Schneider',
    leadId: null,
    contactName: 'Anna Schneider',
    contactEmail: 'anna.schneider@schneider-solar.ch',
    contactPhone: '+41 31 234 56 78',
    company: 'Schneider Solar GmbH',
    address: 'Marktgasse 28, 3011 Bern',
    value: 85000,
    stage: 'NEGOTIATION',
    priority: 'HIGH',
    assignedTo: 'u002',
    expectedCloseDate: '2026-03-30',
    notes: 'Verhandlung ueber Zahlungskonditionen. Finanzierung ueber Bank geplant.',
    tags: [],
    createdAt: '2026-02-18T09:15:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Industriedach Keller Dachtechnik',
    leadId: null,
    contactName: 'Thomas Keller',
    contactEmail: 'thomas.keller@keller-dach.ch',
    contactPhone: '+41 71 567 89 01',
    company: 'Keller Dachtechnik AG',
    address: 'Kirchgasse 17, 9000 St. Gallen',
    value: 210000,
    stage: 'NEGOTIATION',
    priority: 'URGENT',
    assignedTo: 'u001',
    expectedCloseDate: '2026-03-20',
    notes: 'Grossprojekt 450kWp. Finanzierungsmodell muss noch geklaert werden.',
    tags: [],
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-03-02T09:30:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'MFH-Sanierung Weber Winterthur',
    leadId: null,
    contactName: 'Claudia Weber',
    contactEmail: 'claudia.weber@weber-immobilien.ch',
    contactPhone: '+41 52 456 78 90',
    company: 'Weber Immobilien',
    address: 'Technikumstrasse 9, 8400 Winterthur',
    value: 120000,
    stage: 'PROPOSAL',
    priority: 'HIGH',
    assignedTo: 'u002',
    expectedCloseDate: '2026-04-01',
    notes: 'Offerte fuer MFH mit 8 Wohneinheiten. Eigentuemerversammlung steht an.',
    tags: [],
    createdAt: '2026-02-22T13:45:00.000Z',
    updatedAt: '2026-03-01T08:15:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Neubau PV-Integration Zimmermann',
    leadId: null,
    contactName: 'Sandra Zimmermann',
    contactEmail: 'sandra.zimmermann@zp-architekten.ch',
    contactPhone: '+41 52 890 12 34',
    company: 'Zimmermann & Partner',
    address: 'Theaterstrasse 8, 8400 Winterthur',
    value: 150000,
    stage: 'NEEDS_ANALYSIS',
    priority: 'HIGH',
    assignedTo: 'u001',
    expectedCloseDate: '2026-05-15',
    notes: 'Architekturbuero plant Neubau mit BIPV. Technische Analyse laeuft.',
    tags: [],
    createdAt: '2026-02-25T12:15:00.000Z',
    updatedAt: '2026-03-01T16:00:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Partnerschaft Steiner Hausbau',
    leadId: null,
    contactName: 'Markus Steiner',
    contactEmail: 'markus.steiner@steiner-hausbau.ch',
    contactPhone: '+41 44 901 23 45',
    company: 'Steiner Hausbau AG',
    address: 'Dufourstrasse 33, 8008 Zuerich',
    value: 95000,
    stage: 'QUALIFICATION',
    priority: 'MEDIUM',
    assignedTo: 'u002',
    expectedCloseDate: '2026-06-01',
    notes: 'Rahmenvertrag fuer mehrere Objekte pro Jahr diskutiert.',
    tags: [],
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-03-02T10:30:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Logistikzentrum Gerber 340kWp',
    leadId: null,
    contactName: 'Nicole Gerber',
    contactEmail: 'nicole.gerber@sunpower-solutions.ch',
    contactPhone: '+41 62 223 44 55',
    company: 'SunPower Solutions AG',
    address: 'Industriestrasse 14, 5000 Aarau',
    value: 340000,
    stage: 'CLOSED_WON',
    priority: 'URGENT',
    assignedTo: 'u001',
    expectedCloseDate: '2026-03-15',
    notes: 'Vertrag unterschrieben! Projektstart KW12.',
    tags: [],
    createdAt: '2026-02-05T08:30:00.000Z',
    updatedAt: '2026-03-03T14:00:00.000Z',
    closedAt: '2026-03-03T14:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Ueberbauung PV-Pflicht Bauer',
    leadId: null,
    contactName: 'Karin Bauer',
    contactEmail: 'karin.bauer@bauer-architektur.ch',
    contactPhone: '+41 61 889 00 11',
    company: 'Bauer Architektur',
    address: 'Rheinsprung 1, 4001 Basel',
    value: 180000,
    stage: 'NEGOTIATION',
    priority: 'URGENT',
    assignedTo: 'u002',
    expectedCloseDate: '2026-03-25',
    notes: 'PV-Pflicht gemaess kantonalem Energiegesetz. Vertragsdetails werden finalisiert.',
    tags: [],
    createdAt: '2026-02-15T10:00:00.000Z',
    updatedAt: '2026-03-02T17:45:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'EFH Brunner Satteldach',
    leadId: null,
    contactName: 'Peter Brunner',
    contactEmail: 'peter.brunner@bluewin.ch',
    contactPhone: '+41 61 345 67 89',
    company: null,
    address: 'Steinenvorstadt 5, 4051 Basel',
    value: 35000,
    stage: 'CLOSED_LOST',
    priority: 'LOW',
    assignedTo: 'u001',
    expectedCloseDate: '2026-03-10',
    notes: 'Kunde hat sich fuer Konkurrenz entschieden. Preislich nicht konkurrenzfaehig.',
    tags: [],
    createdAt: '2026-02-12T08:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
    closedAt: '2026-03-01T09:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Hofer Solartechnik 25kWp',
    leadId: null,
    contactName: 'Eva Hofer',
    contactEmail: 'eva.hofer@hofer-solar.ch',
    contactPhone: '+41 41 101 22 33',
    company: 'Hofer Solartechnik',
    address: 'Pilatusstrasse 3, 6003 Luzern',
    value: 95000,
    stage: 'CLOSED_WON',
    priority: 'MEDIUM',
    assignedTo: 'u002',
    expectedCloseDate: '2026-02-28',
    notes: 'Vertrag abgeschlossen. 25kWp Anlage installiert. Uebergang zu Projekt.',
    tags: [],
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-02-28T17:00:00.000Z',
    closedAt: '2026-02-28T17:00:00.000Z',
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/deals – List deals with filtering & pagination
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      stage,
      priority,
      assignedTo,
      search,
      page: pageParam,
      pageSize: pageSizeParam,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    let filtered = mockDeals.filter((d) => d.deletedAt === null);

    // Filter by stage
    if (stage && typeof stage === 'string') {
      filtered = filtered.filter((d) => d.stage === stage);
    }

    // Filter by priority
    if (priority && typeof priority === 'string') {
      filtered = filtered.filter((d) => d.priority === priority);
    }

    // Filter by assignedTo
    if (assignedTo && typeof assignedTo === 'string') {
      filtered = filtered.filter((d) => d.assignedTo === assignedTo);
    }

    // Full-text search
    if (search && typeof search === 'string') {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(term) ||
          d.contactName.toLowerCase().includes(term) ||
          (d.company?.toLowerCase().includes(term) ?? false) ||
          d.contactEmail.toLowerCase().includes(term) ||
          d.address.toLowerCase().includes(term),
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
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * order;
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
// GET /api/v1/deals/stats – Deal statistics
// ---------------------------------------------------------------------------

router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  try {
    let active = mockDeals.filter((d) => d.deletedAt === null);

    // Filter by assignedTo if specified
    const { assignedTo } = req.query;
    if (assignedTo && typeof assignedTo === 'string') {
      active = active.filter((d) => d.assignedTo === assignedTo);
    }

    const stages: Record<DealStage, { count: number; value: number }> = {
      QUALIFICATION: { count: 0, value: 0 },
      NEEDS_ANALYSIS: { count: 0, value: 0 },
      PROPOSAL: { count: 0, value: 0 },
      NEGOTIATION: { count: 0, value: 0 },
      CLOSED_WON: { count: 0, value: 0 },
      CLOSED_LOST: { count: 0, value: 0 },
    };

    for (const deal of active) {
      stages[deal.stage].count++;
      stages[deal.stage].value += deal.value;
    }

    const totalValue = active.reduce((sum, d) => sum + d.value, 0);
    const openDeals = active.filter(
      (d) => d.stage !== 'CLOSED_WON' && d.stage !== 'CLOSED_LOST',
    );
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);

    res.json({
      data: {
        totalDeals: active.length,
        totalValue,
        pipelineValue,
        stages,
        avgDealValue: active.length > 0 ? Math.round(totalValue / active.length) : 0,
        wonDeals: stages.CLOSED_WON.count,
        lostDeals: stages.CLOSED_LOST.count,
        winRate:
          stages.CLOSED_WON.count + stages.CLOSED_LOST.count > 0
            ? Math.round(
                (stages.CLOSED_WON.count /
                  (stages.CLOSED_WON.count + stages.CLOSED_LOST.count)) *
                  100,
              )
            : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/deals/follow-ups – Auto follow-up reminders
// Berechnet welche Deals nachgefasst werden muessen basierend auf Regeln
// ---------------------------------------------------------------------------

router.get('/follow-ups', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.query;
    const now = Date.now();

    const openDeals = mockDeals.filter(
      (d) =>
        d.deletedAt === null &&
        d.stage !== 'CLOSED_WON' &&
        d.stage !== 'CLOSED_LOST',
    );

    // Filter by user if specified
    const userDeals =
      assignedTo && typeof assignedTo === 'string'
        ? openDeals.filter((d) => d.assignedTo === assignedTo)
        : openDeals;

    const followUps: FollowUp[] = [];

    for (const deal of userDeals) {
      const rule = FOLLOW_UP_RULES[deal.stage];
      if (!rule) continue;

      const daysSinceUpdate = Math.floor(
        (now - new Date(deal.updatedAt).getTime()) / 86400000,
      );
      const maxDays =
        deal.priority === 'URGENT' || deal.priority === 'HIGH'
          ? rule.urgentMaxDays
          : rule.maxDays;

      // Nur Deals die mindestens 50% der maxDays erreicht haben
      if (daysSinceUpdate >= Math.ceil(maxDays * 0.5)) {
        let urgency: FollowUp['urgency'] = 'WARNING';
        if (daysSinceUpdate >= maxDays * 2) urgency = 'CRITICAL';
        else if (daysSinceUpdate >= maxDays) urgency = 'OVERDUE';

        followUps.push({
          id: `fu-${deal.id}`,
          dealId: deal.id,
          dealTitle: deal.title,
          contactName: deal.contactName,
          contactPhone: deal.contactPhone,
          company: deal.company,
          stage: deal.stage,
          priority: deal.priority,
          value: deal.value,
          assignedTo: deal.assignedTo,
          daysSinceUpdate,
          maxDays,
          overdue: daysSinceUpdate >= maxDays,
          message: rule.message,
          urgency,
        });
      }
    }

    // Sortiere: CRITICAL > OVERDUE > WARNING, dann nach Wert
    const urgencyOrder: Record<string, number> = {
      CRITICAL: 0,
      OVERDUE: 1,
      WARNING: 2,
    };
    followUps.sort((a, b) => {
      const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgDiff !== 0) return urgDiff;
      return b.value - a.value; // Hoechster Wert zuerst
    });

    res.json({
      data: followUps,
      total: followUps.length,
      critical: followUps.filter((f) => f.urgency === 'CRITICAL').length,
      overdue: followUps.filter((f) => f.urgency === 'OVERDUE').length,
      warning: followUps.filter((f) => f.urgency === 'WARNING').length,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/deals/:id – Get single deal
// ---------------------------------------------------------------------------

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = mockDeals.find(
      (d) => d.id === req.params.id && d.deletedAt === null,
    );

    if (!deal) {
      throw new AppError('Deal nicht gefunden', 404);
    }

    res.json({ data: deal });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/deals – Create new deal
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createDealSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const now = new Date().toISOString();
    const newDeal: Deal = {
      id: uuid(),
      title: result.data.title,
      leadId: result.data.leadId ?? null,
      contactName: result.data.contactName,
      contactEmail: result.data.contactEmail,
      contactPhone: result.data.contactPhone,
      company: result.data.company ?? null,
      address: result.data.address,
      value: result.data.value ?? 0,
      stage: result.data.stage ?? 'QUALIFICATION',
      priority: result.data.priority ?? 'MEDIUM',
      assignedTo: result.data.assignedTo ?? null,
      expectedCloseDate: result.data.expectedCloseDate ?? null,
      notes: result.data.notes ?? null,
      tags: result.data.tags ?? [],
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      deletedAt: null,
    };

    mockDeals.push(newDeal);

    res.status(201).json({ data: newDeal });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/deals/:id – Update deal
// ---------------------------------------------------------------------------

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = mockDeals.find(
      (d) => d.id === req.params.id && d.deletedAt === null,
    );

    if (!deal) {
      throw new AppError('Deal nicht gefunden', 404);
    }

    const result = updateDealSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const updates = result.data;

    if (updates.title !== undefined) deal.title = updates.title;
    if (updates.leadId !== undefined) deal.leadId = updates.leadId ?? null;
    if (updates.contactName !== undefined) deal.contactName = updates.contactName;
    if (updates.contactEmail !== undefined) deal.contactEmail = updates.contactEmail;
    if (updates.contactPhone !== undefined) deal.contactPhone = updates.contactPhone;
    if (updates.company !== undefined) deal.company = updates.company ?? null;
    if (updates.address !== undefined) deal.address = updates.address;
    if (updates.value !== undefined) deal.value = updates.value;
    if (updates.stage !== undefined) {
      const wasOpen =
        deal.stage !== 'CLOSED_WON' && deal.stage !== 'CLOSED_LOST';
      const isClosing =
        updates.stage === 'CLOSED_WON' || updates.stage === 'CLOSED_LOST';

      deal.stage = updates.stage;

      if (wasOpen && isClosing) {
        deal.closedAt = new Date().toISOString();
      } else if (!isClosing) {
        deal.closedAt = null;
      }
    }
    if (updates.priority !== undefined) deal.priority = updates.priority;
    if (updates.assignedTo !== undefined) deal.assignedTo = updates.assignedTo ?? null;
    if (updates.expectedCloseDate !== undefined)
      deal.expectedCloseDate = updates.expectedCloseDate ?? null;
    if (updates.notes !== undefined) deal.notes = updates.notes ?? null;
    if (updates.tags !== undefined) deal.tags = updates.tags;

    deal.updatedAt = new Date().toISOString();

    res.json({ data: deal });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/deals/:id – Soft delete deal
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = mockDeals.find(
      (d) => d.id === req.params.id && d.deletedAt === null,
    );

    if (!deal) {
      throw new AppError('Deal nicht gefunden', 404);
    }

    deal.deletedAt = new Date().toISOString();
    deal.updatedAt = deal.deletedAt;

    res.json({ message: 'Deal erfolgreich geloescht' });
  } catch (err) {
    next(err);
  }
});

export default router;
