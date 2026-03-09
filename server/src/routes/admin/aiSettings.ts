import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { getAiSettings, saveAiSettings } from '../../lib/aiService.js'

const router = Router()

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getAiSettings()
    // API-Key maskieren (nur letzte 4 Zeichen zeigen)
    const maskedKey = settings.apiKey
      ? `****${settings.apiKey.slice(-4)}`
      : ''
    res.json({ data: { ...settings, apiKey: maskedKey } })
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await saveAiSettings(req.body)
    const maskedKey = updated.apiKey
      ? `****${updated.apiKey.slice(-4)}`
      : ''
    res.json({ data: { ...updated, apiKey: maskedKey } })
  } catch (err) {
    next(err)
  }
})

export default router
