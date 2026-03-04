import { Router } from 'express'

const router = Router()

interface Integration {
  id: string
  service: string
  displayName: string
  description: string
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  apiKey: string | null
  lastSyncAt: string | null
  icon: string
}

const integrations: Integration[] = [
  {
    id: 'int-001', service: 'OUTLOOK', displayName: 'Microsoft Outlook',
    description: 'E-Mail-Integration für Terminplanung und Kommunikation',
    status: 'DISCONNECTED', apiKey: null, lastSyncAt: null, icon: 'mail',
  },
  {
    id: 'int-002', service: '3CX', displayName: '3CX Telefonanlage',
    description: 'VoIP-Integration für Anrufprotokollierung',
    status: 'DISCONNECTED', apiKey: null, lastSyncAt: null, icon: 'phone',
  },
  {
    id: 'int-003', service: 'ZOOM', displayName: 'Zoom Meetings',
    description: 'Video-Meetings für Online-Termine erstellen',
    status: 'DISCONNECTED', apiKey: null, lastSyncAt: null, icon: 'video',
  },
  {
    id: 'int-004', service: 'BEXIO', displayName: 'Bexio',
    description: 'Buchhaltungs-Synchronisation für Rechnungen und Kontakte',
    status: 'DISCONNECTED', apiKey: null, lastSyncAt: null, icon: 'receipt',
  },
]

router.get('/', (_req, res) => {
  // Mask API keys in response
  const masked = integrations.map((i) => ({
    ...i,
    apiKey: i.apiKey ? `****${i.apiKey.slice(-4)}` : null,
  }))
  res.json({ data: masked })
})

router.put('/:id', (req, res) => {
  const idx = integrations.findIndex((i) => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Integration nicht gefunden' })
  const { apiKey, status } = req.body
  if (apiKey !== undefined) integrations[idx].apiKey = apiKey
  if (status !== undefined) integrations[idx].status = status
  if (apiKey && status !== 'ERROR') {
    integrations[idx].status = 'CONNECTED'
    integrations[idx].lastSyncAt = new Date().toISOString()
  }
  res.json({ data: { ...integrations[idx], apiKey: integrations[idx].apiKey ? `****${integrations[idx].apiKey!.slice(-4)}` : null } })
})

router.post('/:id/test', (req, res) => {
  const integration = integrations.find((i) => i.id === req.params.id)
  if (!integration) return res.status(404).json({ error: 'Integration nicht gefunden' })
  // Simulate test
  const success = !!integration.apiKey
  res.json({ success, message: success ? 'Verbindung erfolgreich' : 'Kein API-Key konfiguriert' })
})

export default router
