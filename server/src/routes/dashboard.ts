import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { getOwnerFilter } from '../lib/userFilter.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/stats
// ---------------------------------------------------------------------------

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Per-User Filter: Nicht-Admins sehen nur eigene Daten
    const ownerFilter = getOwnerFilter(req)
    const userFilter = (req.query.assignedTo as string) || ownerFilter || null

    // Deals stats
    let dealsQuery = supabase.from('deals').select('*').is('deleted_at', null)
    if (userFilter) dealsQuery = dealsQuery.eq('assigned_to', userFilter)
    const { data: deals } = await dealsQuery
    const allDeals = deals ?? []

    const openDeals = allDeals.filter((d: any) => !['GEWONNEN', 'VERLOREN'].includes(d.stage))
    const wonDeals = allDeals.filter((d: any) => d.stage === 'GEWONNEN')
    const lostDeals = allDeals.filter((d: any) => d.stage === 'VERLOREN')
    const pipelineValue = openDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
    const weightedPipelineValue = openDeals.reduce((s: number, d: any) => s + ((d.value ?? 0) * ((d.win_probability ?? 50) / 100)), 0)
    const totalValue = allDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
    const avgDealValue = allDeals.length > 0 ? Math.round(totalValue / allDeals.length) : 0
    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 0

    // Stage-Aggregation
    const stages: Record<string, { count: number; value: number }> = {}
    for (const d of allDeals) {
      const stage = (d as any).stage ?? 'UNBEKANNT'
      if (!stages[stage]) stages[stage] = { count: 0, value: 0 }
      stages[stage].count++
      stages[stage].value += (d as any).value ?? 0
    }

    // Appointments stats
    let apptQuery = supabase.from('appointments').select('*').is('deleted_at', null)
    if (userFilter) apptQuery = apptQuery.eq('assigned_to', userFilter)
    const { data: appointments } = await apptQuery
    const allAppts = appointments ?? []

    const now = new Date()
    const upcoming = allAppts.filter((a: any) =>
      ['GEPLANT', 'BESTAETIGT'].includes(a.status) && a.appointment_date && new Date(a.appointment_date) >= now
    ).length
    const completedAppts = allAppts.filter((a: any) => a.status === 'DURCHGEFUEHRT').length
    const cancelledAppts = allAppts.filter((a: any) => a.status === 'ABGESAGT').length
    const apptTotalValue = allAppts.reduce((s: number, a: any) => s + (a.value ?? 0), 0)

    // Status-Aggregation fuer Appointments
    const apptStatuses: Record<string, number> = {}
    for (const a of allAppts) {
      const st = (a as any).status ?? 'UNBEKANNT'
      apptStatuses[st] = (apptStatuses[st] ?? 0) + 1
    }

    // Tasks stats
    let tasksQuery = supabase.from('tasks').select('*').is('deleted_at', null)
    if (userFilter) tasksQuery = tasksQuery.eq('assigned_to', userFilter)
    const { data: tasks } = await tasksQuery
    const allTasks = tasks ?? []

    const openTasks = allTasks.filter((t: any) => t.status === 'OFFEN').length
    const inProgress = allTasks.filter((t: any) => t.status === 'IN_BEARBEITUNG').length
    const completedTasks = allTasks.filter((t: any) => t.status === 'ERLEDIGT').length
    const overdue = allTasks.filter(
      (t: any) => t.status !== 'ERLEDIGT' && t.due_date && new Date(t.due_date) < now
    ).length

    res.json({
      data: {
        deals: {
          totalDeals: allDeals.length,
          totalValue,
          pipelineValue,
          weightedPipelineValue: Math.round(weightedPipelineValue),
          stages,
          avgDealValue,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          winRate,
        },
        appointments: {
          total: allAppts.length,
          upcoming,
          totalValue: apptTotalValue,
          statuses: apptStatuses,
          completed: completedAppts,
          cancelled: cancelledAppts,
          checklistProgress: 0,
        },
        tasks: {
          open: openTasks,
          inProgress,
          completed: completedTasks,
          overdue,
          total: allTasks.length,
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/monthly
// ---------------------------------------------------------------------------

router.get('/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerFilter = getOwnerFilter(req)
    const userFilter = (req.query.assignedTo as string) || ownerFilter || null

    let dealsQuery = supabase.from('deals').select('*').is('deleted_at', null)
    if (userFilter) dealsQuery = dealsQuery.eq('assigned_to', userFilter)
    const { data: deals } = await dealsQuery

    let apptQuery = supabase.from('appointments').select('*').is('deleted_at', null)
    if (userFilter) apptQuery = apptQuery.eq('assigned_to', userFilter)
    const { data: appointments } = await apptQuery

    const allDeals = deals ?? []
    const allAppts = appointments ?? []

    const months: any[] = []
    const now = new Date()
    const monthNames = ['Jan', 'Feb', 'Maer', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`

      const wonInMonth = allDeals.filter((deal: any) => {
        if (deal.stage !== 'GEWONNEN' || !deal.closed_at) return false
        const closed = new Date(deal.closed_at)
        return closed.getFullYear() === d.getFullYear() && closed.getMonth() === d.getMonth()
      })

      const lostInMonth = allDeals.filter((deal: any) => {
        if (deal.stage !== 'VERLOREN' || !deal.closed_at) return false
        const closed = new Date(deal.closed_at)
        return closed.getFullYear() === d.getFullYear() && closed.getMonth() === d.getMonth()
      })

      const wonValue = wonInMonth.reduce((s: number, deal: any) => s + (deal.value ?? 0), 0)

      const appointmentsInMonth = allAppts.filter((a: any) => {
        if (!a.appointment_date) return false
        const ad = new Date(a.appointment_date)
        return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth()
      })

      const completedInMonth = appointmentsInMonth.filter((a: any) => a.status === 'DURCHGEFUEHRT')

      months.push({
        month: key,
        label,
        wonDeals: wonInMonth.length,
        wonValue,
        lostDeals: lostInMonth.length,
        totalAppointments: appointmentsInMonth.length,
        completedAppointments: completedInMonth.length,
        provision: Math.round(wonValue * 0.05 * 100) / 100,
      })
    }

    res.json({ data: months })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/dashboard/provision
// ---------------------------------------------------------------------------

router.get('/provision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month } = req.query

    const [dealsRes, usersRes] = await Promise.all([
      supabase.from('deals').select('*').is('deleted_at', null),
      supabase.from('users').select('*'),
    ])

    const allDeals = dealsRes.data ?? []
    const allUsers = usersRes.data ?? []

    const targetMonth = typeof month === 'string' ? month : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const [yearStr, monthStr] = targetMonth.split('-')
    const targetYear = parseInt(yearStr, 10)
    const targetMon = parseInt(monthStr, 10) - 1

    const wonDeals = allDeals.filter((deal: any) => {
      if (deal.stage !== 'GEWONNEN' || !deal.closed_at) return false
      const closed = new Date(deal.closed_at)
      return closed.getFullYear() === targetYear && closed.getMonth() === targetMon
    })

    const byUser: Record<string, { deals: any[]; totalValue: number; provision: number }> = {}

    for (const deal of wonDeals) {
      const userId = (deal as any).assigned_to || 'unassigned'
      if (!byUser[userId]) byUser[userId] = { deals: [], totalValue: 0, provision: 0 }
      byUser[userId].deals.push({
        id: (deal as any).id,
        title: (deal as any).title,
        value: (deal as any).value ?? 0,
        closedAt: (deal as any).closed_at,
      })
      byUser[userId].totalValue += (deal as any).value ?? 0
    }

    for (const userId of Object.keys(byUser)) {
      byUser[userId].provision = Math.round(byUser[userId].totalValue * 0.05 * 100) / 100
    }

    const provisions = Object.entries(byUser).map(([userId, data]) => {
      const user = allUsers.find((u: any) => u.id === userId)
      return {
        userId,
        userName: user ? `${user.first_name} ${user.last_name}` : 'Unbekannt',
        userRole: user ? user.role : '',
        deals: data.deals,
        totalValue: data.totalValue,
        provisionRate: 0.05,
        provision: data.provision,
      }
    })

    const totalValue = provisions.reduce((s, p) => s + p.totalValue, 0)
    const totalProvision = provisions.reduce((s, p) => s + p.provision, 0)

    res.json({
      data: {
        month: targetMonth,
        provisions,
        summary: { totalValue, totalProvision, totalDeals: wonDeals.length },
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
