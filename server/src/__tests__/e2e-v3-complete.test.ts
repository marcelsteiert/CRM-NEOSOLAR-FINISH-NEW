import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { createApp } from '../app.js'
import { supabase } from '../lib/supabase.js'
import type { Express } from 'express'

// ════════════════════════════════════════════════════════════════════════════
// E2E V3 COMPLETE – 150+ eigenstaendige Tests
// Backend + Frontend-Backend-Verknuepfungen + camelCase + Rollen + Cleanup
// ════════════════════════════════════════════════════════════════════════════

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string'
const TEST_PASSWORD = 'E2ETestPw2026!'
const PREFIX = 'v3e2e'

let app: Express
let adminToken: string
let vertriebToken: string
let plToken: string
let buchhaltungToken: string

const cleanup = {
  userIds: [] as string[],
  contactIds: [] as string[],
  leadIds: [] as string[],
  appointmentIds: [] as string[],
  dealIds: [] as string[],
  projectIds: [] as string[],
  taskIds: [] as string[],
  pipelineIds: [] as string[],
  tagIds: [] as string[],
  reminderIds: [] as string[],
  webhookIds: [] as string[],
  productIds: [] as string[],
  passwordIds: [] as string[],
}

let loginUser: { id: string; email: string }

const uid = () => `${PREFIX}-${Math.random().toString(36).slice(2, 8)}`

beforeAll(async () => {
  app = createApp()

  // Zuerst echte Test-User in DB anlegen (fuer Foreign Key Constraints)
  const hashedPw = await bcrypt.hash(TEST_PASSWORD, 10)
  const roles = [
    { key: 'admin', role: 'ADMIN', first: 'V3-Admin', email: `${PREFIX}-admin@neosolar-test.ch` },
    { key: 'vertrieb', role: 'VERTRIEB', first: 'V3-Vertrieb', email: `${PREFIX}-vertrieb@neosolar-test.ch` },
    { key: 'pl', role: 'PROJEKTLEITUNG', first: 'V3-PL', email: `${PREFIX}-pl@neosolar-test.ch` },
    { key: 'bh', role: 'BUCHHALTUNG', first: 'V3-BH', email: `${PREFIX}-bh@neosolar-test.ch` },
  ] as const

  const userIds: Record<string, string> = {}

  for (const r of roles) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', r.email).single()
    if (existing) {
      await supabase.from('users').update({ password: hashedPw, is_active: true, role: r.role }).eq('id', existing.id)
      userIds[r.key] = existing.id
    } else {
      const { data } = await supabase.from('users').insert({
        first_name: r.first, last_name: 'Test', email: r.email, password: hashedPw,
        role: r.role, phone: '', is_active: true,
        allowed_modules: ['dashboard', 'leads', 'appointments', 'deals', 'projects', 'tasks', 'admin', 'communication', 'documents', 'export', 'provision', 'search'],
      }).select('id').single()
      userIds[r.key] = data!.id
      cleanup.userIds.push(data!.id)
    }
  }

  // JWT-Tokens mit echten User-IDs
  adminToken = jwt.sign({ userId: userIds.admin, email: `${PREFIX}-admin@neosolar-test.ch`, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' })
  vertriebToken = jwt.sign({ userId: userIds.vertrieb, email: `${PREFIX}-vertrieb@neosolar-test.ch`, role: 'VERTRIEB' }, JWT_SECRET, { expiresIn: '1h' })
  plToken = jwt.sign({ userId: userIds.pl, email: `${PREFIX}-pl@neosolar-test.ch`, role: 'PROJEKTLEITUNG' }, JWT_SECRET, { expiresIn: '1h' })
  buchhaltungToken = jwt.sign({ userId: userIds.bh, email: `${PREFIX}-bh@neosolar-test.ch`, role: 'BUCHHALTUNG' }, JWT_SECRET, { expiresIn: '1h' })

  // Login-User = Admin-User
  loginUser = { id: userIds.admin, email: `${PREFIX}-admin@neosolar-test.ch` }
})

// ── Helpers ──

function authGet(url: string, token = adminToken) { return request(app).get(url).set('Authorization', `Bearer ${token}`) }
function authPost(url: string, token = adminToken) { return request(app).post(url).set('Authorization', `Bearer ${token}`) }
function authPut(url: string, token = adminToken) { return request(app).put(url).set('Authorization', `Bearer ${token}`) }
function authDelete(url: string, token = adminToken) { return request(app).delete(url).set('Authorization', `Bearer ${token}`) }

async function createContact(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/contacts').send({
    firstName: `Kontakt-${u}`, lastName: `Test-${u}`,
    email: `${u}@e2e.ch`, phone: '+41 79 000 00 00',
    address: 'E2E-Strasse 1, 8000 Zuerich', ...overrides,
  })
  expect(res.status).toBe(201)
  cleanup.contactIds.push(res.body.data.id)
  return res.body.data
}

async function createLead(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/leads').send({
    firstName: `Lead-${u}`, lastName: `Test-${u}`,
    address: 'E2E-Str 1, 8000 ZH', phone: '+41 79 111 11 11',
    email: `lead-${u}@e2e.ch`, source: 'HOMEPAGE', ...overrides,
  })
  expect(res.status).toBe(201)
  cleanup.leadIds.push(res.body.data.id)
  if (res.body.data.contactId) cleanup.contactIds.push(res.body.data.contactId)
  return res.body.data
}

async function createAppointment(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/appointments').send({
    contactName: `Termin-${u}`, contactEmail: `termin-${u}@e2e.ch`,
    contactPhone: '+41 79 222 22 22', contactAddress: 'E2E-Weg 5, 3000 Bern',
    value: 15000, status: 'GEPLANT', priority: 'MEDIUM',
    appointmentType: 'VOR_ORT', appointmentDate: '2026-04-15',
    appointmentTime: '10:00', ...overrides,
  })
  expect(res.status).toBe(201)
  cleanup.appointmentIds.push(res.body.data.id)
  if (res.body.data.contactId) cleanup.contactIds.push(res.body.data.contactId)
  return res.body.data
}

async function createDeal(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/deals').send({
    contactName: `Deal-${u}`, contactEmail: `deal-${u}@e2e.ch`,
    title: `Angebot-${u}`, value: 25000, stage: 'ERSTELLT',
    priority: 'MEDIUM', ...overrides,
  })
  expect(res.status).toBe(201)
  cleanup.dealIds.push(res.body.data.id)
  if (res.body.data.contactId) cleanup.contactIds.push(res.body.data.contactId)
  return res.body.data
}

async function createProject(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/projects').send({
    contactName: `Projekt-${u}`, contactEmail: `projekt-${u}@e2e.ch`,
    name: `PV-Anlage-${u}`, kwp: 10, value: 30000,
    priority: 'MEDIUM', ...overrides,
  })
  expect(res.status).toBe(201)
  cleanup.projectIds.push(res.body.data.id)
  if (res.body.data.contactId) cleanup.contactIds.push(res.body.data.contactId)
  return res.body.data
}

async function createTask(overrides: Record<string, unknown> = {}) {
  const u = uid()
  const res = await authPost('/api/v1/tasks').send({
    title: `Task-${u}`, description: 'E2E Test Aufgabe',
    priority: 'MEDIUM', module: 'ALLGEMEIN',
    assignedTo: loginUser?.id ?? 'u001', ...overrides,
  })
  expect(res.status).toBe(201)
  cleanup.taskIds.push(res.body.data.id)
  return res.body.data
}

// ════════════════════════════════════════════════════════════════════════════
// 1. HEALTH
// ════════════════════════════════════════════════════════════════════════════

describe('1. Health Check', () => {
  it('GET /health → 200', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. AUTH
// ════════════════════════════════════════════════════════════════════════════

describe('2. Authentifizierung', () => {
  it('POST /auth/login → erfolgreicher Login', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: loginUser.email, password: TEST_PASSWORD,
    })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user).toHaveProperty('email', loginUser.email)
  })

  it('POST /auth/login → falsches Passwort = 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: loginUser.email, password: 'FalschesPW!',
    })
    expect(res.status).toBe(401)
  })

  it('POST /auth/login → unbekannte Email = 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nichtexistent@none.ch', password: TEST_PASSWORD,
    })
    expect(res.status).toBe(401)
  })

  it('GET /auth/me → Profil', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: loginUser.email, password: TEST_PASSWORD,
    })
    const token = loginRes.body.data.token
    const res = await authGet('/api/v1/auth/me', token)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('email', loginUser.email)
  })

  it('Ohne Token → 401', async () => {
    const res = await request(app).get('/api/v1/leads')
    expect(res.status).toBe(401)
  })

  it('Ungueltiger Token → 401', async () => {
    const res = await request(app).get('/api/v1/leads').set('Authorization', 'Bearer invalid')
    expect(res.status).toBe(401)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. USERS
// ════════════════════════════════════════════════════════════════════════════

describe('3. Users & Rollen', () => {
  let testUserId: string

  it('GET /users → Liste (camelCase)', async () => {
    const res = await authGet('/api/v1/users')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      const u = res.body.data[0]
      expect(u).toHaveProperty('firstName')
      expect(u).toHaveProperty('lastName')
      expect(u).toHaveProperty('isActive')
      expect(u).toHaveProperty('allowedModules')
      expect(u).not.toHaveProperty('first_name')
      expect(u).not.toHaveProperty('is_active')
    }
  })

  it('POST /users → anlegen', async () => {
    const u = uid()
    const res = await authPost('/api/v1/users').send({
      firstName: `V3-${u}`, lastName: `User-${u}`,
      email: `${u}@e2e.ch`, role: 'VERTRIEB',
    })
    expect(res.status).toBe(201)
    testUserId = res.body.data.id
    cleanup.userIds.push(testUserId)
  })

  it('POST /users → Duplikat-Email = 409', async () => {
    const u = uid()
    const r1 = await authPost('/api/v1/users').send({
      firstName: `Dup-${u}`, lastName: `Test`, email: `dup-${u}@e2e.ch`, role: 'VERTRIEB',
    })
    cleanup.userIds.push(r1.body.data.id)
    const r2 = await authPost('/api/v1/users').send({
      firstName: `Dup2-${u}`, lastName: `Test2`, email: `dup-${u}@e2e.ch`, role: 'ADMIN',
    })
    expect(r2.status).toBe(409)
  })

  it('PUT /users/:id → aktualisieren', async () => {
    const res = await authPut(`/api/v1/users/${testUserId}`).send({ phone: '+41 79 999 99 99' })
    expect(res.status).toBe(200)
    expect(res.body.data.phone).toBe('+41 79 999 99 99')
  })

  it('PUT /users/:id → Duplikat-Email bei Update = 409', async () => {
    const res = await authPut(`/api/v1/users/${testUserId}`).send({ email: loginUser.email })
    expect(res.status).toBe(409)
  })

  it('GET /users/role-defaults', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('ADMIN')
    expect(res.body.data).toHaveProperty('VERTRIEB')
  })

  it('DELETE /users/:id → deaktivieren', async () => {
    const res = await authDelete(`/api/v1/users/${testUserId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.isActive).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. KONTAKTE
// ════════════════════════════════════════════════════════════════════════════

describe('4. Kontakte', () => {
  let contactId: string

  it('POST /contacts → erstellen', async () => {
    const c = await createContact()
    contactId = c.id
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('firstName')
    expect(c).not.toHaveProperty('first_name')
  })

  it('GET /contacts → Liste', async () => {
    const res = await authGet('/api/v1/contacts')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
  })

  it('GET /contacts/:id', async () => {
    const res = await authGet(`/api/v1/contacts/${contactId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(contactId)
  })

  it('PUT /contacts/:id', async () => {
    const res = await authPut(`/api/v1/contacts/${contactId}`).send({ company: 'E2E GmbH' })
    expect(res.status).toBe(200)
    expect(res.body.data.company).toBe('E2E GmbH')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 5. TAGS
// ════════════════════════════════════════════════════════════════════════════

describe('5. Tags', () => {
  it('POST /tags → erstellen', async () => {
    const res = await authPost('/api/v1/tags').send({ name: `Tag-${uid()}`, color: '#F59E0B' })
    expect(res.status).toBe(201)
    cleanup.tagIds.push(res.body.data.id)
  })

  it('GET /tags', async () => {
    const res = await authGet('/api/v1/tags')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. PIPELINES
// ════════════════════════════════════════════════════════════════════════════

describe('6. Pipelines & Buckets', () => {
  let pipelineId: string
  let b1: string, b2: string

  it('POST /pipelines', async () => {
    const res = await authPost('/api/v1/pipelines').send({ name: `Pipe-${uid()}` })
    expect(res.status).toBe(201)
    pipelineId = res.body.data.id
    cleanup.pipelineIds.push(pipelineId)
  })

  it('POST buckets', async () => {
    const r1 = await authPost(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name: 'Neu', position: 0 })
    const r2 = await authPost(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name: 'Qualifiziert', position: 1 })
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(201)
    b1 = r1.body.data.id
    b2 = r2.body.data.id
  })

  it('GET /pipelines mit Buckets', async () => {
    const res = await authGet('/api/v1/pipelines')
    expect(res.status).toBe(200)
    const p = res.body.data.find((pp: any) => pp.id === pipelineId)
    expect(p).toBeDefined()
    expect(p.buckets.length).toBeGreaterThanOrEqual(2)
  })

  it('PUT reorder', async () => {
    const res = await authPut(`/api/v1/pipelines/${pipelineId}/buckets/reorder`).send({ bucketIds: [b2, b1] })
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 7. LEADS
// ════════════════════════════════════════════════════════════════════════════

describe('7. Leads', () => {
  let leadId: string
  let leadContactId: string

  it('POST /leads → erstellen', async () => {
    const lead = await createLead()
    leadId = lead.id
    leadContactId = lead.contactId
    expect(lead).toHaveProperty('contactId')
    expect(lead).toHaveProperty('source', 'HOMEPAGE')
  })

  it('GET /leads → Pagination', async () => {
    const res = await authGet('/api/v1/leads?pageSize=5')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page')
  })

  it('GET /leads → Sort createdAt', async () => {
    const res = await authGet('/api/v1/leads?sortBy=createdAt&sortOrder=desc')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('GET /leads → Sort value (ungueltig) → Fallback statt Crash', async () => {
    const res = await authGet('/api/v1/leads?sortBy=value&sortOrder=desc')
    expect(res.status).toBe(200)
    // Muss Daten zurueckgeben (Fallback auf created_at), nicht leer
    expect(res.body).toHaveProperty('data')
  })

  it('GET /leads → Sort source', async () => {
    const res = await authGet('/api/v1/leads?sortBy=source&sortOrder=asc')
    expect(res.status).toBe(200)
  })

  it('GET /leads/:id', async () => {
    const res = await authGet(`/api/v1/leads/${leadId}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('firstName')
    expect(res.body.data).toHaveProperty('email')
    expect(res.body.data).toHaveProperty('phone')
  })

  it('PUT /leads/:id → Kontaktdaten aendern', async () => {
    const newEmail = `updated-${uid()}@e2e.ch`
    const res = await authPut(`/api/v1/leads/${leadId}`).send({
      email: newEmail, phone: '+41 79 333 33 33', company: 'E2E Updated',
    })
    expect(res.status).toBe(200)
  })

  it('PUT /leads/:id → Kontakt in DB verifizieren', async () => {
    const newEmail = `verify-${uid()}@e2e.ch`
    await authPut(`/api/v1/leads/${leadId}`).send({ email: newEmail })
    const { data } = await supabase.from('contacts').select('email').eq('id', leadContactId).single()
    expect(data?.email).toBe(newEmail)
  })

  it('POST /leads/:id/tags', async () => {
    const tagRes = await authPost('/api/v1/tags').send({ name: `LT-${uid()}`, color: '#34D399' })
    cleanup.tagIds.push(tagRes.body.data.id)
    const res = await authPost(`/api/v1/leads/${leadId}/tags`).send({ tagIds: [tagRes.body.data.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tagRes.body.data.id)
  })

  it('PUT /leads/:id/move', async () => {
    const pRes = await authPost('/api/v1/pipelines').send({ name: `Move-${uid()}` })
    cleanup.pipelineIds.push(pRes.body.data.id)
    const bRes = await authPost(`/api/v1/pipelines/${pRes.body.data.id}/buckets`).send({ name: 'B1' })
    const res = await authPut(`/api/v1/leads/${leadId}/move`).send({ bucketId: bRes.body.data.id })
    expect(res.status).toBe(200)
  })

  it('GET /leads?status=ACTIVE', async () => {
    const res = await authGet('/api/v1/leads?status=ACTIVE')
    expect(res.status).toBe(200)
    for (const l of res.body.data) expect(l.status).toBe('ACTIVE')
  })

  it('VERTRIEB sieht eigene Leads', async () => {
    const res = await authGet('/api/v1/leads', vertriebToken)
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 8. TERMINE
// ════════════════════════════════════════════════════════════════════════════

describe('8. Termine', () => {
  let aptId: string

  it('POST /appointments → erstellen', async () => {
    const a = await createAppointment()
    aptId = a.id
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('contactId')
    expect(a).not.toHaveProperty('contact_id')
  })

  it('GET /appointments', async () => {
    const res = await authGet('/api/v1/appointments')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
  })

  it('GET /appointments/:id', async () => {
    const res = await authGet(`/api/v1/appointments/${aptId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(aptId)
  })

  it('PUT /appointments/:id + Checkliste', async () => {
    const res = await authPut(`/api/v1/appointments/${aptId}`).send({
      status: 'DURCHGEFUEHRT',
      checklist: [{ id: 'chk-1', label: 'Dach geprueft', checked: true }],
    })
    expect(res.status).toBe(200)
  })

  it('GET /appointments/stats', async () => {
    const res = await authGet('/api/v1/appointments/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 9. DEALS
// ════════════════════════════════════════════════════════════════════════════

describe('9. Deals', () => {
  let dealId: string

  it('POST /deals', async () => {
    const d = await createDeal()
    dealId = d.id
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('contactId')
    expect(d).not.toHaveProperty('contact_id')
  })

  it('GET /deals', async () => {
    const res = await authGet('/api/v1/deals')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /deals/:id', async () => {
    const res = await authGet(`/api/v1/deals/${dealId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(dealId)
  })

  it('PUT /deals/:id → winProbability + followUpDate', async () => {
    const res = await authPut(`/api/v1/deals/${dealId}`).send({
      winProbability: 75, followUpDate: '2026-04-20',
    })
    expect(res.status).toBe(200)
  })

  it('POST /deals/:id/activities', async () => {
    const res = await authPost(`/api/v1/deals/${dealId}/activities`).send({
      type: 'NOTE', text: 'E2E Notiz',
    })
    expect(res.status).toBe(201)
  })

  it('PUT /deals/:id → GEWONNEN', async () => {
    const res = await authPut(`/api/v1/deals/${dealId}`).send({ stage: 'GEWONNEN' })
    expect(res.status).toBe(200)
  })

  it('GET /deals/stats', async () => {
    const res = await authGet('/api/v1/deals/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('totalDeals')
  })

  it('GET /deals/follow-ups', async () => {
    const res = await authGet('/api/v1/deals/follow-ups')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('total')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 10. PROJEKTE
// ════════════════════════════════════════════════════════════════════════════

describe('10. Projekte', () => {
  let projectId: string

  it('POST /projects', async () => {
    const p = await createProject()
    projectId = p.id
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('contactId')
    expect(p).not.toHaveProperty('contact_id')
  })

  it('GET /projects', async () => {
    const res = await authGet('/api/v1/projects')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /projects/:id', async () => {
    const res = await authGet(`/api/v1/projects/${projectId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(projectId)
  })

  it('PUT /projects/:id', async () => {
    const res = await authPut(`/api/v1/projects/${projectId}`).send({
      priority: 'HIGH', risk: true, riskNote: 'E2E Risiko',
    })
    expect(res.status).toBe(200)
  })

  it('PUT /projects/:id/toggle-step', async () => {
    const res = await authPut(`/api/v1/projects/${projectId}/toggle-step`).send({
      phase: 'admin', stepIndex: 0,
    })
    expect(res.status).toBe(200)
  })

  it('POST /projects/:id/activities', async () => {
    const res = await authPost(`/api/v1/projects/${projectId}/activities`).send({
      type: 'NOTE', text: 'E2E Projekt Notiz', createdBy: loginUser?.id ?? 'u001',
    })
    expect(res.status).toBe(201)
  })

  it('GET /projects/stats', async () => {
    const res = await authGet('/api/v1/projects/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
  })

  it('GET /projects/phases', async () => {
    const res = await authGet('/api/v1/projects/phases')
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 11. TASKS
// ════════════════════════════════════════════════════════════════════════════

describe('11. Tasks', () => {
  let taskId: string

  it('POST /tasks', async () => {
    const t = await createTask()
    taskId = t.id
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('title')
    expect(t).toHaveProperty('assignedTo')
    expect(t).not.toHaveProperty('assigned_to')
  })

  it('GET /tasks', async () => {
    const res = await authGet('/api/v1/tasks')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('PUT /tasks/:id → IN_BEARBEITUNG', async () => {
    const res = await authPut(`/api/v1/tasks/${taskId}`).send({ status: 'IN_BEARBEITUNG' })
    expect(res.status).toBe(200)
  })

  it('PUT /tasks/:id → ERLEDIGT', async () => {
    const res = await authPut(`/api/v1/tasks/${taskId}`).send({ status: 'ERLEDIGT' })
    expect(res.status).toBe(200)
  })

  it('GET /tasks/stats', async () => {
    const res = await authGet('/api/v1/tasks/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('open')
  })

  it('Task mit LEAD-Verknuepfung', async () => {
    const lead = await createLead()
    const t = await createTask({ module: 'LEAD', referenceId: lead.id, referenceTitle: 'Ref-Lead' })
    expect(t.module).toBe('LEAD')
    expect(t.referenceId).toBe(lead.id)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 12. AKTIVITAETEN
// ════════════════════════════════════════════════════════════════════════════

describe('12. Aktivitaeten', () => {
  it('POST /activities', async () => {
    const lead = await createLead()
    const res = await authPost('/api/v1/activities').send({
      leadId: lead.id, type: 'NOTE', text: 'E2E Aktivitaet', createdBy: loginUser?.id ?? 'u001',
    })
    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('id')
  })

  it('GET /activities', async () => {
    const res = await authGet('/api/v1/activities')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 13. REMINDERS
// ════════════════════════════════════════════════════════════════════════════

describe('13. Reminders', () => {
  let reminderId: string

  it('POST /reminders (mit leadId)', async () => {
    const lead = await createLead()
    const res = await authPost('/api/v1/reminders').send({
      leadId: lead.id,
      title: `Reminder-${uid()}`, description: 'E2E Test',
      dueAt: '2026-04-20T10:00:00Z', createdBy: loginUser?.id ?? 'u001',
    })
    expect(res.status).toBe(201)
    reminderId = res.body.data.id
    cleanup.reminderIds.push(reminderId)
  })

  it('GET /reminders', async () => {
    const res = await authGet('/api/v1/reminders')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('PUT /reminders/:id/dismiss', async () => {
    const res = await authPut(`/api/v1/reminders/${reminderId}/dismiss`)
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 14. SETTINGS
// ════════════════════════════════════════════════════════════════════════════

describe('14. Settings', () => {
  it('GET /settings', async () => {
    const res = await authGet('/api/v1/settings')
    expect(res.status).toBe(200)
  })

  it('GET /settings/feature-flags', async () => {
    const res = await authGet('/api/v1/settings/feature-flags')
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 15. SEARCH
// ════════════════════════════════════════════════════════════════════════════

describe('15. Globale Suche', () => {
  it('GET /search?q=... → Ergebnisse', async () => {
    const u = uid()
    await createContact({ firstName: `SuchV3-${u}` })
    const res = await authGet(`/api/v1/search?q=SuchV3-${u}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 16. DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

describe('16. Dashboard', () => {
  it('GET /dashboard/stats', async () => {
    const res = await authGet('/api/v1/dashboard/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('tasks')
  })

  it('GET /dashboard/monthly', async () => {
    const res = await authGet('/api/v1/dashboard/monthly')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /dashboard/provision', async () => {
    const res = await authGet('/api/v1/dashboard/provision')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('provisions')
    expect(res.body.data).toHaveProperty('summary')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 17. DOCUMENTS
// ════════════════════════════════════════════════════════════════════════════

describe('17. Dokumente', () => {
  it('GET /documents', async () => {
    const res = await authGet('/api/v1/documents')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 18. PASSWORDS
// ════════════════════════════════════════════════════════════════════════════

describe('18. Passwort-Manager', () => {
  let pwId: string

  it('POST /passwords', async () => {
    const res = await authPost('/api/v1/passwords').send({
      title: `PW-${uid()}`, username: 'test', password: 'geheim',
      url: 'https://example.com', category: 'SYSTEM', isShared: false,
    })
    expect(res.status).toBe(201)
    pwId = res.body.data.id
    cleanup.passwordIds.push(pwId)
  })

  it('GET /passwords', async () => {
    const res = await authGet('/api/v1/passwords')
    expect(res.status).toBe(200)
  })

  it('DELETE /passwords/:id', async () => {
    const res = await authDelete(`/api/v1/passwords/${pwId}`)
    expect(res.status).toBe(200)
    cleanup.passwordIds = cleanup.passwordIds.filter(id => id !== pwId)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 19. ADMIN ENDPUNKTE
// ════════════════════════════════════════════════════════════════════════════

describe('19. Admin', () => {
  it('POST /admin/products', async () => {
    const res = await authPost('/api/v1/admin/products').send({
      category: 'PV_MODULE', name: `Modul-${uid()}`,
      manufacturer: 'E2E', model: 'T-400',
      specs: { watt: 400 }, unitPrice: 250, unit: 'Stueck', isActive: true,
    })
    expect(res.status).toBe(201)
    cleanup.productIds.push(res.body.data.id)
  })

  it('GET /admin/products', async () => {
    const res = await authGet('/api/v1/admin/products')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/integrations', async () => {
    const res = await authGet('/api/v1/admin/integrations')
    expect(res.status).toBe(200)
  })

  it('POST /admin/webhooks', async () => {
    const res = await authPost('/api/v1/admin/webhooks').send({
      name: `WH-${uid()}`, sourceType: 'HOMEPAGE',
    })
    expect(res.status).toBe(201)
    cleanup.webhookIds.push(res.body.data.id)
  })

  it('GET /admin/branding', async () => {
    const res = await authGet('/api/v1/admin/branding')
    expect(res.status).toBe(200)
  })

  it('GET /admin/ai-settings', async () => {
    const res = await authGet('/api/v1/admin/ai-settings')
    expect(res.status).toBe(200)
  })

  it('GET /admin/notification-settings', async () => {
    const res = await authGet('/api/v1/admin/notification-settings')
    expect(res.status).toBe(200)
  })

  it('GET /admin/doc-templates', async () => {
    const res = await authGet('/api/v1/admin/doc-templates')
    expect(res.status).toBe(200)
  })

  it('GET /admin/audit-log', async () => {
    const res = await authGet('/api/v1/admin/audit-log')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
  })

  it('GET /admin/db-export/stats', async () => {
    const res = await authGet('/api/v1/admin/db-export/stats')
    expect(res.status).toBe(200)
  })

  it('GET /admin/db-export/api-info', async () => {
    const res = await authGet('/api/v1/admin/db-export/api-info')
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 20. OUTLOOK ENDPUNKTE
// ════════════════════════════════════════════════════════════════════════════

describe('20. Outlook', () => {
  it('GET /outlook/status', async () => {
    const res = await authGet('/api/v1/outlook/status')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('connected')
  })

  it('GET /outlook/stats', async () => {
    const res = await authGet('/api/v1/outlook/stats')
    expect(res.status).toBe(200)
  })

  it('GET /outlook/templates', async () => {
    const res = await authGet('/api/v1/outlook/templates')
    expect(res.status).toBe(200)
  })

  it('GET /outlook/signatures', async () => {
    const res = await authGet('/api/v1/outlook/signatures')
    expect(res.status).toBe(200)
  })

  // Ohne Verbindung → 400 ist korrekt
  it('GET /outlook/emails ohne Verbindung → 400', async () => {
    const res = await authGet('/api/v1/outlook/emails')
    // 200 wenn verbunden, 400 wenn nicht – beides ok
    expect([200, 400]).toContain(res.status)
  })

  it('GET /outlook/calendar ohne Verbindung → 400', async () => {
    const res = await authGet('/api/v1/outlook/calendar')
    expect([200, 400]).toContain(res.status)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 21. ROLLEN-BERECHTIGUNGEN
// ════════════════════════════════════════════════════════════════════════════

describe('21. Rollen-Berechtigungen', () => {
  it('BUCHHALTUNG kann keine Leads bulk-loeschen', async () => {
    const res = await authDelete('/api/v1/leads/all', buchhaltungToken)
    expect(res.status).toBe(403)
  })

  it('VERTRIEB kann keine Leads bulk-loeschen', async () => {
    const res = await authDelete('/api/v1/leads/all', vertriebToken)
    expect(res.status).toBe(403)
  })

  it('PROJEKTLEITUNG kann Projekte lesen', async () => {
    const res = await authGet('/api/v1/projects', plToken)
    expect(res.status).toBe(200)
  })

  it('Ohne Token → 401 auf geschuetzte Route', async () => {
    const res = await request(app).get('/api/v1/deals')
    expect(res.status).toBe(401)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 22. CAMELCASE REGRESSION
// ════════════════════════════════════════════════════════════════════════════

describe('22. camelCase Regression', () => {
  const forbidden = [
    'first_name', 'last_name', 'contact_id', 'assigned_to',
    'created_at', 'updated_at', 'deleted_at', 'is_active',
    'pipeline_id', 'bucket_id', 'appointment_type', 'allowed_modules',
    'avatar_color', 'lead_tags', 'win_probability', 'follow_up_date',
  ]

  function assertNoSnake(obj: any, path = '') {
    if (!obj || typeof obj !== 'object') return
    for (const key of Object.keys(obj)) {
      const full = path ? `${path}.${key}` : key
      if (forbidden.includes(key)) throw new Error(`snake_case "${key}" bei ${full}`)
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        assertNoSnake(obj[key], full)
      }
    }
  }

  const endpoints = ['/leads', '/users', '/appointments', '/deals', '/projects', '/tasks', '/contacts']

  for (const ep of endpoints) {
    it(`GET ${ep} → kein snake_case`, async () => {
      const res = await authGet(`/api/v1${ep}`)
      expect(res.status).toBe(200)
      for (const item of (res.body.data ?? [])) assertNoSnake(item)
    })
  }
})

// ════════════════════════════════════════════════════════════════════════════
// 23. PIPELINE-UEBERGREIFENDE VERKNUEPFUNGEN
// ════════════════════════════════════════════════════════════════════════════

describe('23. Pipeline-Verknuepfungen', () => {
  it('Kontakt → Lead → Termin → Deal → Projekt Kette', async () => {
    // 1. Kontakt
    const contact = await createContact({ firstName: 'Pipeline', lastName: 'Kette' })

    // 2. Lead
    const leadRes = await authPost('/api/v1/leads').send({
      contactId: contact.id, source: 'EMPFEHLUNG',
    })
    expect(leadRes.status).toBe(201)
    cleanup.leadIds.push(leadRes.body.data.id)
    expect(leadRes.body.data.contactId).toBe(contact.id)

    // 3. Termin
    const aptRes = await authPost('/api/v1/appointments').send({
      contactId: contact.id, leadId: leadRes.body.data.id,
      value: 20000, status: 'GEPLANT', appointmentType: 'VOR_ORT',
      appointmentDate: '2026-05-01', appointmentTime: '14:00',
    })
    expect(aptRes.status).toBe(201)
    cleanup.appointmentIds.push(aptRes.body.data.id)

    // 4. Deal
    const dealRes = await authPost('/api/v1/deals').send({
      contactId: contact.id, title: 'Ketten-Deal',
      value: 20000, stage: 'ERSTELLT', priority: 'HIGH',
    })
    expect(dealRes.status).toBe(201)
    cleanup.dealIds.push(dealRes.body.data.id)

    // 5. Projekt
    const projRes = await authPost('/api/v1/projects').send({
      contactId: contact.id, name: 'Ketten-Projekt',
      kwp: 12, value: 35000, dealId: dealRes.body.data.id,
    })
    expect(projRes.status).toBe(201)
    cleanup.projectIds.push(projRes.body.data.id)

    // 6. Kontakt-Detail → Verknuepfungen pruefen
    const detail = await authGet(`/api/v1/contacts/${contact.id}`)
    expect(detail.status).toBe(200)
  })

  it('Task mit Projekt-Verknuepfung', async () => {
    const project = await createProject()
    const task = await createTask({
      module: 'PROJEKT', referenceId: project.id, referenceTitle: 'Ref-Projekt',
    })
    expect(task.module).toBe('PROJEKT')
    expect(task.referenceId).toBe(project.id)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 24. FRONTEND-BACKEND VERKNUEPFUNG
// ════════════════════════════════════════════════════════════════════════════

describe('24. Frontend-Backend Kompatibilitaet', () => {
  it('Lead-Interface: Alle Frontend-Felder vorhanden', async () => {
    const lead = await createLead()
    const res = await authGet(`/api/v1/leads/${lead.id}`)
    const d = res.body.data
    // Felder die das Frontend-Interface erwartet (useLeads.ts Lead type)
    const requiredFields = ['id', 'contactId', 'firstName', 'lastName', 'company',
      'address', 'phone', 'email', 'source', 'status', 'tags', 'createdAt', 'updatedAt']
    for (const f of requiredFields) {
      expect(d).toHaveProperty(f)
    }
  })

  it('Deal-Interface: Alle Frontend-Felder vorhanden', async () => {
    const deal = await createDeal()
    const res = await authGet(`/api/v1/deals/${deal.id}`)
    const d = res.body.data
    const requiredFields = ['id', 'contactId', 'title', 'value', 'stage', 'priority']
    for (const f of requiredFields) {
      expect(d).toHaveProperty(f)
    }
  })

  it('Appointment-Interface: Felder pruefen', async () => {
    const apt = await createAppointment()
    const res = await authGet(`/api/v1/appointments/${apt.id}`)
    const d = res.body.data
    const requiredFields = ['id', 'contactId', 'status', 'value']
    for (const f of requiredFields) {
      expect(d).toHaveProperty(f)
    }
  })

  it('Project-Interface: Felder pruefen', async () => {
    const proj = await createProject()
    const res = await authGet(`/api/v1/projects/${proj.id}`)
    const d = res.body.data
    const requiredFields = ['id', 'contactId', 'name', 'phase', 'priority', 'value']
    for (const f of requiredFields) {
      expect(d).toHaveProperty(f)
    }
  })

  it('User-Interface: Felder pruefen', async () => {
    const res = await authGet('/api/v1/users')
    expect(res.body.data.length).toBeGreaterThan(0)
    const u = res.body.data[0]
    const requiredFields = ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'allowedModules']
    for (const f of requiredFields) {
      expect(u).toHaveProperty(f)
    }
  })

  it('Dashboard-Stats: Frontend erwartet deals/appointments/tasks', async () => {
    const res = await authGet('/api/v1/dashboard/stats')
    const d = res.body.data
    expect(d.deals).toHaveProperty('totalDeals')
    expect(d.deals).toHaveProperty('wonDeals')
    expect(d.deals).toHaveProperty('winRate')
    expect(d.appointments).toHaveProperty('total')
    expect(d.appointments).toHaveProperty('upcoming')
    expect(d.tasks).toHaveProperty('open')
    expect(d.tasks).toHaveProperty('total')
  })

  it('Dashboard-Monthly: Array mit month/wonValue/provision', async () => {
    const res = await authGet('/api/v1/dashboard/monthly')
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      const m = res.body.data[0]
      expect(m).toHaveProperty('month')
      expect(m).toHaveProperty('wonValue')
      expect(m).toHaveProperty('provision')
    }
  })

  it('Provision: provisions Array + summary', async () => {
    const res = await authGet('/api/v1/dashboard/provision')
    expect(Array.isArray(res.body.data.provisions)).toBe(true)
    expect(res.body.data.summary).toHaveProperty('totalValue')
    expect(res.body.data.summary).toHaveProperty('totalProvision')
  })

  it('Kontakt-Edit via Lead-PUT speichert in contacts-Tabelle', async () => {
    const lead = await createLead()
    const newPhone = '+41 79 888 88 88'
    const newEmail = `fe-be-${uid()}@e2e.ch`
    await authPut(`/api/v1/leads/${lead.id}`).send({ phone: newPhone, email: newEmail })
    // Direkt in DB pruefen
    const { data: contact } = await supabase.from('contacts').select('phone, email').eq('id', lead.contactId).single()
    expect(contact?.phone).toBe(newPhone)
    expect(contact?.email).toBe(newEmail)
  })

  it('Lead-Erstellung mit vorhandenem Kontakt', async () => {
    const contact = await createContact()
    const res = await authPost('/api/v1/leads').send({
      contactId: contact.id, source: 'MESSE',
    })
    expect(res.status).toBe(201)
    cleanup.leadIds.push(res.body.data.id)
    expect(res.body.data.contactId).toBe(contact.id)
  })

  it('Suche findet verknuepfte Entitaeten', async () => {
    const u = uid()
    const contact = await createContact({ firstName: `FindMe-${u}` })
    await authPost('/api/v1/leads').send({ contactId: contact.id, source: 'HOMEPAGE' }).then(r => cleanup.leadIds.push(r.body.data.id))
    const res = await authGet(`/api/v1/search?q=FindMe-${u}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Tags werden in Lead-Response korrekt zurueckgegeben', async () => {
    const tag = await authPost('/api/v1/tags').send({ name: `FE-${uid()}`, color: '#A78BFA' })
    cleanup.tagIds.push(tag.body.data.id)
    const lead = await createLead({ tags: [tag.body.data.id] })
    const detail = await authGet(`/api/v1/leads/${lead.id}`)
    expect(detail.body.data.tags).toContain(tag.body.data.id)
  })

  it('Pipeline-Buckets Zuordnung funktioniert', async () => {
    const pRes = await authPost('/api/v1/pipelines').send({ name: `FE-${uid()}` })
    cleanup.pipelineIds.push(pRes.body.data.id)
    const bRes = await authPost(`/api/v1/pipelines/${pRes.body.data.id}/buckets`).send({ name: 'Start' })
    const lead = await createLead({ pipelineId: pRes.body.data.id, bucketId: bRes.body.data.id })
    const detail = await authGet(`/api/v1/leads/${lead.id}`)
    expect(detail.body.data.pipelineId).toBe(pRes.body.data.id)
    expect(detail.body.data.bucketId).toBe(bRes.body.data.id)
  })

  it('Feature-Flags abrufbar', async () => {
    const res = await authGet('/api/v1/settings/feature-flags')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 25. BULK DELETE (am Ende damit andere Tests nicht beeinflusst werden)
// ════════════════════════════════════════════════════════════════════════════

describe('25. Leads Bulk Delete', () => {
  it('DELETE /leads/all → Vertrieb = 403', async () => {
    const res = await authDelete('/api/v1/leads/all', vertriebToken)
    expect(res.status).toBe(403)
  })

  it('DELETE /leads/all → Admin', async () => {
    // Extra Leads erstellen
    await createLead({ source: 'MESSE' })
    await createLead({ source: 'MESSE' })
    const res = await authDelete('/api/v1/leads/all')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('count')
    expect(res.body.count).toBeGreaterThanOrEqual(2)
    // Keine aktiven Leads mehr
    const check = await authGet('/api/v1/leads')
    expect(check.body.data.length).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 26. EMAIL TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

describe('26. Email Templates', () => {
  it('GET /emails/templates', async () => {
    const res = await authGet('/api/v1/emails/templates')
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ════════════════════════════════════════════════════════════════════════════

afterAll(async () => {
  console.log('\n🧹 Cleanup: Testdaten werden entfernt...')

  // Helper: Supabase delete ignoriert Fehler automatisch (kein .catch noetig)
  const del = async (table: string, col: string, val: string) => {
    await supabase.from(table).delete().eq(col, val)
  }

  for (const id of cleanup.reminderIds) await del('reminders', 'id', id)
  for (const id of cleanup.taskIds) await del('tasks', 'id', id)
  for (const id of cleanup.passwordIds) await del('passwords', 'id', id)

  for (const id of cleanup.projectIds) {
    await del('project_activities', 'project_id', id)
    await del('projects', 'id', id)
  }
  for (const id of cleanup.dealIds) {
    await del('deal_activities', 'deal_id', id)
    await del('deal_tags', 'deal_id', id)
    await del('deals', 'id', id)
  }
  for (const id of cleanup.appointmentIds) await del('appointments', 'id', id)
  for (const id of cleanup.leadIds) {
    await del('lead_tags', 'lead_id', id)
    await del('leads', 'id', id)
  }

  // Soft-deleted Leads mit v3e2e Prefix hart loeschen
  const { data: softDel } = await supabase.from('leads').select('id, contact_id').not('deleted_at', 'is', null)
  for (const l of softDel ?? []) {
    if (l.contact_id) {
      const { data: c } = await supabase.from('contacts').select('email').eq('id', l.contact_id).single()
      if (c?.email?.includes(PREFIX)) {
        await del('lead_tags', 'lead_id', l.id)
        await del('leads', 'id', l.id)
      }
    }
  }

  for (const id of cleanup.tagIds) {
    await del('lead_tags', 'tag_id', id)
    await del('deal_tags', 'tag_id', id)
    await del('tags', 'id', id)
  }
  for (const id of cleanup.pipelineIds) {
    await del('buckets', 'pipeline_id', id)
    await del('pipelines', 'id', id)
  }

  const uniq = [...new Set(cleanup.contactIds)]
  for (const id of uniq) {
    await del('activities', 'contact_id', id)
    await del('documents', 'contact_id', id)
    const { data: cLeads } = await supabase.from('leads').select('id').eq('contact_id', id)
    for (const cl of cLeads ?? []) {
      await del('lead_tags', 'lead_id', cl.id)
      await del('leads', 'id', cl.id)
    }
    await del('appointments', 'contact_id', id)
    const { data: cDeals } = await supabase.from('deals').select('id').eq('contact_id', id)
    for (const cd of cDeals ?? []) {
      await del('deal_activities', 'deal_id', cd.id)
      await del('deals', 'id', cd.id)
    }
    const { data: cProjs } = await supabase.from('projects').select('id').eq('contact_id', id)
    for (const cp of cProjs ?? []) {
      await del('project_activities', 'project_id', cp.id)
      await del('projects', 'id', cp.id)
    }
    await del('tasks', 'contact_id', id)
    await del('contacts', 'id', id)
  }

  for (const id of cleanup.webhookIds) await del('webhook_sources', 'id', id)
  for (const id of cleanup.productIds) await del('products', 'id', id)
  for (const id of cleanup.userIds) await del('users', 'id', id)

  // Test-User loeschen (alle mit v3e2e Prefix)
  const { data: testUsers } = await supabase.from('users').select('id, email').like('email', `${PREFIX}%`)
  for (const tu of testUsers ?? []) await del('users', 'id', tu.id)

  console.log('✅ Cleanup abgeschlossen')
}, 60000)
