import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectPhase = 'admin' | 'montage' | 'elektro' | 'abschluss';
type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface PhaseProgress {
  admin: number[];
  montage: number[];
  elektro: number[];
  abschluss: number[];
}

interface Kalkulation {
  soll: number;
  ist: number | null;
}

type ActivityType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';

interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  createdBy: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  kWp: number;
  value: number;
  address: string;
  phone: string;
  email: string;
  company: string | null;
  montagePartner: string;
  elektroPartner: string;
  projectManager: string;
  phase: ProjectPhase;
  priority: ProjectPriority;
  progress: PhaseProgress;
  risk: boolean;
  riskNote: string | null;
  startDate: string;
  kalkulation: Kalkulation;
  rating: number | null;
  leadId: string | null;
  appointmentId: string | null;
  dealId: string | null;
  notes: string | null;
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

// ---------------------------------------------------------------------------
// Phase definitions (shared with frontend via GET /phases)
// ---------------------------------------------------------------------------

const phaseDefinitions = [
  {
    id: 'admin',
    name: 'Administration',
    color: '#60A5FA',
    description: 'Vertrag, Bewilligungen, Bestellungen',
    steps: [
      'Vertrag unterschrieben',
      'Baugesuch geprüft',
      'Netzanmeldung EW',
      'Materialbestellung',
      'Liefertermin bestätigt',
      'Montagetermin koordiniert',
      'Gerüstfirma beauftragt',
      'Akonto-Rechnung',
    ],
  },
  {
    id: 'montage',
    name: 'Montage',
    color: '#FB923C',
    description: 'Gerüst, Module, Dacharbeiten',
    steps: [
      'Gerüst gestellt',
      'Dachzustand geprüft',
      'Unterkonstruktion',
      'Module verlegt',
      'DC-Leitungen',
      'Montage-Abnahme',
      'Gerüst abgebaut',
    ],
  },
  {
    id: 'elektro',
    name: 'Elektriker',
    color: '#F59E0B',
    description: 'Wechselrichter, Speicher, AC',
    steps: [
      'Wechselrichter',
      'Speicher installiert',
      'DC-Verkabelung',
      'AC-Anschluss',
      'Zählerkasten',
      'NIV Prüfung',
      'Monitoring',
      'Elektro-Abnahme',
    ],
  },
  {
    id: 'abschluss',
    name: 'Abschluss',
    color: '#34D399',
    description: 'Abnahme, Doku, Rechnung',
    steps: [
      'Inbetriebnahme',
      'EW Bestätigung',
      'Endabnahme Kunde',
      'Kundenzufriedenheit',
      'Anlagedoku',
      'Schlussrechnung',
      'Nachkalkulation',
      'Garantie archiviert',
    ],
  },
];

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

interface Partner {
  id: string;
  name: string;
  type: 'montage' | 'elektro';
  projects: number;
  avgDays: number;
  rating: number;
  onTimePercent: number;
  activeProjects: number;
}

const partners: Partner[] = [
  { id: 'p1', name: 'Green Montagen GmbH', type: 'montage', projects: 5, avgDays: 8.2, rating: 4.6, onTimePercent: 92, activeProjects: 3 },
  { id: 'p2', name: 'Solar Montagen Ost', type: 'montage', projects: 3, avgDays: 9.5, rating: 4.2, onTimePercent: 85, activeProjects: 2 },
  { id: 'p3', name: 'Elektro Bühler AG', type: 'elektro', projects: 5, avgDays: 4.8, rating: 4.7, onTimePercent: 95, activeProjects: 2 },
  { id: 'p4', name: 'ETS Elektro AG', type: 'elektro', projects: 3, avgDays: 5.5, rating: 4.3, onTimePercent: 88, activeProjects: 2 },
];

// ---------------------------------------------------------------------------
// UUID
// ---------------------------------------------------------------------------

let nextId = 9;
function projectId(): string {
  return `proj-${String(nextId++).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockProjects: Project[] = [
  {
    id: 'proj-001', name: 'Weber Holzbau', description: '10.5 kWp Dachanlage', kWp: 10.5, value: 38200,
    address: 'Industriestr. 8, 9015 St. Gallen', phone: '+41 71 234 56 78', email: 'info@weber-holz.ch', company: 'Weber Holzbau AG',
    montagePartner: 'Green Montagen GmbH', elektroPartner: 'Elektro Bühler AG', projectManager: 'T. Hofer',
    phase: 'admin', priority: 'MEDIUM',
    progress: { admin: [1,1,1,1,1,1,0,0], montage: [0,0,0,0,0,0,0], elektro: [0,0,0,0,0,0,0,0], abschluss: [0,0,0,0,0,0,0,0] },
    risk: false, riskNote: null, startDate: '2026-01-12', kalkulation: { soll: 28400, ist: null }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2026-01-10T09:00:00Z', updatedAt: '2026-03-01T10:00:00Z', completedAt: null, deletedAt: null,
  },
  {
    id: 'proj-002', name: 'Schmid Bau AG', description: '18 kWp Industrieanlage', kWp: 18, value: 67500,
    address: 'Gewerbeweg 44, 9200 Gossau', phone: '+41 71 345 67 89', email: 'bau@schmid.ch', company: 'Schmid Bau AG',
    montagePartner: 'Green Montagen GmbH', elektroPartner: 'Elektro Bühler AG', projectManager: 'T. Hofer',
    phase: 'montage', priority: 'MEDIUM',
    progress: { admin: [1,1,1,1,1,1,1,1], montage: [1,1,1,0,0,0,0], elektro: [0,0,0,0,0,0,0,0], abschluss: [0,0,0,0,0,0,0,0] },
    risk: false, riskNote: null, startDate: '2026-01-05', kalkulation: { soll: 48200, ist: 46800 }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2026-01-03T09:00:00Z', updatedAt: '2026-03-02T14:00:00Z', completedAt: null, deletedAt: null,
  },
  {
    id: 'proj-003', name: 'Ammann Holding', description: '30 kWp + Speicher', kWp: 30, value: 107500,
    address: 'Hauptstr. 12, 9430 St. Margrethen', phone: '+41 71 456 78 90', email: 'office@ammann.ch', company: 'Ammann Holding AG',
    montagePartner: 'Solar Montagen Ost', elektroPartner: 'Elektro Bühler AG', projectManager: 'L. Steiner',
    phase: 'montage', priority: 'HIGH',
    progress: { admin: [1,1,1,1,1,1,0,1], montage: [1,1,0,0,0,0,0], elektro: [0,0,0,0,0,0,0,0], abschluss: [0,0,0,0,0,0,0,0] },
    risk: true, riskNote: 'Lieferverzögerung Module – 2 Wochen Rückstand', startDate: '2025-12-15', kalkulation: { soll: 78500, ist: 82100 }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2025-12-13T09:00:00Z', updatedAt: '2026-03-03T08:00:00Z', completedAt: null, deletedAt: null,
  },
  {
    id: 'proj-004', name: 'Gerber Metallbau', description: '25 kWp + 2x Speicher', kWp: 25, value: 82300,
    address: 'Metallweg 6, 9000 St. Gallen', phone: '+41 71 567 89 01', email: 'info@gerber-metall.ch', company: 'Gerber Metallbau GmbH',
    montagePartner: 'Green Montagen GmbH', elektroPartner: 'ETS Elektro AG', projectManager: 'T. Hofer',
    phase: 'elektro', priority: 'MEDIUM',
    progress: { admin: [1,1,1,1,1,1,1,1], montage: [1,1,1,1,1,1,1], elektro: [1,1,1,0,0,0,0,0], abschluss: [0,0,0,0,0,0,0,0] },
    risk: false, riskNote: null, startDate: '2025-12-01', kalkulation: { soll: 59800, ist: 58200 }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2025-11-28T09:00:00Z', updatedAt: '2026-03-02T11:00:00Z', completedAt: null, deletedAt: null,
  },
  {
    id: 'proj-005', name: 'Zürcher Bau AG', description: '14 kWp + Speicher', kWp: 14, value: 48700,
    address: 'Baustr. 22, 9500 Wil', phone: '+41 71 678 90 12', email: 'info@zuercher.ch', company: 'Zürcher Bau AG',
    montagePartner: 'Green Montagen GmbH', elektroPartner: 'Elektro Bühler AG', projectManager: 'L. Steiner',
    phase: 'abschluss', priority: 'MEDIUM',
    progress: { admin: [1,1,1,1,1,1,1,1], montage: [1,1,1,1,1,1,1], elektro: [1,1,1,1,1,1,1,1], abschluss: [1,1,0,0,0,0,0,0] },
    risk: false, riskNote: null, startDate: '2025-11-15', kalkulation: { soll: 34500, ist: 33800 }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2025-11-13T09:00:00Z', updatedAt: '2026-03-04T10:00:00Z', completedAt: null, deletedAt: null,
  },
  {
    id: 'proj-006', name: 'Fischer Technik', description: '20 kWp Halle', kWp: 20, value: 58200,
    address: 'Technikstr. 3, 9015 St. Gallen', phone: '+41 71 789 01 23', email: 'technik@fischer.ch', company: 'Fischer Technik AG',
    montagePartner: 'Solar Montagen Ost', elektroPartner: 'ETS Elektro AG', projectManager: 'T. Hofer',
    phase: 'elektro', priority: 'MEDIUM',
    progress: { admin: [1,1,1,1,1,1,1,1], montage: [1,1,1,1,1,1,1], elektro: [1,1,1,1,1,0,0,0], abschluss: [0,0,0,0,0,0,0,0] },
    risk: false, riskNote: null, startDate: '2025-12-10', kalkulation: { soll: 42100, ist: 43500 }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2025-12-08T09:00:00Z', updatedAt: '2026-03-03T14:00:00Z', completedAt: null, deletedAt: null,
  },
  {
    id: 'proj-007', name: 'Roth Architektur', description: '10 kWp Neubau', kWp: 10, value: 37600,
    address: 'Planweg 1, 9200 Gossau', phone: '+41 71 890 12 34', email: 'plan@roth.ch', company: 'Roth Architektur GmbH',
    montagePartner: 'Green Montagen GmbH', elektroPartner: 'Elektro Bühler AG', projectManager: 'L. Steiner',
    phase: 'admin', priority: 'MEDIUM',
    progress: { admin: [1,1,0,0,0,0,0,0], montage: [0,0,0,0,0,0,0], elektro: [0,0,0,0,0,0,0,0], abschluss: [0,0,0,0,0,0,0,0] },
    risk: true, riskNote: 'Baubewilligung noch ausstehend', startDate: '2026-03-01', kalkulation: { soll: 27200, ist: null }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2026-02-28T09:00:00Z', updatedAt: '2026-03-04T10:00:00Z', completedAt: null, deletedAt: null,
  },
  {
    id: 'proj-008', name: 'Müller Garage', description: '12 kWp Flachdach', kWp: 12, value: 42100,
    address: 'Garagenstr. 5, 9014 St. Gallen', phone: '+41 71 111 22 33', email: 'info@mueller-garage.ch', company: 'Müller Garage AG',
    montagePartner: 'Solar Montagen Ost', elektroPartner: 'ETS Elektro AG', projectManager: 'T. Hofer',
    phase: 'admin', priority: 'LOW',
    progress: { admin: [1,1,1,1,0,0,0,0], montage: [0,0,0,0,0,0,0], elektro: [0,0,0,0,0,0,0,0], abschluss: [0,0,0,0,0,0,0,0] },
    risk: false, riskNote: null, startDate: '2026-02-20', kalkulation: { soll: 30500, ist: null }, rating: null,
    leadId: null, appointmentId: null, dealId: null, notes: null, activities: [], createdAt: '2026-02-18T09:00:00Z', updatedAt: '2026-03-02T10:00:00Z', completedAt: null, deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  kWp: z.number().min(0),
  value: z.number().min(0),
  address: z.string().min(1),
  phone: z.string().default(''),
  email: z.string().email(),
  company: z.string().optional(),
  montagePartner: z.string().default(''),
  elektroPartner: z.string().default(''),
  projectManager: z.string().default(''),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  startDate: z.string().optional(),
  leadId: z.string().optional(),
  appointmentId: z.string().optional(),
  dealId: z.string().optional(),
  notes: z.string().optional(),
  kalkulation: z.object({ soll: z.number(), ist: z.number().nullable() }).optional(),
  activities: z.array(z.object({
    type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM']),
    text: z.string(),
    createdBy: z.string(),
    createdAt: z.string(),
  })).optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  phase: z.enum(['admin', 'montage', 'elektro', 'abschluss']).optional(),
  risk: z.boolean().optional(),
  riskNote: z.string().nullable().optional(),
  progress: z.object({
    admin: z.array(z.number()),
    montage: z.array(z.number()),
    elektro: z.array(z.number()),
    abschluss: z.array(z.number()),
  }).optional(),
  rating: z.number().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeProgress(p: Project) {
  const all = Object.values(p.progress).flat();
  const total = all.length;
  const done = all.filter(Boolean).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

function determinePhase(p: Project): ProjectPhase {
  // Auto-determine based on progress
  const phases: ProjectPhase[] = ['admin', 'montage', 'elektro', 'abschluss'];
  for (let i = phases.length - 1; i >= 0; i--) {
    const arr = p.progress[phases[i]];
    if (arr.some(Boolean)) return phases[i];
  }
  return 'admin';
}

// ---------------------------------------------------------------------------
// GET /api/v1/projects – List with filtering
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phase, priority, risk, search, projectManager, sortBy = 'name', sortOrder = 'asc' } = req.query;

    let filtered = mockProjects.filter((p) => p.deletedAt === null);

    if (phase && typeof phase === 'string') filtered = filtered.filter((p) => p.phase === phase);
    if (priority && typeof priority === 'string') filtered = filtered.filter((p) => p.priority === priority);
    if (risk === 'true') filtered = filtered.filter((p) => p.risk);
    if (projectManager && typeof projectManager === 'string') filtered = filtered.filter((p) => p.projectManager === projectManager);
    if (search && typeof search === 'string') {
      const term = search.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(term) ||
        (p.company?.toLowerCase().includes(term) ?? false) ||
        p.address.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term),
      );
    }

    const sf = typeof sortBy === 'string' ? sortBy : 'name';
    const order = sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sf];
      const bVal = (b as unknown as Record<string, unknown>)[sf];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * order;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * order;
      return 0;
    });

    const enriched = filtered.map((p) => ({ ...p, ...computeProgress(p) }));
    res.json({ data: enriched, total: filtered.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/projects/phases – Phase definitions
// ---------------------------------------------------------------------------

router.get('/phases', (_req: Request, res: Response) => {
  res.json({ data: phaseDefinitions });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/projects/phases – Update phase definitions (Admin)
// ---------------------------------------------------------------------------

router.put('/phases', (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      phases: z.array(z.object({
        id: z.string(),
        name: z.string().min(1),
        color: z.string(),
        description: z.string(),
        steps: z.array(z.string()),
      })),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${msg}`, 422);
    }

    // Update phase definitions in place
    const incoming = result.data.phases;
    for (const updated of incoming) {
      const existing = phaseDefinitions.find((p) => p.id === updated.id);
      if (existing) {
        existing.name = updated.name;
        existing.color = updated.color;
        existing.description = updated.description;

        // Update progress arrays of existing projects if step count changed
        const oldStepCount = existing.steps.length;
        existing.steps = updated.steps;
        const newStepCount = updated.steps.length;

        if (oldStepCount !== newStepCount) {
          for (const project of mockProjects) {
            const arr = project.progress[updated.id as keyof typeof project.progress];
            if (arr) {
              if (newStepCount > oldStepCount) {
                // Add zeroes for new steps
                for (let i = oldStepCount; i < newStepCount; i++) {
                  arr.push(0);
                }
              } else {
                // Trim excess steps
                arr.length = newStepCount;
              }
            }
          }
        }
      }
    }

    res.json({ data: phaseDefinitions, message: 'Phasen aktualisiert' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/projects/partners – Partner list
// ---------------------------------------------------------------------------

router.get('/partners', (_req: Request, res: Response) => {
  res.json({ data: partners });
});

// ---------------------------------------------------------------------------
// GET /api/v1/projects/stats – Dashboard stats
// ---------------------------------------------------------------------------

router.get('/stats', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const active = mockProjects.filter((p) => p.deletedAt === null);
    const totalValue = active.reduce((s, p) => s + p.value, 0);
    const totalKwp = active.reduce((s, p) => s + p.kWp, 0);
    const avgProgress = active.reduce((s, p) => s + computeProgress(p).percent, 0) / (active.length || 1);
    const risks = active.filter((p) => p.risk);

    const byPhase: Record<ProjectPhase, { count: number; value: number }> = {
      admin: { count: 0, value: 0 },
      montage: { count: 0, value: 0 },
      elektro: { count: 0, value: 0 },
      abschluss: { count: 0, value: 0 },
    };
    for (const p of active) {
      byPhase[p.phase].count++;
      byPhase[p.phase].value += p.value;
    }

    // Kalkulation stats
    const withIst = active.filter((p) => p.kalkulation.ist !== null);
    const totalSoll = withIst.reduce((s, p) => s + p.kalkulation.soll, 0);
    const totalIst = withIst.reduce((s, p) => s + (p.kalkulation.ist ?? 0), 0);

    res.json({
      data: {
        total: active.length,
        totalValue,
        totalKwp,
        avgKwp: active.length ? totalKwp / active.length : 0,
        avgProgress: Math.round(avgProgress),
        risks: risks.length,
        byPhase,
        kalkulation: { totalSoll, totalIst, diff: totalIst - totalSoll },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:id
// ---------------------------------------------------------------------------

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = mockProjects.find((p) => p.id === req.params.id && p.deletedAt === null);
    if (!project) throw new AppError('Projekt nicht gefunden', 404);
    res.json({ data: { ...project, ...computeProgress(project) } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects – Create
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createProjectSchema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${msg}`, 422);
    }

    const d = result.data;
    const now = new Date().toISOString();
    const newProject: Project = {
      id: projectId(),
      name: d.name,
      description: d.description,
      kWp: d.kWp,
      value: d.value,
      address: d.address,
      phone: d.phone ?? '',
      email: d.email,
      company: d.company ?? null,
      montagePartner: d.montagePartner ?? '',
      elektroPartner: d.elektroPartner ?? '',
      projectManager: d.projectManager ?? '',
      phase: 'admin',
      priority: d.priority ?? 'MEDIUM',
      progress: {
        admin: phaseDefinitions.find((p) => p.id === 'admin')!.steps.map(() => 0),
        montage: phaseDefinitions.find((p) => p.id === 'montage')!.steps.map(() => 0),
        elektro: phaseDefinitions.find((p) => p.id === 'elektro')!.steps.map(() => 0),
        abschluss: phaseDefinitions.find((p) => p.id === 'abschluss')!.steps.map(() => 0),
      },
      risk: false,
      riskNote: null,
      startDate: d.startDate ?? now.slice(0, 10),
      kalkulation: d.kalkulation ?? { soll: 0, ist: null },
      rating: null,
      leadId: d.leadId ?? null,
      appointmentId: d.appointmentId ?? null,
      dealId: d.dealId ?? null,
      notes: d.notes ?? null,
      activities: (d.activities ?? []).map((a, i) => ({
        id: `pa-${String(activitySeq++).padStart(4, '0')}`,
        type: a.type as ActivityType,
        text: a.text,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
      })),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      deletedAt: null,
    };

    mockProjects.push(newProject);
    res.status(201).json({ data: { ...newProject, ...computeProgress(newProject) } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/projects/:id – Update
// ---------------------------------------------------------------------------

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = mockProjects.find((p) => p.id === req.params.id && p.deletedAt === null);
    if (!project) throw new AppError('Projekt nicht gefunden', 404);

    const result = updateProjectSchema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${msg}`, 422);
    }

    const u = result.data;
    if (u.name !== undefined) project.name = u.name;
    if (u.description !== undefined) project.description = u.description;
    if (u.kWp !== undefined) project.kWp = u.kWp;
    if (u.value !== undefined) project.value = u.value;
    if (u.address !== undefined) project.address = u.address;
    if (u.phone !== undefined) project.phone = u.phone;
    if (u.email !== undefined) project.email = u.email;
    if (u.company !== undefined) project.company = u.company ?? null;
    if (u.montagePartner !== undefined) project.montagePartner = u.montagePartner;
    if (u.elektroPartner !== undefined) project.elektroPartner = u.elektroPartner;
    if (u.projectManager !== undefined) project.projectManager = u.projectManager;
    if (u.phase !== undefined) project.phase = u.phase;
    if (u.priority !== undefined) project.priority = u.priority;
    if (u.progress !== undefined) project.progress = u.progress;
    if (u.risk !== undefined) project.risk = u.risk;
    if (u.riskNote !== undefined) project.riskNote = u.riskNote;
    if (u.startDate !== undefined) project.startDate = u.startDate;
    if (u.kalkulation !== undefined) project.kalkulation = u.kalkulation;
    if (u.rating !== undefined) project.rating = u.rating;
    if (u.notes !== undefined) project.notes = u.notes ?? null;

    project.updatedAt = new Date().toISOString();

    // Auto-detect phase from progress
    if (u.progress) {
      project.phase = determinePhase(project);
    }

    // Check if all steps done
    const prog = computeProgress(project);
    if (prog.percent === 100 && !project.completedAt) {
      project.completedAt = new Date().toISOString();
    } else if (prog.percent < 100) {
      project.completedAt = null;
    }

    res.json({ data: { ...project, ...prog } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/projects/:id/toggle-step – Toggle a checklist step
// ---------------------------------------------------------------------------

router.put('/:id/toggle-step', (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = mockProjects.find((p) => p.id === req.params.id && p.deletedAt === null);
    if (!project) throw new AppError('Projekt nicht gefunden', 404);

    const schema = z.object({
      phase: z.enum(['admin', 'montage', 'elektro', 'abschluss']),
      stepIndex: z.number().min(0),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) throw new AppError('Ungültige Daten', 400);

    const { phase, stepIndex } = result.data;
    const arr = project.progress[phase];
    if (stepIndex >= arr.length) throw new AppError('Ungültiger Schritt-Index', 400);

    arr[stepIndex] = arr[stepIndex] ? 0 : 1;
    project.updatedAt = new Date().toISOString();

    // Auto-detect phase
    project.phase = determinePhase(project);

    const prog = computeProgress(project);
    if (prog.percent === 100 && !project.completedAt) {
      project.completedAt = new Date().toISOString();
    } else if (prog.percent < 100) {
      project.completedAt = null;
    }

    res.json({ data: { ...project, ...prog } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/projects/:id – Soft delete
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = mockProjects.find((p) => p.id === req.params.id && p.deletedAt === null);
    if (!project) throw new AppError('Projekt nicht gefunden', 404);
    project.deletedAt = new Date().toISOString();
    project.updatedAt = project.deletedAt;
    res.json({ message: 'Projekt gelöscht' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:id/activities – Add activity
// ---------------------------------------------------------------------------

let activitySeq = 1;

router.post('/:id/activities', (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = mockProjects.find((p) => p.id === req.params.id && p.deletedAt === null);
    if (!project) throw new AppError('Projekt nicht gefunden', 404);

    const schema = z.object({
      type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM']).default('NOTE'),
      text: z.string().min(1),
      createdBy: z.string().default('System'),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) throw new AppError('Ungültige Daten', 400);

    const activity: Activity = {
      id: `pa-${String(activitySeq++).padStart(4, '0')}`,
      type: result.data.type,
      text: result.data.text,
      createdBy: result.data.createdBy,
      createdAt: new Date().toISOString(),
    };

    project.activities.push(activity);
    project.updatedAt = activity.createdAt;

    res.status(201).json({ data: activity });
  } catch (err) {
    next(err);
  }
});

export default router;
