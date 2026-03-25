import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { resolveContactId } from '../lib/contactResolver.js'
import { getLeadOwnerFilter, toSnakeCase } from '../lib/userFilter.js'
import { createNotification } from '../lib/notificationService.js'
import { logAudit, getAuditUserId } from '../lib/auditService.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createLeadSchema = z.object({
  contactId: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  source: z.string().min(1),
  pipelineId: z.string().nullable().optional(),
  bucketId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'CONVERTED', 'LOST', 'ARCHIVED', 'AFTER_SALES']).optional(),
  value: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  appointmentType: z.enum(['VOR_ORT', 'ONLINE']).nullable().optional(),
  tags: z.array(z.string()).optional(),
  skipDuplicateCheck: z.boolean().optional(),
})

const updateLeadSchema = createLeadSchema.partial()

const moveLeadSchema = z.object({
  bucketId: z.string().min(1),
})

// ---------------------------------------------------------------------------
// GET /api/v1/leads – Liste mit Filtering, Suche, Pagination
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, source, excludeSource, appointmentType, pipelineId, bucketId, assignedTo, search, tag, page: pp, pageSize: psp, sortBy = 'created_at', sortOrder = 'desc' } = req.query

    let query = supabase
      .from('leads')
      .select('*, contact:contacts(*), lead_tags(tag_id)', { count: 'exact' })
      .is('deleted_at', null)

    // Whitelist gültiger Sort-Felder
    const allowedSortFields: Record<string, string> = {
      created_at: 'created_at',
      createdAt: 'created_at',
      updated_at: 'updated_at',
      updatedAt: 'updated_at',
      source: 'source',
      status: 'status',
      value: 'value',
      lastName: 'created_at',
      company: 'created_at',
    }

    if (status && typeof status === 'string') query = query.eq('status', status)
    if (source && typeof source === 'string') query = query.eq('source', source)
    if (excludeSource && typeof excludeSource === 'string') query = query.neq('source', excludeSource)
    if (appointmentType && typeof appointmentType === 'string') query = query.eq('appointment_type', appointmentType)
    if (pipelineId && typeof pipelineId === 'string') query = query.eq('pipeline_id', pipelineId)
    if (bucketId && typeof bucketId === 'string') query = query.eq('bucket_id', bucketId)
    if (assignedTo && typeof assignedTo === 'string') query = query.eq('assigned_to', assignedTo)

    // Tag-Filter: Nur Leads mit bestimmtem Tag
    if (tag && typeof tag === 'string') {
      // Lead-IDs mit diesem Tag holen (max 1000 fuer Pagination)
      const page = Math.max(1, Number(pp) || 1)
      const pageSize = Math.min(500, Math.max(1, Number(psp) || 50))

      // Zuerst count ermitteln
      const countQuery = supabase
        .from('lead_tags')
        .select('lead_id', { count: 'exact', head: true })
        .eq('tag_id', tag)

      // Dann die IDs fuer die aktuelle Seite
      const idsQuery = supabase
        .from('lead_tags')
        .select('lead_id')
        .eq('tag_id', tag)
        .range((page - 1) * pageSize, page * pageSize - 1)

      // Source-Filter auf leads anwenden
      if (source && typeof source === 'string') {
        // Supabase kann nicht direkt ueber lead_tags auf leads filtern
        // Wir holen die IDs und filtern dann
      }

      const [{ count: tagCount }, { data: taggedIds }] = await Promise.all([countQuery, idsQuery])
      const leadIds = (taggedIds ?? []).map((r: any) => r.lead_id)

      if (leadIds.length === 0) {
        res.json({ data: [], total: tagCount ?? 0, page, pageSize })
        return
      }

      // Leads mit diesen IDs laden
      let tagQuery = supabase
        .from('leads')
        .select('*, contact:contacts(*), lead_tags(tag_id)')
        .in('id', leadIds)
        .is('deleted_at', null)

      if (status && typeof status === 'string') tagQuery = tagQuery.eq('status', status)
      if (source && typeof source === 'string') tagQuery = tagQuery.eq('source', source)
      if (excludeSource && typeof excludeSource === 'string') tagQuery = tagQuery.neq('source', excludeSource)

      const ownerFilter2 = getLeadOwnerFilter(req)
      if (ownerFilter2) tagQuery = tagQuery.eq('assigned_to', ownerFilter2)

      const rawSort2 = typeof sortBy === 'string' ? sortBy : 'created_at'
      const sf2 = allowedSortFields[rawSort2] ?? 'created_at'
      tagQuery = tagQuery.order(sf2, { ascending: sortOrder !== 'desc' })

      const { data: tagData, error: tagErr } = await tagQuery
      if (tagErr) { res.json({ data: [], total: 0, page, pageSize }); return }

      const enriched = (tagData ?? []).map((lead: any) => ({
        ...lead,
        firstName: lead.contact?.first_name ?? null,
        lastName: lead.contact?.last_name ?? null,
        company: lead.contact?.company ?? null,
        address: lead.contact?.address ?? '',
        phone: lead.contact?.phone ?? '',
        email: lead.contact?.email ?? '',
        tags: (lead.lead_tags ?? []).map((lt: any) => lt.tag_id),
        lead_tags: undefined,
        contact: undefined,
      }))

      res.json({ data: enriched, total: tagCount ?? enriched.length, page, pageSize })
      return
    }

    // Per-User Filter: Nicht-Admins sehen nur eigene Leads
    const ownerFilter = getLeadOwnerFilter(req)
    if (ownerFilter) query = query.eq('assigned_to', ownerFilter)

    if (search && typeof search === 'string' && search.trim()) {
      // Kontakte durchsuchen (Name, Email, Telefon, Firma, Adresse)
      const s = search.trim()
      const { data: matchingContacts } = await supabase
        .from('contacts')
        .select('id')
        .or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,company.ilike.%${s}%,address.ilike.%${s}%`)

      const contactIds = (matchingContacts ?? []).map((c: any) => c.id)

      if (contactIds.length > 0) {
        // Leads mit matchenden Kontakten ODER matching notes/source
        query = query.or(`contact_id.in.(${contactIds.join(',')}),notes.ilike.%${s}%,source.ilike.%${s}%`)
      } else {
        // Kein Kontakt gefunden – nur in leads-Feldern suchen
        query = query.or(`notes.ilike.%${s}%,source.ilike.%${s}%`)
      }
    }

    const rawSort = typeof sortBy === 'string' ? sortBy : 'created_at'
    const sf = allowedSortFields[rawSort] ?? allowedSortFields[toSnakeCase(rawSort)] ?? 'created_at'
    const ascending = sortOrder !== 'desc'
    query = query.order(sf, { ascending })

    const page = Math.max(1, Number(pp) || 1)
    const pageSize = Math.min(500, Math.max(1, Number(psp) || 20))
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, count, error } = await query
    // Range-Fehler bei out-of-bounds Pagination ignorieren → leere Ergebnisse
    if (error && !data) {
      res.json({ data: [], total: count ?? 0, page, pageSize })
      return
    }

    // Kontakt-Daten flach + Tags als Array
    const enriched = (data ?? []).map((lead: any) => ({
      ...lead,
      firstName: lead.contact?.first_name ?? null,
      lastName: lead.contact?.last_name ?? null,
      company: lead.contact?.company ?? null,
      address: lead.contact?.address ?? '',
      phone: lead.contact?.phone ?? '',
      email: lead.contact?.email ?? '',
      tags: (lead.lead_tags ?? []).map((lt: any) => lt.tag_id),
      lead_tags: undefined,
    }))

    res.json({ data: enriched, total: count ?? 0, page, pageSize })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/leads/:id
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*, contact:contacts(*), lead_tags(tag_id)')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new AppError('Lead nicht gefunden', 404)

    res.json({
      data: {
        ...data,
        firstName: data.contact?.first_name ?? null,
        lastName: data.contact?.last_name ?? null,
        company: data.contact?.company ?? null,
        address: data.contact?.address ?? '',
        phone: data.contact?.phone ?? '',
        email: data.contact?.email ?? '',
        tags: (data.lead_tags ?? []).map((lt: any) => lt.tag_id),
        lead_tags: undefined,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/leads/check-duplicate – Duplikat-Pruefung
// ---------------------------------------------------------------------------

router.post('/check-duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, firstName, lastName } = req.body as Record<string, string>
    const duplicates: Array<{ id: string; contactId: string; firstName: string; lastName: string; email: string; phone: string; status: string; createdAt: string }> = []

    // 1. Suche nach E-Mail (staerkstes Kriterium)
    if (email) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone')
        .eq('email', email)
        .is('deleted_at', null)

      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          const { data: leads } = await supabase
            .from('leads')
            .select('id, contact_id, status, created_at')
            .eq('contact_id', contact.id)
            .is('deleted_at', null)

          for (const lead of leads ?? []) {
            duplicates.push({
              id: lead.id,
              contactId: contact.id,
              firstName: contact.first_name ?? '',
              lastName: contact.last_name ?? '',
              email: contact.email ?? '',
              phone: contact.phone ?? '',
              status: lead.status,
              createdAt: lead.created_at,
            })
          }
        }
      }
    }

    // 2. Suche nach Telefonnummer (falls kein E-Mail-Match)
    if (duplicates.length === 0 && phone) {
      const cleanPhone = phone.replace(/\s+/g, '')
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone')
        .is('deleted_at', null)

      const phoneMatches = (contacts ?? []).filter((c: any) =>
        c.phone && c.phone.replace(/\s+/g, '') === cleanPhone
      )

      for (const contact of phoneMatches) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, contact_id, status, created_at')
          .eq('contact_id', contact.id)
          .is('deleted_at', null)

        for (const lead of leads ?? []) {
          duplicates.push({
            id: lead.id,
            contactId: contact.id,
            firstName: contact.first_name ?? '',
            lastName: contact.last_name ?? '',
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            status: lead.status,
            createdAt: lead.created_at,
          })
        }
      }
    }

    // 3. Suche nach Name (schwaecher, nur wenn exakter Vor+Nachname)
    if (duplicates.length === 0 && firstName && lastName) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .is('deleted_at', null)

      for (const contact of contacts ?? []) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, contact_id, status, created_at')
          .eq('contact_id', contact.id)
          .is('deleted_at', null)

        for (const lead of leads ?? []) {
          duplicates.push({
            id: lead.id,
            contactId: contact.id,
            firstName: contact.first_name ?? '',
            lastName: contact.last_name ?? '',
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            status: lead.status,
            createdAt: lead.created_at,
          })
        }
      }
    }

    res.json({ data: { isDuplicate: duplicates.length > 0, duplicates } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/leads – Erstellen
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createLeadSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    // Duplikat-Pruefung (kann mit skipDuplicateCheck=true umgangen werden)
    if (!req.body.skipDuplicateCheck) {
      const email = result.data.email || ''
      const phone = result.data.phone || ''

      if (email) {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', email)
          .is('deleted_at', null)
          .maybeSingle()

        if (existingContact) {
          const { data: existingLeads } = await supabase
            .from('leads')
            .select('id, status')
            .eq('contact_id', existingContact.id)
            .is('deleted_at', null)

          const activeLead = (existingLeads ?? []).find((l: any) => l.status === 'ACTIVE')
          if (activeLead) {
            throw new AppError(`Duplikat: Ein aktiver Lead mit dieser E-Mail existiert bereits (ID: ${activeLead.id})`, 409)
          }
        }
      } else if (phone) {
        const cleanPhone = phone.replace(/\s+/g, '')
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, phone')
          .is('deleted_at', null)

        const phoneMatch = (contacts ?? []).find((c: any) =>
          c.phone && c.phone.replace(/\s+/g, '') === cleanPhone
        )

        if (phoneMatch) {
          const { data: existingLeads } = await supabase
            .from('leads')
            .select('id, status')
            .eq('contact_id', phoneMatch.id)
            .is('deleted_at', null)

          const activeLead = (existingLeads ?? []).find((l: any) => l.status === 'ACTIVE')
          if (activeLead) {
            throw new AppError(`Duplikat: Ein aktiver Lead mit dieser Telefonnummer existiert bereits (ID: ${activeLead.id})`, 409)
          }
        }
      }
    }

    const contactId = await resolveContactId(result.data)

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        contact_id: contactId,
        source: result.data.source,
        pipeline_id: result.data.pipelineId ?? null,
        bucket_id: result.data.bucketId ?? null,
        assigned_to: result.data.assignedTo ?? req.user?.userId ?? null,
        status: result.data.status ?? 'ACTIVE',
        value: result.data.value ?? 0,
        notes: result.data.notes ?? null,
        appointment_type: result.data.appointmentType ?? null,
      })
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError(error.message, 500)

    // Tags setzen
    if (result.data.tags && result.data.tags.length > 0 && lead) {
      await supabase.from('lead_tags').insert(
        result.data.tags.map((tagId) => ({ lead_id: lead.id, tag_id: tagId }))
      )
    }

    // Notification: Lead erstellt
    if (lead) {
      const assignee = lead.assigned_to ?? req.user?.userId
      if (assignee) {
        const leadName = [result.data.firstName, result.data.lastName].filter(Boolean).join(' ') || 'Neuer Lead'
        createNotification({
          userId: assignee,
          type: 'LEAD_CREATED',
          title: 'Neuer Lead erstellt',
          message: leadName,
          referenceType: 'LEAD',
          referenceId: lead.id,
          referenceTitle: leadName,
        })
      }
    }

    // Audit-Log
    logAudit({ userId: getAuditUserId(req), action: 'CREATE', entity: 'LEAD', entityId: lead?.id, description: `Lead "${result.data.firstName} ${result.data.lastName}" erstellt` })

    res.status(201).json({ data: { ...lead, tags: result.data.tags ?? [] } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/leads/:id – Update
// ---------------------------------------------------------------------------

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateLeadSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const updates: Record<string, unknown> = {}
    if (result.data.contactId !== undefined) updates.contact_id = result.data.contactId
    if (result.data.source !== undefined) updates.source = result.data.source
    if (result.data.pipelineId !== undefined) updates.pipeline_id = result.data.pipelineId ?? null
    if (result.data.bucketId !== undefined) updates.bucket_id = result.data.bucketId ?? null
    if (result.data.assignedTo !== undefined) updates.assigned_to = result.data.assignedTo ?? null
    if (result.data.status !== undefined) updates.status = result.data.status
    if (result.data.value !== undefined) updates.value = result.data.value
    if (result.data.notes !== undefined) updates.notes = result.data.notes ?? null
    if (result.data.appointmentType !== undefined) updates.appointment_type = result.data.appointmentType ?? null

    // Immer updated_at setzen damit Supabase min. 1 Feld hat
    updates.updated_at = new Date().toISOString()

    // Kontaktdaten in contacts-Tabelle aktualisieren
    const contactUpdates: Record<string, unknown> = {}
    if (result.data.firstName !== undefined) contactUpdates.first_name = result.data.firstName ?? ''
    if (result.data.lastName !== undefined) contactUpdates.last_name = result.data.lastName ?? ''
    if (result.data.email !== undefined) contactUpdates.email = result.data.email ?? ''
    if (result.data.phone !== undefined) contactUpdates.phone = result.data.phone ?? ''
    if (result.data.address !== undefined) contactUpdates.address = result.data.address ?? ''
    if (result.data.company !== undefined) contactUpdates.company = result.data.company ?? null

    if (Object.keys(contactUpdates).length > 0) {
      // contact_id vom Lead holen
      const { data: leadRow } = await supabase.from('leads').select('contact_id').eq('id', req.params.id).single()
      if (leadRow?.contact_id) {
        contactUpdates.updated_at = new Date().toISOString()
        const { error: contactError } = await supabase.from('contacts').update(contactUpdates).eq('id', leadRow.contact_id)
        if (contactError) throw new AppError(`Kontakt-Update fehlgeschlagen: ${contactError.message}`, 500)
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*), lead_tags(tag_id)')
      .single()

    if (error) throw new AppError('Lead nicht gefunden', 404)

    // Notification: Lead zugewiesen (nur wenn assignedTo geaendert und nicht self)
    if (result.data.assignedTo && result.data.assignedTo !== req.user?.userId && data) {
      const leadName = [data.contact?.first_name, data.contact?.last_name].filter(Boolean).join(' ') || 'Lead'
      createNotification({
        userId: result.data.assignedTo,
        type: 'LEAD_ASSIGNED',
        title: 'Lead zugewiesen',
        message: `Dir wurde der Lead "${leadName}" zugewiesen`,
        referenceType: 'LEAD',
        referenceId: data.id,
        referenceTitle: leadName,
      })
    }

    // Tags aktualisieren
    if (result.data.tags !== undefined) {
      await supabase.from('lead_tags').delete().eq('lead_id', req.params.id)
      if (result.data.tags.length > 0) {
        await supabase.from('lead_tags').insert(
          result.data.tags.map((tagId) => ({ lead_id: req.params.id, tag_id: tagId }))
        )
      }
    }

    // Audit-Log
    logAudit({ userId: getAuditUserId(req), action: 'UPDATE', entity: 'LEAD', entityId: req.params.id, description: `Lead aktualisiert` })

    res.json({
      data: {
        ...data,
        tags: result.data.tags ?? (data?.lead_tags ?? []).map((lt: any) => lt.tag_id),
        lead_tags: undefined,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/all – Alle Leads loeschen (nur Admin)
// ---------------------------------------------------------------------------

router.delete('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Nur Admins koennen alle Leads loeschen', 403)
    }

    const now = new Date().toISOString()
    const { count, error } = await supabase
      .from('leads')
      .update({ deleted_at: now }, { count: 'exact' })
      .is('deleted_at', null)

    if (error) throw new AppError(error.message, 500)

    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'LEAD', description: `${count ?? 0} Leads gelöscht (Massenoperation)` })
    res.json({ message: `${count ?? 0} Leads erfolgreich geloescht`, count: count ?? 0 })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/:id – Soft Delete
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('deleted_at', null)

    if (error) throw new AppError('Lead nicht gefunden', 404)
    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'LEAD', entityId: req.params.id, description: `Lead gelöscht` })
    res.json({ message: 'Lead erfolgreich geloescht' })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/leads/:id/tags – Tags hinzufuegen
// ---------------------------------------------------------------------------

router.post('/:id/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ tagIds: z.array(z.string()) })
    const result = schema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    const inserts = result.data.tagIds.map((tagId) => ({ lead_id: req.params.id, tag_id: tagId }))
    await supabase.from('lead_tags').upsert(inserts, { onConflict: 'lead_id,tag_id' })

    const { data } = await supabase.from('lead_tags').select('tag_id').eq('lead_id', req.params.id)
    res.json({ data: { tags: (data ?? []).map((t: any) => t.tag_id) } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/:id/tags/:tagId – Tag entfernen
// ---------------------------------------------------------------------------

router.delete('/:id/tags/:tagId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await supabase.from('lead_tags').delete().eq('lead_id', req.params.id).eq('tag_id', req.params.tagId)
    const { data } = await supabase.from('lead_tags').select('tag_id').eq('lead_id', req.params.id)
    res.json({ data: { tags: (data ?? []).map((t: any) => t.tag_id) } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// PUT /api/v1/leads/:id/move – In anderen Bucket verschieben
// ---------------------------------------------------------------------------

router.put('/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = moveLeadSchema.safeParse(req.body)
    if (!result.success) throw new AppError('Validierungsfehler', 422)

    const { data, error } = await supabase
      .from('leads')
      .update({ bucket_id: result.data.bucketId })
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .select('*, contact:contacts(*)')
      .single()

    if (error) throw new AppError('Lead nicht gefunden', 404)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

export default router
