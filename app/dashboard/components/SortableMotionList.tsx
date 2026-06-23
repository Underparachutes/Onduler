'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
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
import { useSaveGuard } from '@/app/components/useSaveGuard'
import { formatPts, formatHrs } from '@/lib/format'
import { INTENSITY_MULTIPLIER, type Intensity } from '@/lib/intensity'
import { ombreGradient } from '@/lib/ombre'
import { readableInk } from '@/lib/theme-colors'

type Swell = { id: string; name: string; color: string; weight: number }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: Swell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
type Submotion = { id: string; name: string; default_points: number; default_hours: number }
type TrackingMode = 'points' | 'hours'

const INTENSITIES: { key: Intensity; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'medium', label: 'Medium' },
  { key: 'deep', label: 'Deep' },
]

function IntensityPicker({ motion, trackingMode, onPick, onDismiss }: {
  motion: Motion
  trackingMode: TrackingMode
  onPick: (intensity: Intensity) => void
  onDismiss: () => void
}) {
  const isHours = trackingMode === 'hours'
  return (
    <div className="absolute left-0 top-full z-50 mt-1 flex gap-1 rounded-lg border border-th-border bg-th-surface px-1.5 py-1 shadow-lg">
      {INTENSITIES.map(({ key, label }) => {
        const mult = INTENSITY_MULTIPLIER[key]
        const value = isHours
          ? formatHrs(Math.round(Number(motion.default_hours) * mult * 4) / 4)
          : formatPts(Math.round(Number(motion.default_points) * mult))
        return (
          <button
            key={key}
            onClick={(e) => { e.stopPropagation(); onPick(key) }}
            className={`flex flex-col items-center rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-th-bg ${key === 'medium' ? 'text-th-text font-medium' : 'text-th-muted'}`}
          >
            <span>{label}</span>
            <span className="text-[10px] text-th-faint">{value}</span>
          </button>
        )
      })}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss() }}
        className="ml-0.5 flex items-center px-1 text-th-faint transition-colors hover:text-th-muted"
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 2l6 6M8 2l-6 6" />
        </svg>
      </button>
    </div>
  )
}

type RowProps = {
  motion: Motion
  done: boolean
  diving?: boolean
  trackingMode: TrackingMode
  hidePtsHrs?: boolean
  sortableId?: string
  onLog: (e: React.MouseEvent, rowBottom?: number, intensity?: Intensity) => void
  onOpenSheet: () => void
}

// Checkbox paint that ties a motion to its swell(s): a solid swell color, or a
// weighted ombré when the motion spans several swells, so the link survives even
// with swell titles hidden. null → no swell, caller keeps the neutral treatment.
function swellPaint(swells: Swell[]): { paint: string | null; ink: string } {
  return {
    paint: ombreGradient(swells.map(s => ({ color: s.color, value: s.weight }))),
    ink: swells.length ? readableInk(swells[0].color) : 'currentColor',
  }
}

export function SortableMotionRow({ motion, done, diving, trackingMode, hidePtsHrs, sortableId, onLog, onOpenSheet }: RowProps) {
  const { paint: checkPaint, ink: checkInk } = swellPaint(motion.swells)
  const checked = done || diving
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId ?? motion.id })
  const [showPicker, setShowPicker] = useState(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const startPress = useCallback(() => {
    didLongPressRef.current = false
    pressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      setShowPicker(true)
    }, 400)
  }, [])

  const cancelPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }, [])

  function handleClick(e: React.MouseEvent) {
    cancelPress()
    if (didLongPressRef.current) {
      didLongPressRef.current = false
      return
    }
    const rect = e.currentTarget.closest('[data-motion-row]')!.getBoundingClientRect()
    onLog(e, rect.bottom)
  }

  function handlePick(intensity: Intensity) {
    setShowPicker(false)
    const rect = rowRef.current?.getBoundingClientRect()
    onLog(
      { clientX: rect?.left ?? 0, clientY: rect?.top ?? 0 } as React.MouseEvent,
      rect?.bottom,
      intensity,
    )
  }

  return (
    <div
      ref={(node) => { setNodeRef(node); (rowRef as React.MutableRefObject<HTMLDivElement | null>).current = node }}
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
      {/* Checkbox — tap to log, long-press for intensity */}
      <div className="relative ml-3">
        <button
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onClick={handleClick}
          className={`relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded transition-all ${
            checkPaint ? '' : checked ? 'border-2 border-th-btn text-th-btn' : 'border-2 border-th-border'
          }`}
          style={checkPaint ? { background: checkPaint } : undefined}
        >
          {checkPaint && !checked && <span className="absolute inset-[2px] rounded-[3px] bg-th-bg" />}
          {checked && (
            <svg viewBox="0 0 12 10" fill="none" className="relative h-3 w-3">
              <path d="M1 5l3.5 3.5L11 1" stroke={checkPaint ? checkInk : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        {showPicker && !done && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <IntensityPicker
              motion={motion}
              trackingMode={trackingMode}
              onPick={handlePick}
              onDismiss={() => setShowPicker(false)}
            />
          </>
        )}
      </div>

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
        <svg viewBox="0 0 10 10" fill="currentColor" className="h-2.5 w-2.5">
          <circle cx="2" cy="2" r="1.1" /><circle cx="5" cy="2" r="1.1" /><circle cx="8" cy="2" r="1.1" />
          <circle cx="2" cy="5" r="1.1" /><circle cx="5" cy="5" r="1.1" /><circle cx="8" cy="5" r="1.1" />
          <circle cx="2" cy="8" r="1.1" /><circle cx="5" cy="8" r="1.1" /><circle cx="8" cy="8" r="1.1" />
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
  onLog: (motion: Motion, x: number, y: number, rowBottom?: number, intensity?: Intensity) => void
  onOpenSheet: (id: string) => void
  /** Turn off "Hide completed" — used by the all-done hint so an empty list
   *  isn't a dead end. */
  onShowCompleted?: () => void
}

export function SortableMotionList({
  motions,
  submotionsMap: _submotionsMap,
  submotionsEnabled: _submotionsEnabled,
  localDone,
  hideDone,
  localHiddenIds,
  searchQuery = "",
  trackingMode,
  hidePtsHrs,
  divingId = null,
  onLog,
  onOpenSheet,
  onShowCompleted,
}: ListProps) {
  const [ordered, setOrdered] = useState(motions)
  const [dragging, setDragging] = useState(false)
  const [, startTransition] = useTransition()
  const guard = useSaveGuard()

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
    startTransition(async () => { await guard(reorderMotions(next.map(m => m.id))) })
  }

  const q = searchQuery.toLowerCase().trim()
  const visible = ordered.filter(m => {
    if (localHiddenIds.has(m.id)) return false
    if (q && !m.name.toLowerCase().includes(q)) return false
    if (m.id === divingId) return true
    if (hideDone && localDone.has(m.id)) return false
    return true
  })

  // "Hide completed" is on and it's the only reason nothing's showing — i.e. the
  // list is empty because everything left is done. Without a hint this reads as a
  // broken/empty screen, so offer a gentle nudge + a way back to the full list.
  const allDoneHidden =
    !q &&
    visible.length === 0 &&
    hideDone &&
    ordered.some(m => !localHiddenIds.has(m.id) && localDone.has(m.id))

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
              onLog={(e, rb, intensity) => onLog(motion, e.clientX, e.clientY, rb, intensity)}
              onOpenSheet={() => onOpenSheet(motion.id)}
            />
          ))}
          {visible.length === 0 && q && (
            <p className="py-4 text-center text-sm text-th-faint">No motions match &ldquo;{searchQuery}&rdquo;</p>
          )}
          {allDoneHidden && (
            <div className="py-8 text-center">
              <p className="text-sm text-th-muted">You&rsquo;ve logged everything for today.</p>
              {onShowCompleted && (
                <button
                  onClick={onShowCompleted}
                  className="mt-1 text-sm text-th-secondary hover:underline"
                >
                  Show all
                </button>
              )}
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
