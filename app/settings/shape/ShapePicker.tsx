'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { BUILD_PRESETS, getBuildPreset, type BuildKey } from '@/lib/builds'
import { adoptBuild, setBuildSlot } from '@/app/actions/builds'

type SlotKey = 'primary' | 'secondary'

type Props = {
  primary: string | null
  secondary: string | null
  existingSwellNames: string[]
}

export function ShapePicker({ primary, secondary, existingSwellNames }: Props) {
  const [primarySlot, setPrimarySlot] = useState<string | null>(primary)
  const [secondarySlot, setSecondarySlot] = useState<string | null>(secondary)
  const [previewKey, setPreviewKey] = useState<BuildKey | null>(null)
  const [isPending, startTransition] = useTransition()

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
    if (slot === 'primary') setPrimarySlot(null)
    else setSecondarySlot(null)
    startTransition(async () => { await setBuildSlot(slot, null) })
  }

  if (previewKey) {
    return (
      <PreviewScreen
        presetKey={previewKey}
        primarySlot={primarySlot}
        secondarySlot={secondarySlot}
        existingLowered={existingLowered}
        onConfirm={(slot, names) => {
          if (slot === 'primary') setPrimarySlot(previewKey)
          else setSecondarySlot(previewKey)
          startTransition(async () => {
            await adoptBuild(slot, previewKey, names)
          })
          setPreviewKey(null)
        }}
        onCancel={closePreview}
        isPending={isPending}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/settings"
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Settings
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">Your shape</h1>
        <p className="mb-8 text-sm text-th-muted">
          The shape your week is oriented around. Both slots are optional. Swap or clear at any time — nothing gets deleted.
        </p>

        <section className="mb-8">
          <SlotRow
            label="Primary"
            presetKey={primarySlot}
            onClear={() => clearSlot('primary')}
          />
          <div className="mt-3">
            <SlotRow
              label="Secondary"
              presetKey={secondarySlot}
              onClear={() => clearSlot('secondary')}
              optional
            />
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Presets</p>
          <div className="grid grid-cols-2 gap-3">
            {BUILD_PRESETS.map(p => (
              <PresetCard
                key={p.key}
                presetKey={p.key}
                onTap={() => openPreview(p.key)}
                isPrimary={primarySlot === p.key}
                isSecondary={secondarySlot === p.key}
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
  optional,
}: {
  label: string
  presetKey: string | null
  onClear: () => void
  optional?: boolean
}) {
  const preset = getBuildPreset(presetKey)
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-muted">
        {label}
        {optional && <span className="ml-1.5 normal-case tracking-normal text-th-faint">(optional)</span>}
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
            aria-label={`Clear ${label.toLowerCase()} shape`}
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

function PresetCard({
  presetKey,
  onTap,
  isPrimary,
  isSecondary,
}: {
  presetKey: BuildKey
  onTap: () => void
  isPrimary: boolean
  isSecondary: boolean
}) {
  const preset = getBuildPreset(presetKey)
  if (!preset) return null
  const tag = isPrimary ? 'Primary' : isSecondary ? 'Secondary' : null
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
  secondarySlot,
  existingLowered,
  onConfirm,
  onCancel,
  isPending,
}: {
  presetKey: BuildKey
  primarySlot: string | null
  secondarySlot: string | null
  existingLowered: Set<string>
  onConfirm: (slot: SlotKey, names: string[]) => void
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

  const isPrimary = primarySlot === presetKey
  const isSecondary = secondarySlot === presetKey

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Your shape
          </button>
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">{preset.label}</h1>
        <p className="mb-8 text-sm text-th-muted">{preset.description}</p>

        <section className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Swells in this shape</p>
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
        </section>

        <div className="flex flex-col gap-2">
          <button
            disabled={isPending}
            onClick={() => onConfirm('primary', namesToAdd)}
            className="rounded-xl bg-th-text px-4 py-3 text-sm font-medium text-th-bg transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isPrimary ? 'Update primary' : 'Set as primary'}
          </button>
          <button
            disabled={isPending}
            onClick={() => onConfirm('secondary', namesToAdd)}
            className="rounded-xl border border-th-border bg-th-surface px-4 py-3 text-sm font-medium text-th-text transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isSecondary ? 'Update secondary' : 'Set as secondary'}
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
