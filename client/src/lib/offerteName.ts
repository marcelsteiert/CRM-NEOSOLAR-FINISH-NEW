import { api } from './api'

/**
 * Benennt die Offerten-PDFs eines Kunden.
 *
 * Muster: `Wild 12.7kWp Offerte Version 2.pdf`
 *
 * Die Version zaehlt hoch, statt einen Zeitstempel anzuhaengen. Wer zwei
 * Offerten nebeneinander legt, will wissen, welche die neuere ist – ein
 * Datum im Namen beantwortet das nur, wenn man beide oeffnet, und bei
 * zwei Offerten am selben Tag gar nicht.
 */

const MUSTER = /Offerte\s+Version\s+(\d+)/i

/**
 * Naechste freie Versionsnummer fuer diesen Kontakt.
 *
 * Gezaehlt wird ueber alle Dokumente des Kunden, nicht nur die des
 * aktuellen Angebots: eine zweite Offerte fuer dasselbe Dach ist fuer den
 * Kunden Version 2, auch wenn sie an einem anderen Angebot haengt.
 */
export async function naechsteOffertenVersion(contactId: string): Promise<number> {
  try {
    const r = await api.get<{ data: Array<{ fileName?: string }> }>(
      `/documents?contactId=${encodeURIComponent(contactId)}`
    )
    const hoechste = (r.data ?? []).reduce((max, d) => {
      const treffer = MUSTER.exec(d.fileName ?? '')
      return treffer ? Math.max(max, Number(treffer[1]) || 0) : max
    }, 0)
    return hoechste + 1
  } catch {
    // Ohne Dokumentenliste lieber Version 1 als gar kein Name
    return 1
  }
}

/**
 * Baut den Dateinamen.
 *
 * `kwp` wird auf eine Nachkommastelle gekuerzt und die Null weggelassen –
 * "12kWp" liest sich besser als "12.0kWp".
 */
export function offertenDateiName(kunde: string, kwp: number, version: number): string {
  const name = kunde.trim().replace(/[\\/:*?"<>|]/g, '').trim() || 'Kunde'
  const leistung = Number(kwp.toFixed(1)).toString()
  return `${name} ${leistung}kWp Offerte Version ${version}`
}

/** Beides in einem Schritt – der uebliche Weg. */
export async function naechsterOffertenName(
  contactId: string,
  kunde: string,
  kwp: number
): Promise<string> {
  return offertenDateiName(kunde, kwp, await naechsteOffertenVersion(contactId))
}
