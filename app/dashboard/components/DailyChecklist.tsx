'use client'

import { useState, useTransition } from 'react'
import { quickLogActivity, unlogActivity } from '@/app/actions/logs'
import { setDailyGoal } from '@/app/actions/settings'
import { ActivityEditRow } from './ActivityEditRow'
import { CelebrationOverlay, type CelebrationState } from './CelebrationOverlay'

type Activity = { id: string; name: string; default_points: number }
type Domain = { id: string; name: string; color: string; activities: Activity[] }

type Props =
  | { domainsEnabled: true; domains: Domain[]; todayPoints: number; doneActivityIds: string[]; dailyGoal: number }
  | { domainsEnabled: false; activities: Activity[]; todayPoints: number; doneActivityIds: string[]; dailyGoal: number }

export function DailyChecklist(props: Props) {
  const { todayPoints, doneActivityIds, dailyGoal } = props
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)
  const [localDone, setLocalDone] = useState(() => new Set(doneActivityIds))
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

  function handleLog(activity: Activity, domainId: string | null, clientX = 0, clientY = 0) {
    const done = localDone.has(activity.id)
    if (done) {
      setLocalDone(prev => { const next = new Set(prev); next.delete(activity.id); return next })
      setLocalPoints(prev => Math.max(0, prev - activity.default_points))
      startTransition(async () => { await unlogActivity(activity.id) })
    } else {
      if ('vibrate' in navigator) navigator.vibrate(50)
      setCelebration({ x: clientX, y: clientY, type: getAnimType() })
      setLocalDone(prev => new Set([...prev, activity.id]))
      setLocalPoints(prev => prev + activity.default_points)
      startTransition(async () => { await quickLogActivity(activity.id, domainId) })
    }
  }

  function renderActivity(activity: Activity, domainId: string | null, domainColor?: string, domainName?: string) {
    if (editingId === activity.id) {
      return (
        <ActivityEditRow
          key={activity.id}
          activity={activity}
          domainId={domainId}
          onClose={() => setEditingId(null)}
        />
      )
    }

    const done = localDone.has(activity.id)
    return (
      <div key={activity.id} className="flex items-center gap-1">
        <button
          onClick={(e) => handleLog(activity, domainId, e.clientX, e.clientY)}
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
          <div className="flex flex-1 items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>
                {activity.name}
              </p>
              {domainName && domainColor && (
                <span
                  className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                  style={{ backgroundColor: domainColor }}
                >
                  {domainName}
                </span>
              )}
            </div>
            <span className={`text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>
              {activity.default_points}pts
            </span>
          </div>
        </button>
        <button
          onClick={() => setEditingId(activity.id)}
          className="shrink-0 px-2 py-3 text-base leading-none text-th-faint transition-colors hover:text-th-muted"
          aria-label="Edit activity"
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

  function commitGoal() {
    const val = parseInt(goalInput)
    if (!val || val < 1) { setGoalInput(String(localGoal)); setEditingGoal(false); return }
    setLocalGoal(val)
    setEditingGoal(false)
    startTransition(async () => { await setDailyGoal(val) })
  }

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
            className="hover:text-th-muted transition-colors"
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

  // Flat mode — domains off
  if (!props.domainsEnabled) {
    return (
      <>
        <div>
          {dateHeader}
          {progressBar}
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setHideDone(!hideDone)}
              className="text-xs text-th-faint hover:text-th-muted transition-colors"
            >
              {hideDone ? 'Show all' : 'Hide done'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {props.activities.map(activity => {
              if (hideDone && localDone.has(activity.id) && editingId !== activity.id) return null
              return renderActivity(activity, null)
            })}
          </div>
        </div>
        {celebrationOverlay}
      </>
    )
  }

  // Domain mode
  const filtered = activeDomain ? props.domains.filter(d => d.id === activeDomain) : props.domains

  return (
    <>
    <div>
      {dateHeader}
      {progressBar}

      <div className="mb-6 flex items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-2">
          {props.domains.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDomain(activeDomain === d.id ? null : d.id)}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={activeDomain === d.id ? { backgroundColor: d.color, borderColor: d.color, color: '#fff' } : {}}
            >
              <span className={activeDomain !== d.id ? 'text-th-muted' : ''}>
                {d.name.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setHideDone(!hideDone)}
          className="shrink-0 text-xs text-th-faint hover:text-th-muted transition-colors"
        >
          {hideDone ? 'Show all' : 'Hide done'}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {filtered.map(domain => {
          const activities = (domain.activities ?? []).filter(
            a => (!hideDone || !localDone.has(a.id)) || editingId === a.id,
          )
          if (activities.length === 0) return null
          return (
            <div key={domain.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: domain.color }}>
                {domain.name}
              </p>
              <div className="flex flex-col gap-2">
                {activities.map(activity =>
                  renderActivity(activity, domain.id, domain.color, domain.name)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
    {celebrationOverlay}
    </>
  )
}
