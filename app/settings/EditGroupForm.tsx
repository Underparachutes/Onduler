'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { updateGroup, deleteGroup } from '@/app/actions/groups'
import { setMotionGroup } from '@/app/actions/motions'
import { setSwellGroup } from '@/app/actions/swells'

type Group = { id: string; name: string; color: string }
type Motion = { id: string; name: string; group_id: string | null }
type Swell = { id: string; name: string; color: string; group_id: string | null }

type Props = {
  group: Group
  allGroups: Group[]
  motions: Motion[]
  swells: Swell[]
  onClose: () => void
}

export function EditGroupForm({ group, allGroups, motions, swells, onClose }: Props) {
  const updateById = updateGroup.bind(null, group.id)
  const [state, formAction, pending] = useActionState(updateById, null)
  const [color, setColor] = useState(group.color)
  const [confirming, setConfirming] = useState(false)
  const [deleting, startDelete] = useTransition()
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [motionGroupById, setMotionGroupById] = useState<Map<string, string | null>>(
    () => new Map(motions.map(m => [m.id, m.group_id]))
  )
  const [swellGroupById, setSwellGroupById] = useState<Map<string, string | null>>(
    () => new Map(swells.map(s => [s.id, s.group_id]))
  )
  const [, startAssign] = useTransition()

  const groupNameById = useMemo(
    () => new Map(allGroups.map(g => [g.id, g.name])),
    [allGroups]
  )

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }
  }, [])

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    startDelete(async () => {
      await deleteGroup(group.id)
      onClose()
    })
  }

  function toggleMotion(motionId: string) {
    const current = motionGroupById.get(motionId) ?? null
    const next = current === group.id ? null : group.id
    setMotionGroupById(prev => new Map(prev).set(motionId, next))
    startAssign(async () => { await setMotionGroup(motionId, next) })
  }

  function toggleSwell(swellId: string) {
    const current = swellGroupById.get(swellId) ?? null
    const next = current === group.id ? null : group.id
    setSwellGroupById(prev => new Map(prev).set(swellId, next))
    startAssign(async () => { await setSwellGroup(swellId, next) })
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="name"
          type="text"
          defaultValue={group.name}
          required
          autoFocus
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
        />

        <div className="flex items-center gap-2">
          <label htmlFor="color" className="shrink-0 text-xs text-th-muted">Color</label>
          <input
            id="color"
            name="color"
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
          />
        </div>

        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="ml-auto rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      <AssignmentList
        label="Motions"
        items={motions.map(m => ({
          id: m.id,
          name: m.name,
          assignedGroupId: motionGroupById.get(m.id) ?? null,
        }))}
        thisGroup={group}
        groupNameById={groupNameById}
        onToggle={toggleMotion}
        emptyLabel="No motions yet."
      />

      <AssignmentList
        label="Swells"
        items={swells.map(s => ({
          id: s.id,
          name: s.name,
          assignedGroupId: swellGroupById.get(s.id) ?? null,
          accentColor: s.color,
        }))}
        thisGroup={group}
        groupNameById={groupNameById}
        onToggle={toggleSwell}
        emptyLabel="No swells yet."
      />

      <div className="border-t border-th-border pt-4">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs transition-colors disabled:opacity-50 ${confirming ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'}`}
        >
          {deleting ? 'Deleting…' : confirming ? 'Tap again to confirm delete' : 'Delete group'}
        </button>
      </div>
    </div>
  )
}

type AssignmentItem = {
  id: string
  name: string
  assignedGroupId: string | null
  accentColor?: string
}

function AssignmentList({
  label,
  items,
  thisGroup,
  groupNameById,
  onToggle,
  emptyLabel,
}: {
  label: string
  items: AssignmentItem[]
  thisGroup: Group
  groupNameById: Map<string, string>
  onToggle: (id: string) => void
  emptyLabel: string
}) {
  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-th-faint">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col">
          {items.map(item => {
            const inThis = item.assignedGroupId === thisGroup.id
            const inOther = !inThis && item.assignedGroupId != null
            const otherName = inOther ? groupNameById.get(item.assignedGroupId!) : null
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className="flex w-full items-center gap-3 py-2.5 text-left transition-all active:scale-[0.99]"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border transition-colors"
                  style={
                    inThis
                      ? { backgroundColor: thisGroup.color, borderColor: thisGroup.color }
                      : { borderColor: 'var(--color-th-border)' }
                  }
                />
                {item.accentColor && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.accentColor }}
                  />
                )}
                <span className={`flex-1 text-sm ${inThis ? 'text-th-text' : 'text-th-muted'}`}>
                  {item.name}
                </span>
                {inOther && (
                  <span className="text-xs text-th-faint">in {otherName}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
