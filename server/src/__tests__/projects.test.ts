import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/projects
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/projects', () => {
  it('gibt eine Liste von Projekten zurück', async () => {
    const res = await request(app).get('/api/v1/projects')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('hat korrekte Projekt-Struktur', async () => {
    const res = await request(app).get('/api/v1/projects')
    const project = res.body.data[0]
    expect(project).toHaveProperty('id')
    expect(project).toHaveProperty('name')
    expect(project).toHaveProperty('kWp')
    expect(project).toHaveProperty('value')
    expect(project).toHaveProperty('phase')
    expect(project).toHaveProperty('priority')
    expect(project).toHaveProperty('progress')
    expect(project).toHaveProperty('createdAt')
    // Enriched fields
    expect(project).toHaveProperty('total')
    expect(project).toHaveProperty('done')
    expect(project).toHaveProperty('percent')
  })

  it('filtert nach Phase', async () => {
    const res = await request(app).get('/api/v1/projects?phase=admin')
    expect(res.status).toBe(200)
    res.body.data.forEach((p: { phase: string }) => {
      expect(p.phase).toBe('admin')
    })
  })

  it('filtert nach Priorität', async () => {
    const res = await request(app).get('/api/v1/projects?priority=HIGH')
    expect(res.status).toBe(200)
    res.body.data.forEach((p: { priority: string }) => {
      expect(p.priority).toBe('HIGH')
    })
  })

  it('filtert nach Risiko', async () => {
    const res = await request(app).get('/api/v1/projects?risk=true')
    expect(res.status).toBe(200)
    res.body.data.forEach((p: { risk: boolean }) => {
      expect(p.risk).toBe(true)
    })
  })

  it('sucht nach Name', async () => {
    const res = await request(app).get('/api/v1/projects?search=Weber')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0].name.toLowerCase()).toContain('weber')
  })

  it('gelöschte Projekte werden nicht angezeigt', async () => {
    const res = await request(app).get('/api/v1/projects')
    res.body.data.forEach((p: { deletedAt: string | null }) => {
      expect(p.deletedAt).toBeNull()
    })
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/projects/phases
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/projects/phases', () => {
  it('gibt 4 Phasen-Definitionen zurück', async () => {
    const res = await request(app).get('/api/v1/projects/phases')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(4)
  })

  it('Phasen haben korrekte IDs', async () => {
    const res = await request(app).get('/api/v1/projects/phases')
    const ids = res.body.data.map((p: { id: string }) => p.id)
    expect(ids).toEqual(['admin', 'montage', 'elektro', 'abschluss'])
  })

  it('jede Phase hat Steps', async () => {
    const res = await request(app).get('/api/v1/projects/phases')
    for (const phase of res.body.data) {
      expect(phase).toHaveProperty('name')
      expect(phase).toHaveProperty('color')
      expect(phase).toHaveProperty('steps')
      expect(Array.isArray(phase.steps)).toBe(true)
      expect(phase.steps.length).toBeGreaterThan(0)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/projects/partners
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/projects/partners', () => {
  it('gibt Partner-Liste zurück', async () => {
    const res = await request(app).get('/api/v1/projects/partners')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Partner haben korrekte Typen', async () => {
    const res = await request(app).get('/api/v1/projects/partners')
    for (const partner of res.body.data) {
      expect(['montage', 'elektro']).toContain(partner.type)
      expect(partner).toHaveProperty('name')
      expect(partner).toHaveProperty('rating')
    }
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/projects/stats
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/projects/stats', () => {
  it('gibt aggregierte Statistiken zurück', async () => {
    const res = await request(app).get('/api/v1/projects/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('totalValue')
    expect(res.body.data).toHaveProperty('totalKwp')
    expect(res.body.data).toHaveProperty('avgProgress')
    expect(res.body.data).toHaveProperty('risks')
    expect(res.body.data).toHaveProperty('byPhase')
    expect(res.body.data).toHaveProperty('kalkulation')
  })

  it('byPhase hat alle 4 Phasen', async () => {
    const res = await request(app).get('/api/v1/projects/stats')
    const { byPhase } = res.body.data
    expect(byPhase).toHaveProperty('admin')
    expect(byPhase).toHaveProperty('montage')
    expect(byPhase).toHaveProperty('elektro')
    expect(byPhase).toHaveProperty('abschluss')
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/projects/:id
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/projects/:id', () => {
  it('gibt ein einzelnes Projekt zurück', async () => {
    const res = await request(app).get('/api/v1/projects/proj-001')
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('proj-001')
    expect(res.body.data.name).toBe('Weber Holzbau')
  })

  it('gibt 404 für unbekannte ID', async () => {
    const res = await request(app).get('/api/v1/projects/nope')
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/projects
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/projects', () => {
  let createdId: string

  it('erstellt ein neues Projekt', async () => {
    const res = await request(app).post('/api/v1/projects').send({
      name: 'Test-Projekt',
      description: 'Testbeschreibung',
      kWp: 12.5,
      value: 45000,
      address: 'Teststr. 1, 9000 St. Gallen',
      phone: '+41 71 123 45 67',
      email: 'test@example.ch',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Test-Projekt')
    expect(res.body.data.phase).toBe('admin')
    expect(res.body.data.priority).toBe('MEDIUM')
    expect(res.body.data).toHaveProperty('progress')
    expect(res.body.data).toHaveProperty('percent')
    createdId = res.body.data.id
  })

  it('Progress ist initial alles 0', async () => {
    const res = await request(app).get(`/api/v1/projects/${createdId}`)
    expect(res.body.data.percent).toBe(0)
    for (const phase of Object.values(res.body.data.progress) as number[][]) {
      phase.forEach((v: number) => expect(v).toBe(0))
    }
  })

  it('kann Activities beim Erstellen mitgeben', async () => {
    const res = await request(app).post('/api/v1/projects').send({
      name: 'Projekt mit Activities',
      description: 'Test',
      kWp: 10,
      value: 35000,
      address: 'Test 2',
      email: 'a@b.ch',
      activities: [
        { type: 'SYSTEM', text: 'Projekt erstellt', createdBy: 'System', createdAt: new Date().toISOString() },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.data.activities.length).toBe(1)
    expect(res.body.data.activities[0].type).toBe('SYSTEM')
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/projects').send({
      kWp: 10,
    })
    expect(res.status).toBe(422)
  })

  it('validiert Email-Format', async () => {
    const res = await request(app).post('/api/v1/projects').send({
      name: 'Test', description: 'Test', kWp: 10, value: 1000,
      address: 'Addr', email: 'invalid',
    })
    expect(res.status).toBe(422)
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/projects/:id
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/projects/:id', () => {
  it('aktualisiert ein Projekt', async () => {
    const res = await request(app).put('/api/v1/projects/proj-001').send({
      name: 'Weber Holzbau Updated',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Weber Holzbau Updated')
  })

  it('aktualisiert Phase', async () => {
    const res = await request(app).put('/api/v1/projects/proj-001').send({
      phase: 'montage',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.phase).toBe('montage')
  })

  it('setzt updatedAt', async () => {
    const before = new Date().toISOString()
    const res = await request(app).put('/api/v1/projects/proj-002').send({
      priority: 'HIGH',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.updatedAt >= before).toBe(true)
  })

  it('gibt 404 für unbekannte ID', async () => {
    const res = await request(app).put('/api/v1/projects/nope').send({ name: 'X' })
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/projects/:id/toggle-step
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/projects/:id/toggle-step', () => {
  it('togglet einen Step', async () => {
    const before = await request(app).get('/api/v1/projects/proj-005')
    const wasDone = before.body.data.progress.abschluss[2]
    const res = await request(app).put('/api/v1/projects/proj-005/toggle-step').send({
      phase: 'abschluss',
      stepIndex: 2,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.progress.abschluss[2]).toBe(wasDone ? 0 : 1)
  })

  it('gibt 400 bei ungültigem Index', async () => {
    const res = await request(app).put('/api/v1/projects/proj-005/toggle-step').send({
      phase: 'abschluss',
      stepIndex: 999,
    })
    expect(res.status).toBe(400)
  })

  it('gibt 404 für unbekanntes Projekt', async () => {
    const res = await request(app).put('/api/v1/projects/nope/toggle-step').send({
      phase: 'admin',
      stepIndex: 0,
    })
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/projects/:id/activities
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/projects/:id/activities', () => {
  it('fügt eine Activity hinzu', async () => {
    const res = await request(app).post('/api/v1/projects/proj-002/activities').send({
      type: 'NOTE',
      text: 'Test-Notiz',
      createdBy: 'Tester',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('NOTE')
    expect(res.body.data.text).toBe('Test-Notiz')
    expect(res.body.data).toHaveProperty('id')
  })

  it('validiert leeren Text', async () => {
    const res = await request(app).post('/api/v1/projects/proj-002/activities').send({
      text: '',
    })
    expect(res.status).toBe(400)
  })

  it('gibt 404 für unbekanntes Projekt', async () => {
    const res = await request(app).post('/api/v1/projects/nope/activities').send({
      text: 'Test',
    })
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/projects/:id
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/projects/:id', () => {
  let idToDelete: string

  it('erstellt und löscht ein Projekt (soft-delete)', async () => {
    const create = await request(app).post('/api/v1/projects').send({
      name: 'Zum Löschen', description: 'Test', kWp: 5, value: 10000,
      address: 'Löschstr. 1', email: 'del@test.ch',
    })
    idToDelete = create.body.data.id

    const res = await request(app).delete(`/api/v1/projects/${idToDelete}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toContain('gelöscht')
  })

  it('gelöschtes Projekt erscheint nicht mehr in Liste', async () => {
    const res = await request(app).get('/api/v1/projects')
    const found = res.body.data.find((p: { id: string }) => p.id === idToDelete)
    expect(found).toBeUndefined()
  })

  it('gibt 404 für nicht existierendes Projekt', async () => {
    const res = await request(app).delete('/api/v1/projects/nope')
    expect(res.status).toBe(404)
  })
})
