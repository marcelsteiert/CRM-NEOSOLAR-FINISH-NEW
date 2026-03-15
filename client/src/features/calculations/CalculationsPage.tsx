import { useState, useMemo, useCallback } from 'react'
import {
  Calculator, Plus, Trash2, Save, FileDown, ChevronDown, ChevronUp,
  Sun, Battery, Zap, Wrench, Package, RotateCcw
} from 'lucide-react'
import { useProducts, type Product, type ProductCategory } from '@/hooks/useAdmin'

// ── Typen ──

interface CalcLineItem {
  id: string
  productId: string
  product: Product | null
  quantity: number
  unitPrice: number
  discount: number // Prozent
  total: number
}

interface CalcSection {
  category: ProductCategory
  label: string
  icon: typeof Sun
  color: string
  items: CalcLineItem[]
}

const SECTIONS: { category: ProductCategory; label: string; icon: typeof Sun; color: string }[] = [
  { category: 'PV_MODULE', label: 'PV-Module', icon: Sun, color: '#F59E0B' },
  { category: 'INVERTER', label: 'Wechselrichter', icon: Zap, color: '#22D3EE' },
  { category: 'BATTERY', label: 'Batteriespeicher', icon: Battery, color: '#34D399' },
  { category: 'INSTALLATION', label: 'Montage & Installation', icon: Wrench, color: '#F87171' },
  { category: 'PARTNER_PRICE', label: 'Partner & Dienstleistungen', icon: Package, color: '#A78BFA' },
]

function createEmptyItem(): CalcLineItem {
  return {
    id: crypto.randomUUID(),
    productId: '',
    product: null,
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    total: 0,
  }
}

function calcTotal(item: CalcLineItem): number {
  const base = item.quantity * item.unitPrice
  return base - (base * item.discount / 100)
}

const CHF = (n: number) => n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })

// ── Hauptkomponente ──

export default function CalculationsPage() {
  const { data: productsData } = useProducts()
  const products = useMemo(() => productsData?.data ?? [], [productsData])

  const [projectName, setProjectName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [kWp, setKWp] = useState<number>(0)
  const [margin, setMargin] = useState(15)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(SECTIONS.map(s => s.category)))
  const [sections, setSections] = useState<CalcSection[]>(
    SECTIONS.map(s => ({ ...s, items: [createEmptyItem()] }))
  )

  const toggleSection = useCallback((cat: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const updateItem = useCallback((catIdx: number, itemIdx: number, updates: Partial<CalcLineItem>) => {
    setSections(prev => {
      const next = [...prev]
      const section = { ...next[catIdx], items: [...next[catIdx].items] }
      const item = { ...section.items[itemIdx], ...updates }

      // Wenn Produkt gewaehlt → Preis uebernehmen
      if (updates.productId && updates.productId !== section.items[itemIdx].productId) {
        const product = products.find(p => p.id === updates.productId) ?? null
        item.product = product
        if (product) item.unitPrice = product.unitPrice
      }

      item.total = calcTotal(item)
      section.items[itemIdx] = item
      next[catIdx] = section
      return next
    })
  }, [products])

  const addItem = useCallback((catIdx: number) => {
    setSections(prev => {
      const next = [...prev]
      next[catIdx] = { ...next[catIdx], items: [...next[catIdx].items, createEmptyItem()] }
      return next
    })
  }, [])

  const removeItem = useCallback((catIdx: number, itemIdx: number) => {
    setSections(prev => {
      const next = [...prev]
      const items = next[catIdx].items.filter((_, i) => i !== itemIdx)
      next[catIdx] = { ...next[catIdx], items: items.length > 0 ? items : [createEmptyItem()] }
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setProjectName('')
    setCustomerName('')
    setAddress('')
    setKWp(0)
    setMargin(15)
    setSections(SECTIONS.map(s => ({ ...s, items: [createEmptyItem()] })))
  }, [])

  // ── Berechnungen ──

  const sectionTotals = useMemo(() =>
    sections.map(s => s.items.reduce((sum, item) => sum + calcTotal(item), 0)),
    [sections]
  )

  const subtotal = useMemo(() => sectionTotals.reduce((a, b) => a + b, 0), [sectionTotals])
  const marginAmount = subtotal * margin / 100
  const total = subtotal + marginAmount
  const pricePerKwp = kWp > 0 ? total / kWp : 0

  // ── CSV Export ──

  const exportCSV = useCallback(() => {
    const rows: string[] = [
      `Projekt:,${projectName}`,
      `Kunde:,${customerName}`,
      `Adresse:,${address}`,
      `kWp:,${kWp}`,
      '',
      'Kategorie,Produkt,Menge,Einheit,Einzelpreis,Rabatt %,Total',
    ]
    sections.forEach(s => {
      s.items.forEach(item => {
        if (item.product) {
          rows.push(`${s.label},${item.product.name},${item.quantity},${item.product.unit},${item.unitPrice},${item.discount},${calcTotal(item).toFixed(2)}`)
        }
      })
    })
    rows.push('', `Zwischensumme,,,,,,${subtotal.toFixed(2)}`)
    rows.push(`Marge ${margin}%,,,,,,${marginAmount.toFixed(2)}`)
    rows.push(`TOTAL,,,,,,${total.toFixed(2)}`)

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Kalkulation_${projectName || 'Neu'}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sections, projectName, customerName, address, kWp, subtotal, margin, marginAmount, total])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator size={20} strokeWidth={1.8} />
            PV-Anlagen Kalkulation
          </h1>
          <p className="text-[11px] text-white/40 mt-0.5 hidden sm:block">
            Konfigurieren Sie Module, Wechselrichter, Speicher und Montage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="btn-secondary text-xs flex items-center gap-1.5">
            <RotateCcw size={14} strokeWidth={1.8} /> Zurücksetzen
          </button>
          <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
            <FileDown size={14} strokeWidth={1.8} /> CSV Export
          </button>
          <button className="btn-primary text-xs flex items-center gap-1.5">
            <Save size={14} strokeWidth={1.8} /> Speichern
          </button>
        </div>
      </div>

      {/* Projekt-Info */}
      <div className="glass-card p-5">
        <h2 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">Projektdaten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-white/40 uppercase">Projektname</label>
            <input
              className="glass-input mt-1 w-full"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="z.B. PV-Anlage Müller"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase">Kunde</label>
            <input
              className="glass-input mt-1 w-full"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Kundenname"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase">Adresse</label>
            <input
              className="glass-input mt-1 w-full"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Installationsadresse"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase">Anlagengrösse (kWp)</label>
            <input
              type="number"
              className="glass-input mt-1 w-full"
              value={kWp || ''}
              onChange={e => setKWp(Number(e.target.value))}
              placeholder="z.B. 15"
              min={0}
              step={0.5}
            />
          </div>
        </div>
      </div>

      {/* Kalkulations-Sektionen */}
      {sections.map((section, catIdx) => {
        const catProducts = products.filter(p => p.category === section.category && p.isActive)
        const isExpanded = expandedSections.has(section.category)
        const Icon = section.icon

        return (
          <div key={section.category} className="glass-card overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.category)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${section.color} 15%, transparent)` }}
                >
                  <Icon size={16} strokeWidth={1.8} style={{ color: section.color }} />
                </div>
                <span className="text-sm font-medium text-white">{section.label}</span>
                <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded">
                  {section.items.filter(i => i.productId).length} Positionen
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: section.color }}>
                  {CHF(sectionTotals[catIdx])}
                </span>
                {isExpanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
              </div>
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-[10px] text-white/30 uppercase px-1">
                  <div className="col-span-4">Produkt</div>
                  <div className="col-span-2">Menge</div>
                  <div className="col-span-2">Einzelpreis</div>
                  <div className="col-span-1">Rabatt</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items */}
                {section.items.map((item, itemIdx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    {/* Product Select */}
                    <div className="col-span-4">
                      <select
                        className="glass-input w-full text-xs"
                        value={item.productId}
                        onChange={e => updateItem(catIdx, itemIdx, { productId: e.target.value })}
                      >
                        <option value="">— Produkt wählen —</option>
                        {catProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.manufacturer})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="glass-input w-full text-xs text-center"
                        value={item.quantity}
                        onChange={e => updateItem(catIdx, itemIdx, { quantity: Math.max(0, Number(e.target.value)) })}
                        min={0}
                        step={1}
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="glass-input w-full text-xs text-right"
                        value={item.unitPrice || ''}
                        onChange={e => updateItem(catIdx, itemIdx, { unitPrice: Number(e.target.value) })}
                        min={0}
                        step={0.01}
                        placeholder="CHF"
                      />
                    </div>

                    {/* Discount */}
                    <div className="col-span-1">
                      <input
                        type="number"
                        className="glass-input w-full text-xs text-center"
                        value={item.discount || ''}
                        onChange={e => updateItem(catIdx, itemIdx, { discount: Math.min(100, Math.max(0, Number(e.target.value))) })}
                        min={0}
                        max={100}
                        placeholder="%"
                      />
                    </div>

                    {/* Total */}
                    <div className="col-span-2 text-right text-xs font-medium text-white/80">
                      {CHF(calcTotal(item))}
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeItem(catIdx, itemIdx)}
                        className="p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Button */}
                <button
                  onClick={() => addItem(catIdx)}
                  className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mt-2"
                >
                  <Plus size={14} strokeWidth={1.8} /> Position hinzufügen
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Zusammenfassung */}
      <div className="glass-card p-5">
        <h2 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-4">Zusammenfassung</h2>
        <div className="space-y-2">
          {sections.map((s, i) => (
            sectionTotals[i] > 0 && (
              <div key={s.category} className="flex items-center justify-between text-sm">
                <span className="text-white/50">{s.label}</span>
                <span className="text-white/70">{CHF(sectionTotals[i])}</span>
              </div>
            )
          ))}

          <div className="border-t border-white/[0.06] pt-2 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Zwischensumme</span>
              <span className="text-white">{CHF(subtotal)}</span>
            </div>
          </div>

          {/* Marge Slider */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="text-white/50">Marge</span>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={margin}
                onChange={e => setMargin(Number(e.target.value))}
                className="w-24 h-1 accent-amber-500"
              />
              <span className="text-[11px] text-amber-500 font-medium w-8">{margin}%</span>
            </div>
            <span className="text-amber-400">{CHF(marginAmount)}</span>
          </div>

          <div className="border-t border-white/[0.06] pt-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-white">Gesamttotal</span>
              <span className="text-xl font-bold text-amber-500">{CHF(total)}</span>
            </div>
          </div>

          {/* KPIs */}
          {kWp > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/30 uppercase">Preis / kWp</div>
                <div className="text-sm font-semibold text-cyan-400 mt-1">{CHF(pricePerKwp)}</div>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/30 uppercase">Anlagengrösse</div>
                <div className="text-sm font-semibold text-white mt-1">{kWp} kWp</div>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/30 uppercase">Marge (absolut)</div>
                <div className="text-sm font-semibold text-emerald-400 mt-1">{CHF(marginAmount)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
