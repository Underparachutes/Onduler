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
import { useRouter } from 'next/navigation'
import { quickLogMotion, unlogMotion, logMotionOnDay, removeLogById } from '@/app/actions/logs'
import { setDailyGoal, setDailyGoalHours } from '@/app/actions/settings'
import { reassignMotionToGroup, reorderMotions, setMotionSwells, duplicateMotion } from '@/app/actions/motions'
import { formatPts, formatHrs } from '@/lib/format'
import { ceilDisplay } from '@/lib/periods'
import { useToast } from '@/app/components/Toast'
import dynamic from 'next/dynamic'
import { type CelebrationState } from './CelebrationOverlay'
import { SortableMotionList, SortableMotionRow } from './SortableMotionList'
import { getWeekDayKeys } from './weekDayKeys'

const CelebrationOverlay = dynamic(() => import('./CelebrationOverlay').then(m => m.CelebrationOverlay))
const MotionDetailSheet = dynamic(() => import('./MotionDetailSheet').then(m => m.MotionDetailSheet))
const WeekEditView = dynamic(() => import('./WeekEditView').then(m => m.WeekEditView))

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
type Group = { id: string; name: string; color: string; motions: Motion[] }
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }
type TrackingMode = 'points' | 'hours'

type Props = {
  topBar: React.ReactNode
  belowHeader?: React.ReactNode
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
  weeklyLogMap: Record<string, Record<string, string[]>>
}

function DroppableGroup({
  id, label, color, items, isDragging, localDone, localHiddenIds, hideDone, submotionsMap, submotionsEnabled, trackingMode, hidePtsHrs, divingId, onLog, onOpenSheet,
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
  hidePtsHrs?: boolean
  divingId: string | null
  onLog: (motion: Motion, x: number, y: number, rowBottom?: number) => void
  onOpenSheet: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const nonHidden = items.filter(m => !localHiddenIds.has(m.id))
  const visible = nonHidden.filter(m => m.id === divingId || !hideDone || !localDone.has(m.id))

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
              diving={motion.id === divingId}
              trackingMode={trackingMode}
              hidePtsHrs={hidePtsHrs}
              onLog={(e, rb) => onLog(motion, e.clientX, e.clientY, rb)}
              onOpenSheet={() => onOpenSheet(motion.id)}
            />
          ))}
          {visible.length === 0 && isDragging && (
            <div className="rounded-lg border border-dashed border-th-border py-3 text-center text-xs text-th-faint">
              {id === 'ungrouped' ? 'Drop to remove bucket' : 'Drop here'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}


function DroppableSwellSection({
  id, label, color, items, isDragging, localDone, localHiddenIds, hideDone, submotionsMap, submotionsEnabled, trackingMode, hidePtsHrs, divingId, onLog, onOpenSheet,
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
  hidePtsHrs?: boolean
  divingId: string | null
  onLog: (motion: Motion, x: number, y: number, rowBottom?: number) => void
  onOpenSheet: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const visible = items.filter(m => {
    if (localHiddenIds.has(m.id)) return false
    if (m.id === divingId) return true
    if (hideDone && localDone.has(m.id)) return false
    return true
  })

  return (
    <div>
      <p
        className="mb-2 text-xs font-semibold uppercase tracking-widest"
        style={color ? { color } : undefined}
      >
        {label}
      </p>
      <SortableContext items={items.map(m => `${id}:${m.id}`)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 min-h-[2rem] rounded-lg transition-colors ${isOver ? 'ring-1 ring-th-border' : ''}`}
        >
          {visible.map(motion => (
            <SortableMotionRow
              key={`${id}-${motion.id}`}
              sortableId={`${id}:${motion.id}`}
              motion={motion}
              done={localDone.has(motion.id)}
              diving={motion.id === divingId}
              trackingMode={trackingMode}
              hidePtsHrs={hidePtsHrs}
              onLog={(e, rb) => onLog(motion, e.clientX, e.clientY, rb)}
              onOpenSheet={() => onOpenSheet(motion.id)}
            />
          ))}
          {visible.length === 0 && isDragging && (
            <div className="rounded-lg border border-dashed border-th-border py-3 text-center text-xs text-th-faint">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
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
  belowHeader,
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
  weeklyLogMap,
}: Props) {
  const isHours = trackingMode === 'hours'
  const todayValue = isHours ? todayHours : todayPoints
  const goalValue = isHours ? dailyGoalHours : dailyGoal
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showSwells, setShowSwells] = useState(false)
  const [showPtsHrs, setShowPtsHrs] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (localStorage.getItem('onduler-filter-show-completed') === 'true') setShowCompleted(true)
    if (localStorage.getItem('onduler-motions-by-swell') === 'true') setShowSwells(true)
    if (localStorage.getItem('onduler-filter-show-pts') === 'true') setShowPtsHrs(true)
  }, [])
  useEffect(() => {
    if (!filterOpen) return
    function handleOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [filterOpen])
  function toggleFilter(key: 'showCompleted' | 'showSwells' | 'showPtsHrs') {
    if (key === 'showCompleted') {
      setShowCompleted(prev => { const next = !prev; localStorage.setItem('onduler-filter-show-completed', String(next)); return next })
    } else if (key === 'showSwells') {
      setShowSwells(prev => { const next = !prev; localStorage.setItem('onduler-motions-by-swell', String(next)); return next })
    } else {
      setShowPtsHrs(prev => { const next = !prev; localStorage.setItem('onduler-filter-show-pts', String(next)); return next })
    }
  }
  const [viewsMode, setViewsMode] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [viewsDelta, setViewsDelta] = useState(0)
  const hideDone = !showCompleted
  const bySwell = showSwells
  const hidePtsHrs = !showPtsHrs
  const [localDone, setLocalDone] = useState(() => new Set(doneMotionIds))
  const [divingId, setDivingId] = useState<string | null>(null)
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

  const router = useRouter()
  const toast = useToast()

  // By-swell DnD state — container map keyed by swell ID (or 'unassigned')
  const [swellContainers, setSwellContainers] = useState<Record<string, Motion[]>>(() => ({}))
  const [swellDragActiveId, setSwellDragActiveId] = useState<string | null>(null)

  function buildSwellContainers(sourceMotions: Motion[], groupFilter: string | null) {
    const filtered = groupFilter ? sourceMotions.filter(m => m.groupId === groupFilter) : sourceMotions
    const containers: Record<string, Motion[]> = {}
    for (const swell of allSwells) {
      const ms = filtered.filter(m => m.swells.some(s => s.id === swell.id))
      if (ms.length > 0) containers[swell.id] = ms
    }
    const orphans = filtered.filter(m => m.swells.length === 0)
    if (orphans.length > 0) containers['unassigned'] = orphans
    return containers
  }

  useEffect(() => {
    if (bySwell) setSwellContainers(buildSwellContainers(motions, activeGroup))
  }, [bySwell, motions, activeGroup, allSwells])

  function parseCompositeId(compositeId: string): { containerId: string; motionId: string } | null {
    const idx = compositeId.indexOf(':')
    if (idx === -1) return null
    return { containerId: compositeId.slice(0, idx), motionId: compositeId.slice(idx + 1) }
  }

  function handleSwellDragStart({ active }: DragStartEvent) {
    const parsed = parseCompositeId(active.id as string)
    setSwellDragActiveId(parsed?.motionId ?? null)
  }

  function handleSwellDragEnd({ active, over }: DragEndEvent) {
    setSwellDragActiveId(null)
    if (!over) return

    const activeParsed = parseCompositeId(active.id as string)
    const overParsed = parseCompositeId(over.id as string)

    if (!activeParsed) return

    const activeMotionId = activeParsed.motionId
    const sourceContainerId = activeParsed.containerId
    const targetContainerId = overParsed?.containerId ?? (over.id as string in swellContainers ? over.id as string : undefined)

    if (!targetContainerId) return

    if (sourceContainerId === targetContainerId) {
      if (!overParsed) return
      const items = swellContainers[sourceContainerId]
      const oldIdx = items.findIndex(m => m.id === activeMotionId)
      const newIdx = items.findIndex(m => m.id === overParsed.motionId)
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
      const reordered = arrayMove(items, oldIdx, newIdx)
      setSwellContainers(prev => ({ ...prev, [sourceContainerId]: reordered }))
      startTransition(async () => { await reorderMotions(reordered.map(m => m.id)) })
      return
    }

    const movedMotion = swellContainers[sourceContainerId]?.find(m => m.id === activeMotionId)
    if (!movedMotion) return

    const prevSwells = movedMotion.swells.map(s => ({ swellId: s.id, weight: s.weight }))
    const sourceSwell = allSwells.find(s => s.id === sourceContainerId)
    const targetSwell = allSwells.find(s => s.id === targetContainerId)

    if (targetContainerId === 'unassigned') {
      // Drag to Unassigned — strip all swells
      const newSrc = swellContainers[sourceContainerId].filter(m => m.id !== activeMotionId)
      const orphanMotion = { ...movedMotion, swells: [] }
      const newUnassigned = [...(swellContainers['unassigned'] ?? []), orphanMotion]
      setSwellContainers(prev => {
        const next = { ...prev, [sourceContainerId]: newSrc, 'unassigned': newUnassigned }
        if (newSrc.length === 0) delete next[sourceContainerId]
        return next
      })
      startTransition(async () => { await setMotionSwells(activeMotionId, []) })
      toast.show({
        message: `${movedMotion.name} now feeds no swells.`,
        primary: {
          label: 'Undo',
          onClick: () => {
            setSwellContainers(buildSwellContainers(motions, activeGroup))
            startTransition(async () => {
              await setMotionSwells(activeMotionId, prevSwells)
              router.refresh()
            })
          },
        },
      })
      return
    }

    // Cross-swell drag — move membership from source to target
    const sourceWeight = prevSwells.find(s => s.swellId === sourceContainerId)?.weight ?? 1
    const newEntries = prevSwells
      .filter(s => s.swellId !== sourceContainerId)
      .concat({ swellId: targetContainerId, weight: sourceWeight })

    const updatedMotion = {
      ...movedMotion,
      swells: newEntries.map(e => {
        const sw = allSwells.find(s => s.id === e.swellId)
        return { id: e.swellId, name: sw?.name ?? '', color: sw?.color ?? '', weight: e.weight }
      }),
    }

    setSwellContainers(prev => {
      const newSrc = (prev[sourceContainerId] ?? []).filter(m => m.id !== activeMotionId)
      const overMotionId = overParsed?.motionId
      const targetItems = prev[targetContainerId] ?? []
      const overIdx = overMotionId ? targetItems.findIndex(m => m.id === overMotionId) : -1
      const newDst = overIdx === -1
        ? [...targetItems, updatedMotion]
        : [...targetItems.slice(0, overIdx), updatedMotion, ...targetItems.slice(overIdx)]
      const next = { ...prev, [sourceContainerId]: newSrc, [targetContainerId]: newDst }
      if (newSrc.length === 0) delete next[sourceContainerId]
      return next
    })

    startTransition(async () => { await setMotionSwells(activeMotionId, newEntries) })

    const sourceLabel = sourceSwell?.name ?? 'Unassigned'
    const targetLabel = targetSwell?.name ?? 'Unassigned'

    toast.show({
      message: `Moved ${movedMotion.name} from ${sourceLabel} to ${targetLabel}.`,
      primary: {
        label: 'Undo',
        onClick: () => {
          setSwellContainers(buildSwellContainers(motions, activeGroup))
          startTransition(async () => {
            await setMotionSwells(activeMotionId, prevSwells)
            router.refresh()
          })
        },
      },
      secondary: {
        label: 'Keep both',
        onClick: () => {
          startTransition(async () => {
            await setMotionSwells(activeMotionId, prevSwells)
            await duplicateMotion(activeMotionId, { swellId: targetContainerId, weight: sourceWeight })
            router.refresh()
          })
        },
      },
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Weekly total for Views mode — computed from weeklyLogMap + motion defaults
  const viewsDayKeys = getWeekDayKeys(weekOffset)
  const viewsDayKeySet = new Set(viewsDayKeys)
  const viewsWeekBase = (() => {
    const allM = [...motions, ...Object.values(submotionsMap).flat()]
    const defaults = new Map(allM.map(m => [m.id, isHours ? Number(m.default_hours) : m.default_points]))
    let total = 0
    for (const [mid, dayMap] of Object.entries(weeklyLogMap)) {
      const perLog = defaults.get(mid) ?? 0
      for (const [dk, ids] of Object.entries(dayMap)) {
        if (viewsDayKeySet.has(dk)) total += ids.length * perLog
      }
    }
    return total
  })()
  const viewsWeekValue = viewsWeekBase + viewsDelta
  const viewsWeekGoal = localGoal * 7
  const viewsDateLabel = (() => {
    const [vy, vm, vd] = viewsDayKeys[0].split('-').map(Number)
    const d = new Date(vy, vm - 1, vd)
    return `Week of ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
  })()

  useEffect(() => { setViewsDelta(0) }, [weeklyLogMap, weekOffset])

  const displayValue = viewsMode ? viewsWeekValue : localValue
  const displayGoal = viewsMode ? viewsWeekGoal : localGoal
  const progress = Math.min((displayValue / displayGoal) * 100, 100)
  const formatValue = (n: number) => isHours ? formatHrs(ceilDisplay(n, true)) : formatPts(ceilDisplay(n))
  const motionDelta = (motion: Motion) => isHours ? Number(motion.default_hours) : motion.default_points

  function updateSwellProgress(motion: Motion, sign: 1 | -1) {
    for (const ms of motion.swells) {
      const contribution = isHours ? Number(motion.default_hours) * ms.weight : motion.default_points * ms.weight
      swellProgressRef.current[ms.id] = (swellProgressRef.current[ms.id] ?? 0) + contribution * sign
    }
  }

  function handleLog(motion: Motion, clientX = 0, clientY = 0, rowBottom?: number) {
    const done = localDone.has(motion.id)
    const delta = motionDelta(motion)
    if (done) {
      setLocalDone(prev => { const next = new Set(prev); next.delete(motion.id); return next })
      setLocalValue(prev => Math.max(0, prev - delta))
      updateSwellProgress(motion, -1)
      startTransition(async () => { await unlogMotion(motion.id) })
    } else {
      if (hapticEnabled && 'vibrate' in navigator) navigator.vibrate([15, 30, 15, 30, 15])
      if (celebrationEnabled) {
        setCelebration({ x: clientX, y: clientY, colors: motion.swells.map(s => s.color), rowBottom })
      }
      if (celebrationEnabled) {
        setDivingId(motion.id)
        setTimeout(() => {
          setDivingId(null)
          setLocalDone(prev => new Set([...prev, motion.id]))
        }, 550)
      } else {
        setLocalDone(prev => new Set([...prev, motion.id]))
      }
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
      <h1 className="min-w-0 text-lg font-semibold text-th-text">{viewsMode ? viewsDateLabel : today}</h1>
      <p className="shrink-0 text-lg font-semibold text-th-text">
        {isHours ? displayValue.toFixed(displayValue % 1 === 0 ? 0 : 2).replace(/\.?0+$/, '') : displayValue}
        <span className="ml-1 text-xs font-normal uppercase tracking-widest text-th-muted">{isHours ? 'hrs' : 'pts'}</span>
      </p>
    </div>
  )

  const progressStats = (
    <div className="mb-3 flex justify-between text-xs text-th-secondary">
      <span>{formatValue(displayValue)} / {viewsMode ? (
        <span>{formatValue(displayGoal)} target</span>
      ) : editingGoal ? (
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
      onOpenDuplicate={(id) => setOpenSheetId(id)}
    />
  )

  const undoToastEl = undoToast && (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-th-border bg-th-surface px-4 py-2.5 shadow-lg">
      <span className="truncate text-sm text-th-muted">Logged {undoToast.motion.name}</span>
      <button onClick={handleUndo} className="shrink-0 text-sm font-semibold text-th-btn">Undo</button>
    </div>
  )

  const hasNonDefaultFilter = showCompleted || showSwells || showPtsHrs

  const headerToolbar = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setViewsMode(prev => !prev)}
        className={`shrink-0 p-1.5 transition-colors active:scale-[0.97] ${viewsMode ? 'text-th-text' : 'text-th-faint hover:text-th-muted'}`}
        aria-label="Views"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <div className="flex-1 h-[5px] overflow-hidden rounded-full bg-th-surface">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: 'linear-gradient(to right, color-mix(in oklch, var(--th-accent) 35%, var(--th-surface)), var(--th-accent))', backgroundSize: `${100 / (progress / 100)}% 100%` }}
        />
      </div>
      <div className="relative shrink-0" ref={filterRef}>
        <button
          onClick={() => setFilterOpen(prev => !prev)}
          className={`p-1.5 transition-colors active:scale-[0.97] ${hasNonDefaultFilter ? 'text-th-text' : 'text-th-faint hover:text-th-muted'}`}
          aria-label="Filter"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        {filterOpen && (
          <>
          <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-th-border bg-th-bg p-2 shadow-lg">
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-th-text transition-colors hover:bg-th-surface">
              <input type="checkbox" checked={showCompleted} onChange={() => toggleFilter('showCompleted')} className="accent-th-btn" />
              Show completed
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-th-text transition-colors hover:bg-th-surface">
              <input type="checkbox" checked={showSwells} onChange={() => toggleFilter('showSwells')} className="accent-th-btn" />
              Show swells
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-th-text transition-colors hover:bg-th-surface">
              <input type="checkbox" checked={showPtsHrs} onChange={() => toggleFilter('showPtsHrs')} className="accent-th-btn" />
              Show pts/hrs
            </label>
          </div>
          </>
        )}
      </div>
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

  if (viewsMode) {
    return (
      <>
        <div>
          <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            {topBar}
            {dateHeader}
            {headerToolbar}
            {progressStats}
            {groupChipsRow}
          </div>
          {belowHeader}
          <WeekEditView
            motions={activeGroup ? motions.filter(m => m.groupId === activeGroup) : motions}
            submotionsMap={submotionsMap}
            submotionsEnabled={submotionsEnabled}
            trackingMode={trackingMode}
            weeklyLogMap={weeklyLogMap}
            hidePtsHrs={hidePtsHrs}
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            onLogDelta={(d) => setViewsDelta(prev => prev + d)}
            bySwell={bySwell}
            allSwells={allSwells}
            hideDone={hideDone}
          />
        </div>
        {detailSheet}
        {celebrationOverlay}
        {undoToastEl}
      </>
    )
  }

  if (bySwell) {
    const sectionIds = Object.keys(swellContainers)
    const swellDragMotion = swellDragActiveId
      ? Object.values(swellContainers).flat().find(m => m.id === swellDragActiveId) ?? null
      : null

    return (
      <>
        <div>
          <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            {topBar}
            {dateHeader}
            {headerToolbar}
            {progressStats}
            {groupChipsRow}
          </div>
          {belowHeader}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleSwellDragStart}
            onDragEnd={handleSwellDragEnd}
          >
            {!!swellDragActiveId && <div className="fixed inset-0 z-40" />}
            <div className="flex flex-col gap-6">
              {sectionIds.map(cid => {
                const swell = allSwells.find(s => s.id === cid)
                const items = swellContainers[cid] ?? []
                return (
                  <DroppableSwellSection
                    key={cid}
                    id={cid}
                    label={swell?.name ?? 'Unassigned'}
                    color={swell?.color}
                    items={items}
                    isDragging={!!swellDragActiveId}
                    localDone={localDone}
                    localHiddenIds={localHiddenIds}
                    hideDone={hideDone}
                    submotionsMap={submotionsMap}
                    submotionsEnabled={submotionsEnabled}
                    trackingMode={trackingMode}
                    hidePtsHrs={hidePtsHrs}
                    divingId={divingId}
                    onLog={handleLog}
                    onOpenSheet={setOpenSheetId}
                  />
                )
              })}
            </div>
            <DragOverlay>
              {swellDragMotion && (
                <MotionDragOverlay
                  motion={swellDragMotion}
                  done={localDone.has(swellDragMotion.id)}
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

  // Flat mode
  if (!groupsEnabled) {
    return (
      <>
        <div>
          <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            {topBar}
            {dateHeader}
            {headerToolbar}
            {progressStats}
          </div>
          {belowHeader}
          <SortableMotionList
            motions={motions}
            submotionsMap={submotionsMap}
            submotionsEnabled={submotionsEnabled}
            localDone={localDone}
            hideDone={hideDone}
            localHiddenIds={localHiddenIds}
            trackingMode={trackingMode}
            hidePtsHrs={hidePtsHrs}
            divingId={divingId}
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
          {progressStats}

          {headerToolbar}
          {groupChipsRow}
        </div>
        {belowHeader}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleGroupsDragStart}
          onDragEnd={handleGroupsDragEnd}
        >
          {!!dragActiveId && <div className="fixed inset-0 z-40" />}
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
                  hidePtsHrs={hidePtsHrs}
                  divingId={divingId}
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
                hidePtsHrs={hidePtsHrs}
                divingId={divingId}
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
