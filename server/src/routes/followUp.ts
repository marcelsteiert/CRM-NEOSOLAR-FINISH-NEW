import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { loadBranding } from './admin/branding.js'

/**
 * Automatisches Nachfassen bei offenen Angeboten.
 *
 * Wird einmal taeglich von der Netlify Scheduled Function aufgerufen und
 * arbeitet eine Eskalationsleiter ab: Anrufe als Aufgabe fuer den
 * Verkaeufer, dazwischen zwei E-Mails. Bewusst wenige E-Mails � wer alle
 * paar Tage schreibt, landet im Spam und verbrennt den Kontakt.
 *
 * Idempotenz ohne Schema-Aenderung: jede Stufe hinterlaesst eine Aufgabe
 * bzw. eine Aktivitaet mit einem Kuerzel im Titel ([NF5] usw.). Bevor eine
 * Stufe ausgeloest wird, wird geprueft, ob dieses Kuerzel fuer das Angebot
 * schon existiert. Ein zweiter Lauf am selben Tag erzeugt also nichts doppelt.
 */
const router = Router()

type Kanal = 'AUFGABE' | 'EMAIL'

/**
 * Eine Stufe der Nachfass-Leiter.
 *
 * Die Texte stehen als Zeichenkette mit Platzhaltern in den Einstellungen,
 * damit sie im Admin bearbeitet werden koennen. Frueher waren es Funktionen
 * im Code � schoener zu tippen, aber niemand ausser einem Entwickler kam
 * daran.
 */
export interface Stufe {
  kuerzel: string
  tage: number
  kanal: Kanal
  titel: string
  text: string
  prioritaet: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  /** Stufe ueberspringen, ohne sie zu loeschen */
  aktiv?: boolean
  /** Nur fuer E-Mail-Stufen */
  mailBetreff?: string
  /** HTML mit Platzhaltern, siehe PLATZHALTER */
  mailText?: string
}

/** Was im Betreff und im Mailtext ersetzt wird. */
export const PLATZHALTER = [
  { name: '{kunde}', beschreibung: 'Vor- und Nachname des Kunden' },
  { name: '{vorname}', beschreibung: 'Nur der Vorname' },
  { name: '{betrag}', beschreibung: 'Angebotswert, z.B. CHF 32�"800' },
  { name: '{angebot}', beschreibung: 'Titel des Angebots' },
  { name: '{tage}', beschreibung: 'Alter des Angebots in Tagen' },
  { name: '{verkaeufer}', beschreibung: 'Name des zuständigen Verkäufers' },
] as const

export function fuellePlatzhalter(
  vorlage: string,
  werte: {
    kunde: string
    vorname: string
    betrag: string
    angebot: string
    tage: number
    verkaeufer: string
  }
): string {
  return vorlage
    .replace(/\{kunde\}/g, werte.kunde)
    .replace(/\{vorname\}/g, werte.vorname)
    .replace(/\{betrag\}/g, werte.betrag)
    .replace(/\{angebot\}/g, werte.angebot)
    .replace(/\{tage\}/g, String(werte.tage))
    .replace(/\{verkaeufer\}/g, werte.verkaeufer)
}

export const STUFEN_STANDARD: Stufe[] = [
  {
    kuerzel: 'NF2',
    tage: 2,
    kanal: 'AUFGABE',
    titel: 'Anruf: Ist die Offerte angekommen?',
    text: 'Kurz anrufen und pruefen, ob die Offerte angekommen und verstanden ist. Offene Fragen direkt klaeren.',
    prioritaet: 'HIGH',
  },
  {
    kuerzel: 'NF5',
    tage: 5,
    kanal: 'EMAIL',
    titel: 'E-Mail: Fragen zur Offerte',
    text: 'Automatische Nachfrage per E-Mail versendet.',
    prioritaet: 'MEDIUM',
    mailBetreff: 'Haben Sie Fragen zu Ihrer Offerte?',
    mailText:
      'Guten Tag {kunde}<br><br>' +
      'vor einigen Tagen haben Sie Ihre Richtofferte von uns erhalten. Ich wollte kurz nachfragen, ' +
      'ob alles verständlich war und ob Fragen aufgetaucht sind.<br><br>' +
      'Melden Sie sich gerne jederzeit � ein kurzes Telefonat klärt meist mehr als langes Lesen.',
  },
  {
    kuerzel: 'NF10',
    tage: 10,
    kanal: 'AUFGABE',
    titel: 'Zweiter Anruf: Entscheidungsstand',
    text: 'Nachfassen: Wo steht die Entscheidung? Gibt es Einwaende, die wir noch nicht kennen?',
    prioritaet: 'HIGH',
  },
  {
    kuerzel: 'NF20',
    tage: 20,
    kanal: 'EMAIL',
    titel: 'E-Mail: Offerte laeuft in 10 Tagen ab',
    text: 'Automatischer Hinweis auf die Gueltigkeitsdauer versendet.',
    prioritaet: 'MEDIUM',
    mailBetreff: 'Ihre Offerte ist noch 10 Tage gültig',
    mailText:
      'Guten Tag {kunde}<br><br>' +
      'Ihre Richtofferte über {betrag} ist noch zehn Tage gültig. Danach müssten wir die Preise ' +
      'anhand der aktuellen Materiallage neu rechnen.<br><br>' +
      'Wenn Sie die Anlage umsetzen möchten, genügt eine kurze Rückmeldung � wir vermessen dann Ihr Dach ' +
      'und bestätigen Ihnen den finalen Festpreis.',
  },
  {
    kuerzel: 'NF30',
    tage: 30,
    kanal: 'AUFGABE',
    titel: 'Entscheidung einholen oder als verloren dokumentieren',
    text: 'Gueltigkeit ist abgelaufen. Entweder verbindlich nachfassen oder das Angebot mit Verlustgrund abschliessen.',
    prioritaet: 'URGENT',
  },
  {
    kuerzel: 'NF90',
    tage: 90,
    kanal: 'AUFGABE',
    titel: 'Reaktivierung: Hat sich die Situation geaendert?',
    text: 'Nach drei Monaten erneut anfragen. Strompreise, Foerderung oder Plaene des Kunden koennen sich geaendert haben.',
    prioritaet: 'LOW',
  },
]

/** Stages, bei denen nicht mehr nachgefasst wird. */
const ABGESCHLOSSEN = ['GEWONNEN', 'VERLOREN']

const chf = (n: number) => 'CHF ' + Math.round(n).toLocaleString('de-CH')

export interface FollowUpErgebnis {
  geprueft: number
  aufgabenErstellt: number
  mailsGesendet: number
  mailsFehlgeschlagen: number
  uebersprungen: number
  details: string[]
  /** Was ein Lauf tun wuerde � gefuellt im Trockenlauf */
  vorschau?: Array<{
    dealId: string
    titel: string
    kunde: string
    kundenMail: string
    alterTage: number
    stufe: string
    aktion: 'MAIL' | 'AUFGABE'
    betreff?: string
    empfaenger?: string
  }>
  /** Einstellungen, unter denen der Lauf stattfand */
  modus?: {
    trockenlauf: boolean
    aktiv: boolean
    abDatum: string | null
    testEmpfaenger: string | null
  }
}

export interface LaufOptionen {
  /** Nichts verschicken und nichts anlegen, nur berichten */
  trockenlauf?: boolean
  /** Einstellungen uebergehen � nur fuer den manuellen Probelauf */
  erzwingen?: boolean
}

/**
 * Einstellungen des automatischen Nachfassens.
 *
 * Bewusst ausgeschaltet ausgeliefert. Wer die Automatik einschaltet, soll
 * das absichtlich tun und vorher gesehen haben, wen sie anschreibt.
 */
export interface MailAutomatik {
  /** Ohne diesen Schalter verschickt der Lauf keine einzige Mail */
  aktiv: boolean
  /**
   * Nur Angebote ab diesem Datum beruecksichtigen. Schuetzt den Altbestand:
   * ohne Stichtag bekaeme beim ersten Lauf jeder Kunde mit einem offenen
   * Angebot der letzten 120 Tage eine Mail.
   */
  abDatum: string | null
  /**
   * Alle Mails an diese Adresse umleiten statt an den Kunden. Fuer die
   * Erprobung, bevor echte Empfaenger drankommen.
   */
  testEmpfaenger: string | null
}

const AUTOMATIK_STANDARD: MailAutomatik = {
  aktiv: false,
  abDatum: null,
  testEmpfaenger: null,
}

export async function ladeAutomatik(): Promise<MailAutomatik> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'mail_automatik')
      .maybeSingle()
    if (data?.value && typeof data.value === 'object') {
      return { ...AUTOMATIK_STANDARD, ...(data.value as Partial<MailAutomatik>) }
    }
  } catch {
    /* Standard genuegt */
  }
  return AUTOMATIK_STANDARD
}

/** Die Stufen aus den Einstellungen, sonst die Standardleiter. */
export async function ladeStufen(): Promise<Stufe[]> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'mail_stufen')
      .maybeSingle()
    const wert = data?.value
    if (Array.isArray(wert) && wert.length) return wert as Stufe[]
  } catch {
    /* Standard genuegt */
  }
  return STUFEN_STANDARD
}

export async function speichereStufen(stufen: Stufe[]): Promise<Stufe[]> {
  // Nach Tagen sortieren, damit die Leiter in der richtigen Reihenfolge greift
  const sortiert = [...stufen].sort((a, b) => a.tage - b.tage)
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'mail_stufen', value: sortiert }, { onConflict: 'key' })
  if (error) throw new Error(`Stufen speichern: ${error.message}`)
  return sortiert
}

export async function speichereAutomatik(neu: MailAutomatik): Promise<MailAutomatik> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'mail_automatik', value: neu }, { onConflict: 'key' })
  if (error) throw new Error(`Einstellungen speichern: ${error.message}`)
  return neu
}

export async function fuehreFollowUpAus(opt: LaufOptionen = {}): Promise<FollowUpErgebnis> {
  const einstellungen = await ladeAutomatik()
  const trocken = opt.trockenlauf === true
  // Ohne Freigabe laeuft nur der Trockenlauf. So kann ein versehentlich
  // gesetzter Cron keine Kunden anschreiben.
  const darfSenden = trocken ? false : opt.erzwingen === true || einstellungen.aktiv

  const ergebnis: FollowUpErgebnis = {
    geprueft: 0,
    aufgabenErstellt: 0,
    mailsGesendet: 0,
    mailsFehlgeschlagen: 0,
    uebersprungen: 0,
    details: [],
    vorschau: [],
    modus: {
      trockenlauf: trocken,
      aktiv: einstellungen.aktiv,
      abDatum: einstellungen.abDatum,
      testEmpfaenger: einstellungen.testEmpfaenger,
    },
  }

  if (!darfSenden && !trocken) {
    ergebnis.details.push(
      'Die Automatik ist ausgeschaltet. Es wurde nichts verschickt und nichts angelegt.'
    )
    return ergebnis
  }

  // Offene Angebote der letzten 120 Tage � aelteres ist nicht mehr relevant
  const alterAbstand = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  // Der Stichtag geht vor, wenn er juenger ist
  const grenze =
    einstellungen.abDatum && einstellungen.abDatum > alterAbstand
      ? einstellungen.abDatum
      : alterAbstand

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, contact_id, title, value, stage, assigned_to, created_at')
    .is('deleted_at', null)
    .not('stage', 'in', `(${ABGESCHLOSSEN.join(',')})`)
    .gte('created_at', grenze)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Angebote lesen: ${error.message}`)
  if (!deals?.length) return ergebnis

  const branding = await loadBranding()
  const STUFEN = (await ladeStufen()).filter((s) => s.aktiv !== false)

  for (const deal of deals) {
    ergebnis.geprueft++
    const alterTage = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000)

    // Passende Stufe: die hoechste, die faellig ist
    const faellig = [...STUFEN].reverse().find((s) => alterTage >= s.tage)
    if (!faellig) continue

    // Schon erledigt? Aufgaben und Aktivitaeten tragen das Kuerzel im Text.
    const { data: vorhandeneTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('reference_id', deal.id)
      .ilike('title', `[${faellig.kuerzel}]%`)
      .limit(1)

    const { data: vorhandeneAktivitaet } = await supabase
      .from('activities')
      .select('id')
      .eq('deal_id', deal.id)
      .ilike('text', `[${faellig.kuerzel}]%`)
      .limit(1)

    if (vorhandeneTask?.length || vorhandeneAktivitaet?.length) {
      ergebnis.uebersprungen++
      continue
    }

    const { data: kontakt } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('id', deal.contact_id)
      .maybeSingle()

    const kundeName = kontakt ? `${kontakt.first_name} ${kontakt.last_name}`.trim() : 'Kunde'

    // ���� Trockenlauf: nur berichten, nichts anlegen und nichts senden ����
    if (trocken) {
      const istMail = faellig.kanal !== 'AUFGABE' && Boolean(kontakt?.email)
      ergebnis.vorschau!.push({
        dealId: deal.id,
        titel: deal.title,
        kunde: kundeName,
        kundenMail: kontakt?.email ?? '',
        alterTage,
        stufe: faellig.kuerzel,
        aktion: istMail ? 'MAIL' : 'AUFGABE',
        ...(istMail
          ? {
              betreff: faellig.mailBetreff,
              empfaenger: einstellungen.testEmpfaenger ?? kontakt!.email,
            }
          : {}),
      })
      if (istMail) ergebnis.mailsGesendet++
      else ergebnis.aufgabenErstellt++
      continue
    }

    // ���� Aufgabe fuer den Verkaeufer ����
    if (faellig.kanal === 'AUFGABE') {
      const { error: taskFehler } = await supabase.from('tasks').insert({
        contact_id: deal.contact_id,
        title: `[${faellig.kuerzel}] ${faellig.titel} � ${kundeName}`,
        description: `${faellig.text}\n\nAngebot: ${deal.title}\nWert: ${chf(Number(deal.value) || 0)}\nAlter: ${alterTage} Tage`,
        status: 'OFFEN',
        priority: faellig.prioritaet,
        module: 'ANGEBOT',
        reference_id: deal.id,
        reference_title: deal.title,
        assigned_to: deal.assigned_to,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      if (taskFehler) {
        ergebnis.details.push(`Aufgabe fuer ${deal.id} fehlgeschlagen: ${taskFehler.message}`)
        continue
      }
      ergebnis.aufgabenErstellt++
      ergebnis.details.push(`${faellig.kuerzel}: Aufgabe fuer ${kundeName} (${alterTage} Tage)`)
      continue
    }

    // ���� E-Mail ����
    if (!kontakt?.email) {
      // Ohne Adresse als Aufgabe ausgeben, statt still zu scheitern
      await supabase.from('tasks').insert({
        contact_id: deal.contact_id,
        title: `[${faellig.kuerzel}] Nachfassen ohne E-Mail-Adresse � ${kundeName}`,
        description: 'Beim Kontakt ist keine E-Mail hinterlegt. Bitte telefonisch nachfassen.',
        status: 'OFFEN',
        priority: 'HIGH',
        module: 'ANGEBOT',
        reference_id: deal.id,
        reference_title: deal.title,
        assigned_to: deal.assigned_to,
      })
      ergebnis.aufgabenErstellt++
      continue
    }

    const signatur = [
      'Freundliche Grüsse',
      branding.companyName,
      [branding.companyAddress, `${branding.companyZip} ${branding.companyCity}`].filter(Boolean).join(', '),
      `T ${branding.companyPhone}`,
      branding.companyEmail,
      branding.companyWebsite,
    ]
      .filter(Boolean)
      .join('<br>')

    // Namen des Verkaeufers fuer den Platzhalter
    let verkaeuferName = branding.companyName
    if (deal.assigned_to) {
      const { data: v } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', deal.assigned_to)
        .maybeSingle()
      if (v) verkaeuferName = `${v.first_name ?? ''} ${v.last_name ?? ''}`.trim() || verkaeuferName
    }

    const werte = {
      kunde: kundeName,
      vorname: kontakt.first_name ?? kundeName,
      betrag: chf(Number(deal.value) || 0),
      angebot: deal.title,
      tage: alterTage,
      verkaeufer: verkaeuferName,
    }
    const betreff = fuellePlatzhalter(faellig.mailBetreff ?? '', werte)

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6">
<p>${fuellePlatzhalter(faellig.mailText ?? '', werte)}</p>
<hr style="border:none;border-top:1px solid #E5E7EB;margin:22px 0">
<p style="font-size:13px;color:#374151">${signatur}</p>
</div>`

    // In der Erprobung an den Testempfaenger statt an den Kunden
    const empfaenger = einstellungen.testEmpfaenger || kontakt.email

    let gesendet = false
    let versandFehler: string | null = null
    let versandWeg = ''
    try {
      // Nachfassmails laufen ueber das Systempostfach: sie duerfen nicht
      // davon abhaengen, ob der Verkaeufer sein Outlook verbunden hat.
      // Antworten gehen trotzdem an ihn, und er bekommt eine Kopie.
      const { versendeMail } = await import('../lib/mailVersand.js')
      const erg = await versendeMail({
        an: empfaenger,
        betreff: einstellungen.testEmpfaenger ? `[TEST an ${kontakt.email}] ${betreff}` : betreff,
        html,
        verkaeuferId: deal.assigned_to ?? null,
        kopieAnVerkaeufer: !einstellungen.testEmpfaenger,
      })
      gesendet = erg.weg !== 'KEINER'
      versandFehler = erg.fehler
      versandWeg = erg.weg === 'SYSTEM' ? ' über info@neosolar.ch' : ''
    } catch (err) {
      versandFehler = err instanceof Error ? err.message : String(err)
    }

    if (gesendet) {
      ergebnis.mailsGesendet++
      await supabase.from('activities').insert({
        contact_id: deal.contact_id,
        deal_id: deal.id,
        type: 'EMAIL',
        text: `[${faellig.kuerzel}] Automatische Nachfrage an ${kontakt.email} gesendet${versandWeg}`,
        created_by: deal.assigned_to ?? 'u006',
      })
      ergebnis.details.push(`${faellig.kuerzel}: Mail an ${kundeName}`)
    } else {
      ergebnis.mailsFehlgeschlagen++
      // Nicht lautlos scheitern lassen � als Aufgabe sichtbar machen
      await supabase.from('tasks').insert({
        contact_id: deal.contact_id,
        title: `[${faellig.kuerzel}] Nachfassen von Hand � ${kundeName}`,
        description:
          `Die automatische E-Mail konnte nicht gesendet werden: ${versandFehler}\n\n` +
          `Betreff war: ${betreff}\n\nBitte den Kunden persoenlich kontaktieren.`,
        status: 'OFFEN',
        priority: 'HIGH',
        module: 'ANGEBOT',
        reference_id: deal.id,
        reference_title: deal.title,
        assigned_to: deal.assigned_to,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ergebnis.aufgabenErstellt++
      ergebnis.details.push(`${faellig.kuerzel}: Mail fehlgeschlagen (${versandFehler}) �  Aufgabe`)
    }
  }

  return ergebnis
}

/**
 * Ausloeser fuer die Scheduled Function. Geschuetzt mit SYNC_SECRET_TOKEN,
 * damit der Endpunkt nicht von aussen missbraucht werden kann.
 */
router.post('/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers['x-sync-token']
    const erwartet = process.env.SYNC_SECRET_TOKEN
    if (!erwartet || token !== erwartet) throw new AppError('Nicht berechtigt', 401)

    const ergebnis = await fuehreFollowUpAus()
    console.log('[Follow-Up]', JSON.stringify(ergebnis))
    res.json({ data: ergebnis })
  } catch (err) {
    next(err)
  }
})

// ���� Admin: Stufen und Einstellungen ������������������������������������������������������������������

function nurAdmin(req: Request) {
  const u = (req as any).user
  if (!u?.userId) throw new AppError('Nicht authentifiziert', 401)
  if (u.role !== 'ADMIN' && u.role !== 'GL') {
    throw new AppError('Nur fuer Admin und Geschaeftsleitung', 403)
  }
}

/** Die konfigurierten Stufen, komplett mit Texten. */
router.get('/stufen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    res.json({ data: { stufen: await ladeStufen(), platzhalter: PLATZHALTER } })
  } catch (err) {
    next(err)
  }
})

const stufeSchema = z.object({
  kuerzel: z.string().min(1).max(12),
  tage: z.number().int().min(0).max(365),
  kanal: z.enum(['AUFGABE', 'EMAIL']),
  titel: z.string().min(1),
  text: z.string().min(1),
  prioritaet: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  aktiv: z.boolean().optional(),
  mailBetreff: z.string().nullable().optional(),
  mailText: z.string().nullable().optional(),
})

router.put('/stufen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const parsed = z.object({ stufen: z.array(stufeSchema).min(1) }).safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(`Ungueltige Stufen: ${parsed.error.issues[0]?.message ?? ''}`, 400)
    }

    // Kuerzel muessen eindeutig sein � sie sind der Schutz gegen Doppelversand
    const kuerzel = parsed.data.stufen.map((s) => s.kuerzel)
    if (new Set(kuerzel).size !== kuerzel.length) {
      throw new AppError('Jedes Kuerzel darf nur einmal vorkommen', 400)
    }
    // E-Mail-Stufen brauchen Betreff und Text
    const unvollstaendig = parsed.data.stufen.find(
      (s) => s.kanal === 'EMAIL' && (!s.mailBetreff?.trim() || !s.mailText?.trim())
    )
    if (unvollstaendig) {
      throw new AppError(
        `Stufe ${unvollstaendig.kuerzel}: E-Mail-Stufen brauchen Betreff und Text`,
        400
      )
    }

    const gespeichert = await speichereStufen(
      parsed.data.stufen.map((s) => ({
        ...s,
        mailBetreff: s.mailBetreff ?? undefined,
        mailText: s.mailText ?? undefined,
      })) as Stufe[]
    )
    res.json({ data: gespeichert })
  } catch (err) {
    next(err)
  }
})

router.post('/stufen/zuruecksetzen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    res.json({ data: await speichereStufen(STUFEN_STANDARD) })
  } catch (err) {
    next(err)
  }
})

/** Schalter, Stichtag und Testempfaenger. */
router.get('/einstellungen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const einstellungen = await ladeAutomatik()

    // Ist ein Versandweg ueberhaupt verfuegbar?
    const { pruefeSystempostfach } = await import('../lib/outlookClient.js')
    const postfach = await pruefeSystempostfach().catch(() => null)

    res.json({
      data: {
        ...einstellungen,
        versandbereit: postfach?.postfachOk ?? false,
        versandMeldung: postfach?.meldung ?? 'Systempostfach nicht geprueft',
        absender: postfach?.absender ?? process.env.MS_SENDER_ADDRESS ?? 'info@neosolar.ch',
      },
    })
  } catch (err) {
    next(err)
  }
})

router.put('/einstellungen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const parsed = z
      .object({
        aktiv: z.boolean(),
        abDatum: z.string().nullable().optional(),
        testEmpfaenger: z.string().email().nullable().optional().or(z.literal('')),
      })
      .safeParse(req.body)
    if (!parsed.success) throw new AppError('Ungueltige Einstellungen', 400)

    const neu = await speichereAutomatik({
      aktiv: parsed.data.aktiv,
      abDatum: parsed.data.abDatum || null,
      testEmpfaenger: parsed.data.testEmpfaenger || null,
    })
    res.json({ data: neu })
  } catch (err) {
    next(err)
  }
})

/**
 * Trockenlauf: zeigt, wen der naechste Lauf anschreiben wuerde.
 * Verschickt nichts und legt nichts an.
 */
router.post('/vorschau', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const ergebnis = await fuehreFollowUpAus({ trockenlauf: true })
    res.json({ data: ergebnis })
  } catch (err) {
    next(err)
  }
})

/** Lauf von Hand ausloesen � auch wenn die Automatik noch aus ist. */
router.post('/jetzt-ausfuehren', async (req: Request, res: Response, next: NextFunction) => {
  try {
    nurAdmin(req)
    const ergebnis = await fuehreFollowUpAus({ erzwingen: true })
    res.json({ data: ergebnis })
  } catch (err) {
    next(err)
  }
})

export default router
