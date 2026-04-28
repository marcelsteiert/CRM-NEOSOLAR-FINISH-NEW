import type { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler.js'
import { verifyPortalToken, type PortalAuthUser } from '../lib/portalService.js'

declare global {
  namespace Express {
    interface Request {
      portalUser?: PortalAuthUser
    }
  }
}

export function portalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Portal-Login erforderlich', 401))
  }
  const token = authHeader.slice(7)
  const decoded = verifyPortalToken(token)
  if (!decoded) {
    return next(new AppError('Sitzung abgelaufen oder ungueltig', 401))
  }
  req.portalUser = decoded
  next()
}
