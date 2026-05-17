'use client'

import { useEffect, useState, useTransition } from 'react'
import { completeOnboarding } from '@/app/actions/settings'
import { getRandomThemeAccent } from '@/lib/theme-colors'
import { formatPts } from '@/lib/format'

type Step = 'swells' | 'motions' | 'personalize'
type TrackingMode = 'points' | 'hours'

type StagedSwell = { name: string; color: string }
type StagedMotion = { name: string; default_points: number; swellIndices: number[] }

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

  const [motionName, setMotionName] = useState('')
  const [motionPts, setMotionPts] = useState(2)
  const [motionSwellIndices, setMotionSwellIndices] = useState<Set<number>>(new Set())

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

  function removeSwell(idx: number) {
    setSwells(prev => prev.filter((_, i) => i !== idx))
    setMotions(prev =>
      prev.map(m => ({
        ...m,
        swellIndices: m.swellIndices
          .filter(i => i !== idx)
          .map(i => (i > idx ? i - 1 : i)),
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
  }

  function toggleMotionSwell(idx: number) {
    setMotionSwellIndices(prev => {
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
      {
        name,
        default_points: motionPts,
        swellIndices: Array.from(motionSwellIndices).sort((a, b) => a - b),
      },
    ])
    setMotionName('')
    setMotionPts(2)
    setMotionSwellIndices(new Set())
  }

  function removeMotion(idx: number) {
    setMotions(prev => prev.filter((_, i) => i !== idx))
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
      <div className="flex min-h-full flex-col items-center px-4 py-12">
        <div className="w-full max-w-[22rem]">
          <p className="mb-2 text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">
            What do you want your life to feel like?
          </h1>
          <p className="mb-6 text-sm text-th-muted">
            Add the things you want your life to feel full of. We call these swells.
          </p>

          {swells.length > 0 && (
            <div className="mb-6 flex flex-col gap-2">
              {swells.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 text-sm text-th-text">{s.name}</span>
                  <button
                    onClick={() => removeSwell(i)}
                    className="text-sm text-th-faint transition-colors hover:text-red-500"
                    aria-label={`Remove ${s.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mb-8 flex gap-2">
            <input
              type="text"
              placeholder="e.g. Be present"
              value={swellName}
              onChange={e => setSwellName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSwell()}
              autoFocus
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
        </div>
      </div>
    )
  }

  if (step === 'motions') {
    return (
      <div className="flex min-h-full flex-col items-center px-4 py-12">
        <div className="w-full max-w-[22rem]">
          <button
            onClick={() => setStep('swells')}
            className="mb-6 text-sm text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Back
          </button>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">
            What in your daily life makes you feel that?
          </h1>
          <p className="mb-6 text-sm text-th-muted">
            Add the daily motions that feed your swells. You can add more later.
          </p>

          {motions.length > 0 && (
            <div className="mb-6 flex flex-col gap-2">
              {motions.map((m, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 rounded-lg border border-th-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-th-text">{m.name}</span>
                    <span className="text-xs text-th-faint">{formatPts(m.default_points)}</span>
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
              ))}
            </div>
          )}

          <div className="mb-4 flex flex-col gap-3">
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
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
            />
            <div className="flex items-center gap-3">
              <label className="shrink-0 text-xs text-th-muted">Points</label>
              <input
                type="number"
                min="1"
                value={motionPts}
                onChange={e => setMotionPts(parseInt(e.target.value) || 1)}
                className="w-20 rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
              />
              <button
                onClick={addMotion}
                disabled={!motionName.trim()}
                className="flex-1 rounded-lg border border-th-border py-2.5 text-sm text-th-muted transition-colors hover:bg-th-surface disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {swells.length > 0 && (
            <div className="mb-8">
              <p className="mb-2 text-xs text-th-muted">Feeds which swells? (optional)</p>
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
            </div>
          )}

          <button
            onClick={() => setStep('personalize')}
            className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97]"
          >
            Next →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <button
          onClick={() => setStep('motions')}
          className="mb-6 text-sm text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
        >
          ← Back
        </button>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">
          Make it yours.
        </h1>
        <p className="mb-6 text-sm text-th-muted">
          A few choices to set the feel. You can change all of these in Settings.
        </p>

        <div className="mb-6">
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

        <div className="mb-6">
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

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-6 flex flex-col gap-3">
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
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-th-text">{label}</p>
        <p className="text-xs text-th-muted">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-th-btn' : 'bg-th-border'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
