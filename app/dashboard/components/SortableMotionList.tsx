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

type MotionSwell = { id: string; name: string; color: string; weight: number }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
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
      className="flex items-center gap-1 select-none border-b border-th-border-soft"
    >
      {/* Card body — tap to log; checkbox doubles as drag handle (long-press) */}
      <button
        onClick={(e) => { if (!done) onLog(e) }}
        className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
          done ? 'opacity-50 cursor-default' : 'hover:bg-th-surface active:scale-[0.99]'
        }`}
      >
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          style={{ touchAction: 'none' }}
          aria-label="Drag to reorder"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all cursor-grab active:cursor-grabbing ${done ? 'border-th-btn text-th-btn' : 'border-th-border'}`}
        >
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
  submotionsEnabled: boolean
  localDone: Set<string>
  hideDone: boolean
  localHiddenIds: Set<string>
  trackingMode: TrackingMode
  onLog: (motion: Motion, x: number, y: number) => void
  onOpenSheet: (id: string) => void
}

export function SortableMotionList({
  motions,
  submotionsMap,
  submotionsEnabled,
  localDone,
  hideDone,
  localHiddenIds,
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

  const visible = ordered.filter(m => {
    if (localHiddenIds.has(m.id)) return false
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
              hasSubmotions={submotionsEnabled && (submotionsMap[motion.id]?.length ?? 0) > 0}
              trackingMode={trackingMode}
              onLog={(e) => onLog(motion, e.clientX, e.clientY)}
              onOpenSheet={() => onOpenSheet(motion.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
