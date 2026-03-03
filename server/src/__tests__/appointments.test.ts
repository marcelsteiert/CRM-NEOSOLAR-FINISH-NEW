import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/appointments
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/appointments', () => {
  it('gibt eine Liste von Terminen zurueck', async () => {
    const res = await request(app).get('/api/v1/appointments')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page')
    expect(res.body).toHaveProperty('pageSize')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('hat korrekte Termin-Struktur mit travelMinutes', async () => {
    const res = await request(app).get('/api/v1/appointments')
    const appt = res.body.data[0]
    expect(appt).toHaveProperty('id')
    expect(appt).toHaveProperty('contactName')
    expect(appt).toHaveProperty('contactEmail')
    expect(appt).toHaveProperty('contactPhone')
    expect(appt).toHaveProperty('address')
    expect(appt).toHaveProperty('status')
    expect(appt).toHaveProperty('priority')
    expect(appt).toHaveProperty('checklist')
    expect(appt).toHaveProperty('travelMinutes')
    expect(appt).toHaveProperty('createdAt')
    expect(appt).toHaveProperty('updatedAt')
    expect(Array.isArray(appt.checklist)).toBe(true)
  })

  it('berechnet travelMinutes korrekt fuer bekannte Staedte', async () => {
    const res = await request(app).get('/api/v1/appointments')
    const wetzikon = res.body.data.find((a: { address: string }) => a.address.includes('Wetzikon'))
    if (wetzikon) {
      expect(wetzikon.travelMinutes).toBe(75)
    }
    const olten = res.body.data.find((a: { address: string }) => a.address.includes('Olten'))
    if (olten) {
      expect(olten.travelMinutes).toBe(100)
    }
  })

  it('filtert nach Status', async () => {
    const res = await request(app).get('/api/v1/appointments?status=GEPLANT')
    expect(res.status).toBe(200)
    res.body.data.forEach((a: { status: string }) => {
      expect(a.status).toBe('GEPLANT')
    })
  })

  it('filtert nach Prioritaet', async () => {
    const res = await request(app).get('/api/v1/appointments?priority=URGENT')
    expect(res.status).toBe(200)
    res.body.data.forEach((a: { priority: string }) => {
      expect(a.priority).toBe('URGENT')
    })
  })

  it('filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/appointments?assignedTo=u001')
    expect(res.status).toBe(200)
    res.body.data.forEach((a: { assignedTo: string }) => {
      expect(a.assignedTo).toBe('u001')
    })
  })

  it('sucht nach Kontaktname', async () => {
    const res = await request(app).get('/api/v1/appointments?search=Hofer')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0].contactName).toContain('Hofer')
  })

  it('sucht nach Adresse', async () => {
    const res = await request(app).get('/api/v1/appointments?search=Winterthur')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('paginiert korrekt', async () => {
    const res = await request(app).get('/api/v1/appointments?pageSize=2&page=1')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
    expect(res.body.pageSize).toBe(2)
    expect(res.body.page).toBe(1)
  })

  it('sortiert nach appointmentDate aufsteigend', async () => {
    const res = await request(app).get('/api/v1/appointments?sortBy=appointmentDate&sortOrder=asc')
    expect(res.status).toBe(200)
    const dates = res.body.data
      .filter((a: { appointmentDate: string | null }) => a.appointmentDate)
      .map((a: { appointmentDate: string }) => a.appointmentDate)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] >= dates[i - 1]).toBe(true)
    }
  })

  it('sortiert nach appointmentDate absteigend', async () => {
    const res = await request(app).get('/api/v1/appointments?sortBy=appointmentDate&sortOrder=desc')
    expect(res.status).toBe(200)
    const dates = res.body.data
      .filter((a: { appointmentDate: string | null }) => a.appointmentDate)
      .map((a: { appointmentDate: string }) => a.appointmentDate)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] <= dates[i - 1]).toBe(true)
    }
  })

  it('zeigt keine geloeschten Termine an', async () => {
    const res = await request(app).get('/api/v1/appointments')
    res.body.data.forEach((a: { deletedAt: string | null }) => {
      expect(a.deletedAt).toBeNull()
    })
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/appointments/stats
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/appointments/stats', () => {
  it('gibt Statistiken zurueck', async () => {
    const res = await request(app).get('/api/v1/appointments/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('upcoming')
    expect(res.body.data).toHaveProperty('totalValue')
    expect(res.body.data).toHaveProperty('statuses')
    expect(res.body.data).toHaveProperty('checklistProgress')
    expect(typeof res.body.data.total).toBe('number')
    expect(typeof res.body.data.checklistProgress).toBe('number')
  })

  it('filtert Stats nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/appointments/stats?assignedTo=u001')
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/appointments/:id
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/appointments/:id', () => {
  it('gibt einen einzelnen Termin zurueck', async () => {
    const list = await request(app).get('/api/v1/appointments')
    const id = list.body.data[0].id
    const res = await request(app).get(`/api/v1/appointments/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(id)
    expect(res.body.data).toHaveProperty('travelMinutes')
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).get('/api/v1/appointments/non-existent-id')
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/appointments
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/appointments', () => {
  it('erstellt einen neuen Termin', async () => {
    const res = await request(app).post('/api/v1/appointments').send({
      contactName: 'Hans Muster',
      contactEmail: 'hans@muster.ch',
      contactPhone: '+41 79 123 45 67',
      address: 'Hauptstrasse 1, 9430 St. Margrethen',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.contactName).toBe('Hans Muster')
    expect(res.body.data.status).toBe('GEPLANT')
    expect(res.body.data.priority).toBe('MEDIUM')
    expect(res.body.data).toHaveProperty('travelMinutes')
    expect(res.body.data.travelMinutes).toBe(0) // St. Margrethen = 0 min
    expect(Array.isArray(res.body.data.checklist)).toBe(true)
    expect(res.body.data.checklist.length).toBe(8) // Default checklist
  })

  it('erstellt Termin mit optionalen Feldern', async () => {
    const res = await request(app).post('/api/v1/appointments').send({
      contactName: 'Peter Keller',
      contactEmail: 'peter@keller.ch',
      contactPhone: '+41 44 111 22 33',
      address: 'Bahnhofstrasse 10, 8001 Zuerich',
      company: 'Keller Solar GmbH',
      value: 55000,
      assignedTo: 'u001',
      appointmentDate: '2026-04-15',
      appointmentTime: '14:00',
      preparationNotes: 'Grosses Flachdach',
      notes: 'Kundenwunsch: Eigenverbrauch optimieren',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.company).toBe('Keller Solar GmbH')
    expect(res.body.data.value).toBe(55000)
    expect(res.body.data.travelMinutes).toBe(80) // Zuerich = 80 min
    expect(res.body.data.appointmentDate).toBe('2026-04-15')
    expect(res.body.data.appointmentTime).toBe('14:00')
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/appointments').send({})
    expect(res.status).toBe(422)
  })

  it('validiert E-Mail-Format', async () => {
    const res = await request(app).post('/api/v1/appointments').send({
      contactName: 'Test',
      contactEmail: 'ungueltig',
      contactPhone: '+41 79 000 00 00',
      address: 'Test 1, 8000 Zuerich',
    })
    expect(res.status).toBe(422)
  })

  it('neuer Termin erscheint in Liste', async () => {
    const create = await request(app).post('/api/v1/appointments').send({
      contactName: 'Listentest Termin',
      contactEmail: 'listen@test.ch',
      contactPhone: '+41 79 999 99 99',
      address: 'Testweg 1, 9000 St. Gallen',
    })
    const id = create.body.data.id

    const list = await request(app).get('/api/v1/appointments')
    const found = list.body.data.find((a: { id: string }) => a.id === id)
    expect(found).toBeDefined()
    expect(found.travelMinutes).toBe(25) // St. Gallen = 25 min
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/appointments/:id
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/appointments/:id', () => {
  it('aktualisiert Termin-Felder', async () => {
    const list = await request(app).get('/api/v1/appointments')
    const id = list.body.data[0].id

    const res = await request(app).put(`/api/v1/appointments/${id}`).send({
      preparationNotes: 'Aktualisierte Notizen',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.preparationNotes).toBe('Aktualisierte Notizen')
    expect(res.body.data).toHaveProperty('travelMinutes')
  })

  it('aktualisiert Checkliste', async () => {
    const list = await request(app).get('/api/v1/appointments')
    const appt = list.body.data[0]

    const updatedChecklist = appt.checklist.map((c: { id: string; label: string; checked: boolean }) => ({
      ...c,
      checked: true,
    }))

    const res = await request(app).put(`/api/v1/appointments/${appt.id}`).send({
      checklist: updatedChecklist,
    })
    expect(res.status).toBe(200)
    res.body.data.checklist.forEach((c: { checked: boolean }) => {
      expect(c.checked).toBe(true)
    })
  })

  it('setzt Status auf VORBEREITUNG', async () => {
    const list = await request(app).get('/api/v1/appointments')
    const id = list.body.data[0].id

    const res = await request(app).put(`/api/v1/appointments/${id}`).send({
      status: 'VORBEREITUNG',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('VORBEREITUNG')
  })

  it('setzt updatedAt bei Aenderung', async () => {
    const list = await request(app).get('/api/v1/appointments')
    const appt = list.body.data[0]
    const before = new Date(appt.updatedAt).getTime()

    const res = await request(app).put(`/api/v1/appointments/${appt.id}`).send({
      notes: 'Timestamp Test',
    })
    const after = new Date(res.body.data.updatedAt).getTime()
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).put('/api/v1/appointments/non-existent-id').send({
      notes: 'Test',
    })
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/appointments/:id
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/appointments/:id', () => {
  it('loescht einen Termin (soft delete)', async () => {
    const create = await request(app).post('/api/v1/appointments').send({
      contactName: 'Zum Loeschen',
      contactEmail: 'delete@test.ch',
      contactPhone: '+41 79 000 00 00',
      address: 'Loeschweg 1, 8000 Zuerich',
    })
    const id = create.body.data.id

    const res = await request(app).delete(`/api/v1/appointments/${id}`)
    expect(res.status).toBe(200)

    // Geloeschter Termin nicht mehr in Liste
    const list = await request(app).get('/api/v1/appointments')
    const found = list.body.data.find((a: { id: string }) => a.id === id)
    expect(found).toBeUndefined()
  })

  it('gibt 404 fuer unbekannte ID', async () => {
    const res = await request(app).delete('/api/v1/appointments/non-existent-id')
    expect(res.status).toBe(404)
  })
})
