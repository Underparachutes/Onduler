'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SwellsList } from './SwellsList'
import { AddSwellForm } from './AddSwellForm'

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
  ptsAllTime: Record<string, number>
  hrsAllTime: Record<string, number>
  swellStubs: Swell[]
  submotionsMap: Record<string, Submotion[]>
  doneMotionIds: string[]
  allGroups: Group[]
  groupsEnabled: boolean
  trackingMode: TrackingMode
  hasAnyMotions: boolean
  weeklyPoints: { week: string; points: number }[]
}

export function SwellsView(props: Props) {
  const [openForm, setOpenForm] = useState<null | 'swell'>(null)

  // Prompt 2: only show groups that are applied to ≥1 swell
  const activeGroupIds = new Set(props.swells.map(s => s.groupId).filter(Boolean) as string[])
  const visibleGroups = props.allGroups.filter(g => activeGroupIds.has(g.id))

  // Prompt 3: compute combined target
  const isHours = props.trackingMode === 'hours'
  const combinedTarget = props.swells.reduce((sum, s) => {
    if (isHours) return sum + (s.target_hours ? Number(s.target_hours) : 0)
    return sum + (s.target_points ?? 0)
  }, 0)

  // All-time total across all swells (weighted)
  const allTimeTotal = props.swells.reduce((sum, s) => {
    return sum + s.motions.reduce((mSum, m) => {
      const w = m.swellWeights?.[s.id] ?? 1
      if (isHours) return mSum + (props.hrsAllTime[m.id] ?? 0) * w
      return mSum + Math.floor((props.ptsAllTime[m.id] ?? 0) * w)
    }, 0)
  }, 0)

  const maxWeekPoints = Math.max(...props.weeklyPoints.map(w => w.points), 1)

  return (
    <div className="flex min-h-full flex-col items-center px-4 pb-12">
      <div className="w-full max-w-[22rem]">
        {openForm === 'swell' ? (
          <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            <AddSwellForm trackingMode={props.trackingMode} onClose={() => setOpenForm(null)} />
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
                <div className="flex items-center gap-3">
                  <Link href="/dashboard" className="hidden text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97] sm:inline">
                    ← Back
                  </Link>
                  <button
                    onClick={() => setOpenForm('swell')}
                    aria-label="Add a swell"
                    className="flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
                  >
                    +
                  </button>
                </div>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-th-text">Swells</h1>

              {/* Top bar: all-time total vs combined target */}
              {props.swells.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <p className="text-lg font-semibold text-th-text">
                      {isHours ? allTimeTotal.toFixed(allTimeTotal % 1 === 0 ? 0 : 1) : Math.round(allTimeTotal)}
                      <span className="ml-1 text-xs font-normal uppercase tracking-widest text-th-muted">{isHours ? 'hrs' : 'pts'} all-time</span>
                    </p>
                    {combinedTarget > 0 && (
                      <p className="shrink-0 text-xs text-th-faint">
                        / {isHours ? combinedTarget.toFixed(combinedTarget % 1 === 0 ? 0 : 1) : combinedTarget} target
                      </p>
                    )}
                  </div>

                  {combinedTarget > 0 && (
                    <div className="mb-3">
                      <div className="mb-1.5 rounded-full bg-th-surface" style={{ height: '5px' }}>
                        <div
                          className="h-full rounded-full bg-th-btn transition-all duration-500"
                          style={{ width: `${Math.min((allTimeTotal / combinedTarget) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-th-faint">
                        <span>{Math.round(allTimeTotal)} / {combinedTarget}</span>
                        <span>{Math.round(Math.min((allTimeTotal / combinedTarget) * 100, 100))}%</span>
                      </div>
                    </div>
                  )}

                  {/* Weekly chart */}
                  {props.weeklyPoints.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs text-th-faint">Points earned by week</p>
                      <div className="flex items-end gap-0.5" style={{ height: '48px' }}>
                        {props.weeklyPoints.slice(-12).map((w) => (
                          <div
                            key={w.week}
                            className="flex-1 rounded-sm bg-th-btn opacity-70"
                            style={{ height: `${Math.max((w.points / maxWeekPoints) * 100, 4)}%` }}
                            title={`${w.week}: ${w.points} pts`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Group filter strip (Prompt 2: only groups applied to ≥1 swell) */}
              {props.groupsEnabled && visibleGroups.length > 0 && (
                <SwellGroupFilter groups={visibleGroups} swells={props.swells} />
              )}
            </div>

            {props.swells.length === 0 && !props.hasAnyMotions && (
              <p className="mb-8 text-sm text-th-muted">No motions yet. Add some from Today first.</p>
            )}

            <SwellsList
              swells={props.swells}
              unassigned={props.unassigned}
              ptsToday={props.ptsToday}
              hrsToday={props.hrsToday}
              ptsAllTime={props.ptsAllTime}
              hrsAllTime={props.hrsAllTime}
              swellStubs={props.swellStubs}
              submotionsMap={props.submotionsMap}
              doneMotionIds={props.doneMotionIds}
              allGroups={props.allGroups}
              groupsEnabled={props.groupsEnabled}
              trackingMode={props.trackingMode}
            />
          </>
        )}
      </div>
    </div>
  )
}

function SwellGroupFilter({ groups, swells }: { groups: Group[]; swells: { groupId: string | null }[] }) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  // If the active group no longer has any swells, clear the filter
  if (activeGroup && !swells.some(s => s.groupId === activeGroup)) {
    setActiveGroup(null)
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {groups.map(g => (
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
  )
}
