'use client'

import { useMemo, useState, useTransition } from 'react'
import { BUILD_PRESETS, getBuildPreset, type BuildKey } from '@/lib/builds'
import { adoptBuild, setBuildSlot } from '@/app/actions/builds'
import { detectMode } from '@/lib/theme-colors'
import { setMvsMotions } from '@/app/actions/welcomeback'
import { useSaveGuard } from '@/app/components/useSaveGuard'

type SlotKey = 'primary' | 'secondary'
type MvsMotion = { id: string; name: string; logCount: number }

type Props = {
  primary: string | null
  existingSwellNames: string[]
  mvsPool: MvsMotion[]
  resolvedMvsIds: string[]
  hasOverride: boolean
}

const MVS_MAX = 4

export function ShapePicker({ primary, existingSwellNames, mvsPool, resolvedMvsIds, hasOverride }: Props) {
  const [primarySlot, setPrimarySlot] = useState<string | null>(primary)
  const [previewKey, setPreviewKey] = useState<BuildKey | null>(null)
  const [isPending, startTransition] = useTransition()
  const guard = useSaveGuard()

  const existingLowered = useMemo(
    () => new Set(existingSwellNames.map(n => n.trim().toLowerCase())),
    [existingSwellNames]
  )

  function openPreview(key: BuildKey) {
    setPreviewKey(key)
  }

  function closePreview() {
    setPreviewKey(null)
  }

  function clearSlot(slot: SlotKey) {
    setPrimarySlot(null)
    startTransition(async () => { await guard(setBuildSlot(slot, null)) })
  }

  if (previewKey) {
    return (
      <PreviewScreen
        presetKey={previewKey}
        primarySlot={primarySlot}
        existingLowered={existingLowered}
        onConfirm={(names) => {
          setPrimarySlot(previewKey)
          startTransition(async () => {
            await guard(adoptBuild('primary', previewKey, names, detectMode()))
          })
          setPreviewKey(null)
        }}
        onCancel={closePreview}
        isPending={isPending}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Starter sets</h1>
        <p className="mb-8 text-sm text-th-muted">
          A curated starting point for your week. Swap or clear at any time. Nothing gets deleted.
        </p>

        <section className="mb-8">
          <SlotRow
            label="Active"
            presetKey={primarySlot}
            onClear={() => clearSlot('primary')}
          />
        </section>

        {primarySlot && mvsPool.length > 0 && (
          <StillShowingUpEditor
            shapeKey={primarySlot as BuildKey}
            shapeName={getBuildPreset(primarySlot)?.label.replace(/^The /, '') ?? ''}
            pool={mvsPool}
            initialIds={resolvedMvsIds}
            hasOverride={hasOverride}
          />
        )}

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Presets</p>
          <div className="grid grid-cols-2 gap-3">
            {BUILD_PRESETS.map(p => (
              <PresetCard
                key={p.key}
                presetKey={p.key}
                onTap={() => openPreview(p.key)}
                isActive={primarySlot === p.key}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function SlotRow({
  label,
  presetKey,
  onClear,
}: {
  label: string
  presetKey: string | null
  onClear: () => void
}) {
  const preset = getBuildPreset(presetKey)
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-muted">
        {label}
      </p>
      {preset ? (
        <div className="flex items-start gap-3 rounded-xl border border-th-border bg-th-surface px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-th-text">{preset.label}</p>
            <p className="mt-0.5 text-xs text-th-muted">{preset.description}</p>
          </div>
          <button
            onClick={onClear}
            className="shrink-0 text-xs text-th-faint transition-colors hover:text-th-text active:scale-[0.97]"
            aria-label={`Clear ${label.toLowerCase()} starter set`}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-th-border px-4 py-3">
          <p className="text-sm text-th-faint">Tap a preset below to fill this slot.</p>
        </div>
      )}
    </div>
  )
}

function StillShowingUpEditor({
  shapeKey,
  shapeName,
  pool,
  initialIds,
  hasOverride,
}: {
  shapeKey: BuildKey
  shapeName: string
  pool: MvsMotion[]
  initialIds: string[]
  hasOverride: boolean
}) {
  const [ids, setIds] = useState<string[]>(initialIds)
  const [adding, setAdding] = useState(false)
  const [, startSave] = useTransition()
  const guard = useSaveGuard()

  const byId = useMemo(() => new Map(pool.map(m => [m.id, m])), [pool])
  const available = pool.filter(m => !ids.includes(m.id))
  const canAdd = ids.length < MVS_MAX && available.length > 0

  function persist(next: string[]) {
    setIds(next)
    startSave(async () => { await guard(setMvsMotions(shapeKey, next)) })
  }

  function removeAt(motionId: string) {
    persist(ids.filter(id => id !== motionId))
  }

  function addOne(motionId: string) {
    if (ids.length >= MVS_MAX) return
    persist([...ids, motionId])
    setAdding(false)
  }

  function resetToDefaults() {
    // Passing [] clears the override; the page recomputes defaults on next read.
    setIds([])
    startSave(async () => { await guard(setMvsMotions(shapeKey, [])) })
  }

  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-th-muted">Still showing up</p>
        {hasOverride && (
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-[11px] text-th-faint hover:text-th-muted active:scale-[0.97]"
          >
            Reset to defaults
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-th-muted">
        The smallest version of your {shapeName.toLowerCase() || 'set'} that&apos;s still you. What we surface when you ease back from a wave. Up to {MVS_MAX}.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {ids.map(id => {
          const m = byId.get(id)
          if (!m) return null
          return (
            <button
              key={id}
              type="button"
              onClick={() => removeAt(id)}
              className="group flex items-center gap-1.5 rounded-full border border-th-border bg-th-surface px-2.5 py-1 text-xs text-th-text transition-all hover:bg-th-bg active:scale-[0.97]"
              aria-label={`Remove ${m.name}`}
            >
              <span>{m.name}</span>
              <span className="text-th-faint group-hover:text-th-muted">×</span>
            </button>
          )
        })}
        {canAdd && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-th-border px-2.5 py-1 text-xs text-th-muted transition-colors hover:bg-th-surface active:scale-[0.97]"
          >
            + Add
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-2 flex flex-col gap-1 rounded-lg border border-th-border p-2">
          {available.length === 0 ? (
            <p className="px-2 py-1 text-xs text-th-faint">No more eligible motions.</p>
          ) : (
            available.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => addOne(m.id)}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-th-text transition-colors hover:bg-th-surface active:scale-[0.97]"
              >
                <span>{m.name}</span>
                <span className="text-[10px] text-th-faint">
                  {m.logCount === 1 ? '1 log' : `${m.logCount} logs`}
                </span>
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-1 text-left text-[11px] text-th-faint hover:text-th-muted"
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  )
}

function PresetCard({
  presetKey,
  onTap,
  isActive,
}: {
  presetKey: BuildKey
  onTap: () => void
  isActive: boolean
}) {
  const preset = getBuildPreset(presetKey)
  if (!preset) return null
  const tag = isActive ? 'Active' : null
  return (
    <button
      onClick={onTap}
      className="flex flex-col items-start gap-2 rounded-xl border border-th-border bg-th-surface px-3 py-3 text-left transition-all hover:border-th-faint active:scale-[0.97]"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <p className="text-sm font-medium text-th-text">{preset.label}</p>
        {tag && (
          <span className="shrink-0 rounded-full bg-th-bg px-2 py-0.5 text-[10px] uppercase tracking-widest text-th-muted">
            {tag}
          </span>
        )}
      </div>
      <p className="text-xs leading-snug text-th-muted line-clamp-2">{preset.description}</p>
      <p className="mt-auto text-[11px] text-th-faint">{preset.seededSwells.join(' · ')}</p>
    </button>
  )
}

function PreviewScreen({
  presetKey,
  primarySlot,
  existingLowered,
  onConfirm,
  onCancel,
  isPending,
}: {
  presetKey: BuildKey
  primarySlot: string | null
  existingLowered: Set<string>
  onConfirm: (names: string[]) => void
  onCancel: () => void
  isPending: boolean
}) {
  const preset = getBuildPreset(presetKey)!

  const seededRows = preset.seededSwells.map(name => ({
    name,
    alreadyHave: existingLowered.has(name.trim().toLowerCase()),
  }))

  const initialChecked = Object.fromEntries(
    seededRows.filter(r => !r.alreadyHave).map(r => [r.name, true])
  )
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked)

  const namesToAdd = seededRows
    .filter(r => !r.alreadyHave && checked[r.name])
    .map(r => r.name)

  const isActive = primarySlot === presetKey

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Starter sets
          </button>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-th-text">{preset.label}</h1>
        <p className="mb-8 text-sm text-th-muted">{preset.description}</p>

        <section className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Swells in this set</p>
          {seededRows.every(r => r.alreadyHave) ? (
            <div className="rounded-xl border border-th-border bg-th-surface px-4 py-3">
              <p className="text-sm text-th-text">
                All {seededRows.length} already in your set. Tap below to make it active.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col divide-y divide-th-border rounded-xl border border-th-border bg-th-surface">
                {seededRows.map(row => (
                  <label
                    key={row.name}
                    className={`flex items-center gap-3 px-4 py-3 ${row.alreadyHave ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={row.alreadyHave ? true : !!checked[row.name]}
                      disabled={row.alreadyHave}
                      onChange={e => setChecked(prev => ({ ...prev, [row.name]: e.target.checked }))}
                      className="h-4 w-4 shrink-0 accent-th-btn"
                    />
                    <span className="flex-1 text-sm text-th-text">{row.name}</span>
                    <span className="text-[11px] uppercase tracking-widest text-th-faint">
                      {row.alreadyHave ? 'have' : 'new'}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-th-faint">
                Uncheck anything you don&apos;t want. Nothing already in your set will be touched.
              </p>
            </>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <button
            disabled={isPending}
            onClick={() => onConfirm(namesToAdd)}
            className="rounded-xl bg-th-text px-4 py-3 text-sm font-medium text-th-bg transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isActive ? 'Update starter set' : 'Set as active'}
          </button>
          <button
            onClick={onCancel}
            className="mt-2 text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
