'use client'

import { useState, useTransition } from 'react'
import { logActivity } from '@/app/actions/logs'

type Difficulty = 'soft' | 'medium' | 'hard'

export function LogActivityButton({ activityId, domainId }: { activityId: string; domainId: string }) {
  const [open, setOpen] = useState(false)
  const [logged, setLogged] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLog(difficulty: Difficulty) {
    startTransition(async () => {
      await logActivity(activityId, domainId, difficulty)
      setLogged(true)
      setOpen(false)
      setTimeout(() => setLogged(false), 2000)
    })
  }

  if (logged) {
    return <span className="text-xs text-green-500">✓</span>
  }

  if (open) {
    return (
      <div className="flex items-center gap-1">
        {(['soft', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button
            key={d}
            onClick={() => handleLog(d)}
            disabled={isPending}
            className="rounded px-2 py-1 text-xs font-medium capitalize text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setOpen(false)}
          className="ml-1 text-xs text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="text-xs text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      Log
    </button>
  )
}
