import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, action, from, to, page = '1', pageSize = '20' } = req.query

    let query = supabase
      .from('audit_logs')
      .select('*, user:users!audit_logs_user_id_fkey(first_name, last_name)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (userId && typeof userId === 'string') query = query.eq('user_id', userId)
    if (action && typeof action === 'string') query = query.eq('action', action)
    if (from && typeof from === 'string') query = query.gte('created_at', from)
    if (to && typeof to === 'string') query = query.lte('created_at', to)

    const p = Math.max(1, Number(page))
    const ps = Math.min(100, Math.max(1, Number(pageSize)))
    const start = (p - 1) * ps
    query = query.range(start, start + ps - 1)

    const { data, count, error } = await query
    if (error) throw new AppError(error.message, 500)

    // Map fuer Frontend: userName + entityType aus entity
    const mapped = (data ?? []).map((entry: any) => ({
      id: entry.id,
      userId: entry.user_id,
      userName: entry.user
        ? `${entry.user.first_name} ${entry.user.last_name}`
        : entry.user_id ?? 'System',
      action: entry.action,
      entityType: entry.entity,
      entityId: entry.entity_id,
      description: entry.description || buildDescription(entry),
      oldData: entry.old_data,
      newData: entry.new_data,
      ipAddress: entry.ip_address,
      createdAt: entry.created_at,
    }))

    res.json({ data: mapped, total: count ?? 0, page: p, pageSize: ps })
  } catch (err) {
    next(err)
  }
})

// Fallback-Beschreibung generieren wenn description leer ist
function buildDescription(entry: any): string {
  const entityLabels: Record<string, string> = {
    LEAD: 'Lead', DEAL: 'Angebot', APPOINTMENT: 'Termin', PROJECT: 'Projekt',
    TASK: 'Aufgabe', CONTACT: 'Kontakt', USER: 'Benutzer', DOCUMENT: 'Dokument',
    PASSWORD: 'Passwort', PIPELINE: 'Pipeline', TAG: 'Tag', CALENDAR: 'Kalendereintrag',
    SETTING: 'Einstellung', AUTH: 'Authentifizierung',
  }
  const actionLabels: Record<string, string> = {
    CREATE: 'erstellt', UPDATE: 'geändert', DELETE: 'gelöscht',
    LOGIN: 'angemeldet', EXPORT: 'exportiert', SETTING_CHANGE: 'Einstellung geändert',
  }
  const entityLabel = entityLabels[entry.entity] || entry.entity
  const actionLabel = actionLabels[entry.action] || entry.action
  return `${entityLabel} ${actionLabel}${entry.entity_id ? ` (${entry.entity_id.substring(0, 8)}...)` : ''}`
}

export default router
