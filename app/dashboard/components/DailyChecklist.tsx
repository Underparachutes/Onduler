'use client'

import { useState, useTransition } from 'react'
import { quickLogMotion, unlogMotion } from '@/app/actions/logs'
import { setDailyGoal } from '@/app/actions/settings'
import { MotionEditRow } from './MotionEditRow'
import { CelebrationOverlay, type CelebrationState } from './CelebrationOverlay'

type Swell = { id: string; name: string; color: string }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: Swell[] }
type Group = { id: string; name: string; color: string; motions: Motion[] }

type Props = {
  groupsEnabled: boolean
  motions: Motion[]
  groups: Group[]
  ungroupedMotions: Motion[]
  todayPoints: number
  doneMotionIds: string[]
  dailyGoal: number
  celebrationEnabled: boolean
  hapticEnabled: boolean
}

export function DailyChecklist({
  groupsEnabled,
  motions,
  groups,
  ungroupedMotions,
  todayPoints,
  doneMotionIds,
  dailyGoal,
  celebrationEnabled,
  hapticEnabled,
}: Props) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)
  const [localDone, setLocalDone] = useState(() => new Set(doneMotionIds))
  const [, startTransition] = useTransition()
  const [localPoints, setLocalPoints] = useState(todayPoints)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)
  const [localGoal, setLocalGoal] = useState(dailyGoal)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(dailyGoal))

  const progress = Math.min((localPoints / localGoal) * 100, 100)

  function getAnimType(): CelebrationState['type'] {
    const theme = document.documentElement.dataset.theme ?? 'default'
    if (theme === 'biarritz') return 'wave'
    if (theme === 'bolinas') return 'bloom'
    return 'glow'
  }

  function handleLog(motion: Motion, clientX = 0, clientY = 0) {
    const done = localDone.has(motion.id)
    if (done) {
      setLocalDone(prev => { const next = new Set(prev); next.delete(motion.id); return next })
      setLocalPoints(prev => Math.max(0, prev - motion.default_points))
      startTransition(async () => { await unlogMotion(motion.id) })
    } else {
      if (hapticEnabled && 'vibrate' in navigator) navigator.vibrate(50)
      if (celebrationEnabled) setCelebration({ x: clientX, y: clientY, type: getAnimType() })
      setLocalDone(prev => new Set([...prev, motion.id]))
      setLocalPoints(prev => prev + motion.default_points)
      startTransition(async () => { await quickLogMotion(motion.id) })
    }
  }

  function commitGoal() {
    const val = parseInt(goalInput)
    if (!val || val < 1) { setGoalInput(String(localGoal)); setEditingGoal(false); return }
    setLocalGoal(val)
    setEditingGoal(false)
    startTransition(async () => { await setDailyGoal(val) })
  }

  function renderMotion(motion: Motion) {
    if (editingId === motion.id) {
      return (
        <MotionEditRow
          key={motion.id}
          motion={motion}
          onClose={() => setEditingId(null)}
        />
      )
    }

    const done = localDone.has(motion.id)
    return (
      <div key={motion.id} className="flex items-center gap-1">
        <button
          onClick={(e) => handleLog(motion, e.clientX, e.clientY)}
          className={`flex flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
            done
              ? 'border-th-border opacity-50 hover:opacity-70'
              : 'border-th-border hover:bg-th-surface active:scale-[0.99]'
          }`}
        >
          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${done ? 'border-th-btn bg-th-btn' : 'border-th-border'}`}>
            {done && (
              <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
                <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="flex flex-1 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-sm font-medium ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>
                {motion.name}
              </p>
              {motion.swells.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {motion.swells.map(s => (
                    <span
                      key={s.id}
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className={`shrink-0 text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>
              {motion.default_points}pts
            </span>
          </div>
        </button>
        <button
          onClick={() => setEditingId(motion.id)}
          className="shrink-0 px-2 py-3 text-base leading-none text-th-faint transition-colors hover:text-th-muted"
          aria-label="Edit motion"
        >
          ···
        </button>
      </div>
    )
  }

  const dateHeader = (
    <div className="mb-8 flex items-end justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-th-text">{today}</h1>
      <div className="text-right">
        <p className="text-2xl font-semibold leading-none text-th-text">{localPoints}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-th-muted">pts today</p>
      </div>
    </div>
  )

  const progressBar = (
    <div className="mb-6 rounded-lg border border-th-border p-4">
      <div className="mb-2 flex justify-between text-xs text-th-muted">
        <span>Daily progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="mb-3 rounded-full bg-th-surface" style={{ height: '6px' }}>
        <div
          className="h-full rounded-full bg-th-btn transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-th-faint">
        <span>{localPoints} pts earned</span>
        {editingGoal ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              min="1"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onBlur={commitGoal}
              onKeyDown={e => { if (e.key === 'Enter') commitGoal(); if (e.key === 'Escape') { setGoalInput(String(localGoal)); setEditingGoal(false) } }}
              className="w-12 rounded border border-th-border bg-th-surface px-1 py-0 text-xs text-th-text outline-none focus:border-th-focus"
            />
            <span>pt goal</span>
          </span>
        ) : (
          <button
            onClick={() => { setGoalInput(String(localGoal)); setEditingGoal(true) }}
            className="transition-colors hover:text-th-muted"
          >
            {localGoal} pt goal
          </button>
        )}
      </div>
    </div>
  )

  const celebrationOverlay = celebration && (
    <CelebrationOverlay celebration={celebration} onDone={() => setCelebration(null)} />
  )

  // Flat mode
  if (!groupsEnabled) {
    return (
      <>
        <div>
          {dateHeader}
          {progressBar}
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setHideDone(!hideDone)}
              className="text-xs text-th-faint transition-colors hover:text-th-muted"
            >
              {hideDone ? 'Show all' : 'Hide done'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {motions.map(motion => {
              if (hideDone && localDone.has(motion.id) && editingId !== motion.id) return null
              return renderMotion(motion)
            })}
          </div>
        </div>
        {celebrationOverlay}
      </>
    )
  }

  // Groups mode
  const visibleGroups = activeGroup ? groups.filter(g => g.id === activeGroup) : groups
  const showUngrouped = !activeGroup && ungroupedMotions.length > 0

  return (
    <>
      <div>
        {dateHeader}
        {progressBar}

        <div className="mb-6 flex items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-2">
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
          <button
            onClick={() => setHideDone(!hideDone)}
            className="shrink-0 text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            {hideDone ? 'Show all' : 'Hide done'}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {visibleGroups.map(group => {
            const visible = group.motions.filter(
              m => (!hideDone || !localDone.has(m.id)) || editingId === m.id,
            )
            if (visible.length === 0) return null
            return (
              <div key={group.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: group.color }}>
                  {group.name}
                </p>
                <div className="flex flex-col gap-2">
                  {visible.map(m => renderMotion(m))}
                </div>
              </div>
            )
          })}

          {showUngrouped && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-faint">
                Other
              </p>
              <div className="flex flex-col gap-2">
                {ungroupedMotions
                  .filter(m => (!hideDone || !localDone.has(m.id)) || editingId === m.id)
                  .map(m => renderMotion(m))}
              </div>
            </div>
          )}
        </div>
      </div>
      {celebrationOverlay}
    </>
  )
}
