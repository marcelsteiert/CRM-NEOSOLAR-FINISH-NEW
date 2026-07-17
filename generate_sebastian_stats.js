// Sebastian-Leads Tracking: Statistik + Detail-Liste
require('dotenv').config({ path: './server/.env' })
const { createClient } = require('@supabase/supabase-js')
const ExcelJS = require('exceljs')

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(process.env.SUPABASE_URL, key)

const STATUS_LABELS = {
  ACTIVE: 'Aktiv', CONVERTED: 'Konvertiert', LOST: 'Verloren', ARCHIVED: 'Archiviert',
}

const CALL_RESULT_LABELS = {
  TERMIN: 'Termin vereinbart',
  NICHT_ERREICHT: 'Nicht erreicht',
  ERREICHT: 'Erreicht',
  ABGESAGT: 'Abgesagt',
  ANRUF: 'Anruf getaetigt',
  NICHT_INTERESSIERT: 'Nicht interessiert',
}

const CALL_COLORS = {
  'Termin vereinbart':    { bg: 'FFDCFCE7', fg: 'FF15803D' },
  'Nicht erreicht':       { bg: 'FFFEE2E2', fg: 'FFB91C1C' },
  'Erreicht':             { bg: 'FFD1FAE5', fg: 'FF047857' },
  'Abgesagt':             { bg: 'FFE5E7EB', fg: 'FF4B5563' },
  'Anruf getaetigt':      { bg: 'FFDDD6FE', fg: 'FF6D28D9' },
  'Nicht interessiert':   { bg: 'FFFEE2E2', fg: 'FFB91C1C' },
}

async function main() {
  console.log('Lade Sebastian-Leads...')
  const { data: leads, error: lErr } = await supabase
    .from('leads')
    .select(`
      id, status, notes, appointment_type, created_at,
      contact:contacts(first_name, last_name, company, email, phone, address),
      lead_tags(tag_id)
    `)
    .eq('source', 'SEBASTIAN')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (lErr) throw lErr
  console.log(`  ${leads.length} Sebastian-Leads`)

  console.log('Lade Call-Logs...')
  const leadIds = leads.map((l) => l.id)
  const { data: calls, error: cErr } = await supabase
    .from('call_logs')
    .select('lead_id, user_id, result, notes, created_at')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })
  if (cErr) throw cErr
  console.log(`  ${calls.length} Call-Logs`)

  console.log('Lade Users + Tags...')
  const { data: users } = await supabase.from('users').select('id, first_name, last_name')
  const { data: tags } = await supabase.from('tags').select('id, name, color')

  // Termine + Deals aus Sebastian-Leads (via contact_id-Verknuepfung)
  console.log('Lade Termine + Deals via Contact-ID...')
  const contactIds = leads.map((l) => l.contact?.id || null).filter(Boolean)
  const leadsById = new Map(leads.map((l) => [l.id, l]))
  const { data: rawContacts } = await supabase
    .from('contacts')
    .select('id')
    .in('id', leads.map((l) => l.contact ? l.contact.id : null).filter(Boolean))

  // Statt Contact-Id-Match: leads.contact_id direkt holen
  const { data: leadsWithContact } = await supabase
    .from('leads')
    .select('id, contact_id')
    .eq('source', 'SEBASTIAN')
    .is('deleted_at', null)
  const contactIdsAll = leadsWithContact.map((l) => l.contact_id).filter(Boolean)
  const contactToLeadId = new Map(leadsWithContact.map((l) => [l.contact_id, l.id]))

  const { data: appts2 } = await supabase
    .from('appointments')
    .select('id, contact_id, status, appointment_type, assigned_to, appointment_date')
    .in('contact_id', contactIdsAll)
    .is('deleted_at', null)
  console.log(`  ${appts2.length} Termine (Sebastian-Contacts)`)

  const { data: dealsFromSebastian } = await supabase
    .from('deals')
    .select('id, contact_id, stage, value, assigned_to')
    .in('contact_id', contactIdsAll)
    .is('deleted_at', null)
  console.log(`  ${dealsFromSebastian.length} Deals (Sebastian-Contacts)`)

  const userMap = new Map(users.map((u) => [u.id, `${u.first_name} ${u.last_name}`]))
  const tagMap = new Map(tags.map((t) => [t.id, t]))

  // Calls pro Lead gruppieren
  const callsByLead = new Map()
  for (const c of calls) {
    if (!callsByLead.has(c.lead_id)) callsByLead.set(c.lead_id, [])
    callsByLead.get(c.lead_id).push(c)
  }

  // ═══ STATISTIK AGGREGATION ═══

  // Overall Status-Verteilung
  const statusCount = { ACTIVE: 0, CONVERTED: 0, LOST: 0, ARCHIVED: 0 }
  for (const l of leads) statusCount[l.status] = (statusCount[l.status] || 0) + 1

  // Tag-Verteilung
  const tagCount = new Map()
  for (const l of leads) {
    for (const lt of (l.lead_tags || [])) {
      const t = tagMap.get(lt.tag_id)
      if (t) tagCount.set(t.name, (tagCount.get(t.name) || 0) + 1)
    }
  }

  // Call-Result Verteilung
  const callResultCount = {}
  for (const c of calls) callResultCount[c.result] = (callResultCount[c.result] || 0) + 1

  // Calls pro User (Wer hat wie oft angerufen)
  const callsPerUser = new Map()
  for (const c of calls) {
    const uname = userMap.get(c.user_id) || 'Unbekannt'
    if (!callsPerUser.has(uname)) callsPerUser.set(uname, {
      user: uname, total: 0, termin: 0, nicht_erreicht: 0, erreicht: 0, abgesagt: 0, anruf: 0, nicht_int: 0,
    })
    const u = callsPerUser.get(uname)
    u.total++
    if (c.result === 'TERMIN') u.termin++
    else if (c.result === 'NICHT_ERREICHT') u.nicht_erreicht++
    else if (c.result === 'ERREICHT') u.erreicht++
    else if (c.result === 'ABGESAGT') u.abgesagt++
    else if (c.result === 'ANRUF') u.anruf++
    else if (c.result === 'NICHT_INTERESSIERT') u.nicht_int++
  }

  // Leads ohne Anruf
  const leadsOhneAnruf = leads.filter((l) => !callsByLead.has(l.id)).length
  const leadsMitAnruf = leads.length - leadsOhneAnruf

  // ═══ EXCEL BAUEN ═══

  const wb = new ExcelJS.Workbook()
  wb.creator = 'NeoSolar CRM'
  wb.created = new Date()

  const HDR = 'FF1E293B'
  const BRD = 'FFE2E8F0'
  const ALT = 'FFF8FAFC'

  function headerCell(cell, text, colorBg = HDR, colorFg = 'FFFFFFFF') {
    cell.value = text
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBg } }
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: colorFg } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: BRD } },
      left: { style: 'thin', color: { argb: BRD } },
      bottom: { style: 'thin', color: { argb: BRD } },
      right: { style: 'thin', color: { argb: BRD } },
    }
  }

  // ══ SHEET 1: STATISTIK ══
  const ws1 = wb.addWorksheet('Statistik', { properties: { defaultRowHeight: 22 } })
  ws1.columns = [{ width: 32 }, { width: 15 }, { width: 15 }]

  let row = ws1.addRow(['SEBASTIAN-LEADS UEBERSICHT', '', ''])
  row.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } }
  row.height = 30
  ws1.mergeCells(`A${row.number}:C${row.number}`)

  ws1.addRow([])
  const h1 = ws1.addRow(['Kennzahl', 'Anzahl', '%'])
  h1.height = 28
  headerCell(h1.getCell(1), 'Kennzahl')
  headerCell(h1.getCell(2), 'Anzahl')
  headerCell(h1.getCell(3), '%')

  const addStat = (label, value, pctBase = leads.length, color = null) => {
    const r = ws1.addRow([label, value, pctBase ? ((value / pctBase * 100).toFixed(1) + '%') : ''])
    r.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
    r.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: color?.fg || 'FF1E293B' } }
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
    r.getCell(3).font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } }
    if (color) {
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.bg } }
    }
    for (let i = 1; i <= 3; i++) {
      r.getCell(i).border = {
        top: { style: 'thin', color: { argb: BRD } },
        left: { style: 'thin', color: { argb: BRD } },
        bottom: { style: 'thin', color: { argb: BRD } },
        right: { style: 'thin', color: { argb: BRD } },
      }
    }
  }

  const addSection = (title, colorBg = 'FF334155') => {
    ws1.addRow([])
    const r = ws1.addRow([title])
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBg } }
    r.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    r.height = 24
    ws1.mergeCells(`A${r.number}:C${r.number}`)
  }

  // Gesamt
  addStat('Total Sebastian-Leads', leads.length, leads.length, { bg: 'FFDBEAFE', fg: 'FF1D4ED8' })
  addStat('Noch nicht erreicht (Status Aktiv)', statusCount.ACTIVE || 0, leads.length, { bg: 'FFFEF3C7', fg: 'FFB45309' })
  addStat('Konvertiert (zu Termin weitergefuehrt)', statusCount.CONVERTED || 0, leads.length, { bg: 'FFD1FAE5', fg: 'FF047857' })
  addStat('Verloren', statusCount.LOST || 0, leads.length, { bg: 'FFFEE2E2', fg: 'FFB91C1C' })
  addStat('Noch nie angerufen (kein Call-Log)', leadsOhneAnruf, leads.length, { bg: 'FFFEE2E2', fg: 'FFB91C1C' })

  addSection('Anruf-Aktivitaet (Call-Log-Eintraege - kann pro Lead mehrfach sein)')
  addStat('Anrufe insgesamt', calls.length, calls.length)
  for (const [result, count] of Object.entries(callResultCount).sort((a, b) => b[1] - a[1])) {
    const label = CALL_RESULT_LABELS[result] || result
    const col = CALL_COLORS[label]
    addStat('davon: ' + label, count, calls.length, col)
  }

  // Termine: nur ONLINE + VOR_ORT als echte Termine, RICHTOFFERTEN zaehlen komplett als Absagen
  const apptStats = { total: 0, geplant: 0, bestaetigt: 0, durchgefuehrt: 0, abgesagt: 0, no_show: 0 }
  let richtoffertenAlsAbsage = 0
  for (const a of appts2) {
    if (a.appointment_type === 'RICHTOFFERTE') {
      richtoffertenAlsAbsage++
      continue
    }
    apptStats.total++
    if (a.status === 'GEPLANT') apptStats.geplant++
    else if (a.status === 'BESTAETIGT') apptStats.bestaetigt++
    else if (a.status === 'DURCHGEFUEHRT') apptStats.durchgefuehrt++
    else if (a.status === 'ABGESAGT') apptStats.abgesagt++
    else if (a.status === 'NO_SHOW') apptStats.no_show++
  }
  // Richtofferten fliessen in die Absagen-Zahl ein
  const absagenGesamt = apptStats.abgesagt + richtoffertenAlsAbsage

  addSection('Termine (echte Beratungstermine ohne Richtofferten)')
  addStat('Termine insgesamt', apptStats.total, apptStats.total || 1, { bg: 'FFDCFCE7', fg: 'FF15803D' })
  addStat('davon: Geplant', apptStats.geplant, apptStats.total || 1, { bg: 'FFDBEAFE', fg: 'FF1D4ED8' })
  addStat('davon: Bestaetigt', apptStats.bestaetigt, apptStats.total || 1, { bg: 'FFD1FAE5', fg: 'FF047857' })
  addStat('davon: Durchgefuehrt', apptStats.durchgefuehrt, apptStats.total || 1, { bg: 'FFD1FAE5', fg: 'FF047857' })
  addStat('davon: Absagen (inkl. Richtofferten ' + richtoffertenAlsAbsage + ')', absagenGesamt, apptStats.total || 1, { bg: 'FFFEE2E2', fg: 'FFB91C1C' })
  addStat('davon: No Show', apptStats.no_show, apptStats.total || 1, { bg: 'FFFEE2E2', fg: 'FFB91C1C' })

  // Deals (weitergefuehrte Angebote)
  const dealsCount = { total: dealsFromSebastian.length, gewonnen: 0, verloren: 0, offen: 0 }
  let dealValue = 0
  for (const d of dealsFromSebastian) {
    if (d.stage === 'GEWONNEN') dealsCount.gewonnen++
    else if (d.stage === 'VERLOREN') dealsCount.verloren++
    else dealsCount.offen++
    dealValue += Number(d.value || 0)
  }
  addSection('Angebote (aus Sebastian-Leads weitergefuehrt)')
  addStat('Angebote insgesamt', dealsCount.total, dealsCount.total || 1, { bg: 'FFDBEAFE', fg: 'FF1D4ED8' })
  addStat('davon: Offen', dealsCount.offen, dealsCount.total || 1, { bg: 'FFFEF3C7', fg: 'FFB45309' })
  addStat('davon: Gewonnen', dealsCount.gewonnen, dealsCount.total || 1, { bg: 'FFD1FAE5', fg: 'FF047857' })
  addStat('davon: Verloren', dealsCount.verloren, dealsCount.total || 1, { bg: 'FFFEE2E2', fg: 'FFB91C1C' })
  const rTotal = ws1.addRow(['Angebots-Volumen (CHF)', dealValue, ''])
  rTotal.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
  rTotal.getCell(2).numFmt = '#,##0 "CHF"'
  rTotal.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFD97706' } }
  rTotal.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
  for (let i = 1; i <= 3; i++) {
    rTotal.getCell(i).border = { top: {style:'thin',color:{argb:BRD}}, left: {style:'thin',color:{argb:BRD}}, bottom: {style:'thin',color:{argb:BRD}}, right: {style:'thin',color:{argb:BRD}} }
  }

  addSection('Tags')
  for (const [tag, count] of [...tagCount.entries()].sort((a, b) => b[1] - a[1])) {
    addStat(tag, count, leads.length)
  }

  // ══ SHEET 2: ANRUFE PRO USER ══
  const ws2 = wb.addWorksheet('Anrufe pro User', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  })
  const userHeaders = ['User', 'Anrufe Total', 'Termin', 'Erreicht', 'Nicht erreicht', 'Abgesagt', 'Anruf getaetigt', 'Nicht interessiert']
  ws2.columns = [
    { width: 24 }, { width: 13 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 12 }, { width: 17 }, { width: 17 },
  ]
  const uHdr = ws2.addRow(userHeaders)
  uHdr.height = 32
  userHeaders.forEach((_, i) => headerCell(uHdr.getCell(i + 1), userHeaders[i]))

  const userRows = [...callsPerUser.values()].sort((a, b) => b.total - a.total)
  userRows.forEach((u, idx) => {
    const r = ws2.addRow([u.user, u.total, u.termin, u.erreicht, u.nicht_erreicht, u.abgesagt, u.anruf, u.nicht_int])
    r.height = 22
    for (let i = 1; i <= userHeaders.length; i++) {
      const c = r.getCell(i)
      c.border = { top: {style:'thin',color:{argb:BRD}}, left: {style:'thin',color:{argb:BRD}}, bottom: {style:'thin',color:{argb:BRD}}, right: {style:'thin',color:{argb:BRD}} }
      c.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' }
      c.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
      if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT } }
    }
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } }
    r.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } }

    // Farbige highlights
    const colorMap = {
      3: { bg: 'FFDCFCE7', fg: 'FF15803D' },  // Termin
      4: { bg: 'FFD1FAE5', fg: 'FF047857' },  // Erreicht
      5: { bg: 'FFFEE2E2', fg: 'FFB91C1C' },  // Nicht erreicht
    }
    Object.entries(colorMap).forEach(([col, { bg, fg }]) => {
      const cell = r.getCell(Number(col))
      if (cell.value && cell.value > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: fg } }
      }
    })
  })
  ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: userHeaders.length } }

  // ══ SHEET 3: LEAD-DETAILS ══
  const ws3 = wb.addWorksheet('Lead-Details', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 24 },
  })
  const detHeaders = [
    'Kunde', 'Telefon', 'E-Mail', 'PLZ / Ort', 'Anrufe',
    'Letzter Anruf', 'Ergebnis', 'Status', 'Tags', 'Angebots-Info', 'Erstellt',
  ]
  ws3.columns = [
    { width: 26 }, { width: 18 }, { width: 28 }, { width: 22 }, { width: 8 },
    { width: 12 }, { width: 18 }, { width: 14 }, { width: 24 }, { width: 60 }, { width: 12 },
  ]
  const dHdr = ws3.addRow(detHeaders)
  dHdr.height = 32
  detHeaders.forEach((_, i) => headerCell(dHdr.getCell(i + 1), detHeaders[i]))

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d) ? '' : d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  // Sortier-Priority: nach Anzahl Anrufe DESC (die aktivsten zuerst), dann neueste
  const leadsSorted = [...leads].sort((a, b) => {
    const ca = (callsByLead.get(a.id) || []).length
    const cb = (callsByLead.get(b.id) || []).length
    if (cb !== ca) return cb - ca
    return new Date(b.created_at) - new Date(a.created_at)
  })

  leadsSorted.forEach((l, idx) => {
    const contact = l.contact || {}
    const kunde = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || contact.company || '–'
    const callHistory = (callsByLead.get(l.id) || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const lastCall = callHistory[0]
    const lastResult = lastCall ? (CALL_RESULT_LABELS[lastCall.result] || lastCall.result) : ''
    const tagsList = (l.lead_tags || []).map((lt) => tagMap.get(lt.tag_id)?.name).filter(Boolean).join(', ')

    const r = ws3.addRow([
      kunde,
      contact.phone || '',
      contact.email || '',
      contact.address || '',
      callHistory.length,
      lastCall ? formatDate(lastCall.created_at) : '',
      lastResult,
      STATUS_LABELS[l.status] || l.status,
      tagsList,
      l.notes || '',
      formatDate(l.created_at),
    ])
    r.height = 26

    for (let i = 1; i <= detHeaders.length; i++) {
      const c = r.getCell(i)
      c.border = { top: {style:'thin',color:{argb:BRD}}, left: {style:'thin',color:{argb:BRD}}, bottom: {style:'thin',color:{argb:BRD}}, right: {style:'thin',color:{argb:BRD}} }
      c.alignment = { vertical: 'middle', wrapText: i === 10, horizontal: 'left' }
      c.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
      if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT } }
    }
    // Kunde bold
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } }
    // Telefon blau, zentriert
    r.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2563EB' } }
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    // Anrufe zentriert + farbig wenn > 0
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
    if (callHistory.length > 0) {
      r.getCell(5).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF047857' } }
    } else {
      r.getCell(5).font = { name: 'Calibri', size: 10, color: { argb: 'FFDC2626' } }
      r.getCell(5).value = '0'
    }
    // Letzter Anruf zentriert
    r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(6).font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } }
    // Ergebnis farbig
    if (lastResult) {
      const col = CALL_COLORS[lastResult]
      if (col) {
        const c = r.getCell(7)
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.bg } }
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: col.fg } }
        c.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    }
    // Status
    const statusCol = {
      'Aktiv': { bg: 'FFDBEAFE', fg: 'FF1D4ED8' },
      'Konvertiert': { bg: 'FFD1FAE5', fg: 'FF047857' },
      'Verloren': { bg: 'FFFEE2E2', fg: 'FFB91C1C' },
    }[STATUS_LABELS[l.status]]
    if (statusCol) {
      const c = r.getCell(8)
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusCol.bg } }
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: statusCol.fg } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
    }
    // Erstellt zentriert
    r.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(11).font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } }
  })
  ws3.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: detHeaders.length } }

  // Export
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')
  const filename = `Sebastian_Leads_Tracking_${stamp[0]}_${stamp[1].substring(0,5)}.xlsx`
  await wb.xlsx.writeFile(filename)

  console.log(`\nExcel erstellt: ${filename}`)
  console.log(`  Sheet 1: Statistik (Gesamt-Uebersicht)`)
  console.log(`  Sheet 2: Anrufe pro User (${userRows.length} User)`)
  console.log(`  Sheet 3: Lead-Details (${leads.length} Sebastian-Leads mit Anruf-Historie + Notiz)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
