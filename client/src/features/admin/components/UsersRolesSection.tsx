import { useState } from 'react'
import { useUsers, useRoleDefaults, useCreateUser, useUpdateUser, useDeleteUser, type User, type UserRole } from '@/hooks/useLeads'
import { Shield, Plus, Pencil, Trash2, Check, X, UserPlus, ChevronDown } from 'lucide-react'

const ROLES: UserRole[] = ['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL']
const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  VERTRIEB: 'Vertrieb',
  PROJEKTLEITUNG: 'Projektleitung',
  BUCHHALTUNG: 'Buchhaltung',
  GL: 'Geschäftsleitung',
}
const roleColors: Record<UserRole, string> = {
  ADMIN: '#A78BFA',
  VERTRIEB: '#34D399',
  PROJEKTLEITUNG: '#60A5FA',
  BUCHHALTUNG: '#F59E0B',
  GL: '#F87171',
}

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'appointments', label: 'Termine' },
  { id: 'deals', label: 'Angebote' },
  { id: 'provision', label: 'Provision' },
  { id: 'calculations', label: 'Kalkulation' },
  { id: 'projects', label: 'Projekte' },
  { id: 'tasks', label: 'Aufgaben' },
  { id: 'admin', label: 'Administration' },
  { id: 'communication', label: 'Kommunikation' },
  { id: 'documents', label: 'Dokumente' },
  { id: 'export', label: 'Export' },
]

type FormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  allowedModules: string[]
}

const emptyForm: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'VERTRIEB',
  allowedModules: [],
}

export default function UsersRolesSection() {
  const { data: usersResponse } = useUsers()
  const { data: roleDefaultsResponse } = useRoleDefaults()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const users = usersResponse?.data ?? []
  const roleDefaults = roleDefaultsResponse?.data ?? {} as Record<UserRole, string[]>

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<FormData>({ ...emptyForm })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<FormData>({ ...emptyForm })
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  // When role changes in create form, apply defaults
  const handleCreateRoleChange = (role: UserRole) => {
    setCreateForm({
      ...createForm,
      role,
      allowedModules: roleDefaults[role] ? [...roleDefaults[role]] : [],
    })
  }

  // When role changes in edit form, apply defaults
  const handleEditRoleChange = (role: UserRole) => {
    setEditForm({
      ...editForm,
      role,
      allowedModules: roleDefaults[role] ? [...roleDefaults[role]] : [],
    })
  }

  const toggleModule = (form: FormData, setForm: (f: FormData) => void, moduleId: string) => {
    const modules = form.allowedModules.includes(moduleId)
      ? form.allowedModules.filter((m) => m !== moduleId)
      : [...form.allowedModules, moduleId]
    setForm({ ...form, allowedModules: modules })
  }

  const handleCreate = () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) return
    createUser.mutate({
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim(),
      role: createForm.role,
      allowedModules: createForm.allowedModules,
    }, {
      onSuccess: () => {
        setShowCreate(false)
        setCreateForm({ ...emptyForm })
      },
    })
  }

  const startEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      allowedModules: [...user.allowedModules],
    })
  }

  const handleSaveEdit = () => {
    if (!editingUser) return
    updateUser.mutate({
      id: editingUser.id,
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      role: editForm.role,
      allowedModules: editForm.allowedModules,
    }, {
      onSuccess: () => setEditingUser(null),
    })
  }

  const handleToggleActive = (user: User) => {
    updateUser.mutate({ id: user.id, isActive: !user.isActive })
  }

  const handleDelete = (user: User) => {
    deleteUser.mutate(user.id)
  }

  const renderModuleCheckboxes = (form: FormData, setForm: (f: FormData) => void) => (
    <div className="grid grid-cols-3 gap-1.5 mt-2">
      {ALL_MODULES.map((mod) => {
        const checked = form.allowedModules.includes(mod.id)
        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => toggleModule(form, setForm, mod.id)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: checked
                ? `color-mix(in srgb, ${roleColors[form.role]} 12%, transparent)`
                : 'rgba(255,255,255,0.02)',
              color: checked ? roleColors[form.role] : '#94A3B8',
              border: `1px solid ${checked ? `color-mix(in srgb, ${roleColors[form.role]} 25%, transparent)` : 'transparent'}`,
            }}
          >
            <div
              className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
              style={{
                background: checked ? roleColors[form.role] : 'rgba(255,255,255,0.06)',
              }}
            >
              {checked && <Check size={9} strokeWidth={3} className="text-white" />}
            </div>
            {mod.label}
          </button>
        )
      })}
    </div>
  )

  const renderUserForm = (form: FormData, setForm: (f: FormData) => void, onSave: () => void, onCancel: () => void, isPending: boolean) => (
    <div className="glass-card p-5 space-y-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Vorname</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
            placeholder="Vorname"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Nachname</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
            placeholder="Nachname"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">E-Mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
            placeholder="email@neosolar.ch"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Telefon</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
            placeholder="+41 71 555 00 00"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Rolle</label>
        <div className="relative">
          <select
            value={form.role}
            onChange={(e) => {
              const role = e.target.value as UserRole
              if (form === createForm) handleCreateRoleChange(role)
              else handleEditRoleChange(role)
            }}
            className="w-full appearance-none px-3 py-2 pr-8 text-[12px] rounded-lg bg-surface-hover border border-border text-text cursor-pointer focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} style={{ background: '#0B0F15' }}>{roleLabels[r]}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">Modul-Berechtigungen</label>
          <button
            type="button"
            onClick={() => {
              const defaults = roleDefaults[form.role] ?? []
              if (form === createForm) setCreateForm({ ...createForm, allowedModules: [...defaults] })
              else setEditForm({ ...editForm, allowedModules: [...defaults] })
            }}
            className="text-[10px] text-text-dim hover:text-amber transition-colors"
          >
            Rolle-Standard laden
          </button>
        </div>
        {renderModuleCheckboxes(form, setForm)}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || !form.firstName.trim() || !form.email.trim()}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[12px] disabled:opacity-40"
        >
          <Check size={13} strokeWidth={2} /> Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-4 py-2 text-[12px]"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header + Create Button */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-dim">{users.length} Benutzer</span>
        <button
          type="button"
          onClick={() => {
            setShowCreate(!showCreate)
            setCreateForm({
              ...emptyForm,
              allowedModules: roleDefaults.VERTRIEB ? [...roleDefaults.VERTRIEB] : [],
            })
          }}
          className="btn-primary flex items-center gap-1.5 px-3 py-2 text-[11px]"
        >
          <UserPlus size={13} strokeWidth={2} /> Benutzer erstellen
        </button>
      </div>

      {/* Create Form */}
      {showCreate && renderUserForm(
        createForm,
        setCreateForm,
        handleCreate,
        () => { setShowCreate(false); setCreateForm({ ...emptyForm }) },
        createUser.isPending,
      )}

      {/* Users List */}
      <div className="space-y-2">
        {users.map((user) => {
          const isEditing = editingUser?.id === user.id
          const isExpanded = expandedUser === user.id
          const color = roleColors[user.role] ?? '#94A3B8'

          if (isEditing) {
            return (
              <div key={user.id}>
                {renderUserForm(
                  editForm,
                  setEditForm,
                  handleSaveEdit,
                  () => setEditingUser(null),
                  updateUser.isPending,
                )}
              </div>
            )
          }

          return (
            <div key={user.id} className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
              {/* User Row */}
              <div
                className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-surface-hover transition-colors"
                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
                  style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                >
                  {user.firstName[0]}{user.lastName[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-text truncate">
                      {user.firstName} {user.lastName}
                    </span>
                    {!user.isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}>
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-text-dim truncate">{user.email}</span>
                    {user.phone && <span className="text-[11px] text-text-dim">{user.phone}</span>}
                  </div>
                </div>

                {/* Role Badge */}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0"
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                >
                  <Shield size={10} strokeWidth={2} />
                  {roleLabels[user.role] ?? user.role}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => startEdit(user)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-text transition-colors"
                    title="Bearbeiten"
                  >
                    <Pencil size={13} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(user)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                    style={{ color: user.isActive ? '#34D399' : '#F87171' }}
                    title={user.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {user.isActive ? <Check size={13} strokeWidth={2} /> : <X size={13} strokeWidth={2} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(user)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-red-400 transition-colors"
                    title="Deaktivieren"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>

                <ChevronDown
                  size={14}
                  className={`text-text-dim transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>

              {/* Expanded: Module Permissions (read-only view) */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-1 border-t border-border">
                  <p className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2">
                    Modul-Berechtigungen ({user.allowedModules.length}/{ALL_MODULES.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_MODULES.map((mod) => {
                      const has = user.allowedModules.includes(mod.id)
                      return (
                        <span
                          key={mod.id}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium"
                          style={{
                            background: has
                              ? `color-mix(in srgb, ${color} 12%, transparent)`
                              : 'rgba(255,255,255,0.02)',
                            color: has ? color : '#475569',
                            border: `1px solid ${has ? `color-mix(in srgb, ${color} 20%, transparent)` : 'transparent'}`,
                          }}
                        >
                          {has && <Check size={9} strokeWidth={3} className="inline mr-1" style={{ verticalAlign: 'middle' }} />}
                          {mod.label}
                        </span>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-text-dim mt-2">
                    Erstellt: {new Date(user.createdAt).toLocaleDateString('de-CH')}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Role Defaults Overview */}
      {Object.keys(roleDefaults).length > 0 && (
        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-[12px] font-bold mb-3 uppercase tracking-wider text-text-sec">Standard-Berechtigungen pro Rolle</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 py-2">Modul</th>
                  {ROLES.map((r) => (
                    <th key={r} className="text-center text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-2"
                      style={{ color: roleColors[r] }}>
                      {roleLabels[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod) => (
                  <tr key={mod.id} className="border-b border-border">
                    <td className="px-3 py-2 text-[11px] text-text-sec">{mod.label}</td>
                    {ROLES.map((r) => {
                      const has = roleDefaults[r]?.includes(mod.id) ?? false
                      return (
                        <td key={r} className="text-center px-3 py-2">
                          <div
                            className="w-5 h-5 rounded mx-auto flex items-center justify-center"
                            style={{
                              background: has
                                ? `color-mix(in srgb, ${roleColors[r]} 15%, transparent)`
                                : 'rgba(255,255,255,0.03)',
                            }}
                          >
                            {has && <Check size={12} strokeWidth={2.5} style={{ color: roleColors[r] }} />}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
