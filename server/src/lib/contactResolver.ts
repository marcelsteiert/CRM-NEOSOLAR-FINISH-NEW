// Kontakt automatisch finden oder erstellen
// Wird von Lead/Termin/Angebot POST-Routes benutzt

import { supabase } from './supabase.js'

interface ContactInput {
  contactId?: string
  firstName?: string
  lastName?: string
  contactName?: string // "Vorname Nachname" combined
  email?: string
  contactEmail?: string
  phone?: string
  contactPhone?: string
  address?: string
  company?: string
}

/**
 * Findet oder erstellt einen Kontakt basierend auf den uebergebenen Daten.
 * - Wenn contactId vorhanden: nutze diesen direkt
 * - Wenn Email vorhanden: suche nach bestehendem Kontakt mit gleicher Email
 * - Sonst: erstelle neuen Kontakt
 */
export async function resolveContactId(input: ContactInput): Promise<string> {
  // Wenn contactId direkt angegeben, nutze diese
  if (input.contactId) return input.contactId

  const email = input.email || input.contactEmail || ''
  const phone = input.phone || input.contactPhone || ''
  const address = input.address || ''
  const company = input.company || null

  // Name aus verschiedenen Formaten extrahieren
  let firstName = input.firstName || ''
  let lastName = input.lastName || ''
  if (!firstName && !lastName && input.contactName) {
    const parts = input.contactName.trim().split(/\s+/)
    firstName = parts[0] || ''
    lastName = parts.slice(1).join(' ') || ''
  }

  // Wenn Email vorhanden, versuche bestehenden Kontakt zu finden
  if (email) {
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      // Kontakt-Daten aktualisieren falls noetig
      const updates: Record<string, unknown> = {}
      if (firstName) updates.first_name = firstName
      if (lastName) updates.last_name = lastName
      if (phone) updates.phone = phone
      if (address) updates.address = address
      if (company !== null) updates.company = company

      if (Object.keys(updates).length > 0) {
        await supabase.from('contacts').update(updates).eq('id', existing.id)
      }

      return existing.id
    }
  }

  // Neuen Kontakt erstellen
  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert({
      first_name: firstName || 'Unbekannt',
      last_name: lastName || '',
      email: email || `noemail-${Date.now()}@placeholder.local`,
      phone: phone || '',
      address: address || '',
      company,
    })
    .select('id')
    .single()

  if (error || !newContact) {
    throw new Error(`Kontakt konnte nicht erstellt werden: ${error?.message}`)
  }

  return newContact.id
}
