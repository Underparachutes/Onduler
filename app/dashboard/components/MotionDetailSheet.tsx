'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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
import { createSubmotion, hideMotion, deleteMotion, duplicateMotion, setMotionSwells, setMotionGroup, setSubmotionMode, updateSubmotionDirect, updateMotionDirect, reorderMotions } from '@/app/actions/motions'
import { formatPts, formatHrs } from '@/lib/format'
import { parseHoursInput } from '@/lib/periods'
import { applyWeightEdit, defaultWeightForNewSwell, totalAllocation } from '@/lib/contributions'
import { useToast } from '@/app/components/Toast'
import { CadenceSection } from './CadenceSection'

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Group = { id: string; name: string; color: string }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
type SubSwell = { id: string; name: string; color: string; weight: number }
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: SubSwell[] }
type TrackingMode = 'points' | 'hours'

type SwellChipsProps = {
  allSwells: Swell[]
  weights: Map<string, number>
  pctDraft: Map<string, string>
  onToggle: (swellId: string) => void
  onPctChange: (swellId: string, value: string) => void
  onPctBlur: (swellId: string, value: string) => void
}

function SwellChips({ allSwells, weights, pctDraft, onToggle, onPctChange, onPctBlur }: SwellChipsProps) {
  if (allSwells.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-th-faint">Swells</p>
      <div className="flex flex-wrap gap-1.5">
        {allSwells.map(s => {
          const active = weights.has(s.id)
          const pct = Math.round((weights.get(s.id) ?? 1) * 100)
          const zeroWeight = active && pct === 0
          return (
            <div key={s.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onToggle(s.id)}
                className="rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                style={active
                  ? zeroWeight
                    ? { borderColor: s.color, borderStyle: 'dashed', color: s.color, backgroundColor: 'transparent' }
                    : { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
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
                    value={pctDraft.get(s.id) ?? '100'}
                    onChange={e => onPctChange(s.id, e.target.value)}
                    onBlur={e => onPctBlur(s.id, e.target.value)}
                    className="w-10 rounded border border-th-border bg-th-bg px-1 py-0.5 text-center text-xs text-th-text outline-none focus:border-th-focus"
                  />
                  <span className="text-xs text-th-faint">%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type SortableSubmotionProps = {
  sub: Submotion
  done: boolean
  isEditing: boolean
  editSubName: string
  editSubPts: string
  isSavingSub: boolean
  isDeletingSub: boolean
  confirmingSubDel: string | null
  allSwells: Swell[]
  editSubSwellWeights: Map<string, number>
  editSubSwellPctDraft: Map<string, string>
  onSetEditSubName: (v: string) => void
  onSetEditSubPts: (v: string) => void
  onToggleEditSubSwell: (swellId: string) => void
  onEditSubSwellPctChange: (swellId: string, value: string) => void
  onEditSubSwellPctBlur: (swellId: string, value: string) => void
  onSaveEdit: (sub: Submotion) => void
  onCancelEdit: () => void
  onDeleteSub: (id: string) => void
  onLog: (sub: Submotion) => void
  onStartEdit: (sub: Submotion) => void
}

function SortableSubmotion({
  sub, done, isEditing, editSubName, editSubPts, isSavingSub, isDeletingSub, confirmingSubDel,
  allSwells, editSubSwellWeights, editSubSwellPctDraft,
  onSetEditSubName, onSetEditSubPts, onToggleEditSubSwell, onEditSubSwellPctChange, onEditSubSwellPctBlur,
  onSaveEdit, onCancelEdit, onDeleteSub, onLog, onStartEdit,
}: SortableSubmotionProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id })

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        suppressHydrationWarning
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
        <SwellChips
          allSwells={allSwells}
          weights={editSubSwellWeights}
          pctDraft={editSubSwellPctDraft}
          onToggle={onToggleEditSubSwell}
          onPctChange={onEditSubSwellPctChange}
          onPctBlur={onEditSubSwellPctBlur}
        />
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
  submotionsEnabled: boolean
  trackingMode: TrackingMode
  onOpenDuplicate?: (id: string) => void
}

export function MotionDetailSheet({
  motion, submotions, doneMotionIds, onClose, onPointsDelta, onHide,
  isLogged, onUnlog, allSwells, allGroups, groupsEnabled, submotionsEnabled, trackingMode,
  onOpenDuplicate,
}: Props) {
  const subDelta = (s: Submotion) => trackingMode === 'hours' ? Number(s.default_hours) : s.default_points
  const router = useRouter()
  const toast = useToast()
  const [localDone, setLocalDone] = useState(() => new Set(doneMotionIds))
  const [, startTransition] = useTransition()

  // Editable header — auto-save on blur
  const [headerName, setHeaderName] = useState(motion.name)
  const [headerPts, setHeaderPts] = useState(String(motion.default_points))
  const [headerHrs, setHeaderHrs] = useState(formatHrs(Number(motion.default_hours)))
  const [, startHeaderSave] = useTransition()
  const lastValidName = useRef(motion.name)
  const lastValidPts = useRef(String(motion.default_points))
  const lastValidHrs = useRef(formatHrs(Number(motion.default_hours)))

  function blurName() {
    const trimmed = headerName.trim()
    if (!trimmed) { setHeaderName(lastValidName.current); return }
    if (trimmed === lastValidName.current) return
    lastValidName.current = trimmed
    setHeaderName(trimmed)
    startHeaderSave(async () => {
      await updateMotionDirect(motion.id, trimmed, parseInt(lastValidPts.current), parseFloat(lastValidHrs.current))
      router.refresh()
    })
  }

  function blurPts() {
    const num = parseInt(headerPts)
    if (isNaN(num) || num < 1) { setHeaderPts(lastValidPts.current); return }
    const str = String(num)
    if (str === lastValidPts.current) return
    lastValidPts.current = str
    setHeaderPts(str)
    startHeaderSave(async () => {
      await updateMotionDirect(motion.id, lastValidName.current, num, parseFloat(lastValidHrs.current))
      router.refresh()
    })
  }

  function blurHrs() {
    const num = parseHoursInput(headerHrs)
    if (num === null || num < 0.25) { setHeaderHrs(lastValidHrs.current); return }
    const rounded = Math.round(num * 4) / 4
    const str = formatHrs(rounded)
    if (str === lastValidHrs.current) return
    lastValidHrs.current = str
    setHeaderHrs(str)
    startHeaderSave(async () => {
      await updateMotionDirect(motion.id, lastValidName.current, parseInt(lastValidPts.current), rounded)
      router.refresh()
    })
  }

  // Delete with two-tap confirm
  const [deleting, startDelete] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Submotions collapse
  const [submotionsCollapsed, setSubmotionsCollapsed] = useState(false)

  // Submotion ordering + drag-and-drop
  const [orderedSubs, setOrderedSubs] = useState(submotions)
  const [, startReorderSub] = useTransition()
  const subSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync prop → local state for drag reorder
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

  // Add submotion — expandable from + button
  const [addingSubmotion, setAddingSubmotion] = useState(false)
  const [addName, setAddName] = useState('')
  const [addSwellWeights, setAddSwellWeights] = useState<Map<string, number>>(new Map())
  const [addSwellPctDraft, setAddSwellPctDraft] = useState<Map<string, string>>(new Map())
  const [isAdding, startAdding] = useTransition()

  // Submotion mode: 'distribute' (parent's pts split across children) vs
  // 'rollup' (each child carries the parent's full pts). Locked on first
  // child add via createSubmotion's mode arg, switchable later via the
  // section-header chip. Render-phase sync mirrors the SwellsList pattern.
  const [mode, setMode] = useState<'distribute' | 'rollup'>(motion.submotionMode ?? 'distribute')
  const prevSubmotionModeRef = useRef(motion.submotionMode ?? 'distribute')
  useEffect(() => {
    if ((motion.submotionMode ?? 'distribute') !== prevSubmotionModeRef.current) {
      prevSubmotionModeRef.current = motion.submotionMode ?? 'distribute'
      setMode(motion.submotionMode ?? 'distribute')
    }
  }, [motion.submotionMode])
  const [, startMode] = useTransition()
  function toggleMode() {
    const next = mode === 'rollup' ? 'distribute' : 'rollup'
    setMode(next)
    startMode(async () => {
      await setSubmotionMode(motion.id, next)
      router.refresh()
    })
  }

  // Edit submotion inline
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editSubName, setEditSubName] = useState('')
  const [editSubPts, setEditSubPts] = useState('')
  const [editSubSwellWeights, setEditSubSwellWeights] = useState<Map<string, number>>(new Map())
  const [editSubSwellPctDraft, setEditSubSwellPctDraft] = useState<Map<string, string>>(new Map())
  const [isSavingSub, startSavingSub] = useTransition()

  // Delete submotion with two-tap confirm
  const [confirmingSubDel, setConfirmingSubDel] = useState<string | null>(null)
  const [isDeletingSub, startDeletingSub] = useTransition()
  const subDelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function swellEntriesToArray(weights: Map<string, number>) {
    return Array.from(weights.entries()).map(([swellId, weight]) => ({ swellId, weight }))
  }

  // Draft strings mirror the weights map. After a rebalance, refresh every
  // entry so the inputs show the auto-adjusted others, not the stale typed value.
  function syncPctDraft(weights: Map<string, number>): Map<string, string> {
    const next = new Map<string, string>()
    for (const [id, w] of weights.entries()) next.set(id, String(Math.round(w * 100)))
    return next
  }

  function startEditSub(sub: Submotion) {
    setEditingSubId(sub.id)
    setEditSubName(sub.name)
    setEditSubPts(String(sub.default_points))
    setEditSubSwellWeights(new Map(sub.swells.map(s => [s.id, s.weight])))
    setEditSubSwellPctDraft(new Map(sub.swells.map(s => [s.id, String(Math.round(s.weight * 100))])))
  }

  function cancelEditSub() {
    setEditingSubId(null)
    setEditSubName('')
    setEditSubPts('')
    setEditSubSwellWeights(new Map())
    setEditSubSwellPctDraft(new Map())
    setConfirmingSubDel(null)
    if (subDelTimer.current) clearTimeout(subDelTimer.current)
  }

  function toggleEditSubSwell(swellId: string) {
    if (!editingSubId) return
    const next = new Map(editSubSwellWeights)
    if (next.has(swellId)) {
      next.delete(swellId)
    } else {
      next.set(swellId, defaultWeightForNewSwell(editSubSwellWeights))
    }
    setEditSubSwellWeights(next)
    setEditSubSwellPctDraft(syncPctDraft(next))
    startTransition(async () => { await setMotionSwells(editingSubId, swellEntriesToArray(next)) })
  }

  function editSubSwellPctChange(swellId: string, value: string) {
    setEditSubSwellPctDraft(prev => new Map(prev).set(swellId, value))
  }

  function editSubSwellPctBlur(swellId: string, value: string) {
    if (!editingSubId) return
    const num = parseInt(value)
    if (isNaN(num) || num < 1 || num > 100) {
      const pct = Math.round((editSubSwellWeights.get(swellId) ?? 0) * 100)
      setEditSubSwellPctDraft(prev => new Map(prev).set(swellId, String(pct)))
      return
    }
    const next = applyWeightEdit(editSubSwellWeights, swellId, num / 100)
    setEditSubSwellWeights(next)
    setEditSubSwellPctDraft(syncPctDraft(next))
    startTransition(async () => { await setMotionSwells(editingSubId!, swellEntriesToArray(next)) })
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
      window.dispatchEvent(new CustomEvent('onduler:log-committed', {
        detail: {
          motion_id: sub.id,
          swell_ids: sub.swells.map(s => s.id),
          weights: Object.fromEntries(sub.swells.map(s => [s.id, s.weight])),
          points: sub.default_points,
          hours: Number(sub.default_hours),
        },
      }))
      startTransition(async () => { await quickLogMotion(sub.id) })
    }
  }

  function handleHide() {
    startTransition(async () => { await hideMotion(motion.id); onHide(motion.id); onClose() })
  }

  function handleAdd() {
    const name = addName.trim()
    if (!name) return
    const swellsToAssign = swellEntriesToArray(addSwellWeights)
    // Stamp mode only on the first child; subsequent adds inherit the
    // parent's existing mode.
    const stampMode = orderedSubs.length === 0 ? mode : undefined
    startAdding(async () => {
      const result = await createSubmotion(motion.id, name, stampMode)
      if (result?.id && swellsToAssign.length > 0) {
        await setMotionSwells(result.id, swellsToAssign)
      }
      setAddName('')
      setAddSwellWeights(new Map())
      setAddSwellPctDraft(new Map())
      setAddingSubmotion(false)
      router.refresh()
    })
  }

  function toggleAddSwell(swellId: string) {
    const next = new Map(addSwellWeights)
    if (next.has(swellId)) {
      next.delete(swellId)
    } else {
      next.set(swellId, defaultWeightForNewSwell(addSwellWeights))
    }
    setAddSwellWeights(next)
    setAddSwellPctDraft(syncPctDraft(next))
  }

  function addSwellPctChange(swellId: string, value: string) {
    setAddSwellPctDraft(prev => new Map(prev).set(swellId, value))
  }

  function addSwellPctBlur(swellId: string, value: string) {
    const num = parseInt(value)
    if (isNaN(num) || num < 1 || num > 100) {
      const pct = Math.round((addSwellWeights.get(swellId) ?? 0) * 100)
      setAddSwellPctDraft(prev => new Map(prev).set(swellId, String(pct)))
      return
    }
    const next = applyWeightEdit(addSwellWeights, swellId, num / 100)
    setAddSwellWeights(next)
    setAddSwellPctDraft(syncPctDraft(next))
  }

  const [duplicating, startDuplicate] = useTransition()

  function handleDuplicate() {
    startDuplicate(async () => {
      const result = await duplicateMotion(motion.id)
      if (result.error) return
      const newId = result.id!
      onClose()
      router.refresh()
      toast.show({
        message: `Duplicated ${motion.name}.`,
        primary: {
          label: 'Edit',
          onClick: () => onOpenDuplicate?.(newId),
        },
      })
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
    } else {
      next.set(swellId, defaultWeightForNewSwell(localSwellWeights))
    }
    setLocalSwellWeights(next)
    setSwellPctDraft(syncPctDraft(next))
    startSwells(async () => { await setMotionSwells(motion.id, swellEntries(next)) })
  }

  function updateSwellWeight(swellId: string, pct: number) {
    const next = applyWeightEdit(localSwellWeights, swellId, pct / 100)
    setLocalSwellWeights(next)
    setSwellPctDraft(syncPctDraft(next))
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
      <div className="relative flex w-full flex-col rounded-t-2xl bg-th-bg shadow-xl max-h-[88vh]">
        {/* Fixed header */}
        <div className="shrink-0 px-6 pt-4">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-th-border" />
          <div className="mb-1 flex items-start justify-between gap-4">
            <input
              value={headerName}
              onChange={e => setHeaderName(e.target.value)}
              onBlur={blurName}
              className="min-w-0 flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-xl font-semibold text-th-text outline-none focus:border-th-focus"
            />
            <button onClick={onClose} className="mt-0.5 shrink-0 text-th-faint transition-colors hover:text-th-muted">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" />
              </svg>
            </button>
          </div>
          <div className="mb-4 flex items-center gap-3">
            <label className="shrink-0 text-xs text-th-muted">Pts</label>
            <input
              type="number"
              min="1"
              value={headerPts}
              onChange={e => setHeaderPts(e.target.value)}
              onBlur={blurPts}
              className="w-16 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
            <label className="shrink-0 text-xs text-th-muted">Hrs</label>
            <input
              type="text"
              inputMode="decimal"
              value={headerHrs}
              onChange={e => setHeaderHrs(e.target.value)}
              onBlur={blurHrs}
              className="w-16 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6">

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
        {submotionsEnabled && <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            {orderedSubs.length > 0 && (
              <button
                onClick={() => setSubmotionsCollapsed(c => !c)}
                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-th-faint"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-3 w-3 transition-transform ${submotionsCollapsed ? '-rotate-90' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
                Submotions
              </button>
            )}
            {orderedSubs.length === 0 && (
              <p className="text-xs font-medium uppercase tracking-widest text-th-faint">Submotions</p>
            )}
            {orderedSubs.length > 0 && (
              <button
                onClick={toggleMode}
                className="ml-auto rounded-full border border-th-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-th-muted transition-colors hover:text-th-text active:scale-[0.97]"
                aria-label={`Submotion mode: ${mode === 'rollup' ? 'each counts as full' : "split parent's value"}. Tap to switch.`}
              >
                {mode === 'rollup' ? 'Full' : 'Split'}
              </button>
            )}
            <button
              onClick={() => {
                setAddingSubmotion(a => {
                  const next = !a
                  if (next) {
                    // Seed from parent's swells so the user doesn't have to
                    // re-pick on every submotion; still editable before adding.
                    setAddSwellWeights(new Map(motion.swells.map(s => [s.id, s.weight])))
                    setAddSwellPctDraft(new Map(motion.swells.map(s => [s.id, String(Math.round(s.weight * 100))])))
                  } else {
                    setAddSwellWeights(new Map())
                    setAddSwellPctDraft(new Map())
                  }
                  return next
                })
              }}
              className={`${orderedSubs.length > 0 ? '' : 'ml-auto'} shrink-0 p-0.5 text-th-faint transition-colors hover:text-th-muted`}
              aria-label="Add submotion"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </button>
          </div>

          {/* Add submotion expandable form */}
          {addingSubmotion && (
            <div className="mb-3 rounded-lg border border-th-focus bg-th-surface px-4 py-3 flex flex-col gap-2">
              {orderedSubs.length === 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-th-faint">Counts as</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMode('distribute')}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                        mode === 'distribute'
                          ? 'border-th-btn bg-th-btn text-th-btn-text'
                          : 'border-th-border text-th-muted hover:text-th-text'
                      }`}
                    >
                      Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('rollup')}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                        mode === 'rollup'
                          ? 'border-th-btn bg-th-btn text-th-btn-text'
                          : 'border-th-border text-th-muted hover:text-th-text'
                      }`}
                    >
                      Full
                    </button>
                  </div>
                  <p className="text-[11px] text-th-faint">
                    {mode === 'rollup'
                      ? `Each submotion = full ${formatPts(motion.default_points)}.`
                      : `Parent's ${formatPts(motion.default_points)} splits across submotions.`}
                  </p>
                </div>
              )}
              <input
                autoFocus
                type="text"
                placeholder="Name"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                className="rounded border border-th-border bg-th-bg px-2 py-1 text-sm text-th-text outline-none focus:border-th-focus"
              />
              <SwellChips
                allSwells={allSwells}
                weights={addSwellWeights}
                pctDraft={addSwellPctDraft}
                onToggle={toggleAddSwell}
                onPctChange={addSwellPctChange}
                onPctBlur={addSwellPctBlur}
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAdd}
                  disabled={!addName.trim() || isAdding}
                  className="rounded-lg bg-th-btn px-3 py-1 text-xs font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
                >
                  {isAdding ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => { setAddingSubmotion(false); setAddName(''); setAddSwellWeights(new Map()); setAddSwellPctDraft(new Map()) }}
                  className="text-xs text-th-faint hover:text-th-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
              {orderedSubs.length > 0 && (
                <p className="text-xs text-th-faint">
                  {mode === 'rollup'
                    ? `Each submotion counts as the full ${formatPts(motion.default_points)}.`
                    : `Parent's ${formatPts(motion.default_points)} split across ${orderedSubs.length + 1} submotions`}
                </p>
              )}
            </div>
          )}

          {/* Submotion list */}
          {orderedSubs.length > 0 && !submotionsCollapsed && (
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
                      allSwells={allSwells}
                      editSubSwellWeights={editSubSwellWeights}
                      editSubSwellPctDraft={editSubSwellPctDraft}
                      onSetEditSubName={setEditSubName}
                      onSetEditSubPts={setEditSubPts}
                      onToggleEditSubSwell={toggleEditSubSwell}
                      onEditSubSwellPctChange={editSubSwellPctChange}
                      onEditSubSwellPctBlur={editSubSwellPctBlur}
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
          )}
        </div>}

        {/* Groups assignment */}
        {groupsEnabled && allGroups.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Buckets</p>
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

        {/* Swells assignment with weights — one per line */}
        {allSwells.length > 0 && (() => {
          const allocatedPct = Math.round(totalAllocation(localSwellWeights) * 100)
          const remainingPct = Math.max(0, 100 - allocatedPct)
          return (
          <div className="mb-6">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-th-faint">Swells</p>
              {localSwellWeights.size > 0 && (
                <p className="text-[11px] text-th-faint">
                  {allocatedPct === 100
                    ? '100% allocated'
                    : `${allocatedPct}% allocated · ${remainingPct}% remaining`}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {allSwells.map(s => {
                const active = localSwellWeights.has(s.id)
                const pct = Math.round((localSwellWeights.get(s.id) ?? 1) * 100)
                const zeroWeight = active && pct === 0
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSwell(s.id)}
                      className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                      style={active
                        ? zeroWeight
                          ? { borderColor: s.color, borderStyle: 'dashed', color: s.color, backgroundColor: 'transparent' }
                          : { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                        : { borderColor: 'var(--color-th-border)', color: 'var(--color-th-muted)' }}
                    >
                      {s.name}
                    </button>
                    {active && (
                      <div className="ml-auto flex items-center gap-0.5">
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
            {Array.from(localSwellWeights.values()).some(w => Math.round(w * 100) === 0) && (
              <p className="mt-2 text-[11px] text-th-faint">Dashed swells are at 0%. Edit % to allocate.</p>
            )}
          </div>
          )
        })()}

        <CadenceSection
          motionId={motion.id}
          motionName={motion.name}
          motionSwells={motion.swells}
          trackingMode={trackingMode}
        />

        </div>

        {/* Fixed footer */}
        <div className="shrink-0 px-6 pb-10">
          <div className="flex flex-col gap-3 border-t border-th-border pt-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleHide}
                className="text-sm text-th-faint transition-colors hover:text-th-muted"
              >
                Hide from checklist
              </button>
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="text-xs text-th-faint transition-colors disabled:opacity-50 hover:text-th-muted"
              >
                {duplicating ? 'Duplicating…' : 'Duplicate'}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`text-xs transition-colors disabled:opacity-50 ${confirming ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'}`}
              >
                {deleting ? 'Deleting…' : confirming ? 'Tap again to confirm delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
