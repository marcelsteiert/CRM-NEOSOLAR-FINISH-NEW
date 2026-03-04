import { Router } from 'express'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const router = Router()

// ── Types ──

export type ProductCategory = 'PV_MODULE' | 'INVERTER' | 'BATTERY' | 'INSTALLATION' | 'PARTNER_PRICE'

export interface Product {
  id: string
  category: ProductCategory
  name: string
  manufacturer: string
  model: string
  specs: Record<string, string | number | boolean>
  unitPrice: number
  unit: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ── Mock Data (Schweizer PV-Markt) ──

const products: Product[] = [
  // PV Module
  {
    id: 'prod-001', category: 'PV_MODULE', name: 'SunPower Maxeon 6 - 420W', manufacturer: 'SunPower', model: 'Maxeon 6',
    specs: { wattPeak: 420, efficiency: 22.8, type: 'Monocrystalline', warranty: 40 },
    unitPrice: 285, unit: 'Stück', isActive: true, sortOrder: 1,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-002', category: 'PV_MODULE', name: 'Meyer Burger Glass - 390W', manufacturer: 'Meyer Burger', model: 'Glass',
    specs: { wattPeak: 390, efficiency: 21.4, type: 'Heterojunction', warranty: 30 },
    unitPrice: 310, unit: 'Stück', isActive: true, sortOrder: 2,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-003', category: 'PV_MODULE', name: 'JA Solar DeepBlue 4.0 - 440W', manufacturer: 'JA Solar', model: 'DeepBlue 4.0',
    specs: { wattPeak: 440, efficiency: 22.3, type: 'Monocrystalline', warranty: 25 },
    unitPrice: 195, unit: 'Stück', isActive: true, sortOrder: 3,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-004', category: 'PV_MODULE', name: 'Trina Solar Vertex S+ - 430W', manufacturer: 'Trina Solar', model: 'Vertex S+',
    specs: { wattPeak: 430, efficiency: 22.0, type: 'Monocrystalline', warranty: 25 },
    unitPrice: 175, unit: 'Stück', isActive: true, sortOrder: 4,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  // Wechselrichter
  {
    id: 'prod-010', category: 'INVERTER', name: 'Fronius Symo GEN24 10.0', manufacturer: 'Fronius', model: 'Symo GEN24 10.0',
    specs: { maxPower: 10000, phases: 3, hybrid: true, warranty: 10 },
    unitPrice: 3200, unit: 'Stück', isActive: true, sortOrder: 1,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-011', category: 'INVERTER', name: 'Fronius Primo GEN24 6.0', manufacturer: 'Fronius', model: 'Primo GEN24 6.0',
    specs: { maxPower: 6000, phases: 1, hybrid: true, warranty: 10 },
    unitPrice: 2400, unit: 'Stück', isActive: true, sortOrder: 2,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-012', category: 'INVERTER', name: 'Huawei SUN2000-10KTL-M2', manufacturer: 'Huawei', model: 'SUN2000-10KTL-M2',
    specs: { maxPower: 10000, phases: 3, hybrid: false, warranty: 10 },
    unitPrice: 1800, unit: 'Stück', isActive: true, sortOrder: 3,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  // Batterien
  {
    id: 'prod-020', category: 'BATTERY', name: 'BYD HVS 10.2', manufacturer: 'BYD', model: 'HVS 10.2',
    specs: { capacityKWh: 10.2, cycles: 6000, warranty: 10 },
    unitPrice: 8500, unit: 'Stück', isActive: true, sortOrder: 1,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-021', category: 'BATTERY', name: 'BYD HVS 7.7', manufacturer: 'BYD', model: 'HVS 7.7',
    specs: { capacityKWh: 7.7, cycles: 6000, warranty: 10 },
    unitPrice: 6800, unit: 'Stück', isActive: true, sortOrder: 2,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-022', category: 'BATTERY', name: 'Tesla Powerwall 3', manufacturer: 'Tesla', model: 'Powerwall 3',
    specs: { capacityKWh: 13.5, cycles: 5000, warranty: 10 },
    unitPrice: 9200, unit: 'Stück', isActive: true, sortOrder: 3,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  // Installation
  {
    id: 'prod-030', category: 'INSTALLATION', name: 'Montage Schrägdach (Aufdach)', manufacturer: '-', model: 'Aufdach',
    specs: { type: 'Aufdach', dachtyp: 'Schrägdach' },
    unitPrice: 450, unit: 'kWp', isActive: true, sortOrder: 1,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-031', category: 'INSTALLATION', name: 'Montage Flachdach', manufacturer: '-', model: 'Flachdach',
    specs: { type: 'Aufdach', dachtyp: 'Flachdach' },
    unitPrice: 520, unit: 'kWp', isActive: true, sortOrder: 2,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-032', category: 'INSTALLATION', name: 'Montage Indach', manufacturer: '-', model: 'Indach',
    specs: { type: 'Indach', dachtyp: 'Schrägdach' },
    unitPrice: 680, unit: 'kWp', isActive: true, sortOrder: 3,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-033', category: 'INSTALLATION', name: 'Gerüst / Sicherung', manufacturer: '-', model: '-',
    specs: { type: 'Sicherheit' },
    unitPrice: 1200, unit: 'Pauschale', isActive: true, sortOrder: 4,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  // Partner-Preise
  {
    id: 'prod-040', category: 'PARTNER_PRICE', name: 'Elektro Müller AG – AC-Anschluss', manufacturer: 'Elektro Müller AG', model: 'AC-Anschluss',
    specs: { service: 'AC-Anschluss', region: 'Ostschweiz' },
    unitPrice: 1800, unit: 'Pauschale', isActive: true, sortOrder: 1,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod-041', category: 'PARTNER_PRICE', name: 'Solartechnik Bern – DC-Verkabelung', manufacturer: 'Solartechnik Bern', model: 'DC-Verkabelung',
    specs: { service: 'DC-Verkabelung', region: 'Mittelland' },
    unitPrice: 950, unit: 'Pauschale', isActive: true, sortOrder: 2,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z',
  },
]

// ── Validation ──

const createProductSchema = z.object({
  category: z.enum(['PV_MODULE', 'INVERTER', 'BATTERY', 'INSTALLATION', 'PARTNER_PRICE']),
  name: z.string().min(1),
  manufacturer: z.string().default('-'),
  model: z.string().default('-'),
  specs: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  unitPrice: z.number().min(0),
  unit: z.string().default('Stück'),
  isActive: z.boolean().default(true),
})

const updateProductSchema = createProductSchema.partial()

// ── Routes ──

router.get('/', (req, res) => {
  const { category } = req.query
  let filtered = products.filter((p) => !p.isActive || p.isActive) // all products
  if (category && category !== 'ALL') {
    filtered = filtered.filter((p) => p.category === category)
  }
  filtered.sort((a, b) => a.sortOrder - b.sortOrder)
  res.json({ data: filtered, total: filtered.length })
})

router.get('/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id)
  if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden' })
  res.json({ data: product })
})

router.post('/', (req, res) => {
  const parsed = createProductSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues })
  const now = new Date().toISOString()
  const product: Product = {
    id: `prod-${randomUUID().slice(0, 8)}`,
    ...parsed.data,
    sortOrder: products.filter((p) => p.category === parsed.data.category).length + 1,
    createdAt: now,
    updatedAt: now,
  }
  products.push(product)
  res.status(201).json({ data: product })
})

router.put('/:id', (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Produkt nicht gefunden' })
  const parsed = updateProductSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues })
  products[idx] = { ...products[idx], ...parsed.data, updatedAt: new Date().toISOString() }
  res.json({ data: products[idx] })
})

router.delete('/:id', (req, res) => {
  const idx = products.findIndex((p) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Produkt nicht gefunden' })
  products.splice(idx, 1)
  res.json({ message: 'Produkt gelöscht' })
})

export default router
