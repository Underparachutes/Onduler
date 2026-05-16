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
import { MotionDetailSheet } from '@/app/dashboard/components/MotionDetailSheet'
import { SwellRow } from './SwellRow'
import { formatPts, formatHrs } from '@/lib/format'

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
  ptsToday: Record<string, number>
  hrsToday: Record<string, number>
  ptsThisWeek: Record<string, number>
  hrsThisWeek: Record<string, number>
  ptsLastWeek: Record<string, number>
  hrsLastWeek: Record<string, number>
  swellStubs: Swell[]
  submotionsMap: Record<string, Submotion[]>
  doneMotionIds: string[]
  allGroups: Group[]
  groupsEnabled: boolean
  trackingMode: TrackingMode
  hideDone: boolean
  searchQuery: string
}

function SortableSwellItem({ swell, children }: { swell: SwellWithMotions; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: swell.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-start gap-1">
        <span
          ref={setActivatorNodeRef}
          {...listeners}
          style={{ touchAction: 'none' }}
          className="mt-1 shrink-0 flex items-center px-1 py-1 text-th-faint cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg width="10" height="14" viewBox="0 0 12 16" fill="currentColor" opacity="0.4">
            <circle cx="4" cy="3" r="1.5" />
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="4" cy="13" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

export function SwellsList({
  swells,
  unassigned,
  ptsToday,
  hrsToday,
  ptsThisWeek,
  hrsThisWeek,
  ptsLastWeek,
  hrsLastWeek,
  swellStubs,
  submotionsMap,
  doneMotionIds,
  allGroups,
  groupsEnabled,
  trackingMode,
  hideDone,
  searchQuery,
  activeGroup,
}: Props & { activeGroup: string | null }) {
  const isHours = trackingMode === 'hours'
  const [openSheetId, setOpenSheetId] = useState<string | null>(null)
  const [localDone, setLocalDone] = useState<Set<string>>(() => new Set(doneMotionIds))
  const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set())
  const [expandedSwells, setExpandedSwells] = useState<Set<string>>(new Set())
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

  function toggleExpand(swellId: string) {
    setExpandedSwells(prev => {
      const next = new Set(prev)
      if (next.has(swellId)) next.delete(swellId)
      else next.add(swellId)
      return next
    })
  }

  const ptsTodayMap = new Map(Object.entries(ptsToday))
  const hrsTodayMap = new Map(Object.entries(hrsToday))
  const ptsThisWeekMap = new Map(Object.entries(ptsThisWeek))
  const hrsThisWeekMap = new Map(Object.entries(hrsThisWeek))
  const ptsLastWeekMap = new Map(Object.entries(ptsLastWeek))
  const hrsLastWeekMap = new Map(Object.entries(hrsLastWeek))

  const allMotions = [...orderedSwells.flatMap(s => s.motions), ...unassigned]
  const openSheetMotion = openSheetId
    ? allMotions.find(m => m.id === openSheetId) ?? null
    : null

  const visibleUnassigned = unassigned.filter(m => !localHiddenIds.has(m.id))

  function renderSwellRow(swell: SwellWithMotions) {
    const swellPtsThisWeek = swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      return sum + Math.floor((ptsThisWeekMap.get(m.id) ?? 0) * w)
    }, 0)
    const swellHrsThisWeek = swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      return sum + (hrsThisWeekMap.get(m.id) ?? 0) * w
    }, 0)
    if (hideDone) {
      const isHrs = trackingMode === 'hours'
      const val = isHrs ? swellHrsThisWeek : swellPtsThisWeek
      const tgt = isHrs ? (swell.target_hours ? Number(swell.target_hours) : null) : swell.target_points
      if (tgt && val >= tgt) return null
    }
    const swellPtsLastWeek = swell.motions.reduce((sum, m) => {
      const w = m.swellWeights?.[swell.id] ?? 1
      return sum + Math.floor((ptsLastWeekMap.get(m.id) ?? 0) * w)
    }, 0)
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
          ptsToday={ptsTodayMap}
          hrsToday={hrsTodayMap}
          allSwells={swellStubs}
          allGroups={allGroups}
          groupsEnabled={groupsEnabled}
          localHiddenIds={localHiddenIds}
          trackingMode={trackingMode}
          expanded={expandedSwells.has(swell.id)}
          onToggleExpand={() => toggleExpand(swell.id)}
          onOpenMotion={setOpenSheetId}
          hideDone={hideDone}
        />
      </SortableSwellItem>
    )
  }

  const filteredSwells = orderedSwells.filter(s => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (activeGroup && s.groupId !== activeGroup) return false
    return true
  })

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
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-muted">Unassigned</p>
          <div className="flex flex-col gap-2">
            {visibleUnassigned.map(motion => (
              <button
                key={motion.id}
                onClick={() => setOpenSheetId(motion.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-th-surface"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-th-text">{motion.name}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-th-secondary">
                  {isHours ? formatHrs(motion.default_hours) : formatPts(motion.default_points)}
                </span>
              </button>
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
          trackingMode={trackingMode}
        />
      )}
    </>
  )
}
