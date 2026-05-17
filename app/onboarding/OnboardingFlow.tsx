'use client'

import { useEffect, useState, useTransition } from 'react'
import { completeOnboarding } from '@/app/actions/settings'
import { getRandomThemeAccent } from '@/lib/theme-colors'

type Step = 'swells' | 'motions' | 'personalize'
type TrackingMode = 'points' | 'hours'

type StagedSwell = { name: string; color: string }
type StagedMotion = { name: string; swellIndices: number[] }

const THEMES = [
  { id: 'default', label: 'Default', desc: 'Clean and minimal' },
  { id: 'bolinas', label: 'Bolinas', desc: 'Fog, driftwood, coastal sage' },
  { id: 'biarritz', label: 'Biarritz', desc: 'Atlantic surf, basque sand' },
]

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>('swells')

  const [swells, setSwells] = useState<StagedSwell[]>([])
  const [motions, setMotions] = useState<StagedMotion[]>([])

  const [swellName, setSwellName] = useState('')
  const [swellColor, setSwellColor] = useState('#6b7280')
  const [editingSwellIdx, setEditingSwellIdx] = useState<number | null>(null)
  const [editSwellName, setEditSwellName] = useState('')
  const [editSwellColor, setEditSwellColor] = useState('#6b7280')

  const [motionName, setMotionName] = useState('')
  const [motionSwellIndices, setMotionSwellIndices] = useState<Set<number>>(new Set())
  const [editingMotionIdx, setEditingMotionIdx] = useState<number | null>(null)
  const [editMotionName, setEditMotionName] = useState('')
  const [editMotionSwellIndices, setEditMotionSwellIndices] = useState<Set<number>>(new Set())

  const [theme, setTheme] = useState('default')
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('points')
  const [hapticEnabled, setHapticEnabled] = useState(true)
  const [celebrationEnabled, setCelebrationEnabled] = useState(true)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = document.documentElement.dataset.theme ?? 'default'
    setSwellColor(getRandomThemeAccent(t))
  }, [])

  function addSwell() {
    const name = swellName.trim()
    if (!name) return
    setSwells(prev => [...prev, { name, color: swellColor }])
    setSwellName('')
    const t = document.documentElement.dataset.theme ?? 'default'
    setSwellColor(getRandomThemeAccent(t))
  }

  function startEditSwell(idx: number) {
    setEditingSwellIdx(idx)
    setEditSwellName(swells[idx].name)
    setEditSwellColor(swells[idx].color)
  }

  function saveEditSwell() {
    if (editingSwellIdx === null) return
    const name = editSwellName.trim()
    if (!name) return
    setSwells(prev =>
      prev.map((s, i) => (i === editingSwellIdx ? { name, color: editSwellColor } : s))
    )
    setEditingSwellIdx(null)
  }

  function cancelEditSwell() {
    setEditingSwellIdx(null)
  }

  function removeSwell(idx: number) {
    setSwells(prev => prev.filter((_, i) => i !== idx))
    setMotions(prev =>
      prev.map(m => ({
        ...m,
        swellIndices: m.swellIndices.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i)),
      }))
    )
    setMotionSwellIndices(prev => {
      const next = new Set<number>()
      prev.forEach(i => {
        if (i === idx) return
        next.add(i > idx ? i - 1 : i)
      })
      return next
    })
    if (editingSwellIdx === idx) setEditingSwellIdx(null)
  }

  function toggleMotionSwell(idx: number) {
    setMotionSwellIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleEditMotionSwell(idx: number) {
    setEditMotionSwellIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function addMotion() {
    const name = motionName.trim()
    if (!name) return
    setMotions(prev => [
      ...prev,
      { name, swellIndices: Array.from(motionSwellIndices).sort((a, b) => a - b) },
    ])
    setMotionName('')
    setMotionSwellIndices(new Set())
  }

  function startEditMotion(idx: number) {
    setEditingMotionIdx(idx)
    setEditMotionName(motions[idx].name)
    setEditMotionSwellIndices(new Set(motions[idx].swellIndices))
  }

  function saveEditMotion() {
    if (editingMotionIdx === null) return
    const name = editMotionName.trim()
    if (!name) return
    setMotions(prev =>
      prev.map((m, i) =>
        i === editingMotionIdx
          ? {
              name,
              swellIndices: Array.from(editMotionSwellIndices).sort((a, b) => a - b),
            }
          : m
      )
    )
    setEditingMotionIdx(null)
  }

  function cancelEditMotion() {
    setEditingMotionIdx(null)
  }

  function removeMotion(idx: number) {
    setMotions(prev => prev.filter((_, i) => i !== idx))
    if (editingMotionIdx === idx) setEditingMotionIdx(null)
  }

  function previewTheme(t: string) {
    setTheme(t)
    document.documentElement.dataset.theme = t
  }

  function finish(useDefaults = false) {
    setError(null)
    const prefs = useDefaults
      ? {
          theme: 'default',
          tracking_mode: 'points' as const,
          haptic_enabled: true,
          celebration_enabled: true,
        }
      : {
          theme,
          tracking_mode: trackingMode,
          haptic_enabled: hapticEnabled,
          celebration_enabled: celebrationEnabled,
        }

    startTransition(async () => {
      const result = await completeOnboarding(swells, motions, prefs)
      if (result?.error) setError(result.error)
    })
  }

  if (step === 'swells') {
    return (
      <ScreenShell
        title="What do you want your life to feel like?"
        description="Add the things you want your life to feel full of. You can add more later. We call these swells."
      >
        {swells.length > 0 && (
          <div className="flex flex-col gap-2">
            {swells.map((s, i) =>
              editingSwellIdx === i ? (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border border-th-btn bg-th-surface p-3"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editSwellName}
                      onChange={e => setEditSwellName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEditSwell()}
                      autoFocus
                      className="flex-1 rounded-lg border border-th-border bg-th-bg px-3 py-2 text-base text-th-text outline-none focus:border-th-focus"
                    />
                    <input
                      type="color"
                      value={editSwellColor}
                      onChange={e => setEditSwellColor(e.target.value)}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-th-border bg-th-bg p-1"
                      aria-label="Swell color"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditSwell}
                      className="flex-1 rounded-lg border border-th-border py-2 text-sm text-th-muted transition-colors hover:bg-th-bg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditSwell}
                      disabled={!editSwellName.trim()}
                      className="flex-1 rounded-lg bg-th-btn py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <button
                    onClick={() => startEditSwell(i)}
                    className="flex-1 text-left text-sm text-th-text"
                  >
                    {s.name}
                  </button>
                  <button
                    onClick={() => removeSwell(i)}
                    className="text-sm text-th-faint transition-colors hover:text-red-500"
                    aria-label={`Remove ${s.name}`}
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Be present"
            value={swellName}
            onChange={e => setSwellName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSwell()}
            className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
          />
          <input
            type="color"
            value={swellColor}
            onChange={e => setSwellColor(e.target.value)}
            className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
            aria-label="Swell color"
          />
          <button
            onClick={addSwell}
            disabled={!swellName.trim()}
            className="shrink-0 rounded-lg border border-th-border px-4 text-sm text-th-muted transition-colors hover:bg-th-surface disabled:opacity-40"
          >
            Add
          </button>
        </div>

        <button
          onClick={() => setStep('motions')}
          disabled={swells.length === 0}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97] disabled:opacity-40"
        >
          {swells.length === 0 ? 'Add at least one' : 'Next →'}
        </button>
      </ScreenShell>
    )
  }

  if (step === 'motions') {
    return (
      <ScreenShell
        onBack={() => setStep('swells')}
        title="What in your daily life makes you feel that?"
        description="Add the daily motions that feed your swells. You can add more later. We call these motions."
      >
        {motions.length > 0 && (
          <div className="flex flex-col gap-2">
            {motions.map((m, i) =>
              editingMotionIdx === i ? (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-lg border border-th-btn bg-th-surface p-3"
                >
                  <input
                    type="text"
                    value={editMotionName}
                    onChange={e => setEditMotionName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        saveEditMotion()
                      }
                    }}
                    autoFocus
                    className="rounded-lg border border-th-border bg-th-bg px-3 py-2 text-base text-th-text outline-none focus:border-th-focus"
                  />
                  {swells.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {swells.map((s, idx) => {
                        const on = editMotionSwellIndices.has(idx)
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleEditMotionSwell(idx)}
                            className="rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-[0.97]"
                            style={{
                              backgroundColor: on ? s.color : 'transparent',
                              color: on ? '#fff' : s.color,
                              border: `1px solid ${s.color}`,
                            }}
                          >
                            {s.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditMotion}
                      className="flex-1 rounded-lg border border-th-border py-2 text-sm text-th-muted transition-colors hover:bg-th-bg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditMotion}
                      disabled={!editMotionName.trim()}
                      className="flex-1 rounded-lg bg-th-btn py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 rounded-lg border border-th-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => startEditMotion(i)}
                      className="flex-1 text-left text-sm text-th-text"
                    >
                      {m.name}
                    </button>
                    <button
                      onClick={() => removeMotion(i)}
                      className="text-sm text-th-faint transition-colors hover:text-red-500"
                      aria-label={`Remove ${m.name}`}
                    >
                      ×
                    </button>
                  </div>
                  {m.swellIndices.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.swellIndices.map(idx => (
                        <span
                          key={idx}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: swells[idx]?.color }}
                        >
                          {swells[idx]?.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Motion name"
              value={motionName}
              onChange={e => setMotionName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMotion()
                }
              }}
              className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
            />
            <button
              onClick={addMotion}
              disabled={!motionName.trim()}
              className="shrink-0 rounded-lg border border-th-border px-4 text-sm text-th-muted transition-colors hover:bg-th-surface disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {swells.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {swells.map((s, i) => {
                const on = motionSwellIndices.has(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggleMotionSwell(i)}
                    className="rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: on ? s.color : 'transparent',
                      color: on ? '#fff' : s.color,
                      border: `1px solid ${s.color}`,
                    }}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setStep('personalize')}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97]"
        >
          Next →
        </button>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell
      onBack={() => setStep('motions')}
      title="Make it yours."
      description="A few choices to set the feel. You can change all of these in Settings."
    >
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-th-muted">Theme</p>
        <div className="flex flex-col gap-2">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => previewTheme(t.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                theme === t.id ? 'border-th-btn' : 'border-th-border hover:bg-th-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${
                    theme === t.id ? 'border-th-btn bg-th-btn' : 'border-th-border'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-th-text">{t.label}</p>
                  <p className="text-xs text-th-muted">{t.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-th-muted">Track in</p>
        <div className="mb-1.5 flex gap-2">
          <button
            onClick={() => setTrackingMode('points')}
            className={`flex-1 rounded-lg border py-2.5 text-sm transition-colors ${
              trackingMode === 'points'
                ? 'border-th-btn text-th-text'
                : 'border-th-border text-th-muted hover:bg-th-surface'
            }`}
          >
            Points
          </button>
          <button
            onClick={() => setTrackingMode('hours')}
            className={`flex-1 rounded-lg border py-2.5 text-sm transition-colors ${
              trackingMode === 'hours'
                ? 'border-th-btn text-th-text'
                : 'border-th-border text-th-muted hover:bg-th-surface'
            }`}
          >
            Hours
          </button>
        </div>
        <p className="text-xs text-th-faint">
          Points weigh motions by effort. Hours track actual time spent.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <ToggleRow
          label="Haptics"
          desc="Subtle taps when you log and unlog."
          enabled={hapticEnabled}
          onToggle={() => setHapticEnabled(v => !v)}
        />
        <ToggleRow
          label="Celebrations"
          desc="Wave animation when you cross a weekly swell target."
          enabled={celebrationEnabled}
          onToggle={() => setCelebrationEnabled(v => !v)}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex flex-col gap-3">
        <button
          onClick={() => finish(false)}
          disabled={isPending}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97] disabled:opacity-50"
        >
          {isPending ? 'Setting up…' : 'Go to dashboard →'}
        </button>
        <button
          onClick={() => finish(true)}
          disabled={isPending}
          className="text-center text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-50"
        >
          Skip and use defaults
        </button>
      </div>
    </ScreenShell>
  )
}

function ScreenShell({
  onBack,
  title,
  description,
  children,
}: {
  onBack?: () => void
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col items-center">
      <div className="flex w-full max-w-[22rem] flex-col px-4">
        <div className="sticky top-0 z-10 -mx-4 bg-th-bg px-4 pb-4 pt-12">
          {onBack ? (
            <button
              onClick={onBack}
              className="mb-4 text-sm text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
            >
              ← Back
            </button>
          ) : (
            <p className="mb-2 text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          )}
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">{title}</h1>
          <p className="text-sm text-th-muted">{description}</p>
        </div>
        <div className="flex flex-col gap-6 pb-12 pt-2">{children}</div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  desc,
  enabled,
  onToggle,
}: {
  label: string
  desc: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-th-text">{label}</p>
        <p className="text-xs text-th-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-th-btn' : 'bg-th-border'
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
