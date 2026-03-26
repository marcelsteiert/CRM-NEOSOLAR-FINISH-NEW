import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type ProductCategory,
  categoryLabels,
  categoryColors,
} from '@/hooks/useAdmin'

const CATEGORIES: ProductCategory[] = ['PV_MODULE', 'INVERTER', 'BATTERY', 'INSTALLATION', 'PARTNER_PRICE']

function formatCHF(value: number) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

export default function ProductCatalogSection() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('PV_MODULE')
  const { data: productsResponse } = useProducts(activeCategory)
  const products = productsResponse?.data ?? []
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newManufacturer, setNewManufacturer] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newUnit, setNewUnit] = useState('Stück')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')

  const handleCreate = () => {
    if (!newName.trim() || !newPrice) return
    createProduct.mutate({
      category: activeCategory,
      name: newName.trim(),
      manufacturer: newManufacturer.trim() || '-',
      model: '-',
      unitPrice: Number(newPrice),
      unit: newUnit,
    })
    setNewName('')
    setNewManufacturer('')
    setNewPrice('')
    setAdding(false)
  }

  const handleSavePrice = (id: string) => {
    if (!editPrice) return
    updateProduct.mutate({ id, unitPrice: Number(editPrice) })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div
        className="flex items-center rounded-full p-0.5 overflow-x-auto"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={[
              'px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 whitespace-nowrap',
              activeCategory === cat ? 'text-text' : 'text-text-dim hover:text-text',
            ].join(' ')}
            style={activeCategory === cat ? { background: `color-mix(in srgb, ${categoryColors[cat]} 12%, transparent)`, color: categoryColors[cat] } : undefined}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="glass-card overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-border">
              {['Produkt', 'Hersteller', 'Preis (CHF)', 'Einheit', ''].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 sm:px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border hover:bg-surface-hover transition-colors group">
                <td className="px-3 sm:px-5 py-3">
                  <p className="text-[12px] font-semibold text-text">{p.name}</p>
                  {Object.entries(p.specs).length > 0 && (
                    <p className="text-[10px] text-text-dim mt-0.5">
                      {Object.entries(p.specs).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                </td>
                <td className="px-3 sm:px-5 py-3">
                  <span className="text-[12px] text-text-sec">{p.manufacturer}</span>
                </td>
                <td className="px-3 sm:px-5 py-3">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSavePrice(p.id)}
                        className="w-24 px-2 py-0.5 text-[12px] rounded bg-bg border border-border text-text focus:outline-none text-right"
                        autoFocus
                      />
                      <button type="button" onClick={() => handleSavePrice(p.id)} className="text-emerald-400"><Check size={12} strokeWidth={2} /></button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-text-dim"><X size={12} strokeWidth={2} /></button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingId(p.id); setEditPrice(String(p.unitPrice)) }}
                      className="text-[12px] font-semibold tabular-nums text-text hover:text-amber transition-colors"
                    >
                      {formatCHF(p.unitPrice)}
                    </button>
                  )}
                </td>
                <td className="px-3 sm:px-5 py-3">
                  <span className="text-[11px] text-text-dim">{p.unit}</span>
                </td>
                <td className="px-3 sm:px-5 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => deleteProduct.mutate(p.id)}
                      className="text-text-dim hover:text-red p-1"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product */}
      {adding ? (
        <div className="glass-card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-text-dim mb-1">Produktname</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. SunPower Maxeon 6"
                className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim mb-1">Hersteller</label>
              <input type="text" value={newManufacturer} onChange={(e) => setNewManufacturer(e.target.value)} placeholder="z.B. SunPower"
                className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim mb-1">Preis (CHF)</label>
              <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50 text-right" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim mb-1">Einheit</label>
              <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none cursor-pointer">
                <option value="Stück" style={{ background: '#0B0F15' }}>Stück</option>
                <option value="kWp" style={{ background: '#0B0F15' }}>kWp</option>
                <option value="kWh" style={{ background: '#0B0F15' }}>kWh</option>
                <option value="Pauschale" style={{ background: '#0B0F15' }}>Pauschale</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button type="button" onClick={handleCreate} disabled={!newName.trim() || !newPrice}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[11px] disabled:opacity-30">
              <Plus size={12} strokeWidth={2} /> Hinzufügen
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="btn-secondary px-4 py-2 text-[11px] font-semibold">Abbrechen</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-surface-hover transition-colors"
          style={{ color: categoryColors[activeCategory], border: `1px solid color-mix(in srgb, ${categoryColors[activeCategory]} 15%, transparent)` }}
        >
          <Plus size={14} strokeWidth={2} />
          Produkt hinzufügen
        </button>
      )}
    </div>
  )
}
