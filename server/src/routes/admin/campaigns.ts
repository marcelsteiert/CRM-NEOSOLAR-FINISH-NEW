import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../middleware/errorHandler.js'
import { loadBranding } from './branding.js'

/**
 * Kampagnen: Massenversand an Leads mit Tagesbudget.
 *
 * Bewusst getrennt vom automatischen Nachfassen. Dort geht es um einzelne
 * Angebote, hier um viele Empfaenger auf einmal.
 *
 * Drei Dinge sind fest eingebaut und nicht abschaltbar, weil ohne sie der
 * Versand rechtlich wie technisch scheitert:
 *
 * - **Abmeldelink** in jeder Mail, mit einer Sperrliste ueber alle Kampagnen
 * - **Bounce-Sperre**: tote Adressen werden uebersprungen, sonst steigt die
 *   Rueckläuferquote und der Anbieter blockiert den Versand
 * - **Tagesbudget**: ein Schwall von zehntausend Mails am Stueck laesst jede
 *   Domain als Spam einstufen
 */
const router = Router()

function nurAdmin(req: Request) {
  const u = (req as any).user
  if (!u?.userId) throw new AppError('Nicht authentifiziert', 401)
  if (u.role !== 'ADMIN' && u.role !== 'GL') {
    throw new AppError('Nur fuer Admin und Geschaeftsleitung', 403)
  }
  return u.userId as string
}

// ── Empfaenger auswaehlen ────────────────────────────────────────────

const filterSchema = z.object({
  /** Lead-Quelle, z.B. HOMEPAGE oder KALTAKQUISE */
  quellen: z.array(z.string()).optional(),
  /** Lead-Status */
  status: z.array(z.string()).optional(),
  /** Nur Leads, die seit diesem Datum angelegt wurden */
  abDatum: z.string().nullable().optional(),
  /** Nur Leads, die vor diesem Datum angelegt wurden */
  bisDatum: z.string().nullable().optional(),
  /** Kontakte mit Angebot ein- oder ausschliessen */
  mitAngebot: z.enum(['EGAL', 'NUR_MIT', 'NUR_OHNE']).optional(),
  /** Obergrenze fuer die Auswahl */
  limit: z.number().int().min(1).max(200000).optional(),
})

export type Kampagnenfilter = z.infer<typeof filterSchema>

interface Empfaenger {
  leadId: string
  contactId: string
  email: string
  vorname: string
  nachname: string
  ort: string
}

/**
 * Sucht Empfaenger nach den Filtern.
 *
 * Abgemeldete Adressen, bekannte Rueckläufer und Dubletten fallen dabei
 * heraus – das passiert hier und nicht erst beim Versand, damit die Zahl
 * in der Vorschau der Wahrheit entspricht.
 */
export async function findeEmpfaenger(
  filter: Kampagnenfilter
): Promise<{ empfaenger: Empfaenger[]; gefiltert: Record<string, number> }> {
  const grenze = Math.min(filter.limit ?? 5000, 200000)

  let abfrage = supabase
    .from('leads')
    .select('id, contact_id, source, status, created_at')
    .is('deleted_at', null)
    .not('contact_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(grenze * 2) // Puffer, weil gleich noch gefiltert wird

  if (filter.quellen?.length) abfrage = abfrage.in('source', filter.quellen)
  if (filter.status?.length) abfrage = abfrage.in('status', filter.status)
  if (filter.abDatum) abfrage = abfrage.gte('created_at', filter.abDatum)
  if (filter.bisDatum) abfrage = abfrage.lte('created_at', filter.bisDatum)

  const { data: leads, error } = await abfrage
  if (error) throw new AppError(`Leads lesen: ${error.message}`, 500)
  if (!leads?.length) return { empfaenger: [], gefiltert: {} }

  // Kontaktdaten in Bloecken nachladen – die IN-Liste darf nicht zu lang werden
  const kontaktIds = [...new Set(leads.map((l) => l.contact_id as string))]
  const kontakte = new Map<string, { email: string; first_name: string; last_name: string; address: string }>()
  for (let i = 0; i < kontaktIds.length; i += 500) {
    const teil = kontaktIds.slice(i, i + 500)
    const { data } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name, address')
      .in('id', teil)
      .is('deleted_at', null)
    for (const k of data ?? []) kontakte.set(k.id, k as any)
  }

  // Sperrlisten laden
  const { data: abgemeldet } = await supabase.from('email_unsubscribes').select('email')
  const { data: rueckläufer } = await supabase.from('email_bounces').select('email').eq('art', 'HARD')
  const gesperrt = new Set([
    ...(abgemeldet ?? []).map((a) => a.email.toLowerCase()),
    ...(rueckläufer ?? []).map((b) => b.email.toLowerCase()),
  ])

  // Kontakte mit Angebot, falls danach gefiltert wird
  let mitAngebot = new Set<string>()
  if (filter.mitAngebot && filter.mitAngebot !== 'EGAL') {
    const { data: deals } = await supabase.from('deals').select('contact_id').is('deleted_at', null)
    mitAngebot = new Set((deals ?? []).map((d) => d.contact_id as string).filter(Boolean))
  }

  const gefiltert: Record<string, number> = {
    ohneAdresse: 0,
    abgemeldet: 0,
    ruecklaeufer: 0,
    doppelt: 0,
    angebotsfilter: 0,
  }
  const gesehen = new Set<string>()
  const empfaenger: Empfaenger[] = []

  for (const lead of leads) {
    if (empfaenger.length >= grenze) break
    const k = kontakte.get(lead.contact_id as string)
    if (!k?.email || !k.email.includes('@')) {
      gefiltert.ohneAdresse++
      continue
    }
    const mail = k.email.toLowerCase().trim()

    if (gesperrt.has(mail)) {
      // Getrennt zaehlen, damit man sieht, woran es liegt
      gefiltert.abgemeldet++
      continue
    }
    if (gesehen.has(mail)) {
      gefiltert.doppelt++
      continue
    }
    if (filter.mitAngebot === 'NUR_MIT' && !mitAngebot.has(lead.contact_id as string)) {
      gefiltert.angebotsfilter++
      continue
    }
    if (filter.mitAngebot === 'NUR_OHNE' && mitAngebot.has(lead.contact_id as string)) {
      gefiltert.angebotsfilter++
      continue
    }

    gesehen.add(mail)
    empfaenger.push({
      leadId: lead.id as string,
      contactId: lead.contact_id as string,
      email: k.email.trim(),
      vorname: (k.first_name ?? '').trim(),
      nachname: (k.last_name ?? '').trim(),
      // Ort aus der Adresse: alles nach der Postleitzahl
      ort: ((k.address ?? '').match(/\d{4}\s+(.+)$/)?.[1] ?? '').trim(),
    })
  }

  return { empfaenger, gefiltert }
}

// ── Vorschau der Auswahl ─────────────────────────────────────────────

router.post('/empfaenger/vorschau', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const parsed = filterSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Filter', 400)

    const { empfaenger, gefiltert } = await findeEmpfaenger(parsed.data)
    res.json({
      data: {
        anzahl: empfaenger.length,
        gefiltert,
        beispiele: empfaenger.slice(0, 10).map((e) => ({
          email: e.email,
          name: `${e.vorname} ${e.nachname}`.trim(),
          ort: e.ort,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

/** Welche Quellen und Status gibt es ueberhaupt? */
router.get('/filter-werte', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const { data } = await supabase.rpc('lead_quellen_zaehlen').select('*')
    if (data) return res.json({ data })

    // Ohne RPC: einfache Auszaehlung ueber eine Stichprobe
    const { data: leads } = await supabase
      .from('leads')
      .select('source, status')
      .is('deleted_at', null)
      .limit(50000)
    const quellen = new Map<string, number>()
    const status = new Map<string, number>()
    for (const l of leads ?? []) {
      if (l.source) quellen.set(l.source, (quellen.get(l.source) ?? 0) + 1)
      if (l.status) status.set(l.status, (status.get(l.status) ?? 0) + 1)
    }
    res.json({
      data: {
        quellen: [...quellen.entries()].map(([wert, anzahl]) => ({ wert, anzahl })).sort((a, b) => b.anzahl - a.anzahl),
        status: [...status.entries()].map(([wert, anzahl]) => ({ wert, anzahl })).sort((a, b) => b.anzahl - a.anzahl),
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── Kampagnen verwalten ──────────────────────────────────────────────

const kampagneSchema = z.object({
  name: z.string().min(1).max(120),
  betreff: z.string().min(1).max(200),
  inhalt: z.string().min(1).max(50000),
  tagesbudget: z.number().int().min(1).max(2000).optional(),
  vonStunde: z.number().int().min(0).max(23).optional(),
  bisStunde: z.number().int().min(1).max(24).optional(),
  filter: filterSchema.optional(),
})

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const { data: kampagnen } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    // Kennzahlen je Kampagne
    const mitZahlen = await Promise.all(
      (kampagnen ?? []).map(async (k) => {
        const zaehle = async (feld: string, wert?: string) => {
          let q = supabase
            .from('campaign_recipients')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', k.id)
          q = wert ? q.eq(feld, wert) : q.not(feld, 'is', null)
          const { count } = await q
          return count ?? 0
        }
        return {
          ...k,
          empfaenger: await zaehle('status', 'OFFEN') + await zaehle('status', 'GESENDET'),
          offen: await zaehle('status', 'OFFEN'),
          gesendet: await zaehle('status', 'GESENDET'),
          geoeffnet: await zaehle('geoeffnet_am'),
          geklickt: await zaehle('geklickt_am'),
          konvertiert: await zaehle('konvertiert_am'),
        }
      })
    )

    res.json({ data: mitZahlen })
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = nurAdmin(req)
    const parsed = kampagneSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(`Ungueltige Angaben: ${parsed.error.issues[0]?.message ?? ''}`, 400)
    }
    const d = parsed.data

    // Der Abmeldelink ist Pflicht. Fehlt er im Text, wird er angehaengt.
    const inhalt = d.inhalt.includes('{abmelden}')
      ? d.inhalt
      : `${d.inhalt}\n<p style="font-size:11px;color:#9CA3AF;margin-top:28px">` +
        'Sie erhalten diese Nachricht, weil Sie mit NEOSOLAR in Kontakt standen. ' +
        '<a href="{abmelden}" style="color:#9CA3AF">Hier abmelden</a>.</p>'

    const { data: kampagne, error } = await supabase
      .from('campaigns')
      .insert({
        name: d.name,
        betreff: d.betreff,
        inhalt,
        tagesbudget: d.tagesbudget ?? 100,
        von_stunde: d.vonStunde ?? 9,
        bis_stunde: d.bisStunde ?? 17,
        filter: d.filter ?? {},
        erstellt_von: userId,
      })
      .select('*')
      .single()
    if (error) throw new AppError(`Kampagne anlegen: ${error.message}`, 500)

    res.status(201).json({ data: kampagne })
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const parsed = kampagneSchema.partial().safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Angaben', 400)
    const d = parsed.data

    const felder: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (d.name !== undefined) felder.name = d.name
    if (d.betreff !== undefined) felder.betreff = d.betreff
    if (d.inhalt !== undefined) felder.inhalt = d.inhalt
    if (d.tagesbudget !== undefined) felder.tagesbudget = d.tagesbudget
    if (d.vonStunde !== undefined) felder.von_stunde = d.vonStunde
    if (d.bisStunde !== undefined) felder.bis_stunde = d.bisStunde
    if (d.filter !== undefined) felder.filter = d.filter

    const { data, error } = await supabase
      .from('campaigns')
      .update(felder)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) throw new AppError(`Speichern: ${error.message}`, 500)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const { error } = await supabase.from('campaigns').delete().eq('id', req.params.id)
    if (error) throw new AppError(`Loeschen: ${error.message}`, 500)
    res.json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
})

/** Empfaenger nach den Filtern der Kampagne einspielen. */
router.post('/:id/empfaenger-laden', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const { data: kampagne } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()
    if (!kampagne) throw new AppError('Kampagne nicht gefunden', 404)
    if (kampagne.status === 'LAEUFT') {
      throw new AppError('Die Kampagne laeuft. Bitte zuerst pausieren.', 400)
    }

    const { empfaenger, gefiltert } = await findeEmpfaenger(kampagne.filter ?? {})

    // Wer in dieser Kampagne schon drin ist, kommt nicht doppelt hinein
    const { data: vorhanden } = await supabase
      .from('campaign_recipients')
      .select('email')
      .eq('campaign_id', kampagne.id)
    const schonDrin = new Set((vorhanden ?? []).map((v) => v.email.toLowerCase()))

    const neu = empfaenger.filter((e) => !schonDrin.has(e.email.toLowerCase()))
    let eingefuegt = 0
    for (let i = 0; i < neu.length; i += 500) {
      const teil = neu.slice(i, i + 500).map((e) => ({
        campaign_id: kampagne.id,
        lead_id: e.leadId,
        contact_id: e.contactId,
        email: e.email,
        vorname: e.vorname,
        nachname: e.nachname,
        ort: e.ort,
      }))
      const { error } = await supabase.from('campaign_recipients').insert(teil)
      if (error) throw new AppError(`Empfaenger einfuegen: ${error.message}`, 500)
      eingefuegt += teil.length
    }

    res.json({
      data: { eingefuegt, bereitsVorhanden: empfaenger.length - neu.length, gefiltert },
    })
  } catch (err) {
    next(err)
  }
})

/** Starten, pausieren, beenden. */
router.post('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const status = String(req.body?.status ?? '')
    if (!['ENTWURF', 'LAEUFT', 'PAUSIERT', 'FERTIG'].includes(status)) {
      throw new AppError('Unbekannter Status', 400)
    }

    if (status === 'LAEUFT') {
      // Ohne Empfaenger und ohne Versandweg macht Starten keinen Sinn
      const { count } = await supabase
        .from('campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', req.params.id)
        .eq('status', 'OFFEN')
      if (!count) throw new AppError('Keine offenen Empfaenger. Bitte zuerst Empfaenger laden.', 400)

      const { pruefeSystempostfach } = await import('../../lib/outlookClient.js')
      const postfach = await pruefeSystempostfach()
      if (!postfach.postfachOk) {
        throw new AppError(`Versand nicht moeglich: ${postfach.meldung}`, 400)
      }
    }

    const felder: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'LAEUFT') felder.gestartet_am = new Date().toISOString()
    if (status === 'FERTIG') felder.beendet_am = new Date().toISOString()

    const { data, error } = await supabase
      .from('campaigns')
      .update(felder)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) throw new AppError(`Status setzen: ${error.message}`, 500)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ── Versand ──────────────────────────────────────────────────────────

/** Baut die fertige Mail fuer einen Empfaenger. */
export function baueMail(
  vorlage: { betreff: string; inhalt: string },
  e: { id: string; vorname?: string | null; nachname?: string | null; ort?: string | null },
  basis: string,
  signatur: string
): { betreff: string; html: string } {
  const anrede = (e.vorname ?? '').trim() || 'Guten Tag'
  const werte: Record<string, string> = {
    '{vorname}': (e.vorname ?? '').trim(),
    '{nachname}': (e.nachname ?? '').trim(),
    '{name}': `${e.vorname ?? ''} ${e.nachname ?? ''}`.trim(),
    '{anrede}': anrede,
    '{ort}': (e.ort ?? '').trim() || 'Ihrer Gemeinde',
    '{link}': `${basis}/api/v1/t/k/${e.id}`,
    '{abmelden}': `${basis}/api/v1/t/abmelden/${e.id}`,
  }

  const ersetze = (s: string) =>
    Object.entries(werte).reduce((t, [k, v]) => t.split(k).join(v), s)

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111827;line-height:1.7;max-width:600px">
${ersetze(vorlage.inhalt)}
<hr style="border:none;border-top:1px solid #E5E7EB;margin:26px 0">
<p style="font-size:13px;color:#374151">${signatur}</p>
<img src="${basis}/api/v1/t/p/${e.id}.gif" width="1" height="1" alt="" style="display:block">
</div>`

  return { betreff: ersetze(vorlage.betreff), html }
}

export interface VersandErgebnis {
  kampagnen: number
  gesendet: number
  fehlgeschlagen: number
  uebersprungen: number
  details: string[]
}

/**
 * Ein Versandlauf. Verschickt hoechstens das Tagesbudget je Kampagne und
 * haelt sich an das Zeitfenster.
 */
export async function fuehreVersandAus(opt: { trockenlauf?: boolean } = {}): Promise<VersandErgebnis> {
  const ergebnis: VersandErgebnis = {
    kampagnen: 0,
    gesendet: 0,
    fehlgeschlagen: 0,
    uebersprungen: 0,
    details: [],
  }

  const { data: laufende } = await supabase.from('campaigns').select('*').eq('status', 'LAEUFT')
  if (!laufende?.length) return ergebnis

  const basis = process.env.CLIENT_URL || 'https://neosolar-crm.com'
  const branding = await loadBranding()
  const signatur = [
    branding.companyName,
    [branding.companyAddress, `${branding.companyZip} ${branding.companyCity}`].filter(Boolean).join(', '),
    `T ${branding.companyPhone}`,
    branding.companyEmail,
  ]
    .filter(Boolean)
    .join('<br>')

  const stunde = new Date().getHours()

  for (const k of laufende) {
    ergebnis.kampagnen++

    if (stunde < k.von_stunde || stunde >= k.bis_stunde) {
      ergebnis.details.push(`${k.name}: ausserhalb des Zeitfensters (${k.von_stunde}–${k.bis_stunde} Uhr)`)
      continue
    }

    // Wie viele wurden heute schon verschickt?
    const heute = new Date()
    heute.setHours(0, 0, 0, 0)
    const { count: heuteSchon } = await supabase
      .from('campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', k.id)
      .eq('status', 'GESENDET')
      .gte('gesendet_am', heute.toISOString())

    const rest = k.tagesbudget - (heuteSchon ?? 0)
    if (rest <= 0) {
      ergebnis.details.push(`${k.name}: Tagesbudget von ${k.tagesbudget} erreicht`)
      continue
    }

    const { data: naechste } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', k.id)
      .eq('status', 'OFFEN')
      .limit(rest)

    if (!naechste?.length) {
      await supabase
        .from('campaigns')
        .update({ status: 'FERTIG', beendet_am: new Date().toISOString() })
        .eq('id', k.id)
      ergebnis.details.push(`${k.name}: alle Empfaenger abgearbeitet, Kampagne beendet`)
      continue
    }

    const { sendeSystemMail } = await import('../../lib/outlookClient.js')

    for (const e of naechste) {
      // Kurz vor dem Versand nochmals gegen die Sperrlisten pruefen –
      // zwischen Laden und Senden koennen Tage liegen
      const mail = e.email.toLowerCase()
      const { data: gesperrt } = await supabase
        .from('email_unsubscribes')
        .select('email')
        .eq('email', mail)
        .maybeSingle()
      if (gesperrt) {
        await supabase.from('campaign_recipients').update({ status: 'ABGEMELDET' }).eq('id', e.id)
        ergebnis.uebersprungen++
        continue
      }

      const { betreff, html } = baueMail(k, e, basis, signatur)

      if (opt.trockenlauf) {
        ergebnis.gesendet++
        ergebnis.details.push(`[Probe] ${e.email}: ${betreff}`)
        continue
      }

      try {
        await sendeSystemMail({
          an: e.email,
          betreff,
          html,
          // Damit Abmeldungen auch ueber den Mailclient funktionieren
          listUnsubscribe: `${basis}/api/v1/t/abmelden/${e.id}`,
        })
        await supabase
          .from('campaign_recipients')
          .update({ status: 'GESENDET', gesendet_am: new Date().toISOString() })
          .eq('id', e.id)
        await supabase.from('email_events').insert({
          campaign_id: k.id,
          recipient_id: e.id,
          email: e.email,
          art: 'GESENDET',
        })
        ergebnis.gesendet++
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err)
        await supabase
          .from('campaign_recipients')
          .update({ status: 'FEHLER', fehler: text.slice(0, 500) })
          .eq('id', e.id)

        // Adressfehler als Rueckläufer merken, damit sie nicht wiederkommen
        if (/ErrorInvalidRecipients|RecipientNotFound|does not exist|InvalidRecipients/i.test(text)) {
          await supabase
            .from('email_bounces')
            .upsert(
              { email: mail, art: 'HARD', letzter_grund: text.slice(0, 300), updated_at: new Date().toISOString() },
              { onConflict: 'email' }
            )
        }
        ergebnis.fehlgeschlagen++
      }
    }

    ergebnis.details.push(`${k.name}: ${naechste.length} verarbeitet`)
  }

  return ergebnis
}

/** Probelauf: zeigt, was verschickt wuerde. */
router.post('/versand/vorschau', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    res.json({ data: await fuehreVersandAus({ trockenlauf: true }) })
  } catch (err) {
    next(err)
  }
})

/** Versand von Hand anstossen. */
router.post('/versand/jetzt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    res.json({ data: await fuehreVersandAus() })
  } catch (err) {
    next(err)
  }
})

/** Eine Testmail an eine beliebige Adresse, mit Beispieldaten gefuellt. */
router.post('/:id/testmail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const an = z.string().email().safeParse(req.body?.an)
    if (!an.success) throw new AppError('Bitte eine gueltige Adresse angeben', 400)

    const { data: k } = await supabase.from('campaigns').select('*').eq('id', req.params.id).maybeSingle()
    if (!k) throw new AppError('Kampagne nicht gefunden', 404)

    const basis = process.env.CLIENT_URL || 'https://neosolar-crm.com'
    const branding = await loadBranding()
    const signatur = [branding.companyName, branding.companyEmail].filter(Boolean).join('<br>')
    const { betreff, html } = baueMail(
      k,
      { id: 'test', vorname: 'Max', nachname: 'Muster', ort: 'Herisau' },
      basis,
      signatur
    )

    const { sendeSystemMail } = await import('../../lib/outlookClient.js')
    await sendeSystemMail({ an: an.data, betreff: `[TEST] ${betreff}`, html })
    res.json({ data: { gesendet: true, an: an.data } })
  } catch (err) {
    next(err)
  }
})

/** Auswertung einer Kampagne. */
router.get('/:id/auswertung', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const id = req.params.id
    const zaehle = async (bedingung: (q: any) => any) => {
      const { count } = await bedingung(
        supabase.from('campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', id)
      )
      return count ?? 0
    }

    const gesamt = await zaehle((q: any) => q)
    const gesendet = await zaehle((q: any) => q.eq('status', 'GESENDET'))
    const geoeffnet = await zaehle((q: any) => q.not('geoeffnet_am', 'is', null))
    const geklickt = await zaehle((q: any) => q.not('geklickt_am', 'is', null))
    const konvertiert = await zaehle((q: any) => q.not('konvertiert_am', 'is', null))
    const abgemeldet = await zaehle((q: any) => q.eq('status', 'ABGEMELDET'))
    const fehler = await zaehle((q: any) => q.eq('status', 'FEHLER'))

    const quote = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

    res.json({
      data: {
        gesamt,
        gesendet,
        offen: gesamt - gesendet - abgemeldet - fehler,
        geoeffnet,
        geklickt,
        konvertiert,
        abgemeldet,
        fehler,
        oeffnungsquote: quote(geoeffnet, gesendet),
        klickquote: quote(geklickt, gesendet),
        konversionsquote: quote(konvertiert, gesendet),
        abmeldequote: quote(abgemeldet, gesendet),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
