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

  app.use(errorHandler)

  return app
}
