import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import type { Express } from 'express'

let app: Express

beforeAll(() => {
  app = createApp()
})

// ─── Users CRUD ───

describe('GET /api/v1/users', () => {
  it('gibt alle Benutzer zurück', async () => {
    const res = await request(app).get('/api/v1/users')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('enthält alle Pflichtfelder', async () => {
    const res = await request(app).get('/api/v1/users')
    const user = res.body.data[0]
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('firstName')
    expect(user).toHaveProperty('lastName')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('phone')
    expect(user).toHaveProperty('role')
    expect(user).toHaveProperty('isActive')
    expect(user).toHaveProperty('allowedModules')
    expect(user).toHaveProperty('createdAt')
    expect(Array.isArray(user.allowedModules)).toBe(true)
  })
})

describe('GET /api/v1/users/role-defaults', () => {
  it('gibt Standard-Berechtigungen pro Rolle zurück', async () => {
    const res = await request(app).get('/api/v1/users/role-defaults')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('ADMIN')
    expect(res.body.data).toHaveProperty('VERTRIEB')
    expect(res.body.data).toHaveProperty('PROJEKTLEITUNG')
    expect(res.body.data).toHaveProperty('BUCHHALTUNG')
    expect(res.body.data).toHaveProperty('GL')
    expect(Array.isArray(res.body.data.ADMIN)).toBe(true)
    expect(res.body.data.ADMIN).toContain('dashboard')
    expect(res.body.data.ADMIN).toContain('admin')
  })

  it('VERTRIEB hat eingeschränkte Module', async () => {
    const res = await request(app).get('/api/v1/users/role-defaults')
    const vertrieb = res.body.data.VERTRIEB
    expect(vertrieb).toContain('leads')
    expect(vertrieb).toContain('deals')
    expect(vertrieb).not.toContain('admin')
    expect(vertrieb).not.toContain('provision')
  })
})

describe('GET /api/v1/users/:id', () => {
  it('gibt einzelnen Benutzer zurück', async () => {
    const res = await request(app).get('/api/v1/users/u001')
    expect(res.status).toBe(200)
    expect(res.body.data.firstName).toBe('Marco')
    expect(res.body.data.role).toBe('VERTRIEB')
  })

  it('gibt 404 für nicht existierenden Benutzer', async () => {
    const res = await request(app).get('/api/v1/users/u999')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/v1/users', () => {
  it('erstellt neuen Benutzer', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@neosolar.ch',
        phone: '+41 71 555 99 99',
        role: 'VERTRIEB',
      })
    expect(res.status).toBe(201)
    expect(res.body.data.firstName).toBe('Test')
    expect(res.body.data.lastName).toBe('User')
    expect(res.body.data.email).toBe('test.user@neosolar.ch')
    expect(res.body.data.role).toBe('VERTRIEB')
    expect(res.body.data.isActive).toBe(true)
    expect(Array.isArray(res.body.data.allowedModules)).toBe(true)
    expect(res.body.data.allowedModules).toContain('leads')
  })

  it('erstellt Benutzer mit eigenen Modulberechtigungen', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({
        firstName: 'Custom',
        lastName: 'Modules',
        email: 'custom.modules@neosolar.ch',
        role: 'VERTRIEB',
        allowedModules: ['dashboard', 'leads'],
      })
    expect(res.status).toBe(201)
    expect(res.body.data.allowedModules).toEqual(['dashboard', 'leads'])
  })

  it('verwendet Rolle-Defaults wenn keine Module angegeben', async () => {
    const defaultsRes = await request(app).get('/api/v1/users/role-defaults')
    const plDefaults = defaultsRes.body.data.PROJEKTLEITUNG

    const res = await request(app)
      .post('/api/v1/users')
      .send({
        firstName: 'PL',
        lastName: 'Default',
        email: 'pl.default@neosolar.ch',
        role: 'PROJEKTLEITUNG',
      })
    expect(res.status).toBe(201)
    expect(res.body.data.allowedModules).toEqual(plDefaults)
  })

  it('verhindert doppelte E-Mail', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({
        firstName: 'Dupe',
        lastName: 'Email',
        email: 'marco.bianchi@neosolar.ch',
        role: 'VERTRIEB',
      })
    expect(res.status).toBe(409)
  })

  it('validiert Pflichtfelder', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ firstName: '', email: 'x', role: 'INVALID' })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/v1/users/:id', () => {
  it('aktualisiert Benutzername', async () => {
    const res = await request(app)
      .put('/api/v1/users/u001')
      .send({ firstName: 'Marco Updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.firstName).toBe('Marco Updated')
  })

  it('aktualisiert Rolle und setzt Module-Defaults', async () => {
    const defaultsRes = await request(app).get('/api/v1/users/role-defaults')
    const adminDefaults = defaultsRes.body.data.ADMIN

    const res = await request(app)
      .put('/api/v1/users/u002')
      .send({ role: 'ADMIN' })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('ADMIN')
    expect(res.body.data.allowedModules).toEqual(adminDefaults)
  })

  it('aktualisiert individuelle Module ohne Rolle zu ändern', async () => {
    const res = await request(app)
      .put('/api/v1/users/u003')
      .send({ allowedModules: ['dashboard', 'projects', 'tasks', 'admin'] })
    expect(res.status).toBe(200)
    expect(res.body.data.allowedModules).toContain('admin')
    expect(res.body.data.role).toBe('PROJEKTLEITUNG')
  })

  it('behält bestehende Module bei Rollenwechsel mit expliziten Modulen', async () => {
    const customModules = ['dashboard', 'leads', 'deals', 'admin']
    const res = await request(app)
      .put('/api/v1/users/u004')
      .send({ role: 'GL', allowedModules: customModules })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('GL')
    expect(res.body.data.allowedModules).toEqual(customModules)
  })

  it('kann isActive setzen', async () => {
    const res = await request(app)
      .put('/api/v1/users/u005')
      .send({ isActive: false })
    expect(res.status).toBe(200)
    expect(res.body.data.isActive).toBe(false)

    // Wieder aktivieren
    const res2 = await request(app)
      .put('/api/v1/users/u005')
      .send({ isActive: true })
    expect(res2.status).toBe(200)
    expect(res2.body.data.isActive).toBe(true)
  })

  it('gibt 404 für nicht existierenden Benutzer', async () => {
    const res = await request(app)
      .put('/api/v1/users/u999')
      .send({ firstName: 'Ghost' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/users/:id (soft delete)', () => {
  it('deaktiviert Benutzer', async () => {
    const createRes = await request(app)
      .post('/api/v1/users')
      .send({
        firstName: 'ToDelete',
        lastName: 'User',
        email: 'to.delete@neosolar.ch',
        role: 'VERTRIEB',
      })
    const userId = createRes.body.data.id

    const res = await request(app).delete(`/api/v1/users/${userId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.isActive).toBe(false)
    expect(res.body.message).toBe('Benutzer deaktiviert')
  })

  it('gibt 404 für nicht existierenden Benutzer', async () => {
    const res = await request(app).delete('/api/v1/users/u999')
    expect(res.status).toBe(404)
  })
})
