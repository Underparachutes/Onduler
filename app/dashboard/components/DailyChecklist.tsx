'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  closestCenter,
  closestCorners,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { quickLogMotion, unlogMotion } from '@/app/actions/logs'
import { setDailyGoal, setDailyGoalHours } from '@/app/actions/settings'
import { reassignMotionToGroup, reorderMotions } from '@/app/actions/motions'
import { formatPts, formatHrs } from '@/lib/format'
import { ceilDisplay } from '@/lib/periods'
import { CelebrationOverlay, type CelebrationState } from './CelebrationOverlay'
import { MotionDetailSheet } from './MotionDetailSheet'
import { SortableMotionList, SortableMotionRow } from './SortableMotionList'

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
type Group = { id: string; name: string; color: string; motions: Motion[] }
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }
type TrackingMode = 'points' | 'hours'

type Props = {
  topBar: React.ReactNode
  groupsEnabled: boolean
  submotionsEnabled: boolean
  motions: Motion[]
  groups: Group[]
  ungroupedMotions: Motion[]
  submotionsMap: Record<string, Submotion[]>
  todayPoints: number
  todayHours: number
  doneMotionIds: string[]
  dailyGoal: number
  dailyGoalHours: number
  trackingMode: TrackingMode
  celebrationEnabled: boolean
  hapticEnabled: boolean
  allSwells: Swell[]
  allGroups: { id: string; name: string; color: string }[]
  swellWeeklyProgress: Record<string, number>
  swellTargets: Record<string, number>
}

function DroppableGroup({
  id, label, color, items, isDragging, localDone, localHiddenIds, hideDone, submotionsMap, submotionsEnabled, trackingMode, onLog, onOpenSheet,
}: {
  id: string
  label: string
  color?: string
  items: Motion[]
  isDragging: boolean
  localDone: Set<string>
  localHiddenIds: Set<string>
  hideDone: boolean
  submotionsMap: Record<string, Submotion[]>
  submotionsEnabled: boolean
  trackingMode: TrackingMode
  onLog: (motion: Motion, x: number, y: number) => void
  onOpenSheet: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const nonHidden = items.filter(m => !localHiddenIds.has(m.id))
  const visible = nonHidden.filter(m => !hideDone || !localDone.has(m.id))

  return (
    <div>
      <p
        className="mb-2 text-xs font-semibold uppercase tracking-widest"
        style={color ? { color } : undefined}
      >
        {label}
      </p>
      <SortableContext items={nonHidden.map(m => m.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 min-h-[2rem] rounded-lg transition-colors ${isOver ? 'ring-1 ring-th-border' : ''}`}
        >
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
          {visible.length === 0 && isDragging && (
            <div className="rounded-lg border border-dashed border-th-border py-3 text-center text-xs text-th-faint">
              {id === 'ungrouped' ? 'Drop to remove group' : 'Drop here'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// Per-swell sortable section for the By-swell dashboard view. Each section
// owns its own DndContext so drags don't cross swell boundaries, and the
// reorder writes back to the global motion sort_order by filling only the
// section's positions in the global list — motions in other sections keep
// their slots.
function SortableSwellSection({
  globalMotions,
  initialItems,
  localDone,
  localHiddenIds,
  hideDone,
  submotionsMap,
  submotionsEnabled,
  trackingMode,
  onLog,
  onOpenSheet,
}: {
  globalMotions: Motion[]
  initialItems: Motion[]
  localDone: Set<string>
  localHiddenIds: Set<string>
  hideDone: boolean
  submotionsMap: Record<string, Submotion[]>
  submotionsEnabled: boolean
  trackingMode: TrackingMode
  onLog: (motion: Motion, x: number, y: number) => void
  onOpenSheet: (id: string) => void
}) {
  const [items, setItems] = useState(initialItems)
  const [, startTransition] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(m => m.id === active.id)
    const newIdx = items.findIndex(m => m.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const newSection = arrayMove(items, oldIdx, newIdx)
    setItems(newSection)

    const sectionIds = new Set(items.map(m => m.id))
    const positions: number[] = []
    for (let i = 0; i < globalMotions.length; i++) {
      if (sectionIds.has(globalMotions[i].id)) positions.push(i)
    }
    const newGlobalIds = globalMotions.map(m => m.id)
    for (let i = 0; i < positions.length; i++) {
      newGlobalIds[positions[i]] = newSection[i].id
    }
    startTransition(async () => { await reorderMotions(newGlobalIds) })
  }

  const visible = items.filter(m => {
    if (localHiddenIds.has(m.id)) return false
    if (hideDone && localDone.has(m.id)) return false
    return true
  })

  if (visible.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(m => m.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {visible.map(m => (
            <SortableMotionRow
              key={m.id}
              motion={m}
              done={localDone.has(m.id)}
              hasSubmotions={submotionsEnabled && (submotionsMap[m.id]?.length ?? 0) > 0}
              trackingMode={trackingMode}
              onLog={(e) => onLog(m, e.clientX, e.clientY)}
              onOpenSheet={() => onOpenSheet(m.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function MotionDragOverlay({
  motion, done, submotionsMap, submotionsEnabled, trackingMode,
}: {
  motion: Motion
  done: boolean
  submotionsMap: Record<string, Submotion[]>
  submotionsEnabled: boolean
  trackingMode: TrackingMode
}) {
  const hasSubmotions = submotionsEnabled && (submotionsMap[motion.id]?.length ?? 0) > 0
  return (
    <div className="flex items-center gap-1 select-none rotate-1 shadow-xl">
      <div className={`flex flex-1 items-center gap-3 rounded-lg border px-3 py-3 bg-th-bg ${done ? 'border-th-border opacity-50' : 'border-th-btn'}`}>
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${done ? 'border-th-btn text-th-btn' : 'border-th-border'}`}>
          {done && (
            <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
              <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>{motion.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>{trackingMode === 'hours' ? formatHrs(motion.default_hours) : formatPts(motion.default_points)}</span>
          {hasSubmotions && <span className="text-xs text-th-faint">›</span>}
        </div>
      </div>
      <div className="shrink-0 px-2 py-3 text-base leading-none text-th-faint">···</div>
    </div>
  )
}

export function DailyChecklist({
  topBar,
  groupsEnabled,
  submotionsEnabled,
  motions,
  groups,
  ungroupedMotions,
  submotionsMap,
  todayPoints,
  todayHours,
  doneMotionIds,
  dailyGoal,
  dailyGoalHours,
  trackingMode,
  celebrationEnabled,
  hapticEnabled,
  allSwells,
  allGroups,
  swellWeeklyProgress,
  swellTargets,
}: Props) {
  const isHours = trackingMode === 'hours'
  const todayValue = isHours ? todayHours : todayPoints
  const goalValue = isHours ? dailyGoalHours : dailyGoal
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)
  const [bySwell, setBySwell] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('onduler-hide-done-motions')
    if (stored === 'true') setHideDone(true)
    const swellStored = localStorage.getItem('onduler-motions-by-swell')
    if (swellStored === 'true') setBySwell(true)
  }, [])
  function toggleHideDone() {
    setHideDone(prev => {
      const next = !prev
      localStorage.setItem('onduler-hide-done-motions', String(next))
      return next
    })
  }
  function toggleBySwell() {
    setBySwell(prev => {
      const next = !prev
      localStorage.setItem('onduler-motions-by-swell', String(next))
      return next
    })
  }
  const [localDone, setLocalDone] = useState(() => new Set(doneMotionIds))
  const [, startTransition] = useTransition()
  const [localValue, setLocalValue] = useState(todayValue)
  const [openSheetId, setOpenSheetId] = useState<string | null>(null)
  const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set())
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)
  const swellProgressRef = useRef({ ...swellWeeklyProgress })
  const [localGoal, setLocalGoal] = useState(goalValue)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(goalValue))
  const [undoToast, setUndoToast] = useState<{ motion: Motion } | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Groups DnD state
  const [containers, setContainers] = useState<Record<string, Motion[]>>(() => {
    const init: Record<string, Motion[]> = { ungrouped: ungroupedMotions }
    for (const g of groups) init[g.id] = g.motions
    return init
  })
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const progress = Math.min((localValue / localGoal) * 100, 100)
  const formatValue = (n: number) => isHours ? formatHrs(ceilDisplay(n, true)) : formatPts(ceilDisplay(n))
  const motionDelta = (motion: Motion) => isHours ? Number(motion.default_hours) : motion.default_points

  function getAnimType(): CelebrationState['type'] {
    const theme = document.documentElement.dataset.theme ?? 'default'
    if (theme === 'biarritz') return 'wave'
    if (theme === 'bolinas') return 'bloom'
    return 'glow'
  }

  function checkSwellCrossing(motion: Motion): boolean {
    for (const ms of motion.swells) {
      const target = swellTargets[ms.id]
      if (target === undefined) continue
      const current = swellProgressRef.current[ms.id] ?? 0
      const contribution = isHours ? Number(motion.default_hours) * ms.weight : motion.default_points * ms.weight
      if (current < target && current + contribution >= target) return true
    }
    return false
  }

  function updateSwellProgress(motion: Motion, sign: 1 | -1) {
    for (const ms of motion.swells) {
      const contribution = isHours ? Number(motion.default_hours) * ms.weight : motion.default_points * ms.weight
      swellProgressRef.current[ms.id] = (swellProgressRef.current[ms.id] ?? 0) + contribution * sign
    }
  }

  function handleLog(motion: Motion, clientX = 0, clientY = 0) {
    const done = localDone.has(motion.id)
    const delta = motionDelta(motion)
    if (done) {
      setLocalDone(prev => { const next = new Set(prev); next.delete(motion.id); return next })
      setLocalValue(prev => Math.max(0, prev - delta))
      updateSwellProgress(motion, -1)
      startTransition(async () => { await unlogMotion(motion.id) })
    } else {
      if (hapticEnabled && 'vibrate' in navigator) navigator.vibrate(50)
      const crossesSwell = celebrationEnabled && checkSwellCrossing(motion)
      if (celebrationEnabled) setCelebration({ x: clientX, y: clientY, type: crossesSwell ? 'wave' : getAnimType() })
      setLocalDone(prev => new Set([...prev, motion.id]))
      setLocalValue(prev => prev + delta)
      updateSwellProgress(motion, 1)
      startTransition(async () => { await quickLogMotion(motion.id) })
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = setTimeout(() => setUndoToast(null), 3500)
      setUndoToast({ motion })
    }
  }

  function handleUndo() {
    if (!undoToast) return
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    const { motion } = undoToast
    const delta = motionDelta(motion)
    setLocalDone(prev => { const next = new Set(prev); next.delete(motion.id); return next })
    setLocalValue(prev => Math.max(0, prev - delta))
    setUndoToast(null)
    startTransition(async () => { await unlogMotion(motion.id) })
  }

  function commitGoal() {
    const val = isHours ? parseFloat(goalInput) : parseInt(goalInput)
    const minVal = isHours ? 0.25 : 1
    if (!val || val < minVal) { setGoalInput(String(localGoal)); setEditingGoal(false); return }
    setLocalGoal(val)
    setEditingGoal(false)
    startTransition(async () => {
      if (isHours) await setDailyGoalHours(val)
      else await setDailyGoal(val)
    })
  }

  function findContainerForMotion(motionId: string): string | undefined {
    for (const [cid, items] of Object.entries(containers)) {
      if (items.some(m => m.id === motionId)) return cid
    }
  }

  function handleGroupsDragStart({ active }: DragStartEvent) {
    setDragActiveId(active.id as string)
  }

  function handleGroupsDragEnd({ active, over }: DragEndEvent) {
    setDragActiveId(null)
    if (!over) return

    const activeMotionId = active.id as string
    const overId = over.id as string

    const activeContainer = findContainerForMotion(activeMotionId)
    const overContainer = findContainerForMotion(overId) ?? (overId in containers ? overId : undefined)

    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      const items = containers[activeContainer]
      const oldIdx = items.findIndex(m => m.id === activeMotionId)
      const newIdx = items.findIndex(m => m.id === overId)
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

      const next = arrayMove(items, oldIdx, newIdx)
      setContainers(prev => ({ ...prev, [activeContainer]: next }))
      startTransition(async () => { await reorderMotions(next.map(m => m.id)) })
    } else {
      const srcItems = containers[activeContainer]
      const dstItems = containers[overContainer]
      const movedMotion = srcItems.find(m => m.id === activeMotionId)
      if (!movedMotion) return

      const newSrc = srcItems.filter(m => m.id !== activeMotionId)
      const overIdx = dstItems.findIndex(m => m.id === overId)
      const newDst = overIdx === -1
        ? [...dstItems, movedMotion]
        : [...dstItems.slice(0, overIdx), movedMotion, ...dstItems.slice(overIdx)]

      setContainers(prev => ({ ...prev, [activeContainer]: newSrc, [overContainer]: newDst }))
      startTransition(async () => {
        await reassignMotionToGroup(
          activeMotionId,
          overContainer === 'ungrouped' ? null : overContainer,
          newSrc.map(m => m.id),
          newDst.map(m => m.id),
        )
      })
    }
  }

  const dateHeader = (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h1 className="min-w-0 text-lg font-semibold text-th-text">{today}</h1>
      <p className="shrink-0 text-lg font-semibold text-th-text">
        {isHours ? localValue.toFixed(localValue % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '') : localValue}
        <span className="ml-1 text-xs font-normal uppercase tracking-widest text-th-muted">{isHours ? 'hrs' : 'pts'}</span>
      </p>
    </div>
  )

  const progressBar = (
    <div className="mb-3">
      <div className="mb-1.5 rounded-full bg-th-surface" style={{ height: '5px' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(to right, color-mix(in oklch, var(--th-accent) 35%, var(--th-surface)), var(--th-accent))',
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-th-faint">
        <span>{formatValue(localValue)} / {editingGoal ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              type="number"
              min={isHours ? '0.25' : '1'}
              step={isHours ? '0.25' : '1'}
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onBlur={commitGoal}
              onKeyDown={e => { if (e.key === 'Enter') commitGoal(); if (e.key === 'Escape') { setGoalInput(String(localGoal)); setEditingGoal(false) } }}
              className="w-12 rounded border border-th-border bg-th-surface px-1 py-0 text-xs text-th-text outline-none focus:border-th-focus"
            />
          </span>
        ) : (
          <button
            onClick={() => { setGoalInput(String(localGoal)); setEditingGoal(true) }}
            className="transition-colors hover:text-th-muted"
          >
            {formatValue(localGoal)} target
          </button>
        )}</span>
        <span>{ceilDisplay(progress)}%</span>
      </div>
    </div>
  )

  const celebrationOverlay = celebration && (
    <CelebrationOverlay celebration={celebration} onDone={() => setCelebration(null)} />
  )

  const openSheetMotion = openSheetId ? motions.find(m => m.id === openSheetId) ?? null : null
  const detailSheet = openSheetMotion && (
    <MotionDetailSheet
      motion={openSheetMotion}
      submotions={submotionsMap[openSheetMotion.id] ?? []}
      doneMotionIds={Array.from(localDone)}
      onClose={() => setOpenSheetId(null)}
      onPointsDelta={(delta) => setLocalValue(prev => Math.max(0, prev + delta))}
      onHide={(id) => { setLocalHiddenIds(prev => new Set([...prev, id])); setOpenSheetId(null) }}
      isLogged={localDone.has(openSheetMotion.id)}
      onUnlog={() => { handleLog(openSheetMotion); setOpenSheetId(null) }}
      allSwells={allSwells}
      allGroups={allGroups}
      groupsEnabled={groupsEnabled}
      submotionsEnabled={submotionsEnabled}
      trackingMode={trackingMode}
    />
  )

  const undoToastEl = undoToast && (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-th-border bg-th-surface px-4 py-2.5 shadow-lg">
      <span className="truncate text-sm text-th-muted">Logged {undoToast.motion.name}</span>
      <button onClick={handleUndo} className="shrink-0 text-sm font-semibold text-th-btn">Undo</button>
    </div>
  )

  const headerToggles = (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={toggleBySwell}
        className={`text-xs transition-colors ${bySwell ? 'text-th-text' : 'text-th-faint hover:text-th-muted'}`}
      >
        {bySwell ? 'Default view' : 'By swell'}
      </button>
      <button
        onClick={toggleHideDone}
        className="text-xs text-th-faint transition-colors hover:text-th-muted"
      >
        {hideDone ? 'Show all' : 'Hide done'}
      </button>
    </div>
  )

  const visibleGroupChips = groupsEnabled
    ? groups.filter(g => (containers[g.id]?.length ?? 0) > 0)
    : []
  const groupChipsRow = visibleGroupChips.length > 0 ? (
    <div className="mt-2 flex flex-wrap gap-2">
      {visibleGroupChips.map(g => (
        <button
          key={g.id}
          onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
          className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          style={activeGroup === g.id ? { backgroundColor: g.color, borderColor: g.color, color: '#fff' } : {}}
        >
          <span className={activeGroup !== g.id ? 'text-th-muted' : ''}>
            {g.name.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  ) : null

  // By-swell mode — each motion appears under every swell it feeds, plus an
  // "Unassigned" section for motions with no swell. Tap any instance to log
  // once; credit distributes per existing contribution_weight allocations.
  if (bySwell) {
    const groupFiltered = activeGroup
      ? motions.filter(m => m.groupId === activeGroup)
      : motions
    const sections: { swell: { id: string; name: string; color: string } | null; motions: Motion[] }[] = []
    for (const swell of allSwells) {
      const ms = groupFiltered.filter(m => m.swells.some(s => s.id === swell.id))
      if (ms.length > 0) sections.push({ swell, motions: ms })
    }
    const orphans = groupFiltered.filter(m => m.swells.length === 0)
    if (orphans.length > 0) sections.push({ swell: null, motions: orphans })

    return (
      <>
        <div>
          <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            {topBar}
            {dateHeader}
            {progressBar}
            {headerToggles}
            {groupChipsRow}
          </div>
          <div className="flex flex-col gap-6">
            {sections.map(({ swell, motions: secMotions }) => {
              const sectionVisible = secMotions.filter(m => {
                if (localHiddenIds.has(m.id)) return false
                if (hideDone && localDone.has(m.id)) return false
                return true
              })
              if (sectionVisible.length === 0) return null
              return (
                <div key={swell?.id ?? 'unassigned'}>
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-widest"
                    style={swell ? { color: swell.color } : undefined}
                  >
                    {swell?.name ?? 'Unassigned'}
                  </p>
                  <SortableSwellSection
                    globalMotions={motions}
                    initialItems={secMotions}
                    localDone={localDone}
                    localHiddenIds={localHiddenIds}
                    hideDone={hideDone}
                    submotionsMap={submotionsMap}
                    submotionsEnabled={submotionsEnabled}
                    trackingMode={trackingMode}
                    onLog={handleLog}
                    onOpenSheet={setOpenSheetId}
                  />
                </div>
              )
            })}
          </div>
        </div>
        {detailSheet}
        {celebrationOverlay}
        {undoToastEl}
      </>
    )
  }

  // Flat mode
  if (!groupsEnabled) {
    return (
      <>
        <div>
          <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            {topBar}
            {dateHeader}
            {progressBar}
            {headerToggles}
          </div>
          <SortableMotionList
            motions={motions}
            submotionsMap={submotionsMap}
            submotionsEnabled={submotionsEnabled}
            localDone={localDone}
            hideDone={hideDone}
            localHiddenIds={localHiddenIds}
            trackingMode={trackingMode}
            onLog={handleLog}
            onOpenSheet={setOpenSheetId}
          />
        </div>
        {detailSheet}
        {celebrationOverlay}
        {undoToastEl}
      </>
    )
  }

  // Groups mode — only show groups that have ≥1 motion (Prompt 2)
  const groupsWithMotions = groups.filter(g => (containers[g.id]?.length ?? 0) > 0)
  const effectiveActiveGroup = activeGroup && groupsWithMotions.some(g => g.id === activeGroup) ? activeGroup : null
  const visibleGroupIds = effectiveActiveGroup ? [effectiveActiveGroup] : groupsWithMotions.map(g => g.id)
  const ungroupedItems = containers['ungrouped'] ?? []
  const hasVisibleUngrouped = ungroupedItems.some(m => !localHiddenIds.has(m.id))
  const showUngrouped = !activeGroup && (hasVisibleUngrouped || !!dragActiveId)
  const dragActiveMotion = dragActiveId
    ? Object.values(containers).flat().find(m => m.id === dragActiveId) ?? null
    : null

  return (
    <>
      <div>
        <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
          {topBar}
          {dateHeader}
          {progressBar}

          {headerToggles}
          {groupChipsRow}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleGroupsDragStart}
          onDragEnd={handleGroupsDragEnd}
        >
          <div className="flex flex-col gap-6">
            {visibleGroupIds.map(gid => {
              const groupMeta = groups.find(g => g.id === gid)
              if (!groupMeta) return null
              return (
                <DroppableGroup
                  key={gid}
                  id={gid}
                  label={groupMeta.name}
                  color={groupMeta.color}
                  items={containers[gid] ?? []}
                  isDragging={!!dragActiveId}
                  localDone={localDone}
                  localHiddenIds={localHiddenIds}
                  hideDone={hideDone}
                  submotionsMap={submotionsMap}
                  submotionsEnabled={submotionsEnabled}
                  trackingMode={trackingMode}
                  onLog={handleLog}
                  onOpenSheet={setOpenSheetId}
                />
              )
            })}

            {showUngrouped && (
              <DroppableGroup
                id="ungrouped"
                label="Other"
                items={containers['ungrouped'] ?? []}
                isDragging={!!dragActiveId}
                localDone={localDone}
                localHiddenIds={localHiddenIds}
                hideDone={hideDone}
                submotionsMap={submotionsMap}
                submotionsEnabled={submotionsEnabled}
                trackingMode={trackingMode}
                onLog={handleLog}
                onOpenSheet={setOpenSheetId}
              />
            )}
          </div>

          <DragOverlay>
            {dragActiveMotion && (
              <MotionDragOverlay
                motion={dragActiveMotion}
                done={localDone.has(dragActiveMotion.id)}
                submotionsMap={submotionsMap}
                submotionsEnabled={submotionsEnabled}
                trackingMode={trackingMode}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
      {detailSheet}
      {celebrationOverlay}
      {undoToastEl}
    </>
  )
}
