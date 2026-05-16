'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { updateSwellDirect, deleteSwell, setSwellGroup } from '@/app/actions/swells'
import { formatPts, formatHrs } from '@/lib/format'

type Motion = { id: string; name: string; default_points: number; default_hours: number; swellIds: string[]; swellWeights: Record<string, number> }
type SwellStub = { id: string; name: string; color: string }
type Group = { id: string; name: string; color: string }
type TrackingMode = 'points' | 'hours'

type Props = {
  swell: { id: string; name: string; color: string; target_points: number | null; target_hours: number | null; groupId: string | null; motions: Motion[] }
  swellPtsThisWeek: number
  swellHrsThisWeek: number
  swellPtsLastWeek: number
  swellHrsLastWeek: number
  ptsToday: Map<string, number>
  hrsToday: Map<string, number>
  allSwells: SwellStub[]
  allGroups: Group[]
  groupsEnabled: boolean
  localHiddenIds: Set<string>
  trackingMode: TrackingMode
  expanded: boolean
  onToggleExpand: () => void
  onOpenMotion: (id: string) => void
  hideDone: boolean
}

export function SwellRow({
  swell, swellPtsThisWeek, swellHrsThisWeek, swellPtsLastWeek, swellHrsLastWeek,
  allGroups, groupsEnabled, localHiddenIds, trackingMode,
  expanded, onToggleExpand, onOpenMotion,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLInputElement>(null)
  const targetPtsRef = useRef<HTMLInputElement>(null)
  const targetHrsRef = useRef<HTMLInputElement>(null)

  // Group assignment
  const [localGroupId, setLocalGroupId] = useState<string | null>(swell.groupId)
  const [, startGroupTransition] = useTransition()

  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }
  }, [])

  function handleSave() {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) { setError('Name required'); return }
    const color = colorRef.current?.value ?? swell.color
    const targetPoints = targetPtsRef.current?.value ? parseInt(targetPtsRef.current.value) || null : null
    const targetHours = targetHrsRef.current?.value ? parseFloat(targetHrsRef.current.value) || null : null
    setError(null)
    startSave(async () => {
      const result = await updateSwellDirect(swell.id, name, color, targetPoints, targetHours)
      if (result?.error) { setError(result.error); return }
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000)
    } else {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      startDelete(async () => { await deleteSwell(swell.id) })
    }
  }

  function toggleGroup(groupId: string) {
    const next = localGroupId === groupId ? null : groupId
    setLocalGroupId(next)
    startGroupTransition(async () => { await setSwellGroup(swell.id, next) })
  }

  const isHours = trackingMode === 'hours'

  const showHoursField =
    swell.target_hours !== null && swell.target_points === null
      ? true
      : swell.target_points !== null && swell.target_hours === null
      ? false
      : isHours

  const weekValue = isHours ? swellHrsThisWeek : swellPtsThisWeek
  const lastWeekValue = isHours ? swellHrsLastWeek : swellPtsLastWeek
  const target = isHours ? (swell.target_hours !== null ? Number(swell.target_hours) : null) : swell.target_points
  const progress = target ? Math.min((weekValue / target) * 100, 100) : null
  const hitTarget = target !== null && weekValue >= target
  const formatValue = (n: number) => isHours ? formatHrs(n) : formatPts(n)

  if (editing) {
    return (
      <div className="flex flex-col gap-3 mb-2">
        <div className="flex items-center gap-2">
          <input
            ref={nameRef}
            type="text"
            defaultValue={swell.name}
            autoFocus
            className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
          />
          <input
            ref={colorRef}
            type="color"
            defaultValue={swell.color}
            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
          />
        </div>
        {showHoursField ? (
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-th-muted">Weekly hrs</label>
            <input
              ref={targetHrsRef}
              type="number"
              defaultValue={swell.target_hours ?? ''}
              min="0.25"
              step="0.25"
              placeholder="5"
              inputMode="decimal"
              className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-th-muted">Weekly pts</label>
            <input
              ref={targetPtsRef}
              type="number"
              defaultValue={swell.target_points ?? ''}
              min="1"
              placeholder="100"
              inputMode="numeric"
              className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>
        )}
        {groupsEnabled && allGroups.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-th-faint">Group</p>
            <div className="flex flex-wrap gap-1.5">
              {allGroups.map(g => {
                const active = localGroupId === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className="rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors"
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-th-btn px-3 py-2 text-xs font-medium text-th-btn-text disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className={`ml-auto text-xs transition-colors disabled:opacity-50 ${confirming ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'}`}
          >
            {deleting ? 'Deleting…' : confirming ? 'Tap again to confirm delete' : 'Delete'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <button
          onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: swell.color }}>
            {swell.name}
          </p>
          <span className="text-xs text-th-faint">
            {formatValue(weekValue)}{target !== null && ` / ${formatValue(target)}`}
          </span>
          {hitTarget && <span className="text-xs text-th-faint">&#10003;</span>}
        </button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setEditing(true)}
          className="shrink-0 p-2 text-th-faint transition-colors hover:text-th-muted"
          aria-label="Edit swell"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </div>

      {progress !== null && target !== null && (
        <div className="mb-1">
          <div className="rounded-full bg-th-surface" style={{ height: '4px' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: swell.color }}
            />
          </div>
        </div>
      )}

      {target !== null && (
        <p className="mb-3 text-xs text-th-faint">
          Last week: {formatValue(lastWeekValue)}
        </p>
      )}

      {/* Motions list — collapsed by default (Prompt 5) */}
      {expanded && (
        <>
          {swell.motions.filter(m => !localHiddenIds.has(m.id)).length === 0 ? (
            <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
              No motions assigned yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {swell.motions
                .filter(m => !localHiddenIds.has(m.id))
                .map(motion => {
                  const w = motion.swellWeights?.[swell.id] ?? 1
                  const weightedPts = Math.floor(motion.default_points * w)
                  const weightedHrs = motion.default_hours * w
                  const showWeight = w < 1
                  return (
                    <button
                      key={motion.id}
                      onClick={() => onOpenMotion(motion.id)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-th-surface"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-th-text">{motion.name}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-th-secondary">
                        {isHours ? formatHrs(weightedHrs) : formatPts(weightedPts)}
                        {showWeight && <span className="ml-1 text-xs font-normal text-th-faint">({Math.round(w * 100)}%)</span>}
                      </span>
                    </button>
                  )
                })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
