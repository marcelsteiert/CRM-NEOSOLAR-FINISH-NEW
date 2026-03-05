import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/health
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  it('gibt Health-Status zurück', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status')
    expect(res.body).toHaveProperty('timestamp')
    expect(res.body).toHaveProperty('version')
  })

  it('Status ist ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.body.status).toBe('ok')
  })

  it('Version ist korrekt', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.body.version).toBe('0.1.0')
  })

  it('Timestamp ist gültiges ISO-Datum', async () => {
    const res = await request(app).get('/api/v1/health')
    const date = new Date(res.body.timestamp)
    expect(date.getTime()).not.toBeNaN()
  })
})

// ─────────────────────────────────────────────────────────────
// 404 für unbekannte Routen
// ─────────────────────────────────────────────────────────────

describe('Unbekannte Routen', () => {
  it('gibt 404 für nicht existierende Route', async () => {
    const res = await request(app).get('/api/v1/nonexistent')
    expect(res.status).toBe(404)
  })

  it('gibt 404 für Root ohne Pfad', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(404)
  })
})
