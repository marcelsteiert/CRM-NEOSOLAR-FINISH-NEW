import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/tasks
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/tasks', () => {
  it('gibt eine Liste von Aufgaben zurück', async () => {
    const res = await request(app).get('/api/v1/tasks')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('hat korrekte Task-Struktur', async () => {
    const res = await request(app).get('/api/v1/tasks')
    const task = res.body.data[0]
    expect(task).toHaveProperty('id')
    expect(task).toHaveProperty('title')
    expect(task).toHaveProperty('status')
    expect(task).toHaveProperty('priority')
    expect(task).toHaveProperty('module')
    expect(task).toHaveProperty('assignedTo')
    expect(task).toHaveProperty('createdAt')
  })

  it('filtert nach Status', async () => {
    const res = await request(app).get('/api/v1/tasks?status=OFFEN')
    expect(res.status).toBe(200)
    res.body.data.forEach((t: { status: string }) => {
      expect(t.status).toBe('OFFEN')
    })
  })

  it('filtert nach Priorität', async () => {
    const res = await request(app).get('/api/v1/tasks?priority=HIGH')
    expect(res.status).toBe(200)
    res.body.data.forEach((t: { priority: string }) => {
      expect(t.priority).toBe('HIGH')
    })
  })

  it('filtert nach Modul', async () => {
    const res = await request(app).get('/api/v1/tasks?module=ANGEBOT')
    expect(res.status).toBe(200)
    res.body.data.forEach((t: { module: string }) => {
      expect(t.module).toBe('ANGEBOT')
    })
  })

  it('filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/tasks?assignedTo=u001')
    expect(res.status).toBe(200)
    res.body.data.forEach((t: { assignedTo: string }) => {
      expect(t.assignedTo).toBe('u001')
    })
  })

  it('sucht nach Titel', async () => {
    const res = await request(app).get('/api/v1/tasks?search=Mueller')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/tasks/stats
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/tasks/stats', () => {
  it('gibt Statistiken zurück', async () => {
    const res = await request(app).get('/api/v1/tasks/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('open')
    expect(res.body.data).toHaveProperty('inProgress')
    expect(res.body.data).toHaveProperty('completed')
    expect(res.body.data).toHaveProperty('overdue')
    expect(res.body.data).toHaveProperty('total')
  })

  it('total ist Summe aller Status', async () => {
    const res = await request(app).get('/api/v1/tasks/stats')
    const { open, inProgress, completed, total } = res.body.data
    expect(total).toBe(open + inProgress + completed)
  })

  it('filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/tasks/stats?assignedTo=u002')
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/tasks
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/tasks', () => {
  let createdId: string

  it('erstellt eine neue Aufgabe', async () => {
    const res = await request(app).post('/api/v1/tasks').send({
      title: 'Neue Test-Aufgabe',
      description: 'Beschreibung',
      priority: 'HIGH',
      module: 'LEAD',
      assignedTo: 'u001',
      dueDate: '2026-04-01',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Neue Test-Aufgabe')
    expect(res.body.data.status).toBe('OFFEN')
    expect(res.body.data.priority).toBe('HIGH')
    expect(res.body.data.module).toBe('LEAD')
    createdId = res.body.data.id
  })

  it('setzt Defaults korrekt', async () => {
    const res = await request(app).post('/api/v1/tasks').send({
      title: 'Minimal Task',
      assignedTo: 'u001',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.priority).toBe('MEDIUM')
    expect(res.body.data.module).toBe('ALLGEMEIN')
    expect(res.body.data.status).toBe('OFFEN')
    expect(res.body.data.completedAt).toBeNull()
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/tasks').send({})
    expect(res.status).toBe(422)
  })

  it('validiert leeren Titel', async () => {
    const res = await request(app).post('/api/v1/tasks').send({
      title: '',
      assignedTo: 'u001',
    })
    expect(res.status).toBe(422)
  })

  // ─── GET by ID ───
  it('kann erstellte Aufgabe per ID abrufen', async () => {
    const res = await request(app).get(`/api/v1/tasks/${createdId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Neue Test-Aufgabe')
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/tasks/:id
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/tasks/:id', () => {
  it('gibt 404 für unbekannte ID', async () => {
    const res = await request(app).get('/api/v1/tasks/nope-not-existing')
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/tasks/:id
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/tasks/:id', () => {
  let taskId: string

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/tasks').send({
      title: 'Update-Task',
      assignedTo: 'u001',
    })
    taskId = res.body.data.id
  })

  it('aktualisiert Titel', async () => {
    const res = await request(app).put(`/api/v1/tasks/${taskId}`).send({
      title: 'Updated Titel',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Updated Titel')
  })

  it('setzt Status auf ERLEDIGT und completedAt', async () => {
    const res = await request(app).put(`/api/v1/tasks/${taskId}`).send({
      status: 'ERLEDIGT',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ERLEDIGT')
    expect(res.body.data.completedAt).not.toBeNull()
  })

  it('setzt completedAt zurück bei Status-Wechsel', async () => {
    const res = await request(app).put(`/api/v1/tasks/${taskId}`).send({
      status: 'OFFEN',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('OFFEN')
    expect(res.body.data.completedAt).toBeNull()
  })

  it('gibt 404 für unbekannte ID', async () => {
    const res = await request(app).put('/api/v1/tasks/nope').send({ title: 'X' })
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/tasks/:id
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/tasks/:id', () => {
  it('löscht eine Aufgabe (hard-delete)', async () => {
    const create = await request(app).post('/api/v1/tasks').send({
      title: 'Zum Löschen',
      assignedTo: 'u001',
    })
    const id = create.body.data.id

    const res = await request(app).delete(`/api/v1/tasks/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toContain('gelöscht')

    const check = await request(app).get(`/api/v1/tasks/${id}`)
    expect(check.status).toBe(404)
  })

  it('gibt 404 für nicht existierende Aufgabe', async () => {
    const res = await request(app).delete('/api/v1/tasks/nope')
    expect(res.status).toBe(404)
  })
})
