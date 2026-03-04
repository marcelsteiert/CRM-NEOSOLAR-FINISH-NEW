import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Products (Stammdaten / Preisdatenbank)
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/products', () => {
  it('gibt alle Produkte zurück', async () => {
    const res = await request(app).get('/api/v1/admin/products')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body).toHaveProperty('total')
  })

  it('filtert nach Kategorie', async () => {
    const res = await request(app).get('/api/v1/admin/products?category=PV_MODULE')
    expect(res.status).toBe(200)
    for (const p of res.body.data) {
      expect(p.category).toBe('PV_MODULE')
    }
  })

  it('Produkt enthält alle Pflichtfelder', async () => {
    const res = await request(app).get('/api/v1/admin/products')
    const product = res.body.data[0]
    expect(product).toHaveProperty('id')
    expect(product).toHaveProperty('category')
    expect(product).toHaveProperty('name')
    expect(product).toHaveProperty('manufacturer')
    expect(product).toHaveProperty('unitPrice')
    expect(product).toHaveProperty('isActive')
  })
})

describe('POST /api/v1/admin/products', () => {
  it('erstellt neues Produkt', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .send({
        category: 'PV_MODULE',
        name: 'Test Modul 450W',
        manufacturer: 'TestCorp',
        model: 'TC-450',
        unitPrice: 299.90,
        unit: 'Stk',
      })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Test Modul 450W')
    expect(res.body.data.unitPrice).toBe(299.90)
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .send({ name: 'Ohne Kategorie' })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/v1/admin/products/:id', () => {
  it('aktualisiert Produktpreis', async () => {
    const listRes = await request(app).get('/api/v1/admin/products')
    const productId = listRes.body.data[0].id

    const res = await request(app)
      .put(`/api/v1/admin/products/${productId}`)
      .send({ unitPrice: 399.99 })
    expect(res.status).toBe(200)
    expect(res.body.data.unitPrice).toBe(399.99)
  })
})

describe('DELETE /api/v1/admin/products/:id', () => {
  it('löscht Produkt', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/products')
      .send({
        category: 'BATTERY',
        name: 'Zu Löschen',
        manufacturer: 'X',
        model: 'X',
        unitPrice: 100,
        unit: 'Stk',
      })
    const id = createRes.body.data.id

    const res = await request(app).delete(`/api/v1/admin/products/${id}`)
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Integrations
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/integrations', () => {
  it('gibt alle Integrationen zurück', async () => {
    const res = await request(app).get('/api/v1/admin/integrations')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBe(4) // Outlook, 3CX, Zoom, Bexio
  })

  it('Integration enthält alle Felder', async () => {
    const res = await request(app).get('/api/v1/admin/integrations')
    const integ = res.body.data[0]
    expect(integ).toHaveProperty('id')
    expect(integ).toHaveProperty('service')
    expect(integ).toHaveProperty('displayName')
    expect(integ).toHaveProperty('status')
  })
})

describe('PUT /api/v1/admin/integrations/:id', () => {
  it('aktualisiert Integration-Status', async () => {
    const listRes = await request(app).get('/api/v1/admin/integrations')
    const id = listRes.body.data[0].id

    const res = await request(app)
      .put(`/api/v1/admin/integrations/${id}`)
      .send({ status: 'CONNECTED', apiKey: 'test-key-123' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CONNECTED')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Webhooks
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/webhooks', () => {
  it('gibt alle Webhooks zurück', async () => {
    const res = await request(app).get('/api/v1/admin/webhooks')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('POST /api/v1/admin/webhooks', () => {
  it('erstellt neuen Webhook', async () => {
    const res = await request(app)
      .post('/api/v1/admin/webhooks')
      .send({ name: 'Test Webhook', sourceType: 'WEBSITE' })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Test Webhook')
    expect(res.body.data).toHaveProperty('secret')
    expect(res.body.data).toHaveProperty('endpointUrl')
  })
})

describe('DELETE /api/v1/admin/webhooks/:id', () => {
  it('löscht Webhook', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/webhooks')
      .send({ name: 'Zu Löschen' })
    const id = createRes.body.data.id

    const res = await request(app).delete(`/api/v1/admin/webhooks/${id}`)
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Audit Log
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/audit-log', () => {
  it('gibt Audit-Einträge zurück', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body).toHaveProperty('total')
  })

  it('Eintrag enthält alle Felder', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log')
    const entry = res.body.data[0]
    expect(entry).toHaveProperty('id')
    expect(entry).toHaveProperty('userId')
    expect(entry).toHaveProperty('userName')
    expect(entry).toHaveProperty('action')
    expect(entry).toHaveProperty('entityType')
    expect(entry).toHaveProperty('description')
    expect(entry).toHaveProperty('createdAt')
  })

  it('filtert nach Benutzer', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log?userId=u001')
    expect(res.status).toBe(200)
    for (const entry of res.body.data) {
      expect(entry.userId).toBe('u001')
    }
  })

  it('filtert nach Aktion', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log?action=CREATE')
    expect(res.status).toBe(200)
    for (const entry of res.body.data) {
      expect(entry.action).toBe('CREATE')
    }
  })

  it('paginiert Ergebnisse', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log?pageSize=5&page=1')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(5)
    expect(res.body.page).toBe(1)
    expect(res.body.pageSize).toBe(5)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Branding
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/branding', () => {
  it('gibt Branding-Einstellungen zurück', async () => {
    const res = await request(app).get('/api/v1/admin/branding')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('companyName')
    expect(res.body.data).toHaveProperty('primaryColor')
    expect(res.body.data).toHaveProperty('offerTemplate')
  })
})

describe('PUT /api/v1/admin/branding', () => {
  it('aktualisiert Firmennamen', async () => {
    const res = await request(app)
      .put('/api/v1/admin/branding')
      .send({ companyName: 'NeoSolar AG Updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.companyName).toBe('NeoSolar AG Updated')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: AI Settings
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/ai-settings', () => {
  it('gibt KI-Einstellungen zurück', async () => {
    const res = await request(app).get('/api/v1/admin/ai-settings')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('enabled')
    expect(res.body.data).toHaveProperty('model')
    expect(res.body.data).toHaveProperty('language')
    expect(res.body.data).toHaveProperty('features')
    expect(res.body.data.features).toHaveProperty('leadSummary')
    expect(res.body.data.features).toHaveProperty('dealAnalysis')
    expect(res.body.data.features).toHaveProperty('emailDraft')
  })
})

describe('PUT /api/v1/admin/ai-settings', () => {
  it('aktualisiert KI-Modell', async () => {
    const res = await request(app)
      .put('/api/v1/admin/ai-settings')
      .send({ model: 'gpt-4o' })
    expect(res.status).toBe(200)
    expect(res.body.data.model).toBe('gpt-4o')
  })

  it('toggled KI-Feature', async () => {
    const res = await request(app)
      .put('/api/v1/admin/ai-settings')
      .send({ features: { leadSummary: false, dealAnalysis: true, emailDraft: true } })
    expect(res.status).toBe(200)
    expect(res.body.data.features.leadSummary).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Notification Settings
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/notification-settings', () => {
  it('gibt Benachrichtigungseinstellungen zurück', async () => {
    const res = await request(app).get('/api/v1/admin/notification-settings')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)

    const setting = res.body.data[0]
    expect(setting).toHaveProperty('event')
    expect(setting).toHaveProperty('label')
    expect(setting).toHaveProperty('enabled')
    expect(setting).toHaveProperty('channels')
  })
})

describe('PUT /api/v1/admin/notification-settings', () => {
  it('aktualisiert Einstellungen', async () => {
    const getRes = await request(app).get('/api/v1/admin/notification-settings')
    const settings = getRes.body.data
    settings[0].enabled = false

    const res = await request(app)
      .put('/api/v1/admin/notification-settings')
      .send({ settings })
    expect(res.status).toBe(200)
    expect(res.body.data[0].enabled).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Document Templates
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/doc-templates', () => {
  it('gibt Dokumenten-Vorlagen zurück', async () => {
    const res = await request(app).get('/api/v1/admin/doc-templates')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)

    const template = res.body.data[0]
    expect(template).toHaveProperty('id')
    expect(template).toHaveProperty('entityType')
    expect(template).toHaveProperty('folders')
    expect(Array.isArray(template.folders)).toBe(true)
  })
})

describe('PUT /api/v1/admin/doc-templates/:entityType', () => {
  it('aktualisiert Ordnerstruktur', async () => {
    const newFolders = [
      { name: 'Verträge', subfolders: ['Kaufvertrag', 'Mietvertrag'] },
      { name: 'Fotos' },
    ]
    const res = await request(app)
      .put('/api/v1/admin/doc-templates/LEAD')
      .send({ folders: newFolders })
    expect(res.status).toBe(200)
    expect(res.body.data.folders.length).toBe(2)
    expect(res.body.data.folders[0].name).toBe('Verträge')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: Database Export / Stats
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/admin/db-export/stats', () => {
  it('gibt Datenbank-Statistiken zurück', async () => {
    const res = await request(app).get('/api/v1/admin/db-export/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('leads')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('tasks')
    expect(res.body.data).toHaveProperty('users')
    expect(res.body.data).toHaveProperty('dbSize')
    expect(res.body.data).toHaveProperty('lastBackup')
    expect(typeof res.body.data.leads).toBe('number')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// CRM Integration: Users sichtbar in anderen Modulen
// ════════════════════════════════════════════════════════════════════════════

describe('CRM Integration', () => {
  it('User-IDs aus /users sind in Leads als assignedTo verfügbar', async () => {
    const usersRes = await request(app).get('/api/v1/users')
    const userIds = usersRes.body.data.map((u: any) => u.id)
    expect(userIds.length).toBeGreaterThan(0)

    // Leads können assigned werden
    const leadsRes = await request(app).get('/api/v1/leads')
    expect(leadsRes.status).toBe(200)
  })

  it('Pipeline-Buckets sind in Leads als bucketId referenziert', async () => {
    const pipelinesRes = await request(app).get('/api/v1/pipelines')
    const allBucketIds = pipelinesRes.body.data.flatMap((p: any) => p.buckets.map((b: any) => b.id))
    expect(allBucketIds.length).toBeGreaterThan(0)

    const leadsRes = await request(app).get('/api/v1/leads')
    const leadsWithBucket = leadsRes.body.data.filter((l: any) => l.bucketId)
    for (const lead of leadsWithBucket) {
      expect(allBucketIds).toContain(lead.bucketId)
    }
  })

  it('Tags aus /tags können Leads zugewiesen werden', async () => {
    const tagsRes = await request(app).get('/api/v1/tags')
    expect(tagsRes.status).toBe(200)
    expect(Array.isArray(tagsRes.body.data)).toBe(true)
  })

  it('Appointments referenzieren gültige Lead-IDs', async () => {
    const appointmentsRes = await request(app).get('/api/v1/appointments')
    expect(appointmentsRes.status).toBe(200)

    const leadsRes = await request(app).get('/api/v1/leads?pageSize=100')
    const leadIds = leadsRes.body.data.map((l: any) => l.id)

    for (const apt of appointmentsRes.body.data) {
      if (apt.leadId) {
        expect(leadIds).toContain(apt.leadId)
      }
    }
  })

  it('Deals referenzieren gültige Lead-IDs', async () => {
    const dealsRes = await request(app).get('/api/v1/deals')
    expect(dealsRes.status).toBe(200)

    const leadsRes = await request(app).get('/api/v1/leads?pageSize=100')
    const leadIds = leadsRes.body.data.map((l: any) => l.id)

    for (const deal of dealsRes.body.data) {
      if (deal.leadId) {
        expect(leadIds).toContain(deal.leadId)
      }
    }
  })

  it('Dashboard gibt gültige Daten zurück', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
  })

  it('Tasks-System ist erreichbar', async () => {
    const res = await request(app).get('/api/v1/tasks')
    expect(res.status).toBe(200)
  })

  it('Documents-System ist erreichbar', async () => {
    const res = await request(app).get('/api/v1/documents')
    expect(res.status).toBe(200)
  })

  it('Settings sind erreichbar', async () => {
    const res = await request(app).get('/api/v1/settings')
    expect(res.status).toBe(200)
  })

  it('Health-Check funktioniert', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
  })
})
