import type { Request } from 'express'

// Rollen die immer alle Daten sehen (kein Owner-Filter)
const ADMIN_ROLES = ['ADMIN', 'GL', 'GESCHAEFTSLEITUNG']

/**
 * Gibt die User-ID zurueck, nach der gefiltert werden soll.
 * Admins/GL: null (kein Filter = alle Daten)
 * Normale User: ihre eigene ID
 */
export function getOwnerFilter(req: Request): string | null {
  const user = req.user
  if (!user) return null
  if (ADMIN_ROLES.includes(user.role)) return null
  return user.userId
}

/**
 * Entity-spezifischer Owner-Filter.
 * Prueft ob der User die canViewAll{Entity} Berechtigung hat.
 */
export function getEntityOwnerFilter(req: Request, permission: string): string | null {
  const user = req.user
  if (!user) return null
  if (ADMIN_ROLES.includes(user.role)) return null
  if (user.allowedModules?.includes(permission)) return null
  return user.userId
}

// Convenience-Funktionen pro Entity
export function getLeadOwnerFilter(req: Request): string | null {
  return getEntityOwnerFilter(req, 'canViewAllLeads')
}

export function getAppointmentOwnerFilter(req: Request): string | null {
  return getEntityOwnerFilter(req, 'canViewAllAppointments')
}

export function getDealOwnerFilter(req: Request): string | null {
  return getEntityOwnerFilter(req, 'canViewAllDeals')
}

export function getProjectOwnerFilter(req: Request): string | null {
  return getEntityOwnerFilter(req, 'canViewAllProjects')
}

export function getTaskOwnerFilter(req: Request): string | null {
  return getEntityOwnerFilter(req, 'canViewAllTasks')
}

/**
 * Wandelt camelCase Spaltennamen in snake_case um
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}
