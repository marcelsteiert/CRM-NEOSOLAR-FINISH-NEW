import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { TrackedProject } from '@/hooks/useProjectTracking'

const formatAddr = (p: TrackedProject) => {
  const c = p.contact
  if (!c) return p.name
  const rawName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
  const isUnknown = !rawName || /^unbekannt\b/i.test(rawName)
  const name = isUnknown ? (c.company || p.name) : rawName
  return c.address ? `${name}, ${c.address}` : name
}

const formatDate = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Farben aus CRM Design-System
const COLORS = {
  headerBg: 'FF1E293B',     // dunkelblau
  headerText: 'FFFFFFFF',   // weiss
  greenBg: 'FFD1FAE5',      // helles grün (Ja)
  greenText: 'FF047857',
  redBg: 'FFFEE2E2',        // helles rot (Nein)
  redText: 'FFB91C1C',
  amberBg: 'FFFEF3C7',      // amber für "Fehlt etwas"
  amberText: 'FFB45309',
  emptyBg: 'FFF1F5F9',      // hellgrau für leer
  emptyText: 'FF64748B',
  rowAlt: 'FFF8FAFC',       // zebra
  border: 'FFE2E8F0',
}

function pillCell(cell: ExcelJS.Cell, value: boolean | null | undefined, date?: string | null) {
  let text: string
  let bg: string
  let fg: string
  if (value === true) { text = 'JA'; bg = COLORS.greenBg; fg = COLORS.greenText }
  else if (value === false) { text = 'NEIN'; bg = COLORS.redBg; fg = COLORS.redText }
  else { text = '—'; bg = COLORS.emptyBg; fg = COLORS.emptyText }

  if (date && value === true) text = `JA · ${formatDate(date)}`

  cell.value = text
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: fg } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

function headerCell(cell: ExcelJS.Cell, text: string) {
  cell.value = text
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.headerText } }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

export async function exportBaustellenToExcel(projects: TrackedProject[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'NeoSolar CRM'
  wb.created = new Date()

  const ws = wb.addWorksheet('Baustellen', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
    properties: { defaultRowHeight: 24 },
  })

  const headers = [
    'Kunde / Adresse',
    'GBA',
    'Baubewilligung', 'Baubew. am',
    'TAG eingereicht', 'TAG eing. am',
    'TAG bewilligt', 'TAG Notiz',
    'IA eingereicht', 'IA eing. am',
    'IA bewilligt', 'IA Notiz',
    'DC-Termin',
    'DC ausgeführt', 'DC am',
    'AC-Termin',
    'AC installiert', 'AC am',
    'SINA',
    'MPP',
    'Pronovo', 'Pronovo am',
    'Fehlt etwas',
    'Bemerkung',
    'Status',
  ]

  ws.columns = [
    { width: 40 },
    { width: 10 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 20 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 20 },
    { width: 14 },
    { width: 14 }, { width: 12 },
    { width: 14 },
    { width: 14 }, { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 12 }, { width: 12 },
    { width: 24 },
    { width: 24 },
    { width: 16 },
  ]

  // Header-Zeile
  const headerRow = ws.addRow(headers)
  headerRow.height = 32
  headers.forEach((h, i) => headerCell(headerRow.getCell(i + 1), h))

  // Datenzeilen
  projects.forEach((p, idx) => {
    const c = p.construction
    const allDone = !!c
      && c.baubewilligung && c.tagBewilligt && c.iaBewilligt
      && c.dcMontageAusgefuehrt && c.acInstalliert

    // Spalten-Indices (1-basiert):
    // 1=Kunde, 2=GBA, 3=Baubew, 4=Baubew am, 5=TAG eing, 6=TAG eing am, 7=TAG bew, 8=TAG Notiz,
    // 9=IA eing, 10=IA eing am, 11=IA bew, 12=IA Notiz, 13=DC-Termin, 14=DC ausgef, 15=DC am,
    // 16=AC-Termin, 17=AC installiert, 18=AC am, 19=SINA, 20=MPP, 21=Pronovo, 22=Pronovo am,
    // 23=Fehlt etwas, 24=Bemerkung, 25=Status
    const TOTAL_COLS = 25

    const row = ws.addRow([
      formatAddr(p),
      '',                                  // 2 GBA
      '', '',                              // 3-4 Baubew + am
      '', '',                              // 5-6 TAG eing + am
      '', c?.tagNote ?? '',                // 7-8 TAG bew + Notiz
      '', '',                              // 9-10 IA eing + am
      '', c?.iaNote ?? '',                 // 11-12 IA bew + Notiz
      formatDate(c?.dcMontageTermin),      // 13 DC-Termin
      '', '',                              // 14-15 DC ausg + am
      formatDate(c?.acTermin),             // 16 AC-Termin
      '', '',                              // 17-18 AC installiert + am
      '',                                  // 19 SINA
      '',                                  // 20 MPP
      '', '',                              // 21-22 Pronovo + am
      c?.fehltEtwas ?? '',                 // 23
      c?.bemerkung ?? '',                  // 24
      allDone ? '✓ ABGESCHLOSSEN' : 'OFFEN', // 25
    ])
    row.height = 22

    // Kunde-Zelle
    const kundeCell = row.getCell(1)
    kundeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } }
    kundeCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

    // Status-Pills mit Datum
    pillCell(row.getCell(2), c?.gba, c?.gbaAm)
    pillCell(row.getCell(3), c?.baubewilligung, c?.baubewilligungAm)
    pillCell(row.getCell(5), c?.tagEingereicht, c?.tagEingereichtAm)
    pillCell(row.getCell(7), c?.tagBewilligt, c?.tagBewilligtAm)
    pillCell(row.getCell(9), c?.iaEingereicht, c?.iaEingereichtAm)
    pillCell(row.getCell(11), c?.iaBewilligt, c?.iaBewilligtAm)
    pillCell(row.getCell(14), c?.dcMontageAusgefuehrt, c?.dcMontageAm)
    pillCell(row.getCell(17), c?.acInstalliert, c?.acInstalliertAm)
    pillCell(row.getCell(19), c?.sina, c?.sinaAm)
    pillCell(row.getCell(20), c?.mpp, c?.mppAm)
    pillCell(row.getCell(21), c?.pronovo, c?.pronovoAm)

    // Reine Datums-Zellen (Baubew am/TAG eing am/IA eing am/DC am/AC am/Pronovo am)
    ;[
      { col: 4, val: c?.baubewilligungAm },
      { col: 6, val: c?.tagEingereichtAm },
      { col: 10, val: c?.iaEingereichtAm },
      { col: 15, val: c?.dcMontageAm },
      { col: 18, val: c?.acInstalliertAm },
      { col: 22, val: c?.pronovoAm },
    ].forEach(({ col, val }) => {
      const cell = row.getCell(col)
      cell.value = formatDate(val)
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Notiz-Zellen (TAG Notiz, IA Notiz, Fehlt etwas, Bemerkung)
    ;[8, 12, 23, 24].forEach((col) => {
      const cell = row.getCell(col)
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } }
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    })

    // Fehlt etwas: amber bg wenn nicht leer
    if (c?.fehltEtwas) {
      const fc = row.getCell(23)
      fc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberBg } }
      fc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amberText } }
    }

    // Status-Zelle
    const statusCell = row.getCell(25)
    if (allDone) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } }
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.greenText } }
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberBg } }
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amberText } }
    }
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' }

    // Termin-Zellen (DC-Termin/AC-Termin)
    ;[13, 16].forEach((col) => {
      const cell = row.getCell(col)
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Zebra-Streifen (nur fuer Zellen ohne Hintergrund)
    if (idx % 2 === 1) {
      for (let i = 1; i <= TOTAL_COLS; i++) {
        const cell = row.getCell(i)
        if (!cell.fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } }
        }
      }
    }

    // Borders
    for (let i = 1; i <= TOTAL_COLS; i++) {
      row.getCell(i).border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      }
    }
  })

  // AutoFilter über Header
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  // Footer mit Summen-Info
  ws.addRow([])
  const totalRow = ws.addRow([
    `Total: ${projects.length} Baustellen (gefilterte Ansicht)`,
    ...Array(24).fill(''),
  ])
  totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } }
  ws.mergeCells(`A${totalRow.number}:Y${totalRow.number}`)

  // Export
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const today = new Date().toISOString().split('T')[0]
  saveAs(blob, `Baustellen_${today}.xlsx`)
}
