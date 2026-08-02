/**
 * Erzeugt CHANGELOG.md aus der Git-Historie – jeder Tag einzeln.
 *
 * Das Projekt hat keine Versionsnummern, ausgeliefert wird laufend.
 * Deshalb ist das Datum die Gliederung: Monat als Ueberschrift, darunter
 * jeder Arbeitstag mit allen Aenderungen dieses Tages.
 *
 * Aufruf: node tools/changelog.mjs
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'

const TRENNER = '' // Trennzeichen, das in Commit-Texten nicht vorkommt

/** Commits mit Datum, Kurz-Hash und Betreff, aeltester zuerst. */
function commits() {
  // Als Buffer holen und selbst dekodieren: unter Windows liefert execSync
  // sonst die Windows-Codepage und Umlaute in alten Commits brechen auf
  const roh = execSync(
    `git log --reverse --date=short --pretty=format:"%ad${TRENNER}%h${TRENNER}%s"`,
    { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 }
  ).toString('utf8')
  return roh
    .split('\n')
    .filter(Boolean)
    .map((z) => {
      const [datum, hash, betreff] = z.split(TRENNER)
      return { datum, hash, betreff }
    })
}

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]
const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

/** Aus "2026-07-31" wird "Freitag, 31. Juli 2026". */
function langesDatum(iso) {
  const [j, m, t] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(j, m - 1, t))
  return `${TAGE[d.getUTCDay()]}, ${t}. ${MONATE[m - 1]} ${j}`
}

/** Praefix wie "feat:" in eine Ueberschrift uebersetzen. */
const ARTEN = [
  ['feat', 'Neu'],
  ['fix', 'Behoben'],
  ['perf', 'Schneller'],
  ['refactor', 'Umgebaut'],
  ['docs', 'Unterlagen'],
  ['test', 'Tests'],
  ['chore', 'Wartung'],
  ['style', 'Darstellung'],
]

function zerlegen(betreff) {
  const m = betreff.match(/^(\w+)(\([^)]*\))?!?:\s*(.+)$/)
  if (!m) return { art: null, text: betreff }
  const treffer = ARTEN.find(([praefix]) => praefix === m[1].toLowerCase())
  return { art: treffer ? treffer[1] : null, text: m[3] }
}

// ── Aufbau ──
const alle = commits()
if (!alle.length) {
  console.error('Keine Commits gefunden.')
  process.exit(1)
}

// Neueste zuerst darstellen
const nachTag = new Map()
for (const c of alle) {
  if (!nachTag.has(c.datum)) nachTag.set(c.datum, [])
  nachTag.get(c.datum).push(c)
}
const tage = [...nachTag.keys()].sort().reverse()

const zeilen = [
  '# Änderungsverlauf',
  '',
  'Jeder Arbeitstag mit allen Änderungen dieses Tages, neueste zuerst.',
  'Das Projekt hat keine Versionsnummern – ausgeliefert wird laufend auf',
  'https://neosolar-crm.com.',
  '',
  `**${alle.length} Änderungen** vom ${langesDatum(alle[0].datum)} bis ${langesDatum(alle[alle.length - 1].datum)}`,
  `an ${tage.length} Arbeitstagen.`,
  '',
  'Erzeugt mit `node tools/changelog.mjs`. Der aktuelle Arbeitsstand steht in',
  '[PROJEKTSTAND.md](PROJEKTSTAND.md), der Gesprächsverlauf unter [docs/verlauf/](docs/verlauf/).',
  '',
  '---',
  '',
]

let letzterMonat = ''
for (const tag of tage) {
  const [j, m] = tag.split('-').map(Number)
  const monat = `${MONATE[m - 1]} ${j}`
  if (monat !== letzterMonat) {
    zeilen.push(`## ${monat}`, '')
    letzterMonat = monat
  }

  const eintraege = nachTag.get(tag)
  zeilen.push(`### ${langesDatum(tag)}`, '')

  // Innerhalb des Tages nach Art gruppieren, Reihenfolge wie in ARTEN
  const gruppen = new Map()
  const ohneArt = []
  for (const c of eintraege) {
    const { art, text } = zerlegen(c.betreff)
    if (!art) {
      ohneArt.push({ ...c, text })
      continue
    }
    if (!gruppen.has(art)) gruppen.set(art, [])
    gruppen.get(art).push({ ...c, text })
  }

  const reihenfolge = ARTEN.map(([, name]) => name)
  for (const name of reihenfolge) {
    const liste = gruppen.get(name)
    if (!liste?.length) continue
    zeilen.push(`**${name}**`, '')
    for (const e of liste) zeilen.push(`- ${e.text} \`${e.hash}\``)
    zeilen.push('')
  }
  if (ohneArt.length) {
    zeilen.push('**Sonstiges**', '')
    for (const e of ohneArt) zeilen.push(`- ${e.text} \`${e.hash}\``)
    zeilen.push('')
  }
}

fs.writeFileSync('CHANGELOG.md', zeilen.join('\n'), 'utf8')
console.log(
  `CHANGELOG.md geschrieben: ${alle.length} Aenderungen an ${tage.length} Tagen, ` +
    `${Math.round(zeilen.join('\n').length / 1024)} KB`
)
