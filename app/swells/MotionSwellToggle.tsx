'use client'

import { useState, useTransition } from 'react'
import { setMotionSwells } from '@/app/actions/motions'

type Swell = { id: string; name: string; color: string }

export function MotionSwellToggle({
  motionId,
  allSwells,
  currentSwellIds,
}: {
  motionId: string
  allSwells: Swell[]
  currentSwellIds: string[]
}) {
  const [active, setActive] = useState(new Set(currentSwellIds))
  const [isPending, startTransition] = useTransition()

  function toggle(swellId: string) {
    const next = new Set(active)
    next.has(swellId) ? next.delete(swellId) : next.add(swellId)
    setActive(next)
    startTransition(async () => {
      await setMotionSwells(motionId, Array.from(next).map(id => ({ swellId: id, weight: 1 })))
    })
  }

  return (
    <div className="flex flex-wrap gap-1">
      {allSwells.map(swell => {
        const on = active.has(swell.id)
        return (
          <button
            key={swell.id}
            onClick={() => toggle(swell.id)}
            disabled={isPending}
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
            style={
              on
                ? { backgroundColor: swell.color, color: 'white' }
                : { border: `1px solid ${swell.color}`, color: swell.color, backgroundColor: 'transparent' }
            }
          >
            {swell.name}
          </button>
        )
      })}
    </div>
  )
}
