import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { AppError } from '../middleware/errorHandler.js'
import { loadPricing } from './admin/calculatorPricing.js'
import { loadBranding } from './admin/branding.js'

/**
 * Oeffentliche Endpunkte fuer den Solarrechner auf der Homepage.
 * Kein Auth – deshalb bewusst schmal gehalten: Preise lesen und
 * eine Richtofferten-Anfrage als Lead anlegen.
 */
const router = Router()

router.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [pricing, branding] = await Promise.all([loadPricing(), loadBranding()])
    res.json({
      data: {
        pricing,
        firma: {
          name: branding.companyName,
          telefon: branding.companyPhone,
          email: branding.companyEmail,
          website: branding.companyWebsite,
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

const anfrageSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().min(6).max(40),
  address: z.string().min(3).max(300),
  /** Ergebnis des Rechners – reine Kundenangabe, wird als Notiz hinterlegt */
  kwp: z.number().min(0).max(500).nullable().optional(),
  speicherKwh: z.number().min(0).max(500).nullable().optional(),
  verbrauchKwh: z.number().min(0).max(500000).nullable().optional(),
  wallbox: z.boolean().nullable().optional(),
  geschaetzterPreis: z.number().min(0).max(10_000_000).nullable().optional(),
  bemerkung: z.string().max(2000).nullable().optional(),
  /**
   * Honeypot: von Bots ausgefuellt, von Menschen nie.
   * Absichtlich ohne Laengenbegrenzung – sonst wuerde die Validierung mit 400
   * antworten und der Bot wuesste, dass er entdeckt wurde. Die Auswertung
   * passiert unten im Handler mit einem stillen Erfolg.
   */
  website: z.string().max(500).nullable().optional(),
})

// Einfacher Spam-Schutz pro IP. Bewusst im Speicher – bei Serverless
// wirkt das nur innerhalb einer warmen Instanz, haelt aber Massen-Posts auf.
const anfragenProIp = new Map<string, number[]>()
const FENSTER_MS = 10 * 60 * 1000
const MAX_PRO_FENSTER = 5

function zuVieleAnfragen(ip: string): boolean {
  const jetzt = Date.now()
  const bisher = (anfragenProIp.get(ip) ?? []).filter((t) => jetzt - t < FENSTER_MS)
  bisher.push(jetzt)
  anfragenProIp.set(ip, bisher)
  return bisher.length > MAX_PRO_FENSTER
}

router.post('/anfrage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unbekannt'
    if (zuVieleAnfragen(ip)) {
      throw new AppError('Zu viele Anfragen. Bitte versuchen Sie es spaeter erneut.', 429)
    }

    const parsed = anfrageSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Bitte pruefen Sie Ihre Angaben', 400)
    const d = parsed.data

    // Honeypot gefuellt -> stiller Erfolg, damit der Bot nichts lernt
    if (d.website) {
      return res.status(201).json({ data: { ok: true } })
    }

    const notizen = [
      'Anfrage über den Solarrechner auf der Homepage',
      d.kwp != null ? `Gewuenschte Anlagengroesse: ${d.kwp} kWp` : null,
      d.speicherKwh ? `Speicher: ${d.speicherKwh} kWh` : null,
      d.verbrauchKwh != null ? `Jahresverbrauch: ${d.verbrauchKwh} kWh` : null,
      d.wallbox ? 'Wallbox gewuenscht' : null,
      d.geschaetzterPreis != null
        ? `Im Rechner angezeigter Richtpreis: CHF ${Math.round(d.geschaetzterPreis).toLocaleString('de-CH')}`
        : null,
      d.bemerkung ? `Bemerkung des Kunden: ${d.bemerkung}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    // Bestehenden Kontakt anhand der E-Mail wiederverwenden, sonst neu anlegen
    const { data: vorhanden } = await supabase
      .from('contacts')
      .select('id')
      .ilike('email', d.email)
      .is('deleted_at', null)
      .limit(1)

    let contactId = vorhanden?.[0]?.id as string | undefined

    if (!contactId) {
      const { data: neuerKontakt, error: kontaktFehler } = await supabase
        .from('contacts')
        .insert({
          first_name: d.firstName,
          last_name: d.lastName,
          email: d.email,
          phone: d.phone,
          address: d.address,
        })
        .select('id')
        .single()
      if (kontaktFehler) throw new AppError(`Kontakt anlegen fehlgeschlagen: ${kontaktFehler.message}`, 500)
      contactId = neuerKontakt.id
    }

    const { error: leadFehler } = await supabase.from('leads').insert({
      contact_id: contactId,
      source: 'HOMEPAGE',
      status: 'ACTIVE',
      value: d.geschaetzterPreis ?? 0,
      notes: notizen,
    })
    if (leadFehler) throw new AppError(`Lead anlegen fehlgeschlagen: ${leadFehler.message}`, 500)

    res.status(201).json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
})

// ── Selbstplaner: der Kunde stellt sich die Anlage selbst zusammen ────

const planerSchema = anfrageSchema.extend({
  /** Ergebnis der Dachbelegung */
  modulAnzahl: z.number().min(0).max(2000).nullable().optional(),
  dachflaecheM2: z.number().min(0).max(100000).nullable().optional(),
  belegteFlaecheM2: z.number().min(0).max(100000).nullable().optional(),
  ausrichtung: z.string().max(40).nullable().optional(),
  neigung: z.number().min(0).max(90).nullable().optional(),
  jahresertragKwh: z.number().min(0).max(10_000_000).nullable().optional(),
  autarkie: z.number().min(0).max(100).nullable().optional(),
  ersparnisJahr: z.number().min(0).max(1_000_000).nullable().optional(),
  amortisation: z.number().min(0).max(100).nullable().optional(),
  /** Belegungsbild als data-URL, wird beim Kontakt abgelegt */
  bild: z.string().max(8_000_000).nullable().optional(),
  /** Kennung aus dem Kampagnenlink, ordnet die Anfrage der Kampagne zu */
  rid: z.string().max(60).nullable().optional(),
})

/**
 * Anfrage aus dem Selbstplaner.
 *
 * Anders als beim einfachen Rechner hat der Kunde hier sein Dach belegt.
 * Der Lead traegt deshalb die vollstaendige Auslegung und das Bild – der
 * Verkaeufer kann direkt dort weitermachen, wo der Kunde aufgehoert hat.
 */
router.post('/planer-anfrage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unbekannt'
    if (zuVieleAnfragen(ip)) {
      throw new AppError('Zu viele Anfragen. Bitte versuchen Sie es spaeter erneut.', 429)
    }

    const parsed = planerSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Bitte pruefen Sie Ihre Angaben', 400)
    const d = parsed.data

    if (d.website) return res.status(201).json({ data: { ok: true } })

    const zeilen = [
      'Der Kunde hat seine Anlage im Online-Planer selbst zusammengestellt.',
      '',
      '— Anlage —',
      d.kwp != null ? `Leistung: ${d.kwp} kWp` : null,
      d.modulAnzahl ? `Module: ${d.modulAnzahl} Stueck` : null,
      d.speicherKwh ? `Speicher: ${d.speicherKwh} kWh` : null,
      d.wallbox ? 'Wallbox gewuenscht' : null,
      '',
      '— Dach —',
      d.dachflaecheM2 ? `Dachflaeche: ${d.dachflaecheM2} m2` : null,
      d.belegteFlaecheM2 ? `davon belegt: ${d.belegteFlaecheM2} m2` : null,
      d.ausrichtung ? `Ausrichtung: ${d.ausrichtung}` : null,
      d.neigung != null ? `Neigung: ${d.neigung} Grad` : null,
      '',
      '— Was der Kunde gesehen hat —',
      d.verbrauchKwh != null ? `Angegebener Jahresverbrauch: ${d.verbrauchKwh} kWh` : null,
      d.jahresertragKwh ? `Prognostizierter Ertrag: ${d.jahresertragKwh} kWh pro Jahr` : null,
      d.autarkie != null ? `Unabhaengigkeit: ${d.autarkie} Prozent` : null,
      d.ersparnisJahr ? `Ersparnis: CHF ${Math.round(d.ersparnisJahr).toLocaleString('de-CH')} im ersten Jahr` : null,
      d.amortisation ? `Amortisation: ${d.amortisation} Jahre` : null,
      d.geschaetzterPreis != null
        ? `Angezeigter Richtpreis: CHF ${Math.round(d.geschaetzterPreis).toLocaleString('de-CH')}`
        : null,
      d.bemerkung ? `\nBemerkung des Kunden: ${d.bemerkung}` : null,
    ].filter((z) => z !== null)

    const { data: vorhanden } = await supabase
      .from('contacts')
      .select('id')
      .ilike('email', d.email)
      .is('deleted_at', null)
      .limit(1)

    let contactId = vorhanden?.[0]?.id as string | undefined
    if (!contactId) {
      const { data: neuerKontakt, error: kontaktFehler } = await supabase
        .from('contacts')
        .insert({
          first_name: d.firstName,
          last_name: d.lastName,
          email: d.email,
          phone: d.phone,
          address: d.address,
        })
        .select('id')
        .single()
      if (kontaktFehler) throw new AppError(`Kontakt anlegen fehlgeschlagen: ${kontaktFehler.message}`, 500)
      contactId = neuerKontakt.id
    }

    // Wer sich das Dach selbst belegt hat, ist weiter als ein Formularausfueller
    const { error: leadFehler } = await supabase.from('leads').insert({
      contact_id: contactId,
      source: d.rid ? 'KAMPAGNE' : 'PLANER',
      status: 'ACTIVE',
      value: d.geschaetzterPreis ?? 0,
      notes: zeilen.join('\n'),
    })
    if (leadFehler) throw new AppError(`Lead anlegen fehlgeschlagen: ${leadFehler.message}`, 500)

    // Belegungsbild beim Kontakt ablegen, damit der Verkaeufer es sieht
    if (d.bild?.startsWith('data:image/')) {
      try {
        const komma = d.bild.indexOf(',')
        const daten = Buffer.from(d.bild.slice(komma + 1), 'base64')
        const pfad = `${contactId}/termin/${Date.now()}_Dachbelegung_Kunde.jpg`
        const { error: upFehler } = await supabase.storage
          .from('documents')
          .upload(pfad, daten, { contentType: 'image/jpeg', upsert: false })
        if (!upFehler) {
          await supabase.from('documents').insert({
            contact_id: contactId,
            entity_type: 'KONTAKT',
            entity_id: contactId,
            file_name: 'Dachbelegung_Kunde.jpg',
            file_size: daten.length,
            mime_type: 'image/jpeg',
            storage_path: pfad,
            folder_path: 'Termin',
            notes: 'Vom Kunden im Online-Planer selbst erstellte Belegung',
          })
        }
      } catch (err) {
        console.error('[Planer] Bild ablegen fehlgeschlagen:', err)
      }
    }

    // Kampagne: Empfaenger als konvertiert markieren
    if (d.rid) {
      try {
        await supabase
          .from('campaign_recipients')
          .update({ konvertiert_am: new Date().toISOString() })
          .eq('id', d.rid)
        await supabase.from('email_events').insert({
          recipient_id: d.rid,
          email: d.email,
          art: 'KONVERTIERT',
          detail: `Anfrage aus dem Planer, ${d.kwp ?? '?'} kWp`,
        })
      } catch {
        /* Die Anfrage zaehlt trotzdem */
      }
    }

    res.status(201).json({ data: { ok: true } })
  } catch (err) {
    next(err)
  }
})

export default router
