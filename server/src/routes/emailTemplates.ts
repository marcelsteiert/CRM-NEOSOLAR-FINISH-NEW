import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// E-Mail-Templates bleiben vorerst in-memory (spaeter: Supabase)
// Diese werden selten geaendert und sind eher statisch.

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

const templates: EmailTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Erstanfrage Antwort',
    subject: 'Vielen Dank fuer Ihre Anfrage – NeoSolar AG',
    body: 'Guten Tag {{firstName}} {{lastName}},\n\nVielen Dank fuer Ihr Interesse an einer Solaranlage. Wir freuen uns, Sie persoenlich beraten zu duerfen.\n\nGerne vereinbaren wir einen unverbindlichen Beratungstermin. Wann passt es Ihnen am besten?\n\nFreundliche Gruesse\nNeoSolar AG',
  },
  {
    id: 'tpl-002',
    name: 'Offerte Begleitschreiben',
    subject: 'Ihre individuelle Offerte – NeoSolar AG',
    body: 'Guten Tag {{firstName}} {{lastName}},\n\nAnbei erhalten Sie unsere massgeschneiderte Offerte fuer Ihre Solaranlage.\n\nDie wichtigsten Eckdaten:\n- Anlageleistung: {{leistung}}\n- Investition: {{preis}}\n- Geschaetzte Amortisation: {{amortisation}}\n\nBei Fragen stehen wir Ihnen jederzeit zur Verfuegung.\n\nFreundliche Gruesse\nNeoSolar AG',
  },
  {
    id: 'tpl-003',
    name: 'Nachfassen',
    subject: 'Rueckmeldung zu unserer Offerte – NeoSolar AG',
    body: 'Guten Tag {{firstName}} {{lastName}},\n\nWir moechten uns kurz erkundigen, ob Sie unsere Offerte erhalten haben und ob noch Fragen offen sind.\n\nGerne besprechen wir alles in einem kurzen Telefonat oder vor Ort.\n\nFreundliche Gruesse\nNeoSolar AG',
  },
  {
    id: 'tpl-004',
    name: 'Terminbestaetigung',
    subject: 'Bestaetigung Ihres Termins – NeoSolar AG',
    body: 'Guten Tag {{firstName}} {{lastName}},\n\nHiermit bestaetigen wir unseren Termin am {{datum}} um {{uhrzeit}}.\n\nAdresse: {{adresse}}\n\nWir freuen uns auf das Gespraech.\n\nFreundliche Gruesse\nNeoSolar AG',
  },
]

// GET /api/v1/email-templates/templates
router.get('/templates', (_req: Request, res: Response) => {
  res.json({ data: templates })
})

// POST /api/v1/email-templates/send
const sendEmailSchema = z.object({
  leadId: z.string(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  templateId: z.string().optional(),
  sentBy: z.string().optional(),
})

router.post('/send', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = sendEmailSchema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    // In production: send via SMTP/Microsoft Graph/etc.
    res.status(201).json({
      data: {
        id: crypto.randomUUID(),
        ...result.data,
        sentAt: new Date().toISOString(),
      },
      message: 'E-Mail versendet',
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/email-templates/sent (placeholder)
router.get('/sent', (_req: Request, res: Response) => {
  res.json({ data: [] })
})

export default router
