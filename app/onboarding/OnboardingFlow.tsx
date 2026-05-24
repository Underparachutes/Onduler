'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { completeOnboarding } from '@/app/actions/settings'
import { detectMode, getRandomThemeAccent, getShuffledThemePalette } from '@/lib/theme-colors'
import { BUILD_PRESETS } from '@/lib/builds'

type Step = 'swells' | 'motions' | 'personalize'
type TrackingMode = 'points' | 'hours'

type SwellEntry = {
  id: number
  name: string
  description: string
  color: string
  picked: boolean
  custom: boolean
}

type MotionEntry = {
  id: number
  swellId: number
  name: string
}

const SEEDED_SWELLS: { name: string; description: string; motionHint: string }[] = [
  { name: 'Movement', description: 'exercise, sport, walking, being in your body', motionHint: 'e.g. walk, lift, swim' },
  { name: 'Mind', description: 'meditation, journaling, reading, learning', motionHint: 'e.g. meditate, journal, read' },
  { name: 'Nutrition', description: 'cooking, eating well, nourishment', motionHint: 'e.g. cook, eat slowly' },
  { name: 'Home', description: 'your space, comfort, domestic life', motionHint: 'e.g. tidy, repair, plant' },
  { name: 'Family', description: 'partner, kids, parents, siblings', motionHint: 'e.g. call mom, dinner together' },
  { name: 'Friends', description: 'broader social life, community', motionHint: 'e.g. text a friend, host' },
  { name: 'Work', description: 'your livelihood, career, craft as profession', motionHint: 'e.g. focused work, ship something' },
  { name: 'Money', description: 'finances, savings, side income', motionHint: 'e.g. budget, invest' },
  { name: 'Creativity', description: 'making things, art, music, writing', motionHint: 'e.g. write, paint, play' },
  { name: 'Adventure', description: 'travel, novelty, trying new things', motionHint: 'e.g. try something new' },
]

const CUSTOM_HINT = 'e.g. add an action'

const ARCHETYPE_PACKS = BUILD_PRESETS.map(p => ({
  key: p.key,
  label: p.label,
  swellNames: p.seededSwells,
}))

const THEMES = [
  { id: 'default', label: 'Default', desc: 'Clean and minimal' },
  { id: 'bolinas', label: 'Bolinas', desc: 'Fog, driftwood, coastal sage' },
  { id: 'biarritz', label: 'Biarritz', desc: 'Atlantic surf, basque sand' },
]

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>('swells')

  const [swellEntries, setSwellEntries] = useState<SwellEntry[]>([])
  const [nextSwellId, setNextSwellId] = useState(SEEDED_SWELLS.length)

  const [editingSwellId, setEditingSwellId] = useState<number | null>(null)
  const [editSwellName, setEditSwellName] = useState('')
  const [editSwellColor, setEditSwellColor] = useState('#6b7280')

  const [motions, setMotions] = useState<MotionEntry[]>([])
  const [nextMotionId, setNextMotionId] = useState(0)
  const [motionDrafts, setMotionDrafts] = useState<Record<number, string>>({})
  const [editingMotionId, setEditingMotionId] = useState<number | null>(null)
  const [editMotionName, setEditMotionName] = useState('')

  const [theme, setTheme] = useState('default')
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('points')
  const [hapticEnabled, setHapticEnabled] = useState(true)
  const [celebrationEnabled, setCelebrationEnabled] = useState(true)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = document.documentElement.dataset.theme ?? 'default'
    const palette = getShuffledThemePalette(t, detectMode())
    setSwellEntries(
      SEEDED_SWELLS.map((s, i) => ({
        id: i,
        name: s.name,
        description: s.description,
        color: palette[i % palette.length],
        picked: false,
        custom: false,
      }))
    )
  }, [])

  const pickedSwells = swellEntries.filter(s => s.picked)

  const activePackKey = useMemo(() => {
    const pickedSeededNames = new Set(
      swellEntries.filter(s => s.picked && !s.custom).map(s => s.name)
    )
    return (
      ARCHETYPE_PACKS.find(
        p =>
          p.swellNames.length === pickedSeededNames.size &&
          p.swellNames.every(n => pickedSeededNames.has(n))
      )?.key ?? null
    )
  }, [swellEntries])

  function applyPack(key: string) {
    const pack = ARCHETYPE_PACKS.find(p => p.key === key)
    if (!pack) return
    const isActive = activePackKey === key
    const packNames = new Set(isActive ? [] : pack.swellNames)
    setSwellEntries(prev =>
      prev.map(s => (s.custom ? s : { ...s, picked: packNames.has(s.name) }))
    )
  }

  const displayedSwells = useMemo(() => {
    const picked = swellEntries.filter(s => s.picked)
    const unpicked = swellEntries.filter(s => !s.picked)
    return [...picked, ...unpicked]
  }, [swellEntries])

  function togglePicked(id: number) {
    setSwellEntries(prev =>
      prev.map(s => (s.id === id ? { ...s, picked: !s.picked } : s))
    )
  }

  function removeCustomSwell(id: number) {
    setSwellEntries(prev => prev.filter(s => s.id !== id))
    setMotions(prev => prev.filter(m => m.swellId !== id))
    setMotionDrafts(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (editingSwellId === id) setEditingSwellId(null)
  }

  function addCustomSwell() {
    const t = document.documentElement.dataset.theme ?? 'default'
    const mode = detectMode()
    const newId = nextSwellId
    setNextSwellId(prev => prev + 1)
    setSwellEntries(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        description: '',
        color: getRandomThemeAccent(t, mode),
        picked: true,
        custom: true,
      },
    ])
    setEditingSwellId(newId)
    setEditSwellName('')
    setEditSwellColor(getRandomThemeAccent(t, mode))
  }

  function startEditSwell(id: number) {
    const s = swellEntries.find(s => s.id === id)
    if (!s) return
    setEditingSwellId(id)
    setEditSwellName(s.name)
    setEditSwellColor(s.color)
  }

  function saveEditSwell() {
    if (editingSwellId === null) return
    const name = editSwellName.trim()
    if (!name) return
    setSwellEntries(prev =>
      prev.map(s =>
        s.id === editingSwellId ? { ...s, name, color: editSwellColor } : s
      )
    )
    setEditingSwellId(null)
  }

  function cancelEditSwell() {
    const editing = swellEntries.find(s => s.id === editingSwellId)
    if (editing && editing.custom && !editing.name) {
      removeCustomSwell(editing.id)
    }
    setEditingSwellId(null)
  }

  function addMotion(swellId: number) {
    const draft = (motionDrafts[swellId] ?? '').trim()
    if (!draft) return
    const newId = nextMotionId
    setNextMotionId(prev => prev + 1)
    setMotions(prev => [...prev, { id: newId, swellId, name: draft }])
    setMotionDrafts(prev => ({ ...prev, [swellId]: '' }))
  }

  function startEditMotion(id: number) {
    const m = motions.find(m => m.id === id)
    if (!m) return
    setEditingMotionId(id)
    setEditMotionName(m.name)
  }

  function saveEditMotion() {
    if (editingMotionId === null) return
    const name = editMotionName.trim()
    if (!name) return
    setMotions(prev =>
      prev.map(m => (m.id === editingMotionId ? { ...m, name } : m))
    )
    setEditingMotionId(null)
  }

  function cancelEditMotion() {
    setEditingMotionId(null)
  }

  function removeMotion(id: number) {
    setMotions(prev => prev.filter(m => m.id !== id))
    if (editingMotionId === id) setEditingMotionId(null)
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

    const finalSwells = pickedSwells.map(s => ({ name: s.name, color: s.color }))
    const swellIndexById: Record<number, number> = {}
    pickedSwells.forEach((s, i) => {
      swellIndexById[s.id] = i
    })
    const finalMotions = motions
      .filter(m => swellIndexById[m.swellId] !== undefined)
      .map(m => ({
        name: m.name,
        swellIndices: [swellIndexById[m.swellId]],
      }))

    startTransition(async () => {
      const result = await completeOnboarding(finalSwells, finalMotions, prefs)
      if (result?.error) setError(result.error)
    })
  }

  if (step === 'swells') {
    return (
      <ScreenShell
        title="Choose your swells."
        description="Swells are nouns — the areas of life you want to invest in. Pick a few or add your own. You can edit them anytime."
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-th-faint">Or try a mix</p>
          <div className="grid grid-cols-2 gap-2">
            {ARCHETYPE_PACKS.map(p => {
              const active = activePackKey === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => applyPack(p.key)}
                  className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
                    active
                      ? 'border-th-btn bg-th-surface'
                      : 'border-th-border hover:bg-th-surface'
                  }`}
                >
                  <span className="text-sm font-medium text-th-text">{p.label}</span>
                  <span className="text-xs leading-snug text-th-muted">
                    {p.swellNames.join(' · ')}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-th-faint">All swells</p>
          {displayedSwells.map(s =>
            editingSwellId === s.id ? (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-lg border border-th-btn bg-th-surface p-3"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editSwellName}
                    onChange={e => setEditSwellName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        saveEditSwell()
                      }
                    }}
                    autoFocus
                    placeholder="Swell name"
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
            ) : s.picked ? (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors"
                style={{ borderColor: s.color }}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <button
                  onClick={() => startEditSwell(s.id)}
                  className="flex-1 text-left text-sm font-medium text-th-text"
                >
                  {s.name}
                </button>
                <button
                  onClick={() =>
                    s.custom ? removeCustomSwell(s.id) : togglePicked(s.id)
                  }
                  className="text-sm text-th-faint transition-colors hover:text-red-500"
                  aria-label={s.custom ? `Remove ${s.name}` : `Unpick ${s.name}`}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                key={s.id}
                onClick={() => togglePicked(s.id)}
                className="flex flex-col gap-0.5 rounded-lg border border-th-border px-4 py-3 text-left transition-colors hover:bg-th-surface active:scale-[0.99]"
              >
                <span className="text-sm font-medium text-th-text">{s.name}</span>
                <span className="text-xs text-th-muted">{s.description}</span>
              </button>
            )
          )}

          <button
            onClick={addCustomSwell}
            className="rounded-lg border border-dashed border-th-border px-4 py-3 text-left text-sm text-th-muted transition-colors hover:bg-th-surface active:scale-[0.99]"
          >
            + Add your own
          </button>
        </div>

        <button
          onClick={() => setStep('motions')}
          disabled={pickedSwells.length === 0 || pickedSwells.some(s => !s.name)}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97] disabled:opacity-40"
        >
          {pickedSwells.length === 0 ? 'Pick at least one' : 'Next →'}
        </button>
      </ScreenShell>
    )
  }

  if (step === 'motions') {
    const seededHintByName: Record<string, string> = {}
    SEEDED_SWELLS.forEach(s => {
      seededHintByName[s.name] = s.motionHint
    })

    return (
      <ScreenShell
        onBack={() => setStep('swells')}
        title="What do you do for each?"
        description="Motions are verbs — the daily actions that feed each swell. Add a few or skip and add them later."
      >
        <div className="flex flex-col gap-6">
          {pickedSwells.map(s => {
            const swellMotions = motions.filter(m => m.swellId === s.id)
            const hint = seededHintByName[s.name] ?? CUSTOM_HINT
            const draft = motionDrafts[s.id] ?? ''
            return (
              <div key={s.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <p
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: s.color }}
                  >
                    {s.name}
                  </p>
                </div>

                {swellMotions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {swellMotions.map(m =>
                      editingMotionId === m.id ? (
                        <div
                          key={m.id}
                          className="flex flex-col gap-2 rounded-lg border border-th-btn bg-th-surface p-3"
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
                          key={m.id}
                          className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3"
                        >
                          <button
                            onClick={() => startEditMotion(m.id)}
                            className="flex-1 text-left text-sm text-th-text"
                          >
                            {m.name}
                          </button>
                          <button
                            onClick={() => removeMotion(m.id)}
                            className="text-sm text-th-faint transition-colors hover:text-red-500"
                            aria-label={`Remove ${m.name}`}
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
                    placeholder={hint}
                    value={draft}
                    onChange={e =>
                      setMotionDrafts(prev => ({ ...prev, [s.id]: e.target.value }))
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addMotion(s.id)
                      }
                    }}
                    className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
                  />
                  <button
                    onClick={() => addMotion(s.id)}
                    disabled={!draft.trim()}
                    className="shrink-0 rounded-lg border border-th-border px-4 text-sm text-th-muted transition-colors hover:bg-th-surface disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            )
          })}
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
          <h1 className="mb-2 text-2xl font-semibold text-th-text">{title}</h1>
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
