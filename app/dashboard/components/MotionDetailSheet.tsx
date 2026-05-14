'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { quickLogMotion, unlogMotion } from '@/app/actions/logs'
import { createSubmotion, hideMotion } from '@/app/actions/motions'

type Swell = { id: string; name: string; color: string }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: Swell[] }
type Submotion = { id: string; name: string; default_points: number; default_hours: number }

type Props = {
  motion: Motion
  submotions: Submotion[]
  doneMotionIds: string[]
  onClose: () => void
  onPointsDelta: (pts: number) => void
  onHide: (id: string) => void
}

export function MotionDetailSheet({ motion, submotions, doneMotionIds, onClose, onPointsDelta, onHide }: Props) {
  const router = useRouter()
  const [localDone, setLocalDone] = useState(() => new Set(doneMotionIds))
  const [, startTransition] = useTransition()
  const [addName, setAddName] = useState('')
  const [addPts, setAddPts] = useState(1)
  const [addHrs, setAddHrs] = useState(1.0)
  const [isAdding, startAdding] = useTransition()

  function handleSubLog(sub: Submotion) {
    const done = localDone.has(sub.id)
    if (done) {
      setLocalDone(prev => { const n = new Set(prev); n.delete(sub.id); return n })
      onPointsDelta(-sub.default_points)
      startTransition(async () => { await unlogMotion(sub.id) })
    } else {
      setLocalDone(prev => new Set([...prev, sub.id]))
      onPointsDelta(sub.default_points)
      startTransition(async () => { await quickLogMotion(sub.id) })
    }
  }

  function handleHide() {
    startTransition(async () => {
      await hideMotion(motion.id)
      onHide(motion.id)
      onClose()
    })
  }

  function handleAdd() {
    const name = addName.trim()
    if (!name) return
    startAdding(async () => {
      await createSubmotion(motion.id, name, addPts, addHrs)
      setAddName('')
      setAddPts(1)
      setAddHrs(1.0)
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-th-bg px-6 pt-4 pb-10 shadow-xl">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-th-border" />

        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-th-text">{motion.name}</h2>
          <button onClick={onClose} className="mt-0.5 shrink-0 text-th-faint transition-colors hover:text-th-muted">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" />
            </svg>
          </button>
        </div>
        <p className="mb-6 text-sm text-th-muted">
          {motion.default_points} {motion.default_points === 1 ? 'pt' : 'pts'} · {motion.default_hours} hr
        </p>

        {submotions.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Submotions</p>
            <div className="flex flex-col gap-2">
              {submotions.map(sub => {
                const done = localDone.has(sub.id)
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSubLog(sub)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      done ? 'border-th-border opacity-50' : 'border-th-border hover:bg-th-surface active:scale-[0.99]'
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${done ? 'border-th-btn bg-th-btn' : 'border-th-border'}`}>
                      {done && (
                        <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
                          <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`flex-1 text-sm ${done ? 'line-through text-th-muted' : 'text-th-text'}`}>{sub.name}</span>
                    <span className={`text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>
                      +{sub.default_points}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">
            Add submotion
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Name"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-th-muted">Pts</label>
                <input
                  type="number"
                  min="1"
                  value={addPts}
                  onChange={e => setAddPts(parseInt(e.target.value) || 1)}
                  className="w-14 rounded-lg border border-th-border bg-th-surface px-2 py-2 text-sm text-th-text outline-none focus:border-th-focus"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-th-muted">Hrs</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={addHrs}
                  onChange={e => setAddHrs(parseFloat(e.target.value) || 0.25)}
                  className="w-14 rounded-lg border border-th-border bg-th-surface px-2 py-2 text-sm text-th-text outline-none focus:border-th-focus"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!addName.trim() || isAdding}
                className="flex-1 rounded-lg bg-th-btn px-3 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
              >
                {isAdding ? '…' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-th-border pt-4">
          <button
            onClick={handleHide}
            className="text-sm text-th-faint transition-colors hover:text-th-muted"
          >
            Hide from checklist
          </button>
        </div>
      </div>
    </div>
  )
}
