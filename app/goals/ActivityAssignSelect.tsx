'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignActivityToGoal } from '@/app/actions/goals'

type Goal = { id: string; name: string }

export function ActivityAssignSelect({
  activityId,
  currentGoalId,
  goals,
}: {
  activityId: string
  currentGoalId: string | null
  goals: Goal[]
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <select
      value={currentGoalId ?? ''}
      disabled={isPending}
      onChange={e => {
        const goalId = e.target.value || null
        startTransition(async () => {
          await assignActivityToGoal(activityId, goalId)
          router.refresh()
        })
      }}
      className="rounded border border-th-border bg-th-surface px-2 py-1 text-xs text-th-muted outline-none focus:border-th-focus disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {goals.map(g => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  )
}
