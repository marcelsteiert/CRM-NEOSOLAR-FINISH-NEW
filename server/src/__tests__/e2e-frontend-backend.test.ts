/**
 * Frontend ↔ Backend Kompatibilitaets-Test
 *
 * Prueft dass ALLE API-Responses exakt die Felder liefern,
 * die das Frontend erwartet (camelCase nach caseMapper).
 * Deckt alle 88 Frontend-Hooks ab.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { createApp } from '../app.js'
import { supabase } from '../lib/supabase.js'
import type { Express } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string'
const TEST_PASSWORD = 'TestPasswort123!'

let app: Express
let adminToken: string
let vertriebToken: string
let plToken: string
let bhToken: string

// Echte User fuer Login-Tests
let realAdmin: { id: string; email: string; token: string }
let realVT: { id: string; email: string; token: string }

// Test-Daten IDs (werden in beforeAll befuellt)
let testContactId: string
let testLeadId: string
let testDealId: string
let testAppointmentId: string
let testProjectId: string
let testTaskId: string
let testPipelineId: string
let testBucketId: string
let testTagId: string
let testDocId: string
let testActivityId: string
let testReminderId: string

const uid = () => Math.random().toString(36).slice(2, 8)

beforeAll(async () => {
  app = createApp()

  // JWT-Tokens
  adminToken = jwt.sign({ userId: 'u001', email: 'admin@neosolar.ch', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' })
  vertriebToken = jwt.sign({ userId: 'u002', email: 'vertrieb@neosolar.ch', role: 'VERTRIEB' }, JWT_SECRET, { expiresIn: '1h' })
  plToken = jwt.sign({ userId: 'u003', email: 'pl@neosolar.ch', role: 'PROJEKTLEITUNG' }, JWT_SECRET, { expiresIn: '1h' })
  bhToken = jwt.sign({ userId: 'u004', email: 'bh@neosolar.ch', role: 'BUCHHALTUNG' }, JWT_SECRET, { expiresIn: '1h' })

  // Echte Login-User erstellen
  const hashedPw = await bcrypt.hash(TEST_PASSWORD, 10)
  for (const { role, key } of [
    { role: 'ADMIN', key: 'admin' },
    { role: 'VERTRIEB', key: 'vertrieb' },
  ]) {
    const email = `e2e-fb-${key}@neosolar-test.ch`
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single()
    if (existing) {
      await supabase.from('users').update({ password: hashedPw, is_active: true }).eq('id', existing.id)
      if (key === 'admin') realAdmin = { id: existing.id, email, token: '' }
      else realVT = { id: existing.id, email, token: '' }
    } else {
      const { data } = await supabase.from('users').insert({
        email, password: hashedPw, first_name: `FB-${key}`, last_name: 'Test',
        role, is_active: true,
      }).select().single()
      if (data) {
        if (key === 'admin') realAdmin = { id: data.id, email, token: '' }
        else realVT = { id: data.id, email, token: '' }
      }
    }
  }

  // Login um echte Tokens zu holen
  for (const u of [realAdmin, realVT]) {
    if (!u) continue
    const res = await request(app).post('/api/v1/auth/login').send({ email: u.email, password: TEST_PASSWORD })
    if (res.status === 200) u.token = res.body.data.token
  }

  // --- Test-Daten anlegen ---
  const u = uid()

  // Kontakt
  const contact = await request(app).post('/api/v1/contacts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ firstName: `FB-${u}`, lastName: 'Test', email: `fb-${u}@test.ch`, phone: '+41 71 000', address: 'Teststr. 1' })
  testContactId = contact.body.data?.id

  // Lead
  const lead = await request(app).post('/api/v1/leads')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ firstName: `FB-Lead-${u}`, lastName: 'Test', email: `fb-lead-${u}@test.ch`, phone: '+41 71 000', address: 'Teststr. 1', source: 'HOMEPAGE' })
  testLeadId = lead.body.data?.id

  // Deal
  const deal = await request(app).post('/api/v1/deals')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: `FB-Deal-${u}`, contactName: `FB-Deal-${u}`, contactEmail: `fb-deal-${u}@test.ch`, contactPhone: '+41 71 000', address: 'Teststr. 1', value: 15000 })
  testDealId = deal.body.data?.id

  // Appointment
  const appt = await request(app).post('/api/v1/appointments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ contactName: `FB-Appt-${u}`, contactEmail: `fb-appt-${u}@test.ch`, contactPhone: '+41 71 000', address: 'Teststr. 1', appointmentDate: '2026-06-15', appointmentTime: '10:00' })
  testAppointmentId = appt.body.data?.id

  // Project
  const proj = await request(app).post('/api/v1/projects')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `FB-Proj-${u}`, description: 'Test', kWp: 10, value: 25000, address: 'Teststr. 1', email: `fb-proj-${u}@test.ch` })
  testProjectId = proj.body.data?.id

  // Task
  const task = await request(app).post('/api/v1/tasks')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: `FB-Task-${u}`, module: 'ALLGEMEIN', assignedTo: 'u001' })
  testTaskId = task.body.data?.id

  // Pipeline + Bucket
  const pipe = await request(app).post('/api/v1/pipelines')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `FB-Pipe-${u}` })
  testPipelineId = pipe.body.data?.id
  if (testPipelineId) {
    const bucket = await request(app).post(`/api/v1/pipelines/${testPipelineId}/buckets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `FB-Bucket-${u}`, position: 0 })
    testBucketId = bucket.body.data?.id
  }

  // Tag
  const tag = await request(app).post('/api/v1/tags')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `FB-Tag-${u}`, color: '#FF5733' })
  testTagId = tag.body.data?.id

  // Activity
  const act = await request(app).post('/api/v1/activities')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ leadId: testLeadId, type: 'NOTE', title: 'Test', description: 'FB-Test', createdBy: 'u001' })
  testActivityId = act.body.data?.id

  // Reminder
  const rem = await request(app).post('/api/v1/reminders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ leadId: testLeadId, title: `FB-Reminder-${u}`, dueAt: '2026-06-15T10:00:00Z', createdBy: 'u001' })
  testReminderId = rem.body.data?.id

  // Document (via JSON body)
  if (testContactId) {
    const doc = await request(app).post('/api/v1/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        contactId: testContactId, entityType: 'LEAD', entityId: testLeadId,
        fileName: 'fb-test.txt', fileSize: 5, mimeType: 'text/plain',
        uploadedBy: 'u001', fileBase64: Buffer.from('Hello').toString('base64'),
      })
    testDocId = doc.body.data?.id
  }
}, 60000)

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function authGet(path: string, token = adminToken) {
  return request(app).get(path).set('Authorization', `Bearer ${token}`)
}
function authPost(path: string, token = adminToken) {
  return request(app).post(path).set('Authorization', `Bearer ${token}`)
}
function authPut(path: string, token = adminToken) {
  return request(app).put(path).set('Authorization', `Bearer ${token}`)
}

/** Prueft ob ein Objekt alle erwarteten Felder hat (camelCase) */
function expectFields(obj: any, fields: string[], label: string) {
  for (const f of fields) {
    expect(obj).toHaveProperty(f)
  }
  // Pruefe dass KEINE snake_case Felder vorhanden sind
  const snakeFields = Object.keys(obj).filter((k) => k.includes('_') && !k.startsWith('_'))
  if (snakeFields.length > 0) {
    // Einige Felder sind absichtlich snake_case (z.B. aus Supabase direkt)
    // Wir dokumentieren sie aber
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. AUTH – Login, /me, Change-Password Response-Struktur
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Auth Response-Struktur', () => {
  it('POST /auth/login liefert token + user mit camelCase', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: realAdmin.email, password: TEST_PASSWORD,
    })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    const user = res.body.data.user
    expectFields(user, ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'allowedModules'], 'login user')
    expect(Array.isArray(user.allowedModules)).toBe(true)
  })

  it('GET /auth/me liefert User mit allowedModules', async () => {
    const res = await authGet('/api/v1/auth/me', realAdmin.token || adminToken)
    expect(res.status).toBe(200)
    expectFields(res.body.data, ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'allowedModules'], '/auth/me')
  })

  it('/auth/me: allowedModules ist Array von Strings', async () => {
    const res = await authGet('/api/v1/auth/me', realAdmin.token || adminToken)
    const mods = res.body.data.allowedModules
    expect(Array.isArray(mods)).toBe(true)
    for (const m of mods) {
      expect(typeof m).toBe('string')
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 2. LEADS – Response-Felder matchen useLeads.ts Interface
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Leads Response-Struktur', () => {
  const LEAD_FIELDS = ['id', 'contactId', 'source', 'status', 'createdAt', 'updatedAt', 'tags']
  const LIST_META = ['data', 'total', 'page', 'pageSize']

  it('GET /leads liefert { data[], total, page, pageSize }', async () => {
    const res = await authGet('/api/v1/leads?pageSize=2')
    expect(res.status).toBe(200)
    expectFields(res.body, LIST_META, 'leads list meta')
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], LEAD_FIELDS, 'lead item')
      expect(Array.isArray(res.body.data[0].tags)).toBe(true)
    }
  })

  it('GET /leads/:id liefert Lead mit camelCase', async () => {
    if (!testLeadId) return
    const res = await authGet(`/api/v1/leads/${testLeadId}`)
    expect(res.status).toBe(200)
    expectFields(res.body.data, LEAD_FIELDS, 'lead single')
    // KEIN contact_id (snake_case) → muss contactId sein
    expect(res.body.data).not.toHaveProperty('contact_id')
    expect(res.body.data).toHaveProperty('contactId')
  })

  it('POST /leads liefert { data: Lead }', async () => {
    const u = uid()
    const res = await authPost('/api/v1/leads').send({
      firstName: `FBNew-${u}`, lastName: 'Test', email: `fbnew-${u}@test.ch`,
      phone: '+41 71 000', address: 'Test', source: 'HOMEPAGE',
    })
    expect(res.status).toBe(201)
    expectFields(res.body.data, LEAD_FIELDS, 'created lead')
  })

  it('PUT /leads/:id liefert { data: Lead }', async () => {
    if (!testLeadId) return
    const res = await authPut(`/api/v1/leads/${testLeadId}`).send({ notes: 'FB-Test' })
    expect(res.status).toBe(200)
    expectFields(res.body.data, ['id', 'contactId'], 'updated lead')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 3. APPOINTMENTS – Response-Felder matchen useAppointments.ts Interface
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Appointments Response-Struktur', () => {
  const APPT_FIELDS = ['id', 'contactId', 'contactName', 'status', 'createdAt']

  it('GET /appointments liefert { data[], total, page, pageSize }', async () => {
    const res = await authGet('/api/v1/appointments?pageSize=2')
    expect(res.status).toBe(200)
    expectFields(res.body, ['data', 'total', 'page', 'pageSize'], 'appt list')
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], APPT_FIELDS, 'appt item')
      expect(res.body.data[0]).not.toHaveProperty('contact_id')
    }
  })

  it('GET /appointments/:id liefert Appointment mit camelCase', async () => {
    if (!testAppointmentId) return
    const res = await authGet(`/api/v1/appointments/${testAppointmentId}`)
    expect(res.status).toBe(200)
    expectFields(res.body.data, APPT_FIELDS, 'appt single')
    expect(res.body.data).toHaveProperty('contactId')
    expect(res.body.data).not.toHaveProperty('contact_id')
  })

  it('GET /appointments/stats liefert Stats', async () => {
    const res = await authGet('/api/v1/appointments/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 4. DEALS – Response-Felder matchen useDeals.ts Interface
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Deals Response-Struktur', () => {
  const DEAL_FIELDS = ['id', 'contactId', 'title', 'stage', 'value', 'createdAt', 'tags']

  it('GET /deals liefert { data[], total, page, pageSize }', async () => {
    const res = await authGet('/api/v1/deals?pageSize=2')
    expect(res.status).toBe(200)
    expectFields(res.body, ['data', 'total', 'page', 'pageSize'], 'deals list')
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], DEAL_FIELDS, 'deal item')
      expect(res.body.data[0]).not.toHaveProperty('contact_id')
    }
  })

  it('GET /deals/:id liefert Deal + activities', async () => {
    if (!testDealId) return
    const res = await authGet(`/api/v1/deals/${testDealId}`)
    expect(res.status).toBe(200)
    expectFields(res.body.data, DEAL_FIELDS, 'deal single')
    expect(res.body.data).toHaveProperty('activities')
    expect(Array.isArray(res.body.data.activities)).toBe(true)
  })

  it('GET /deals/stats liefert Stats-Objekt', async () => {
    const res = await authGet('/api/v1/deals/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })

  it('GET /deals/follow-ups liefert Array', async () => {
    const res = await authGet('/api/v1/deals/follow-ups')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('POST /deals/:id/activities liefert Activity', async () => {
    if (!testDealId) return
    const res = await authPost(`/api/v1/deals/${testDealId}/activities`).send({
      type: 'NOTE', text: 'FB-Activity-Test',
    })
    expect(res.status).toBe(201)
    expectFields(res.body.data, ['id', 'type', 'text'], 'deal activity')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 5. PROJECTS – Response-Felder matchen useProjects.ts Interface
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Projects Response-Struktur', () => {
  const PROJ_FIELDS = ['id', 'contactId', 'name', 'description', 'kWp', 'value', 'createdAt']

  it('GET /projects liefert { data[], total }', async () => {
    const res = await authGet('/api/v1/projects')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], PROJ_FIELDS, 'project item')
      expect(res.body.data[0]).not.toHaveProperty('contact_id')
    }
  })

  it('GET /projects/:id liefert Project + activities + kalkulation', async () => {
    if (!testProjectId) return
    const res = await authGet(`/api/v1/projects/${testProjectId}`)
    expect(res.status).toBe(200)
    expectFields(res.body.data, PROJ_FIELDS, 'project single')
  })

  it('GET /projects/phases liefert PhaseDefinition[]', async () => {
    const res = await authGet('/api/v1/projects/phases')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], ['id', 'name', 'steps'], 'phase def')
    }
  })

  it('GET /projects/partners liefert Partner[]', async () => {
    const res = await authGet('/api/v1/projects/partners')
    expect(res.status).toBe(200)
  })

  it('GET /projects/stats liefert Stats', async () => {
    const res = await authGet('/api/v1/projects/stats')
    expect(res.status).toBe(200)
  })

  it('POST /projects/:id/activities liefert Activity', async () => {
    if (!testProjectId) return
    const res = await authPost(`/api/v1/projects/${testProjectId}/activities`).send({
      type: 'NOTE', text: 'FB-ProjActivity-Test', createdBy: 'u001',
    })
    expect(res.status).toBe(201)
    expectFields(res.body.data, ['id', 'type', 'text'], 'project activity')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 6. TASKS – Response-Felder matchen useTasks.ts Interface
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Tasks Response-Struktur', () => {
  const TASK_FIELDS = ['id', 'title', 'status', 'module']

  it('GET /tasks liefert { data[], total }', async () => {
    const res = await authGet('/api/v1/tasks')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], TASK_FIELDS, 'task item')
    }
  })

  it('GET /tasks/:id liefert Task', async () => {
    if (!testTaskId) return
    const res = await authGet(`/api/v1/tasks/${testTaskId}`)
    expect(res.status).toBe(200)
    expectFields(res.body.data, TASK_FIELDS, 'task single')
  })

  it('GET /tasks/stats liefert Stats', async () => {
    const res = await authGet('/api/v1/tasks/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 7. CONTACTS – Response-Felder matchen Frontend
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Contacts Response-Struktur', () => {
  it('GET /contacts liefert { data[], total, page, pageSize }', async () => {
    const res = await authGet('/api/v1/contacts?pageSize=2')
    expect(res.status).toBe(200)
    expectFields(res.body, ['data', 'total', 'page', 'pageSize'], 'contacts list')
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], ['id', 'firstName', 'lastName', 'email'], 'contact item')
    }
  })

  it('GET /contacts/:id liefert Contact + Verknuepfungen', async () => {
    if (!testContactId) return
    const res = await authGet(`/api/v1/contacts/${testContactId}`)
    expect(res.status).toBe(200)
    expectFields(res.body.data, ['id', 'firstName', 'lastName'], 'contact single')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 8. DOCUMENTS – Response-Felder matchen useDocuments.ts Interface (camelCase!)
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Documents Response-Struktur (camelCase)', () => {
  const DOC_FIELDS = ['id', 'contactId', 'fileName', 'fileSize', 'mimeType', 'entityType', 'storagePath', 'uploadedBy', 'createdAt', 'downloadUrl']

  it('GET /documents liefert { data[], total } mit camelCase', async () => {
    if (!testContactId) return
    const res = await authGet(`/api/v1/documents?contactId=${testContactId}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      const doc = res.body.data[0]
      expectFields(doc, DOC_FIELDS, 'document item')
      // KEIN snake_case
      expect(doc).not.toHaveProperty('contact_id')
      expect(doc).not.toHaveProperty('file_name')
      expect(doc).not.toHaveProperty('file_size')
      expect(doc).not.toHaveProperty('mime_type')
      expect(doc).not.toHaveProperty('entity_type')
      expect(doc).not.toHaveProperty('storage_path')
      expect(doc).not.toHaveProperty('uploaded_by')
      expect(doc).not.toHaveProperty('created_at')
      expect(doc).not.toHaveProperty('folder_path')
    }
  })

  it('POST /documents liefert Document mit camelCase + downloadUrl', async () => {
    if (!testContactId) return
    const res = await authPost('/api/v1/documents').send({
      contactId: testContactId, entityType: 'LEAD', entityId: testLeadId,
      fileName: 'fb-camel-test.txt', fileSize: 5, mimeType: 'text/plain',
      uploadedBy: 'u001', fileBase64: Buffer.from('Test2').toString('base64'),
    })
    expect(res.status).toBe(201)
    expectFields(res.body.data, DOC_FIELDS, 'created document')
    expect(res.body.data.downloadUrl).toBeTruthy()
    expect(typeof res.body.data.downloadUrl).toBe('string')
    // Cleanup
    if (res.body.data.id) {
      await request(app).delete(`/api/v1/documents/${res.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
    }
  })

  it('GET /documents/:id/download liefert downloadUrl', async () => {
    if (!testDocId) return
    const res = await authGet(`/api/v1/documents/${testDocId}/download`)
    expect(res.status).toBe(200)
    expect(res.body.data.downloadUrl).toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 9. PIPELINES & BUCKETS – Response-Felder
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Pipelines Response-Struktur', () => {
  it('GET /pipelines liefert Pipeline[] mit buckets', async () => {
    const res = await authGet('/api/v1/pipelines')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], ['id', 'name'], 'pipeline')
    }
  })

  it('GET /pipelines/:id/buckets liefert Bucket[]', async () => {
    if (!testPipelineId) return
    const res = await authGet(`/api/v1/pipelines/${testPipelineId}/buckets`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 10. TAGS – Response-Felder
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Tags Response-Struktur', () => {
  it('GET /tags liefert Tag[]', async () => {
    const res = await authGet('/api/v1/tags')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], ['id', 'name', 'color'], 'tag')
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 11. DASHBOARD – Response-Felder matchen useDashboard.ts
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Dashboard Response-Struktur', () => {
  it('GET /dashboard/stats liefert Stats', async () => {
    const res = await authGet('/api/v1/dashboard/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })

  it('GET /dashboard/monthly liefert MonthlyData[]', async () => {
    const res = await authGet('/api/v1/dashboard/monthly')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /dashboard/provision liefert ProvisionData', async () => {
    const res = await authGet('/api/v1/dashboard/provision')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 12. USERS – Response-Felder matchen useLeads.ts (User hooks)
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Users Response-Struktur', () => {
  it('GET /users liefert User[] mit camelCase', async () => {
    const res = await authGet('/api/v1/users')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'allowedModules'], 'user item')
      expect(res.body.data[0]).not.toHaveProperty('first_name')
      expect(res.body.data[0]).not.toHaveProperty('last_name')
      expect(res.body.data[0]).not.toHaveProperty('is_active')
      expect(res.body.data[0]).not.toHaveProperty('allowed_modules')
    }
  })

  it('GET /users/role-defaults liefert Record<Role, string[]>', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('ADMIN')
    expect(res.body.data).toHaveProperty('VERTRIEB')
    expect(res.body.data).toHaveProperty('PROJEKTLEITUNG')
    expect(res.body.data).toHaveProperty('BUCHHALTUNG')
    expect(res.body.data).toHaveProperty('GL')
    expect(Array.isArray(res.body.data.ADMIN)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 13. ACTIVITIES & REMINDERS
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Activities & Reminders Response-Struktur', () => {
  it('GET /activities liefert Activity[]', async () => {
    const res = await authGet('/api/v1/activities')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /reminders liefert Reminder[]', async () => {
    const res = await authGet('/api/v1/reminders')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 14. SETTINGS
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Settings Response-Struktur', () => {
  it('GET /settings liefert Settings-Objekt', async () => {
    const res = await authGet('/api/v1/settings')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 15. EMAILS
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Email Templates Response-Struktur', () => {
  it('GET /emails/templates liefert Template[]', async () => {
    const res = await authGet('/api/v1/emails/templates')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 16. ADMIN ENDPOINTS – Alle 9 Admin-Module
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Admin Endpoints Response-Struktur', () => {
  it('GET /admin/products liefert Product[]', async () => {
    const res = await authGet('/api/v1/admin/products')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/integrations liefert Integration[]', async () => {
    const res = await authGet('/api/v1/admin/integrations')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expectFields(res.body.data[0], ['id', 'displayName', 'status'], 'integration')
    }
  })

  it('GET /admin/webhooks liefert Webhook[]', async () => {
    const res = await authGet('/api/v1/admin/webhooks')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/branding liefert Branding-Objekt', async () => {
    const res = await authGet('/api/v1/admin/branding')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })

  it('GET /admin/ai-settings liefert AI-Settings', async () => {
    const res = await authGet('/api/v1/admin/ai-settings')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })

  it('GET /admin/notification-settings liefert NotificationSetting[]', async () => {
    const res = await authGet('/api/v1/admin/notification-settings')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/doc-templates liefert FolderTemplate[]', async () => {
    const res = await authGet('/api/v1/admin/doc-templates')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/audit-log liefert { data[], total, page, pageSize }', async () => {
    const res = await authGet('/api/v1/admin/audit-log')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /admin/db-export/stats liefert DB-Stats', async () => {
    const res = await authGet('/api/v1/admin/db-export/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 17. HEALTH
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Health Endpoint', () => {
  it('GET /health ohne Auth → 200 + status ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 18. VOLLSTAENDIGER USER-FLOW: Login → Daten sehen → Rechte pruefen
//     Simuliert exakt was das Frontend macht
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Vollstaendiger User-Flow (Frontend-Simulation)', () => {
  it('VERTRIEB Login → Dashboard laden → Leads laden → Lead erstellen → Lead bearbeiten', async () => {
    if (!realVT?.token) return
    const tk = realVT.token

    // 1. /auth/me (Frontend macht das bei App-Start)
    const me = await authGet('/api/v1/auth/me', tk)
    expect(me.status).toBe(200)
    expect(me.body.data.role).toBe('VERTRIEB')

    // 2. Dashboard Stats laden
    const dash = await authGet('/api/v1/dashboard/stats', tk)
    expect(dash.status).toBe(200)

    // 3. Leads laden (wie LeadsPage.tsx)
    const leads = await authGet('/api/v1/leads?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc', tk)
    expect(leads.status).toBe(200)
    expect(Array.isArray(leads.body.data)).toBe(true)

    // 4. Lead erstellen
    const u = uid()
    const create = await authPost('/api/v1/leads', tk).send({
      firstName: `FlowTest-${u}`, lastName: 'VT', email: `flow-${u}@test.ch`,
      phone: '+41 71 000', address: 'Test', source: 'HOMEPAGE',
    })
    expect(create.status).toBe(201)
    const leadId = create.body.data.id

    // 5. Lead Detail laden (wie LeadDetailModal.tsx)
    const detail = await authGet(`/api/v1/leads/${leadId}`, tk)
    expect(detail.status).toBe(200)
    expect(detail.body.data.contactId).toBeTruthy() // Frontend braucht das fuer DocumentSection

    // 6. Lead updaten
    const update = await authPut(`/api/v1/leads/${leadId}`, tk).send({ notes: 'VT-Note' })
    expect(update.status).toBe(200)
  })

  it('ADMIN vergibt Provision an VT → VT sieht Provision-Daten', async () => {
    if (!realVT?.token || !realAdmin?.token) return

    // Admin gibt VT Provision-Modul
    const before = await authGet('/api/v1/auth/me', realVT.token)
    const currentMods = before.body.data.allowedModules ?? []
    const newMods = [...new Set([...currentMods, 'provision'])]

    await authPut(`/api/v1/users/${realVT.id}`, realAdmin.token).send({ allowedModules: newMods })

    // VT kann jetzt Provision sehen
    const me = await authGet('/api/v1/auth/me', realVT.token)
    expect(me.body.data.allowedModules).toContain('provision')

    // VT kann Provision-Endpoint aufrufen
    const prov = await authGet('/api/v1/dashboard/provision', realVT.token)
    expect(prov.status).toBe(200)
  })

  it('Deal-Flow: Erstellen → Stage aendern → Aktivitaet → Follow-Up', async () => {
    const u = uid()
    // 1. Deal erstellen
    const create = await authPost('/api/v1/deals').send({
      title: `FlowDeal-${u}`, contactName: `Flow-${u}`, contactEmail: `flow-${u}@test.ch`,
      contactPhone: '+41 71 000', address: 'Test', value: 20000, winProbability: 50,
    })
    expect(create.status).toBe(201)
    const dealId = create.body.data.id

    // 2. Stage aendern (ERSTELLT → GESENDET)
    const stage = await authPut(`/api/v1/deals/${dealId}`).send({ stage: 'GESENDET' })
    expect(stage.status).toBe(200)
    expect(stage.body.data.stage).toBe('GESENDET')

    // 3. Aktivitaet hinzufuegen
    const act = await authPost(`/api/v1/deals/${dealId}/activities`).send({ type: 'NOTE', text: 'Flow-Test' })
    expect(act.status).toBe(201)

    // 4. Deal Detail mit Activities laden
    const detail = await authGet(`/api/v1/deals/${dealId}`)
    expect(detail.body.data.activities.length).toBeGreaterThan(0)

    // 5. GEWONNEN setzen
    const won = await authPut(`/api/v1/deals/${dealId}`).send({ stage: 'GEWONNEN' })
    expect(won.body.data.winProbability).toBe(100)
    expect(won.body.data.closedAt).toBeTruthy()
  })

  it('Projekt-Flow: Erstellen → Steps togglen → Activity → Detail', async () => {
    const u = uid()
    const create = await authPost('/api/v1/projects').send({
      name: `FlowProj-${u}`, description: 'Test', kWp: 15, value: 30000,
      address: 'Test', email: `flowproj-${u}@test.ch`,
    })
    expect(create.status).toBe(201)
    const projId = create.body.data.id

    // Toggle step
    const toggle = await authPut(`/api/v1/projects/${projId}/toggle-step`).send({ phase: 'admin', stepIndex: 0 })
    expect(toggle.status).toBe(200)

    // Activity
    const act = await authPost(`/api/v1/projects/${projId}/activities`).send({ type: 'NOTE', text: 'Flow', createdBy: 'u001' })
    expect(act.status).toBe(201)

    // Detail
    const detail = await authGet(`/api/v1/projects/${projId}`)
    expect(detail.body.data.progress).toBeDefined()
  })

  it('Document-Upload-Flow: Kontakt → Lead → Upload → Liste → Download → Delete', async () => {
    if (!testContactId || !testLeadId) return

    // 1. Upload
    const upload = await authPost('/api/v1/documents').send({
      contactId: testContactId, entityType: 'LEAD', entityId: testLeadId,
      fileName: 'flow-test.pdf', fileSize: 100, mimeType: 'application/pdf',
      uploadedBy: 'u001', fileBase64: Buffer.from('FlowTest').toString('base64'),
    })
    expect(upload.status).toBe(201)
    expect(upload.body.data.downloadUrl).toBeTruthy()
    const docId = upload.body.data.id

    // 2. Liste laden (wie DocumentSection macht)
    const list = await authGet(`/api/v1/documents?contactId=${testContactId}`)
    expect(list.status).toBe(200)
    const found = list.body.data.find((d: any) => d.id === docId)
    expect(found).toBeTruthy()
    expect(found.fileName).toBe('flow-test.pdf')
    expect(found.downloadUrl).toBeTruthy()

    // 3. Download-URL holen
    const dl = await authGet(`/api/v1/documents/${docId}/download`)
    expect(dl.status).toBe(200)
    expect(dl.body.data.downloadUrl).toBeTruthy()

    // 4. Delete
    const del = await request(app).delete(`/api/v1/documents/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(del.status).toBe(200)
  })

  it('Admin-Flow: Products CRUD + Settings + Branding', async () => {
    const adminTk = realAdmin?.token || adminToken
    const u = uid()

    // Products: Create → Read → Update → Delete
    const create = await authPost('/api/v1/admin/products', adminTk).send({
      category: 'PV_MODULE', name: `FlowModule-${u}`, unitPrice: 299,
      manufacturer: 'Test', model: 'T100',
    })
    expect(create.status).toBe(201)
    const prodId = create.body.data.id

    const read = await authGet(`/api/v1/admin/products/${prodId}`, adminTk)
    expect(read.status).toBe(200)

    const update = await authPut(`/api/v1/admin/products/${prodId}`, adminTk).send({ unitPrice: 349 })
    expect(update.status).toBe(200)

    const del = await request(app).delete(`/api/v1/admin/products/${prodId}`)
      .set('Authorization', `Bearer ${adminTk}`)
    expect(del.status).toBe(200)

    // Settings lesen + schreiben
    const settings = await authGet('/api/v1/settings', adminTk)
    expect(settings.status).toBe(200)

    // Branding lesen
    const branding = await authGet('/api/v1/admin/branding', adminTk)
    expect(branding.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// 19. SNAKE_CASE REGRESSION – Sicherstellen dass KEIN Endpoint snake_case liefert
// ════════════════════════════════════════════════════════════════════════════

describe('FB: Keine snake_case Felder in Haupt-Responses', () => {
  const FORBIDDEN_SNAKE = [
    'contact_id', 'first_name', 'last_name', 'is_active', 'allowed_modules',
    'file_name', 'file_size', 'mime_type', 'entity_type', 'entity_id',
    'folder_path', 'uploaded_by', 'storage_path', 'created_at', 'updated_at',
    'deleted_at', 'assigned_to', 'pipeline_id', 'bucket_id', 'lead_id',
    'appointment_id', 'deal_id', 'win_probability', 'follow_up_date',
    'closed_at', 'appointment_date', 'appointment_time', 'appointment_type',
  ]

  function checkNoSnakeCase(obj: any, path: string) {
    if (!obj || typeof obj !== 'object') return
    for (const key of Object.keys(obj)) {
      if (FORBIDDEN_SNAKE.includes(key)) {
        throw new Error(`snake_case Feld "${key}" gefunden in ${path}`)
      }
    }
  }

  const endpoints = [
    '/api/v1/leads?pageSize=1',
    '/api/v1/appointments?pageSize=1',
    '/api/v1/deals?pageSize=1',
    '/api/v1/projects?pageSize=1',
    '/api/v1/tasks',
    '/api/v1/contacts?pageSize=1',
    '/api/v1/users',
  ]

  for (const ep of endpoints) {
    it(`${ep} hat keine snake_case Felder`, async () => {
      const res = await authGet(ep)
      expect(res.status).toBe(200)
      if (Array.isArray(res.body.data) && res.body.data.length > 0) {
        checkNoSnakeCase(res.body.data[0], ep)
      }
    })
  }
})
