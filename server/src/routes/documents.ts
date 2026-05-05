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
  contactId: z.string().nullable().optional(),
  entityType: z.enum(['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT', 'KONTAKT', 'PERSONAL']),
  entityId: z.string().optional(),
  folderPath: z.string().optional(),
  fileName: z.string().min(1, 'Dateiname ist erforderlich'),
  fileSize: z.number().min(1),
  mimeType: z.string().min(1),
  uploadedBy: z.string().optional(),
  notes: z.string().optional(),
  fileBase64: z.string().min(1, 'Dateiinhalt ist erforderlich'),
}).refine((d) => !!d.contactId || !!d.entityId, {
  message: 'Entweder contactId oder entityId ist erforderlich',
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

    // Public URLs generieren (Bucket ist public – kein signierter URL noetig)
    const supabaseUrl = process.env.SUPABASE_URL ?? ''
    const enriched = (data ?? []).map((doc: any) => ({
      ...doc,
      downloadUrl: doc.storage_path
        ? `${supabaseUrl}/storage/v1/object/public/documents/${doc.storage_path}`
        : (doc.external_url ?? null),
    }))

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
    // Debug: Request-Infos
    const bodyKeys = Object.keys(req.body || {})
    const bodySize = JSON.stringify(req.body || {}).length
    console.log(`[DOC-UPLOAD] Keys: ${bodyKeys.join(',')}, BodySize: ${bodySize}, User: ${req.user?.userId}`)

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

    if (storageError) {
      console.error(`[DOC-UPLOAD] Storage-Fehler: ${storageError.message}, path: ${storagePath}, size: ${fileBuffer.length} bytes`)
      throw new AppError(`Storage-Upload fehlgeschlagen: ${storageError.message}`, 500)
    }
    console.log(`[DOC-UPLOAD] Storage OK: ${storagePath}, ${fileBuffer.length} bytes`)

    // Metadaten in DB speichern
    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        contact_id: d.contactId ?? null,
        entity_type: d.entityType,
        entity_id: d.entityId ?? null,
        folder_path: d.folderPath ?? null,
        file_name: d.fileName,
        file_size: d.fileSize,
        mime_type: d.mimeType,
        storage_path: storagePath,
        uploaded_by: d.uploadedBy || req.user?.userId,
        notes: d.notes ?? null,
      })
      .select()
      .single()

    if (dbError) throw new AppError(`DB-Insert fehlgeschlagen: ${dbError.message} (code: ${dbError.code})`, 500)

    // Activity erstellen (nur wenn Kontakt-bezogen)
    const activityUserId = d.uploadedBy || req.user?.userId
    if (activityUserId && d.contactId) {
      await supabase.from('activities').insert({
        contact_id: d.contactId,
        type: 'DOCUMENT_UPLOAD',
        text: `Dokument hochgeladen: ${d.fileName}`,
        created_by: activityUserId,
      })
    }

    // Public URL generieren
    const supabaseUrl = process.env.SUPABASE_URL ?? ''
    const downloadUrl = `${supabaseUrl}/storage/v1/object/public/documents/${storagePath}`

    logAudit({ userId: getAuditUserId(req), action: 'CREATE', entity: 'DOCUMENT', entityId: doc?.id, description: `Dokument "${d.fileName}" hochgeladen` })
    res.status(201).json({ data: { ...doc, downloadUrl } })
  } catch (err: any) {
    const msg = err?.message || 'Unbekannter Fehler'
    const code = err?.statusCode || 500
    console.error('[DOC-UPLOAD-ERROR]', msg, code)
    res.status(code).json({ success: false, error: { message: msg, statusCode: code, debug: { stack: (err?.stack || '').slice(0, 200) } } })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/documents/metadata – Nur Metadaten speichern (Datei schon in Storage)
// ---------------------------------------------------------------------------

const metadataSchema = z.object({
  contactId: z.string().nullable().optional(),
  entityType: z.enum(['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT', 'KONTAKT', 'PERSONAL']),
  entityId: z.string().optional(),
  storagePath: z.string().nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  fileName: z.string().min(1),
  fileSize: z.number().min(0).optional().default(0),
  mimeType: z.string().min(1).optional().default('application/octet-stream'),
  uploadedBy: z.string().optional(),
  notes: z.string().optional(),
  folderPath: z.string().nullable().optional(),
  portalVisible: z.boolean().optional(),
}).refine((d) => d.storagePath || d.externalUrl, {
  message: 'Entweder storagePath (Datei) oder externalUrl (Link) erforderlich',
})

router.post('/metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = metadataSchema.safeParse(req.body)
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      throw new AppError(`Validierungsfehler: ${messages}`, 422)
    }

    const d = result.data

    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        contact_id: d.contactId ?? null,
        entity_type: d.entityType,
        entity_id: d.entityId ?? null,
        file_name: d.fileName,
        file_size: d.fileSize,
        mime_type: d.mimeType,
        storage_path: d.storagePath ?? null,
        external_url: d.externalUrl ?? null,
        uploaded_by: d.uploadedBy || req.user?.userId,
        notes: d.notes ?? null,
        folder_path: d.folderPath ?? null,
        portal_visible: d.portalVisible ?? false,
      })
      .select()
      .single()

    if (dbError) throw new AppError(`DB-Fehler: ${dbError.message}`, 500)

    const supabaseUrl = process.env.SUPABASE_URL ?? ''
    const downloadUrl = d.storagePath
      ? `${supabaseUrl}/storage/v1/object/public/documents/${d.storagePath}`
      : d.externalUrl ?? null

    logAudit({ userId: getAuditUserId(req), action: 'CREATE', entity: 'DOCUMENT', entityId: doc?.id, description: `Dokument "${d.fileName}" hochgeladen` })
    res.status(201).json({ data: { ...doc, downloadUrl } })
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

    const supabaseUrl = process.env.SUPABASE_URL ?? ''
    const downloadUrl = doc.storage_path
      ? `${supabaseUrl}/storage/v1/object/public/documents/${doc.storage_path}`
      : null

    res.json({ data: { ...doc, downloadUrl } })
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
