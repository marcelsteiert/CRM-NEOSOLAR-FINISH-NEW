import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { loadBranding } from './admin/branding.js'

/**
 * Automatisches Nachfassen bei offenen Angeboten.
 *
 * Wird einmal taeglich von der Netlify Scheduled Function aufgerufen und
 * arbeitet eine Eskalationsleiter ab: Anrufe als Aufgabe fuer den
 * Verkaeufer, dazwischen zwei E-Mails. Bewusst wenige E-Mails – wer alle
 * paar Tage schreibt, landet im Spam und verbrennt den Kontakt.
 *
 * Idempotenz ohne Schema-Aenderung: jede Stufe hinterlaesst eine Aufgabe
 * bzw. eine Aktivitaet mit einem Kuerzel im Titel ([NF5] usw.). Bevor eine
 * Stufe ausgeloest wird, wird geprueft, ob dieses Kuerzel fuer das Angebot
 * schon existiert. Ein zweiter Lauf am selben Tag erzeugt also nichts doppelt.
 */
const router = Router()

type Kanal = 'AUFGABE' | 'EMAIL'

interface Stufe {
  kuerzel: string
  tage: number
  kanal: Kanal
  titel: string
  text: string
  prioritaet: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  /** Nur fuer E-Mail-Stufen */
  mailBetreff?: string
  mailText?: (kunde: string, betrag: string) => string
}

const STUFEN: Stufe[] = [
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
    mailText: (kunde) =>
      `Guten Tag ${kunde}<br><br>` +
      'vor einigen Tagen haben Sie Ihre Richtofferte von uns erhalten. Ich wollte kurz nachfragen, ' +
      'ob alles verständlich war und ob Fragen aufgetaucht sind.<br><br>' +
      'Melden Sie sich gerne jederzeit – ein kurzes Telefonat klärt meist mehr als langes Lesen.',
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
    mailText: (kunde, betrag) =>
      `Guten Tag ${kunde}<br><br>` +
      `Ihre Richtofferte über ${betrag} ist noch zehn Tage gültig. Danach müssten wir die Preise ` +
      'anhand der aktuellen Materiallage neu rechnen.<br><br>' +
      'Wenn Sie die Anlage umsetzen möchten, genügt eine kurze Rückmeldung – wir vermessen dann Ihr Dach ' +
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
}

export async function fuehreFollowUpAus(): Promise<FollowUpErgebnis> {
  const ergebnis: FollowUpErgebnis = {
    geprueft: 0,
    aufgabenErstellt: 0,
    mailsGesendet: 0,
    mailsFehlgeschlagen: 0,
    uebersprungen: 0,
    details: [],
  }

  // Offene Angebote der letzten 120 Tage – aelteres ist nicht mehr relevant
  const grenze = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
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

    // ── Aufgabe fuer den Verkaeufer ──
    if (faellig.kanal === 'AUFGABE') {
      const { error: taskFehler } = await supabase.from('tasks').insert({
        contact_id: deal.contact_id,
        title: `[${faellig.kuerzel}] ${faellig.titel} – ${kundeName}`,
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

    // ── E-Mail ──
    if (!kontakt?.email) {
      // Ohne Adresse als Aufgabe ausgeben, statt still zu scheitern
      await supabase.from('tasks').insert({
        contact_id: deal.contact_id,
        title: `[${faellig.kuerzel}] Nachfassen ohne E-Mail-Adresse – ${kundeName}`,
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

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6">
<p>${faellig.mailText!(kundeName, chf(Number(deal.value) || 0))}</p>
<hr style="border:none;border-top:1px solid #E5E7EB;margin:22px 0">
<p style="font-size:13px;color:#374151">${signatur}</p>
</div>`

    let gesendet = false
    let versandFehler: string | null = null
    let versandWeg = ''
    try {
      // Nachfassmails laufen ueber das Systempostfach: sie duerfen nicht
      // davon abhaengen, ob der Verkaeufer sein Outlook verbunden hat.
      // Antworten gehen trotzdem an ihn, und er bekommt eine Kopie.
      const { versendeMail } = await import('../lib/mailVersand.js')
      const erg = await versendeMail({
        an: kontakt.email,
        betreff: faellig.mailBetreff!,
        html,
        verkaeuferId: deal.assigned_to ?? null,
        kopieAnVerkaeufer: true,
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
      // Nicht lautlos scheitern lassen – als Aufgabe sichtbar machen
      await supabase.from('tasks').insert({
        contact_id: deal.contact_id,
        title: `[${faellig.kuerzel}] Nachfassen von Hand – ${kundeName}`,
        description:
          `Die automatische E-Mail konnte nicht gesendet werden: ${versandFehler}\n\n` +
          `Betreff war: ${faellig.mailBetreff}\n\nBitte den Kunden persoenlich kontaktieren.`,
        status: 'OFFEN',
        priority: 'HIGH',
        module: 'ANGEBOT',
        reference_id: deal.id,
        reference_title: deal.title,
        assigned_to: deal.assigned_to,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ergebnis.aufgabenErstellt++
      ergebnis.details.push(`${faellig.kuerzel}: Mail fehlgeschlagen (${versandFehler}) → Aufgabe`)
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

/** Vorschau ohne Nebenwirkungen – zeigt, welche Stufen konfiguriert sind. */
router.get('/stufen', (_req: Request, res: Response) => {
  res.json({
    data: STUFEN.map((s) => ({
      kuerzel: s.kuerzel,
      tage: s.tage,
      kanal: s.kanal,
      titel: s.titel,
      prioritaet: s.prioritaet,
    })),
  })
})

export default router
