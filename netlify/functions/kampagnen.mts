import type { Config } from '@netlify/functions'

/**
 * Versandlauf fuer laufende Kampagnen.
 *
 * Laeuft mehrmals taeglich, damit sich das Tagesbudget ueber den Tag
 * verteilt statt in einem Schwall rauszugehen. Ein Schwall von hundert
 * Mails in einer Minute faellt bei jedem Empfaengerserver auf.
 *
 * Die Logik liegt in der API, damit sie auch von Hand aufrufbar bleibt.
 */
export default async function handler() {
  const basis = process.env.CLIENT_URL || 'https://neosolar-crm.com'
  const token = process.env.SYNC_SECRET_TOKEN

  if (!token) {
    console.error('[Kampagnen] SYNC_SECRET_TOKEN fehlt – Lauf abgebrochen')
    return new Response('SYNC_SECRET_TOKEN fehlt', { status: 500 })
  }

  try {
    const res = await fetch(`${basis}/api/v1/campaigns-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': token },
    })
    const text = await res.text()
    if (!res.ok) {
      console.error(`[Kampagnen] Lauf fehlgeschlagen: HTTP ${res.status} ${text}`)
      return new Response(text, { status: res.status })
    }
    console.log('[Kampagnen]', text)
    return new Response(text, { status: 200 })
  } catch (err) {
    const meldung = err instanceof Error ? err.message : String(err)
    console.error('[Kampagnen] Lauf nicht erreichbar:', meldung)
    return new Response(meldung, { status: 500 })
  }
}

export const config: Config = {
  // Werktags stuendlich zwischen 8 und 17 Uhr. Das Zeitfenster und das
  // Tagesbudget der Kampagne begrenzen, was tatsaechlich rausgeht.
  schedule: '5 6-16 * * 1-5',
}
