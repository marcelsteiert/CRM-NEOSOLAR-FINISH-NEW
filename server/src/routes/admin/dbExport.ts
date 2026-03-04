import { Router } from 'express'

const router = Router()

router.get('/stats', (_req, res) => {
  res.json({
    data: {
      leads: 15,
      appointments: 8,
      deals: 12,
      tasks: 24,
      documents: 31,
      users: 5,
      lastBackup: '2026-03-04T02:00:00Z',
      dbSize: '24.5 MB',
    },
  })
})

router.get('/export/:entity', (req, res) => {
  const { entity } = req.params
  const { format = 'json' } = req.query
  // Simulated export
  res.json({
    message: `Export von ${entity} als ${format} wird vorbereitet`,
    downloadUrl: `/api/v1/admin/db-export/download/${entity}.${format}`,
    estimatedRows: Math.floor(Math.random() * 50) + 5,
  })
})

router.get('/api-info', (_req, res) => {
  res.json({
    data: {
      baseUrl: 'http://localhost:3001/api/v1',
      version: 'v1',
      endpoints: [
        'GET /leads', 'GET /appointments', 'GET /deals', 'GET /tasks',
        'GET /users', 'GET /documents', 'GET /settings', 'GET /pipelines',
      ],
    },
  })
})

export default router
