/**
 * Kaltakquise Import – Vorbereitung
 *
 * Liest 3 Excel-Dateien, transformiert die Daten und schreibt
 * SQL-Batch-Dateien fuer den Import in Supabase.
 *
 * Usage: node scripts/prepare-import.js
 */

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const OUTPUT_DIR = path.join(__dirname, 'import-sql')
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// ── File Paths ──
const FILES = {
  b2c: 'C:/Users/SVK05/Desktop/Datenbank_Local Export_Marcel Steiert.xlsx',
  b2b: 'C:/Users/SVK05/OneDrive/Dokumente/Kontakte.xlsx',
  solar: 'C:/Users/SVK05/OneDrive/Desktop/leads-21506794-8.xlsx',
}

const TAG_IDS = { b2c: 'ka-b2c', b2b: 'ka-b2b', solar: 'ka-solar' }

// ── Helpers ──
function esc(val) {
  if (val === null || val === undefined) return 'NULL'
  const s = String(val).replace(/'/g, "''").replace(/\\/g, '\\\\').trim()
  return `'${s}'`
}

function uuid() {
  return crypto.randomUUID()
}

function splitName(fullName) {
  if (!fullName) return { first: '', last: '' }
  const parts = String(fullName).trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  const last = parts.pop()
  return { first: parts.join(' '), last }
}

function cleanPhone(phone) {
  if (!phone) return ''
  return String(phone).trim().replace(/^00/, '+')
}

function cleanEmail(email) {
  if (!email) return ''
  return String(email).trim().toLowerCase()
}

// ── B2C Transformer ──
function transformB2C(rows) {
  console.log(`  B2C: ${rows.length} Zeilen gelesen`)
  const results = []
  for (const row of rows) {
    const name = row['Name'] || ''
    const { first, last } = splitName(name)
    const street = row['Strasse / Nr.'] || ''
    const plz = row['PLZ'] || ''
    const ort = row['Ort'] || ''
    const kanton = row['Kanton'] || ''
    const address = [street, `${plz} ${ort}`.trim(), kanton].filter(Boolean).join(', ')
    const email = cleanEmail(row['Email'])
    const phone = cleanPhone(row['Telefon']) || cleanPhone(row['Mobil'])
    const website = row['Website'] || ''

    results.push({
      contactId: uuid(),
      leadId: uuid(),
      firstName: first || 'Unbekannt',
      lastName: last,
      email: email || `noemail-b2c-${results.length}@placeholder.local`,
      phone,
      company: null,
      address: address || '',
      notes: website ? `Website: ${website}` : null,
    })
  }
  return results
}

// ── B2B Transformer ──
function transformB2B(rows) {
  console.log(`  B2B: ${rows.length} Zeilen gelesen`)
  const results = []
  for (const row of rows) {
    const firstName = row['Vorname'] || 'Unbekannt'
    const lastName = row['Nachname'] || ''
    const company = row['Institution / Firmenname'] || ''
    const street = row['Strasse / Nr.'] || ''
    const plz = row['PLZ'] || ''
    const ort = row['Ort'] || ''
    const kanton = row['Kanton'] || ''
    const address = [street, `${plz} ${ort}`.trim(), kanton].filter(Boolean).join(', ')
    const email = cleanEmail(row['E-Mail'])
    const phone = cleanPhone(row['Telefon'])
    const funktion = row['Funktion'] || ''
    const mitarbeiter = row['Anzahl Mitarbeitende'] || ''
    const branche = row['Listenkategorie'] || ''
    const rechtsform = row['Rechtsform'] || ''

    const notesParts = []
    if (funktion) notesParts.push(`Funktion: ${funktion}`)
    if (mitarbeiter) notesParts.push(`Mitarbeiter: ${mitarbeiter}`)
    if (branche) notesParts.push(`Branche: ${branche}`)
    if (rechtsform) notesParts.push(`Rechtsform: ${rechtsform}`)

    results.push({
      contactId: uuid(),
      leadId: uuid(),
      firstName: String(firstName).trim() || 'Unbekannt',
      lastName: String(lastName).trim(),
      email: email || `noemail-b2b-${results.length}@placeholder.local`,
      phone,
      company: company || null,
      address: address || '',
      notes: notesParts.length ? notesParts.join(' | ') : null,
    })
  }
  return results
}

// ── Solar Transformer ──
function transformSolar(rows) {
  console.log(`  Solar: ${rows.length} Zeilen gelesen`)
  const results = []
  for (const row of rows) {
    const firstName = row['Person - Name'] || 'Unbekannt'
    const lastName = row['Person - Nachname'] || ''
    const phone = cleanPhone(row['Person - Telefonnummer'])
    const email = cleanEmail(row['Person - E-Mail'])
    const leadTitle = row['Lead - Titel'] || ''
    const leadSource = row['Person - Lead über'] || ''

    const notesParts = []
    if (leadTitle) notesParts.push(leadTitle)
    if (leadSource) notesParts.push(`Quelle: ${leadSource}`)

    results.push({
      contactId: uuid(),
      leadId: uuid(),
      firstName: String(firstName).trim() || 'Unbekannt',
      lastName: String(lastName).trim(),
      email: email || `noemail-solar-${results.length}@placeholder.local`,
      phone,
      company: null,
      address: '',
      notes: notesParts.length ? notesParts.join(' | ') : null,
    })
  }
  return results
}

// ── SQL Generator ──
function generateSQL(records, tagId, batchSize = 200) {
  const batches = []
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    // Contacts INSERT
    const contactValues = batch.map(r =>
      `(${esc(r.contactId)}, ${esc(r.firstName)}, ${esc(r.lastName)}, ${esc(r.email)}, ${esc(r.phone)}, ${esc(r.company)}, ${esc(r.address)})`
    ).join(',\n')

    // Leads INSERT
    const leadValues = batch.map(r =>
      `(${esc(r.leadId)}, ${esc(r.contactId)}, 'KALTAKQUISE', 'ACTIVE', 0, ${esc(r.notes)})`
    ).join(',\n')

    // Lead Tags INSERT
    const tagValues = batch.map(r =>
      `(${esc(r.leadId)}, ${esc(tagId)})`
    ).join(',\n')

    const sql = `-- Batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)
INSERT INTO contacts (id, first_name, last_name, email, phone, company, address) VALUES
${contactValues};

INSERT INTO leads (id, contact_id, source, status, value, notes) VALUES
${leadValues};

INSERT INTO lead_tags (lead_id, tag_id) VALUES
${tagValues};
`
    batches.push(sql)
  }
  return batches
}

// ── Main ──
function main() {
  console.log('=== Kaltakquise Import Vorbereitung ===\n')

  // B2C
  console.log('1. B2C Privat laden...')
  const wb1 = XLSX.readFile(FILES.b2c)
  const b2cRows = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]])
  const b2cData = transformB2C(b2cRows)
  const b2cBatches = generateSQL(b2cData, TAG_IDS.b2c)
  console.log(`   → ${b2cData.length} Datensaetze, ${b2cBatches.length} Batches\n`)

  // B2B
  console.log('2. B2B Firmen laden...')
  const wb2 = XLSX.readFile(FILES.b2b)
  const b2bRows = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]])
  const b2bData = transformB2B(b2bRows)
  const b2bBatches = generateSQL(b2bData, TAG_IDS.b2b)
  console.log(`   → ${b2bData.length} Datensaetze, ${b2bBatches.length} Batches\n`)

  // Solar
  console.log('3. Solaranfragen laden...')
  const wb3 = XLSX.readFile(FILES.solar)
  const solarRows = XLSX.utils.sheet_to_json(wb3.Sheets[wb3.SheetNames[0]])
  const solarData = transformSolar(solarRows)
  const solarBatches = generateSQL(solarData, TAG_IDS.solar)
  console.log(`   → ${solarData.length} Datensaetze, ${solarBatches.length} Batches\n`)

  // Write SQL files
  const allBatches = [
    ...b2cBatches.map((sql, i) => ({ sql, file: `b2c_batch_${String(i + 1).padStart(3, '0')}.sql` })),
    ...b2bBatches.map((sql, i) => ({ sql, file: `b2b_batch_${String(i + 1).padStart(3, '0')}.sql` })),
    ...solarBatches.map((sql, i) => ({ sql, file: `solar_batch_${String(i + 1).padStart(3, '0')}.sql` })),
  ]

  // Write a master manifest
  const manifest = {
    created: new Date().toISOString(),
    totals: {
      b2c: b2cData.length,
      b2b: b2bData.length,
      solar: solarData.length,
      total: b2cData.length + b2bData.length + solarData.length,
    },
    batches: {
      b2c: b2cBatches.length,
      b2b: b2bBatches.length,
      solar: solarBatches.length,
      total: allBatches.length,
    },
    files: allBatches.map(b => b.file),
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  for (const batch of allBatches) {
    fs.writeFileSync(path.join(OUTPUT_DIR, batch.file), batch.sql)
  }

  console.log('=== Zusammenfassung ===')
  console.log(`B2C:   ${b2cData.length} Leads (${b2cBatches.length} Batches)`)
  console.log(`B2B:   ${b2bData.length} Leads (${b2bBatches.length} Batches)`)
  console.log(`Solar: ${solarData.length} Leads (${solarBatches.length} Batches)`)
  console.log(`Total: ${manifest.totals.total} Leads (${manifest.batches.total} Batches)`)
  console.log(`\nSQL-Dateien geschrieben nach: ${OUTPUT_DIR}`)
  console.log('Manifest: manifest.json')
}

main()
