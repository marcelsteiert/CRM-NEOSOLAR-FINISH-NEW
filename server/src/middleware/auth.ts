import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler.js'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('FATAL: JWT_SECRET Umgebungsvariable muss gesetzt sein')
  return secret
}
const JWT_SECRET: string = getJwtSecret()

export interface AuthUser {
  userId: string
  email: string
  role: string
}

// Erweiterung des Request-Types
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Middleware: JWT aus Authorization-Header validieren
 * Setzt req.user mit userId, email, role
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Nicht autorisiert – Token fehlt', 401))
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = decoded
    next()
  } catch {
    next(new AppError('Nicht autorisiert – Token ungueltig', 401))
  }
}

/**
 * Optionale Auth-Middleware: Setzt req.user wenn Token vorhanden, aber blockiert nicht
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
      req.user = decoded
    } catch {
      // Token ungueltig - weiter ohne user
    }
  }

  next()
}

/**
 * Middleware: Nur bestimmte Rollen erlauben
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Nicht autorisiert', 401))
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Zugriff verweigert – fehlende Berechtigung', 403))
    }
    next()
  }
}

/**
 * Prueft ob User Admin-artige Rolle hat (sieht alle Daten)
 */
export function isAdminRole(role: string): boolean {
  return ['ADMIN', 'GL', 'GESCHAEFTSLEITUNG'].includes(role)
}

// Legacy exports fuer Kompatibilitaet
export type JwtPayload = AuthUser
export type AuthRequest = Request
export const verifyToken = authMiddleware
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}
