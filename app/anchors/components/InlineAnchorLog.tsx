'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { updateAnchorField, deleteFreeAnchor, getAnchorsForPeriod, type AnchorRow } from '@/app/actions/reflections'
import { formatWeekLabel, formatMonthLabel, formatQuarterLabel, formatYearLabel } from '@/lib/cycles'

type Period = 'week' | 'month' | 'quarter' | 'year'

function cycleLabel(a: AnchorRow): string | null {
  if (!a.cycle_start || !a.cycle_end) return null
  const cycle = { cycleStart: a.cycle_start, cycleEnd: a.cycle_end }
  if (a.cycle_type === 'week') return formatWeekLabel(cycle)
  if (a.cycle_type === 'month') return formatMonthLabel(cycle)
  if (a.cycle_type === 'quarter') return formatQuarterLabel(cycle)
  if (a.cycle_type === 'year') return formatYearLabel(cycle)
  return formatWeekLabel(cycle)
}

function entryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
}

const PERIOD_NOUN: Record<Period, string> = {
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
}

type Props = {
  initialAnchors: AnchorRow[]
  initialTotal: number
  periodStart: string
  periodEnd: string
  period: Period
}

export function InlineAnchorLog({ initialAnchors, initialTotal, periodStart, periodEnd, period }: Props) {
  const [anchors, setAnchors] = useState(initialAnchors)
  const [total, setTotal] = useState(initialTotal)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, startLoading] = useTransition()

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function loadMore() {
    startLoading(async () => {
      const result = await getAnchorsForPeriod(periodStart, periodEnd, anchors.length, 10)
      setAnchors(prev => [...prev, ...result.anchors])
      setTotal(result.total)
    })
  }

  if (anchors.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-th-text">Anchors</h2>
        <p className="text-xs text-th-muted">
          No anchors this {PERIOD_NOUN[period]}.{' '}
          <Link href="/anchors/new" className="text-th-secondary transition-colors hover:text-th-text">
            Drop one
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-th-text">Anchors</h2>
      <div className="flex flex-col gap-1">
        {anchors.map(a => (
          <AnchorEntry
            key={a.id}
            anchor={a}
            isExpanded={expanded.has(a.id)}
            onToggle={() => toggleExpand(a.id)}
            onDelete={(id) => {
              setAnchors(prev => prev.filter(x => x.id !== id))
              setTotal(prev => prev - 1)
            }}
          />
        ))}
      </div>

      {anchors.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-3 text-xs text-th-muted transition-colors hover:text-th-text disabled:opacity-50"
        >
          {loading ? 'Loading...' : `${total - anchors.length} more`}
        </button>
      )}
    </div>
  )
}

function AnchorEntry({
  anchor,
  isExpanded,
  onToggle,
  onDelete,
}: {
  anchor: AnchorRow
  isExpanded: boolean
  onToggle: () => void
  onDelete: (id: string) => void
}) {
  const isCeremony = anchor.cycle_type !== 'free'
  const rawLabel = isCeremony ? `${anchor.cycle_type} ceremony` : 'Anchor'
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
  const cycle = cycleLabel(anchor)

  return (
    <div className="rounded py-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-baseline justify-between gap-2 text-left active:scale-[0.985]"
      >
        <p className="text-sm font-medium text-th-text">{label}</p>
        <p className="text-xs text-th-faint">{entryDate(anchor.created_at)}</p>
      </button>

      {isExpanded && (
        <div className="mt-2 flex flex-col gap-3">
          {isCeremony ? (
            <CeremonyExpanded anchor={anchor} cycle={cycle} />
          ) : (
            <FreeExpanded anchor={anchor} cycle={cycle} onDelete={onDelete} />
          )}
        </div>
      )}
    </div>
  )
}

function SaveOnBlurTextarea({
  anchorId,
  field,
  initialValue,
  label,
  allowEmpty,
}: {
  anchorId: string
  field: 'body_text' | 'expectation_text' | 'observation_text'
  initialValue: string
  label?: string
  allowEmpty?: boolean
}) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const lastSaved = useRef(initialValue)

  async function handleBlur() {
    if (value === lastSaved.current) return
    if (!allowEmpty && !value.trim()) {
      setError('Cannot be empty')
      setValue(lastSaved.current)
      return
    }
    const result = await updateAnchorField(anchorId, field, value)
    if (result.error) {
      setError(result.error)
      setValue(lastSaved.current)
    } else {
      setError(null)
      lastSaved.current = value
    }
  }

  return (
    <div>
      {label && <p className="mb-1 text-[10px] uppercase tracking-widest text-th-muted">{label}</p>}
      <textarea
        value={value}
        onChange={e => { setValue(e.target.value); setError(null) }}
        onBlur={handleBlur}
        rows={3}
        className="w-full resize-none rounded border border-th-border bg-th-surface px-2.5 py-2 text-sm text-th-text outline-none focus:border-th-focus"
      />
      {error && <p className="mt-0.5 text-[10px] text-red-500">{error}</p>}
    </div>
  )
}

function CeremonyExpanded({ anchor, cycle }: { anchor: AnchorRow; cycle: string | null }) {
  return (
    <>
      {cycle && <p className="text-xs text-th-secondary">{cycle}</p>}
      <SaveOnBlurTextarea
        anchorId={anchor.id}
        field="expectation_text"
        initialValue={anchor.expectation_text ?? ''}
        label="Expected"
        allowEmpty
      />
      <SaveOnBlurTextarea
        anchorId={anchor.id}
        field="observation_text"
        initialValue={anchor.observation_text ?? ''}
        label="Observed"
        allowEmpty
      />
      {anchor.did_tune && (
        <p className="text-[10px] uppercase tracking-widest text-th-secondary">Tuned</p>
      )}
      <Link
        href="/anchors/journal"
        className="text-xs text-th-muted transition-colors hover:text-th-text"
      >
        See frozen radar in journal
      </Link>
    </>
  )
}

function FreeExpanded({
  anchor,
  cycle,
  onDelete,
}: {
  anchor: AnchorRow
  cycle: string | null
  onDelete: (id: string) => void
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, startDelete] = useTransition()

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    startDelete(async () => {
      const result = await deleteFreeAnchor(anchor.id)
      if (result && 'success' in result && result.success) {
        onDelete(anchor.id)
      }
    })
  }

  return (
    <>
      {anchor.prompt_text && (
        <p className="text-xs italic text-th-faint">{anchor.prompt_text}</p>
      )}
      <SaveOnBlurTextarea
        anchorId={anchor.id}
        field="body_text"
        initialValue={anchor.body_text ?? ''}
      />
      {cycle && (
        <p className="text-[10px] text-th-faint">{cycle}</p>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="self-start text-[10px] text-th-faint transition-colors hover:text-red-500 active:scale-[0.97] disabled:opacity-50"
      >
        {deleting ? 'Deleting...' : confirmingDelete ? 'Tap again to confirm' : 'Delete'}
      </button>
    </>
  )
}
