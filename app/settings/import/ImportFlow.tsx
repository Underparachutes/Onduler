'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { parseImportMarkdown, type ImportPreview } from '@/lib/import-parser'
import { IMPORT_PROMPT_TEMPLATE } from '@/lib/import-prompt'
import { confirmImport } from '@/app/actions/import'

type Step = 'input' | 'preview' | 'done'

export function ImportFlow({ trackingMode }: { trackingMode: 'points' | 'hours' }) {
  const [step, setStep] = useState<Step>('input')
  const [markdown, setMarkdown] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [counts, setCounts] = useState<{ swells: number; motions: number; groups: number; assignments: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCopyPrompt() {
    navigator.clipboard.writeText(IMPORT_PROMPT_TEMPLATE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleParse() {
    setError(null)
    const result = parseImportMarkdown(markdown, trackingMode)
    if (result.swells.length === 0 && result.motions.length === 0) {
      setError("Couldn't find any swells or motions in this text. Check that the format matches the prompt, or try regenerating it.")
      return
    }
    setPreview(result)
    setStep('preview')
  }

  function handleConfirm() {
    if (!preview) return
    setError(null)
    startTransition(async () => {
      const result = await confirmImport(preview)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setCounts(result.counts)
      setStep('done')
    })
  }

  if (step === 'done' && counts) {
    const parts: string[] = []
    if (counts.swells > 0) parts.push(`${counts.swells} swell${counts.swells === 1 ? '' : 's'}`)
    if (counts.motions > 0) parts.push(`${counts.motions} motion${counts.motions === 1 ? '' : 's'}`)
    if (counts.groups > 0) parts.push(`${counts.groups} group${counts.groups === 1 ? '' : 's'}`)
    if (counts.assignments > 0) parts.push(`${counts.assignments} assignment${counts.assignments === 1 ? '' : 's'}`)

    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-th-text">Imported {parts.join(', ')}.</p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-th-btn px-4 py-2 text-center text-sm font-medium text-th-btn-text active:scale-[0.97]"
        >
          Go to motions
        </Link>
      </div>
    )
  }

  if (step === 'preview' && preview) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-widest text-th-faint">Ready to import</p>

        {preview.swells.length > 0 && (
          <div>
            <p className="mb-1 text-sm text-th-secondary">{preview.swells.length} swell{preview.swells.length === 1 ? '' : 's'}</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.swells.map(s => (
                <span key={s.name} className="rounded-full border border-th-border px-2.5 py-0.5 text-xs text-th-text">
                  {s.name}{s.target !== null && ` (${s.target})`}
                </span>
              ))}
            </div>
          </div>
        )}

        {preview.motions.length > 0 && (
          <div>
            <p className="mb-1 text-sm text-th-secondary">{preview.motions.length} motion{preview.motions.length === 1 ? '' : 's'}</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.motions.map(m => (
                <span key={m.name} className="rounded-full border border-th-border px-2.5 py-0.5 text-xs text-th-text">
                  {m.name} ({trackingMode === 'hours' ? `${m.hours} hr` : `${m.points} pt`})
                </span>
              ))}
            </div>
          </div>
        )}

        {preview.groups.length > 0 && (
          <div>
            <p className="mb-1 text-sm text-th-secondary">{preview.groups.length} group{preview.groups.length === 1 ? '' : 's'}</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.groups.map(g => (
                <span key={g.name} className="rounded-full border border-th-border px-2.5 py-0.5 text-xs text-th-text">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {preview.swellAssignments.length > 0 && (
          <p className="text-xs text-th-muted">{preview.swellAssignments.length} swell assignment{preview.swellAssignments.length === 1 ? '' : 's'}</p>
        )}

        {preview.unparsedLineCount > 0 && (
          <p className="text-xs text-th-faint">{preview.unparsedLineCount} line{preview.unparsedLineCount === 1 ? '' : 's'} couldn't be parsed and will be ignored.</p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text active:scale-[0.97] disabled:opacity-50"
          >
            {isPending ? 'Importing...' : 'Import'}
          </button>
          <button
            onClick={() => { setStep('input'); setPreview(null); setError(null) }}
            className="rounded-lg border border-th-border px-4 py-2 text-sm text-th-muted active:scale-[0.97]"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm text-th-secondary">
          Copy this prompt, paste it into your AI along with any context about your life and goals, then paste the result below.
        </p>
        <button
          onClick={handleCopyPrompt}
          className="rounded-lg border border-th-border px-3 py-1.5 text-sm text-th-text transition-colors hover:bg-th-surface active:scale-[0.97]"
        >
          {copied ? 'Copied' : 'Copy prompt'}
        </button>
      </div>

      <textarea
        value={markdown}
        onChange={e => setMarkdown(e.target.value)}
        placeholder="Paste the markdown your AI generated here..."
        rows={12}
        className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none placeholder:text-th-faint focus:border-th-focus"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleParse}
        disabled={!markdown.trim()}
        className="self-start rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text active:scale-[0.97] disabled:opacity-50"
      >
        Preview import
      </button>
    </div>
  )
}
