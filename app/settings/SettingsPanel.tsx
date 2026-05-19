'use client'

import { useState, useActionState, useTransition } from 'react'
import Link from 'next/link'
import { setTheme } from '@/app/actions/theme'
import {
  setGroupsEnabled,
  setDailyGoal,
  setDailyGoalHours,
  setCelebrationEnabled,
  setHapticEnabled,
  setTrackingMode,
} from '@/app/actions/settings'
import { unhideMotion } from '@/app/actions/motions'
import { changePassword } from '@/app/actions/auth'
import { formatPts, formatHrs } from '@/lib/format'
import { getBuildPreset } from '@/lib/builds'
import { EditGroupForm } from './EditGroupForm'

const THEMES = [
  { id: 'default', label: 'Default', desc: 'Clean and minimal' },
  { id: 'bolinas', label: 'Bolinas', desc: 'Fog, driftwood, coastal sage' },
  { id: 'biarritz', label: 'Biarritz', desc: 'Atlantic surf, basque sand' },
] as const

const TRACKING_MODES = [
  { id: 'points', label: 'Points', desc: 'Building consistency and showing up' },
  { id: 'hours', label: 'Hours', desc: 'Clocking real time toward mastery' },
] as const

type Group = { id: string; name: string; color: string }
type HiddenMotion = { id: string; name: string }
type AssignableMotion = { id: string; name: string; group_id: string | null }
type AssignableSwell = { id: string; name: string; color: string; group_id: string | null }
type TrackingMode = 'points' | 'hours'

type Props = {
  theme: string
  groupsEnabled: boolean
  dailyGoal: number
  dailyGoalHours: number
  trackingMode: TrackingMode
  celebrationEnabled: boolean
  hapticEnabled: boolean
  primaryBuild: string | null
  secondaryBuild: string | null
  email: string
  groups: Group[]
  hiddenMotions: HiddenMotion[]
  assignableMotions: AssignableMotion[]
  assignableSwells: AssignableSwell[]
}

export function SettingsPanel({
  theme,
  groupsEnabled,
  dailyGoal,
  dailyGoalHours,
  trackingMode,
  celebrationEnabled,
  hapticEnabled,
  primaryBuild,
  secondaryBuild,
  email,
  groups,
  hiddenMotions,
  assignableMotions,
  assignableSwells,
}: Props) {
  const [currentTheme, setCurrentTheme] = useState(theme)
  const [currentMode, setCurrentMode] = useState<TrackingMode>(trackingMode)
  const [groupsOn, setGroupsOn] = useState(groupsEnabled)
  const [goalPts, setGoalPts] = useState(dailyGoal)
  const [goalHrs, setGoalHrs] = useState(dailyGoalHours)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [celebration, setCelebration] = useState(celebrationEnabled)
  const [haptic, setHaptic] = useState(hapticEnabled)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function handleTheme(t: string) {
    setCurrentTheme(t)
    document.documentElement.dataset.theme = t
    startTransition(async () => { await setTheme(t) })
  }

  function handleMode(m: TrackingMode) {
    setCurrentMode(m)
    startTransition(async () => { await setTrackingMode(m) })
  }

  function handleGroups(enabled: boolean) {
    setGroupsOn(enabled)
    startTransition(async () => { await setGroupsEnabled(enabled) })
  }

  function handleCelebration(enabled: boolean) {
    setCelebration(enabled)
    startTransition(async () => { await setCelebrationEnabled(enabled) })
  }

  function handleHaptic(enabled: boolean) {
    setHaptic(enabled)
    startTransition(async () => { await setHapticEnabled(enabled) })
  }

  function startEditGoal() {
    setGoalInput(String(currentMode === 'hours' ? goalHrs : goalPts))
    setEditingGoal(true)
  }

  function commitGoal() {
    if (currentMode === 'hours') {
      const val = parseFloat(goalInput)
      if (!val || val <= 0) { setEditingGoal(false); return }
      setGoalHrs(val)
      setEditingGoal(false)
      startTransition(async () => { await setDailyGoalHours(val) })
    } else {
      const val = parseInt(goalInput)
      if (!val || val < 1) { setEditingGoal(false); return }
      setGoalPts(val)
      setEditingGoal(false)
      startTransition(async () => { await setDailyGoal(val) })
    }
  }

  function handleUnhide(id: string) {
    setLocalHiddenIds(prev => new Set([...prev, id]))
    startTransition(async () => { await unhideMotion(id) })
  }

  const editingGroup = editingGroupId ? groups.find(g => g.id === editingGroupId) ?? null : null

  if (editingGroup) {
    return (
      <EditGroupForm
        group={editingGroup}
        allGroups={groups}
        motions={assignableMotions}
        swells={assignableSwells}
        onClose={() => setEditingGroupId(null)}
      />
    )
  }

  const visibleHidden = hiddenMotions.filter(m => !localHiddenIds.has(m.id))
  const displayedGoal = currentMode === 'hours' ? goalHrs : goalPts
  const goalLabel = currentMode === 'hours' ? formatHrs(displayedGoal) : formatPts(displayedGoal)

  const currentThemeObj = THEMES.find(t => t.id === currentTheme)
  const currentModeObj = TRACKING_MODES.find(m => m.id === currentMode)

  const primaryPreset = getBuildPreset(primaryBuild)
  const secondaryPreset = getBuildPreset(secondaryBuild)
  const shapeSummary = primaryPreset
    ? secondaryPreset
      ? `${primaryPreset.label} · ${secondaryPreset.label}`
      : primaryPreset.label
    : 'No shape picked'

  return (
    <div className="flex flex-col gap-8">
      {/* Appearance */}
      <section>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-th-text">Appearance</p>
            <p className="text-xs text-th-muted">{currentThemeObj?.desc}</p>
          </div>
          <select
            value={currentTheme}
            onChange={e => handleTheme(e.target.value)}
            className="rounded-lg bg-th-surface px-3 py-1.5 text-sm text-th-text outline-none"
          >
            {THEMES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Your shape */}
      <section>
        <Link
          href="/settings/shape"
          className="flex items-center justify-between gap-3 py-3 transition-all active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-th-text">Your shape</p>
            <p className="truncate text-xs text-th-muted">{shapeSummary}</p>
          </div>
          <span className="shrink-0 text-sm text-th-faint">→</span>
        </Link>
      </section>

      {/* Tracking */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Tracking</p>
        <div className="flex flex-col divide-y divide-th-border">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-th-text">Daily target</p>
              <p className="text-xs text-th-muted">
                {currentMode === 'hours' ? 'Hours target per day' : 'Points target per day'}
              </p>
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  min={currentMode === 'hours' ? '0.25' : '1'}
                  step={currentMode === 'hours' ? '0.25' : '1'}
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onBlur={commitGoal}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitGoal()
                    if (e.key === 'Escape') setEditingGoal(false)
                  }}
                  className="w-16 rounded-lg border border-th-border bg-th-surface px-2 py-1 text-sm text-th-text outline-none focus:border-th-focus text-right"
                />
                <span className="text-xs text-th-muted">{currentMode === 'hours' ? 'hrs' : 'pts'}</span>
              </div>
            ) : (
              <button
                onClick={startEditGoal}
                className="text-sm font-medium text-th-secondary hover:underline"
              >
                {goalLabel}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-th-text">Groups</p>
              <p className="text-xs text-th-muted">Organize motions into buckets</p>
            </div>
            <button
              role="switch"
              aria-checked={groupsOn}
              onClick={() => handleGroups(!groupsOn)}
              className={`relative h-6 w-11 rounded-full transition-colors ${groupsOn ? 'bg-th-btn' : 'bg-th-border'}`}
            >
              <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${groupsOn ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {groups.length > 0 && groups.map(g => (
            <button
              key={g.id}
              onClick={() => setEditingGroupId(g.id)}
              className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-th-surface"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <span className="flex-1 text-sm text-th-text">{g.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tracking currency */}
      <section>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-th-text">Tracking currency</p>
            <p className="text-xs text-th-muted">{currentModeObj?.desc}</p>
          </div>
          <select
            value={currentMode}
            onChange={e => handleMode(e.target.value as TrackingMode)}
            className="rounded-lg bg-th-surface px-3 py-1.5 text-sm text-th-text outline-none"
          >
            {TRACKING_MODES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Celebration */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Celebration</p>
        <div className="flex flex-col divide-y divide-th-border">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-th-text">Visual</p>
              <p className="text-xs text-th-muted">Animation on check-off</p>
            </div>
            <button
              role="switch"
              aria-checked={celebration}
              onClick={() => handleCelebration(!celebration)}
              className={`relative h-6 w-11 rounded-full transition-colors ${celebration ? 'bg-th-btn' : 'bg-th-border'}`}
            >
              <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${celebration ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-th-text">Haptic</p>
              <p className="text-xs text-th-muted">Vibration on check-off</p>
            </div>
            <button
              role="switch"
              aria-checked={haptic}
              onClick={() => handleHaptic(!haptic)}
              className={`relative h-6 w-11 rounded-full transition-colors ${haptic ? 'bg-th-btn' : 'bg-th-border'}`}
            >
              <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${haptic ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Hidden motions */}
      {visibleHidden.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Hidden motions</p>
          <div className="flex flex-col">
            {visibleHidden.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-1 py-2.5">
                <span className="flex-1 text-sm text-th-muted">{m.name}</span>
                <button
                  onClick={() => handleUnhide(m.id)}
                  className="text-xs text-th-secondary transition-colors hover:text-th-text"
                >
                  Unhide
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Account */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Account</p>
        <div className="px-4 py-3">
          <p className="text-xs text-th-muted">Signed in as</p>
          <p className="mt-0.5 text-sm text-th-text">{email}</p>
        </div>
        <ChangePasswordForm />
      </section>

      {/* Data */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Data</p>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-th-text">Export your data</p>
            <p className="text-xs text-th-muted">Download everything as JSON</p>
          </div>
          <a href="/api/export" className="text-sm text-th-secondary hover:underline">
            Download
          </a>
        </div>
      </section>
    </div>
  )
}

function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [state, action, isPending] = useActionState(changePassword, null)

  if (!open) {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-th-secondary hover:underline"
        >
          Change password
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3 px-4 py-3">
      <input
        type="password"
        name="new_password"
        placeholder="New password"
        required
        minLength={6}
        autoComplete="new-password"
        className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
      />
      <input
        type="password"
        name="confirm_password"
        placeholder="Confirm password"
        required
        minLength={6}
        autoComplete="new-password"
        className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
      />
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-600">Password updated</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-th-btn px-3 py-2 text-xs font-medium text-th-btn-text disabled:opacity-40"
        >
          {isPending ? 'Updating…' : 'Update password'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-th-faint transition-colors hover:text-th-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
