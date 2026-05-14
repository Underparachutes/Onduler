'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setupAndCompleteOnboarding } from '@/app/actions/settings'

type Step = 'mode' | 'quick' | 'build' | 'theme'
type Motion = { name: string; default_points: number }

const SUGGESTIONS: Motion[] = [
  { name: 'Move my body', default_points: 3 },
  { name: 'Read', default_points: 2 },
  { name: 'Meditate', default_points: 2 },
  { name: 'Create something', default_points: 3 },
  { name: 'Connect with someone', default_points: 2 },
  { name: 'Cook at home', default_points: 2 },
  { name: 'Spend time outside', default_points: 2 },
  { name: 'Write', default_points: 2 },
  { name: 'Sleep well', default_points: 1 },
  { name: 'Practice something', default_points: 2 },
]

const THEMES = [
  { id: 'default', label: 'Default', desc: 'Clean and minimal' },
  { id: 'bolinas', label: 'Bolinas', desc: 'Fog, driftwood, coastal sage' },
  { id: 'biarritz', label: 'Biarritz', desc: 'Atlantic surf, basque sand' },
]

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('mode')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customMotions, setCustomMotions] = useState<Motion[]>([])
  const [newName, setNewName] = useState('')
  const [newPts, setNewPts] = useState(2)
  const [theme, setTheme] = useState('default')
  const [isPending, startTransition] = useTransition()

  function toggleSuggestion(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function addCustom() {
    const name = newName.trim()
    if (!name) return
    setCustomMotions(prev => [...prev, { name, default_points: newPts }])
    setNewName('')
    setNewPts(2)
  }

  function previewTheme(t: string) {
    setTheme(t)
    document.documentElement.dataset.theme = t
  }

  function finish(motions: Motion[], mode: 'quick_start' | 'custom', t: string) {
    startTransition(async () => {
      await setupAndCompleteOnboarding(motions, mode, t)
      router.push('/dashboard')
    })
  }

  if (step === 'mode') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="mb-2 text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">Welcome.</h1>
          <p className="mb-8 text-sm text-th-muted">How do you want to start?</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('quick')}
              className="rounded-lg border border-th-border p-5 text-left transition-colors hover:bg-th-surface"
            >
              <p className="mb-1 text-sm font-medium text-th-text">Quick start</p>
              <p className="text-xs text-th-muted">Pick from suggestions. Ready in a minute.</p>
            </button>
            <button
              onClick={() => setStep('build')}
              className="rounded-lg border border-th-border p-5 text-left transition-colors hover:bg-th-surface"
            >
              <p className="mb-1 text-sm font-medium text-th-text">Build your own</p>
              <p className="text-xs text-th-muted">Define your own motions and set up your space.</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'quick') {
    const picked = SUGGESTIONS.filter(s => selected.has(s.name))
    return (
      <div className="flex min-h-full flex-col items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <button onClick={() => setStep('mode')} className="mb-6 text-sm text-th-faint transition-colors hover:text-th-muted">
            ← Back
          </button>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">What do you want to track?</h1>
          <p className="mb-6 text-sm text-th-muted">Pick as many as you like. Everything is editable later.</p>

          <div className="mb-8 flex flex-col gap-2">
            {SUGGESTIONS.map(s => {
              const on = selected.has(s.name)
              return (
                <button
                  key={s.name}
                  onClick={() => toggleSuggestion(s.name)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    on ? 'border-th-btn bg-th-surface' : 'border-th-border hover:bg-th-surface'
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${on ? 'border-th-btn bg-th-btn' : 'border-th-border'}`}>
                    {on && (
                      <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
                        <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1 text-sm text-th-text">{s.name}</span>
                  <span className="text-xs text-th-faint">{s.default_points}pts</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => finish(picked, 'quick_start', 'default')}
            disabled={picked.length === 0 || isPending}
            className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
          >
            {isPending ? 'Setting up…' : picked.length > 0 ? `Start with ${picked.length} →` : 'Select at least one'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'build') {
    return (
      <div className="flex min-h-full flex-col items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <button onClick={() => setStep('mode')} className="mb-6 text-sm text-th-faint transition-colors hover:text-th-muted">
            ← Back
          </button>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">Add your motions.</h1>
          <p className="mb-6 text-sm text-th-muted">What do you want to track daily?</p>

          {customMotions.length > 0 && (
            <div className="mb-6 flex flex-col gap-2">
              {customMotions.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
                  <span className="flex-1 text-sm text-th-text">{m.name}</span>
                  <span className="text-xs text-th-faint">{m.default_points}pts</span>
                  <button
                    onClick={() => setCustomMotions(prev => prev.filter((_, j) => j !== i))}
                    className="text-sm text-th-faint transition-colors hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mb-8 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Motion name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-th-muted shrink-0">Points</label>
              <input
                type="number"
                min="1"
                value={newPts}
                onChange={e => setNewPts(parseInt(e.target.value) || 1)}
                className="w-20 rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
              />
              <button
                onClick={addCustom}
                disabled={!newName.trim()}
                className="flex-1 rounded-lg border border-th-border py-2.5 text-sm text-th-muted transition-colors hover:bg-th-surface disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('theme')}
              disabled={customMotions.length === 0}
              className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
            >
              Next →
            </button>
            <button
              onClick={() => setStep('theme')}
              className="text-center text-xs text-th-faint transition-colors hover:text-th-muted"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <button onClick={() => setStep('build')} className="mb-6 text-sm text-th-faint transition-colors hover:text-th-muted">
          ← Back
        </button>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-th-text">Choose your look.</h1>
        <p className="mb-6 text-sm text-th-muted">You can always change this later.</p>

        <div className="mb-8 flex flex-col gap-3">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => previewTheme(t.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                theme === t.id ? 'border-th-btn' : 'border-th-border hover:bg-th-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${theme === t.id ? 'border-th-btn bg-th-btn' : 'border-th-border'}`} />
                <div>
                  <p className="text-sm font-medium text-th-text">{t.label}</p>
                  <p className="text-xs text-th-muted">{t.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => finish(customMotions, 'custom', theme)}
          disabled={isPending}
          className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
        >
          {isPending ? 'Setting up…' : 'Go to dashboard →'}
        </button>
      </div>
    </div>
  )
}
