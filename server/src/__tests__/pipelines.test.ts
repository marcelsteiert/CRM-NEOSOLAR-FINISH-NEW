import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─── Pipelines CRUD ───

describe('GET /api/v1/pipelines', () => {
  it('gibt alle Pipelines mit Buckets zurück', async () => {
    const res = await request(app).get('/api/v1/pipelines')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('Buckets sind nach Position sortiert', async () => {
    const res = await request(app).get('/api/v1/pipelines')
    for (const pipeline of res.body.data) {
      for (let i = 1; i < pipeline.buckets.length; i++) {
        expect(pipeline.buckets[i].position).toBeGreaterThanOrEqual(pipeline.buckets[i - 1].position)
      }
    }
  })

  it('Pipeline enthält alle Pflichtfelder', async () => {
    const res = await request(app).get('/api/v1/pipelines')
    const pipeline = res.body.data[0]
    expect(pipeline).toHaveProperty('id')
    expect(pipeline).toHaveProperty('name')
    expect(pipeline).toHaveProperty('buckets')
    expect(pipeline).toHaveProperty('createdAt')
    expect(pipeline).toHaveProperty('updatedAt')
  })
})

describe('POST /api/v1/pipelines', () => {
  it('erstellt neue Pipeline', async () => {
    const res = await request(app)
      .post('/api/v1/pipelines')
      .send({ name: 'Test Pipeline', description: 'Beschreibung' })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Test Pipeline')
    expect(res.body.data.description).toBe('Beschreibung')
    expect(res.body.data.buckets).toEqual([])
  })

  it('validiert leeren Namen', async () => {
    const res = await request(app)
      .post('/api/v1/pipelines')
      .send({ name: '' })
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/v1/pipelines/:id', () => {
  it('aktualisiert Pipeline-Name', async () => {
    const listRes = await request(app).get('/api/v1/pipelines')
    const pipelineId = listRes.body.data[0].id

    const res = await request(app)
      .put(`/api/v1/pipelines/${pipelineId}`)
      .send({ name: 'Umbenannte Pipeline' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Umbenannte Pipeline')
  })

  it('gibt 404 für nicht existierende Pipeline', async () => {
    const res = await request(app)
      .put('/api/v1/pipelines/nonexistent-id')
      .send({ name: 'Test' })
    expect(res.status).toBe(404)
  })
})

// ─── Buckets CRUD ───

describe('POST /api/v1/pipelines/:id/buckets', () => {
  it('erstellt neuen Bucket', async () => {
    // Pipeline erstellen
    const pipelineRes = await request(app)
      .post('/api/v1/pipelines')
      .send({ name: 'Bucket Test Pipeline' })
    const pipelineId = pipelineRes.body.data.id

    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/buckets`)
      .send({ name: 'Erster Bucket' })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Erster Bucket')
    expect(res.body.data.position).toBe(0)
    expect(res.body.data.pipelineId).toBe(pipelineId)
  })

  it('weist automatisch Position zu', async () => {
    const pipelineRes = await request(app)
      .post('/api/v1/pipelines')
      .send({ name: 'Auto-Position Pipeline' })
    const pipelineId = pipelineRes.body.data.id

    await request(app).post(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name: 'B1' })
    const res2 = await request(app).post(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name: 'B2' })
    expect(res2.body.data.position).toBe(1)
  })
})

describe('PUT /api/v1/pipelines/:id/buckets/:bucketId', () => {
  it('aktualisiert Bucket-Name', async () => {
    const listRes = await request(app).get('/api/v1/pipelines')
    const pipeline = listRes.body.data[0]
    const bucket = pipeline.buckets[0]

    const res = await request(app)
      .put(`/api/v1/pipelines/${pipeline.id}/buckets/${bucket.id}`)
      .send({ name: 'Umbenannter Bucket' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Umbenannter Bucket')
  })

  it('gibt 404 für nicht existierenden Bucket', async () => {
    const listRes = await request(app).get('/api/v1/pipelines')
    const pipelineId = listRes.body.data[0].id

    const res = await request(app)
      .put(`/api/v1/pipelines/${pipelineId}/buckets/nonexistent`)
      .send({ name: 'Test' })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/v1/pipelines/:id/buckets/reorder', () => {
  it('sortiert Buckets um', async () => {
    const listRes = await request(app).get('/api/v1/pipelines')
    const pipeline = listRes.body.data.find((p: any) => p.buckets.length >= 2)
    if (!pipeline) return

    const bucketIds = pipeline.buckets.map((b: any) => b.id)
    const reversed = [...bucketIds].reverse()

    const res = await request(app)
      .put(`/api/v1/pipelines/${pipeline.id}/buckets/reorder`)
      .send({ bucketIds: reversed })
    expect(res.status).toBe(200)
    expect(res.body.data[0].id).toBe(reversed[0])
  })
})

describe('DELETE /api/v1/pipelines/:id/buckets/:bucketId', () => {
  it('löscht Bucket und re-indexiert Positionen', async () => {
    // Pipeline mit 3 Buckets erstellen
    const pipelineRes = await request(app)
      .post('/api/v1/pipelines')
      .send({ name: 'Delete Bucket Test' })
    const pipelineId = pipelineRes.body.data.id

    const b1 = await request(app).post(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name: 'Delete-B1' })
    const b2 = await request(app).post(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name: 'Delete-B2' })
    await request(app).post(`/api/v1/pipelines/${pipelineId}/buckets`).send({ name: 'Delete-B3' })

    // Mittleren Bucket löschen
    const res = await request(app).delete(`/api/v1/pipelines/${pipelineId}/buckets/${b2.body.data.id}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Bucket gelöscht')

    // Prüfen, dass nur 2 Buckets übrig und Positionen korrekt
    const listRes = await request(app).get('/api/v1/pipelines')
    const updated = listRes.body.data.find((p: any) => p.id === pipelineId)
    expect(updated.buckets.length).toBe(2)
    expect(updated.buckets[0].position).toBe(0)
    expect(updated.buckets[1].position).toBe(1)
  })

  it('gibt 404 für nicht existierenden Bucket', async () => {
    const listRes = await request(app).get('/api/v1/pipelines')
    const pipelineId = listRes.body.data[0].id
    const res = await request(app).delete(`/api/v1/pipelines/${pipelineId}/buckets/nonexistent`)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/pipelines/:id', () => {
  it('löscht Pipeline komplett', async () => {
    const createRes = await request(app)
      .post('/api/v1/pipelines')
      .send({ name: 'Zu Löschende Pipeline' })
    const pipelineId = createRes.body.data.id

    const res = await request(app).delete(`/api/v1/pipelines/${pipelineId}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Pipeline gelöscht')

    // Sicherstellen, dass sie weg ist
    const listRes = await request(app).get('/api/v1/pipelines')
    const found = listRes.body.data.find((p: any) => p.id === pipelineId)
    expect(found).toBeUndefined()
  })

  it('gibt 404 für nicht existierende Pipeline', async () => {
    const res = await request(app).delete('/api/v1/pipelines/nonexistent-id')
    expect(res.status).toBe(404)
  })
})
