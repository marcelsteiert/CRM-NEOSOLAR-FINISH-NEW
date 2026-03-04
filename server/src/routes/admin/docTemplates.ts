import { Router } from 'express'

const router = Router()

interface FolderTemplate {
  id: string
  entityType: string
  folders: { name: string; subfolders?: string[] }[]
}

const templates: FolderTemplate[] = [
  {
    id: 'tpl-001', entityType: 'LEAD',
    folders: [
      { name: 'Kontaktdaten' },
      { name: 'Fotos', subfolders: ['Dach', 'Zählerkasten', 'Umgebung'] },
      { name: 'Notizen' },
    ],
  },
  {
    id: 'tpl-002', entityType: 'TERMIN',
    folders: [
      { name: 'Besichtigungsfotos', subfolders: ['Dachfläche', 'Elektroinstallation', 'Umgebung'] },
      { name: 'Messungen' },
      { name: 'Checkliste' },
    ],
  },
  {
    id: 'tpl-003', entityType: 'ANGEBOT',
    folders: [
      { name: 'Offerte', subfolders: ['Entwurf', 'Final', 'Korrektur'] },
      { name: 'Technische Unterlagen', subfolders: ['Datenblätter', 'Schema'] },
      { name: 'Kundenkorrespondenz' },
    ],
  },
  {
    id: 'tpl-004', entityType: 'PROJEKT',
    folders: [
      { name: 'Planung', subfolders: ['Montagepläne', 'Statik', 'Elektroplanung'] },
      { name: 'Bewilligungen', subfolders: ['Baugesuch', 'Förderbeiträge', 'Netzbetreiber'] },
      { name: 'Ausführung', subfolders: ['Fotos', 'Protokolle', 'Mängelliste'] },
      { name: 'Abnahme', subfolders: ['Abnahmeprotokoll', 'Inbetriebnahme', 'Kundenübergabe'] },
    ],
  },
]

router.get('/', (_req, res) => {
  res.json({ data: templates })
})

router.put('/:entityType', (req, res) => {
  const idx = templates.findIndex((t) => t.entityType === req.params.entityType)
  if (idx === -1) return res.status(404).json({ error: 'Template nicht gefunden' })
  const { folders } = req.body
  if (folders) templates[idx].folders = folders
  res.json({ data: templates[idx] })
})

export default router
