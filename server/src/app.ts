import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
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
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
  app.use(express.json())

  // Routes
  app.use('/api/v1/health', healthRouter)
  app.use('/api/v1/leads', leadsRouter)
  app.use('/api/v1/pipelines', pipelinesRouter)
  app.use('/api/v1/tags', tagsRouter)
  app.use('/api/v1/users', usersRouter)
  app.use('/api/v1/activities', activitiesRouter)
  app.use('/api/v1/reminders', remindersRouter)
  app.use('/api/v1/emails', emailTemplatesRouter)
  app.use('/api/v1/deals', dealsRouter)
  app.use('/api/v1/appointments', appointmentsRouter)
  app.use('/api/v1/settings', settingsRouter)
  app.use('/api/v1/tasks', tasksRouter)
  app.use('/api/v1/dashboard', dashboardRouter)
  app.use('/api/v1/documents', documentsRouter)
  app.use('/api/v1/projects', projectsRouter)

  // Admin routes
  app.use('/api/v1/admin/products', adminProductsRouter)
  app.use('/api/v1/admin/integrations', adminIntegrationsRouter)
  app.use('/api/v1/admin/webhooks', adminWebhooksRouter)
  app.use('/api/v1/admin/audit-log', adminAuditLogRouter)
  app.use('/api/v1/admin/branding', adminBrandingRouter)
  app.use('/api/v1/admin/ai-settings', adminAiSettingsRouter)
  app.use('/api/v1/admin/notification-settings', adminNotifSettingsRouter)
  app.use('/api/v1/admin/doc-templates', adminDocTemplatesRouter)
  app.use('/api/v1/admin/db-export', adminDbExportRouter)

  app.use(errorHandler)

  return app
}
