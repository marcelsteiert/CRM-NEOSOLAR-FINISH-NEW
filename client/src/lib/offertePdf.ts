/**
 * Erzeugt aus der gedruckten Offerte ein PDF.
 *
 * Der Weg ueber den Browser-Druck liefert zwar ein schoeneres PDF, laesst
 * sich aber nicht abfangen – die Datei landet im Download-Ordner des
 * Verkaeufers, nicht im CRM. Fuer die automatische Ablage rendern wir das
 * Dokument deshalb selbst.
 *
 * Geschnitten wird an den vorhandenen Seitenumbruechen der Offerte, damit
 * die PDF-Seiten denselben Aufbau haben wie im Druck.
 */

const A4_BREITE_MM = 210
const A4_HOEHE_MM = 297
const RAND_MM = 10

export interface PdfErgebnis {
  blob: Blob
  dateiName: string
  seiten: number
}

/**
 * Rendert das Element mit der Klasse `.offerte-seitenumbruch` als
 * Seitentrenner in ein mehrseitiges PDF.
 */
export async function offerteAlsPdf(
  element: HTMLElement,
  dateiName: string
): Promise<PdfErgebnis> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // Die Werkzeugleiste und andere Bildschirm-Elemente gehoeren nicht ins PDF
  const versteckt: HTMLElement[] = []
  element.querySelectorAll<HTMLElement>('.offerte-keindruck').forEach((el) => {
    versteckt.push(el)
    el.style.display = 'none'
  })

  // Das Dokument liegt in einem scrollbaren Fenster. Ohne die volle Hoehe
  // erfasst html2canvas nur den sichtbaren Ausschnitt – das PDF haette dann
  // genau eine Seite.
  const vorherigerScroll = element.parentElement?.scrollTop ?? 0
  if (element.parentElement) element.parentElement.scrollTop = 0

  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    })
  } finally {
    versteckt.forEach((el) => {
      el.style.display = ''
    })
    if (element.parentElement) element.parentElement.scrollTop = vorherigerScroll
  }

  /*
   * Schnittkanten aus den Seitenumbruechen ableiten.
   *
   * offsetTop statt getBoundingClientRect: es zaehlt der Abstand im
   * Dokument, nicht die Lage im Fenster. Sonst haengen die Schnitte davon
   * ab, wie weit der Betrachter gerade gescrollt hat.
   */
  const skala = canvas.height / element.scrollHeight
  const abstandVonOben = (el: HTMLElement): number => {
    let y = 0
    let k: HTMLElement | null = el
    while (k && k !== element) {
      y += k.offsetTop
      k = k.offsetParent as HTMLElement | null
    }
    return y
  }

  const schnitte = [0]
  element.querySelectorAll<HTMLElement>('.offerte-seitenumbruch').forEach((um) => {
    const y = Math.round(abstandVonOben(um) * skala)
    if (y > schnitte[schnitte.length - 1] + 40 && y < canvas.height - 40) schnitte.push(y)
  })
  schnitte.push(canvas.height)

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const nutzBreite = A4_BREITE_MM - 2 * RAND_MM
  const nutzHoehe = A4_HOEHE_MM - 2 * RAND_MM
  const maxCanvasHoehe = Math.floor((canvas.width / nutzBreite) * nutzHoehe)

  /**
   * Sucht eine Zeile, durch die geschnitten werden darf.
   *
   * Ein Abschnitt, der laenger als eine A4-Seite ist, muss irgendwo
   * getrennt werden. Blind an der Seitenkante zu schneiden zerlegt
   * Tabellenzeilen und halbiert Text. Deshalb wird vom Wunschpunkt aus
   * rueckwaerts nach einer durchgehend hellen Bildzeile gesucht – dort
   * liegt kein Inhalt, und der Schnitt faellt nicht auf.
   */
  const bild = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)

  function istFreieZeile(y: number): boolean {
    if (!bild) return true
    const breite = canvas.width
    // Raender ueberspringen, dort steht ohnehin nichts
    const vonX = Math.floor(breite * 0.04)
    const bisX = Math.floor(breite * 0.96)
    for (let x = vonX; x < bisX; x += 3) {
      const i = (y * breite + x) * 4
      // Alles deutlich Dunklere als Weiss zaehlt als Inhalt
      if (bild.data[i] < 246 || bild.data[i + 1] < 246 || bild.data[i + 2] < 246) return false
    }
    return true
  }

  /** Beste Trennstelle bis maximal `wunsch`, sonst der Wunschpunkt selbst. */
  function findeTrennstelle(von: number, wunsch: number, grenze: number): number {
    const ziel = Math.min(wunsch, grenze)
    if (ziel >= grenze) return grenze
    // Bis zu einem Fuenftel der Seite zurueckgehen, laenger lohnt nicht
    const minimum = Math.max(von + Math.floor(maxCanvasHoehe * 0.35), ziel - Math.floor(maxCanvasHoehe * 0.2))
    let frei = 0
    for (let y = ziel; y > minimum; y--) {
      if (istFreieZeile(y)) {
        frei++
        // Ein paar freie Zeilen hintereinander sind ein echter Zwischenraum,
        // nicht nur der Spalt zwischen zwei Textzeilen
        if (frei >= 6) return y + frei
      } else {
        frei = 0
      }
    }
    return ziel
  }

  let seiten = 0
  for (let i = 0; i < schnitte.length - 1; i++) {
    const von = schnitte[i]
    const bis = schnitte[i + 1]
    if (bis - von < 20) continue

    let start = von
    while (start < bis) {
      const rest = bis - start
      const ende =
        rest <= maxCanvasHoehe ? bis : findeTrennstelle(start, start + maxCanvasHoehe, bis)
      const stueck = Math.max(1, ende - start)

      const teil = document.createElement('canvas')
      teil.width = canvas.width
      teil.height = Math.round(stueck)
      const ctx = teil.getContext('2d')
      if (!ctx) break
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, teil.width, teil.height)
      ctx.drawImage(canvas, 0, start, canvas.width, stueck, 0, 0, canvas.width, stueck)

      if (seiten > 0) pdf.addPage()
      pdf.addImage(
        teil.toDataURL('image/jpeg', 0.92),
        'JPEG',
        RAND_MM,
        RAND_MM,
        nutzBreite,
        (teil.height / teil.width) * nutzBreite
      )
      seiten++
      start = ende
    }
  }

  return {
    blob: pdf.output('blob') as Blob,
    dateiName: dateiName.endsWith('.pdf') ? dateiName : `${dateiName}.pdf`,
    seiten,
  }
}
