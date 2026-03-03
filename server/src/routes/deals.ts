import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { getSettings } from './settings.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types – Angebote (ehemals Deals)
// ---------------------------------------------------------------------------

interface Activity {
  id: string;
  type: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';
  text: string;
  createdBy: string;
  createdAt: string;
}

interface Deal {
  id: string;
  title: string;
  leadId: string | null;
  appointmentId: string | null;
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
  winProbability: number | null;
  followUpDate: string | null;
  notes: string | null;
  tags: string[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  deletedAt: string | null;
}

type DealStage =
  | 'ERSTELLT'
  | 'GESENDET'
  | 'FOLLOW_UP'
  | 'VERHANDLUNG'
  | 'GEWONNEN'
  | 'VERLOREN';

type DealPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ---------------------------------------------------------------------------
// Follow-Up Regeln – dynamisch aus Settings
// ---------------------------------------------------------------------------

function getFollowUpRules(): Record<string, { maxDays: number; urgentMaxDays: number; message: string }> {
  const s = getSettings();
  const map: Record<string, { maxDays: number; urgentMaxDays: number; message: string }> = {};
  for (const r of s.followUpRules) {
    map[r.stage] = { maxDays: r.maxDays, urgentMaxDays: r.urgentMaxDays, message: r.message };
  }
  return map;
}

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

// Dismissed follow-ups tracking
interface DismissedFollowUp {
  id: string;
  followUpId: string;
  dealId: string;
  note: string;
  dismissedBy: string;
  dismissedAt: string;
}

const dismissedFollowUps: DismissedFollowUp[] = [];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const STAGES: [string, ...string[]] = [
  'ERSTELLT',
  'GESENDET',
  'FOLLOW_UP',
  'VERHANDLUNG',
  'GEWONNEN',
  'VERLOREN',
];

const createDealSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  leadId: z.string().optional(),
  appointmentId: z.string().optional(),
  contactName: z.string().min(1, 'Kontaktname ist erforderlich'),
  contactEmail: z.string().email('Ungueltige E-Mail-Adresse'),
  contactPhone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  company: z.string().optional(),
  address: z.string().min(1, 'Adresse ist erforderlich'),
  value: z.number().min(0).optional(),
  stage: z.enum(STAGES as [string, ...string[]]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  winProbability: z.number().min(0).max(100).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateDealSchema = createDealSchema.partial();

const addActivitySchema = z.object({
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM']).optional().default('NOTE'),
  text: z.string().min(1, 'Aktivitaetstext ist erforderlich'),
  createdBy: z.string().optional().default('u001'),
});

const dismissFollowUpSchema = z.object({
  note: z.string().min(1, 'Begruendung ist erforderlich'),
  dismissedBy: z.string().optional().default('u001'),
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
// Mock Data – Swiss PV Angebote
// ---------------------------------------------------------------------------

const mockDeals: Deal[] = [
  {
    id: uuid(),
    title: 'Offerte 15kWp EFH Mueller',
    leadId: null,
    appointmentId: null,
    contactName: 'Hans Mueller',
    contactEmail: 'hans.mueller@mueller-elektro.ch',
    contactPhone: '+41 44 123 45 67',
    company: 'Mueller Elektro AG',
    address: 'Bahnhofstrasse 12, 8001 Zuerich',
    value: 42000,
    stage: 'GESENDET',
    priority: 'MEDIUM',
    assignedTo: 'u001',
    expectedCloseDate: '2026-04-15',
    winProbability: 40,
    followUpDate: '2026-03-05',
    notes: 'Offerte fuer 15kWp Anlage mit Speicher gesendet. Wartet auf Rueckmeldung.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u001', createdAt: '2026-02-20T10:30:00.000Z' },
      { id: uuid(), type: 'EMAIL', text: 'Offerte per E-Mail an Kunden gesendet', createdBy: 'u001', createdAt: '2026-02-21T09:00:00.000Z' },
      { id: uuid(), type: 'CALL', text: 'Telefonat: Kunde hat Fragen zur Speichergroesse', createdBy: 'u001', createdAt: '2026-02-28T14:00:00.000Z' },
    ],
    createdAt: '2026-02-20T10:30:00.000Z',
    updatedAt: '2026-02-28T14:00:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte Gewerbe-Flachdach Schneider',
    leadId: null,
    appointmentId: null,
    contactName: 'Anna Schneider',
    contactEmail: 'anna.schneider@schneider-solar.ch',
    contactPhone: '+41 31 234 56 78',
    company: 'Schneider Solar GmbH',
    address: 'Marktgasse 28, 3011 Bern',
    value: 85000,
    stage: 'VERHANDLUNG',
    priority: 'HIGH',
    assignedTo: 'u002',
    expectedCloseDate: '2026-03-30',
    winProbability: 70,
    followUpDate: '2026-03-04',
    notes: 'Verhandlung ueber Zahlungskonditionen. Finanzierung ueber Bank geplant.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u002', createdAt: '2026-02-18T09:15:00.000Z' },
      { id: uuid(), type: 'MEETING', text: 'Vor-Ort-Besichtigung: 500m2 Flachdach, gute Ausrichtung', createdBy: 'u002', createdAt: '2026-02-22T10:00:00.000Z' },
      { id: uuid(), type: 'NOTE', text: 'Kundin moechte Finanzierung ueber ZKB', createdBy: 'u002', createdAt: '2026-03-01T11:00:00.000Z' },
    ],
    createdAt: '2026-02-18T09:15:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte Industriedach Keller 450kWp',
    leadId: null,
    appointmentId: null,
    contactName: 'Thomas Keller',
    contactEmail: 'thomas.keller@keller-dach.ch',
    contactPhone: '+41 71 567 89 01',
    company: 'Keller Dachtechnik AG',
    address: 'Kirchgasse 17, 9000 St. Gallen',
    value: 210000,
    stage: 'VERHANDLUNG',
    priority: 'URGENT',
    assignedTo: 'u001',
    expectedCloseDate: '2026-03-20',
    winProbability: 85,
    followUpDate: '2026-03-04',
    notes: 'Grossprojekt 450kWp. Finanzierungsmodell muss noch geklaert werden.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u001', createdAt: '2026-02-10T08:00:00.000Z' },
      { id: uuid(), type: 'CALL', text: 'Verhandlung: Rabatt auf Module besprochen', createdBy: 'u001', createdAt: '2026-03-02T09:30:00.000Z' },
    ],
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-03-02T09:30:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte MFH-Sanierung Weber',
    leadId: null,
    appointmentId: null,
    contactName: 'Claudia Weber',
    contactEmail: 'claudia.weber@weber-immobilien.ch',
    contactPhone: '+41 52 456 78 90',
    company: 'Weber Immobilien',
    address: 'Technikumstrasse 9, 8400 Winterthur',
    value: 120000,
    stage: 'FOLLOW_UP',
    priority: 'HIGH',
    assignedTo: 'u002',
    expectedCloseDate: '2026-04-01',
    winProbability: 50,
    followUpDate: null,
    notes: 'Offerte gesendet. Eigentuemerversammlung muss noch zustimmen.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u002', createdAt: '2026-02-22T13:45:00.000Z' },
      { id: uuid(), type: 'EMAIL', text: 'Offerte an Verwaltung gesendet', createdBy: 'u002', createdAt: '2026-02-24T10:00:00.000Z' },
    ],
    createdAt: '2026-02-22T13:45:00.000Z',
    updatedAt: '2026-03-01T08:15:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte BIPV Neubau Zimmermann',
    leadId: null,
    appointmentId: null,
    contactName: 'Sandra Zimmermann',
    contactEmail: 'sandra.zimmermann@zp-architekten.ch',
    contactPhone: '+41 52 890 12 34',
    company: 'Zimmermann & Partner',
    address: 'Theaterstrasse 8, 8400 Winterthur',
    value: 150000,
    stage: 'ERSTELLT',
    priority: 'HIGH',
    assignedTo: 'u001',
    expectedCloseDate: '2026-05-15',
    winProbability: 30,
    followUpDate: null,
    notes: 'Architekturbuero plant Neubau mit BIPV. Offerte wird vorbereitet.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u001', createdAt: '2026-02-25T12:15:00.000Z' },
    ],
    createdAt: '2026-02-25T12:15:00.000Z',
    updatedAt: '2026-03-01T16:00:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte Partnerschaft Steiner',
    leadId: null,
    appointmentId: null,
    contactName: 'Markus Steiner',
    contactEmail: 'markus.steiner@steiner-hausbau.ch',
    contactPhone: '+41 44 901 23 45',
    company: 'Steiner Hausbau AG',
    address: 'Dufourstrasse 33, 8008 Zuerich',
    value: 95000,
    stage: 'ERSTELLT',
    priority: 'MEDIUM',
    assignedTo: 'u002',
    expectedCloseDate: '2026-06-01',
    winProbability: 20,
    followUpDate: null,
    notes: 'Rahmenvertrag fuer mehrere Objekte. Offerte in Vorbereitung.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u002', createdAt: '2026-02-28T09:00:00.000Z' },
    ],
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-03-02T10:30:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte Logistikzentrum Gerber 340kWp',
    leadId: null,
    appointmentId: null,
    contactName: 'Nicole Gerber',
    contactEmail: 'nicole.gerber@sunpower-solutions.ch',
    contactPhone: '+41 62 223 44 55',
    company: 'SunPower Solutions AG',
    address: 'Industriestrasse 14, 5000 Aarau',
    value: 340000,
    stage: 'GEWONNEN',
    priority: 'URGENT',
    assignedTo: 'u001',
    expectedCloseDate: '2026-03-15',
    winProbability: 100,
    followUpDate: null,
    notes: 'Vertrag unterschrieben! Projektstart KW12.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u001', createdAt: '2026-02-05T08:30:00.000Z' },
      { id: uuid(), type: 'MEETING', text: 'Vertragsverhandlung vor Ort', createdBy: 'u001', createdAt: '2026-03-01T10:00:00.000Z' },
      { id: uuid(), type: 'STATUS_CHANGE', text: 'Angebot GEWONNEN – Vertrag unterschrieben', createdBy: 'u001', createdAt: '2026-03-03T14:00:00.000Z' },
    ],
    createdAt: '2026-02-05T08:30:00.000Z',
    updatedAt: '2026-03-03T14:00:00.000Z',
    closedAt: '2026-03-03T14:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte Ueberbauung PV-Pflicht Bauer',
    leadId: null,
    appointmentId: null,
    contactName: 'Karin Bauer',
    contactEmail: 'karin.bauer@bauer-architektur.ch',
    contactPhone: '+41 61 889 00 11',
    company: 'Bauer Architektur',
    address: 'Rheinsprung 1, 4001 Basel',
    value: 180000,
    stage: 'VERHANDLUNG',
    priority: 'URGENT',
    assignedTo: 'u002',
    expectedCloseDate: '2026-03-25',
    winProbability: 60,
    followUpDate: '2026-03-05',
    notes: 'PV-Pflicht gemaess kantonalem Energiegesetz. Vertragsdetails werden finalisiert.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u002', createdAt: '2026-02-15T10:00:00.000Z' },
      { id: uuid(), type: 'NOTE', text: 'Kanton Basel verlangt PV-Pflicht bei Neubau', createdBy: 'u002', createdAt: '2026-02-20T14:00:00.000Z' },
    ],
    createdAt: '2026-02-15T10:00:00.000Z',
    updatedAt: '2026-03-02T17:45:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte EFH Brunner Satteldach',
    leadId: null,
    appointmentId: null,
    contactName: 'Peter Brunner',
    contactEmail: 'peter.brunner@bluewin.ch',
    contactPhone: '+41 61 345 67 89',
    company: null,
    address: 'Steinenvorstadt 5, 4051 Basel',
    value: 35000,
    stage: 'VERLOREN',
    priority: 'LOW',
    assignedTo: 'u001',
    expectedCloseDate: '2026-03-10',
    winProbability: 0,
    followUpDate: null,
    notes: 'Kunde hat sich fuer Konkurrenz entschieden. Preislich nicht konkurrenzfaehig.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u001', createdAt: '2026-02-12T08:00:00.000Z' },
      { id: uuid(), type: 'STATUS_CHANGE', text: 'Angebot VERLOREN – Konkurrenz guenstiger', createdBy: 'u001', createdAt: '2026-03-01T09:00:00.000Z' },
    ],
    createdAt: '2026-02-12T08:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
    closedAt: '2026-03-01T09:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte Hofer Solartechnik 25kWp',
    leadId: null,
    appointmentId: null,
    contactName: 'Eva Hofer',
    contactEmail: 'eva.hofer@hofer-solar.ch',
    contactPhone: '+41 41 101 22 33',
    company: 'Hofer Solartechnik',
    address: 'Pilatusstrasse 3, 6003 Luzern',
    value: 95000,
    stage: 'GEWONNEN',
    priority: 'MEDIUM',
    assignedTo: 'u002',
    expectedCloseDate: '2026-02-28',
    winProbability: 100,
    followUpDate: null,
    notes: 'Vertrag abgeschlossen. 25kWp Anlage. Uebergang zu Projekt.',
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u002', createdAt: '2026-01-15T08:00:00.000Z' },
      { id: uuid(), type: 'STATUS_CHANGE', text: 'Angebot GEWONNEN', createdBy: 'u002', createdAt: '2026-02-28T17:00:00.000Z' },
    ],
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-02-28T17:00:00.000Z',
    closedAt: '2026-02-28T17:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    title: 'Offerte Kessler Weine',
    leadId: null,
    appointmentId: null,
    contactName: 'Monika Kessler',
    contactEmail: 'monika@kessler-weine.ch',
    contactPhone: '+41 52 345 67 89',
    company: 'Kessler Weine',
    address: 'Rebbergstrasse 7, 8400 Winterthur',
    value: 45000,
    stage: 'ERSTELLT',
    priority: 'MEDIUM',
    assignedTo: 'u001',
    expectedCloseDate: null,
    winProbability: null,
    followUpDate: null,
    notes: null,
    tags: [],
    activities: [
      { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt (aus Termin konvertiert)', createdBy: 'u001', createdAt: '2026-03-03T10:00:00.000Z' },
    ],
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-03T10:00:00.000Z',
    closedAt: null,
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/deals – List
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage, priority, assignedTo, search, page: pp, pageSize: psp, sortBy = 'createdAt', sortOrder = 'desc' } =
      req.query;

    let filtered = mockDeals.filter((d) => d.deletedAt === null);

    if (stage && typeof stage === 'string') filtered = filtered.filter((d) => d.stage === stage);
    if (priority && typeof priority === 'string') filtered = filtered.filter((d) => d.priority === priority);
    if (assignedTo && typeof assignedTo === 'string') filtered = filtered.filter((d) => d.assignedTo === assignedTo);
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

    const sf = typeof sortBy === 'string' ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sf];
      const bVal = (b as unknown as Record<string, unknown>)[sf];
      if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * order;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * order;
      return 0;
    });

    const page = Math.max(1, Number(pp) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(psp) || 20));
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    res.json({ data: paginated, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/deals/stats (with weighted pipeline)
// ---------------------------------------------------------------------------

router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  try {
    let active = mockDeals.filter((d) => d.deletedAt === null);
    const { assignedTo } = req.query;
    if (assignedTo && typeof assignedTo === 'string') active = active.filter((d) => d.assignedTo === assignedTo);

    const stages: Record<DealStage, { count: number; value: number }> = {
      ERSTELLT: { count: 0, value: 0 },
      GESENDET: { count: 0, value: 0 },
      FOLLOW_UP: { count: 0, value: 0 },
      VERHANDLUNG: { count: 0, value: 0 },
      GEWONNEN: { count: 0, value: 0 },
      VERLOREN: { count: 0, value: 0 },
    };

    for (const deal of active) {
      stages[deal.stage].count++;
      stages[deal.stage].value += deal.value;
    }

    const totalValue = active.reduce((s, d) => s + d.value, 0);
    const openDeals = active.filter((d) => d.stage !== 'GEWONNEN' && d.stage !== 'VERLOREN');
    const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);

    // Weighted pipeline: sum of (value * winProbability / 100)
    const weightedPipelineValue = Math.round(
      openDeals.reduce((s, d) => s + d.value * ((d.winProbability ?? 50) / 100), 0),
    );

    res.json({
      data: {
        totalDeals: active.length,
        totalValue,
        pipelineValue,
        weightedPipelineValue,
        stages,
        avgDealValue: active.length > 0 ? Math.round(totalValue / active.length) : 0,
        wonDeals: stages.GEWONNEN.count,
        lostDeals: stages.VERLOREN.count,
        winRate:
          stages.GEWONNEN.count + stages.VERLOREN.count > 0
            ? Math.round((stages.GEWONNEN.count / (stages.GEWONNEN.count + stages.VERLOREN.count)) * 100)
            : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/deals/follow-ups
// ---------------------------------------------------------------------------

router.get('/follow-ups', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.query;
    const now = Date.now();

    const openDeals = mockDeals.filter(
      (d) => d.deletedAt === null && d.stage !== 'GEWONNEN' && d.stage !== 'VERLOREN',
    );

    const userDeals =
      assignedTo && typeof assignedTo === 'string'
        ? openDeals.filter((d) => d.assignedTo === assignedTo)
        : openDeals;

    // Get dismissed follow-up IDs
    const dismissedIds = new Set(dismissedFollowUps.map((df) => df.followUpId));

    const followUps: FollowUp[] = [];

    for (const deal of userDeals) {
      const rules = getFollowUpRules();
      const rule = rules[deal.stage];
      if (!rule) continue;

      const daysSinceUpdate = Math.floor((now - new Date(deal.updatedAt).getTime()) / 86400000);
      const maxDays =
        deal.priority === 'URGENT' || deal.priority === 'HIGH' ? rule.urgentMaxDays : rule.maxDays;

      if (daysSinceUpdate >= Math.ceil(maxDays * 0.5)) {
        const fuId = `fu-${deal.id}`;

        // Skip dismissed follow-ups
        if (dismissedIds.has(fuId)) continue;

        let urgency: FollowUp['urgency'] = 'WARNING';
        if (daysSinceUpdate >= maxDays * 2) urgency = 'CRITICAL';
        else if (daysSinceUpdate >= maxDays) urgency = 'OVERDUE';

        followUps.push({
          id: fuId,
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

    const urgencyOrder: Record<string, number> = { CRITICAL: 0, OVERDUE: 1, WARNING: 2 };
    followUps.sort((a, b) => {
      const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgDiff !== 0) return urgDiff;
      return b.value - a.value;
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
// POST /api/v1/deals/follow-ups/:id/dismiss – Dismiss with required note
// ---------------------------------------------------------------------------

router.post('/follow-ups/:id/dismiss', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = dismissFollowUpSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const followUpId = req.params.id as string;

    // Extract deal ID from follow-up ID (format: fu-{dealId})
    const dealId = (followUpId as string).replace(/^fu-/, '');
    const deal = mockDeals.find((d) => d.id === dealId && d.deletedAt === null);
    if (!deal) throw new AppError('Angebot nicht gefunden', 404);

    const dismissed: DismissedFollowUp = {
      id: uuid(),
      followUpId: followUpId as string,
      dealId: dealId as string,
      note: result.data.note,
      dismissedBy: result.data.dismissedBy,
      dismissedAt: new Date().toISOString(),
    };

    dismissedFollowUps.push(dismissed);

    // Add activity to deal
    deal.activities.push({
      id: uuid(),
      type: 'NOTE',
      text: `Follow-Up erledigt: ${result.data.note}`,
      createdBy: result.data.dismissedBy,
      createdAt: dismissed.dismissedAt,
    });

    // Update the deal's updatedAt to reset follow-up timer
    deal.updatedAt = dismissed.dismissedAt;

    res.json({ data: dismissed, message: 'Follow-Up erledigt' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/deals/:id
// ---------------------------------------------------------------------------

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = mockDeals.find((d) => d.id === req.params.id && d.deletedAt === null);
    if (!deal) throw new AppError('Angebot nicht gefunden', 404);
    res.json({ data: deal });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/deals – Create
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createDealSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const now = new Date().toISOString();
    const newDeal: Deal = {
      id: uuid(),
      title: result.data.title,
      leadId: result.data.leadId ?? null,
      appointmentId: result.data.appointmentId ?? null,
      contactName: result.data.contactName,
      contactEmail: result.data.contactEmail,
      contactPhone: result.data.contactPhone,
      company: result.data.company ?? null,
      address: result.data.address,
      value: result.data.value ?? 0,
      stage: (result.data.stage as DealStage) ?? 'ERSTELLT',
      priority: result.data.priority ?? 'MEDIUM',
      assignedTo: result.data.assignedTo ?? null,
      expectedCloseDate: result.data.expectedCloseDate ?? null,
      winProbability: result.data.winProbability ?? null,
      followUpDate: result.data.followUpDate ?? null,
      notes: result.data.notes ?? null,
      tags: result.data.tags ?? [],
      activities: [
        { id: uuid(), type: 'SYSTEM', text: 'Angebot erstellt', createdBy: 'u001', createdAt: now },
      ],
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
// POST /api/v1/deals/:id/activities – Add activity
// ---------------------------------------------------------------------------

router.post('/:id/activities', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = mockDeals.find((d) => d.id === req.params.id && d.deletedAt === null);
    if (!deal) throw new AppError('Angebot nicht gefunden', 404);

    const result = addActivitySchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const activity: Activity = {
      id: uuid(),
      type: result.data.type,
      text: result.data.text,
      createdBy: result.data.createdBy,
      createdAt: new Date().toISOString(),
    };

    deal.activities.push(activity);
    deal.updatedAt = activity.createdAt;

    res.status(201).json({ data: activity });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/deals/:id – Update
// ---------------------------------------------------------------------------

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = mockDeals.find((d) => d.id === req.params.id && d.deletedAt === null);
    if (!deal) throw new AppError('Angebot nicht gefunden', 404);

    const result = updateDealSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const u = result.data;
    if (u.title !== undefined) deal.title = u.title;
    if (u.leadId !== undefined) deal.leadId = u.leadId ?? null;
    if (u.appointmentId !== undefined) deal.appointmentId = u.appointmentId ?? null;
    if (u.contactName !== undefined) deal.contactName = u.contactName;
    if (u.contactEmail !== undefined) deal.contactEmail = u.contactEmail;
    if (u.contactPhone !== undefined) deal.contactPhone = u.contactPhone;
    if (u.company !== undefined) deal.company = u.company ?? null;
    if (u.address !== undefined) deal.address = u.address;
    if (u.value !== undefined) deal.value = u.value;
    if (u.priority !== undefined) deal.priority = u.priority;
    if (u.assignedTo !== undefined) deal.assignedTo = u.assignedTo ?? null;
    if (u.expectedCloseDate !== undefined) deal.expectedCloseDate = u.expectedCloseDate ?? null;
    if (u.winProbability !== undefined) deal.winProbability = u.winProbability ?? null;
    if (u.followUpDate !== undefined) deal.followUpDate = u.followUpDate ?? null;
    if (u.notes !== undefined) deal.notes = u.notes ?? null;
    if (u.tags !== undefined) deal.tags = u.tags;

    if (u.stage !== undefined) {
      const wasOpen = deal.stage !== 'GEWONNEN' && deal.stage !== 'VERLOREN';
      const isClosing = u.stage === 'GEWONNEN' || u.stage === 'VERLOREN';
      const oldStage = deal.stage;
      deal.stage = u.stage as DealStage;

      if (wasOpen && isClosing) {
        deal.closedAt = new Date().toISOString();
        deal.winProbability = u.stage === 'GEWONNEN' ? 100 : 0;
      } else if (!isClosing) {
        deal.closedAt = null;
      }

      // Auto-add stage change activity
      if (oldStage !== u.stage) {
        deal.activities.push({
          id: uuid(),
          type: 'STATUS_CHANGE',
          text: `Phase geaendert: ${oldStage} → ${u.stage}`,
          createdBy: 'u001',
          createdAt: new Date().toISOString(),
        });
      }
    }

    deal.updatedAt = new Date().toISOString();
    res.json({ data: deal });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/deals/:id – Soft delete
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = mockDeals.find((d) => d.id === req.params.id && d.deletedAt === null);
    if (!deal) throw new AppError('Angebot nicht gefunden', 404);
    deal.deletedAt = new Date().toISOString();
    deal.updatedAt = deal.deletedAt;
    res.json({ message: 'Angebot erfolgreich geloescht' });
  } catch (err) {
    next(err);
  }
});

export default router;
