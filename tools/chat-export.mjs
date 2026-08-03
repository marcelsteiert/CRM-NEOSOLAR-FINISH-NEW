/**
 * Exportiert die Claude-Code-Verlaeufe dieses Projekts als lesbares Markdown.
 *
 * Zweck: der Arbeitsstand soll von jedem Rechner aus nachlesbar sein, ohne
 * dass man die Sitzung offen hat.
 *
 * Wichtig: die Rohdaten enthalten Zugangsdaten, die im Gespraech genannt
 * wurden. Vor dem Schreiben werden Tokens, Schluessel und lange Zufallsketten
 * maskiert. Trotzdem gilt: vor dem Commit einmal drueberlesen.
 *
 * Aufruf:  node tools/chat-export.mjs
 * Ergebnis: docs/verlauf/<datum>_<sitzung>.md
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const PROJEKT = 'c--Users-SVK05-crm-neosolar'
const QUELLE = path.join(os.homedir(), '.claude', 'projects', PROJEKT)
const ZIEL = path.join(process.cwd(), 'docs', 'verlauf')

/** Muster, die nie im Repo landen duerfen. */
const GEHEIM = [
  // JSON Web Token (Supabase anon und service_role)
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '<JWT entfernt>'],
  // API-Schluessel von Anthropic und OpenAI
  [/sk-(ant|proj|live)-[A-Za-z0-9_-]{20,}/g, '<API-Schluessel entfernt>'],
  // GitHub-Token
  [/gh[pousr]_[A-Za-z0-9]{30,}/g, '<GitHub-Token entfernt>'],
  // Netlify Build Hooks und aehnliche URL mit Schluessel
  [/build_hooks\/[a-f0-9]{20,}/g, 'build_hooks/<entfernt>'],
  // Zuweisungen wie SUPABASE_SERVICE_ROLE_KEY=...
  [/((?:SERVICE_ROLE|SECRET|API_KEY|ACCESS_KEY)[A-Z_]*\s*[=:]\s*)\S{8,}/gi, '$1<entfernt>'],
  // Benutzerpasswoerter im Klartext – auch kurze und mit mehreren Leerzeichen
  [/((?:passwort|password|kennwort|pw|token)\s*[=:]\s+)\S{4,}/gi, '$1<entfernt>'],
  // Supabase-Projektschluessel in URL-Form
  [/(apikey\s*[=:]\s*)\S{20,}/gi, '$1<entfernt>'],
  // Freie Nennung wie "wert: ..." oder "secret: ..." direkt nach einem Label.
  // Muss vor dem Tilde-Muster stehen, sonst maskieren beide dieselbe Stelle.
  [/((?:wert|value|secret|geheimnis|schluessel|schlüssel|key)\s*[=:]\s*)\S{16,}/gi, '$1<entfernt>'],
  // Azure-Clientgeheimnisse: rund 40 Zeichen, enthalten fast immer eine Tilde
  [/\b[A-Za-z0-9._~-]{2,}~[A-Za-z0-9._~-]{25,}\b/g, '<Azure-Geheimnis entfernt>'],
]

function saeubern(text) {
  let t = text
  for (const [muster, ersatz] of GEHEIM) t = t.replace(muster, ersatz)
  return t
}

function textVon(inhalt) {
  if (typeof inhalt === 'string') return inhalt
  if (!Array.isArray(inhalt)) return ''
  return inhalt
    .filter((c) => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n')
}

function kuerzen(text, max = 4000) {
  if (text.length <= max) return text
  return text.slice(0, max) + `\n\n_… ${text.length - max} Zeichen gekuerzt_`
}

function exportiere(datei) {
  const zeilen = fs.readFileSync(datei, 'utf8').split('\n').filter(Boolean)
  const eintraege = []
  let ersteZeit = null
  let letzteZeit = null

  for (const zeile of zeilen) {
    let e
    try {
      e = JSON.parse(zeile)
    } catch {
      continue
    }
    const zeit = e.timestamp ?? null
    if (zeit) {
      ersteZeit ??= zeit
      letzteZeit = zeit
    }

    const rolle = e.message?.role ?? e.type
    if (rolle !== 'user' && rolle !== 'assistant') continue

    const text = textVon(e.message?.content).trim()
    if (!text) continue
    // System-Einschuebe und Werkzeug-Rueckmeldungen gehoeren nicht in die Chronik
    if (text.startsWith('<system-reminder>') || text.startsWith('Caveat:')) continue
    if (text.startsWith('<command-name>') || text.startsWith('<local-command')) continue

    eintraege.push({ rolle, zeit, text: saeubern(text) })
  }

  if (!eintraege.length) return null

  const tag = (ersteZeit ?? new Date().toISOString()).slice(0, 10)
  const kurz = path.basename(datei, '.jsonl').slice(0, 8)
  const kopf = [
    `# Arbeitsverlauf ${tag}`,
    '',
    `Sitzung \`${kurz}\` · ${eintraege.length} Beitraege`,
    ersteZeit && letzteZeit
      ? `Von ${new Date(ersteZeit).toLocaleString('de-CH')} bis ${new Date(letzteZeit).toLocaleString('de-CH')}`
      : '',
    '',
    '> Automatisch erzeugt mit `node tools/chat-export.mjs`.',
    '> Zugangsdaten sind maskiert. Werkzeugaufrufe und Dateiinhalte sind nicht enthalten.',
    '',
    '---',
    '',
  ].filter(Boolean)

  const koerper = eintraege.map((e) => {
    const wer = e.rolle === 'user' ? '**Marcel**' : '**Claude**'
    const wann = e.zeit ? new Date(e.zeit).toLocaleString('de-CH') : ''
    return `### ${wer}${wann ? ` · ${wann}` : ''}\n\n${kuerzen(e.text)}\n`
  })

  return { name: `${tag}_${kurz}.md`, inhalt: [...kopf, ...koerper].join('\n') }
}

// ── Lauf ──
if (!fs.existsSync(QUELLE)) {
  console.error(`Keine Verlaeufe gefunden: ${QUELLE}`)
  process.exit(1)
}
fs.mkdirSync(ZIEL, { recursive: true })

const dateien = fs
  .readdirSync(QUELLE)
  .filter((f) => f.endsWith('.jsonl'))
  .map((f) => path.join(QUELLE, f))
  .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)

let geschrieben = 0
for (const d of dateien) {
  const erg = exportiere(d)
  if (!erg) continue
  const ziel = path.join(ZIEL, erg.name)
  fs.writeFileSync(ziel, erg.inhalt, 'utf8')
  console.log(`${erg.name}  ${Math.round(erg.inhalt.length / 1024)} KB`)
  geschrieben++
}

console.log(`\n${geschrieben} Verlaeufe nach docs/verlauf geschrieben.`)
