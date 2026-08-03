import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { loadBranding } from './admin/branding.js'

/**
 * Versand und Ablage der Richtofferte aus der Solarberatung.
 *
 * Gesendet wird ueber die Outlook-Verbindung DES EINGELOGGTEN Verkaeufers,
 * damit Absender und Signatur stimmen. Ist keine Verbindung vorhanden,
 * meldet die Route das ausdruecklich zurueck – die Offerte wird trotzdem
 * abgelegt, damit die Arbeit nicht verloren geht.
 */
const router = Router()

const schema = z.object({
  contactId: z.string().min(1),
  dealId: z.string().nullable().optional(),
  subject: z.string().min(3).max(300),
  /** Fertiges HTML der Offerte – wird gesendet und abgelegt */
  bodyHtml: z.string().min(50),
  /** Kurzer Einleitungstext des Verkaeufers */
  nachricht: z.string().max(4000).nullable().optional(),
  /** Nur ablegen, nicht senden */
  nurAblegen: z.boolean().nullable().optional(),
})

router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Daten fuer den Offertenversand', 400)
    const d = parsed.data
    const userId = req.user?.userId
    if (!userId) throw new AppError('Nicht angemeldet', 401)

    // ── Verkaeufer samt Signatur ──
    const { data: verkaeufer } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, signature')
      .eq('id', userId)
      .maybeSingle()

    const { data: kontakt } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('id', d.contactId)
      .maybeSingle()

    if (!kontakt) throw new AppError('Kontakt nicht gefunden', 404)
    if (!kontakt.email) throw new AppError('Beim Kontakt ist keine E-Mail-Adresse hinterlegt', 400)

    const branding = await loadBranding()

    // Signatur: eigene des Verkaeufers, sonst aus dem Branding aufgebaut
    const signatur =
      verkaeufer?.signature?.trim() ||
      [
        'Freundliche Grüsse',
        `${verkaeufer?.first_name ?? ''} ${verkaeufer?.last_name ?? ''}`.trim(),
        branding.companyName,
        [branding.companyAddress, `${branding.companyZip} ${branding.companyCity}`].filter(Boolean).join(', '),
        verkaeufer?.phone ? `T ${verkaeufer.phone}` : `T ${branding.companyPhone}`,
        verkaeufer?.email ?? branding.companyEmail,
        branding.companyWebsite,
      ]
        .filter(Boolean)
        .join('<br>')

    const einleitung = d.nachricht?.trim()
      ? d.nachricht.trim().replace(/\n/g, '<br>')
      : `Guten Tag ${kontakt.first_name} ${kontakt.last_name}<br><br>` +
        'vielen Dank für das Gespräch. Anbei erhalten Sie wie besprochen Ihre persönliche Richtofferte ' +
        'mit allen Zahlen zum Nachlesen.<br><br>' +
        'Bei Fragen erreichen Sie mich direkt – ich melde mich in den nächsten Tagen ohnehin bei Ihnen.'

    const mailHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6">
<p>${einleitung}</p>
<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
${d.bodyHtml}
<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
<p style="font-size:13px;color:#374151">${signatur}</p>
</div>`

    // ── Offerte im Dokumentenarchiv ablegen ──
    const zeitstempel = Date.now()
    const dateiName = `Richtofferte_${kontakt.last_name || 'Kunde'}_${new Date().toISOString().slice(0, 10)}.html`
    const storagePath = `${d.contactId}/angebot/${zeitstempel}_${dateiName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    let ablageOk = false
    let ablageFehler: string | null = null
    try {
      const { error: uploadFehler } = await supabase.storage
        .from('documents')
        .upload(storagePath, Buffer.from(mailHtml, 'utf8'), {
          contentType: 'text/html; charset=utf-8',
          upsert: false,
        })
      if (uploadFehler) throw new Error(uploadFehler.message)

      const { error: metaFehler } = await supabase.from('documents').insert({
        contact_id: d.contactId,
        entity_type: 'ANGEBOT',
        entity_id: d.dealId ?? null,
        file_name: dateiName,
        file_size: Buffer.byteLength(mailHtml, 'utf8'),
        mime_type: 'text/html',
        storage_path: storagePath,
        uploaded_by: userId,
        folder_path: 'angebot',
        notes: 'Richtofferte aus der Solarberatung, automatisch abgelegt',
      })
      if (metaFehler) throw new Error(metaFehler.message)
      ablageOk = true
    } catch (err) {
      ablageFehler = err instanceof Error ? err.message : String(err)
      console.error('[Offertenversand] Ablage fehlgeschlagen:', ablageFehler)
    }

    // ── Versand ueber die Outlook-Verbindung des Verkaeufers ──
    let versandStatus: 'SENT' | 'KEINE_VERBINDUNG' | 'FAILED' = 'KEINE_VERBINDUNG'
    let versandFehler: string | null = null

    let versandAbsender: string | null = null
    if (!d.nurAblegen) {
      try {
        // Der Verkaeufer loest den Versand selbst aus, deshalb bevorzugt sein
        // eigenes Postfach. Ohne Verbindung uebernimmt info@neosolar.ch.
        const { versendeMail } = await import('../lib/mailVersand.js')
        const erg = await versendeMail({
          an: kontakt.email,
          betreff: d.subject,
          html: mailHtml,
          verkaeuferId: userId,
          bevorzugtVerkaeufer: true,
        })
        versandAbsender = erg.absender
        if (erg.weg === 'KEINER') {
          versandStatus = erg.fehler ? 'FAILED' : 'KEINE_VERBINDUNG'
          versandFehler = erg.fehler
          if (erg.fehler) console.error('[Offertenversand] fehlgeschlagen:', erg.fehler)
        } else {
          versandStatus = 'SENT'
        }
      } catch (err) {
        versandFehler = err instanceof Error ? err.message : String(err)
        versandStatus = 'FAILED'
        console.error('[Offertenversand] fehlgeschlagen:', versandFehler)
      }
    }

    // ── Aktivitaet protokollieren ──
    const protokoll =
      versandStatus === 'SENT'
        ? `Richtofferte per E-Mail an ${kontakt.email} gesendet` +
          (versandAbsender ? ` (Absender ${versandAbsender})` : '')
        : versandStatus === 'FAILED'
          ? `Versand der Richtofferte an ${kontakt.email} fehlgeschlagen: ${versandFehler}`
          : `Richtofferte abgelegt, kein Versand (kein Postfach eingerichtet)`

    await supabase.from('activities').insert({
      contact_id: d.contactId,
      deal_id: d.dealId ?? null,
      type: 'EMAIL',
      text: protokoll,
      created_by: userId,
    })

    res.json({
      data: {
        versand: versandStatus,
        versandFehler,
        abgelegt: ablageOk,
        ablageFehler,
        empfaenger: kontakt.email,
        dateiName: ablageOk ? dateiName : null,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
