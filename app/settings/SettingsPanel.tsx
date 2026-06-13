'use client'

import { useState, useEffect, useActionState, useTransition } from 'react'
import Link from 'next/link'
import { setTheme } from '@/app/actions/theme'
import {
  setGroupsEnabled,
  setSubmotionsEnabled,
  setDailyGoal,
  setDailyGoalHours,
  setCelebrationEnabled,
  setHapticEnabled,
  setTrackingMode,
  setEmailCycleCloseEnabled,

} from '@/app/actions/settings'
import { unhideMotion } from '@/app/actions/motions'
import { createQuickGroup } from '@/app/actions/groups'
import { uploadBackground, removeBackground, setProgressBarColor, setBackgroundPosition } from '@/app/actions/settings'
import { changePassword } from '@/app/actions/auth'
import { formatPts, formatHrs } from '@/lib/format'
import { parseHoursInput } from '@/lib/periods'
import { getBuildPreset } from '@/lib/builds'
import { detectMode, getRandomThemeAccent } from '@/lib/theme-colors'
import { ImageAdjustOverlay } from '@/app/components/ImageAdjustOverlay'
import { resizeImage } from '@/lib/image'
import { readPinTopUnpinned, writePinTopUnpinned } from '@/app/components/PinTopApplier'
import { useSaveGuard } from '@/app/components/useSaveGuard'
import { EditGroupForm } from './EditGroupForm'

const THEMES = [
  { id: 'biarritz', label: 'Biarritz', desc: 'Atlantic surf, basque sand' },
  { id: 'tjornuvik', label: 'Tjørnuvík', desc: 'Deep ocean, nordic blue' },
  { id: 'bolinas', label: 'Bolinas', desc: 'Fog, driftwood, coastal sage' },
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
  submotionsEnabled: boolean
  dailyGoal: number
  dailyGoalHours: number
  trackingMode: TrackingMode
  celebrationEnabled: boolean
  hapticEnabled: boolean
  primaryBuild: string | null
  email: string
  groups: Group[]
  hiddenMotions: HiddenMotion[]
  assignableMotions: AssignableMotion[]
  assignableSwells: AssignableSwell[]
  archivedChapterCount: number
  isAdmin: boolean
  subscriptionStatus: string
  emailCycleCloseEnabled: boolean
  backgroundUrl: string | null
  backgroundPosition: string
  progressBarColor: string | null
}

export function SettingsPanel({
  theme,
  groupsEnabled,
  submotionsEnabled,
  dailyGoal,
  dailyGoalHours,
  trackingMode,
  celebrationEnabled,
  hapticEnabled,
  primaryBuild,
  email,
  groups,
  hiddenMotions,
  assignableMotions,
  assignableSwells,
  archivedChapterCount,
  isAdmin,
  subscriptionStatus,
  emailCycleCloseEnabled,
  backgroundUrl,
  backgroundPosition: initialBackgroundPosition,
  progressBarColor: initialProgressBarColor,

}: Props) {
  const [currentTheme, setCurrentTheme] = useState(theme)
  const [currentMode, setCurrentMode] = useState<TrackingMode>(trackingMode)
  const [groupsOn, setGroupsOn] = useState(groupsEnabled)
  const [submotionsOn, setSubmotionsOn] = useState(submotionsEnabled)
  const [goalPts, setGoalPts] = useState(dailyGoal)
  const [goalHrs, setGoalHrs] = useState(dailyGoalHours)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [celebration, setCelebration] = useState(celebrationEnabled)
  const [haptic, setHaptic] = useState(hapticEnabled)
  const [cycleEmail, setCycleEmail] = useState(emailCycleCloseEnabled)
  const [vibrateSupported, setVibrateSupported] = useState(true)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator check on mount
  useEffect(() => { setVibrateSupported('vibrate' in navigator) }, [])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set())
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [hasBackground, setHasBackground] = useState(!!backgroundUrl)
  const [bgUrl, setBgUrl] = useState(backgroundUrl)
  const [bgPosition, setBgPosition] = useState(initialBackgroundPosition)
  const [topUnpinned, setTopUnpinned] = useState(() => readPinTopUnpinned())
  const [adjusting, setAdjusting] = useState(false)
  const [barColor, setBarColor] = useState(initialProgressBarColor)
  const [themeBrand, setThemeBrand] = useState<string>('#6366f1')
  useEffect(() => {
    const resolved = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
    if (/^#[0-9a-f]{6}$/i.test(resolved)) setThemeBrand(resolved)
  }, [currentTheme])

  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()
  const guard = useSaveGuard()

  function handleTheme(t: string) {
    setCurrentTheme(t)
    document.documentElement.dataset.theme = t // eslint-disable-line react-hooks/immutability -- intentional DOM mutation
    startTransition(async () => { guard(await setTheme(t)) })
  }

  function handleMode(m: TrackingMode) {
    setCurrentMode(m)
    startTransition(async () => { guard(await setTrackingMode(m)) })
  }

  function handleGroups(enabled: boolean) {
    setGroupsOn(enabled)
    startTransition(async () => { guard(await setGroupsEnabled(enabled)) })
  }

  function handleSubmotions(enabled: boolean) {
    setSubmotionsOn(enabled)
    startTransition(async () => { guard(await setSubmotionsEnabled(enabled)) })
  }

  function handleCelebration(enabled: boolean) {
    setCelebration(enabled)
    startTransition(async () => { guard(await setCelebrationEnabled(enabled)) })
  }

  function handleHaptic(enabled: boolean) {
    setHaptic(enabled)
    startTransition(async () => { guard(await setHapticEnabled(enabled)) })
  }

  function handleCycleEmail(enabled: boolean) {
    setCycleEmail(enabled)
    startTransition(async () => { guard(await setEmailCycleCloseEnabled(enabled)) })
  }

  function startEditGoal() {
    setGoalInput(currentMode === 'hours' ? formatHrs(goalHrs) : String(goalPts))
    setEditingGoal(true)
  }

  function commitGoal() {
    if (currentMode === 'hours') {
      const val = parseHoursInput(goalInput)
      if (!val || val <= 0) { setEditingGoal(false); return }
      setGoalHrs(val)
      setEditingGoal(false)
      startTransition(async () => { guard(await setDailyGoalHours(val)) })
    } else {
      const val = parseInt(goalInput)
      if (!val || val < 1) { setEditingGoal(false); return }
      setGoalPts(val)
      setEditingGoal(false)
      startTransition(async () => { guard(await setDailyGoal(val)) })
    }
  }

  function handleUnhide(id: string) {
    setLocalHiddenIds(prev => new Set([...prev, id]))
    startTransition(async () => { guard(await unhideMotion(id)) })
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
  const shapeSummary = primaryPreset
    ? primaryPreset.label
    : 'None'

  function toggle(section: string) { setOpenSection(prev => prev === section ? null : section) }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-th-border">
        {/* Appearance */}
        <div>
          <button
            onClick={() => toggle('appearance')}
            className="flex w-full items-center justify-between py-4 text-left transition-all active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium text-th-text">Appearance</p>
              <p className="text-xs text-th-muted">{currentThemeObj?.label ?? 'Default'}</p>
            </div>
          </button>
          {openSection === 'appearance' && (
            <div className="flex flex-col divide-y divide-th-border pb-4">
              <div className="pb-3">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTheme(t.id)}
                    className={`flex w-full items-center justify-between py-2.5 text-left text-sm transition-colors ${currentTheme === t.id ? 'text-th-text font-medium' : 'text-th-muted'}`}
                  >
                    <span>{t.label}</span>
                    {currentTheme === t.id && <span className="text-xs">&#10003;</span>}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-th-text">Background photo</p>
                  <p className="text-xs text-th-muted">{hasBackground ? 'Custom photo set' : 'Use theme default'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {hasBackground && (
                    <button
                      onClick={() => {
                        setHasBackground(false)
                        startTransition(async () => { guard(await removeBackground()) })
                      }}
                      className="text-xs text-th-faint transition-colors hover:text-th-muted"
                    >
                      Remove
                    </button>
                  )}
                  <label className="cursor-pointer text-sm text-th-secondary hover:underline">
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploading(true)
                        const resized = await resizeImage(file, 1920)
                        const fd = new FormData()
                        fd.append('file', resized)
                        const result = await uploadBackground(fd)
                        setUploading(false)
                        if (result && 'url' in result) {
                          setHasBackground(true)
                          setBgUrl(result.url ?? null)
                          setBgPosition('50 50 1')
                          const layer = document.getElementById('bg-image-layer')
                          if (layer) {
                            layer.style.backgroundImage = `url(${result.url})`
                            layer.style.backgroundPosition = '50% 50%'
                            layer.style.backgroundSize = 'cover'
                          }
                          document.body.classList.add('has-bg-image')
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>

              {hasBackground && bgUrl && (
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-th-text">Image position</p>
                    <p className="text-xs text-th-muted">Drag to reposition</p>
                  </div>
                  <button
                    onClick={() => setAdjusting(true)}
                    className="text-sm text-th-secondary hover:underline"
                  >
                    Adjust
                  </button>
                </div>
              )}
              {adjusting && bgUrl && (
                <ImageAdjustOverlay
                  url={bgUrl}
                  initialX={(() => { const p = bgPosition.split(/\s+/); return parseFloat(p[0]) || 50 })()}
                  initialY={(() => { const p = bgPosition.split(/\s+/); return parseFloat(p[1] ?? p[0]) || 50 })()}
                  initialScale={(() => { const p = bgPosition.split(/\s+/); return parseFloat(p[2]) || 1 })()}
                  onSave={(x, y, s) => {
                    const pos = `${Math.round(x)} ${Math.round(y)} ${Math.round(s * 100) / 100}`
                    setBgPosition(pos)
                    setAdjusting(false)
                    const layer = document.getElementById('bg-image-layer')
                    if (layer) {
                      layer.style.backgroundPosition = `${Math.round(x)}% ${Math.round(y)}%`
                      if (s > 1) {
                        const vw = window.innerWidth
                        const vh = window.innerHeight
                        const img = new Image()
                        img.onload = () => {
                          const imgR = img.naturalWidth / img.naturalHeight
                          const vpR = vw / vh
                          layer.style.backgroundSize = imgR > vpR ? `auto ${vh * s}px` : `${vw * s}px auto`
                        }
                        img.src = bgUrl
                      } else {
                        layer.style.backgroundSize = 'cover'
                      }
                    }
                    startTransition(async () => { guard(await setBackgroundPosition(pos)) })
                  }}
                  onCancel={() => setAdjusting(false)}
                />
              )}

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-th-text">Floating top bar</p>
                  <p className="text-xs text-th-muted">{topUnpinned ? 'Scrolls away with the page' : 'Stays pinned at the top'}</p>
                </div>
                <button
                  onClick={() => {
                    const next = !topUnpinned
                    setTopUnpinned(next)
                    writePinTopUnpinned(next)
                  }}
                  className="text-sm text-th-secondary hover:underline"
                >
                  {topUnpinned ? 'Pin' : 'Unpin'}
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-th-text">Accent color</p>
                  <p className="text-xs text-th-muted">{barColor ? 'Custom' : 'Theme default'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {barColor && (
                    <button
                      onClick={() => {
                        setBarColor(null)
                        startTransition(async () => { guard(await setProgressBarColor(null)) })
                      }}
                      className="text-xs text-th-faint transition-colors hover:text-th-muted"
                    >
                      Reset
                    </button>
                  )}
                  <input
                    type="color"
                    value={barColor || themeBrand}
                    onChange={(e) => {
                      setBarColor(e.target.value)
                      startTransition(async () => { guard(await setProgressBarColor(e.target.value)) })
                    }}
                    className="h-8 w-8 cursor-pointer rounded-lg border border-th-border bg-th-surface p-0.5"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Starter sets */}
        <Link
          href="/settings/shape"
          className="flex items-center justify-between gap-3 py-4 transition-all active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-th-text">Starter sets</p>
            <p className="truncate text-xs text-th-muted">{shapeSummary}</p>
          </div>
        </Link>

        {/* Past chapters */}
        {archivedChapterCount > 0 && (
          <Link
            href="/settings/chapters"
            className="flex items-center justify-between gap-3 py-4 transition-all active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-th-text">Past chapters</p>
              <p className="truncate text-xs text-th-muted">
                {archivedChapterCount} closed {archivedChapterCount === 1 ? 'chapter' : 'chapters'}
              </p>
            </div>
            </Link>
        )}

        {/* Tracking */}
        <div>
          <button
            onClick={() => toggle('tracking')}
            className="flex w-full items-center justify-between py-4 text-left transition-all active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium text-th-text">Tracking and organization</p>
              <p className="text-xs text-th-muted">{currentModeObj?.label} · {goalLabel}/day</p>
            </div>
          </button>
          {openSection === 'tracking' && (
            <div className="flex flex-col divide-y divide-th-border pb-4">
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
                      type={currentMode === 'hours' ? 'text' : 'number'}
                      {...(currentMode === 'hours' ? { inputMode: 'decimal' as const } : { min: '1', step: '1' })}
                      value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      onBlur={commitGoal}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitGoal()
                        if (e.key === 'Escape') setEditingGoal(false)
                      }}
                      className="w-16 rounded-lg border border-th-border bg-th-surface px-2 py-1 text-sm text-th-text outline-none focus:border-th-focus text-right"
                    />
                    {currentMode !== 'hours' && <span className="text-xs text-th-muted">pts</span>}
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

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-th-text">Buckets</p>
                  <p className="text-xs text-th-muted">Cluster motions by when they happen</p>
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

              {groupsOn && groups.length > 0 && groups.map(g => (
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

              {groupsOn && groups.length === 0 && (
                <div className="py-3">
                  <p className="text-xs text-th-muted">
                    Cluster motions by when they happen. Morning, Evening, At work. The cluster is the cue.
                  </p>
                  <div className="mt-2 flex gap-2">
                    {['Morning rituals', 'Wind down'].map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          const color = getRandomThemeAccent(
                            document.documentElement.dataset.theme ?? 'biarritz',
                            detectMode()
                          )
                          startTransition(async () => { guard(await createQuickGroup(name, color)) })
                        }}
                        className="rounded-full border border-th-border px-3 py-1 text-xs text-th-muted transition-colors hover:border-th-focus hover:text-th-text"
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-th-text">Submotions</p>
                  <p className="text-xs text-th-muted">Break a motion into smaller parts</p>
                </div>
                <button
                  role="switch"
                  aria-checked={submotionsOn}
                  onClick={() => handleSubmotions(!submotionsOn)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${submotionsOn ? 'bg-th-btn' : 'bg-th-border'}`}
                >
                  <span
                    className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${submotionsOn ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Celebrations & Notifications */}
        <div>
          <button
            onClick={() => toggle('celebration')}
            className="flex w-full items-center justify-between py-4 text-left transition-all active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium text-th-text">Celebrations and notifications</p>
              <p className="text-xs text-th-muted">
                {celebration ? 'Visual on' : 'Visual off'}{haptic ? ' · Haptic on' : ''}{cycleEmail ? ' · Weekly email on' : ''}
              </p>
            </div>
          </button>
          {openSection === 'celebration' && (
            <div className="flex flex-col divide-y divide-th-border pb-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-th-text">Visual</p>
                  <p className="text-xs text-th-muted">Wave animation when you cross a weekly swell target</p>
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
                  <p className="text-xs text-th-muted">Subtle taps when you log and unlog</p>
                  {!vibrateSupported && <p className="text-xs text-th-faint">Not supported on this device</p>}
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
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-medium text-th-text">Weekly wake email</p>
                  <p className="text-xs text-th-muted">Sunday morning note when your week closes</p>
                </div>
                <button
                  role="switch"
                  aria-checked={cycleEmail}
                  onClick={() => handleCycleEmail(!cycleEmail)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${cycleEmail ? 'bg-th-btn' : 'bg-th-border'}`}
                >
                  <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${cycleEmail ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account */}
        <div>
          <button
            onClick={() => toggle('account')}
            className="flex w-full items-center justify-between py-4 text-left transition-all active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium text-th-text">Account</p>
              <p className="truncate text-xs text-th-muted">{email}</p>
            </div>
          </button>
          {openSection === 'account' && (
            <div className="pb-4">
              <ChangePasswordForm />
            </div>
          )}
        </div>

        {/* Install Onduler */}
        <Link
          href="/welcome"
          className="flex items-center justify-between gap-3 py-4 transition-all active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-th-text">Install Onduler</p>
            <p className="truncate text-xs text-th-muted">Add to your home screen</p>
          </div>
        </Link>

        {/* Data */}
        <div>
          <button
            onClick={() => toggle('data')}
            className="flex w-full items-center justify-between py-4 text-left transition-all active:scale-[0.99]"
          >
            <p className="text-sm font-medium text-th-text">Data</p>
          </button>
          {openSection === 'data' && (
            <div className="flex flex-col gap-3 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-th-text">Export your data</p>
                  <p className="text-xs text-th-muted">Download everything as JSON</p>
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/export')
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `onduler-export-${new Date().toISOString().slice(0, 10)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-sm text-th-secondary hover:underline"
                >
                  Download
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-th-text">Import from your AI</p>
                  <p className="text-xs text-th-muted">Set up swells and motions with any LLM</p>
                </div>
                <Link href="/settings/import" className="text-sm text-th-secondary hover:underline">
                  Import
                </Link>
              </div>
              {visibleHidden.length > 0 && (
                <div className="mt-2">
                  <p className="mb-2 text-xs text-th-faint">Hidden motions</p>
                  {visibleHidden.map(m => (
                    <div key={m.id} className="flex items-center gap-3 py-2">
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
              )}
            </div>
          )}
        </div>

        {/* Crew (admin-only during testing) */}
        {isAdmin && (
          <Link
            href="/settings/billing"
            className="flex items-center justify-between gap-3 py-4 transition-all active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-th-text">Crew</p>
              <p className="truncate text-xs text-th-muted">
                {subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
                  ? 'Active member'
                  : subscriptionStatus === 'lifetime'
                    ? 'Lifetime member'
                    : 'Support Onduler'}
              </p>
            </div>
            </Link>
        )}
      </div>

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
