'use client'

import { useState, useTransition } from 'react'
import { quickLogActivity } from '@/app/actions/logs'

type Activity = { id: string; name: string; default_points: number }
type Domain = { id: string; name: string; color: string; activities: Activity[] }

const DAILY_GOAL = 20

export function DailyChecklist({
  domains,
  todayPoints,
  doneActivityIds,
}: {
  domains: Domain[]
  todayPoints: number
  doneActivityIds: string[]
}) {
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)
  const [localDone, setLocalDone] = useState(() => new Set(doneActivityIds))
  const [, startTransition] = useTransition()
  const [localPoints, setLocalPoints] = useState(todayPoints)

  const filtered = activeDomain ? domains.filter(d => d.id === activeDomain) : domains
  const progress = Math.min((localPoints / DAILY_GOAL) * 100, 100)

  function handleLog(activity: Activity, domainId: string) {
    if (localDone.has(activity.id)) return
    setLocalDone(prev => new Set([...prev, activity.id]))
    setLocalPoints(prev => prev + activity.default_points)
    startTransition(async () => {
      await quickLogActivity(activity.id, domainId)
    })
  }

  return (
    <div>
      {/* Progress bar */}
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
          <span>{DAILY_GOAL} pt goal</span>
        </div>
      </div>

      {/* Domain chips + hide done */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-2">
          {domains.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDomain(activeDomain === d.id ? null : d.id)}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={
                activeDomain === d.id
                  ? { backgroundColor: d.color, borderColor: d.color, color: '#fff' }
                  : {}
              }
              // eslint-disable-next-line tailwindcss/no-custom-classname
              data-inactive={activeDomain !== d.id ? '' : undefined}
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

      {/* Activity list */}
      <div className="flex flex-col gap-6">
        {filtered.map(domain => {
          const activities = (domain.activities ?? []).filter(
            a => !hideDone || !localDone.has(a.id),
          )
          if (activities.length === 0) return null

          return (
            <div key={domain.id}>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-widest"
                style={{ color: domain.color }}
              >
                {domain.name}
              </p>
              <div className="flex flex-col gap-2">
                {activities.map(activity => {
                  const done = localDone.has(activity.id)
                  return (
                    <button
                      key={activity.id}
                      onClick={() => handleLog(activity, domain.id)}
                      disabled={done}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                        done
                          ? 'border-th-border opacity-50'
                          : 'border-th-border hover:bg-th-surface active:scale-[0.99]'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                          done ? 'border-th-btn bg-th-btn' : 'border-th-border'
                        }`}
                      >
                        {done && (
                          <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
                            <path
                              d="M1 5l3.5 3.5L11 1"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>
                            {activity.name}
                          </p>
                          <span
                            className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                            style={{ backgroundColor: domain.color }}
                          >
                            {domain.name}
                          </span>
                        </div>
                        <span className={`text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>
                          {activity.default_points}pts
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
