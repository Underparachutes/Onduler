'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFreeAnchor } from '@/app/actions/reflections'
import { ANCHOR_PROMPTS, THEME_LABELS, type AnchorPromptTheme } from '@/lib/anchorPrompts'
import { formatWeekLabel } from '@/lib/cycles'

const THEMES: AnchorPromptTheme[] = ['notice', 'honor', 'consider', 'release', 'invite']

export function NewAnchorForm({ cycleStart, cycleEnd }: { cycleStart: string; cycleEnd: string }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createFreeAnchor, null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expandedTheme, setExpandedTheme] = useState<AnchorPromptTheme | null>(null)
  const [prompt, setPrompt] = useState<string>('')

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      router.push('/anchors')
    }
  }, [state, router])

  const cycleLabel = formatWeekLabel({ cycleStart, cycleEnd })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-th-muted">Drop an anchor</p>
        <button
          type="button"
          onClick={() => router.push('/anchors')}
          className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="cycle_start" value={cycleStart} />
        <input type="hidden" name="cycle_end" value={cycleEnd} />
        <input type="hidden" name="prompt_text" value={prompt} />

        <p className="text-[10px] uppercase tracking-widest text-th-faint">{cycleLabel}</p>

        {prompt && (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-th-border-soft bg-th-surface/40 px-3 py-2">
            <p className="flex-1 text-xs italic text-th-secondary">{prompt}</p>
            <button
              type="button"
              onClick={() => setPrompt('')}
              className="shrink-0 text-[10px] text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
            >
              Clear
            </button>
          </div>
        )}

        <textarea
          name="body_text"
          placeholder="What do you want to anchor?"
          required
          autoFocus
          rows={6}
          className="resize-none rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
        />

        {!prompt && (
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            className="self-start text-xs text-th-muted transition-colors hover:text-th-text active:scale-[0.97]"
          >
            {pickerOpen ? '× Close prompts' : '+ Start with a prompt'}
          </button>
        )}

        {pickerOpen && !prompt && (
          <div className="flex flex-col rounded-lg border border-th-border-soft bg-th-surface/40">
            {THEMES.map((theme, i) => {
              const items = ANCHOR_PROMPTS.filter(p => p.theme === theme)
              if (items.length === 0) return null
              const open = expandedTheme === theme
              return (
                <div key={theme} className={i > 0 ? 'border-t border-th-border-soft' : ''}>
                  <button
                    type="button"
                    onClick={() => setExpandedTheme(open ? null : theme)}
                    className="flex w-full items-center justify-between px-3 py-2.5 active:scale-[0.985]"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-th-faint">{THEME_LABELS[theme]}</span>
                    <span className="text-[10px] text-th-faint">{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <div className="flex flex-col gap-1 px-3 pb-2.5">
                      {items.map(p => (
                        <button
                          key={p.text}
                          type="button"
                          onClick={() => { setPrompt(p.text); setPickerOpen(false); setExpandedTheme(null) }}
                          className="text-left text-xs text-th-secondary transition-colors hover:text-th-text active:scale-[0.985]"
                        >
                          {p.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-th-btn py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Drop anchor'}
        </button>
      </form>
    </>
  )
}
