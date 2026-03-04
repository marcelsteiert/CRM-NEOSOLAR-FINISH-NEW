import { Router } from 'express'
import { randomUUID } from 'crypto'

const router = Router()

interface WebhookSource {
  id: string
  name: string
  sourceType: 'HOMEPAGE' | 'LANDINGPAGE' | 'PARTNER' | 'CUSTOM'
  endpointUrl: string
  secret: string
  isActive: boolean
  lastReceivedAt: string | null
  receivedCount: number
  createdAt: string
}

const webhooks: WebhookSource[] = [
  {
    id: 'wh-001', name: 'Homepage Kontaktformular', sourceType: 'HOMEPAGE',
    endpointUrl: '/api/v1/webhooks/incoming/wh-001',
    secret: 'whsec_abc123def456', isActive: true,
    lastReceivedAt: '2026-03-01T14:30:00Z', receivedCount: 47,
    createdAt: '2025-06-01T10:00:00Z',
  },
  {
    id: 'wh-002', name: 'Landingpage Solar-Rechner', sourceType: 'LANDINGPAGE',
    endpointUrl: '/api/v1/webhooks/incoming/wh-002',
    secret: 'whsec_xyz789ghi012', isActive: true,
    lastReceivedAt: '2026-03-03T09:15:00Z', receivedCount: 128,
    createdAt: '2025-08-15T10:00:00Z',
  },
  {
    id: 'wh-003', name: 'Partner: Dachdeckerei Schmid', sourceType: 'PARTNER',
    endpointUrl: '/api/v1/webhooks/incoming/wh-003',
    secret: 'whsec_prt456abc789', isActive: false,
    lastReceivedAt: null, receivedCount: 0,
    createdAt: '2025-11-20T10:00:00Z',
  },
]

router.get('/', (_req, res) => {
  res.json({ data: webhooks })
})

router.post('/', (req, res) => {
  const { name, sourceType } = req.body
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' })
  const id = `wh-${randomUUID().slice(0, 8)}`
  const webhook: WebhookSource = {
    id, name,
    sourceType: sourceType ?? 'CUSTOM',
    endpointUrl: `/api/v1/webhooks/incoming/${id}`,
    secret: `whsec_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    isActive: true,
    lastReceivedAt: null, receivedCount: 0,
    createdAt: new Date().toISOString(),
  }
  webhooks.push(webhook)
  res.status(201).json({ data: webhook })
})

router.put('/:id', (req, res) => {
  const idx = webhooks.findIndex((w) => w.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Webhook nicht gefunden' })
  const { name, isActive, sourceType } = req.body
  if (name !== undefined) webhooks[idx].name = name
  if (isActive !== undefined) webhooks[idx].isActive = isActive
  if (sourceType !== undefined) webhooks[idx].sourceType = sourceType
  res.json({ data: webhooks[idx] })
})

router.delete('/:id', (req, res) => {
  const idx = webhooks.findIndex((w) => w.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Webhook nicht gefunden' })
  webhooks.splice(idx, 1)
  res.json({ message: 'Webhook gelöscht' })
})

router.post('/:id/regenerate-secret', (req, res) => {
  const webhook = webhooks.find((w) => w.id === req.params.id)
  if (!webhook) return res.status(404).json({ error: 'Webhook nicht gefunden' })
  webhook.secret = `whsec_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  res.json({ data: webhook })
})

export default router
