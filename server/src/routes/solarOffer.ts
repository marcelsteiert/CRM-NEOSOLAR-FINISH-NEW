import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { signaturFuerUser } from '../lib/mailSignatur.js'
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
  /**
   * Storage-Pfad des bereits abgelegten Offerten-PDFs.
   *
   * Der Client erzeugt das PDF - dort liegt die gerenderte Druckansicht -
   * und laedt es direkt in den Storage. Base64 durch die Function scheidet
   * aus: deren Rumpf vertraegt nur wenige Megabyte, ein Offerten-PDF mit
   * Karten und Diagrammen liegt schnell darueber. Ohne PDF geht die Mail
   * trotzdem raus, die Zahlen stehen auch im Text.
   */
  pdfPfad: z.string().max(500).nullable().optional(),
  pdfName: z.string().max(200).nullable().optional(),
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

    // Eine Signatur fuer alle Mailstrecken – siehe lib/mailSignatur.ts
    const signatur = await signaturFuerUser(userId)

    const einleitung = d.nachricht?.trim()
      ? d.nachricht.trim().replace(/\n/g, '<br>')
      : `Guten Tag ${kontakt.first_name} ${kontakt.last_name}<br><br>` +
        'vielen Dank für das Gespräch. Anbei erhalten Sie wie besprochen Ihre persönliche Richtofferte ' +
        'mit allen Zahlen zum Nachlesen.<br><br>' +
        'Bei Fragen erreichen Sie mich direkt – ich melde mich in den nächsten Tagen ohnehin bei Ihnen.<br><br>' +
        'Freundliche Grüsse'

    const mailHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6">
<p>${einleitung}</p>
${
  d.pdfPfad
    ? `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px">
<tr><td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#92400E">
📎 <b>Die vollständige Offerte finden Sie im Anhang</b> – alle Seiten inklusive Bestellblatt zum Ausdrucken.
Die wichtigsten Zahlen stehen zusätzlich unten in dieser E-Mail.
</td></tr></table>`
    : ''
}
<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
${d.bodyHtml}
<div style="border-top:1px solid #E5E7EB;margin:24px 0 16px"></div>
${signatur}
</div>`

    /*
     * Anhang: das PDF liegt bereits im Storage, der Client hat es dort
     * abgelegt. Wir holen es nur noch, um es an die Mail zu haengen.
     * Scheitert das, geht die Mail ohne Anhang raus - die Zahlen stehen
     * auch im Text, und das PDF ist beim Kunden ohnehin archiviert.
     */
    let anhangBase64: string | null = null
    let anhangName = d.pdfName?.trim() || 'Richtofferte.pdf'
    if (d.pdfPfad) {
      try {
        const { data: datei, error } = await supabase.storage.from('documents').download(d.pdfPfad)
        if (error) throw new Error(error.message)
        anhangBase64 = Buffer.from(await datei.arrayBuffer()).toString('base64')
        if (!anhangName.toLowerCase().endsWith('.pdf')) anhangName += '.pdf'
      } catch (err) {
        console.error('[Offertenversand] Anhang nicht ladbar:', err)
      }
    }

    // ── Offerte im Dokumentenarchiv ablegen ──
    // Nur wenn kein PDF kam: dann ist noch nichts abgelegt. Eine
    // HTML-Datei im Archiv kann niemand ausdrucken, aber besser als nichts.
    const zeitstempel = Date.now()
    const dateiName = d.pdfPfad
      ? anhangName
      : `Richtofferte_${kontakt.last_name || 'Kunde'}_${new Date().toISOString().slice(0, 10)}.html`

    let ablageOk = Boolean(d.pdfPfad)
    let ablageFehler: string | null = null
    if (!d.pdfPfad) {
      const inhalt = Buffer.from(mailHtml, 'utf8')
      const storagePath = `${d.contactId}/angebot/${zeitstempel}_${dateiName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      try {
        const { error: uploadFehler } = await supabase.storage
          .from('documents')
          .upload(storagePath, inhalt, { contentType: 'text/html; charset=utf-8', upsert: false })
        if (uploadFehler) throw new Error(uploadFehler.message)

        const { error: metaFehler } = await supabase.from('documents').insert({
          contact_id: d.contactId,
          entity_type: 'ANGEBOT',
          entity_id: d.dealId ?? null,
          file_name: dateiName,
          file_size: inhalt.byteLength,
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
          ...(anhangBase64
            ? {
                anhaenge: [
                  { name: anhangName, mimeType: 'application/pdf', inhaltBase64: anhangBase64 },
                ],
              }
            : {}),
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
