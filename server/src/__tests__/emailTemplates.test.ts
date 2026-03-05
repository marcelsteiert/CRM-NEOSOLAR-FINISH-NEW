import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/emails/templates
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/emails/templates', () => {
  it('gibt E-Mail-Vorlagen zurück', async () => {
    const res = await request(app).get('/api/v1/emails/templates')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('hat korrekte Template-Struktur', async () => {
    const res = await request(app).get('/api/v1/emails/templates')
    const template = res.body.data[0]
    expect(template).toHaveProperty('id')
    expect(template).toHaveProperty('name')
    expect(template).toHaveProperty('subject')
    expect(template).toHaveProperty('body')
  })

  it('enthält Platzhalter im Body', async () => {
    const res = await request(app).get('/api/v1/emails/templates')
    const template = res.body.data[0]
    expect(template.body).toContain('{{')
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/v1/emails/send
// ─────────────────────────────────────────────────────────────

describe('POST /api/v1/emails/send', () => {
  it('sendet eine E-Mail', async () => {
    const res = await request(app).post('/api/v1/emails/send').send({
      leadId: 'lead-email-001',
      to: 'kunde@example.ch',
      subject: 'Test-Mail',
      body: 'Guten Tag, dies ist ein Test.',
      sentBy: 'Tester',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.to).toBe('kunde@example.ch')
    expect(res.body.data.subject).toBe('Test-Mail')
    expect(res.body.data).toHaveProperty('sentAt')
    expect(res.body.data).toHaveProperty('id')
  })

  it('akzeptiert optionale templateId', async () => {
    const res = await request(app).post('/api/v1/emails/send').send({
      leadId: 'lead-email-002',
      to: 'test@example.ch',
      subject: 'Offerte',
      body: 'Offerte anbei.',
      templateId: 'tpl-002',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.templateId).toBe('tpl-002')
  })

  it('validiert E-Mail-Format', async () => {
    const res = await request(app).post('/api/v1/emails/send').send({
      leadId: 'l001',
      to: 'invalid-email',
      subject: 'Test',
      body: 'Test',
    })
    expect(res.status).toBe(422)
  })

  it('validiert fehlende Felder', async () => {
    const res = await request(app).post('/api/v1/emails/send').send({})
    expect(res.status).toBe(422)
  })

  it('validiert leeren Betreff', async () => {
    const res = await request(app).post('/api/v1/emails/send').send({
      leadId: 'l001',
      to: 'test@test.ch',
      subject: '',
      body: 'Test',
    })
    expect(res.status).toBe(422)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/emails/sent
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/emails/sent', () => {
  it('gibt gesendete E-Mails zurück', async () => {
    const res = await request(app).get('/api/v1/emails/sent')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('filtert nach leadId', async () => {
    // Sende zuerst eine Mail
    await request(app).post('/api/v1/emails/send').send({
      leadId: 'lead-filter-001',
      to: 'filter@test.ch',
      subject: 'Filter Test',
      body: 'Inhalt',
    })

    const res = await request(app).get('/api/v1/emails/sent?leadId=lead-filter-001')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    res.body.data.forEach((e: { leadId: string }) => {
      expect(e.leadId).toBe('lead-filter-001')
    })
  })

  it('enthält zuvor gesendete E-Mails', async () => {
    const res = await request(app).get('/api/v1/emails/sent')
    expect(res.body.data.length).toBeGreaterThan(0)
    const email = res.body.data[0]
    expect(email).toHaveProperty('id')
    expect(email).toHaveProperty('to')
    expect(email).toHaveProperty('subject')
    expect(email).toHaveProperty('sentAt')
  })
})
