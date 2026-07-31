import { api } from './api'

/**
 * Legt eine Datei in der Dokumentenablage eines Kontakts ab.
 *
 * Der Upload geht direkt an den Supabase-Storage und meldet danach die
 * Metadaten an die API – derselbe Weg wie in der DocumentSection. Der Umweg
 * ueber den Server als Base64 wuerde bei mehrseitigen PDF in den
 * Function-Timeout laufen.
 */

const SUPABASE_URL = 'https://tzoquorcgygmrougevgm.supabase.co'
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b3F1b3JjZ3lnbXJvdWdldmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTEzODQsImV4cCI6MjA4ODM2NzM4NH0.79OVK4Zy0q08WvxOPpHZWrklcRWSmHYl2K3VPe1xZmU'

export interface AblageAuftrag {
  contactId: string
  datei: Blob
  dateiName: string
  /** Ordner der Dokumentenablage, z.B. "Vertraege" */
  ordner: string
  mimeType?: string
  /**
   * Muss einer der vom Backend erlaubten Typen sein. Fuer Angebote gilt
   * ANGEBOT – nicht DEAL, auch wenn die Tabelle so heisst.
   */
  entityType?: 'LEAD' | 'TERMIN' | 'ANGEBOT' | 'PROJEKT' | 'KONTAKT'
  entityId?: string | null
  uploadedBy?: string | null
  notes?: string
}

export async function dokumentAblegen(a: AblageAuftrag): Promise<{ storagePath: string }> {
  const sicher = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${a.contactId}/${sicher(a.ordner).toLowerCase()}/${Date.now()}_${sicher(a.dateiName)}`
  const mime = a.mimeType ?? a.datei.type ?? 'application/octet-stream'

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': mime,
    },
    body: a.datei,
  })
  if (!res.ok) {
    throw new Error(`Ablage fehlgeschlagen (${res.status}): ${await res.text()}`)
  }

  // Das Backend nimmt fuer uploadedBy und notes nur Zeichenketten,
  // null fuehrt zu einem Validierungsfehler – daher weglassen statt null.
  await api.post('/documents/metadata', {
    contactId: a.contactId,
    fileName: a.dateiName,
    fileSize: a.datei.size,
    mimeType: mime,
    entityType: a.entityType ?? 'KONTAKT',
    entityId: a.entityId ?? a.contactId,
    storagePath,
    folderPath: a.ordner,
    ...(a.uploadedBy ? { uploadedBy: a.uploadedBy } : {}),
    ...(a.notes ? { notes: a.notes } : {}),
  })

  return { storagePath }
}
