// Outlook Sync Engine – Email + Kalender Delta Sync + Contact Matching
import { supabase } from './supabase.js'
import { graphGet } from './outlookClient.js'

// ── Email Sync mit Delta Queries ──

interface GraphMessage {
  id: string
  conversationId: string
  internetMessageId: string
  subject: string
  bodyPreview: string
  body: { contentType: string; content: string }
  sender: { emailAddress: { name: string; address: string } }
  toRecipients: { emailAddress: { name: string; address: string } }[]
  ccRecipients: { emailAddress: { name: string; address: string } }[]
  bccRecipients: { emailAddress: { name: string; address: string } }[]
  receivedDateTime: string
  sentDateTime: string
  isRead: boolean
  isDraft: boolean
  hasAttachments: boolean
  importance: string
  parentFolderId: string
  categories: string[]
}

interface DeltaResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

const EMAIL_SELECT = [
  'id', 'conversationId', 'internetMessageId', 'subject', 'bodyPreview',
  'body', 'sender', 'toRecipients', 'ccRecipients', 'bccRecipients',
  'receivedDateTime', 'sentDateTime', 'isRead', 'isDraft',
  'hasAttachments', 'importance', 'parentFolderId', 'categories',
].join(',')

export async function syncEmails(connectionId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = []
  let synced = 0

  // Sync-Log starten
  const { data: logEntry } = await supabase
    .from('outlook_sync_log')
    .insert({ connection_id: connectionId, sync_type: 'email', status: 'running' })
    .select()
    .single()

  const startTime = Date.now()

  try {
    // Delta Link holen (wenn vorhanden)
    const { data: conn } = await supabase
      .from('outlook_connections')
      .select('delta_link')
      .eq('id', connectionId)
      .single()

    let url = conn?.delta_link || `/me/mailFolders/inbox/messages/delta?$select=${EMAIL_SELECT}&$top=50`
    let deltaLink: string | null = null

    // Alle Seiten abrufen
    while (url) {
      const isFullUrl = url.startsWith('https://')
      let data: DeltaResponse<GraphMessage>

      if (isFullUrl) {
        // Delta/Next Link ist volle URL – direkt abrufen
        const token = await getTokenForConnection(connectionId)
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error(`Delta sync failed: ${res.statusText}`)
        data = await res.json()
      } else {
        data = await graphGet<DeltaResponse<GraphMessage>>(connectionId, url)
      }

      // Messages verarbeiten
      for (const msg of data.value) {
        try {
          await upsertEmail(connectionId, msg)
          synced++
        } catch (err: any) {
          errors.push(`Message ${msg.id}: ${err.message}`)
        }
      }

      // Naechste Seite oder Delta Link
      if (data['@odata.nextLink']) {
        url = data['@odata.nextLink']
      } else if (data['@odata.deltaLink']) {
        deltaLink = data['@odata.deltaLink']
        url = ''
      } else {
        url = ''
      }
    }

    // Delta Link speichern
    if (deltaLink) {
      await supabase
        .from('outlook_connections')
        .update({ delta_link: deltaLink, last_sync_at: new Date().toISOString() })
        .eq('id', connectionId)
    }

    // Auto-Matching laufen lassen
    await matchEmailsToContacts(connectionId)

  } catch (err: any) {
    errors.push(err.message)
  }

  // Sync-Log updaten
  const duration = Date.now() - startTime
  if (logEntry) {
    await supabase
      .from('outlook_sync_log')
      .update({
        status: errors.length > 0 ? 'partial' : 'success',
        emails_synced: synced,
        errors,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq('id', logEntry.id)
  }

  return { synced, errors }
}

// ── Email upsert ──

async function upsertEmail(connectionId: string, msg: GraphMessage) {
  const folder = await resolveFolder(connectionId, msg.parentFolderId)

  const emailData = {
    connection_id: connectionId,
    message_id: msg.id,
    conversation_id: msg.conversationId,
    internet_message_id: msg.internetMessageId,
    subject: msg.subject,
    body_preview: msg.bodyPreview,
    body_html: msg.body?.contentType === 'html' ? msg.body.content : null,
    body_text: msg.body?.contentType === 'text' ? msg.body.content : null,
    sender_email: msg.sender?.emailAddress?.address,
    sender_name: msg.sender?.emailAddress?.name,
    to_recipients: msg.toRecipients?.map((r) => ({ name: r.emailAddress.name, email: r.emailAddress.address })) ?? [],
    cc_recipients: msg.ccRecipients?.map((r) => ({ name: r.emailAddress.name, email: r.emailAddress.address })) ?? [],
    bcc_recipients: msg.bccRecipients?.map((r) => ({ name: r.emailAddress.name, email: r.emailAddress.address })) ?? [],
    received_at: msg.receivedDateTime,
    sent_at: msg.sentDateTime,
    is_read: msg.isRead,
    is_draft: msg.isDraft,
    has_attachments: msg.hasAttachments,
    importance: msg.importance,
    folder,
    categories: msg.categories ?? [],
    updated_at: new Date().toISOString(),
  }

  await supabase
    .from('outlook_emails')
    .upsert(emailData, { onConflict: 'connection_id,message_id' })
}

// Folder-ID → lesbarer Name
const folderCache = new Map<string, string>()

async function resolveFolder(connectionId: string, folderId: string): Promise<string> {
  const cacheKey = `${connectionId}:${folderId}`
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)!

  try {
    const folder = await graphGet<{ displayName: string }>(connectionId, `/me/mailFolders/${folderId}`)
    const name = folder.displayName?.toLowerCase() ?? 'unknown'
    folderCache.set(cacheKey, name)
    return name
  } catch {
    return 'inbox'
  }
}

// ── Contact Matching ──

export async function matchEmailsToContacts(connectionId: string) {
  // Ungematchte Emails holen
  const { data: unmatched } = await supabase
    .from('outlook_emails')
    .select('id, sender_email, to_recipients')
    .eq('connection_id', connectionId)
    .eq('is_matched', false)
    .limit(200)

  if (!unmatched || unmatched.length === 0) return

  // Alle Kontakte mit Email laden
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, email')
    .not('email', 'is', null)

  if (!contacts || contacts.length === 0) return

  const emailToContact = new Map<string, string>()
  for (const c of contacts) {
    if (c.email) emailToContact.set(c.email.toLowerCase(), c.id)
  }

  // Matching
  for (const email of unmatched) {
    let contactId: string | null = null

    // Sender pruefen
    if (email.sender_email) {
      contactId = emailToContact.get(email.sender_email.toLowerCase()) ?? null
    }

    // Empfaenger pruefen
    if (!contactId && email.to_recipients) {
      for (const r of email.to_recipients as any[]) {
        const match = emailToContact.get(r.email?.toLowerCase())
        if (match) { contactId = match; break }
      }
    }

    if (contactId) {
      // Kontakt-Verknuepfungen laden (Deals, Leads, Projekte)
      const { data: leads } = await supabase.from('leads').select('id').eq('contact_id', contactId).is('deleted_at', null).limit(1)
      const { data: deals } = await supabase.from('deals').select('id').eq('contact_id', contactId).is('deleted_at', null).limit(1)
      const { data: projects } = await supabase.from('projects').select('id').eq('contact_id', contactId).is('deleted_at', null).limit(1)

      await supabase
        .from('outlook_emails')
        .update({
          contact_id: contactId,
          lead_id: leads?.[0]?.id ?? null,
          deal_id: deals?.[0]?.id ?? null,
          project_id: projects?.[0]?.id ?? null,
          is_matched: true,
          matched_at: new Date().toISOString(),
        })
        .eq('id', email.id)
    }
  }
}

// ── Kalender Sync ──

interface GraphEvent {
  id: string
  iCalUId: string
  subject: string
  body: { contentType: string; content: string }
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  isAllDay: boolean
  location: { displayName: string }
  onlineMeeting: { joinUrl: string } | null
  organizer: { emailAddress: { name: string; address: string } }
  attendees: { emailAddress: { name: string; address: string }; status: { response: string } }[]
  isCancelled: boolean
  recurrence: any
  showAs: string
  responseStatus: { response: string }
}

export async function syncCalendar(connectionId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = []
  let synced = 0

  const { data: conn } = await supabase
    .from('outlook_connections')
    .select('calendar_delta_link')
    .eq('id', connectionId)
    .single()

  const select = 'id,iCalUId,subject,body,start,end,isAllDay,location,onlineMeeting,organizer,attendees,isCancelled,recurrence,showAs,responseStatus'
  let url = conn?.calendar_delta_link || `/me/calendarView/delta?$select=${select}&startDateTime=${getStartOfMonth()}&endDateTime=${getEndOfNextMonth()}`
  let deltaLink: string | null = null

  while (url) {
    const isFullUrl = url.startsWith('https://')
    let data: DeltaResponse<GraphEvent>

    if (isFullUrl) {
      const token = await getTokenForConnection(connectionId)
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Calendar sync failed: ${res.statusText}`)
      data = await res.json()
    } else {
      data = await graphGet<DeltaResponse<GraphEvent>>(connectionId, url)
    }

    for (const evt of data.value) {
      try {
        await upsertCalendarEvent(connectionId, evt)
        synced++
      } catch (err: any) {
        errors.push(`Event ${evt.id}: ${err.message}`)
      }
    }

    if (data['@odata.nextLink']) {
      url = data['@odata.nextLink']
    } else if (data['@odata.deltaLink']) {
      deltaLink = data['@odata.deltaLink']
      url = ''
    } else {
      url = ''
    }
  }

  if (deltaLink) {
    await supabase
      .from('outlook_connections')
      .update({ calendar_delta_link: deltaLink })
      .eq('id', connectionId)
  }

  return { synced, errors }
}

async function upsertCalendarEvent(connectionId: string, evt: GraphEvent) {
  const eventData = {
    connection_id: connectionId,
    event_id: evt.id,
    ical_uid: evt.iCalUId,
    subject: evt.subject,
    body_html: evt.body?.contentType === 'html' ? evt.body.content : null,
    body_text: evt.body?.contentType === 'text' ? evt.body.content : null,
    start_at: evt.start.dateTime,
    end_at: evt.end.dateTime,
    is_all_day: evt.isAllDay,
    location: evt.location?.displayName,
    online_meeting_url: evt.onlineMeeting?.joinUrl,
    organizer_email: evt.organizer?.emailAddress?.address,
    organizer_name: evt.organizer?.emailAddress?.name,
    attendees: evt.attendees?.map((a) => ({
      name: a.emailAddress.name,
      email: a.emailAddress.address,
      response: a.status?.response,
    })) ?? [],
    status: evt.showAs,
    response_status: evt.responseStatus?.response,
    is_cancelled: evt.isCancelled,
    recurrence: evt.recurrence,
    updated_at: new Date().toISOString(),
  }

  await supabase
    .from('outlook_calendar_events')
    .upsert(eventData, { onConflict: 'connection_id,event_id' })
}

// ── Helper ──

async function getTokenForConnection(connectionId: string): Promise<string> {
  // Import dynamisch um circular dependency zu vermeiden
  const { getValidToken } = await import('./outlookClient.js')
  return getValidToken(connectionId)
}

function getStartOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getEndOfNextMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 2, 0)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}
