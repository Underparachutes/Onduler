'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { MotionEditRow } from './MotionEditRow'

type Swell = { id: string; name: string; color: string }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: Swell[] }
type Submotion = { id: string; name: string; default_points: number; default_hours: number }

type RowProps = {
  motion: Motion
  done: boolean
  hasSubmotions: boolean
  editing: boolean
  hidden: boolean
  onLog: (e: React.MouseEvent) => void
  onEdit: () => void
  onOpenSheet: () => void
  onCloseEdit: () => void
}

function SortableMotionRow({ motion, done, hasSubmotions, editing, hidden, onLog, onEdit, onOpenSheet, onCloseEdit }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: motion.id })

  if (hidden) return null

  if (editing) {
    return (
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
        <MotionEditRow motion={motion} onClose={onCloseEdit} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex h-12 w-6 shrink-0 cursor-grab items-center justify-center touch-none select-none text-th-faint hover:text-th-muted active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg viewBox="0 0 10 16" fill="currentColor" className="h-3.5 w-3">
          <circle cx="3" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" />
          <circle cx="3" cy="8" r="1.5" /><circle cx="7" cy="8" r="1.5" />
          <circle cx="3" cy="14" r="1.5" /><circle cx="7" cy="14" r="1.5" />
        </svg>
      </button>

      {/* Checkbox — logs */}
      <button
        onClick={onLog}
        aria-label={done ? 'Unlog' : 'Log'}
        className="flex h-12 w-10 shrink-0 items-center justify-center"
      >
        <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${done ? 'border-th-btn bg-th-btn' : 'border-th-border'}`}>
          {done && (
            <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>

      {/* Card body — opens detail sheet */}
      <button
        onClick={onOpenSheet}
        className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-3 text-left transition-colors ${
          done ? 'border-th-border opacity-50' : 'border-th-border hover:bg-th-surface active:scale-[0.99]'
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>
            {motion.name}
          </p>
          {motion.swells.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {motion.swells.map(s => (
                <span
                  key={s.id}
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                  style={{ backgroundColor: s.color }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>
            {motion.default_points}pts
          </span>
          {hasSubmotions && <span className="text-xs text-th-faint">›</span>}
        </div>
      </button>

      {/* Edit button */}
      <button
        onClick={onEdit}
        className="shrink-0 px-2 py-3 text-base leading-none text-th-faint transition-colors hover:text-th-muted"
        aria-label="Edit motion"
      >
        ···
      </button>
    </div>
  )
}

type ListProps = {
  motions: Motion[]
  submotionsMap: Record<string, Submotion[]>
  localDone: Set<string>
  hideDone: boolean
  editingId: string | null
  localHiddenIds: Set<string>
  searchQuery: string
  onLog: (motion: Motion, x: number, y: number) => void
  onEdit: (id: string | null) => void
  onOpenSheet: (id: string) => void
}

export function SortableMotionList({
  motions,
  submotionsMap,
  localDone,
  hideDone,
  editingId,
  localHiddenIds,
  searchQuery,
  onLog,
  onEdit,
  onOpenSheet,
}: ListProps) {
  const [ordered, setOrdered] = useState(motions)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    if (hideDone && localDone.has(m.id) && editingId !== m.id) return false
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
              hasSubmotions={(submotionsMap[motion.id]?.length ?? 0) > 0}
              editing={editingId === motion.id}
              hidden={localHiddenIds.has(motion.id)}
              onLog={(e) => onLog(motion, e.clientX, e.clientY)}
              onEdit={() => onEdit(motion.id)}
              onOpenSheet={() => onOpenSheet(motion.id)}
              onCloseEdit={() => onEdit(null)}
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
