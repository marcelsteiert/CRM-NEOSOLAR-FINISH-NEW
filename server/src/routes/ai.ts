import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'
import {
  generateCompletion,
  buildLeadSummaryPrompt,
  buildDealSummaryPrompt,
  buildContactSummaryPrompt,
  buildBriefingPrompt,
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
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    next(err)
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
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    next(err)
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
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    next(err)
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
    if (err.message?.includes('API-Key') || err.message?.includes('deaktiviert')) {
      return res.json({ data: { summary: null, error: err.message } })
    }
    next(err)
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
