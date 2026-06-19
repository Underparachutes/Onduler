'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { completeOnboarding, uploadBackground, removeBackground, setBackgroundPosition } from '@/app/actions/settings'
import { resizeImage } from '@/lib/image'
import { ImageAdjustOverlay } from '@/app/components/ImageAdjustOverlay'
import { detectMode, getRandomThemeAccent, getShuffledThemePalette } from '@/lib/theme-colors'
import { BUILD_PRESETS } from '@/lib/builds'
import { shouldShowOnboardingInstall, markOnboardingSeen } from '@/lib/install'
import { InstallInstructions } from '@/app/components/InstallInstructions'
import { parseImportMarkdown } from '@/lib/import-parser'
import { IMPORT_PROMPT_TEMPLATE } from '@/lib/import-prompt'
import { useContentCrypto } from '@/app/components/useContentCrypto'

type Step = 'swells' | 'motions' | 'personalize' | 'firstlog' | 'install'
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
  points?: number
  hours?: number
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
  { id: 'biarritz', label: 'Biarritz', desc: 'Atlantic surf, basque sand' },
  { id: 'tjornuvik', label: 'Tjørnuvík', desc: 'Deep ocean, nordic blue' },
  { id: 'bolinas', label: 'Bolinas', desc: 'Fog, driftwood, coastal sage' },
]

// Draft persistence: onboarding state lives only in React, so a page refresh
// mid-flow used to throw away everything the user had entered. The draft
// mirrors the durable inputs (picks, motions, personalize choices) to
// localStorage on every change and restores them on mount. Transient edit
// state (open forms, half-typed motion names, the AI paste box) is not
// persisted. Cleared on successful completion; device-scoped like the
// install-flow state.
const DRAFT_KEY = 'onduler-onboarding-draft'

type Draft = {
  v: 1
  step: 'swells' | 'motions' | 'personalize'
  swellEntries: SwellEntry[]
  nextSwellId: number
  motions: MotionEntry[]
  nextMotionId: number
  theme: string
  trackingMode: TrackingMode
  hapticEnabled: boolean
  celebrationEnabled: boolean
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (d?.v !== 1 || !Array.isArray(d.swellEntries) || d.swellEntries.length === 0) return null
    if (!['swells', 'motions', 'personalize'].includes(d.step)) d.step = 'swells'
    if (!Array.isArray(d.motions)) d.motions = []
    return d as Draft
  } catch {
    return null
  }
}

function writeDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Storage full or unavailable; drafts are best-effort.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Same: best-effort.
  }
}

export function OnboardingFlow() {
  const { encryptContent } = useContentCrypto()
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

  const [theme, setTheme] = useState('biarritz')
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('points')
  const [hapticEnabled, setHapticEnabled] = useState(true)
  const [celebrationEnabled, setCelebrationEnabled] = useState(true)

  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [bgPosition, setBgPosition] = useState('50 50 1')
  const [uploading, setUploading] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  // First-log practice (the 'firstlog' step). Purely client-side — these taps
  // are never written to the database, so the user's real tracking starts
  // genuinely empty. No fake data in their wake.
  const [demoLogged, setDemoLogged] = useState<Set<number>>(new Set())

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Tracks whether the mount hydration (seed or draft restore) has run, so
  // the save effect below doesn't overwrite a stored draft with empty state.
  const draftLoaded = useRef(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time mount hydration: draft restore or theme-palette seed */
    const draft = readDraft()
    if (draft) {
      setSwellEntries(draft.swellEntries)
      setNextSwellId(draft.nextSwellId)
      setMotions(draft.motions)
      setNextMotionId(draft.nextMotionId)
      setTheme(draft.theme)
      document.documentElement.dataset.theme = draft.theme
      setTrackingMode(draft.trackingMode)
      setHapticEnabled(draft.hapticEnabled)
      setCelebrationEnabled(draft.celebrationEnabled)
      setStep(draft.step)
    } else {
      const t = document.documentElement.dataset.theme ?? 'biarritz'
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
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    draftLoaded.current = true
  }, [])

  // Mirror durable inputs to the draft on every change. The install step is
  // skipped: it carries no new input, and completion clears the draft anyway.
  useEffect(() => {
    if (!draftLoaded.current) return
    if (step === 'install' || step === 'firstlog') return
    writeDraft({
      v: 1,
      step,
      swellEntries,
      nextSwellId,
      motions,
      nextMotionId,
      theme,
      trackingMode,
      hapticEnabled,
      celebrationEnabled,
    })
  }, [step, swellEntries, nextSwellId, motions, nextMotionId, theme, trackingMode, hapticEnabled, celebrationEnabled])

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

  const [aiOpen, setAiOpen] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiCopied, setAiCopied] = useState(false)

  function handleCopyAiPrompt() {
    navigator.clipboard.writeText(IMPORT_PROMPT_TEMPLATE)
    setAiCopied(true)
    setTimeout(() => setAiCopied(false), 2000)
  }

  // Parse the AI's reply client-side and feed it into the normal onboarding
  // state: imported swells land picked, imported motions land pre-assigned to
  // their first swell. The user keeps full editing control from here.
  function applyAiImport() {
    setAiError(null)
    const result = parseImportMarkdown(aiText, trackingMode)
    if (result.swells.length === 0) {
      setAiError("Couldn't find any swells in this text. Check that you pasted your AI's whole reply.")
      return
    }

    const t = document.documentElement.dataset.theme ?? 'biarritz'
    const palette = getShuffledThemePalette(t, detectMode())

    // Swells: matching names (seeded or already added) just get picked;
    // the rest come in as custom entries.
    const idByName = new Map<string, number>()
    swellEntries.forEach(s => idByName.set(s.name.trim().toLowerCase(), s.id))

    let swellId = nextSwellId
    const pickKeys = new Set<string>()
    const newSwells: SwellEntry[] = []
    result.swells.forEach((s, i) => {
      const key = s.name.trim().toLowerCase()
      if (idByName.has(key)) {
        pickKeys.add(key)
        return
      }
      const id = swellId++
      idByName.set(key, id)
      newSwells.push({
        id,
        name: s.name,
        description: '',
        color: palette[i % palette.length],
        picked: true,
        custom: true,
      })
    })

    setSwellEntries(prev => [
      ...prev.map(s => (pickKeys.has(s.name.trim().toLowerCase()) ? { ...s, picked: true } : s)),
      ...newSwells,
    ])
    setNextSwellId(swellId)

    // Motions: attach each to its first assigned swell. Motions the AI left
    // unassigned have no home in onboarding and are skipped.
    const existingMotionKeys = new Set(motions.map(m => m.name.trim().toLowerCase()))
    let motionId = nextMotionId
    const newMotions: MotionEntry[] = []
    for (const m of result.motions) {
      const mKey = m.name.trim().toLowerCase()
      if (existingMotionKeys.has(mKey)) continue
      const assignment = result.swellAssignments.find(a => a.motionName.trim().toLowerCase() === mKey)
      const sid = assignment ? idByName.get(assignment.swellName.trim().toLowerCase()) : undefined
      if (sid === undefined) continue
      existingMotionKeys.add(mKey)
      newMotions.push({ id: motionId++, swellId: sid, name: m.name, points: m.points, hours: m.hours })
    }
    setMotions(prev => [...prev, ...newMotions])
    setNextMotionId(motionId)

    setAiText('')
    setAiOpen(false)
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
    const t = document.documentElement.dataset.theme ?? 'biarritz'
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
    document.documentElement.dataset.theme = t // eslint-disable-line react-hooks/immutability -- intentional DOM mutation
  }

  const [showInstall, setShowInstall] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- check install eligibility on mount
  useEffect(() => { setShowInstall(shouldShowOnboardingInstall()) }, [])

  function proceedFromPersonalize(useDefaults = false) {
    // Show the first-log practice when they have motions to try it on, unless
    // they chose to skip with defaults.
    if (!useDefaults && motions.some(m => swellEntries.some(s => s.id === m.swellId && s.picked))) {
      setStep('firstlog')
      return
    }
    goToInstallOrFinish(useDefaults)
  }

  function goToInstallOrFinish(useDefaults = false) {
    if (!useDefaults && showInstall) {
      markOnboardingSeen()
      setStep('install')
      return
    }
    finish(useDefaults)
  }

  function finish(useDefaults = false) {
    setError(null)
    const prefs = useDefaults
      ? {
          theme: 'biarritz',
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
        points: m.points,
        hours: m.hours,
      }))

    startTransition(async () => {
      // On success the action redirects and this code may never resume, so
      // the draft is cleared up front and restored if completion fails.
      clearDraft()
      // Encrypt the first swell/motion names client-side before they leave the
      // browser (gated on encActive, so inert/plaintext until migration flips
      // it on). completeOnboarding inserts blindly and links by index, not name,
      // so no server change is needed.
      const encSwells = await Promise.all(
        finalSwells.map(async s => ({ ...s, name: await encryptContent(s.name) })),
      )
      const encMotions = await Promise.all(
        finalMotions.map(async m => ({ ...m, name: await encryptContent(m.name) })),
      )
      let result: Awaited<ReturnType<typeof completeOnboarding>>
      try {
        result = await completeOnboarding(encSwells, encMotions, prefs)
      } catch (e) {
        // Server-action redirects surface as a thrown control-flow error that
        // Next handles; anything else here is a real transport failure.
        if (e && typeof e === 'object' && 'digest' in e && String(e.digest).startsWith('NEXT_REDIRECT')) throw e
        result = { error: 'Could not reach the server. Check your connection and try again.' }
      }
      if (result?.error) {
        setError(result.error)
        writeDraft({
          v: 1,
          step: 'personalize',
          swellEntries,
          nextSwellId,
          motions,
          nextMotionId,
          theme,
          trackingMode,
          hapticEnabled,
          celebrationEnabled,
        })
      }
    })
  }

  if (step === 'swells') {
    return (
      <ScreenShell
        title="Choose your swells."
        description="Swells are nouns. The areas of life you want to invest in. Add at least 3. You can edit them anytime."
        headerExtra={
          <button
            onClick={addCustomSwell}
            className="mt-3 w-full rounded-lg border border-dashed border-th-border px-4 py-3 text-left text-sm text-th-muted transition-colors hover:bg-th-surface active:scale-[0.99]"
          >
            + Add your own
          </button>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-th-faint">Ask your AI</p>
          {aiOpen ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-th-muted">
                Copy the prompt, paste it into your AI with some context about your life, then paste its reply below.
              </p>
              <button
                onClick={handleCopyAiPrompt}
                className="self-start rounded-lg border border-th-border px-3 py-1.5 text-sm text-th-text transition-colors hover:bg-th-surface active:scale-[0.97]"
              >
                {aiCopied ? 'Copied' : 'Copy prompt'}
              </button>
              <textarea
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                placeholder="Paste your AI's reply here..."
                rows={6}
                className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2 text-base text-th-text outline-none placeholder:text-th-faint focus:border-th-focus"
              />
              {aiError && <p className="text-xs text-red-500">{aiError}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={applyAiImport}
                  disabled={!aiText.trim()}
                  className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text active:scale-[0.97] disabled:opacity-40"
                >
                  Add them
                </button>
                <button
                  onClick={() => { setAiOpen(false); setAiError(null) }}
                  className="text-sm text-th-faint transition-colors hover:text-th-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAiOpen(true)}
              className="rounded-lg border border-dashed border-th-border px-4 py-3 text-left text-sm text-th-muted transition-colors hover:bg-th-surface active:scale-[0.99]"
            >
              Have your AI draft your swells and motions
            </button>
          )}

          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-th-faint">Example swells</p>
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

          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-th-faint">Or try a mix</p>
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

        </div>

        <button
          onClick={() => setStep('motions')}
          disabled={pickedSwells.length < 3 || pickedSwells.some(s => !s.name)}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97] disabled:opacity-40"
        >
          {pickedSwells.length >= 3 ? 'Next →' : `Add ${3 - pickedSwells.length} more`}
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
        description="Motions are verbs. The daily actions that feed each swell. Add a few or skip and add them later."
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
          onClick={() => {
            pickedSwells.forEach(s => {
              const draft = (motionDrafts[s.id] ?? '').trim()
              if (draft) addMotion(s.id)
            })
            setStep('personalize')
          }}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97]"
        >
          Next →
        </button>
      </ScreenShell>
    )
  }

  if (step === 'firstlog') {
    const demoMotions = motions.filter(m => swellEntries.some(s => s.id === m.swellId && s.picked))
    const anyLogged = demoMotions.some(m => demoLogged.has(m.id))
    return (
      <ScreenShell
        onBack={() => setStep('personalize')}
        title="Try logging one."
        description="Tap a motion to log it. This is just practice, nothing is saved. Your tracking starts fresh on the next screen."
      >
        <div className="flex flex-col">
          {demoMotions.map(m => {
            const done = demoLogged.has(m.id)
            return (
              <button
                key={m.id}
                onClick={() =>
                  setDemoLogged(prev => {
                    const n = new Set(prev)
                    if (n.has(m.id)) n.delete(m.id); else n.add(m.id)
                    return n
                  })
                }
                className="flex items-center gap-3 border-b border-th-border-soft py-3 text-left transition-transform active:scale-[0.985]"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    done ? 'border-th-btn bg-th-btn text-th-btn-text' : 'border-th-border'
                  }`}
                >
                  {done && (
                    <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
                      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm ${done ? 'text-th-muted line-through' : 'text-th-text'}`}>{m.name}</span>
              </button>
            )
          })}
        </div>

        {anyLogged && (
          <p className="text-sm text-th-secondary">That&apos;s it. Every motion you log shapes your wake.</p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={() => goToInstallOrFinish(false)}
          disabled={isPending}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97] disabled:opacity-50"
        >
          {isPending ? 'Setting up…' : anyLogged ? 'Start fresh →' : 'Got it →'}
        </button>
      </ScreenShell>
    )
  }

  if (step === 'install') {
    return (
      <ScreenShell
        title="Install Onduler"
        description="Onduler lives best on your home screen. Add it once and it opens like an app."
      >
        <InstallInstructions onDone={() => finish(false)} />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={() => finish(false)}
          disabled={isPending}
          className="w-full text-center text-sm text-th-faint transition-colors hover:text-th-muted disabled:opacity-50"
        >
          {isPending ? 'Setting up…' : 'Not now'}
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
        <p className="mb-2 text-xs uppercase tracking-widest text-th-muted">Background photo</p>
        {bgUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of just-uploaded photo */}
            <img src={bgUrl} alt="Your background" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setAdjusting(true)}
                className="text-left text-sm text-th-secondary hover:underline"
              >
                Adjust
              </button>
              <button
                onClick={() => {
                  setBgUrl(null)
                  startTransition(async () => { await removeBackground() })
                }}
                className="text-left text-xs text-th-faint transition-colors hover:text-th-muted"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="block cursor-pointer rounded-lg border border-dashed border-th-border px-4 py-3 text-sm text-th-muted transition-colors hover:bg-th-surface active:scale-[0.99]">
            {uploading ? 'Uploading…' : '+ Add a photo behind your motions'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                const resized = await resizeImage(file, 1600)
                const fd = new FormData()
                fd.append('file', resized)
                const result = await uploadBackground(fd)
                setUploading(false)
                if (result && 'url' in result) {
                  setBgUrl(result.url ?? null)
                  setBgPosition('50 50 1')
                }
                e.target.value = ''
              }}
            />
          </label>
        )}
        <p className="mt-1.5 text-xs text-th-faint">Optional.</p>
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
              startTransition(async () => { await setBackgroundPosition(pos) })
            }}
            onCancel={() => setAdjusting(false)}
          />
        )}
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
          Points give extra weight to motions that matter most. Hours track actual time spent.
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
          onClick={() => proceedFromPersonalize(false)}
          disabled={isPending}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97] disabled:opacity-50"
        >
          {isPending ? 'Setting up…' : 'Next →'}
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
  headerExtra,
  children,
}: {
  onBack?: () => void
  title: string
  description: string
  headerExtra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col items-center">
      <div className="flex w-full max-w-[22rem] flex-col px-4">
        <div className="sticky z-10 -mx-4 bg-th-bg px-4 pb-4 pt-12" style={{ top: 0 }}>
          {onBack ? (
            <button
              onClick={onBack}
              className="mb-4 text-sm text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
            >
              ← Back
            </button>
          ) : (
            <p className="brand-text mb-2 text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          )}
          <h1 className="mb-2 text-2xl font-semibold text-th-text">{title}</h1>
          <p className="text-sm text-th-muted">{description}</p>
          {headerExtra}
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
