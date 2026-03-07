import { useState } from 'react'
import {
  FolderOpen, FolderPlus, ChevronRight, ChevronDown, Plus, Pencil, Trash2,
  Check, X, Shield, Save,
} from 'lucide-react'
import {
  useDocTemplates, useAddDocFolder, useUpdateDocFolder, useDeleteDocFolder,
  type FolderDef,
} from '@/hooks/useAdmin'

const entityLabels: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Lead', color: '#34D399' },
  TERMIN: { label: 'Termin', color: '#60A5FA' },
  ANGEBOT: { label: 'Angebot', color: '#F59E0B' },
  PROJEKT: { label: 'Projekt', color: '#A78BFA' },
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  VERTRIEB: 'Vertrieb',
  PROJEKTLEITUNG: 'Projektleitung',
  BUCHHALTUNG: 'Buchhaltung',
  GL: 'Geschäftsleitung',
  SUBUNTERNEHMEN: 'Subunternehmen',
}

const roleColors: Record<string, string> = {
  ADMIN: '#A78BFA',
  VERTRIEB: '#34D399',
  PROJEKTLEITUNG: '#60A5FA',
  BUCHHALTUNG: '#F59E0B',
  GL: '#F87171',
  SUBUNTERNEHMEN: '#F472B6',
}

interface EditingFolder {
  entityType: string
  originalName: string
  name: string
  subfolders: string[]
  allowedRoles: string[]
}

export default function DocumentTemplatesSection() {
  const { data: tplResponse } = useDocTemplates()
  const addFolder = useAddDocFolder()
  const updateFolder = useUpdateDocFolder()
  const deleteFolder = useDeleteDocFolder()

  const templates = tplResponse?.data ?? []
  const allRoles = tplResponse?.roles ?? Object.keys(roleLabels)

  const [expandedEntity, setExpandedEntity] = useState<string | null>('LEAD')
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderRoles, setNewFolderRoles] = useState<string[]>([])
  const [newSubfolders, setNewSubfolders] = useState('')
  const [editing, setEditing] = useState<EditingFolder | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ entityType: string; name: string } | null>(null)

  const handleAddFolder = (entityType: string) => {
    if (!newFolderName.trim()) return
    addFolder.mutate({
      entityType,
      name: newFolderName.trim(),
      subfolders: newSubfolders.trim() ? newSubfolders.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      allowedRoles: newFolderRoles,
    }, {
      onSuccess: () => {
        setNewFolderName('')
        setNewSubfolders('')
        setNewFolderRoles([])
        setAddingTo(null)
      },
    })
  }

  const startEdit = (entityType: string, folder: FolderDef) => {
    setEditing({
      entityType,
      originalName: folder.name,
      name: folder.name,
      subfolders: folder.subfolders ?? [],
      allowedRoles: folder.allowedRoles ?? [],
    })
  }

  const handleSaveEdit = () => {
    if (!editing || !editing.name.trim()) return
    updateFolder.mutate({
      entityType: editing.entityType,
      folderName: editing.originalName,
      name: editing.name.trim(),
      subfolders: editing.subfolders,
      allowedRoles: editing.allowedRoles,
    }, {
      onSuccess: () => setEditing(null),
    })
  }

  const handleDelete = (entityType: string, folderName: string) => {
    deleteFolder.mutate({ entityType, folderName }, {
      onSuccess: () => setConfirmDelete(null),
    })
  }

  const toggleRole = (roles: string[], role: string) =>
    roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]

  // ── Role Badge Component ──
  function RoleBadges({ roles, allRoles: allR, onToggle }: { roles: string[]; allRoles: string[]; onToggle: (role: string) => void }) {
    return (
      <div className="flex flex-wrap gap-1">
        {allR.map((role) => {
          const active = roles.length === 0 || roles.includes(role)
          const color = roleColors[role] ?? '#94A3B8'
          return (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all"
              style={{
                background: active ? `color-mix(in srgb, ${color} 15%, transparent)` : 'rgba(255,255,255,0.02)',
                color: active ? color : '#525E6F',
                border: `1px solid ${active ? `color-mix(in srgb, ${color} 25%, transparent)` : 'transparent'}`,
              }}
            >
              <Shield size={8} strokeWidth={2} />
              {roleLabels[role] ?? role}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-text-dim mb-1">
        Ordnerstruktur pro Phase verwalten. Leere Berechtigungen = alle Rollen sehen den Ordner.
      </p>

      {templates.map((tpl) => {
        const entity = entityLabels[tpl.entityType] ?? { label: tpl.entityType, color: '#94A3B8' }
        const isExpanded = expandedEntity === tpl.entityType

        return (
          <div key={tpl.id} className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
            {/* Phase Header */}
            <button
              type="button"
              onClick={() => setExpandedEntity(isExpanded ? null : tpl.entityType)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} className="text-text-dim" /> : <ChevronRight size={14} className="text-text-dim" />}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${entity.color} 12%, transparent)` }}
              >
                <FolderOpen size={14} strokeWidth={1.8} style={{ color: entity.color }} />
              </div>
              <span className="text-[13px] font-bold">{entity.label}</span>
              <span className="text-[10px] text-text-dim ml-auto">{tpl.folders.length} Ordner</span>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-5 pb-4 border-t border-border pt-3">
                <div className="space-y-2">
                  {tpl.folders.map((folder) => {
                    const isEditing = editing?.entityType === tpl.entityType && editing?.originalName === folder.name
                    const isDeleting = confirmDelete?.entityType === tpl.entityType && confirmDelete?.name === folder.name
                    const visibleRoles = folder.allowedRoles?.length ? folder.allowedRoles : []

                    if (isEditing && editing) {
                      return (
                        <div key={folder.name} className="rounded-xl p-3 space-y-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex items-center gap-2">
                            <FolderOpen size={14} strokeWidth={1.8} style={{ color: entity.color }} />
                            <input
                              type="text"
                              value={editing.name}
                              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              className="flex-1 px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-semibold text-text-dim uppercase tracking-wider mb-1 block">Unterordner (Komma-getrennt)</label>
                            <input
                              type="text"
                              value={editing.subfolders.join(', ')}
                              onChange={(e) => setEditing({ ...editing, subfolders: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                              className="w-full px-2.5 py-1.5 text-[11px] rounded-lg bg-surface-hover border border-border text-text focus:outline-none focus:border-amber/50"
                              placeholder="z.B. Dach, Fassade, Umgebung"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-semibold text-text-dim uppercase tracking-wider mb-1.5 block">
                              Sichtbar fuer Rollen {editing.allowedRoles.length === 0 && <span className="text-emerald">(Alle)</span>}
                            </label>
                            <RoleBadges
                              roles={editing.allowedRoles}
                              allRoles={allRoles}
                              onToggle={(role) => setEditing({ ...editing, allowedRoles: toggleRole(editing.allowedRoles, role) })}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button type="button" onClick={handleSaveEdit} disabled={updateFolder.isPending}
                              className="btn-primary flex items-center gap-1 px-3 py-1.5 text-[11px] disabled:opacity-40">
                              <Save size={11} strokeWidth={2} /> Speichern
                            </button>
                            <button type="button" onClick={() => setEditing(null)}
                              className="btn-secondary px-3 py-1.5 text-[11px]">
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={folder.name} className="group rounded-xl px-3 py-2 hover:bg-surface-hover/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <FolderOpen size={13} strokeWidth={1.8} style={{ color: entity.color }} />
                          <span className="text-[12px] font-medium text-text flex-1">{folder.name}</span>

                          {/* Rollen-Badges (kompakt) */}
                          {visibleRoles.length > 0 ? (
                            <div className="flex gap-0.5">
                              {visibleRoles.map((r) => (
                                <span key={r} className="px-1.5 py-0 rounded-full text-[8px] font-semibold"
                                  style={{ background: `color-mix(in srgb, ${roleColors[r] ?? '#94A3B8'} 12%, transparent)`, color: roleColors[r] ?? '#94A3B8' }}>
                                  {roleLabels[r]?.slice(0, 3) ?? r.slice(0, 3)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[8px] text-text-dim px-1.5">Alle</span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button type="button" onClick={() => startEdit(tpl.entityType, folder)}
                              className="p-1 rounded hover:bg-surface-hover text-text-dim hover:text-amber transition-colors" title="Bearbeiten">
                              <Pencil size={11} strokeWidth={2} />
                            </button>
                            {isDeleting ? (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => handleDelete(tpl.entityType, folder.name)}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold text-red" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
                                  Ja
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(null)}
                                  className="px-1.5 py-0.5 rounded text-[9px] text-text-dim">
                                  Nein
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setConfirmDelete({ entityType: tpl.entityType, name: folder.name })}
                                className="p-1 rounded hover:bg-surface-hover text-text-dim hover:text-red transition-colors" title="Loeschen">
                                <Trash2 size={11} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subfolders */}
                        {folder.subfolders && folder.subfolders.length > 0 && (
                          <div className="ml-6 mt-1 space-y-0.5">
                            {folder.subfolders.map((sub) => (
                              <div key={sub} className="flex items-center gap-2 py-0.5">
                                <div className="w-3 border-l border-b border-border h-3 -mt-1.5" />
                                <span className="text-[11px] text-text-sec">{sub}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add Folder Form */}
                {addingTo === tpl.entityType ? (
                  <div className="mt-3 rounded-xl p-3 space-y-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2">
                      <FolderPlus size={14} strokeWidth={1.8} style={{ color: entity.color }} />
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-[12px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
                        placeholder="Neuer Ordnername..."
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFolder(tpl.entityType)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-text-dim uppercase tracking-wider mb-1 block">Unterordner (Komma-getrennt, optional)</label>
                      <input
                        type="text"
                        value={newSubfolders}
                        onChange={(e) => setNewSubfolders(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[11px] rounded-lg bg-surface-hover border border-border text-text placeholder:text-text-dim focus:outline-none focus:border-amber/50"
                        placeholder="z.B. Entwurf, Final, Korrektur"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-text-dim uppercase tracking-wider mb-1.5 block">
                        Sichtbar fuer Rollen {newFolderRoles.length === 0 && <span className="text-emerald">(Alle)</span>}
                      </label>
                      <RoleBadges
                        roles={newFolderRoles}
                        allRoles={allRoles}
                        onToggle={(role) => setNewFolderRoles(toggleRole(newFolderRoles, role))}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={() => handleAddFolder(tpl.entityType)} disabled={addFolder.isPending || !newFolderName.trim()}
                        className="btn-primary flex items-center gap-1 px-3 py-1.5 text-[11px] disabled:opacity-40">
                        <Check size={11} strokeWidth={2} /> Erstellen
                      </button>
                      <button type="button" onClick={() => { setAddingTo(null); setNewFolderName(''); setNewSubfolders(''); setNewFolderRoles([]) }}
                        className="btn-secondary px-3 py-1.5 text-[11px]">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTo(tpl.entityType)}
                    className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium text-text-dim hover:text-amber hover:bg-surface-hover transition-colors w-full"
                  >
                    <Plus size={12} strokeWidth={2} /> Ordner hinzufuegen
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
