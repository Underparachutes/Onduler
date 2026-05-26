'use client'

import { useState } from 'react'
import { markHintSeen } from '@/app/actions/settings'

export type HintKey = 'motions' | 'swells' | 'anchors_locked' | 'anchors_unlocked' | 'settings'

type Props = {
  hintKey: HintKey
  title?: string
  children: React.ReactNode
  seen: boolean
  translucent?: boolean
}

export function HintCard({ hintKey, title, children, seen, translucent }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (seen || dismissed) return null

  return (
    <div
      className={`relative mb-4 rounded-lg border border-th-border-soft p-4 ${
        translucent ? 'bg-th-surface/60 backdrop-blur-sm' : 'bg-th-surface'
      }`}
      style={{ zIndex: 1 }}
    >
      <button
        type="button"
        onClick={() => {
          setDismissed(true)
          markHintSeen(hintKey)
        }}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-th-muted transition-colors hover:text-th-text active:scale-[0.97]"
        aria-label="Dismiss hint"
      >
        ×
      </button>
      {title && <p className="mb-1.5 pr-8 font-semibold text-th-text">{title}</p>}
      <div className="pr-8 text-sm leading-relaxed text-th-secondary">{children}</div>
    </div>
  )
}
