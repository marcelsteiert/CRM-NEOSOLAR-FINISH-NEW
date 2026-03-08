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
import adminProductsRouter from './routes/admin/products.js'
import adminIntegrationsRouter from './routes/admin/integrations.js'
import adminWebhooksRouter from './routes/admin/webhooks.js'
import adminAuditLogRouter from './routes/admin/auditLog.js'
import adminBrandingRouter from './routes/admin/branding.js'
import adminAiSettingsRouter from './routes/admin/aiSettings.js'
import adminNotifSettingsRouter from './routes/admin/notifSettings.js'
import adminDocTemplatesRouter from './routes/admin/docTemplates.js'
import adminDbExportRouter from './routes/admin/dbExport.js'
import searchRouter from './routes/search.js'
import passwordsRouter from './routes/passwords.js'
import outlookRouter from './routes/outlook.js'
import { errorHandler } from './middleware/errorHandler.js'
import { mapKeys } from './lib/caseMapper.js'
import { authMiddleware } from './middleware/auth.js'

export function createApp() {
  const app = express()

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.CLIENT_URL,
  ].filter(Boolean) as string[]

  app.use(cors({
    origin: (origin, callback) => {
      // Kein Origin (z.B. Server-zu-Server, Postman) erlauben
      if (!origin) return callback(null, true)
      // Netlify Preview-Deployments + Custom Domain
      if (allowedOrigins.includes(origin) || origin.endsWith('.netlify.app')) {
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
  app.use('/api/v1/search', authMiddleware, searchRouter)
  app.use('/api/v1/passwords', authMiddleware, passwordsRouter)
  // Outlook: callback + tracking pixel sind oeffentlich, Rest braucht Auth
  app.use('/api/v1/outlook', (req, res, next) => {
    // Oeffentliche Pfade ohne Auth
    if (req.path === '/callback' || req.path.startsWith('/track/')) {
      return next()
    }
    return authMiddleware(req, res, next)
  }, outlookRouter)

  // Admin routes (geschuetzt)
  app.use('/api/v1/admin/products', authMiddleware, adminProductsRouter)
  app.use('/api/v1/admin/integrations', authMiddleware, adminIntegrationsRouter)
  app.use('/api/v1/admin/webhooks', authMiddleware, adminWebhooksRouter)
  app.use('/api/v1/admin/audit-log', authMiddleware, adminAuditLogRouter)
  app.use('/api/v1/admin/branding', authMiddleware, adminBrandingRouter)
  app.use('/api/v1/admin/ai-settings', authMiddleware, adminAiSettingsRouter)
  app.use('/api/v1/admin/notification-settings', authMiddleware, adminNotifSettingsRouter)
  app.use('/api/v1/admin/doc-templates', authMiddleware, adminDocTemplatesRouter)
  app.use('/api/v1/admin/db-export', authMiddleware, adminDbExportRouter)

  app.use(errorHandler)

  return app
}
