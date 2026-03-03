import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/deals
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/deals', () => {
  it('gibt eine Liste von Angeboten zurueck', async () => {
    const res = await request(app).get('/api/v1/deals')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page')
    expect(res.body).toHaveProperty('pageSize')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('hat korrekte Angebots-Struktur', async () => {
    const res = await request(app).get('/api/v1/deals')
    const deal = res.body.data[0]
    expect(deal).toHaveProperty('id')
    expect(deal).toHaveProperty('title')
    expect(deal).toHaveProperty('contactName')
    expect(deal).toHaveProperty('contactEmail')
    expect(deal).toHaveProperty('contactPhone')
    expect(deal).toHaveProperty('address')
    expect(deal).toHaveProperty('value')
    expect(deal).toHaveProperty('stage')
    expect(deal).toHaveProperty('priority')
    expect(deal).toHaveProperty('tags')
    expect(deal).toHaveProperty('createdAt')
    expect(deal).toHaveProperty('updatedAt')
    expect(Array.isArray(deal.tags)).toBe(true)
  })

  it('filtert nach Stage', async () => {
    const res = await request(app).get('/api/v1/deals?stage=ERSTELLT')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: { stage: string }) => {
      expect(d.stage).toBe('ERSTELLT')
    })
  })

  it('filtert nach Prioritaet', async () => {
    const res = await request(app).get('/api/v1/deals?priority=HIGH')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: { priority: string }) => {
      expect(d.priority).toBe('HIGH')
    })
  })

  it('filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/deals?assignedTo=u001')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: { assignedTo: string }) => {
      expect(d.assignedTo).toBe('u001')
    })
  })

  it('sucht nach Kontaktname', async () => {
    const res = await request(app).get('/api/v1/deals?search=Mueller')
    expect(res.status).toBe(200)
    if (res.body.data.length > 0) {
      const found = res.body.data.some(
        (d: { contactName: string; title: string; company: string | null }) =>
          d.contactName.includes('Mueller') || d.title.includes('Mueller') || (d.company?.includes('Mueller') ?? false),
      )
      expect(found).toBe(true)
    }
  })

  it('paginiert korrekt', async () => {
    const res = await request(app).get('/api/v1/deals?pageSize=2&page=1')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
    expect(res.body.pageSize).toBe(2)
  })

  it('sortiert nach createdAt', async () => {
    const res = await request(app).get('/api/v1/deals?sortBy=createdAt&sortOrder=desc')
    expect(res.status).toBe(200)
    const dates = res.body.data.map((d: { createdAt: string }) => d.createdAt)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] <= dates[i - 1]).toBe(true)
    }
  })

  it('zeigt keine geloeschten Angebote an', async () => {
    const res = await request(app).get('/api/v1/deals')
    res.body.data.forEach((d: { deletedAt: string | null }) => {
      expect(d.deletedAt).toBeNull()
    })
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/deals/stats
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/deals/stats', () => {
  it('gibt Angebots-Statistiken zurueck', async () => {
    const res = await request(app).get('/api/v1/deals/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('totalDeals')
    expect(res.body.data).toHaveProperty('totalValue')
    expect(res.body.data).toHaveProperty('stages')
    expect(typeof res.body.data.totalDeals).toBe('number')
    expect(typeof res.body.data.totalValue).toBe('number')
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/deals/follow-ups
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/deals/follow-ups', () => {
  it('gibt Follow-Up-Liste zurueck', async () => {
    const res = await request(app).get('/api/v1/deals/follow-ups')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('hat korrekte Follow-Up-Struktur', async () => {
    const res = await request(app).get('/api/v1/deals/follow-ups')
    if (res.body.data.length > 0) {
      const fu = res.body.data[0]
      expect(fu).toHaveProperty('id')
      expect(fu).toHaveProperty('dealId')
      expect(fu).toHaveProperty('dealTitle')
      expect(fu).toHaveProperty('stage')
      expect(fu).toHaveProperty('daysSinceUpdate')
      expect(fu).toHaveProperty('maxDays')
      expect(fu).toHaveProperty('overdue')
      expect(fu).toHaveProperty('urgency')
      expect(fu).toHaveProperty('message')
    }
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/deals/:id
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/deals/:id', () => {
  it('gibt ein einzelnes Angebot zurueck', async () => {
    const list = await request(app).get('/api/v1/deals')
    const id = list.body.data[0].id
    const res = await request(app).get(`/api/v1/deals/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(id)
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).get('/api/v1/deals/non-existent-id')
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/deals
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/deals', () => {
  it('erstellt ein neues Angebot', async () => {
    const res = await request(app).post('/api/v1/deals').send({
      title: 'Test-Offerte 10kWp',
      contactName: 'Test Kunde',
      contactEmail: 'test@kunde.ch',
      contactPhone: '+41 79 111 22 33',
      address: 'Testweg 1, 8000 Zuerich',
      value: 35000,
    })
    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Test-Offerte 10kWp')
    expect(res.body.data.stage).toBe('ERSTELLT')
    expect(res.body.data.value).toBe(35000)
  })

  it('erstellt Angebot mit allen Feldern', async () => {
    const res = await request(app).post('/api/v1/deals').send({
      title: 'Vollstaendige Offerte',
      contactName: 'Vollstaendig Test',
      contactEmail: 'voll@test.ch',
      contactPhone: '+41 79 222 33 44',
      address: 'Vollstrasse 5, 3000 Bern',
      company: 'Test AG',
      value: 120000,
      stage: 'GESENDET',
      priority: 'HIGH',
      assignedTo: 'u002',
      notes: 'Testnotiz',
      tags: ['Grossanlage'],
    })
    expect(res.status).toBe(201)
    expect(res.body.data.company).toBe('Test AG')
    expect(res.body.data.stage).toBe('GESENDET')
    expect(res.body.data.priority).toBe('HIGH')
    expect(res.body.data.tags).toContain('Grossanlage')
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/deals').send({})
    expect(res.status).toBe(422)
  })

  it('validiert E-Mail-Format', async () => {
    const res = await request(app).post('/api/v1/deals').send({
      title: 'Test',
      contactName: 'Test',
      contactEmail: 'ungueltig',
      contactPhone: '+41 79 000 00 00',
      address: 'Test',
    })
    expect(res.status).toBe(422)
  })

  it('neues Angebot erscheint in Liste', async () => {
    const create = await request(app).post('/api/v1/deals').send({
      title: 'Listentest Offerte',
      contactName: 'Listen Test',
      contactEmail: 'listen@test.ch',
      contactPhone: '+41 79 333 44 55',
      address: 'Listweg 1, 8000 Zuerich',
    })
    const id = create.body.data.id

    const list = await request(app).get('/api/v1/deals')
    const found = list.body.data.find((d: { id: string }) => d.id === id)
    expect(found).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/deals/:id
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/deals/:id', () => {
  it('aktualisiert Angebots-Felder', async () => {
    const list = await request(app).get('/api/v1/deals')
    const id = list.body.data[0].id

    const res = await request(app).put(`/api/v1/deals/${id}`).send({
      notes: 'Aktualisierte Angebots-Notizen',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.notes).toBe('Aktualisierte Angebots-Notizen')
  })

  it('aendert Stage auf GESENDET', async () => {
    const list = await request(app).get('/api/v1/deals')
    const deal = list.body.data.find((d: { stage: string }) => d.stage === 'ERSTELLT')
    if (!deal) return

    const res = await request(app).put(`/api/v1/deals/${deal.id}`).send({
      stage: 'GESENDET',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.stage).toBe('GESENDET')
  })

  it('setzt Stage auf GEWONNEN mit closedAt', async () => {
    const create = await request(app).post('/api/v1/deals').send({
      title: 'Gewonnen Test',
      contactName: 'Gewinner',
      contactEmail: 'gewonnen@test.ch',
      contactPhone: '+41 79 444 55 66',
      address: 'Gewinnweg 1, 8000 Zuerich',
    })

    const res = await request(app).put(`/api/v1/deals/${create.body.data.id}`).send({
      stage: 'GEWONNEN',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.stage).toBe('GEWONNEN')
    expect(res.body.data.closedAt).not.toBeNull()
  })

  it('setzt Stage auf VERLOREN mit closedAt', async () => {
    const create = await request(app).post('/api/v1/deals').send({
      title: 'Verloren Test',
      contactName: 'Verlierer',
      contactEmail: 'verloren@test.ch',
      contactPhone: '+41 79 555 66 77',
      address: 'Verlustweg 1, 8000 Zuerich',
    })

    const res = await request(app).put(`/api/v1/deals/${create.body.data.id}`).send({
      stage: 'VERLOREN',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.stage).toBe('VERLOREN')
    expect(res.body.data.closedAt).not.toBeNull()
  })

  it('setzt updatedAt bei Aenderung', async () => {
    const list = await request(app).get('/api/v1/deals')
    const deal = list.body.data[0]
    const before = new Date(deal.updatedAt).getTime()

    const res = await request(app).put(`/api/v1/deals/${deal.id}`).send({
      notes: 'Timestamp Test Deal',
    })
    const after = new Date(res.body.data.updatedAt).getTime()
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).put('/api/v1/deals/non-existent-id').send({
      notes: 'Test',
    })
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/deals/:id
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/deals/:id', () => {
  it('loescht ein Angebot (soft delete)', async () => {
    const create = await request(app).post('/api/v1/deals').send({
      title: 'Zum Loeschen',
      contactName: 'Delete Test',
      contactEmail: 'delete@test.ch',
      contactPhone: '+41 79 666 77 88',
      address: 'Loeschweg 1, 8000 Zuerich',
    })
    const id = create.body.data.id

    const res = await request(app).delete(`/api/v1/deals/${id}`)
    expect(res.status).toBe(200)

    const list = await request(app).get('/api/v1/deals')
    const found = list.body.data.find((d: { id: string }) => d.id === id)
    expect(found).toBeUndefined()
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).delete('/api/v1/deals/non-existent-id')
    expect(res.status).toBe(404)
  })
})
