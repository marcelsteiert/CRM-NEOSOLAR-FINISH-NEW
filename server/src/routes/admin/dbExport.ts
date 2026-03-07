import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'

const router = Router()

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = ['contacts', 'leads', 'appointments', 'deals', 'projects', 'tasks', 'documents', 'users', 'activities']
    const counts: Record<string, number> = {}

    for (const table of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      counts[table] = count ?? 0
    }

    res.json({
      data: {
        ...counts,
        lastBackup: new Date().toISOString(),
        dbSize: 'Supabase managed',
      },
    })
  } catch (err) {
    next(err)
  }
})

router.get('/export/:entity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entity = req.params.entity as string
    const format = (req.query.format as string) ?? 'json'

    const validEntities = ['contacts', 'leads', 'appointments', 'deals', 'projects', 'tasks', 'users', 'activities']
    if (!validEntities.includes(entity)) {
      throw new AppError('Unbekannte Entitaet', 400)
    }

    const { data, error } = await supabase.from(entity).select('*')
    if (error) throw new AppError(error.message, 500)

    if (format === 'csv') {
      if (!data || data.length === 0) {
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`)
        return res.send('')
      }
      const headers = Object.keys(data[0])
      const csv = [
        headers.join(','),
        ...data.map((row: any) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
      ].join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`)
      return res.send(csv)
    }

    res.json({ data, total: data?.length ?? 0 })
  } catch (err) {
    next(err)
  }
})

router.get('/api-info', (_req: Request, res: Response) => {
  res.json({
    data: {
      baseUrl: '/api/v1',
      version: 'v1',
      database: 'Supabase (PostgreSQL)',
      endpoints: [
        'GET /contacts', 'GET /leads', 'GET /appointments', 'GET /deals',
        'GET /projects', 'GET /tasks', 'GET /users', 'GET /documents',
        'GET /settings', 'GET /pipelines', 'GET /tags', 'GET /activities',
      ],
    },
  })
})

export default router
