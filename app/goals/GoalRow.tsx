'use client'

import { useState, useActionState } from 'react'
import { updateGoal, deleteGoal } from '@/app/actions/goals'
import { ActivityAssignSelect } from './ActivityAssignSelect'

type Activity = { id: string; name: string; default_points: number; goal_id: string | null }
type Goal = { id: string; name: string }

type Props = {
  goal: { id: string; name: string; color: string; activities: Activity[] }
  goalPts: number
  ptsToday: Map<string, number>
  goalStubs: Goal[]
}

export function GoalRow({ goal, goalPts, ptsToday, goalStubs }: Props) {
  const [editing, setEditing] = useState(false)
  const updateById = updateGoal.bind(null, goal.id)
  const [state, action, isPending] = useActionState(updateById, null)
  const deleteById = deleteGoal.bind(null, goal.id)

  if (editing) {
    return (
      <div>
        <form action={action} className="mb-2 flex items-center gap-2">
          <input
            type="text"
            name="name"
            defaultValue={goal.name}
            required
            autoFocus
            className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
          />
          <input
            type="color"
            name="color"
            defaultValue={goal.color}
            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-th-btn px-3 py-2 text-xs font-medium text-th-btn-text disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-th-faint hover:text-th-muted transition-colors"
          >
            Cancel
          </button>
        </form>
        {state?.error && <p className="mb-2 text-xs text-red-500">{state.error}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: goal.color }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: goal.color }}>
            {goal.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-th-faint">{goalPts} pts today</span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            Edit
          </button>
          <form action={deleteById}>
            <button type="submit" className="text-xs text-th-faint transition-colors hover:text-red-500">
              Delete
            </button>
          </form>
        </div>
      </div>

      {goal.activities.length === 0 ? (
        <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
          No activities assigned yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {goal.activities.map(activity => (
            <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-th-text truncate">{activity.name}</p>
                <p className="text-xs text-th-faint">{activity.default_points} pts</p>
              </div>
              {ptsToday.get(activity.id) ? (
                <span className="text-xs font-medium text-th-secondary shrink-0">
                  +{ptsToday.get(activity.id)} today
                </span>
              ) : null}
              <ActivityAssignSelect
                activityId={activity.id}
                currentGoalId={goal.id}
                goals={goalStubs}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
