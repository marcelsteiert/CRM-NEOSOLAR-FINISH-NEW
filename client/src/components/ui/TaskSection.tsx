import { useState } from 'react'
import {
  Plus, Clock, CheckCircle2, Circle, Calendar, Trash2, ChevronDown,
  ArrowRight, Loader2, X, AlertTriangle,
} from 'lucide-react'
import {
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  taskStatusLabels, taskStatusColors, taskPriorityLabels, taskPriorityColors,
  type Task, type TaskStatus, type TaskPriority, type TaskModule,
} from '@/hooks/useTasks'
import { useUsers, type User } from '@/hooks/useLeads'
import { useAuth } from '@/hooks/useAuth'

const statusOrder: TaskStatus[] = ['OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT']
const priorityOrder: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(task: Task) {
  return task.status !== 'ERLEDIGT' && task.dueDate && new Date(task.dueDate) < new Date()
}

interface TaskSectionProps {
  module: TaskModule
  referenceId: string
  referenceTitle: string
}

export default function TaskSection({ module, referenceId, referenceTitle }: TaskSectionProps) {
  const { user } = useAuth()
  const { data: tasksRes, isLoading } = useTasks({ module, search: undefined })
  const { data: usersRes } = useUsers()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [showCreate, setShowCreate] = useState(false)

  const users = usersRes?.data ?? []
  const allTasks = tasksRes?.data ?? []
  // Nur Tasks fuer diese Referenz
  const tasks = allTasks.filter((t) => t.referenceId === referenceId)

  const openCount = tasks.filter((t) => t.status === 'OFFEN').length
  const inProgressCount = tasks.filter((t) => t.status === 'IN_BEARBEITUNG').length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold">Aufgaben</span>
          {tasks.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, #34D399 12%, transparent)', color: '#34D399' }}>
              {openCount + inProgressCount} offen
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-amber hover:text-amber/80 transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
          Aufgabe
        </button>
      </div>

      {/* Create inline form */}
      {showCreate && (
        <InlineTaskCreate
          module={module}
          referenceId={referenceId}
          referenceTitle={referenceTitle}
          currentUserId={user?.id ?? ''}
          users={users}
          onCreated={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Tasks list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-text-dim" />
        </div>
      ) : tasks.length === 0 && !showCreate ? (
        <div className="text-center py-6 text-[12px] text-text-dim">
          Keine Aufgaben vorhanden
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              users={users}
              onUpdateStatus={(status) => updateTask.mutate({ id: task.id, status })}
              onDelete={() => deleteTask.mutate(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Inline Create Form ── */

function InlineTaskCreate({
  module,
  referenceId,
  referenceTitle,
  currentUserId,
  users,
  onCreated,
  onCancel,
}: {
  module: TaskModule
  referenceId: string
  referenceTitle: string
  currentUserId: string
  users: User[]
  onCreated: () => void
  onCancel: () => void
}) {
  const createTask = useCreateTask()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [assignedTo, setAssignedTo] = useState(currentUserId)
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) return
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        priority,
        module,
        referenceId,
        referenceTitle,
        assignedTo,
        dueDate: dueDate || undefined,
      })
      onCreated()
    } catch {
      // Error handled by React Query
    }
  }

  return (
    <div className="glass-card p-3 space-y-3" style={{ borderColor: 'color-mix(in srgb, #F59E0B 20%, transparent)' }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="glass-input w-full px-3 py-2 text-[12px]"
        placeholder="Aufgabe beschreiben..."
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority */}
        <div className="relative">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="glass-input appearance-none pl-3 pr-7 py-1.5 text-[11px] cursor-pointer"
          >
            {priorityOrder.map((p) => (
              <option key={p} value={p} style={{ background: '#0B0F15', color: '#F0F2F5' }}>{taskPriorityLabels[p]}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
        </div>

        {/* Assignee */}
        <div className="relative">
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="glass-input appearance-none pl-3 pr-7 py-1.5 text-[11px] cursor-pointer"
          >
            {users.filter((u) => u.isActive).map((u) => (
              <option key={u.id} value={u.id} style={{ background: '#0B0F15', color: '#F0F2F5' }}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
        </div>

        {/* Due date */}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="glass-input px-3 py-1.5 text-[11px]"
        />

        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={onCancel} className="text-[11px] text-text-dim hover:text-text px-2 py-1.5">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary px-3 py-1.5 text-[11px]"
            disabled={!title.trim() || createTask.isPending}
          >
            {createTask.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Task Row ── */

function TaskRow({
  task,
  users,
  onUpdateStatus,
  onDelete,
}: {
  task: Task
  users: User[]
  onUpdateStatus: (status: TaskStatus) => void
  onDelete: () => void
}) {
  const overdue = isOverdue(task)
  const statusColor = taskStatusColors[task.status]
  const prioColor = taskPriorityColors[task.priority]

  const StatusIcon = task.status === 'ERLEDIGT' ? CheckCircle2 : task.status === 'IN_BEARBEITUNG' ? Clock : Circle

  const nextStatus = () => {
    const idx = statusOrder.indexOf(task.status)
    return statusOrder[(idx + 1) % statusOrder.length]
  }

  const assignee = users.find((u) => u.id === task.assignedTo)

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-surface-hover group ${task.status === 'ERLEDIGT' ? 'opacity-60' : ''}`}>
      {/* Status toggle */}
      <button
        type="button"
        onClick={() => onUpdateStatus(nextStatus())}
        className="mt-0.5 shrink-0 transition-transform hover:scale-110"
        title={`Status: ${taskStatusLabels[task.status]} → ${taskStatusLabels[nextStatus()]}`}
      >
        <StatusIcon size={16} style={{ color: statusColor }} strokeWidth={2} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-semibold leading-tight ${task.status === 'ERLEDIGT' ? 'line-through' : ''}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: `color-mix(in srgb, ${prioColor} 12%, transparent)`, color: prioColor }}
          >
            {taskPriorityLabels[task.priority]}
          </span>
          {task.dueDate && (
            <span className={`flex items-center gap-1 text-[10px] ${overdue ? 'text-red font-semibold' : 'text-text-dim'}`}>
              <Calendar size={9} />
              {formatDate(task.dueDate)}
            </span>
          )}
          {assignee && (
            <span className="text-[10px] text-text-dim">
              {assignee.firstName} {assignee.lastName}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
        title="Löschen"
      >
        <Trash2 size={13} className="text-text-dim hover:text-red transition-colors" />
      </button>
    </div>
  )
}
