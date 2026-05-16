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
import { SUBMOTIONS_ENABLED } from '@/lib/features'

type MotionSwell = { id: string; name: string; color: string; weight: number }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null }
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }
type TrackingMode = 'points' | 'hours'

type RowProps = {
  motion: Motion
  done: boolean
  hasSubmotions: boolean
  trackingMode: TrackingMode
  onLog: (e: React.MouseEvent) => void
  onOpenSheet: () => void
}

export function SortableMotionRow({ motion, done, hasSubmotions, trackingMode, onLog, onOpenSheet }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: motion.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      suppressHydrationWarning
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1 select-none"
    >
      {/* Drag handle — only this element captures touch for drag */}
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="shrink-0 flex items-center px-1 py-3 text-th-faint cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" opacity="0.4">
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="4" cy="13" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </span>

      {/* Card body — tap to log */}
      <button
        onClick={(e) => { if (!done) onLog(e) }}
        className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
          done ? 'opacity-50 cursor-default' : 'hover:bg-th-surface active:scale-[0.99]'
        }`}
      >
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${done ? 'border-th-btn text-th-btn' : 'border-th-border'}`}>
          {done && (
            <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
              <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>
            {motion.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>
            {trackingMode === 'hours' ? formatHrs(motion.default_hours) : formatPts(motion.default_points)}
          </span>
          {hasSubmotions && <span className="text-xs text-th-faint">›</span>}
        </div>
      </button>

      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onOpenSheet}
        className="shrink-0 p-2 text-th-faint transition-colors hover:text-th-muted"
        aria-label="Open details"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
    </div>
  )
}

type ListProps = {
  motions: Motion[]
  submotionsMap: Record<string, Submotion[]>
  localDone: Set<string>
  hideDone: boolean
  localHiddenIds: Set<string>
  searchQuery: string
  trackingMode: TrackingMode
  onLog: (motion: Motion, x: number, y: number) => void
  onOpenSheet: (id: string) => void
}

export function SortableMotionList({
  motions,
  submotionsMap,
  localDone,
  hideDone,
  localHiddenIds,
  searchQuery,
  trackingMode,
  onLog,
  onOpenSheet,
}: ListProps) {
  const [ordered, setOrdered] = useState(motions)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
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
    if (hideDone && localDone.has(m.id)) return false
    return true
  })

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map(m => m.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {visible.map(motion => (
            <SortableMotionRow
              key={motion.id}
              motion={motion}
              done={localDone.has(motion.id)}
              hasSubmotions={SUBMOTIONS_ENABLED && (submotionsMap[motion.id]?.length ?? 0) > 0}
              trackingMode={trackingMode}
              onLog={(e) => onLog(motion, e.clientX, e.clientY)}
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
