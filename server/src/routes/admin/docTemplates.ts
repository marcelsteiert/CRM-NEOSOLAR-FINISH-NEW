import { Router } from 'express'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// ── Types ──

const ALL_ROLES = ['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN']

interface FolderDef {
  name: string
  subfolders?: string[]
  allowedRoles?: string[] // Welche Rollen diesen Ordner sehen duerfen (leer = alle)
}

interface FolderTemplate {
  id: string
  entityType: string
  folders: FolderDef[]
}

// ── Default Templates (Fallback wenn Settings leer) ──

const defaultTemplates: FolderTemplate[] = [
  {
    id: 'tpl-001', entityType: 'LEAD',
    folders: [
      { name: 'Kontaktdaten', allowedRoles: [] },
      { name: 'Fotos', subfolders: ['Dach', 'Zählerkasten', 'Umgebung'], allowedRoles: [] },
      { name: 'Notizen', allowedRoles: [] },
    ],
  },
  {
    id: 'tpl-002', entityType: 'TERMIN',
    folders: [
      { name: 'Besichtigungsfotos', subfolders: ['Dachfläche', 'Elektroinstallation', 'Umgebung'], allowedRoles: [] },
      { name: 'Messungen', allowedRoles: [] },
      { name: 'Checkliste', allowedRoles: [] },
    ],
  },
  {
    id: 'tpl-003', entityType: 'ANGEBOT',
    folders: [
      { name: 'Offerte', subfolders: ['Entwurf', 'Final', 'Korrektur'], allowedRoles: [] },
      { name: 'Technische Unterlagen', subfolders: ['Datenblätter', 'Schema'], allowedRoles: [] },
      { name: 'Kundenkorrespondenz', allowedRoles: [] },
    ],
  },
  {
    id: 'tpl-004', entityType: 'PROJEKT',
    folders: [
      { name: 'Planung', subfolders: ['Montagepläne', 'Statik', 'Elektroplanung'], allowedRoles: [] },
      { name: 'Bewilligungen', subfolders: ['Baugesuch', 'Förderbeiträge', 'Netzbetreiber'], allowedRoles: [] },
      { name: 'Ausführung', subfolders: ['Fotos', 'Protokolle', 'Mängelliste'], allowedRoles: [] },
      { name: 'Abnahme', subfolders: ['Abnahmeprotokoll', 'Inbetriebnahme', 'Kundenübergabe'], allowedRoles: [] },
    ],
  },
]

// ── Helper: Templates aus Settings laden ──

async function loadTemplates(): Promise<FolderTemplate[]> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'doc_templates')
    .single()

  if (data?.value && Array.isArray(data.value)) {
    return data.value as FolderTemplate[]
  }
  return defaultTemplates
}

async function saveTemplates(templates: FolderTemplate[]): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'doc_templates', value: templates as any }, { onConflict: 'key' })

  if (error) throw new AppError(`Speichern fehlgeschlagen: ${error.message}`, 500)
}

// ── GET /api/v1/admin/doc-templates ──

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await loadTemplates()
    res.json({ data: templates, roles: ALL_ROLES })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/v1/admin/doc-templates/:entityType – Komplettes Template einer Phase updaten ──

router.put('/:entityType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await loadTemplates()
    const idx = templates.findIndex((t) => t.entityType === req.params.entityType)
    if (idx === -1) throw new AppError('Template nicht gefunden', 404)

    const { folders } = req.body
    if (!Array.isArray(folders)) throw new AppError('folders muss ein Array sein', 400)

    // Sicherstellen dass allowedRoles validiert werden
    templates[idx].folders = folders.map((f: any) => ({
      name: String(f.name || '').trim(),
      subfolders: Array.isArray(f.subfolders) ? f.subfolders.map((s: any) => String(s).trim()).filter(Boolean) : undefined,
      allowedRoles: Array.isArray(f.allowedRoles) ? f.allowedRoles.filter((r: string) => ALL_ROLES.includes(r)) : [],
    })).filter((f: FolderDef) => f.name.length > 0)

    await saveTemplates(templates)
    res.json({ data: templates[idx] })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/admin/doc-templates/:entityType/folders – Ordner hinzufuegen ──

router.post('/:entityType/folders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await loadTemplates()
    const idx = templates.findIndex((t) => t.entityType === req.params.entityType)
    if (idx === -1) throw new AppError('Template nicht gefunden', 404)

    const { name, subfolders, allowedRoles } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Ordnername ist erforderlich', 400)
    }

    const exists = templates[idx].folders.some((f) => f.name.toLowerCase() === name.trim().toLowerCase())
    if (exists) throw new AppError('Ordner existiert bereits', 409)

    templates[idx].folders.push({
      name: name.trim(),
      subfolders: Array.isArray(subfolders) ? subfolders.map((s: any) => String(s).trim()).filter(Boolean) : undefined,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles.filter((r: string) => ALL_ROLES.includes(r)) : [],
    })

    await saveTemplates(templates)
    res.status(201).json({ data: templates[idx] })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/v1/admin/doc-templates/:entityType/folders/:folderName – Ordner bearbeiten ──

router.put('/:entityType/folders/:folderName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await loadTemplates()
    const idx = templates.findIndex((t) => t.entityType === req.params.entityType)
    if (idx === -1) throw new AppError('Template nicht gefunden', 404)

    const folderName = decodeURIComponent(req.params.folderName as string)
    const folderIdx = templates[idx].folders.findIndex((f) => f.name === folderName)
    if (folderIdx === -1) throw new AppError('Ordner nicht gefunden', 404)

    const { name, subfolders, allowedRoles } = req.body

    if (name && typeof name === 'string' && name.trim() !== folderName) {
      const exists = templates[idx].folders.some((f, i) => i !== folderIdx && f.name.toLowerCase() === name.trim().toLowerCase())
      if (exists) throw new AppError('Ordner mit diesem Namen existiert bereits', 409)
      templates[idx].folders[folderIdx].name = name.trim()
    }

    if (subfolders !== undefined) {
      templates[idx].folders[folderIdx].subfolders = Array.isArray(subfolders)
        ? subfolders.map((s: any) => String(s).trim()).filter(Boolean)
        : undefined
    }

    if (allowedRoles !== undefined) {
      templates[idx].folders[folderIdx].allowedRoles = Array.isArray(allowedRoles)
        ? allowedRoles.filter((r: string) => ALL_ROLES.includes(r))
        : []
    }

    await saveTemplates(templates)
    res.json({ data: templates[idx] })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/admin/doc-templates/:entityType/folders/:folderName ──

router.delete('/:entityType/folders/:folderName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await loadTemplates()
    const idx = templates.findIndex((t) => t.entityType === req.params.entityType)
    if (idx === -1) throw new AppError('Template nicht gefunden', 404)

    const folderName = decodeURIComponent(req.params.folderName as string)
    const folderIdx = templates[idx].folders.findIndex((f) => f.name === folderName)
    if (folderIdx === -1) throw new AppError('Ordner nicht gefunden', 404)

    templates[idx].folders.splice(folderIdx, 1)
    await saveTemplates(templates)
    res.json({ message: 'Ordner geloescht', data: templates[idx] })
  } catch (err) {
    next(err)
  }
})

export default router
