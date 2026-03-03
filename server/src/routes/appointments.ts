import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppointmentStatus =
  | 'GEPLANT'
  | 'BESTAETIGT'
  | 'VORBEREITUNG'
  | 'DURCHGEFUEHRT'
  | 'ABGESAGT';

type AppointmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface Appointment {
  id: string;
  leadId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company: string | null;
  address: string;
  value: number;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  assignedTo: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  preparationNotes: string | null;
  checklist: ChecklistItem[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

// ---------------------------------------------------------------------------
// Default Checklist for new appointments
// ---------------------------------------------------------------------------

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'c1', label: 'Dach-Fotos/Bilder erhalten', checked: false },
  { id: 'c2', label: 'Dachflaeche & Ausrichtung berechnet', checked: false },
  { id: 'c3', label: 'kWp-Potenzial geschaetzt', checked: false },
  { id: 'c4', label: 'Stromverbrauch des Kunden analysiert', checked: false },
  { id: 'c5', label: 'Anfahrt geplant', checked: false },
  { id: 'c6', label: 'Offerte-Vorlage vorbereitet', checked: false },
  { id: 'c7', label: 'Technische Unterlagen zusammengestellt', checked: false },
  { id: 'c8', label: 'Kunde ueber Ablauf informiert', checked: false },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createAppointmentSchema = z.object({
  leadId: z.string().optional(),
  contactName: z.string().min(1, 'Kontaktname ist erforderlich'),
  contactEmail: z.string().email('Ungueltige E-Mail-Adresse'),
  contactPhone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  company: z.string().optional(),
  address: z.string().min(1, 'Adresse ist erforderlich'),
  value: z.number().min(0).optional(),
  status: z
    .enum(['GEPLANT', 'BESTAETIGT', 'VORBEREITUNG', 'DURCHGEFUEHRT', 'ABGESAGT'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  preparationNotes: z.string().optional(),
  notes: z.string().optional(),
});

const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  checklist: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        checked: z.boolean(),
      }),
    )
    .optional(),
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
// Mock Data – Swiss PV appointments
// ---------------------------------------------------------------------------

const mockAppointments: Appointment[] = [
  {
    id: uuid(),
    leadId: null,
    contactName: 'Martin Hofer',
    contactEmail: 'martin.hofer@bluewin.ch',
    contactPhone: '+41 44 567 89 01',
    company: null,
    address: 'Rosenweg 14, 8620 Wetzikon',
    value: 38000,
    status: 'GEPLANT',
    priority: 'MEDIUM',
    assignedTo: 'u001',
    appointmentDate: '2026-03-07',
    appointmentTime: '10:00',
    preparationNotes: 'EFH mit Satteldach, ca. 80m2 nutzbar. Kunde interessiert an Speicher.',
    checklist: [
      { id: 'c1', label: 'Dach-Fotos/Bilder erhalten', checked: true },
      { id: 'c2', label: 'Dachflaeche & Ausrichtung berechnet', checked: true },
      { id: 'c3', label: 'kWp-Potenzial geschaetzt', checked: false },
      { id: 'c4', label: 'Stromverbrauch des Kunden analysiert', checked: false },
      { id: 'c5', label: 'Anfahrt geplant', checked: true },
      { id: 'c6', label: 'Offerte-Vorlage vorbereitet', checked: false },
      { id: 'c7', label: 'Technische Unterlagen zusammengestellt', checked: false },
      { id: 'c8', label: 'Kunde ueber Ablauf informiert', checked: true },
    ],
    notes: 'Nachbar hat bereits PV – Kunde moechte vergleichbares System.',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-02T14:30:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    leadId: null,
    contactName: 'Beatrice Frei',
    contactEmail: 'b.frei@frei-immobilien.ch',
    contactPhone: '+41 31 456 78 90',
    company: 'Frei Immobilien AG',
    address: 'Bundesplatz 8, 3011 Bern',
    value: 125000,
    status: 'BESTAETIGT',
    priority: 'HIGH',
    assignedTo: 'u002',
    appointmentDate: '2026-03-05',
    appointmentTime: '14:00',
    preparationNotes: 'MFH mit 12 Wohneinheiten. Grosses Flachdach. EVG mit ZEV pruefen.',
    checklist: [
      { id: 'c1', label: 'Dach-Fotos/Bilder erhalten', checked: true },
      { id: 'c2', label: 'Dachflaeche & Ausrichtung berechnet', checked: true },
      { id: 'c3', label: 'kWp-Potenzial geschaetzt', checked: true },
      { id: 'c4', label: 'Stromverbrauch des Kunden analysiert', checked: true },
      { id: 'c5', label: 'Anfahrt geplant', checked: true },
      { id: 'c6', label: 'Offerte-Vorlage vorbereitet', checked: false },
      { id: 'c7', label: 'Technische Unterlagen zusammengestellt', checked: false },
      { id: 'c8', label: 'Kunde ueber Ablauf informiert', checked: true },
    ],
    notes: 'Eigentuemerversammlung hat PV-Projekt genehmigt. Budget vorhanden.',
    createdAt: '2026-02-25T10:15:00.000Z',
    updatedAt: '2026-03-02T11:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    leadId: null,
    contactName: 'Reto Ammann',
    contactEmail: 'reto@ammann-schreinerei.ch',
    contactPhone: '+41 62 345 67 89',
    company: 'Ammann Schreinerei AG',
    address: 'Industriestrasse 22, 4600 Olten',
    value: 68000,
    status: 'VORBEREITUNG',
    priority: 'MEDIUM',
    assignedTo: 'u001',
    appointmentDate: '2026-03-10',
    appointmentTime: '09:00',
    preparationNotes: 'Gewerbegebaeude mit grossem Satteldach. Eigenverbrauch optimieren.',
    checklist: [
      { id: 'c1', label: 'Dach-Fotos/Bilder erhalten', checked: true },
      { id: 'c2', label: 'Dachflaeche & Ausrichtung berechnet', checked: true },
      { id: 'c3', label: 'kWp-Potenzial geschaetzt', checked: true },
      { id: 'c4', label: 'Stromverbrauch des Kunden analysiert', checked: true },
      { id: 'c5', label: 'Anfahrt geplant', checked: true },
      { id: 'c6', label: 'Offerte-Vorlage vorbereitet', checked: true },
      { id: 'c7', label: 'Technische Unterlagen zusammengestellt', checked: true },
      { id: 'c8', label: 'Kunde ueber Ablauf informiert', checked: false },
    ],
    notes: 'Foerderbeitraege Kanton SO abklaeren. Kunde hat bereits 3 Offerten.',
    createdAt: '2026-02-20T08:45:00.000Z',
    updatedAt: '2026-03-03T08:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    leadId: null,
    contactName: 'Lisa Widmer',
    contactEmail: 'lisa.widmer@gmail.com',
    contactPhone: '+41 79 234 56 78',
    company: null,
    address: 'Sonnhaldenstrasse 3, 8200 Schaffhausen',
    value: 32000,
    status: 'DURCHGEFUEHRT',
    priority: 'MEDIUM',
    assignedTo: 'u002',
    appointmentDate: '2026-02-28',
    appointmentTime: '11:00',
    preparationNotes: 'EFH Neubau. Architektin empfiehlt Indach-Loesung.',
    checklist: [
      { id: 'c1', label: 'Dach-Fotos/Bilder erhalten', checked: true },
      { id: 'c2', label: 'Dachflaeche & Ausrichtung berechnet', checked: true },
      { id: 'c3', label: 'kWp-Potenzial geschaetzt', checked: true },
      { id: 'c4', label: 'Stromverbrauch des Kunden analysiert', checked: true },
      { id: 'c5', label: 'Anfahrt geplant', checked: true },
      { id: 'c6', label: 'Offerte-Vorlage vorbereitet', checked: true },
      { id: 'c7', label: 'Technische Unterlagen zusammengestellt', checked: true },
      { id: 'c8', label: 'Kunde ueber Ablauf informiert', checked: true },
    ],
    notes: 'Termin erfolgreich. Kundin moechte Offerte fuer 12kWp mit Speicher.',
    createdAt: '2026-02-18T14:30:00.000Z',
    updatedAt: '2026-02-28T15:00:00.000Z',
    completedAt: '2026-02-28T15:00:00.000Z',
    deletedAt: null,
  },
  {
    id: uuid(),
    leadId: null,
    contactName: 'Daniel Buergi',
    contactEmail: 'daniel.buergi@buergi-bau.ch',
    contactPhone: '+41 41 678 90 12',
    company: 'Buergi Bau GmbH',
    address: 'Zentralstrasse 15, 6003 Luzern',
    value: 185000,
    status: 'GEPLANT',
    priority: 'URGENT',
    assignedTo: 'u002',
    appointmentDate: '2026-03-04',
    appointmentTime: '08:30',
    preparationNotes: 'Gewerbebau 600m2 Flachdach. Moegliches Grossprojekt mit Folgeprojekten.',
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
    notes: 'CEO persoenlich. Schnelle Entscheidung erwartet.',
    createdAt: '2026-03-02T16:00:00.000Z',
    updatedAt: '2026-03-02T16:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
  {
    id: uuid(),
    leadId: null,
    contactName: 'Monika Kessler',
    contactEmail: 'monika@kessler-weine.ch',
    contactPhone: '+41 52 345 67 89',
    company: 'Kessler Weine',
    address: 'Rebbergstrasse 7, 8400 Winterthur',
    value: 45000,
    status: 'BESTAETIGT',
    priority: 'MEDIUM',
    assignedTo: 'u001',
    appointmentDate: '2026-03-06',
    appointmentTime: '15:30',
    preparationNotes: 'Weinkeller mit grossem Dach. Interesse an Eigenverbrauchsoptimierung.',
    checklist: [
      { id: 'c1', label: 'Dach-Fotos/Bilder erhalten', checked: true },
      { id: 'c2', label: 'Dachflaeche & Ausrichtung berechnet', checked: false },
      { id: 'c3', label: 'kWp-Potenzial geschaetzt', checked: false },
      { id: 'c4', label: 'Stromverbrauch des Kunden analysiert', checked: true },
      { id: 'c5', label: 'Anfahrt geplant', checked: true },
      { id: 'c6', label: 'Offerte-Vorlage vorbereitet', checked: false },
      { id: 'c7', label: 'Technische Unterlagen zusammengestellt', checked: false },
      { id: 'c8', label: 'Kunde ueber Ablauf informiert', checked: false },
    ],
    notes: null,
    createdAt: '2026-02-28T11:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
    completedAt: null,
    deletedAt: null,
  },
];

// ---------------------------------------------------------------------------
// GET /api/v1/appointments – List with filtering & pagination
// ---------------------------------------------------------------------------

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, assignedTo, search, page: pp, pageSize: psp, sortBy = 'appointmentDate', sortOrder = 'asc' } =
      req.query;

    let filtered = mockAppointments.filter((a) => a.deletedAt === null);

    if (status && typeof status === 'string') {
      filtered = filtered.filter((a) => a.status === status);
    }
    if (priority && typeof priority === 'string') {
      filtered = filtered.filter((a) => a.priority === priority);
    }
    if (assignedTo && typeof assignedTo === 'string') {
      filtered = filtered.filter((a) => a.assignedTo === assignedTo);
    }
    if (search && typeof search === 'string') {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.contactName.toLowerCase().includes(term) ||
          (a.company?.toLowerCase().includes(term) ?? false) ||
          a.address.toLowerCase().includes(term) ||
          a.contactEmail.toLowerCase().includes(term),
      );
    }

    // Sort
    const sf = typeof sortBy === 'string' ? sortBy : 'appointmentDate';
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
// GET /api/v1/appointments/stats
// ---------------------------------------------------------------------------

router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  try {
    let active = mockAppointments.filter((a) => a.deletedAt === null);
    const { assignedTo } = req.query;
    if (assignedTo && typeof assignedTo === 'string') {
      active = active.filter((a) => a.assignedTo === assignedTo);
    }

    const statuses: Record<AppointmentStatus, number> = {
      GEPLANT: 0,
      BESTAETIGT: 0,
      VORBEREITUNG: 0,
      DURCHGEFUEHRT: 0,
      ABGESAGT: 0,
    };
    for (const a of active) statuses[a.status]++;

    const upcoming = active.filter(
      (a) => a.status !== 'DURCHGEFUEHRT' && a.status !== 'ABGESAGT',
    );
    const totalValue = upcoming.reduce((s, a) => s + a.value, 0);

    // Checklist completion
    const openWithChecklist = upcoming.filter((a) => a.checklist.length > 0);
    const totalItems = openWithChecklist.reduce((s, a) => s + a.checklist.length, 0);
    const checkedItems = openWithChecklist.reduce(
      (s, a) => s + a.checklist.filter((c) => c.checked).length,
      0,
    );

    res.json({
      data: {
        total: active.length,
        upcoming: upcoming.length,
        totalValue,
        statuses,
        completed: statuses.DURCHGEFUEHRT,
        cancelled: statuses.ABGESAGT,
        checklistProgress: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/appointments/:id
// ---------------------------------------------------------------------------

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const appt = mockAppointments.find((a) => a.id === req.params.id && a.deletedAt === null);
    if (!appt) throw new AppError('Termin nicht gefunden', 404);
    res.json({ data: appt });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/appointments – Create
// ---------------------------------------------------------------------------

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createAppointmentSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const now = new Date().toISOString();
    const newAppt: Appointment = {
      id: uuid(),
      leadId: result.data.leadId ?? null,
      contactName: result.data.contactName,
      contactEmail: result.data.contactEmail,
      contactPhone: result.data.contactPhone,
      company: result.data.company ?? null,
      address: result.data.address,
      value: result.data.value ?? 0,
      status: result.data.status ?? 'GEPLANT',
      priority: result.data.priority ?? 'MEDIUM',
      assignedTo: result.data.assignedTo ?? null,
      appointmentDate: result.data.appointmentDate ?? null,
      appointmentTime: result.data.appointmentTime ?? null,
      preparationNotes: result.data.preparationNotes ?? null,
      checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
      notes: result.data.notes ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      deletedAt: null,
    };

    mockAppointments.push(newAppt);
    res.status(201).json({ data: newAppt });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/appointments/:id – Update
// ---------------------------------------------------------------------------

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const appt = mockAppointments.find((a) => a.id === req.params.id && a.deletedAt === null);
    if (!appt) throw new AppError('Termin nicht gefunden', 404);

    const result = updateAppointmentSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validierungsfehler: ${messages}`, 422);
    }

    const u = result.data;
    if (u.contactName !== undefined) appt.contactName = u.contactName;
    if (u.contactEmail !== undefined) appt.contactEmail = u.contactEmail;
    if (u.contactPhone !== undefined) appt.contactPhone = u.contactPhone;
    if (u.company !== undefined) appt.company = u.company ?? null;
    if (u.address !== undefined) appt.address = u.address;
    if (u.value !== undefined) appt.value = u.value;
    if (u.priority !== undefined) appt.priority = u.priority;
    if (u.assignedTo !== undefined) appt.assignedTo = u.assignedTo ?? null;
    if (u.appointmentDate !== undefined) appt.appointmentDate = u.appointmentDate ?? null;
    if (u.appointmentTime !== undefined) appt.appointmentTime = u.appointmentTime ?? null;
    if (u.preparationNotes !== undefined) appt.preparationNotes = u.preparationNotes ?? null;
    if (u.notes !== undefined) appt.notes = u.notes ?? null;
    if (u.checklist !== undefined) appt.checklist = u.checklist;

    if (u.status !== undefined) {
      appt.status = u.status;
      if (u.status === 'DURCHGEFUEHRT' && !appt.completedAt) {
        appt.completedAt = new Date().toISOString();
      } else if (u.status !== 'DURCHGEFUEHRT') {
        appt.completedAt = null;
      }
    }

    appt.updatedAt = new Date().toISOString();
    res.json({ data: appt });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/appointments/:id – Soft delete
// ---------------------------------------------------------------------------

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const appt = mockAppointments.find((a) => a.id === req.params.id && a.deletedAt === null);
    if (!appt) throw new AppError('Termin nicht gefunden', 404);
    appt.deletedAt = new Date().toISOString();
    appt.updatedAt = appt.deletedAt;
    res.json({ message: 'Termin erfolgreich geloescht' });
  } catch (err) {
    next(err);
  }
});

export default router;
