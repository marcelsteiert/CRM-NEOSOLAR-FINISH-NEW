import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/leads
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/leads', () => {
  it('gibt eine Liste von Leads zurueck', async () => {
    const res = await request(app).get('/api/v1/leads')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page')
    expect(res.body).toHaveProperty('pageSize')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('hat korrekte Lead-Struktur', async () => {
    const res = await request(app).get('/api/v1/leads')
    const lead = res.body.data[0]
    expect(lead).toHaveProperty('id')
    expect(lead).toHaveProperty('firstName')
    expect(lead).toHaveProperty('lastName')
    expect(lead).toHaveProperty('address')
    expect(lead).toHaveProperty('phone')
    expect(lead).toHaveProperty('email')
    expect(lead).toHaveProperty('source')
    expect(lead).toHaveProperty('status')
    expect(lead).toHaveProperty('tags')
    expect(lead).toHaveProperty('createdAt')
    expect(lead).toHaveProperty('updatedAt')
  })

  it('filtert nach Status ACTIVE', async () => {
    const res = await request(app).get('/api/v1/leads?status=ACTIVE')
    expect(res.status).toBe(200)
    res.body.data.forEach((lead: { status: string }) => {
      expect(lead.status).toBe('ACTIVE')
    })
  })

  it('filtert nach Status LOST', async () => {
    const res = await request(app).get('/api/v1/leads?status=LOST')
    expect(res.status).toBe(200)
    res.body.data.forEach((lead: { status: string }) => {
      expect(lead.status).toBe('LOST')
    })
  })

  it('filtert nach Status CONVERTED', async () => {
    const res = await request(app).get('/api/v1/leads?status=CONVERTED')
    expect(res.status).toBe(200)
    res.body.data.forEach((lead: { status: string }) => {
      expect(lead.status).toBe('CONVERTED')
    })
  })

  it('filtert nach Quelle', async () => {
    const res = await request(app).get('/api/v1/leads?source=HOMEPAGE')
    expect(res.status).toBe(200)
    res.body.data.forEach((lead: { source: string }) => {
      expect(lead.source).toBe('HOMEPAGE')
    })
  })

  it('sucht nach Name', async () => {
    const res = await request(app).get('/api/v1/leads?search=Mueller')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    const names = res.body.data.map(
      (l: { firstName: string | null; lastName: string | null }) =>
        `${l.firstName ?? ''} ${l.lastName ?? ''}`,
    )
    expect(names.some((n: string) => n.includes('Mueller'))).toBe(true)
  })

  it('sucht nach E-Mail', async () => {
    const res = await request(app).get('/api/v1/leads?search=bluewin')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('sucht nach Adresse', async () => {
    const res = await request(app).get('/api/v1/leads?search=Zuerich')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Pagination: limitiert auf pageSize', async () => {
    const res = await request(app).get('/api/v1/leads?pageSize=3')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(3)
    expect(res.body.pageSize).toBe(3)
  })

  it('Pagination: zweite Seite', async () => {
    const res = await request(app).get('/api/v1/leads?page=2&pageSize=5')
    expect(res.status).toBe(200)
    expect(res.body.page).toBe(2)
  })

  it('sortiert nach createdAt desc (Standard)', async () => {
    const res = await request(app).get('/api/v1/leads?status=ACTIVE')
    expect(res.status).toBe(200)
    const dates = res.body.data.map((l: { createdAt: string }) => l.createdAt)
    for (let i = 1; i < dates.length; i++) {
      expect(new Date(dates[i - 1]).getTime()).toBeGreaterThanOrEqual(
        new Date(dates[i]).getTime(),
      )
    }
  })

  it('sortiert nach createdAt asc', async () => {
    const res = await request(app).get(
      '/api/v1/leads?status=ACTIVE&sortBy=createdAt&sortOrder=asc',
    )
    expect(res.status).toBe(200)
    const dates = res.body.data.map((l: { createdAt: string }) => l.createdAt)
    for (let i = 1; i < dates.length; i++) {
      expect(new Date(dates[i - 1]).getTime()).toBeLessThanOrEqual(
        new Date(dates[i]).getTime(),
      )
    }
  })

  it('zeigt keine soft-deleted Leads', async () => {
    const res = await request(app).get('/api/v1/leads')
    expect(res.status).toBe(200)
    res.body.data.forEach((lead: { deletedAt: string | null }) => {
      expect(lead.deletedAt).toBeNull()
    })
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/leads/:id
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/leads/:id', () => {
  it('gibt einen einzelnen Lead zurueck', async () => {
    const list = await request(app).get('/api/v1/leads')
    const leadId = list.body.data[0].id

    const res = await request(app).get(`/api/v1/leads/${leadId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(leadId)
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).get(
      '/api/v1/leads/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/leads
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/leads', () => {
  it('erstellt einen neuen Lead', async () => {
    const newLead = {
      firstName: 'Test',
      lastName: 'Benutzer',
      address: 'Teststrasse 1, 8000 Zuerich',
      phone: '+41 44 000 00 00',
      email: 'test@example.ch',
      source: 'HOMEPAGE',
    }

    const res = await request(app).post('/api/v1/leads').send(newLead)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      firstName: 'Test',
      lastName: 'Benutzer',
      email: 'test@example.ch',
      source: 'HOMEPAGE',
      status: 'ACTIVE',
    })
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.createdAt).toBeDefined()
  })

  it('erstellt Lead mit allen optionalen Feldern', async () => {
    const newLead = {
      firstName: 'Komplett',
      lastName: 'Lead',
      company: 'Test AG',
      address: 'Testweg 2, 3000 Bern',
      phone: '+41 31 000 00 00',
      email: 'komplett@test.ch',
      source: 'MESSE',
      value: 50000,
      notes: 'Ein Testlead mit allen Feldern',
    }

    const res = await request(app).post('/api/v1/leads').send(newLead)
    expect(res.status).toBe(201)
    expect(res.body.data.company).toBe('Test AG')
    expect(res.body.data.value).toBe(50000)
    expect(res.body.data.notes).toBe('Ein Testlead mit allen Feldern')
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/leads').send({})
    expect(res.status).toBe(422)
  })

  it('validiert E-Mail-Format', async () => {
    const res = await request(app).post('/api/v1/leads').send({
      address: 'Test',
      phone: '123',
      email: 'ungueltig',
      source: 'HOMEPAGE',
    })
    expect(res.status).toBe(422)
  })

  it('validiert Quelle', async () => {
    const res = await request(app).post('/api/v1/leads').send({
      address: 'Test',
      phone: '123',
      email: 'test@test.ch',
      source: 'UNBEKANNT',
    })
    expect(res.status).toBe(422)
  })

  it('neuer Lead erscheint in der Liste', async () => {
    const before = await request(app).get('/api/v1/leads?pageSize=100')
    const beforeCount = before.body.total

    await request(app).post('/api/v1/leads').send({
      firstName: 'Neu',
      lastName: 'InListe',
      address: 'Neustrasse 1, 8000 Zuerich',
      phone: '+41 44 111 11 11',
      email: 'neuliste@test.ch',
      source: 'SONSTIGE',
    })

    const after = await request(app).get('/api/v1/leads?pageSize=100')
    expect(after.body.total).toBe(beforeCount + 1)
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/leads/:id
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/leads/:id', () => {
  it('aktualisiert einen Lead', async () => {
    const list = await request(app).get('/api/v1/leads')
    const lead = list.body.data[0]

    const res = await request(app)
      .put(`/api/v1/leads/${lead.id}`)
      .send({ company: 'Aktualisierte Firma AG' })

    expect(res.status).toBe(200)
    expect(res.body.data.company).toBe('Aktualisierte Firma AG')
  })

  it('aktualisiert Status zu CONVERTED', async () => {
    const list = await request(app).get('/api/v1/leads?status=ACTIVE')
    const lead = list.body.data[0]

    const res = await request(app)
      .put(`/api/v1/leads/${lead.id}`)
      .send({ status: 'CONVERTED' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CONVERTED')
  })

  it('aktualisiert Status zu LOST', async () => {
    const list = await request(app).get('/api/v1/leads?status=ACTIVE')
    const lead = list.body.data[0]

    const res = await request(app)
      .put(`/api/v1/leads/${lead.id}`)
      .send({ status: 'LOST', notes: '[VERLOREN] Kein Budget' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('LOST')
    expect(res.body.data.notes).toContain('VERLOREN')
  })

  it('aktualisiert Wert', async () => {
    const list = await request(app).get('/api/v1/leads?status=ACTIVE')
    const lead = list.body.data[0]

    const res = await request(app)
      .put(`/api/v1/leads/${lead.id}`)
      .send({ value: 99999 })

    expect(res.status).toBe(200)
    expect(res.body.data.value).toBe(99999)
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app)
      .put('/api/v1/leads/00000000-0000-0000-0000-000000000000')
      .send({ company: 'Test' })
    expect(res.status).toBe(404)
  })

  it('updatedAt wird aktualisiert', async () => {
    const list = await request(app).get('/api/v1/leads?status=ACTIVE')
    const lead = list.body.data[0]
    const oldUpdated = lead.updatedAt

    // Kleine Verzoegerung damit Zeitstempel sich unterscheidet
    await new Promise((r) => setTimeout(r, 10))

    const res = await request(app)
      .put(`/api/v1/leads/${lead.id}`)
      .send({ notes: 'Update Test' })

    expect(res.status).toBe(200)
    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(oldUpdated).getTime(),
    )
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/leads/:id
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/leads/:id', () => {
  it('loescht einen Lead (soft delete)', async () => {
    // Erstelle einen Lead zum Loeschen
    const create = await request(app).post('/api/v1/leads').send({
      firstName: 'Zum',
      lastName: 'Loeschen',
      address: 'Loeschstrasse 1, 8000 Zuerich',
      phone: '+41 44 999 99 99',
      email: 'loeschen@test.ch',
      source: 'SONSTIGE',
    })
    const leadId = create.body.data.id

    const res = await request(app).delete(`/api/v1/leads/${leadId}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toContain('geloescht')
  })

  it('geloeschter Lead erscheint nicht mehr in der Liste', async () => {
    const create = await request(app).post('/api/v1/leads').send({
      firstName: 'Verschwinde',
      lastName: 'Test',
      address: 'Weg 1, 8000 Zuerich',
      phone: '+41 44 888 88 88',
      email: 'verschwinde@test.ch',
      source: 'SONSTIGE',
    })
    const leadId = create.body.data.id

    await request(app).delete(`/api/v1/leads/${leadId}`)

    const get = await request(app).get(`/api/v1/leads/${leadId}`)
    expect(get.status).toBe(404)
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).delete(
      '/api/v1/leads/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/leads/:id/tags
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/leads/:id/tags', () => {
  it('fuegt Tags zu einem Lead hinzu', async () => {
    const list = await request(app).get('/api/v1/leads?status=ACTIVE')
    const lead = list.body.data.find(
      (l: { tags: string[] }) => l.tags.length === 0,
    ) || list.body.data[0]

    const tagId = 'a0000001-0000-4000-a000-000000000001'
    const res = await request(app)
      .post(`/api/v1/leads/${lead.id}/tags`)
      .send({ tagIds: [tagId] })

    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tagId)
  })

  it('fuegt keine doppelten Tags hinzu', async () => {
    // Erstelle einen frischen Lead und fuege den gleichen Tag zweimal hinzu
    const create = await request(app).post('/api/v1/leads').send({
      firstName: 'Tag',
      lastName: 'Doppelt',
      address: 'Tagstrasse 1, 8000 Zuerich',
      phone: '+41 44 222 22 22',
      email: 'tagdoppelt@test.ch',
      source: 'HOMEPAGE',
    })
    const leadId = create.body.data.id
    const tagId = 'b0000001-0000-4000-a000-000000000001'

    // Tag zum ersten Mal hinzufuegen
    await request(app)
      .post(`/api/v1/leads/${leadId}/tags`)
      .send({ tagIds: [tagId] })

    // Gleichen Tag nochmal hinzufuegen
    const res = await request(app)
      .post(`/api/v1/leads/${leadId}/tags`)
      .send({ tagIds: [tagId] })

    expect(res.status).toBe(200)
    const count = res.body.data.tags.filter(
      (t: string) => t === tagId,
    ).length
    expect(count).toBe(1)
  })

  it('validiert Tag-Format', async () => {
    const list = await request(app).get('/api/v1/leads')
    const lead = list.body.data[0]

    const res = await request(app)
      .post(`/api/v1/leads/${lead.id}/tags`)
      .send({ tagIds: ['ungueltig'] })

    expect(res.status).toBe(422)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/leads/:id/tags/:tagId
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/leads/:id/tags/:tagId', () => {
  it('entfernt einen Tag vom Lead', async () => {
    const list = await request(app).get('/api/v1/leads?status=ACTIVE')
    const lead = list.body.data.find(
      (l: { tags: string[] }) => l.tags.length > 0,
    )!
    const tagToRemove = lead.tags[0]

    const res = await request(app).delete(
      `/api/v1/leads/${lead.id}/tags/${tagToRemove}`,
    )
    expect(res.status).toBe(200)
    expect(res.body.data.tags).not.toContain(tagToRemove)
  })

  it('gibt 404 wenn Tag nicht vorhanden', async () => {
    const list = await request(app).get('/api/v1/leads')
    const lead = list.body.data[0]

    const res = await request(app).delete(
      `/api/v1/leads/${lead.id}/tags/t0000001-0000-4000-a000-999999999999`,
    )
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/leads/:id/move
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/leads/:id/move', () => {
  it('verschiebt einen Lead in einen anderen Bucket', async () => {
    const list = await request(app).get('/api/v1/leads?status=ACTIVE')
    const lead = list.body.data[0]
    const newBucket = 'b1000001-0000-4000-a000-000000000003'

    const res = await request(app)
      .put(`/api/v1/leads/${lead.id}/move`)
      .send({ bucketId: newBucket })

    expect(res.status).toBe(200)
    expect(res.body.data.bucketId).toBe(newBucket)
  })

  it('validiert bucketId Format', async () => {
    const list = await request(app).get('/api/v1/leads')
    const lead = list.body.data[0]

    const res = await request(app)
      .put(`/api/v1/leads/${lead.id}/move`)
      .send({ bucketId: 'ungueltig' })

    expect(res.status).toBe(422)
  })

  it('gibt 404 fuer unbekannte Lead-ID', async () => {
    const res = await request(app)
      .put('/api/v1/leads/00000000-0000-0000-0000-000000000000/move')
      .send({ bucketId: 'b1000001-0000-4000-a000-000000000003' })
    expect(res.status).toBe(404)
  })
})
