import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'

/**
 * Reihenfolge und Sichtbarkeit der Praesentationsfolien.
 *
 * Bisher stand die Folge fest im Code. Wer eine Folie weglassen wollte –
 * etwa die Aktion, wenn gerade keine laeuft – musste einen Entwickler
 * fragen. Jetzt liegt die Reihenfolge in den Einstellungen und laesst
 * sich im Admin aendern.
 *
 * Gespeichert wird nur die Abweichung vom Standard: welche Folien in
 * welcher Reihenfolge aktiv sind. Die Folien selbst bleiben im Code, denn
 * sie sind React-Komponenten.
 */
const router = Router()

function nurAdmin(req: Request) {
  const u = (req as any).user
  if (!u?.userId) throw new AppError('Nicht authentifiziert', 401)
  if (u.role !== 'ADMIN' && u.role !== 'GL') {
    throw new AppError('Nur fuer Admin und Geschaeftsleitung', 403)
  }
}

export interface FolienStand {
  /** Foliennummer in der Reihenfolge, wie sie gezeigt wird */
  id: string
  aktiv: boolean
}

/** Je Strecke eine eigene Reihenfolge. */
export type FolienEinstellungen = Record<string, FolienStand[]>

const SCHLUESSEL = 'praesentation_folien'

export async function ladeFolienEinstellungen(): Promise<FolienEinstellungen> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SCHLUESSEL)
      .maybeSingle()
    if (data?.value && typeof data.value === 'object') {
      return data.value as FolienEinstellungen
    }
  } catch {
    /* Ohne Einstellung gilt die Reihenfolge aus dem Code */
  }
  return {}
}

router.get('/folien', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    res.json({ data: await ladeFolienEinstellungen() })
  } catch (err) {
    next(err)
  }
})

const standSchema = z.object({
  variante: z.string().min(1).max(40),
  folien: z
    .array(z.object({ id: z.string().min(1).max(40), aktiv: z.boolean() }))
    .min(1)
    .max(200),
})

router.put('/folien', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const parsed = standSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Folienliste', 400)

    // Mindestens eine Folie muss sichtbar bleiben
    if (!parsed.data.folien.some((f) => f.aktiv)) {
      throw new AppError('Es muss mindestens eine Folie aktiv bleiben', 400)
    }

    const alle = await ladeFolienEinstellungen()
    alle[parsed.data.variante] = parsed.data.folien

    const { error } = await supabase
      .from('settings')
      .upsert({ key: SCHLUESSEL, value: alle }, { onConflict: 'key' })
    if (error) throw new AppError(`Speichern fehlgeschlagen: ${error.message}`, 500)

    res.json({ data: alle })
  } catch (err) {
    next(err)
  }
})

/** Setzt eine Strecke auf die Reihenfolge aus dem Code zurueck. */
router.delete('/folien/:variante', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const alle = await ladeFolienEinstellungen()
    delete alle[String(req.params.variante)]
    const { error } = await supabase
      .from('settings')
      .upsert({ key: SCHLUESSEL, value: alle }, { onConflict: 'key' })
    if (error) throw new AppError(`Zuruecksetzen fehlgeschlagen: ${error.message}`, 500)
    res.json({ data: alle })
  } catch (err) {
    next(err)
  }
})

export default router
