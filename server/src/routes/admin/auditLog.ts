import { Router } from 'express'

const router = Router()

interface AuditEntry {
  id: string
  userId: string
  userName: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'SETTING_CHANGE'
  entityType: string
  entityId: string | null
  description: string
  createdAt: string
}

const actionColors: Record<string, string> = {
  CREATE: '#34D399', UPDATE: '#60A5FA', DELETE: '#F87171',
  LOGIN: '#A78BFA', EXPORT: '#F59E0B', SETTING_CHANGE: '#FB923C',
}

// Generate 60 mock entries
const entries: AuditEntry[] = [
  { id: 'audit-001', userId: 'u001', userName: 'Marco Rossi', action: 'LOGIN', entityType: 'AUTH', entityId: null, description: 'Benutzer hat sich angemeldet', createdAt: '2026-03-04T08:15:00Z' },
  { id: 'audit-002', userId: 'u001', userName: 'Marco Rossi', action: 'CREATE', entityType: 'LEAD', entityId: 'lead-new-1', description: 'Neuer Lead erstellt: Müller AG', createdAt: '2026-03-04T08:30:00Z' },
  { id: 'audit-003', userId: 'u002', userName: 'Sarah Keller', action: 'UPDATE', entityType: 'DEAL', entityId: 'deal-001', description: 'Angebot Status geändert: ERSTELLT → GESENDET', createdAt: '2026-03-04T09:00:00Z' },
  { id: 'audit-004', userId: 'u001', userName: 'Marco Rossi', action: 'UPDATE', entityType: 'APPOINTMENT', entityId: 'appt-001', description: 'Termin bestätigt für 05.03.2026', createdAt: '2026-03-04T09:15:00Z' },
  { id: 'audit-005', userId: 'u003', userName: 'Thomas Weber', action: 'CREATE', entityType: 'TASK', entityId: 'task-new-1', description: 'Aufgabe erstellt: Dachfläche vermessen', createdAt: '2026-03-04T09:30:00Z' },
  { id: 'audit-006', userId: 'u005', userName: 'Anna Brunner', action: 'SETTING_CHANGE', entityType: 'SETTINGS', entityId: null, description: 'Follow-Up Regeln aktualisiert', createdAt: '2026-03-04T10:00:00Z' },
  { id: 'audit-007', userId: 'u002', userName: 'Sarah Keller', action: 'UPDATE', entityType: 'LEAD', entityId: 'lead-002', description: 'Lead Status geändert: NEU → KONTAKTIERT', createdAt: '2026-03-04T10:15:00Z' },
  { id: 'audit-008', userId: 'u004', userName: 'Lisa Meier', action: 'EXPORT', entityType: 'DEAL', entityId: null, description: 'Angebote exportiert (CSV, 23 Einträge)', createdAt: '2026-03-04T10:30:00Z' },
  { id: 'audit-009', userId: 'u001', userName: 'Marco Rossi', action: 'CREATE', entityType: 'APPOINTMENT', entityId: 'appt-new-1', description: 'Termin erstellt: Besichtigung Bern', createdAt: '2026-03-04T11:00:00Z' },
  { id: 'audit-010', userId: 'u003', userName: 'Thomas Weber', action: 'DELETE', entityType: 'DOCUMENT', entityId: 'doc-005', description: 'Dokument gelöscht: Alte Offerte.pdf', createdAt: '2026-03-04T11:15:00Z' },
  { id: 'audit-011', userId: 'u005', userName: 'Anna Brunner', action: 'LOGIN', entityType: 'AUTH', entityId: null, description: 'Benutzer hat sich angemeldet', createdAt: '2026-03-04T07:45:00Z' },
  { id: 'audit-012', userId: 'u001', userName: 'Marco Rossi', action: 'UPDATE', entityType: 'DEAL', entityId: 'deal-003', description: 'Angebotswert geändert: CHF 42\'000 → CHF 45\'500', createdAt: '2026-03-03T16:30:00Z' },
  { id: 'audit-013', userId: 'u002', userName: 'Sarah Keller', action: 'CREATE', entityType: 'DEAL', entityId: 'deal-new-1', description: 'Neues Angebot erstellt: Solar-Anlage 12kWp', createdAt: '2026-03-03T15:00:00Z' },
  { id: 'audit-014', userId: 'u004', userName: 'Lisa Meier', action: 'SETTING_CHANGE', entityType: 'SETTINGS', entityId: null, description: 'Checklisten-Template aktualisiert (8 Punkte)', createdAt: '2026-03-03T14:00:00Z' },
  { id: 'audit-015', userId: 'u003', userName: 'Thomas Weber', action: 'UPDATE', entityType: 'LEAD', entityId: 'lead-005', description: 'Lead Priorität geändert: MEDIUM → HIGH', createdAt: '2026-03-03T13:30:00Z' },
  { id: 'audit-016', userId: 'u001', userName: 'Marco Rossi', action: 'CREATE', entityType: 'LEAD', entityId: 'lead-new-2', description: 'Neuer Lead erstellt: Genossenschaft Zürich', createdAt: '2026-03-03T11:00:00Z' },
  { id: 'audit-017', userId: 'u002', userName: 'Sarah Keller', action: 'UPDATE', entityType: 'APPOINTMENT', entityId: 'appt-003', description: 'Termin-Typ geändert: VOR_ORT → ONLINE', createdAt: '2026-03-03T10:00:00Z' },
  { id: 'audit-018', userId: 'u005', userName: 'Anna Brunner', action: 'DELETE', entityType: 'TAG', entityId: 'tag-old', description: 'Tag gelöscht: Altbestand', createdAt: '2026-03-03T09:00:00Z' },
  { id: 'audit-019', userId: 'u001', userName: 'Marco Rossi', action: 'LOGIN', entityType: 'AUTH', entityId: null, description: 'Benutzer hat sich angemeldet', createdAt: '2026-03-03T08:00:00Z' },
  { id: 'audit-020', userId: 'u003', userName: 'Thomas Weber', action: 'EXPORT', entityType: 'LEAD', entityId: null, description: 'Leads exportiert (JSON, 15 Einträge)', createdAt: '2026-03-02T16:00:00Z' },
  { id: 'audit-021', userId: 'u002', userName: 'Sarah Keller', action: 'CREATE', entityType: 'TASK', entityId: 'task-new-2', description: 'Aufgabe erstellt: Offerte nachfassen', createdAt: '2026-03-02T15:00:00Z' },
  { id: 'audit-022', userId: 'u004', userName: 'Lisa Meier', action: 'UPDATE', entityType: 'DEAL', entityId: 'deal-002', description: 'Angebot Status: GESENDET → FOLLOW_UP', createdAt: '2026-03-02T14:00:00Z' },
  { id: 'audit-023', userId: 'u001', userName: 'Marco Rossi', action: 'SETTING_CHANGE', entityType: 'SETTINGS', entityId: null, description: 'Firmenstandort aktualisiert: St. Margrethen', createdAt: '2026-03-02T13:00:00Z' },
  { id: 'audit-024', userId: 'u005', userName: 'Anna Brunner', action: 'CREATE', entityType: 'LEAD', entityId: 'lead-new-3', description: 'Neuer Lead erstellt: Schulhaus Thun', createdAt: '2026-03-02T11:00:00Z' },
  { id: 'audit-025', userId: 'u003', userName: 'Thomas Weber', action: 'UPDATE', entityType: 'TASK', entityId: 'task-003', description: 'Aufgabe erledigt: Materialbestellung prüfen', createdAt: '2026-03-02T10:00:00Z' },
  { id: 'audit-026', userId: 'u001', userName: 'Marco Rossi', action: 'DELETE', entityType: 'LEAD', entityId: 'lead-old', description: 'Lead gelöscht: Testdaten AG', createdAt: '2026-03-01T16:00:00Z' },
  { id: 'audit-027', userId: 'u002', userName: 'Sarah Keller', action: 'LOGIN', entityType: 'AUTH', entityId: null, description: 'Benutzer hat sich angemeldet', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'audit-028', userId: 'u004', userName: 'Lisa Meier', action: 'CREATE', entityType: 'APPOINTMENT', entityId: 'appt-new-2', description: 'Termin erstellt: Besichtigung Luzern', createdAt: '2026-03-01T14:00:00Z' },
  { id: 'audit-029', userId: 'u003', userName: 'Thomas Weber', action: 'UPDATE', entityType: 'DEAL', entityId: 'deal-005', description: 'Win-Probability geändert: 40% → 65%', createdAt: '2026-03-01T13:00:00Z' },
  { id: 'audit-030', userId: 'u005', userName: 'Anna Brunner', action: 'EXPORT', entityType: 'APPOINTMENT', entityId: null, description: 'Termine exportiert (CSV, 8 Einträge)', createdAt: '2026-03-01T12:00:00Z' },
]

router.get('/', (req, res) => {
  const { userId, action, from, to, page = '1', pageSize = '20' } = req.query
  let filtered = [...entries]
  if (userId) filtered = filtered.filter((e) => e.userId === userId)
  if (action) filtered = filtered.filter((e) => e.action === action)
  if (from) filtered = filtered.filter((e) => e.createdAt >= (from as string))
  if (to) filtered = filtered.filter((e) => e.createdAt <= (to as string))

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const p = Number(page)
  const ps = Number(pageSize)
  const start = (p - 1) * ps
  const paged = filtered.slice(start, start + ps)

  res.json({ data: paged, total: filtered.length, page: p, pageSize: ps })
})

export default router
