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

    // Leads die dieser User konvertiert/verloren hat (letzte 90 Tage)
    let leadsQuery = supabase
      .from('leads')
      .select('id, status, source, value, created_at, updated_at, contact:contacts(first_name, last_name, company, phone)')
      .eq('assigned_to', userId)
      .in('status', ['CONVERTED', 'LOST'])
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (fromDate) leadsQuery = leadsQuery.gte('updated_at', fromDate)
    if (toDate) leadsQuery = leadsQuery.lte('updated_at', toDate)

    const { data: leads, error: lErr } = await leadsQuery
    if (lErr) throw new AppError(lErr.message, 500)

    // Termine die dieser User erstellt hat
    let apptsQuery = supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time, appointment_type, created_at, contact:contacts(first_name, last_name, company, phone)')
      .eq('assigned_to', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (fromDate) apptsQuery = apptsQuery.gte('created_at', fromDate)
    if (toDate) apptsQuery = apptsQuery.lte('created_at', toDate)

    const { data: appointments, error: aErr } = await apptsQuery
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
