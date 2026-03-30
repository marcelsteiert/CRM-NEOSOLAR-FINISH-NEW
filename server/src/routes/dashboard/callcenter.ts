import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'

const router = Router()

// GET /api/v1/dashboard/callcenter – Callcenter-Statistiken
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query
    const fromDate = from && typeof from === 'string' ? from : null
    const toDate = to && typeof to === 'string' ? to : null

    // 1) Lead-Stats pro User (Converted, Lost, Active)
    const { data: leadStats, error: lErr } = await supabase.rpc('callcenter_lead_stats', {
      p_from: fromDate,
      p_to: toDate,
    })
    if (lErr) throw new AppError(lErr.message, 500)

    // 2) Termin-Stats pro User
    const { data: apptStats, error: aErr } = await supabase.rpc('callcenter_appointment_stats', {
      p_from: fromDate,
      p_to: toDate,
    })
    if (aErr) throw new AppError(aErr.message, 500)

    // 3) Tägliche Aktivität (letzte 30 Tage)
    const { data: dailyStats, error: dErr } = await supabase.rpc('callcenter_daily_stats', {
      p_from: fromDate,
      p_to: toDate,
    })
    if (dErr) throw new AppError(dErr.message, 500)

    res.json({
      data: {
        leadStats: leadStats ?? [],
        appointmentStats: apptStats ?? [],
        dailyStats: dailyStats ?? [],
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/dashboard/callcenter/user/:userId – Detail für einen User
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params
    const { from, to } = req.query
    const fromDate = from && typeof from === 'string' ? from : null
    const toDate = to && typeof to === 'string' ? to : null

    // Call-Logs dieses Users → Lead-IDs wo er aktiv war
    let callQuery = supabase
      .from('call_logs')
      .select('lead_id, result, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (fromDate) callQuery = callQuery.gte('created_at', fromDate)
    if (toDate) callQuery = callQuery.lte('created_at', toDate)
    const { data: callLogs } = await callQuery

    // Lead-IDs aus Call-Logs + assigned_to
    const callLeadIds = [...new Set((callLogs ?? []).map((c: any) => c.lead_id))]

    // Leads die dieser User bearbeitet hat (via Call-Log ODER assigned_to)
    let leads: any[] = []
    if (callLeadIds.length > 0) {
      const { data: callLeads } = await supabase
        .from('leads')
        .select('id, status, source, value, created_at, updated_at, contact:contacts(first_name, last_name, company, phone)')
        .in('id', callLeadIds)
        .in('status', ['CONVERTED', 'LOST'])
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(100)
      leads = callLeads ?? []
    }
    // Fallback: auch assigned_to Leads die nicht in Call-Logs sind
    const { data: assignedLeads } = await supabase
      .from('leads')
      .select('id, status, source, value, created_at, updated_at, contact:contacts(first_name, last_name, company, phone)')
      .eq('assigned_to', userId)
      .in('status', ['CONVERTED', 'LOST'])
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50)
    const existingIds = new Set(leads.map((l: any) => l.id))
    for (const l of assignedLeads ?? []) {
      if (!existingIds.has(l.id)) leads.push(l)
    }

    // Termine die dieser User ERSTELLT hat (created_by), nicht zugewiesen bekommen
    const { data: appointments, error: aErr } = await supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time, appointment_type, created_at, assigned_to, contact:contacts(first_name, last_name, company, phone)')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)
    if (aErr) throw new AppError(aErr.message, 500)

    // Tägliche Stats für diesen User
    const { data: daily, error: dErr } = await supabase.rpc('callcenter_user_daily', {
      p_user_id: userId,
      p_from: fromDate,
      p_to: toDate,
    })

    res.json({
      data: {
        leads: leads ?? [],
        appointments: appointments ?? [],
        daily: daily ?? [],
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
