'use client'

import { useState, useTransition, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
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
import { unlogMotion } from '@/app/actions/logs'
import { reorderSwells } from '@/app/actions/swells'
import { hideMotion } from '@/app/actions/motions'
import { MotionDetailSheet } from '@/app/dashboard/components/MotionDetailSheet'
import { SwellRow } from './SwellRow'

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Group = { id: string; name: string; color: string }
type Motion = {
  id: string
  name: string
  default_points: number
  default_hours: number
  swells: MotionSwell[]
  groupId: string | null
  submotionMode: 'distribute' | 'rollup' | null
  swellIds: string[]
  swellWeights: Record<string, number>
}
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }
type SwellWithMotions = {
  id: string
  name: string
  color: string
  target_points: number | null
  target_hours: number | null
  groupId: string | null
  motions: Motion[]
}

type TrackingMode = 'points' | 'hours'

type Props = {
  swells: SwellWithMotions[]
  unassigned: Motion[]
  ptsThisWeek: Record<string, number>
  hrsThisWeek: Record<string, number>
  ptsLastWeek: Record<string, number>
  hrsLastWeek: Record<string, number>
  swellBonusThisWeek: Record<string, number>
  swellBonusLastWeek: Record<string, number>
  swellStubs: Swell[]
  submotionsMap: Record<string, Submotion[]>
  doneMotionIds: string[]
  allGroups: Group[]
  groupsEnabled: boolean
  submotionsEnabled: boolean
  trackingMode: TrackingMode
  hideDone: boolean
}

function SortableSwellItem({ swell, children }: { swell: SwellWithMotions; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: swell.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      suppressHydrationWarning
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">{children}</div>
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          style={{ touchAction: 'none' }}
          aria-label="Drag to reorder"
          className="mt-1 shrink-0 cursor-grab px-2 py-1 text-th-faint transition-colors hover:text-th-muted"
        >
          <svg viewBox="0 0 10 10" fill="currentColor" className="h-2.5 w-2.5">
            <circle cx="2" cy="2" r="1.1" /><circle cx="5" cy="2" r="1.1" /><circle cx="8" cy="2" r="1.1" />
            <circle cx="2" cy="5" r="1.1" /><circle cx="5" cy="5" r="1.1" /><circle cx="8" cy="5" r="1.1" />
            <circle cx="2" cy="8" r="1.1" /><circle cx="5" cy="8" r="1.1" /><circle cx="8" cy="8" r="1.1" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function SwellsList({
  swells,
  unassigned,
  ptsThisWeek,
  hrsThisWeek,
  ptsLastWeek,
  hrsLastWeek,
  swellBonusThisWeek,
  swellBonusLastWeek,
  swellStubs,
  submotionsMap,
  doneMotionIds,
  allGroups,
  groupsEnabled,
  submotionsEnabled,
  trackingMode,
  hideDone,
  activeGroup,
  sortMode,
}: Props & { activeGroup: string | null; sortMode: 'custom' | 'goal' | 'earned' }) {
  const [openSheetId, setOpenSheetId] = useState<string | null>(null)
  const [localDone, setLocalDone] = useState<Set<string>>(() => new Set(doneMotionIds))
  const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set())
  const [orderedSwells, setOrderedSwells] = useState(swells)
  const [, startTransition] = useTransition()

  const prevSwellsRef = useRef(swells)
  if (swells !== prevSwellsRef.current) {
    prevSwellsRef.current = swells
    setOrderedSwells(swells)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = orderedSwells.findIndex(s => s.id === active.id)
    const newIdx = orderedSwells.findIndex(s => s.id === over.id)
    const next = arrayMove(orderedSwells, oldIdx, newIdx)
    setOrderedSwells(next)
    startTransition(async () => { await reorderSwells(next.map(s => s.id)) })
  }

  const ptsThisWeekMap = new Map(Object.entries(ptsThisWeek))
  const hrsThisWeekMap = new Map(Object.entries(hrsThisWeek))
  const ptsLastWeekMap = new Map(Object.entries(ptsLastWeek))
  const hrsLastWeekMap = new Map(Object.entries(hrsLastWeek))

  const openSheetMotion = openSheetId
    ? unassigned.find(m => m.id === openSheetId) ?? null
    : null

  const visibleUnassigned = unassigned.filter(m => !localHiddenIds.has(m.id))

  function renderSwellRow(swell: SwellWithMotions) {
    const isHrs = trackingMode === 'hours'
    const bonusThis = isHrs ? 0 : (swellBonusThisWeek[swell.id] ?? 0)
    const bonusLast = isHrs ? 0 : (swellBonusLastWeek[swell.id] ?? 0)
    const swellPtsThisWeek = swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      return sum + Math.floor((ptsThisWeekMap.get(m.id) ?? 0) * w)
    }, 0) + bonusThis
    const swellHrsThisWeek = swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      return sum + (hrsThisWeekMap.get(m.id) ?? 0) * w
    }, 0)
    const val = isHrs ? swellHrsThisWeek : swellPtsThisWeek
    const tgt = isHrs ? (swell.target_hours ? Number(swell.target_hours) : null) : swell.target_points
    const hit = !!(tgt && val >= tgt)
    if (hideDone && hit) return null
    const swellPtsLastWeek = swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      return sum + Math.floor((ptsLastWeekMap.get(m.id) ?? 0) * w)
    }, 0) + bonusLast
    const swellHrsLastWeek = swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      return sum + (hrsLastWeekMap.get(m.id) ?? 0) * w
    }, 0)
    return (
      <SortableSwellItem key={swell.id} swell={swell}>
        <SwellRow
          swell={swell}
          swellPtsThisWeek={swellPtsThisWeek}
          swellHrsThisWeek={swellHrsThisWeek}
          swellPtsLastWeek={swellPtsLastWeek}
          swellHrsLastWeek={swellHrsLastWeek}
          trackingMode={trackingMode}
        />
      </SortableSwellItem>
    )
  }

  function swellValue(swell: SwellWithMotions): number {
    const isHrs = trackingMode === 'hours'
    const bonus = isHrs ? 0 : (swellBonusThisWeek[swell.id] ?? 0)
    return swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      if (isHrs) return sum + (hrsThisWeekMap.get(m.id) ?? 0) * w
      return sum + Math.floor((ptsThisWeekMap.get(m.id) ?? 0) * w)
    }, 0) + bonus
  }

  function swellTarget(swell: SwellWithMotions): number {
    const isHrs = trackingMode === 'hours'
    return isHrs ? (swell.target_hours ? Number(swell.target_hours) : 0) : (swell.target_points ?? 0)
  }

  const baseFiltered = orderedSwells.filter(s => {
    if (activeGroup && s.groupId !== activeGroup) return false
    return true
  })

  const filteredSwells = sortMode === 'custom'
    ? baseFiltered
    : [...baseFiltered].sort((a, b) =>
        sortMode === 'goal'
          ? swellTarget(b) - swellTarget(a)
          : swellValue(b) - swellValue(a)
      )

  // Group swells by groupId for display
  const groupedSwells = new Map<string | null, SwellWithMotions[]>()
  for (const swell of filteredSwells) {
    const gid = swell.groupId
    if (!groupedSwells.has(gid)) groupedSwells.set(gid, [])
    groupedSwells.get(gid)!.push(swell)
  }

  const groupOrder = allGroups.map(g => g.id)

  return (
    <>
      <div className="mb-8 flex flex-col gap-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedSwells.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {groupsEnabled ? (
              <>
                {groupOrder.map(gid => {
                  const groupSwells = groupedSwells.get(gid)
                  if (!groupSwells || groupSwells.length === 0) return null
                  const group = allGroups.find(g => g.id === gid)
                  return (
                    <div key={gid}>
                      <p
                        className="mb-2 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: group?.color }}
                      >
                        {group?.name}
                      </p>
                      <div className="flex flex-col gap-4">
                        {groupSwells.map(renderSwellRow)}
                      </div>
                    </div>
                  )
                })}
                {(groupedSwells.get(null) ?? []).map(renderSwellRow)}
              </>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredSwells.map(renderSwellRow)}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>

      {visibleUnassigned.length > 0 && (
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-th-muted">Not feeding any swell</p>
          <p className="mb-3 text-xs text-th-faint">Adopt them into one, or let them go.</p>
          <div className="flex flex-col gap-1">
            {visibleUnassigned.map(motion => (
              <div key={motion.id} className="flex flex-col gap-1 px-3 py-2.5">
                <p className="text-sm font-medium text-th-text">{motion.name}</p>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setOpenSheetId(motion.id)}
                    className="text-th-muted transition-all hover:text-th-text active:scale-[0.97]"
                  >
                    Add to a swell
                  </button>
                  <span className="text-th-faint">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalHiddenIds(prev => new Set([...prev, motion.id]))
                      startTransition(async () => { await hideMotion(motion.id) })
                    }}
                    className="text-th-muted transition-all hover:text-th-text active:scale-[0.97]"
                  >
                    Hide
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {openSheetMotion && (
        <MotionDetailSheet
          motion={openSheetMotion}
          submotions={submotionsMap[openSheetMotion.id] ?? []}
          doneMotionIds={Array.from(localDone)}
          onClose={() => setOpenSheetId(null)}
          onPointsDelta={() => {}}
          onHide={(id) => {
            setLocalHiddenIds(prev => new Set([...prev, id]))
            setOpenSheetId(null)
          }}
          isLogged={localDone.has(openSheetMotion.id)}
          onUnlog={() => {
            const id = openSheetMotion.id
            setLocalDone(prev => { const next = new Set(prev); next.delete(id); return next })
            startTransition(async () => { await unlogMotion(id) })
            setOpenSheetId(null)
          }}
          allSwells={swellStubs}
          allGroups={allGroups}
          groupsEnabled={groupsEnabled}
          submotionsEnabled={submotionsEnabled}
          trackingMode={trackingMode}
          onOpenDuplicate={(id) => setOpenSheetId(id)}
        />
      )}
    </>
  )
}
