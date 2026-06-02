'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { ceilDisplay } from '@/lib/periods'
import { formatHrs } from '@/lib/format'
import { setSwellHidden } from '@/app/actions/swells'
import { SwellsList } from './SwellsList'
import { AddSwellForm } from './AddSwellForm'
import { AddGroupForm } from '@/app/dashboard/components/AddGroupForm'
import { HintCard } from '@/app/components/HintCard'

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
  weekLabel: string
  hintSwellsSeen: boolean
  progressBarColor: string | null
}

function usePersistedHideDone(key: string): [boolean, () => void] {
  const [hideDone, setHideDone] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(key) === 'true'
  })

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
  const [sortMode, setSortMode] = useState<'custom' | 'goal' | 'earned'>('custom')
  const menuRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [showValues, setShowValues] = useState(true)

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

  const formatValue = (n: number) => isHours ? formatHrs(ceilDisplay(n, true)) : String(ceilDisplay(n))

  return (
    <div className="flex min-h-full flex-col items-center px-4 pb-12">
      <div className="w-full max-w-[22rem] lg:max-w-none">
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
                          Add a bucket
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly total */}
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h1 className="min-w-0 text-lg font-semibold text-th-text">{props.weekLabel}</h1>
                <p className="shrink-0 text-lg font-semibold text-th-text">
                  {formatValue(weeklyTotal)}
                  <span className="ml-1 text-xs font-normal uppercase tracking-widest text-th-muted">{isHours ? 'hrs' : 'pts'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard?views=true"
                  className="shrink-0 p-1.5 text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
                  aria-label="Weekly view"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </Link>
                <div className="flex-1 h-[5px] overflow-hidden rounded-full bg-th-surface">
                  {combinedTarget > 0 && (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((weeklyTotal / combinedTarget) * 100, 100)}%`, background: `linear-gradient(to right, color-mix(in oklch, ${props.progressBarColor ?? 'var(--th-accent)'} 35%, var(--th-surface)), ${props.progressBarColor ?? 'var(--th-accent)'})`, backgroundSize: `${10000 / Math.min((weeklyTotal / combinedTarget) * 100, 100)}% 100%` }}
                    />
                  )}
                </div>
                <div className="relative shrink-0" ref={filterRef}>
                  <button
                    onClick={() => setFilterOpen(prev => !prev)}
                    className={`p-1.5 transition-colors active:scale-[0.97] ${hideDone || sortMode !== 'custom' || !showValues ? 'text-th-text' : 'text-th-faint hover:text-th-muted'}`}
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
                          <input type="checkbox" checked={hideDone} onChange={toggleHideDone} className="accent-th-btn" />
                          Hide completed
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-th-text transition-colors hover:bg-th-surface">
                          <input type="checkbox" checked={showValues} onChange={() => setShowValues(v => !v)} className="accent-th-btn" />
                          Show {isHours ? 'hrs' : 'pts'}
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-th-text transition-colors hover:bg-th-surface">
                          <input type="checkbox" checked={sortMode === 'earned'} onChange={() => setSortMode(m => m === 'earned' ? 'custom' : 'earned')} className="accent-th-btn" />
                          Sort {isHours ? 'hrs' : 'pts'}
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-th-text transition-colors hover:bg-th-surface">
                          <input type="checkbox" checked={sortMode === 'goal'} onChange={() => setSortMode(m => m === 'goal' ? 'custom' : 'goal')} className="accent-th-btn" />
                          Sort target
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {combinedTarget > 0 && props.swells.length > 0 && (
                <div className="mt-1 flex justify-between text-xs text-th-secondary">
                  <span>{formatValue(weeklyTotal)} / {formatValue(combinedTarget)} weekly</span>
                  <span>{ceilDisplay(Math.min((weeklyTotal / combinedTarget) * 100, 100))}%</span>
                </div>
              )}

              {props.groupsEnabled && visibleGroups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
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
            </div>

            <HintCard hintKey="swells" title="Your swells." seen={props.hintSwellsSeen}>
              <p className="mb-1.5">A swell is a noun-shaped area of your life. A person, a place, a thing you want to feed. Movement, Home, your dog, the band you&apos;re starting. Pick a color that feels like it. Set a weekly target.</p>
              <p>Your motions flow into your swells. Each motion can feed more than one.</p>
            </HintCard>

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
              sortMode={sortMode}
              showValues={showValues}
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

