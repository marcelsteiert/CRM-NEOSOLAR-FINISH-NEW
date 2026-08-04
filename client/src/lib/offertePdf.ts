/**
 * Erzeugt aus der Offerte ein PDF – eine Seite je Abschnitt.
 *
 * Der Weg über den Browser-Druck liefert zwar ein PDF, landet aber im
 * Download-Ordner des Benutzers und nicht im CRM. Für die Ablage und für
 * den Knopf "Als PDF herunterladen" rendern wir deshalb selbst.
 *
 * Wichtig ist das Vorgehen: Jeder `.offerte-seite`-Abschnitt wird einzeln
 * gerendert und ergibt genau eine PDF-Seite. Der frühere Ansatz – das
 * ganze Dokument als ein langes Bild rendern und dann zerschneiden – hat
 * Tabellenzeilen halbiert und Blöcke auseinandergerissen, weil ein Bild
 * nicht weiss, wo Inhalt anfängt und aufhört.
 */

const A4_BREITE_MM = 210
const A4_HOEHE_MM = 297
const RAND_MM = 12

export interface PdfErgebnis {
  blob: Blob
  dateiName: string
  seiten: number
}

export async function offerteAlsPdf(
  element: HTMLElement,
  dateiName: string
): Promise<PdfErgebnis> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // Bildschirm-Elemente gehören nicht ins PDF
  const versteckt: HTMLElement[] = []
  element.querySelectorAll<HTMLElement>('.offerte-keindruck').forEach((el) => {
    versteckt.push(el)
    el.style.display = 'none'
  })

  const seitenEl = Array.from(element.querySelectorAll<HTMLElement>('.offerte-seite'))
  // Ohne Abschnitte das ganze Dokument als eine Seite behandeln
  const abschnitte = seitenEl.length ? seitenEl : [element]

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const nutzBreite = A4_BREITE_MM - 2 * RAND_MM
  const nutzHoehe = A4_HOEHE_MM - 2 * RAND_MM

  // Beim Rendern darf nichts abgeschnitten sein
  const huelle = element.parentElement
  const vorherigerScroll = huelle?.scrollTop ?? 0
  if (huelle) huelle.scrollTop = 0

  let seiten = 0
  try {
    for (const abschnitt of abschnitte) {
      const canvas = await html2canvas(abschnitt, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: abschnitt.scrollWidth,
        height: abschnitt.scrollHeight,
        windowWidth: abschnitt.scrollWidth,
        windowHeight: abschnitt.scrollHeight,
      })
      if (canvas.height < 10) continue

      if (seiten > 0) pdf.addPage()

      /*
       * Der Abschnitt wird auf die Seite eingepasst. Passt er der Höhe
       * nach nicht, wird er verkleinert statt zerschnitten – lieber eine
       * etwas kleinere Schrift als eine mitten durchtrennte Tabelle.
       */
      const seitenverhaeltnis = canvas.height / canvas.width
      let breite = nutzBreite
      let hoehe = breite * seitenverhaeltnis
      if (hoehe > nutzHoehe) {
        hoehe = nutzHoehe
        breite = hoehe / seitenverhaeltnis
      }
      // Waagrecht mittig, sobald verkleinert wurde
      const x = RAND_MM + (nutzBreite - breite) / 2

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, RAND_MM, breite, hoehe)
      seiten++
    }
  } finally {
    versteckt.forEach((el) => {
      el.style.display = ''
    })
    if (huelle) huelle.scrollTop = vorherigerScroll
  }

  return {
    blob: pdf.output('blob') as Blob,
    dateiName: dateiName.endsWith('.pdf') ? dateiName : `${dateiName}.pdf`,
    seiten,
  }
}
