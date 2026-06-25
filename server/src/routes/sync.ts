import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1lo6usuptLE7R0VLwLXGqmKDA-FCXn1jex0ZBL2-ybfg/export?format=csv&gid=0'
const SYNC_TOKEN = process.env.SYNC_SECRET_TOKEN || 'neosolar-sync-2026-secret'

// Token-Auth Middleware – kein Login noetig, dafuer geheimer Token im Header
function syncAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers['x-sync-token']
  if (!token || token !== SYNC_TOKEN) {
    return next(new AppError('Sync-Token ungueltig', 401))
  }
  next()
}

// Normalisiert Telefonnummer: nur Ziffern, internationalisiert wenn moeglich
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('41')) return '+' + digits
  if (digits.startsWith('0')) return '+41' + digits.substring(1)
  return digits.startsWith('+') ? phone : '+' + digits
}

// Parser fuer eine CSV-Zeile mit Quotes-Support
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map((s) => s.trim())
}

interface SheetRow {
  vorname: string; nachname: string; email: string; telefon: string
  plz: string; stadt: string; objekt: string; eigentum: string
  stromverbrauch: string; anlagengroesse: string; dachtyp: string
  speicher: string; datum: string
}

function parseCsv(csv: string): SheetRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const dataLines = lines.slice(1) // Header skippen
  const rows: SheetRow[] = []
  for (const line of dataLines) {
    const c = parseCsvLine(line)
    if (c.length < 4) continue
    rows.push({
      vorname: c[0] ?? '',
      nachname: c[1] ?? '',
      email: (c[2] ?? '').toLowerCase(),
      telefon: normalizePhone(c[3] ?? ''),
      plz: c[4] ?? '',
      stadt: c[5] ?? '',
      objekt: c[6] ?? '',
      eigentum: c[7] ?? '',
      stromverbrauch: c[8] ?? '',
      anlagengroesse: c[9] ?? '',
      dachtyp: c[10] ?? '',
      speicher: c[11] ?? '',
      datum: c[12] ?? '',
    })
  }
  return rows
}

function buildNotes(r: SheetRow): string {
  const parts: string[] = []
  if (r.objekt) parts.push(`Objekt: ${r.objekt}`)
  if (r.eigentum) parts.push(`Eigentumsverhaeltnisse: ${r.eigentum}`)
  if (r.stromverbrauch) parts.push(`Stromverbrauch: ${r.stromverbrauch}`)
  if (r.anlagengroesse) parts.push(`Anlagengroesse: ${r.anlagengroesse} m2`)
  if (r.dachtyp) parts.push(`Dachtyp: ${r.dachtyp}`)
  if (r.speicher) parts.push(`Stromspeicher gewuenscht: ${r.speicher}`)
  if (r.datum) parts.push(`Anfrage-Datum: ${r.datum}`)
  return parts.join('\n')
}

// POST /api/v1/sync/google-leads – Import aus Google Sheet
router.post('/google-leads', syncAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startedAt = Date.now()

    // CSV holen
    const csvRes = await fetch(GOOGLE_SHEET_CSV_URL)
    if (!csvRes.ok) throw new AppError(`Google Sheet nicht erreichbar: HTTP ${csvRes.status}`, 502)
    const csv = await csvRes.text()
    const rows = parseCsv(csv)

    if (rows.length === 0) {
      return res.json({ data: { imported: 0, skipped: 0, total: 0, durationMs: Date.now() - startedAt, message: 'Sheet ist leer' } })
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const r of rows) {
      try {
        const email = r.email.trim()
        const phone = r.telefon.trim()
        if (!email && !phone) { skipped++; continue }

        // Dedup: Existiert Contact mit dieser Email? (limit(1) statt maybeSingle -
        // damit auch mehrere Treffer korrekt einen ContactId liefern, sonst
        // wuerde maybeSingle bei >1 Match NULL geben und Duplikate explodieren)
        let contactId: string | null = null
        if (email) {
          const { data: existingByEmail } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', email)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(1)
          if (existingByEmail && existingByEmail.length > 0) contactId = existingByEmail[0].id
        }
        // Fallback: per Telefon (normalisiert ohne Spaces)
        if (!contactId && phone) {
          const phoneNorm = phone.replace(/\s+/g, '')
          const { data: existingByPhone } = await supabase
            .from('contacts')
            .select('id, phone')
            .is('deleted_at', null)
            .or(`phone.eq.${phoneNorm},phone.eq.${phone}`)
            .order('created_at', { ascending: true })
            .limit(1)
          if (existingByPhone && existingByPhone.length > 0) contactId = existingByPhone[0].id
        }

        if (contactId) {
          // Skip wenn schon ein Lead aus dem Sheet existiert (limit(1) statt maybeSingle)
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('contact_id', contactId)
            .eq('source', 'SEBASTIAN')
            .is('deleted_at', null)
            .limit(1)
          if (existingLead && existingLead.length > 0) { skipped++; continue }
        }

        // Neuer Contact wenn nicht vorhanden
        if (!contactId) {
          const address = [r.plz, r.stadt].filter(Boolean).join(' ')
          const { data: newContact, error: contactErr } = await supabase
            .from('contacts')
            .insert({
              first_name: r.vorname || null,
              last_name: r.nachname || null,
              email: email || null,
              phone: phone || null,
              address: address || null,
            })
            .select('id')
            .single()
          if (contactErr || !newContact) {
            errors.push(`Contact-Insert fehlgeschlagen fuer ${email}: ${contactErr?.message}`)
            skipped++
            continue
          }
          contactId = newContact.id
        }

        // Lead erstellen
        const { error: leadErr } = await supabase
          .from('leads')
          .insert({
            contact_id: contactId,
            source: 'SEBASTIAN',
            status: 'ACTIVE',
            notes: buildNotes(r),
          })
        if (leadErr) {
          errors.push(`Lead-Insert fehlgeschlagen fuer ${email}: ${leadErr.message}`)
          skipped++
          continue
        }
        imported++
      } catch (rowErr) {
        errors.push(`Row-Fehler: ${(rowErr as Error).message}`)
        skipped++
      }
    }

    const durationMs = Date.now() - startedAt
    console.log(`[sync/google-leads] ${imported} importiert, ${skipped} skipped (${durationMs}ms)`)

    res.json({
      data: {
        imported,
        skipped,
        total: rows.length,
        errors: errors.slice(0, 10),
        durationMs,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
