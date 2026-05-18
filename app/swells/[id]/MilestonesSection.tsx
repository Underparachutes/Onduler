'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  createMilestone,
  deleteMilestone,
  markRecurringHit,
  renameMilestone,
  setOneShotComplete,
  updateMilestone,
} from '@/app/actions/milestones'
import { cycleProgress } from '@/lib/cadence'

type Cadence = 'weekly' | 'monthly'

export type Milestone = {
  id: string
  name: string
  kind: 'recurring' | 'one_shot'
  cadence: string | null
  completedAt: string | null
  sortOrder: number
  // Enrichment fields plumbed in from the page-side aggregation. Recurring
  // waypoints linked to a motion auto-progress; unlinked recurring waypoints
  // surface a manual "Mark this cycle hit" tap.
  targetCount: number | null
  bonusPoints: number
  motionId: string | null
  motionName: string | null
  // Count toward the current cycle: motion log count if linked, hit count if
  // unlinked. cycleHit is true when the current cycle has already been
  // recorded (gates re-firing celebration / disables the manual button).
  currentCycleCount: number
  cycleHit: boolean
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
          Waypoints
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 text-2xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
            aria-label="Add waypoint"
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
          No waypoints yet. Add one to mark something you&apos;re navigating toward.
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
              ? '1 finished waypoint'
              : `${oneShotsDone.length} finished waypoints`}{' '}
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
  const [targetCount, setTargetCount] = useState('1')
  const [bonusPoints, setBonusPoints] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) { setError('Name required'); return }
    const count = kind === 'recurring' ? parseInt(targetCount) : 0
    if (kind === 'recurring' && (isNaN(count) || count <= 0)) {
      setError('Set a positive count')
      return
    }
    const bonus = parseInt(bonusPoints)
    const bonusValid = !isNaN(bonus) && bonus >= 0 ? bonus : 0
    startSave(async () => {
      const result = await createMilestone(
        swellId,
        kind,
        trimmed,
        kind === 'recurring' ? cadence : null,
        {
          targetCount: kind === 'recurring' ? count : null,
          bonusPoints: bonusValid,
        },
      )
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
                ? 'border-th-text bg-th-text text-th-bg'
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
          <label className="shrink-0 text-xs text-th-muted">×</label>
          <input
            type="number"
            min="1"
            value={targetCount}
            onChange={e => setTargetCount(e.target.value)}
            inputMode="numeric"
            className="w-14 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="shrink-0 text-xs text-th-muted">Bonus pts</label>
        <input
          type="number"
          min="0"
          value={bonusPoints}
          onChange={e => setBonusPoints(e.target.value)}
          inputMode="numeric"
          className="w-14 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
        />
        <span className="text-[10px] text-th-faint">awarded on {kind === 'recurring' ? 'each cycle hit' : 'completion'}</span>
      </div>

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

function ProgressRing({
  ratio,
  hit,
  color,
}: {
  ratio: number
  hit: boolean
  color: string
}) {
  // Compact ring — 18px outer, 2px stroke. SVG arc filled by stroke-dasharray
  // so we don't need a separate Path.
  const size = 18
  const stroke = 2
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, ratio)) * circumference
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-th-border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        // Start the arc at 12 o'clock (top), grow clockwise.
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        opacity={hit ? 1 : 0.85}
      />
    </svg>
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
  const target = milestone.targetCount ?? 0
  const prog = cycleProgress(milestone.currentCycleCount, target > 0 ? target : 1)
  const hasTarget = target > 0
  const isLinked = milestone.motionId !== null
  const [marking, startMark] = useTransition()

  function handleMark() {
    if (milestone.cycleHit || isLinked || marking) return
    startMark(async () => {
      await markRecurringHit(milestone.id, swellId)
    })
  }

  // Sub-label: "via {motion}" when linked; otherwise just the cadence.
  const subLabel = isLinked
    ? `${milestone.cadence ?? 'weekly'} · via ${milestone.motionName ?? 'motion'}`
    : (milestone.cadence ?? 'weekly')

  return (
    <li className="flex items-center gap-3 px-1 py-2">
      {hasTarget ? (
        <ProgressRing ratio={prog.ratio} hit={prog.hit} color={swellColor} />
      ) : (
        <span
          aria-hidden
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: swellColor, opacity: 0.55 }}
        />
      )}
      <div className="min-w-0 flex-1">
        <MilestoneRowName milestone={milestone} swellId={swellId} />
        <p className="text-[10px] uppercase tracking-widest text-th-faint">
          {subLabel}
          {hasTarget && (
            <span className="ml-1 text-th-faint">
              · {prog.current}/{prog.target}
            </span>
          )}
        </p>
      </div>
      {/* Manual mark-cycle-hit for unlinked recurring (ADR 0004 §7 (c)).
          Linked recurring auto-progresses from logs. */}
      {!isLinked && hasTarget && (
        <button
          type="button"
          onClick={handleMark}
          disabled={milestone.cycleHit || marking}
          className="rounded-md border border-th-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-th-muted transition-colors hover:bg-th-surface disabled:opacity-40 active:scale-[0.97]"
        >
          {milestone.cycleHit ? 'Hit' : 'Mark'}
        </button>
      )}
      <FlipKindAction milestoneId={milestone.id} swellId={swellId} kind="recurring" />
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
      <FlipKindAction milestoneId={milestone.id} swellId={swellId} kind="one_shot" />
      <DeleteAction milestoneId={milestone.id} swellId={swellId} />
    </li>
  )
}

function FlipKindAction({
  milestoneId,
  swellId,
  kind,
}: {
  milestoneId: string
  swellId: string
  kind: 'recurring' | 'one_shot'
}) {
  const [, startFlip] = useTransition()
  // Flipping clears the inactive kind's fields server-side (cadence + target_count
  // when going to one_shot; completed_at when going to recurring). bonus_points
  // and motion_id survive.
  const nextKind = kind === 'recurring' ? 'one_shot' : 'recurring'
  function handle() {
    startFlip(async () => {
      await updateMilestone(milestoneId, swellId, { kind: nextKind })
    })
  }
  return (
    <button
      type="button"
      onClick={handle}
      title={`Make ${nextKind === 'one_shot' ? 'one-shot' : 'recurring'}`}
      className="shrink-0 text-[11px] text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
    >
      ↔
    </button>
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
