import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase.js'

// ── Types ──

export interface AiSettings {
  enabled: boolean
  model: string
  language: string
  maxTokens: number
  systemPrompt: string
  apiKey: string
  features: {
    leadSummary: boolean
    dealAnalysis: boolean
    emailDraft: boolean
  }
}

interface CompletionResult {
  text: string
  model: string
  tokensUsed: number
  durationMs: number
}

const DEFAULT_SETTINGS: AiSettings = {
  enabled: true,
  model: 'claude-sonnet-4-6',
  language: 'de',
  maxTokens: 2048,
  systemPrompt: 'Du bist ein Assistent fuer ein Schweizer Solar-Unternehmen (NEOSOLAR AG). Antworte immer auf Deutsch und beziehe dich auf den Schweizer PV-Markt. Sei praezise und konkret.',
  apiKey: '',
  features: {
    leadSummary: true,
    dealAnalysis: true,
    emailDraft: false,
  },
}

// ── Settings (Supabase-persisted) ──

export async function getAiSettings(): Promise<AiSettings> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'ai_settings')
    .single()

  if (data?.value) {
    return { ...DEFAULT_SETTINGS, ...data.value }
  }
  return { ...DEFAULT_SETTINGS }
}

export async function saveAiSettings(settings: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getAiSettings()
  const updated = {
    ...current,
    ...settings,
    features: { ...current.features, ...(settings.features || {}) },
  }

  await supabase
    .from('settings')
    .upsert({ key: 'ai_settings', value: updated }, { onConflict: 'key' })

  return updated
}

// ── Completion ──

export async function generateCompletion(prompt: string, options?: { maxTokens?: number }): Promise<CompletionResult> {
  const settings = await getAiSettings()

  if (!settings.enabled) {
    throw new Error('KI-Funktionen sind deaktiviert')
  }
  if (!settings.apiKey) {
    throw new Error('Kein API-Key konfiguriert. Bitte unter Admin > KI-Einstellungen hinterlegen.')
  }

  const client = new Anthropic({ apiKey: settings.apiKey })
  const start = Date.now()

  const response = await client.messages.create({
    model: settings.model,
    max_tokens: options?.maxTokens || settings.maxTokens,
    system: settings.systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const durationMs = Date.now() - start
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  return {
    text,
    model: settings.model,
    tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    durationMs,
  }
}

// ── Prompt Builders ──

export function buildLeadSummaryPrompt(lead: any, contact: any, activities: any[], notes: any[]): string {
  const contactInfo = contact
    ? `Kontakt: ${contact.first_name} ${contact.last_name}, ${contact.email || 'keine E-Mail'}, ${contact.phone || 'kein Telefon'}, Firma: ${contact.company || 'k.A.'}, Adresse: ${contact.address || 'k.A.'}`
    : 'Kein Kontakt verknuepft'

  const leadInfo = `Lead: "${lead.title}", Status: ${lead.status}, Quelle: ${lead.source || 'k.A.'}, Wert: CHF ${lead.value ?? 0}, Erstellt: ${lead.created_at}`

  const activityList = activities.length > 0
    ? activities.slice(0, 10).map((a: any) => `- ${a.type}: ${a.text || a.description || 'k.A.'} (${a.created_at})`).join('\n')
    : 'Keine Aktivitaeten'

  const leadNotes = lead.notes ? `Notizen: ${lead.notes}` : 'Keine Notizen'

  return `Erstelle eine kurze, praegnante Zusammenfassung dieses Leads fuer einen Vertriebsmitarbeiter.

${contactInfo}
${leadInfo}
${leadNotes}

Aktivitaeten:
${activityList}

Fasse zusammen: Wer ist der Kunde, was will er, wie ist der aktuelle Stand, und was sollte als naechstes getan werden? Maximal 4-5 Saetze.`
}

export function buildDealSummaryPrompt(deal: any, contact: any, activities: any[]): string {
  const contactInfo = contact
    ? `Kontakt: ${contact.first_name} ${contact.last_name}, ${contact.company || 'Privat'}`
    : 'Kein Kontakt'

  const dealInfo = `Angebot: "${deal.title}", Phase: ${deal.stage}, Wert: CHF ${deal.value ?? 0}, Win-Probability: ${deal.win_probability ?? 50}%, Erstellt: ${deal.created_at}, Follow-Up: ${deal.follow_up_date || 'keins'}`

  const activityList = activities.length > 0
    ? activities.slice(0, 10).map((a: any) => `- ${a.type}: ${a.text || a.description || 'k.A.'} (${a.created_at})`).join('\n')
    : 'Keine Aktivitaeten'

  return `Erstelle eine Analyse dieses Angebots fuer den Vertrieb.

${contactInfo}
${dealInfo}

Aktivitaeten:
${activityList}

Bitte analysiere: Aktuelle Situation, Staerken/Risiken, empfohlene naechste Schritte, und eine Einschaetzung der Abschlusswahrscheinlichkeit. Maximal 5-6 Saetze.`
}

export function buildContactSummaryPrompt(contact: any, leads: any[], deals: any[], appointments: any[], projects: any[]): string {
  const contactInfo = `${contact.first_name} ${contact.last_name}, ${contact.email || ''}, ${contact.phone || ''}, Firma: ${contact.company || 'Privat'}, Adresse: ${contact.address || 'k.A.'}`

  const leadList = leads.length > 0
    ? leads.map((l: any) => `- "${l.title}" (${l.status}, CHF ${l.value ?? 0})`).join('\n')
    : 'Keine Leads'

  const dealList = deals.length > 0
    ? deals.map((d: any) => `- "${d.title}" (${d.stage}, CHF ${d.value ?? 0})`).join('\n')
    : 'Keine Angebote'

  const apptList = appointments.length > 0
    ? appointments.map((a: any) => `- ${a.type}: ${a.appointment_date} (${a.status})`).join('\n')
    : 'Keine Termine'

  const projectList = projects.length > 0
    ? projects.map((p: any) => `- "${p.title}" (${p.status})`).join('\n')
    : 'Keine Projekte'

  return `Erstelle eine Gesamt-Zusammenfassung dieses Kontakts ueber alle Pipeline-Phasen hinweg.

Kontakt: ${contactInfo}

Leads:
${leadList}

Angebote:
${dealList}

Termine:
${apptList}

Projekte:
${projectList}

Fasse die gesamte Kundenbeziehung zusammen: Historie, aktueller Stand, Gesamtwert, und empfohlene naechste Schritte. Maximal 6-8 Saetze.`
}

export function buildBriefingPrompt(stats: any, tasks: any[], followUps: any[], appointments: any[]): string {
  const today = new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const taskList = tasks.length > 0
    ? tasks.slice(0, 5).map((t: any) => `- ${t.title} (${t.status}, Faellig: ${t.due_date || 'offen'})`).join('\n')
    : 'Keine offenen Aufgaben'

  const followUpList = followUps.length > 0
    ? followUps.slice(0, 5).map((f: any) => `- "${f.title}" (CHF ${f.value ?? 0}, Follow-Up: ${f.follow_up_date})`).join('\n')
    : 'Keine Follow-Ups faellig'

  const apptList = appointments.length > 0
    ? appointments.slice(0, 5).map((a: any) => `- ${a.type}: ${a.appointment_date} (${a.location || 'Online'})`).join('\n')
    : 'Keine Termine heute'

  return `Erstelle ein kurzes Tages-Briefing fuer einen Vertriebsmitarbeiter bei NEOSOLAR AG (Photovoltaik, Schweiz).

Datum: ${today}

Pipeline-Statistiken:
- Offene Angebote: ${stats.deals?.totalDeals ?? 0} (Wert: CHF ${stats.deals?.pipelineValue ?? 0})
- Gewonnene Deals: ${stats.deals?.wonDeals ?? 0}
- Win-Rate: ${stats.deals?.winRate ?? 0}%
- Offene Aufgaben: ${stats.tasks?.open ?? 0} (${stats.tasks?.overdue ?? 0} ueberfaellig)
- Termine heute: ${appointments.length}

Offene Aufgaben:
${taskList}

Faellige Follow-Ups:
${followUpList}

Heutige Termine:
${apptList}

Schreibe ein motivierendes, konkretes Briefing: Was steht heute an, worauf sollte der Fokus liegen, welche Prioritaeten. Maximal 4-5 Saetze. Beginne mit einer Begruessung.`
}

// ── E-Mail Prompts ──

export function buildEmailDraftPrompt(context: {
  contactName: string
  contactCompany?: string
  entityType: string
  entityTitle: string
  entityStatus: string
  entityValue?: number
  activities: any[]
  purpose?: string
  senderName: string
}): string {
  const activityList = context.activities.length > 0
    ? context.activities.slice(0, 5).map((a: any) => `- ${a.type}: ${a.text || a.description || 'k.A.'} (${a.created_at})`).join('\n')
    : 'Keine bisherigen Aktivitaeten'

  return `Schreibe eine professionelle E-Mail fuer einen Vertriebsmitarbeiter der NEOSOLAR AG (Photovoltaik, Schweiz).

Empfaenger: ${context.contactName}${context.contactCompany ? ` (${context.contactCompany})` : ''}
Bezug: ${context.entityType} "${context.entityTitle}" – Status: ${context.entityStatus}${context.entityValue ? `, Wert: CHF ${context.entityValue}` : ''}
Absender: ${context.senderName}, NEOSOLAR AG
${context.purpose ? `Zweck: ${context.purpose}` : ''}

Bisherige Interaktionen:
${activityList}

Regeln:
- Foermliche Anrede: "Guten Tag ${context.contactName.split(' ')[0]}"
- Professionell, freundlich, auf den Punkt
- Schluss mit: "Freundliche Gruesse" + Absender-Name + NEOSOLAR AG
- Nur den E-Mail-Body (kein Betreff)
- Keine Platzhalter oder [Eckige Klammern]
- Maximal 6-8 Saetze
- Sprache: Schweizer Hochdeutsch`
}

export function buildEmailReplyPrompt(context: {
  originalSubject: string
  originalBody: string
  originalSender: string
  contactName: string
  entityType?: string
  entityTitle?: string
  senderName: string
}): string {
  // Originaltext kuerzen auf max 500 Zeichen
  const truncBody = context.originalBody.length > 500
    ? context.originalBody.substring(0, 500) + '...'
    : context.originalBody

  return `Schreibe eine professionelle Antwort auf folgende E-Mail fuer einen Vertriebsmitarbeiter der NEOSOLAR AG.

Original von ${context.originalSender}:
Betreff: ${context.originalSubject}
"${truncBody}"

${context.entityType ? `Bezug: ${context.entityType} "${context.entityTitle}"` : ''}
Antwort-Absender: ${context.senderName}, NEOSOLAR AG

Regeln:
- Gehe konkret auf den Inhalt der E-Mail ein
- Professionell, loesungsorientiert, freundlich
- Foermliche Anrede: "Guten Tag ${context.contactName.split(' ')[0]}"
- Schluss mit: "Freundliche Gruesse" + ${context.senderName} + NEOSOLAR AG
- Nur den Antwort-Text (kein Betreff, kein Original zitieren)
- Maximal 5-7 Saetze
- Sprache: Schweizer Hochdeutsch`
}

export function buildFollowUpCheckPrompt(overdueItems: any[]): string {
  const items = overdueItems.slice(0, 10).map((item: any) =>
    `- ${item.type}: "${item.title}" – Kontakt: ${item.contactName}, Faellig seit: ${item.dueDate}, Wert: CHF ${item.value ?? 0}`
  ).join('\n')

  return `Du bist der KI-Assistent fuer NEOSOLAR AG. Hier sind ueberfaellige Follow-Ups die dringend bearbeitet werden muessen:

${items}

Erstelle fuer jeden Eintrag eine kurze, konkrete Handlungsempfehlung (1 Satz pro Eintrag). Priorisiere nach Wert und Dringlichkeit. Beginne mit dem wichtigsten.`
}
