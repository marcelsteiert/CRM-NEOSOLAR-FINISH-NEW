import { useState, useEffect } from 'react'
import { useUsers, useRoleDefaults, useUpdateRoleDefaults, useCreateUser, useUpdateUser, useHardDeleteUser, type User, type UserRole } from '@/hooks/useLeads'
import { Shield, Pencil, Check, X, UserPlus, ChevronDown, RotateCcw, Save, UserX, UserCheck, Trash2 } from 'lucide-react'

const ROLES: UserRole[] = ['ADMIN', 'VERTRIEB', 'PROJEKTLEITUNG', 'BUCHHALTUNG', 'GL', 'SUBUNTERNEHMEN']
const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  VERTRIEB: 'Vertrieb',
  PROJEKTLEITUNG: 'Projektleitung',
  BUCHHALTUNG: 'Buchhaltung',
  GL: 'Geschäftsleitung',
  SUBUNTERNEHMEN: 'Subunternehmen',
}
const roleColors: Record<UserRole, string> = {
  ADMIN: '#A78BFA',
  VERTRIEB: '#34D399',
  PROJEKTLEITUNG: '#60A5FA',
  BUCHHALTUNG: '#F59E0B',
  GL: '#F87171',
  SUBUNTERNEHMEN: '#F472B6',
}

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'appointments', label: 'Termine' },
  { id: 'deals', label: 'Angebote' },
  { id: 'provision', label: 'Provision' },
  { id: 'calendar', label: 'Kalender' },
  { id: 'calculations', label: 'Kalkulation' },
  { id: 'projects', label: 'Projekte' },
  { id: 'tasks', label: 'Aufgaben' },
  { id: 'admin', label: 'Administration' },
  { id: 'communication', label: 'Kommunikation' },
  { id: 'documents', label: 'Dokumente' },
  { id: 'passwords', label: 'Passwörter' },
  { id: 'export', label: 'Export' },
]

const ALL_PERMISSIONS = [
  { id: 'canViewAllLeads', label: 'Alle Leads sehen' },
  { id: 'canViewAllAppointments', label: 'Alle Termine sehen' },
  { id: 'canViewAllDeals', label: 'Alle Angebote sehen' },
  { id: 'canViewAllProjects', label: 'Alle Projekte sehen' },
  { id: 'canViewAllTasks', label: 'Alle Aufgaben sehen' },
  { id: 'canDelete', label: 'Löschen' },
  { id: 'canExport', label: 'Export' },
  { id: 'canImport', label: 'Import' },
]

interface FormData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  role: UserRole
  allowedModules: string[]
}

const emptyForm: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  role: 'VERTRIEB',
  allowedModules: [],
}

export default function UsersRolesSection() {
  const { data: usersResponse } = useUsers()
  const { data: roleDefaultsResponse } = useRoleDefaults()
  const updateRoleDefaults = useUpdateRoleDefaults()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const hardDeleteUser = useHardDeleteUser()
  const users = usersResponse?.data ?? []
  const roleDefaults = roleDefaultsResponse?.data ?? {} as Record<UserRole, string[]>

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<FormData>({ ...emptyForm })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<FormData>({ ...emptyForm })
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmHardDelete, setConfirmHardDelete] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const activeUsers = users.filter((u) => u.isActive)
  const inactiveUsers = users.filter((u) => !u.isActive)

  // Editable role defaults matrix
  const [editableDefaults, setEditableDefaults] = useState<Record<string, string[]>>({})
  const [defaultsDirty, setDefaultsDirty] = useState(false)
  const [applyToUsers, setApplyToUsers] = useState(true)

  // Sync from server when loaded
  useEffect(() => {
    if (roleDefaultsResponse?.data) {
      setEditableDefaults(
        Object.fromEntries(
          Object.entries(roleDefaultsResponse.data).map(([k, v]) => [k, [...v]])
        )
      )
      setDefaultsDirty(false)
    }
  }, [roleDefaultsResponse?.data])

  const toggleDefaultModule = (role: UserRole, moduleId: string) => {
    setEditableDefaults((prev) => {
      const modules = prev[role] ?? []
      const next = modules.includes(moduleId)
        ? modules.filter((m) => m !== moduleId)
        : [...modules, moduleId]
      return { ...prev, [role]: next }
    })
    setDefaultsDirty(true)
  }

  const saveDefaults = () => {
    updateRoleDefaults.mutate({ defaults: editableDefaults, applyToUsers }, {
      onSuccess: () => setDefaultsDirty(false),
    })
  }

  const resetDefaults = () => {
    if (roleDefaultsResponse?.data) {
      setEditableDefaults(
        Object.fromEntries(
          Object.entries(roleDefaultsResponse.data).map(([k, v]) => [k, [...v]])
        )
      )
    }
    setDefaultsDirty(false)
  }

  const getDefaults = (role: UserRole) => editableDefaults[role] ? [...editableDefaults[role]] : roleDefaults[role] ? [...roleDefaults[role]] : []

  const handleCreate = () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) return
    createUser.mutate({
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim(),
      password: createForm.password.trim() || undefined,
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
      phone: user.phone ?? '',
      role: user.role,
      allowedModules: [...(user.allowedModules ?? [])],
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

  const handleDeactivate = (userId: string) => {
    updateUser.mutate({ id: userId, isActive: false }, {
      onSuccess: () => setConfirmDelete(null),
    })
  }

  const handleReactivate = (userId: string) => {
    updateUser.mutate({ id: userId, isActive: true })
  }

  // UserForm ist ausserhalb definiert (siehe unten) um Re-Mount bei State-Updates zu vermeiden

  // ── Main Render ──

  return (
    <div className="space-y-4">
      {/* Header + Create Button */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-dim">{activeUsers.length} aktive Benutzer{inactiveUsers.length > 0 ? ` · ${inactiveUsers.length} inaktiv` : ''}</span>
        <button
          type="button"
          onClick={() => {
            setShowCreate(!showCreate)
            setCreateForm({
              ...emptyForm,
              allowedModules: getDefaults('VERTRIEB'),
            })
          }}
          className="btn-primary flex items-center gap-1.5 px-3 py-2 text-[11px]"
        >
          <UserPlus size={13} strokeWidth={2} /> Benutzer erstellen
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <UserForm
          form={createForm}
          setForm={setCreateForm}
          onSave={handleCreate}
          onCancel={() => { setShowCreate(false); setCreateForm({ ...emptyForm }) }}
          isPending={createUser.isPending}
          getDefaults={getDefaults}
          showPassword
        />
      )}

      {/* Active Users List */}
      <div className="space-y-2">
        {activeUsers.map((user) => {
          const isEditing = editingUser?.id === user.id
          const isExpanded = expandedUser === user.id
          const color = roleColors[user.role] ?? '#94A3B8'
          const modules = user.allowedModules ?? []

          if (isEditing) {
            return (
              <div key={user.id}>
                <UserForm
                  form={editForm}
                  setForm={setEditForm}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingUser(null)}
                  isPending={updateUser.isPending}
                  getDefaults={getDefaults}
                />
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
                  {user.firstName?.[0]}{user.lastName?.[0]}
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

                {/* Modules Count */}
                <span className="text-[10px] text-text-dim shrink-0">
                  {modules.length}/{ALL_MODULES.length}
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
                  {confirmDelete === user.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeactivate(user.id)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-amber hover:bg-amber-soft transition-colors"
                      >
                        Deaktivieren
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="p-1 rounded-lg text-text-dim hover:text-text transition-colors"
                      >
                        <X size={11} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(user.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-amber transition-colors"
                      title="Deaktivieren"
                    >
                      <UserX size={13} strokeWidth={2} />
                    </button>
                  )}
                  {confirmHardDelete === user.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-red font-medium">Endgültig?</span>
                      <button
                        type="button"
                        onClick={() => {
                          hardDeleteUser.mutate(user.id, {
                            onSuccess: () => { setConfirmHardDelete(null); setConfirmDelete(null) },
                          })
                        }}
                        disabled={hardDeleteUser.isPending}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-red hover:bg-red-soft transition-colors disabled:opacity-40"
                      >
                        {hardDeleteUser.isPending ? 'Löscht...' : 'Ja, löschen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmHardDelete(null)}
                        className="p-1 rounded-lg text-text-dim hover:text-text transition-colors"
                      >
                        <X size={11} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmHardDelete(user.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-red transition-colors"
                      title="Endgültig löschen"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>

                <ChevronDown
                  size={14}
                  className={`text-text-dim transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>

              {/* Expanded: Berechtigungs-Matrix pro User */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
                      Individuelle Berechtigungen ({modules.filter((m) => ALL_MODULES.some((am) => am.id === m)).length}/{ALL_MODULES.length} Module)
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const defaults = getDefaults(user.role)
                        updateUser.mutate({ id: user.id, allowedModules: defaults })
                      }}
                      className="flex items-center gap-1 text-[10px] text-text-dim hover:text-amber transition-colors"
                    >
                      <RotateCcw size={10} strokeWidth={2} />
                      Standard laden
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 py-1.5 w-[160px]">Modul</th>
                          <th className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 py-1.5 w-[80px]">Zugriff</th>
                          <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 py-1.5">
                            Standard ({roleLabels[user.role]})
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ALL_MODULES.map((mod) => {
                          const has = modules.includes(mod.id)
                          const isDefault = getDefaults(user.role).includes(mod.id)
                          const isDifferent = has !== isDefault
                          return (
                            <tr key={mod.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                              <td className="px-3 py-1.5 text-[11px] text-text-sec">{mod.label}</td>
                              <td className="text-center px-3 py-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const next = has
                                      ? modules.filter((m) => m !== mod.id)
                                      : [...modules, mod.id]
                                    updateUser.mutate({ id: user.id, allowedModules: next })
                                  }}
                                  className="w-6 h-6 rounded-md mx-auto flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                                  style={{
                                    background: has
                                      ? `color-mix(in srgb, ${color} 18%, transparent)`
                                      : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${has ? `color-mix(in srgb, ${color} 25%, transparent)` : 'rgba(255,255,255,0.06)'}`,
                                  }}
                                >
                                  {has && <Check size={13} strokeWidth={2.5} style={{ color }} />}
                                </button>
                              </td>
                              <td className="px-3 py-1.5">
                                {isDifferent && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                                    style={{
                                      background: has ? 'color-mix(in srgb, #34D399 12%, transparent)' : 'color-mix(in srgb, #F87171 12%, transparent)',
                                      color: has ? '#34D399' : '#F87171',
                                    }}>
                                    {has ? 'Zusätzlich' : 'Entfernt'}
                                  </span>
                                )}
                                {!isDifferent && isDefault && (
                                  <span className="text-[9px] text-text-dim">Standard</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                        {/* Spezial-Berechtigungen Separator */}
                        <tr>
                          <td colSpan={3} className="pt-2 pb-1 px-3">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Spezial-Berechtigungen</span>
                          </td>
                        </tr>
                        {ALL_PERMISSIONS.map((perm) => {
                          const has = modules.includes(perm.id)
                          const isDefault = getDefaults(user.role).includes(perm.id)
                          const isDifferent = has !== isDefault
                          return (
                            <tr key={perm.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                              <td className="px-3 py-1.5 text-[11px] text-red font-medium">{perm.label}</td>
                              <td className="text-center px-3 py-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const next = has
                                      ? modules.filter((m) => m !== perm.id)
                                      : [...modules, perm.id]
                                    updateUser.mutate({ id: user.id, allowedModules: next })
                                  }}
                                  className="w-6 h-6 rounded-md mx-auto flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                                  style={{
                                    background: has
                                      ? 'color-mix(in srgb, #F87171 18%, transparent)'
                                      : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${has ? 'color-mix(in srgb, #F87171 25%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                                  }}
                                >
                                  {has && <Check size={13} strokeWidth={2.5} style={{ color: '#F87171' }} />}
                                </button>
                              </td>
                              <td className="px-3 py-1.5">
                                {isDifferent && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                                    style={{
                                      background: has ? 'color-mix(in srgb, #34D399 12%, transparent)' : 'color-mix(in srgb, #F87171 12%, transparent)',
                                      color: has ? '#34D399' : '#F87171',
                                    }}>
                                    {has ? 'Zusätzlich' : 'Entfernt'}
                                  </span>
                                )}
                                {!isDifferent && isDefault && (
                                  <span className="text-[9px] text-text-dim">Standard</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-text-dim mt-3">
                    Erstellt: {new Date(user.createdAt).toLocaleDateString('de-CH')}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Inactive Users */}
      {inactiveUsers.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-2 text-[11px] text-text-dim hover:text-text transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showInactive ? 'rotate-180' : ''}`} />
            <UserX size={12} strokeWidth={2} />
            {inactiveUsers.length} inaktive Benutzer
          </button>

          {showInactive && inactiveUsers.map((user) => {
            const color = roleColors[user.role] ?? '#94A3B8'
            return (
              <div key={user.id} className="glass-card overflow-hidden opacity-60" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-center gap-4 px-5 py-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
                    style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color: '#525E6F' }}
                  >
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-text-dim truncate">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}>
                        Inaktiv
                      </span>
                    </div>
                    <span className="text-[11px] text-text-dim">{user.email}</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 opacity-50"
                    style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                  >
                    <Shield size={10} strokeWidth={2} />
                    {roleLabels[user.role] ?? user.role}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReactivate(user.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald hover:bg-surface-hover transition-colors"
                      title="Reaktivieren"
                    >
                      <UserCheck size={12} strokeWidth={2} />
                      Reaktivieren
                    </button>
                    {confirmHardDelete === user.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-red font-medium">Endgültig?</span>
                        <button
                          type="button"
                          onClick={() => {
                            hardDeleteUser.mutate(user.id, {
                              onSuccess: () => setConfirmHardDelete(null),
                            })
                          }}
                          disabled={hardDeleteUser.isPending}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-red hover:bg-red-soft transition-colors disabled:opacity-40"
                        >
                          {hardDeleteUser.isPending ? 'Löscht...' : 'Ja, löschen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmHardDelete(null)}
                          className="p-1 rounded-lg text-text-dim hover:text-text transition-colors"
                        >
                          <X size={11} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmHardDelete(user.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-red hover:bg-surface-hover transition-colors"
                        title="Endgültig löschen"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Editable Role Defaults Matrix */}
      {Object.keys(editableDefaults).length > 0 && (
        <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-sec">Standard-Berechtigungen pro Rolle</h3>
            <div className="flex items-center gap-2">
              {defaultsDirty && (
                <>
                  <button
                    type="button"
                    onClick={resetDefaults}
                    className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
                  >
                    <RotateCcw size={11} strokeWidth={2} />
                    Zurücksetzen
                  </button>
                  <button
                    type="button"
                    onClick={saveDefaults}
                    disabled={updateRoleDefaults.isPending}
                    className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px] disabled:opacity-40"
                  >
                    <Save size={11} strokeWidth={2} />
                    {updateRoleDefaults.isPending ? 'Speichern...' : 'Speichern'}
                  </button>
                </>
              )}
              {!defaultsDirty && updateRoleDefaults.isSuccess && (
                <span className="flex items-center gap-1 text-[10px] text-green font-medium">
                  <Check size={11} strokeWidth={2} /> Gespeichert
                </span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-text-dim mb-3">
            Klicke auf die Felder um die Standard-Module pro Rolle zu ändern. Neue Benutzer erhalten diese Berechtigungen automatisch.
          </p>

          {/* Apply to existing users checkbox */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer group">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                applyToUsers
                  ? 'bg-accent border-accent'
                  : 'border-border bg-transparent group-hover:border-text-dim'
              }`}
              onClick={() => setApplyToUsers(!applyToUsers)}
            >
              {applyToUsers && <Check size={10} strokeWidth={3} className="text-black" />}
            </div>
            <input
              type="checkbox"
              checked={applyToUsers}
              onChange={(e) => setApplyToUsers(e.target.checked)}
              className="sr-only"
            />
            <span className="text-[11px] text-text-sec">
              Änderungen auch auf bestehende Benutzer anwenden
            </span>
            <span className="text-[10px] text-text-dim">
              ({activeUsers.length} aktive Benutzer)
            </span>
          </label>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim px-3 py-2">Modul</th>
                  {ROLES.map((r) => {
                    const count = activeUsers.filter((u) => u.role === r).length
                    return (
                      <th key={r} className="text-center text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-2"
                        style={{ color: roleColors[r] }}>
                        <div>{roleLabels[r]}</div>
                        {applyToUsers && count > 0 && (
                          <div className="text-[9px] font-normal normal-case tracking-normal text-text-dim mt-0.5">
                            {count} Benutzer
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod) => (
                  <tr key={mod.id} className="border-b border-border hover:bg-surface-hover/50 transition-colors">
                    <td className="px-3 py-2 text-[11px] text-text-sec">{mod.label}</td>
                    {ROLES.map((r) => {
                      const has = editableDefaults[r]?.includes(mod.id) ?? false
                      return (
                        <td key={r} className="text-center px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleDefaultModule(r, mod.id)}
                            className="w-6 h-6 rounded-md mx-auto flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                            style={{
                              background: has
                                ? `color-mix(in srgb, ${roleColors[r]} 18%, transparent)`
                                : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${has ? `color-mix(in srgb, ${roleColors[r]} 25%, transparent)` : 'rgba(255,255,255,0.06)'}`,
                            }}
                          >
                            {has && <Check size={13} strokeWidth={2.5} style={{ color: roleColors[r] }} />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {/* Separator */}
                <tr><td colSpan={ROLES.length + 1} className="pt-2 pb-1 px-3"><span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Spezial-Berechtigungen</span></td></tr>
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm.id} className="border-b border-border hover:bg-surface-hover/50 transition-colors">
                    <td className="px-3 py-2 text-[11px] text-red font-medium">{perm.label}</td>
                    {ROLES.map((r) => {
                      const has = editableDefaults[r]?.includes(perm.id) ?? false
                      return (
                        <td key={r} className="text-center px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleDefaultModule(r, perm.id)}
                            className="w-6 h-6 rounded-md mx-auto flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                            style={{
                              background: has
                                ? 'color-mix(in srgb, #F87171 18%, transparent)'
                                : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${has ? 'color-mix(in srgb, #F87171 25%, transparent)' : 'rgba(255,255,255,0.06)'}`,
                            }}
                          >
                            {has && <Check size={13} strokeWidth={2.5} style={{ color: '#F87171' }} />}
                          </button>
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

// ── UserForm als eigene Komponente (verhindert Re-Mount/Fokus-Verlust) ──

function UserForm({ form, setForm, onSave, onCancel, isPending, getDefaults, showPassword }: {
  form: FormData
  setForm: (f: FormData) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  getDefaults: (role: UserRole) => string[]
  showPassword?: boolean
}) {
  const color = roleColors[form.role]

  const handleRoleChange = (role: UserRole) => {
    setForm({ ...form, role, allowedModules: getDefaults(role) })
  }

  const toggleModule = (moduleId: string) => {
    const modules = form.allowedModules.includes(moduleId)
      ? form.allowedModules.filter((m) => m !== moduleId)
      : [...form.allowedModules, moduleId]
    setForm({ ...form, allowedModules: modules })
  }

  const loadDefaults = () => {
    setForm({ ...form, allowedModules: getDefaults(form.role) })
  }

  return (
    <div className="glass-card p-5 space-y-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        {showPassword ? (
          <div>
            <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Passwort</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
              placeholder="Mind. 6 Zeichen"
              autoComplete="new-password"
            />
          </div>
        ) : (
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
        )}
      </div>
      {showPassword && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      )}

      {/* Rolle */}
      <div>
        <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Rolle</label>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map((r) => {
            const active = form.role === r
            const rc = roleColors[r]
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: active ? `color-mix(in srgb, ${rc} 18%, transparent)` : 'rgba(255,255,255,0.03)',
                  color: active ? rc : '#525E6F',
                  border: `1px solid ${active ? `color-mix(in srgb, ${rc} 30%, transparent)` : 'transparent'}`,
                  boxShadow: active ? `0 0 12px color-mix(in srgb, ${rc} 10%, transparent)` : 'none',
                }}
              >
                <Shield size={11} strokeWidth={2} />
                {roleLabels[r]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Module */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
            Modul-Berechtigungen ({form.allowedModules.length}/{ALL_MODULES.length})
          </label>
          <button
            type="button"
            onClick={loadDefaults}
            className="flex items-center gap-1 text-[10px] text-text-dim hover:text-amber transition-colors"
          >
            <RotateCcw size={10} strokeWidth={2} />
            Standard laden
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {ALL_MODULES.map((mod) => {
            const checked = form.allowedModules.includes(mod.id)
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => toggleModule(mod.id)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: checked
                    ? `color-mix(in srgb, ${color} 12%, transparent)`
                    : 'rgba(255,255,255,0.02)',
                  color: checked ? color : '#94A3B8',
                  border: `1px solid ${checked ? `color-mix(in srgb, ${color} 25%, transparent)` : 'transparent'}`,
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
                  style={{ background: checked ? color : 'rgba(255,255,255,0.06)' }}
                >
                  {checked && <Check size={9} strokeWidth={3} className="text-white" />}
                </div>
                {mod.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Spezial-Berechtigungen */}
      <div>
        <label className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2 block">
          Spezial-Berechtigungen
        </label>
        <div className="flex gap-2 flex-wrap">
          {ALL_PERMISSIONS.map((perm) => {
            const checked = form.allowedModules.includes(perm.id)
            return (
              <button
                key={perm.id}
                type="button"
                onClick={() => toggleModule(perm.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: checked
                    ? 'color-mix(in srgb, #F87171 12%, transparent)'
                    : 'rgba(255,255,255,0.02)',
                  color: checked ? '#F87171' : '#94A3B8',
                  border: `1px solid ${checked ? 'color-mix(in srgb, #F87171 25%, transparent)' : 'transparent'}`,
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
                  style={{ background: checked ? '#F87171' : 'rgba(255,255,255,0.06)' }}
                >
                  {checked && <Check size={9} strokeWidth={3} className="text-white" />}
                </div>
                {perm.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
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
}
