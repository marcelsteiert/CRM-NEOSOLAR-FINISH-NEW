import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/reminders
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/reminders', () => {
  it('gibt Erinnerungen zurück', async () => {
    const res = await request(app).get('/api/v1/reminders')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('hat korrekte Reminder-Struktur', async () => {
    const res = await request(app).get('/api/v1/reminders')
    if (res.body.data.length > 0) {
      const reminder = res.body.data[0]
      expect(reminder).toHaveProperty('id')
      expect(reminder).toHaveProperty('leadId')
      expect(reminder).toHaveProperty('title')
      expect(reminder).toHaveProperty('dueAt')
      expect(reminder).toHaveProperty('dismissed')
      expect(reminder).toHaveProperty('createdBy')
    }
  })

  it('filtert nach leadId', async () => {
    const res = await request(app).get('/api/v1/reminders?leadId=some-lead')
    expect(res.status).toBe(200)
    // Wildcard '*' entries should be included
  })

  it('sortiert nach dueAt aufsteigend', async () => {
    const res = await request(app).get('/api/v1/reminders')
    const dates = res.body.data.map((r: { dueAt: string }) => new Date(r.dueAt).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1])
    }
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/reminders
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/reminders', () => {
  let createdId: string

  it('erstellt eine neue Erinnerung', async () => {
    const dueAt = new Date(Date.now() + 86400000).toISOString()
    const res = await request(app).post('/api/v1/reminders').send({
      leadId: 'lead-rem-001',
      title: 'Test-Erinnerung',
      description: 'Nachfassen',
      dueAt,
      createdBy: 'Tester',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Test-Erinnerung')
    expect(res.body.data.dismissed).toBe(false)
    expect(res.body.data.leadId).toBe('lead-rem-001')
    createdId = res.body.data.id
  })

  it('setzt Defaults korrekt', async () => {
    const res = await request(app).post('/api/v1/reminders').send({
      leadId: 'lead-rem-002',
      title: 'Minimal',
      dueAt: new Date().toISOString(),
    })
    expect(res.status).toBe(201)
    expect(res.body.data.description).toBeNull()
    expect(res.body.data.createdBy).toBe('System')
  })

  it('validiert fehlenden Titel', async () => {
    const res = await request(app).post('/api/v1/reminders').send({
      leadId: 'l001',
      dueAt: new Date().toISOString(),
    })
    expect(res.status).toBe(422)
  })

  it('validiert leeren Titel', async () => {
    const res = await request(app).post('/api/v1/reminders').send({
      leadId: 'l001',
      title: '',
      dueAt: new Date().toISOString(),
    })
    expect(res.status).toBe(422)
  })

  // ─── PUT dismiss ───
  it('dismisst eine Erinnerung', async () => {
    const res = await request(app).put(`/api/v1/reminders/${createdId}/dismiss`)
    expect(res.status).toBe(200)
    expect(res.body.data.dismissed).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/reminders/:id/dismiss
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/reminders/:id/dismiss', () => {
  it('gibt 404 für unbekannte ID', async () => {
    const res = await request(app).put('/api/v1/reminders/nope/dismiss')
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/reminders/:id
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/reminders/:id', () => {
  it('löscht eine Erinnerung', async () => {
    const create = await request(app).post('/api/v1/reminders').send({
      leadId: 'lead-del-001',
      title: 'Zum Löschen',
      dueAt: new Date().toISOString(),
    })
    const id = create.body.data.id

    const res = await request(app).delete(`/api/v1/reminders/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toContain('gelöscht')
  })

  it('gibt 404 für nicht existierende Erinnerung', async () => {
    const res = await request(app).delete('/api/v1/reminders/nope')
    expect(res.status).toBe(404)
  })
})
