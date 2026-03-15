import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { type Lead, type Bucket, type Tag, sourceLabels, type LeadSource } from '@/hooks/useLeads'

/* ── Props ── */

interface LeadKanbanProps {
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
  buckets: Bucket[]
  tags: Tag[]
  onMoveLead: (leadId: string, bucketId: string) => void
}

/* ── Column colors by bucket position ── */

const columnColors: Record<number, string> = {
  0: '#60A5FA',
  1: '#A78BFA',
  2: '#F59E0B',
  3: '#22D3EE',
  4: '#34D399',
}

const DEFAULT_COLOR = '#525E6F'

function getColumnColor(position: number): string {
  return columnColors[position] ?? DEFAULT_COLOR
}

/* ── Source badge colors ── */

const sourceColors: Record<LeadSource, string> = {
  HOMEPAGE: '#60A5FA',
  LANDINGPAGE: '#22D3EE',
  MESSE: '#A78BFA',
  EMPFEHLUNG: '#34D399',
  KALTAKQUISE: '#F59E0B',
  SONSTIGE: '#525E6F',
}

/* ── CHF formatter ── */

const chfFormatter = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCHF(value: number): string {
  return chfFormatter.format(value)
}

/* ── Display name helper ── */

function displayName(lead: Lead): string {
  const parts = [lead.firstName, lead.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '--'
}

/* ── Default buckets (fallback when prop is empty) ── */

const defaultBuckets: Bucket[] = [
  { id: 'neu', name: 'Neu', position: 0, pipelineId: '' },
  { id: 'kontaktiert', name: 'Kontaktiert', position: 1, pipelineId: '' },
  { id: 'qualifiziert', name: 'Qualifiziert', position: 2, pipelineId: '' },
  { id: 'angebot', name: 'Angebot', position: 3, pipelineId: '' },
  { id: 'verhandlung', name: 'Verhandlung', position: 4, pipelineId: '' },
]

/* ══════════════════════════════════════════════════
   SortableItem  –  draggable lead card
   ══════════════════════════════════════════════════ */

interface SortableItemProps {
  lead: Lead
  tags: Tag[]
  onSelect: (lead: Lead) => void
}

function SortableItem({ lead, tags, onSelect }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: 'rgba(255,255,255,0.035)',
    backdropFilter: 'blur(24px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '14px',
    cursor: 'grab',
  }

  const srcColor = sourceColors[lead.source] ?? DEFAULT_COLOR
  const value = lead.value ?? 0

  // Resolve tag objects from IDs
  const resolvedTags = useMemo(() => {
    return lead.tags
      .map((tagId) => tags.find((t) => t.id === tagId))
      .filter(Boolean) as Tag[]
  }, [lead.tags, tags])

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(lead)}
      className="transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-lg"
    >
      {/* Lead Name */}
      <p className="text-[13px] font-semibold leading-snug">
        {displayName(lead)}
      </p>

      {/* Company */}
      {lead.company && (
        <p className="text-[11px] text-text-sec mt-0.5 truncate">
          {lead.company}
        </p>
      )}

      {/* Value */}
      <p className="text-[13px] font-bold text-amber mt-2 tabular-nums">
        {formatCHF(value)}
      </p>

      {/* Source badge + Tags row */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: `color-mix(in srgb, ${srcColor} 10%, transparent)`,
            color: srcColor,
          }}
        >
          {sourceLabels[lead.source]}
        </span>
        {resolvedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium"
            style={{
              background: `color-mix(in srgb, ${tag.color} 12%, transparent)`,
              color: tag.color,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   LeadCardOverlay  –  card shown in DragOverlay
   ══════════════════════════════════════════════════ */

interface LeadCardOverlayProps {
  lead: Lead
  tags: Tag[]
}

function LeadCardOverlay({ lead, tags }: LeadCardOverlayProps) {
  const srcColor = sourceColors[lead.source] ?? DEFAULT_COLOR
  const value = lead.value ?? 0

  const resolvedTags = lead.tags
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter(Boolean) as Tag[]

  return (
    <div
      className="scale-[1.05] shadow-2xl ring-2 ring-white/10"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        padding: '14px',
        width: '232px',
        transform: 'rotate(-2deg)',
        cursor: 'grabbing',
      }}
    >
      <p className="text-[13px] font-semibold leading-snug">
        {displayName(lead)}
      </p>
      {lead.company && (
        <p className="text-[11px] text-text-sec mt-0.5 truncate">
          {lead.company}
        </p>
      )}
      <p className="text-[13px] font-bold text-amber mt-2 tabular-nums">
        {formatCHF(value)}
      </p>
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: `color-mix(in srgb, ${srcColor} 10%, transparent)`,
            color: srcColor,
          }}
        >
          {sourceLabels[lead.source]}
        </span>
        {resolvedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium"
            style={{
              background: `color-mix(in srgb, ${tag.color} 12%, transparent)`,
              color: tag.color,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   DroppableColumn  –  bucket column (droppable area)
   ══════════════════════════════════════════════════ */

interface DroppableColumnProps {
  bucket: Bucket
  leads: Lead[]
  tags: Tag[]
  totalValue: number
  color: string
  onSelectLead: (lead: Lead) => void
}

function DroppableColumn({
  bucket,
  leads,
  tags,
  totalValue,
  color,
  onSelectLead,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.id })

  const leadIds = useMemo(() => leads.map((l) => l.id), [leads])

  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{ flex: '0 0 260px' }}
    >
      {/* Column Header */}
      <div
        className="glass-card px-4 py-3.5 mb-3"
        style={{ borderRadius: 'var(--radius-md, 12px)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Colored dot */}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: color,
                boxShadow: `0 0 8px color-mix(in srgb, ${color} 40%, transparent)`,
              }}
            />
            <span className="text-[13px] font-semibold">{bucket.name}</span>
            {/* Count badge */}
            <span
              className="inline-flex items-center justify-center h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums"
              style={{
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                color,
              }}
            >
              {leads.length}
            </span>
          </div>
        </div>
        {/* CHF subtotal */}
        <p className="text-[11px] text-text-dim mt-1 tabular-nums">
          {formatCHF(totalValue)}
        </p>
      </div>

      {/* Cards / Droppable area */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2.5 flex-1 rounded-xl transition-colors duration-200"
        style={{
          minHeight: '80px',
          ...(isOver
            ? {
                background: `color-mix(in srgb, ${color} 6%, transparent)`,
                outline: `2px dashed color-mix(in srgb, ${color} 30%, transparent)`,
                outlineOffset: '-2px',
                borderRadius: '14px',
              }
            : {}),
        }}
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableItem
              key={lead.id}
              lead={lead}
              tags={tags}
              onSelect={onSelectLead}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {leads.length === 0 && (
          <div
            className="flex items-center justify-center py-8 text-text-dim text-[11px] font-medium"
            style={{
              border: '1px dashed rgba(255,255,255,0.06)',
              borderRadius: '14px',
            }}
          >
            Keine Leads
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   LeadKanban  –  main exported component
   ══════════════════════════════════════════════════ */

export default function LeadKanban({
  leads,
  onSelectLead,
  buckets,
  tags,
  onMoveLead,
}: LeadKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Use provided buckets or fall back to defaults
  const activeBuckets = useMemo(() => {
    if (!buckets || buckets.length === 0) return defaultBuckets
    return [...buckets].sort((a, b) => a.position - b.position)
  }, [buckets])

  // Pointer sensor with distance constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // Group leads by bucket
  const leadsByBucket = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const bucket of activeBuckets) {
      map.set(bucket.id, [])
    }
    for (const lead of leads) {
      const bucketId = lead.bucketId
      if (bucketId && map.has(bucketId)) {
        map.get(bucketId)!.push(lead)
      }
    }
    return map
  }, [leads, activeBuckets])

  // Find the currently dragged lead for the overlay
  const activeLead = useMemo(() => {
    if (!activeId) return null
    return leads.find((l) => l.id === activeId) ?? null
  }, [activeId, leads])

  /* ── Drag handlers ── */

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleDragOver(_event: DragOverEvent) {
    // Visual feedback is handled by the DroppableColumn isOver state.
    // No state mutation needed here.
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = String(active.id)
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    // Determine which bucket the lead was dropped into.
    // `over.id` can be either a bucket id (droppable) or another lead id (sortable).
    let targetBucketId: string | null = null

    // Check if over.id is a bucket id
    const isBucket = activeBuckets.some((b) => b.id === over.id)
    if (isBucket) {
      targetBucketId = String(over.id)
    } else {
      // over.id is a lead id — find which bucket that lead belongs to
      const overLead = leads.find((l) => l.id === over.id)
      if (overLead) {
        targetBucketId = overLead.bucketId
      }
    }

    // Only fire callback if moved to a different bucket
    if (targetBucketId && targetBucketId !== lead.bucketId) {
      onMoveLead(leadId, targetBucketId)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ minHeight: '60vh' }}
      >
        {activeBuckets.map((bucket) => {
          const columnLeads = leadsByBucket.get(bucket.id) ?? []
          const totalValue = columnLeads.reduce(
            (sum, l) => sum + (l.value ?? 0),
            0
          )
          const color = getColumnColor(bucket.position)

          return (
            <DroppableColumn
              key={bucket.id}
              bucket={bucket}
              leads={columnLeads}
              tags={tags}
              totalValue={totalValue}
              color={color}
              onSelectLead={onSelectLead}
            />
          )
        })}
      </div>

      {/* Drag overlay – rendered outside column flow */}
      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <LeadCardOverlay lead={activeLead} tags={tags} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
