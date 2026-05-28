'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  createMilestone,
  deleteMilestone,
  getMotionCadence,
  updateMilestone,
} from '@/app/actions/milestones'

type Cadence = 'weekly' | 'monthly'
type MotionSwell = { id: string; name: string; color: string; weight: number }

type Props = {
  motionId: string
  motionName: string
  motionSwells: MotionSwell[]
  trackingMode: 'points' | 'hours'
}

type CadenceState = {
  id: string
  swell_id: string
  name: string
  cadence: Cadence
  target_count: number | null
  bonus_points: number
} | null

// Primary swell = highest contribution_weight; tie-break by name asc so the
// default is stable. Returns null when the motion has no swells.
function pickPrimarySwell(swells: MotionSwell[]): MotionSwell | null {
  if (swells.length === 0) return null
  return [...swells].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.name.localeCompare(b.name)
  })[0]
}

export function CadenceSection({ motionId, motionName, motionSwells, trackingMode }: Props) {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<CadenceState>(null)
  const [editing, setEditing] = useState(false)
  const [, startSave] = useTransition()
  const [, startDelete] = useTransition()

  // Edit-form local state
  const [cadence, setCadence] = useState<Cadence>('weekly')
  const [targetCount, setTargetCount] = useState('5')
  const [bonusPoints, setBonusPoints] = useState('0')
  const [swellId, setSwellId] = useState<string>(() => pickPrimarySwell(motionSwells)?.id ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getMotionCadence(motionId).then(result => {
      if (cancelled) return
      if ('error' in result) {
        setError(result.error ?? 'Failed to load cadence')
        setLoading(false)
        return
      }
      const w = result.waypoint
      if (w) {
        setState({
          id: w.id,
          swell_id: w.swell_id,
          name: w.name,
          cadence: (w.cadence as Cadence) ?? 'weekly',
          target_count: w.target_count,
          bonus_points: w.bonus_points,
        })
        setCadence((w.cadence as Cadence) ?? 'weekly')
        setTargetCount(String(w.target_count ?? 5))
        setBonusPoints(String(w.bonus_points ?? 0))
        setSwellId(w.swell_id)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [motionId])

  // Section only makes sense once the motion feeds at least one swell — a
  // recurring waypoint must live on a swell.
  if (motionSwells.length === 0) return null
  if (loading) return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-th-faint">Cadence</p>
      <div className="h-4 w-24 animate-pulse rounded bg-th-surface" />
    </div>
  )

  const isHours = trackingMode === 'hours'

  function summaryFor(s: CadenceState): string {
    if (!s) return ''
    const count = s.target_count ?? 0
    const cad = s.cadence === 'monthly' ? '/mo' : '/wk'
    const bonus = s.bonus_points > 0 ? ` · +${s.bonus_points} bonus pts` : ''
    return `${count}× ${cad}${bonus}`
  }

  function reset() {
    if (state) {
      setCadence(state.cadence)
      setTargetCount(String(state.target_count ?? 5))
      setBonusPoints(String(state.bonus_points ?? 0))
      setSwellId(state.swell_id)
    } else {
      setCadence('weekly')
      setTargetCount('5')
      setBonusPoints('0')
      setSwellId(pickPrimarySwell(motionSwells)?.id ?? '')
    }
    setError(null)
  }

  function handleSave() {
    setError(null)
    const count = parseInt(targetCount)
    if (isNaN(count) || count <= 0) {
      setError('Enter a positive count')
      return
    }
    const bonus = parseInt(bonusPoints)
    const bonusValid = !isNaN(bonus) && bonus >= 0 ? bonus : 0
    if (!swellId) {
      setError('Pick a swell')
      return
    }

    startSave(async () => {
      if (state) {
        const r = await updateMilestone(state.id, swellId, {
          cadence,
          targetCount: count,
          bonusPoints: bonusValid,
          motionId,
        })
        if (r?.error) { setError(r.error); return }
        // If swell changed, the waypoint moved — re-fetch to refresh state.
        if (swellId !== state.swell_id) {
          // The action revalidates; reload the cadence to pick up the new state.
        }
        setState({
          id: state.id,
          swell_id: swellId,
          name: state.name,
          cadence,
          target_count: count,
          bonus_points: bonusValid,
        })
        setEditing(false)
      } else {
        const r = await createMilestone(swellId, 'recurring', motionName, cadence, {
          targetCount: count,
          bonusPoints: bonusValid,
          motionId,
        })
        if (r?.error) { setError(r.error); return }
        // Reload to get the new milestone's id.
        const reload = await getMotionCadence(motionId)
        if ('waypoint' in reload && reload.waypoint) {
          const w = reload.waypoint
          setState({
            id: w.id,
            swell_id: w.swell_id,
            name: w.name,
            cadence: (w.cadence as Cadence) ?? 'weekly',
            target_count: w.target_count,
            bonus_points: w.bonus_points,
          })
        }
        setEditing(false)
      }
    })
  }

  function handleRemove() {
    if (!state) return
    startDelete(async () => {
      const r = await deleteMilestone(state.id, state.swell_id)
      if (r?.error) { setError(r.error); return }
      setState(null)
      setEditing(false)
      reset()
    })
  }

  // Hide bonus-points input in hours mode — the integer column doesn't carry
  // 0.25-hr precision, so bonus accrual is points-only for v1 (ADR 0004 §7).
  const showBonus = !isHours

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-th-faint">Cadence</p>
        {state && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-th-faint hover:text-th-muted"
          >
            Edit
          </button>
        )}
      </div>

      {!editing && state && (
        <p className="text-xs text-th-secondary">{summaryFor(state)}</p>
      )}

      {!editing && !state && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-dashed border-th-border px-3 py-1.5 text-xs text-th-muted transition-colors hover:bg-th-surface"
        >
          + Set a cadence
        </button>
      )}

      {editing && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-th-border p-3">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-th-muted">Every</span>
            <div className="flex gap-1">
              {(['weekly', 'monthly'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCadence(c)}
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
            <label className="w-24 shrink-0 text-xs text-th-muted">Times</label>
            <input
              type="number"
              min="1"
              value={targetCount}
              onChange={e => setTargetCount(e.target.value)}
              inputMode="numeric"
              className="w-16 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          {showBonus && (
            <div className="flex items-center gap-2">
              <label className="w-24 shrink-0 text-xs text-th-muted">Bonus pts</label>
              <input
                type="number"
                min="0"
                value={bonusPoints}
                onChange={e => setBonusPoints(e.target.value)}
                inputMode="numeric"
                className="w-16 rounded-lg border border-th-border bg-th-surface px-2 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>
          )}

          {motionSwells.length > 1 && (
            <div className="flex items-start gap-2">
              <label className="w-24 shrink-0 pt-1 text-xs text-th-muted">Feeds</label>
              <div className="flex flex-wrap gap-1.5">
                {motionSwells.map(s => {
                  const active = swellId === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSwellId(s.id)}
                      className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide transition-colors"
                      style={active
                        ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                        : { borderColor: 'var(--color-th-border)', color: 'var(--color-th-muted)' }}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-th-btn px-3 py-1.5 text-xs font-medium text-th-btn-text active:scale-[0.97]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { reset(); setEditing(false) }}
              className="rounded-lg border border-th-border px-3 py-1.5 text-xs text-th-muted active:scale-[0.97]"
            >
              Cancel
            </button>
            {state && (
              <button
                type="button"
                onClick={handleRemove}
                className="ml-auto text-[11px] text-th-faint hover:text-red-500 active:scale-[0.97]"
              >
                Remove cadence
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
