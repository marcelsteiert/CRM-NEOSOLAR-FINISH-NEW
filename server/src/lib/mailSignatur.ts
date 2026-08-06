import { supabase } from './supabase.js'
import { loadBranding } from '../routes/admin/branding.js'

/**
 * Einheitliche E-Mail-Signatur fuer alle Verkaeufer.
 *
 * Vorher setzte jede Mailstrecke ihre eigene Fusszeile zusammen – mal mit
 * Firmenname, mal ohne Telefon. Nach aussen sah das nach drei
 * verschiedenen Firmen aus. Jetzt kommt jede Signatur aus dieser Datei
 * und folgt der Vorlage aus dem Corporate Design.
 *
 * Aufbau als Tabelle, nicht als Flexbox: Outlook rendert Flexbox nicht,
 * und genau dort landen die meisten Mails.
 */

/**
 * Funktionsbezeichnung je Rolle. Steht in der Signatur unter dem Namen –
 * ein Kunde soll sehen, mit wem er spricht, nicht welche Berechtigung
 * jemand im CRM hat.
 */
const FUNKTION_JE_ROLLE: Record<string, string> = {
  ADMIN: 'Geschäftsführer',
  GL: 'Geschäftsführer',
  VERTRIEB: 'Kundenberater',
  CLOSER: 'Kundenberater',
  SETTER: 'Kundenbetreuung',
  PROJEKTLEITUNG: 'Projektleitung',
  BUCHHALTUNG: 'Buchhaltung',
  SUBUNTERNEHMEN: 'Partnerbetrieb',
}

export interface SignaturPerson {
  vorname: string
  nachname: string
  email: string
  /** Direktwahl oder Mobil – erscheint neben der Firmennummer */
  telefon?: string | null
  rolle?: string | null
  /** Frei gesetzte Funktionsbezeichnung, schlaegt die Rolle */
  funktion?: string | null
}

/** Farben aus dem Corporate Design. */
const BLAU = '#2563EB'
const TEXT = '#111827'
const GRAU = '#4B5563'

function zeile(icon: string, inhalt: string): string {
  return `<tr>
  <td style="padding:2px 8px 2px 0;vertical-align:top;font-size:13px;line-height:20px">${icon}</td>
  <td style="padding:2px 0;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${TEXT}">${inhalt}</td>
</tr>`
}

/**
 * Facebook und Instagram als runde Knoepfe.
 *
 * Bewusst ohne Bilddateien: viele Mailprogramme laden externe Bilder erst
 * nach Bestaetigung, und eine Signatur mit vier grauen Platzhaltern sieht
 * schlechter aus als eine ohne Bilder. Die Adressen stehen hier, weil das
 * Branding dafuer noch keine Felder hat.
 */
const SOZIALE_NETZE = [
  { name: 'Facebook', kurz: 'f', url: 'https://www.facebook.com/neosolarag', farbe: '#1877F2' },
  { name: 'Instagram', kurz: 'ig', url: 'https://www.instagram.com/neosolar.ag', farbe: '#E1306C' },
]

function sozialeKnoepfe(): string {
  return SOZIALE_NETZE.map(
    (n) =>
      `<a href="${n.url}" title="${n.name}" style="display:inline-block;width:22px;height:22px;line-height:22px;` +
      `margin-right:6px;text-align:center;border-radius:11px;background:${n.farbe};color:#FFFFFF;` +
      `font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;text-decoration:none">${n.kurz}</a>`
  ).join('')
}

/**
 * Baut die Signatur als HTML.
 *
 * Ohne Person entsteht die reine Firmensignatur – die brauchen die
 * Kampagnen, die aus dem Sammelpostfach laufen.
 */
export async function baueSignatur(person?: SignaturPerson | null): Promise<string> {
  const b = await loadBranding()

  const name = person ? `${person.vorname} ${person.nachname}`.trim() : b.companyName
  const funktion =
    person?.funktion?.trim() ||
    (person?.rolle ? FUNKTION_JE_ROLLE[person.rolle] : '') ||
    (person ? 'Kundenberater' : b.companySlogan)

  const mail = person?.email || b.companyEmail
  const website = (b.companyWebsite || '').replace(/^https?:\/\//, '')
  const adresse = [b.companyAddress, `${b.companyZip} ${b.companyCity}`].filter(Boolean).join(', ')

  // Firmennummer immer, Direktwahl nur wenn hinterlegt
  const nummern = [b.companyPhone, person?.telefon?.trim()]
    .filter(Boolean)
    .map((n) => `<a href="tel:${String(n).replace(/[^\d+]/g, '')}" style="color:${BLAU};text-decoration:none">${n}</a>`)
    .join(` <span style="color:#9CA3AF">|</span> `)

  const logo = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${b.companyName}" height="34" style="display:block;margin-top:12px;border:0">`
    : `<div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${TEXT}">${b.companyName}</div>`

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif">
<tr>
  <td style="padding-right:20px;border-right:1px solid #D1D5DB;vertical-align:top">
    <div style="font-size:16px;font-weight:bold;color:${TEXT};line-height:22px">${name}</div>
    <div style="font-size:13px;color:${GRAU};line-height:20px">${funktion}</div>
    <div style="font-size:13px;color:${GRAU};line-height:20px">${b.companyName}</div>
    ${logo}
  </td>
  <td style="padding-left:20px;vertical-align:top">
    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      ${zeile('📞', nummern)}
      ${zeile('✉️', `<a href="mailto:${mail}" style="color:${TEXT};text-decoration:none">${mail}</a>`)}
      ${zeile('🌐', `<a href="https://${website}" style="color:${TEXT};text-decoration:none">${website}</a>`)}
      ${zeile('📍', adresse)}
      <tr>
        <td colspan="2" style="padding-top:10px">${sozialeKnoepfe()}</td>
      </tr>
    </table>
  </td>
</tr>
</table>`
}

/**
 * Signatur eines Verkaeufers ueber seine User-ID.
 *
 * Faellt auf die Firmensignatur zurueck, wenn der Benutzer nicht mehr
 * existiert – eine Mail ohne Absenderangabe waere schlimmer als eine
 * unpersoenliche.
 */
export async function signaturFuerUser(userId?: string | null): Promise<string> {
  if (!userId) return baueSignatur(null)
  try {
    const { data } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, role, signature')
      .eq('id', userId)
      .maybeSingle()
    if (!data) return baueSignatur(null)

    // Wer eine eigene Signatur hinterlegt hat, behaelt sie
    if (typeof data.signature === 'string' && data.signature.trim().length > 20) {
      return data.signature
    }

    return baueSignatur({
      vorname: data.first_name ?? '',
      nachname: data.last_name ?? '',
      email: data.email ?? '',
      telefon: data.phone,
      rolle: data.role,
    })
  } catch {
    return baueSignatur(null)
  }
}

/** Setzt Mailtext und Signatur zu einer fertigen Nachricht zusammen. */
export function mitSignatur(inhaltHtml: string, signaturHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6">
${inhaltHtml}
<div style="border-top:1px solid #E5E7EB;margin:24px 0 16px"></div>
${signaturHtml}
</div>`
}
