import type { Request } from 'express'

// Rollen die alle Daten sehen (kein Owner-Filter)
const ADMIN_ROLES = ['ADMIN', 'GL', 'GESCHAEFTSLEITUNG', 'VERTRIEB', 'PROJEKTLEITUNG']

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

/**
 * Wandelt camelCase Spaltennamen in snake_case um
 * z.B. createdAt → created_at, appointmentDate → appointment_date
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}
