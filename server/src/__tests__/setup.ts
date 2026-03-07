import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Lade .env aus dem server-Verzeichnis
// Versuche mehrere Pfade, da __dirname in ESM/CJS unterschiedlich sein kann
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'server/.env'),
]

for (const p of envPaths) {
  const result = config({ path: p })
  if (result.parsed) break
}
