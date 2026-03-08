import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Copy, Check, ExternalLink, X, KeyRound, Globe,
} from 'lucide-react'
import {
  useSharedPasswords, useCreatePassword, useUpdatePassword, useDeletePassword,
  type PasswordEntry,
} from '@/hooks/usePasswords'

const CATEGORIES = ['Allgemein', 'E-Mail', 'Software', 'Website', 'Server', 'Cloud', 'Bexio', 'Sonstiges']
const ROLES = ['ADMIN', 'GL', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'SUBUNTERNEHMEN'] as const
const roleLabels: Record<string, string> = {
  ADMIN: 'Admin', GL: 'GL', VERTRIEB: 'Vertrieb', PROJEKTLEITUNG: 'Projektleitung', BUCHHALTUNG: 'Buchhaltung', SUBUNTERNEHMEN: 'Subunternehmen',
}

interface FormData {
  title: string
  username: string
  password: string
  url: string
  notes: string
  category: string
  allowedRoles: string[]
}

const emptyForm: FormData = { title: '', username: '', password: '', url: '', notes: '', category: 'Allgemein', allowedRoles: [] }

export default function SharedPasswordsSection() {
  const { data: response, isLoading } = useSharedPasswords()
  const createPw = useCreatePassword()
  const updatePw = useUpdatePassword()
  const deletePw = useDeletePassword()

  const passwords = response?.data ?? []

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

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

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role)
        ? prev.allowedRoles.filter((r) => r !== role)
        : [...prev.allowedRoles, role],
    }))
  }

  const startEdit = (p: PasswordEntry) => {
    setEditingId(p.id)
    setForm({ title: p.title, username: p.username, password: p.password, url: p.url, notes: p.notes, category: p.category, allowedRoles: p.allowedRoles ?? [] })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.password.trim()) return
    const payload = { ...form, isShared: true }
    if (editingId) {
      updatePw.mutate({ id: editingId, ...payload }, { onSuccess: () => { setShowForm(false); setEditingId(null); setForm(emptyForm) } })
    } else {
      createPw.mutate(payload, { onSuccess: () => { setShowForm(false); setForm(emptyForm) } })
    }
  }

  const handleDelete = (id: string) => {
    deletePw.mutate(id, { onSuccess: () => setConfirmDelete(null) })
  }

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-dim">{passwords.length} geteilte Zugänge</p>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold">
          <Plus size={12} strokeWidth={2} /> Passwort
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(6,8,12,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingId(null) } }}>
          <div className="w-full max-w-[520px] mx-4 glass-card p-6 space-y-4" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold flex items-center gap-2"><Globe size={16} className="text-amber" /> {editingId ? 'Geteiltes Passwort bearbeiten' : 'Neues geteiltes Passwort'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Titel *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. Bexio Admin" className="glass-input w-full px-3 py-2 text-[13px]" autoFocus />
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
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="admin@neosolar.ch" className="glass-input w-full px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Passwort *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Passwort" className="glass-input w-full px-3 py-2 text-[13px]" autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">URL / Link</label>
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://app.bexio.com" className="glass-input w-full px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Notizen</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Hinweise..." rows={2} className="glass-input w-full px-3 py-2 text-[13px] resize-none" />
            </div>

            {/* Rollen-Berechtigungen */}
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2">Sichtbar für Rollen</label>
              <p className="text-[10px] text-text-dim mb-2">Leer = alle Rollen sehen dieses Passwort</p>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((role) => {
                  const active = form.allowedRoles.includes(role)
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        active ? 'text-text' : 'text-text-dim hover:text-text-sec'
                      }`}
                      style={active ? { background: 'color-mix(in srgb, #F59E0B 12%, transparent)', border: '1px solid color-mix(in srgb, #F59E0B 20%, transparent)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {roleLabels[role]}
                    </button>
                  )
                })}
              </div>
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

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8"><p className="text-[12px] text-text-dim">Laden...</p></div>
      ) : passwords.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ borderRadius: 'var(--radius-lg)' }}>
          <KeyRound size={24} className="mx-auto text-text-dim mb-2" strokeWidth={1.5} />
          <p className="text-[12px] text-text-dim">Noch keine geteilten Passwörter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {passwords.map((pw) => {
            const isVisible = visiblePasswords.has(pw.id)
            const isCopied = copiedId === pw.id
            const roles = pw.allowedRoles ?? []
            return (
              <div key={pw.id} className="glass-card p-4 group" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #F59E0B 10%, transparent)' }}>
                      <KeyRound size={16} className="text-amber" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-bold truncate">{pw.title}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background: 'rgba(255,255,255,0.04)', color: '#8B95A5' }}>{pw.category}</span>
                      </div>
                      {pw.username && <p className="text-[11px] text-text-sec truncate">{pw.username}</p>}
                      {roles.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {roles.map((r) => (
                            <span key={r} className="text-[8px] px-1 py-0.5 rounded font-bold uppercase" style={{ background: 'color-mix(in srgb, #A78BFA 10%, transparent)', color: '#A78BFA' }}>{roleLabels[r] ?? r}</span>
                          ))}
                        </div>
                      )}
                      {roles.length === 0 && <p className="text-[9px] text-text-dim mt-0.5">Alle Rollen</p>}
                    </div>
                  </div>

                  {/* Password + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <code className="text-[11px] font-mono w-[100px] truncate" style={{ color: isVisible ? '#F59E0B' : '#525E6F' }}>
                        {isVisible ? pw.password : '••••••••'}
                      </code>
                      <button onClick={() => toggleVisible(pw.id)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text transition-colors">
                        {isVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                      <button onClick={() => handleCopy(pw.password, pw.id)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-amber transition-colors">
                        {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>

                    {pw.url && (
                      <a href={pw.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-blue-400 hover:bg-surface-hover transition-all">
                        <ExternalLink size={12} />
                      </a>
                    )}

                    <button onClick={() => startEdit(pw)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100">
                      <Pencil size={12} />
                    </button>
                    {confirmDelete === pw.id ? (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleDelete(pw.id)} className="px-2 py-1 rounded text-[9px] font-bold text-red bg-red-soft">Löschen</button>
                        <button onClick={() => setConfirmDelete(null)} className="w-6 h-6 rounded flex items-center justify-center text-text-dim"><X size={10} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(pw.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-red hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {pw.notes && <p className="text-[10px] text-text-dim mt-2 pl-12">{pw.notes}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
