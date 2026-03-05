import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/dashboard/stats
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/dashboard/stats', () => {
  it('gibt aggregierte Statistiken zurück', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('tasks')
  })

  it('deals-Statistiken haben korrekte Struktur', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats')
    const { deals } = res.body.data
    expect(deals).toHaveProperty('totalDeals')
    expect(deals).toHaveProperty('totalValue')
    expect(typeof deals.totalDeals).toBe('number')
    expect(typeof deals.totalValue).toBe('number')
  })

  it('tasks-Statistiken haben korrekte Struktur', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats')
    const { tasks } = res.body.data
    expect(tasks).toHaveProperty('open')
    expect(tasks).toHaveProperty('inProgress')
    expect(tasks).toHaveProperty('completed')
    expect(tasks).toHaveProperty('total')
  })

  it('filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats?assignedTo=u001')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('deals')
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/dashboard/monthly
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/dashboard/monthly', () => {
  it('gibt 6 Monate Daten zurück', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBe(6)
  })

  it('jeder Monat hat korrekte Felder', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    for (const month of res.body.data) {
      expect(month).toHaveProperty('month')
      expect(month).toHaveProperty('label')
      expect(month).toHaveProperty('wonDeals')
      expect(month).toHaveProperty('wonValue')
      expect(month).toHaveProperty('lostDeals')
      expect(month).toHaveProperty('totalAppointments')
      expect(month).toHaveProperty('completedAppointments')
      expect(month).toHaveProperty('provision')
      expect(typeof month.wonDeals).toBe('number')
      expect(typeof month.provision).toBe('number')
    }
  })

  it('Monate sind chronologisch sortiert', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    const months = res.body.data.map((m: { month: string }) => m.month)
    for (let i = 1; i < months.length; i++) {
      expect(months[i] >= months[i - 1]).toBe(true)
    }
  })

  it('Provision ist 5% vom wonValue', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    for (const month of res.body.data) {
      const expected = Math.round(month.wonValue * 0.05 * 100) / 100
      expect(month.provision).toBe(expected)
    }
  })

  it('funktioniert ohne Filter (Query-String korrekt)', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(6)
  })

  it('filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly?assignedTo=u001')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/dashboard/provision
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/dashboard/provision', () => {
  it('gibt Provisions-Daten zurück', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data).toHaveProperty('month')
    expect(res.body.data).toHaveProperty('provisions')
    expect(res.body.data).toHaveProperty('summary')
  })

  it('Summary hat korrekte Felder', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision')
    const { summary } = res.body.data
    expect(summary).toHaveProperty('totalValue')
    expect(summary).toHaveProperty('totalProvision')
    expect(summary).toHaveProperty('totalDeals')
    expect(typeof summary.totalValue).toBe('number')
    expect(typeof summary.totalProvision).toBe('number')
  })

  it('akzeptiert month-Parameter', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision?month=2026-03')
    expect(res.status).toBe(200)
    expect(res.body.data.month).toBe('2026-03')
  })

  it('Provision pro User ist 5% vom totalValue', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision')
    for (const p of res.body.data.provisions) {
      expect(p).toHaveProperty('userId')
      expect(p).toHaveProperty('userName')
      expect(p).toHaveProperty('totalValue')
      expect(p).toHaveProperty('provision')
      expect(p).toHaveProperty('provisionRate')
      expect(p.provisionRate).toBe(0.05)
      const expected = Math.round(p.totalValue * 0.05 * 100) / 100
      expect(p.provision).toBe(expected)
    }
  })
})
