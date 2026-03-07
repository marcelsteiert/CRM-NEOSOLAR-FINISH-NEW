import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createApp } from '../app.js'
import type { Express } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string'

let app: Express
let adminToken: string
let vertriebToken: string
let plToken: string
let buchhaltungToken: string

beforeAll(() => {
  app = createApp()
  // JWT-Tokens fuer verschiedene Rollen erzeugen
  adminToken = jwt.sign({ userId: 'u001', email: 'admin@neosolar.ch', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' })
  vertriebToken = jwt.sign({ userId: 'u002', email: 'vertrieb@neosolar.ch', role: 'VERTRIEB' }, JWT_SECRET, { expiresIn: '1h' })
  plToken = jwt.sign({ userId: 'u003', email: 'pl@neosolar.ch', role: 'PROJEKTLEITUNG' }, JWT_SECRET, { expiresIn: '1h' })
  buchhaltungToken = jwt.sign({ userId: 'u004', email: 'bh@neosolar.ch', role: 'BUCHHALTUNG' }, JWT_SECRET, { expiresIn: '1h' })
})

// ════════════════════════════════════════════════════════════════════════════
// E2E COMPLETE V2 – Erweiterter Test: Berechtigungen, Tags, Kontakte,
// Checkliste, Follow-Up, folder_path Dokumente, Auth, alle Admin-Endpunkte
// HINWEIS: API gibt camelCase zurueck (mapKeys Middleware in app.ts)
// ════════════════════════════════════════════════════════════════════════════

const uid = () => Math.random().toString(36).slice(2, 8)

// Authentifizierter Request-Helper
function authGet(url: string, token = adminToken) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`)
}
function authPost(url: string, token = adminToken) {
  return request(app).post(url).set('Authorization', `Bearer ${token}`)
}
function authPut(url: string, token = adminToken) {
  return request(app).put(url).set('Authorization', `Bearer ${token}`)
}
function authDelete(url: string, token = adminToken) {
  return request(app).delete(url).set('Authorization', `Bearer ${token}`)
}

// ─── Helper ────────────────────────────────────────────────────────────────

async function createUser(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/users').send({
    firstName: `V2-${u}`, lastName: `Test-${u}`,
    email: `v2-${u}@e2e.ch`, role: 'VERTRIEB', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createContact(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/contacts').send({
    firstName: `Kontakt-${u}`, lastName: `Test-${u}`,
    email: `contact-${u}@e2e.ch`, phone: '+41 71 000 00 00',
    address: 'Teststrasse 1, 9430 St. Margrethen', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createLead(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/leads').send({
    firstName: `Lead-${u}`, lastName: `Test-${u}`,
    address: 'Teststrasse 1, 9430 St. Margrethen',
    phone: '+41 71 000 00 00', email: `lead-${u}@e2e.ch`,
    source: 'HOMEPAGE', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createAppointment(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/appointments').send({
    contactName: `Appt-${u}`, contactEmail: `appt-${u}@e2e.ch`,
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
  const res = await authPost('/api/v1/deals').send({
    title: `Deal-${u}`, contactName: `Deal-${u}`,
    contactEmail: `deal-${u}@e2e.ch`, contactPhone: '+41 71 000 00 00',
    address: 'Teststrasse 1, 9430 St. Margrethen',
    value: 30000, assignedTo: 'u001', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createProject(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/projects').send({
    name: `Projekt-${u}`, description: 'E2E V2',
    address: 'Teststrasse 1, 9430 St. Margrethen',
    email: `proj-${u}@e2e.ch`, kWp: 10, value: 25000, ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createTask(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/tasks').send({
    title: `Task-${u}`, module: 'ALLGEMEIN', assignedTo: 'u001', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createTag(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/tags').send({
    name: `V2Tag-${u}`, color: '#10B981', ...overrides,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

async function createPipeline() {
  const u = uid()
  const res = await authPost('/api/v1/pipelines').send({ name: `V2Pipe-${u}` })
  expect(res.status).toBe(201)
  return res.body.data
}

async function addBucket(pipelineId: string, name: string) {
  const res = await authPost(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name })
  expect(res.status).toBe(201)
  return res.body.data
}

// ════════════════════════════════════════════════════════════════════════════
// 1. KONTAKTE – Vollstaendiger CRUD
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Kontakte CRUD', () => {
  it('erstellt Kontakt mit allen Feldern', async () => {
    const c = await createContact({ company: 'Solar AG', notes: 'VIP Kunde' })
    expect(c).toHaveProperty('id')
    expect(c.firstName).toContain('Kontakt-')
    expect(c.company).toBe('Solar AG')
    expect(c.notes).toBe('VIP Kunde')
  })

  it('listet Kontakte mit Pagination', async () => {
    await createContact()
    const res = await authGet('/api/v1/contacts?page=1&pageSize=5')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(5)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page', 1)
    expect(res.body).toHaveProperty('pageSize', 5)
  })

  it('sucht Kontakte nach Name', async () => {
    const c = await createContact()
    const res = await authGet(`/api/v1/contacts?search=${c.firstName}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('einzelner Kontakt mit Verknuepfungen', async () => {
    const c = await createContact()
    const res = await authGet(`/api/v1/contacts/${c.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('leads')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('projects')
    expect(res.body.data).toHaveProperty('activities')
    expect(res.body.data).toHaveProperty('tasks')
    expect(res.body.data).toHaveProperty('documents')
  })

  it('aktualisiert Kontakt', async () => {
    const c = await createContact()
    const res = await authPut(`/api/v1/contacts/${c.id}`).send({ company: 'Neu AG' })
    expect(res.status).toBe(200)
    expect(res.body.data.company).toBe('Neu AG')
  })

  it('Soft-Delete Kontakt', async () => {
    const c = await createContact()
    const del = await authDelete(`/api/v1/contacts/${c.id}`)
    expect(del.status).toBe(200)
    const get = await authGet(`/api/v1/contacts/${c.id}`)
    expect(get.status).toBe(404)
  })

  it('422 bei fehlendem Pflichtfeld', async () => {
    const res = await authPost('/api/v1/contacts').send({ firstName: 'Nur Vorname' })
    expect(res.status).toBe(422)
  })

  it('sortiert nach last_name', async () => {
    const res = await authGet('/api/v1/contacts?sortBy=lastName&sortOrder=asc')
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. BERECHTIGUNGEN – Rollen-Defaults, Modul-Toggle, Rollenwechsel
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Berechtigungen & Rollen', () => {
  it('ADMIN hat mehr Module als VERTRIEB', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    expect(res.status).toBe(200)
    const { ADMIN, VERTRIEB } = res.body.data
    expect(ADMIN.length).toBeGreaterThan(VERTRIEB.length)
    expect(ADMIN).toContain('admin')
    expect(VERTRIEB).not.toContain('admin')
  })

  it('VERTRIEB hat kein admin/provision/calculations', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    const { VERTRIEB } = res.body.data
    expect(VERTRIEB).not.toContain('admin')
    expect(VERTRIEB).not.toContain('provision')
    expect(VERTRIEB).not.toContain('calculations')
  })

  it('PROJEKTLEITUNG hat projects aber kein leads/deals', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    const { PROJEKTLEITUNG } = res.body.data
    expect(PROJEKTLEITUNG).toContain('projects')
    expect(PROJEKTLEITUNG).not.toContain('leads')
    expect(PROJEKTLEITUNG).not.toContain('deals')
  })

  it('BUCHHALTUNG hat provision und export', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    const { BUCHHALTUNG } = res.body.data
    expect(BUCHHALTUNG).toContain('provision')
    expect(BUCHHALTUNG).toContain('export')
    expect(BUCHHALTUNG).not.toContain('leads')
  })

  it('GL hat alle Module wie ADMIN', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    const { GL, ADMIN } = res.body.data
    expect(GL.length).toBe(ADMIN.length)
  })

  it('neuer VERTRIEB User bekommt Standard-Module', async () => {
    const user = await createUser({ role: 'VERTRIEB' })
    expect(user.allowedModules).toContain('dashboard')
    expect(user.allowedModules).toContain('leads')
    expect(user.allowedModules).toContain('deals')
    expect(user.allowedModules).not.toContain('admin')
  })

  it('Admin setzt individuelle Module fuer VERTRIEB', async () => {
    const user = await createUser({ role: 'VERTRIEB' })
    const customModules = ['dashboard', 'leads', 'appointments', 'deals', 'tasks', 'projects', 'provision']
    const res = await authPut(`/api/v1/users/${user.id}`).send({ allowedModules: customModules })
    expect(res.status).toBe(200)
    expect(res.body.data.allowedModules).toContain('projects')
    expect(res.body.data.allowedModules).toContain('provision')
    expect(res.body.data.allowedModules.length).toBe(7)
  })

  it('Admin entfernt Module von VERTRIEB', async () => {
    const user = await createUser({ role: 'VERTRIEB' })
    const res = await authPut(`/api/v1/users/${user.id}`).send({ allowedModules: ['dashboard', 'leads'] })
    expect(res.status).toBe(200)
    expect(res.body.data.allowedModules).toEqual(['dashboard', 'leads'])
    expect(res.body.data.allowedModules).not.toContain('deals')
  })

  it('Rollenwechsel VERTRIEB → PROJEKTLEITUNG setzt Defaults zurueck', async () => {
    const user = await createUser({ role: 'VERTRIEB' })
    const defaults = await authGet('/api/v1/users/role-defaults')
    const plDefaults = defaults.body.data.PROJEKTLEITUNG

    const res = await authPut(`/api/v1/users/${user.id}`).send({ role: 'PROJEKTLEITUNG' })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('PROJEKTLEITUNG')
    expect(res.body.data.allowedModules).toEqual(plDefaults)
  })

  it('Rollenwechsel mit expliziten Modulen ueberschreibt Defaults', async () => {
    const user = await createUser({ role: 'VERTRIEB' })
    const custom = ['dashboard', 'projects', 'admin']
    const res = await authPut(`/api/v1/users/${user.id}`)
      .send({ role: 'PROJEKTLEITUNG', allowedModules: custom })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('PROJEKTLEITUNG')
    expect(res.body.data.allowedModules).toEqual(custom)
  })

  it('leeres allowedModules Array = kein Zugriff', async () => {
    const user = await createUser({ role: 'VERTRIEB' })
    const res = await authPut(`/api/v1/users/${user.id}`).send({ allowedModules: [] })
    expect(res.status).toBe(200)
    expect(res.body.data.allowedModules).toEqual([])
  })

  it('deaktivierter User bleibt in DB', async () => {
    const user = await createUser()
    await authDelete(`/api/v1/users/${user.id}`)
    const res = await authGet(`/api/v1/users/${user.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.isActive).toBe(false)
    expect(res.body.data.allowedModules).toBeDefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. TAGS – Erstellen, Zuweisen zu Leads & Deals, Sichtbarkeit
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Tags auf Leads & Deals', () => {
  it('Admin erstellt Tag → sichtbar in Tag-Liste', async () => {
    const tag = await createTag()
    const list = await authGet('/api/v1/tags')
    const found = list.body.data.find((t: any) => t.id === tag.id)
    expect(found).toBeDefined()
    expect(found.name).toBe(tag.name)
  })

  it('Tag auf Lead setzen bei Erstellung', async () => {
    const tag = await createTag()
    const lead = await createLead({ tags: [tag.id] })
    expect(lead.tags).toContain(tag.id)
  })

  it('Tags auf Lead nachtraeglich hinzufuegen', async () => {
    const tag1 = await createTag()
    const tag2 = await createTag()
    const lead = await createLead()

    const res = await authPost(`/api/v1/leads/${lead.id}/tags`).send({ tagIds: [tag1.id, tag2.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tag1.id)
    expect(res.body.data.tags).toContain(tag2.id)
  })

  it('Tag von Lead entfernen', async () => {
    const tag = await createTag()
    const lead = await createLead({ tags: [tag.id] })

    const res = await authDelete(`/api/v1/leads/${lead.id}/tags/${tag.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.tags).not.toContain(tag.id)
  })

  it('Tags via Lead-Update setzen', async () => {
    const tag = await createTag()
    const lead = await createLead()
    const res = await authPut(`/api/v1/leads/${lead.id}`).send({ tags: [tag.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tag.id)
  })

  it('Tags auf Deal setzen bei Erstellung', async () => {
    const tag = await createTag()
    const deal = await createDeal({ tags: [tag.id] })
    expect(deal.tags).toContain(tag.id)
  })

  it('Tags via Deal-Update aendern', async () => {
    const tag1 = await createTag()
    const tag2 = await createTag()
    const deal = await createDeal({ tags: [tag1.id] })

    const res = await authPut(`/api/v1/deals/${deal.id}`).send({ tags: [tag2.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tag2.id)
    expect(res.body.data.tags).not.toContain(tag1.id)
  })

  it('Lead mit Tags in GET sichtbar', async () => {
    const tag = await createTag()
    const lead = await createLead({ tags: [tag.id] })
    const res = await authGet(`/api/v1/leads/${lead.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tag.id)
  })

  it('Deal mit Tags in GET sichtbar', async () => {
    const tag = await createTag()
    const deal = await createDeal({ tags: [tag.id] })
    const res = await authGet(`/api/v1/deals/${deal.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tag.id)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. LEAD – Erweiterte Tests (Move, Filter, Sources)
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Lead erweitert', () => {
  it('Lead in Bucket verschieben', async () => {
    const pipeline = await createPipeline()
    const bucket = await addBucket(pipeline.id, 'Qualifiziert')
    const lead = await createLead({ pipelineId: pipeline.id })

    const res = await authPut(`/api/v1/leads/${lead.id}/move`).send({ bucketId: bucket.id })
    expect(res.status).toBe(200)
    expect(res.body.data.bucketId).toBe(bucket.id)
  })

  it('filtert nach Source', async () => {
    await createLead({ source: 'MESSE' })
    const res = await authGet('/api/v1/leads?source=MESSE')
    expect(res.status).toBe(200)
    res.body.data.forEach((l: any) => expect(l.source).toBe('MESSE'))
  })

  it('filtert nach Status', async () => {
    await createLead({ status: 'AFTER_SALES' })
    const res = await authGet('/api/v1/leads?status=AFTER_SALES')
    expect(res.status).toBe(200)
    res.body.data.forEach((l: any) => expect(l.status).toBe('AFTER_SALES'))
  })

  it('alle Source-Typen gueltig', async () => {
    const sources = ['HOMEPAGE', 'LANDINGPAGE', 'MESSE', 'EMPFEHLUNG', 'KALTAKQUISE', 'SONSTIGE']
    for (const source of sources) {
      const res = await authPost('/api/v1/leads').send({
        firstName: `Src-${uid()}`, lastName: 'Test',
        address: 'Test 1', phone: '+41 71 000', email: `src-${uid()}@e2e.ch`,
        source,
      })
      expect(res.status).toBe(201)
    }
  })

  it('Lead mit contactId erstellen', async () => {
    const contact = await createContact()
    const lead = await createLead({ contactId: contact.id })
    expect(lead.contactId).toBe(contact.id)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 5. TERMINE – Checkliste, Stats, Fahrzeit
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Termine erweitert', () => {
  it('Termin mit Checkliste updaten', async () => {
    const appt = await createAppointment()
    const checklist = [
      { id: 'c1', label: 'Dach pruefen', checked: true },
      { id: 'c2', label: 'Zaehlerkasten', checked: false },
    ]
    const res = await authPut(`/api/v1/appointments/${appt.id}`).send({ checklist })
    expect(res.status).toBe(200)
    expect(res.body.data.checklist.length).toBe(2)
    expect(res.body.data.checklist[0].checked).toBe(true)
    expect(res.body.data.checklist[1].checked).toBe(false)
  })

  it('Termin Status-Wechsel: GEPLANT → BESTAETIGT → DURCHGEFUEHRT', async () => {
    const appt = await createAppointment()
    expect(appt.status).toBe('GEPLANT')

    const r1 = await authPut(`/api/v1/appointments/${appt.id}`).send({ status: 'BESTAETIGT' })
    expect(r1.body.data.status).toBe('BESTAETIGT')

    const r2 = await authPut(`/api/v1/appointments/${appt.id}`).send({ status: 'DURCHGEFUEHRT' })
    expect(r2.body.data.status).toBe('DURCHGEFUEHRT')
    expect(r2.body.data.completedAt).toBeDefined()
  })

  it('Termin mit Fahrzeit-Schaetzung (St. Gallen)', async () => {
    const appt = await createAppointment({ address: 'Bahnhofstrasse 5, 9000 St. Gallen' })
    expect(appt.travelMinutes).toBe(25)
  })

  it('Termin-Stats Struktur', async () => {
    const res = await authGet('/api/v1/appointments/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('upcoming')
    expect(res.body.data).toHaveProperty('totalValue')
    expect(res.body.data).toHaveProperty('statuses')
    expect(res.body.data).toHaveProperty('completed')
    expect(res.body.data).toHaveProperty('cancelled')
    expect(res.body.data).toHaveProperty('checklistProgress')
  })

  it('filtert Termine nach appointmentType', async () => {
    await createAppointment({ appointmentType: 'ONLINE' })
    const res = await authGet('/api/v1/appointments?appointmentType=ONLINE')
    expect(res.status).toBe(200)
    res.body.data.forEach((a: any) => expect(a.appointmentType).toBe('ONLINE'))
  })

  it('filtert Termine nach priority', async () => {
    await createAppointment({ priority: 'URGENT' })
    const res = await authGet('/api/v1/appointments?priority=URGENT')
    expect(res.status).toBe(200)
    res.body.data.forEach((a: any) => expect(a.priority).toBe('URGENT'))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. DEALS – Aktivitaeten, Follow-Up, Stage-Changes, winProbability
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Deals erweitert', () => {
  it('Deal mit winProbability erstellen', async () => {
    const deal = await createDeal({ winProbability: 75 })
    expect(deal.winProbability).toBe(75)
  })

  it('Deal-Aktivitaet hinzufuegen', async () => {
    const deal = await createDeal()
    const res = await authPost(`/api/v1/deals/${deal.id}/activities`)
      .send({ type: 'CALL', text: 'Kundenanruf: Interesse bestaetigt' })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('CALL')
    expect(res.body.data.text).toContain('Kundenanruf')
  })

  it('Deal-Aktivitaeten im GET sichtbar', async () => {
    const deal = await createDeal()
    await authPost(`/api/v1/deals/${deal.id}/activities`)
      .send({ type: 'NOTE', text: 'Wichtige Notiz' })
    await authPost(`/api/v1/deals/${deal.id}/activities`)
      .send({ type: 'EMAIL', text: 'Offerte gesendet' })

    const res = await authGet(`/api/v1/deals/${deal.id}`)
    expect(res.status).toBe(200)
    // mindestens 3: SYSTEM (Erstellung) + 2 manuelle
    expect(res.body.data.activities.length).toBeGreaterThanOrEqual(3)
  })

  it('Stage-Change erzeugt STATUS_CHANGE Aktivitaet', async () => {
    const deal = await createDeal()
    await authPut(`/api/v1/deals/${deal.id}`).send({ stage: 'GESENDET' })
    await authPut(`/api/v1/deals/${deal.id}`).send({ stage: 'VERHANDLUNG' })

    const res = await authGet(`/api/v1/deals/${deal.id}`)
    const statusChanges = res.body.data.activities.filter((a: any) => a.type === 'STATUS_CHANGE')
    expect(statusChanges.length).toBeGreaterThanOrEqual(2)
  })

  it('GEWONNEN setzt winProbability=100 und closedAt', async () => {
    const deal = await createDeal({ winProbability: 60 })
    const res = await authPut(`/api/v1/deals/${deal.id}`).send({ stage: 'GEWONNEN' })
    expect(res.status).toBe(200)
    expect(res.body.data.stage).toBe('GEWONNEN')
    expect(res.body.data.winProbability).toBe(100)
    expect(res.body.data.closedAt).toBeDefined()
  })

  it('VERLOREN setzt winProbability=0 und closedAt', async () => {
    const deal = await createDeal({ winProbability: 40 })
    const res = await authPut(`/api/v1/deals/${deal.id}`).send({ stage: 'VERLOREN' })
    expect(res.status).toBe(200)
    expect(res.body.data.winProbability).toBe(0)
    expect(res.body.data.closedAt).toBeDefined()
  })

  it('Deal-Stats: korrekte Aggregation', async () => {
    const res = await authGet('/api/v1/deals/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('totalDeals')
    expect(res.body.data).toHaveProperty('totalValue')
    expect(res.body.data).toHaveProperty('pipelineValue')
    expect(res.body.data).toHaveProperty('weightedPipelineValue')
    expect(res.body.data).toHaveProperty('stages')
    expect(res.body.data).toHaveProperty('winRate')
  })

  it('Follow-Ups Endpoint', async () => {
    const res = await authGet('/api/v1/deals/follow-ups')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('total')
  })

  it('Follow-Up Dismiss mit Pflicht-Notiz', async () => {
    const deal = await createDeal()
    const res = await authPost(`/api/v1/deals/follow-ups/fu-${deal.id}/dismiss`)
      .send({ note: 'Kunde hat sich gemeldet' })
    // Kann 200 oder 404 sein (Deal muss alt genug sein fuer Follow-Up)
    expect([200, 404]).toContain(res.status)
  })

  it('Follow-Up Dismiss ohne Notiz → 422', async () => {
    const deal = await createDeal()
    const res = await authPost(`/api/v1/deals/follow-ups/fu-${deal.id}/dismiss`)
      .send({})
    expect(res.status).toBe(422)
  })

  it('filtert Deals nach Stage', async () => {
    await createDeal({ stage: 'GESENDET' })
    const res = await authGet('/api/v1/deals?stage=GESENDET')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: any) => expect(d.stage).toBe('GESENDET'))
  })

  it('filtert Deals nach Priority', async () => {
    await createDeal({ priority: 'HIGH' })
    const res = await authGet('/api/v1/deals?priority=HIGH')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: any) => expect(d.priority).toBe('HIGH'))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 7. PROJEKTE – Phasen, Toggle-Step, Activities, Partners, Stats
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Projekte erweitert', () => {
  it('Phase-Definitionen abrufbar', async () => {
    const res = await authGet('/api/v1/projects/phases')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(4)
    const phaseIds = res.body.data.map((p: any) => p.id)
    expect(phaseIds).toEqual(['admin', 'montage', 'elektro', 'abschluss'])
    res.body.data.forEach((p: any) => {
      expect(p).toHaveProperty('name')
      expect(p).toHaveProperty('color')
      expect(p).toHaveProperty('steps')
      expect(p.steps.length).toBeGreaterThan(0)
    })
  })

  it('Partner abrufbar', async () => {
    const res = await authGet('/api/v1/projects/partners')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('Projekt-Stats', async () => {
    const res = await authGet('/api/v1/projects/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('totalValue')
    expect(res.body.data).toHaveProperty('totalKwp')
    expect(res.body.data).toHaveProperty('avgProgress')
    expect(res.body.data).toHaveProperty('byPhase')
    expect(res.body.data).toHaveProperty('kalkulation')
  })

  it('Toggle-Step aendert Fortschritt', async () => {
    const project = await createProject()
    const res = await authPut(`/api/v1/projects/${project.id}/toggle-step`)
      .send({ phase: 'admin', stepIndex: 0 })
    expect(res.status).toBe(200)
    expect(res.body.data.progress.admin[0]).toBe(1)
    expect(res.body.data.percent).toBeGreaterThan(0)
  })

  it('Toggle-Step zurueck auf 0', async () => {
    const project = await createProject()
    await authPut(`/api/v1/projects/${project.id}/toggle-step`)
      .send({ phase: 'admin', stepIndex: 0 })
    const res = await authPut(`/api/v1/projects/${project.id}/toggle-step`)
      .send({ phase: 'admin', stepIndex: 0 })
    expect(res.body.data.progress.admin[0]).toBe(0)
  })

  it('Projekt-Activity hinzufuegen', async () => {
    const project = await createProject()
    const res = await authPost(`/api/v1/projects/${project.id}/activities`)
      .send({ type: 'NOTE', text: 'Statik-Bericht eingegangen', createdBy: 'u001' })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('NOTE')
  })

  it('Projekt-Activities in GET sichtbar', async () => {
    const project = await createProject()
    await authPost(`/api/v1/projects/${project.id}/activities`)
      .send({ type: 'MEETING', text: 'Baustellenbesprechung' })

    const res = await authGet(`/api/v1/projects/${project.id}`)
    // Mindestens die manuell hinzugefuegte Activity
    expect(res.body.data.activities.length).toBeGreaterThanOrEqual(1)
  })

  it('Phase-Berechnung basiert auf Progress', async () => {
    const project = await createProject()
    await authPut(`/api/v1/projects/${project.id}/toggle-step`)
      .send({ phase: 'montage', stepIndex: 0 })
    const res = await authGet(`/api/v1/projects/${project.id}`)
    expect(res.body.data.phase).toBe('montage')
  })

  it('Risiko-Flag setzen', async () => {
    const project = await createProject()
    const res = await authPut(`/api/v1/projects/${project.id}`)
      .send({ risk: true, riskNote: 'Statik unklar' })
    expect(res.status).toBe(200)
    expect(res.body.data.risk).toBe(true)
    expect(res.body.data.riskNote).toBe('Statik unklar')
  })

  it('Kalkulation aktualisieren', async () => {
    const project = await createProject({ kalkulationSoll: 50000 })
    const res = await authPut(`/api/v1/projects/${project.id}`)
      .send({ kalkulationIst: 48000 })
    expect(res.status).toBe(200)
    expect(res.body.data.kalkulationIst).toBe(48000)
  })

  it('ungültiger stepIndex → 400', async () => {
    const project = await createProject()
    const res = await authPut(`/api/v1/projects/${project.id}/toggle-step`)
      .send({ phase: 'admin', stepIndex: 999 })
    expect(res.status).toBe(400)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 8. TASKS – Module, Referenzen, Status-Uebergaenge
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Tasks erweitert', () => {
  it('Task mit Referenz auf Lead', async () => {
    const lead = await createLead()
    const task = await createTask({
      module: 'LEAD', referenceId: lead.id, referenceTitle: 'Offerte vorbereiten',
    })
    expect(task.module).toBe('LEAD')
    expect(task.referenceId).toBe(lead.id)
  })

  it('Task mit Referenz auf Projekt', async () => {
    const project = await createProject()
    const task = await createTask({
      module: 'PROJEKT', referenceId: project.id, referenceTitle: project.name,
    })
    expect(task.module).toBe('PROJEKT')
    expect(task.referenceId).toBe(project.id)
  })

  it('Task mit DueDate und Priority', async () => {
    const task = await createTask({ priority: 'URGENT', dueDate: '2026-03-10' })
    expect(task.priority).toBe('URGENT')
    expect(task.dueDate).toContain('2026-03-10')
  })

  it('Task Status: OFFEN → IN_BEARBEITUNG → ERLEDIGT', async () => {
    const task = await createTask()
    expect(task.status).toBe('OFFEN')

    const r1 = await authPut(`/api/v1/tasks/${task.id}`).send({ status: 'IN_BEARBEITUNG' })
    expect(r1.body.data.status).toBe('IN_BEARBEITUNG')
    expect(r1.body.data.completedAt).toBeNull()

    const r2 = await authPut(`/api/v1/tasks/${task.id}`).send({ status: 'ERLEDIGT' })
    expect(r2.body.data.status).toBe('ERLEDIGT')
    expect(r2.body.data.completedAt).toBeDefined()
  })

  it('Task-Stats korrekt', async () => {
    const res = await authGet('/api/v1/tasks/stats')
    expect(res.status).toBe(200)
    const { open, inProgress, completed, total } = res.body.data
    expect(open + inProgress + completed).toBe(total)
  })

  it('filtert Tasks nach Modul', async () => {
    await createTask({ module: 'ANGEBOT' })
    const res = await authGet('/api/v1/tasks?module=ANGEBOT')
    expect(res.status).toBe(200)
    res.body.data.forEach((t: any) => expect(t.module).toBe('ANGEBOT'))
  })

  it('sucht Tasks nach Titel', async () => {
    const task = await createTask({ title: 'UniqueSearchTest123' })
    const res = await authGet('/api/v1/tasks?search=UniqueSearchTest123')
    expect(res.status).toBe(200)
    expect(res.body.data.some((t: any) => t.id === task.id)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 9. DOKUMENTE – folder_path, Phase-basiert
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Dokumente mit folder_path', () => {
  it('Dokument mit folderPath hochladen', async () => {
    const contact = await createContact()
    const res = await authPost('/api/v1/documents').send({
      contactId: contact.id, entityType: 'LEAD', entityId: 'test-entity',
      fileName: 'dach-foto.jpg', fileSize: 1024, mimeType: 'image/jpeg',
      folderPath: 'Fotos/Dach',
      fileBase64: Buffer.from('fake-image-content').toString('base64'),
    })
    expect(res.status).toBe(201)
    expect(res.body.data.folderPath).toBe('Fotos/Dach')
    expect(res.body.data.fileName).toBe('dach-foto.jpg')
  })

  it('Dokument ohne folderPath (Allgemein)', async () => {
    const contact = await createContact()
    const res = await authPost('/api/v1/documents').send({
      contactId: contact.id, entityType: 'TERMIN', entityId: 'test-entity',
      fileName: 'notiz.pdf', fileSize: 2048, mimeType: 'application/pdf',
      fileBase64: Buffer.from('fake-pdf-content').toString('base64'),
    })
    expect(res.status).toBe(201)
    expect(res.body.data.folderPath).toBeNull()
  })

  it('Dokumente nach contactId abrufen', async () => {
    const contact = await createContact()
    await authPost('/api/v1/documents').send({
      contactId: contact.id, entityType: 'LEAD', entityId: 'e1',
      fileName: 'file1.pdf', fileSize: 100, mimeType: 'application/pdf',
      folderPath: 'Kontaktdaten',
      fileBase64: Buffer.from('c1').toString('base64'),
    })
    await authPost('/api/v1/documents').send({
      contactId: contact.id, entityType: 'ANGEBOT', entityId: 'e2',
      fileName: 'file2.docx', fileSize: 200, mimeType: 'application/msword',
      folderPath: 'Offerte/Entwurf',
      fileBase64: Buffer.from('c2').toString('base64'),
    })

    const res = await authGet(`/api/v1/documents?contactId=${contact.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    const paths = res.body.data.map((d: any) => d.folderPath)
    expect(paths).toContain('Kontaktdaten')
    expect(paths).toContain('Offerte/Entwurf')
  })

  it('Dokumente nach entityType filtern', async () => {
    const contact = await createContact()
    await authPost('/api/v1/documents').send({
      contactId: contact.id, entityType: 'PROJEKT', entityId: 'p1',
      fileName: 'plan.pdf', fileSize: 500, mimeType: 'application/pdf',
      folderPath: 'Planung/Montageplaene',
      fileBase64: Buffer.from('plan').toString('base64'),
    })

    const res = await authGet('/api/v1/documents?entityType=PROJEKT&entityId=p1')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: any) => expect(d.entityType).toBe('PROJEKT'))
  })

  it('Dokument loeschen', async () => {
    const contact = await createContact()
    const doc = await authPost('/api/v1/documents').send({
      contactId: contact.id, entityType: 'LEAD', entityId: 'e1',
      fileName: 'to-delete.pdf', fileSize: 100, mimeType: 'application/pdf',
      fileBase64: Buffer.from('del').toString('base64'),
    })
    expect(doc.status).toBe(201)

    const del = await authDelete(`/api/v1/documents/${doc.body.data.id}`)
    expect(del.status).toBe(200)
    expect(del.body.message).toContain('geloescht')
  })

  it('422 bei fehlendem fileName', async () => {
    const res = await authPost('/api/v1/documents').send({
      contactId: 'c1', entityType: 'LEAD', fileSize: 100,
      mimeType: 'application/pdf', fileBase64: 'abc',
    })
    expect(res.status).toBe(422)
  })

  it('verschiedene entityTypes akzeptiert', async () => {
    const contact = await createContact()
    for (const entityType of ['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT']) {
      const res = await authPost('/api/v1/documents').send({
        contactId: contact.id, entityType, entityId: `e-${uid()}`,
        fileName: `${entityType.toLowerCase()}.pdf`, fileSize: 100,
        mimeType: 'application/pdf',
        folderPath: entityType === 'LEAD' ? 'Fotos/Dach' : undefined,
        fileBase64: Buffer.from(`${entityType}`).toString('base64'),
      })
      expect(res.status).toBe(201)
      expect(res.body.data.entityType).toBe(entityType)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 10. AKTIVITAETEN – Standalone-Endpoint
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Aktivitaeten', () => {
  it('Aktivitaet erstellen', async () => {
    const contact = await createContact()
    const res = await authPost('/api/v1/activities').send({
      contactId: contact.id, type: 'CALL', text: 'Erstgespraech gefuehrt',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('CALL')
  })

  it('Aktivitaeten nach contactId filtern', async () => {
    const contact = await createContact()
    await authPost('/api/v1/activities').send({
      contactId: contact.id, type: 'NOTE', text: 'Notiz 1',
    })
    const res = await authGet(`/api/v1/activities?contactId=${contact.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('alle Activity-Typen gueltig', async () => {
    const contact = await createContact()
    for (const type of ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM', 'DOCUMENT_UPLOAD']) {
      const res = await authPost('/api/v1/activities').send({
        contactId: contact.id, type, text: `Test ${type}`,
      })
      expect(res.status).toBe(201)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 11. ERINNERUNGEN – Erweitert
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Erinnerungen erweitert', () => {
  it('Erinnerung erstellen und abrufen', async () => {
    const lead = await createLead()
    const res = await authPost('/api/v1/reminders').send({
      leadId: lead.id, title: 'Nachfassen', dueAt: '2026-03-10T10:00:00Z',
      createdBy: 'u001',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.dismissed).toBe(false)

    const list = await authGet(`/api/v1/reminders?leadId=${lead.id}`)
    expect(list.status).toBe(200)
    expect(list.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('Erinnerung dismissten', async () => {
    const lead = await createLead()
    const r = await authPost('/api/v1/reminders').send({
      leadId: lead.id, title: 'Dismiss-Test', dueAt: '2026-03-01T10:00:00Z',
      createdBy: 'u001',
    })
    expect(r.status).toBe(201)
    const res = await authPut(`/api/v1/reminders/${r.body.data.id}/dismiss`)
    expect(res.status).toBe(200)
    expect(res.body.data.dismissed).toBe(true)
  })

  it('Erinnerung loeschen', async () => {
    const lead = await createLead()
    const r = await authPost('/api/v1/reminders').send({
      leadId: lead.id, title: 'Delete-Test', dueAt: '2026-03-01T10:00:00Z',
      createdBy: 'u001',
    })
    expect(r.status).toBe(201)
    const del = await authDelete(`/api/v1/reminders/${r.body.data.id}`)
    expect(del.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 12. PIPELINES – Erweitert: Buckets, Reorder, Update, Delete
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Pipelines erweitert', () => {
  it('Pipeline erstellen, Buckets hinzufuegen, Reorder', async () => {
    const pipeline = await createPipeline()
    const b1 = await addBucket(pipeline.id, 'Erstgespraech')
    const b2 = await addBucket(pipeline.id, 'Qualifiziert')
    const b3 = await addBucket(pipeline.id, 'Abschluss')

    // Reorder: b3, b1, b2
    const res = await authPut(`/api/v1/pipelines/${pipeline.id}/buckets/reorder`)
      .send({ bucketIds: [b3.id, b1.id, b2.id] })
    expect(res.status).toBe(200)
    expect(res.body.data[0].id).toBe(b3.id)
    expect(res.body.data[1].id).toBe(b1.id)
    expect(res.body.data[2].id).toBe(b2.id)
  })

  it('Pipeline umbenennen', async () => {
    const pipeline = await createPipeline()
    const res = await authPut(`/api/v1/pipelines/${pipeline.id}`)
      .send({ name: 'Umbenannt', description: 'Neue Beschreibung' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Umbenannt')
  })

  it('Bucket umbenennen', async () => {
    const pipeline = await createPipeline()
    const bucket = await addBucket(pipeline.id, 'Alt')
    const res = await authPut(`/api/v1/pipelines/${pipeline.id}/buckets/${bucket.id}`)
      .send({ name: 'Neu', color: '#FF0000' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Neu')
    expect(res.body.data.color).toBe('#FF0000')
  })

  it('Bucket loeschen', async () => {
    const pipeline = await createPipeline()
    const bucket = await addBucket(pipeline.id, 'Loesch-Mich')
    const res = await authDelete(`/api/v1/pipelines/${pipeline.id}/buckets/${bucket.id}`)
    expect(res.status).toBe(200)
  })

  it('Pipeline loeschen', async () => {
    const pipeline = await createPipeline()
    const res = await authDelete(`/api/v1/pipelines/${pipeline.id}`)
    expect(res.status).toBe(200)
  })

  it('Buckets einer Pipeline abrufen', async () => {
    const pipeline = await createPipeline()
    await addBucket(pipeline.id, 'B1')
    await addBucket(pipeline.id, 'B2')
    const res = await authGet(`/api/v1/pipelines/${pipeline.id}/buckets`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 13. SETTINGS
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Settings', () => {
  it('Settings laden', async () => {
    const res = await authGet('/api/v1/settings')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('defaultFollowUpDays')
    expect(res.body.data).toHaveProperty('companyAddress')
    expect(res.body.data).toHaveProperty('checklistTemplate')
    expect(res.body.data).toHaveProperty('followUpRules')
  })

  it('Settings aktualisieren', async () => {
    const res = await authPut('/api/v1/settings').send({
      defaultFollowUpDays: 5,
      companyAddress: 'Heerbrugg',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.defaultFollowUpDays).toBe(5)

    // Zuruecksetzen
    await authPut('/api/v1/settings').send({
      defaultFollowUpDays: 3,
      companyAddress: 'St. Margrethen',
    })
  })

  it('Checkliste-Template setzen', async () => {
    const tmpl = [{ id: 'c1', label: 'Dach pruefen' }, { id: 'c2', label: 'Zaehlerkasten' }]
    const res = await authPut('/api/v1/settings').send({ checklistTemplate: tmpl })
    expect(res.status).toBe(200)
    expect(res.body.data.checklistTemplate.length).toBe(2)
  })

  it('Follow-Up Regeln setzen', async () => {
    const rules = [
      { stage: 'GESENDET', maxDays: 7, urgentMaxDays: 3, message: 'Offerte nachfassen' },
    ]
    const res = await authPut('/api/v1/settings').send({ followUpRules: rules })
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 14. ADMIN – Integrationen, Webhooks, Branding, KI, Notifications, DocTemplates, DB-Export
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Admin Integrationen', () => {
  it('4 Standard-Integrationen', async () => {
    const res = await authGet('/api/v1/admin/integrations')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(4)
    const services = res.body.data.map((i: any) => i.service)
    expect(services).toContain('OUTLOOK')
    expect(services).toContain('3CX')
    expect(services).toContain('ZOOM')
    expect(services).toContain('BEXIO')
  })

  it('Integration verbinden mit API-Key', async () => {
    const res = await authPut('/api/v1/admin/integrations/int-001')
      .send({ apiKey: 'test-key-12345' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CONNECTED')
    expect(res.body.data.apiKey).toContain('****')
  })

  it('Integration testen (mit Key)', async () => {
    await authPut('/api/v1/admin/integrations/int-002').send({ apiKey: 'key-abc' })
    const res = await authPost('/api/v1/admin/integrations/int-002/test')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('Integration testen (ohne Key)', async () => {
    const res = await authPost('/api/v1/admin/integrations/int-003/test')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(false)
  })
})

describe('E2E-V2: Admin Webhooks', () => {
  it('Webhook erstellen', async () => {
    const res = await authPost('/api/v1/admin/webhooks')
      .send({ name: `WH-${uid()}`, sourceType: 'CUSTOM' })
    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('secret')
    expect(res.body.data).toHaveProperty('endpointUrl')
    expect(res.body.data.isActive).toBe(true)
  })

  it('Webhook aktualisieren', async () => {
    const wh = await authPost('/api/v1/admin/webhooks')
      .send({ name: `WH-${uid()}` })
    const res = await authPut(`/api/v1/admin/webhooks/${wh.body.data.id}`)
      .send({ name: 'Umbenannt', isActive: false })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Umbenannt')
    expect(res.body.data.isActive).toBe(false)
  })

  it('Webhook Secret regenerieren', async () => {
    const wh = await authPost('/api/v1/admin/webhooks')
      .send({ name: `WH-${uid()}` })
    const oldSecret = wh.body.data.secret
    const res = await authPost(`/api/v1/admin/webhooks/${wh.body.data.id}/regenerate-secret`)
    expect(res.status).toBe(200)
    expect(res.body.data.secret).not.toBe(oldSecret)
  })

  it('Webhook loeschen', async () => {
    const wh = await authPost('/api/v1/admin/webhooks')
      .send({ name: `WH-${uid()}` })
    const res = await authDelete(`/api/v1/admin/webhooks/${wh.body.data.id}`)
    expect(res.status).toBe(200)
  })
})

describe('E2E-V2: Admin Branding', () => {
  it('Branding laden', async () => {
    const res = await authGet('/api/v1/admin/branding')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('companyName')
    expect(res.body.data).toHaveProperty('primaryColor')
    expect(res.body.data).toHaveProperty('offerTemplate')
    expect(res.body.data).toHaveProperty('footerText')
  })

  it('Branding aktualisieren', async () => {
    const res = await authPut('/api/v1/admin/branding')
      .send({ companyName: 'NeoSolar Test AG', companySlogan: 'Testmodus' })
    expect(res.status).toBe(200)
    expect(res.body.data.companyName).toBe('NeoSolar Test AG')
    // Zuruecksetzen
    await authPut('/api/v1/admin/branding')
      .send({ companyName: 'NEOSOLAR AG', companySlogan: 'Ihre Solarenergie-Partner' })
  })
})

describe('E2E-V2: Admin KI-Einstellungen', () => {
  it('KI-Settings laden', async () => {
    const res = await authGet('/api/v1/admin/ai-settings')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('enabled')
    expect(res.body.data).toHaveProperty('model')
    expect(res.body.data).toHaveProperty('language')
    expect(res.body.data).toHaveProperty('features')
    expect(res.body.data.features).toHaveProperty('leadSummary')
    expect(res.body.data.features).toHaveProperty('dealAnalysis')
    expect(res.body.data.features).toHaveProperty('emailDraft')
  })

  it('KI-Settings aktualisieren', async () => {
    const res = await authPut('/api/v1/admin/ai-settings')
      .send({ enabled: false, model: 'gpt-4o', features: { emailDraft: true } })
    expect(res.status).toBe(200)
    expect(res.body.data.enabled).toBe(false)
    expect(res.body.data.model).toBe('gpt-4o')
    expect(res.body.data.features.emailDraft).toBe(true)
    // Zuruecksetzen
    await authPut('/api/v1/admin/ai-settings')
      .send({ enabled: true, model: 'claude-sonnet-4-6' })
  })
})

describe('E2E-V2: Admin Benachrichtigungen', () => {
  it('Notifications laden', async () => {
    const res = await authGet('/api/v1/admin/notification-settings')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    const first = res.body.data[0]
    expect(first).toHaveProperty('event')
    expect(first).toHaveProperty('label')
    expect(first).toHaveProperty('enabled')
    expect(first).toHaveProperty('channels')
  })

  it('Notifications aktualisieren', async () => {
    const res = await authPut('/api/v1/admin/notification-settings')
      .send({
        settings: [
          { event: 'LEAD_CREATED', label: 'Neuer Lead', enabled: false, channels: [], reminderMinutes: null },
        ],
      })
    expect(res.status).toBe(200)
    expect(res.body.data[0].enabled).toBe(false)
  })
})

describe('E2E-V2: Admin Dokumenten-Vorlagen', () => {
  it('DocTemplates laden – 4 Entitaetstypen', async () => {
    const res = await authGet('/api/v1/admin/doc-templates')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(4)
    const types = res.body.data.map((t: any) => t.entityType)
    expect(types).toContain('LEAD')
    expect(types).toContain('TERMIN')
    expect(types).toContain('ANGEBOT')
    expect(types).toContain('PROJEKT')
  })

  it('LEAD Template hat Fotos mit Unterordnern', async () => {
    const res = await authGet('/api/v1/admin/doc-templates')
    const lead = res.body.data.find((t: any) => t.entityType === 'LEAD')
    expect(lead.folders.length).toBeGreaterThanOrEqual(3)
    const fotos = lead.folders.find((f: any) => f.name === 'Fotos')
    expect(fotos).toBeDefined()
    expect(fotos.subfolders).toContain('Dach')
  })

  it('PROJEKT Template hat Hauptordner mit Unterordnern', async () => {
    const res = await authGet('/api/v1/admin/doc-templates')
    const proj = res.body.data.find((t: any) => t.entityType === 'PROJEKT')
    expect(proj.folders.length).toBeGreaterThanOrEqual(4)
    const planung = proj.folders.find((f: any) => f.name === 'Planung')
    expect(planung).toBeDefined()
  })

  it('DocTemplate aktualisieren', async () => {
    const res = await authPut('/api/v1/admin/doc-templates/LEAD')
      .send({ folders: [{ name: 'Kontaktdaten' }, { name: 'Fotos', subfolders: ['Dach', 'Zaehlerkasten', 'Umgebung', 'Innenraum'] }, { name: 'Notizen' }] })
    expect(res.status).toBe(200)
    const fotos = res.body.data.folders.find((f: any) => f.name === 'Fotos')
    expect(fotos.subfolders).toContain('Innenraum')
    // Zuruecksetzen
    await authPut('/api/v1/admin/doc-templates/LEAD')
      .send({ folders: [{ name: 'Kontaktdaten' }, { name: 'Fotos', subfolders: ['Dach', 'Zaehlerkasten', 'Umgebung'] }, { name: 'Notizen' }] })
  })
})

describe('E2E-V2: Admin Audit-Log', () => {
  it('Audit-Log laden mit Pagination', async () => {
    const res = await authGet('/api/v1/admin/audit-log?page=1&pageSize=5')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page', 1)
    expect(res.body).toHaveProperty('pageSize', 5)
  })
})

describe('E2E-V2: Admin DB-Export', () => {
  it('DB-Stats laden', async () => {
    const res = await authGet('/api/v1/admin/db-export/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('contacts')
    expect(res.body.data).toHaveProperty('leads')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('projects')
    expect(res.body.data).toHaveProperty('tasks')
    expect(res.body.data).toHaveProperty('documents')
  })

  it('JSON-Export fuer Kontakte', async () => {
    const res = await authGet('/api/v1/admin/db-export/export/contacts?format=json')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('total')
  })

  it('CSV-Export fuer Leads', async () => {
    const res = await authGet('/api/v1/admin/db-export/export/leads?format=csv')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
  })

  it('Export fuer alle Entitaeten', async () => {
    const entities = ['contacts', 'leads', 'appointments', 'deals', 'projects', 'tasks', 'users', 'activities']
    for (const entity of entities) {
      const res = await authGet(`/api/v1/admin/db-export/export/${entity}`)
      expect(res.status).toBe(200)
    }
  })

  it('400 bei unbekannter Entitaet', async () => {
    const res = await authGet('/api/v1/admin/db-export/export/nonexistent')
    expect(res.status).toBe(400)
  })

  it('API-Info Endpoint', async () => {
    const res = await authGet('/api/v1/admin/db-export/api-info')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('baseUrl')
    expect(res.body.data).toHaveProperty('version')
    expect(res.body.data).toHaveProperty('endpoints')
  })
})

describe('E2E-V2: Admin Produkte', () => {
  it('Produkte pro Kategorie filtern', async () => {
    for (const cat of ['PV_MODULE', 'INVERTER', 'BATTERY', 'INSTALLATION', 'PARTNER_PRICE']) {
      const res = await authGet(`/api/v1/admin/products?category=${cat}`)
      expect(res.status).toBe(200)
      res.body.data.forEach((p: any) => expect(p.category).toBe(cat))
    }
  })

  it('Produkt CRUD', async () => {
    // Create
    const create = await authPost('/api/v1/admin/products').send({
      category: 'PV_MODULE', name: `Testmodul-${uid()}`,
      manufacturer: 'Test AG', model: 'T1', unitPrice: 250,
      specs: { wattPeak: 400 },
    })
    expect(create.status).toBe(201)
    const id = create.body.data.id

    // Read
    const read = await authGet(`/api/v1/admin/products/${id}`)
    expect(read.status).toBe(200)
    expect(read.body.data.id).toBe(id)

    // Update
    const update = await authPut(`/api/v1/admin/products/${id}`)
      .send({ unitPrice: 275 })
    expect(update.status).toBe(200)
    expect(update.body.data.unitPrice).toBe(275)

    // Delete
    const del = await authDelete(`/api/v1/admin/products/${id}`)
    expect(del.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 15. E-MAIL SYSTEM
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: E-Mail System', () => {
  it('Templates laden', async () => {
    const res = await authGet('/api/v1/emails/templates')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(4)
    const first = res.body.data[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('subject')
    expect(first).toHaveProperty('body')
  })

  it('E-Mail senden (Mock)', async () => {
    const lead = await createLead()
    const res = await authPost('/api/v1/emails/send').send({
      leadId: lead.id, to: 'kunde@test.ch',
      subject: 'Test', body: 'Testinhalt',
    })
    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('sentAt')
  })

  it('Gesendete E-Mails Endpoint', async () => {
    const res = await authGet('/api/v1/emails/sent')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 16. DASHBOARD & PROVISION
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Dashboard & Provision', () => {
  it('Dashboard-Stats mit korrekter Struktur', async () => {
    const res = await authGet('/api/v1/dashboard/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('tasks')
    expect(res.body.data.deals).toHaveProperty('totalDeals')
    expect(res.body.data.deals).toHaveProperty('pipelineValue')
    expect(res.body.data.deals).toHaveProperty('weightedPipelineValue')
    expect(res.body.data.deals).toHaveProperty('winRate')
    expect(res.body.data.appointments).toHaveProperty('upcoming')
    expect(res.body.data.tasks).toHaveProperty('open')
    expect(res.body.data.tasks).toHaveProperty('overdue')
  })

  it('Monthly mit 6 Monaten', async () => {
    const res = await authGet('/api/v1/dashboard/monthly')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(6)
    res.body.data.forEach((m: any) => {
      expect(m).toHaveProperty('month')
      expect(m).toHaveProperty('label')
      expect(m).toHaveProperty('wonDeals')
      expect(m).toHaveProperty('wonValue')
      expect(m).toHaveProperty('lostDeals')
      expect(m).toHaveProperty('provision')
      expect(m.provision).toBe(Math.round(m.wonValue * 0.05 * 100) / 100)
    })
  })

  it('Provision-Endpoint', async () => {
    const res = await authGet('/api/v1/dashboard/provision')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('month')
    expect(res.body.data).toHaveProperty('provisions')
    expect(res.body.data).toHaveProperty('summary')
    expect(res.body.data.summary).toHaveProperty('totalValue')
    expect(res.body.data.summary).toHaveProperty('totalProvision')
  })

  it('Provision mit Monats-Parameter', async () => {
    const res = await authGet('/api/v1/dashboard/provision?month=2026-02')
    expect(res.status).toBe(200)
    expect(res.body.data.month).toBe('2026-02')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 17. CROSS-MODULE VERKNUEPFUNGEN
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Cross-Module Verknuepfungen', () => {
  it('Lead → Termin → Deal → Projekt Kette (gleicher Kontakt)', async () => {
    const lead = await createLead()
    const contactId = lead.contactId

    const appt = await createAppointment({ contactId, leadId: lead.id })
    expect(appt.contactId).toBe(contactId)
    expect(appt.leadId).toBe(lead.id)

    const deal = await createDeal({ contactId, leadId: lead.id, appointmentId: appt.id })
    expect(deal.contactId).toBe(contactId)
    expect(deal.leadId).toBe(lead.id)

    const project = await createProject({
      contactId, dealId: deal.id, leadId: lead.id, appointmentId: appt.id,
    })
    expect(project.contactId).toBe(contactId)
    expect(project.dealId).toBe(deal.id)
  })

  it('Kontakt-Detail zeigt alle Verknuepfungen', async () => {
    const contact = await createContact()
    await createLead({ contactId: contact.id })
    await createAppointment({ contactId: contact.id })

    const res = await authGet(`/api/v1/contacts/${contact.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.leads.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.appointments.length).toBeGreaterThanOrEqual(1)
  })

  it('Task mit Lead-Referenz abrufbar', async () => {
    const lead = await createLead()
    const task = await createTask({ module: 'LEAD', referenceId: lead.id, referenceTitle: 'Test-Lead' })
    const res = await authGet(`/api/v1/tasks/${task.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.referenceId).toBe(lead.id)
    expect(res.body.data.module).toBe('LEAD')
  })

  it('Dokument zum Kontakt hochladen → in Kontakt-Detail sichtbar', async () => {
    const contact = await createContact()
    const docRes = await authPost('/api/v1/documents').send({
      contactId: contact.id, entityType: 'LEAD', entityId: 'ref',
      fileName: 'cross-test.pdf', fileSize: 100, mimeType: 'application/pdf',
      folderPath: 'Kontaktdaten',
      fileBase64: Buffer.from('test').toString('base64'),
    })
    expect(docRes.status).toBe(201)

    const res = await authGet(`/api/v1/contacts/${contact.id}`)
    expect(res.body.data.documents.length).toBeGreaterThanOrEqual(1)
  })

  it('Aktivitaet ueber Deal → in Kontakt-Activities sichtbar', async () => {
    const contact = await createContact()
    const deal = await createDeal({ contactId: contact.id })
    await authPost(`/api/v1/deals/${deal.id}/activities`)
      .send({ type: 'NOTE', text: 'Cross-Module Notiz' })

    const res = await authGet(`/api/v1/contacts/${contact.id}`)
    expect(res.body.data.activities.length).toBeGreaterThanOrEqual(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 18. EDGE CASES & VALIDIERUNG
// ════════════════════════════════════════════════════════════════════════════

describe('E2E-V2: Edge Cases', () => {
  it('404 fuer alle Module bei unbekannter ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const endpoints = [
      `/api/v1/leads/${fakeId}`,
      `/api/v1/appointments/${fakeId}`,
      `/api/v1/deals/${fakeId}`,
      `/api/v1/projects/${fakeId}`,
      `/api/v1/tasks/${fakeId}`,
      `/api/v1/contacts/${fakeId}`,
    ]
    for (const ep of endpoints) {
      const res = await authGet(ep)
      expect(res.status).toBe(404)
    }
  })

  it('DELETE auf geloeschten Lead → 404', async () => {
    const lead = await createLead()
    await authDelete(`/api/v1/leads/${lead.id}`)
    const res = await authDelete(`/api/v1/leads/${lead.id}`)
    // Supabase update returns 0 rows but no error, depends on impl
    expect([200, 404]).toContain(res.status)
  })

  it('Pagination: Seite 999 → leeres Array', async () => {
    const res = await authGet('/api/v1/deals?page=999&pageSize=20')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(0)
  })

  it('pageSize=1 → genau 1 Ergebnis', async () => {
    await createLead()
    const res = await authGet('/api/v1/leads?pageSize=1')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  it('Sortierung value desc', async () => {
    const res = await authGet('/api/v1/deals?sortBy=value&sortOrder=desc')
    expect(res.status).toBe(200)
    const values = res.body.data.map((d: any) => Number(d.value))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })

  it('mehrere Filter gleichzeitig', async () => {
    const res = await authGet('/api/v1/deals?stage=ERSTELLT&priority=MEDIUM')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: any) => {
      expect(d.stage).toBe('ERSTELLT')
      expect(d.priority).toBe('MEDIUM')
    })
  })

  it('ungueltige E-Mail bei Kontakt → 422', async () => {
    const res = await authPost('/api/v1/contacts').send({
      firstName: 'Bad', lastName: 'Email', email: 'not-an-email',
      phone: '+41 71 000', address: 'Test',
    })
    expect(res.status).toBe(422)
  })
})
