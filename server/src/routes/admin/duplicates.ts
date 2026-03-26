import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'
import { logAudit, getAuditUserId } from '../../lib/auditService.js'

const router = Router()

// ── GET /api/v1/admin/duplicates – Duplikate finden ──
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))

    // Kontakte mit gleicher E-Mail finden (Duplikate)
    const { data: dupEmails, error: dupErr } = await supabase
      .rpc('find_duplicate_contacts', { result_limit: limit })

    if (dupErr) {
      // Fallback: manuelle Query wenn RPC nicht existiert
      const { data: rawDups, error: rawErr } = await supabase
        .from('contacts')
        .select('email')
        .not('email', 'is', null)
        .not('email', 'eq', '')
        .not('email', 'eq', '--')
        .is('deleted_at', null)

      if (rawErr) throw new AppError(rawErr.message, 500)

      // Duplikate zählen
      const emailCount: Record<string, number> = {}
      for (const c of rawDups ?? []) {
        const e = (c.email as string).toLowerCase().trim()
        emailCount[e] = (emailCount[e] || 0) + 1
      }

      const dupEmailList = Object.entries(emailCount)
        .filter(([, cnt]) => cnt > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([email]) => email)

      if (dupEmailList.length === 0) {
        return res.json({ data: [], total: 0 })
      }

      // Details für jede Duplikat-Gruppe laden
      const groups = []
      for (const email of dupEmailList) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, company, address, created_at')
          .ilike('email', email)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })

        if (!contacts || contacts.length < 2) continue

        // Verknüpfte Leads pro Kontakt zählen
        const contactIds = contacts.map((c: any) => c.id)
        const { data: leads } = await supabase
          .from('leads')
          .select('id, contact_id')
          .in('contact_id', contactIds)
          .is('deleted_at', null)

        const leadCountMap: Record<string, number> = {}
        for (const l of leads ?? []) {
          leadCountMap[l.contact_id] = (leadCountMap[l.contact_id] || 0) + 1
        }

        groups.push({
          email,
          contacts: contacts.map((c: any) => ({
            id: c.id,
            firstName: c.first_name,
            lastName: c.last_name,
            email: c.email,
            phone: c.phone,
            company: c.company,
            address: c.address,
            createdAt: c.created_at,
            leadCount: leadCountMap[c.id] || 0,
          })),
        })

        if (groups.length >= limit) break
      }

      const totalDups = Object.values(emailCount).filter(v => v > 1).length
      return res.json({ data: groups, total: totalDups })
    }

    res.json({ data: dupEmails ?? [], total: (dupEmails ?? []).length })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/admin/duplicates/merge – Duplikate zusammenführen ──
// Behält den "keeper" Kontakt und verschiebt alle Verknüpfungen der "remove" Kontakte dorthin
router.post('/merge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keepId, removeIds } = req.body as { keepId: string; removeIds: string[] }

    if (!keepId || !removeIds?.length) {
      throw new AppError('keepId und removeIds sind erforderlich', 400)
    }

    // Prüfen ob Keeper existiert
    const { data: keeper } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('id', keepId)
      .single()

    if (!keeper) throw new AppError('Keeper-Kontakt nicht gefunden', 404)

    let movedLeads = 0
    let movedDeals = 0
    let movedAppointments = 0
    let movedProjects = 0
    let movedTasks = 0
    let movedDocuments = 0
    let movedActivities = 0

    for (const removeId of removeIds) {
      // Alle Verknüpfungen auf keeper umhängen
      const [leads, deals, appts, projs, tasks, docs, acts] = await Promise.all([
        supabase.from('leads').update({ contact_id: keepId }).eq('contact_id', removeId).is('deleted_at', null).select('id'),
        supabase.from('deals').update({ contact_id: keepId }).eq('contact_id', removeId).is('deleted_at', null).select('id'),
        supabase.from('appointments').update({ contact_id: keepId }).eq('contact_id', removeId).is('deleted_at', null).select('id'),
        supabase.from('projects').update({ contact_id: keepId }).eq('contact_id', removeId).is('deleted_at', null).select('id'),
        supabase.from('tasks').update({ contact_id: keepId }).eq('contact_id', removeId).select('id'),
        supabase.from('documents').update({ contact_id: keepId }).eq('contact_id', removeId).select('id'),
        supabase.from('activities').update({ contact_id: keepId }).eq('contact_id', removeId).select('id'),
      ])

      movedLeads += (leads.data?.length ?? 0)
      movedDeals += (deals.data?.length ?? 0)
      movedAppointments += (appts.data?.length ?? 0)
      movedProjects += (projs.data?.length ?? 0)
      movedTasks += (tasks.data?.length ?? 0)
      movedDocuments += (docs.data?.length ?? 0)
      movedActivities += (acts.data?.length ?? 0)

      // Duplikat-Kontakt soft-deleten
      await supabase.from('contacts').update({ deleted_at: new Date().toISOString() }).eq('id', removeId)
    }

    logAudit({
      userId: getAuditUserId(req),
      action: 'DELETE',
      entity: 'CONTACT',
      entityId: keepId,
      description: `${removeIds.length} Duplikat(e) zusammengeführt → ${keeper.first_name} ${keeper.last_name} (${keeper.email}). Verschoben: ${movedLeads} Leads, ${movedDeals} Deals, ${movedAppointments} Termine, ${movedProjects} Projekte`,
    })

    res.json({
      data: {
        keepId,
        removedCount: removeIds.length,
        moved: { leads: movedLeads, deals: movedDeals, appointments: movedAppointments, projects: movedProjects, tasks: movedTasks, documents: movedDocuments, activities: movedActivities },
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
