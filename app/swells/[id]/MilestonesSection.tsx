'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  createMilestone,
  deleteMilestone,
  markRecurringHit,
  resetCycleHits,
  renameMilestone,
  reorderMilestones,
  setOneShotComplete,
  updateMilestone,
} from '@/app/actions/milestones'
import { cycleProgress } from '@/lib/cadence'
import { CelebrationOverlay, type CelebrationState } from '@/app/dashboard/components/CelebrationOverlay'

type Cadence = 'weekly' | 'monthly'

export type Milestone = {
  id: string
  name: string
  kind: 'recurring' | 'one_shot'
  cadence: string | null
  completedAt: string | null
  sortOrder: number
  targetCount: number | null
  bonusPoints: number
  motionId: string | null
  motionName: string | null
  currentCycleCount: number
  cycleHit: boolean
}

function cadenceMax(cadence: Cadence): number {
  return cadence === 'weekly' ? 7 : 31
}

type SwellMotion = { id: string; name: string }

type Props = {
  swellId: string
  swellColor: string
  milestones: Milestone[]
  swellMotions: SwellMotion[]
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- dnd-kit's SyntheticListenerMap uses Function
const DragHandle = ({ listeners }: { listeners?: Record<string, Function> }) => (
  <div
    {...listeners}
    className="shrink-0 cursor-grab px-2 py-3 text-th-faint transition-colors hover:text-th-muted"
    style={{ touchAction: 'none' }}
    aria-label="Drag to reorder"
  >
    <svg viewBox="0 0 10 10" fill="currentColor" className="h-2.5 w-2.5">
      <circle cx="2" cy="2" r="1.1" /><circle cx="5" cy="2" r="1.1" /><circle cx="8" cy="2" r="1.1" />
      <circle cx="2" cy="5" r="1.1" /><circle cx="5" cy="5" r="1.1" /><circle cx="8" cy="5" r="1.1" />
      <circle cx="2" cy="8" r="1.1" /><circle cx="5" cy="8" r="1.1" /><circle cx="8" cy="8" r="1.1" />
    </svg>
  </div>
)

function DroppableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-shadow ${isOver ? 'ring-1 ring-th-focus/40' : ''}`}
    >
      {children}
    </div>
  )
}

export function MilestonesSection({ swellId, swellColor, milestones, swellMotions }: Props) {
  const [adding, setAdding] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)

  function handleCelebrate(y: number) {
    setCelebration({ x: 0, y, colors: [swellColor], rowBottom: y })
  }

  const recurring = milestones.filter(m => m.kind === 'recurring')
  const oneShotsAll = milestones.filter(m => m.kind === 'one_shot')
  const oneShotsActive = oneShotsAll.filter(m => m.completedAt === null)
  const oneShotsDone = oneShotsAll.filter(m => m.completedAt !== null)

  const [orderedRecurring, setOrderedRecurring] = useState(recurring)
  const [orderedOneShotsActive, setOrderedOneShotsActive] = useState(oneShotsActive)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync prop → local state for drag reorder
  useEffect(() => { setOrderedRecurring(recurring); setOrderedOneShotsActive(oneShotsActive) }, [milestones]) // eslint-disable-line react-hooks/exhaustive-deps -- sync from milestones prop

  const recurringRef = useRef(orderedRecurring)
  const oneShotRef = useRef(orderedOneShotsActive)
  useEffect(() => { recurringRef.current = orderedRecurring }, [orderedRecurring])
  useEffect(() => { oneShotRef.current = orderedOneShotsActive }, [orderedOneShotsActive])

  const [, startReorder] = useTransition()
  const [dragging, setDragging] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function findContainer(id: string): 'recurring' | 'oneShot' | null {
    if (id === 'section-recurring') return 'recurring'
    if (id === 'section-oneShot') return 'oneShot'
    if (recurringRef.current.some(m => m.id === id)) return 'recurring'
    if (oneShotRef.current.some(m => m.id === id)) return 'oneShot'
    return null
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    const from = findContainer(activeId)
    const to = findContainer(overId)
    if (!from || !to || from === to) return

    const sourceArr = from === 'recurring' ? recurringRef.current : oneShotRef.current
    const targetArr = from === 'recurring' ? oneShotRef.current : recurringRef.current
    const item = sourceArr.find(m => m.id === activeId)
    if (!item) return

    const overIndex = targetArr.findIndex(m => m.id === overId)
    const insertAt = overIndex >= 0 ? overIndex : targetArr.length
    const newSource = sourceArr.filter(m => m.id !== activeId)
    const newTarget = [...targetArr.slice(0, insertAt), item, ...targetArr.slice(insertAt)]

    if (from === 'recurring') {
      recurringRef.current = newSource
      oneShotRef.current = newTarget
      setOrderedRecurring(newSource)
      setOrderedOneShotsActive(newTarget)
    } else {
      oneShotRef.current = newSource
      recurringRef.current = newTarget
      setOrderedOneShotsActive(newSource)
      setOrderedRecurring(newTarget)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(false)
    const { active, over } = event
    if (!over) {
      recurringRef.current = recurring
      oneShotRef.current = oneShotsActive
      setOrderedRecurring(recurring)
      setOrderedOneShotsActive(oneShotsActive)
      return
    }
    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) {
      // Detect cross-container even when active===over (dropped on container itself)
      const wasRecurring = recurring.some(m => m.id === activeId)
      const nowRecurring = recurringRef.current.some(m => m.id === activeId)
      if (wasRecurring && !nowRecurring) {
        startReorder(async () => { await updateMilestone(activeId, swellId, { kind: 'one_shot' }) })
      } else if (!wasRecurring && nowRecurring) {
        startReorder(async () => { await updateMilestone(activeId, swellId, { kind: 'recurring' }) })
      }
      return
    }

    const container = findContainer(activeId)
    if (container === 'recurring' && recurringRef.current.some(m => m.id === overId)) {
      const arr = recurringRef.current
      const next = arrayMove(arr, arr.findIndex(m => m.id === activeId), arr.findIndex(m => m.id === overId))
      recurringRef.current = next
      setOrderedRecurring(next)
      startReorder(async () => { await reorderMilestones(next.map(m => m.id), swellId) })
    } else if (container === 'oneShot' && oneShotRef.current.some(m => m.id === overId)) {
      const arr = oneShotRef.current
      const next = arrayMove(arr, arr.findIndex(m => m.id === activeId), arr.findIndex(m => m.id === overId))
      oneShotRef.current = next
      setOrderedOneShotsActive(next)
      startReorder(async () => { await reorderMilestones(next.map(m => m.id), swellId) })
    }

    const wasRecurring = recurring.some(m => m.id === activeId)
    const nowRecurring = recurringRef.current.some(m => m.id === activeId)
    if (wasRecurring && !nowRecurring) {
      startReorder(async () => { await updateMilestone(activeId, swellId, { kind: 'one_shot' }) })
    } else if (!wasRecurring && nowRecurring) {
      startReorder(async () => { await updateMilestone(activeId, swellId, { kind: 'recurring' }) })
    }
  }

  function handleDragCancel() {
    setDragging(false)
    recurringRef.current = recurring
    oneShotRef.current = oneShotsActive
    setOrderedRecurring(recurring)
    setOrderedOneShotsActive(oneShotsActive)
  }

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => setDragging(true)}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {dragging && <div className="fixed inset-0 z-40" />}

        {(orderedRecurring.length > 0 || dragging) && (
          <DroppableSection id="section-recurring">
            <div className="mb-4">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-th-faint">Recurring</p>
              <SortableContext items={orderedRecurring.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col">
                  {orderedRecurring.map(m => (
                    <SortableRecurringRow
                      key={m.id}
                      milestone={m}
                      swellId={swellId}
                      swellColor={swellColor}
                      swellMotions={swellMotions}
                      onCelebrate={handleCelebrate}
                    />
                  ))}
                </ul>
              </SortableContext>
              {orderedRecurring.length === 0 && dragging && (
                <p className="rounded-lg border border-dashed border-th-border py-3 text-center text-[11px] text-th-faint">
                  Drop here to make recurring
                </p>
              )}
            </div>
          </DroppableSection>
        )}

        {(orderedOneShotsActive.length > 0 || dragging) && (
          <DroppableSection id="section-oneShot">
            <div className="mb-3">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-th-faint">One-shots</p>
              <SortableContext items={orderedOneShotsActive.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col">
                  {orderedOneShotsActive.map(m => (
                    <SortableOneShotRow
                      key={m.id}
                      milestone={m}
                      swellId={swellId}
                      swellColor={swellColor}
                      onCelebrate={handleCelebrate}
                    />
                  ))}
                </ul>
              </SortableContext>
              {orderedOneShotsActive.length === 0 && dragging && (
                <p className="rounded-lg border border-dashed border-th-border py-3 text-center text-[11px] text-th-faint">
                  Drop here to make one-shot
                </p>
              )}
            </div>
          </DroppableSection>
        )}
      </DndContext>

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
                <SortableOneShotRow
                  key={m.id}
                  milestone={m}
                  swellId={swellId}
                  swellColor={swellColor}
                  disableDrag
                  onCelebrate={handleCelebrate}
                />
              ))}
            </ul>
          )}
        </div>
      )}
      {celebration && (
        <CelebrationOverlay celebration={celebration} onDone={() => setCelebration(null)} />
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
    const max = cadenceMax(cadence)
    const count = kind === 'recurring' ? Math.min(parseInt(targetCount), max) : 0
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
            max={cadenceMax(cadence)}
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
}: {
  milestone: Milestone
  swellId: string
  completed?: boolean
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
        completed ? 'text-th-faint line-through' : 'text-th-text'
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
  const size = 18
  const stroke = 2
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, ratio)) * circumference
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="pointer-events-none">
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
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        opacity={hit ? 1 : 0.85}
      />
    </svg>
  )
}

function SortableRecurringRow({
  milestone,
  swellId,
  swellColor,
  swellMotions,
  onCelebrate,
}: {
  milestone: Milestone
  swellId: string
  swellColor: string
  swellMotions: SwellMotion[]
  onCelebrate: (y: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: milestone.id })

  const target = milestone.targetCount ?? 0
  const prog = cycleProgress(milestone.currentCycleCount, target > 0 ? target : 1)
  const hasTarget = target > 0
  const [, startHit] = useTransition()
  const [editing, setEditing] = useState(false)
  const editRef = useRef<HTMLLIElement>(null)
  const [cadence, setCadence] = useState<'weekly' | 'monthly'>((milestone.cadence as 'weekly' | 'monthly') ?? 'weekly')
  const [targetDraft, setTargetDraft] = useState(String(milestone.targetCount ?? 1))
  const [bonusDraft, setBonusDraft] = useState(String(milestone.bonusPoints ?? 0))
  const [, startSave] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [, startDelete] = useTransition()
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startFlip] = useTransition()

  useEffect(() => {
    if (!editing) return
    function handleClick(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditing(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editing])

  function handleHitClick(e: React.MouseEvent) {
    if (!milestone.cycleHit) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      onCelebrate(rect.bottom)
    }
    startHit(async () => {
      if (milestone.cycleHit) {
        await resetCycleHits(milestone.id, swellId)
      } else {
        await markRecurringHit(milestone.id, swellId)
      }
    })
  }

  function persist(patch: { cadence?: 'weekly' | 'monthly'; targetCount?: number; bonusPoints?: number }) {
    startSave(async () => {
      await updateMilestone(milestone.id, swellId, patch)
    })
  }

  function commitCadence(next: 'weekly' | 'monthly') {
    setCadence(next)
    if (next !== milestone.cadence) persist({ cadence: next })
  }

  function commitTarget() {
    const max = cadenceMax(cadence)
    const raw = parseInt(targetDraft)
    if (isNaN(raw) || raw <= 0) { setTargetDraft(String(milestone.targetCount ?? 1)); return }
    const count = Math.min(raw, max)
    if (count !== raw) setTargetDraft(String(count))
    if (count !== milestone.targetCount) persist({ targetCount: count })
  }

  function commitBonus() {
    const bonus = parseInt(bonusDraft)
    const val = !isNaN(bonus) && bonus >= 0 ? bonus : 0
    if (val !== milestone.bonusPoints) persist({ bonusPoints: val })
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      deleteTimer.current = setTimeout(() => setConfirmingDelete(false), 3000)
      return
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current)
    startDelete(async () => { await deleteMilestone(milestone.id, swellId) })
  }

  function handleFlipKind() {
    startFlip(async () => {
      await updateMilestone(milestone.id, swellId, { kind: 'one_shot' })
    })
  }

  const subLabel = milestone.motionId
    ? `${milestone.cadence ?? 'weekly'} · via ${milestone.motionName ?? 'motion'}`
    : (milestone.cadence ?? 'weekly')

  if (editing) {
    return (
      <li
        ref={(node) => { setNodeRef(node); (editRef as React.MutableRefObject<HTMLLIElement | null>).current = node }}
        {...attributes}
        suppressHydrationWarning
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className="flex flex-col gap-2 rounded-lg border border-th-border px-3 py-3"
      >
        <div className="flex items-center gap-1">
          <MilestoneRowName milestone={milestone} swellId={swellId} />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 p-1 text-th-faint transition-colors hover:text-th-muted"
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        {swellMotions.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-th-muted">Motion</label>
            <select
              value={milestone.motionId ?? ''}
              onChange={e => {
                const val = e.target.value || null
                startSave(async () => { await updateMilestone(milestone.id, swellId, { motionId: val }) })
              }}
              className="flex-1 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
            >
              <option value="">None (manual)</option>
              {swellMotions.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
        {milestone.motionId && (
          <p className="text-[10px] text-th-faint">
            Tracks automatically from motion logs
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-th-muted">Every</span>
          <div className="flex gap-1">
            {(['weekly', 'monthly'] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => commitCadence(c)}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  cadence === c
                    ? 'border-th-text bg-th-text text-th-bg'
                    : 'border-th-border text-th-muted hover:bg-th-surface'
                }`}
              >
                {c === 'weekly' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs text-th-muted">Times</label>
          <input
            type="number"
            min="1"
            max={cadenceMax(cadence)}
            value={targetDraft}
            onChange={e => setTargetDraft(e.target.value)}
            onBlur={commitTarget}
            inputMode="numeric"
            className="w-14 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs text-th-muted">Bonus pts</label>
          <input
            type="number"
            min="0"
            value={bonusDraft}
            onChange={e => setBonusDraft(e.target.value)}
            onBlur={commitBonus}
            inputMode="numeric"
            className="w-14 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
        <div className="flex items-center gap-2 border-t border-th-border pt-2">
          <button
            type="button"
            onClick={handleFlipKind}
            className="text-[11px] text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
          >
            Make one-shot
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={`ml-auto text-[11px] transition-colors active:scale-[0.97] ${
              confirmingDelete ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'
            }`}
          >
            {confirmingDelete ? 'Tap again to delete' : 'Delete'}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      suppressHydrationWarning
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-1 select-none outline-none"
    >
      {milestone.motionId ? (
        <span className="shrink-0 px-1 py-2">
          {milestone.cycleHit ? (
            <span
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
              style={{ backgroundColor: swellColor }}
            >
              <svg viewBox="0 0 12 10" fill="none" className="h-2.5 w-2.5">
                <path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : (
            <ProgressRing ratio={hasTarget ? prog.ratio : 0} hit={false} color={swellColor} />
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleHitClick}
          className="shrink-0 px-1 py-2 transition-transform active:scale-90"
          aria-label={milestone.cycleHit ? 'Reset cycle' : 'Add one hit'}
        >
          {milestone.cycleHit ? (
            <span
              className="pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded-full"
              style={{ backgroundColor: swellColor }}
            >
              <svg viewBox="0 0 12 10" fill="none" className="h-2.5 w-2.5">
                <path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : (
            <ProgressRing ratio={hasTarget ? prog.ratio : 0} hit={false} color={swellColor} />
          )}
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 py-2 text-left"
      >
        <p className="truncate text-sm text-th-text">{milestone.name}</p>
        <p className="text-[10px] uppercase tracking-widest text-th-faint">
          {subLabel}
          {hasTarget && (
            <span className="ml-1 text-th-faint">
              · {prog.current}/{prog.target}
            </span>
          )}
        </p>
      </button>
      <DragHandle listeners={listeners} />
    </li>
  )
}

function SortableOneShotRow({
  milestone,
  swellId,
  swellColor,
  disableDrag,
  onCelebrate,
}: {
  milestone: Milestone
  swellId: string
  swellColor: string
  disableDrag?: boolean
  onCelebrate: (y: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: milestone.id, disabled: disableDrag })

  const completed = milestone.completedAt !== null
  const [, startToggle] = useTransition()
  const [editing, setEditing] = useState(false)
  const editRef = useRef<HTMLLIElement>(null)
  const [bonusDraft, setBonusDraft] = useState(String(milestone.bonusPoints ?? 0))
  const [, startSave] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [, startDelete] = useTransition()
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startFlip] = useTransition()

  useEffect(() => {
    if (!editing) return
    function handleClick(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditing(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editing])

  function toggle(e: React.MouseEvent) {
    if (!completed) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      onCelebrate(rect.bottom)
    }
    startToggle(async () => {
      await setOneShotComplete(milestone.id, !completed, swellId)
    })
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      deleteTimer.current = setTimeout(() => setConfirmingDelete(false), 3000)
      return
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current)
    startDelete(async () => { await deleteMilestone(milestone.id, swellId) })
  }

  function commitBonus() {
    const bonus = parseInt(bonusDraft)
    const val = !isNaN(bonus) && bonus >= 0 ? bonus : 0
    if (val !== milestone.bonusPoints) startSave(async () => { await updateMilestone(milestone.id, swellId, { bonusPoints: val }) })
  }

  function handleFlipKind() {
    startFlip(async () => {
      await updateMilestone(milestone.id, swellId, { kind: 'recurring' })
    })
  }

  if (editing) {
    return (
      <li
        ref={(node) => { setNodeRef(node); (editRef as React.MutableRefObject<HTMLLIElement | null>).current = node }}
        {...attributes}
        suppressHydrationWarning
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className="flex flex-col gap-2 rounded-lg border border-th-border px-3 py-3"
      >
        <div className="flex items-center gap-1">
          <MilestoneRowName milestone={milestone} swellId={swellId} completed={completed} />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 p-1 text-th-faint transition-colors hover:text-th-muted"
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs text-th-muted">Bonus pts</label>
          <input
            type="number"
            min="0"
            value={bonusDraft}
            onChange={e => setBonusDraft(e.target.value)}
            onBlur={commitBonus}
            inputMode="numeric"
            className="w-14 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
        <div className="flex items-center gap-2 border-t border-th-border pt-2">
          <button
            type="button"
            onClick={handleFlipKind}
            className="text-[11px] text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
          >
            Make recurring
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={`ml-auto text-[11px] transition-colors active:scale-[0.97] ${
              confirmingDelete ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'
            }`}
          >
            {confirmingDelete ? 'Tap again to delete' : 'Delete'}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      suppressHydrationWarning
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-1 select-none outline-none"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        className="shrink-0 px-1 py-2 transition-transform active:scale-95"
      >
        <span
          className="block h-4 w-4 rounded-full border-2"
          style={{
            borderColor: swellColor,
            backgroundColor: completed ? swellColor : 'transparent',
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 py-2 text-left"
      >
        <p className={`truncate text-sm ${completed ? 'text-th-faint line-through' : 'text-th-text'}`}>
          {milestone.name}
        </p>
      </button>
      {!disableDrag && <DragHandle listeners={listeners} />}
    </li>
  )
}
