/**
 * Einheitlicher Weg, wie das CRM Mails an Kunden verschickt.
 *
 * Zwei Wege, in dieser Reihenfolge:
 *
 * 1. **Systempostfach** (info@neosolar.ch) ueber Client Credentials.
 *    Braucht keinen angemeldeten Benutzer und laeuft nicht ab – der
 *    richtige Weg fuer alles Automatische.
 * 2. **Postfach des Verkaeufers** ueber seine Outlook-Verbindung.
 *    Persoenlicher, aber nur verfuegbar, wenn er sich verbunden hat.
 *
 * Welcher Weg zuerst versucht wird, haengt vom Anlass ab: eine
 * automatische Nachfassmail geht ueber das Systempostfach, eine Offerte,
 * die der Verkaeufer selbst ausloest, bevorzugt sein eigenes.
 *
 * Damit der Kunde trotzdem beim richtigen Menschen landet, setzt der
 * Systemversand `replyTo` auf den Verkaeufer und schickt ihm eine Kopie.
 */

import { supabase } from './supabase.js'
import { sendeSystemMail, systemMailKonfiguriert } from './outlookClient.js'

export type Versandweg = 'SYSTEM' | 'VERKAEUFER' | 'KEINER'

export interface VersandAuftrag {
  an: string
  betreff: string
  html: string
  /** Verkaeufer, in dessen Namen die Mail beantwortet werden soll */
  verkaeuferId?: string | null
  /** Kopie an den Verkaeufer, damit er den Verlauf im Postfach hat */
  kopieAnVerkaeufer?: boolean
  anhaenge?: Array<{ name: string; mimeType: string; inhaltBase64: string }>
  /**
   * Bei `true` wird zuerst das Postfach des Verkaeufers versucht.
   * Sinnvoll, wenn er den Versand selbst ausloest.
   */
  bevorzugtVerkaeufer?: boolean
}

export interface VersandErgebnis {
  weg: Versandweg
  absender: string | null
  fehler: string | null
  /** Was schiefging, bevor der andere Weg griff – nur zur Protokollierung */
  hinweis: string | null
}

async function verkaeuferPostfach(userId: string | null | undefined) {
  if (!userId) return null
  const { data } = await supabase
    .from('outlook_connections')
    .select('id, email')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return data as { id: string; email: string } | null
}

async function verkaeuferMail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  const { data } = await supabase.from('users').select('email').eq('id', userId).maybeSingle()
  return (data as { email?: string } | null)?.email ?? null
}

async function ueberVerkaeufer(a: VersandAuftrag): Promise<VersandErgebnis | null> {
  const conn = await verkaeuferPostfach(a.verkaeuferId)
  if (!conn) return null
  try {
    const { graphPost } = await import('./outlookClient.js')
    const nachricht: Record<string, unknown> = {
      subject: a.betreff,
      body: { contentType: 'HTML', content: a.html },
      toRecipients: [{ emailAddress: { address: a.an } }],
    }
    if (a.anhaenge?.length) {
      nachricht.attachments = a.anhaenge.map((x) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: x.name,
        contentType: x.mimeType,
        contentBytes: x.inhaltBase64,
      }))
    }
    await graphPost(conn.id, '/me/sendMail', { message: nachricht, saveToSentItems: true })
    return { weg: 'VERKAEUFER', absender: conn.email, fehler: null, hinweis: null }
  } catch (err) {
    return {
      weg: 'KEINER',
      absender: null,
      fehler: err instanceof Error ? err.message : String(err),
      hinweis: null,
    }
  }
}

async function ueberSystem(a: VersandAuftrag): Promise<VersandErgebnis | null> {
  if (!systemMailKonfiguriert()) return null
  const antwortAn = await verkaeuferMail(a.verkaeuferId)
  try {
    await sendeSystemMail({
      an: a.an,
      betreff: a.betreff,
      html: a.html,
      antwortAn,
      kopieAn: a.kopieAnVerkaeufer ? antwortAn : null,
      anhaenge: a.anhaenge,
    })
    return {
      weg: 'SYSTEM',
      absender: process.env.MS_SENDER_ADDRESS ?? 'info@neosolar.ch',
      fehler: null,
      hinweis: null,
    }
  } catch (err) {
    return {
      weg: 'KEINER',
      absender: null,
      fehler: err instanceof Error ? err.message : String(err),
      hinweis: null,
    }
  }
}

/**
 * Verschickt die Mail und faellt auf den jeweils anderen Weg zurueck.
 * Gibt immer ein Ergebnis zurueck – der Aufrufer entscheidet, was er
 * protokolliert.
 */
export async function versendeMail(a: VersandAuftrag): Promise<VersandErgebnis> {
  const reihenfolge = a.bevorzugtVerkaeufer
    ? [ueberVerkaeufer, ueberSystem]
    : [ueberSystem, ueberVerkaeufer]

  let ersterFehler: string | null = null

  for (const weg of reihenfolge) {
    const erg = await weg(a)
    if (!erg) continue // Weg nicht verfuegbar, naechsten probieren
    if (!erg.fehler) return { ...erg, hinweis: ersterFehler }
    ersterFehler ??= erg.fehler
  }

  return {
    weg: 'KEINER',
    absender: null,
    fehler:
      ersterFehler ??
      'Kein Versandweg verfügbar: weder das Systempostfach noch eine Outlook-Verbindung des Verkäufers sind eingerichtet.',
    hinweis: null,
  }
}
