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
    'Baubewilligung', 'Baubew. am',
    'TAG eingereicht', 'TAG eing. am',
    'TAG bewilligt', 'TAG Notiz',
    'IA eingereicht', 'IA eing. am',
    'IA bewilligt', 'IA Notiz',
    'DC-Termin',
    'DC ausgeführt', 'DC am',
    'AC-Termin',
    'AC installiert', 'AC am',
    'Fehlt etwas',
    'Bemerkung',
    'Status',
  ]

  ws.columns = [
    { width: 40 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 20 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 20 },
    { width: 14 },
    { width: 14 }, { width: 12 },
    { width: 14 },
    { width: 14 }, { width: 12 },
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

    const row = ws.addRow([
      formatAddr(p),
      '', '',
      '', '',
      '', c?.tagNote ?? '',
      '', '',
      '', c?.iaNote ?? '',
      formatDate(c?.dcMontageTermin),
      '', '',
      formatDate(c?.acTermin),
      '', '',
      c?.fehltEtwas ?? '',
      c?.bemerkung ?? '',
      allDone ? '✓ ABGESCHLOSSEN' : 'OFFEN',
    ])
    row.height = 22

    // Kunde-Zelle
    const kundeCell = row.getCell(1)
    kundeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } }
    kundeCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

    // Status-Pills mit Datum
    pillCell(row.getCell(2), c?.baubewilligung, c?.baubewilligungAm)
    pillCell(row.getCell(4), c?.tagEingereicht, c?.tagEingereichtAm)
    pillCell(row.getCell(6), c?.tagBewilligt, c?.tagBewilligtAm)
    pillCell(row.getCell(8), c?.iaEingereicht, c?.iaEingereichtAm)
    pillCell(row.getCell(10), c?.iaBewilligt, c?.iaBewilligtAm)
    pillCell(row.getCell(13), c?.dcMontageAusgefuehrt, c?.dcMontageAm)
    pillCell(row.getCell(16), c?.acInstalliert, c?.acInstalliertAm)

    // Datums-Zellen (Baubew/TAG/IA/DC/AC am)
    ;[3, 5, 9, 14, 17].forEach((col, i) => {
      const dates = [
        c?.baubewilligungAm,
        c?.tagEingereichtAm,
        c?.iaEingereichtAm,
        c?.dcMontageAm,
        c?.acInstalliertAm,
      ]
      const cell = row.getCell(col)
      cell.value = formatDate(dates[i])
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Notiz-Zellen
    ;[7, 11, 18, 19].forEach((col) => {
      const cell = row.getCell(col)
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } }
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    })

    // Fehlt etwas: amber bg wenn nicht leer
    if (c?.fehltEtwas) {
      const fc = row.getCell(18)
      fc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberBg } }
      fc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amberText } }
    }

    // Status-Zelle
    const statusCell = row.getCell(20)
    if (allDone) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } }
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.greenText } }
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberBg } }
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amberText } }
    }
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' }

    // Termin-Zellen (DC-Termin/AC-Termin)
    ;[12, 15].forEach((col) => {
      const cell = row.getCell(col)
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Zebra-Streifen (nur fuer Zellen ohne Hintergrund)
    if (idx % 2 === 1) {
      for (let i = 1; i <= 20; i++) {
        const cell = row.getCell(i)
        if (!cell.fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } }
        }
      }
    }

    // Borders
    for (let i = 1; i <= 20; i++) {
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
    `Total: ${projects.length} Baustellen`,
    ...Array(19).fill(''),
  ])
  totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } }
  ws.mergeCells(`A${totalRow.number}:T${totalRow.number}`)

  // Export
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const today = new Date().toISOString().split('T')[0]
  saveAs(blob, `Baustellen_${today}.xlsx`)
}
