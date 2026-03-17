import { supabase } from './supabase.js'

// ── Audit-Log Service – Fire-and-forget Logging ──

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'SETTING_CHANGE'

export type AuditEntity =
  | 'LEAD' | 'DEAL' | 'APPOINTMENT' | 'PROJECT' | 'TASK'
  | 'CONTACT' | 'USER' | 'DOCUMENT' | 'PASSWORD'
  | 'PIPELINE' | 'TAG' | 'CALENDAR' | 'SETTING' | 'AUTH'

interface AuditOptions {
  userId: string
  action: AuditAction
  entity: AuditEntity
  entityId?: string | string[] | null
  description: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  ipAddress?: string | string[] | null
}

/**
 * Fire-and-forget Audit-Log Eintrag erstellen.
 * Fehler werden geloggt aber nicht geworfen (non-blocking).
 */
export function logAudit(options: AuditOptions): void {
  supabase
    .from('audit_logs')
    .insert({
      user_id: options.userId,
      action: options.action,
      entity: options.entity,
      entity_id: Array.isArray(options.entityId) ? options.entityId[0] : (options.entityId ?? null),
      description: options.description,
      old_data: options.oldData ?? null,
      new_data: options.newData ?? null,
      ip_address: Array.isArray(options.ipAddress) ? options.ipAddress[0] : (options.ipAddress ?? null),
    })
    .then(({ error }) => {
      if (error) console.error('[Audit] Fehler beim Schreiben:', error.message)
    })
}

/**
 * Helper: User-ID aus Request extrahieren
 */
export function getAuditUserId(req: any): string {
  return req.user?.userId ?? 'system'
}

/**
 * Helper: IP-Adresse aus Request extrahieren
 */
export function getAuditIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for']
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return ip?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown'
}
