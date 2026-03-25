/**
 * Kaltakquise Import Runner – Supabase JS Client
 *
 * Usage: node scripts/run-import.js [solar|b2c|b2b|all]
 */

const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const path = require('path')

// ── Config ──
const SUPABASE_URL = 'https://tzoquorcgygmrougevgm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b3F1b3JjZ3lnbXJvdWdldmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTEzODQsImV4cCI6MjA4ODM2NzM4NH0.79OVK4Zy0q08WvxOPpHZWrklcRWSmHYl2K3VPe1xZmU'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const BATCH_SIZE = 100
const TAG_IDS = { b2c: 'ka-b2c', b2b: 'ka-b2b', solar: 'ka-solar' }

const FILES = {
  b2c: 'C:/Users/SVK05/Desktop/Datenbank_Local Export_Marcel Steiert.xlsx',
  b2b: 'C:/Users/SVK05/OneDrive/Dokumente/Kontakte.xlsx',
  solar: 'C:/Users/SVK05/OneDrive/Desktop/leads-21506794-8.xlsx',
}

// ── Helpers ──
const uuid = () => crypto.randomUUID()
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function splitName(name) {
  if (!name) return { first: 'Unbekannt', last: '' }
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0] || 'Unbekannt', last: '' }
  const last = parts.pop()
  return { first: parts.join(' '), last }
}

function clean(val) {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

// ── Transformers ──
function transformB2C(row, idx) {
  const { first, last } = splitName(row['Name'])
  const street = clean(row['Strasse / Nr.'])
  const plz = clean(row['PLZ'])
  const ort = clean(row['Ort'])
  const kanton = clean(row['Kanton'])
  const address = [street, `${plz} ${ort}`.trim(), kanton].filter(Boolean).join(', ')
  const email = clean(row['Email']).toLowerCase() || `noemail-b2c-${idx}@placeholder.local`
  const phone = clean(row['Telefon']) || clean(row['Mobil'])
  const website = clean(row['Website'])
  return {
    contact: { id: uuid(), first_name: first, last_name: last, email, phone, company: null, address },
    notes: website ? `Website: ${website}` : null,
  }
}

function transformB2B(row, idx) {
  const firstName = clean(row['Vorname']) || 'Unbekannt'
  const lastName = clean(row['Nachname'])
  const company = clean(row['Institution / Firmenname']) || null
  const street = clean(row['Strasse / Nr.'])
  const plz = clean(row['PLZ'])
  const ort = clean(row['Ort'])
  const kanton = clean(row['Kanton'])
  const address = [street, `${plz} ${ort}`.trim(), kanton].filter(Boolean).join(', ')
  const email = clean(row['E-Mail']).toLowerCase() || `noemail-b2b-${idx}@placeholder.local`
  const phone = clean(row['Telefon'])
  const funktion = clean(row['Funktion'])
  const mitarbeiter = clean(row['Anzahl Mitarbeitende'])
  const branche = clean(row['Listenkategorie'])
  const parts = []
  if (funktion) parts.push(`Funktion: ${funktion}`)
  if (mitarbeiter) parts.push(`MA: ${mitarbeiter}`)
  if (branche) parts.push(`Branche: ${branche}`)
  return {
    contact: { id: uuid(), first_name: firstName, last_name: lastName, email, phone, company, address },
    notes: parts.length ? parts.join(' | ') : null,
  }
}

function transformSolar(row, idx) {
  const firstName = clean(row['Person - Name']) || 'Unbekannt'
  const lastName = clean(row['Person - Nachname'])
  const email = clean(row['Person - E-Mail']).toLowerCase() || `noemail-solar-${idx}@placeholder.local`
  const phone = clean(row['Person - Telefonnummer'])
  const title = clean(row['Lead - Titel'])
  return {
    contact: { id: uuid(), first_name: firstName, last_name: lastName, email, phone, company: null, address: '' },
    notes: title || null,
  }
}

// ── Import Function ──
async function importFile(fileKey, transformer) {
  console.log(`\n=== ${fileKey.toUpperCase()} importieren ===`)
  const wb = XLSX.readFile(FILES[fileKey])
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
  console.log(`  ${rows.length} Zeilen gelesen`)

  const tagId = TAG_IDS[fileKey]
  let success = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const transformed = batch.map((row, j) => {
      const t = transformer(row, i + j)
      const leadId = uuid()
      return { ...t, leadId }
    })

    // 1. Insert contacts
    const contacts = transformed.map(t => t.contact)
    const { error: cErr } = await supabase.from('contacts').insert(contacts)
    if (cErr) {
      console.error(`  CONTACT ERROR batch ${Math.floor(i / BATCH_SIZE) + 1}: ${cErr.message}`)
      errors += batch.length
      await sleep(200)
      continue
    }

    // 2. Insert leads
    const leads = transformed.map(t => ({
      id: t.leadId,
      contact_id: t.contact.id,
      source: 'KALTAKQUISE',
      status: 'ACTIVE',
      value: 0,
      notes: t.notes,
    }))
    const { error: lErr } = await supabase.from('leads').insert(leads)
    if (lErr) {
      console.error(`  LEAD ERROR batch ${Math.floor(i / BATCH_SIZE) + 1}: ${lErr.message}`)
      errors += batch.length
      await sleep(200)
      continue
    }

    // 3. Insert lead_tags
    const tags = transformed.map(t => ({ lead_id: t.leadId, tag_id: tagId }))
    const { error: tErr } = await supabase.from('lead_tags').insert(tags)
    if (tErr) {
      console.error(`  TAG ERROR batch ${Math.floor(i / BATCH_SIZE) + 1}: ${tErr.message}`)
    }

    success += batch.length

    // Progress log every 10 batches
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      const pct = Math.round((i + batch.length) / rows.length * 100)
      console.log(`  ${fileKey}: ${batchNum}/${totalBatches} Batches (${pct}%) – ${success} ok, ${errors} fehler`)
    }

    await sleep(50) // Rate limit protection
  }

  console.log(`  ✓ ${fileKey}: ${success} importiert, ${errors} fehler`)
  return { success, errors }
}

// ── Main ──
async function main() {
  const target = process.argv[2] || 'all'
  console.log(`Kaltakquise Import: ${target}`)
  console.log(`Batch-Groesse: ${BATCH_SIZE}`)

  const results = {}

  if (target === 'solar' || target === 'all') {
    results.solar = await importFile('solar', transformSolar)
  }
  if (target === 'b2c' || target === 'all') {
    results.b2c = await importFile('b2c', transformB2C)
  }
  if (target === 'b2b' || target === 'all') {
    results.b2b = await importFile('b2b', transformB2B)
  }

  console.log('\n=== ZUSAMMENFASSUNG ===')
  let totalOk = 0, totalErr = 0
  for (const [key, r] of Object.entries(results)) {
    console.log(`  ${key}: ${r.success} ok, ${r.errors} fehler`)
    totalOk += r.success
    totalErr += r.errors
  }
  console.log(`  TOTAL: ${totalOk} importiert, ${totalErr} fehler`)
}

main().catch(console.error)
