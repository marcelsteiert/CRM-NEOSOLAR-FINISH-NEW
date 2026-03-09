import { useState, useMemo, useCallback } from 'react'
import {
  ClipboardList, Plus, Search, ChevronDown, AlertTriangle, RefreshCw,
  LayoutList, Columns3, Calendar, Clock, Flag, User, ArrowRight,
  CheckCircle2, Circle, Loader2, Trash2, X, GripVertical,
} from 'lucide-react'
import {
  useTasks, useTaskStats, useCreateTask, useUpdateTask, useDeleteTask,
  taskStatusLabels, taskStatusColors, taskPriorityLabels, taskPriorityColors,
  taskModuleLabels, taskModuleColors,
  type Task, type TaskStatus, type TaskPriority, type TaskModule, type TaskFilters,
} from '@/hooks/useTasks'
import { useUsers, type User as UserType } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'

/* ── Types ── */

type ViewMode = 'kanban' | 'list'
type StatusFilter = TaskStatus | 'ALL'

const statusOrder: TaskStatus[] = ['OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT']

const priorityOrder: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

const priorityIcons: Record<TaskPriority, string> = {
  URGENT: '🔴',
  HIGH: '🟠',
  MEDIUM: '🔵',
  LOW: '⚪',
}

/* ── Helper ── */

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(task: Task) {
  return task.status !== 'ERLEDIGT' && task.dueDate && new Date(task.dueDate) < new Date()
}

function getUserName(userId: string, users: UserType[]) {
  const u = users.find((x) => x.id === userId)
  return u ? `${u.firstName} ${u.lastName}` : '—'
}

function getUserInitials(userId: string, users: UserType[]) {
  const u = users.find((x) => x.id === userId)
  return u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}` : '?'
}

/* ── Main Component ── */

export default function TasksPage() {
  const { user, isAdmin } = useAuth()

  /* State */
  const [view, setView] = useState<ViewMode>('kanban')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [moduleFilter, setModuleFilter] = useState<TaskModule | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  /* Data */
  const filters: TaskFilters = {
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    module: moduleFilter !== 'ALL' ? moduleFilter : undefined,
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    assignedTo: assigneeFilter !== 'ALL' ? assigneeFilter : undefined,
    search: searchQuery.trim() || undefined,
    sortBy: 'dueDate',
    sortOrder: 'asc',
  }

  const { data: tasksRes, isLoading, isError, error, refetch } = useTasks(filters)
  const { data: statsRes } = useTaskStats()
  const { data: usersRes } = useUsers()

  const tasks = tasksRes?.data ?? []
  const stats = statsRes?.data
  const users = usersRes?.data ?? []

  const updateTask = useUpdateTask()

  /* Kanban grouped */
  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { OFFEN: [], IN_BEARBEITUNG: [], ERLEDIGT: [] }
    for (const t of tasks) {
      if (map[t.status]) map[t.status].push(t)
    }
    return map
  }, [tasks])

  /* Drag handler */
  const handleDrop = useCallback((e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId)
      if (task && task.status !== targetStatus) {
        updateTask.mutate({ id: taskId, status: targetStatus })
      }
    }
  }, [tasks, updateTask])

  /* Status tabs */
  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Alle', count: stats?.total },
    { key: 'OFFEN', label: 'Offen', count: stats?.open },
    { key: 'IN_BEARBEITUNG', label: 'In Bearbeitung', count: stats?.inProgress },
    { key: 'ERLEDIGT', label: 'Erledigt', count: stats?.completed },
  ]

  return (
    <>
      <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, #34D399 12%, transparent), color-mix(in srgb, #34D399 4%, transparent))',
                border: '1px solid color-mix(in srgb, #34D399 10%, transparent)',
              }}
            >
              <ClipboardList size={20} className="text-emerald-400" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">Aufgaben</h1>
                <span
                  className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                  style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399' }}
                >
                  {isLoading ? '—' : stats?.total ?? tasks.length}
                </span>
                {stats && stats.overdue > 0 && (
                  <span
                    className="inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-bold tabular-nums"
                    style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}
                  >
                    {stats.overdue} überfällig
                  </span>
                )}
              </div>
              <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">
                Aufgaben verwalten und nachverfolgen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* View Toggle */}
            <div className="flex rounded-[10px] p-0.5 shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {([
                { id: 'kanban' as ViewMode, label: 'Kanban', icon: Columns3 },
                { id: 'list' as ViewMode, label: 'Liste', icon: LayoutList },
              ]).map((v) => {
                const Icon = v.icon
                const active = view === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all duration-150 ${
                      active ? 'text-text' : 'text-text-dim hover:text-text-sec'
                    }`}
                    style={active ? { background: 'rgba(255,255,255,0.08)' } : undefined}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                )
              })}
            </div>

            {/* New Task */}
            <button
              type="button"
              className="btn-primary flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[13px] ml-auto sm:ml-0"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Neue Aufgabe</span>
              <span className="sm:hidden">Neu</span>
            </button>
          </div>
        </div>

        {/* ── KPI Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            {[
              { label: 'Offen', value: stats.open, color: taskStatusColors.OFFEN, icon: Circle },
              { label: 'In Bearbeitung', value: stats.inProgress, color: taskStatusColors.IN_BEARBEITUNG, icon: Clock },
              { label: 'Erledigt', value: stats.completed, color: taskStatusColors.ERLEDIGT, icon: CheckCircle2 },
              { label: 'Überfällig', value: stats.overdue, color: '#F87171', icon: AlertTriangle },
            ].map((kpi) => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className="glass-card px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: `color-mix(in srgb, ${kpi.color} 12%, transparent)` }}>
                      <Icon size={14} style={{ color: kpi.color }} strokeWidth={1.8} />
                    </div>
                    <span className="text-[10px] text-text-dim uppercase tracking-[0.06em] font-bold">{kpi.label}</span>
                  </div>
                  <p className="text-[20px] font-bold tracking-[-0.02em] tabular-nums">{kpi.value}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shrink-0">
          {/* Status Tabs */}
          <div
            className="flex items-center rounded-full p-0.5 overflow-x-auto max-w-full"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={[
                  'px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 whitespace-nowrap',
                  statusFilter === tab.key ? 'bg-amber-soft text-amber' : 'text-text-dim hover:text-text',
                ].join(' ')}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-[10px] opacity-70">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Module Filter */}
            <div className="relative">
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value as TaskModule | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: '130px' }}
              >
                <option value="ALL" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Alle Module</option>
                {(['LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT', 'ALLGEMEIN'] as TaskModule[]).map((m) => (
                  <option key={m} value={m} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{taskModuleLabels[m]}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'ALL')}
                className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                style={{ minWidth: '120px' }}
              >
                <option value="ALL" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Alle Prioritäten</option>
                {priorityOrder.map((p) => (
                  <option key={p} value={p} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{taskPriorityLabels[p]}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
            </div>

            {/* Assignee Filter (Admin only) */}
            {isAdmin && (
              <div className="relative">
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="glass-input appearance-none pl-4 pr-9 py-2 text-[12px] font-medium cursor-pointer"
                  style={{ minWidth: '140px' }}
                >
                  <option value="ALL" style={{ background: '#0B0F15', color: '#F0F2F5' }}>Alle Benutzer</option>
                  {users.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" strokeWidth={2} />
              <input
                type="text"
                placeholder="Aufgaben suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 text-[12px] w-full sm:w-[200px]"
              />
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-text-dim" />
            </div>
          ) : isError ? (
            <div className="glass-card p-12 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}>
                <AlertTriangle size={20} className="text-red-400" strokeWidth={1.8} />
              </div>
              <p className="text-[14px] font-semibold text-text mb-1">Fehler beim Laden</p>
              <p className="text-[12px] text-text-sec mb-5">{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
              <button type="button" onClick={() => refetch()} className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px]">
                <RefreshCw size={14} strokeWidth={2} />
                Erneut versuchen
              </button>
            </div>
          ) : view === 'kanban' ? (
            <KanbanView
              tasksByStatus={tasksByStatus}
              users={users}
              onSelect={setEditTask}
              onDrop={handleDrop}
              onUpdateStatus={(taskId, status) => updateTask.mutate({ id: taskId, status })}
            />
          ) : (
            <ListView
              tasks={tasks}
              users={users}
              onSelect={setEditTask}
              onUpdateStatus={(taskId, status) => updateTask.mutate({ id: taskId, status })}
            />
          )}
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      {(createOpen || editTask) && (
        <TaskFormModal
          task={editTask}
          users={users}
          currentUserId={user?.id ?? ''}
          onClose={() => { setCreateOpen(false); setEditTask(null) }}
        />
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   Kanban View
   ══════════════════════════════════════════════════════════════════════════════ */

function KanbanView({
  tasksByStatus,
  users,
  onSelect,
  onDrop,
  onUpdateStatus,
}: {
  tasksByStatus: Record<TaskStatus, Task[]>
  users: UserType[]
  onSelect: (task: Task) => void
  onDrop: (e: React.DragEvent, status: TaskStatus) => void
  onUpdateStatus: (taskId: string, status: TaskStatus) => void
}) {
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full overflow-hidden overflow-x-auto">
      {statusOrder.map((status) => {
        const color = taskStatusColors[status]
        const items = tasksByStatus[status]
        const isOver = dragOverStatus === status

        return (
          <div
            key={status}
            className="flex flex-col gap-3 h-full overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStatus(status) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null) }}
            onDrop={(e) => { onDrop(e, status); setDragOverStatus(null); setDraggingId(null) }}
          >
            {/* Column Header */}
            <div
              className="glass-card px-4 py-3 shrink-0 transition-all duration-200"
              style={isOver ? { borderColor: color, boxShadow: `0 0 12px ${color}30` } : undefined}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-[13px] font-bold">{taskStatusLabels[status]}</span>
                <span className="ml-auto text-[11px] text-text-dim font-mono">{items.length}</span>
              </div>
            </div>

            {/* Cards */}
            <div
              className={`flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin rounded-xl transition-all duration-200 ${isOver ? 'ring-1 ring-opacity-40' : ''}`}
              style={isOver ? { background: `color-mix(in srgb, ${color} 4%, transparent)`, ringColor: color } : undefined}
            >
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  users={users}
                  onClick={() => onSelect(task)}
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; setDraggingId(task.id) }}
                  onDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                  isDragging={draggingId === task.id}
                />
              ))}
              {items.length === 0 && (
                <div className={`text-center py-8 text-[12px] ${isOver ? 'text-text-sec' : 'text-text-dim'}`}>
                  {isOver ? 'Hier ablegen' : 'Keine Aufgaben'}
                </div>
              )}
              {isOver && items.length > 0 && (
                <div className="h-12 rounded-xl border-2 border-dashed flex items-center justify-center text-[11px] font-semibold transition-all duration-200"
                  style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, color }}
                >
                  Hier ablegen
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Task Card (Kanban) ── */

function TaskCard({
  task,
  users,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: Task
  users: UserType[]
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const overdue = isOverdue(task)
  const prioColor = taskPriorityColors[task.priority]
  const moduleColor = taskModuleColors[task.module]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`glass-card p-4 cursor-grab active:cursor-grabbing hover:border-[rgba(255,255,255,0.12)] transition-all duration-150 group ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      {/* Top: Priority + Module */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
            style={{ background: `color-mix(in srgb, ${prioColor} 15%, transparent)`, color: prioColor }}
          >
            {taskPriorityLabels[task.priority]}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
            style={{ background: `color-mix(in srgb, ${moduleColor} 12%, transparent)`, color: moduleColor }}
          >
            {taskModuleLabels[task.module]}
          </span>
        </div>
        <GripVertical size={14} className="text-text-dim/40 shrink-0 group-hover:text-text-dim transition-colors" />
      </div>

      {/* Title */}
      <p className="text-[13px] font-semibold mb-1 group-hover:text-white transition-colors leading-tight">
        {task.title}
      </p>

      {/* Reference */}
      {task.referenceTitle && (
        <p className="text-[11px] text-text-dim mb-2 truncate">
          <ArrowRight size={10} className="inline mr-1" />
          {task.referenceTitle}
        </p>
      )}

      {/* Bottom: Due date + Assignee */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: overdue ? '#F87171' : 'var(--color-text-dim)' }}>
          <Calendar size={11} strokeWidth={2} />
          <span className={overdue ? 'font-semibold' : ''}>{formatDate(task.dueDate)}</span>
        </div>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{ background: 'color-mix(in srgb, #F59E0B 15%, transparent)', color: '#F59E0B' }}
          title={getUserName(task.assignedTo, users)}
        >
          {getUserInitials(task.assignedTo, users)}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   List View
   ══════════════════════════════════════════════════════════════════════════════ */

function ListView({
  tasks,
  users,
  onSelect,
  onUpdateStatus,
}: {
  tasks: Task[]
  users: UserType[]
  onSelect: (task: Task) => void
  onUpdateStatus: (taskId: string, status: TaskStatus) => void
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-text-dim">
                {['Status', 'Priorität', 'Titel', 'Modul', 'Referenz', 'Fällig', 'Zugewiesen'].map((h) => (
                  <th key={h} className="text-left font-bold px-5 py-3 uppercase tracking-[0.06em] text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-dim text-[13px]">
                    Keine Aufgaben gefunden
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const overdue = isOverdue(task)
                  const prioColor = taskPriorityColors[task.priority]
                  const moduleColor = taskModuleColors[task.module]
                  const statusColor = taskStatusColors[task.status]

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelect(task)}
                      className="border-b border-border/50 hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                      {/* Status */}
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const nextIdx = (statusOrder.indexOf(task.status) + 1) % statusOrder.length
                            onUpdateStatus(task.id, statusOrder[nextIdx])
                          }}
                          className="flex items-center gap-1.5"
                          title="Status wechseln"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                          <span className="text-[11px] font-semibold" style={{ color: statusColor }}>
                            {taskStatusLabels[task.status]}
                          </span>
                        </button>
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: `color-mix(in srgb, ${prioColor} 12%, transparent)`, color: prioColor }}
                        >
                          {taskPriorityLabels[task.priority]}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[13px] truncate max-w-[300px]">{task.title}</p>
                        {task.description && (
                          <p className="text-[11px] text-text-dim truncate max-w-[300px] mt-0.5">{task.description}</p>
                        )}
                      </td>

                      {/* Module */}
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={{ background: `color-mix(in srgb, ${moduleColor} 12%, transparent)`, color: moduleColor }}
                        >
                          {taskModuleLabels[task.module]}
                        </span>
                      </td>

                      {/* Reference */}
                      <td className="px-5 py-3 text-text-dim truncate max-w-[200px]">
                        {task.referenceTitle || '—'}
                      </td>

                      {/* Due Date */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={overdue ? 'text-red font-semibold' : 'text-text-dim'}>
                          {formatDate(task.dueDate)}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                            style={{ background: 'color-mix(in srgb, #F59E0B 15%, transparent)', color: '#F59E0B' }}
                          >
                            {getUserInitials(task.assignedTo, users)}
                          </div>
                          <span className="text-[11px] text-text-sec truncate">{getUserName(task.assignedTo, users)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   Task Form Modal (Create / Edit)
   ══════════════════════════════════════════════════════════════════════════════ */

function TaskFormModal({
  task,
  users,
  currentUserId,
  onClose,
}: {
  task: Task | null
  users: UserType[]
  currentUserId: string
  onClose: () => void
}) {
  const isEdit = !!task
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM')
  const [module, setModule] = useState<TaskModule>(task?.module ?? 'ALLGEMEIN')
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? currentUserId)
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'OFFEN')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isPending = createTask.isPending || updateTask.isPending || deleteTask.isPending

  const handleSubmit = async () => {
    if (!title.trim()) return
    try {
      if (isEdit) {
        await updateTask.mutateAsync({
          id: task.id,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          assignedTo,
          dueDate: dueDate || undefined,
          status,
        })
      } else {
        await createTask.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          module,
          assignedTo,
          dueDate: dueDate || undefined,
        })
      }
      onClose()
    } catch {
      // Error handled by React Query
    }
  }

  const handleDelete = async () => {
    if (!task) return
    try {
      await deleteTask.mutateAsync(task.id)
      onClose()
    } catch {
      // Error handled by React Query
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg glass-card p-6 space-y-5 overflow-y-auto max-h-[90vh]"
        style={{ borderRadius: 'var(--radius-lg)' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold">{isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors">
            <X size={18} className="text-text-dim" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 block">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full px-4 py-2.5 text-[13px]"
              placeholder="Aufgabe beschreiben..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 block">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input w-full px-4 py-2.5 text-[13px] min-h-[80px] resize-y"
              placeholder="Optionale Details..."
            />
          </div>

          {/* Row: Priority + Module */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 block">Priorität</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="glass-input appearance-none w-full pl-4 pr-9 py-2.5 text-[13px] cursor-pointer"
                >
                  {priorityOrder.map((p) => (
                    <option key={p} value={p} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{taskPriorityLabels[p]}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 block">Modul</label>
              <div className="relative">
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value as TaskModule)}
                  className="glass-input appearance-none w-full pl-4 pr-9 py-2.5 text-[13px] cursor-pointer"
                  disabled={isEdit}
                >
                  {(['ALLGEMEIN', 'LEAD', 'TERMIN', 'ANGEBOT', 'PROJEKT'] as TaskModule[]).map((m) => (
                    <option key={m} value={m} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{taskModuleLabels[m]}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row: Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 block">Zugewiesen an</label>
              <div className="relative">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="glass-input appearance-none w-full pl-4 pr-9 py-2.5 text-[13px] cursor-pointer"
                >
                  {users.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 block">Fällig am</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="glass-input w-full px-4 py-2.5 text-[13px]"
              />
            </div>
          </div>

          {/* Status (only in edit mode) */}
          {isEdit && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim mb-1.5 block">Status</label>
              <div className="flex gap-2">
                {statusOrder.map((s) => {
                  const color = taskStatusColors[s]
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: status === s ? `color-mix(in srgb, ${color} 20%, transparent)` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${status === s ? color : 'rgba(255,255,255,0.06)'}`,
                        color: status === s ? color : 'var(--color-text-dim)',
                      }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      {taskStatusLabels[s]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {isEdit && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-[12px] text-red hover:text-red/80 transition-colors"
              >
                <Trash2 size={13} />
                Löschen
              </button>
            )}
            {isEdit && confirmDelete && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-red"
                  style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)' }}
                  disabled={isPending}
                >
                  Ja, löschen
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[12px] text-text-dim hover:text-text"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-[13px]">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary px-5 py-2.5 text-[13px]"
              disabled={!title.trim() || isPending}
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
