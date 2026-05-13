'use client'

import { useState, useTransition } from 'react'
import { setTheme } from '@/app/actions/theme'
import { setDomainsEnabled, setDailyGoal } from '@/app/actions/settings'

const THEMES = [
  { id: 'default', label: 'Default', desc: 'Clean and minimal' },
  { id: 'bolinas', label: 'Bolinas', desc: 'Fog, driftwood, coastal sage' },
  { id: 'biarritz', label: 'Biarritz', desc: 'Atlantic surf, basque sand' },
] as const

type Props = {
  theme: string
  domainsEnabled: boolean
  dailyGoal: number
  email: string
}

export function SettingsPanel({ theme, domainsEnabled, dailyGoal, email }: Props) {
  const [currentTheme, setCurrentTheme] = useState(theme)
  const [domains, setDomains] = useState(domainsEnabled)
  const [goal, setGoal] = useState(dailyGoal)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(dailyGoal))
  const [, startTransition] = useTransition()

  function handleTheme(t: string) {
    setCurrentTheme(t)
    document.documentElement.dataset.theme = t
    startTransition(async () => { await setTheme(t) })
  }

  function handleDomains(enabled: boolean) {
    setDomains(enabled)
    startTransition(async () => { await setDomainsEnabled(enabled) })
  }

  function commitGoal() {
    const val = parseInt(goalInput)
    if (!val || val < 1) { setGoalInput(String(goal)); setEditingGoal(false); return }
    setGoal(val)
    setEditingGoal(false)
    startTransition(async () => { await setDailyGoal(val) })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Appearance */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Appearance</p>
        <div className="flex flex-col gap-2">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => handleTheme(t.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                currentTheme === t.id ? 'border-th-btn' : 'border-th-border hover:bg-th-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${currentTheme === t.id ? 'border-th-btn bg-th-btn' : 'border-th-border'}`} />
                <div>
                  <p className="text-sm font-medium text-th-text">{t.label}</p>
                  <p className="text-xs text-th-muted">{t.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Tracking */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Tracking</p>
        <div className="rounded-lg border border-th-border divide-y divide-th-border">
          {/* Daily goal */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-th-text">Daily goal</p>
              <p className="text-xs text-th-muted">Points target per day</p>
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  min="1"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onBlur={commitGoal}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitGoal()
                    if (e.key === 'Escape') { setGoalInput(String(goal)); setEditingGoal(false) }
                  }}
                  className="w-16 rounded-lg border border-th-border bg-th-surface px-2 py-1 text-sm text-th-text outline-none focus:border-th-focus text-right"
                />
                <span className="text-xs text-th-muted">pts</span>
              </div>
            ) : (
              <button
                onClick={() => { setGoalInput(String(goal)); setEditingGoal(true) }}
                className="text-sm font-medium text-th-secondary hover:underline"
              >
                {goal} pts
              </button>
            )}
          </div>

          {/* Domains */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-th-text">Domains</p>
              <p className="text-xs text-th-muted">Group activities by area of life</p>
            </div>
            <button
              role="switch"
              aria-checked={domains}
              onClick={() => handleDomains(!domains)}
              className={`relative h-6 w-11 rounded-full transition-colors ${domains ? 'bg-th-btn' : 'bg-th-border'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${domains ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Account */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Account</p>
        <div className="rounded-lg border border-th-border px-4 py-3">
          <p className="text-xs text-th-muted">Signed in as</p>
          <p className="mt-0.5 text-sm text-th-text">{email}</p>
        </div>
      </section>
    </div>
  )
}
