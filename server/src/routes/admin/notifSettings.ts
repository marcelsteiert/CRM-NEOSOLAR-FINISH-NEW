import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'
import { invalidateNotifSettingsCache } from '../../lib/notificationService.js'

const router = Router()

interface NotificationSetting {
  event: string
  label: string
  enabled: boolean
  channels: ('IN_APP' | 'EMAIL')[]
  reminderMinutes: number | null
}

const defaultSettings: NotificationSetting[] = [
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
  { event: 'PROJEKT_UPDATE', label: 'Projekt-Update', enabled: true, channels: ['IN_APP'], reminderMinutes: null },
  { event: 'DOCUMENT_UPLOADED', label: 'Dokument hochgeladen', enabled: true, channels: ['IN_APP'], reminderMinutes: null },
]

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'notification_settings')
      .single()

    const settings = (data?.value as NotificationSetting[] | null) ?? defaultSettings
    res.json({ data: settings })
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'settings muss ein Array sein' })
    }

    await supabase
      .from('settings')
      .upsert({ key: 'notification_settings', value: settings }, { onConflict: 'key' })

    invalidateNotifSettingsCache()

    res.json({ data: settings })
  } catch (err) {
    next(err)
  }
})

export default router
