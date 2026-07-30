import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import healthRouter from './routes/health.js'
import contactsRouter from './routes/contacts.js'
import leadsRouter from './routes/leads.js'
import pipelinesRouter from './routes/pipelines.js'
import tagsRouter from './routes/tags.js'
import usersRouter from './routes/users.js'
import activitiesRouter from './routes/activities.js'
import remindersRouter from './routes/reminders.js'
import emailTemplatesRouter from './routes/emailTemplates.js'
import dealsRouter from './routes/deals.js'
import appointmentsRouter from './routes/appointments.js'
import settingsRouter from './routes/settings.js'
import tasksRouter from './routes/tasks.js'
import dashboardRouter from './routes/dashboard.js'
import documentsRouter from './routes/documents.js'
import projectsRouter from './routes/projects.js'
import personnelRouter from './routes/personnel.js'
import syncRouter from './routes/sync.js'
import adminProductsRouter from './routes/admin/products.js'
import adminIntegrationsRouter from './routes/admin/integrations.js'
import adminWebhooksRouter from './routes/admin/webhooks.js'
import adminAuditLogRouter from './routes/admin/auditLog.js'
import adminBrandingRouter from './routes/admin/branding.js'
import adminAiSettingsRouter from './routes/admin/aiSettings.js'
import adminNotifSettingsRouter from './routes/admin/notifSettings.js'
import adminLeadSourcesRouter from './routes/admin/leadSources.js'
import adminDocTemplatesRouter from './routes/admin/docTemplates.js'
import adminDbExportRouter from './routes/admin/dbExport.js'
import adminAppointmentKanbanRouter from './routes/admin/appointmentKanban.js'
import adminDealKanbanRouter from './routes/admin/dealKanban.js'
import adminNoShowKanbanRouter from './routes/admin/noShowKanban.js'
import adminProjectKanbanRouter from './routes/admin/projectKanban.js'
import adminProjectTrackingRouter from './routes/admin/projectTracking.js'
import adminDuplicatesRouter from './routes/admin/duplicates.js'
import adminCalculatorPricingRouter from './routes/admin/calculatorPricing.js'
import publicCalculatorRouter from './routes/publicCalculator.js'
import solarOfferRouter from './routes/solarOffer.js'
import followUpRouter from './routes/followUp.js'
import callcenterRouter from './routes/dashboard/callcenter.js'
import callLogsRouter from './routes/callLogs.js'
import searchRouter from './routes/search.js'
import aiRouter from './routes/ai.js'
import passwordsRouter from './routes/passwords.js'
import notificationsRouter from './routes/notifications.js'
import calendarRouter from './routes/calendar.js'
import outlookRouter from './routes/outlook.js'
import portalRouter from './routes/portal.js'
import adminPortalRouter from './routes/admin/portal.js'
import { errorHandler } from './middleware/errorHandler.js'
import { mapKeys } from './lib/caseMapper.js'
import { authMiddleware, requireRole } from './middleware/auth.js'

export function createApp() {
  const app = express()

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://neosolar-crm.com',
    'https://www.neosolar-crm.com',
    // Firmen-Homepage: bindet den oeffentlichen Solarrechner ein
    'https://neosolar.ch',
    'https://www.neosolar.ch',
    process.env.CLIENT_URL,
  ].filter(Boolean) as string[]

  app.use(cors({
    origin: (origin, callback) => {
      // Kein Origin (z.B. Server-zu-Server, Postman) erlauben
      if (!origin) return callback(null, true)
      // Custom Domains + Netlify Preview-Deployments
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.neosolar-crm.com') ||
        origin.endsWith('.neosolar.ch')
      ) {
        return callback(null, true)
      }
      callback(new Error('CORS nicht erlaubt'))
    },
    credentials: true,
  }))
  app.use(express.json({ limit: '50mb' }))

  // Auto-convert snake_case → camelCase in all JSON responses
  app.use((_req, res, next) => {
    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      return originalJson(mapKeys(body))
    }
    next()
  })

  // Oeffentliche Routes (kein Auth noetig)
  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1/health', healthRouter)
  // Kundenportal: eigener Auth-Layer (Magic Link), interne Auth siehe portal.ts
  app.use('/api/v1/portal', portalRouter)
  // Sync-Endpoints: eigener Token-Auth (Header X-Sync-Token)
  app.use('/api/v1/sync', syncRouter)
  // Automatisches Nachfassen: eigener Token-Auth (x-sync-token), von der
  // Netlify Scheduled Function taeglich aufgerufen
  app.use('/api/v1/follow-up', followUpRouter)
  // Solarrechner auf der Homepage: Preise lesen + Richtofferte anfragen
  app.use('/api/v1/public/calculator', publicCalculatorRouter)
  // Geschuetzte Routes (authMiddleware pro Route)
  app.use('/api/v1/contacts', authMiddleware, contactsRouter)
  app.use('/api/v1/leads', authMiddleware, leadsRouter)
  app.use('/api/v1/pipelines', authMiddleware, pipelinesRouter)
  app.use('/api/v1/tags', authMiddleware, tagsRouter)
  app.use('/api/v1/users', authMiddleware, usersRouter)
  app.use('/api/v1/activities', authMiddleware, activitiesRouter)
  app.use('/api/v1/reminders', authMiddleware, remindersRouter)
  app.use('/api/v1/emails', authMiddleware, emailTemplatesRouter)
  app.use('/api/v1/deals', authMiddleware, dealsRouter)
  app.use('/api/v1/appointments', authMiddleware, appointmentsRouter)
  app.use('/api/v1/settings', authMiddleware, settingsRouter)
  app.use('/api/v1/tasks', authMiddleware, tasksRouter)
  app.use('/api/v1/dashboard', authMiddleware, dashboardRouter)
  app.use('/api/v1/documents', authMiddleware, documentsRouter)
  app.use('/api/v1/projects', authMiddleware, projectsRouter)
  app.use('/api/v1/personnel', authMiddleware, personnelRouter)
  app.use('/api/v1/search', authMiddleware, searchRouter)
  // Offertenversand aus der Solarberatung (Mail ueber das Konto des Verkaeufers)
  app.use('/api/v1/solar-offer', authMiddleware, solarOfferRouter)
  app.use('/api/v1/passwords', authMiddleware, passwordsRouter)
  app.use('/api/v1/call-logs', authMiddleware, callLogsRouter)
  app.use('/api/v1/notifications', authMiddleware, notificationsRouter)
  app.use('/api/v1/calendar', authMiddleware, calendarRouter)
  // Outlook: callback + tracking pixel sind oeffentlich, Rest braucht Auth
  app.use('/api/v1/outlook', (req, res, next) => {
    // Oeffentliche Pfade ohne Auth
    if (req.path === '/callback' || req.path.startsWith('/track/')) {
      return next()
    }
    return authMiddleware(req, res, next)
  }, outlookRouter)

  // AI routes (geschuetzt)
  app.use('/api/v1/ai', authMiddleware, aiRouter)

  // Oeffentliche Read-Only Routen (alle authentifizierten User)
  app.use('/api/v1/lead-sources', authMiddleware, adminLeadSourcesRouter)
  app.use('/api/v1/integrations', authMiddleware, adminIntegrationsRouter)
  // Projekt-Kanban Spalten muessen von allen Usern lesbar sein
  // (Projektleitung + Vertrieb sehen sonst nur die 4 Standard-Phasen)
  app.use('/api/v1/project-kanban', authMiddleware, (req, res, next) => {
    if (req.method !== 'GET') {
      return res.status(403).json({ error: { message: 'Schreibzugriff nur fuer Admins' } })
    }
    next()
  }, adminProjectKanbanRouter)

  // Admin routes (geschuetzt + Rollencheck: nur ADMIN/GL)
  const adminGuard = [authMiddleware, requireRole('ADMIN', 'GL')]
  app.use('/api/v1/admin/products', ...adminGuard, adminProductsRouter)
  app.use('/api/v1/admin/integrations', ...adminGuard, adminIntegrationsRouter)
  app.use('/api/v1/admin/webhooks', ...adminGuard, adminWebhooksRouter)
  app.use('/api/v1/admin/audit-log', ...adminGuard, adminAuditLogRouter)
  app.use('/api/v1/admin/branding', ...adminGuard, adminBrandingRouter)
  app.use('/api/v1/admin/ai-settings', ...adminGuard, adminAiSettingsRouter)
  app.use('/api/v1/admin/notification-settings', ...adminGuard, adminNotifSettingsRouter)
  app.use('/api/v1/admin/lead-sources', ...adminGuard, adminLeadSourcesRouter)
  app.use('/api/v1/admin/doc-templates', ...adminGuard, adminDocTemplatesRouter)
  app.use('/api/v1/admin/db-export', ...adminGuard, adminDbExportRouter)
  app.use('/api/v1/admin/appointment-kanban', ...adminGuard, adminAppointmentKanbanRouter)
  app.use('/api/v1/admin/deal-kanban', ...adminGuard, adminDealKanbanRouter)
  app.use('/api/v1/admin/no-show-kanban', ...adminGuard, adminNoShowKanbanRouter)
  app.use('/api/v1/admin/project-kanban', ...adminGuard, adminProjectKanbanRouter)
  // Project-Tracking: authentifiziert; Modul-Check (baustellen/kalkulation) macht der Router selbst
  app.use('/api/v1/admin/project-tracking', authMiddleware, adminProjectTrackingRouter)
  app.use('/api/v1/admin/duplicates', ...adminGuard, adminDuplicatesRouter)
  // Rechner-Preise: jeder Verkaeufer muss sie lesen koennen, aendern nur ADMIN/GL
  app.use(
    '/api/v1/admin/calculator-pricing',
    authMiddleware,
    (req, res, next) => {
      if (req.method === 'GET') return next()
      return requireRole('ADMIN', 'GL')(req, res, next)
    },
    adminCalculatorPricingRouter
  )
  // Portal-Routes: alle eingeloggten User (Verkaeufer + Projektleitung + Admin)
  // Der Frontend-Filter zeigt eh nur eigene Deals; Datenzugriff ist auf
  // Kontakt-Email begrenzt
  app.use('/api/v1/admin/portal', authMiddleware, adminPortalRouter)
  app.use('/api/v1/dashboard/callcenter', authMiddleware, callcenterRouter)

  app.use(errorHandler)

  return app
}
