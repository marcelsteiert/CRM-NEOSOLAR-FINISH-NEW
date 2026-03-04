import { Router } from 'express'

const router = Router()

interface NotificationSetting {
  event: string
  label: string
  enabled: boolean
  channels: ('IN_APP' | 'EMAIL')[]
  reminderMinutes: number | null
}

let notifSettings: NotificationSetting[] = [
  { event: 'LEAD_CREATED', label: 'Neuer Lead erstellt', enabled: true, channels: ['IN_APP'], reminderMinutes: null },
  { event: 'LEAD_ASSIGNED', label: 'Lead zugewiesen', enabled: true, channels: ['IN_APP', 'EMAIL'], reminderMinutes: null },
  { event: 'APPOINTMENT_REMINDER', label: 'Termin-Erinnerung', enabled: true, channels: ['IN_APP', 'EMAIL'], reminderMinutes: 60 },
  { event: 'APPOINTMENT_CONFIRMED', label: 'Termin bestätigt', enabled: true, channels: ['IN_APP'], reminderMinutes: null },
  { event: 'DEAL_STATUS_CHANGE', label: 'Angebotsstatus geändert', enabled: true, channels: ['IN_APP'], reminderMinutes: null },
  { event: 'DEAL_WON', label: 'Angebot gewonnen', enabled: true, channels: ['IN_APP', 'EMAIL'], reminderMinutes: null },
  { event: 'DEAL_LOST', label: 'Angebot verloren', enabled: true, channels: ['IN_APP'], reminderMinutes: null },
  { event: 'FOLLOW_UP_DUE', label: 'Follow-Up fällig', enabled: true, channels: ['IN_APP', 'EMAIL'], reminderMinutes: 30 },
  { event: 'TASK_ASSIGNED', label: 'Aufgabe zugewiesen', enabled: true, channels: ['IN_APP', 'EMAIL'], reminderMinutes: null },
  { event: 'TASK_OVERDUE', label: 'Aufgabe überfällig', enabled: true, channels: ['IN_APP', 'EMAIL'], reminderMinutes: null },
]

router.get('/', (_req, res) => {
  res.json({ data: notifSettings })
})

router.put('/', (req, res) => {
  const { settings } = req.body
  if (Array.isArray(settings)) {
    notifSettings = settings
  }
  res.json({ data: notifSettings })
})

export default router
