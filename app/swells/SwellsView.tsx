'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ceilDisplay } from '@/lib/periods'
import { SwellsList } from './SwellsList'
import { AddSwellForm } from './AddSwellForm'
import { AddGroupForm } from '@/app/dashboard/components/AddGroupForm'

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
  hasAnyMotions: boolean
}

function usePersistedHideDone(key: string): [boolean, () => void] {
  const [hideDone, setHideDone] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored === 'true') setHideDone(true)
  }, [key])

  function toggle() {
    setHideDone(prev => {
      const next = !prev
      localStorage.setItem(key, String(next))
      return next
    })
  }

  return [hideDone, toggle]
}

export function SwellsView(props: Props) {
  const [openForm, setOpenForm] = useState<null | 'swell' | 'group'>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hideDone, toggleHideDone] = usePersistedHideDone('onduler-hide-done-swells')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function handlePlus() {
    if (props.groupsEnabled) {
      setMenuOpen(prev => !prev)
    } else {
      setOpenForm('swell')
    }
  }

  const activeGroupIds = new Set(props.swells.map(s => s.groupId).filter(Boolean) as string[])
  const visibleGroups = props.allGroups.filter(g => activeGroupIds.has(g.id))

  const isHours = props.trackingMode === 'hours'
  const combinedTarget = props.swells.reduce((sum, s) => {
    if (isHours) return sum + (s.target_hours ? Number(s.target_hours) : 0)
    return sum + (s.target_points ?? 0)
  }, 0)

  const weeklyTotal = props.swells.reduce((sum, s) => {
    return sum + s.motions.reduce((mSum, m) => {
      const w = m.swellWeights?.[s.id] ?? 1
      if (isHours) return mSum + (props.hrsThisWeek[m.id] ?? 0) * w
      return mSum + Math.floor((props.ptsThisWeek[m.id] ?? 0) * w)
    }, 0)
  }, 0)

  const formatValue = (n: number) => String(ceilDisplay(n))

  return (
    <div className="flex min-h-full flex-col items-center px-4 pb-12">
      <div className="w-full max-w-[22rem]">
        {openForm === 'swell' ? (
          <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            <AddSwellForm trackingMode={props.trackingMode} onClose={() => setOpenForm(null)} />
          </div>
        ) : openForm === 'group' ? (
          <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            <AddGroupForm onClose={() => setOpenForm(null)} />
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
                  <div ref={menuRef} className="relative">
                    <button
                      onClick={handlePlus}
                      aria-label="Add"
                      className="flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
                    >
                      +
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-th-border bg-th-bg shadow-lg">
                        <button
                          onClick={() => { setMenuOpen(false); setOpenForm('swell') }}
                          className="block w-full px-4 py-3 text-left text-sm text-th-text transition-colors hover:bg-th-surface"
                        >
                          Add a swell
                        </button>
                        <div className="border-t border-th-border" />
                        <button
                          onClick={() => { setMenuOpen(false); setOpenForm('group') }}
                          className="block w-full px-4 py-3 text-left text-sm text-th-text transition-colors hover:bg-th-surface"
                        >
                          Add a group
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly total */}
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h1 className="min-w-0 text-lg font-semibold tracking-tight text-th-text">This week</h1>
                <p className="shrink-0 text-sm font-medium text-th-muted">
                  {formatValue(weeklyTotal)}
                  <span className="ml-1 text-[10px] font-normal uppercase tracking-widest text-th-faint">{isHours ? 'hrs' : 'pts'}</span>
                </p>
              </div>

              {/* The denominator stays visible as a teaching signal for
                  right-sizing per-swell targets — but quieter than the actuals. */}
              {combinedTarget > 0 && props.swells.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 rounded-full bg-th-surface" style={{ height: '3px' }}>
                    <div
                      className="h-full rounded-full bg-th-border transition-all duration-500"
                      style={{ width: `${Math.min((weeklyTotal / combinedTarget) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-th-faint">
                    <span>{formatValue(weeklyTotal)} / {formatValue(combinedTarget)} weekly</span>
                    <span>{ceilDisplay(Math.min((weeklyTotal / combinedTarget) * 100, 100))}%</span>
                  </div>
                </div>
              )}

              {/* Search bar */}
              <div className="mb-2">
                <input
                  type="search"
                  placeholder="Search swells…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus placeholder:text-th-faint"
                />
              </div>

              {/* Group filter + hide done */}
              <div className="flex items-center gap-2">
                {props.groupsEnabled && visibleGroups.length > 0 && (
                  <div className="flex flex-1 flex-wrap gap-2">
                    {visibleGroups.map(g => (
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
                )}
                <button
                  onClick={toggleHideDone}
                  className="shrink-0 text-xs text-th-faint transition-colors hover:text-th-muted ml-auto"
                >
                  {hideDone ? 'Show all' : 'Hide done'}
                </button>
              </div>
            </div>

            {props.swells.length === 0 && !props.hasAnyMotions && (
              <p className="mb-8 text-sm text-th-muted">No motions yet. Add some from Today first.</p>
            )}

            <SwellsList
              swells={props.swells}
              unassigned={props.unassigned}
              ptsThisWeek={props.ptsThisWeek}
              hrsThisWeek={props.hrsThisWeek}
              ptsLastWeek={props.ptsLastWeek}
              hrsLastWeek={props.hrsLastWeek}
              swellStubs={props.swellStubs}
              submotionsMap={props.submotionsMap}
              doneMotionIds={props.doneMotionIds}
              allGroups={props.allGroups}
              groupsEnabled={props.groupsEnabled}
              trackingMode={props.trackingMode}
              hideDone={hideDone}
              searchQuery={searchQuery}
              activeGroup={activeGroup}
            />
          </>
        )}
      </div>
    </div>
  )
}

