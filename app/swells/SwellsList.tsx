'use client'

import { useState, useTransition } from 'react'
import { unlogMotion } from '@/app/actions/logs'
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
type Submotion = { id: string; name: string; default_points: number; default_hours: number }
type SwellWithMotions = {
  id: string
  name: string
  color: string
  target_points: number | null
  target_hours: number | null
  motions: Motion[]
}

type TrackingMode = 'points' | 'hours'

type Props = {
  swells: SwellWithMotions[]
  unassigned: Motion[]
  ptsToday: Record<string, number>
  hrsToday: Record<string, number>
  swellStubs: Swell[]
  submotionsMap: Record<string, Submotion[]>
  doneMotionIds: string[]
  allGroups: Group[]
  groupsEnabled: boolean
  trackingMode: TrackingMode
}

export function SwellsList({
  swells,
  unassigned,
  ptsToday,
  hrsToday,
  swellStubs,
  submotionsMap,
  doneMotionIds,
  allGroups,
  groupsEnabled,
  trackingMode,
}: Props) {
  const isHours = trackingMode === 'hours'
  const [openSheetId, setOpenSheetId] = useState<string | null>(null)
  const [localDone, setLocalDone] = useState<Set<string>>(() => new Set(doneMotionIds))
  const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const ptsTodayMap = new Map(Object.entries(ptsToday))
  const hrsTodayMap = new Map(Object.entries(hrsToday))

  const allMotions = [...swells.flatMap(s => s.motions), ...unassigned]
  const openSheetMotion = openSheetId
    ? allMotions.find(m => m.id === openSheetId) ?? null
    : null

  const visibleUnassigned = unassigned.filter(m => !localHiddenIds.has(m.id))

  return (
    <>
      <div className="mb-8 flex flex-col gap-6">
        {swells.map(swell => (
          <SwellRow
            key={swell.id}
            swell={swell}
            swellPtsToday={swell.motions.reduce((sum, m) => {
              const w = m.swellWeights?.[swell.id] ?? 1
              return sum + Math.floor((ptsTodayMap.get(m.id) ?? 0) * w)
            }, 0)}
            swellHrsToday={swell.motions.reduce((sum, m) => {
              const w = m.swellWeights?.[swell.id] ?? 1
              return sum + (hrsTodayMap.get(m.id) ?? 0) * w
            }, 0)}
            ptsToday={ptsTodayMap}
            hrsToday={hrsTodayMap}
            allSwells={swellStubs}
            localHiddenIds={localHiddenIds}
            trackingMode={trackingMode}
            onOpenMotion={setOpenSheetId}
          />
        ))}
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
