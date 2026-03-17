import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'
import {
  generateCompletion,
  buildLeadSummaryPrompt,
  buildDealSummaryPrompt,
  buildContactSummaryPrompt,
  buildBriefingPrompt,
  buildEmailDraftPrompt,
  buildEmailReplyPrompt,
  buildFollowUpCheckPrompt,
  getAiSettings,
} from '../lib/aiService.js'
import { getOwnerFilter } from '../lib/userFilter.js'

const router = Router()

// Helper: Save generation to history
async function saveGeneration(entityType: string, entityId: string | null, userId: string, result: string, model: string, tokensUsed: number, durationMs: number, promptSummary?: string) {
  await supabase.from('ai_generations').insert({
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    result,
    model,
    tokens_used: tokensUsed,
    duration_ms: durationMs,
    prompt_summary: promptSummary?.substring(0, 200),
  })
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/lead-summary/:id
// ---------------------------------------------------------------------------
router.post('/lead-summary/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const settings = await getAiSettings()
    if (!settings.features.leadSummary) {
      return res.json({ data: { summary: null, error: 'Lead-Zusammenfassung ist deaktiviert' } })
    }

    const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single()
    if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' })

    const { data: contact } = lead.contact_id
      ? await supabase.from('contacts').select('*').eq('id', lead.contact_id).single()
      : { data: null }

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const prompt = buildLeadSummaryPrompt(lead, contact, activities ?? [], [])
    const completion = await generateCompletion(prompt)

    // Update lead ai_summary
    await supabase.from('leads').update({ ai_summary: completion.text }).eq('id', id)

    await saveGeneration('LEAD', id, (req as any).user?.userId, completion.text, completion.model, completion.tokensUsed, completion.durationMs, `Lead: ${lead.title}`)

    res.json({
      data: {
        summary: completion.text,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        durationMs: completion.durationMs,
      },
    })
  } catch (err: any) {
    console.error('[AI] Lead-Summary Fehler:', err?.message || err)
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    return res.json({ data: { summary: null, error: `KI-Fehler: ${err?.message || 'Unbekannter Fehler'}` } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/deal-summary/:id
// ---------------------------------------------------------------------------
router.post('/deal-summary/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const settings = await getAiSettings()
    if (!settings.features.dealAnalysis) {
      return res.json({ data: { summary: null, error: 'Deal-Analyse ist deaktiviert' } })
    }

    const { data: deal } = await supabase.from('deals').select('*').eq('id', id).single()
    if (!deal) return res.status(404).json({ error: 'Angebot nicht gefunden' })

    const { data: contact } = deal.contact_id
      ? await supabase.from('contacts').select('*').eq('id', deal.contact_id).single()
      : { data: null }

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const prompt = buildDealSummaryPrompt(deal, contact, activities ?? [])
    const completion = await generateCompletion(prompt)

    await supabase.from('deals').update({ ai_summary: completion.text }).eq('id', id)

    await saveGeneration('DEAL', id, (req as any).user?.userId, completion.text, completion.model, completion.tokensUsed, completion.durationMs, `Deal: ${deal.title}`)

    res.json({
      data: {
        summary: completion.text,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        durationMs: completion.durationMs,
      },
    })
  } catch (err: any) {
    console.error('[AI] Deal-Summary Fehler:', err?.message || err)
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    return res.json({ data: { summary: null, error: `KI-Fehler: ${err?.message || 'Unbekannter Fehler'}` } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/contact-summary/:contactId
// ---------------------------------------------------------------------------
router.post('/contact-summary/:contactId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contactId = req.params.contactId as string
    const { data: contact } = await supabase.from('contacts').select('*').eq('id', contactId).single()
    if (!contact) return res.status(404).json({ error: 'Kontakt nicht gefunden' })

    const [leadsRes, dealsRes, apptsRes, projectsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('contact_id', contactId).is('deleted_at', null),
      supabase.from('deals').select('*').eq('contact_id', contactId).is('deleted_at', null),
      supabase.from('appointments').select('*').eq('contact_id', contactId).is('deleted_at', null),
      supabase.from('projects').select('*').eq('contact_id', contactId).is('deleted_at', null),
    ])

    const prompt = buildContactSummaryPrompt(contact, leadsRes.data ?? [], dealsRes.data ?? [], apptsRes.data ?? [], projectsRes.data ?? [])
    const completion = await generateCompletion(prompt)

    await saveGeneration('CONTACT', contactId, (req as any).user?.userId, completion.text, completion.model, completion.tokensUsed, completion.durationMs, `Kontakt: ${contact.first_name} ${contact.last_name}`)

    res.json({
      data: {
        summary: completion.text,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        durationMs: completion.durationMs,
      },
    })
  } catch (err: any) {
    console.error('[AI] Contact-Summary Fehler:', err?.message || err)
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    return res.json({ data: { summary: null, error: `KI-Fehler: ${err?.message || 'Unbekannter Fehler'}` } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/briefing
// ---------------------------------------------------------------------------
router.post('/briefing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerFilter = getOwnerFilter(req)
    const userFilter = ownerFilter || null
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    // Fetch dashboard data
    let dealsQuery = supabase.from('deals').select('*').is('deleted_at', null)
    if (userFilter) dealsQuery = dealsQuery.eq('assigned_to', userFilter)
    const { data: deals } = await dealsQuery

    let tasksQuery = supabase.from('tasks').select('*').is('deleted_at', null).neq('status', 'ERLEDIGT')
    if (userFilter) tasksQuery = tasksQuery.eq('assigned_to', userFilter)
    const { data: tasks } = await tasksQuery

    // Follow-ups faellig
    let followUpQuery = supabase.from('deals').select('*').is('deleted_at', null).lte('follow_up_date', todayEnd).not('stage', 'in', '("GEWONNEN","VERLOREN")')
    if (userFilter) followUpQuery = followUpQuery.eq('assigned_to', userFilter)
    const { data: followUps } = await followUpQuery

    // Heutige Termine
    let apptsQuery = supabase.from('appointments').select('*').is('deleted_at', null).gte('appointment_date', todayStart).lte('appointment_date', todayEnd)
    if (userFilter) apptsQuery = apptsQuery.eq('assigned_to', userFilter)
    const { data: appointments } = await apptsQuery

    const allDeals = deals ?? []
    const openDeals = allDeals.filter((d: any) => !['GEWONNEN', 'VERLOREN'].includes(d.stage))
    const wonDeals = allDeals.filter((d: any) => d.stage === 'GEWONNEN')
    const lostDeals = allDeals.filter((d: any) => d.stage === 'VERLOREN')
    const pipelineValue = openDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 0
    const overdueTasks = (tasks ?? []).filter((t: any) => t.due_date && new Date(t.due_date) < now)

    const stats = {
      deals: {
        totalDeals: openDeals.length,
        pipelineValue,
        wonDeals: wonDeals.length,
        winRate,
      },
      tasks: {
        open: (tasks ?? []).length,
        overdue: overdueTasks.length,
      },
    }

    const prompt = buildBriefingPrompt(stats, tasks ?? [], followUps ?? [], appointments ?? [])
    const completion = await generateCompletion(prompt, { maxTokens: 512 })

    await saveGeneration('BRIEFING', null, (req as any).user?.userId, completion.text, completion.model, completion.tokensUsed, completion.durationMs, 'Tages-Briefing')

    res.json({
      data: {
        summary: completion.text,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        durationMs: completion.durationMs,
      },
    })
  } catch (err: any) {
    console.error('[AI] Briefing Fehler:', err?.message || err)
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    return res.json({ data: { summary: null, error: `KI-Fehler: ${err?.message || 'Unbekannter Fehler'}` } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/email-draft – KI-E-Mail-Entwurf
// ---------------------------------------------------------------------------
router.post('/email-draft', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getAiSettings()
    if (!settings.features.emailDraft) {
      return res.json({ data: { text: null, error: 'E-Mail-Entwurf ist deaktiviert. Aktiviere es unter Admin > KI-Einstellungen.' } })
    }

    const { contactName, contactCompany, entityType, entityTitle, entityStatus, entityValue, entityId, purpose } = req.body
    if (!contactName || !entityType || !entityTitle) {
      return res.status(400).json({ error: 'contactName, entityType und entityTitle sind erforderlich' })
    }

    // Aktivitaeten laden
    const activities: any[] = []
    if (entityId) {
      const col = entityType === 'LEAD' ? 'lead_id' : entityType === 'ANGEBOT' ? 'deal_id' : null
      if (col) {
        const { data } = await supabase.from('activities').select('*').eq(col, entityId).order('created_at', { ascending: false }).limit(5)
        if (data) activities.push(...data)
      }
    }

    const senderName = (req as any).user?.name || 'NEOSOLAR Vertrieb'
    const prompt = buildEmailDraftPrompt({
      contactName,
      contactCompany,
      entityType,
      entityTitle,
      entityStatus,
      entityValue,
      activities,
      purpose,
      senderName,
    })
    const completion = await generateCompletion(prompt, { maxTokens: 1024 })

    await saveGeneration('EMAIL_DRAFT', entityId || null, (req as any).user?.userId, completion.text, completion.model, completion.tokensUsed, completion.durationMs, `E-Mail: ${contactName}`)

    res.json({
      data: {
        text: completion.text,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        durationMs: completion.durationMs,
      },
    })
  } catch (err: any) {
    console.error('[AI] Email-Draft Fehler:', err?.message || err)
    return res.json({ data: { text: null, error: `KI-Fehler: ${err?.message || 'Unbekannter Fehler'}` } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/email-reply – KI-Antwort auf E-Mail
// ---------------------------------------------------------------------------
router.post('/email-reply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getAiSettings()
    if (!settings.features.emailDraft) {
      return res.json({ data: { text: null, error: 'E-Mail-Entwurf ist deaktiviert. Aktiviere es unter Admin > KI-Einstellungen.' } })
    }

    const { originalSubject, originalBody, originalSender, contactName, entityType, entityTitle } = req.body
    if (!originalBody || !contactName) {
      return res.status(400).json({ error: 'originalBody und contactName sind erforderlich' })
    }

    const senderName = (req as any).user?.name || 'NEOSOLAR Vertrieb'
    const prompt = buildEmailReplyPrompt({
      originalSubject: originalSubject || '(Kein Betreff)',
      originalBody,
      originalSender: originalSender || contactName,
      contactName,
      entityType,
      entityTitle,
      senderName,
    })
    const completion = await generateCompletion(prompt, { maxTokens: 1024 })

    await saveGeneration('EMAIL_REPLY', null, (req as any).user?.userId, completion.text, completion.model, completion.tokensUsed, completion.durationMs, `Antwort an: ${contactName}`)

    res.json({
      data: {
        text: completion.text,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        durationMs: completion.durationMs,
      },
    })
  } catch (err: any) {
    console.error('[AI] Email-Reply Fehler:', err?.message || err)
    return res.json({ data: { text: null, error: `KI-Fehler: ${err?.message || 'Unbekannter Fehler'}` } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/follow-up-check – Ueberfaellige Follow-Ups analysieren
// ---------------------------------------------------------------------------
router.post('/follow-up-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerFilter = getOwnerFilter(req)
    const userFilter = ownerFilter || null
    const now = new Date().toISOString()

    // Ueberfaellige Deals mit Follow-Up
    let query = supabase
      .from('deals')
      .select('*, contacts!deals_contact_id_fkey(first_name, last_name)')
      .is('deleted_at', null)
      .lte('follow_up_date', now)
      .not('stage', 'in', '("GEWONNEN","VERLOREN")')
      .order('follow_up_date', { ascending: true })
      .limit(10)
    if (userFilter) query = query.eq('assigned_to', userFilter)

    const { data: deals } = await query

    if (!deals || deals.length === 0) {
      return res.json({ data: { summary: 'Keine ueberfaelligen Follow-Ups. Alles im gruenen Bereich!', items: [] } })
    }

    const overdueItems = deals.map((d: any) => ({
      type: 'Angebot',
      title: d.title,
      contactName: d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : 'Unbekannt',
      dueDate: d.follow_up_date,
      value: d.value,
      notes: d.notes || null,
    }))

    const prompt = buildFollowUpCheckPrompt(overdueItems)
    const completion = await generateCompletion(prompt, { maxTokens: 1024 })

    await saveGeneration('FOLLOW_UP', null, (req as any).user?.userId, completion.text, completion.model, completion.tokensUsed, completion.durationMs, `Follow-Up Check (${overdueItems.length} Items)`)

    res.json({
      data: {
        summary: completion.text,
        items: overdueItems,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        durationMs: completion.durationMs,
      },
    })
  } catch (err: any) {
    console.error('[AI] Follow-Up-Check Fehler:', err?.message || err)
    return res.json({ data: { summary: null, error: `KI-Fehler: ${err?.message || 'Unbekannter Fehler'}` } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/test – Test API connection
// ---------------------------------------------------------------------------
router.post('/test', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const completion = await generateCompletion('Antworte nur mit: "Verbindung erfolgreich. NEOSOLAR KI-System aktiv."', { maxTokens: 64 })
    res.json({ data: { success: true, message: completion.text, model: completion.model } })
  } catch (err: any) {
    res.json({ data: { success: false, message: err.message } })
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/ai/history
// ---------------------------------------------------------------------------
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, page = '1', limit = '20' } = req.query
    const pageNum = parseInt(page as string, 10)
    const pageSize = parseInt(limit as string, 10)
    const offset = (pageNum - 1) * pageSize

    let query = supabase
      .from('ai_generations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (entityType) query = query.eq('entity_type', entityType as string)

    const { data, count } = await query

    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

export default router
