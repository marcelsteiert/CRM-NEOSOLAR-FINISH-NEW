import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/activities
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/activities', () => {
  it('gibt alle Activities zurück', async () => {
    const res = await request(app).get('/api/v1/activities')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('hat korrekte Activity-Struktur', async () => {
    const res = await request(app).get('/api/v1/activities')
    if (res.body.data.length > 0) {
      const activity = res.body.data[0]
      expect(activity).toHaveProperty('id')
      expect(activity).toHaveProperty('leadId')
      expect(activity).toHaveProperty('type')
      expect(activity).toHaveProperty('title')
      expect(activity).toHaveProperty('createdBy')
      expect(activity).toHaveProperty('createdAt')
    }
  })

  it('filtert nach leadId (inkl. Wildcard)', async () => {
    const res = await request(app).get('/api/v1/activities?leadId=some-lead')
    expect(res.status).toBe(200)
    // Wildcard '*' entries should be included
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('sortiert nach neueste zuerst', async () => {
    const res = await request(app).get('/api/v1/activities')
    const dates = res.body.data.map((a: { createdAt: string }) => new Date(a.createdAt).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
    }
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/activities
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/activities', () => {
  it('erstellt eine neue Activity', async () => {
    const res = await request(app).post('/api/v1/activities').send({
      leadId: 'lead-test-001',
      type: 'CALL',
      title: 'Testanruf',
      description: 'Hat nicht abgenommen',
      createdBy: 'Tester',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('CALL')
    expect(res.body.data.title).toBe('Testanruf')
    expect(res.body.data.leadId).toBe('lead-test-001')
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data).toHaveProperty('createdAt')
  })

  it('erstellt Activity ohne optionale Felder', async () => {
    const res = await request(app).post('/api/v1/activities').send({
      leadId: 'lead-test-002',
      type: 'NOTE',
      title: 'Kurze Notiz',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.description).toBeNull()
    expect(res.body.data.createdBy).toBe('System')
  })

  it('validiert fehlende Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/activities').send({})
    expect(res.status).toBe(422)
  })

  it('validiert leeren Titel', async () => {
    const res = await request(app).post('/api/v1/activities').send({
      leadId: 'l001',
      type: 'NOTE',
      title: '',
    })
    expect(res.status).toBe(422)
  })

  it('validiert ungültigen Typ', async () => {
    const res = await request(app).post('/api/v1/activities').send({
      leadId: 'l001',
      type: 'INVALID',
      title: 'Test',
    })
    expect(res.status).toBe(422)
  })

  it('neue Activity erscheint in GET', async () => {
    const created = await request(app).post('/api/v1/activities').send({
      leadId: 'lead-check-001',
      type: 'EMAIL',
      title: 'Check-Mail',
    })
    const res = await request(app).get('/api/v1/activities?leadId=lead-check-001')
    const found = res.body.data.find((a: { id: string }) => a.id === created.body.data.id)
    expect(found).toBeDefined()
  })
})
