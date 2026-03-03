import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

// ---------------------------------------------------------------------------
// In-memory settings store (later: DB)
// ---------------------------------------------------------------------------

export interface FollowUpRule {
  stage: string;
  maxDays: number;
  urgentMaxDays: number;
  message: string;
}

export interface ChecklistTemplate {
  id: string;
  label: string;
}

export interface AppSettings {
  followUpRules: FollowUpRule[];
  defaultFollowUpDays: number; // Default fuer neue Angebote
  checklistTemplate: ChecklistTemplate[];
  companyAddress: string; // Standort fuer Fahrzeit-Berechnung
}

const settings: AppSettings = {
  defaultFollowUpDays: 3,
  companyAddress: 'St. Margrethen',
  checklistTemplate: [
    { id: 'c1', label: 'Dach-Fotos/Bilder erhalten' },
    { id: 'c2', label: 'Dachflaeche & Ausrichtung berechnet' },
    { id: 'c3', label: 'kWp-Potenzial geschaetzt' },
    { id: 'c4', label: 'Stromverbrauch des Kunden analysiert' },
    { id: 'c5', label: 'Anfahrt geplant' },
    { id: 'c6', label: 'Offerte-Vorlage vorbereitet' },
    { id: 'c7', label: 'Technische Unterlagen zusammengestellt' },
    { id: 'c8', label: 'Kunde ueber Ablauf informiert' },
  ],
  followUpRules: [
    { stage: 'ERSTELLT', maxDays: 2, urgentMaxDays: 1, message: 'Angebot noch nicht gesendet – bitte finalisieren!' },
    { stage: 'GESENDET', maxDays: 3, urgentMaxDays: 1, message: 'Angebot wurde gesendet – Nachfassen beim Kunden!' },
    { stage: 'FOLLOW_UP', maxDays: 2, urgentMaxDays: 1, message: 'Follow-Up ueberfaellig – bitte sofort anrufen!' },
    { stage: 'VERHANDLUNG', maxDays: 3, urgentMaxDays: 1, message: 'Verhandlung laeuft – dranbleiben!' },
  ],
};

// Export for other routes to consume
export function getSettings(): AppSettings {
  return settings;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updateSettingsSchema = z.object({
  defaultFollowUpDays: z.number().min(1).max(30).optional(),
  companyAddress: z.string().min(1).optional(),
  checklistTemplate: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().min(1),
      }),
    )
    .optional(),
  followUpRules: z
    .array(
      z.object({
        stage: z.string(),
        maxDays: z.number().min(1).max(60),
        urgentMaxDays: z.number().min(1).max(60),
        message: z.string().min(1),
      }),
    )
    .optional(),
});

// ---------------------------------------------------------------------------
// GET /api/v1/settings – Read all settings
// ---------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ data: settings });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/settings – Update settings (Admin/GL only)
// ---------------------------------------------------------------------------

router.put('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateSettingsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
      return;
    }

    const u = result.data;
    if (u.defaultFollowUpDays !== undefined) {
      settings.defaultFollowUpDays = u.defaultFollowUpDays;
    }
    if (u.companyAddress !== undefined) {
      settings.companyAddress = u.companyAddress;
    }
    if (u.checklistTemplate !== undefined) {
      settings.checklistTemplate = u.checklistTemplate;
    }
    if (u.followUpRules !== undefined) {
      settings.followUpRules = u.followUpRules;
    }

    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
});

export default router;
