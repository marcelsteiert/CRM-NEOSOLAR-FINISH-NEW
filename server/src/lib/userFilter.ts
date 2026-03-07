import type { Request } from 'express'

// Admin-artige Rollen sehen alle Daten
const ADMIN_ROLES = ['ADMIN', 'GL', 'GESCHAEFTSLEITUNG']

/**
 * Gibt die User-ID zurueck, nach der gefiltert werden soll.
 * Admins: null (kein Filter = alle Daten)
 * Normale User: ihre eigene ID
 */
export function getOwnerFilter(req: Request): string | null {
  const user = req.user
  if (!user) return null
  if (ADMIN_ROLES.includes(user.role)) return null
  return user.userId
}
