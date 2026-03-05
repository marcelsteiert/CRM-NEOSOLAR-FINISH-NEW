import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/documents
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/documents', () => {
  it('gibt eine Liste von Dokumenten zurück', async () => {
    const res = await request(app).get('/api/v1/documents')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('hat korrekte Dokument-Struktur', async () => {
    const res = await request(app).get('/api/v1/documents')
    if (res.body.data.length > 0) {
      const doc = res.body.data[0]
      expect(doc).toHaveProperty('id')
      expect(doc).toHaveProperty('fileName')
      expect(doc).toHaveProperty('fileSize')
      expect(doc).toHaveProperty('mimeType')
      expect(doc).toHaveProperty('entityType')
      expect(doc).toHaveProperty('entityId')
      expect(doc).toHaveProperty('uploadedBy')
      expect(doc).toHaveProperty('createdAt')
    }
  })

  it('filtert nach entityType', async () => {
    const res = await request(app).get('/api/v1/documents?entityType=LEAD')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: { entityType: string }) => {
      expect(d.entityType).toBe('LEAD')
    })
  })

  it('filtert nach entityId', async () => {
    const res = await request(app).get('/api/v1/documents?entityType=LEAD&entityId=l001')
    expect(res.status).toBe(200)
    res.body.data.forEach((d: { entityId: string }) => {
      expect(d.entityId).toBe('l001')
    })
  })

  it('sortiert nach neueste zuerst', async () => {
    const res = await request(app).get('/api/v1/documents')
    const dates = res.body.data.map((d: { createdAt: string }) => new Date(d.createdAt).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
    }
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/documents
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/documents', () => {
  let createdId: string

  it('erstellt ein neues Dokument', async () => {
    const res = await request(app).post('/api/v1/documents').send({
      fileName: 'test-upload.pdf',
      fileSize: 500_000,
      mimeType: 'application/pdf',
      entityType: 'ANGEBOT',
      entityId: 'deal-001',
      notes: 'Test-Upload',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.fileName).toBe('test-upload.pdf')
    expect(res.body.data.entityType).toBe('ANGEBOT')
    expect(res.body.data.notes).toBe('Test-Upload')
    createdId = res.body.data.id
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app).post('/api/v1/documents').send({})
    expect(res.status).toBe(422)
  })

  it('validiert fileName nicht leer', async () => {
    const res = await request(app).post('/api/v1/documents').send({
      fileName: '',
      fileSize: 100,
      mimeType: 'text/plain',
      entityType: 'LEAD',
      entityId: 'l001',
    })
    expect(res.status).toBe(422)
  })

  it('validiert entityType Enum', async () => {
    const res = await request(app).post('/api/v1/documents').send({
      fileName: 'test.pdf',
      fileSize: 100,
      mimeType: 'text/plain',
      entityType: 'INVALID',
      entityId: 'l001',
    })
    expect(res.status).toBe(422)
  })

  // ─── DELETE ───
  it('löscht ein Dokument', async () => {
    const res = await request(app).delete(`/api/v1/documents/${createdId}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toContain('gelöscht')
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/documents/:id
// ─────────────────────────────────────────────────────────────

describe('DELETE /api/v1/documents/:id', () => {
  it('gibt 404 für nicht existierendes Dokument', async () => {
    const res = await request(app).delete('/api/v1/documents/nope')
    expect(res.status).toBe(404)
  })
})
