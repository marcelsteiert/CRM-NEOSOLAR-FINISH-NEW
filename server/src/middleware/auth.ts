import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

/**
 * Shape of the decoded JWT payload.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Extended Express Request that carries the authenticated user information.
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * Extract the Bearer token from the Authorization header.
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * Middleware that verifies the JWT token from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 */
export function verifyToken(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return next(
      new AppError('Authentifizierungstoken fehlt', 401),
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    next(new AppError('Ungueltiger oder abgelaufener Token', 401));
  }
}
