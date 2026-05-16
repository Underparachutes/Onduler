'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { quickLogMotion, unlogMotion } from '@/app/actions/logs'
import { createSubmotion, hideMotion, updateMotion, deleteMotion, setMotionSwells, setMotionGroup, updateSubmotionDirect, reorderMotions } from '@/app/actions/motions'
import { formatPts, formatHrs } from '@/lib/format'

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Group = { id: string; name: string; color: string }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null }
type Submotion = { id: string; name: string; default_points: number; default_hours: number }
type UpdateState = { error?: string; success?: boolean } | null
type TrackingMode = 'points' | 'hours'

type SortableSubmotionProps = {
  sub: Submotion
  done: boolean
  isEditing: boolean
  editSubName: string
  editSubPts: string
  isSavingSub: boolean
  isDeletingSub: boolean
  confirmingSubDel: string | null
  onSetEditSubName: (v: string) => void
  onSetEditSubPts: (v: string) => void
  onSaveEdit: (sub: Submotion) => void
  onCancelEdit: () => void
  onDeleteSub: (id: string) => void
  onLog: (sub: Submotion) => void
  onStartEdit: (sub: Submotion) => void
}

function SortableSubmotion({
  sub, done, isEditing, editSubName, editSubPts, isSavingSub, isDeletingSub, confirmingSubDel,
  onSetEditSubName, onSetEditSubPts, onSaveEdit, onCancelEdit, onDeleteSub, onLog, onStartEdit,
}: SortableSubmotionProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id })

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
        className="rounded-lg border border-th-focus bg-th-surface px-4 py-3 flex flex-col gap-2"
      >
        <input
          autoFocus
          value={editSubName}
          onChange={e => onSetEditSubName(e.target.value)}
          placeholder="Name"
          className="rounded border border-th-border bg-th-bg px-2 py-1 text-sm text-th-text outline-none focus:border-th-focus"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-th-muted shrink-0">Pts</label>
          <input
            type="number"
            min="1"
            value={editSubPts}
            onChange={e => onSetEditSubPts(e.target.value)}
            className="w-16 rounded border border-th-border bg-th-bg px-2 py-1 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onSaveEdit(sub)}
            disabled={isSavingSub || isDeletingSub || !editSubName.trim() || parseInt(editSubPts) < 1}
            className="rounded-lg bg-th-btn px-3 py-1 text-xs font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {isSavingSub ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancelEdit}
            className="text-xs text-th-faint hover:text-th-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onDeleteSub(sub.id)}
            disabled={isSavingSub || isDeletingSub}
            className={`ml-auto text-xs transition-colors disabled:opacity-50 ${confirmingSubDel === sub.id ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'}`}
          >
            {isDeletingSub && confirmingSubDel === sub.id ? 'Deleting…' : confirmingSubDel === sub.id ? 'Tap again to delete' : 'Delete'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      suppressHydrationWarning
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1 select-none"
    >
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="shrink-0 flex items-center px-1 py-3 text-th-faint cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg width="10" height="14" viewBox="0 0 12 16" fill="currentColor" opacity="0.4">
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="4" cy="13" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </span>
      <button
        onClick={() => onLog(sub)}
        className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
          done ? 'opacity-50 cursor-default' : 'hover:bg-th-surface active:scale-[0.99]'
        }`}
      >
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${done ? 'border-th-btn text-th-btn' : 'border-th-border'}`}>
          {done && (
            <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
              <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className={`flex-1 text-sm ${done ? 'line-through text-th-muted' : 'text-th-text'}`}>{sub.name}</span>
        <span className={`text-sm font-semibold ${done ? 'text-th-faint' : 'text-th-secondary'}`}>+{sub.default_points}</span>
      </button>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onStartEdit(sub)}
        className="shrink-0 p-2 text-th-faint transition-colors hover:text-th-muted"
        aria-label="Edit submotion"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
    </div>
  )
}

type Props = {
  motion: Motion
  submotions: Submotion[]
  doneMotionIds: string[]
  onClose: () => void
  onPointsDelta: (delta: number) => void
  onHide: (id: string) => void
  isLogged: boolean
  onUnlog: () => void
  allSwells: Swell[]
  allGroups: Group[]
  groupsEnabled: boolean
  trackingMode: TrackingMode
}

export function MotionDetailSheet({
  motion, submotions, doneMotionIds, onClose, onPointsDelta, onHide,
  isLogged, onUnlog, allSwells, allGroups, groupsEnabled, trackingMode,
}: Props) {
  const subDelta = (s: Submotion) => trackingMode === 'hours' ? Number(s.default_hours) : s.default_points
  const router = useRouter()
  const [localDone, setLocalDone] = useState(() => new Set(doneMotionIds))
  const [, startTransition] = useTransition()

  // Edit form
  const updateById = updateMotion.bind(null, motion.id)
  const [updateState, formAction, updatePending] = useActionState<UpdateState, FormData>(updateById, null)

  // Delete with two-tap confirm
  const [deleting, startDelete] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Submotion ordering + drag-and-drop
  const [orderedSubs, setOrderedSubs] = useState(submotions)
  const [, startReorderSub] = useTransition()
  const subSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { setOrderedSubs(submotions) }, [submotions])

  function handleSubDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = arrayMove(
      orderedSubs,
      orderedSubs.findIndex(s => s.id === active.id),
      orderedSubs.findIndex(s => s.id === over.id)
    )
    setOrderedSubs(next)
    startReorderSub(async () => { await reorderMotions(next.map(s => s.id)) })
  }

  // Add submotion (budget auto-divides from parent)
  const [addName, setAddName] = useState('')
  const [isAdding, startAdding] = useTransition()

  // Edit submotion inline
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editSubName, setEditSubName] = useState('')
  const [editSubPts, setEditSubPts] = useState('')
  const [isSavingSub, startSavingSub] = useTransition()

  // Delete submotion with two-tap confirm
  const [confirmingSubDel, setConfirmingSubDel] = useState<string | null>(null)
  const [isDeletingSub, startDeletingSub] = useTransition()
  const subDelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startEditSub(sub: Submotion) {
    setEditingSubId(sub.id)
    setEditSubName(sub.name)
    setEditSubPts(String(sub.default_points))
  }

  function cancelEditSub() {
    setEditingSubId(null)
    setEditSubName('')
    setEditSubPts('')
    setConfirmingSubDel(null)
    if (subDelTimer.current) clearTimeout(subDelTimer.current)
  }

  function saveEditSub(sub: Submotion) {
    const name = editSubName.trim()
    const pts = parseInt(editSubPts)
    if (!name || isNaN(pts) || pts < 1) return
    startSavingSub(async () => {
      await updateSubmotionDirect(sub.id, name, pts)
      setEditingSubId(null)
      router.refresh()
    })
  }

  function handleDeleteSub(subId: string) {
    if (confirmingSubDel !== subId) {
      setConfirmingSubDel(subId)
      subDelTimer.current = setTimeout(() => setConfirmingSubDel(null), 3000)
    } else {
      if (subDelTimer.current) clearTimeout(subDelTimer.current)
      startDeletingSub(async () => {
        await deleteMotion(subId)
        setEditingSubId(null)
        setConfirmingSubDel(null)
        router.refresh()
      })
    }
  }

  // Swells assignment with weights
  const [localSwellWeights, setLocalSwellWeights] = useState<Map<string, number>>(
    () => new Map(motion.swells.map(s => [s.id, s.weight]))
  )
  // Draft string values so the input can be empty while the user is typing
  const [swellPctDraft, setSwellPctDraft] = useState<Map<string, string>>(
    () => new Map(motion.swells.map(s => [s.id, String(Math.round(s.weight * 100))]))
  )
  const [, startSwells] = useTransition()

  // Groups assignment
  const [localGroupId, setLocalGroupId] = useState<string | null>(motion.groupId)
  const [, startGroups] = useTransition()

  useEffect(() => {
    if (updateState?.success) { router.refresh(); onClose() }
  }, [updateState, onClose, router])

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      if (subDelTimer.current) clearTimeout(subDelTimer.current)
    }
  }, [])

  function handleSubLog(sub: Submotion) {
    const done = localDone.has(sub.id)
    const delta = subDelta(sub)
    if (done) {
      setLocalDone(prev => { const n = new Set(prev); n.delete(sub.id); return n })
      onPointsDelta(-delta)
      startTransition(async () => { await unlogMotion(sub.id) })
    } else {
      setLocalDone(prev => new Set([...prev, sub.id]))
      onPointsDelta(delta)
      startTransition(async () => { await quickLogMotion(sub.id) })
    }
  }

  function handleHide() {
    startTransition(async () => { await hideMotion(motion.id); onHide(motion.id); onClose() })
  }

  function handleAdd() {
    const name = addName.trim()
    if (!name) return
    startAdding(async () => {
      await createSubmotion(motion.id, name)
      setAddName('')
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000)
    } else {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      startDelete(async () => { await deleteMotion(motion.id); onClose() })
    }
  }

  function swellEntries(weights: Map<string, number>) {
    return Array.from(weights.entries()).map(([swellId, weight]) => ({ swellId, weight }))
  }

  function toggleSwell(swellId: string) {
    const next = new Map(localSwellWeights)
    if (next.has(swellId)) {
      next.delete(swellId)
      setSwellPctDraft(prev => { const d = new Map(prev); d.delete(swellId); return d })
    } else {
      next.set(swellId, 1)
      setSwellPctDraft(prev => new Map(prev).set(swellId, '100'))
    }
    setLocalSwellWeights(next)
    startSwells(async () => { await setMotionSwells(motion.id, swellEntries(next)) })
  }

  function updateSwellWeight(swellId: string, pct: number) {
    const clamped = Math.max(0, Math.min(pct, 100))
    const next = new Map(localSwellWeights)
    next.set(swellId, clamped / 100)
    setLocalSwellWeights(next)
    startSwells(async () => { await setMotionSwells(motion.id, swellEntries(next)) })
  }

  function toggleGroup(groupId: string) {
    const next = localGroupId === groupId ? null : groupId
    setLocalGroupId(next)
    startGroups(async () => { await setMotionGroup(motion.id, next) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-th-bg px-6 pt-4 pb-10 shadow-xl max-h-[88vh] overflow-y-auto">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-th-border" />

        {/* Header */}
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-th-text">{motion.name}</h2>
          <button onClick={onClose} className="mt-0.5 shrink-0 text-th-faint transition-colors hover:text-th-muted">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" />
            </svg>
          </button>
        </div>
        <p className="mb-6 text-sm text-th-muted">
          {formatPts(motion.default_points)} · {formatHrs(motion.default_hours)}
        </p>

        {/* Unlog — primary action when logged */}
        {isLogged && (
          <button
            onClick={onUnlog}
            className="mb-6 w-full rounded-lg border border-th-border py-2.5 text-sm font-medium text-th-muted transition-colors hover:bg-th-surface"
          >
            Unlog today
          </button>
        )}

        {/* Submotions */}
        {orderedSubs.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Submotions</p>
            <DndContext sensors={subSensors} collisionDetection={closestCenter} onDragEnd={handleSubDragEnd}>
              <SortableContext items={orderedSubs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {orderedSubs.map(sub => (
                    <SortableSubmotion
                      key={sub.id}
                      sub={sub}
                      done={localDone.has(sub.id)}
                      isEditing={editingSubId === sub.id}
                      editSubName={editSubName}
                      editSubPts={editSubPts}
                      isSavingSub={isSavingSub}
                      isDeletingSub={isDeletingSub}
                      confirmingSubDel={confirmingSubDel}
                      onSetEditSubName={setEditSubName}
                      onSetEditSubPts={setEditSubPts}
                      onSaveEdit={saveEditSub}
                      onCancelEdit={cancelEditSub}
                      onDeleteSub={handleDeleteSub}
                      onLog={handleSubLog}
                      onStartEdit={startEditSub}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Edit motion */}
        <div className="mb-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Edit</p>
          <form action={formAction} className="flex flex-col gap-3">
            <input
              name="name"
              defaultValue={motion.name}
              required
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
            <div className="flex items-center gap-3">
              <label className="shrink-0 text-xs text-th-muted">Pts</label>
              <input
                name="default_points"
                type="number"
                defaultValue={motion.default_points}
                min="1"
                className="w-16 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
              <label className="shrink-0 text-xs text-th-muted">Hrs</label>
              <input
                name="default_hours"
                type="number"
                defaultValue={motion.default_hours}
                min="0.25"
                step="0.25"
                className="w-16 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>
            {updateState?.error && <p className="text-xs text-red-500">{updateState.error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={updatePending || deleting}
                className="rounded-lg bg-th-btn px-3 py-1.5 text-xs font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
              >
                {updatePending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={updatePending || deleting}
                className={`ml-auto text-xs transition-colors disabled:opacity-50 ${confirming ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'}`}
              >
                {deleting ? 'Deleting…' : confirming ? 'Tap again to confirm delete' : 'Delete'}
              </button>
            </div>
          </form>
        </div>

        {/* Swells assignment with weights */}
        {allSwells.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Swells</p>
            <div className="flex flex-wrap gap-2">
              {allSwells.map(s => {
                const active = localSwellWeights.has(s.id)
                const pct = Math.round((localSwellWeights.get(s.id) ?? 1) * 100)
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSwell(s.id)}
                      className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                      style={active
                        ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                        : { borderColor: 'var(--color-th-border)', color: 'var(--color-th-muted)' }}
                    >
                      {s.name}
                    </button>
                    {active && (
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={swellPctDraft.get(s.id) ?? String(pct)}
                          onChange={e => setSwellPctDraft(prev => new Map(prev).set(s.id, e.target.value))}
                          onBlur={e => {
                            const num = parseInt(e.target.value)
                            if (!isNaN(num) && num >= 1 && num <= 100) {
                              updateSwellWeight(s.id, num)
                            } else {
                              // Revert draft to last valid value
                              setSwellPctDraft(prev => new Map(prev).set(s.id, String(pct)))
                            }
                          }}
                          className="w-10 rounded border border-th-border bg-th-surface px-1 py-0.5 text-center text-xs text-th-text outline-none focus:border-th-focus"
                        />
                        <span className="text-xs text-th-faint">%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Groups assignment */}
        {groupsEnabled && allGroups.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Groups</p>
            <div className="flex flex-wrap gap-2">
              {allGroups.map(g => {
                const active = localGroupId === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                    style={active
                      ? { backgroundColor: g.color, borderColor: g.color, color: '#fff' }
                      : { borderColor: 'var(--color-th-border)', color: 'var(--color-th-muted)' }}
                  >
                    {g.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Add submotion (budget auto-divides from parent) */}
        <div className="mb-6 border-t border-th-border pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Add submotion</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
            <button
              onClick={handleAdd}
              disabled={!addName.trim() || isAdding}
              className="shrink-0 rounded-lg bg-th-btn px-3 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
            >
              {isAdding ? '…' : 'Add'}
            </button>
          </div>
          {submotions.length > 0 && (
            <p className="mt-2 text-xs text-th-faint">
              Parent&apos;s {formatPts(motion.default_points)} split across {submotions.length} submotion{submotions.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Hide */}
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
