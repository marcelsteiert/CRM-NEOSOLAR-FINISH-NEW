import { supabase } from './supabase.js'

// ── Types ──

export type NotificationType =
  | 'LEAD_CREATED'
  | 'LEAD_ASSIGNED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMED'
  | 'DEAL_STATUS_CHANGE'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'FOLLOW_UP_DUE'
  | 'TASK_ASSIGNED'
  | 'TASK_OVERDUE'
  | 'PROJEKT_UPDATE'
  | 'DOCUMENT_UPLOADED'
  | 'SYSTEM'

export type ReferenceType = 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT' | 'TASK' | 'SYSTEM'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message?: string
  referenceType?: ReferenceType
  referenceId?: string
  referenceTitle?: string
}

// ── Notification Settings Cache ──

interface NotifSetting {
  event: string
  enabled: boolean
  channels: string[]
}

let settingsCache: NotifSetting[] | null = null
let settingsCacheTime = 0
const CACHE_TTL = 60_000 // 1 Minute

async function getNotifSettings(): Promise<NotifSetting[]> {
  if (settingsCache && Date.now() - settingsCacheTime < CACHE_TTL) {
    return settingsCache
  }

  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'notification_settings')
    .single()

  if (data?.value && Array.isArray(data.value)) {
    settingsCache = data.value as NotifSetting[]
  } else {
    // Defaults – alles aktiv
    settingsCache = null
  }
  settingsCacheTime = Date.now()
  return settingsCache ?? []
}

async function isEventEnabled(eventType: string): Promise<boolean> {
  const settings = await getNotifSettings()
  if (settings.length === 0) return true // Kein Setting = aktiv
  const setting = settings.find((s) => s.event === eventType)
  return setting ? setting.enabled : true
}

// ── Invalidate cache (nach Admin-Update) ──

export function invalidateNotifSettingsCache() {
  settingsCache = null
  settingsCacheTime = 0
}

// ── Create Notification ──

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const enabled = await isEventEnabled(params.type)
    if (!enabled) return

    await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      reference_title: params.referenceTitle ?? null,
    })
  } catch (err) {
    console.error('[NotificationService] Fehler:', err)
  }
}

// ── Create Notification for Multiple Users ──

export async function createNotificationForUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  try {
    const enabled = await isEventEnabled(params.type)
    if (!enabled) return

    const rows = userIds.map((userId) => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      message: params.message ?? null,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      reference_title: params.referenceTitle ?? null,
    }))

    if (rows.length > 0) {
      await supabase.from('notifications').insert(rows)
    }
  } catch (err) {
    console.error('[NotificationService] Fehler (batch):', err)
  }
}

// ── Helper: Get all admin user IDs ──

export async function getAdminUserIds(): Promise<string[]> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .in('role', ['ADMIN', 'GL', 'GESCHAEFTSLEITUNG'])
    .eq('is_active', true)

  return (data ?? []).map((u: any) => u.id)
}
