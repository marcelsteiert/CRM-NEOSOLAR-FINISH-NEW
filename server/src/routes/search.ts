import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// ── GET /api/v1/search?q=suchbegriff ──
// Sucht ueber Kontakte (Name, Email, Telefon, Adresse, Firma)
// und gibt verknuepfte Leads, Projekte, Deals, Termine zurueck

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (q.length < 1) {
      return res.json({ data: [] })
    }

    const searchPattern = `%${q}%`

    // Kontakte suchen
    const { data: contacts, error: cErr } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company, email, phone, address')
      .is('deleted_at', null)
      .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern},company.ilike.${searchPattern},address.ilike.${searchPattern}`)
      .order('last_name', { ascending: true })
      .limit(20)

    if (cErr) throw new AppError(cErr.message, 500)

    const contactIds = (contacts ?? []).map((c: any) => c.id)

    if (contactIds.length === 0) {
      return res.json({ data: [] })
    }

    // Verknuepfte Entitaeten parallel laden
    const [leads, projects, deals, appointments] = await Promise.all([
      supabase
        .from('leads')
        .select('id, contact_id, status, value, source, created_at')
        .in('contact_id', contactIds)
        .is('deleted_at', null),
      supabase
        .from('projects')
        .select('id, contact_id, name, phase, priority, value, kwp')
        .in('contact_id', contactIds)
        .is('deleted_at', null),
      supabase
        .from('deals')
        .select('id, contact_id, title, stage, value, win_probability')
        .in('contact_id', contactIds)
        .is('deleted_at', null),
      supabase
        .from('appointments')
        .select('id, contact_id, status, appointment_date, appointment_type, value')
        .in('contact_id', contactIds)
        .is('deleted_at', null),
    ])

    // Pro Kontakt zusammenfuehren
    const results = (contacts ?? []).map((c: any) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      address: c.address,
      leads: (leads.data ?? []).filter((l: any) => l.contact_id === c.id),
      projects: (projects.data ?? []).filter((p: any) => p.contact_id === c.id),
      deals: (deals.data ?? []).filter((d: any) => d.contact_id === c.id),
      appointments: (appointments.data ?? []).filter((a: any) => a.contact_id === c.id),
    }))

    res.json({ data: results })
  } catch (err) {
    next(err)
  }
})

export default router
