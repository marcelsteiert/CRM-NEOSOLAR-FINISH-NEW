// Sebastian-Leads die NOCH NIE angerufen wurden
require('dotenv').config({ path: './server/.env' })
const { createClient } = require('@supabase/supabase-js')
const ExcelJS = require('exceljs')

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(process.env.SUPABASE_URL, key)

const STATUS_LABELS = { ACTIVE: 'Aktiv', CONVERTED: 'Konvertiert', LOST: 'Verloren' }

async function main() {
  console.log('Lade Sebastian-Leads OHNE Anruf...')

  // Alle Sebastian-Leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, contact_id, status, notes, created_at, contact:contacts(first_name, last_name, company, email, phone, address)')
    .eq('source', 'SEBASTIAN')
    .is('deleted_at', null)

  // Lead-IDs mit Call-Logs (paginated damit alle geladen werden)
  let allCalls = []
  let from = 0
  while (true) {
    const { data: batch } = await supabase
      .from('call_logs')
      .select('lead_id')
      .range(from, from + 999)
    if (!batch || batch.length === 0) break
    allCalls = allCalls.concat(batch)
    if (batch.length < 1000) break
    from += 1000
  }
  console.log(`  ${allCalls.length} Call-Logs total (paginated)`)
  const calledSet = new Set(allCalls.map((c) => c.lead_id).filter(Boolean))
  console.log(`  ${calledSet.size} eindeutige Lead-IDs mit Anrufen`)

  const notCalled = leads
    .filter((l) => !calledSet.has(l.id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  console.log(`  ${notCalled.length} noch nicht angerufen`)

  // Excel bauen
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Nicht angerufen', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 24 },
  })

  const headers = ['Kunde', 'Telefon', 'E-Mail', 'Adresse', 'Status', 'Angebots-Info', 'Erstellt']
  ws.columns = [
    { width: 26 }, { width: 18 }, { width: 28 }, { width: 34 }, { width: 12 }, { width: 60 }, { width: 12 },
  ]

  const hdr = ws.addRow(headers)
  hdr.height = 30
  headers.forEach((h, i) => {
    const c = hdr.getCell(i + 1)
    c.value = h
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    }
  })

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d) ? '' : d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const statusColors = {
    'Aktiv': { bg: 'FFDBEAFE', fg: 'FF1D4ED8' },
    'Konvertiert': { bg: 'FFD1FAE5', fg: 'FF047857' },
    'Verloren': { bg: 'FFFEE2E2', fg: 'FFB91C1C' },
  }

  notCalled.forEach((l, idx) => {
    const c = l.contact || {}
    const kunde = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.company || '–'

    const r = ws.addRow([
      kunde,
      c.phone || '',
      c.email || '',
      c.address || '',
      STATUS_LABELS[l.status] || l.status,
      l.notes || '',
      formatDate(l.created_at),
    ])
    r.height = 26

    for (let i = 1; i <= headers.length; i++) {
      const cell = r.getCell(i)
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      cell.alignment = { vertical: 'middle', wrapText: i === 6, horizontal: 'left' }
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    }
    r.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } }
    r.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF2563EB' } }
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }

    const sc = statusColors[STATUS_LABELS[l.status]]
    if (sc) {
      const c2 = r.getCell(5)
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.bg } }
      c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: sc.fg } }
      c2.alignment = { horizontal: 'center', vertical: 'middle' }
    }
    r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(7).font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } }
  })

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }

  ws.addRow([])
  const total = ws.addRow([`Total noch nicht angerufen: ${notCalled.length} Sebastian-Leads`])
  total.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } }
  ws.mergeCells(`A${total.number}:G${total.number}`)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')
  const filename = `Sebastian_Nicht_Angerufen_${stamp[0]}_${stamp[1].substring(0,5)}.xlsx`
  await wb.xlsx.writeFile(filename)
  console.log(`\nExcel: ${filename}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
