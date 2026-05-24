'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { ceilDisplay } from '@/lib/periods'
import { setSwellHidden } from '@/app/actions/swells'
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
  hasAnyMotions: boolean
  hiddenSwells: Swell[]
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
    const motionContrib = s.motions.reduce((mSum, m) => {
      const w = m.swellWeights?.[s.id] ?? 1
      if (isHours) return mSum + (props.hrsThisWeek[m.id] ?? 0) * w
      return mSum + Math.floor((props.ptsThisWeek[m.id] ?? 0) * w)
    }, 0)
    // Bonus points accrue only in points mode (see ADR 0004 §7).
    const bonus = isHours ? 0 : (props.swellBonusThisWeek[s.id] ?? 0)
    return sum + motionContrib + bonus
  }, 0)

  const formatValue = (n: number) => String(ceilDisplay(n, isHours))

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
                <h1 className="min-w-0 text-lg font-semibold text-th-text">This week</h1>
                <p className="shrink-0 text-lg font-semibold text-th-text">
                  {formatValue(weeklyTotal)}
                  <span className="ml-1 text-xs font-normal uppercase tracking-widest text-th-muted">{isHours ? 'hrs' : 'pts'}</span>
                </p>
              </div>

              {/* The denominator stays visible as a teaching signal for
                  right-sizing per-swell targets — but quieter than the actuals. */}
              {combinedTarget > 0 && props.swells.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 rounded-full bg-th-surface" style={{ height: '5px' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((weeklyTotal / combinedTarget) * 100, 100)}%`, background: 'linear-gradient(to right, color-mix(in oklch, var(--th-accent) 35%, var(--th-surface)), var(--th-accent))' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-th-faint">
                    <span>{formatValue(weeklyTotal)} / {formatValue(combinedTarget)} weekly</span>
                    <span>{ceilDisplay(Math.min((weeklyTotal / combinedTarget) * 100, 100))}%</span>
                  </div>
                </div>
              )}

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
              swellBonusThisWeek={props.swellBonusThisWeek}
              swellBonusLastWeek={props.swellBonusLastWeek}
              swellStubs={props.swellStubs}
              submotionsMap={props.submotionsMap}
              doneMotionIds={props.doneMotionIds}
              allGroups={props.allGroups}
              groupsEnabled={props.groupsEnabled}
              submotionsEnabled={props.submotionsEnabled}
              trackingMode={props.trackingMode}
              hideDone={hideDone}
              activeGroup={activeGroup}
            />

            {props.hiddenSwells.length > 0 && (
              <HiddenSwellsSection hiddenSwells={props.hiddenSwells} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function HiddenSwellsSection({ hiddenSwells }: { hiddenSwells: Swell[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startRestore] = useTransition()

  if (hiddenSwells.length === 0) return null

  function restore(id: string) {
    startRestore(async () => { await setSwellHidden(id, false) })
  }

  const count = hiddenSwells.length
  const countLabel = count === 1 ? '1 hidden swell' : `${count} hidden swells`

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-[11px] text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
      >
        {countLabel} {open ? '↑' : '↓'}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {hiddenSwells.map(s => (
            <li key={s.id} className="flex items-center gap-2 px-1 py-1.5">
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color, opacity: 0.55 }}
              />
              <Link
                href={`/swells/${s.id}`}
                className="min-w-0 flex-1 truncate text-sm text-th-muted transition-colors hover:text-th-text"
              >
                {s.name}
              </Link>
              <button
                type="button"
                onClick={() => restore(s.id)}
                disabled={pending}
                className="shrink-0 text-[11px] text-th-faint transition-colors hover:text-th-text active:scale-[0.97] disabled:opacity-40"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

