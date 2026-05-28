'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { reorderMotions } from '@/app/actions/motions'
import { formatPts, formatHrs } from '@/lib/format'

type Swell = { id: string; name: string; color: string; weight: number }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: Swell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
type Submotion = { id: string; name: string; default_points: number; default_hours: number }
type TrackingMode = 'points' | 'hours'

type RowProps = {
  motion: Motion
  done: boolean
  diving?: boolean
  trackingMode: TrackingMode
  hidePtsHrs?: boolean
  sortableId?: string
  onLog: (e: React.MouseEvent, rowBottom?: number) => void
  onOpenSheet: () => void
}

export function SortableMotionRow({ motion, done, diving, trackingMode, hidePtsHrs, sortableId, onLog, onOpenSheet }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId ?? motion.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      suppressHydrationWarning
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        animation: diving ? 'duck-dive 0.5s ease-out forwards' : undefined,
      }}
      data-motion-row
      className="flex items-center gap-1 select-none outline-none"
    >
      {/* Checkbox — tap to log */}
      <button
        onClick={(e) => { const rect = e.currentTarget.closest('[data-motion-row]')!.getBoundingClientRect(); onLog(e, rect.bottom); }}
        className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all ml-3 ${done || diving ? 'border-th-btn text-th-btn' : 'border-th-border'}`}
      >
        {(done || diving) && (
          <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
            <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Row body */}
      <div
        className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-3 transition-colors ${
          done ? 'opacity-50' : diving ? 'opacity-50' : ''
        }`}
        onClick={onOpenSheet}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>
            {motion.name}
          </p>
        </div>
        {!hidePtsHrs && (
          <span className={`shrink-0 text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>
            {trackingMode === 'hours' ? formatHrs(motion.default_hours) : formatPts(motion.default_points)}
          </span>
        )}
      </div>

      {/* Grip — drag handle */}
      <div
        {...listeners}
        className="shrink-0 cursor-grab px-2 py-3 text-th-faint transition-colors hover:text-th-muted"
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder"
      >
        <svg viewBox="0 0 10 16" fill="currentColor" className="h-4 w-2.5">
          <circle cx="3" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" />
          <circle cx="3" cy="8" r="1.5" /><circle cx="7" cy="8" r="1.5" />
          <circle cx="3" cy="14" r="1.5" /><circle cx="7" cy="14" r="1.5" />
        </svg>
      </div>

    </div>
  )
}

type ListProps = {
  motions: Motion[]
  submotionsMap: Record<string, Submotion[]>
  submotionsEnabled: boolean
  localDone: Set<string>
  hideDone: boolean
  localHiddenIds: Set<string>
  searchQuery?: string
  trackingMode: TrackingMode
  hidePtsHrs?: boolean
  divingId?: string | null
  onLog: (motion: Motion, x: number, y: number, rowBottom?: number) => void
  onOpenSheet: (id: string) => void
}

export function SortableMotionList({
  motions,
  submotionsMap,
  submotionsEnabled,
  localDone,
  hideDone,
  localHiddenIds,
  searchQuery = "",
  trackingMode,
  hidePtsHrs,
  divingId = null,
  onLog,
  onOpenSheet,
}: ListProps) {
  const [ordered, setOrdered] = useState(motions)
  const [dragging, setDragging] = useState(false)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    setDragging(false)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = arrayMove(
      ordered,
      ordered.findIndex(m => m.id === active.id),
      ordered.findIndex(m => m.id === over.id)
    )
    setOrdered(next)
    startTransition(async () => { await reorderMotions(next.map(m => m.id)) })
  }

  const q = searchQuery.toLowerCase().trim()
  const visible = ordered.filter(m => {
    if (localHiddenIds.has(m.id)) return false
    if (q && !m.name.toLowerCase().includes(q)) return false
    if (m.id === divingId) return true
    if (hideDone && localDone.has(m.id)) return false
    return true
  })

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setDragging(true)} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(false)}>
      {dragging && <div className="fixed inset-0 z-40" />}
      <SortableContext items={ordered.map(m => m.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {visible.map(motion => (
            <SortableMotionRow
              key={motion.id}
              motion={motion}
              done={localDone.has(motion.id)}
              diving={motion.id === divingId}
              trackingMode={trackingMode}
              hidePtsHrs={hidePtsHrs}
              onLog={(e, rb) => onLog(motion, e.clientX, e.clientY, rb)}
              onOpenSheet={() => onOpenSheet(motion.id)}
            />
          ))}
          {visible.length === 0 && q && (
            <p className="py-4 text-center text-sm text-th-faint">No motions match &ldquo;{searchQuery}&rdquo;</p>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
