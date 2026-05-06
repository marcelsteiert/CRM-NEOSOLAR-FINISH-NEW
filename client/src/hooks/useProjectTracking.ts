import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──

export type PaymentStatus = 'OFFEN' | 'IN_ARBEIT' | 'KASSIERT' | 'FAKTURIERT' | 'VERLUST'
export type ProvisionStatus = 'OFFEN' | 'AUSBEZAHLT' | 'ZURUECKGEFORDERT'

export interface Construction {
  projectId: string
  displayOrder: number | null
  baubewilligung: boolean
  baubewilligungAm: string | null
  baubewilligungNote: string | null
  tagEingereicht: boolean
  tagEingereichtAm: string | null
  tagBewilligt: boolean
  tagBewilligtAm: string | null
  tagNote: string | null
  iaEingereicht: boolean
  iaEingereichtAm: string | null
  iaBewilligt: boolean
  iaBewilligtAm: string | null
  iaNote: string | null
  dcMontageTermin: string | null
  dcMontageAusgefuehrt: boolean
  dcMontageAm: string | null
  acTermin: string | null
  acInstalliert: boolean
  acInstalliertAm: string | null
  fehltEtwas: string | null
  bemerkung: string | null
  createdAt: string
  updatedAt: string
}

export interface Calculation {
  projectId: string
  materialKranich: number | null
  elektriker: number | null
  montageSergej: number | null
  weitereKosten: { label: string; amount: number }[] | null
  vkBetrag: number | null
  a1AnteilProzent: number
  a2AnteilProzent: number
  a3AnteilProzent: number
  a1KassiertAm: string | null
  a1FakturiertAm: string | null
  a2KassiertAm: string | null
  a2FakturiertAm: string | null
  a3KassiertAm: string | null
  a3FakturiertAm: string | null
  provisionSatzProzent: number | null
  provisionStatus: ProvisionStatus
  provisionAm: string | null
  paymentStatus: PaymentStatus
  bemerkung: string | null
  createdAt: string
  updatedAt: string
}

export interface TrackedProject {
  id: string
  name: string
  contactId: string
  createdAt: string
  archivedAt: string | null
  completedAt: string | null
  contact: {
    firstName: string
    lastName: string
    company: string | null
    phone: string | null
    email: string | null
    address: string | null
  } | null
  construction: Construction | null
  calculation: Calculation | null
}

interface ListResponse {
  data: TrackedProject[]
  permissions?: { baustellen: boolean; kalkulation: boolean }
}

export function useTrackingPermissions() {
  const { data } = useTrackedProjects()
  return data?.permissions ?? { baustellen: false, kalkulation: false }
}

// ── Hooks ──

export function useTrackedProjects() {
  return useQuery({
    queryKey: ['project-tracking'],
    queryFn: () => api.get<ListResponse>('/admin/project-tracking'),
  })
}

// snake_case <-> camelCase Mapping fuer Construction-Updates
const constructionFieldMap: Record<string, string> = {
  baubewilligung: 'baubewilligung',
  baubewilligungAm: 'baubewilligung_am',
  baubewilligungNote: 'baubewilligung_note',
  tagEingereicht: 'tag_eingereicht',
  tagEingereichtAm: 'tag_eingereicht_am',
  tagBewilligt: 'tag_bewilligt',
  tagBewilligtAm: 'tag_bewilligt_am',
  tagNote: 'tag_note',
  iaEingereicht: 'ia_eingereicht',
  iaEingereichtAm: 'ia_eingereicht_am',
  iaBewilligt: 'ia_bewilligt',
  iaBewilligtAm: 'ia_bewilligt_am',
  iaNote: 'ia_note',
  dcMontageTermin: 'dc_montage_termin',
  dcMontageAusgefuehrt: 'dc_montage_ausgefuehrt',
  dcMontageAm: 'dc_montage_am',
  acTermin: 'ac_termin',
  acInstalliert: 'ac_installiert',
  acInstalliertAm: 'ac_installiert_am',
  fehltEtwas: 'fehlt_etwas',
  bemerkung: 'bemerkung',
}

const calculationFieldMap: Record<string, string> = {
  materialKranich: 'material_kranich',
  elektriker: 'elektriker',
  montageSergej: 'montage_sergej',
  weitereKosten: 'weitere_kosten',
  vkBetrag: 'vk_betrag',
  a1AnteilProzent: 'a1_anteil_prozent',
  a2AnteilProzent: 'a2_anteil_prozent',
  a3AnteilProzent: 'a3_anteil_prozent',
  a1KassiertAm: 'a1_kassiert_am',
  a1FakturiertAm: 'a1_fakturiert_am',
  a2KassiertAm: 'a2_kassiert_am',
  a2FakturiertAm: 'a2_fakturiert_am',
  a3KassiertAm: 'a3_kassiert_am',
  a3FakturiertAm: 'a3_fakturiert_am',
  provisionSatzProzent: 'provision_satz_prozent',
  provisionStatus: 'provision_status',
  provisionAm: 'provision_am',
  paymentStatus: 'payment_status',
  bemerkung: 'bemerkung',
}

function toSnake(input: Record<string, unknown>, map: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    out[map[k] ?? k] = v
  }
  return out
}

export function useUpdateConstruction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, patch }: { projectId: string; patch: Partial<Construction> }) =>
      api.put<{ data: Construction }>(`/admin/project-tracking/${projectId}/construction`, toSnake(patch as any, constructionFieldMap)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tracking'] }),
  })
}

export function useUpdateCalculation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, patch }: { projectId: string; patch: Partial<Calculation> }) =>
      api.put<{ data: Calculation }>(`/admin/project-tracking/${projectId}/calculation`, toSnake(patch as any, calculationFieldMap)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tracking'] }),
  })
}

// ── Helpers ──

export function totalKosten(c: Calculation | null): number {
  if (!c) return 0
  const weitere = (c.weitereKosten ?? []).reduce((sum, k) => sum + (k.amount ?? 0), 0)
  return (c.materialKranich ?? 0) + (c.elektriker ?? 0) + (c.montageSergej ?? 0) + weitere
}

export function margeChf(c: Calculation | null): number {
  if (!c) return 0
  return (c.vkBetrag ?? 0) - totalKosten(c)
}

export function margePct(c: Calculation | null): number {
  if (!c || !c.vkBetrag) return 0
  return (margeChf(c) / c.vkBetrag) * 100
}

export function trancheBetrag(c: Calculation | null, t: 'a1' | 'a2' | 'a3'): number {
  if (!c?.vkBetrag) return 0
  const pct = t === 'a1' ? c.a1AnteilProzent : t === 'a2' ? c.a2AnteilProzent : c.a3AnteilProzent
  return c.vkBetrag * (pct / 100)
}

export function trancheKassiert(c: Calculation | null, t: 'a1' | 'a2' | 'a3'): boolean {
  if (!c) return false
  return !!(t === 'a1' ? c.a1KassiertAm : t === 'a2' ? c.a2KassiertAm : c.a3KassiertAm)
}

export function trancheFakturiert(c: Calculation | null, t: 'a1' | 'a2' | 'a3'): boolean {
  if (!c) return false
  return !!(t === 'a1' ? c.a1FakturiertAm : t === 'a2' ? c.a2FakturiertAm : c.a3FakturiertAm)
}
