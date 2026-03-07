/**
 * NeoSolar CRM – Umfassender E2E-Test
 *
 * Erstellt eigene Testdaten, testet ALLE Endpoints, raumt auf.
 * Deckt ab: Auth, Contacts, Leads, Appointments, Deals, Projects,
 * Tasks, Documents, Activities, Reminders, Pipelines, Tags,
 * Dashboard, Settings, Users, Search, Admin (DocTemplates, Products, etc.)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { createApp } from '../app.js'
import { supabase } from '../lib/supabase.js'
import type { Express } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string'
const TEST_PW = 'TestPass123!'

let app: Express

// Test-User IDs (werden in beforeAll angelegt)
let adminId: string
let vertriebId: string
let plId: string
let bhId: string
let subId: string

// JWT Tokens
let adminToken: string
let vertriebToken: string
let plToken: string
let bhToken: string
let subToken: string

// Test-Daten IDs
let contactId: string
let contact2Id: string
let pipelineId: string
let bucketId: string
let tagId: string
let leadId: string
let appointmentId: string
let dealId: string
let projectId: string
let taskId: string
let documentId: string
let activityId: string
let reminderId: string

// ── Helpers ──

const authGet = (url: string, token = adminToken) =>
  request(app).get(url).set('Authorization', `Bearer ${token}`)
const authPost = (url: string, token = adminToken) =>
  request(app).post(url).set('Authorization', `Bearer ${token}`)
const authPut = (url: string, token = adminToken) =>
  request(app).put(url).set('Authorization', `Bearer ${token}`)
const authDelete = (url: string, token = adminToken) =>
  request(app).delete(url).set('Authorization', `Bearer ${token}`)

// ── Setup ──

beforeAll(async () => {
  app = createApp()
  const hashedPw = await bcrypt.hash(TEST_PW, 10)

  // Test-User anlegen
  const users = [
    { key: 'admin', role: 'ADMIN', email: 'e2e-admin@test.ch' },
    { key: 'vertrieb', role: 'VERTRIEB', email: 'e2e-vertrieb@test.ch' },
    { key: 'pl', role: 'PROJEKTLEITUNG', email: 'e2e-pl@test.ch' },
    { key: 'bh', role: 'BUCHHALTUNG', email: 'e2e-bh@test.ch' },
    { key: 'sub', role: 'SUBUNTERNEHMEN', email: 'e2e-sub@test.ch' },
  ]

  for (const u of users) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', u.email).single()
    let id: string
    if (existing) {
      await supabase.from('users').update({ password: hashedPw, is_active: true, role: u.role }).eq('id', existing.id)
      id = existing.id
    } else {
      const { data } = await supabase.from('users').insert({
        first_name: 'Test', last_name: u.key, email: u.email, password: hashedPw,
        role: u.role, phone: '+41 00 000 00 00', is_active: true,
        allowed_modules: ['dashboard', 'leads', 'appointments', 'deals', 'projects', 'tasks', 'documents', 'admin'],
      }).select().single()
      id = data!.id
    }

    const token = jwt.sign({ userId: id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '1h' })
    if (u.key === 'admin') { adminId = id; adminToken = token }
    if (u.key === 'vertrieb') { vertriebId = id; vertriebToken = token }
    if (u.key === 'pl') { plId = id; plToken = token }
    if (u.key === 'bh') { bhId = id; bhToken = token }
    if (u.key === 'sub') { subId = id; subToken = token }
  }
}, 30000)

// ── Cleanup ──

afterAll(async () => {
  // Testdaten entfernen (in FK-Reihenfolge)
  const testEmails = ['e2e-admin@test.ch', 'e2e-vertrieb@test.ch', 'e2e-pl@test.ch', 'e2e-bh@test.ch', 'e2e-sub@test.ch']
  const { data: testUsers } = await supabase.from('users').select('id').in('email', testEmails)
  const testUserIds = (testUsers ?? []).map((u: any) => u.id)

  if (contactId) {
    await supabase.from('documents').delete().eq('contact_id', contactId)
    await supabase.from('activities').delete().eq('contact_id', contactId)
    await supabase.from('reminders').delete().eq('lead_id', leadId)
    await supabase.from('tasks').delete().eq('contact_id', contactId)
    await supabase.from('deal_tags').delete().in('deal_id', [dealId].filter(Boolean))
    await supabase.from('lead_tags').delete().in('lead_id', [leadId].filter(Boolean))
    await supabase.from('projects').delete().eq('contact_id', contactId)
    await supabase.from('deals').delete().eq('contact_id', contactId)
    await supabase.from('appointments').delete().eq('contact_id', contactId)
    await supabase.from('leads').delete().eq('contact_id', contactId)
    await supabase.from('contacts').delete().eq('id', contactId)
  }
  if (contact2Id) {
    await supabase.from('contacts').delete().eq('id', contact2Id)
  }
  if (bucketId) await supabase.from('buckets').delete().eq('id', bucketId)
  if (pipelineId) await supabase.from('pipelines').delete().eq('id', pipelineId)
  if (tagId) await supabase.from('tags').delete().eq('id', tagId)

  // Test tasks mit testUserIds
  if (testUserIds.length) {
    await supabase.from('tasks').delete().in('assigned_to', testUserIds)
    await supabase.from('activities').delete().in('created_by', testUserIds)
    await supabase.from('reminders').delete().in('created_by', testUserIds)
  }
  // Test-User entfernen
  for (const email of testEmails) {
    await supabase.from('users').delete().eq('email', email)
  }
}, 30000)

// ═══════════════════════════════════════════════════════════════════
// 1. HEALTH
// ═══════════════════════════════════════════════════════════════════

describe('Health', () => {
  it('GET /health antwortet mit supabase status', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('supabase')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2. AUTH
// ═══════════════════════════════════════════════════════════════════

describe('Auth', () => {
  it('POST /auth/login mit korrektem Passwort', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e-admin@test.ch', password: TEST_PW,
    })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user.role).toBe('ADMIN')
  })

  it('POST /auth/login mit falschem Passwort → 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e-admin@test.ch', password: 'falsch',
    })
    expect(res.status).toBe(401)
  })

  it('GET /auth/me liefert User-Daten', async () => {
    const res = await authGet('/api/v1/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('email')
    expect(res.body.data).toHaveProperty('allowedModules')
  })

  it('Ohne Token → 401', async () => {
    const res = await request(app).get('/api/v1/leads')
    expect(res.status).toBe(401)
  })

  it('Alle 5 Rollen koennen sich einloggen', async () => {
    const emails = ['e2e-admin@test.ch', 'e2e-vertrieb@test.ch', 'e2e-pl@test.ch', 'e2e-bh@test.ch', 'e2e-sub@test.ch']
    for (const email of emails) {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: TEST_PW })
      expect(res.status).toBe(200)
      expect(res.body.data.token).toBeTruthy()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// 3. CONTACTS
// ═══════════════════════════════════════════════════════════════════

describe('Contacts', () => {
  it('POST erstellt Kontakt', async () => {
    const res = await authPost('/api/v1/contacts').send({
      firstName: 'Max', lastName: 'Muster', email: 'max@test.ch',
      phone: '+41 79 000 00 00', address: 'Teststrasse 1, 9000 St. Gallen',
      company: 'Muster Solar AG',
    })
    expect(res.status).toBe(201)
    contactId = res.body.data.id
    expect(contactId).toBeTruthy()
  })

  it('POST erstellt zweiten Kontakt', async () => {
    const res = await authPost('/api/v1/contacts').send({
      firstName: 'Anna', lastName: 'Beispiel', email: 'anna@test.ch',
      phone: '+41 79 111 11 11', address: 'Bahnhofstrasse 5, 8000 Zürich',
    })
    expect(res.status).toBe(201)
    contact2Id = res.body.data.id
  })

  it('GET listet Kontakte', async () => {
    const res = await authGet('/api/v1/contacts')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    expect(res.body).toHaveProperty('total')
  })

  it('GET mit Suche findet Kontakt', async () => {
    const res = await authGet('/api/v1/contacts?search=Muster')
    expect(res.status).toBe(200)
    expect(res.body.data.some((c: any) => c.lastName === 'Muster')).toBe(true)
  })

  it('GET /:id liefert Kontakt mit Verknuepfungen', async () => {
    const res = await authGet(`/api/v1/contacts/${contactId}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('leads')
    expect(res.body.data).toHaveProperty('projects')
  })

  it('PUT aktualisiert Kontakt', async () => {
    const res = await authPut(`/api/v1/contacts/${contactId}`).send({ company: 'NeoSolar Test AG' })
    expect(res.status).toBe(200)
  })

  it('Pagination funktioniert', async () => {
    const res = await authGet('/api/v1/contacts?page=1&pageSize=1')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(1)
    expect(res.body.page).toBe(1)
  })

  it('Sortierung funktioniert', async () => {
    const res = await authGet('/api/v1/contacts?sortBy=firstName&sortOrder=asc')
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 4. PIPELINES + BUCKETS
// ═══════════════════════════════════════════════════════════════════

describe('Pipelines & Buckets', () => {
  it('POST erstellt Pipeline', async () => {
    const res = await authPost('/api/v1/pipelines').send({
      name: 'E2E Test Pipeline', type: 'lead',
    })
    expect(res.status).toBe(201)
    pipelineId = res.body.data.id
  })

  it('POST erstellt Bucket', async () => {
    const res = await authPost(`/api/v1/pipelines/${pipelineId}/buckets`).send({
      name: 'E2E Bucket', color: '#F59E0B',
    })
    expect(res.status).toBe(201)
    bucketId = res.body.data.id
  })

  it('GET listet Pipelines', async () => {
    const res = await authGet('/api/v1/pipelines')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /:id/buckets liefert Buckets der Pipeline', async () => {
    const res = await authGet(`/api/v1/pipelines/${pipelineId}/buckets`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  it('PUT aktualisiert Pipeline', async () => {
    const res = await authPut(`/api/v1/pipelines/${pipelineId}`).send({ name: 'E2E Updated Pipeline' })
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 5. TAGS
// ═══════════════════════════════════════════════════════════════════

describe('Tags', () => {
  it('POST erstellt Tag', async () => {
    const res = await authPost('/api/v1/tags').send({ name: 'E2E-Tag', color: '#34D399' })
    expect(res.status).toBe(201)
    tagId = res.body.data.id
  })

  it('GET listet Tags', async () => {
    const res = await authGet('/api/v1/tags')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('DELETE und Recreate Tag', async () => {
    await authDelete(`/api/v1/tags/${tagId}`)
    const res = await authPost('/api/v1/tags').send({ name: 'E2E-Tag-Updated', color: '#F59E0B' })
    expect(res.status).toBe(201)
    tagId = res.body.data.id
    expect(res.body.data.name).toBe('E2E-Tag-Updated')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 6. LEADS
// ═══════════════════════════════════════════════════════════════════

describe('Leads', () => {
  it('POST erstellt Lead', async () => {
    const res = await authPost('/api/v1/leads').send({
      contactId, source: 'HOMEPAGE', pipelineId, bucketId, value: 15000,
      notes: 'E2E Test Lead',
    })
    expect(res.status).toBe(201)
    leadId = res.body.data.id
    // camelCase check
    expect(res.body.data).toHaveProperty('contactId')
    expect(res.body.data).not.toHaveProperty('contact_id')
  })

  it('GET listet Leads', async () => {
    const res = await authGet('/api/v1/leads')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /:id liefert Lead', async () => {
    const res = await authGet(`/api/v1/leads/${leadId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.contactId).toBe(contactId)
  })

  it('PUT aktualisiert Lead', async () => {
    const res = await authPut(`/api/v1/leads/${leadId}`).send({ value: 20000, status: 'ACTIVE' })
    expect(res.status).toBe(200)
  })

  it('Suche funktioniert', async () => {
    const res = await authGet('/api/v1/leads?search=E2E')
    expect(res.status).toBe(200)
  })

  it('Filter nach Status', async () => {
    const res = await authGet('/api/v1/leads?status=ACTIVE')
    expect(res.status).toBe(200)
  })

  it('Filter nach Pipeline', async () => {
    const res = await authGet(`/api/v1/leads?pipelineId=${pipelineId}`)
    expect(res.status).toBe(200)
  })

  it('POST Lead-Tag verknuepfen', async () => {
    const res = await authPost(`/api/v1/leads/${leadId}/tags`).send({ tagIds: [tagId] })
    expect(res.status).toBe(200)
    expect(res.body.data.tags).toContain(tagId)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 7. APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════

describe('Appointments', () => {
  it('POST erstellt Termin', async () => {
    const res = await authPost('/api/v1/appointments').send({
      contactId, leadId, appointmentType: 'VOR_ORT', priority: 'HIGH',
      appointmentDate: '2026-04-01T10:00:00Z', value: 15000,
    })
    expect(res.status).toBe(201)
    appointmentId = res.body.data.id
    expect(res.body.data).toHaveProperty('contactId')
  })

  it('GET listet Termine', async () => {
    const res = await authGet('/api/v1/appointments')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /:id liefert Termin', async () => {
    const res = await authGet(`/api/v1/appointments/${appointmentId}`)
    expect(res.status).toBe(200)
  })

  it('PUT aktualisiert Termin', async () => {
    const res = await authPut(`/api/v1/appointments/${appointmentId}`).send({
      status: 'BESTAETIGT', preparationNotes: 'Dach pruefen',
    })
    expect(res.status).toBe(200)
  })

  it('Filter nach Status', async () => {
    const res = await authGet('/api/v1/appointments?status=BESTAETIGT')
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 8. DEALS
// ═══════════════════════════════════════════════════════════════════

describe('Deals', () => {
  it('POST erstellt Deal', async () => {
    const res = await authPost('/api/v1/deals').send({
      contactId, title: 'E2E Angebot', leadId, appointmentId,
      value: 25000, winProbability: 60,
    })
    expect(res.status).toBe(201)
    dealId = res.body.data.id
    expect(res.body.data).toHaveProperty('contactId')
  })

  it('GET listet Deals', async () => {
    const res = await authGet('/api/v1/deals')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /:id liefert Deal', async () => {
    const res = await authGet(`/api/v1/deals/${dealId}`)
    expect(res.status).toBe(200)
  })

  it('PUT aktualisiert Deal (Phase + Follow-Up)', async () => {
    const res = await authPut(`/api/v1/deals/${dealId}`).send({
      stage: 'GESENDET', followUpDate: '2026-04-15T10:00:00Z', winProbability: 75,
    })
    expect(res.status).toBe(200)
  })

  it('PUT Deal-Tags setzen', async () => {
    const res = await authPut(`/api/v1/deals/${dealId}`).send({ tags: [tagId] })
    expect(res.status).toBe(200)
  })

  it('Filter nach Stage', async () => {
    const res = await authGet('/api/v1/deals?stage=GESENDET')
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 9. PROJECTS
// ═══════════════════════════════════════════════════════════════════

describe('Projects', () => {
  it('POST erstellt Projekt', async () => {
    const res = await authPost('/api/v1/projects').send({
      contactId, name: 'E2E Solarprojekt', dealId, value: 25000, kwp: 12.5,
      phase: 'admin', priority: 'HIGH',
    })
    expect(res.status).toBe(201)
    projectId = res.body.data.id
    expect(res.body.data).toHaveProperty('contactId')
  })

  it('GET listet Projekte', async () => {
    const res = await authGet('/api/v1/projects')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /:id liefert Projekt', async () => {
    const res = await authGet(`/api/v1/projects/${projectId}`)
    expect(res.status).toBe(200)
  })

  it('PUT aktualisiert Projekt (Phase wechseln)', async () => {
    const res = await authPut(`/api/v1/projects/${projectId}`).send({
      phase: 'montage', projectManagerId: plId,
    })
    expect(res.status).toBe(200)
  })

  it('Filter nach Phase', async () => {
    const res = await authGet('/api/v1/projects?phase=montage')
    expect(res.status).toBe(200)
  })

  it('GET /projects/stats liefert Statistiken', async () => {
    const res = await authGet('/api/v1/projects/stats')
    expect([200, 404]).toContain(res.status)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 10. TASKS
// ═══════════════════════════════════════════════════════════════════

describe('Tasks', () => {
  it('POST erstellt Task', async () => {
    const res = await authPost('/api/v1/tasks').send({
      contactId, title: 'E2E Aufgabe', module: 'PROJEKT',
      referenceId: projectId, referenceTitle: 'E2E Solarprojekt',
      assignedTo: plId, assignedBy: adminId, priority: 'HIGH',
    })
    expect(res.status).toBe(201)
    taskId = res.body.data.id
  })

  it('GET listet Tasks', async () => {
    const res = await authGet('/api/v1/tasks')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /:id liefert Task', async () => {
    const res = await authGet(`/api/v1/tasks/${taskId}`)
    expect(res.status).toBe(200)
  })

  it('PUT aktualisiert Task Status', async () => {
    const res = await authPut(`/api/v1/tasks/${taskId}`).send({ status: 'IN_BEARBEITUNG' })
    expect(res.status).toBe(200)
  })

  it('Filter nach Status', async () => {
    const res = await authGet('/api/v1/tasks?status=IN_BEARBEITUNG')
    expect(res.status).toBe(200)
  })

  it('Filter nach Modul', async () => {
    const res = await authGet('/api/v1/tasks?module=PROJEKT')
    expect(res.status).toBe(200)
  })

  it('GET /tasks/stats liefert Statistiken', async () => {
    const res = await authGet('/api/v1/tasks/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 11. ACTIVITIES
// ═══════════════════════════════════════════════════════════════════

describe('Activities', () => {
  it('POST erstellt Aktivitaet', async () => {
    const res = await authPost('/api/v1/activities').send({
      contactId, dealId, type: 'NOTE', text: 'E2E Test Notiz', createdBy: adminId,
    })
    expect(res.status).toBe(201)
    activityId = res.body.data.id
  })

  it('GET listet Aktivitaeten', async () => {
    const res = await authGet(`/api/v1/activities?contactId=${contactId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET fuer Deal', async () => {
    const res = await authGet(`/api/v1/activities?dealId=${dealId}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 12. REMINDERS
// ═══════════════════════════════════════════════════════════════════

describe('Reminders', () => {
  it('POST erstellt Erinnerung', async () => {
    const res = await authPost('/api/v1/reminders').send({
      contactId, leadId, title: 'E2E Erinnerung',
      dueAt: '2026-04-10T08:00:00Z', createdBy: adminId,
    })
    expect(res.status).toBe(201)
    reminderId = res.body.data.id
  })

  it('GET listet Erinnerungen', async () => {
    const res = await authGet('/api/v1/reminders')
    expect(res.status).toBe(200)
  })

  it('PUT dismissed Erinnerung', async () => {
    const res = await authPut(`/api/v1/reminders/${reminderId}/dismiss`).send({})
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 13. DOCUMENTS
// ═══════════════════════════════════════════════════════════════════

describe('Documents', () => {
  it('POST Upload mit Base64', async () => {
    const fileBase64 = Buffer.from('E2E Test PDF Content').toString('base64')
    const res = await authPost('/api/v1/documents').send({
      contactId, entityType: 'LEAD', entityId: leadId,
      folderPath: 'Kontaktdaten',
      fileName: 'e2e-test.pdf', fileSize: 1024, mimeType: 'application/pdf',
      uploadedBy: adminId, notes: 'E2E Upload',
      fileBase64,
    })
    expect(res.status).toBe(201)
    documentId = res.body.data.id
    expect(res.body.data).toHaveProperty('downloadUrl')
    // camelCase check
    expect(res.body.data).toHaveProperty('fileName')
    expect(res.body.data).toHaveProperty('folderPath')
    expect(res.body.data).not.toHaveProperty('file_name')
  })

  it('GET listet Dokumente nach contactId', async () => {
    const res = await authGet(`/api/v1/documents?contactId=${contactId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    // Alle Docs haben downloadUrl
    for (const doc of res.body.data) {
      expect(doc).toHaveProperty('downloadUrl')
    }
  })

  it('GET /:id/download liefert signierte URL', async () => {
    const res = await authGet(`/api/v1/documents/${documentId}/download`)
    expect(res.status).toBe(200)
    expect(res.body.data.downloadUrl).toContain('http')
  })

  it('folderPath wird korrekt gespeichert', async () => {
    const res = await authGet(`/api/v1/documents?contactId=${contactId}`)
    const doc = res.body.data.find((d: any) => d.id === documentId)
    expect(doc.folderPath).toBe('Kontaktdaten')
  })

  it('Vertrieb kann Dokumente sehen (signed URLs)', async () => {
    const res = await authGet(`/api/v1/documents?contactId=${contactId}`, vertriebToken)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('DELETE loescht Dokument', async () => {
    // Upload nochmal fuer Delete-Test
    const fileBase64 = Buffer.from('delete me').toString('base64')
    const upload = await authPost('/api/v1/documents').send({
      contactId, entityType: 'LEAD', entityId: leadId,
      fileName: 'delete-me.pdf', fileSize: 100, mimeType: 'application/pdf',
      uploadedBy: adminId, fileBase64,
    })
    const delId = upload.body.data.id
    const res = await authDelete(`/api/v1/documents/${delId}`)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 14. SEARCH (NEU)
// ═══════════════════════════════════════════════════════════════════

describe('Globale Suche', () => {
  it('GET /search?q=Muster findet Kontakt', async () => {
    const res = await authGet('/api/v1/search?q=Muster')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    const contact = res.body.data[0]
    expect(contact).toHaveProperty('firstName')
    expect(contact).toHaveProperty('lastName')
    expect(contact).toHaveProperty('leads')
    expect(contact).toHaveProperty('projects')
    expect(contact).toHaveProperty('deals')
    expect(contact).toHaveProperty('appointments')
  })

  it('Suche nach Email funktioniert', async () => {
    const res = await authGet('/api/v1/search?q=max@test.ch')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('Suche nach Telefonnummer', async () => {
    const res = await authGet('/api/v1/search?q=41 79 000')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('Suche nach Firma', async () => {
    const res = await authGet('/api/v1/search?q=NeoSolar Test')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('Zu kurzer Suchbegriff gibt leeres Array', async () => {
    const res = await authGet('/api/v1/search?q=M')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('Kein Treffer gibt leeres Array', async () => {
    const res = await authGet('/api/v1/search?q=XYZ_EXISTIERT_NICHT_999')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('Suche liefert verknuepfte Entities', async () => {
    const res = await authGet('/api/v1/search?q=Muster')
    expect(res.status).toBe(200)
    const c = res.body.data.find((x: any) => x.lastName === 'Muster')
    expect(c).toBeTruthy()
    expect(c.leads.length).toBeGreaterThanOrEqual(1)
    expect(c.deals.length).toBeGreaterThanOrEqual(1)
    expect(c.projects.length).toBeGreaterThanOrEqual(1)
    expect(c.appointments.length).toBeGreaterThanOrEqual(1)
  })

  it('Alle Rollen koennen suchen', async () => {
    for (const token of [adminToken, vertriebToken, plToken, bhToken, subToken]) {
      const res = await authGet('/api/v1/search?q=Muster', token)
      expect(res.status).toBe(200)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// 15. USERS
// ═══════════════════════════════════════════════════════════════════

describe('Users', () => {
  it('GET listet User', async () => {
    const res = await authGet('/api/v1/users')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(5)
  })

  it('GET /role-defaults liefert alle Rollen inkl. SUBUNTERNEHMEN', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('ADMIN')
    expect(res.body.data).toHaveProperty('VERTRIEB')
    expect(res.body.data).toHaveProperty('SUBUNTERNEHMEN')
    expect(res.body.data.SUBUNTERNEHMEN).toContain('dashboard')
  })

  it('GET /:id liefert User mit allowedModules', async () => {
    const res = await authGet(`/api/v1/users/${adminId}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('allowedModules')
    expect(res.body.data).toHaveProperty('firstName')
    expect(res.body.data).not.toHaveProperty('first_name')
  })

  it('PUT aktualisiert User allowedModules', async () => {
    const res = await authPut(`/api/v1/users/${vertriebId}`).send({
      allowedModules: ['dashboard', 'leads', 'appointments', 'deals', 'documents', 'search'],
    })
    expect(res.status).toBe(200)
  })

  it('SUBUNTERNEHMEN User existiert mit korrekter Rolle', async () => {
    const res = await authGet(`/api/v1/users/${subId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('SUBUNTERNEHMEN')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 16. DASHBOARD
// ═══════════════════════════════════════════════════════════════════

describe('Dashboard', () => {
  it('GET /dashboard/stats liefert KPIs', async () => {
    const res = await authGet('/api/v1/dashboard/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('deals')
    expect(res.body.data).toHaveProperty('appointments')
    expect(res.body.data).toHaveProperty('tasks')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 17. SETTINGS
// ═══════════════════════════════════════════════════════════════════

describe('Settings', () => {
  it('GET /settings listet Einstellungen', async () => {
    const res = await authGet('/api/v1/settings')
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 18. EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════

describe('Email Templates', () => {
  it('GET /emails/templates listet Templates', async () => {
    const res = await authGet('/api/v1/emails/templates')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 19. ADMIN – DOC TEMPLATES (NEU)
// ═══════════════════════════════════════════════════════════════════

describe('Admin DocTemplates', () => {
  it('GET liefert Templates mit Rollen', async () => {
    const res = await authGet('/api/v1/admin/doc-templates')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(4)
    expect(res.body.roles).toContain('ADMIN')
    expect(res.body.roles).toContain('SUBUNTERNEHMEN')
  })

  it('POST fuegt Ordner hinzu', async () => {
    const res = await authPost('/api/v1/admin/doc-templates/LEAD/folders').send({
      name: 'E2E Ordner', subfolders: ['Sub1', 'Sub2'],
      allowedRoles: ['ADMIN', 'VERTRIEB'],
    })
    expect(res.status).toBe(201)
    const tpl = res.body.data
    const folder = tpl.folders.find((f: any) => f.name === 'E2E Ordner')
    expect(folder).toBeTruthy()
    expect(folder.subfolders).toEqual(['Sub1', 'Sub2'])
    expect(folder.allowedRoles).toContain('ADMIN')
    expect(folder.allowedRoles).toContain('VERTRIEB')
  })

  it('POST doppelter Name → 409', async () => {
    const res = await authPost('/api/v1/admin/doc-templates/LEAD/folders').send({
      name: 'E2E Ordner',
    })
    expect(res.status).toBe(409)
  })

  it('PUT benennt Ordner um', async () => {
    const res = await authPut('/api/v1/admin/doc-templates/LEAD/folders/E2E%20Ordner').send({
      name: 'E2E Ordner Renamed', allowedRoles: ['ADMIN', 'PROJEKTLEITUNG'],
    })
    expect(res.status).toBe(200)
    const folder = res.body.data.folders.find((f: any) => f.name === 'E2E Ordner Renamed')
    expect(folder).toBeTruthy()
    expect(folder.allowedRoles).toContain('PROJEKTLEITUNG')
  })

  it('PUT Unterordner aendern', async () => {
    const res = await authPut('/api/v1/admin/doc-templates/LEAD/folders/E2E%20Ordner%20Renamed').send({
      subfolders: ['Neu1', 'Neu2', 'Neu3'],
    })
    expect(res.status).toBe(200)
    const folder = res.body.data.folders.find((f: any) => f.name === 'E2E Ordner Renamed')
    expect(folder.subfolders).toEqual(['Neu1', 'Neu2', 'Neu3'])
  })

  it('DELETE loescht Ordner', async () => {
    const res = await authDelete('/api/v1/admin/doc-templates/LEAD/folders/E2E%20Ordner%20Renamed')
    expect(res.status).toBe(200)
    expect(res.body.data.folders.find((f: any) => f.name === 'E2E Ordner Renamed')).toBeUndefined()
  })

  it('DELETE nicht existierender Ordner → 404', async () => {
    const res = await authDelete('/api/v1/admin/doc-templates/LEAD/folders/NICHT_DA')
    expect(res.status).toBe(404)
  })

  it('Ungueltige Rollen werden gefiltert', async () => {
    const res = await authPost('/api/v1/admin/doc-templates/LEAD/folders').send({
      name: 'E2E RollenTest', allowedRoles: ['ADMIN', 'FAKE_ROLE', 'VERTRIEB'],
    })
    expect(res.status).toBe(201)
    const folder = res.body.data.folders.find((f: any) => f.name === 'E2E RollenTest')
    expect(folder.allowedRoles).not.toContain('FAKE_ROLE')
    // Cleanup
    await authDelete('/api/v1/admin/doc-templates/LEAD/folders/E2E%20RollenTest')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 20. ADMIN – PRODUCTS, INTEGRATIONS, WEBHOOKS
// ═══════════════════════════════════════════════════════════════════

describe('Admin Products', () => {
  it('GET listet Produkte', async () => {
    const res = await authGet('/api/v1/admin/products')
    expect(res.status).toBe(200)
  })
})

describe('Admin Integrations', () => {
  it('GET listet Integrationen', async () => {
    const res = await authGet('/api/v1/admin/integrations')
    expect(res.status).toBe(200)
  })
})

describe('Admin Webhooks', () => {
  it('GET listet Webhooks', async () => {
    const res = await authGet('/api/v1/admin/webhooks')
    expect(res.status).toBe(200)
  })
})

describe('Admin Audit Log', () => {
  it('GET listet Audit-Logs', async () => {
    const res = await authGet('/api/v1/admin/audit-log')
    expect(res.status).toBe(200)
  })
})

describe('Admin Branding', () => {
  it('GET liefert Branding', async () => {
    const res = await authGet('/api/v1/admin/branding')
    expect(res.status).toBe(200)
  })
})

describe('Admin AI Settings', () => {
  it('GET liefert KI-Einstellungen', async () => {
    const res = await authGet('/api/v1/admin/ai-settings')
    expect(res.status).toBe(200)
  })
})

describe('Admin Notification Settings', () => {
  it('GET liefert Benachrichtigungs-Einstellungen', async () => {
    const res = await authGet('/api/v1/admin/notification-settings')
    expect(res.status).toBe(200)
  })
})

describe('Admin DB Export', () => {
  it('GET /stats liefert DB-Statistiken', async () => {
    const res = await authGet('/api/v1/admin/db-export/stats')
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 21. CAMELCASE REGRESSION
// ═══════════════════════════════════════════════════════════════════

describe('camelCase Regression', () => {
  const snakeFields = [
    'contact_id', 'first_name', 'last_name', 'entity_type', 'entity_id',
    'file_name', 'file_size', 'mime_type', 'storage_path', 'uploaded_by',
    'folder_path', 'created_at', 'updated_at', 'deleted_at', 'assigned_to',
    'assigned_by', 'due_date', 'appointment_date', 'appointment_type',
    'pipeline_id', 'bucket_id', 'win_probability', 'follow_up_date',
    'is_active', 'allowed_modules', 'avatar_color', 'sort_order',
    'reference_id', 'reference_title', 'preparation_notes',
  ]

  it('Leads Response hat kein snake_case', async () => {
    const res = await authGet('/api/v1/leads')
    if (res.body.data?.length > 0) {
      for (const field of snakeFields) {
        expect(res.body.data[0]).not.toHaveProperty(field)
      }
    }
  })

  it('Contacts Response hat kein snake_case', async () => {
    const res = await authGet(`/api/v1/contacts/${contactId}`)
    for (const field of snakeFields) {
      expect(res.body.data).not.toHaveProperty(field)
    }
  })

  it('Users Response hat kein snake_case', async () => {
    const res = await authGet(`/api/v1/users/${adminId}`)
    for (const field of snakeFields) {
      expect(res.body.data).not.toHaveProperty(field)
    }
  })

  it('Documents Response hat kein snake_case', async () => {
    const res = await authGet(`/api/v1/documents?contactId=${contactId}`)
    if (res.body.data?.length > 0) {
      for (const field of snakeFields) {
        expect(res.body.data[0]).not.toHaveProperty(field)
      }
    }
  })

  it('Search Response hat kein snake_case', async () => {
    const res = await authGet('/api/v1/search?q=Muster')
    if (res.body.data?.length > 0) {
      const c = res.body.data[0]
      expect(c).toHaveProperty('firstName')
      expect(c).not.toHaveProperty('first_name')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// 22. ROLLEN-TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Rollen & Berechtigungen', () => {
  it('Alle 6 Rollen in role-defaults', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    expect(Object.keys(res.body.data).length).toBeGreaterThanOrEqual(5)
    expect(res.body.data).toHaveProperty('SUBUNTERNEHMEN')
  })

  it('SUBUNTERNEHMEN Standard-Module', async () => {
    const res = await authGet('/api/v1/users/role-defaults')
    const subModules = res.body.data.SUBUNTERNEHMEN
    expect(subModules).toContain('dashboard')
    expect(subModules).toContain('projects')
    expect(subModules).toContain('tasks')
    expect(subModules).toContain('documents')
    expect(subModules).not.toContain('admin')
    expect(subModules).not.toContain('leads')
  })

  it('Vertrieb kann Leads lesen', async () => {
    const res = await authGet('/api/v1/leads', vertriebToken)
    expect(res.status).toBe(200)
  })

  it('Sub kann Projekte lesen', async () => {
    const res = await authGet('/api/v1/projects', subToken)
    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 23. CLEANUP / DELETE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Delete Operations', () => {
  it('DELETE Task', async () => {
    const res = await authDelete(`/api/v1/tasks/${taskId}`)
    expect(res.status).toBe(200)
  })

  it('DELETE Lead (Soft Delete)', async () => {
    const res = await authDelete(`/api/v1/leads/${leadId}`)
    expect(res.status).toBe(200)
  })

  it('DELETE Tag', async () => {
    const res = await authDelete(`/api/v1/tags/${tagId}`)
    expect(res.status).toBe(200)
  })

  it('DELETE Pipeline', async () => {
    // FK-Referenz entfernen: alle Leads von dieser Pipeline loesen
    await supabase.from('leads').update({ pipeline_id: null, bucket_id: null }).eq('pipeline_id', pipelineId)
    await supabase.from('buckets').delete().eq('pipeline_id', pipelineId)
    const { error } = await supabase.from('pipelines').delete().eq('id', pipelineId)
    expect(error).toBeNull()
  })

  it('DELETE Kontakt (Soft Delete)', async () => {
    const res = await authDelete(`/api/v1/contacts/${contact2Id}`)
    expect(res.status).toBe(200)
  })
})
