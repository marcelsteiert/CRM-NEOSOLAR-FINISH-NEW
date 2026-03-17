import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { logAudit, getAuditUserId } from '../lib/auditService.js'

const router = Router()

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const uploadDocSchema = z.object({
  contactId: z.string().min(1, 'Kontakt-ID ist erforderlich'),
  entityType: z.enum(['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT', 'KONTAKT']),
  entityId: z.string().optional(),
  folderPath: z.string().optional(), // z.B. "Fotos/Dach" oder "Offerte/Final"
  fileName: z.string().min(1, 'Dateiname ist erforderlich'),
  fileSize: z.number().min(1),
  mimeType: z.string().min(1),
  uploadedBy: z.string().optional(),
  notes: z.string().optional(),
  fileBase64: z.string().min(1, 'Dateiinhalt ist erforderlich'),
})

// ---------------------------------------------------------------------------
// GET /api/v1/documents?contactId=xxx oder ?entityType=LEAD&entityId=xxx
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactId, entityType, entityId } = req.query

    let query = supabase.from('documents').select('*')

    if (contactId && typeof contactId === 'string') {
      query = query.eq('contact_id', contactId)
    }
    if (entityType && typeof entityType === 'string') {
      query = query.eq('entity_type', entityType)
    }
    if (entityId && typeof entityId === 'string') {
      query = query.eq('entity_id', entityId)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw new AppError(error.message, 500)

    // Signierte URLs fuer Download generieren
    const enriched = await Promise.all(
      (data ?? []).map(async (doc: any) => {
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 3600) // 1 Stunde gueltig
        return { ...doc, downloadUrl: urlData?.signedUrl ?? null }
      })
    )

    res.json({ data: enriched, total: enriched.length })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/documents – Upload mit echtem Supabase Storage
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = uploadDocSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const d = result.data

    // Base64 → Buffer
    const fileBuffer = Buffer.from(d.fileBase64, 'base64')

    // Storage-Pfad: contacts/{contactId}/{entityType}/{timestamp}_{fileName}
    const timestamp = Date.now()
    const safeName = d.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${d.contactId}/${d.entityType.toLowerCase()}/${timestamp}_${safeName}`

    // In Supabase Storage hochladen
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: d.mimeType,
        upsert: false,
      })

    if (storageError) throw new AppError(`Upload fehlgeschlagen: ${storageError.message}`, 500)

    // Metadaten in DB speichern
    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        contact_id: d.contactId,
        entity_type: d.entityType,
        entity_id: d.entityId ?? null,
        folder_path: d.folderPath ?? null,
        file_name: d.fileName,
        file_size: d.fileSize,
        mime_type: d.mimeType,
        storage_path: storagePath,
        uploaded_by: d.uploadedBy || req.user?.userId || null,
        notes: d.notes ?? null,
      })
      .select()
      .single()

    if (dbError) throw new AppError(dbError.message, 500)

    // Activity erstellen
    await supabase.from('activities').insert({
      contact_id: d.contactId,
      type: 'DOCUMENT_UPLOAD',
      text: `Dokument hochgeladen: ${d.fileName}`,
      created_by: d.uploadedBy,
    })

    // Signierte URL mitgeben
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600)

    logAudit({ userId: getAuditUserId(req), action: 'CREATE', entity: 'DOCUMENT', entityId: doc?.id, description: `Dokument "${d.fileName}" hochgeladen` })
    res.status(201).json({ data: { ...doc, downloadUrl: urlData?.signedUrl ?? null } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/documents/:id/download – Download-URL generieren
// ---------------------------------------------------------------------------

router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !doc) throw new AppError('Dokument nicht gefunden', 404)

    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 3600)

    if (!urlData?.signedUrl) throw new AppError('Download-URL konnte nicht erstellt werden', 500)

    res.json({ data: { ...doc, downloadUrl: urlData.signedUrl } })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/documents/:id – Loescht Datei + Metadaten
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !doc) throw new AppError('Dokument nicht gefunden', 404)

    // Aus Storage loeschen
    await supabase.storage.from('documents').remove([doc.storage_path])

    // Aus DB loeschen (hard delete – Dokumente haben kein soft delete)
    await supabase.from('documents').delete().eq('id', req.params.id)

    logAudit({ userId: getAuditUserId(req), action: 'DELETE', entity: 'DOCUMENT', entityId: req.params.id, description: `Dokument "${doc.file_name}" gelöscht` })
    res.json({ message: 'Dokument geloescht' })
  } catch (err) {
    next(err)
  }
})

export default router
