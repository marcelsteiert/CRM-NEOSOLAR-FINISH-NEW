import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'

/**
 * Oeffentliche Endpunkte fuer den Kampagnenversand.
 *
 * Drei Dinge, alle ohne Anmeldung erreichbar, weil sie aus einer E-Mail
 * heraus aufgerufen werden:
 *
 * - Zaehlpixel fuer die Oeffnung
 * - Weiterleitung fuer den Klick, damit der Aufruf zaehlbar wird
 * - Abmeldung, die in jede Werbemail gehoert
 *
 * Keiner dieser Endpunkte gibt Daten preis. Auch mit einer geratenen
 * Kennung erfaehrt der Aufrufer nichts ueber den Empfaenger.
 */
const router = Router()

/** 1x1-Pixel, transparent. */
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

async function ereignis(art: string, rid: string, detail?: string) {
  const { data: e } = await supabase
    .from('campaign_recipients')
    .select('id, campaign_id, email')
    .eq('id', rid)
    .maybeSingle()
  if (!e) return null

  await supabase.from('email_events').insert({
    campaign_id: e.campaign_id,
    recipient_id: e.id,
    email: e.email,
    art,
    detail: detail ?? null,
  })
  return e
}

// ── Oeffnung ─────────────────────────────────────────────────────────

router.get('/p/:rid.gif', async (req: Request, res: Response) => {
  const rid = String(req.params.rid ?? '')
  try {
    const e = await ereignis('GEOEFFNET', rid)
    if (e) {
      // Nur den ersten Zeitpunkt festhalten
      await supabase
        .from('campaign_recipients')
        .update({ geoeffnet_am: new Date().toISOString() })
        .eq('id', rid)
        .is('geoeffnet_am', null)
    }
  } catch {
    /* Das Bild wird trotzdem ausgeliefert */
  }
  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.send(PIXEL)
})

/**
 * Ein Klick auf den Link ist ein Kaufsignal – deutlich mehr wert als eine
 * blosse Oeffnung. Damit er nicht in der Auswertung versauert, wird er im
 * Kontaktverlauf vermerkt und als Aufgabe fuer den Vertrieb angelegt.
 */
async function vermerkeKlick(contactId: string, campaignId: string | null, email: string) {
  try {
    const { data: kampagne } = campaignId
      ? await supabase.from('campaigns').select('name').eq('id', campaignId).maybeSingle()
      : { data: null }
    const name = kampagne?.name ?? 'Kampagne'

    await supabase.from('activities').insert({
      contact_id: contactId,
      type: 'EMAIL',
      text: `[KAMPAGNE] ${email} hat den Link aus "${name}" geoeffnet und den Solarrechner aufgerufen`,
      created_by: 'u006',
    })

    // Nur eine Aufgabe je Kontakt und Kampagne, sonst wird es unuebersichtlich
    const { data: schon } = await supabase
      .from('tasks')
      .select('id')
      .eq('contact_id', contactId)
      .ilike('title', `[KAMPAGNE]%${name}%`)
      .limit(1)
    if (schon?.length) return

    await supabase.from('tasks').insert({
      contact_id: contactId,
      title: `[KAMPAGNE] Interesse gezeigt – ${email}`,
      description:
        `Der Kontakt hat den Link aus der Kampagne "${name}" angeklickt und den Solarrechner ` +
        'geoeffnet. Das ist ein Kaufsignal: jetzt anrufen, solange das Thema praesent ist.',
      status: 'OFFEN',
      priority: 'HIGH',
      module: 'LEAD',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (err) {
    console.error('[Kampagne] Klick vermerken fehlgeschlagen:', err)
  }
}

// ── Klick ────────────────────────────────────────────────────────────

router.get('/k/:rid', async (req: Request, res: Response) => {
  const rid = String(req.params.rid ?? '')
  const basis = process.env.CLIENT_URL || 'https://neosolar-crm.com'
  let ziel = `${basis}/planer`

  try {
    const e = await ereignis('GEKLICKT', rid, (req.query.z as string) ?? null)
    if (e) {
      // Erster Klick? Dann ist das ein Kaufsignal und gehoert ins CRM.
      const { data: vorher } = await supabase
        .from('campaign_recipients')
        .select('geklickt_am, contact_id, vorname, nachname, campaign_id')
        .eq('id', rid)
        .maybeSingle()

      await supabase
        .from('campaign_recipients')
        .update({ geklickt_am: new Date().toISOString() })
        .eq('id', rid)
        .is('geklickt_am', null)

      if (vorher && !vorher.geklickt_am && vorher.contact_id) {
        void vermerkeKlick(vorher.contact_id, vorher.campaign_id, e.email)
      }

      // Die Kennung mitgeben, damit der Planer die Anfrage zuordnen kann
      ziel = `${basis}/planer?rid=${encodeURIComponent(rid)}`
    }
  } catch {
    /* Weiterleitung erfolgt trotzdem */
  }

  res.redirect(302, ziel)
})

// ── Abmeldung ────────────────────────────────────────────────────────

const SEITE = (titel: string, text: string, farbe = '#047857') => `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titel}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#F9FAFB;color:#111827;
       display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
  .k{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:40px;max-width:520px;
     box-shadow:0 1px 3px rgba(0,0,0,.06)}
  h1{font-size:20px;margin:0 0 12px;color:${farbe}}
  p{font-size:14px;line-height:1.7;color:#374151;margin:0 0 8px}
  .f{margin-top:24px;padding-top:16px;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF}
</style></head><body><div class="k">
<h1>${titel}</h1>${text}
<div class="f">NEOSOLAR AG · Industriestrasse 28 · 9100 Herisau · info@neosolar.ch</div>
</div></body></html>`

router.get('/abmelden/:rid', async (req: Request, res: Response) => {
  try {
    const { data: e } = await supabase
      .from('campaign_recipients')
      .select('id, email, campaign_id')
      .eq('id', String(req.params.rid ?? ''))
      .maybeSingle()

    if (!e) {
      return res
        .status(404)
        .send(SEITE('Link nicht gültig', '<p>Dieser Abmeldelink ist unbekannt oder abgelaufen. ' +
          'Schreiben Sie uns an info@neosolar.ch, wir tragen Sie von Hand aus.</p>', '#B45309'))
    }

    await supabase
      .from('email_unsubscribes')
      .upsert({ email: e.email.toLowerCase(), campaign_id: e.campaign_id, grund: 'Abmeldelink' },
        { onConflict: 'email' })

    // Auch alle offenen Sendungen dieses Empfaengers stoppen
    await supabase
      .from('campaign_recipients')
      .update({ status: 'ABGEMELDET' })
      .ilike('email', e.email)
      .eq('status', 'OFFEN')

    await supabase.from('email_events').insert({
      campaign_id: e.campaign_id,
      recipient_id: e.id,
      email: e.email,
      art: 'ABGEMELDET',
    })

    res.send(
      SEITE(
        'Sie sind abgemeldet',
        `<p>Wir haben <b>${e.email}</b> aus unserem Verteiler entfernt. ` +
          'Sie erhalten von uns keine weiteren Informationen per E-Mail.</p>' +
          '<p>Falls Sie eine laufende Offerte bei uns haben, meldet sich Ihr Ansprechpartner ' +
          'weiterhin persönlich – davon ist diese Abmeldung nicht betroffen.</p>'
      )
    )
  } catch (err) {
    console.error('[Abmeldung] fehlgeschlagen:', err)
    res
      .status(500)
      .send(SEITE('Etwas ist schiefgelaufen',
        '<p>Die Abmeldung konnte nicht gespeichert werden. Bitte schreiben Sie kurz an ' +
        'info@neosolar.ch – wir erledigen es von Hand.</p>', '#B91C1C'))
  }
})

/** Abmeldung direkt per Adresse, fuer den List-Unsubscribe-Kopf. */
router.post('/abmelden', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'E-Mail fehlt' })

    await supabase
      .from('email_unsubscribes')
      .upsert({ email, grund: 'List-Unsubscribe' }, { onConflict: 'email' })
    await supabase
      .from('campaign_recipients')
      .update({ status: 'ABGEMELDET' })
      .ilike('email', email)
      .eq('status', 'OFFEN')

    res.json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
})

export default router
