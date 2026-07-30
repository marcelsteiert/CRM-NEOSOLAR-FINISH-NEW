import type { Config } from '@netlify/functions'

/**
 * Taeglicher Lauf fuer das automatische Nachfassen bei offenen Angeboten.
 *
 * Ruft den geschuetzten Endpunkt der API auf, statt die Logik hier zu
 * duplizieren – so gibt es nur eine Stelle, an der die Eskalationsleiter
 * gepflegt wird, und sie bleibt auch manuell aufrufbar.
 */
export default async function handler() {
  const basis = process.env.CLIENT_URL || 'https://neosolar-crm.com'
  const token = process.env.SYNC_SECRET_TOKEN

  if (!token) {
    console.error('[Follow-Up] SYNC_SECRET_TOKEN fehlt – Lauf abgebrochen')
    return new Response('SYNC_SECRET_TOKEN fehlt', { status: 500 })
  }

  try {
    const res = await fetch(`${basis}/api/v1/follow-up/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': token },
    })

    const text = await res.text()
    if (!res.ok) {
      console.error(`[Follow-Up] Lauf fehlgeschlagen: HTTP ${res.status} ${text}`)
      return new Response(text, { status: res.status })
    }

    console.log('[Follow-Up] Lauf abgeschlossen:', text)
    return new Response(text, { status: 200 })
  } catch (err) {
    const meldung = err instanceof Error ? err.message : String(err)
    console.error('[Follow-Up] Aufruf fehlgeschlagen:', meldung)
    return new Response(meldung, { status: 500 })
  }
}

// Jeden Werktag um 07:15 UTC, also 08:15 bzw. 09:15 Schweizer Zeit –
// die Aufgaben liegen morgens im Postfach, bevor die Anrufe starten.
export const config: Config = {
  schedule: '15 7 * * 1-5',
}
