import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ════════════════════════════════════════════════════════════════════════════
// E2E COMPLETE – Jeder Test ist eigenständig, ohne shared State
// ════════════════════════════════════════════════════════════════════════════

const uid = () => Math.random().toString(36).slice(2, 8)

// ─── Helper: Frische Test-Entitäten erzeugen ───────────────────────────────

async function createLead(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await request(app).post('/api/v1/leads').send({
    firstName: `Test-${u}`, lastName: `Lead-${u}`,
    address: 'Teststrasse 1, 9430 St. Margrethen',
    phone: '+41 71 000 00 00', email: `lead-${u}@e2e.ch`,
    source: 'HOMEPAGE', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createAppointment(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await request(app).post('/api/v1/appointments').send({
    contactName: `Kontakt-${u}`, contactEmail: `appt-${u}@e2e.ch`,
    contactPhone: '+41 71 000 00 00',
    address: 'Teststrasse 1, 9430 St. Margrethen',
    appointmentDate: '2026-06-15', appointmentTime: '10:00',
    assignedTo: 'u001', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createDeal(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await request(app).post('/api/v1/deals').send({
    title: `Deal-${u}`, contactName: `Kontakt-${u}`,
    contactEmail: `deal-${u}@e2e.ch`, contactPhone: '+41 71 000 00 00',
    address: 'Teststrasse 1, 9430 St. Margrethen',
    value: 30000, assignedTo: 'u001', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createProject(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await request(app).post('/api/v1/projects').send({
    name: `Projekt-${u}`, description: 'E2E Test',
    address: 'Teststrasse 1, 9430 St. Margrethen',
    email: `proj-${u}@e2e.ch`, kWp: 10, value: 25000, ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createTask(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await request(app).post('/api/v1/tasks').send({
    title: `Task-${u}`, module: 'ALLGEMEIN', assignedTo: 'u001', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createTag(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await request(app).post('/api/v1/tags').send({
    name: `Tag-${u}`, color: '#FF5733', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createPipeline() {
  const u = uid()
  const res = await request(app).post('/api/v1/pipelines').send({ name: `Pipeline-${u}` })
  expect(res.status).toBe(201)
  return res.body.data
}

async function addBucket(pipelineId: string, name: string) {
  const res = await request(app)
    .post(`/api/v1/pipelines/${pipelineId}/buckets`)
    .send({ name })
  expect(res.status).toBe(201)
  return res.body.data
}

// ════════════════════════════════════════════════════════════════════════════
// 1. HEALTH & INFRASTRUKTUR
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Health & Infrastruktur', () => {
  it('Health-Endpoint antwortet mit Status und Version', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
    expect(res.body).toHaveProperty('timestamp')
    expect(res.body).toHaveProperty('version')
  })

  it('404 bei unbekannter Route', async () => {
    const res = await request(app).get('/api/v1/nonexistent')
    expect(res.status).toBe(404)
  })

  it('404 bei falschem HTTP-Verb', async () => {
    const res = await request(app).patch('/api/v1/leads')
    expect(res.status).toBe(404)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. BENUTZER-VERWALTUNG
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Benutzer-Verwaltung', () => {
  it('listet bestehende Benutzer mit korrekter Struktur', async () => {
    const res = await request(app).get('/api/v1/users')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    const user = res.body.data[0]
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('firstName')
    expect(user).toHaveProperty('lastName')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('role')
    expect(user).toHaveProperty('isActive')
    expect(user).toHaveProperty('allowedModules')
  })

  it('erstellt neuen Benutzer mit Rollen-Defaults', async () => {
    const u = uid()
    const res = await request(app)
      .post('/api/v1/users')
      .send({ firstName: `E2E-${u}`, lastName: 'Tester', email: `e2e-${u}@neosolar.ch`, role: 'VERTRIEB' })
    expect(res.status).toBe(201)
    expect(res.body.data.firstName).toBe(`E2E-${u}`)
    expect(res.body.data.role).toBe('VERTRIEB')
    expect(res.body.data.isActive).toBe(true)
    expect(res.body.data.allowedModules.length).toBeGreaterThan(0)
  })

  it('Rollen-Defaults liefern Module pro Rolle', async () => {
    const res = await request(app).get('/api/v1/users/role-defaults')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('ADMIN')
    expect(res.body.data).toHaveProperty('VERTRIEB')
    expect(res.body.data).toHaveProperty('PROJEKTLEITUNG')
    expect(res.body.data).toHaveProperty('BUCHHALTUNG')
    expect(res.body.data).toHaveProperty('GL')
    expect(res.body.data.ADMIN.length).toBeGreaterThanOrEqual(res.body.data.VERTRIEB.length)
  })

  it('aktualisiert Benutzer-Rolle', async () => {
    const u = uid()
    const c = await request(app).post('/api/v1/users')
      .send({ firstName: `Role-${u}`, lastName: 'Test', email: `role-${u}@e2e.ch`, role: 'VERTRIEB' })
    const id = c.body.data.id

    const res = await request(app).put(`/api/v1/users/${id}`).send({ role: 'PROJEKTLEITUNG' })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('PROJEKTLEITUNG')
  })

  it('aktualisiert individuelle Module', async () => {
    const u = uid()
    const c = await request(app).post('/api/v1/users')
      .send({ firstName: `Mod-${u}`, lastName: 'Test', email: `mod-${u}@e2e.ch`, role: 'VERTRIEB' })
    const id = c.body.data.id

    const res = await request(app).put(`/api/v1/users/${id}`)
      .send({ allowedModules: ['dashboard', 'leads', 'projects'] })
    expect(res.status).toBe(200)
    expect(res.body.data.allowedModules).toEqual(['dashboard', 'leads', 'projects'])
  })

  it('einzelner Benutzer abrufbar', async () => {
    const u = uid()
    const c = await request(app).post('/api/v1/users')
      .send({ firstName: `Get-${u}`, lastName: 'Test', email: `get-${u}@e2e.ch`, role: 'VERTRIEB' })
    const id = c.body.data.id

    const res = await request(app).get(`/api/v1/users/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(id)
  })

  it('deaktiviert Benutzer (Soft-Delete)', async () => {
    const u = uid()
    const c = await request(app).post('/api/v1/users')
      .send({ firstName: `Del-${u}`, lastName: 'Test', email: `del-${u}@e2e.ch`, role: 'VERTRIEB' })
    const id = c.body.data.id

    const res = await request(app).delete(`/api/v1/users/${id}`)
    expect(res.status).toBe(200)
    const check = await request(app).get(`/api/v1/users/${id}`)
    expect(check.body.data.isActive).toBe(false)
  })

  it('404 bei unbekanntem Benutzer', async () => {
    const res = await request(app).get('/api/v1/users/nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('400 bei fehlenden Pflichtfeldern', async () => {
    const res = await request(app).post('/api/v1/users').send({})
    expect(res.status).toBe(400)
  })

  it('400 bei ungültiger Rolle', async () => {
    const res = await request(app).post('/api/v1/users')
      .send({ firstName: 'Bad', lastName: 'Role', email: `bad-${uid()}@e2e.ch`, role: 'INVALID' })
    expect(res.status).toBe(400)
  })

  it('409 bei doppelter E-Mail', async () => {
    const res = await request(app).post('/api/v1/users')
      .send({ firstName: 'Dupe', lastName: 'Email', email: 'marco.bianchi@neosolar.ch', role: 'VERTRIEB' })
    expect(res.status).toBe(409)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. TAGS
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Tag-Verwaltung', () => {
  it('listet bestehende Tags', async () => {
    const res = await request(app).get('/api/v1/tags')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0]).toHaveProperty('id')
    expect(res.body.data[0]).toHaveProperty('name')
    expect(res.body.data[0]).toHaveProperty('color')
  })

  it('erstellt neuen Tag', async () => {
    const tag = await createTag()
    expect(tag).toHaveProperty('id')
    expect(tag).toHaveProperty('name')
    expect(tag.color).toBe('#FF5733')
  })

  it('409 bei doppeltem Tag-Name', async () => {
    const name = `Dupe-${uid()}`
    await request(app).post('/api/v1/tags').send({ name, color: '#000000' })
    const res = await request(app).post('/api/v1/tags').send({ name, color: '#FFFFFF' })
    expect(res.status).toBe(409)
  })

  it('löscht Tag', async () => {
    const tag = await createTag()
    const res = await request(app).delete(`/api/v1/tags/${tag.id}`)
    expect(res.status).toBe(200)
  })

  it('404 beim Löschen unbekannten Tags', async () => {
    const res = await request(app).delete('/api/v1/tags/nonexistent-id')
    expect(res.status).toBe(404)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. PIPELINES & BUCKETS
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Pipeline-Verwaltung', () => {
  it('listet Pipelines mit Buckets', async () => {
    const res = await request(app).get('/api/v1/pipelines')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    const pipeline = res.body.data[0]
    expect(pipeline).toHaveProperty('id')
    expect(pipeline).toHaveProperty('name')
    expect(pipeline).toHaveProperty('buckets')
    expect(Array.isArray(pipeline.buckets)).toBe(true)
  })

  it('erstellt Pipeline mit Buckets', async () => {
    const pipeline = await createPipeline()
    const b1 = await addBucket(pipeline.id, 'Erstgespräch')
    const b2 = await addBucket(pipeline.id, 'Qualifiziert')
    const b3 = await addBucket(pipeline.id, 'Abgeschlossen')

    const check = await request(app).get('/api/v1/pipelines')
    const found = check.body.data.find((p: { id: string }) => p.id === pipeline.id)
    expect(found.buckets.length).toBe(3)
    expect(found.buckets[0].position).toBe(0)
    expect(found.buckets[1].position).toBe(1)
    expect(found.buckets[2].position).toBe(2)

    // Cleanup
    await request(app).delete(`/api/v1/pipelines/${pipeline.id}`)
  })

  it('ordnet Buckets neu (Reorder)', async () => {
    const pipeline = await createPipeline()
    const b1 = await addBucket(pipeline.id, 'A')
    const b2 = await addBucket(pipeline.id, 'B')
    const b3 = await addBucket(pipeline.id, 'C')

    const res = await request(app)
      .put(`/api/v1/pipelines/${pipeline.id}/buckets/reorder`)
      .send({ bucketIds: [b3.id, b1.id, b2.id] })
    expect(res.status).toBe(200)
    expect(res.body.data[0].id).toBe(b3.id)

    await request(app).delete(`/api/v1/pipelines/${pipeline.id}`)
  })

  it('aktualisiert Bucket-Name', async () => {
    const pipeline = await createPipeline()
    const bucket = await addBucket(pipeline.id, 'Original')

    const res = await request(app)
      .put(`/api/v1/pipelines/${pipeline.id}/buckets/${bucket.id}`)
      .send({ name: 'Umbenannt' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Umbenannt')

    await request(app).delete(`/api/v1/pipelines/${pipeline.id}`)
  })

  it('löscht Bucket und reindexiert Positionen', async () => {
    const pipeline = await createPipeline()
    const b1 = await addBucket(pipeline.id, 'A')
    const b2 = await addBucket(pipeline.id, 'B')
    const b3 = await addBucket(pipeline.id, 'C')

    await request(app).delete(`/api/v1/pipelines/${pipeline.id}/buckets/${b1.id}`)

    const check = await request(app).get('/api/v1/pipelines')
    const found = check.body.data.find((p: { id: string }) => p.id === pipeline.id)
    expect(found.buckets.length).toBe(2)
    found.buckets.forEach((b: { position: number }, i: number) => {
      expect(b.position).toBe(i)
    })

    await request(app).delete(`/api/v1/pipelines/${pipeline.id}`)
  })

  it('löscht Pipeline komplett', async () => {
    const pipeline = await createPipeline()
    await addBucket(pipeline.id, 'X')

    const res = await request(app).delete(`/api/v1/pipelines/${pipeline.id}`)
    expect(res.status).toBe(200)

    const check = await request(app).get('/api/v1/pipelines')
    expect(check.body.data.find((p: { id: string }) => p.id === pipeline.id)).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 5. SETTINGS
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Settings', () => {
  it('lädt Settings mit Follow-Up Regeln und Checkliste', async () => {
    const res = await request(app).get('/api/v1/settings')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('defaultFollowUpDays')
    expect(res.body.data).toHaveProperty('followUpRules')
    expect(res.body.data).toHaveProperty('checklistTemplate')
    expect(res.body.data).toHaveProperty('companyAddress')
    expect(res.body.data.followUpRules.length).toBe(4)
    expect(res.body.data.checklistTemplate.length).toBe(8)
  })

  it('Follow-Up Regeln: urgentMaxDays <= maxDays', async () => {
    const res = await request(app).get('/api/v1/settings')
    for (const rule of res.body.data.followUpRules) {
      expect(rule).toHaveProperty('stage')
      expect(rule).toHaveProperty('maxDays')
      expect(rule).toHaveProperty('urgentMaxDays')
      expect(rule.urgentMaxDays).toBeLessThanOrEqual(rule.maxDays)
    }
  })

  it('Checkliste Items haben id und Label', async () => {
    const res = await request(app).get('/api/v1/settings')
    for (const item of res.body.data.checklistTemplate) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('label')
      expect(item.label.length).toBeGreaterThan(0)
    }
  })

  it('aktualisiert defaultFollowUpDays (partial update)', async () => {
    const original = await request(app).get('/api/v1/settings')
    const origDays = original.body.data.defaultFollowUpDays

    const up = await request(app).put('/api/v1/settings').send({ defaultFollowUpDays: 7 })
    expect(up.status).toBe(200)
    expect(up.body.data.defaultFollowUpDays).toBe(7)

    // Zurücksetzen
    await request(app).put('/api/v1/settings').send({ defaultFollowUpDays: origDays })
  })

  it('aktualisiert companyAddress', async () => {
    const original = await request(app).get('/api/v1/settings')
    const origAddr = original.body.data.companyAddress

    const up = await request(app).put('/api/v1/settings').send({ companyAddress: 'Zürich' })
    expect(up.status).toBe(200)
    expect(up.body.data.companyAddress).toBe('Zürich')

    await request(app).put('/api/v1/settings').send({ companyAddress: origAddr })
  })

  it('422 bei defaultFollowUpDays > 30', async () => {
    const res = await request(app).put('/api/v1/settings').send({ defaultFollowUpDays: 99 })
    expect(res.status).toBe(422)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. LEADS – Vollständiger Lifecycle
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Lead-Lifecycle', () => {
  it('listet Leads mit Pagination', async () => {
    const res = await request(app).get('/api/v1/leads?pageSize=5&page=1')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(5)
    expect(res.body.page).toBe(1)
    expect(res.body.pageSize).toBe(5)
    expect(typeof res.body.total).toBe('number')
  })

  it('erstellt neuen Lead mit korrekter Struktur', async () => {
    const lead = await createLead({ value: 45000, notes: 'E2E Test' })
    expect(lead.source).toBe('HOMEPAGE')
    expect(lead.status).toBe('ACTIVE')
    expect(lead.deletedAt).toBeNull()
    expect(lead.value).toBe(45000)
  })

  it('Lead ist per ID abrufbar', async () => {
    const lead = await createLead()
    const res = await request(app).get(`/api/v1/leads/${lead.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(lead.id)
  })

  it('sucht Lead per Suchtext', async () => {
    const lead = await createLead({ lastName: 'Suchtest-E2E-Unique' })
    const res = await request(app).get('/api/v1/leads?search=Suchtest-E2E-Unique')
    expect(res.status).toBe(200)
    const found = res.body.data.some((l: { lastName: string }) => l.lastName === 'Suchtest-E2E-Unique')
    expect(found).toBe(true)
  })

  it('filtert nach Source', async () => {
    await createLead({ source: 'MESSE' })
    const res = await request(app).get('/api/v1/leads?source=MESSE')
    expect(res.status).toBe(200)
    res.body.data.forEach((l: { source: string }) => {
      expect(l.source).toBe('MESSE')
    })
  })

  it('sortiert nach createdAt absteigend', async () => {
    const res = await request(app).get('/api/v1/leads?sortBy=createdAt&sortOrder=desc')
    expect(res.status).toBe(200)
    const dates = res.body.data.map((l: { createdAt: string }) => new Date(l.createdAt).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
    }
  })

  it('aktualisiert Lead-Felder', async () => {
    const lead = await createLead()
    const res = await request(app).put(`/api/v1/leads/${lead.id}`)
      .send({ notes: 'Aktualisiert per E2E' })
    expect(res.status).toBe(200)
    expect(res.body.data.notes).toBe('Aktualisiert per E2E')
  })

  it('weist Tag einem Lead zu', async () => {
    const lead = await createLead()
    const tag = await createTag()

    const res = await request(app).post(`/api/v1/leads/${lead.id}/tags`)
      .send({ tagIds: [tag.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tag.id)
  })

  it('Tag-Duplikate werden ignoriert', async () => {
    const lead = await createLead()
    const tag = await createTag()

    await request(app).post(`/api/v1/leads/${lead.id}/tags`).send({ tagIds: [tag.id] })
    const res = await request(app).post(`/api/v1/leads/${lead.id}/tags`).send({ tagIds: [tag.id] })
    expect(res.status).toBe(200)
    const count = res.body.data.tags.filter((t: string) => t === tag.id).length
    expect(count).toBe(1)
  })

  it('entfernt Tag vom Lead', async () => {
    const lead = await createLead()
    const tag = await createTag()
    await request(app).post(`/api/v1/leads/${lead.id}/tags`).send({ tagIds: [tag.id] })

    const res = await request(app).delete(`/api/v1/leads/${lead.id}/tags/${tag.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.tags).not.toContain(tag.id)
  })

  it('verschiebt Lead in Pipeline-Bucket', async () => {
    const lead = await createLead()
    const pipelines = await request(app).get('/api/v1/pipelines')
    const bucket = pipelines.body.data[0].buckets[0]

    const res = await request(app).put(`/api/v1/leads/${lead.id}/move`).send({ bucketId: bucket.id })
    expect(res.status).toBe(200)
    expect(res.body.data.bucketId).toBe(bucket.id)
  })

  it('422 bei Lead ohne Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/leads').send({})
    expect(res.status).toBe(422)
  })

  it('422 bei Lead mit ungültiger E-Mail', async () => {
    const res = await request(app).post('/api/v1/leads').send({
      address: 'Test', phone: '+41 00', email: 'not-an-email', source: 'HOMEPAGE',
    })
    expect(res.status).toBe(422)
  })

  it('404 bei unbekanntem Lead', async () => {
    const res = await request(app).get('/api/v1/leads/nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('Soft-Delete Lead', async () => {
    const lead = await createLead()
    await request(app).delete(`/api/v1/leads/${lead.id}`)
    const list = await request(app).get('/api/v1/leads')
    expect(list.body.data.find((l: { id: string }) => l.id === lead.id)).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 7. TERMINE
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Termine-Lifecycle', () => {
  it('listet Termine mit Pagination', async () => {
    const res = await request(app).get('/api/v1/appointments?pageSize=5')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('total')
  })

  it('erstellt Termin verknüpft mit Lead', async () => {
    const lead = await createLead()
    const appt = await createAppointment({ leadId: lead.id })
    expect(appt.leadId).toBe(lead.id)
    expect(Array.isArray(appt.checklist)).toBe(true)
    expect(appt.checklist.length).toBe(8)
  })

  it('Fahrzeit 0 für St. Margrethen', async () => {
    const appt = await createAppointment({ address: 'Teststrasse 1, 9430 St. Margrethen' })
    expect(appt.travelMinutes).toBe(0)
  })

  it('Fahrzeit 80 für Zürich', async () => {
    const appt = await createAppointment({ address: 'Limmatstrasse 10, 8005 Zürich' })
    expect(appt.travelMinutes).toBe(80)
  })

  it('Termin-Statistiken', async () => {
    const res = await request(app).get('/api/v1/appointments/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
    expect(typeof res.body.data.total).toBe('number')
  })

  it('filtert nach Status GEPLANT', async () => {
    const res = await request(app).get('/api/v1/appointments?status=GEPLANT')
    expect(res.status).toBe(200)
    res.body.data.forEach((a: { status: string }) => {
      expect(a.status).toBe('GEPLANT')
    })
  })

  it('filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/appointments?assignedTo=u001')
    expect(res.status).toBe(200)
    res.body.data.forEach((a: { assignedTo: string }) => {
      expect(a.assignedTo).toBe('u001')
    })
  })

  it('aktualisiert Termin-Status', async () => {
    const appt = await createAppointment()
    const res = await request(app).put(`/api/v1/appointments/${appt.id}`)
      .send({ status: 'DURCHGEFUEHRT' })
    expect(res.status).toBe(200)
  })

  it('422 bei Termin ohne Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/appointments').send({})
    expect(res.status).toBe(422)
  })

  it('404 bei unbekanntem Termin', async () => {
    const res = await request(app).get('/api/v1/appointments/nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('Soft-Delete Termin', async () => {
    const appt = await createAppointment()
    await request(app).delete(`/api/v1/appointments/${appt.id}`)
    const list = await request(app).get('/api/v1/appointments')
    expect(list.body.data.find((a: { id: string }) => a.id === appt.id)).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 8. ANGEBOTE (Deals)
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Angebote-Lifecycle', () => {
  it('erstellt Angebot mit korrekter Struktur', async () => {
    const deal = await createDeal({ value: 45000, winProbability: 60 })
    expect(deal.stage).toBe('ERSTELLT')
    expect(deal.value).toBe(45000)
    expect(deal.closedAt).toBeNull()
  })

  it('erstellt Angebot verknüpft mit Lead + Termin', async () => {
    const lead = await createLead()
    const appt = await createAppointment({ leadId: lead.id })
    const deal = await createDeal({ leadId: lead.id, appointmentId: appt.id })
    expect(deal.leadId).toBe(lead.id)
    expect(deal.appointmentId).toBe(appt.id)
  })

  it('ERSTELLT → GESENDET → FOLLOW_UP → VERHANDLUNG → GEWONNEN', async () => {
    const deal = await createDeal()
    const id = deal.id

    const s1 = await request(app).put(`/api/v1/deals/${id}`).send({ stage: 'GESENDET' })
    expect(s1.body.data.stage).toBe('GESENDET')
    expect(s1.body.data.closedAt).toBeNull()

    const s2 = await request(app).put(`/api/v1/deals/${id}`).send({ stage: 'FOLLOW_UP' })
    expect(s2.body.data.stage).toBe('FOLLOW_UP')

    const s3 = await request(app).put(`/api/v1/deals/${id}`).send({ stage: 'VERHANDLUNG', winProbability: 85 })
    expect(s3.body.data.stage).toBe('VERHANDLUNG')
    expect(s3.body.data.winProbability).toBe(85)

    const s4 = await request(app).put(`/api/v1/deals/${id}`).send({ stage: 'GEWONNEN' })
    expect(s4.body.data.stage).toBe('GEWONNEN')
    expect(s4.body.data.closedAt).not.toBeNull()
  })

  it('VERLOREN setzt closedAt', async () => {
    const deal = await createDeal()
    const res = await request(app).put(`/api/v1/deals/${deal.id}`).send({ stage: 'VERLOREN' })
    expect(res.status).toBe(200)
    expect(res.body.data.closedAt).not.toBeNull()
  })

  it('Follow-Up-Liste', async () => {
    const res = await request(app).get('/api/v1/deals/follow-ups')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('dealId')
      expect(res.body.data[0]).toHaveProperty('urgency')
    }
  })

  it('Deal-Statistiken', async () => {
    const res = await request(app).get('/api/v1/deals/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('totalDeals')
    expect(res.body.data).toHaveProperty('totalValue')
    expect(res.body.data.totalDeals).toBeGreaterThan(0)
  })

  it('filtert nach Stage', async () => {
    await createDeal() // ERSTELLT
    const res = await request(app).get('/api/v1/deals?stage=ERSTELLT')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: { stage: string }) => {
      expect(d.stage).toBe('ERSTELLT')
    })
  })

  it('Pagination', async () => {
    const res = await request(app).get('/api/v1/deals?pageSize=2&page=1')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
  })

  it('sortiert nach value desc', async () => {
    const res = await request(app).get('/api/v1/deals?sortBy=value&sortOrder=desc')
    expect(res.status).toBe(200)
    const values = res.body.data.map((d: { value: number }) => d.value)
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })

  it('Soft-Delete Angebot', async () => {
    const deal = await createDeal()
    await request(app).delete(`/api/v1/deals/${deal.id}`)
    const list = await request(app).get('/api/v1/deals')
    expect(list.body.data.find((d: { id: string }) => d.id === deal.id)).toBeUndefined()
  })

  it('422 bei Angebot ohne Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/deals').send({})
    expect(res.status).toBe(422)
  })

  it('404 bei unbekanntem Angebot', async () => {
    const res = await request(app).get('/api/v1/deals/nonexistent-id')
    expect(res.status).toBe(404)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 9. AKTIVITÄTEN
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Aktivitäten', () => {
  it('erstellt Aktivität für Lead', async () => {
    const lead = await createLead()
    const res = await request(app).post('/api/v1/activities').send({
      leadId: lead.id, type: 'CALL', title: 'Telefonat', createdBy: 'u001',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('CALL')
    expect(res.body.data.leadId).toBe(lead.id)
  })

  it('listet Aktivitäten nach leadId', async () => {
    const lead = await createLead()
    await request(app).post('/api/v1/activities').send({
      leadId: lead.id, type: 'NOTE', title: 'Notiz', createdBy: 'u001',
    })
    const res = await request(app).get(`/api/v1/activities?leadId=${lead.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('erstellt NOTE, EMAIL, MEETING Aktivitäten', async () => {
    const lead = await createLead()
    for (const type of ['NOTE', 'EMAIL', 'MEETING']) {
      const res = await request(app).post('/api/v1/activities').send({
        leadId: lead.id, type, title: `E2E ${type}`, createdBy: 'u001',
      })
      expect(res.status).toBe(201)
      expect(res.body.data.type).toBe(type)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 10. PROJEKTE
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Projekt-Lifecycle', () => {
  it('Phasen-Definitionen: 4 Phasen mit Steps', async () => {
    const res = await request(app).get('/api/v1/projects/phases')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(4)
    const ids = res.body.data.map((p: { id: string }) => p.id)
    expect(ids).toContain('admin')
    expect(ids).toContain('montage')
    expect(ids).toContain('elektro')
    expect(ids).toContain('abschluss')
    for (const phase of res.body.data) {
      expect(phase.steps.length).toBeGreaterThan(0)
    }
  })

  it('listet Partner', async () => {
    const res = await request(app).get('/api/v1/projects/partners')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('name')
      expect(res.body.data[0]).toHaveProperty('type')
    }
  })

  it('erstellt Projekt mit korrekter Struktur', async () => {
    const project = await createProject({ kWp: 15.5, value: 45000, priority: 'HIGH' })
    expect(project.phase).toBe('admin')
    expect(project).toHaveProperty('progress')
  })

  it('erstellt Projekt verknüpft mit Deal', async () => {
    const deal = await createDeal()
    const project = await createProject({ dealId: deal.id })
    expect(project.dealId).toBe(deal.id)
  })

  it('Projekt hat enriched Felder (total, done, percent)', async () => {
    const project = await createProject()
    const res = await request(app).get(`/api/v1/projects/${project.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('done')
    expect(res.body.data).toHaveProperty('percent')
    expect(typeof res.body.data.percent).toBe('number')
  })

  it('toggled Phase-Step hin und zurück', async () => {
    const project = await createProject()

    const on = await request(app).put(`/api/v1/projects/${project.id}/toggle-step`)
      .send({ phase: 'admin', stepIndex: 0 })
    expect(on.status).toBe(200)
    expect(on.body.data.done).toBeGreaterThan(0)

    const off = await request(app).put(`/api/v1/projects/${project.id}/toggle-step`)
      .send({ phase: 'admin', stepIndex: 0 })
    expect(off.status).toBe(200)
  })

  it('aktualisiert Projekt-Phase', async () => {
    const project = await createProject()
    const res = await request(app).put(`/api/v1/projects/${project.id}`)
      .send({ phase: 'montage' })
    expect(res.status).toBe(200)
    expect(res.body.data.phase).toBe('montage')
  })

  it('fügt Projekt-Aktivität hinzu', async () => {
    const project = await createProject()
    const res = await request(app).post(`/api/v1/projects/${project.id}/activities`)
      .send({ type: 'NOTE', text: 'Material bestellt', createdBy: 'u001' })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('NOTE')
  })

  it('Projekt-Statistiken', async () => {
    const res = await request(app).get('/api/v1/projects/stats')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
  })

  it('filtert nach Phase', async () => {
    await createProject() // admin phase
    const res = await request(app).get('/api/v1/projects?phase=admin')
    expect(res.status).toBe(200)
    res.body.data.forEach((p: { phase: string }) => {
      expect(p.phase).toBe('admin')
    })
  })

  it('sucht nach Name', async () => {
    const project = await createProject({ name: 'UniqueSearch-E2E' })
    const res = await request(app).get('/api/v1/projects?search=UniqueSearch-E2E')
    expect(res.status).toBe(200)
    expect(res.body.data.some((p: { name: string }) => p.name === 'UniqueSearch-E2E')).toBe(true)
  })

  it('404 bei unbekanntem Projekt', async () => {
    const res = await request(app).get('/api/v1/projects/nonexistent-id')
    expect(res.status).toBe(404)
  })

  it('Soft-Delete Projekt', async () => {
    const project = await createProject()
    await request(app).delete(`/api/v1/projects/${project.id}`)
    const list = await request(app).get('/api/v1/projects')
    expect(list.body.data.find((p: { id: string }) => p.id === project.id)).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 11. TASKS
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Tasks-System', () => {
  it('erstellt Task für Lead', async () => {
    const lead = await createLead()
    const task = await createTask({
      module: 'LEAD', referenceId: lead.id, referenceTitle: lead.firstName, priority: 'HIGH', dueDate: '2026-04-01',
    })
    expect(task.status).toBe('OFFEN')
    expect(task.module).toBe('LEAD')
    expect(task.referenceId).toBe(lead.id)
    expect(task.completedAt).toBeNull()
  })

  it('erstellt Task für Projekt', async () => {
    const project = await createProject()
    const task = await createTask({ module: 'PROJEKT', referenceId: project.id })
    expect(task.module).toBe('PROJEKT')
  })

  it('erstellt allgemeinen Task', async () => {
    const task = await createTask({ module: 'ALLGEMEIN' })
    expect(task.module).toBe('ALLGEMEIN')
    expect(task.status).toBe('OFFEN')
  })

  it('filtert nach Modul', async () => {
    await createTask({ module: 'LEAD' })
    const res = await request(app).get('/api/v1/tasks?module=LEAD')
    expect(res.status).toBe(200)
    res.body.data.forEach((t: { module: string }) => {
      expect(t.module).toBe('LEAD')
    })
  })

  it('filtert nach Status', async () => {
    const res = await request(app).get('/api/v1/tasks?status=OFFEN')
    expect(res.status).toBe(200)
    res.body.data.forEach((t: { status: string }) => {
      expect(t.status).toBe('OFFEN')
    })
  })

  it('Task-Stats: total = open + inProgress + completed', async () => {
    const res = await request(app).get('/api/v1/tasks/stats')
    expect(res.status).toBe(200)
    const { open, inProgress, completed, total } = res.body.data
    expect(total).toBe(open + inProgress + completed)
  })

  it('OFFEN → IN_BEARBEITUNG → ERLEDIGT (setzt completedAt)', async () => {
    const task = await createTask()

    const s1 = await request(app).put(`/api/v1/tasks/${task.id}`).send({ status: 'IN_BEARBEITUNG' })
    expect(s1.status).toBe(200)
    expect(s1.body.data.completedAt).toBeNull()

    const s2 = await request(app).put(`/api/v1/tasks/${task.id}`).send({ status: 'ERLEDIGT' })
    expect(s2.status).toBe(200)
    expect(s2.body.data.completedAt).not.toBeNull()
  })

  it('Hard-Delete Task', async () => {
    const task = await createTask()
    await request(app).delete(`/api/v1/tasks/${task.id}`)
    const check = await request(app).get(`/api/v1/tasks/${task.id}`)
    expect(check.status).toBe(404)
  })

  it('422 bei Task ohne Titel', async () => {
    const res = await request(app).post('/api/v1/tasks').send({ assignedTo: 'u001' })
    expect(res.status).toBe(422)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 12. DOKUMENTE
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Dokumente', () => {
  it('erstellt Dokument für Lead', async () => {
    const lead = await createLead()
    const res = await request(app).post('/api/v1/documents').send({
      entityType: 'LEAD', entityId: lead.id,
      fileName: 'dachfotos.zip', fileSize: 5242880,
      mimeType: 'application/zip', uploadedBy: 'u001',
    })
    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('id')
  })

  it('erstellt Dokument für Projekt', async () => {
    const project = await createProject()
    const res = await request(app).post('/api/v1/documents').send({
      entityType: 'PROJEKT', entityId: project.id,
      fileName: 'montage-plan.pdf', fileSize: 1048576,
      mimeType: 'application/pdf',
    })
    expect(res.status).toBe(201)
  })

  it('filtert nach entityType', async () => {
    const lead = await createLead()
    await request(app).post('/api/v1/documents').send({
      entityType: 'LEAD', entityId: lead.id,
      fileName: 'filter-test.pdf', fileSize: 100, mimeType: 'application/pdf',
    })
    const res = await request(app).get('/api/v1/documents?entityType=LEAD')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: { entityType: string }) => {
      expect(d.entityType).toBe('LEAD')
    })
  })

  it('löscht Dokument', async () => {
    const lead = await createLead()
    const c = await request(app).post('/api/v1/documents').send({
      entityType: 'LEAD', entityId: lead.id,
      fileName: 'delete-me.pdf', fileSize: 100, mimeType: 'application/pdf',
    })
    const res = await request(app).delete(`/api/v1/documents/${c.body.data.id}`)
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 13. ERINNERUNGEN
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Erinnerungen', () => {
  it('erstellt und listet Erinnerung', async () => {
    const lead = await createLead()
    const c = await request(app).post('/api/v1/reminders').send({
      leadId: lead.id, title: 'Nachfassen', dueAt: '2026-04-01T09:00:00.000Z', createdBy: 'u001',
    })
    expect(c.status).toBe(201)
    expect(c.body.data.dismissed).toBe(false)

    const list = await request(app).get('/api/v1/reminders')
    expect(list.status).toBe(200)
    expect(list.body.data.some((r: { id: string }) => r.id === c.body.data.id)).toBe(true)
  })

  it('dismisst Erinnerung', async () => {
    const lead = await createLead()
    const c = await request(app).post('/api/v1/reminders').send({
      leadId: lead.id, title: 'Dismiss-Test', dueAt: '2026-04-01T09:00:00.000Z', createdBy: 'u001',
    })
    const res = await request(app).put(`/api/v1/reminders/${c.body.data.id}/dismiss`)
    expect(res.status).toBe(200)
    expect(res.body.data.dismissed).toBe(true)
  })

  it('löscht Erinnerung', async () => {
    const lead = await createLead()
    const c = await request(app).post('/api/v1/reminders').send({
      leadId: lead.id, title: 'Delete-Test', dueAt: '2026-04-01T09:00:00.000Z', createdBy: 'u001',
    })
    const res = await request(app).delete(`/api/v1/reminders/${c.body.data.id}`)
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 14. E-MAIL TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: E-Mail System', () => {
  it('listet Templates', async () => {
    const res = await request(app).get('/api/v1/emails/templates')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('name')
      expect(res.body.data[0]).toHaveProperty('subject')
      expect(res.body.data[0]).toHaveProperty('body')
    }
  })

  it('sendet E-Mail (Mock)', async () => {
    const lead = await createLead()
    const res = await request(app).post('/api/v1/emails/send').send({
      leadId: lead.id, to: 'test@e2e.ch', subject: 'Angebot PV-Anlage', body: 'Anbei Ihr Angebot.',
    })
    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('id')
  })

  it('listet gesendete E-Mails', async () => {
    const res = await request(app).get('/api/v1/emails/sent')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 15. DASHBOARD & PROVISION
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Dashboard & Provision', () => {
  it('Dashboard-Stats aggregieren alle Module', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('tasks')
    expect(res.body.data.deals.totalDeals).toBeGreaterThan(0)
  })

  it('Dashboard filtert nach assignedTo', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats?assignedTo=u001')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('deals')
  })

  it('Monthly: 6 Monate chronologisch', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(6)
    const months = res.body.data.map((m: { month: string }) => m.month)
    for (let i = 1; i < months.length; i++) {
      expect(months[i] >= months[i - 1]).toBe(true)
    }
  })

  it('Monthly: Provision = 5% von wonValue', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    for (const m of res.body.data) {
      const expected = Math.round(m.wonValue * 0.05 * 100) / 100
      expect(m.provision).toBe(expected)
    }
  })

  it('Monthly: alle Felder vorhanden', async () => {
    const res = await request(app).get('/api/v1/dashboard/monthly')
    for (const m of res.body.data) {
      expect(m).toHaveProperty('month')
      expect(m).toHaveProperty('label')
      expect(m).toHaveProperty('wonDeals')
      expect(m).toHaveProperty('wonValue')
      expect(m).toHaveProperty('provision')
    }
  })

  it('Provision-Endpoint', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('month')
    expect(res.body.data).toHaveProperty('provisions')
    expect(res.body.data).toHaveProperty('summary')
  })

  it('Provision: Rate = 5%', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision')
    for (const p of res.body.data.provisions) {
      expect(p.provisionRate).toBe(0.05)
      const expected = Math.round(p.totalValue * 0.05 * 100) / 100
      expect(p.provision).toBe(expected)
    }
  })

  it('Provision mit Monats-Parameter', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision?month=2026-03')
    expect(res.status).toBe(200)
    expect(res.body.data.month).toBe('2026-03')
  })

  it('Provision Summary = Summe aller User', async () => {
    const res = await request(app).get('/api/v1/dashboard/provision')
    const { provisions, summary } = res.body.data
    const sumValue = provisions.reduce((a: number, p: { totalValue: number }) => a + p.totalValue, 0)
    expect(summary.totalValue).toBe(sumValue)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 16. ADMIN: Produkte
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Admin Produkte', () => {
  it('listet Produkte', async () => {
    const res = await request(app).get('/api/v1/admin/products')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('filtert PV_MODULE', async () => {
    const res = await request(app).get('/api/v1/admin/products?category=PV_MODULE')
    res.body.data.forEach((p: { category: string }) => expect(p.category).toBe('PV_MODULE'))
  })

  it('filtert INVERTER', async () => {
    const res = await request(app).get('/api/v1/admin/products?category=INVERTER')
    res.body.data.forEach((p: { category: string }) => expect(p.category).toBe('INVERTER'))
  })

  it('filtert BATTERY', async () => {
    const res = await request(app).get('/api/v1/admin/products?category=BATTERY')
    res.body.data.forEach((p: { category: string }) => expect(p.category).toBe('BATTERY'))
  })

  it('CRUD: erstellt, aktualisiert, löscht Produkt', async () => {
    const c = await request(app).post('/api/v1/admin/products').send({
      category: 'PV_MODULE', name: `E2E-${uid()}`, manufacturer: 'E2E Corp',
      model: 'E2E-500', unitPrice: 450, unit: 'Stk',
    })
    expect(c.status).toBe(201)
    const id = c.body.data.id

    const u = await request(app).put(`/api/v1/admin/products/${id}`).send({ unitPrice: 420 })
    expect(u.status).toBe(200)
    expect(u.body.data.unitPrice).toBe(420)

    const d = await request(app).delete(`/api/v1/admin/products/${id}`)
    expect(d.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 17. ADMIN: Integrationen
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Admin Integrationen', () => {
  it('4 Integrationen: Outlook, 3CX, Zoom, Bexio', async () => {
    const res = await request(app).get('/api/v1/admin/integrations')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(4)
    const services = res.body.data.map((i: { service: string }) => i.service)
    expect(services).toContain('OUTLOOK')
    expect(services).toContain('3CX')
    expect(services).toContain('ZOOM')
    expect(services).toContain('BEXIO')
  })

  it('verbindet Integration mit API-Key', async () => {
    const list = await request(app).get('/api/v1/admin/integrations')
    const id = list.body.data[0].id
    const res = await request(app).put(`/api/v1/admin/integrations/${id}`)
      .send({ apiKey: 'test-key-12345' })
    expect(res.status).toBe(200)
  })

  it('testet Integration', async () => {
    const list = await request(app).get('/api/v1/admin/integrations')
    const id = list.body.data[0].id
    const res = await request(app).post(`/api/v1/admin/integrations/${id}/test`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 18. ADMIN: Webhooks
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Admin Webhooks', () => {
  it('CRUD: erstellt, listet, löscht Webhook', async () => {
    const c = await request(app).post('/api/v1/admin/webhooks').send({
      name: `E2E-${uid()}`, url: 'https://e2e.ch/hook', events: ['lead.created'],
    })
    expect(c.status).toBe(201)
    expect(c.body.data).toHaveProperty('secret')
    const id = c.body.data.id

    const list = await request(app).get('/api/v1/admin/webhooks')
    expect(list.body.data.some((w: { id: string }) => w.id === id)).toBe(true)

    const d = await request(app).delete(`/api/v1/admin/webhooks/${id}`)
    expect(d.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 19. ADMIN: Audit-Log
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Admin Audit-Log', () => {
  it('listet Audit-Einträge mit korrekter Struktur', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    const e = res.body.data[0]
    expect(e).toHaveProperty('id')
    expect(e).toHaveProperty('userName')
    expect(e).toHaveProperty('action')
    expect(e).toHaveProperty('entityType')
  })

  it('filtert nach Action', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log?action=CREATE')
    res.body.data.forEach((e: { action: string }) => expect(e.action).toBe('CREATE'))
  })

  it('filtert nach userId', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log?userId=u001')
    res.body.data.forEach((e: { userId: string }) => expect(e.userId).toBe('u001'))
  })

  it('Pagination', async () => {
    const res = await request(app).get('/api/v1/admin/audit-log?pageSize=5')
    expect(res.body.data.length).toBeLessThanOrEqual(5)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 20. ADMIN: Branding, KI, Benachrichtigungen, Doku-Templates, DB-Export
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Admin Konfiguration', () => {
  it('Branding laden + aktualisieren', async () => {
    const res = await request(app).get('/api/v1/admin/branding')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('companyName')
    const origName = res.body.data.companyName

    const up = await request(app).put('/api/v1/admin/branding').send({ companyName: 'E2E AG' })
    expect(up.body.data.companyName).toBe('E2E AG')

    await request(app).put('/api/v1/admin/branding').send({ companyName: origName })
  })

  it('KI-Einstellungen laden + aktualisieren', async () => {
    const res = await request(app).get('/api/v1/admin/ai-settings')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('enabled')
    expect(res.body.data).toHaveProperty('model')
    const origModel = res.body.data.model

    const up = await request(app).put('/api/v1/admin/ai-settings').send({ model: 'claude' })
    expect(up.body.data.model).toBe('claude')

    await request(app).put('/api/v1/admin/ai-settings').send({ model: origModel })
  })

  it('Benachrichtigungen laden + aktualisieren', async () => {
    const res = await request(app).get('/api/v1/admin/notification-settings')
    expect(res.status).toBe(200)
    const up = await request(app).put('/api/v1/admin/notification-settings').send(res.body.data)
    expect(up.status).toBe(200)
  })

  it('Dokumenten-Vorlagen laden', async () => {
    const res = await request(app).get('/api/v1/admin/doc-templates')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
  })

  it('DB-Export Statistiken', async () => {
    const res = await request(app).get('/api/v1/admin/db-export/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('leads')
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('dbSize')
    expect(typeof res.body.data.leads).toBe('number')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 21. CROSS-MODULE VERKNÜPFUNGEN
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Cross-Module Verknüpfungen', () => {
  it('Lead → Termin → Deal → Projekt Kette', async () => {
    const lead = await createLead()
    const appt = await createAppointment({ leadId: lead.id })
    const deal = await createDeal({ leadId: lead.id, appointmentId: appt.id })
    const project = await createProject({ dealId: deal.id })

    // Verknüpfungen prüfen
    const checkAppt = await request(app).get(`/api/v1/appointments/${appt.id}`)
    expect(checkAppt.body.data.leadId).toBe(lead.id)

    const checkDeal = await request(app).get(`/api/v1/deals/${deal.id}`)
    expect(checkDeal.body.data.leadId).toBe(lead.id)
    expect(checkDeal.body.data.appointmentId).toBe(appt.id)

    const checkProject = await request(app).get(`/api/v1/projects/${project.id}`)
    expect(checkProject.body.data.dealId).toBe(deal.id)
  })

  it('Task referenziert Lead korrekt', async () => {
    const lead = await createLead()
    const task = await createTask({ module: 'LEAD', referenceId: lead.id, referenceTitle: 'Test Lead' })

    const check = await request(app).get(`/api/v1/tasks/${task.id}`)
    expect(check.body.data.module).toBe('LEAD')
    expect(check.body.data.referenceId).toBe(lead.id)
  })

  it('Task referenziert Projekt korrekt', async () => {
    const project = await createProject()
    const task = await createTask({ module: 'PROJEKT', referenceId: project.id })

    const check = await request(app).get(`/api/v1/tasks/${task.id}`)
    expect(check.body.data.module).toBe('PROJEKT')
    expect(check.body.data.referenceId).toBe(project.id)
  })

  it('Aktivitäten dem Lead zugeordnet', async () => {
    const lead = await createLead()
    await request(app).post('/api/v1/activities').send({
      leadId: lead.id, type: 'CALL', title: 'Cross-Test', createdBy: 'u001',
    })
    const res = await request(app).get(`/api/v1/activities?leadId=${lead.id}`)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('Dokument dem Lead zugeordnet', async () => {
    const lead = await createLead()
    await request(app).post('/api/v1/documents').send({
      entityType: 'LEAD', entityId: lead.id,
      fileName: 'cross.pdf', fileSize: 100, mimeType: 'application/pdf',
    })
    const res = await request(app).get(`/api/v1/documents?entityId=${lead.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('Erinnerung dem Lead zugeordnet', async () => {
    const lead = await createLead()
    await request(app).post('/api/v1/reminders').send({
      leadId: lead.id, title: 'Cross-Reminder', dueAt: '2026-05-01T10:00:00Z', createdBy: 'u001',
    })
    const res = await request(app).get('/api/v1/reminders')
    expect(res.body.data.some((r: { leadId: string }) => r.leadId === lead.id)).toBe(true)
  })

  it('Dashboard reflektiert erstellte Daten', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats')
    expect(res.body.data.deals.totalDeals).toBeGreaterThan(0)
    expect(res.body.data.tasks.total).toBeGreaterThan(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 22. EDGE CASES
// ════════════════════════════════════════════════════════════════════════════

describe('E2E: Edge Cases', () => {
  it('404 für alle Module bei unbekannter ID', async () => {
    const eps = [
      '/api/v1/leads/xxx', '/api/v1/appointments/xxx', '/api/v1/deals/xxx',
      '/api/v1/projects/xxx', '/api/v1/tasks/xxx', '/api/v1/users/xxx',
    ]
    for (const ep of eps) {
      expect((await request(app).get(ep)).status).toBe(404)
    }
  })

  it('leere Suche → leeres Array', async () => {
    const eps = [
      '/api/v1/leads?search=ZZZZNONEXISTENT',
      '/api/v1/deals?search=ZZZZNONEXISTENT',
      '/api/v1/projects?search=ZZZZNONEXISTENT',
    ]
    for (const ep of eps) {
      const res = await request(app).get(ep)
      expect(res.body.data.length).toBe(0)
    }
  })

  it('Pagination: Seite 999 → leer', async () => {
    const res = await request(app).get('/api/v1/leads?page=999')
    expect(res.body.data.length).toBe(0)
  })

  it('pageSize=1 → genau 1', async () => {
    const res = await request(app).get('/api/v1/leads?pageSize=1')
    expect(res.body.data.length).toBe(1)
  })

  it('Soft-Delete: gelöschter Lead nicht in Liste', async () => {
    const lead = await createLead()
    await request(app).delete(`/api/v1/leads/${lead.id}`)
    const list = await request(app).get('/api/v1/leads')
    expect(list.body.data.find((l: { id: string }) => l.id === lead.id)).toBeUndefined()
  })

  it('PUT auf gelöschten Lead → 404', async () => {
    const lead = await createLead()
    await request(app).delete(`/api/v1/leads/${lead.id}`)
    const res = await request(app).put(`/api/v1/leads/${lead.id}`).send({ notes: 'fail' })
    expect(res.status).toBe(404)
  })

  it('Soft-Delete: gelöschter Termin nicht in Liste', async () => {
    const appt = await createAppointment()
    await request(app).delete(`/api/v1/appointments/${appt.id}`)
    const list = await request(app).get('/api/v1/appointments')
    expect(list.body.data.find((a: { id: string }) => a.id === appt.id)).toBeUndefined()
  })

  it('Soft-Delete: gelöschtes Angebot nicht in Liste', async () => {
    const deal = await createDeal()
    await request(app).delete(`/api/v1/deals/${deal.id}`)
    const list = await request(app).get('/api/v1/deals')
    expect(list.body.data.find((d: { id: string }) => d.id === deal.id)).toBeUndefined()
  })

  it('Sortierung value asc', async () => {
    const res = await request(app).get('/api/v1/deals?sortBy=value&sortOrder=asc')
    const vals = res.body.data.map((d: { value: number }) => d.value)
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThanOrEqual(vals[i - 1])
    }
  })

  it('mehrere Filter gleichzeitig (Stage + Priority)', async () => {
    await createDeal({ priority: 'HIGH' })
    const res = await request(app).get('/api/v1/deals?stage=ERSTELLT&priority=HIGH')
    res.body.data.forEach((d: { stage: string; priority: string }) => {
      expect(d.stage).toBe('ERSTELLT')
      expect(d.priority).toBe('HIGH')
    })
  })

  it('Lead-Source Enum: alle gültigen Werte', async () => {
    for (const source of ['HOMEPAGE', 'LANDINGPAGE', 'MESSE', 'EMPFEHLUNG', 'KALTAKQUISE', 'SONSTIGE']) {
      const res = await request(app).post('/api/v1/leads').send({
        address: 'Enum-Test', phone: '+41 00', email: `enum-${uid()}@e2e.ch`, source,
      })
      expect(res.status).toBe(201)
    }
  })

  it('Deal Stage Enum: ungültiger Wert → 422', async () => {
    const deal = await createDeal()
    const res = await request(app).put(`/api/v1/deals/${deal.id}`).send({ stage: 'INVALID' })
    expect(res.status).toBe(422)
  })
})
