'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  createMilestone,
  deleteMilestone,
  renameMilestone,
  setOneShotComplete,
} from '@/app/actions/milestones'

type Cadence = 'weekly' | 'monthly'

export type Milestone = {
  id: string
  name: string
  kind: 'recurring' | 'one_shot'
  cadence: string | null
  completedAt: string | null
  sortOrder: number
}

type Props = {
  swellId: string
  swellColor: string
  milestones: Milestone[]
}

export function MilestonesSection({ swellId, swellColor, milestones }: Props) {
  const [adding, setAdding] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const recurring = milestones.filter(m => m.kind === 'recurring')
  const oneShotsAll = milestones.filter(m => m.kind === 'one_shot')
  const oneShotsActive = oneShotsAll.filter(m => m.completedAt === null)
  const oneShotsDone = oneShotsAll.filter(m => m.completedAt !== null)

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-th-muted">
          Milestones
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 text-2xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
            aria-label="Add milestone"
          >
            +
          </button>
        )}
      </div>

      {adding && (
        <AddMilestoneForm
          swellId={swellId}
          onClose={() => setAdding(false)}
        />
      )}

      {milestones.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-th-border px-4 py-3 text-xs text-th-faint">
          No milestones yet. Add one to mark a goal or a steady rhythm.
        </p>
      )}

      {recurring.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-th-faint">Recurring</p>
          <ul className="flex flex-col">
            {recurring.map(m => (
              <RecurringRow
                key={m.id}
                milestone={m}
                swellId={swellId}
                swellColor={swellColor}
              />
            ))}
          </ul>
        </div>
      )}

      {oneShotsActive.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-th-faint">One-shots</p>
          <ul className="flex flex-col">
            {oneShotsActive.map(m => (
              <OneShotRow
                key={m.id}
                milestone={m}
                swellId={swellId}
                swellColor={swellColor}
              />
            ))}
          </ul>
        </div>
      )}

      {oneShotsDone.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCompleted(v => !v)}
            className="text-[11px] text-th-faint transition-colors hover:text-th-muted"
          >
            {oneShotsDone.length === 1
              ? '1 finished milestone'
              : `${oneShotsDone.length} finished milestones`}{' '}
            {showCompleted ? '↑' : '↓'}
          </button>
          {showCompleted && (
            <ul className="mt-2 flex flex-col">
              {oneShotsDone.map(m => (
                <OneShotRow
                  key={m.id}
                  milestone={m}
                  swellId={swellId}
                  swellColor={swellColor}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function AddMilestoneForm({ swellId, onClose }: { swellId: string; onClose: () => void }) {
  const [kind, setKind] = useState<'recurring' | 'one_shot'>('recurring')
  const [cadence, setCadence] = useState<Cadence>('weekly')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) { setError('Name required'); return }
    startSave(async () => {
      const result = await createMilestone(swellId, kind, trimmed, kind === 'recurring' ? cadence : null)
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-lg border border-th-border p-3">
      <div className="flex gap-1">
        {(['recurring', 'one_shot'] as const).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
              kind === k
                ? 'border-th-text bg-th-text text-th-btn-text'
                : 'border-th-border text-th-muted hover:bg-th-surface'
            }`}
          >
            {k === 'recurring' ? 'Recurring' : 'One-shot'}
          </button>
        ))}
      </div>

      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={kind === 'recurring' ? 'e.g. publish a piece' : 'e.g. start a band'}
        className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus placeholder:text-th-faint"
      />

      {kind === 'recurring' && (
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs text-th-muted">Cadence</label>
          <select
            value={cadence}
            onChange={e => setCadence(e.target.value as Cadence)}
            className="flex-1 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-th-btn px-3 py-2 text-xs font-medium text-th-btn-text disabled:opacity-40"
        >
          {saving ? 'Adding…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-th-faint transition-colors hover:text-th-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function MilestoneRowName({
  milestone,
  swellId,
  completed,
  strikeThrough,
}: {
  milestone: Milestone
  swellId: string
  completed?: boolean
  strikeThrough?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(milestone.name)
  const [, startSave] = useTransition()

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (!trimmed || trimmed === milestone.name) { setDraft(milestone.name); return }
    startSave(async () => { await renameMilestone(milestone.id, trimmed, swellId) })
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); setDraft(milestone.name); setEditing(false) }
        }}
        className="min-w-0 flex-1 rounded-md border border-th-focus bg-th-surface px-1 py-0.5 text-sm text-th-text outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(milestone.name); setEditing(true) }}
      className={`min-w-0 flex-1 truncate text-left text-sm transition-colors hover:text-th-text ${
        completed || strikeThrough ? 'text-th-faint line-through' : 'text-th-text'
      }`}
    >
      {milestone.name}
    </button>
  )
}

function RecurringRow({
  milestone,
  swellId,
  swellColor,
}: {
  milestone: Milestone
  swellId: string
  swellColor: string
}) {
  return (
    <li className="flex items-center gap-3 px-1 py-2">
      <span
        aria-hidden
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: swellColor, opacity: 0.55 }}
      />
      <div className="min-w-0 flex-1">
        <MilestoneRowName milestone={milestone} swellId={swellId} />
        <p className="text-[10px] uppercase tracking-widest text-th-faint">
          {milestone.cadence ?? 'weekly'}
        </p>
      </div>
      <DeleteAction milestoneId={milestone.id} swellId={swellId} />
    </li>
  )
}

function OneShotRow({
  milestone,
  swellId,
  swellColor,
}: {
  milestone: Milestone
  swellId: string
  swellColor: string
}) {
  const completed = milestone.completedAt !== null
  const [, startToggle] = useTransition()

  function toggle() {
    startToggle(async () => {
      await setOneShotComplete(milestone.id, !completed, swellId)
    })
  }

  return (
    <li className="flex items-center gap-3 px-1 py-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        className="shrink-0 transition-transform active:scale-95"
      >
        <span
          className="block h-4 w-4 rounded-full border-2"
          style={{
            borderColor: swellColor,
            backgroundColor: completed ? swellColor : 'transparent',
          }}
        />
      </button>
      <MilestoneRowName milestone={milestone} swellId={swellId} completed={completed} />
      <DeleteAction milestoneId={milestone.id} swellId={swellId} />
    </li>
  )
}

function DeleteAction({ milestoneId, swellId }: { milestoneId: string; swellId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [, startDelete] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function handle() {
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => setConfirming(false), 3000)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    startDelete(async () => { await deleteMilestone(milestoneId, swellId) })
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={`shrink-0 text-[11px] transition-colors ${
        confirming ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'
      }`}
    >
      {confirming ? 'Confirm' : 'Delete'}
    </button>
  )
}
