import { useState } from 'react'
import {
  KeyRound, Plus, Pencil, Trash2, Eye, EyeOff, Copy, Check,
  ExternalLink, Search, X, Shield, Loader2,
} from 'lucide-react'
import {
  usePasswords, useSharedPasswords, useCreatePassword, useUpdatePassword, useDeletePassword,
  type PasswordEntry,
} from '@/hooks/usePasswords'

const CATEGORIES = ['Allgemein', 'E-Mail', 'Software', 'Website', 'Server', 'Cloud', 'Bexio', 'Sonstiges']

const categoryColors: Record<string, string> = {
  'Allgemein': '#94A3B8',
  'E-Mail': '#60A5FA',
  'Software': '#A78BFA',
  'Website': '#34D399',
  'Server': '#FB923C',
  'Cloud': '#22D3EE',
  'Bexio': '#F59E0B',
  'Sonstiges': '#F472B6',
}

interface FormData {
  title: string
  username: string
  password: string
  url: string
  notes: string
  category: string
}

const emptyForm: FormData = { title: '', username: '', password: '', url: '', notes: '', category: 'Allgemein' }

export default function PasswordsPage() {
  const { data: response, isLoading } = usePasswords()
  const { data: sharedResponse } = useSharedPasswords()
  const createPw = useCreatePassword()
  const updatePw = useUpdatePassword()
  const deletePw = useDeletePassword()

  const passwords = response?.data ?? []
  const sharedPasswords = sharedResponse?.data ?? []

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = passwords.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.title.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || p.url.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  // Nach Kategorie gruppieren
  const grouped = filtered.reduce<Record<string, PasswordEntry[]>>((acc, p) => {
    const cat = p.category || 'Allgemein'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const toggleVisible = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const startEdit = (p: PasswordEntry) => {
    setEditingId(p.id)
    setForm({ title: p.title, username: p.username, password: p.password, url: p.url, notes: p.notes, category: p.category })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.password.trim()) return
    if (editingId) {
      updatePw.mutate({ id: editingId, ...form }, { onSuccess: () => { setShowForm(false); setEditingId(null); setForm(emptyForm) } })
    } else {
      createPw.mutate(form, { onSuccess: () => { setShowForm(false); setForm(emptyForm) } })
    }
  }

  const handleDelete = (id: string) => {
    deletePw.mutate(id, { onSuccess: () => setConfirmDelete(null) })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #F59E0B 12%, transparent), color-mix(in srgb, #F59E0B 4%, transparent))', border: '1px solid color-mix(in srgb, #F59E0B 10%, transparent)' }}>
            <KeyRound size={20} className="text-amber" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">Meine Passwörter</h1>
            <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">{passwords.length} gespeicherte Zugänge</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen..." className="glass-input pl-9 pr-4 py-2 text-[13px] w-full sm:w-[200px]" />
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }} className="btn-primary flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[12px] font-semibold shrink-0">
            <Plus size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Hinzufügen</span>
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingId(null) } }}>
          <div className="w-full max-w-[480px] mx-4 glass-card p-6 space-y-4" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold">{editingId ? 'Passwort bearbeiten' : 'Neues Passwort'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Titel *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. Bexio Login" className="glass-input w-full px-3 py-2 text-[13px]" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Kategorie</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass-input w-full px-3 py-2 text-[13px] appearance-none cursor-pointer">
                  {CATEGORIES.map((c) => <option key={c} value={c} style={{ background: '#0B0F15' }}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Benutzername / E-Mail</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="user@firma.ch" className="glass-input w-full px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Passwort *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Passwort eingeben" className="glass-input w-full px-3 py-2 text-[13px]" autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">URL / Link</label>
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://app.bexio.com" className="glass-input w-full px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Notizen</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optionale Hinweise..." rows={2} className="glass-input w-full px-3 py-2 text-[13px] resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary px-4 py-2 text-[12px]">Abbrechen</button>
              <button onClick={handleSave} disabled={!form.title.trim() || !form.password.trim() || createPw.isPending || updatePw.isPending} className="btn-primary px-4 py-2 text-[12px] disabled:opacity-40">
                {createPw.isPending || updatePw.isPending ? 'Speichern...' : editingId ? 'Aktualisieren' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team-Passwörter (geteilte) */}
      {sharedPasswords.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={14} className="text-amber" />
            <h2 className="text-[13px] font-bold">Team-Passwörter</h2>
            <span className="text-[10px] text-text-dim">({sharedPasswords.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sharedPasswords.filter((p) => {
              if (!search) return true
              const q = search.toLowerCase()
              return p.title.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || p.url.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
            }).map((pw) => {
              const isVisible = visiblePasswords.has(pw.id)
              const isCopied = copiedId === pw.id
              return (
                <div key={pw.id} className="glass-card p-4 group" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, #F59E0B 8%, transparent)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold truncate">{pw.title}</p>
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', color: '#F59E0B' }}>Team</span>
                      </div>
                      {pw.username && <p className="text-[11px] text-text-sec truncate mt-0.5">{pw.username}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <code className="flex-1 text-[12px] font-mono truncate" style={{ color: isVisible ? '#F59E0B' : '#525E6F' }}>
                      {isVisible ? pw.password : '••••••••••'}
                    </code>
                    <button onClick={() => toggleVisible(pw.id)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text transition-colors shrink-0">
                      {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button onClick={() => handleCopy(pw.password, pw.id)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-amber transition-colors shrink-0">
                      {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  {pw.url && (
                    <a href={pw.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 truncate transition-colors">
                      <ExternalLink size={10} className="shrink-0" />
                      <span className="truncate">{pw.url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {pw.notes && <p className="text-[10px] text-text-dim mt-2 line-clamp-2">{pw.notes}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Meine Passwörter */}
      {sharedPasswords.length > 0 && passwords.length > 0 && (
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-text-dim" />
          <h2 className="text-[13px] font-bold">Meine Passwörter</h2>
          <span className="text-[10px] text-text-dim">({passwords.length})</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-text-dim" /></div>
      ) : passwords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'color-mix(in srgb, #F59E0B 10%, transparent)' }}>
            <Shield size={28} className="text-amber" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-semibold text-text-sec">Noch keine Passwörter gespeichert</p>
          <p className="text-[12px] text-text-dim mt-1">Klicke auf "Hinzufügen" um deinen ersten Zugang zu speichern</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[13px] text-text-dim">Keine Ergebnisse für "{search}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, entries]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: categoryColors[category] ?? '#94A3B8' }} />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim">{category}</h3>
                <span className="text-[10px] text-text-dim">({entries.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {entries.map((pw) => {
                  const isVisible = visiblePasswords.has(pw.id)
                  const isCopied = copiedId === pw.id
                  return (
                    <div key={pw.id} className="glass-card p-4 group" style={{ borderRadius: 'var(--radius-lg)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold truncate">{pw.title}</p>
                          {pw.username && <p className="text-[11px] text-text-sec truncate mt-0.5">{pw.username}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <button onClick={() => startEdit(pw)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"><Pencil size={12} /></button>
                          {confirmDelete === pw.id ? (
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => handleDelete(pw.id)} className="px-2 py-1 rounded text-[9px] font-bold text-red bg-red-soft">Ja</button>
                              <button onClick={() => setConfirmDelete(null)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text"><X size={10} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(pw.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-all"><Trash2 size={12} /></button>
                          )}
                        </div>
                      </div>

                      {/* Password */}
                      <div className="flex items-center gap-2 p-2 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <code className="flex-1 text-[12px] font-mono truncate" style={{ color: isVisible ? '#F59E0B' : '#525E6F' }}>
                          {isVisible ? pw.password : '••••••••••'}
                        </code>
                        <button onClick={() => toggleVisible(pw.id)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text transition-colors shrink-0">
                          {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => handleCopy(pw.password, pw.id)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-amber transition-colors shrink-0">
                          {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* URL */}
                      {pw.url && (
                        <a href={pw.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 truncate transition-colors">
                          <ExternalLink size={10} className="shrink-0" />
                          <span className="truncate">{pw.url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}

                      {/* Notes */}
                      {pw.notes && (
                        <p className="text-[10px] text-text-dim mt-2 line-clamp-2">{pw.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
