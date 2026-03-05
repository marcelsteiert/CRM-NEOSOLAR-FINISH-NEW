import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { extractToken } from '../middleware/auth.js'

// ─────────────────────────────────────────────────────────────
// extractToken
// ─────────────────────────────────────────────────────────────

describe('extractToken', () => {
  it('extrahiert Bearer Token korrekt', () => {
    expect(extractToken('Bearer abc123')).toBe('abc123')
  })

  it('gibt null zurück bei fehlendem Header', () => {
    expect(extractToken(undefined)).toBeNull()
  })

  it('gibt null zurück bei leerem String', () => {
    expect(extractToken('')).toBeNull()
  })

  it('gibt null zurück bei Non-Bearer Schema', () => {
    expect(extractToken('Basic abc123')).toBeNull()
  })

  it('gibt null zurück bei nur einem Teil', () => {
    expect(extractToken('Bearer')).toBeNull()
  })

  it('gibt null zurück bei zu vielen Teilen', () => {
    expect(extractToken('Bearer abc 123')).toBeNull()
  })

  it('gibt Token zurück bei langem JWT', () => {
    const longToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0.signature'
    expect(extractToken(`Bearer ${longToken}`)).toBe(longToken)
  })
})

// ─────────────────────────────────────────────────────────────
// JWT Token-Verifikation
// ─────────────────────────────────────────────────────────────

describe('JWT Token Verifikation', () => {
  const secret = 'test-secret-for-auth'

  it('verifiziert gültigen Token', () => {
    const token = jwt.sign(
      { userId: 'u001', email: 'test@test.ch', role: 'ADMIN' },
      secret,
      { expiresIn: '1h' },
    )
    const decoded = jwt.verify(token, secret) as { userId: string; email: string; role: string }
    expect(decoded.userId).toBe('u001')
    expect(decoded.email).toBe('test@test.ch')
    expect(decoded.role).toBe('ADMIN')
  })

  it('lehnt abgelaufenen Token ab', () => {
    const token = jwt.sign({ userId: '1' }, secret, { expiresIn: '-1s' })
    expect(() => jwt.verify(token, secret)).toThrow()
  })

  it('lehnt Token mit falschem Secret ab', () => {
    const token = jwt.sign({ userId: '1' }, 'wrong-secret')
    expect(() => jwt.verify(token, secret)).toThrow()
  })

  it('lehnt manipulierten Token ab', () => {
    const token = jwt.sign({ userId: '1' }, secret)
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(() => jwt.verify(tampered, secret)).toThrow()
  })

  it('enthält korrekte Payload-Felder', () => {
    const payload = { userId: 'u002', email: 'admin@neosolar.ch', role: 'GL' }
    const token = jwt.sign(payload, secret)
    const decoded = jwt.verify(token, secret) as typeof payload & { iat: number }
    expect(decoded.userId).toBe(payload.userId)
    expect(decoded.email).toBe(payload.email)
    expect(decoded.role).toBe(payload.role)
    expect(decoded).toHaveProperty('iat')
  })
})
