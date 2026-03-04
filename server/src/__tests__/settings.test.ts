import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─────────────────────────────────────────────────────────────
// GET /api/v1/settings
// ─────────────────────────────────────────────────────────────

describe('GET /api/v1/settings', () => {
  it('gibt Einstellungen zurück', async () => {
    const res = await request(app).get('/api/v1/settings')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data).toHaveProperty('defaultFollowUpDays')
    expect(res.body.data).toHaveProperty('followUpRules')
    expect(res.body.data).toHaveProperty('checklistTemplate')
    expect(res.body.data).toHaveProperty('companyAddress')
  })

  it('hat korrekte Default-Werte', async () => {
    const res = await request(app).get('/api/v1/settings')
    expect(res.body.data.defaultFollowUpDays).toBe(3)
    expect(res.body.data.companyAddress).toBe('St. Margrethen')
    expect(Array.isArray(res.body.data.followUpRules)).toBe(true)
    expect(Array.isArray(res.body.data.checklistTemplate)).toBe(true)
    expect(res.body.data.followUpRules.length).toBe(4)
    expect(res.body.data.checklistTemplate.length).toBe(8)
  })

  it('hat korrekte Follow-Up-Regel-Struktur', async () => {
    const res = await request(app).get('/api/v1/settings')
    const rule = res.body.data.followUpRules[0]
    expect(rule).toHaveProperty('stage')
    expect(rule).toHaveProperty('maxDays')
    expect(rule).toHaveProperty('urgentMaxDays')
    expect(rule).toHaveProperty('message')
    expect(typeof rule.maxDays).toBe('number')
    expect(typeof rule.urgentMaxDays).toBe('number')
  })

  it('hat korrekte Checklisten-Template-Struktur', async () => {
    const res = await request(app).get('/api/v1/settings')
    const item = res.body.data.checklistTemplate[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('label')
    expect(typeof item.id).toBe('string')
    expect(typeof item.label).toBe('string')
  })

  it('enthaelt alle 4 Follow-Up-Stages', async () => {
    const res = await request(app).get('/api/v1/settings')
    const stages = res.body.data.followUpRules.map((r: { stage: string }) => r.stage)
    expect(stages).toContain('ERSTELLT')
    expect(stages).toContain('GESENDET')
    expect(stages).toContain('FOLLOW_UP')
    expect(stages).toContain('VERHANDLUNG')
  })
})

// ─────────────────────────────────────────────────────────────
// PUT /api/v1/settings
// ─────────────────────────────────────────────────────────────

describe('PUT /api/v1/settings', () => {
  it('aktualisiert defaultFollowUpDays', async () => {
    const res = await request(app).put('/api/v1/settings').send({
      defaultFollowUpDays: 5,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.defaultFollowUpDays).toBe(5)

    // Zuruecksetzen
    await request(app).put('/api/v1/settings').send({ defaultFollowUpDays: 3 })
  })

  it('aktualisiert companyAddress', async () => {
    const res = await request(app).put('/api/v1/settings').send({
      companyAddress: 'Heerbrugg',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.companyAddress).toBe('Heerbrugg')

    // Zuruecksetzen
    await request(app).put('/api/v1/settings').send({ companyAddress: 'St. Margrethen' })
  })

  it('aktualisiert checklistTemplate', async () => {
    const newChecklist = [
      { id: 'test1', label: 'Test-Punkt 1' },
      { id: 'test2', label: 'Test-Punkt 2' },
    ]
    const res = await request(app).put('/api/v1/settings').send({
      checklistTemplate: newChecklist,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.checklistTemplate).toHaveLength(2)
    expect(res.body.data.checklistTemplate[0].label).toBe('Test-Punkt 1')

    // Zuruecksetzen (8 Original-Items)
    await request(app).put('/api/v1/settings').send({
      checklistTemplate: [
        { id: 'c1', label: 'Dach-Fotos/Bilder erhalten' },
        { id: 'c2', label: 'Dachfläche & Ausrichtung berechnet' },
        { id: 'c3', label: 'kWp-Potenzial geschätzt' },
        { id: 'c4', label: 'Stromverbrauch des Kunden analysiert' },
        { id: 'c5', label: 'Anfahrt geplant' },
        { id: 'c6', label: 'Offerte-Vorlage vorbereitet' },
        { id: 'c7', label: 'Technische Unterlagen zusammengestellt' },
        { id: 'c8', label: 'Kunde über Ablauf informiert' },
      ],
    })
  })

  it('aktualisiert followUpRules', async () => {
    const newRules = [
      { stage: 'ERSTELLT', maxDays: 5, urgentMaxDays: 2, message: 'Test-Nachricht' },
    ]
    const res = await request(app).put('/api/v1/settings').send({
      followUpRules: newRules,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.followUpRules).toHaveLength(1)
    expect(res.body.data.followUpRules[0].maxDays).toBe(5)

    // Zuruecksetzen
    await request(app).put('/api/v1/settings').send({
      followUpRules: [
        { stage: 'ERSTELLT', maxDays: 2, urgentMaxDays: 1, message: 'Angebot noch nicht gesendet – bitte finalisieren!' },
        { stage: 'GESENDET', maxDays: 3, urgentMaxDays: 1, message: 'Angebot wurde gesendet – Nachfassen beim Kunden!' },
        { stage: 'FOLLOW_UP', maxDays: 2, urgentMaxDays: 1, message: 'Follow-Up überfällig – bitte sofort anrufen!' },
        { stage: 'VERHANDLUNG', maxDays: 3, urgentMaxDays: 1, message: 'Verhandlung läuft – dranbleiben!' },
      ],
    })
  })

  it('aktualisiert mehrere Felder gleichzeitig', async () => {
    const res = await request(app).put('/api/v1/settings').send({
      defaultFollowUpDays: 7,
      companyAddress: 'Rorschach',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.defaultFollowUpDays).toBe(7)
    expect(res.body.data.companyAddress).toBe('Rorschach')

    // Zuruecksetzen
    await request(app).put('/api/v1/settings').send({
      defaultFollowUpDays: 3,
      companyAddress: 'St. Margrethen',
    })
  })

  it('validiert defaultFollowUpDays Range', async () => {
    const res = await request(app).put('/api/v1/settings').send({
      defaultFollowUpDays: 0,
    })
    expect(res.status).toBe(422)
  })

  it('validiert maxDays Range in followUpRules', async () => {
    const res = await request(app).put('/api/v1/settings').send({
      followUpRules: [{ stage: 'ERSTELLT', maxDays: 0, urgentMaxDays: 1, message: 'Test' }],
    })
    expect(res.status).toBe(422)
  })

  it('validiert leere companyAddress', async () => {
    const res = await request(app).put('/api/v1/settings').send({
      companyAddress: '',
    })
    expect(res.status).toBe(422)
  })

  it('ignoriert unbekannte Felder (kein Fehler)', async () => {
    const res = await request(app).put('/api/v1/settings').send({
      unknownField: 'test',
    })
    // Zod strippt unbekannte Felder, kein Fehler erwartet
    expect(res.status).toBe(200)
  })
})
